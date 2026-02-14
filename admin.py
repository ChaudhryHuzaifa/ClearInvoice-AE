from django.contrib import admin
from .models import Partner, PartnerClient, PayoutRequest, PartnerSettings, PartnerCommission

@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = ['partner', 'amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['partner__firm_name', 'account_holder_name']

@admin.register(PartnerCommission)
class PartnerCommissionAdmin(admin.ModelAdmin):
    list_display = ['partner', 'client', 'amount', 'subscription_plan', 'status', 'payment_date']
    list_filter = ['status', 'payment_date', 'subscription_plan']
    search_fields = ['partner__firm_name', 'client__client_user__username']
    readonly_fields = ['created_at']


@admin.register(PartnerSettings)
class PartnerSettingsAdmin(admin.ModelAdmin):
    list_display = ['partner', 'email_notifications', 'sms_notifications']
    search_fields = ['partner__firm_name']

# Keep your existing registrations
admin.site.register(Partner)
admin.site.register(PartnerClient)