# partners/models.py
from django.db import models
from django.contrib.auth.models import User
from invoices.models import Company, Invoice
import uuid
import random
from decimal import Decimal

class Partner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    firm_name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    referral_code = models.CharField(max_length=8, unique=True, editable=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid_out = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self.generate_unique_referral_code()
        super().save(*args, **kwargs)

    def generate_unique_referral_code(self):
        while True:
            code = str(random.randint(10000000, 99999999))
            if not Partner.objects.filter(referral_code=code).exists():
                return code

    def update_balance(self):
        """Update available balance based on commissions and payouts"""
        from django.db.models import Sum
        from decimal import Decimal
        
        # Calculate total paid commissions
        total_commissions = self.commissions.filter(status='PAID').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Calculate total approved/paid payouts
        total_payouts = self.payouts.filter(status__in=['APPROVED', 'PAID']).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Update fields
        self.total_earnings = total_commissions
        self.available_balance = total_commissions - total_payouts
        self.total_paid_out = total_payouts
        
        # Save only the updated fields to avoid recursion
        self.save(update_fields=['total_earnings', 'available_balance', 'total_paid_out'])
        
        print(f"DEBUG: Updated balance for {self.firm_name}: "
              f"Earnings={self.total_earnings}, "
              f"Available={self.available_balance}, "
              f"Paid Out={self.total_paid_out}")
        
        return self.available_balance

    def get_available_balance(self):
        """Get the current available balance (forces update)"""
        return self.update_balance()

    def can_request_payout(self, amount=None):
        """Check if partner can request a payout"""
        available_balance = self.update_balance()
        
        if amount and amount > available_balance:
            return False, f"Requested amount exceeds available balance"
        
        if available_balance < Decimal('50.00'):
            return False, f"Minimum payout amount is 50 AED"
            
        return True, "Eligible for payout"

    def monthly_earnings(self, month=None, year=None):
        """Monthly earnings for this partner"""
        from django.utils import timezone
        from django.db.models import Sum
        from decimal import Decimal
        
        if month is None:
            month = timezone.now().month
        if year is None:
            year = timezone.now().year
            
        return self.commissions.filter(
            status='PAID',
            payment_date__month=month,
            payment_date__year=year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def __str__(self):
        return self.firm_name
   

class PayoutRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved - Processing'),
        ('PAID', 'Paid Successfully'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled by Partner'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('PAYPAL', 'PayPal'),
        ('WISE', 'Wise'),
        ('CHECK', 'Check'),
    ]
    
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name="payouts")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='BANK_TRANSFER')
    
    # Bank transfer details
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    account_holder_name = models.CharField(max_length=255, blank=True, null=True)
    iban = models.CharField(max_length=34, blank=True, null=True)  # International Bank Account Number
    swift_code = models.CharField(max_length=11, blank=True, null=True)
    
    # PayPal details
    paypal_email = models.EmailField(blank=True, null=True)
    
    # Wise details
    wise_email = models.EmailField(blank=True, null=True)
    
    # Check details
    mailing_address = models.TextField(blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Admin fields
    admin_notes = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payouts')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    # Transaction reference
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    receipt_url = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['partner', 'created_at']),
        ]

    def __str__(self):
        return f"Payout #{self.id} - {self.partner.firm_name} - {self.amount} AED"

    def can_be_cancelled(self):
        return self.status == 'PENDING'

    def get_payment_details(self):
        """Get formatted payment details based on payment method"""
        if self.payment_method == 'BANK_TRANSFER':
            return {
                'type': 'Bank Transfer',
                'details': f"{self.bank_name} - {self.account_number}",
                'holder': self.account_holder_name,
                'iban': self.iban,
                'swift': self.swift_code
            }
        elif self.payment_method == 'PAYPAL':
            return {
                'type': 'PayPal',
                'details': self.paypal_email
            }
        elif self.payment_method == 'WISE':
            return {
                'type': 'Wise',
                'details': self.wise_email
            }
        elif self.payment_method == 'CHECK':
            return {
                'type': 'Check',
                'details': self.mailing_address
            }
        return {}

class PayoutTransaction(models.Model):
    """Track the actual payout transactions for audit purposes"""
    payout_request = models.OneToOneField(PayoutRequest, on_delete=models.CASCADE, related_name='transaction')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='AED')
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name='payout_transactions')
    
    # Payment gateway details (if using Stripe, PayPal, etc.)
    gateway_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_status = models.CharField(max_length=50, blank=True, null=True)
    
    # Fees and net amount
    processing_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Transaction for Payout #{self.payout_request.id}"


class PartnerClient(models.Model):
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name="clients", null=True, blank=True)
    client_user = models.OneToOneField(User, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)  # Track if client is currently active
    trn = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_payment_date = models.DateTimeField(null=True, blank=True)  # Track last successful payment

    def total_commission(self):
        # Calculate total commission earned from this client
        return self.commissions.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    def __str__(self):
        return f"{self.client_user.username} -> {self.partner.firm_name if self.partner else 'No Partner'}"

class PartnerCommission(models.Model):
    partner = models.ForeignKey(Partner, on_delete=models.CASCADE, related_name="commissions")
    client = models.ForeignKey(PartnerClient, on_delete=models.CASCADE, related_name="commissions")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    subscription_plan = models.CharField(max_length=20)  # FREE, STARTER, UNLIMITED
    payment_date = models.DateTimeField()
    stripe_invoice_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)  # Add this field
    status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'Pending'), ('PAID', 'Paid'), ('FAILED', 'Failed')],
        default='PENDING'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['payment_date', 'status']),
            models.Index(fields=['stripe_invoice_id']),  # Add index for faster lookups
        ]
        unique_together = ['stripe_invoice_id', 'client']  # ✅ ADD THIS LINE - Prevents duplicates

    def __str__(self):
        return f"{self.partner.firm_name} - {self.client.client_user.username} - {self.amount}"



class PartnerSettings(models.Model):
    partner = models.OneToOneField(Partner, on_delete=models.CASCADE, related_name="settings")
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=10, default="English")
    theme = models.CharField(max_length=10, default="light")
    
    def __str__(self):
        return f"Settings for {self.partner.firm_name}"

from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    notification_type = models.CharField(max_length=50, default='info')  # Add this field
    related_object_id = models.PositiveIntegerField(null=True, blank=True)  # Add this field
    related_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)  # Add this field

    def __str__(self):
        return f"{self.title} - {self.user.username}"

