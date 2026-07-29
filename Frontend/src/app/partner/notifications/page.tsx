// src/app/partner/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import PartnerSidebar from '../../partner-dashboard/components/PartnerSidebar';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  time_ago: string;
  notification_type: 'PAYOUT_APPROVED' | 'PAYOUT_PAID' | 'COMMISSION_EARNED' | 'NEW_CLIENT' | 'SYSTEM' | 'INFO';
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  today: number;
  this_week: number;
}

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Show success message
  const showSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/partner/notifications/');
      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      }
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark as read
  const markAsRead = async (id: number) => {
    try {
      await api.post(`/api/partner/notifications/${id}/mark-read/`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      // Refresh stats
      await fetchNotifications();
      showSuccessAlert('Notification marked as read!');
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.post('/api/partner/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      // Refresh stats
      await fetchNotifications();
      showSuccessAlert('All notifications marked as read!');
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const getNotificationIcon = (type: string, isRead: boolean) => {
    if (isRead) return '📭';
    
    switch (type) {
      case 'PAYOUT_APPROVED': return '✅';
      case 'PAYOUT_PAID': return '💰';
      case 'COMMISSION_EARNED': return '💸';
      case 'NEW_CLIENT': return '👤';
      case 'SYSTEM': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return 'text-gray-600 bg-gray-100';
    
    switch (type) {
      case 'PAYOUT_APPROVED': return 'text-green-600 bg-green-100';
      case 'PAYOUT_PAID': return 'text-blue-600 bg-blue-100';
      case 'COMMISSION_EARNED': return 'text-purple-600 bg-purple-100';
      case 'NEW_CLIENT': return 'text-indigo-600 bg-indigo-100';
      case 'SYSTEM': return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getCardBorderColor = (type: string, isRead: boolean) => {
    if (isRead) return 'border-l-gray-300';
    
    switch (type) {
      case 'PAYOUT_APPROVED': return 'border-l-green-500';
      case 'PAYOUT_PAID': return 'border-l-blue-500';
      case 'COMMISSION_EARNED': return 'border-l-purple-500';
      case 'NEW_CLIENT': return 'border-l-indigo-500';
      case 'SYSTEM': return 'border-l-orange-500';
      default: return 'border-l-blue-500';
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

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.is_read;
    return true;
  });

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
            <h1 className="text-3xl lg:text-4xl font-bold text-blue-700">🔔 Notifications</h1>
            <p className="text-gray-600 mt-2">Stay updated with your partner activities and earnings</p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-blue-500">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total Notifications</div>
                <div className="text-xs text-gray-500 mt-2">All time</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-red-500">
                <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
                <div className="text-sm text-gray-600 mt-1">Unread</div>
                <div className="text-xs text-gray-500 mt-2">Requires attention</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-green-500">
                <div className="text-2xl font-bold text-green-600">{stats.read}</div>
                <div className="text-sm text-gray-600 mt-1">Read</div>
                <div className="text-xs text-gray-500 mt-2">Already viewed</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center border-l-4 border-purple-500">
                <div className="text-2xl font-bold text-purple-600">{stats.this_week}</div>
                <div className="text-sm text-gray-600 mt-1">This Week</div>
                <div className="text-xs text-gray-500 mt-2">Recent activity</div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📋 All Notifications
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'unread'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔴 Unread Only
                </button>
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Notifications List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                  <h2 className="text-2xl font-bold text-blue-700">
                    {activeTab === 'unread' ? '🔴 Unread Notifications' : '📋 All Notifications'}
                  </h2>
                  <div className="flex items-center space-x-4 mt-2 lg:mt-0">
                    <span className="text-sm text-gray-600">
                      Showing: <span className="font-semibold">{filteredNotifications.length} notifications</span>
                    </span>
                    {stats && stats.unread > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                      >
                        Mark All as Read
                      </button>
                    )}
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-blue-600 font-medium">Loading notifications...</span>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {activeTab === 'unread' 
                        ? 'You\'re all caught up! No unread notifications.' 
                        : 'Your notifications will appear here once you start receiving them.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 border-l-4 ${getCardBorderColor(notification.notification_type, notification.is_read)}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="text-2xl font-bold text-blue-700 mr-3">
                                {getNotificationIcon(notification.notification_type, notification.is_read)}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getNotificationColor(notification.notification_type, notification.is_read)}`}>
                                {notification.notification_type.replace('_', ' ')}
                              </span>
                              {!notification.is_read && (
                                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                  NEW
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {notification.title}
                            </h3>
                            <p className="text-gray-600 mb-1">
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3 mt-3 lg:mt-0">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 hover:bg-blue-100 py-2 px-4 rounded-lg transition"
                              >
                                Mark as Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats & Help */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">⚡ Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={markAllAsRead}
                    disabled={!stats || stats.unread === 0}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium text-center"
                  >
                    📭 Mark All as Read
                  </button>
                  <button
                    onClick={fetchNotifications}
                    className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition font-medium text-center"
                  >
                    🔄 Refresh List
                  </button>
                </div>
              </div>

              {/* Notification Summary */}
              {stats && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-700 mb-4">📊 Notification Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Notifications</span>
                      <span className="font-semibold text-blue-600">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Unread</span>
                      <span className="font-semibold text-red-600">{stats.unread}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Read</span>
                      <span className="font-semibold text-green-600">{stats.read}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">This Week</span>
                      <span className="font-semibold text-purple-600">{stats.this_week}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">❓ Need Help?</h3>
                <p className="text-gray-600 mb-4">
                  If you have questions about notifications or need assistance, our support team is here to help.
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
                <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Notification Tips</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>• Mark notifications as read to stay organized</li>
                  <li>• Check regularly for payout updates</li>
                  <li>• Unread notifications will show red badges</li>
                  <li>• Different colors indicate notification types</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}