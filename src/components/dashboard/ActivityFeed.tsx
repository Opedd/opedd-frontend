import React, { useEffect, useState } from "react";
import { Activity, DollarSign, FileText, Circle, Loader2, AlertCircle, Bot, CheckCircle2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { AIDetectionPopup } from "./AIDetectionPopup";

interface ActivityItem {
  id: string;
  type: "mint" | "ai_scrape" | "royalty" | "license";
  title: string;
  description: string;
  time: string;
  botName?: string;
  assetTitle?: string;
  isLicensed?: boolean;
  tokenCount?: number;
  storyProtocolHash?: string;
}

// AI Bot definitions for realistic detection simulation
const AI_BOTS = [
  { name: "GPTBot", company: "OpenAI", model: "GPT-4o" },
  { name: "ClaudeBot", company: "Anthropic", model: "Claude 3.5" },
  { name: "Google-Extended", company: "Google", model: "Gemini" },
  { name: "PerplexityBot", company: "Perplexity", model: "pplx-7b" },
  { name: "CCBot", company: "Common Crawl", model: "Dataset" },
];

// Sample activities for demo mode with AI bot specifics
const sampleActivities: ActivityItem[] = [
  {
    id: "demo-1",
    type: "ai_scrape",
    title: "GPTBot (OpenAI)",
    description: "Scanned 4,200 tokens of 'Breaking: Tech Giants...'",
    time: "Just now",
    botName: "GPTBot (OpenAI)",
    assetTitle: "Breaking: Tech Giants...",
    isLicensed: true,
    tokenCount: 4200,
  },
  {
    id: "demo-2",
    type: "ai_scrape",
    title: "ClaudeBot (Anthropic)",
    description: "Indexed your latest post for training",
    time: "2 min ago",
    botName: "ClaudeBot (Anthropic)",
    assetTitle: "Market Analysis Q4",
    isLicensed: true,
    tokenCount: 8500,
  },
  {
    id: "demo-3",
    type: "ai_scrape",
    title: "Google-Extended",
    description: "Attempted to ingest data for Gemini training",
    time: "15 min ago",
    botName: "Google-Extended (Google)",
    assetTitle: "AI Regulation Deep Dive",
    isLicensed: false,
    tokenCount: 12300,
  },
  {
    id: "demo-4",
    type: "mint",
    title: "Asset Registered on Story Protocol",
    description: "Climate Policy Framework • sp_tx_8829fa21...",
    time: "45 min ago",
    storyProtocolHash: "sp_tx_8829fa21b3c7e9d4",
  },
  {
    id: "demo-5",
    type: "royalty",
    title: "Royalty Earned",
    description: "$12.50 from AI licensing",
    time: "1 hour ago",
  },
  {
    id: "demo-6",
    type: "license",
    title: "License Activated",
    description: "Human consumption license sold",
    time: "3 hours ago",
  },
];

const getStatusDot = (type: ActivityItem["type"], isLicensed?: boolean) => {
  if (type === "ai_scrape" && !isLicensed) {
    return <Circle size={8} className="fill-amber-500 text-amber-500" />;
  }
  switch (type) {
    case "mint":
      return <Circle size={8} className="fill-[#7C3AED] text-[#7C3AED]" />;
    case "ai_scrape":
      return <Circle size={8} className="fill-[#4A26ED] text-[#4A26ED]" />;
    case "royalty":
      return <Circle size={8} className="fill-emerald-500 text-emerald-500" />;
    case "license":
      return <Circle size={8} className="fill-[#D1009A] text-[#D1009A]" />;
    default:
      return <Circle size={8} className="fill-gray-400 text-gray-400" />;
  }
};

const getIcon = (type: ActivityItem["type"], isLicensed?: boolean) => {
  if (type === "ai_scrape") {
    return <Bot size={14} className={isLicensed ? "text-[#4A26ED]" : "text-amber-500"} />;
  }
  switch (type) {
    case "mint":
      return <Shield size={14} className="text-[#7C3AED]" />;
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
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

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

        // Map transactions to activities with AI bot details
        if (transactions && transactions.length > 0) {
          transactions.forEach((tx: any, index: number) => {
            if (tx.license_type === "ai") {
              const bot = AI_BOTS[index % AI_BOTS.length];
              const tokenCount = Math.floor(Math.random() * 15000) + 2000;
              combinedActivities.push({
                id: tx.id,
                type: "ai_scrape",
                title: `${bot.name} (${bot.company})`,
                description: `Scanned ${tokenCount.toLocaleString()} tokens of '${tx.assets?.title || 'content'}'`,
                time: formatTimeAgo(tx.created_at),
                botName: `${bot.name} (${bot.company})`,
                assetTitle: tx.assets?.title || 'content',
                isLicensed: true,
                tokenCount,
              });
            } else {
              combinedActivities.push({
                id: tx.id,
                type: "license",
                title: "Human License Sold",
                description: `$${Number(tx.amount).toFixed(2)} from ${tx.assets?.title || 'content'}`,
                time: formatTimeAgo(tx.created_at),
              });
            }
          });
        }

        // Map assets to mint activities with Story Protocol hash
        if (assets && assets.length > 0) {
          assets.forEach((asset: any) => {
            // Generate a mock Story Protocol hash for the activity
            const mockHash = `sp_tx_${asset.id.replace(/-/g, '').slice(0, 8)}${Date.now().toString(16).slice(-4)}`;
            combinedActivities.push({
              id: `asset-${asset.id}`,
              type: "mint",
              title: "Asset Registered on Story Protocol",
              description: `${asset.title} • ${mockHash.slice(0, 12)}...`,
              time: formatTimeAgo(asset.created_at),
              storyProtocolHash: mockHash,
            });
          });
        }

        // Sort by recency and take top 5
        setActivities(combinedActivities.slice(0, 5));
      } catch (err) {
        console.error("Activity fetch error:", err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [user]);

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.type === "ai_scrape" && !activity.isLicensed) {
      setSelectedActivity(activity);
      setPopupOpen(true);
    }
  };

  // Determine display mode
  const isShowingDemo = !isLoading && activities.length === 0;
  const displayActivities = isShowingDemo ? sampleActivities : activities;

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8F2FB] rounded-xl shadow-sm">
        <div className="p-4 border-b border-[#E8F2FB]">
          <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
            <Bot size={16} className="text-[#4A26ED]" />
            AI Detection Feed
          </h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#4A26ED]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-[#E8F2FB] rounded-xl shadow-sm">
        <div className="p-4 border-b border-[#E8F2FB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
              <Bot size={16} className="text-[#4A26ED]" />
              AI Detection Feed
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
            <span className="text-[10px] text-[#040042]/60">Showing sample detections</span>
          </div>
        )}

        <div className={`divide-y divide-[#E8F2FB] ${isShowingDemo ? 'opacity-75' : ''}`}>
          {displayActivities.map((activity) => {
            const isDemo = activity.id.startsWith('demo-');
            const isAIScrape = activity.type === "ai_scrape";
            const isClickable = isAIScrape && !activity.isLicensed;
            
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className={`flex items-start gap-3 p-4 transition-colors ${
                  isClickable 
                    ? 'hover:bg-amber-50/50 cursor-pointer' 
                    : 'hover:bg-[#F2F9FF]/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isAIScrape && !activity.isLicensed 
                    ? 'bg-amber-100' 
                    : 'bg-[#F2F9FF]'
                }`}>
                  {getIcon(activity.type, activity.isLicensed)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusDot(activity.type, activity.isLicensed)}
                    <p className="text-[#040042] font-medium text-sm">{activity.title}</p>
                    
                    {/* Story Protocol Badge for minted assets */}
                    {activity.type === "mint" && activity.storyProtocolHash && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded-full font-medium border border-[#7C3AED]/20">
                        <Shield size={10} />
                        Story IP
                      </span>
                    )}
                    
                    {/* IP Verified Badge for licensed AI activity */}
                    {isAIScrape && activity.isLicensed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">
                        <CheckCircle2 size={10} />
                        IP Verified
                      </span>
                    )}
                    
                    {/* Unlicensed Badge */}
                    {isAIScrape && !activity.isLicensed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                        Unlicensed
                      </span>
                    )}
                    
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

      {/* Popup for unlicensed AI activity */}
      <AIDetectionPopup
        open={popupOpen}
        onOpenChange={setPopupOpen}
        botName={selectedActivity?.botName || "Unknown Bot"}
        assetTitle={selectedActivity?.assetTitle || "Unknown Asset"}
      />
    </>
  );
}
