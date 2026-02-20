import React, { useState, useEffect, useCallback } from "react";
import { 
  Shield, HelpCircle, TrendingUp, FileCheck, Sparkles, User, 
  Loader2, BarChart3 
} from "lucide-react";
import { decodeText } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

interface RevenueDay { date: string; revenue: number; count: number; }
interface TopArticle { id: string; title: string; revenue: number; count: number; }
interface LicenseTypeSplit { human: number; ai: number; }

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } } };

const PIE_COLORS = ["#D1009A", "#4A26ED"];

export default function Insights() {
  const { user, getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [licenseTypeSplit, setLicenseTypeSplit] = useState<LicenseTypeSplit>({ human: 0, ai: 0 });
  const [hasData, setHasData] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { setIsLoading(false); return; }

      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/get-insights`, {
        headers: { apikey: EXT_ANON_KEY, Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();

      if (res.ok && result.success && result.data) {
        const d = result.data;
        setTotalRevenue(d.total_revenue ?? 0);
        setTotalTransactions(d.total_transactions ?? 0);
        setRevenueByDay(d.revenue_by_day || []);
        setTopArticles((d.top_articles || []).slice(0, 5));
        setLicenseTypeSplit(d.license_type_split || { human: 0, ai: 0 });
        setHasData((d.total_transactions ?? 0) > 0 || (d.revenue_by_day?.length ?? 0) > 0);
      } else {
        console.warn("get-insights error:", result.error);
      }
    } catch (err) {
      console.error("Insights fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, getAccessToken]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout title="Insights">
        <div className="flex-1 flex items-center justify-center py-20"><Loader2 size={40} className="animate-spin text-[#4A26ED]" /></div>
      </DashboardLayout>
    );
  }

  const chartData = revenueByDay.map(d => ({ ...d, date: d.date.slice(5) }));
  const pieData = [
    { name: "Human", value: licenseTypeSplit.human },
    { name: "AI", value: licenseTypeSplit.ai },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout title="Insights" subtitle="Licensing analytics &amp; revenue trends">
        <motion.div className="p-8 max-w-7xl w-full mx-auto space-y-8" variants={containerVariants} initial="hidden" animate="visible">
          {/* Header removed - DashboardLayout top bar handles it */}

          {!hasData ? (
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
              <BarChart3 size={48} className="mx-auto text-slate-200 mb-4" />
              <h2 className="text-xl font-bold text-[#040042] mb-2">No transactions yet</h2>
              <p className="text-[#040042]/50 text-sm max-w-md mx-auto">
                Analytics will appear here once you start receiving licensing transactions. Head to your Registry to set up content and pricing.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Metric Cards */}
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-5" variants={itemVariants}>
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A26ED]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <TrendingUp size={20} className="text-white/70 mb-3" />
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                    <p className="text-3xl font-bold mt-1 tracking-tight">${totalRevenue.toFixed(2)}</p>
                  </div>
                </div>

                {/* Total Transactions */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <FileCheck size={20} className="text-[#4A26ED] mb-3" />
                  <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Total Transactions</p>
                  <p className="text-3xl font-bold text-[#040042] mt-1">{totalTransactions}</p>
                </div>
              </motion.div>

              {/* Revenue Chart */}
              {chartData.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-bold text-[#040042] text-lg mb-1">Revenue Over Time</h2>
                  <p className="text-sm text-[#040042]/60 mb-6">Daily revenue breakdown</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A26ED" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4A26ED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#040042" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#040042" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#4A26ED" fill="url(#gradRevenue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Bottom Grid: Top Articles + License Split */}
              <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
                {/* Top Articles */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200">
                    <h2 className="font-bold text-[#040042] text-lg">Top Articles</h2>
                    <p className="text-sm text-[#040042]/60">By revenue</p>
                  </div>
                  {topArticles.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-gray-200">
                          <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Title</TableHead>
                          <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider text-right">Licenses</TableHead>
                          <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topArticles.map((a) => (
                          <TableRow key={a.id} className="border-gray-100">
                            <TableCell className="font-medium text-[#040042] text-sm max-w-[200px] truncate">{decodeText(a.title)}</TableCell>
                            <TableCell className="text-right text-[#040042]/70 text-sm">{a.count}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 text-sm">${a.revenue.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-[#040042]/40 text-sm">No articles yet</div>
                  )}
                </div>

                {/* License Type Split */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-bold text-[#040042] text-lg mb-1">License Split</h2>
                  <p className="text-sm text-[#040042]/60 mb-4">Human vs AI licenses</p>
                  {pieData.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number, name: string) => [value, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="ml-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#D1009A]" />
                          <span className="text-sm text-[#040042]">Human: <strong>{licenseTypeSplit.human}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#4A26ED]" />
                          <span className="text-sm text-[#040042]">AI: <strong>{licenseTypeSplit.ai}</strong></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#040042]/40 text-sm">No license data yet</div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
    </DashboardLayout>
  );
}
