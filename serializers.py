from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Partner, PartnerClient, PayoutRequest, PartnerSettings, PartnerCommission, PayoutTransaction, Notification
from .models import PartnerClient, Partner
from decimal import Decimal
from invoices.models import UserProfile
import logging

class PartnerRegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    referral_code = serializers.CharField(read_only=True)
    referral_link = serializers.SerializerMethodField()

    class Meta:
        model = Partner
        fields = ["firm_name", "email", "password", "referral_code", "referral_link"]

    def create(self, validated_data):
        email = validated_data.pop("email")
        password = validated_data.pop("password")

        # 1️⃣ Create User
        user = User.objects.create_user(username=email, email=email, password=password)

        # 2️⃣ Create Partner linked to User
        partner = Partner.objects.create(user=user, **validated_data)

        # 3️⃣ Create Auth Token
        Token.objects.create(user=user)

        return partner

    def get_referral_link(self, obj):
        request = self.context.get('request')
        base_url = request.build_absolute_uri('/')[:-1] if request else "http://localhost:3000"
        return f"{base_url}/signup?ref={obj.referral_code}"





class PartnerClientSerializer(serializers.ModelSerializer):
    client_email = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    invoices = serializers.SerializerMethodField()

    class Meta:
        model = PartnerClient
        fields = ['id', 'client_name', 'client_email', 'subscription_active', 'invoices']

    def get_client_email(self, obj):
        return obj.client_user.email

    def get_client_name(self, obj):
        return obj.client_user.username

    def get_invoices(self, obj):
        return [
            {
                'id': inv.id,
                'invoice_number': inv.id,
                'total_amount': str(inv.total_amount),
                'total_vat_amount': str(inv.vat_amount),
                'status': inv.status,
                'issue_date': inv.issue_date
            }
            for inv in obj.client_user.invoice_set.all()
        ]




class ClientRegisterSerializer(serializers.ModelSerializer):
    referral_code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = PartnerClient
        fields = ['name', 'email', 'subscription_active', 'referral_code']

    def create(self, validated_data):
        referral_code = validated_data.pop('referral_code', None)
        client_name = validated_data.pop('name')
        client_email = validated_data.pop('email')

        # 1️⃣ Create User (signal will auto-create UserProfile)
        user = User.objects.create_user(
            username=client_name,
            email=client_email
        )

        # 2️⃣ Lookup Partner by referral code
        partner = None
        if referral_code:
            try:
                partner = Partner.objects.get(referral_code=referral_code)
            except Partner.DoesNotExist:
                partner = None

        # 3️⃣ Create PartnerClient
        client = PartnerClient.objects.create(
            client_user=user,
            partner=partner,
            **validated_data
        )

        # 4️⃣ Update existing UserProfile (already created by signal)
        profile = user.userprofile  # guaranteed to exist
        profile.referral_code_used = referral_code
        profile.save(update_fields=["referral_code_used"])

        # 5️⃣ Create Auth Token
        Token.objects.create(user=user)

        return client


class PartnerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerSettings
        fields = ['email_notifications', 'sms_notifications', 'preferred_language', 'theme']

from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'created_at', 'notification_type', 'time_ago']
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)



class PartnerBalanceSerializer(serializers.ModelSerializer):
    """Serializer for partner balance information"""
    firm_name = serializers.CharField(read_only=True)
    contact_person = serializers.CharField(read_only=True)
    
    # Balance summary
    available_balance_display = serializers.CharField(source='get_available_balance', read_only=True)
    can_request_payout = serializers.SerializerMethodField()
    payout_eligibility = serializers.SerializerMethodField()
    
    class Meta:
        model = Partner
        fields = [
            'id', 'firm_name', 'contact_person', 'referral_code',
            'total_earnings', 'available_balance', 'total_paid_out',
            'available_balance_display', 'can_request_payout', 'payout_eligibility',
            'commission_rate'
        ]
        read_only_fields = fields
    
    def get_can_request_payout(self, obj):
        """Check if partner can request any payout"""
        can_request, message = obj.can_request_payout()
        return can_request
    
    def get_payout_eligibility(self, obj):
        """Get payout eligibility message"""
        can_request, message = obj.can_request_payout()
        return message


