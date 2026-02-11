import React, { useState, useEffect, useCallback } from "react";
import { 
  Shield, HelpCircle, TrendingUp, FileCheck, Sparkles, User, 
  Loader2, AlertCircle, BarChart3 
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

const EXT_SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const EXT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

interface Overview {
  totalRevenue: number;
  totalLicenses: number;
  humanLicenses: number;
  aiLicenses: number;
  humanRevenue: number;
  aiRevenue: number;
  totalArticles: number;
  licensedArticles: number;
  verifiedArticles: number;
}

interface RevenueDay { date: string; revenue: number; human: number; ai: number; count: number; }
interface TopArticle { id: string; title: string; revenue: number; licenses_sold: number; }
interface ActivityItem { id: string; type: string; title: string; description: string; amount: number; created_at: string; }

const demoOverview: Overview = {
  totalRevenue: 254.85, totalLicenses: 12, humanLicenses: 8, aiLicenses: 4,
  humanRevenue: 39.92, aiRevenue: 199.96, totalArticles: 45, licensedArticles: 6, verifiedArticles: 30,
};
const demoRevenueByDay: RevenueDay[] = [
  { date: "2025-01-15", revenue: 4.99, human: 4.99, ai: 0, count: 1 },
  { date: "2025-01-17", revenue: 49.99, human: 0, ai: 49.99, count: 1 },
  { date: "2025-01-19", revenue: 54.98, human: 4.99, ai: 49.99, count: 2 },
  { date: "2025-01-21", revenue: 49.99, human: 0, ai: 49.99, count: 1 },
  { date: "2025-01-23", revenue: 94.90, human: 29.94, ai: 49.99, count: 7 },
];
const demoTopArticles: TopArticle[] = [
  { id: "1", title: "The Future of Quantum Computing", revenue: 99.98, licenses_sold: 4 },
  { id: "2", title: "Climate Policy Framework Analysis", revenue: 54.97, licenses_sold: 3 },
  { id: "3", title: "Neural Network Architecture Patterns", revenue: 49.99, licenses_sold: 2 },
];
const demoActivity: ActivityItem[] = [
  { id: "1", type: "license_ai", title: "AI License — Quantum Computing", description: "Licensed by OpenAI", amount: 49.99, created_at: "2025-01-23T14:00:00Z" },
  { id: "2", type: "license_human", title: "Republication — Climate Policy", description: "Licensed by editor@nature.com", amount: 4.99, created_at: "2025-01-22T10:00:00Z" },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } } };

