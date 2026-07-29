// src/components/PartnerSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react";
import axios from "axios";

export default function PartnerSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch unread notifications
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get("/api/partner/notifications/", {
          headers: { "Content-Type": "application/json" },
          withCredentials: true, // if using cookie-based auth
        });
        const unread = res.data.filter((n: any) => !n.is_read).length;
        setUnreadNotifications(unread);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnread();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const menuItems = [
    { name: "Dashboard", href: "/partner-dashboard", icon: LayoutDashboard },
    { name: "Payouts", href: "/partner/payouts", icon: Wallet },
    { name: "Resources", href: "/partner/resources", icon: FileText },
  ];

  return (
    <div
      className={`h-screen bg-white shadow-lg border-r transition-all duration-300 flex flex-col 
      ${collapsed ? "w-16" : "w-56"}`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 hover:bg-gray-100 flex justify-center"
      >
        <ChevronRight
          className={`w-5 h-5 text-gray-600 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* Main nav items */}
      <nav className="flex-1 px-2 space-y-2">
        {menuItems.map(({ name, href, icon: Icon }) => (
          <Link
            key={name}
            href={href}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              pathname === href
                ? "bg-blue-100 text-blue-600"
                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <Icon className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">{name}</span>}
          </Link>
        ))}

        {/* Notifications */}
        <Link
          href="/partner/notifications"
          className={`relative flex items-center gap-3 p-2 rounded-lg transition-colors ${
            pathname === "/partner/notifications"
              ? "bg-blue-100 text-blue-600"
              : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          }`}
        >
          <Bell className="w-5 h-5" />
          {!collapsed && (
            <span className="text-sm font-medium">Notifications</span>
          )}
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-2 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5">
              {unreadNotifications}
            </span>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </nav>
    </div>
  );
}
