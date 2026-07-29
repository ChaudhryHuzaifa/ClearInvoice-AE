"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// Helper to read cookie
function getCookie(name: string) {
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export default function PartnerSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firm_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  // Step 1: Fetch CSRF cookie on page load
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/partner/csrf/", { withCredentials: true })
      .then(() => console.log("CSRF cookie fetched"))
      .catch(err => console.error("CSRF fetch error:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      // Step 2: Get CSRF token from cookie
      const csrfToken = getCookie("csrftoken");

      // Step 3: Send POST request with CSRF token
      const response = await axios.post(
        "http://127.0.0.1:8000/api/partner/register/",
        {
          firm_name: formData.firm_name,
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true, // important for sending cookies
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken || "",
          },
        }
      );

      if (response.status === 201) {
        // Save token if backend sends one
        if (response.data?.token) {
          localStorage.setItem("token", response.data.token);
        }
        router.push("/partner-dashboard");
      }
    } catch (error: any) {
      console.error("Registration failed:", error.response?.data || error.message);
      alert("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Partner Signup</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="firm_name"
            placeholder="Firm Name"
            value={formData.firm_name}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Signup"}
          </button>
        </form>
      </div>
    </div>
  );
}
