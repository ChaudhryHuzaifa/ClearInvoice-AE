// src/app/client-dashboard/resources/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '../../dashboard/components/Sidebar';

interface Resource {
  id: number;
  title: string;
  type: string;
  url: string;
  description: string;
}

export default function ResourcesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setError(null);
        const response = await api.get('/api/client/resources/');
        if (response.status === 200) {
          setResources(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch resources', error);
        setError('Unable to load resources at the moment');
        
        // Fallback: Show sample resources
        const fallbackResources: Resource[] = [
          {
            id: 1,
            title: 'Getting Started Guide',
            type: 'guide',
            url: '#',
            description: 'Learn how to make the most of our platform with this comprehensive guide.'
          },
          {
            id: 2,
            title: 'Video Tutorials',
            type: 'video',
            url: '#',
            description: 'Watch step-by-step tutorials to master all features.'
          }
        ];
        setResources(fallbackResources);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchResources();
  }, [user]);

  const handleRetry = () => {
    setLoading(true);
    fetchResources();
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: { icon: string; color: string; label: string } } = {
      video: { icon: '🎬', color: 'bg-red-50 border-red-200', label: 'Video' },
      guide: { icon: '📄', color: 'bg-blue-50 border-blue-200', label: 'Guide' },
      document: { icon: '📋', color: 'bg-green-50 border-green-200', label: 'Document' },
      tutorial: { icon: '🎓', color: 'bg-purple-50 border-purple-200', label: 'Tutorial' }
    };
    
    return icons[type] || icons.document;
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
      <Sidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Resources & Guides</h1>
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
              <span className="ml-3 text-blue-600 font-medium">Loading resources...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Learning Resources</h2>
                  <span className="text-gray-500 text-sm">
                    {resources.length} resource{resources.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.map((resource) => {
                    const typeInfo = getTypeIcon(resource.type);
                    return (
                      <div key={resource.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${typeInfo.color} mb-4`}>
                          <span className="text-2xl">{typeInfo.icon}</span>
                        </div>
                        
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            typeInfo.color.replace('bg-', 'text-').replace('-50', '-600') + ' ' +
                            typeInfo.color
                          }`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{resource.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                        
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                        >
                          {resource.type === 'video' ? 'Watch Video' : 'View Resource'}
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    );
                  })}
                </div>

                {resources.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Resources Available</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      We're currently preparing amazing resources for you. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Help Sidebar */}
            <div className="lg:col-span-3 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">Need Quick Help?</h3>
                  <p className="text-blue-100 mb-4">
                    Our support team is here to help you get the most out of our platform.
                  </p>
                  <button
                    onClick={() => router.push('/client-dashboard/contact')}
                    className="bg-white text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition font-medium"
                  >
                    Contact Support
                  </button>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">Feature Requests</h3>
                  <p className="text-purple-100 mb-4">
                    Have an idea to improve our platform? We'd love to hear it!
                  </p>
                  <button
                    onClick={() => router.push('/client-dashboard/contact?category=feature')}
                    className="bg-white text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-50 transition font-medium"
                  >
                    Suggest Feature
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}