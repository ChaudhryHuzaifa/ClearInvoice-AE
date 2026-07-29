// src/app/dashboard/subscription/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '../components/Sidebar';

interface Subscription {
  id: number;
  plan: string; // 'FREE', 'STARTER', 'UNLIMITED'
  start_date: string;
  end_date: string;
  is_active: boolean;
  stripe_subscription_id?: string;
  company: {
    name: string;
    tax_registration_number: string;
  };
}

export default function SubscriptionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  const fetchSubscription = async () => {
    try {
      setError(null);
      const response = await api.get('/api/subscriptions/current/');
      if (response.status === 200) {
        setSubscription(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription', error);
      setError('Unable to load subscription data at the moment');
      
      // Fallback: Create subscription data from user info
      if (user?.company) {
        const fallbackSubscription: Subscription = {
          id: 0,
          plan: 'FREE',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          is_active: true,
          company: {
            name: user.company.name,
            tax_registration_number: user.company.tax_registration_number || 'Not provided'
          }
        };
        setSubscription(fallbackSubscription);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSubscription();
  }, [user]);

  const getPlanDetails = (plan: string) => {
    const plans: { [key: string]: { 
      name: string; 
      features: string[]; 
      color: string;
      badge: string;
      price: number;
      invoice_limit: number | string;
      description: string;
    } } = {
      'FREE': {
        name: 'Free Plan',
        description: 'Perfect for getting started',
        features: [
          '5 invoices per month',
          'Basic invoice templates',
          'Email support',
          'Standard reporting',
          'PDF downloads'
        ],
        color: 'gray',
        badge: 'Current',
        price: 0,
        invoice_limit: 5
      },
      'STARTER': {
        name: 'Starter Plan',
        description: 'Great for small businesses',
        features: [
          '100 invoices per month',
          'Advanced invoice templates',
          'Priority email support',
          'Basic analytics',
          'Custom branding',
          'Bulk operations'
        ],
        color: 'blue',
        badge: 'Popular',
        price: 99,
        invoice_limit: 100
      },
      'UNLIMITED': {
        name: 'Unlimited Plan',
        description: 'For growing businesses',
        features: [
          'Unlimited invoices',
          'Advanced invoice templates',
          'Priority support',
          'Advanced analytics',
          'Custom branding',
          'API access'
        ],
        color: 'purple',
        badge: 'Recommended',
        price: 149,
        invoice_limit: 'Unlimited'
      }
    };
    
    return plans[plan] || plans['FREE'];
  };

  const planDetails = subscription ? getPlanDetails(subscription.plan) : getPlanDetails('FREE');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const handleUpgradePlan = () => {
    window.location.href = '/subscription-plans';
  };

  const handleCancelSubscription = async () => {
    if (!subscription || subscription.plan === 'FREE') return;
    
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) return;
    
    setCancelling(true);
    try {
      // You'll need to implement cancellation in your backend
      // For now, we'll show a message
      alert('Subscription cancellation would be processed through Stripe. Please contact support for immediate assistance.');
      
      // If you implement cancellation, uncomment this:
      // const response = await api.post('/api/subscriptions/cancel/');
      // if (response.status === 200) {
      //   alert('Subscription cancelled successfully');
      //   await fetchSubscription();
      // }
    } catch (error: any) {
      console.error('Failed to cancel subscription', error);
      alert(error.response?.data?.error || 'Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchSubscription();
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-3 text-blue-600 font-medium">Loading...</p>
      </div>
    </div>
  );

  if (!user) return null;

  // Use actual subscription data or fallback to free plan
  const currentSubscription = subscription || {
    id: 0,
    plan: 'FREE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true,
    company: {
      name: user.company?.name || 'Your Company',
      tax_registration_number: user.company?.tax_registration_number || 'Not provided'
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Sidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Subscription Management</h1>
          {error && (
            <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
              Using Fallback Data
            </div>
          )}
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-yellow-800">{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className="text-yellow-800 hover:text-yellow-900 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-blue-600 font-medium">Loading subscription information...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Your Current Plan</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentSubscription.is_active)}`}>
                    {currentSubscription.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Plan Header */}
                <div className={`bg-gradient-to-r ${
                  planDetails.color === 'blue' ? 'from-blue-500 to-blue-600' :
                  planDetails.color === 'purple' ? 'from-purple-500 to-purple-600' :
                  'from-gray-500 to-gray-600'
                } rounded-xl p-6 text-white mb-6`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-bold mb-2">{planDetails.name}</h3>
                      <p className="text-lg opacity-90 mb-1">{planDetails.description}</p>
                      <p className="text-xl opacity-90">
                        {planDetails.price === 0 ? 'Free Forever' : `AED ${planDetails.price}/month`}
                      </p>
                    </div>
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                      {planDetails.badge}
                    </span>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Invoice Limit</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {planDetails.invoice_limit}
                    </p>
                    <p className="text-xs text-blue-500">per month</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Billing Cycle</p>
                    <p className="text-2xl font-bold text-green-700">
                      Monthly
                    </p>
                    <p className="text-xs text-green-500">
                      {currentSubscription.plan === 'FREE' ? 'No renewal needed' : 'Auto-renews'}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">
                      {currentSubscription.plan !== 'FREE' ? 'Plan Expires' : 'Plan Type'}
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {currentSubscription.plan !== 'FREE' ? formatDate(currentSubscription.end_date) : 'Free'}
                    </p>
                    <p className="text-xs text-purple-500">
                      {currentSubscription.plan !== 'FREE' ? 'Subscription end date' : 'No expiration'}
                    </p>
                  </div>
                </div>

                {/* Company Information */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Company Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="font-medium">{currentSubscription.company.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">TRN</p>
                      <p className="font-medium">{currentSubscription.company.tax_registration_number}</p>
                    </div>
                  </div>
                </div>

                {/* Plan Features */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-4 text-lg">Plan Features:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {planDetails.features.map((feature, index) => (
                      <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              {/* Subscription Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Manage Subscription</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleUpgradePlan}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Upgrade Plan
                  </button>
                  
                  {currentSubscription.plan !== 'FREE' && currentSubscription.is_active && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium disabled:bg-red-300"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => window.location.href = '/billing'}
                    className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Billing History
                  </button>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscription Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span className="font-medium">{planDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      currentSubscription.is_active ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentSubscription.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">
                      {planDetails.price === 0 ? 'Free' : `AED ${planDetails.price}/month`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="font-medium">{formatDate(currentSubscription.start_date)}</span>
                  </div>
                  {currentSubscription.plan !== 'FREE' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium">{formatDate(currentSubscription.end_date)}</span>
                    </div>
                  )}
                  {currentSubscription.stripe_subscription_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stripe ID:</span>
                      <span className="font-medium text-xs">{currentSubscription.stripe_subscription_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Support Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Need Help?</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Have questions about your subscription or need to make changes?
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/contact'}
                  className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}