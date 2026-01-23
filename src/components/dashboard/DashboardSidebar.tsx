import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings } from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const navItems = [
  { title: "Assets", path: "/dashboard", icon: LayoutDashboard },
  { title: "Ledger", path: "/dashboard/ledger", icon: Wallet },
  { title: "Integrations", path: "/dashboard/integrations", icon: Zap },
  { title: "Settings", path: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#040042] border-r border-white/5 flex flex-col shrink-0 min-h-screen">
      {/* Logo */}
      <div className="p-6 pb-8">
        <img src={opeddLogo} alt="Opedd" className="h-10" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                isActive
                  ? "bg-white/10 text-soft-white border border-white/10"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
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
        <p className="text-white/40 text-xs text-center">© 2025 Opedd</p>
      </div>
    </aside>
  );
}
