// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Sidebar from './components/Sidebar';

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

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'created_at',
    direction: 'descending'
  });

  // Track if automatic download has already been triggered
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/api/invoices/');
        if (response.status === 200) {
          // Sort by created_at for latest invoices
          const sortedInvoices = response.data.sort(
            (a: Invoice, b: Invoice) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setInvoices(sortedInvoices);
          
          // Set filtered invoices to only show 10 latest for dashboard
          setFilteredInvoices(sortedInvoices.slice(0, 10));

          // Automatic download only once
          const lastDownloadedInvoiceId = localStorage.getItem('lastDownloadedInvoiceId');
          if (sortedInvoices.length > 0 && sortedInvoices[0].pdf_url) {
            const latestInvoiceId = sortedInvoices[0].id.toString();
            if (lastDownloadedInvoiceId !== latestInvoiceId) {
              triggerDownload(sortedInvoices[0].pdf_url, `${sortedInvoices[0].invoice_number}.pdf`);
              localStorage.setItem('lastDownloadedInvoiceId', latestInvoiceId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch invoices', error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    if (user) fetchInvoices();
  }, [user]);

  // Get only the 10 latest invoices for display
  const latestInvoices = useMemo(() => {
    return invoices.slice(0, 10);
  }, [invoices]);

  const sortedInvoices = useMemo(() => {
    let sortableItems = [...filteredInvoices];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key as keyof Invoice] < b[sortConfig.key as keyof Invoice]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key as keyof Invoice] > b[sortConfig.key as keyof Invoice]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredInvoices, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const handleStatusUpdate = async (invoiceId: number, newStatus: string) => {
    try {
      await api.patch(`/api/invoices/${invoiceId}/`, { status: newStatus });
      setInvoices(prev => prev.map(inv => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv)));
      setFilteredInvoices(prev => prev.map(inv => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv)));
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
      setFilteredInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      alert("Invoice deleted successfully!");
    } catch (error) {
      console.error("Failed to delete invoice", error);
      alert("Failed to delete invoice. Please try again.");
    }
  };

  const handleDateFilter = () => {
    if (activeTab !== 'sales') return;
    const filtered = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.issue_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });
    setFilteredInvoices(filtered);
  };

  const calculateInvoiceAmounts = (invoice: Invoice) => {
    const total = parseFloat(invoice.total_amount) || 0;
    const vat = parseFloat(invoice.total_vat_amount) || 0;
    const subtotal = total - vat;
    return { subtotal, vat, total };
  };

  // Calculate sales data from ALL invoices, not just filtered ones
  const calculateSalesData = () => {
    const salesByEmirate: { [key: string]: { sales: number; vat: number } } = {};
    let totalSales = 0;
    let totalVAT = 0;
    
    // Use ALL invoices for total calculations
    invoices.forEach(invoice => {
      const { subtotal, vat, total } = calculateInvoiceAmounts(invoice);
      totalSales += subtotal;
      totalVAT += vat;
      const emirate = invoice.emirate || 'Unknown';
      if (!salesByEmirate[emirate]) salesByEmirate[emirate] = { sales: 0, vat: 0 };
      salesByEmirate[emirate].sales += subtotal;
      salesByEmirate[emirate].vat += vat;
    });
    return { totalSales, totalVAT, salesByEmirate };
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

  const generateSalesReport = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const startX = 14;
    let startY = 20;

    const companyName = user.company?.name || 'Company';
    const companyTRN = user.company?.tax_registration_number || 'TRN Not Provided';

    doc.setFontSize(16);
    doc.text(companyName, startX, startY);
    startY += 6;
    doc.setFontSize(12);
    doc.text(`TRN: ${companyTRN}`, startX, startY);

    startY += 10;
    doc.setFontSize(14);
    doc.text(`Sales Report (${dateRange.start} to ${dateRange.end})`, startX, startY);

    startY += 10;
    doc.setFontSize(12);
    const headers = ['Emirate', 'Subtotal (AED)', 'VAT (AED)', 'Total (AED)'];
    headers.forEach((header, index) => doc.text(header, startX + index * 45, startY));
    startY += 6;

    // For sales report, use the currently filtered invoices (by date range)
    const salesDataForReport = Object.entries(calculateSalesDataForReport().salesByEmirate);
    salesDataForReport.forEach(([emirate, data], rowIndex) => {
      const rowY = startY + rowIndex * 8;
      doc.text(emirate, startX, rowY);
      doc.text(data.sales.toFixed(2), startX + 45, rowY);
      doc.text(data.vat.toFixed(2), startX + 90, rowY);
      doc.text((data.sales + data.vat).toFixed(2), startX + 135, rowY);
    });

    const fileName = `${companyName.replace(/\s+/g, '_')}_Sales_Report_${dateRange.start}_to_${dateRange.end}.pdf`;
    doc.save(fileName);
  };

  // Separate function for sales report calculations (uses filtered invoices)
  const calculateSalesDataForReport = () => {
    const salesByEmirate: { [key: string]: { sales: number; vat: number } } = {};
    let totalSales = 0;
    let totalVAT = 0;
    
    // Use filtered invoices for report calculations
    filteredInvoices.forEach(invoice => {
      const { subtotal, vat, total } = calculateInvoiceAmounts(invoice);
      totalSales += subtotal;
      totalVAT += vat;
      const emirate = invoice.emirate || 'Unknown';
      if (!salesByEmirate[emirate]) salesByEmirate[emirate] = { sales: 0, vat: 0 };
      salesByEmirate[emirate].sales += subtotal;
      salesByEmirate[emirate].vat += vat;
    });
    return { totalSales, totalVAT, salesByEmirate };
  };

  // Calculate totals from ALL invoices for dashboard stats
  const { totalSales, totalVAT } = calculateSalesData();

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
          <h1 className="text-4xl font-bold text-blue-700">Dashboard</h1>
          <a
            href="/invoices/create"
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white font-semibold py-2 px-6 rounded-xl shadow-md"
          >
            + Create Invoice
          </a>
        </div>

        {/* Stats - These show totals from ALL invoices */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Total Invoices</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">{invoices.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Total Sales</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">AED {totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Total VAT</h2>
            <p className="text-4xl font-bold mt-2 text-gray-800">AED {totalVAT.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-blue-600">Company</h2>
            <p className="mt-2 text-gray-700">{user.company?.name || 'No company information'}</p>
            <p className="text-sm text-gray-600">TRN: {user.company?.tax_registration_number || 'Not provided'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex border-b mb-6">
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'invoices' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => { 
                setActiveTab('invoices'); 
                setFilteredInvoices(latestInvoices); // Show only latest 10 invoices
              }}
            >
              Recent Invoices
            </button>
            <button
              className={`py-2 px-4 font-medium ${activeTab === 'sales' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => {
                setActiveTab('sales');
                setFilteredInvoices(invoices); // Reset to all invoices for sales report
              }}
            >
              Sales Report
            </button>
          </div>

          {activeTab === 'invoices' ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Search by invoice # or client name"
                  className="border rounded py-2 px-3 w-full md:w-1/3 shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onChange={(e) => {
                    const query = e.target.value.toLowerCase();
                    const filtered = invoices.filter(inv =>
                      inv.invoice_number.toLowerCase().includes(query) ||
                      (inv.client_details?.name?.toLowerCase().includes(query) ?? false)
                    );
                    // Still limit to 10 even when searching, but show matching results
                    setFilteredInvoices(filtered.slice(0, 10));
                  }}
                />
                {invoices.length > 10 && (
                  <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                    Showing 10 latest of {invoices.length} invoices
                    <a 
                      href="/invoices" 
                      className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All →
                    </a>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-blue-700 mb-6">Recent Invoices</h2>
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
                        <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('invoice_number')}>Invoice # {sortConfig.key === 'invoice_number' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</th>
                        <th className="px-6 py-3 text-left font-semibold">Client</th>
                        <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('total_amount')}>Amount {sortConfig.key === 'total_amount' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</th>
                        <th className="px-6 py-3 text-left font-semibold">Status</th>
                        <th className="px-6 py-3 text-left font-semibold">Emirate</th>
                        <th className="px-6 py-3 text-left font-semibold cursor-pointer" onClick={() => requestSort('created_at')}>Created Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}</th>
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
                            <select value={invoice.status} onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)} className="bg-transparent border-none p-1 rounded text-xs font-medium">
                              <option value="DRAFT">Draft</option>
                              <option value="SENT">Sent</option>
                              <option value="PAID">Paid</option>
                              <option value="OVERDUE">Overdue</option>
                            </select>
                          </td>
                          <td className="px-6 py-3 text-gray-700">{invoice.emirate || 'Not specified'}</td>
                          <td className="px-6 py-3 text-gray-700">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </td>
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
                  <a href="/invoices/create" className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white font-semibold py-2 px-6 rounded-xl shadow-md">Create your first invoice</a>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Sales Tab */}
              <h2 className="text-2xl font-bold text-blue-700 mb-6">Sales Report</h2>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDate">Start Date</label>
                  <input type="date" id="startDate" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDate">End Date</label>
                  <input type="date" id="endDate" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleDateFilter} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-2 px-6 rounded-xl shadow-md mr-4">Apply Filter</button>
                  <button onClick={generateSalesReport} className="bg-green-600 hover:bg-green-700 transition-colors text-white font-semibold py-2 px-6 rounded-xl shadow-md">Generate Report</button>
                </div>
              </div>
              {filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-blue-50 text-blue-700">
                        <th className="px-6 py-3 text-left font-semibold">Invoice #</th>
                        <th className="px-6 py-3 text-left font-semibold">Client</th>
                        <th className="px-6 py-3 text-left font-semibold">Subtotal</th>
                        <th className="px-6 py-3 text-left font-semibold">VAT</th>
                        <th className="px-6 py-3 text-left font-semibold">Total</th>
                        <th className="px-6 py-3 text-left font-semibold">Emirate</th>
                        <th className="px-6 py-3 text-left font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInvoices.map((invoice) => {
                        const { subtotal, vat, total } = calculateInvoiceAmounts(invoice);
                        return (
                          <tr key={invoice.id} className="hover:bg-blue-50 transition">
                            <td className="px-6 py-3 font-medium text-gray-800">{invoice.invoice_number}</td>
                            <td className="px-6 py-3 text-gray-700">{invoice.client_details?.name || invoice.client_name || 'No client name'}</td>
                            <td className="px-6 py-3 font-semibold text-gray-800">AED {subtotal.toFixed(2)}</td>
                            <td className="px-6 py-3 text-gray-700">AED {vat.toFixed(2)}</td>
                            <td className="px-6 py-3 font-semibold text-gray-800">AED {total.toFixed(2)}</td>
                            <td className="px-6 py-3 text-gray-700">{invoice.emirate || 'Not specified'}</td>
                            <td className="px-6 py-3 text-gray-700">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No invoices found for selected date range.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}