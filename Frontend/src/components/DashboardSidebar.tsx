'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Invoices', href: '/dashboard/invoices', icon: 'document-text' },
  { name: 'Clients', href: '/dashboard/clients', icon: 'users' },
  { name: 'Company', href: '/dashboard/company', icon: 'office-building' },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <h1 className="text-white text-xl font-semibold">ClearInvoice AE</h1>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 bg-gray-800">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 mt-2 text-gray-100 rounded-lg hover:bg-gray-700 ${
                  isActive ? 'bg-gray-700' : ''
                }`}
              >
                <span className="mx-4">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center px-4 py-4 bg-gray-700">
        <div className="flex items-center">
          <div className="mx-4">
            <h4 className="text-sm font-semibold text-gray-200">
              {user?.company.name}
            </h4>
            <p className="text-xs text-gray-400">{user?.user.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="ml-auto text-gray-400 hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}