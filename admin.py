# subscriptions/admin.py
from django.contrib import admin
from .models import ClientSubscription

@admin.register(ClientSubscription)
class ClientSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['company', 'plan', 'start_date', 'end_date', 'is_active', 'remaining_invoices']
    list_editable = ['plan', 'is_active']
    list_filter = ['plan', 'is_active']
    search_fields = ['company__name']