export default function Insights() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setIsDemo(true); setIsLoading(false); return; }

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/get-insights`, {
        headers: { apikey: EXT_ANON_KEY, Accept: "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        console.warn("get-insights error:", result.error);
        setIsDemo(true);
      } else {
        const d = result.data;
        setOverview(d.overview);
        setRevenueByDay(d.revenueByDay || []);
        setTopArticles((d.topArticles || []).slice(0, 5));
        setRecentActivity(d.recentActivity || []);
        setIsDemo(false);
      }
    } catch (err) {
      console.error("Insights fetch error:", err);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const displayOverview = isDemo ? demoOverview : overview;
  const displayRevenue = isDemo ? demoRevenueByDay : revenueByDay;
  const displayTop = isDemo ? demoTopArticles : topArticles;
  const displayActivity = isDemo ? demoActivity : recentActivity;

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
          <DashboardHeader />
          <div className="flex-1 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-[#4A26ED]" /></div>
        </main>
      </div>
    );
  }

  const chartData = displayRevenue.map(d => ({ ...d, date: d.date.slice(5) }));

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />
        <motion.div className="p-8 pt-20 lg:pt-8 max-w-7xl w-full mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div className="flex items-center gap-3" variants={itemVariants}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-xl flex items-center justify-center">
              <BarChart3 size={24} className="text-[#4A26ED]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#040042]">Insights</h1>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-6 h-6 rounded-full bg-[#F2F9FF] flex items-center justify-center hover:bg-[#E8F2FB] transition-colors">
                        <HelpCircle size={14} className="text-[#040042]/50" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs">
                      <p>Analytics overview of your licensing activity and revenue trends.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[#040042]/60 text-sm">Licensing analytics & revenue trends</p>
            </div>
          </motion.div>

          {/* Demo Banner */}
          {isDemo && (
            <motion.div variants={itemVariants} className="bg-gradient-to-r from-[#040042]/5 to-[#4A26ED]/5 border border-[#4A26ED]/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center">
                <AlertCircle size={20} className="text-[#4A26ED]" />
              </div>
              <div>
                <p className="text-[#040042] font-semibold text-sm">Viewing Demo Data</p>
                <p className="text-[#040042]/60 text-xs">Real analytics will appear once you have licensing activity.</p>
              </div>
            </motion.div>
          )}

          {/* Metric Cards */}
          {displayOverview && (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" variants={itemVariants}>
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A26ED]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <TrendingUp size={20} className="text-white/70 mb-3" />
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight">${displayOverview.totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              {/* Total Licenses */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <FileCheck size={20} className="text-[#4A26ED] mb-3" />
                <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Total Licenses</p>
                <p className="text-3xl font-bold text-[#040042] mt-1">{displayOverview.totalLicenses}</p>
              </div>

              {/* Human vs AI */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-[#D1009A]" />
                  <span className="text-[#040042]/40">/</span>
                  <Sparkles size={16} className="text-[#4A26ED]" />
                </div>
                <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Human vs AI</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-[#D1009A]">{displayOverview.humanLicenses}</span>
                  <span className="text-[#040042]/30 font-medium">/</span>
                  <span className="text-2xl font-bold text-[#4A26ED]">{displayOverview.aiLicenses}</span>
                </div>
              </div>

              {/* Verified Articles */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <Shield size={20} className="text-emerald-600 mb-3" />
                <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Verified Articles</p>
                <p className="text-3xl font-bold text-[#040042] mt-1">
                  {displayOverview.verifiedArticles}
                  <span className="text-lg text-[#040042]/40 font-medium">/{displayOverview.totalArticles}</span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Revenue Chart */}
          {chartData.length > 0 && (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-[#040042] text-lg mb-1">Revenue Over Time</h2>
              <p className="text-sm text-[#040042]/60 mb-6">Daily breakdown by license type</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A26ED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4A26ED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHuman" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D1009A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D1009A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#040042" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#040042" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "ai" ? "AI Training" : "Human"]}
                  />
                  <Legend formatter={(v) => (v === "ai" ? "AI Training" : "Human")} />
                  <Area type="monotone" dataKey="ai" stroke="#4A26ED" fill="url(#gradAI)" strokeWidth={2} />
                  <Area type="monotone" dataKey="human" stroke="#D1009A" fill="url(#gradHuman)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Bottom Grid: Top Articles + Recent Activity */}
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
            {/* Top Articles */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <h2 className="font-bold text-[#040042] text-lg">Top Articles</h2>
                <p className="text-sm text-[#040042]/60">By revenue</p>
              </div>
              {displayTop.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200">
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Title</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider text-right">Licenses</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTop.map((a) => (
                      <TableRow key={a.id} className="border-gray-100">
                        <TableCell className="font-medium text-[#040042] text-sm max-w-[200px] truncate">{a.title}</TableCell>
                        <TableCell className="text-right text-[#040042]/70 text-sm">{a.licenses_sold}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 text-sm">${a.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-[#040042]/40 text-sm">No articles yet</div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <h2 className="font-bold text-[#040042] text-lg">Recent Activity</h2>
                <p className="text-sm text-[#040042]/60">Latest licensing events</p>
              </div>
              <div className="divide-y divide-gray-100">
                {displayActivity.length > 0 ? displayActivity.map((item) => {
                  const isAI = item.type === "license_ai";
                  return (
                    <div key={item.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isAI ? "bg-[#4A26ED]/10" : "bg-[#D1009A]/10"}`}>
                        {isAI ? <Sparkles size={16} className="text-[#4A26ED]" /> : <User size={16} className="text-[#D1009A]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#040042] truncate">{item.title}</p>
                        <p className="text-xs text-[#040042]/50 mt-0.5">{item.description}</p>
                      </div>
                      {item.amount > 0 && (
                        <span className="text-sm font-bold text-emerald-600 flex-shrink-0">+${item.amount.toFixed(2)}</span>
                      )}
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-[#040042]/40 text-sm">No activity yet</div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
