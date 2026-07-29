// src/app/partner/settings/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import PartnerSidebar from '../../partner-dashboard/components/PartnerSidebar';


export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notificationEmail: true,
    notificationSMS: false
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await api.patch('/api/partner/profile/', formData);
      
      if (response.status === 200) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PartnerSidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-700 mb-8">Partner Settings</h1>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">Profile Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="notificationEmail"
                      name="notificationEmail"
                      type="checkbox"
                      checked={formData.notificationEmail}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notificationEmail" className="ml-3 block text-sm font-medium text-gray-700">
                      Email Notifications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="notificationSMS"
                      name="notificationSMS"
                      type="checkbox"
                      checked={formData.notificationSMS}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notificationSMS" className="ml-3 block text-sm font-medium text-gray-700">
                      SMS Notifications
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                {saved && (
                  <span className="text-green-600 font-medium">Settings saved successfully!</span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold text-red-700 mb-4">Danger Zone</h2>
            
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-red-800 mb-2">Delete Account</h3>
              <p className="text-red-600 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}