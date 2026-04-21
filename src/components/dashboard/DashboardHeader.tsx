import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Settings, LogOut, ExternalLink, ChevronDown, Bell, DollarSign, Shield, RefreshCw, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
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

const defaultConfig = { icon: Bell, color: "text-oxford bg-oxford/10", dot: "bg-oxford" };

export function DashboardHeader() {
  const { user, logout, getAccessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`${EXT_SUPABASE_URL}/get-notifications?limit=10`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await res.json();
      if (result.success && result.data) {
        setNotifications(result.data.notifications || []);
        setUnreadCount(result.data.unread_count || 0);
      }
    } catch (err) {
      console.warn("[DashboardHeader] Failed to fetch notifications:", err);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("[DashboardHeader] Failed to mark read:", err);
    }
  };

  const handleMarkOneRead = async (notificationId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "mark_read", notification_id: notificationId }),
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("[DashboardHeader] Failed to mark notification read:", err);
    }
  };

  const getInitial = () => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-blue-50 bg-white sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-navy-deep/40 uppercase tracking-wider">
          Publisher Portal
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger asChild>
            <button aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} className="relative p-2 rounded-lg hover:bg-alice-gray transition-colors focus:outline-none focus:ring-2 focus:ring-oxford/20">
              <Bell size={18} className="text-navy-deep/60" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-white border-blue-50 shadow-xl rounded-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
              <h3 className="font-bold text-sm text-navy-deep">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs text-oxford hover:text-oxford-dark hover:bg-oxford/5 h-7 px-2"
                >
                  <CheckCheck size={12} className="mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = typeConfig[n.type] || defaultConfig;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.read && handleMarkOneRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-blue-50 last:border-0 transition-colors cursor-pointer hover:bg-alice-gray ${
                        !n.read ? "bg-alice-gray/60" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-navy-deep truncate">{n.title}</p>
                          {!n.read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
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

        {/* Profile Dropdown */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button aria-label="Open account menu" className="flex items-center gap-1.5 px-1 py-1 rounded-full hover:bg-alice-gray transition-colors focus:outline-none focus:ring-2 focus:ring-oxford/20 focus:ring-offset-2 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-oxford group-hover:bg-oxford-dark transition-colors">
                <span className="text-sm font-bold text-white">
                  {getInitial()}
                </span>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 group-hover:text-navy-deep transition-all duration-200 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white border-blue-50 shadow-lg z-50">
            <DropdownMenuItem asChild className="cursor-pointer text-navy-deep hover:text-navy-deep text-sm py-2.5">
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer text-navy-deep hover:text-navy-deep text-sm py-2.5">
              <a href="https://docs.opedd.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Documentation</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-blue-50" />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-2.5"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
