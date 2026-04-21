import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import SEO from "@/components/SEO";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { decodeText } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TransactionReceiptDrawer } from "@/components/dashboard/TransactionReceiptDrawer";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { IssueArchiveLicenseModal } from "@/components/dashboard/IssueArchiveLicenseModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Sparkles, FileCheck,
  ArrowUpRight, Download, Loader2, Filter, Eye, Archive,
  AlertTriangle, Ban, ScrollText, Receipt, RotateCcw, Lock, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatUSD } from "@/lib/formatNumber";
import { Spinner } from "@/components/ui/Spinner";
import {
  CANONICAL_LICENSE_TYPES,
  LICENSE_TYPE_LABELS,
  getLicenseTypeBadgeClass,
  getLicenseTypeLabel,
  getLicenseTypeTextColor,
  normalizeLegacyType,
  type CanonicalLicenseType,
} from "@/lib/licenseTypes";

interface Transaction {
  id: string;
  type: "ai_ingestion" | "human_license" | "archive_license" | "enterprise_license" | "payout";
  /** Raw backend license_type token, used to look up canonical label/badge. */
  rawLicenseType?: string;
  description: string;
  amount: number;
  date: string;
  status: "settled" | "processing" | "disputed" | "revoked";
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
  validFrom?: string;
  validUntil?: string;
  blockchainTxHash?: string | null;
  blockchainStatus?: string | null;
  paymentHeld?: boolean;
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } } };
const rowVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } } };

function mapStatus(status: string): "settled" | "processing" | "disputed" | "revoked" {
  if (status === "completed" || status === "settled") return "settled";
  if (status === "pending" || status === "processing") return "processing";
  if (status === "revoked") return "revoked";
  if (status === "failed" || status === "disputed") return "disputed";
  return "processing";
}

