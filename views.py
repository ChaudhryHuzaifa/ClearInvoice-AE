# subscriptions/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from partners.models import PartnerClient, PartnerCommission
from django.utils import timezone
from decimal import Decimal
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import ClientSubscription
from invoices.models import Company, UserProfile
from partners.models import Partner  # Add this import
from django.db.models import Sum  # Add this import
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

COMMISSION_RATE = Decimal('0.20')


# ---------------------------
# Subscription Plans
# ---------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_plans(request):
    print(f"DEBUG: Plan request from user: {request.user.email}")

    plans = [
        {
            'id': 'FREE',
            'name': 'Free Plan',
            'price': 0,
            'currency': 'AED',
            'invoices': 5,
            'features': ['5 invoices per month', 'Basic features']
        },
        {
            'id': 'STARTER',
            'name': 'Starter Plan',
            'price': 99,
            'currency': 'AED',
            'invoices': 100,
            'features': ['100 invoices per month', 'All basic features', 'Priority support']
        },
        {
            'id': 'UNLIMITED',
            'name': 'Unlimited Plan',
            'price': 149,
            'currency': 'AED',
            'invoices': 'Unlimited',
            'features': ['Unlimited invoices', 'All features', 'Priority support', 'Advanced analytics']
        }
    ]
    return Response({'plans': plans})


# ---------------------------
# Create Subscription
# ---------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    try:
        print(f"DEBUG: Subscription request from user: {request.user.email}")

        user_profile = UserProfile.objects.get(user=request.user)
        if not user_profile.company:
            return Response({"error": "Company not found for user"}, status=400)

        company = user_profile.company
        plan_id = request.data.get('plan_id')

        if hasattr(company, 'subscription'):
            return Response({'error': 'Company already has a subscription'}, status=400)

        # Free plan
        if plan_id == 'FREE':
            ClientSubscription.objects.create(
                company=company,
                plan='FREE',
                user_email=request.user.email
            )
            return Response({
                'success': True,
                'message': 'Free plan activated successfully',
                'redirect_url': '/dashboard/'
            })

        # Paid plans
        elif plan_id in ['STARTER', 'UNLIMITED']:
            prices = {
                'STARTER': 'price_1S3Y7ePJhxCgvKfs9lBczzLZ',  # replace with live IDs
                'UNLIMITED': 'price_1S3YAOPJhxCgvKfsHdBo8W0k'
            }

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{'price': prices[plan_id], 'quantity': 1}],
                mode='subscription',
                customer_email=request.user.email,
                success_url=settings.FRONTEND_URL + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.FRONTEND_URL + '/subscription/cancel',
                client_reference_id=company.id,
                metadata={
                    'plan_id': plan_id,
                    'company_id': company.id,
                    'user_email': request.user.email
                }
            )
            return Response({'checkout_url': checkout_session.url})

        return Response({'error': 'Invalid plan ID'}, status=400)

    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=400)
    except Exception as e:
        print(f"ERROR: create_subscription failed: {e}")
        return Response({'error': str(e)}, status=500)


# ---------------------------
# Stripe Webhook
# ---------------------------
@api_view(['POST'])
@permission_classes([])    
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    print("🔄 Webhook received - starting processing")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        print(f"📨 Webhook event type: {event['type']}")
        print(f"🔍 Event ID: {event['id']}")
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return Response(status=400)

    if event['type'] == 'checkout.session.completed':
        print("🛒 Handling checkout.session.completed")
        handle_checkout_session(event['data']['object'])
    elif event['type'] == 'customer.subscription.created':
        print("🆕 Handling customer.subscription.created")
        handle_subscription_created(event['data']['object'])
    elif event['type'] == 'invoice.paid':
        print("💰 Handling invoice.paid")
        handle_invoice_paid(event['data']['object'])
    elif event['type'] == 'invoice.payment_failed':
        print("❌ Handling invoice.payment_failed")
        handle_payment_failed(event['data']['object'])
    elif event['type'] == 'customer.subscription.deleted':
        print("🚫 Handling customer.subscription.deleted")
        handle_subscription_cancelled(event['data']['object'])
    else:
        print(f"⚪ Unhandled event type: {event['type']}")

    return Response(status=200)


