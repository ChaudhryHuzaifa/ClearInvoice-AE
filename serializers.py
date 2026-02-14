from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils.crypto import get_random_string
from .models import Invoice, InvoiceItem, Company, Client, UserProfile
from .models import EMIRATE_CHOICES



# ---------------------------
# Company / Client Serializers
# ---------------------------

class CompanySerializer(serializers.ModelSerializer):
    has_bank_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ["name", "tax_registration_number", "email", "phone", "address", "emirate", "has_bank_details", "bank_name", "account_number", "iban"]
        read_only_fields = ["has_bank_details", "bank_name", "account_number", "iban"]
    
    def get_has_bank_details(self, obj):
        return obj.has_bank_details()



class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ('id', 'invoice')


# ---------------------------
# Registration Serializers
# ---------------------------



# invoices/serializers.py
class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True)
    company_name = serializers.CharField(write_only=True)
    tax_registration_number = serializers.CharField(write_only=True, required=False)
    company_email = serializers.EmailField(write_only=True, required=False)
    phone_number = serializers.CharField(write_only=True, required=False)
    referral_code = serializers.CharField(required=False, write_only=True)
    emirate = serializers.ChoiceField(choices=EMIRATE_CHOICES, write_only=True, required=False, default='DUBAI')

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password2',
            'company_name', 'tax_registration_number',
            'company_email', 'phone_number', 'referral_code', 'emirate'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password2', None)
        referral_code = validated_data.pop('referral_code', None)
        emirate = validated_data.pop('emirate', 'DUBAI')

        # Create user
        email = validated_data.get('email')
        user = User.objects.create(
            username=email,
            email=email
        )
        user.set_password(password)
        user.save()

        # Create company
        company = Company.objects.create(
            name=validated_data.pop('company_name'),
            tax_registration_number=validated_data.pop('tax_registration_number', 'UNKNOWN'),
            email=validated_data.pop('company_email', ''),
            phone=validated_data.pop('phone_number', ''),
            emirate=emirate  # Add emirate field
        )

        # Get the UserProfile created by the signal and update it
        try:
            profile = UserProfile.objects.get(user=user)
            profile.company = company
            # If referral code provided, handle it
            if referral_code:
                profile.referral_code_used = referral_code
            profile.save()
        except UserProfile.DoesNotExist:
            # Fallback: create if signal didn't work
            profile = UserProfile.objects.create(
                user=user, 
                company=company,
                referral_code_used=referral_code
            )

        return user


# ---------------------------
# User Serializer
# ---------------------------

class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)  # Include related company

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "company"]

# ---------------------------
# Invoice Serializers
# ---------------------------

class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceItemSerializer(many=True, read_only=True)
    company_details = CompanySerializer(source='company', read_only=True)
    client_details = ClientSerializer(source='client', read_only=True)
    pdf_url = serializers.SerializerMethodField()
    xml_url = serializers.SerializerMethodField()
    bank_details = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = (
            'id', 'uuid', 'created_at', 'updated_at', 
            'total_amount', 'total_vat_amount', 'pdf_file', 'xml_file',
            'xml_content', 'pdf_url', 'xml_url', 'company', 'created_by'
        )
    
    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.pdf_file and request:
            return request.build_absolute_uri(obj.pdf_file.url)
        return None
    
    def get_xml_url(self, obj):
        request = self.context.get('request')
        if obj.xml_file and request:
            return request.build_absolute_uri(obj.xml_file.url)
        return None


class InvoiceCreateSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all(), required=False, allow_null=True)
    client_name = serializers.CharField(write_only=True, required=False)
    client_trn = serializers.CharField(write_only=True, required=False, allow_blank=True)
    client_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    client_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    client_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    emirate = serializers.ChoiceField(choices=Invoice.EMIRATE_CHOICES, required=True)
    line_items = InvoiceItemSerializer(many=True, required=False)
    bank_details = serializers.JSONField(required=False, allow_null=True)
    use_company_bank_details = serializers.BooleanField(write_only=True, default=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'issue_date', 'due_date',
            'status', 'client', 'company', 'line_items', 'emirate',
            'client_name', 'client_trn', 'client_address', 'client_email', 'client_phone',
            'bank_details', 'use_company_bank_details'
        ]
        read_only_fields = ['id', 'company', 'created_by', 'invoice_number']

    def validate(self, attrs):
        if not attrs.get('client') and not attrs.get('client_name'):
            raise serializers.ValidationError(
                "Either provide an existing client ID or client details to create a new client."
            )
        return attrs

    def create(self, validated_data):
        # Extract client fields
        client = validated_data.pop('client', None)
        client_name = validated_data.pop('client_name', None)
        client_trn = validated_data.pop('client_trn', '')
        client_address = validated_data.pop('client_address', '')
        client_email = validated_data.pop('client_email', '')
        client_phone = validated_data.pop('client_phone', '')
        
        # Extract bank details fields
        use_company_bank_details = validated_data.pop('use_company_bank_details', True)
        bank_details = validated_data.pop('bank_details', None)

        company = self.context.get('company')
        user = self.context.get('user')

        if not company or not user:
            raise serializers.ValidationError("Company and user are required.")

        # Create client if not provided
        if client is None and client_name:
            client = Client.objects.create(
                name=client_name,
                trn=client_trn,
                address=client_address,
                email=client_email,
                phone=client_phone
            )

        validated_data['client'] = client
        validated_data['company'] = company
        validated_data['created_by'] = user

        # Ensure invoice number
        if not validated_data.get('invoice_number'):
            validated_data['invoice_number'] = f"INV-{get_random_string(8).upper()}"

        # Handle bank details logic
        if not use_company_bank_details and bank_details:
            validated_data['bank_details'] = bank_details
            
            # If this is the first time setting bank details for the company, save them as defaults
            if not company.has_bank_details() and all([
                bank_details.get('bank_name'),
                bank_details.get('account_number'), 
                bank_details.get('iban')
            ]):
                company.set_bank_details(
                    bank_name=bank_details['bank_name'],
                    account_number=bank_details['account_number'],
                    iban=bank_details['iban']
                )

        # Line items
        line_items_data = validated_data.pop('line_items', [])
        if not line_items_data:
            line_items_data = [{'description': 'Item', 'quantity': 1, 'unit_price': 0.0, 'vat_rate': 0.0}]
        
        invoice = Invoice.objects.create(**validated_data)
        for item_data in line_items_data:
            item_data.pop('invoice', None)
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        
        invoice.save()

        # PDF/XML generation
        try:
            invoice.generate_and_save_pdf()
        except Exception as e:
            print(f"PDF generation error: {e}")
        try:
            invoice.generate_and_save_xml()
        except Exception as e:
            print(f"XML generation error: {e}")

        return invoice