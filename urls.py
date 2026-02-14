# subscriptions/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('plans/', views.get_subscription_plans, name='get_subscription_plans'),
    path('create/', views.create_subscription, name='create_subscription'),
    path('confirm/', views.confirm_subscription, name='confirm_subscription'),
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),
    path('current/', views.get_current_subscription, name='get_current_subscription'),
]