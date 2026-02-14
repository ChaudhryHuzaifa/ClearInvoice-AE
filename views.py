from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from .serializers import PayoutRequestSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.db.models import Sum
from datetime import datetime
import io
from io import BytesIO
from django.utils import timezone
from decimal import Decimal
from .models import Notification, PartnerCommission
from .serializers import NotificationSerializer
from django.contrib.contenttypes.models import ContentType
from .serializers import (
    PartnerBalanceSerializer, 
    PayoutRequestCreateSerializer, 
    PayoutRequestSerializer,
    PartnerSettingsSerializer
)
from .models import PayoutRequest, PayoutTransaction

from .models import Partner, PartnerClient
from invoices.models import Invoice, UserProfile
from reportlab.lib.pagesizes import letter
from .serializers import PartnerRegisterSerializer, PartnerClientSerializer

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
import logging

logger = logging.getLogger(__name__)

# ---------------------------
# Partner Registration
# ---------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register_partner(request):
    serializer = PartnerRegisterSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        partner = serializer.save()
        token, _ = Token.objects.get_or_create(user=partner.user)
        return Response({
            'partner_id': partner.id,
            'token': token.key,
            'referral_code': partner.referral_code,
            'referral_link': serializer.get_referral_link(partner)
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------
# Partner Dashboard (protected)
# ---------------------------
# partners/views.py

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_dashboard(request):
    # Check if user is authenticated and not anonymous
    if not request.user.is_authenticated or request.user.is_anonymous:
        return Response({"error": "Authentication required"}, status=401)
    
    try:
        partner = request.user.partner
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=403)

    # DEBUG: Print commission calculation details
    print(f"DEBUG: Calculating commissions for partner: {partner.firm_name}")
    
    # Use actual commission records for accurate calculation
    lifetime_commission = PartnerCommission.objects.filter(
        partner=partner, 
        status='PAID'
    ).aggregate(total=Sum('amount'))['total'] or Decimal("0.00")
    
    current_month = timezone.now().month
    current_year = timezone.now().year
    monthly_commission = PartnerCommission.objects.filter(
        partner=partner,
        status='PAID',
        payment_date__month=current_month,
        payment_date__year=current_year
    ).aggregate(total=Sum('amount'))['total'] or Decimal("0.00")

    # DEBUG: Print commission totals
    print(f"DEBUG: Lifetime Commission Total: {lifetime_commission}")
    print(f"DEBUG: Monthly Commission Total: {monthly_commission}")

    # Get partner clients with commission details
    partner_clients = PartnerClient.objects.filter(partner=partner).select_related('client_user')
    
    clients_data = []
    for client in partner_clients:
        # Calculate client-specific commissions from actual records
        client_total_commission = client.commissions.filter(status='PAID').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        client_monthly_commission = client.commissions.filter(
            status='PAID',
            payment_date__month=current_month,
            payment_date__year=current_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Get company info
        company = None
        subscription_plan = "NONE"
        try:
            user_profile = client.client_user.userprofile
            company = getattr(user_profile, 'company', None)
            if company and hasattr(company, 'subscription'):
                subscription_plan = company.subscription.plan
        except Exception as e:
            print(f"DEBUG: Error getting company for client {client.client_user.email}: {e}")

        client_name = company.name if company else client.client_user.get_full_name() or client.client_user.username

        clients_data.append({
            "id": client.id,
            "user_id": client.client_user.id,
            "name": client_name,
            "email": client.client_user.email,
            "trn": client.trn,
            "is_active": client.is_active,
            "total_commission": client_total_commission,
            "monthly_commission": client_monthly_commission,
            "subscription_plan": subscription_plan,
            "company_linked": bool(company),
            "created_at": client.created_at.isoformat(),
            "last_payment_date": client.last_payment_date.isoformat() if client.last_payment_date else None
        })

        # DEBUG: Print client commission details
        print(f"DEBUG: Client {client.client_user.email} - Total: {client_total_commission}, Monthly: {client_monthly_commission}")

    # Count active clients
    active_clients_count = partner_clients.filter(is_active=True).count()
    total_clients_count = partner_clients.count()

    # Get notifications
    notifications = Notification.objects.filter(user=request.user).order_by("-created_at")[:10]
    notifications_data = NotificationSerializer(notifications, many=True).data
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

    frontend_base = "http://localhost:3000"
    data = {
        "partner_name": partner.firm_name,
        "referral_link": f"{frontend_base}/signup?ref={partner.referral_code}",
        "referral_code": partner.referral_code,
        "total_clients": total_clients_count,
        "active_clients": active_clients_count,
        "lifetime_commission": lifetime_commission,
        "monthly_commission": monthly_commission,
        "commission_rate": float(partner.commission_rate),
        "clients": clients_data,
        "notifications": notifications_data,
        "unread_count": unread_count,
    }

    return Response(data)

# ---------------------------

# Partner Clients (protected)
# ---------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_clients(request):
    """
    Returns list of users referred by the partner.
    """
    try:
        partner = Partner.objects.get(user=request.user)
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)

    clients = PartnerClient.objects.filter(partner=partner)
    data = []
    for client in clients:
        data.append({
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "subscription_active": client.subscription_active
        })
    return Response(data)


# ---------------------------
# Partner Sales Report PDF
# ---------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def partner_sales_report_pdf(request):
    """
    Generate PDF sales report for one or more referred clients (selected by partner).
    """
    try:
        partner = Partner.objects.get(user=request.user)
    except Partner.DoesNotExist:
        return Response({"error": "Partner profile not found."}, status=404)
    
    start_date = request.data.get("start_date")
    end_date = request.data.get("end_date")
    client_ids = request.data.get("clients", [])  # list of client IDs

    if not start_date or not end_date:
        return Response({"error": "Start and end dates are required."}, status=400)

    try:
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    # ✅ Correct lookup using PartnerClient, not UserProfile
    partner_clients = PartnerClient.objects.filter(partner=partner)
    if client_ids:
        partner_clients = partner_clients.filter(id__in=client_ids)

    print(f"DEBUG: Partner object: {partner.firm_name}, ID: {partner.id}")
    print(f"DEBUG: Found {partner_clients.count()} referred clients")

    # -----------------------------
    # Generate PDF
    # -----------------------------
    buffer = BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph(f"Partner Sales Report ({start_date.date()} to {end_date.date()})", styles["Title"]))
    elements.append(Spacer(1, 12))

    for client in partner_clients:
        profile = getattr(client.client_user, 'userprofile', None)
        company = getattr(profile, 'company', None) if profile else None
        client_name = company.name if company else client.client_user.get_full_name() or client.client_user.username

        elements.append(Paragraph(f"Client: {client_name}", styles["Heading2"]))

        if not company:
            elements.append(Paragraph("No company linked to this client.", styles["Normal"]))
            elements.append(Spacer(1, 12))
            continue

        # ✅ Fetch invoices for each client company
        invoices = Invoice.objects.filter(
            company=company,
            status="PAID",
            created_at__date__range=(start_date.date(), end_date.date())
        )

        emirate_data = invoices.values("emirate").annotate(
            subtotal=Sum("total_amount") - Sum("total_vat_amount"),
            vat=Sum("total_vat_amount"),
            total=Sum("total_amount")
        )

        if emirate_data:
            table_data = [["Emirate", "Subtotal (AED)", "VAT (AED)", "Total (AED)"]]
            for row in emirate_data:
                table_data.append([
                    row["emirate"],
                    f"{(row['subtotal'] or 0):.2f}",
                    f"{(row['vat'] or 0):.2f}",
                    f"{(row['total'] or 0):.2f}",
                ])

            table = Table(table_data, hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph("No paid invoices found for this period.", styles["Normal"]))

        elements.append(Spacer(1, 24))

    if not partner_clients.exists():
        elements.append(Paragraph("No referred clients found for this partner.", styles["Normal"]))

    pdf.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="partner_sales_report_{start_date.date()}_to_{end_date.date()}.pdf"'
    )
    return response

 

