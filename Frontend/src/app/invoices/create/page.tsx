// src/app/invoices/create/page.tsx - MODERNIZED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

interface BankDetails {
  bank_name: string;
  account_number: string;
  iban: string;
}

interface ApiError {
  [key: string]: string[] | string;
}

export default function CreateInvoicePage() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_trn: '',
    client_address: '',
    client_email: '',
    client_phone: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT',
    emirate: '',
  });
  
  const [lineItems, setLineItems] = useState([
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      vat_rate: 0.05,
    } as InvoiceItem,
  ]);

  const [useCompanyBankDetails, setUseCompanyBankDetails] = useState<boolean>(true);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bank_name: '',
    account_number: '',
    iban: '',
  });
  
  const [companyDefaults, setCompanyDefaults] = useState<BankDetails | null>(null);
  const [errors, setErrors] = useState<ApiError>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  
  const router = useRouter();
  const { user } = useAuth();

  // Fetch company default bank details on component mount
  useEffect(() => {
    const fetchCompanyDefaults = async () => {
      try {
        setIsLoadingDefaults(true);
        const response = await api.get('/api/company/defaults/');
        if (response.data.bank_details) {
          setCompanyDefaults(response.data.bank_details);
          setBankDetails(response.data.bank_details);
        }
      } catch (error) {
        console.error('Failed to fetch company defaults:', error);
        setCompanyDefaults({
          bank_name: 'Emirates NBD',
          account_number: '1234 5678 9012',
          iban: 'AE00 1234 5678 9012'
        });
        setBankDetails({
          bank_name: 'Emirates NBD',
          account_number: '1234 5678 9012',
          iban: 'AE00 1234 5678 9012'
        });
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    fetchCompanyDefaults();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleBankDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetToCompanyDefaults = () => {
    if (companyDefaults) {
      setBankDetails(companyDefaults);
    }
  };

  const handleUseCompanyBankDetailsChange = (checked: boolean) => {
    setUseCompanyBankDetails(checked);
    if (checked && companyDefaults) {
      setBankDetails(companyDefaults);
    }
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItems = [...lineItems];
    
    if (name === 'quantity' || name === 'unit_price' || name === 'vat_rate') {
      if (value === '') {
        newItems[index] = {
          ...newItems[index],
          [name]: 0,
        };
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          newItems[index] = {
            ...newItems[index],
            [name]: numValue,
          };
        }
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [name]: value,
      };
    }
    
    setLineItems(newItems);
    
    if (errors.line_items) {
      const newErrors = { ...errors };
      delete newErrors.line_items;
      setErrors(newErrors);
    }
  };

  const formatNumericValue = (value: number): string => {
    return value === 0 ? '' : value.toString();
  };

  const addItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: 0.05,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newItems);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    const payload = {
      ...formData,
      line_items: lineItems,
      use_company_bank_details: useCompanyBankDetails,
      bank_details: useCompanyBankDetails ? null : {
        bank_name: bankDetails.bank_name,
        account_number: bankDetails.account_number,
        iban: bankDetails.iban,
      }
    };
    
    try {
      const response = await api.post('/api/invoices/', payload);
      
      if (response.status === 201) {
        router.push('/dashboard');
      } else {
        setErrors({ general: ['Failed to create invoice. Please try again.'] });
      }
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ general: ['Failed to create invoice. Please try again.'] });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLineTotal = (item: InvoiceItem) => {
    return item.quantity * item.unit_price;
  };

  const calculateVatAmount = (item: InvoiceItem) => {
    return calculateLineTotal(item) * item.vat_rate;
  };

  const calculateTotalWithVat = (item: InvoiceItem) => {
    return calculateLineTotal(item) + calculateVatAmount(item);
  };

  const calculateInvoiceTotal = () => {
    return lineItems.reduce((total, item) => total + calculateTotalWithVat(item), 0);
  };

  const calculateInvoiceVat = () => {
    return lineItems.reduce((total, item) => total + calculateVatAmount(item), 0);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Please log in to create an invoice.</h1>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">Create New Invoice</h1>
          <p className="text-gray-600 text-lg">Fill in the details below to create a professional invoice</p>
        </div>
        
        {errors.general && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 max-w-4xl mx-auto">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 font-medium">
                {Array.isArray(errors.general) ? errors.general.join(', ') : errors.general}
              </span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Client Information Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Client Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="client_name">
                      Client Name *
                    </label>
                    <input
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.client_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      id="client_name"
                      name="client_name"
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={handleChange}
                      placeholder="Enter client name"
                    />
                    {errors.client_name && (
                      <p className="text-red-500 text-xs italic mt-2">
                        {Array.isArray(errors.client_name) ? errors.client_name.join(', ') : errors.client_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="client_trn">
                      Client TRN
                    </label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      id="client_trn"
                      name="client_trn"
                      type="text"
                      value={formData.client_trn}
                      onChange={handleChange}
                      placeholder="Tax Registration Number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="client_email">
                      Client Email
                    </label>
                    <input
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.client_email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      id="client_email"
                      name="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={handleChange}
                      placeholder="client@example.com"
                    />
                    {errors.client_email && (
                      <p className="text-red-500 text-xs italic mt-2">
                        {Array.isArray(errors.client_email) ? errors.client_email.join(', ') : errors.client_email}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="client_phone">
                      Client Phone
                    </label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      id="client_phone"
                      name="client_phone"
                      type="tel"
                      value={formData.client_phone}
                      onChange={handleChange}
                      placeholder="+971 XX XXX XXXX"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="client_address">
                      Client Address
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      id="client_address"
                      name="client_address"
                      rows={3}
                      value={formData.client_address}
                      onChange={handleChange}
                      placeholder="Full client address..."
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Details Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Invoice Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="issue_date">
                      Issue Date *
                    </label>
                    <input
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.issue_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      id="issue_date"
                      name="issue_date"
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={handleChange}
                    />
                    {errors.issue_date && (
                      <p className="text-red-500 text-xs italic mt-2">
                        {Array.isArray(errors.issue_date) ? errors.issue_date.join(', ') : errors.issue_date}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="due_date">
                      Due Date *
                    </label>
                    <input
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.due_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      id="due_date"
                      name="due_date"
                      type="date"
                      required
                      value={formData.due_date}
                      onChange={handleChange}
                    />
                    {errors.due_date && (
                      <p className="text-red-500 text-xs italic mt-2">
                        {Array.isArray(errors.due_date) ? errors.due_date.join(', ') : errors.due_date}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="status">
                      Status
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SENT">Sent</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="emirate">
                      Emirate *
                    </label>
                    <select
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white ${
                        errors.emirate ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      id="emirate"
                      name="emirate"
                      required
                      value={formData.emirate}
                      onChange={handleChange}
                    >
                      <option value="">Select Emirate</option>
                      <option value="ABU_DHABI">Abu Dhabi</option>
                      <option value="DUBAI">Dubai</option>
                      <option value="SHARJAH">Sharjah</option>
                      <option value="AJMAN">Ajman</option>
                      <option value="UMM_AL_QAIWAIN">Umm Al Qaiwain</option>
                      <option value="RAS_AL_KHAIMAH">Ras Al Khaimah</option>
                      <option value="FUJAIRAH">Fujairah</option>
                    </select>
                    {errors.emirate && (
                      <p className="text-red-500 text-xs italic mt-2">
                        {Array.isArray(errors.emirate) ? errors.emirate.join(', ') : errors.emirate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Line Items</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>
                
                {errors.line_items && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
                    <span className="text-red-700 font-medium">
                      {Array.isArray(errors.line_items) ? errors.line_items.join(', ') : errors.line_items}
                    </span>
                  </div>
                )}
                
                <div className="space-y-6">
                  {lineItems.map((item, index) => (
                    <div key={index} className="border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-all duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description *
                          </label>
                          <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            name="description"
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(index, e)}
                            placeholder="Item description"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Quantity *
                          </label>
                          <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            name="quantity"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={formatNumericValue(item.quantity)}
                            onChange={(e) => handleItemChange(index, e)}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Unit Price *
                          </label>
                          <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            name="unit_price"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={formatNumericValue(item.unit_price)}
                            onChange={(e) => handleItemChange(index, e)}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            VAT Rate *
                          </label>
                          <input
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            name="vat_rate"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            required
                            value={formatNumericValue(item.vat_rate)}
                            onChange={(e) => handleItemChange(index, e)}
                          />
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {(item.vat_rate * 100).toFixed(1)}%
                          </div>
                        </div>
                        
                        <div className="md:col-span-1 flex items-end justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl transition-all duration-200 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={lineItems.length <= 1}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Item Summary */}
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">Line Total</div>
                          <div className="text-lg font-semibold text-blue-600">
                            AED {calculateLineTotal(item).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">VAT Amount</div>
                          <div className="text-lg font-semibold text-green-600">
                            AED {calculateVatAmount(item).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500 font-medium">Total</div>
                          <div className="text-lg font-semibold text-purple-600">
                            AED {calculateTotalWithVat(item).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Bank Details Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Bank Details</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-blue-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="use_company_bank_details"
                      name="use_company_bank_details"
                      checked={useCompanyBankDetails}
                      onChange={(e) => handleUseCompanyBankDetailsChange(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="use_company_bank_details" className="ml-3 block text-sm font-medium text-gray-700">
                      Use company bank details
                    </label>
                  </div>

                  {!useCompanyBankDetails && (
                    <div className="space-y-4 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="bank_name">
                          Bank Name *
                        </label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          id="bank_name"
                          name="bank_name"
                          type="text"
                          value={bankDetails.bank_name}
                          onChange={handleBankDetailChange}
                          required
                          placeholder="Bank name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="account_number">
                          Account Number *
                        </label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          id="account_number"
                          name="account_number"
                          type="text"
                          value={bankDetails.account_number}
                          onChange={handleBankDetailChange}
                          required
                          placeholder="Account number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="iban">
                          IBAN
                        </label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          id="iban"
                          name="iban"
                          type="text"
                          value={bankDetails.iban}
                          onChange={handleBankDetailChange}
                          placeholder="IBAN"
                        />
                      </div>
                      
                      {companyDefaults && (
                        <button
                          type="button"
                          onClick={resetToCompanyDefaults}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg"
                        >
                          Reset to Company Defaults
                        </button>
                      )}
                    </div>
                  )}

                  {/* Bank Details Preview */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
                    <h4 className="font-semibold mb-3 text-blue-100">Bank Details Preview</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong className="text-blue-100">Bank:</strong> {bankDetails.bank_name || 'Not specified'}</p>
                      <p><strong className="text-blue-100">Account:</strong> {bankDetails.account_number || 'Not specified'}</p>
                      {bankDetails.iban && <p><strong className="text-blue-100">IBAN:</strong> {bankDetails.iban}</p>}
                      {useCompanyBankDetails && companyDefaults && (
                        <p className="text-blue-200 text-xs mt-2">✓ Using company default bank details</p>
                      )}
                      {!useCompanyBankDetails && (
                        <p className="text-blue-200 text-xs mt-2">✓ Using custom bank details</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">AED {(calculateInvoiceTotal() - calculateInvoiceVat()).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">VAT Total:</span>
                    <span className="font-semibold text-green-600">AED {calculateInvoiceVat().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                    <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                    <span className="text-2xl font-bold text-blue-600">AED {calculateInvoiceTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || isLoadingDefaults}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Creating Invoice...
                      </>
                    ) : (
                      'Create Invoice'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}