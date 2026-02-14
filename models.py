import uuid
import os
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.files.base import ContentFile
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify


EMIRATE_CHOICES = (
    ('ABU_DHABI', 'Abu Dhabi'),
    ('DUBAI', 'Dubai'),
    ('SHARJAH', 'Sharjah'),
    ('AJMAN', 'Ajman'),
    ('UMM_AL_QAIWAIN', 'Umm Al Qaiwain'),
    ('RAS_AL_KHAIMAH', 'Ras Al Khaimah'),
    ('FUJAIRAH', 'Fujairah'),
)

def company_pdf_upload_path(instance, filename):
    company_id = instance.company.id
    company_slug = slugify(instance.company.name)
    return f"companies/{company_id}-{company_slug}/pdfs/{filename}"

def company_xml_upload_path(instance, filename):
    company_id = instance.company.id
    company_slug = slugify(instance.company.name)
    return f"companies/{company_id}-{company_slug}/xmls/{filename}"

class Company(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    tax_registration_number = models.CharField(max_length=15, default="UNKNOWN")
    address = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    emirate = models.CharField(max_length=20, choices=EMIRATE_CHOICES, default='DUBAI')
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    iban = models.CharField(max_length=50, blank=True, null=True)

    

    def __str__(self):
        return f"{self.name} ({self.tax_registration_number})"

    def has_bank_details(self):
        """Check if company has any bank details set"""
        return bool(self.bank_name and self.account_number and self.iban)
    
    def set_bank_details(self, bank_name, account_number, iban):
        """Set bank details for the first time"""
        self.bank_name = bank_name
        self.account_number = account_number
        self.iban = iban
        self.save()

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)

    # Instead of ForeignKey to User (causing FK errors)
    referral_code_used = models.CharField(max_length=8, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.company.name if self.company else 'No Company'}"



class Client(models.Model):
    name = models.CharField(max_length=255)
    trn = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name

class Invoice(models.Model):
    INVOICE_STATUS = (
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
    )
    EMIRATE_CHOICES = (
        ('ABU_DHABI', 'Abu Dhabi'),
        ('DUBAI', 'Dubai'),
        ('SHARJAH', 'Sharjah'),
        ('AJMAN', 'Ajman'),
        ('UMM_AL_QAIWAIN', 'Umm Al Qaiwain'),
        ('RAS_AL_KHAIMAH', 'Ras Al Khaimah'),
        ('FUJAIRAH', 'Fujairah'),
    )

    emirate = models.CharField(max_length=20, choices=EMIRATE_CHOICES, default='DUBAI')
    invoice_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=INVOICE_STATUS, default='DRAFT')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    bank_details = models.JSONField(null=True, blank=True, help_text="Custom bank details for this invoice")
    xml_content = models.TextField(null=True, blank=True)

    pdf_file = models.FileField(upload_to=company_pdf_upload_path, null=True, blank=True)
    xml_file = models.FileField(upload_to=company_xml_upload_path, null=True, blank=True)

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='invoices')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client.name}"

    def save(self, *args, **kwargs):
        # Generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        
        # Calculate totals - only when updating existing invoice
        if self.pk:
            self.total_vat_amount = sum(item.vat_amount for item in self.line_items.all())
            self.total_amount = sum(item.total_with_vat for item in self.line_items.all())
        super().save(*args, **kwargs)

    def generate_invoice_number(self):
        try:
            # Count how many invoices this company already has
            existing_count = Invoice.objects.filter(company=self.company).count()
            next_number = existing_count + 1
                
            # Format: INV-{company_id}-{sequential_number}
            company_prefix = f"INV-{self.company.id:04d}"
            new_number = f"{company_prefix}-{next_number:04d}"
            print(f"Generated invoice number: {new_number}")  # Debug
            return new_number
            
        except Exception as e:
            # Fallback: use UUID if anything goes wrong
            print(f"Error generating invoice number: {e}")
            return f"INV-{str(self.uuid)[:8].upper()}"

    def get_created_date_display(self):
        """Return created date in human readable format"""
        return self.created_at.strftime("%b %d, %Y")

    def get_created_time_display(self):
        """Return created time in human readable format"""
        return self.created_at.strftime("%I:%M %p")

    def generate_and_save_pdf(self):
        from .utils import generate_invoice_pdf
        try:
            pdf_buffer = generate_invoice_pdf(self)
            file_name = f"invoice_{self.uuid}.pdf"
            if self.pdf_file:
                self.pdf_file.delete(save=False)
            self.pdf_file.save(file_name, pdf_buffer)
            self.save()
            return True
        except Exception as e:
            print(f"PDF generation error: {e}")
            return False

    def generate_and_save_xml(self):
        from .utils import generate_invoice_xml
        try:
            xml_content = generate_invoice_xml(self)
            self.xml_content = xml_content
            file_name = f"invoice_{self.uuid}.xml"
            if self.xml_file:
                self.xml_file.delete(save=False)
            self.xml_file.save(file_name, ContentFile(xml_content.encode('utf-8')))
            self.save()
            return True
        except Exception as e:
            print(f"XML generation error: {e}")
            return False

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='line_items', on_delete=models.CASCADE)
    description = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.05)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"

    @property
    def line_total(self):
        return self.quantity * self.unit_price

    @property
    def vat_amount(self):
        return self.line_total * self.vat_rate

    @property
    def total_with_vat(self):
        return self.line_total + self.vat_amount



