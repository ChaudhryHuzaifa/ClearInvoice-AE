// src/app/subscription/success/page.tsx
'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";

export default function SubscriptionSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    async function confirmPayment() {
      if (!sessionId) {
        setError("No session ID provided.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.post("/api/subscriptions/confirm/", { session_id: sessionId });

        if (res.data.success) {
          // Payment verified, redirect to dashboard
          router.push("/dashboard/");
        } else {
          setError(res.data.error || "Failed to verify subscription.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Something went wrong. Please contact support.");
      } finally {
        setLoading(false);
      }
    }

    confirmPayment();
  }, [sessionId, router]);

  return (
    <div className="container mx-auto p-4 text-center">
      {loading && <p className="text-blue-700 font-semibold text-lg">Verifying your subscription...</p>}
      {error && <p className="text-red-600 font-semibold text-lg">{error}</p>}
    </div>
  );
}
