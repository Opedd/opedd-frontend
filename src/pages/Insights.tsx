import React, { useState, useEffect, useCallback } from "react";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  TrendingUp, FileCheck, Sparkles, User, Loader2, BarChart3, AlertTriangle, ArrowUp, ArrowDown,
} from "lucide-react";
import { decodeText } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUSD } from "@/lib/formatNumber";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface RevenueDay { date: string; revenue: number; count: number; }
interface TopArticle { id: string; title: string; revenue: number; count: number; }
interface LicenseTypeSplit { human: number; ai: number; }
interface PeriodComparison {
  previousRevenue: number;
  previousLicenses: number;
  percentChangeRevenue: number;
  percentChangeLicenses: number;
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } } };
const PIE_COLORS = ["#D1009A", "#4A26ED"];

export default function Insights() {
  useDocumentTitle("Analytics — Opedd");
  const { user, getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
  const [licenseTypeSplit, setLicenseTypeSplit] = useState<LicenseTypeSplit>({ human: 0, ai: 0 });
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null);
  const [hasData, setHasData] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(false);
    try {
      const token = await getAccessToken();
      if (!token) { setIsLoading(false); return; }
      const res = await fetch(`${EXT_SUPABASE_URL}/get-insights`, {
        headers: { apikey: EXT_ANON_KEY, Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        const d = result.data;
        // Prefer primary shape (overview.*) with fallback to flat aliases for older builds
        const totalRev = d.overview?.totalRevenue ?? d.total_revenue ?? 0;
        const totalTx = d.overview?.totalLicenses ?? d.total_transactions ?? 0;
        const revDay = d.revenueByDay ?? d.revenue_by_day ?? [];
        const topArts = (d.topArticles ?? d.top_articles ?? []).map((a: { licenses_sold?: number; count?: number; id: string; title: string; revenue: number }) => ({
          id: a.id,
          title: a.title,
          revenue: a.revenue,
          count: a.licenses_sold ?? a.count ?? 0,
        }));
        const split = d.license_type_split ?? {
          human: d.overview?.humanLicenses ?? 0,
          ai: d.overview?.aiLicenses ?? 0,
        };
        const period = d.periodComparison ?? d.period_comparison ?? null;

        setTotalRevenue(totalRev);
        setTotalTransactions(totalTx);
        setRevenueByDay(revDay);
        setTopArticles(topArts.slice(0, 5));
        setLicenseTypeSplit(split);
        setPeriodComparison(period);
        setHasData(totalTx > 0 || revDay.length > 0);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.error("Insights fetch error:", err);
      setFetchError(true);
    } finally { setIsLoading(false); }
  }, [user, getAccessToken]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Licensing analytics &amp; revenue trends">
        <SEO title="Analytics — Opedd" path="/insights" noindex />
        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Metric card skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 min-h-[120px] shadow-card">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="w-24 h-3 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="w-32 h-7 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 min-h-[380px]">
            <div className="w-40 h-5 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="w-48 h-3 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="w-full h-[300px] bg-gray-100 rounded-lg animate-pulse" />
          </div>
          {/* Bottom row skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden min-h-[280px]">
              <div className="p-5 border-b border-gray-200">
                <div className="w-28 h-5 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-gray-100">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" style={{ maxWidth: `${60 + (i % 3) * 10}%` }} />
                    <div className="w-12 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6 min-h-[280px]">
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="w-36 h-3 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="flex items-center justify-center gap-6">
                <div className="w-[160px] h-[160px] bg-gray-100 rounded-full animate-pulse" />
                <div className="space-y-3">
                  <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const chartData = revenueByDay.map(d => ({ ...d, date: d.date.slice(5) }));
  const pieData = [
    { name: "Human", value: licenseTypeSplit.human },
    { name: "AI", value: licenseTypeSplit.ai },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout title="Analytics" subtitle="Licensing analytics &amp; revenue trends">
      <SEO title="Analytics — Opedd" path="/insights" noindex />
      <motion.div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6" variants={containerVariants} initial="hidden" animate="visible">

        {/* Error state */}
        {fetchError && (
          <div className="bg-white rounded-xl border border-red-600/30 p-6 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-600 flex-1">Failed to load analytics.</p>
            <button onClick={fetchInsights} className="text-sm font-semibold text-oxford hover:underline">Try again</button>
          </div>
        )}

        {!fetchError && !hasData ? (
          <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-card">
            <BarChart3 size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No transactions yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Analytics will appear here once you start receiving licensing transactions.</p>
          </motion.div>
        ) : !fetchError && (
          <>
            {(totalRevenue > 0 || totalTransactions > 0) && (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={itemVariants}>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card min-h-[120px]">
                  <TrendingUp size={18} className="text-oxford mb-3" />
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatUSD(totalRevenue)}</p>
                    {periodComparison && periodComparison.previousRevenue > 0 && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${periodComparison.percentChangeRevenue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {periodComparison.percentChangeRevenue >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(periodComparison.percentChangeRevenue).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {periodComparison && (
                    <p className="text-xs text-gray-400 mt-1">
                      vs {formatUSD(periodComparison.previousRevenue)} prior period
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card min-h-[120px]">
                  <FileCheck size={18} className="text-oxford mb-3" />
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Total Transactions</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
                    {periodComparison && periodComparison.previousLicenses > 0 && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${periodComparison.percentChangeLicenses >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {periodComparison.percentChangeLicenses >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(periodComparison.percentChangeLicenses).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {periodComparison && (
                    <p className="text-xs text-gray-400 mt-1">
                      vs {periodComparison.previousLicenses} prior period
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {chartData.length > 0 && (
              <motion.div variants={itemVariants} className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">Revenue Over Time</h2>
                <p className="text-sm text-gray-500 mb-6">Daily revenue breakdown</p>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4A26ED" stopOpacity={0.3} /><stop offset="95%" stopColor="#4A26ED" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(value: number) => [`${formatUSD(value)}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#4A26ED" fill="url(#gradRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                  <h2 className="font-bold text-gray-900 text-lg">Top Articles</h2>
                  <p className="text-sm text-gray-500">By revenue</p>
                </div>
                {topArticles.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow className="bg-gray-50 border-gray-200"><TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Title</TableHead><TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider text-right">Licenses</TableHead><TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {topArticles.map((a) => (
                        <TableRow key={a.id} className="border-gray-100">
                          <TableCell className="font-medium text-gray-900 text-sm max-w-[200px] truncate">{decodeText(a.title)}</TableCell>
                          <TableCell className="text-right text-gray-500 text-sm">{a.count}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600 text-sm">{formatUSD(a.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <div className="p-8 text-center text-gray-400 text-sm">No articles yet</div>}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-card p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">License Split</h2>
                <p className="text-sm text-gray-500 mb-4">Human vs AI licenses</p>
                {pieData.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="w-full max-w-[200px] h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><RechartsTooltip formatter={(value: number, name: string) => [value, name]} /></PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-plum-magenta" /><span className="text-sm text-gray-900">Human: <strong>{licenseTypeSplit.human}</strong></span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-oxford" /><span className="text-sm text-gray-900">AI: <strong>{licenseTypeSplit.ai}</strong></span></div>
                    </div>
                  </div>
                ) : <div className="text-center py-8 text-gray-400 text-sm">No license data yet</div>}
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
