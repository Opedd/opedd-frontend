import React, { useState, useEffect, useCallback } from "react";
import {
  Bell, Loader2, AlertTriangle, CheckCheck,
  ShieldCheck, CreditCard, FileText, Info, Zap, Archive,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

function getNotificationIcon(type: string) {
  switch (type) {
    case "license.issued":
    case "license.paid":
      return <CreditCard className="h-4 w-4 text-[#4A26ED]" />;
    case "license.verified":
      return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
    case "license.revoked":
      return <FileText className="h-4 w-4 text-[#DC2626]" />;
    case "archive":
      return <Archive className="h-4 w-4 text-amber-600" />;
    case "alert":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case "system":
      return <Zap className="h-4 w-4 text-[#6B7280]" />;
    default:
      return <Info className="h-4 w-4 text-[#6B7280]" />;
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(false);
    try {
      const token = await getAccessToken();
      if (!token) { setIsLoading(false); return; }
      const res = await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        headers: { apikey: EXT_ANON_KEY, Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setNotifications(result.data.notifications ?? []);
        setUnreadCount(result.data.unread_count ?? 0);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, getAccessToken]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (notificationId: string) => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif || notif.read) return;
    // Optimistically update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const token = await getAccessToken();
      await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      });
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/get-notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mark_all_read: true }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || "Failed");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({ title: "All notifications marked as read" });
    } catch {
      toast({ title: "Failed to mark all read", variant: "destructive" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Notifications" subtitle="Your activity feed and alerts">
      <motion.div
        className="p-8 max-w-3xl w-full mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="flex items-center justify-between" variants={itemVariants}>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111827]">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-[#4A26ED] text-white border-0 hover:bg-[#4A26ED] font-medium text-xs px-2 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={isMarkingAll}
              className="border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] text-sm"
            >
              {isMarkingAll ? (
                <><Loader2 size={14} className="mr-2 animate-spin" />Marking...</>
              ) : (
                <><CheckCheck size={14} className="mr-2" />Mark all read</>
              )}
            </Button>
          )}
        </motion.div>

        {/* Error */}
        {fetchError && !isLoading && (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl border border-[#DC2626]/30 p-6 flex items-center gap-3"
          >
            <AlertTriangle size={20} className="text-[#DC2626] flex-shrink-0" />
            <p className="text-sm font-medium text-[#DC2626] flex-1">Failed to load notifications.</p>
            <button
              onClick={fetchNotifications}
              className="text-sm font-semibold text-[#4A26ED] hover:underline"
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl border border-[#E5E7EB] p-16 flex items-center justify-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-[#4A26ED]" />
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && notifications.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl border border-[#E5E7EB] p-16 text-center shadow-sm"
          >
            <Bell size={40} className="mx-auto text-[#D1D5DB] mb-4" />
            <h3 className="text-base font-semibold text-[#111827] mb-1">No notifications yet</h3>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto">
              You'll be notified here when buyers license your content, payments are processed, and more.
            </p>
          </motion.div>
        )}

        {/* Notification list */}
        {!isLoading && !fetchError && notifications.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden"
          >
            {notifications.map((notif, index) => (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={[
                  "flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-[#F9FAFB]",
                  index !== notifications.length - 1 ? "border-b border-[#F3F4F6]" : "",
                  !notif.read ? "border-l-2 border-l-[#4A26ED] bg-[#F7F8FF]" : "",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    !notif.read ? "bg-[#4A26ED]/10" : "bg-[#F3F4F6]",
                  ].join(" ")}
                >
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${!notif.read ? "text-[#111827]" : "text-[#374151]"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4A26ED] shrink-0" />
                    )}
                  </div>
                  {notif.message && (
                    <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{notif.message}</p>
                  )}
                </div>
                <span className="text-xs text-[#9CA3AF] shrink-0 mt-0.5 whitespace-nowrap">
                  {relativeTime(notif.created_at)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
