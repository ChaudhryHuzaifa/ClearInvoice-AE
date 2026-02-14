# partners/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from invoices.models import UserProfile
from .models import PartnerClient
from .models import Partner, Notification, PayoutRequest 
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=UserProfile)
def handle_new_user_signup(sender, instance, created, **kwargs):
    """
    Trigger a notification when a new user signs up with a referral code.
    Works even if UserProfile is created after the User.
    """
    logger.info(f"UserProfile post_save signal triggered. Created: {created}, Referral code: {instance.referral_code_used}")

    if instance.referral_code_used:
        logger.info(f"Checking referral code: {instance.referral_code_used}")
        try:
            partner = Partner.objects.get(referral_code=instance.referral_code_used)
            logger.info(f"Found partner: {partner.firm_name}")

            # Create PartnerClient if it doesn't exist
            partner_client, created_pc = PartnerClient.objects.get_or_create(
                client_user=instance.user,
                defaults={
                    'partner': partner,
                    'is_active': False,  # Initially inactive until payment
                    'trn': instance.company.tax_registration_number if instance.company else None
                }
            )
            
            if created_pc:
                logger.info(f"Created PartnerClient for {instance.user.email}")
            else:
                logger.info(f"PartnerClient already exists for {instance.user.email}")

            # Ensure we only create one notification per referred user
            already_exists = Notification.objects.filter(
                user=partner.user,
                notification_type="signup",
                related_object_id=instance.user.id
            ).exists()

            if not already_exists:
                Notification.objects.create(
                    user=partner.user,
                    title="🎉 New Referral Signup",
                    message=f"A new user ({instance.user.email}) has signed up using your referral link.",
                    notification_type="signup",
                    related_object_id=instance.user.id,
                    related_content_type=ContentType.objects.get_for_model(User)
                )
                logger.info(f"Notification created for {partner.user.email}")
            else:
                logger.info("Notification already exists for this user")

        except Partner.DoesNotExist:
            logger.warning(f"No partner found with referral code: {instance.referral_code_used}")
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")

# -----------------------------
# 2️⃣ Partner Payout Notification
# -----------------------------
@receiver(post_save, sender=PayoutRequest)
def handle_payout_notification(sender, instance, created, **kwargs):
    """
    Notify partner when a payout request is approved
    """
    if not created and instance.status == 'APPROVED':
        try:
            partner_user = instance.partner.user
            Notification.objects.create(
                user=partner_user,
                title="Payout Approved",
                message=f"Your payout request of ${instance.amount} has been approved.",
                notification_type="payout",
                related_object_id=instance.id,
                related_content_type=ContentType.objects.get_for_model(PayoutRequest)
            )
            logger.info(f"Payout notification sent to partner: {partner_user.email}")
        except Exception as e:
            logger.error(f"Error creating payout notification: {str(e)}")