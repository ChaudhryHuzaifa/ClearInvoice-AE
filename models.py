# subscriptions/models.py
from django.db import models
from invoices.models import Company
from datetime import datetime, timedelta

class ClientSubscription(models.Model):
    PLAN_CHOICES = [
        ('FREE', 'Free'),
        ('STARTER', 'Starter'),
        ('UNLIMITED', 'Unlimited'),
    ]
    
    company = models.OneToOneField(
        Company, 
        on_delete=models.CASCADE, 
        related_name='subscription'
    )
    plan = models.CharField(
        max_length=20, 
        choices=PLAN_CHOICES, 
        default='FREE'
    )
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField()
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.pk:  # New subscription
            if self.plan == 'FREE':
                self.end_date = datetime.now().date() + timedelta(days=365*10)  # 10 years
            else:
                self.end_date = datetime.now().date() + timedelta(days=30)  # Monthly subscription
        super().save(*args, **kwargs)

    def remaining_invoices(self):
        if self.plan == 'UNLIMITED':
            return float('inf')
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        invoices_this_month = self.company.invoices.filter(
            issue_date__month=current_month,
            issue_date__year=current_year
        ).count()
        
        limits = {'FREE': 5, 'STARTER': 100}
        return max(limits.get(self.plan, 0) - invoices_this_month, 0)

    def __str__(self):
        return f"{self.company.name} - {self.plan}"