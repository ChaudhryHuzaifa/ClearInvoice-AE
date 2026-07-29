'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  vat_rate: number | string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_amount: number | string;
  total_vat_amount: number | string;
  client_details: {
    name: string;
    email?: string;
    trn?: string;
    address?: string;
    phone?: string;
  };
  company_details: {
    name: string;
    tax_registration_number: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  line_items: InvoiceItem[];
  pdf_url?: string;
  xml_url?: string;
}

export default function InvoiceDetailPage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/api/invoices/${id}/`);
        setInvoice(response.data);
      } catch (error) {
        console.error('Failed to fetch invoice', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInvoice();
    }
  }, [id, user]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await api.delete(`/api/invoices/${id}/`);
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to delete invoice', error);
        alert('Failed to delete invoice. Please try again.');
      }
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;

    try {
      const { data } = await api.post('/api/invoices/', {
        ...invoice,
        invoice_number: `${invoice.invoice_number}-COPY`,
        line_items: invoice.line_items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
        })),
      });
      router.push(`/invoices/${data.id}`);
    } catch (error) {
      console.error('Failed to duplicate invoice', error);
      alert('Failed to duplicate invoice. Please try again.');
    }
  };

  const generatePDF = async () => {
    try {
      const response = await api.post(`/api/invoices/${id}/generate_pdf/`);
      if (response.status === 200) {
        const invoiceResponse = await api.get(`/api/invoices/${id}/`);
        setInvoice(invoiceResponse.data);
        alert('PDF generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-blue-700 font-medium">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-800 mb-4">Invoice Not Found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">Invoice {invoice.invoice_number}</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push(`/invoices/${id}/edit`)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Edit
          </button>
          <button
            onClick={handleDuplicate}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Duplicate
          </button>
          {invoice.pdf_url ? (
            <a
              href={invoice.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            >
              View PDF
            </a>
          ) : (
            <button
              onClick={generatePDF}
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            >
              Generate PDF
            </button>
          )}
          <button
            onClick={handleDelete}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6 text-blue-800">
        {/* Company & Client Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-blue-700">From</h2>
            <p className="font-medium">{invoice.company_details.name}</p>
            <p>TRN: {invoice.company_details.tax_registration_number}</p>
            {invoice.company_details.address && <p>{invoice.company_details.address}</p>}
            {invoice.company_details.email && <p>{invoice.company_details.email}</p>}
            {invoice.company_details.phone && <p>{invoice.company_details.phone}</p>}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-blue-700">To</h2>
            <p className="font-medium">{invoice.client_details.name}</p>
            {invoice.client_details.trn && <p>TRN: {invoice.client_details.trn}</p>}
            {invoice.client_details.address && <p>{invoice.client_details.address}</p>}
            {invoice.client_details.email && <p>{invoice.client_details.email}</p>}
            {invoice.client_details.phone && <p>{invoice.client_details.phone}</p>}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-blue-600">Invoice Number</p>
            <p className="font-medium">{invoice.invoice_number}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">Issue Date</p>
            <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">Due Date</p>
            <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">Status</p>
            <span
              className={`px-2 py-1 rounded text-xs ${
                invoice.status === 'PAID'
                  ? 'bg-green-100 text-green-800'
                  : invoice.status === 'SENT'
                  ? 'bg-blue-100 text-blue-800'
                  : invoice.status === 'OVERDUE'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-blue-800 border">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Unit Price</th>
                <th className="px-4 py-2 text-left">VAT Rate</th>
                <th className="px-4 py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, index) => {
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unit_price);
                const vatRate = Number(item.vat_rate);
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="border px-4 py-2">{item.description}</td>
                    <td className="border px-4 py-2">{quantity}</td>
                    <td className="border px-4 py-2">AED {unitPrice.toFixed(2)}</td>
                    <td className="border px-4 py-2">{(vatRate * 100).toFixed(2)}%</td>
                    <td className="border px-4 py-2">AED {(quantity * unitPrice * (1 + vatRate)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-blue-100 font-semibold">
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-right">Subtotal:</td>
                <td className="border px-4 py-2">AED {(Number(invoice.total_amount) - Number(invoice.total_vat_amount)).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-right">VAT:</td>
                <td className="border px-4 py-2">AED {Number(invoice.total_vat_amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border px-4 py-2 text-right">Total:</td>
                <td className="border px-4 py-2">AED {Number(invoice.total_amount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