# ---------------------------
# Handlers
# ---------------------------
def handle_checkout_session(session):
    print(f"DEBUG: Handling checkout.session.completed event for {session['id']}")

    company_id = session.get('metadata', {}).get('company_id')
    plan_id = session.get('metadata', {}).get('plan_id')

    if not company_id:
        print("DEBUG: No company_id in session metadata")
        return

    try:
        company = Company.objects.get(id=company_id)

        # Ensure subscription ID is saved
        subscription_id = session.get('subscription')
        if not subscription_id:
            try:
                expanded = stripe.checkout.Session.retrieve(session['id'], expand=['subscription'])
                if expanded.subscription:
                    subscription_id = expanded.subscription.id
            except Exception as e:
                print(f"DEBUG: Failed to expand session: {e}")

        ClientSubscription.objects.update_or_create(
            company=company,
            defaults={
                'plan': plan_id,
                'stripe_subscription_id': subscription_id
            }
        )
        print(f"DEBUG: Subscription saved for company {company.name}, sub_id={subscription_id}")

    except Company.DoesNotExist:
        print(f"DEBUG: Company not found: {company_id}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_subscription(request):
    session_id = request.data.get('session_id')
    if not session_id:
        return Response({'success': False, 'error': 'No session ID provided'}, status=400)

    try:
        session = stripe.checkout.Session.retrieve(session_id, expand=['subscription', 'line_items'])
        company = Company.objects.get(id=session.client_reference_id)

        sub_id = session.subscription.id if session.subscription else None
        plan_id = session.metadata.get('plan_id')

        # DEBUG: Print session details
        print(f"DEBUG: Session ID: {session.id}")
        print(f"DEBUG: Plan ID: {plan_id}")
        print(f"DEBUG: Subscription ID: {sub_id}")

        # Create or update subscription
        subscription, created = ClientSubscription.objects.update_or_create(
            company=company,
            defaults={
                'plan': plan_id,
                'stripe_subscription_id': sub_id
            }
        )

        # ✅ Calculate and record commission for partner (20% of plan price)
        try:
            user_profile = UserProfile.objects.get(company=company)
            partner_client = PartnerClient.objects.get(client_user=user_profile.user)
            
            if partner_client.partner and plan_id != 'FREE':
                # Define plan prices
                plan_prices = {
                    'STARTER': Decimal('99.00'),
                    'UNLIMITED': Decimal('149.00')
                }
                
                if plan_id in plan_prices:
                    # Calculate 20% commission
                    commission_amount = plan_prices[plan_id] * COMMISSION_RATE
                    
                    # Get the actual invoice ID from the subscription
                    stripe_invoice_id = None
                    if sub_id:
                        try:
                            # Get the subscription to find the latest invoice
                            stripe_sub = stripe.Subscription.retrieve(sub_id)
                            stripe_invoice_id = stripe_sub.latest_invoice
                            print(f"DEBUG: Using actual invoice ID: {stripe_invoice_id}")
                        except Exception as e:
                            print(f"DEBUG: Could not get invoice ID: {e}")
                            # Fallback to prevent errors
                            stripe_invoice_id = f"sub_{sub_id}_{int(timezone.now().timestamp())}"
                    
                    # Use subscription ID as fallback if no invoice ID
                    if not stripe_invoice_id:
                        stripe_invoice_id = f"sub_{sub_id}"
                    
                    # ✅ Use get_or_create to prevent duplicates
                    commission, created_commission = PartnerCommission.objects.get_or_create(
                        stripe_invoice_id=stripe_invoice_id,
                        client=partner_client,
                        defaults={
                            'partner': partner_client.partner,
                            'amount': commission_amount,
                            'subscription_plan': plan_id,
                            'payment_date': timezone.now(),
                            'stripe_subscription_id': sub_id,
                            'status': 'PAID'
                        }
                    )
                    
                    if created_commission:
                        print(f"DEBUG: Created new commission: {commission_amount} for invoice {stripe_invoice_id}")
                    else:
                        print(f"DEBUG: Commission already exists: {commission.amount} for invoice {stripe_invoice_id}")

            # Activate partner client
            partner_client.is_active = True
            partner_client.last_payment_date = timezone.now()
            partner_client.save()

            print(f"DEBUG: Partner client {partner_client.client_user.email} activated")

        except (UserProfile.DoesNotExist, PartnerClient.DoesNotExist) as e:
            print(f"DEBUG: No partner client found for {company.name}: {e}")

        return Response({'success': True})

    except Exception as e:
        print(f"DEBUG: Error in confirm_subscription: {e}")
        return Response({'success': False, 'error': str(e)}, status=500)
    except Exception as e:
        print(f"DEBUG: Error in confirm_subscription: {e}")
        return Response({'success': False, 'error': str(e)}, status=500)

# Update the handle_invoice_paid function
def handle_invoice_paid(invoice):
    print(f"DEBUG: Handling invoice.paid event for invoice {invoice['id']}")

    subscription_id = invoice.get('subscription')
    invoice_id = invoice['id']  # This is the actual invoice ID
    
    if not subscription_id:
        print("DEBUG: No subscription ID in invoice")
        return

    try:
        subscription = ClientSubscription.objects.get(stripe_subscription_id=subscription_id)
        company = subscription.company

        # Try to get the partner client linked to this company
        try:
            user_profile = UserProfile.objects.get(company=company)
            partner_client = PartnerClient.objects.get(client_user=user_profile.user)

            # ✅ FIX: Create commission for ALL paid invoices (initial AND recurring)
            if partner_client.partner and subscription.plan != 'FREE':
                # Define plan prices
                plan_prices = {
                    'STARTER': Decimal('99.00'),
                    'UNLIMITED': Decimal('149.00')
                }
                
                if subscription.plan in plan_prices:
                    # Calculate 20% commission
                    commission_amount = plan_prices[subscription.plan] * COMMISSION_RATE
                    
                    # ✅ Use get_or_create to prevent duplicates with the actual invoice ID
                    commission, created = PartnerCommission.objects.get_or_create(
                        stripe_invoice_id=invoice_id,  # Use the actual Stripe invoice ID
                        client=partner_client,
                        defaults={
                            'partner': partner_client.partner,
                            'amount': commission_amount,
                            'subscription_plan': subscription.plan,
                            'payment_date': timezone.now(),
                            'stripe_subscription_id': subscription_id,
                            'status': 'PAID'
                        }
                    )
                    
                    if created:
                        print(f"✅ Commission recorded: {commission_amount} for {partner_client.partner.firm_name} (invoice: {invoice_id})")
                        # Update partner client status
                        partner_client.is_active = True
                        partner_client.last_payment_date = timezone.now()
                        partner_client.save()
                        print(f"✅ Partner client {partner_client.client_user.email} activated/updated")
                    else:
                        print(f"⚠️ Commission already exists for invoice {invoice_id}")

            else:
                print(f"DEBUG: No partner assigned or free plan. Skipping commission for {company.name}")

        except (UserProfile.DoesNotExist, PartnerClient.DoesNotExist) as e:
            print(f"DEBUG: No partner client found for {company.name}. Error: {e}")

    except ClientSubscription.DoesNotExist:
        print(f"DEBUG: Subscription not found: {subscription_id}")
# Update the handle_invoice_paid function
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partner_dashboard(request):
    try:
        partner = Partner.objects.get(user=request.user)
        
        # Get all referred clients
        referred_clients = PartnerClient.objects.filter(partner=partner)
        
        # Calculate commissions - use the actual commission records
        lifetime_commission = PartnerCommission.objects.filter(
            partner=partner,
            status='PAID'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # DEBUG: Print commission details
        print(f"DEBUG: Lifetime Commission: {lifetime_commission}")
        
        # Monthly commission (current month)
        current_month = timezone.now().month
        current_year = timezone.now().year
        monthly_commission = PartnerCommission.objects.filter(
            partner=partner,
            payment_date__month=current_month,
            payment_date__year=current_year,
            status='PAID'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # DEBUG: Print monthly commission details
        print(f"DEBUG: Monthly Commission: {monthly_commission}")
        
        # Prepare client data with commissions
        clients_data = []
        for client in referred_clients:
            # Get all paid commissions for this client
            client_commissions = PartnerCommission.objects.filter(client=client, status='PAID')
            total_commission = client_commissions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # DEBUG: Print client commission details
            print(f"DEBUG: Client {client.client_user.email} Total Commission: {total_commission}")
            
            # Get monthly commissions for this client
            monthly_commission_client = client_commissions.filter(
                payment_date__month=current_month,
                payment_date__year=current_year
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Get company info if available
            try:
                user_profile = UserProfile.objects.get(user=client.client_user)
                company = user_profile.company
                trn = company.tax_registration_number
                subscription_plan = company.subscription.plan if hasattr(company, 'subscription') else 'NONE'
            except (UserProfile.DoesNotExist, AttributeError):
                trn = ''
                subscription_plan = 'NONE'
            
            clients_data.append({
                'id': client.id,
                'name': client.client_user.email,
                'email': client.client_user.email,
                'trn': trn,
                'is_active': client.is_active,
                'total_commission': float(total_commission),
                'monthly_commission': float(monthly_commission_client),
                'subscription_plan': subscription_plan,
                'last_payment_date': client.last_payment_date,
                'created_at': client.created_at
            })
        
        return Response({
            'partner_name': partner.firm_name,
            'referral_link': f"{settings.FRONTEND_URL}/signup?ref={partner.referral_code}",
            'referral_code': partner.referral_code,
            'total_clients': referred_clients.count(),
            'active_clients': referred_clients.filter(is_active=True).count(),
            'lifetime_commission': float(lifetime_commission),
            'monthly_commission': float(monthly_commission),
            'clients': clients_data
        })
        
    except Partner.DoesNotExist:
        return Response({'error': 'Partner not found'}, status=404)


def handle_subscription_cancelled(subscription):
    subscription_id = subscription.get('id')
    if not subscription_id:
        return

    try:
        client_subscription = ClientSubscription.objects.get(stripe_subscription_id=subscription_id)
        company = client_subscription.company

        try:
            user_profile = UserProfile.objects.get(company=company)
            partner_client = PartnerClient.objects.get(client_user=user_profile.user)

            partner_client.is_active = False
            partner_client.save()
            print(f"DEBUG: Client inactive due to cancellation: {company.name}")

        except (UserProfile.DoesNotExist, PartnerClient.DoesNotExist):
            print(f"DEBUG: No partner client found for {company.name}")

    except ClientSubscription.DoesNotExist:
        print(f"DEBUG: Subscription not found: {subscription_id}")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_subscription(request):
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        company = user_profile.company
        
        try:
            subscription = ClientSubscription.objects.get(company=company)
            data = {
                'id': subscription.id,
                'plan': subscription.plan,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'is_active': subscription.is_active,
                'stripe_subscription_id': subscription.stripe_subscription_id,
                'company': {
                    'name': company.name,
                    'tax_registration_number': company.tax_registration_number or 'Not provided'
                }
            }
            return Response(data)
            
        except ClientSubscription.DoesNotExist:
            # Create a free subscription if none exists
            subscription = ClientSubscription.objects.create(
                company=company,
                plan='FREE',
                is_active=True
            )
            data = {
                'id': subscription.id,
                'plan': subscription.plan,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'is_active': subscription.is_active,
                'stripe_subscription_id': subscription.stripe_subscription_id,
                'company': {
                    'name': company.name,
                    'tax_registration_number': company.tax_registration_number or 'Not provided'
                }
            }
            return Response(data)
            
    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)
    except Company.DoesNotExist:
        return Response({"error": "Company not found"}, status=404)


def handle_subscription_created(subscription):
    """Handle new subscription creation from webhook"""
    print(f"🆕 Handling subscription creation: {subscription['id']}")
    
    subscription_id = subscription['id']
    customer_id = subscription.get('customer')
    
    print(f"📋 Subscription ID: {subscription_id}")
    print(f"👤 Customer ID: {customer_id}")
    
    # Try to find the company by customer email
    try:
        # Get customer details from Stripe
        customer = stripe.Customer.retrieve(customer_id)
        customer_email = customer.get('email')
        
        print(f"📧 Customer email: {customer_email}")
        
        if customer_email:
            # Find the user by email
            from django.contrib.auth.models import User
            user = User.objects.get(email=customer_email)
            user_profile = UserProfile.objects.get(user=user)
            company = user_profile.company
            
            # Get plan from subscription
            plan_id = subscription['items']['data'][0]['price']['id']
            plan_mapping = {
                'price_1S3Y7ePJhxCgvKfs9lBczzLZ': 'STARTER',
                'price_1S3YAOPJhxCgvKfsHdBo8W0k': 'UNLIMITED'
            }
            plan_name = plan_mapping.get(plan_id, 'UNKNOWN')
            
            print(f"🏢 Company found: {company.name}")
            print(f"📦 Plan: {plan_name}")
            
            # Create or update subscription
            ClientSubscription.objects.update_or_create(
                company=company,
                defaults={
                    'plan': plan_name,
                    'stripe_subscription_id': subscription_id,
                    'is_active': True
                }
            )
            print(f"✅ Subscription saved for {company.name}")
            
        else:
            print("❌ No customer email found")
            
    except User.DoesNotExist:
        print(f"❌ User not found for email: {customer_email}")
    except UserProfile.DoesNotExist:
        print(f"❌ User profile not found for user: {user.email}")
    except Company.DoesNotExist:
        print(f"❌ Company not found for user profile")
    except Exception as e:
        print(f"❌ Error handling subscription creation: {e}")