from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import register_user, login_user, logout_user, get_user_profile
from django.views.generic.base import RedirectView

router = DefaultRouter()
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', views.home_page, name='home'),
    path('list/', views.invoice_list, name='invoice_list'),
    path('client/subscription/', views.client_subscription, name='client-subscription'),
    path('client/cancel-subscription/', views.client_cancel_subscription, name='client-cancel-subscription'),
    path('client/resources/', views.client_resources, name='client-resources'),
    path('client/contact/', views.client_contact, name='client-contact'),
    path('client/dashboard/', views.client_dashboard, name='client-dashboard'),
    path('create/', views.create_invoice, name='create_invoice'),

    # Auth API endpoints
    path('api/auth/register/', register_user, name='register'),
    path('api/auth/login/', login_user, name='login'),
    path('api/auth/logout/', logout_user, name='logout'),
    path('api/auth/user/', get_user_profile, name='user-profile'),

    # Bank Details API endpoints - NEW
    path('api/company/defaults/', views.get_company_defaults, name='company-defaults'),
    path('api/company/bank-details/', views.set_company_bank_details, name='set-company-bank-details'),

    # Redirect /register to frontend signup page and preserve query params
    path(
        'register/',
        RedirectView.as_view(
            url='http://localhost:3000/signup/',
            query_string=True,  # ✅ preserves ?ref=…
            permanent=True
        ),
        name='register_redirect'
    ),

    # Include the router for invoices
    path('api/', include(router.urls)),
]