export default function Ledger() {
  useDocumentTitle("Ledger — Opedd");
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("licenses");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apiMetrics, setApiMetrics] = useState<{
    total_revenue: number; total_transactions: number;
    human_licenses: number; ai_licenses: number;
    avg_transaction?: number; top_article?: string | null;
  } | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Transaction | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Pagination + search state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const LIMIT = 50;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTransactions = useCallback(async (fetchOffset = 0, append = false) => {
    if (!user) return;
    if (!append) setIsLoading(true);
    setFetchError(false);
    try {
      const token = await getAccessToken();
      if (!token) { setTransactions([]); setIsLoading(false); return; }
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(fetchOffset) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchEmail.trim()) params.set("search_email", searchEmail.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`${EXT_SUPABASE_URL}/get-transactions?${params.toString()}`, {
        headers: { apikey: EXT_ANON_KEY, Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        if (!append) { setTransactions([]); setApiMetrics(null); }
        setHasMore(false);
      } else {
        const txList = result.data?.transactions || [];
        const mapped: Transaction[] = txList.map((tx: any) => {
          const isAI = tx.license_type === "ai" || tx.license_type === "ai_inference" || tx.license_type === "ai_training";
          const isArchive = tx.license_type === "archive";
          const isEnterprise = tx.license_type === "enterprise";
          const txType = isEnterprise ? "enterprise_license" : isArchive ? "archive_license" : isAI ? "ai_ingestion" : "human_license";
          return {
            id: tx.id,
            type: txType,
            rawLicenseType: tx.license_type,
            description: isEnterprise ? "Corporate License" : isArchive ? "Archive License" : isAI ? "AI Training License" : "Editorial License",
            amount: Number(tx.amount), date: new Date(tx.created_at).toISOString().split("T")[0],
            status: mapStatus(tx.status),
            assetTitle: tx.asset_title || (isArchive ? "Archive License" : isEnterprise ? "Corporate License" : "Unknown Asset"),
            assetId: tx.article_id, licenseeEmail: tx.buyer_email, licenseKey: tx.license_key,
            buyerName: tx.buyer_name, buyerOrganization: tx.buyer_organization,
            intendedUse: tx.intended_use, validFrom: tx.valid_from, validUntil: tx.valid_until,
            licenseTerms: isEnterprise ? "Annual corporate catalog license — auto-renewing." : isArchive ? "Site-wide archive license." : isAI ? "Non-exclusive license for AI model training." : "Single-use editorial republication license.",
            blockchainTxHash: tx.blockchain_tx_hash || null,
            blockchainStatus: tx.blockchain_status || null,
            paymentHeld: tx.payment_held || false,
          };
        });
        if (append) {
          setTransactions(prev => [...prev, ...mapped]);
        } else {
          setTransactions(mapped);
          setApiMetrics(result.data?.metrics || null);
        }
        setHasMore(txList.length === LIMIT);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setFetchError(true);
      if (!append) { setTransactions([]); setApiMetrics(null); }
    } finally { setIsLoading(false); }
  }, [user, statusFilter, typeFilter, searchEmail, dateFrom, dateTo, getAccessToken]);

  useEffect(() => {
    setOffset(0);
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  const metrics = useMemo(() => {
    if (apiMetrics) {
      const total = apiMetrics.total_revenue ?? 0;
      const count = apiMetrics.total_transactions ?? 0;
      return {
        totalRevenue: total, totalTransactions: count,
        humanLicenses: apiMetrics.human_licenses ?? 0,
        aiLicenses: apiMetrics.ai_licenses ?? 0,
        enterpriseLicenses: transactions.filter(t => t.type === "enterprise_license").length,
      };
    }
    const totalRevenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    return {
      totalRevenue, totalTransactions: transactions.length,
      humanLicenses: transactions.filter(t => t.type === "human_license").length,
      aiLicenses: transactions.filter(t => t.type === "ai_ingestion").length,
      enterpriseLicenses: transactions.filter(t => t.type === "enterprise_license").length,
    };
  }, [apiMetrics, transactions]);

  if (!user) return null;

  const handleRowClick = (tx: Transaction) => { setSelectedTransaction(tx); setDrawerOpen(true); };

  const handleRevoke = async () => {
    if (!revokeTarget?.licenseKey) return;
    setIsRevoking(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/revoke-license`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transaction_id: revokeTarget.id }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || "Failed to revoke");
      setTransactions(prev => prev.map(tx => tx.id === revokeTarget.id ? { ...tx, status: "revoked" as const } : tx));
      toast({ title: "License revoked", description: `License ${revokeTarget.licenseKey} has been revoked.` });
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
      setRevokeReason("");
    }
  };

  const handleRefund = async () => {
    if (!refundTarget?.licenseKey) return;
    setIsRefunding(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/refund-license`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ license_key: refundTarget.licenseKey }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || result.error || "Failed to refund");
      setTransactions(prev => prev.map(tx => tx.id === refundTarget.id ? { ...tx, status: "revoked" as const } : tx));
      toast({ title: "Refund issued", description: `${formatUSD(refundTarget.amount)} refunded. Buyer notified by email.` });
    } catch (err: any) {
      toast({ title: "Refund failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRefunding(false);
      setRefundTarget(null);
    }
  };

  const handleRetryBlockchain = async (transactionId: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/retry-blockchain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transaction_id: transactionId }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || "Retry failed");
      setTransactions(prev => prev.map(tx => tx.id === transactionId ? { ...tx, blockchainStatus: "pending" } : tx));
      setSelectedTransaction(prev => prev?.id === transactionId ? { ...prev, blockchainStatus: "pending" } : prev);
      toast({ title: "Retry queued", description: "On-chain registration has been re-queued. This may take a minute." });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    const headers = ["Date", "Article", "Buyer", "Type", "Amount", "Status", "License Key"];
    const rows = transactions.map(tx => [tx.date, `"${(tx.assetTitle || "—").replace(/"/g, '""')}"`, tx.licenseeEmail || "—", tx.type === "ai_ingestion" ? "AI" : "Human", tx.amount.toFixed(2), tx.status, tx.licenseKey || "—"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `opedd-ledger-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    setIsExporting(false);
    toast({ title: "Export complete!", description: "Your transaction report has been downloaded." });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ai_ingestion": return <div className="w-9 h-9 rounded-lg bg-oxford/10 flex items-center justify-center"><Sparkles size={18} className="text-oxford" /></div>;
      case "human_license": return <div className="w-9 h-9 rounded-lg bg-plum-magenta/10 flex items-center justify-center"><User size={18} className="text-plum-magenta" /></div>;
      case "archive_license": return <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Archive size={18} className="text-amber-600" /></div>;
      case "enterprise_license": return <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Shield size={18} className="text-emerald-600" /></div>;
      default: return <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><ArrowUpRight size={18} className="text-gray-500" /></div>;
    }
  };

  // Badge labels & colors are sourced from the canonical license-type map.
  // Falls back to the legacy txType when rawLicenseType is missing.
  const getBuyerTypeBadge = (tx: Transaction) => {
    const raw = tx.rawLicenseType ?? (
      tx.type === "ai_ingestion" ? "ai_training"
      : tx.type === "human_license" ? "editorial"
      : tx.type === "archive_license" ? "archive"
      : tx.type === "enterprise_license" ? "corporate"
      : null
    );
    const canonical = normalizeLegacyType(raw);
    if (!canonical) {
      return <Badge className="bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-100 font-medium">Payout</Badge>;
    }
    return (
      <Badge className={`${LICENSE_TYPE_LABELS[canonical].badgeClass} font-medium`}>
        {LICENSE_TYPE_LABELS[canonical].shortLabel}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled": return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">Completed</Badge>;
      case "processing": return <Badge className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50 font-medium">Pending</Badge>;
      case "disputed": return <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-medium">Failed</Badge>;
      case "revoked": return <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-medium">Revoked</Badge>;
      default: return null;
    }
  };

  if (isLoading && transactions.length === 0) return <PageLoader />;

  return (
    <DashboardLayout title="Ledger" subtitle="License agreements and buyer transactions">
      <SEO title="Ledger — Opedd" path="/ledger" noindex />
      <motion.div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex items-center justify-between" variants={itemVariants}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">License agreements and buyer transactions</p>
          </div>
          <Button onClick={handleExportCSV} disabled={isExporting || transactions.length === 0} className="bg-oxford hover:bg-oxford-dark text-white font-medium px-4 py-2 rounded-lg">
            {isExporting ? <><Spinner size="md" className="mr-2" />Exporting...</> : <><Download size={16} className="mr-2" />Export CSV</>}
          </Button>
        </motion.div>

        {/* Held payments banner */}
        {(() => {
          const held = transactions.filter(t => t.paymentHeld && t.status === "settled");
          const heldTotal = held.reduce((s, t) => s + t.amount, 0);
          if (held.length === 0) return null;
          return (
            <motion.div variants={itemVariants} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <Lock size={18} className="text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {held.length} payment{held.length !== 1 ? "s" : ""} ({formatUSD(heldTotal)} total) are held in escrow
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Complete your Stripe Connect setup to receive payouts for these licenses.</p>
              </div>
              <a href="/settings?tab=profile" className="shrink-0 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">Complete Setup →</a>
            </motion.div>
          );
        })()}

        <motion.div className={`grid grid-cols-1 gap-4 ${metrics.enterpriseLicenses > 0 ? "md:grid-cols-3" : "md:grid-cols-2"}`} variants={itemVariants}>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card">
            <User size={18} className="text-plum-magenta mb-3" />
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Human Licenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.humanLicenses}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card">
            <Sparkles size={18} className="text-oxford mb-3" />
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">AI Licenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.aiLicenses}</p>
          </div>
          {metrics.enterpriseLicenses > 0 && (
            <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-card">
              <Shield size={18} className="text-emerald-600 mb-3" />
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Enterprise Deals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.enterpriseLicenses}</p>
            </div>
          )}
        </motion.div>

        {/* Error state */}
        {fetchError && !isLoading && (
          <div className="bg-white rounded-xl border border-red-600/30 p-6 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-600 flex-1">Failed to load transactions.</p>
            <button onClick={() => { setOffset(0); fetchTransactions(0, false); }} className="text-sm font-semibold text-oxford hover:underline">Try again</button>
          </div>
        )}

        {!fetchError && (
          <motion.div variants={itemVariants}>
                {transactions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-16 shadow-card text-center">
                    <FileCheck size={40} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No transactions yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mb-5">Once buyers license your articles, all transactions will appear here with full details.</p>
                    <Button
                      onClick={() => navigate("/content")}
                      className="bg-oxford hover:bg-oxford-dark text-white font-medium px-5 py-2 rounded-lg"
                    >
                      Add your first article
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="font-bold text-gray-900 text-lg">Transaction History</h2>
                          <p className="text-sm text-gray-500">All IP licensing revenue</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                          <Shield size={14} className="text-oxford" />
                          <span className="text-xs font-medium text-gray-500">Verified by Opedd Protocol</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-gray-400"><Filter size={14} /><span className="text-xs font-medium uppercase tracking-wider">Filters</span></div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0); }}>
                          <SelectTrigger className="w-[140px] h-9 text-sm border-gray-200 rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setOffset(0); }}>
                          <SelectTrigger className="w-[180px] h-9 text-sm border-gray-200 rounded-lg"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {CANONICAL_LICENSE_TYPES.map((k) => (
                              <SelectItem key={k} value={k}>{LICENSE_TYPE_LABELS[k].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Search by email + date range */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Input
                          type="email"
                          placeholder="Search by buyer email…"
                          value={searchEmail}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchEmail(val);
                            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                            searchDebounceRef.current = setTimeout(() => {
                              setOffset(0);
                            }, 400);
                          }}
                          className="h-9 text-sm border-gray-200 rounded-lg w-[220px]"
                        />
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
                          className="h-9 text-sm border-gray-200 rounded-lg w-[150px]"
                          title="From date"
                        />
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
                          className="h-9 text-sm border-gray-200 rounded-lg w-[150px]"
                          title="To date"
                        />
                        {(searchEmail || dateFrom || dateTo) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchEmail("");
                              setDateFrom("");
                              setDateTo("");
                              setOffset(0);
                            }}
                            className="h-9 px-3 text-xs text-gray-500 border-gray-200"
                          >
                            <X size={13} className="mr-1" />Clear filters
                          </Button>
                        )}
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 bg-gray-50">
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Article</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">License Type</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Buyer</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Amount</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-gray-500 text-xs font-semibold uppercase tracking-wider w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {transactions.map((tx, index) => (
                            <motion.tr key={tx.id} variants={rowVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.05 }} className="border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group" onClick={() => handleRowClick(tx)}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(tx.type)}
                                  <span className="text-gray-900 font-medium text-sm truncate max-w-[200px]">{tx.assetTitle ? decodeText(tx.assetTitle) : "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getBuyerTypeBadge(tx)}</TableCell>
                              <TableCell><span className="text-gray-500 text-sm">{tx.licenseeEmail ? tx.licenseeEmail.split("@")[0] + "..." : "Anonymous"}</span></TableCell>
                              <TableCell><span className={`font-bold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : "text-gray-500"}`}>{formatUSD(Math.abs(tx.amount))}</span></TableCell>
                              <TableCell><span className="text-gray-500 text-sm">{tx.date}</span></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {getStatusBadge(tx.status)}
                                  {tx.paymentHeld && tx.status === "settled" && (
                                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 font-medium text-[10px] px-1.5 py-0">
                                      <Lock size={9} className="mr-0.5" />Held
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <TooltipProvider delayDuration={200}>
                                  {tx.status === "settled" && tx.licenseKey && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`${EXT_SUPABASE_URL}/certificate?key=${tx.licenseKey}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-oxford hover:bg-oxford/5 transition-colors"
                                          >
                                            <ScrollText size={14} />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent>Download Certificate</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`${EXT_SUPABASE_URL}/invoice?key=${tx.licenseKey}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-oxford hover:bg-oxford/5 transition-colors"
                                          >
                                            <Receipt size={14} />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent>Download Invoice</TooltipContent>
                                      </Tooltip>
                                      {!tx.paymentHeld && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setRefundTarget(tx); }}
                                              aria-label="Issue refund"
                                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                            >
                                              <RotateCcw size={14} />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>Issue Refund</TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setRevokeTarget(tx); }}
                                            aria-label="Revoke license"
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <Ban size={14} />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Revoke License</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
                                  </TooltipProvider>
                                  <Eye size={14} className="text-gray-400 group-hover:text-oxford transition-colors" />
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                    {hasMore && transactions.length > 0 && (
                      <div className="flex justify-center p-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          disabled={isLoading}
                          onClick={() => {
                            const newOffset = offset + LIMIT;
                            setOffset(newOffset);
                            fetchTransactions(newOffset, true);
                          }}
                          className="border-gray-200 text-gray-500 hover:text-gray-900"
                        >
                          {isLoading ? <><Spinner size="sm" className="mr-2" />Loading...</> : "Load more"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
          </motion.div>
        )}
      </motion.div>

      <TransactionReceiptDrawer open={drawerOpen} onOpenChange={setDrawerOpen} transaction={selectedTransaction} onRetryBlockchain={handleRetryBlockchain} />
      <IssueArchiveLicenseModal open={showArchiveModal} onOpenChange={setShowArchiveModal} onSuccess={() => { setShowArchiveModal(false); setOffset(0); fetchTransactions(0, false); }} />

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) { setRevokeTarget(null); setRevokeReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <AlertTriangle size={20} className="text-red-600" />
              Revoke this license?
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              This will permanently revoke license <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{revokeTarget?.licenseKey}</code>. The buyer will lose access rights. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason (optional)</label>
            <Textarea
              placeholder="e.g. Content removed, license dispute, buyer request..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeReason(""); }} disabled={isRevoking}>
              Cancel
            </Button>
            <Button onClick={handleRevoke} disabled={isRevoking} className="bg-red-600 hover:bg-red-700 text-white">
              {isRevoking ? <><Spinner size="md" className="mr-2" />Revoking...</> : "Yes, Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Refund confirmation dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <RotateCcw size={20} className="text-amber-600" />
              Issue a refund?
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              This will refund <strong className="text-gray-900">{formatUSD(refundTarget?.amount)}</strong> to the buyer and revoke license{" "}
              <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{refundTarget?.licenseKey}</code>.
              The buyer will be notified by email. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRefundTarget(null)} disabled={isRefunding}>Cancel</Button>
            <Button onClick={handleRefund} disabled={isRefunding} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isRefunding ? <><Spinner size="md" className="mr-2" />Refunding...</> : "Yes, Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
