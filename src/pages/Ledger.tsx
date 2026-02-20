import React, { useState, useMemo, useEffect, useCallback } from "react";
import { decodeText } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TransactionReceiptDrawer } from "@/components/dashboard/TransactionReceiptDrawer";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  FileCheck, 
  Sparkles, 
  User, 
  Shield,
  ArrowUpRight,
  Download,
  Trophy,
  Loader2,
  HelpCircle,
  Filter,
  Eye
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Transaction {
  id: string;
  type: "ai_ingestion" | "human_license" | "payout";
  description: string;
  amount: number;
  date: string;
  status: "settled" | "processing" | "disputed";
  assetTitle?: string;
  assetId?: string;
  fromDirectLink?: boolean;
  licenseeEmail?: string;
  licenseTerms?: string;
  licenseKey?: string;
  buyerName?: string;
  buyerOrganization?: string;
  intendedUse?: string;
  aiLabName?: string;
  aiModel?: string;
  tokenVolume?: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } }
};

function mapStatus(status: string): "settled" | "processing" | "disputed" {
  if (status === "completed" || status === "settled") return "settled";
  if (status === "pending" || status === "processing") return "processing";
  if (status === "failed" || status === "disputed") return "disputed";
  return "processing";
}

export default function Ledger() {
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apiMetrics, setApiMetrics] = useState<{
    total_revenue: number;
    total_transactions: number;
    human_licenses: number;
    ai_licenses: number;
    avg_transaction?: number;
    top_article?: string | null;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) { setTransactions([]); setIsLoading(false); return; }

      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(
        `${EXT_SUPABASE_URL}/functions/v1/get-transactions?${params.toString()}`,
        {
          headers: {
            apikey: EXT_ANON_KEY,
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        console.warn("get-transactions error:", result.error);
        setTransactions([]);
        setApiMetrics(null);
      } else {
        const txList = result.data?.transactions || [];
        const mapped: Transaction[] = txList.map((tx: any) => {
          const isAI = tx.license_type === "ai";
          return {
            id: tx.id,
            type: isAI ? "ai_ingestion" : "human_license",
            description: isAI ? "AI Training License" : "Human Republication License",
            amount: Number(tx.amount),
            date: new Date(tx.created_at).toISOString().split("T")[0],
            status: mapStatus(tx.status),
            assetTitle: tx.article_title || "Unknown Asset",
            assetId: tx.article_id,
            licenseeEmail: tx.buyer_email,
            licenseKey: tx.license_key,
            buyerName: tx.buyer_name,
            buyerOrganization: tx.buyer_organization,
            intendedUse: tx.intended_use,
            licenseTerms: isAI
              ? "Non-exclusive license for AI model training. Valid for 12 months."
              : "Single-use republication license. Attribution required.",
          };
        });
        setTransactions(mapped);
        setApiMetrics(result.data?.metrics || null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setTransactions([]);
      setApiMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter, typeFilter, getAccessToken]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const metrics = useMemo(() => {
    if (apiMetrics) {
      const total = apiMetrics.total_revenue ?? 0;
      const count = apiMetrics.total_transactions ?? 0;
      return {
        totalRevenue: total,
        totalTransactions: count,
        humanLicenses: apiMetrics.human_licenses ?? 0,
        aiLicenses: apiMetrics.ai_licenses ?? 0,
        avgTransaction: apiMetrics.avg_transaction ?? (count > 0 ? total / count : 0),
        topArticle: apiMetrics.top_article ?? null,
      };
    }
    const totalRevenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const human = transactions.filter(t => t.type === "human_license").length;
    const ai = transactions.filter(t => t.type === "ai_ingestion").length;
    return {
      totalRevenue,
      totalTransactions: transactions.length,
      humanLicenses: human,
      aiLicenses: ai,
      avgTransaction: transactions.length > 0 ? totalRevenue / transactions.length : 0,
      topArticle: null,
    };
  }, [apiMetrics, transactions]);

  const hasTransactions = transactions.length > 0;

  if (!user) return null;

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDrawerOpen(true);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    toast({ title: "Preparing your report...", description: "Your CSV export will be ready shortly." });
    await new Promise(resolve => setTimeout(resolve, 500));

    const headers = ["ID", "Type", "Article", "Buyer", "Amount", "Date", "Status", "License Key"];
    const rows = transactions.map(tx => [
      tx.id,
      tx.type === "ai_ingestion" ? "AI" : "Human",
      tx.assetTitle || "—",
      tx.licenseeEmail || "Anonymous",
      tx.amount.toFixed(2),
      tx.date,
      tx.status,
      tx.licenseKey || "—",
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opedd-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    toast({ title: "Export complete!", description: "Your transaction report has been downloaded." });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ai_ingestion":
        return (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
            <Sparkles size={18} className="text-[#4A26ED]" />
          </div>
        );
      case "human_license":
        return (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D1009A]/10 to-[#E91E9A]/10 flex items-center justify-center">
            <User size={18} className="text-[#D1009A]" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ArrowUpRight size={18} className="text-slate-600" />
          </div>
        );
    }
  };

  const getBuyerTypeBadge = (type: string) => {
    switch (type) {
      case "ai_ingestion":
        return (
          <Badge className="bg-[#4A26ED]/10 text-[#4A26ED] border border-[#4A26ED]/20 hover:bg-[#4A26ED]/10 font-medium">
            <Sparkles size={12} className="mr-1" /> AI
          </Badge>
        );
      case "human_license":
        return (
          <Badge className="bg-[#D1009A]/10 text-[#D1009A] border border-[#D1009A]/20 hover:bg-[#D1009A]/10 font-medium">
            <User size={12} className="mr-1" /> Human
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100 font-medium">
            Payout
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">Completed</Badge>;
      case "processing":
        return <Badge className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50 font-medium">Pending</Badge>;
      case "disputed":
        return <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-medium">Failed</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Transactions">
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#4A26ED]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Transactions" subtitle="All licensing revenue and settlements">
        <motion.div 
          className="p-8 max-w-6xl w-full mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Page Header with Export Button */}
          <motion.div className="flex items-center justify-between" variants={itemVariants}>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Transactions</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">All licensing revenue and settlements</p>
            </div>
            
            <Button
              onClick={handleExportCSV}
              disabled={isExporting || transactions.length === 0}
              className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-medium px-4 py-2 rounded-lg"
            >
              {isExporting ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Exporting...</>
              ) : (
                <><Download size={16} className="mr-2" />Export CSV</>
              )}
            </Button>
          </motion.div>

          {/* Metric Cards Row */}
          <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4" variants={itemVariants}>
            {/* Total Revenue */}
            <div className="bg-[#040042] rounded-xl p-6 text-white shadow-sm">
              <TrendingUp size={18} className="text-white/60 mb-3" />
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">${metrics.totalRevenue.toFixed(2)}</p>
            </div>

            {/* Total Transactions */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
              <FileCheck size={18} className="text-[#4A26ED] mb-3" />
              <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">{metrics.totalTransactions}</p>
            </div>

            {/* Human Licenses */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
              <User size={18} className="text-[#D1009A] mb-3" />
              <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">Human Licenses</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">{metrics.humanLicenses}</p>
            </div>

            {/* AI Licenses */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
              <Sparkles size={18} className="text-[#4A26ED] mb-3" />
              <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wider">AI Licenses</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">{metrics.aiLicenses}</p>
            </div>
          </motion.div>

          {/* Transaction History or Empty State */}
          <motion.div variants={itemVariants}>
            {!hasTransactions ? (
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-16 shadow-sm text-center">
                <Wallet size={40} className="mx-auto text-[#D1D5DB] mb-4" />
                <h3 className="text-base font-semibold text-[#111] mb-1">No transactions yet</h3>
                <p className="text-sm text-[#6B7280] max-w-xs mx-auto">Transactions will appear here once you start receiving licensing revenue.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-[#040042] text-lg">Transaction History</h2>
                      <p className="text-sm text-[#040042]/60">All IP licensing revenue</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                      <Shield size={14} className="text-[#4A26ED]" />
                      <span className="text-xs font-medium text-[#040042]/70">Verified by Opedd Protocol</span>
                    </div>
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[#040042]/50">
                      <Filter size={14} />
                      <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px] h-9 text-sm border-gray-200 rounded-lg">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px] h-9 text-sm border-gray-200 rounded-lg">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="human">Human</SelectItem>
                        <SelectItem value="ai">AI Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 bg-gray-50">
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Article</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">License Type</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Buyer</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {transactions.map((tx, index) => (
                        <motion.tr
                          key={tx.id}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: index * 0.05 }}
                          className="border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
                          onClick={() => handleRowClick(tx)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(tx.type)}
                              <span className="text-[#040042] font-medium text-sm truncate max-w-[200px]">
                                {tx.assetTitle ? decodeText(tx.assetTitle) : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getBuyerTypeBadge(tx.type)}</TableCell>
                          <TableCell>
                            <span className="text-[#040042]/70 text-sm">
                              {tx.licenseeEmail ? tx.licenseeEmail.split("@")[0] + "..." : "Anonymous"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                              ${Math.abs(tx.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[#040042]/60 text-sm">{tx.date}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell>
                            <Eye size={14} className="text-slate-400 group-hover:text-[#4A26ED] transition-colors" />
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </motion.div>
      {/* Transaction Receipt Drawer */}
      <TransactionReceiptDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        transaction={selectedTransaction}
      />
    </DashboardLayout>
  );
}
