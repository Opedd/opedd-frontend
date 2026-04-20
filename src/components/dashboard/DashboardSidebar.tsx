import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Library, CreditCard, ArrowUpCircle, BookOpen, ExternalLink, Mail, ShieldAlert, Scale } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo.png";
import { MobileSidebar } from "./MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Catalog", path: "/content", icon: Library },
  { title: "Licensing", path: "/licensing", icon: Scale },
  { title: "Ledger", path: "/ledger", icon: Wallet },
  { title: "Analytics", path: "/insights", icon: BarChart3 },
  { title: "Distribution", path: "/connectors", icon: Zap },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  return (
    <>
      <MobileSidebar />
      
      <aside className="hidden lg:flex w-[220px] bg-white border-r border-[#E5E7EB] flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB]">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#EEF0FD] text-[#4A26ED] font-semibold"
                    : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
          {/* Admin link removed — merged into Settings */}
        </nav>

        <div className="p-3 border-t border-[#E5E7EB] space-y-1">
          <a
            href="https://docs.opedd.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] text-sm font-medium transition-colors"
          >
            <BookOpen size={16} strokeWidth={1.5} />
            Documentation
            <ExternalLink size={12} className="ml-auto opacity-40" />
          </a>
          <a
            href="mailto:support@opedd.com"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] text-sm font-medium transition-colors"
          >
            <Mail size={16} strokeWidth={1.5} />
            Help & Support
          </a>
          <p className="text-[#9CA3AF] text-xs text-center pt-2">© 2026 Opedd</p>
        </div>
      </aside>
    </>
  );
}
