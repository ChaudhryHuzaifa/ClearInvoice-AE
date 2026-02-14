import io
import os
import tempfile
import base64
import qrcode
import xml.etree.ElementTree as ET
import json
from datetime import datetime
from decimal import Decimal


from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image
)

# If get_partner_sales_report uses Invoice model & Sum, import them.
# (Import here to avoid circular imports elsewhere — adjust if needed.)
try:
    from invoices.models import Invoice
    from django.db.models import Sum
except Exception:
    Invoice = None
    Sum = None


# ---------------------------
# Utilities / configuration
# ---------------------------
EMIRATE_CODE_MAP = {
    "Abu Dhabi": "AZ",
    "AbuDhabi": "AZ",
    "Abu_Dhabi": "AZ",
    "Dubai": "DU",
    "Sharjah": "SH",
    "Ajman": "AJ",
    "Umm Al Quwain": "UQ",
    "Ras Al Khaimah": "RK",
    "Fujairah": "FU",
    # fallback for common variations
    "AD": "AZ",
    "DU": "DU",
    "SH": "SH",
}


def get_emirate_code(emirate_name):
    if not emirate_name:
        return ""
    return EMIRATE_CODE_MAP.get(emirate_name.strip(), emirate_name[:2].upper())


def safe_text(value):
    return "" if value is None else str(value)


# ---------------------------
# Fatoora TLV QR generator
# ---------------------------
def generate_fatoora_qr(invoice):
    """
    Returns base64-encoded TLV according to UAE Fatoora spec (ready to display as QR payload).
    Note: For PDF we convert TLV to an image; for XML we embed a PNG base64 as an attachment if needed.
    """
    def to_tlv(tag, value):
        if value is None:
            value = ""
        value_bytes = str(value).encode("utf-8")
        return bytes([tag, len(value_bytes)]) + value_bytes

    seller = to_tlv(1, invoice.company.name or "")
    trn = to_tlv(2, invoice.company.tax_registration_number or "")
    issue_date = to_tlv(3, invoice.issue_date.isoformat() if invoice.issue_date else datetime.utcnow().isoformat())
    total = to_tlv(4, f"{invoice.total_amount + getattr(invoice, 'total_vat_amount', 0):.2f}")
    vat = to_tlv(5, f"{getattr(invoice, 'total_vat_amount', 0):.2f}")

    qr_bytes = seller + trn + issue_date + total + vat
    return base64.b64encode(qr_bytes).decode("utf-8")

 # ----------------------------
   #Generate PDFs
 # ----------------------------
