// src/app/partner/resources/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import PartnerSidebar from '../../partner-dashboard/components/PartnerSidebar';

export default function ResourcesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-3 text-blue-600 font-medium">Loading...</p>
      </div>
    </div>
  );

  if (!user) return null;

  const resources = [
    {
      title: "Partner Guide",
      description: "Complete guide to using the partner dashboard and maximizing your earnings",
      icon: "📚",
      link: "#",
      category: "Documentation"
    },
    {
      title: "Marketing Materials",
      description: "Download banners, flyers, and other marketing materials",
      icon: "🎨",
      link: "#",
      category: "Marketing"
    },
    {
      title: "Commission Structure",
      description: "Detailed breakdown of our commission system and payment terms",
      icon: "💰",
      link: "#",
      category: "Financial"
    },
    {
      title: "FAQs",
      description: "Frequently asked questions about our partner program",
      icon: "❓",
      link: "#",
      category: "Support"
    },
    {
      title: "Best Practices",
      description: "Proven strategies to maximize your referral success",
      icon: "⭐",
      link: "#",
      category: "Success"
    },
    {
      title: "Brand Guidelines",
      description: "Official branding materials and usage guidelines",
      icon: "🎯",
      link: "#",
      category: "Marketing"
    }
  ];

  const categories = [...new Set(resources.map(resource => resource.category))];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PartnerSidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-blue-700">Partner Resources</h1>
            <p className="text-gray-600 mt-2">Everything you need to succeed as a ClearInvoice partner</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-2xl font-bold text-blue-700 mb-2">{resources.length}</div>
              <div className="text-gray-600">Total Resources</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-2xl font-bold text-green-600 mb-2">{categories.length}</div>
              <div className="text-gray-600">Categories</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-2xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600">Support Available</div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-2xl font-bold text-orange-600 mb-2">Latest</div>
              <div className="text-gray-600">Always Updated</div>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-700">All Resources</h2>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{resource.icon}</div>
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                      {resource.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 group-hover:text-blue-600 transition">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {resource.description}
                  </p>
                  <a 
                    href={resource.link} 
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium group"
                  >
                    Access Resource
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Support Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-2xl font-bold mb-4">Partner Success Team</h3>
              <p className="mb-6 opacity-90">
                Our dedicated partner success team is here to help you maximize your earnings and grow your business.
              </p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+971 123 456 789</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>partners@clearinvoice.com</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-blue-700 mb-4">Schedule a Call</h3>
              <p className="text-gray-600 mb-6">
                Book a one-on-one session with our partner success manager to discuss your growth strategy.
              </p>
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
                Schedule Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}