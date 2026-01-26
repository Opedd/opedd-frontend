import React, { useEffect, useState } from "react";
import { Activity, Zap, DollarSign, FileText, Circle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: "mint" | "detection" | "royalty" | "license";
  title: string;
  description: string;
  time: string;
}

// Sample activities for demo mode
const sampleActivities: ActivityItem[] = [
  {
    id: "demo-1",
    type: "mint",
    title: "Asset Registered",
    description: "Your article was added to the registry",
    time: "Just now",
  },
  {
    id: "demo-2",
    type: "detection",
    title: "AI Detection",
    description: "GPT-4 accessed your content",
    time: "2 min ago",
  },
  {
    id: "demo-3",
    type: "royalty",
    title: "Royalty Earned",
    description: "$12.50 from AI licensing",
    time: "1 hour ago",
  },
  {
    id: "demo-4",
    type: "license",
    title: "License Activated",
    description: "Human consumption license sold",
    time: "3 hours ago",
  },
];

const getStatusDot = (type: ActivityItem["type"]) => {
  switch (type) {
    case "mint":
      return <Circle size={8} className="fill-[#4A26ED] text-[#4A26ED]" />;
    case "detection":
      return <Circle size={8} className="fill-[#00D5FF] text-[#00D5FF]" />;
    case "royalty":
      return <Circle size={8} className="fill-emerald-500 text-emerald-500" />;
    case "license":
      return <Circle size={8} className="fill-[#D1009A] text-[#D1009A]" />;
    default:
      return <Circle size={8} className="fill-gray-400 text-gray-400" />;
  }
};

const getIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "mint":
      return <FileText size={14} className="text-[#4A26ED]" />;
    case "detection":
      return <Zap size={14} className="text-[#00D5FF]" />;
    case "royalty":
      return <DollarSign size={14} className="text-emerald-500" />;
    case "license":
      return <Activity size={14} className="text-[#D1009A]" />;
    default:
      return <Activity size={14} />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export function ActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch recent transactions
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select(`
            id,
            created_at,
            amount,
            license_type,
            assets (
              title
            )
          `)
          .eq("publisher_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4);

        // Fetch recent assets
        const { data: assets, error: assetError } = await supabase
          .from("assets")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(2);

        if (txError || assetError) {
          console.error("Error fetching activity:", txError || assetError);
          setActivities([]);
          return;
        }

        // Combine and map to activity items
        const combinedActivities: ActivityItem[] = [];

        // Map transactions to activities
        if (transactions && transactions.length > 0) {
          transactions.forEach((tx: any) => {
            combinedActivities.push({
              id: tx.id,
              type: tx.license_type === "ai" ? "detection" : "license",
              title: tx.license_type === "ai" ? "AI License Sold" : "Human License Sold",
              description: `$${Number(tx.amount).toFixed(2)} from ${tx.assets?.title || 'content'}`,
              time: formatTimeAgo(tx.created_at),
            });
          });
        }

        // Map assets to mint activities
        if (assets && assets.length > 0) {
          assets.forEach((asset: any) => {
            combinedActivities.push({
              id: `asset-${asset.id}`,
              type: "mint",
              title: "Asset Registered",
              description: asset.title,
              time: formatTimeAgo(asset.created_at),
            });
          });
        }

        // Sort by recency and take top 4
        setActivities(combinedActivities.slice(0, 4));
      } catch (err) {
        console.error("Activity fetch error:", err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [user]);

  // Determine display mode
  const isShowingDemo = !isLoading && activities.length === 0;
  const displayActivities = isShowingDemo ? sampleActivities : activities;

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8F2FB] rounded-xl shadow-sm">
        <div className="p-4 border-b border-[#E8F2FB]">
          <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
            <Activity size={16} className="text-[#4A26ED]" />
            Latest Activity
          </h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#4A26ED]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8F2FB] rounded-xl shadow-sm">
      <div className="p-4 border-b border-[#E8F2FB]">
        <div className="flex items-center justify-between">
          <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
            <Activity size={16} className="text-[#4A26ED]" />
            Latest Activity
          </h3>
          {isShowingDemo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#040042]/40 border-[#040042]/20">
              Demo
            </Badge>
          )}
        </div>
      </div>

      {isShowingDemo && (
        <div className="px-4 py-2 bg-[#F2F9FF] border-b border-[#E8F2FB] flex items-center gap-2">
          <AlertCircle size={12} className="text-[#4A26ED]" />
          <span className="text-[10px] text-[#040042]/60">Showing sample activity</span>
        </div>
      )}

      <div className={`divide-y divide-[#E8F2FB] ${isShowingDemo ? 'opacity-75' : ''}`}>
        {displayActivities.map((activity) => {
          const isDemo = activity.id.startsWith('demo-');
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-4 hover:bg-[#F2F9FF]/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#F2F9FF] flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getStatusDot(activity.type)}
                  <p className="text-[#040042] font-medium text-sm">{activity.title}</p>
                  {isDemo && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-[#040042]/30 border-[#040042]/10">
                      Demo
                    </Badge>
                  )}
                </div>
                <p className="text-[#040042]/50 text-xs mt-0.5 truncate">{activity.description}</p>
              </div>
              <span className="text-[#040042]/30 text-xs whitespace-nowrap">{activity.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
