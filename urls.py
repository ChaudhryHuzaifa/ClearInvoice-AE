# partners/urls.py
from django.urls import path
from . import views
from django.views.generic.base import RedirectView

urlpatterns = [
    # --- Core Partner API Endpoints ---
    path('clients/', views.partner_clients, name='partner-clients'),
    path('dashboard/', views.partner_dashboard, name='partner-dashboard'),
    path('notifications/', views.get_notifications, name='get_notifications'),
    path('notifications/read/all/', views.mark_all_as_read, name='mark_all_read'),
    path('notifications/read/<int:pk>/', views.mark_as_read, name='mark_notification_read'),
    path('sales-report-pdf/', views.partner_sales_report_pdf, name='partner-sales-report-pdf'),
    path('profile/', views.partner_profile_update, name='partner-profile-update'),
    path('test-notification/', views.test_notification, name='test-notification'),
    
    # Partner Payout URLs
    path('balance/', views.partner_balance, name='partner-balance'),
    path('payout-request/', views.create_payout_request, name='create-payout-request'),
    path('payout-history/', views.payout_history, name='payout-history'),
    path('payout-request/<int:payout_id>/cancel/', views.cancel_payout_request, name='cancel-payout-request'),
    
    # Admin Payout URLs
    path('admin/payouts/', views.admin_payout_requests, name='admin-payouts'),
    path('admin/payouts/<int:payout_id>/approve/', views.admin_approve_payout, name='approve-payout'),
    path('admin/payouts/<int:payout_id>/reject/', views.admin_reject_payout, name='reject-payout'),
    path('admin/payouts/<int:payout_id>/mark-paid/', views.admin_mark_paid, name='mark-payout-paid'),

    # --- Additional endpoints ---
    path('resources/', views.partner_resources, name='partner-resources'),
    path('settings/', views.partner_settings, name='partner-settings'),
    path('csrf/', views.get_csrf_token, name='get-csrf'),

    # --- Redirect to Frontend Signup ---
    path(
        'register/',
        RedirectView.as_view(
            url='http://localhost:3000/signup/',
            query_string=True,
            permanent=True
        ),
        name='partner-register-redirect'
    ),
]
