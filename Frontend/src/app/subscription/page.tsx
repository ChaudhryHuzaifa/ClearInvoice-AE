'use client';

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  invoices: number | "Unlimited";
  features: string[];
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // Check if we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      router.push('/login');
      return;
    }
    
    // Set the authorization header
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
    
    async function fetchPlans() {
      try {
        const res = await api.get("/api/subscriptions/plans/");
        console.log("Plans fetched:", res.data);
        setPlans(res.data.plans);
      } catch (err: any) {
        console.error("Failed to fetch plans:", err);
        
        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          router.push('/login');
        } else {
          setError("Failed to load plans. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [router]);

  const handleSelectPlan = async (planId: string) => {
    try {
      console.log("Selected plan:", planId);
      const res = await api.post("/api/subscriptions/create/", { 
        plan_id: planId,
        ref: referralCode // Pass referral code if available
      });
      console.log("Create subscription response:", res.data);

      if (planId === "FREE") {
        router.push(res.data.redirect_url || '/dashboard');
      } else if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err: any) {
      console.error("Error creating subscription:", err);
      
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        alert("Error creating subscription. Please try again.");
      }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><p>Loading plans...</p></div>;
  if (error) return <p className="text-red-600 text-center mt-8">{error}</p>;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-700">
        Choose Your Plan
      </h1>
      {plans.length === 0 && <p className="text-center">No plans available at the moment.</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-6 shadow hover:shadow-lg transition flex flex-col">
            <h2 className="text-2xl font-semibold mb-4">{plan.name}</h2>
            <p className="text-blue-700 text-3xl font-bold mb-4">
              {plan.price === 0 ? "Free" : `${plan.price} AED/month`}
            </p>
            <p className="mb-4 text-gray-600">{plan.invoices === "Unlimited" ? "Unlimited invoices" : `${plan.invoices} invoices per month`}</p>
            <ul className="mb-6 space-y-2 flex-grow">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition font-medium"
              onClick={() => handleSelectPlan(plan.id)}
            >
              {plan.price === 0 ? "Get Started Free" : "Subscribe Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}