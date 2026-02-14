# clearinvoice/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from invoices.views import ForgotPasswordView, ResetPasswordView  # ✅ import custom views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Apps
    path('', include('invoices.urls')),
    path('api/', include('invoices.urls')),
    path('api/partner/', include('partners.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),

    # ✅ Custom API endpoints (CSRF-exempt via DRF)
    path('api/password-reset/', ForgotPasswordView.as_view(), name='password_reset'),
    path('api/reset/<uidb64>/<token>/', ResetPasswordView.as_view(), name='password_reset_confirm'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)