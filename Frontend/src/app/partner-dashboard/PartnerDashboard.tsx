// src/app/partner-dashboard/PartnerDashboard.tsx
'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import PartnerSidebar from "./components/PartnerSidebar";

interface Client {
  id: number;
  name: string;
  email?: string;
  trn?: string;
  is_active: boolean;
  total_commission: number;
  monthly_commission: number;
  company_linked: boolean;
  created_at: string;
  last_payment_date?: string;
  subscription_plan: string;
}

interface DashboardData {
  partner_name: string;
  referral_link: string;
  referral_code: string;
  total_clients: number;
  active_clients: number;
  lifetime_commission: number;
  monthly_commission: number;
  clients: Client[];
  notifications: any[];
  unread_count: number;
}

export default function PartnerDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/api/partner/dashboard/');
        if (response.status === 200) {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        if (error.response?.status === 403) {
          router.push('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchDashboardData();
  }, [user, router]);

  const generateSalesReport = async () => {
    setPdfLoading(true);
    try {
      const response = await api.post('/api/partner/sales-report-pdf/', {
        start_date: dateRange.start,
        end_date: dateRange.end,
        clients: selectedClientIds,
      }, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales_report_${dateRange.start}_to_${dateRange.end}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('PDF generation failed', err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">Loading...</div>;
  if (!user) return null;

  const toggleClientSelection = (id: number) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter(cid => cid !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  const selectAllClients = () => {
    if (dashboardData && selectedClientIds.length === dashboardData.clients.length) {
      setSelectedClientIds([]);
    } else if (dashboardData) {
      setSelectedClientIds(dashboardData.clients.map(c => c.id));
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <PartnerSidebar />
      <div className="flex-1 px-6 py-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700">Partner Dashboard</h1>
          {dashboardData && (
            <div className="text-right">
              <p className="text-lg font-semibold">{dashboardData.partner_name}</p>
              <p className="text-sm text-gray-600">Referral Code: {dashboardData.referral_code}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Total Clients</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">{dashboardData?.total_clients || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Active Clients</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">{dashboardData?.active_clients || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Lifetime Commission</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">AED {dashboardData?.lifetime_commission?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Monthly Commission</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">AED {dashboardData?.monthly_commission?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition mb-8">
          <p className="text-gray-700 mb-1">Your Referral Link:</p>
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              readOnly 
              value={dashboardData?.referral_link || ''} 
              className="border rounded py-2 px-3 w-full md:w-96" 
            />
            <button
              onClick={() => { 
                navigator.clipboard.writeText(dashboardData?.referral_link || ''); 
                setCopied(true); 
                setTimeout(() => setCopied(false), 2000); 
              }}
              className="bg-blue-600 text-white py-2 px-4 rounded-xl"
            >
              Copy
            </button>
            {copied && <span className="text-green-600 font-medium">Copied!</span>}
          </div>
        </div>

        {/* Report Generation */}
        <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition mb-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Sales Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })} 
                className="border rounded py-2 px-3 w-full" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })} 
                className="border rounded py-2 px-3 w-full" 
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateSalesReport}
                disabled={pdfLoading}
                className="bg-purple-600 text-white py-2 px-4 rounded-xl w-full"
              >
                {pdfLoading ? "Generating Report..." : "Download Sales Report"}
              </button>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Referred Clients</h2>

          {dashboardData?.clients && dashboardData.clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-50 text-blue-700">
                    <th className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.length === dashboardData.clients.length}
                        onChange={selectAllClients}
                      />
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">Client Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Email</th>
                    <th className="px-6 py-3 text-left font-semibold">TRN</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Subscription Plan</th>
                    <th className="px-6 py-3 text-left font-semibold">Total Commission (AED)</th>
                    <th className="px-6 py-3 text-left font-semibold">Monthly Commission (AED)</th>
                    <th className="px-6 py-3 text-left font-semibold">Last Payment</th>
                    <th className="px-6 py-3 text-left font-semibold">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dashboardData.clients.map(client => (
                    <tr key={client.id} className="hover:bg-blue-50 transition">
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                        />
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-800">{client.name}</td>
                      <td className="px-6 py-3 text-gray-700">{client.email || '-'}</td>
                      <td className="px-6 py-3 text-gray-700">{client.trn || '-'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.subscription_plan === 'FREE' ? 'bg-gray-100 text-gray-800' :
                          client.subscription_plan === 'STARTER' ? 'bg-blue-100 text-blue-800' :
                          client.subscription_plan === 'UNLIMITED' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {client.subscription_plan || 'No Subscription'}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-800">AED {client.total_commission.toFixed(2)}</td>
                      <td className="px-6 py-3 font-semibold text-gray-800">AED {client.monthly_commission.toFixed(2)}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {client.last_payment_date ? new Date(client.last_payment_date).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-3 text-gray-700">{new Date(client.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No clients referred yet. Share your referral link to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
}