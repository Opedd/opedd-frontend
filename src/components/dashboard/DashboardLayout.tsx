import React from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Wallet, BarChart3, Settings, LogOut, Bell,
  ExternalLink, ChevronDown, CheckCheck, DollarSign, Shield,
  RefreshCw, Menu, X, FileText, Zap, BookOpen, Scale, ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import opeddLogo from "@/assets/opedd-logo.png";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type PlanType = "free" | "pro" | "enterprise";
const planBadgeStyles: Record<PlanType, { classes: string; label: string }> = {
  free: { classes: "bg-[#F3F4F6] text-[#6B7280]", label: "Free" },
  pro: { classes: "bg-[#EEF0FD] text-[#4A26ED]", label: "Pro" },
  enterprise: { classes: "bg-[#FFFBEB] text-[#D97706]", label: "Enterprise" },
};

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Catalog", path: "/content", icon: FileText },
  { title: "Licensing", path: "/licensing", icon: Scale },
  { title: "Ledger", path: "/ledger", icon: Wallet },
  { title: "Analytics", path: "/insights", icon: BarChart3 },
  { title: "Distribution", path: "/connectors", icon: Zap },
  { title: "Settings", path: "/settings", icon: Settings },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; dot: string }> = {
  license_sold: { icon: DollarSign, color: "text-emerald-600 bg-emerald-50", dot: "bg-emerald-500" },
  source_verified: { icon: Shield, color: "text-blue-600 bg-blue-50", dot: "bg-blue-500" },
  sync_complete: { icon: RefreshCw, color: "text-[#6B7280] bg-[#F3F4F6]", dot: "bg-[#9CA3AF]" },
};
const defaultConfig = { icon: Bell, color: "text-[#4A26ED] bg-[#EEF0FD]", dot: "bg-[#4A26ED]" };

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, headerActions }: DashboardLayoutProps) {
  const { user, logout, getAccessToken } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [publisherPlan, setPublisherPlan] = useState<PlanType | null>(
    () => (sessionStorage.getItem("opedd_plan") as PlanType | null)
  );
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(
    () => {
      const cached = sessionStorage.getItem("opedd_trial_days");
      return cached !== null ? Number(cached) : null;
    }
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) { setNotificationsLoading(false); return; }
      const res = await fetch(`${EXT_SUPABASE_URL}/get-notifications?limit=10`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unread_count || 0);
      }
    } catch (err) {
      console.warn("[DashboardLayout] Notifications fetch failed:", err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [getAccessToken]);

  const fetchPlan = useCallback(async () => {
    try {
      if (!user) return;
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const plan = result.data.plan;
        if (plan && ["free", "pro", "enterprise"].includes(plan)) {
          setPublisherPlan(plan as PlanType);
          sessionStorage.setItem("opedd_plan", plan);
        }
        if (result.data.trial_active && typeof result.data.trial_days_remaining === "number") {
          setTrialDaysRemaining(result.data.trial_days_remaining);
          sessionStorage.setItem("opedd_trial_days", String(result.data.trial_days_remaining));
        } else {
          sessionStorage.removeItem("opedd_trial_days");
        }
      }
    } catch (err) {
      console.warn("[DashboardLayout] Plan fetch failed:", err);
    }
  }, [user, getAccessToken]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleMarkAllRead = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("[DashboardLayout] Mark read failed:", err);
    }
  };

  const handleMarkOneRead = async (notificationId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "mark_read", notification_id: notificationId }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("[DashboardLayout] Mark one read failed:", err);
    }
  };

  const getInitial = () => user?.email?.charAt(0).toUpperCase() || "U";
  const displayName = user?.email?.split("@")[0] || "Publisher";

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname === path;
  };

  const SidebarNav = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB]">
        <Link to="/dashboard">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[#EEF0FD] text-[#4A26ED] font-semibold"
                  : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {item.title}
            </NavLink>
          );
        })}
        {/* Admin link removed — merged into Settings */}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-2">
        <a
          href="https://docs.opedd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 h-9 px-3 mx-1 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
        >
          <BookOpen size={16} strokeWidth={1.5} />
          Docs
        </a>
      </div>

      {/* User section */}
      <div className="px-3 py-3 border-t border-[#E5E7EB]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-[#F3F4F6] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#4A26ED] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{getInitial()}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#111827] truncate">{displayName}</p>
                  {publisherPlan ? (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0", planBadgeStyles[publisherPlan].classes)}>
                      {planBadgeStyles[publisherPlan].label}
                    </span>
                  ) : (
                    <span className="w-8 h-4 bg-[#F3F4F6] rounded-full animate-pulse shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[#9CA3AF] truncate">{user?.email}</p>
              </div>
              <ChevronDown size={14} className="text-[#9CA3AF] flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 bg-white border-[#E5E7EB] shadow-lg z-50">
            <DropdownMenuItem asChild className="cursor-pointer text-sm py-2">
              <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Account Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E5E7EB]" />
            <DropdownMenuItem className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-2" onClick={() => { sessionStorage.removeItem("opedd_plan"); sessionStorage.removeItem("opedd_trial_days"); sessionStorage.removeItem("opedd_trial_dismissed"); logout(); }}>
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-center shadow-sm"
        aria-label="Open menu"
      >
        <Menu size={18} className="text-[#111827]" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-[260px] bg-white border-r border-[#E5E7EB] z-50 lg:hidden flex flex-col"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center"
            >
              <X size={16} className="text-[#6B7280]" />
            </button>
            <SidebarNav onItemClick={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[220px] bg-white border-r border-[#E5E7EB] flex-col shrink-0 h-full overflow-y-auto">
        <SidebarNav />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#E5E7EB] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <h1 className="text-[15px] font-semibold text-[#111827]">{title}</h1>
            {subtitle && (
              <>
                <span className="text-[#D1D5DB]">/</span>
                <span className="text-sm text-[#6B7280]">{subtitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            <Popover open={bellOpen} onOpenChange={setBellOpen}>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                  <Bell size={16} className={cn("text-[#6B7280] transition-opacity", notificationsLoading && "animate-pulse opacity-40")} />
                  {!notificationsLoading && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444]" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 bg-white border-[#E5E7EB] shadow-xl rounded-xl z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                  <h3 className="font-semibold text-sm text-[#111827]">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs text-[#4A26ED] h-7 px-2">
                      <CheckCheck size={12} className="mr-1" />Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={24} className="mx-auto text-[#D1D5DB] mb-2" />
                      <p className="text-sm text-[#9CA3AF]">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const cfg = typeConfig[n.type] || defaultConfig;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && handleMarkOneRead(n.id)}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-[#F9FAFB] transition-colors",
                            !n.read && "bg-[#EEF0FD]/50"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.color)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#111827] truncate">{n.title}</p>
                              {!n.read && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
                            </div>
                            <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-[#9CA3AF] mt-1">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-[#4A26ED] flex items-center justify-center hover:ring-2 hover:ring-[#4A26ED]/20 transition-all">
                  <span className="text-xs font-bold text-white">{getInitial()}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-[#E5E7EB] shadow-lg z-50">
                <DropdownMenuItem asChild className="cursor-pointer text-sm py-2">
                  <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E5E7EB]" />
                <DropdownMenuItem className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-2" onClick={() => { sessionStorage.removeItem("opedd_plan"); sessionStorage.removeItem("opedd_trial_days"); sessionStorage.removeItem("opedd_trial_dismissed"); logout(); }}>
                  <LogOut className="mr-2 h-4 w-4" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Trial banner — shown to free plan publishers during their trial window */}
        {publisherPlan === "free" && trialDaysRemaining !== null && trialDaysRemaining > 0 && !sessionStorage.getItem("opedd_trial_dismissed") && (() => {
          const urgent = trialDaysRemaining <= 7;
          return (
            <div className={cn(
              "shrink-0 px-4 py-2.5 flex items-center justify-between gap-4 border-b",
              urgent
                ? "bg-[#FEF3C7] border-[#FDE68A]"
                : "bg-[#EEF0FD] border-[#E0E2F0]"
            )}>
              <p className={cn("text-xs font-medium flex-1", urgent ? "text-[#92400E]" : "text-[#4A26ED]")}>
                <span className="font-bold">{trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left on your free trial</span>
                {" "}— import unlimited articles and explore all features.{urgent ? " Upgrade now to keep full access." : ""}
              </p>
              <NavLink
                to="/settings?tab=billing"
                className={cn(
                  "shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap border",
                  urgent
                    ? "border-[#D97706] text-[#92400E] hover:bg-[#FDE68A]"
                    : "border-[#4A26ED]/20 text-[#4A26ED] hover:bg-[#4A26ED]/5"
                )}
              >
                Upgrade now
              </NavLink>
              <button
                onClick={() => { sessionStorage.setItem("opedd_trial_dismissed", "1"); setTrialDaysRemaining(null); }}
                className={cn("shrink-0 p-1 rounded-md transition-colors", urgent ? "text-[#92400E]/50 hover:text-[#92400E] hover:bg-[#FDE68A]" : "text-[#4A26ED]/40 hover:text-[#4A26ED] hover:bg-[#4A26ED]/5")}
                aria-label="Dismiss trial banner"
              >
                <X size={14} />
              </button>
            </div>
          );
        })()}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in fade-in duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
