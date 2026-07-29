'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

// Define emirate options
const emirateOptions = [
  { value: 'ABU_DHABI', label: 'Abu Dhabi' },
  { value: 'DUBAI', label: 'Dubai' },
  { value: 'SHARJAH', label: 'Sharjah' },
  { value: 'AJMAN', label: 'Ajman' },
  { value: 'UMM_AL_QAIWAIN', label: 'Umm Al Qaiwain' },
  { value: 'RAS_AL_KHAIMAH', label: 'Ras Al Khaimah' },
  { value: 'FUJAIRAH', label: 'Fujairah' },
];

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    company_name: '',
    tax_registration_number: '',
    company_email: '',
    phone_number: '',
    emirate: 'DUBAI', // Default emirate
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is edited
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validateStep1 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
    }

    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.company_name) {
      newErrors.company_name = 'Company name is required';
    }

    return newErrors;
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const step1Errors = validateStep1();
      if (Object.keys(step1Errors).length === 0) {
        setCurrentStep(2);
        setErrors({});
      } else {
        setErrors(step1Errors);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 2) {
      const step2Errors = validateStep2();
      if (Object.keys(step2Errors).length > 0) {
        setErrors(step2Errors);
        return;
      }
    } else {
      nextStep();
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const payload: any = { ...formData };
      if (referralCode) payload.referral_code = referralCode;

      const response = await api.post('/api/auth/register/', payload);

      if (response.status === 201) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.token);
        
        // Set the authorization header for future requests
        api.defaults.headers.common['Authorization'] = `Token ${response.data.token}`;
        
        router.push('/subscription' + (referralCode ? `?ref=${referralCode}` : ''));
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          const apiErrors: {[key: string]: string[]} = err.response.data;
          const formattedErrors: {[key: string]: string} = {};
          Object.keys(apiErrors).forEach(key => {
            formattedErrors[key] = Array.isArray(apiErrors[key])
              ? apiErrors[key].join(', ')
              : String(apiErrors[key]);
          });
          setErrors(formattedErrors);
        } else {
          setErrors({ general: 'Registration failed. Please try again.' });
        }
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-2xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Join ClearInvoice
          </h2>
          <p className="text-gray-600 text-lg">
            Create your account and start managing invoices efficiently
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= 1 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 text-gray-500'
            } font-semibold transition-all duration-300`}>
              1
            </div>
            <div className={`w-16 h-1 ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'
            } transition-all duration-300`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= 2 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 text-gray-500'
            } font-semibold transition-all duration-300`}>
              2
            </div>
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-shake">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 font-medium">{errors.general}</span>
                </div>
              </div>
            )}

            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Account Information</h3>
                  <p className="text-gray-600 mt-2">Create your login credentials</p>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={`block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.email ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className={`block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="password2" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      id="password2"
                      name="password2"
                      type="password"
                      required
                      className={`block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.password2 ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Confirm your password"
                      value={formData.password2}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.password2 && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.password2}
                    </p>
                  )}
                </div>

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
                >
                  Continue to Company Details
                  <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Step 2: Company Information */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">Company Information</h3>
                  <p className="text-gray-600 mt-2">Tell us about your business</p>
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="company_name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      id="company_name"
                      name="company_name"
                      type="text"
                      required
                      className={`block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        errors.company_name ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Enter your company name"
                      value={formData.company_name}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.company_name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.company_name}
                    </p>
                  )}
                </div>

                {/* Emirate Selection */}
                <div>
                  <label htmlFor="emirate" className="block text-sm font-semibold text-gray-700 mb-2">
                    Emirate
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <select
                      id="emirate"
                      name="emirate"
                      className="block w-full pl-10 pr-4 py-4 text-gray-900 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                      value={formData.emirate}
                      onChange={handleChange}
                    >
                      {emirateOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* TRN */}
                <div>
                  <label htmlFor="tax_registration_number" className="block text-sm font-semibold text-gray-700 mb-2">
                    TRN (Tax Registration Number)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <input
                      id="tax_registration_number"
                      name="tax_registration_number"
                      type="text"
                      className="block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Tax Registration Number"
                      value={formData.tax_registration_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Company Email */}
                <div>
                  <label htmlFor="company_email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      id="company_email"
                      name="company_email"
                      type="email"
                      className="block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Company Email"
                      value={formData.company_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      className="block w-full pl-10 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Phone Number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Creating Account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Terms and Login Link */}
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-600">
              By creating an account, you agree to our{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                Privacy Policy
              </a>
            </p>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200 group">
                  Sign in here
                  <svg className="w-4 h-4 ml-1 inline transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}