@api_view(['POST'])
@permission_classes([AllowAny])
def register_client(request):
    serializer = ClientRegisterSerializer(data=request.data)
    if serializer.is_valid():
        client = serializer.save()
        token, _ = Token.objects.get_or_create(user=client.client_user)
        return Response({
            'client_id': client.id,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.decorators import api_view

@api_view(['GET'])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Returns a simple JSON response and ensures the CSRF cookie is set.
    """
    return JsonResponse({"detail": "CSRF cookie set"})

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import json


# ---- Partner Resources ----
@login_required
def partner_resources(request):
    resources = [
        {"id": 1, "title": "Dashboard Guide", "url": "/static/resources/dashboard-guide.pdf"},
        {"id": 2, "title": "Branding Kit", "url": "/static/resources/branding-kit.zip"},
    ]
    return JsonResponse({"resources": resources})

# ---- Partner Settings ----
@login_required
@csrf_exempt
def partner_settings(request):
    if request.method == "GET":
        return JsonResponse({
            "settings": {
                "email_notifications": True,
                "preferred_language": "English",
                "theme": "light",
            }
        })

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            # (Here you'd normally save settings to DB)
            return JsonResponse({
                "message": "Settings updated successfully",
                "updated": data
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


# Partner Profile Update View
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def partner_profile_update(request):
    try:
        partner = Partner.objects.get(user=request.user)
        # Get or create settings if they don't exist
        settings, created = PartnerSettings.objects.get_or_create(partner=partner)
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)
    
    # Update partner basic info
    if 'name' in request.data:
        partner.contact_person = request.data['name']
    if 'email' in request.data:
        partner.user.email = request.data['email']
        partner.user.save()
    if 'phone' in request.data:
        partner.phone_number = request.data['phone']
    partner.save()
    
    # Update settings
    settings_serializer = PartnerSettingsSerializer(settings, data=request.data, partial=True)
    if settings_serializer.is_valid():
        settings_serializer.save()
        return Response({"message": "Profile updated successfully", "settings": settings_serializer.data})
    return Response(settings_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    # Get unread notifications count for the badge
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    
    # Get recent notifications (last 10)
    notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:10]
    serializer = NotificationSerializer(notifications, many=True)
    
    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'success': True})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'success': True})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def test_notification(request):
    """
    Test endpoint to verify notifications are working
    """
    try:
        # Create a test user profile with a referral code
        from django.contrib.auth.models import User
        from invoices.models import UserProfile
        from partners.models import Partner
        
        # Get the first partner
        partner = Partner.objects.first()
        if not partner:
            return Response({"error": "No partners found"}, status=400)
            
        # Create a test user
        user = User.objects.create_user(
            username="test_user",
            email="test@example.com"
        )
        
        # Create or get user profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.referral_code_used = partner.referral_code
        profile.save()
        
        return Response({
            "message": "Test notification triggered",
            "partner": partner.firm_name,
            "referral_code": partner.referral_code
        })
    except Exception as e:
        logger.error(f"Test notification error: {str(e)}")
        return Response({"error": str(e)}, status=400)

# Add this test view
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_notification_view(request):
    """
    Test view to create a notification for the current user
    """
    try:
        from django.contrib.auth.models import User
        notification = Notification.objects.create(
            user=request.user,
            title="Test Notification",
            message="This is a test notification to check if the system is working.",
            notification_type="test",
            related_object_id=request.user.id,
            related_content_type=ContentType.objects.get_for_model(User)
        )
        return Response({
            "message": "Test notification created",
            "notification_id": notification.id
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# ---------------------------
# Partner Payout Endpoints
# ---------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_balance(request):
    """Get current partner balance information"""
    try:
        partner = request.user.partner
        partner.update_balance()  # Ensure balance is current
        
        serializer = PartnerBalanceSerializer(partner)
        return Response(serializer.data)
        
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payout_request(request):
    """Create a new payout request"""
    try:
        partner = request.user.partner
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)
    
    # Update balance first
    partner.update_balance()
    
    serializer = PayoutRequestCreateSerializer(
        data=request.data, 
        context={'request': request}
    )
    
    if serializer.is_valid():
        try:
            # Create payout request
            payout = PayoutRequest.objects.create(
                partner=partner,
                **serializer.validated_data
            )
            
            # Create notification
            Notification.objects.create(
                user=request.user,
                title="💰 Payout Request Submitted",
                message=f"Your payout request for {payout.amount} AED has been submitted and is under review.",
                notification_type="payout_submitted",
                related_object_id=payout.id,
                related_content_type=ContentType.objects.get_for_model(PayoutRequest)
            )
            
            # Notify admin (optional - you can add admin notifications later)
            
            return Response(
                {
                    "message": "Payout request submitted successfully",
                    "payout_id": payout.id,
                    "status": payout.status
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {"error": f"Failed to create payout request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payout_history(request):
    """Get partner's payout history"""
    try:
        partner = request.user.partner
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)
    
    payouts = PayoutRequest.objects.filter(partner=partner).order_by('-created_at')
    serializer = PayoutRequestSerializer(payouts, many=True)
    
    return Response({
        "payouts": serializer.data,
        "total_count": payouts.count()
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_payout_request(request, payout_id):
    """Cancel a pending payout request"""
    try:
        partner = request.user.partner
        payout = PayoutRequest.objects.get(id=payout_id, partner=partner)
        
        if not payout.can_be_cancelled():
            return Response(
                {"error": "This payout request cannot be cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payout.status = 'CANCELLED'
        payout.save()
        
        # Update partner balance
        partner.update_balance()
        
        # Create notification
        Notification.objects.create(
            user=request.user,
            title="❌ Payout Request Cancelled",
            message=f"Your payout request for {payout.amount} AED has been cancelled.",
            notification_type="payout_cancelled",
            related_object_id=payout.id,
            related_content_type=ContentType.objects.get_for_model(PayoutRequest)
        )
        
        return Response({"message": "Payout request cancelled successfully"})
        
    except PayoutRequest.DoesNotExist:
        return Response({"error": "Payout request not found"}, status=status.HTTP_404_NOT_FOUND)
    except Partner.DoesNotExist:
        return Response({"error": "Not a partner"}, status=status.HTTP_403_FORBIDDEN)

# ---------------------------
# Admin Payout Endpoints
# ---------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_payout_requests(request):
    """Admin: Get all payout requests (staff only)"""
    if not request.user.is_staff:
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)
    
    status_filter = request.GET.get('status', '')
    payment_method = request.GET.get('payment_method', '')
    
    payouts = PayoutRequest.objects.all().order_by('-created_at')
    
    if status_filter:
        payouts = payouts.filter(status=status_filter)
    if payment_method:
        payouts = payouts.filter(payment_method=payment_method)
    
    serializer = PayoutRequestSerializer(payouts, many=True)
    
    # Add statistics
    stats = {
        'total': PayoutRequest.objects.count(),
        'pending': PayoutRequest.objects.filter(status='PENDING').count(),
        'approved': PayoutRequest.objects.filter(status='APPROVED').count(),
        'paid': PayoutRequest.objects.filter(status='PAID').count(),
        'total_amount_pending': PayoutRequest.objects.filter(status='PENDING').aggregate(Sum('amount'))['amount__sum'] or 0,
    }
    
    return Response({
        "payouts": serializer.data,
        "statistics": stats
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_approve_payout(request, payout_id):
    """Admin: Approve a payout request"""
    if not request.user.is_staff:
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        payout = PayoutRequest.objects.get(id=payout_id)
        
        if payout.status != 'PENDING':
            return Response(
                {"error": "Only pending payouts can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify partner has sufficient balance
        payout.partner.update_balance()
        if payout.amount > payout.partner.available_balance:
            return Response(
                {"error": "Partner has insufficient balance for this payout"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payout.status = 'APPROVED'
        payout.processed_by = request.user
        payout.processed_at = timezone.now()
        payout.admin_notes = request.data.get('admin_notes', '')
        payout.save()
        
        # Update partner balance
        payout.partner.update_balance()
        
        # Create notification for partner
        Notification.objects.create(
            user=payout.partner.user,
            title="✅ Payout Approved",
            message=f"Your payout request for {payout.amount} AED has been approved and will be processed soon.",
            notification_type="payout_approved",
            related_object_id=payout.id,
            related_content_type=ContentType.objects.get_for_model(PayoutRequest)
        )
        
        return Response({"message": "Payout approved successfully"})
        
    except PayoutRequest.DoesNotExist:
        return Response({"error": "Payout request not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_payout(request, payout_id):
    """Admin: Reject a payout request"""
    if not request.user.is_staff:
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        payout = PayoutRequest.objects.get(id=payout_id)
        
        if payout.status != 'PENDING':
            return Response(
                {"error": "Only pending payouts can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payout.status = 'REJECTED'
        payout.processed_by = request.user
        payout.processed_at = timezone.now()
        payout.admin_notes = request.data.get('admin_notes', 'Reason for rejection required')
        payout.save()
        
        # Update partner balance
        payout.partner.update_balance()
        
        # Create notification for partner
        Notification.objects.create(
            user=payout.partner.user,
            title="❌ Payout Rejected",
            message=f"Your payout request for {payout.amount} AED was rejected. Reason: {payout.admin_notes}",
            notification_type="payout_rejected",
            related_object_id=payout.id,
            related_content_type=ContentType.objects.get_for_model(PayoutRequest)
        )
        
        return Response({"message": "Payout rejected successfully"})
        
    except PayoutRequest.DoesNotExist:
        return Response({"error": "Payout request not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_mark_paid(request, payout_id):
    """Admin: Mark payout as paid (after actual payment)"""
    if not request.user.is_staff:
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        payout = PayoutRequest.objects.get(id=payout_id)
        
        if payout.status != 'APPROVED':
            return Response(
                {"error": "Only approved payouts can be marked as paid"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payout.status = 'PAID'
        payout.transaction_id = request.data.get('transaction_id', '')
        payout.receipt_url = request.data.get('receipt_url', '')
        payout.save()
        
        # Update partner balance
        payout.partner.update_balance()
        
        # Create PayoutTransaction record
        PayoutTransaction.objects.create(
            payout_request=payout,
            amount=payout.amount,
            currency='AED',
            partner=payout.partner,
            gateway_transaction_id=request.data.get('transaction_id', ''),
            net_amount=payout.amount,  # Adjust if there are fees
            completed_at=timezone.now()
        )
        
        # Create notification for partner
        Notification.objects.create(
            user=payout.partner.user,
            title="💰 Payout Completed",
            message=f"Your payout of {payout.amount} AED has been processed successfully.",
            notification_type="payout_paid",
            related_object_id=payout.id,
            related_content_type=ContentType.objects.get_for_model(PayoutRequest)
        )
        
        return Response({"message": "Payout marked as paid successfully"})
        
    except PayoutRequest.DoesNotExist:
        return Response({"error": "Payout request not found"}, status=status.HTTP_404_NOT_FOUND)