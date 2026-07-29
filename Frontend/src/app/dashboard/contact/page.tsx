// src/app/client-dashboard/contact/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '../../dashboard/components/Sidebar';

export default function ContactPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  // Set category from URL params if available
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setFormData(prev => ({ ...prev, category }));
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await api.post('/api/client/contact/', {
        ...formData,
        email: user?.email,
        name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email,
      });
      
      if (response.status === 200) {
        setSubmitted(true);
        setFormData({ subject: '', message: '', category: 'general' });
      }
    } catch (error: any) {
      console.error('Failed to send message', error);
      setError(error.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: '✉️',
      title: 'Email Support',
      details: 'support@clearinvoice.com',
      description: 'Send us an email anytime',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      icon: '📞',
      title: 'Phone Support',
      details: '+971 4 123 4567',
      description: 'Sunday - Thursday: 9AM - 6PM',
      color: 'bg-green-50 border-green-200'
    },
    {
      icon: '🏢',
      title: 'Office Address',
      details: 'Business Bay, Dubai',
      description: 'United Arab Emirates',
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  const categories = [
    { value: 'general', label: 'General Inquiry', description: 'General questions about our services' },
    { value: 'technical', label: 'Technical Support', description: 'Issues with platform functionality' },
    { value: 'billing', label: 'Billing Issue', description: 'Questions about payments or invoices' },
    { value: 'feature', label: 'Feature Request', description: 'Suggest new features or improvements' },
    { value: 'complaint', label: 'Complaint', description: 'Report issues or concerns' }
  ];

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
      <Sidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Contact Support</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Get in Touch</h2>
              
              <div className="space-y-4">
                {contactMethods.map((method, index) => (
                  <div key={index} className={`border rounded-xl p-4 ${method.color}`}>
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">{method.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">{method.title}</h3>
                        <p className="text-gray-700 font-medium">{method.details}</p>
                        <p className="text-gray-600 text-sm mt-1">{method.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Business Hours */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">Business Hours</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Sunday - Thursday:</span>
                    <span className="font-medium">9AM - 6PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friday:</span>
                    <span className="font-medium">9AM - 12PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday:</span>
                    <span className="font-medium text-red-600">Closed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Help */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Quick Response</h3>
              <p className="text-blue-100 mb-4">
                We typically respond to all inquiries within 2 business hours during our support hours.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h2>
              
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent Successfully!</h3>
                  <p className="text-green-700 mb-4">
                    Thank you for contacting us. We'll get back to you within 2 business hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      What can we help you with?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <label
                          key={cat.value}
                          className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                            formData.category === cat.value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat.value}
                            checked={formData.category === cat.value}
                            onChange={handleChange}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-3">
                            <div className="font-medium text-gray-800">{cat.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{cat.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your inquiry"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Please provide detailed information about your inquiry..."
                      required
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Sending Message...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}