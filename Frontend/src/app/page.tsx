// src/app/page.tsx
"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard,
  Users,
  BarChart3,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";


function LogoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="gA" x1="0" x2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="6" y="10" width="44" height="44" rx="10" fill="url(#gA)" opacity="0.12" />
      <path d="M16 22h28M16 30h20M16 38h24" stroke="url(#gA)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="16" r="6" fill="url(#gA)" opacity="0.95" />
    </svg>
  );
}

/* ---------- Premium CTA (glow) ---------- */
function GlowingCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative inline-flex items-center gap-3 rounded-2xl px-8 py-4 font-semibold text-white
                 bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl hover:shadow-2xl transform transition-all duration-200"
    >
      {/* glow */}
      <span
        aria-hidden
        className="absolute -inset-1 rounded-2xl blur-xl opacity-50 bg-gradient-to-r from-blue-600 to-purple-600"
        style={{ zIndex: -1 }}
      />
      {children}
      <ArrowRight className="w-5 h-5" />
    </motion.a>
  );
}

/* ---------- Feature card with gradient border ---------- */
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ translateY: -8, boxShadow: "0 20px 40px rgba(37,99,235,0.15)" }}
      transition={{ type: "spring", bounce: 0.15 }}
      className="group relative rounded-3xl p-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg"
    >
      {/* gradient border */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm" aria-hidden />
      <div className="relative">
        <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 mb-6">
          {icon}
        </div>
        <h4 className="font-bold text-xl text-gray-900 mb-3">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ---------- Pricing card ---------- */
function PricingCard({
  plan,
  price,
  features,
  highlight = false,
}: {
  plan: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ translateY: -8 }}
      transition={{ type: "spring", bounce: 0.15 }}
      className={`relative rounded-3xl p-8 ${highlight ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl" : "bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl"}`}
    >
      {highlight && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
            Most Popular
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold">{plan}</div>
      </div>

      <div className="mt-6 text-4xl font-extrabold mb-2">
        {price} <span className="text-lg font-medium">{price !== 'Custom' && '/mo'}</span>
      </div>

      {price !== 'Custom' && (
        <div className={`text-sm ${highlight ? 'text-blue-100' : 'text-gray-500'} mb-6`}>
          Billed annually
        </div>
      )}

      <ul className={`space-y-4 ${highlight ? "text-white/90" : "text-gray-700"}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-4">
            <CheckCircle2 className={`${highlight ? "text-white" : "text-blue-600"} w-5 h-5 mt-0.5 flex-shrink-0`} />
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>

      <motion.a
        href="/signup"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`mt-8 block w-full text-center px-6 py-4 rounded-2xl font-semibold transition-all duration-200 shadow-lg ${
          highlight 
            ? "bg-white text-blue-600 hover:shadow-xl" 
            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl"
        }`}
      >
        Get Started
      </motion.a>
    </motion.div>
  );
}

/* ---------- Testimonial item ---------- */
function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="rounded-3xl p-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg w-full md:w-auto"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 w-12 h-12 grid place-items-center text-white font-bold text-lg">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-bold text-gray-900">{name}</div>
          <div className="text-sm text-gray-500">{role}</div>
        </div>
      </div>
      <p className="text-gray-700 leading-relaxed">"{quote}"</p>
      <div className="flex mt-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Mini chart data ---------- */
const sampleChartData = [
  { name: "Jan", sales: 4000 },
  { name: "Feb", sales: 5200 },
  { name: "Mar", sales: 6100 },
  { name: "Apr", sales: 5300 },
  { name: "May", sales: 7500 },
  { name: "Jun", sales: 8200 },
];

/* ---------- Main Page ---------- */

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  // testimonial scroller ref
  const testimonialsRef = useRef<HTMLDivElement | null>(null);

  const scrollTestimonials = (dir: "left" | "right") => {
    const el = testimonialsRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    if (dir === "left") el.scrollBy({ left: -amount, behavior: "smooth" });
    else el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900 antialiased overflow-x-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          aria-hidden
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"
        />
        <motion.div
          aria-hidden
          className="absolute top-40 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"
        />
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-md border-b border-white/20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <motion.a 
            href="#" 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <LogoMark className="w-10 h-10" />
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ClearInvoice
            </span>
          </motion.a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
            <a href="#features" className="hover:text-blue-600 transition-colors duration-200">Features</a>
            <a href="#product" className="hover:text-blue-600 transition-colors duration-200">Product</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors duration-200">Pricing</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors duration-200">Contact</a>
            <a href="/login" className="px-5 py-2 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all duration-200">
              Sign in
            </a>
            <GlowingCTA href="/signup">Start free trial</GlowingCTA>
          </nav>

          <div className="md:hidden">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-2xl hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md"
          >
            <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col gap-4">
              <a href="#features" className="py-3 rounded-2xl hover:bg-gray-50 px-4 transition-colors duration-200">Features</a>
              <a href="#product" className="py-3 rounded-2xl hover:bg-gray-50 px-4 transition-colors duration-200">Product</a>
              <a href="#pricing" className="py-3 rounded-2xl hover:bg-gray-50 px-4 transition-colors duration-200">Pricing</a>
              <a href="#contact" className="py-3 rounded-2xl hover:bg-gray-50 px-4 transition-colors duration-200">Contact</a>
              <div className="mt-4 flex gap-3">
                <a href="/login" className="flex-1 py-3 rounded-2xl text-center border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                  Sign in
                </a>
                <a href="/signup" className="flex-1 py-3 rounded-2xl text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg">
                  Start free
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* HERO */}
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white text-sm font-medium shadow-lg"
              >
                <Star className="w-4 h-4" /> Trusted by UAE Businesses
              </motion.div>

              <h1 className="mt-8 text-5xl lg:text-6xl font-bold leading-tight">
                Smart Invoicing for{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Modern Businesses
                </span>
              </h1>

              <p className="mt-6 text-xl text-gray-600 max-w-2xl leading-relaxed">
                Automate invoicing, VAT compliance, and payment tracking with our AI-powered platform built for UAE businesses. Save time, reduce errors, and get paid faster.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <GlowingCTA href="/register">
                  Start Free Trial
                </GlowingCTA>
                <motion.a 
                  href="#features"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm px-8 py-4 border border-gray-200 font-semibold hover:shadow-lg transition-all duration-200"
                >
                  Explore Features
                </motion.a>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6 max-w-md">
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-lg border border-white/20">
                  <div className="text-2xl font-bold text-blue-600">~1.5 min</div>
                  <div className="text-sm text-gray-600 mt-1">Avg. invoice time</div>
                </div>
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-lg border border-white/20">
                  <div className="text-2xl font-bold text-purple-600">Auto</div>
                  <div className="text-sm text-gray-600 mt-1">VAT reporting</div>
                </div>
              </div>
            </motion.div>

            {/* Right - Product Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-3">
                      <LogoMark className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">ClearInvoice</div>
                      <div className="text-sm text-gray-500">Invoice preview</div>
                    </div>
                  </div>
                  <div className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                    Ready to send
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-6 border border-blue-100">
                  <div className="flex items-center justify-between text-gray-700 mb-3">
                    <div className="font-semibold">INV-2025-098</div>
                    <div className="text-2xl font-bold text-gray-900">AED 6,420</div>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">Desert Trading LLC • 01 Sep 2025</div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>AED 6,114.29</span></div>
                    <div className="flex justify-between"><span>VAT (5%)</span><span>AED 305.71</span></div>
                    <div className="flex justify-between font-bold text-gray-900 border-t pt-3"><span>Total</span><span>AED 6,420</span></div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 font-semibold shadow-lg">
                      Send Invoice
                    </button>
                    <button className="flex-1 rounded-xl border border-gray-300 bg-white py-3 font-semibold hover:bg-gray-50">
                      Preview PDF
                    </button>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="mt-8">
                  <div className="text-sm font-semibold text-gray-700 mb-4">Payments (last 6 months)</div>
                  <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sampleChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eefb" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip />
                        <Area type="monotone" dataKey="sales" stroke="#2563EB" fill="url(#colorSales)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Floating metric card */}
              <motion.div
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -right-6 -bottom-6 w-56 rounded-2xl bg-white/90 backdrop-blur-sm p-6 shadow-xl border border-white/20"
              >
                <div className="text-sm text-gray-600">Payments collected</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">AED 12,450</div>
                <div className="text-xs text-green-600 font-semibold mt-1">+12% from last week</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Comprehensive invoicing solutions designed for UAE businesses with built-in VAT compliance and automation.
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard 
                icon={<FileText className="w-6 h-6" />} 
                title="Smart Invoicing" 
                description="Create professional invoices in seconds with customizable templates and automatic numbering." 
              />
              <FeatureCard 
                icon={<ShieldCheck className="w-6 h-6" />} 
                title="VAT Compliance" 
                description="FTA-ready invoices with automatic VAT calculations and export-ready reports for easy filing." 
              />
              <FeatureCard 
                icon={<Zap className="w-6 h-6" />} 
                title="Automation" 
                description="Auto-send invoices, payment reminders, and reconciliation workflows to save you time." 
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6" />} 
                title="Analytics" 
                description="Track payments, monitor cash flow, and get insights into your business performance." 
              />
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE */}
        <section id="product" className="py-20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 mb-6">Powerful Dashboard</h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Get a complete overview of your invoicing operations with our intuitive dashboard. Track payments, manage clients, and generate VAT reports all in one place.
              </p>
              <ul className="space-y-4 text-gray-700 mb-8">
                <li className="flex items-center gap-4"><CheckCircle2 className="w-5 h-5 text-blue-600" /> Real-time payment tracking</li>
                <li className="flex items-center gap-4"><CheckCircle2 className="w-5 h-5 text-blue-600" /> Client management portal</li>
                <li className="flex items-center gap-4"><CheckCircle2 className="w-5 h-5 text-blue-600" /> Automated VAT reporting</li>
                <li className="flex items-center gap-4"><CheckCircle2 className="w-5 h-5 text-blue-600" /> Multi-user access controls</li>
              </ul>
              <GlowingCTA href="/register">Try Dashboard Free</GlowingCTA>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <div className="text-blue-100">Total Revenue</div>
                    <div className="text-3xl font-bold">AED 84,620</div>
                  </div>
                  <div className="text-green-300 font-semibold">+12% MoM</div>
                </div>
                <div className="h-48 bg-white/10 rounded-2xl flex items-center justify-center">
                  <div className="text-white/70">Revenue Chart Visualization</div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">24</div>
                    <div className="text-blue-200 text-sm">Invoices</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">18</div>
                    <div className="text-blue-200 text-sm">Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">6</div>
                    <div className="text-blue-200 text-sm">Pending</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h3 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h3>
              <p className="text-xl text-gray-600">Choose the perfect plan for your business needs</p>
              
              {/* Billing Toggle */}
              <div className="mt-8 flex justify-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200 shadow-lg">
                  <button
                    onClick={() => setBilling("monthly")}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      billing === "monthly" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" : "text-gray-700"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBilling("yearly")}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      billing === "yearly" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" : "text-gray-700"
                    }`}
                  >
                    Yearly <span className="text-sm opacity-90">(Save 20%)</span>
                  </button>
                </div>
              </div>
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-3">
              <PricingCard 
                plan="Starter" 
                price={billing === "monthly" ? "99 AED" : "79 AED"} 
                features={["Up to 100 invoices/month", "Basic VAT reporting", "Email support", "1 user account"]} 
              />
              <PricingCard 
                plan="Professional" 
                price={billing === "monthly" ? "249 AED" : "199 AED"} 
                features={["Unlimited invoices", "Advanced VAT analytics", "Priority support", "5 user accounts", "Custom branding"]} 
                highlight 
              />
              <PricingCard 
                plan="Enterprise" 
                price="Custom" 
                features={["Unlimited everything", "Dedicated account manager", "SLA guarantee", "Custom integrations", "Onboarding support"]} 
              />
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h3 className="text-4xl font-bold text-gray-900 mb-4">Loved by UAE Businesses</h3>
              <p className="text-xl text-gray-600">See what our customers have to say</p>
            </motion.div>

            <div className="relative">
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden lg:block z-10">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scrollTestimonials("left")} 
                  className="p-4 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </motion.button>
              </div>

              <div className="overflow-x-auto scrollbar-hide scroll-smooth" ref={testimonialsRef}>
                <div className="flex gap-8 pb-4">
                  <div className="min-w-[320px] lg:min-w-[400px]">
                    <TestimonialCard 
                      quote="ClearInvoice transformed our invoicing process. What used to take hours now takes minutes, and the VAT reporting is a lifesaver during tax season." 
                      name="Aisha Al Mansoori" 
                      role="Finance Director, Oasis Retail" 
                    />
                  </div>
                  <div className="min-w-[320px] lg:min-w-[400px]">
                    <TestimonialCard 
                      quote="The automation features have helped us get paid faster. Payment reminders and tracking have improved our cash flow significantly." 
                      name="Rashid Al Hashmi" 
                      role="Founder, TechGulf Solutions" 
                    />
                  </div>
                  <div className="min-w-[320px] lg:min-w-[400px]">
                    <TestimonialCard 
                      quote="As a small business owner, ClearInvoice gives me peace of mind knowing my invoicing and VAT compliance are handled professionally." 
                      name="Fatima Al Zarooni" 
                      role="Owner, Desert Blooms" 
                    />
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-10">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => scrollTestimonials("right")} 
                  className="p-4 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section id="contact" className="py-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Transform Your Invoicing?
              </h3>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Join thousands of UAE businesses that trust ClearInvoice for their invoicing and VAT compliance needs.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <motion.a
                  href="/register"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-2xl bg-white px-8 py-4 text-blue-600 font-bold shadow-2xl hover:shadow-3xl transition-all duration-200"
                >
                  Start Free Trial
                </motion.a>
                <motion.a
                  href="/contact"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-2xl border border-white/30 px-8 py-4 text-white font-bold hover:bg-white/10 transition-all duration-200"
                >
                  Book a Demo
                </motion.a>
              </div>

              <motion.div
                className="mt-12 mx-auto h-1 w-32 rounded-full bg-white/30"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <LogoMark className="w-8 h-8" />
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ClearInvoice
                </div>
              </div>
              
              <div className="flex gap-8 text-sm text-gray-600">
                <a href="#features" className="hover:text-blue-600 transition-colors duration-200">Features</a>
                <a href="#pricing" className="hover:text-blue-600 transition-colors duration-200">Pricing</a>
                <a href="/privacy" className="hover:text-blue-600 transition-colors duration-200">Privacy</a>
                <a href="/terms" className="hover:text-blue-600 transition-colors duration-200">Terms</a>
              </div>
              
              <div className="text-sm text-gray-500">
                © {new Date().getFullYear()} ClearInvoice. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </main>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}