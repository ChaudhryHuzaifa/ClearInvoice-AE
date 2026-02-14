# invoices/admin.py

from django.contrib import admin
from .models import Company, Client, Invoice, InvoiceItem, UserProfile

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'tax_registration_number', 'phone', 'emirate']  # Changed 'phone_number' to 'phone'
    search_fields = ['name', 'tax_registration_number', 'emirate']

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'trn', 'email', 'phone']  # Added 'phone' to display
    search_fields = ['name', 'trn', 'email']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'company']
    search_fields = ['user__username', 'company__name']

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'company', 'client', 'issue_date', 'due_date', 'status', 'total_amount']
    list_filter = ['status', 'issue_date', 'due_date']
    search_fields = ['invoice_number', 'company__name', 'client__name']
    inlines = [InvoiceItemInline]
    readonly_fields = ['uuid', 'created_at', 'updated_at']

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'description', 'quantity', 'unit_price', 'vat_rate']
    list_filter = ['invoice']
    search_fields = ['description', 'invoice__invoice_number']