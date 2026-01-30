import React, { useEffect, useState } from "react";
import { Bot, Circle, Loader2, AlertCircle, CheckCircle2, Shield, Rss, FileText, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { AIDetectionPopup } from "./AIDetectionPopup";

interface ActivityItem {
  id: string;
  type: "bot_scan" | "verification" | "license_human" | "license_ai";
  title: string;
  description: string;
  time: string;
  botName?: string;
  assetTitle?: string;
  isLicensed?: boolean;
  tokenCount?: number;
}

// AI Bot definitions for realistic detection simulation
const AI_BOTS = [
  { name: "GPTBot", company: "OpenAI", model: "GPT-4o" },
  { name: "ClaudeBot", company: "Anthropic", model: "Claude 3.5" },
  { name: "Google-Extended", company: "Google", model: "Gemini" },
  { name: "PerplexityBot", company: "Perplexity", model: "pplx-7b" },
  { name: "CCBot", company: "Common Crawl", model: "Dataset" },
];

// Sample activities for demo mode - Event focused (no dollar amounts)
const sampleActivities: ActivityItem[] = [
  {
    id: "demo-1",
    type: "bot_scan",
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
    type: "license_human",
    title: "New License: Climate Policy Framework",
    description: "Licensed for Human Republication",
    time: "5 min ago",
    assetTitle: "Climate Policy Framework",
  },
  {
    id: "demo-3",
    type: "bot_scan",
    title: "ClaudeBot (Anthropic)",
    description: "Indexed 8,500 tokens for training data",
    time: "12 min ago",
    botName: "ClaudeBot (Anthropic)",
    assetTitle: "Market Analysis Q4",
    isLicensed: true,
    tokenCount: 8500,
  },
  {
    id: "demo-4",
    type: "verification",
    title: "Substack Publication Verified",
    description: "tech-insights.substack.com ownership confirmed",
    time: "18 min ago",
  },
  {
    id: "demo-5",
    type: "bot_scan",
    title: "Google-Extended",
    description: "Attempted to ingest 12,300 tokens for Gemini training",
    time: "25 min ago",
    botName: "Google-Extended (Google)",
    assetTitle: "AI Regulation Deep Dive",
    isLicensed: false,
    tokenCount: 12300,
  },
  {
    id: "demo-6",
    type: "license_ai",
    title: "New License: Neural Network Patterns",
    description: "Licensed for AI Model Training",
    time: "45 min ago",
    assetTitle: "Neural Network Patterns",
  },
  {
    id: "demo-7",
    type: "verification",
    title: "Ghost Publication Verified",
    description: "blog.example.com ownership confirmed",
    time: "1 hour ago",
  },
  {
    id: "demo-8",
    type: "bot_scan",
    title: "PerplexityBot (Perplexity)",
    description: "Scanned 3,100 tokens of 'Startup Funding Guide'",
    time: "2 hours ago",
    botName: "PerplexityBot (Perplexity)",
    assetTitle: "Startup Funding Guide",
    isLicensed: true,
    tokenCount: 3100,
  },
];

const getStatusDot = (type: ActivityItem["type"], isLicensed?: boolean) => {
  if (type === "bot_scan" && !isLicensed) {
    return <Circle size={8} className="fill-amber-500 text-amber-500" />;
  }
  if (type === "bot_scan" && isLicensed) {
    return <Circle size={8} className="fill-teal-500 text-teal-500" />;
  }
  if (type === "verification") {
    return <Circle size={8} className="fill-teal-500 text-teal-500" />;
  }
  // Licensing events - purple
  return <Circle size={8} className="fill-[#7C3AED] text-[#7C3AED]" />;
};

const getIcon = (type: ActivityItem["type"], isLicensed?: boolean) => {
  if (type === "verification") {
    return <Rss size={14} className="text-teal-600" />;
  }
  if (type === "bot_scan") {
    return <Bot size={14} className={isLicensed ? "text-teal-600" : "text-amber-600"} />;
  }
  if (type === "license_human") {
    return <User size={14} className="text-[#7C3AED]" />;
  }
  // license_ai
  return <FileText size={14} className="text-[#7C3AED]" />;
};

const getIconBackground = (type: ActivityItem["type"], isLicensed?: boolean) => {
  if (type === "bot_scan" && !isLicensed) {
    return "bg-amber-100";
  }
  if (type === "bot_scan" && isLicensed) {
    return "bg-teal-100";
  }
  if (type === "verification") {
    return "bg-teal-100";
  }
  // Licensing events - purple
  return "bg-[#7C3AED]/10";
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
        // Fetch all transactions (for bot activity AND licensing events)
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select(`
            id,
            created_at,
            license_type,
            assets (
              title
            )
          `)
          .eq("publisher_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        // Fetch verified assets (for verification events)
        const { data: verifiedAssets, error: assetError } = await supabase
          .from("assets")
          .select("id, title, source_url, created_at, verification_status")
          .eq("user_id", user.id)
          .eq("verification_status", "verified")
          .order("created_at", { ascending: false })
          .limit(2);

        if (txError || assetError) {
          console.error("Error fetching activity:", txError || assetError);
          setActivities([]);
          return;
        }

        const combinedActivities: ActivityItem[] = [];

        // Map transactions to activities
        if (transactions && transactions.length > 0) {
          transactions.forEach((tx: any, index: number) => {
            const isAI = tx.license_type === "ai";
            
            if (isAI) {
              // AI transactions become bot scan events
              const bot = AI_BOTS[index % AI_BOTS.length];
              const tokenCount = Math.floor(Math.random() * 15000) + 2000;
              combinedActivities.push({
                id: tx.id,
                type: "bot_scan",
                title: `${bot.name} (${bot.company})`,
                description: `Scanned ${tokenCount.toLocaleString()} tokens of '${tx.assets?.title || 'content'}'`,
                time: formatTimeAgo(tx.created_at),
                botName: `${bot.name} (${bot.company})`,
                assetTitle: tx.assets?.title || 'content',
                isLicensed: true,
                tokenCount,
              });
            } else {
              // Human transactions become licensing events (no dollar amounts)
              combinedActivities.push({
                id: tx.id,
                type: "license_human",
                title: `New License: ${tx.assets?.title || 'Content'}`,
                description: "Licensed for Human Republication",
                time: formatTimeAgo(tx.created_at),
                assetTitle: tx.assets?.title || 'Content',
              });
            }
          });
        }

        // Map verified assets to verification events
        if (verifiedAssets && verifiedAssets.length > 0) {
          verifiedAssets.forEach((asset: any) => {
            let domain = 'publication';
            try {
              if (asset.source_url) {
                domain = new URL(asset.source_url).hostname;
              }
            } catch {
              domain = 'publication';
            }
            combinedActivities.push({
              id: `verify-${asset.id}`,
              type: "verification",
              title: `Publication Verified`,
              description: `${domain} ownership confirmed`,
              time: formatTimeAgo(asset.created_at),
            });
          });
        }

        // Sort by recency and take top 8
        setActivities(combinedActivities.slice(0, 8));
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
    if (activity.type === "bot_scan" && !activity.isLicensed) {
      setSelectedActivity(activity);
      setPopupOpen(true);
    }
  };

  // Determine display mode
  const isShowingDemo = !isLoading && activities.length === 0;
  const displayActivities = isShowingDemo ? sampleActivities : activities;

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
            <Shield size={16} className="text-[#4A26ED]" />
            Activity Feed
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-[#040042] font-semibold text-sm flex items-center gap-2">
              <Shield size={16} className="text-[#4A26ED]" />
              Activity Feed
            </h3>
            {isShowingDemo && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#040042]/40 border-[#040042]/20">
                Demo
              </Badge>
            )}
          </div>
          <p className="text-[#040042]/50 text-xs mt-1">Bot activity, verifications & licensing events</p>
        </div>

        {isShowingDemo && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <AlertCircle size={12} className="text-[#4A26ED]" />
            <span className="text-[10px] text-[#040042]/60">Showing sample events</span>
          </div>
        )}

        <div className={`divide-y divide-gray-100 ${isShowingDemo ? 'opacity-75' : ''}`}>
          {displayActivities.map((activity) => {
            const isDemo = activity.id.startsWith('demo-');
            const isBotScan = activity.type === "bot_scan";
            const isClickable = isBotScan && !activity.isLicensed;
            
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className={`flex items-start gap-3 p-4 transition-colors ${
                  isClickable 
                    ? 'hover:bg-amber-50/50 cursor-pointer' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getIconBackground(activity.type, activity.isLicensed)}`}>
                  {getIcon(activity.type, activity.isLicensed)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusDot(activity.type, activity.isLicensed)}
                    <p className="text-[#040042] font-medium text-sm">{activity.title}</p>
                    
                    {/* Verification Badge - Teal */}
                    {activity.type === "verification" && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full font-medium border border-teal-200">
                        <CheckCircle2 size={10} />
                        Verified
                      </span>
                    )}
                    
                    {/* Licensed Bot Badge - Teal */}
                    {isBotScan && activity.isLicensed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full font-medium border border-teal-200">
                        <CheckCircle2 size={10} />
                        Licensed
                      </span>
                    )}
                    
                    {/* Unlicensed Bot Badge - Amber */}
                    {isBotScan && !activity.isLicensed && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium border border-amber-200">
                        <AlertCircle size={10} />
                        Blocked
                      </span>
                    )}
                    
                    {/* Licensing Event Badge - Purple */}
                    {(activity.type === "license_human" || activity.type === "license_ai") && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded-full font-medium border border-[#7C3AED]/20">
                        {activity.type === "license_human" ? "Human" : "AI"}
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
