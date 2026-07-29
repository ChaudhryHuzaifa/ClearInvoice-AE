import { ReactNode } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardSidebar from '@/components/DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}