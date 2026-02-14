# invoices/views.py
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
import json

from .models import Company, Client, Invoice, InvoiceItem, UserProfile
from .serializers import UserRegistrationSerializer, UserSerializer, InvoiceSerializer, InvoiceCreateSerializer
from .utils import generate_invoice_pdf, generate_invoice_xml
from rest_framework.permissions import AllowAny, IsAuthenticated

# ---------------------------
# Home
# ---------------------------
def home_page(request):
    return HttpResponse(
        "Welcome to ClearInvoice AE API. Visit /admin for administration or /api for the REST API."
    )


# ---------------------------
# User Registration & Login
# ---------------------------
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """
    Register a new user with their company details
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Handle partner referral if present
        referral_code = request.data.get('ref')
        if referral_code:
            try:
                # Link the new user to the partner who referred them
                from partners.views import link_client_to_partner
                from partners.models import Partner
                
                partner = Partner.objects.get(referral_code=referral_code)
                user_profile = UserProfile.objects.get(user=user)
                
                # Create a mock request to call the link function
                from rest_framework.test import APIRequestFactory
                from rest_framework.request import Request
                
                factory = APIRequestFactory()
                link_request = factory.post('/api/partner/link-client/', {
                    'referral_code': referral_code,
                    'user_id': user.id,
                    'company_id': user_profile.company.id
                }, format='json')
                
                # Call the link function
                response = link_client_to_partner(link_request)
                
            except Partner.DoesNotExist:
                pass  # Ignore invalid referral codes
        
        # Generate token for the new user
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response(
            {
                "message": "User created successfully", 
                "user_id": user.id,
                "token": token.key,
                "email": user.email,
                "needs_subscription": True  # Indicate plan selection is needed
            },
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        request.user.auth_token.delete()
        logout(request)
        return Response({'message': 'Successfully logged out'})
    except Exception:
        return Response({'error': 'Logout failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------
# Get User Profile
# ---------------------------
@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user
    try:
        profile = UserProfile.objects.get(user=user)
        company = profile.company
        is_partner = hasattr(user, 'partner')
        print("DEBUG: UserProfile found:", profile)
    except UserProfile.DoesNotExist:
        profile = None
        company = None
        is_partner = hasattr(user, 'partner')  # still check partner flag
        print("DEBUG: UserProfile not found for user")

    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "company": {
            "id": company.id if company else None,
            "name": company.name if company else "",
            "tax_registration_number": company.tax_registration_number if company else "",
            "email": company.email if company else "",
            "phone": company.phone if company else "",
            "address": company.address if company else "",
        } if company else None,
        "is_partner": is_partner
    }

    return Response(data)


# ---------------------------
# Invoice Views
# ---------------------------
def invoice_list(request):
    if not request.user.is_authenticated:
        return render(request, 'invoices/invoice_list.html', {'invoices': []})

    user_profile = UserProfile.objects.filter(user=request.user).first()
    if not user_profile:
        return render(request, 'invoices/invoice_list.html', {'invoices': []})

    invoices = Invoice.objects.filter(company=user_profile.company).order_by('-issue_date')
    return render(request, 'invoices/invoice_list.html', {'invoices': invoices})


@api_view(['GET', 'POST'])
def create_invoice(request):
    user_profile = UserProfile.objects.filter(user=request.user).first()
    if not user_profile:
        return JsonResponse({"error": "UserProfile not found"}, status=404)

    if request.method == 'GET':
        clients = Client.objects.all()
        return render(request, 'invoices/create_invoice.html', {
            'company': user_profile.company,
            'clients': clients
        })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
            client, created = Client.objects.get_or_create(
                name=data['client_name'],
                defaults={
                    'trn': data.get('client_trn', ''),
                    'address': data['client_address'],
                    'email': data.get('client_email', '')
                }
            )

            invoice = Invoice.objects.create(
                issue_date=data['issue_date'],
                due_date=data['due_date'],
                status=data.get('status', 'DRAFT'),
                company=user_profile.company,
                client=client,
                created_by=request.user
            )

            line_items = json.loads(data.get('line_items', '[]'))
            for item_data in line_items:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=item_data['description'],
                    quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    vat_rate=item_data.get('vat_rate', 0.05)
                )

            invoice.save()

            if request.content_type == 'application/json':
                return JsonResponse({
                    'success': True,
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number
                })
            else:
                return redirect('invoice_detail', invoice_id=invoice.id)

        except Exception as e:
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': str(e)}, status=400)
            else:
                return render(request, 'invoices/create_invoice.html', {
                    'error': str(e),
                    'company': user_profile.company,
                    'clients': Client.objects.all()
                })


# ---------------------------
# Invoice API ViewSet
# ---------------------------
class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_user_profile(self):
        from django.contrib.auth.models import AnonymousUser
        if isinstance(self.request.user, AnonymousUser):
            return None
        return UserProfile.objects.filter(user=self.request.user).first()

    def get_queryset(self):
        user_profile = self.get_user_profile()
        if not user_profile:
            return Invoice.objects.none()
        return Invoice.objects.filter(company=user_profile.company)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user_profile = self.get_user_profile()
        if user_profile:
            context['company'] = user_profile.company
        context['user'] = self.request.user
        return context

    def perform_create(self, serializer):
        user_profile = self.get_user_profile()
        if user_profile and user_profile.company:
            serializer.save(company=user_profile.company, created_by=self.request.user)
        else:
            raise serializers.ValidationError("User does not have a company profile.")

    def create(self, request, *args, **kwargs):
        """🚑 Custom create method with debug logging for 400 errors"""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("❌ Invoice validation error:", serializer.errors)  # 👀 Debug log
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        success = invoice.generate_and_save_pdf()
        if success:
            return Response({"status": "PDF generated successfully", "pdf_url": invoice.pdf_file.url})
        return Response({"status": "PDF generation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def generate_xml(self, request, pk=None):
        invoice = self.get_object()
        success = invoice.generate_and_save_xml()
        if success:
            return Response({"status": "XML generated successfully", "xml_url": invoice.xml_file.url})
        return Response({"status": "XML generation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# invoices/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # 🚀 disables CSRF/session requirement

    def post(self, request):
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_link = f"http://localhost:3000/reset/{uid}/{token}"


            send_mail(
                "ClearInvoice Password Reset",
                f"Click here to reset your password:\n{reset_link}",
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({"message": "Password reset email sent."}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # 🚀 disables CSRF/session requirement

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if not default_token_generator.check_token(user, token):
                return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

            new_password = request.data.get("password")
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login a user and return auth token
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=400)
    
    user = authenticate(request, username=user.username, password=password)
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({'token': token.key, 'user_id': user.id, 'email': user.email})
    else:
        return Response({'error': 'Invalid credentials'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_subscription(request):
    """Get client subscription details"""
    try:
        # Get user's company
        company = request.user.company
        subscription = company.subscription if hasattr(company, 'subscription') else None
        
        if not subscription:
            return Response({"error": "No subscription found"}, status=404)
            
        data = {
            "id": subscription.id,
            "plan": subscription.plan,
            "status": subscription.status,
            "renewal_date": subscription.renewal_date.isoformat() if subscription.renewal_date else None,
            "created_at": subscription.created_at.isoformat(),
            "price": subscription.price,
        }
        
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def client_cancel_subscription(request):
    """Cancel client subscription"""
    try:
        company = request.user.company
        subscription = company.subscription if hasattr(company, 'subscription') else None
        
        if not subscription:
            return Response({"error": "No subscription found"}, status=404)
            
        # Cancel the subscription
        subscription.status = "cancelled"
        subscription.save()
        
        return Response({"message": "Subscription cancelled successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_resources(request):
    """Get resources for clients"""
    resources = [
        {
            "id": 1,
            "title": "Getting Started Guide",
            "type": "guide",
            "url": "/resources/getting-started.pdf",
            "description": "Learn how to use ClearInvoice with our comprehensive guide"
        },
        {
            "id": 2,
            "title": "Invoice Creation Tutorial",
            "type": "video",
            "url": "https://www.youtube.com/embed/example",
            "description": "Watch how to create and manage invoices"
        },
        {
            "id": 3,
            "title": "Tax Compliance Guide",
            "type": "guide",
            "url": "/resources/tax-compliance.pdf",
            "description": "Understand VAT compliance requirements in the UAE"
        },
        {
            "id": 4,
            "title": "Advanced Features Walkthrough",
            "type": "video",
            "url": "https://www.youtube.com/embed/example2",
            "description": "Learn about advanced features and reporting"
        },
    ]
    
    return Response(resources)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def client_contact(request):
    """Handle client contact form submissions"""
    try:
        data = request.data
        subject = data.get('subject')
        message = data.get('message')
        category = data.get('category')
        email = data.get('email')
        name = data.get('name')
        
        # Here you would typically:
        # 1. Save the message to the database
        # 2. Send an email to your support team
        # 3. Maybe send a confirmation email to the client
        
        # For now, we'll just log it
        print(f"New contact form submission from {name} ({email}):")
        print(f"Category: {category}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
        
        return Response({"message": "Your message has been sent successfully"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_dashboard(request):
    """Get client dashboard data with latest 10 invoices"""
    try:
        # Get user's company from UserProfile (more reliable than request.user.company)
        user_profile = UserProfile.objects.filter(user=request.user).first()
        if not user_profile or not user_profile.company:
            return Response({"error": "Company not found"}, status=404)
            
        company = user_profile.company
        
        # Get 10 latest invoices sorted by created_at (newest first)
        recent_invoices = Invoice.objects.filter(company=company).order_by('-created_at')[:10]
        
        invoices_data = []
        for invoice in recent_invoices:
            invoices_data.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "total_amount": invoice.total_amount,
                "status": invoice.status,
                "created_at": invoice.created_at.isoformat(),
                "human_readable_date": invoice.created_at.strftime("%b %d, %Y"),  # Added human readable
                "client_name": invoice.client.name,  # Added client name for context
                "issue_date": invoice.issue_date.isoformat(),  # Keep original issue date
            })
        
        # Get total count for "View All" logic
        total_invoices = Invoice.objects.filter(company=company).count()
            
        return Response({
            "recent_invoices": invoices_data,
            "total_invoices": total_invoices,  # For frontend to show "View All" when > 10
            "has_more_invoices": total_invoices > 10,  # Helper flag for frontend
        })
    except Exception as e:
        return Response({"error": str(e)}, status=400)

# ---------------------------
# Bank Details Views
# ---------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_defaults(request):
    """Get company default bank details"""
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        company = user_profile.company
        
        response_data = {
            'has_bank_details': company.has_bank_details(),
        }
        
        if company.has_bank_details():
            response_data['bank_details'] = {
                'bank_name': company.bank_name,
                'account_number': company.account_number,
                'iban': company.iban,
            }
        else:
            response_data['bank_details'] = None
            
        return Response(response_data)
    except UserProfile.DoesNotExist:
        return Response({
            'has_bank_details': False,
            'bank_details': None
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e),
            'has_bank_details': False,
            'bank_details': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_company_bank_details(request):
    """Set company bank details explicitly"""
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        company = user_profile.company
        
        bank_name = request.data.get('bank_name')
        account_number = request.data.get('account_number')
        iban = request.data.get('iban')
        
        if not all([bank_name, account_number, iban]):
            return Response(
                {'error': 'All bank details are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        company.set_bank_details(bank_name, account_number, iban)
        
        return Response({
            'message': 'Bank details set successfully',
            'bank_details': {
                'bank_name': company.bank_name,
                'account_number': company.account_number,
                'iban': company.iban,
            }
        })
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )