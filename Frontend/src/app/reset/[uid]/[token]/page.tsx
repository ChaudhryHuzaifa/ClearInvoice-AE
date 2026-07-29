"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface ResetPasswordPageProps {
  params: {
    uid: string;
    token: string;
  };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { uid, token } = params;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      await api.post(`/api/reset/${uid}/${token}/`, { password });
      setMessage("Password has been reset successfully!");
      setTimeout(() => router.push("/login"), 3000); // redirect to login
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.response?.data?.detail || "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Set New Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-md"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-md"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Reset Password
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
