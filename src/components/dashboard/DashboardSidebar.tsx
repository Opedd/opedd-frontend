import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Library, CreditCard } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { MobileSidebar } from "./MobileSidebar";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Content", path: "/content", icon: Library },
  { title: "Transactions", path: "/ledger", icon: Wallet },
  { title: "Insights", path: "/insights", icon: BarChart3 },
  { title: "Connectors", path: "/connectors", icon: Zap },
  { title: "Payments", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();

  return (
    <>
      {/* Mobile Sidebar with Hamburger */}
      <MobileSidebar />
      
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <aside className="hidden lg:flex w-60 bg-[#040042] border-r border-white/5 flex-col shrink-0 min-h-screen">
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
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <p className="text-white/30 text-xs text-center">© 2026 Opedd</p>
        </div>
      </aside>
    </>
  );
}