def generate_invoice_pdf(invoice):
    buffer = io.BytesIO()
    
    # Use consistent margins for perfect alignment
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=36, leftMargin=36,
                            topMargin=36, bottomMargin=36)
    elements = []

    # ---------------------------
    # Styles for consistent alignment
    # ---------------------------
    styles = getSampleStyleSheet()
    
    PRIMARY_COLOR = colors.HexColor("#1a365d")
    ACCENT_COLOR = colors.HexColor("#2b6cb0")
    BORDER_COLOR = colors.HexColor("#e2e8f0")
    LIGHT_BG = colors.HexColor("#f7fafc")
    
    # Consistent styles
    styles.add(ParagraphStyle(name="CompanyHeader", fontSize=12, leading=14,
                             textColor=PRIMARY_COLOR, alignment=0, spaceAfter=1,
                             fontName="Helvetica-Bold"))
    
    styles.add(ParagraphStyle(name="InvoiceTitle", fontSize=14, leading=16,
                             textColor=ACCENT_COLOR, alignment=0, spaceAfter=6,
                             fontName="Helvetica-Bold"))
    
    styles.add(ParagraphStyle(name="SectionTitle", fontSize=10, leading=12,
                             textColor=PRIMARY_COLOR, spaceAfter=6, fontName="Helvetica-Bold"))
    
    styles.add(ParagraphStyle(name="NormalText", fontSize=9, leading=11,
                             textColor=colors.black, spaceAfter=2))
    
    styles.add(ParagraphStyle(name="BoldText", fontSize=9, leading=11,
                             textColor=colors.black, spaceAfter=2, fontName="Helvetica-Bold"))

    # ---------------------------
    # HEADER SECTION - WITH BOX AROUND TAX INVOICE
    # ---------------------------
    header_data = [
        [
            # Left: Company Info
            Table([
                [Paragraph(f"{invoice.company.name}", styles["CompanyHeader"])],
                [Paragraph(f"TRN: {invoice.company.tax_registration_number}", styles["NormalText"])],
                [Paragraph(f"Emirate: {invoice.company.get_emirate_display()}", styles["NormalText"])],
                [Paragraph(f"Phone: {invoice.company.phone or ''}", styles["NormalText"])],
            ], colWidths=[3.2*inch], style=[
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]),
            # Right: TAX INVOICE and details - WITH BOX
            Table([
                [Paragraph("TAX INVOICE", styles["InvoiceTitle"])],
                [Spacer(1, 8)],
                [Table([
                    [Paragraph("<b>Invoice #</b>", styles["BoldText"]), Paragraph(f"{invoice.invoice_number}", styles["BoldText"])],
                    [Paragraph("<b>Date</b>", styles["BoldText"]), Paragraph(f"{invoice.issue_date.strftime('%d %b %Y')}", styles["BoldText"])],
                    [Paragraph("<b>Place of Supply</b>", styles["BoldText"]), Paragraph(f"{invoice.get_emirate_display()}", styles["BoldText"])],
                ], colWidths=[1.2*inch, 1.5*inch], style=[
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                ])]
            ], colWidths=[2.7*inch], style=[
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 1, ACCENT_COLOR),  # ADDED BOX
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),   # ADDED BACKGROUND
                ("PADDING", (0, 0), (-1, -1), 8),           # ADDED PADDING
            ])
        ]
    ]
    
    header_table = Table(header_data, colWidths=[3.2*inch, 2.7*inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
    ]))
    elements.append(header_table)

    # ---------------------------
    # BILL TO & PAYMENT DETAILS - SAME EMIARTE AS PLACE OF SUPPLY
    # ---------------------------
    bank_details = get_bank_details_for_invoice(invoice)
    # Use the same emirate as place of supply for BILL TO
    client_emirate = invoice.get_emirate_display()
    
    two_column_data = [
        [
            # BILL TO - Left column
            Table([
                [Paragraph("BILL TO", styles["SectionTitle"])],
                [Spacer(1, 4)],
                [Paragraph(f"{invoice.client.name}", styles["BoldText"])],
                [Paragraph(f"TRN: {invoice.client.trn or ''}", styles["NormalText"])],
                [Paragraph(f"Emirate: {client_emirate}", styles["NormalText"])],  # Same as place of supply
                [Paragraph(f"Phone: {getattr(invoice.client, 'phone', '')}", styles["NormalText"])],
                [Paragraph(f"Email: {invoice.client.email or ''}", styles["NormalText"])]
            ], colWidths=[2.8*inch], style=[
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]),
            # PAYMENT DETAILS - Right column
            Table([
                [Paragraph("PAYMENT DETAILS", styles["SectionTitle"])],
                [Spacer(1, 4)],
                [Paragraph(f"Bank: {bank_details['bank_name']}", styles["BoldText"])],
                [Paragraph(f"Account: {bank_details['account_number']}", styles["NormalText"])],
                [Paragraph(f"IBAN: {bank_details['iban']}", styles["NormalText"])],
                [Spacer(1, 8)],
                [Paragraph("Please transfer to account above.", styles["NormalText"])]
            ], colWidths=[2.8*inch], style=[
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("PADDING", (0, 0), (-1, -1), 8),
            ])
        ]
    ]
    
    two_column_table = Table(two_column_data, colWidths=[2.9*inch, 2.9*inch])
    two_column_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elements.append(two_column_table)
    elements.append(Spacer(1, 15))

    # ---------------------------
    # LINE ITEMS TABLE - FULL WIDTH ALIGNMENT
    # ---------------------------
    headers = ["Description", "Unit Price", "Qty", "VAT %", "VAT Amount", "Total"]
    data = [headers]
    
    line_items = list(invoice.line_items.all())
    subtotal = 0.0
    total_vat = 0.0
    
    for item in line_items:
        qty = float(getattr(item, "quantity", 0) or 0)
        unit_price = float(getattr(item, "unit_price", 0.0) or 0.0)
        vat_rate = float(getattr(item, "vat_rate", 0.0) or 0.0)
        net = qty * unit_price
        vat_amount = net * vat_rate
        total_with_vat = net + vat_amount
        
        subtotal += net
        total_vat += vat_amount

        data.append([
            Paragraph(item.description or "", styles["NormalText"]),
            Paragraph(f"AED {unit_price:,.2f}", styles["NormalText"]),
            Paragraph(f"{qty:.2f}", styles["NormalText"]),
            Paragraph(f"{vat_rate*100:.0f}%", styles["NormalText"]),
            Paragraph(f"AED {vat_amount:,.2f}", styles["NormalText"]),
            Paragraph(f"AED {total_with_vat:,.2f}", styles["NormalText"])
        ])

    grand_total = subtotal + total_vat

    # Full width table for perfect alignment
    col_widths = [2.4*inch, 0.8*inch, 0.6*inch, 0.6*inch, 0.8*inch, 0.8*inch]
    line_table = Table(data, colWidths=col_widths, repeatRows=1)
    
    line_table.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        
        # Data
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 12))

    # ---------------------------
    # TOTALS SECTION - RIGHT ALIGNED
    # ---------------------------
    totals_data = [
        ["Subtotal:", f"AED {subtotal:,.2f}"],
        ["VAT Total:", f"AED {total_vat:,.2f}"],
        ["GRAND TOTAL:", f"AED {grand_total:,.2f}"]
    ]
    
    totals_table = Table(totals_data, colWidths=[1.2*inch, 1.2*inch])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    
    # Right-align the entire totals section
    totals_wrapper = Table([[totals_table]], colWidths=[6*inch])
    totals_wrapper.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "RIGHT"),
    ]))
    elements.append(totals_wrapper)
    elements.append(Spacer(1, 15))

    # ---------------------------
    # NOTES SECTION - FULL WIDTH
    # ---------------------------
    notes_section = Table([
        [Paragraph("Notes", styles["SectionTitle"])],
        [Paragraph("Thank you for your business. Payment due upon receipt.", styles["NormalText"])]
    ], colWidths=[6*inch])
    
    notes_section.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(notes_section)
    elements.append(Spacer(1, 12))

    # ---------------------------
    # QR & UUID SECTION - NO FTA UNDER QR CODE
    # ---------------------------
    qr_tlv_b64 = generate_fatoora_qr(invoice)
    try:
        tlv_bytes = base64.b64decode(qr_tlv_b64)
        qr_img = qrcode.make(tlv_bytes)
    except Exception:
        qr_img = qrcode.make(qr_tlv_b64)

    tmp_dir = tempfile.gettempdir()
    qr_img_path = os.path.join(tmp_dir, f"qr_{invoice.uuid}.png")
    qr_img.save(qr_img_path)

    qr_box_data = [
        [
            # QR Code - Left - NO FTA TEXT
            Table([
                [Paragraph("Scan to Verify", styles["SectionTitle"])],
                [Image(qr_img_path, width=0.9*inch, height=0.9*inch)],
                # REMOVED: [Paragraph("FTA", styles["NormalText"])] - No FTA under QR
            ], colWidths=[1.5*inch], style=[
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]),
            # UUID - Right
            Table([
                [Paragraph("Invoice UUID:", styles["SectionTitle"])],
                [Paragraph(f"{invoice.uuid}", styles["NormalText"])],
                [Spacer(1, 6)],
                [Paragraph("Compliant with FTA", styles["NormalText"])]
            ], colWidths=[4.5*inch], style=[
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        ]
    ]
    
    qr_box_table = Table(qr_box_data, colWidths=[1.5*inch, 4.5*inch])
    qr_box_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(qr_box_table)
    elements.append(Spacer(1, 15))

    # ---------------------------
    # FOOTER - EXACTLY LIKE YOUR IMAGE
    # ---------------------------
    # Create a single table for both footer lines to ensure proper alignment
    footer_content = [
        [Paragraph("This is a computer-generated invoice and does not require a signature", 
                   ParagraphStyle(name="Footer", fontSize=8, leading=10, alignment=1, textColor=colors.gray))],
        [Paragraph("Powered by ClearInvoice", 
                   ParagraphStyle(name="FooterPowered", fontSize=8, leading=10, alignment=1, textColor=colors.gray))]
    ]
    
    footer_table = Table(footer_content, colWidths=[6*inch])
    footer_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(footer_table)

    # ---------------------------
    # BUILD PDF
    # ---------------------------
    doc.build(elements)
    buffer.seek(0)
    return buffer

# Helper function to get bank details
def get_bank_details_for_invoice(invoice):
    """
    Get bank details for invoice in this order of priority:
    1. Bank details saved with this specific invoice (if user edited for this invoice)
    2. Default bank details from company
    3. Fallback to system defaults
    """
    # Priority 1: Check if this specific invoice has custom bank details
    if hasattr(invoice, 'bank_details') and invoice.bank_details:
        # If it's a JSON field with bank details
        if isinstance(invoice.bank_details, dict):
            return {
                'bank_name': invoice.bank_details.get('bank_name', 'Emirates NBD'),
                'account_number': invoice.bank_details.get('account_number', '1234 5678 9012'),
                'iban': invoice.bank_details.get('iban', 'AE00 1234 5678 9012')
            }
    
    # Priority 2: Try to get default bank details from company
    try:
        # If using the CompanyBankDetails model (related name 'bank_details')
        if hasattr(invoice.company, 'bank_details'):
            default_bank = invoice.company.bank_details.filter(is_default=True).first()
            if default_bank:
                return {
                    'bank_name': default_bank.bank_name,
                    'account_number': default_bank.account_number,
                    'iban': default_bank.iban
                }
    except Exception:
        pass
    
    # Priority 3: Fallback to company attributes or system defaults
    return {
        'bank_name': getattr(invoice.company, 'bank_name', 'Emirates NBD'),
        'account_number': getattr(invoice.company, 'account_number', '1234 5678 9012'),
        'iban': getattr(invoice.company, 'iban', 'AE00 1234 5678 9012')
    }
# ---------------------------
# UBL 2.1 XML generation (enhanced)
# ---------------------------
def generate_invoice_xml(invoice):
    """
    Produces an XML string (utf-8) using a UBL-like structure with:
      - dynamic emirate handling
      - UUID and IssueTime
      - contact (email/phone)
      - embedded QR PNG (base64) as AdditionalDocumentReference
      - proper LineExtensionAmount (tax exclusive)
    This is not a full validator for PINT-AE/Peppol; run schema validation with an AP in integration tests.
    """
    nsmap = {
        "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
        "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
        "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
    }

    # Register namespaces with prefixes
    for prefix, uri in nsmap.items():
        ET.register_namespace(prefix, uri)

    # Create root with default Invoice namespace
    root = ET.Element("Invoice")
    root.set("xmlns", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2")

    # Basic identifiers
    ET.SubElement(root, "{%s}CustomizationID" % nsmap["cbc"]).text = "OASIS_UBL_INVOICE"
    ET.SubElement(root, "{%s}ProfileID" % nsmap["cbc"]).text = "reporting:1.0"
    ET.SubElement(root, "{%s}ID" % nsmap["cbc"]).text = safe_text(invoice.invoice_number)
    if getattr(invoice, "uuid", None):
        ET.SubElement(root, "{%s}UUID" % nsmap["cbc"]).text = str(invoice.uuid)
    if getattr(invoice, "issue_date", None):
        ET.SubElement(root, "{%s}IssueDate" % nsmap["cbc"]).text = invoice.issue_date.strftime("%Y-%m-%d")
        # IssueTime: if issue_date is datetime-like (has time), include time portion if available
        try:
            issue_time = invoice.issue_date.strftime("%H:%M:%S")
            ET.SubElement(root, "{%s}IssueTime" % nsmap["cbc"]).text = issue_time
        except Exception:
            pass
    if getattr(invoice, "due_date", None):
        ET.SubElement(root, "{%s}DueDate" % nsmap["cbc"]).text = invoice.due_date.strftime("%Y-%m-%d")

    ET.SubElement(root, "{%s}InvoiceTypeCode" % nsmap["cbc"]).text = "380"
    ET.SubElement(root, "{%s}DocumentCurrencyCode" % nsmap["cbc"]).text = "AED"

    # Order Reference (optional)
    if getattr(invoice, "order_number", None):
        order_ref = ET.SubElement(root, "{%s}OrderReference" % nsmap["cac"])
        ET.SubElement(order_ref, "{%s}ID" % nsmap["cbc"]).text = safe_text(invoice.order_number)

    # ---------------------------
    # Accounting Supplier Party (Seller)
    # ---------------------------
    supplier = ET.SubElement(root, "{%s}AccountingSupplierParty" % nsmap["cac"])
    sp_party = ET.SubElement(supplier, "{%s}Party" % nsmap["cac"])

    # Party Identification (TRN)
    sp_party_id = ET.SubElement(sp_party, "{%s}PartyIdentification" % nsmap["cac"])
    ET.SubElement(sp_party_id, "{%s}ID" % nsmap["cbc"]).text = safe_text(getattr(invoice.company, "tax_registration_number", ""))

    # Party Name
    sp_party_name = ET.SubElement(sp_party, "{%s}PartyName" % nsmap["cac"])
    ET.SubElement(sp_party_name, "{%s}Name" % nsmap["cbc"]).text = safe_text(getattr(invoice.company, "name", ""))

    # Postal Address
    sp_postal = ET.SubElement(sp_party, "{%s}PostalAddress" % nsmap["cac"])
    ET.SubElement(sp_postal, "{%s}StreetName" % nsmap["cbc"]).text = safe_text(getattr(invoice.company, "address", ""))
    # dynamic emirate / city - use company emirate for supplier
    company_emirate = getattr(invoice.company, "emirate", None) or getattr(invoice.company, "city", None) or "Dubai"
    ET.SubElement(sp_postal, "{%s}CityName" % nsmap["cbc"]).text = safe_text(company_emirate)
    ET.SubElement(sp_postal, "{%s}CountrySubentityCode" % nsmap["cbc"]).text = get_emirate_code(company_emirate)
    sp_country = ET.SubElement(sp_postal, "{%s}Country" % nsmap["cac"])
    ET.SubElement(sp_country, "{%s}IdentificationCode" % nsmap["cbc"]).text = "AE"

    # Contact (optional)
    try:
        sp_contact = ET.SubElement(sp_party, "{%s}Contact" % nsmap["cac"])
        if getattr(invoice.company, "email", None):
            ET.SubElement(sp_contact, "{%s}ElectronicMail" % nsmap["cbc"]).text = safe_text(invoice.company.email)
        if getattr(invoice.company, "phone", None):
            ET.SubElement(sp_contact, "{%s}Telephone" % nsmap["cbc"]).text = safe_text(invoice.company.phone)
    except Exception:
        pass

    # ---------------------------
    # Accounting Customer Party (Buyer)
    # ---------------------------
    customer = ET.SubElement(root, "{%s}AccountingCustomerParty" % nsmap["cac"])
    cu_party = ET.SubElement(customer, "{%s}Party" % nsmap["cac"])

    cu_party_id = ET.SubElement(cu_party, "{%s}PartyIdentification" % nsmap["cac"])
    ET.SubElement(cu_party_id, "{%s}ID" % nsmap["cbc"]).text = safe_text(getattr(invoice.client, "trn", ""))

    cu_party_name = ET.SubElement(cu_party, "{%s}PartyName" % nsmap["cac"])
    ET.SubElement(cu_party_name, "{%s}Name" % nsmap["cbc"]).text = safe_text(getattr(invoice.client, "name", ""))

    cu_postal = ET.SubElement(cu_party, "{%s}PostalAddress" % nsmap["cac"])
    ET.SubElement(cu_postal, "{%s}StreetName" % nsmap["cbc"]).text = safe_text(getattr(invoice.client, "address", ""))
    # Use invoice emirate for customer (place of supply) - FIXED
    customer_emirate = getattr(invoice, "emirate", None) or getattr(invoice.client, "emirate", None) or getattr(invoice.client, "city", None) or company_emirate or "Dubai"
    ET.SubElement(cu_postal, "{%s}CityName" % nsmap["cbc"]).text = safe_text(customer_emirate)
    ET.SubElement(cu_postal, "{%s}CountrySubentityCode" % nsmap["cbc"]).text = get_emirate_code(customer_emirate)
    cu_country = ET.SubElement(cu_postal, "{%s}Country" % nsmap["cac"])
    ET.SubElement(cu_country, "{%s}IdentificationCode" % nsmap["cbc"]).text = "AE"

    # Customer contact
    try:
        cu_contact = ET.SubElement(cu_party, "{%s}Contact" % nsmap["cac"])
        if getattr(invoice.client, "email", None):
            ET.SubElement(cu_contact, "{%s}ElectronicMail" % nsmap["cbc"]).text = safe_text(invoice.client.email)
        if getattr(invoice.client, "phone", None):
            ET.SubElement(cu_contact, "{%s}Telephone" % nsmap["cbc"]).text = safe_text(invoice.client.phone)
    except Exception:
        pass

    # ---------------------------
    # Payment & Terms
    # ---------------------------
    payment_means = ET.SubElement(root, "{%s}PaymentMeans" % nsmap["cac"])
    ET.SubElement(payment_means, "{%s}PaymentMeansCode" % nsmap["cbc"]).text = "30"

    payment_terms = ET.SubElement(root, "{%s}PaymentTerms" % nsmap["cac"])
    ET.SubElement(payment_terms, "{%s}Note" % nsmap["cbc"]).text = f"Due on {invoice.due_date.strftime('%Y-%m-%d')}" if getattr(invoice, "due_date", None) else ""

# ---------------------------
    # TaxTotal / TaxSubtotal
    # ---------------------------
    # FIXED: Calculate amounts from line items instead of using invoice totals
    line_extension_amount = 0.0
    total_vat = 0.0
    
    # Calculate proper amounts from line items
    for item in invoice.line_items.all():
        qty = float(getattr(item, "quantity", 0) or 0)
        unit_price = float(getattr(item, "unit_price", 0.0) or 0.0)
        vat_rate = float(getattr(item, "vat_rate", 0.0) or 0.0)
        
        net_amount = qty * unit_price
        vat_amount = net_amount * vat_rate
        
        line_extension_amount += net_amount
        total_vat += vat_amount
    
    # Taxable amount is the net amount before VAT
    taxable_amount = line_extension_amount
    # Tax inclusive amount (total payable)
    tax_inclusive_amount = taxable_amount + total_vat

    tax_total = ET.SubElement(root, "{%s}TaxTotal" % nsmap["cac"])
    ET.SubElement(tax_total, "{%s}TaxAmount" % nsmap["cbc"], currencyID="AED").text = f"{total_vat:.2f}"

    tax_subtotal = ET.SubElement(tax_total, "{%s}TaxSubtotal" % nsmap["cac"])
    # FIXED: TaxableAmount should be net amount before VAT
    ET.SubElement(tax_subtotal, "{%s}TaxableAmount" % nsmap["cbc"], currencyID="AED").text = f"{taxable_amount:.2f}"
    ET.SubElement(tax_subtotal, "{%s}TaxAmount" % nsmap["cbc"], currencyID="AED").text = f"{total_vat:.2f}"

    tax_category = ET.SubElement(tax_subtotal, "{%s}TaxCategory" % nsmap["cac"])
    ET.SubElement(tax_category, "{%s}ID" % nsmap["cbc"]).text = "S"
    ET.SubElement(tax_category, "{%s}Percent" % nsmap["cbc"]).text = f"{(getattr(invoice.line_items.first(), 'vat_rate', 0.05) * 100) if getattr(invoice, 'line_items', None) else 5}"

    tax_scheme = ET.SubElement(tax_category, "{%s}TaxScheme" % nsmap["cac"])
    ET.SubElement(tax_scheme, "{%s}ID" % nsmap["cbc"]).text = "VAT"

    # ---------------------------
    # Invoice Lines
    # ---------------------------
    # Each line: net amount (LineExtensionAmount), item description, price
    for i, item in enumerate(invoice.line_items.all(), 1):
        qty = float(getattr(item, "quantity", 0) or 0)
        unit_price = float(getattr(item, "unit_price", 0.0) or 0.0)
        vat_rate = float(getattr(item, "vat_rate", 0.0) or 0.0)

        net_amount = qty * unit_price
        vat_amount = net_amount * vat_rate
        line_total_incl = net_amount + vat_amount

        line = ET.SubElement(root, "{%s}InvoiceLine" % nsmap["cac"])
        ET.SubElement(line, "{%s}ID" % nsmap["cbc"]).text = str(i)
        ET.SubElement(line, "{%s}InvoicedQuantity" % nsmap["cbc"], unitCode="C62").text = f"{qty:.2f}"
        ET.SubElement(line, "{%s}LineExtensionAmount" % nsmap["cbc"], currencyID="AED").text = f"{net_amount:.2f}"

        # Item
        item_elem = ET.SubElement(line, "{%s}Item" % nsmap["cac"])
        ET.SubElement(item_elem, "{%s}Description" % nsmap["cbc"]).text = safe_text(getattr(item, "description", ""))

        # Price
        price = ET.SubElement(line, "{%s}Price" % nsmap["cac"])
        ET.SubElement(price, "{%s}PriceAmount" % nsmap["cbc"], currencyID="AED").text = f"{unit_price:.2f}"

        # Line-level tax info (optional, helpful to APs)
        try:
            line_tax_total = ET.SubElement(line, "{%s}TaxTotal" % nsmap["cac"])
            ET.SubElement(line_tax_total, "{%s}TaxAmount" % nsmap["cbc"], currencyID="AED").text = f"{vat_amount:.2f}"

            line_tax_sub = ET.SubElement(line_tax_total, "{%s}TaxSubtotal" % nsmap["cac"])
            ET.SubElement(line_tax_sub, "{%s}TaxableAmount" % nsmap["cbc"], currencyID="AED").text = f"{net_amount:.2f}"
            ET.SubElement(line_tax_sub, "{%s}TaxAmount" % nsmap["cbc"], currencyID="AED").text = f"{vat_amount:.2f}"

            line_tax_cat = ET.SubElement(line_tax_sub, "{%s}TaxCategory" % nsmap["cac"])
            ET.SubElement(line_tax_cat, "{%s}ID" % nsmap["cbc"]).text = "S"
            ET.SubElement(line_tax_cat, "{%s}Percent" % nsmap["cbc"]).text = f"{vat_rate * 100:.2f}"
            line_tax_scheme = ET.SubElement(line_tax_cat, "{%s}TaxScheme" % nsmap["cac"])
            ET.SubElement(line_tax_scheme, "{%s}ID" % nsmap["cbc"]).text = "VAT"
        except Exception:
            pass

    # ---------------------------
    # LegalMonetaryTotal
    # ---------------------------
    legal_monetary_total = ET.SubElement(root, "{%s}LegalMonetaryTotal" % nsmap["cac"])
    # FIXED: Use calculated amounts from line items
    ET.SubElement(legal_monetary_total, "{%s}LineExtensionAmount" % nsmap["cbc"], currencyID="AED").text = f"{line_extension_amount:.2f}"
    ET.SubElement(legal_monetary_total, "{%s}TaxExclusiveAmount" % nsmap["cbc"], currencyID="AED").text = f"{taxable_amount:.2f}"
    ET.SubElement(legal_monetary_total, "{%s}TaxInclusiveAmount" % nsmap["cbc"], currencyID="AED").text = f"{tax_inclusive_amount:.2f}"
    ET.SubElement(legal_monetary_total, "{%s}PayableAmount" % nsmap["cbc"], currencyID="AED").text = f"{tax_inclusive_amount:.2f}"

    # ---------------------------
    # AdditionalDocumentReference for QR (PNG embedded as base64) - helpful for some APs
    # ---------------------------
    try:
        # create PNG bytes of the TLV (Fatoora) to embed
        tlv_b64 = generate_fatoora_qr(invoice)
        tlv_bytes = base64.b64decode(tlv_b64)
        qr_img = qrcode.make(tlv_bytes)
        qr_bio = io.BytesIO()
        qr_img.save(qr_bio, format="PNG")
        qr_bio.seek(0)
        png_b64 = base64.b64encode(qr_bio.read()).decode("utf-8")

        add_doc = ET.SubElement(root, "{%s}AdditionalDocumentReference" % nsmap["cac"])
        ET.SubElement(add_doc, "{%s}ID" % nsmap["cbc"]).text = "QR"
        att = ET.SubElement(add_doc, "{%s}Attachment" % nsmap["cac"])
        emb = ET.SubElement(att, "{%s}EmbeddedDocumentBinaryObject" % nsmap["cbc"],
                            mimeCode="image/png", encodingCode="Base64")
        emb.text = png_b64
    except Exception:
        # if embedding fails, ignore — QR still exists in PDF
        pass

    # ---------------------------
    # UBLExtensions placeholder (for digital signature metadata / external references)
    # ---------------------------
    ext_UBLExtension = ET.SubElement(root, "{%s}UBLExtension" % nsmap["ext"])
    ext_ExtensionContent = ET.SubElement(ext_UBLExtension, "{%s}ExtensionContent" % nsmap["ext"])

    signature = ET.SubElement(ext_ExtensionContent, "{%s}Signature" % nsmap["cac"])
    ET.SubElement(signature, "{%s}ID" % nsmap["cbc"]).text = "Signature1"
    signatory_party = ET.SubElement(signature, "{%s}SignatoryParty" % nsmap["cac"])
    party_name = ET.SubElement(signatory_party, "{%s}PartyName" % nsmap["cac"])
    ET.SubElement(party_name, "{%s}Name" % nsmap["cbc"]).text = safe_text(getattr(invoice.company, "name", ""))
    digital_signature_attachment = ET.SubElement(signature, "{%s}DigitalSignatureAttachment" % nsmap["cac"])
    external_reference = ET.SubElement(digital_signature_attachment, "{%s}ExternalReference" % nsmap["cac"])
    ET.SubElement(external_reference, "{%s}URI" % nsmap["cbc"]).text = f"cid:signature_{getattr(invoice, 'uuid', '')}"

    # Output xml string
    xml_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return xml_bytes.decode("utf-8")


def save_invoice_xml(invoice):
    """
    Save XML string to a temp file and return path.
    """
    xml_data = generate_invoice_xml(invoice)
    file_path = os.path.join(tempfile.gettempdir(), f"invoice_{invoice.uuid}.xml")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(xml_data)
    return file_path


# ---------------------------
# JSON generator (kept compatible)
# ---------------------------
def generate_invoice_json(invoice):
    line_items = []
    for item in invoice.line_items.all():
        qty = float(getattr(item, "quantity", 0) or 0)
        unit_price = float(getattr(item, "unit_price", 0.0) or 0.0)
        vat_rate = float(getattr(item, "vat_rate", 0.0) or 0.0)
        net = qty * unit_price
        vat_amount = net * vat_rate
        total = net + vat_amount

        line_items.append({
            "Description": item.description or "No description",
            "Quantity": qty,
            "UnitPrice": unit_price,
            "VATRate": vat_rate,
            "VATAmount": vat_amount,
            "Total": total
        })

    data = {
        "Invoice": {
            "Company": {
                "Name": invoice.company.name or "N/A",
                "TRN": invoice.company.tax_registration_number or "N/A",
                "Address": invoice.company.address or "N/A",
                "Phone": invoice.company.phone or "N/A"
            },
            "Client": {
                "Name": invoice.client.name or "N/A",
                "TRN": invoice.client.trn or "N/A",
                "Address": invoice.client.address or "N/A",
                "Email": invoice.client.email or "N/A"
            },
            "InvoiceDetails": {
                "InvoiceNumber": invoice.invoice_number or "N/A",
                "IssueDate": invoice.issue_date.isoformat() if getattr(invoice, "issue_date", None) else "N/A",
                "DueDate": invoice.due_date.isoformat() if getattr(invoice, "due_date", None) else "N/A",
                "Status": invoice.status or "N/A",
                "UUID": str(getattr(invoice, "uuid", "N/A"))
            },
            "LineItems": line_items,
            "Totals": {
                "Subtotal": float(getattr(invoice, "total_amount", 0.0) or 0.0),
                "VATAmount": float(getattr(invoice, "total_vat_amount", 0.0) or 0.0),
                "GrandTotal": float((getattr(invoice, "total_amount", 0.0) or 0.0) + (getattr(invoice, "total_vat_amount", 0.0) or 0.0))
            }
        }
    }
    return json.dumps(data, indent=4)


# ---------------------------
# Partner Sales Report (kept from your original)
# ---------------------------
def get_partner_sales_report(partner, start_date, end_date, client_ids=None):
    """
    Returns aggregated sales report for a partner's referred clients.
    If client_ids is provided, filter only those clients.
    """
    if Invoice is None or Sum is None:
        raise RuntimeError("Invoice model or Sum not available. Ensure proper imports.")

    clients = partner.referred_clients.all()
    if client_ids:
        clients = clients.filter(id__in=client_ids)

    client_reports = []
    grand_subtotal = grand_vat = grand_total = 0

    for client in clients:
        invoices = Invoice.objects.filter(
            company=client,
            date__range=[start_date, end_date]
        )

        # Group by emirate
        emirate_data = invoices.values("emirate").annotate(
            subtotal=Sum("subtotal"),
            vat=Sum("vat"),
            total=Sum("total"),
        )

        client_subtotal = sum(item["subtotal"] or 0 for item in emirate_data)
        client_vat = sum(item["vat"] or 0 for item in emirate_data)
        client_total = sum(item["total"] or 0 for item in emirate_data)

        client_reports.append({
            "id": client.id,
            "company_name": client.name,
            "trn": client.tax_registration_number,
            "sales": list(emirate_data),
            "subtotal": client_subtotal,
            "vat": client_vat,
            "total": client_total,
        })

        grand_subtotal += client_subtotal
        grand_vat += client_vat
        grand_total += client_total

    return {
        "partner": partner.firm_name,
        "clients": client_reports,
        "totals": {
            "subtotal": grand_subtotal,
            "vat": grand_vat,
            "total": grand_total,
        }
    }