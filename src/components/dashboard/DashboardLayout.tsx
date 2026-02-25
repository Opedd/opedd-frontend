import React from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  ExternalLink,
  ChevronDown,
  CheckCheck,
  DollarSign,
  Shield,
  RefreshCw,
  Menu,
  X,
  FileText,
  CreditCard,
  Zap,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useState, useEffect, useCallback } from "react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type PlanType = "free" | "pro" | "enterprise";
const planBadgeStyles: Record<PlanType, { bg: string; text: string; label: string }> = {
  free: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "Free" },
  pro: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", label: "Pro" },
  enterprise: { bg: "bg-[#E0E7FF]", text: "text-[#3730A3]", label: "Enterprise" },
};

const mainNavItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Content", path: "/content", icon: FileText },
  { title: "Transactions", path: "/ledger", icon: Wallet },
  { title: "Insights", path: "/insights", icon: BarChart3 },
];

const integrationNavItems = [
  { title: "Connectors", path: "/connectors", icon: Zap },
  { title: "Payments", path: "/payments", icon: CreditCard },
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
  license_sold: { icon: DollarSign, color: "text-emerald-600 bg-emerald-100", dot: "bg-emerald-500" },
  source_verified: { icon: Shield, color: "text-blue-600 bg-blue-100", dot: "bg-blue-500" },
  sync_complete: { icon: RefreshCw, color: "text-slate-500 bg-slate-100", dot: "bg-slate-400" },
};
const defaultConfig = { icon: Bell, color: "text-[#4A26ED] bg-[#4A26ED]/10", dot: "bg-[#4A26ED]" };

interface DashboardLayoutProps {
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
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [publisherPlan, setPublisherPlan] = useState<PlanType | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/get-notifications?limit=10`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unread_count || 0);
      }
    } catch (err) {
      console.warn("[DashboardLayout] Notifications fetch failed:", err);
    }
  }, [getAccessToken]);

  const fetchPlan = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const plan = (result.data.publisher || result.data)?.plan;
        if (plan && (plan === "free" || plan === "pro" || plan === "enterprise")) {
          setPublisherPlan(plan);
        }
      }
    } catch (err) {
      console.warn("[DashboardLayout] Plan fetch failed:", err);
    }
  }, [getAccessToken]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleMarkAllRead = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch(`${EXT_SUPABASE_URL}/functions/v1/get-notifications`, {
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
      await fetch(`${EXT_SUPABASE_URL}/functions/v1/get-notifications`, {
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
    if (path === "/content") return location.pathname === "/content";
    return location.pathname === path;
  };

  const SidebarNav = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link to="/dashboard">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Main</p>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#0A0066] text-white"
                  : "text-[#A5B4FC] hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              {item.title}
            </NavLink>
          );
        })}

        {/* Divider */}
        <div className="!my-3 border-t border-white/[0.06]" />

        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">Integrations</p>
        {integrationNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.title}
              to={item.path}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#0A0066] text-white"
                  : "text-[#A5B4FC] hover:text-white hover:bg-white/[0.04]"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-2">
        {/* Docs link */}
        <a
          href="https://docs.opedd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#A5B4FC] hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <BookOpen size={18} strokeWidth={1.5} />
          Documentation
        </a>
      </div>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-white/[0.04] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#4A26ED] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{getInitial()}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-white truncate">{displayName}</p>
                  {publisherPlan && (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide", planBadgeStyles[publisherPlan].bg, planBadgeStyles[publisherPlan].text)}>
                      {planBadgeStyles[publisherPlan].label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
              </div>
              <ChevronDown size={14} className="text-white/30 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 bg-white border-[#E5E5E5] shadow-lg z-50">
            <DropdownMenuItem asChild className="cursor-pointer text-[13px] py-2">
              <Link to="/settings"><Settings className="mr-2 h-4 w-4" />Account Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E5E5E5]" />
            <DropdownMenuItem className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-[13px] py-2" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3.5 left-4 z-50 lg:hidden w-10 h-10 bg-[#040042] rounded-lg flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-white" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
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
            className="fixed inset-y-0 left-0 w-[260px] bg-[#040042] z-50 lg:hidden flex flex-col"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-md bg-white/10 flex items-center justify-center"
            >
              <X size={16} className="text-white" />
            </button>
            <SidebarNav onItemClick={() => setMobileOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[240px] bg-[#040042] flex-col shrink-0 h-full overflow-y-auto">
        <SidebarNav />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex items-center justify-between px-6 border-b border-[#E5E5E5] bg-white sticky top-0 z-20">
          {/* Page title */}
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <h1 className="text-sm font-semibold text-[#111]">{title}</h1>
            {subtitle && (
              <>
                <span className="text-[#D4D4D4]">/</span>
                <span className="text-sm text-[#737373]">{subtitle}</span>
              </>
            )}
          </div>

          {/* Right side — actions + notification bell */}
          <div className="flex items-center gap-2">
            {headerActions}
            <Popover open={bellOpen} onOpenChange={setBellOpen}>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-md hover:bg-[#F5F5F5] transition-colors">
                  <Bell size={16} className="text-[#737373]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 bg-white border-[#E5E5E5] shadow-xl rounded-lg z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
                  <h3 className="font-semibold text-sm text-[#111]">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs text-[#4A26ED] h-7 px-2">
                      <CheckCheck size={12} className="mr-1" />Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={24} className="mx-auto text-[#D4D4D4] mb-2" />
                      <p className="text-sm text-[#A3A3A3]">No notifications yet</p>
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
                            "flex items-start gap-3 px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] transition-colors",
                            !n.read && "bg-[#F5F5FF]"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", cfg.color)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#111] truncate">{n.title}</p>
                              {!n.read && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
                            </div>
                            <p className="text-xs text-[#737373] mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-[#A3A3A3] mt-1">
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
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
