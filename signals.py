# invoices/signals.py

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, Invoice
from django.core.files.base import ContentFile
from .utils import generate_invoice_pdf, generate_invoice_xml

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Use get_or_create to avoid duplicates
        UserProfile.objects.get_or_create(user=instance)
        logger.debug(f"UserProfile created for user {instance.id}")

@receiver(post_save, sender=Invoice)
def generate_invoice_files(sender, instance, created, **kwargs):
    if created or not instance.pdf_file:
        try:
            pdf_buffer = generate_invoice_pdf(instance)
            pdf_name = f"invoice_{instance.invoice_number}.pdf"

            instance.pdf_file.save(pdf_name, ContentFile(pdf_buffer.getvalue()), save=False)

            xml_content = generate_invoice_xml(instance)
            xml_name = f"invoice_{instance.invoice_number}.xml"

            instance.xml_file.save(xml_name, ContentFile(xml_content.encode('utf-8')), save=False)
            instance.xml_content = xml_content

            # Use update to avoid recursive signal call
            Invoice.objects.filter(pk=instance.pk).update(
                pdf_file=instance.pdf_file,
                xml_file=instance.xml_file,
                xml_content=xml_content
            )
        except Exception as e:
            logger.error(f"Error generating invoice files: {e}")