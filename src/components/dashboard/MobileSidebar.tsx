import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Menu, X, CreditCard, BookOpen, Library, ShieldAlert, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import opeddLogo from "@/assets/opedd-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const mainNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Catalog", path: "/content", icon: Library },
  { title: "Licensing", path: "/licensing", icon: Scale },
  { title: "Ledger", path: "/ledger", icon: Wallet },
  { title: "Analytics", path: "/insights", icon: BarChart3 },
];

const integrationNavItems = [
  { title: "Distribution", path: "/distribution", icon: Zap },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm"
        aria-label="Open navigation menu"
      >
        <Menu size={18} className="text-gray-900" />
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
            className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-gray-200 z-50 lg:hidden shadow-xl flex flex-col"
          >
            <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200">
              <img src={opeddLogo} alt="Opedd" className="h-7" />
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                aria-label="Close navigation menu"
              >
                <X size={16} className="text-gray-500" />
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
                        ? "bg-oxford-light text-oxford font-semibold"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}

              <div className="my-2 mx-3 border-t border-gray-200" />

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
                        ? "bg-oxford-light text-oxford font-semibold"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}

              {/* Admin link removed — merged into Settings */}
            </nav>

            <div className="px-3 pb-2">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <BookOpen size={16} strokeWidth={1.5} />
                <span>Documentation</span>
              </a>
            </div>

            <div className="p-3 border-t border-gray-200">
              <p className="text-gray-400 text-xs text-center">© 2026 Opedd</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
