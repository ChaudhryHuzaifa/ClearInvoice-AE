// src/app/invoices/[id]/pdf/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function InvoicePDFPage() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { user } = useAuth();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/api/invoices/${id}/`);
        if (response.data.pdf_url) {
          setPdfUrl(response.data.pdf_url);
        }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">PDF Not Available</h1>
          <p className="mb-4">This invoice doesn't have a PDF generated yet.</p>
          <button 
            onClick={() => window.history.back()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Invoice PDF Viewer</h1>
        <button 
          onClick={() => window.history.back()}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
      <div className="h-full w-full">
        <iframe 
          src={pdfUrl}
          className="w-full h-full"
          frameBorder="0"
        />
      </div>
    </div>
  );
}