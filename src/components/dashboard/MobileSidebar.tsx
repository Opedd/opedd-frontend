import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Menu, X, CreditCard, BookOpen, Library, ShieldAlert, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import opeddLogo from "@/assets/opedd-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "alexandre.n.bridi@gmail.com";
const mainNavItems = [
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Catalog", path: "/content", icon: Library },
  { title: "Licensing", path: "/licensing", icon: Scale },
  { title: "Buyers", path: "/ledger", icon: Wallet },
  { title: "Analytics", path: "/insights", icon: BarChart3 },
];

const integrationNavItems = [
  { title: "Distribution", path: "/connectors", icon: Zap },
  { title: "Billing", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-center shadow-sm"
        aria-label="Open navigation menu"
      >
        <Menu size={18} className="text-[#111827]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-[#E5E7EB] z-50 lg:hidden shadow-xl flex flex-col"
          >
            <div className="h-14 flex items-center justify-between px-5 border-b border-[#E5E7EB]">
              <img src={opeddLogo} alt="Opedd" className="h-7" />
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center"
                aria-label="Close navigation menu"
              >
                <X size={16} className="text-[#6B7280]" />
              </button>
            </div>

            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {mainNavItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-[#EEF0FD] text-[#4A26ED] font-semibold"
                        : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}

              <div className="my-2 mx-3 border-t border-[#E5E7EB]" />

              {integrationNavItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-[#EEF0FD] text-[#4A26ED] font-semibold"
                        : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}

              {isAdmin && (
                <>
                  <div className="my-2 mx-3 border-t border-[#E5E7EB]" />
                  <NavLink
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium transition-colors",
                      isActive("/admin")
                        ? "bg-[#EEF0FD] text-[#4A26ED] font-semibold"
                        : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    )}
                  >
                    <ShieldAlert size={16} strokeWidth={1.5} />
                    <span>Admin</span>
                  </NavLink>
                </>
              )}
            </nav>

            <div className="px-3 pb-2">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
              >
                <BookOpen size={16} strokeWidth={1.5} />
                <span>Documentation</span>
              </a>
            </div>

            <div className="p-3 border-t border-[#E5E7EB]">
              <p className="text-[#9CA3AF] text-xs text-center">© 2026 Opedd</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
