// src/app/dashboard/components/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Users, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  BookOpen,
  Phone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, href: '/dashboard' },
    { name: 'Invoices', icon: <FileText className="h-5 w-5" />, href: '/dashboard/invoices' },
    { name: 'Clients', icon: <Users className="h-5 w-5" />, href: '/dashboard/clients' },
    { name: 'Subscription', icon: <CreditCard className="h-5 w-5" />, href: '/dashboard/subscription' },
    { name: 'Resources', icon: <BookOpen className="h-5 w-5" />, href: '/dashboard/resources' },
    { name: 'Contact Us', icon: <Phone className="h-5 w-5" />, href: '/dashboard/contact' },
  ];

  return (
    <div className={`bg-white shadow-lg min-h-screen flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-60'} rounded-r-xl overflow-hidden`}>
      
      {/* Top Section with toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        {!collapsed && <span className="text-lg font-bold text-blue-700">ClearInvoice</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 transition"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5 text-gray-600" /> : <ChevronLeft className="h-5 w-5 text-gray-600" />}
        </button>
      </div>

      {/* Menu items */}
      <nav className="flex flex-col mt-4">
        {menuItems.map(item => (
          <Link key={item.name} href={item.href}>
            <div
              className={`flex items-center gap-3 p-2 mx-2 my-1 rounded-lg cursor-pointer hover:bg-blue-50 transition 
                ${pathname === item.href ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-700'}`}
            >
              {item.icon}
              {!collapsed && <span>{item.name}</span>}
            </div>
          </Link>
        ))}
      </nav>

      {/* Logout button right below menu */}
      <div className="mt-2">
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="flex items-center gap-2 p-2 mx-2 rounded-lg hover:bg-red-50 text-red-600 transition w-full"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}