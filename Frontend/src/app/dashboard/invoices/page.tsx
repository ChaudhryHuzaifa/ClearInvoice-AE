// src/app/dashboard/invoices/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Sidebar from '../components/Sidebar';

interface Invoice {
  id: number;
  invoice_number: string;
  total_amount: string;
  total_vat_amount: string;
  status: string;
  issue_date: string;
  created_at: string;
  client_details: {
    name: string;
    email?: string;
    trn?: string;
  };
  client_name?: string;
  emirate?: string;
  pdf_url?: string;
}

export default function InvoicesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'created_at',
    direction: 'descending'
  });

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/api/invoices/');
        if (response.status === 200) {
          const sortedInvoices = response.data.sort(
            (a: Invoice, b: Invoice) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setInvoices(sortedInvoices);
        }
      } catch (error) {
        console.error('Failed to fetch invoices', error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    if (user) fetchInvoices();
  }, [user]);

  const sortedInvoices = useMemo(() => {
    let sortableItems = [...invoices];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key as keyof Invoice] < b[sortConfig.key as keyof Invoice]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key as keyof Invoice] > b[sortConfig.key as keyof Invoice]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [invoices, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const handleStatusUpdate = async (invoiceId: number, newStatus: string) => {
    try {
      await api.patch(`/api/invoices/${invoiceId}/`, { status: newStatus });
      setInvoices(prev => prev.map(inv => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv)));
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await api.delete(`/api/invoices/${invoiceId}/`);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      alert("Invoice deleted successfully!");
    } catch (error) {
      console.error("Failed to delete invoice", error);
      alert("Failed to delete invoice. Please try again.");
    }
  };

  const triggerDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed', error);
    }
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
          <h1 className="text-4xl font-bold text-blue-700">All Invoices</h1>
          <a
            href="/invoices/create"
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white font-semibold py-2 px-6 rounded-xl shadow-md"
          >
            + Create Invoice
          </a>
        </div>

        {/* Search and Stats */}
        <div className="mb-6 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search by invoice #, client name, or emirate"
            className="border rounded py-2 px-3 w-full md:w-1/3 shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={(e) => {
              const query = e.target.value.toLowerCase();
              const filtered = invoices.filter(inv =>
                inv.invoice_number.toLowerCase().includes(query) ||
                (inv.client_details?.name?.toLowerCase().includes(query) ?? false) ||
                (inv.emirate?.toLowerCase().includes(query) ?? false)
              );
              setInvoices(filtered);
            }}
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
            {invoices.length} invoices total
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          {loadingInvoices ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-blue-600 font-medium">Loading invoices...</span>
            </div>
          ) : sortedInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-blue-50 text-blue-700">
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('invoice_number')}>
                      Invoice # {sortConfig.key === 'invoice_number' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('client_details.name')}>
                      Client {sortConfig.key === 'client_details.name' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('total_amount')}>
                      Amount {sortConfig.key === 'total_amount' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('emirate')}>
                      Emirate {sortConfig.key === 'emirate' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('issue_date')}>
                      Issue Date {sortConfig.key === 'issue_date' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('created_at')}>
                      Created Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-blue-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-800">{invoice.invoice_number}</td>
                      <td className="px-6 py-3 text-gray-700">{invoice.client_details?.name || invoice.client_name || 'No client name'}</td>
                      <td className="px-6 py-3 font-semibold text-gray-800">AED {invoice.total_amount}</td>
                      <td className="px-6 py-3">
                        <select 
                          value={invoice.status} 
                          onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)} 
                          className="bg-transparent border border-gray-300 p-1 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="PAID">Paid</option>
                          <option value="OVERDUE">Overdue</option>
                        </select>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{invoice.emirate || 'Not specified'}</td>
                      <td className="px-6 py-3 text-gray-700">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-gray-700">{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex space-x-4">
                          {/* View Icon */}
                          <a 
                            href={`/invoices/${invoice.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 transition-colors" 
                            title="View Invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                          
                          {/* Download Icon */}
                          <button 
                            onClick={() => invoice.pdf_url && triggerDownload(invoice.pdf_url, `${invoice.invoice_number}.pdf`)} 
                            className="text-green-600 hover:text-green-800 transition-colors" 
                            title="Download PDF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          
                          {/* Delete Icon */}
                          <button 
                            onClick={() => handleDeleteInvoice(invoice.id)} 
                            className="text-red-600 hover:text-red-800 transition-colors" 
                            title="Delete Invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">No invoices found.</p>
              <a href="/invoices/create" className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white font-semibold py-2 px-6 rounded-xl shadow-md">
                Create your first invoice
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}