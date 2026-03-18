import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Library, CreditCard, ArrowUpCircle, BookOpen, ExternalLink, Mail, ShieldAlert, Scale } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { MobileSidebar } from "./MobileSidebar";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "alexandre.n.bridi@gmail.com";

const navItems = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Catalog", path: "/content", icon: Library },
  { title: "Licensing", path: "/licensing", icon: Scale },
  { title: "Buyers", path: "/ledger", icon: Wallet },
  { title: "Analytics", path: "/insights", icon: BarChart3 },
  { title: "Distribution", path: "/connectors", icon: Zap },
  { title: "Payments", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {/* Mobile Sidebar with Hamburger */}
      <MobileSidebar />
      
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <aside className="hidden lg:flex w-60 bg-[#040042] border-r border-white/5 flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="p-5 pb-6 border-b border-white/5">
          <img src={opeddLogo} alt="Opedd" className="h-8" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? "bg-white/10 text-[#FDFEFF]"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="font-medium text-sm">{item.title}</span>
              </NavLink>
            );
          })}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-white/[0.06]" />
              <NavLink
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  location.pathname === "/admin"
                    ? "bg-white/10 text-[#FDFEFF]"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <ShieldAlert size={20} strokeWidth={1.5} />
                <span className="font-medium text-sm">Admin</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <a
            href="https://docs.opedd.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            <BookOpen size={18} strokeWidth={1.5} />
            Documentation
            <ExternalLink size={12} className="ml-auto opacity-50" />
          </a>
          <a
            href="mailto:support@opedd.com"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            <Mail size={18} strokeWidth={1.5} />
            Help & Support
          </a>
          <NavLink
            to="/pricing"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 text-xs font-medium transition-colors"
          >
            <ArrowUpCircle size={14} />
            Upgrade plan
          </NavLink>
          <p className="text-white/30 text-xs text-center">© 2026 Opedd</p>
        </div>
      </aside>
    </>
  );
}
