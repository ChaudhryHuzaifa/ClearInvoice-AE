// src/app/partner/payouts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import PartnerSidebar from '../../partner-dashboard/components/PartnerSidebar';

interface Payout {
  id: number;
  amount: string;
  payment_method: string;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  iban?: string;
  swift_code?: string;
  paypal_email?: string;
  wise_email?: string;
  mailing_address?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  processed_at?: string;
  transaction_id?: string;
  receipt_url?: string;
  notes?: string;
  admin_notes?: string;
  can_cancel?: boolean;
  payment_details?: any;
  partner_name?: string;
}

interface BalanceData {
  available_balance: string;
  total_earnings: string;
  total_paid_out: string;
  commission_rate: string;
  min_payout_amount?: string;
}

interface PayoutStats {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  total_amount_pending: string;
}

export default function PayoutsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    iban: '',
    swift_code: '',
    paypal_email: '',
    wise_email: '',
    mailing_address: '',
    notes: ''
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch partner balance
  const fetchBalance = async () => {
    try {
      const response = await api.get('/api/partner/balance/');
      setBalance(response.data);
    } catch (error) {
      console.error('Failed to fetch balance', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Fetch payout history
  const fetchPayoutHistory = async () => {
    try {
      const response = await api.get('/api/partner/payout-history/');
      if (response.data.payouts) {
        setPayouts(response.data.payouts);
      }
    } catch (error) {
      console.error('Failed to fetch payout history', error);
    } finally {
      setLoading(false);
    }
  };

  // Show success message
  const showSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchPayoutHistory();
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await api.post('/api/partner/payout-request/', formData);
      
      if (response.status === 201) {
        setSubmitted(true);
        setFormData({
          amount: '',
          payment_method: 'BANK_TRANSFER',
          bank_name: '',
          account_number: '',
          account_holder_name: '',
          iban: '',
          swift_code: '',
          paypal_email: '',
          wise_email: '',
          mailing_address: '',
          notes: ''
        });
        // Refresh data
        await fetchBalance();
        await fetchPayoutHistory();
        showSuccessAlert('Payout request submitted successfully! We will process it within 3-5 business days.');
      }
    } catch (error: any) {
      console.error('Failed to submit payout request', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.amount?.[0] || 
                          error.response?.data?.payment_method?.[0] ||
                          'Failed to submit payout request. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPayout = async (payoutId: number) => {
    if (!confirm('Are you sure you want to cancel this payout request?')) {
      return;
    }

    try {
      await api.post(`/api/partner/payout-request/${payoutId}/cancel/`);
      // Refresh data
      await fetchBalance();
      await fetchPayoutHistory();
      showSuccessAlert('Payout request cancelled successfully!');
    } catch (error: any) {
      console.error('Failed to cancel payout request', error);
      const errorMessage = error.response?.data?.error || 'Failed to cancel payout request. Please try again.';
      alert(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'PAID': return 'text-blue-600 bg-blue-100';
      case 'CANCELLED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return '✅';
      case 'PENDING': return '⏳';
      case 'REJECTED': return '❌';
      case 'PAID': return '💰';
      case 'CANCELLED': return '🚫';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodDisplay = (payout: Payout) => {
    switch (payout.payment_method) {
      case 'BANK_TRANSFER':
        return `🏦 Bank Transfer - ${payout.bank_name}`;
      case 'PAYPAL':
        return `💳 PayPal - ${payout.paypal_email}`;
      case 'WISE':
        return `🌍 Wise - ${payout.wise_email}`;
      case 'CHECK':
        return '📮 Check';
      default:
        return payout.payment_method;
    }
  };

  const renderPaymentMethodFields = () => {
    switch (formData.payment_method) {
      case 'BANK_TRANSFER':
        return (
          <>
            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name *
              </label>
              <input
                type="text"
                id="bank_name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-2">
                Account Number *
              </label>
              <input
                type="text"
                id="account_number"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <label htmlFor="account_holder_name" className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name *
              </label>
              <input
                type="text"
                id="account_holder_name"
                name="account_holder_name"
                value={formData.account_holder_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account holder name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  id="iban"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter IBAN"
                />
              </div>

              <div>
                <label htmlFor="swift_code" className="block text-sm font-medium text-gray-700 mb-2">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  id="swift_code"
                  name="swift_code"
                  value={formData.swift_code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter SWIFT code"
                />
              </div>
            </div>
          </>
        );

      case 'PAYPAL':
        return (
          <div>
            <label htmlFor="paypal_email" className="block text-sm font-medium text-gray-700 mb-2">
              PayPal Email *
            </label>
            <input
              type="email"
              id="paypal_email"
              name="paypal_email"
              value={formData.paypal_email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter PayPal email"
            />
          </div>
        );

      case 'WISE':
        return (
          <div>
            <label htmlFor="wise_email" className="block text-sm font-medium text-gray-700 mb-2">
              Wise Email *
            </label>
            <input
              type="email"
              id="wise_email"
              name="wise_email"
              value={formData.wise_email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter Wise email"
            />
          </div>
        );

      case 'CHECK':
        return (
          <div>
            <label htmlFor="mailing_address" className="block text-sm font-medium text-gray-700 mb-2">
              Mailing Address *
            </label>
            <textarea
              id="mailing_address"
              name="mailing_address"
              value={formData.mailing_address}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your complete mailing address for check delivery"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const calculateProgress = (payout: Payout) => {
    const steps = ['PENDING', 'APPROVED', 'PAID'];
    const currentStep = steps.indexOf(payout.status);
    return ((currentStep + 1) / steps.length) * 100;
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PartnerSidebar />
      <div className="flex-1 px-4 lg:px-6 py-6 lg:py-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Success Alert */}
          {showSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 animate-in slide-in-from-top">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-blue-700">💰 Payout Management</h1>
            <p className="text-gray-600 mt-2">Request payouts and track your earnings in real-time</p>
          </div>

          {/* Balance Overview */}
          {!balanceLoading && balance && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-green-500">
                <div className="text-2xl font-bold text-green-600">AED {balance.available_balance}</div>
                <div className="text-sm text-gray-600 mt-1">Available Balance</div>
                <div className="text-xs text-gray-500 mt-2">Ready for withdrawal</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-blue-500">
                <div className="text-2xl font-bold text-blue-600">AED {balance.total_earnings}</div>
                <div className="text-sm text-gray-600 mt-1">Total Earnings</div>
                <div className="text-xs text-gray-500 mt-2">Lifetime commissions</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-purple-500">
                <div className="text-2xl font-bold text-purple-600">{balance.commission_rate}%</div>
                <div className="text-sm text-gray-600 mt-1">Commission Rate</div>
                <div className="text-xs text-gray-500 mt-2">Per subscription</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-orange-500">
                <div className="text-2xl font-bold text-orange-600">AED {balance.total_paid_out}</div>
                <div className="text-sm text-gray-600 mt-1">Total Paid Out</div>
                <div className="text-xs text-gray-500 mt-2">All time payouts</div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('request')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'request'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  💳 Request Payout
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📜 Payout History
                </button>
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payout Request Form */}
            {activeTab === 'request' && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-blue-700 mb-6">💳 Request Payout</h2>
                  
                  {balance && parseFloat(balance.available_balance) < 50 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-yellow-800 font-medium">Minimum Payout: 50 AED</span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">
                        Your available balance is below the minimum payout amount. Keep referring clients to increase your earnings!
                      </p>
                    </div>
                  )}
                  
                  {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                      <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-green-800 mb-2">Request Submitted Successfully! 🎉</h3>
                      <p className="text-green-600 mb-4">
                        Your payout request has been submitted for review. We will process it within 3-5 business days.
                      </p>
                      <div className="flex space-x-3 justify-center">
                        <button
                          onClick={() => setSubmitted(false)}
                          className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition font-medium"
                        >
                          Submit Another Request
                        </button>
                        <button
                          onClick={() => setActiveTab('history')}
                          className="border border-green-600 text-green-600 py-2 px-6 rounded-lg hover:bg-green-50 transition font-medium"
                        >
                          View History
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (AED) *
                        </label>
                        <input
                          type="number"
                          id="amount"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          required
                          min="50"
                          step="0.01"
                          max={balance?.available_balance}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter amount"
                        />
                        {balance && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">
                              Available: <span className="font-semibold">AED {balance.available_balance}</span>
                            </span>
                            <span className="text-blue-600 font-medium">
                              Minimum: 50 AED
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method *
                        </label>
                        <select
                          id="payment_method"
                          name="payment_method"
                          value={formData.payment_method}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                          <option value="PAYPAL">💳 PayPal</option>
                          <option value="WISE">🌍 Wise</option>
                          <option value="CHECK">📮 Check</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {renderPaymentMethodFields()}
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Any special instructions or additional information..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !balance || parseFloat(balance.available_balance) < 50}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:from-blue-400 disabled:to-blue-400 disabled:cursor-not-allowed transition-all duration-200 font-medium text-lg shadow-lg"
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                            Processing Request...
                          </div>
                        ) : (
                          '🚀 Submit Payout Request'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Payout History */}
            {activeTab === 'history' && (
              <div className="lg:col-span-3">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <h2 className="text-2xl font-bold text-blue-700">📜 Payout History</h2>
                    <div className="flex items-center space-x-4 mt-2 lg:mt-0">
                      <span className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{payouts.length} requests</span>
                      </span>
                      <button
                        onClick={() => setActiveTab('request')}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                      >
                        + New Request
                      </button>
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
                      <span className="ml-3 text-blue-600 font-medium">Loading payout history...</span>
                    </div>
                  ) : payouts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-gray-900 mb-2">No payout history yet</h3>
                      <p className="text-gray-500 mb-6">Your payout requests will appear here once submitted.</p>
                      <button
                        onClick={() => setActiveTab('request')}
                        className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-medium"
                      >
                        Make Your First Payout Request
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {payouts.map((payout) => (
                        <div key={payout.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="text-2xl font-bold text-blue-700 mr-3">AED {payout.amount}</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}>
                                  {getStatusIcon(payout.status)} {payout.status}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-1">{getPaymentMethodDisplay(payout)}</p>
                              <p className="text-sm text-gray-500">
                                Requested: {formatDate(payout.created_at)}
                                {payout.updated_at && payout.updated_at !== payout.created_at && (
                                  <span className="ml-2">• Updated: {formatDate(payout.updated_at)}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3 mt-3 lg:mt-0">
                              {payout.can_cancel && (
                                <button
                                  onClick={() => handleCancelPayout(payout.id)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 py-2 px-4 rounded-lg transition"
                                >
                                  Cancel Request
                                </button>
                              )}
                              {payout.receipt_url && (
                                <a
                                  href={payout.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 py-2 px-4 rounded-lg transition"
                                >
                                  View Receipt
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Pending</span>
                              <span>Approved</span>
                              <span>Paid</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${calculateProgress(payout)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Additional Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {payout.notes && (
                              <div>
                                <span className="font-medium text-gray-700">Your Notes:</span>
                                <p className="text-gray-600 mt-1">{payout.notes}</p>
                              </div>
                            )}
                            {payout.admin_notes && (
                              <div>
                                <span className="font-medium text-gray-700">Admin Notes:</span>
                                <p className="text-gray-600 mt-1">{payout.admin_notes}</p>
                              </div>
                            )}
                            {payout.transaction_id && (
                              <div>
                                <span className="font-medium text-gray-700">Transaction ID:</span>
                                <p className="text-gray-600 mt-1 font-mono">{payout.transaction_id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats & Help - Only show on request tab */}
            {activeTab === 'request' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-700 mb-4">📊 Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Available for Payout</span>
                      <span className="font-semibold text-green-600">AED {balance?.available_balance || '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Minimum Amount</span>
                      <span className="font-semibold">AED 50.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Processing Time</span>
                      <span className="font-semibold">3-5 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Commission Rate</span>
                      <span className="font-semibold text-purple-600">{balance?.commission_rate || '20'}%</span>
                    </div>
                  </div>
                </div>

                {/* Help Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-700 mb-4">❓ Need Help?</h3>
                  <p className="text-gray-600 mb-4">
                    If you have questions about payouts or need assistance, our support team is here to help.
                  </p>
                  <div className="space-y-3">
                    <a 
                      href="mailto:support@clearinvoice.com" 
                      className="flex items-center bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Support
                    </a>
                    <a 
                      href="tel:+971123456789" 
                      className="flex items-center border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call Support
                    </a>
                  </div>
                </div>

                {/* Tips Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Pro Tips</h3>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li>• Ensure bank details are accurate to avoid delays</li>
                    <li>• Keep your balance above AED 50 for quick payouts</li>
                    <li>• Refer more clients to increase your earnings</li>
                    <li>• Check payout status regularly for updates</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}