class PartnerSerializer(serializers.ModelSerializer):
    """Main partner serializer"""
    balance_summary = serializers.SerializerMethodField()
    total_clients = serializers.SerializerMethodField()
    active_clients = serializers.SerializerMethodField()
    
    class Meta:
        model = Partner
        fields = [
            'id', 'user', 'firm_name', 'contact_person', 'phone_number',
            'referral_code', 'commission_rate', 'total_earnings',
            'available_balance', 'total_paid_out', 'balance_summary',
            'total_clients', 'active_clients'
        ]
        read_only_fields = [
            'referral_code', 'total_earnings', 'available_balance', 
            'total_paid_out', 'balance_summary', 'total_clients', 'active_clients'
        ]
    
    def get_balance_summary(self, obj):
        """Get balance summary for dashboard"""
        return {
            'available_balance': obj.available_balance,
            'total_earnings': obj.total_earnings,
            'total_paid_out': obj.total_paid_out,
            'currency': 'AED'
        }
    
    def get_total_clients(self, obj):
        """Get total number of clients"""
        return obj.clients.count()
    
    def get_active_clients(self, obj):
        """Get number of active clients"""
        return obj.clients.filter(is_active=True).count()


class PartnerClientSerializer(serializers.ModelSerializer):
    """Serializer for partner clients"""
    partner_name = serializers.CharField(source='partner.firm_name', read_only=True)
    client_name = serializers.CharField(source='client_user.get_full_name', read_only=True)
    client_email = serializers.CharField(source='client_user.email', read_only=True)
    client_username = serializers.CharField(source='client_user.username', read_only=True)
    total_commission_generated = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        read_only=True,
        source='total_commission'
    )
    
    class Meta:
        model = PartnerClient
        fields = [
            'id', 'partner', 'partner_name', 'client_user', 'client_name',
            'client_email', 'client_username', 'trn', 'is_active',
            'created_at', 'last_payment_date', 'total_commission_generated'
        ]
        read_only_fields = [
            'created_at', 'last_payment_date', 'total_commission_generated'
        ]


class PartnerCommissionSerializer(serializers.ModelSerializer):
    """Serializer for partner commissions"""
    partner_name = serializers.CharField(source='partner.firm_name', read_only=True)
    client_name = serializers.CharField(source='client.client_user.get_full_name', read_only=True)
    client_email = serializers.CharField(source='client.client_user.email', read_only=True)
    
    class Meta:
        model = PartnerCommission
        fields = [
            'id', 'partner', 'partner_name', 'client', 'client_name', 'client_email',
            'amount', 'subscription_plan', 'payment_date', 'stripe_invoice_id',
            'stripe_subscription_id', 'status', 'created_at'
        ]
        read_only_fields = [
            'created_at', 'payment_date'
        ]


class PayoutRequestSerializer(serializers.ModelSerializer):
    """Serializer for payout requests"""
    partner_name = serializers.CharField(source='partner.firm_name', read_only=True)
    partner_email = serializers.CharField(source='partner.user.email', read_only=True)
    available_balance = serializers.DecimalField(
        source='partner.available_balance',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    can_cancel = serializers.BooleanField(source='can_be_cancelled', read_only=True)
    payment_details = serializers.JSONField(source='get_payment_details', read_only=True)
    
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'partner', 'partner_name', 'partner_email', 'amount', 
            'payment_method', 'available_balance',
            
            # Bank transfer details
            'bank_name', 'account_number', 'account_holder_name', 'iban', 'swift_code',
            
            # PayPal details
            'paypal_email',
            
            # Wise details
            'wise_email',
            
            # Check details
            'mailing_address',
            
            # Status and notes
            'notes', 'status', 'admin_notes', 'processed_by',
            
            # Timestamps
            'created_at', 'updated_at', 'processed_at',
            
            # Transaction info
            'transaction_id', 'receipt_url',
            
            # Computed fields
            'can_cancel', 'payment_details'
        ]
        read_only_fields = [
            'status', 'admin_notes', 'processed_by', 'created_at', 'updated_at',
            'processed_at', 'transaction_id', 'receipt_url', 'partner_name',
            'partner_email', 'available_balance', 'can_cancel', 'payment_details'
        ]
    
    def validate_amount(self, value):
        """Validate payout amount"""
        from decimal import Decimal
        
        # Minimum payout amount
        if value < Decimal('50.00'):
            raise serializers.ValidationError("Minimum payout amount is 50.00 AED")
        
        # Check if partner has sufficient balance
        partner = self.context.get('partner')
        if partner and value > partner.available_balance:
            raise serializers.ValidationError(
                f"Amount exceeds available balance of {partner.available_balance} AED"
            )
        
        return value
    
    def validate(self, data):
        """Validate payment method specific fields"""
        payment_method = data.get('payment_method')
        
        # Bank transfer validations
        if payment_method == 'BANK_TRANSFER':
            if not data.get('bank_name'):
                raise serializers.ValidationError({
                    'bank_name': 'Bank name is required for bank transfers'
                })
            if not data.get('account_number'):
                raise serializers.ValidationError({
                    'account_number': 'Account number is required for bank transfers'
                })
            if not data.get('account_holder_name'):
                raise serializers.ValidationError({
                    'account_holder_name': 'Account holder name is required for bank transfers'
                })
        
        # PayPal validations
        elif payment_method == 'PAYPAL':
            if not data.get('paypal_email'):
                raise serializers.ValidationError({
                    'paypal_email': 'PayPal email is required for PayPal payments'
                })
        
        # Wise validations
        elif payment_method == 'WISE':
            if not data.get('wise_email'):
                raise serializers.ValidationError({
                    'wise_email': 'Wise email is required for Wise transfers'
                })
        
        # Check validations
        elif payment_method == 'CHECK':
            if not data.get('mailing_address'):
                raise serializers.ValidationError({
                    'mailing_address': 'Mailing address is required for check payments'
                })
        
        return data


class PayoutRequestCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating payout requests"""
    class Meta:
        model = PayoutRequest
        fields = [
            'amount', 'payment_method', 'bank_name', 'account_number',
            'account_holder_name', 'iban', 'swift_code', 'paypal_email',
            'wise_email', 'mailing_address', 'notes'
        ]
    
    def validate_amount(self, value):
        """Validate amount against available balance"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            partner = getattr(request.user, 'partner', None)
            if partner:
                # Update balance to ensure we have latest data
                partner.update_balance()
                
                if value > partner.available_balance:
                    raise serializers.ValidationError(
                        f"Amount exceeds available balance of {partner.available_balance} AED"
                    )
                
                # Check minimum payout amount
                if value < Decimal('50.00'):
                    raise serializers.ValidationError("Minimum payout amount is 50.00 AED")
        
        return value


class PayoutTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payout transaction audit trail"""
    payout_amount = serializers.DecimalField(
        source='payout_request.amount',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    partner_name = serializers.CharField(
        source='partner.firm_name',
        read_only=True
    )
    payment_method = serializers.CharField(
        source='payout_request.payment_method',
        read_only=True
    )
    
    class Meta:
        model = PayoutTransaction
        fields = [
            'id', 'payout_request', 'payout_amount', 'partner_name', 'payment_method',
            'amount', 'currency', 'gateway_id', 'gateway_transaction_id',
            'gateway_status', 'processing_fee', 'net_amount', 'initiated_at',
            'completed_at', 'metadata'
        ]
        read_only_fields = fields


class PartnerSettingsSerializer(serializers.ModelSerializer):
    """Serializer for partner settings and preferences"""
    partner_name = serializers.CharField(source='partner.firm_name', read_only=True)
    
    class Meta:
        model = PartnerSettings
        fields = [
            'id', 'partner', 'partner_name', 'email_notifications',
            'sms_notifications', 'preferred_language', 'theme'
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'is_read', 'created_at',
            'notification_type', 'related_object_id', 'time_ago'
        ]
        read_only_fields = fields
    
    def get_time_ago(self, obj):
        """Get human-readable time difference"""
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        return timesince(obj.created_at, timezone.now()) + ' ago'


# Dashboard Serializers
class PartnerDashboardSerializer(serializers.Serializer):
    """Serializer for partner dashboard data"""
    balance_summary = serializers.DictField()
    recent_commissions = PartnerCommissionSerializer(many=True)
    pending_payouts = PayoutRequestSerializer(many=True)
    payout_history = PayoutRequestSerializer(many=True)
    client_stats = serializers.DictField()
    recent_notifications = NotificationSerializer(many=True)


class PartnerBalanceSummarySerializer(serializers.Serializer):
    """Simplified serializer for balance dashboard"""
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payouts = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(default='AED')
    can_request_payout = serializers.BooleanField()
    payout_eligibility_message = serializers.CharField()


# Admin Serializers
class AdminPayoutRequestSerializer(PayoutRequestSerializer):
    """Extended serializer for admin payout management"""
    partner_balance = serializers.DecimalField(
        source='partner.available_balance',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    partner_total_earnings = serializers.DecimalField(
        source='partner.total_earnings',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta(PayoutRequestSerializer.Meta):
        fields = PayoutRequestSerializer.Meta.fields + [
            'partner_balance', 'partner_total_earnings'
        ]
        read_only_fields = PayoutRequestSerializer.Meta.read_only_fields + [
            'partner_balance', 'partner_total_earnings'
        ]