import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Wallet, Zap, Settings, BarChart3, Menu, X, CreditCard, BookOpen, Library } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Content", path: "/content", icon: Library },
  { title: "Transactions", path: "/ledger", icon: Wallet },
  { title: "Insights", path: "/insights", icon: BarChart3 },
];

const integrationNavItems = [
  { title: "Connectors", path: "/connectors", icon: Zap },
  { title: "Payments", path: "/payments", icon: CreditCard },
  { title: "Settings", path: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-11 h-11 bg-[#040042] rounded-xl flex items-center justify-center shadow-lg shadow-[#040042]/30 hover:scale-105 transition-transform active:scale-95"
        aria-label="Open navigation menu"
      >
        <Menu size={22} className="text-white" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-out Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-72 bg-[#040042] z-50 lg:hidden shadow-2xl flex flex-col"
          >
            {/* Header with Close Button */}
            <div className="p-5 pb-6 border-b border-white/5 flex items-center justify-between">
              <img src={opeddLogo} alt="Opedd" className="h-8" />
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Main</p>
              {mainNavItems.map((item, index) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-md transition-all",
                        active
                          ? "bg-[#0A0066] text-white"
                          : "text-[#A5B4FC] hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon size={20} strokeWidth={1.5} />
                      <span className="font-medium text-sm">{item.title}</span>
                    </NavLink>
                  </motion.div>
                );
              })}

              <div className="!my-3 border-t border-white/[0.06]" />

              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Integrations</p>
              {integrationNavItems.map((item, index) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (mainNavItems.length + index) * 0.05 + 0.1 }}
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-md transition-all",
                        active
                          ? "bg-[#0A0066] text-white"
                          : "text-[#A5B4FC] hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon size={20} strokeWidth={1.5} />
                      <span className="font-medium text-sm">{item.title}</span>
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>

            {/* Docs link */}
            <div className="px-3 pb-2">
              <a
                href="https://docs.opedd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-md text-[#A5B4FC] hover:text-white hover:bg-white/5 transition-all"
              >
                <BookOpen size={20} strokeWidth={1.5} />
                <span className="font-medium text-sm">Documentation</span>
              </a>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
              <p className="text-white/30 text-xs text-center">© 2026 Opedd</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
