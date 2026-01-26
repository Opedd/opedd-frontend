import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TransactionReceiptDrawer } from "@/components/dashboard/TransactionReceiptDrawer";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  FileCheck, 
  Sparkles, 
  User, 
  Link2,
  Shield,
  ArrowUpRight,
  Download,
  Trophy,
  Loader2
} from "lucide-react";
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
  storyProtocolHash?: string;
  licenseeEmail?: string;
  licenseTerms?: string;
}

const mockTransactions: Transaction[] = [
  { 
    id: "TXN-001", 
    type: "ai_ingestion", 
    description: "AI Training License - OpenAI GPT-4", 
    amount: 49.99, 
    date: "2025-01-23", 
    status: "settled",
    assetTitle: "The Future of Quantum Computing",
    assetId: "asset-001",
    storyProtocolHash: "0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385",
    licenseeEmail: "training@openai.com",
    licenseTerms: "Non-exclusive license for AI model training. Valid for 12 months from date of purchase. Includes rights to process, analyze, and learn from the content for machine learning purposes."
  },
  { 
    id: "TXN-002", 
    type: "human_license", 
    description: "Human Republication - Academic Journal", 
    amount: 4.99, 
    date: "2025-01-22", 
    status: "settled",
    assetTitle: "Climate Policy Framework Analysis",
    assetId: "asset-002",
    fromDirectLink: true,
    storyProtocolHash: "0x3e8fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91123",
    licenseeEmail: "editor@nature.com",
    licenseTerms: "Single-use republication license for academic purposes. Attribution required. Valid for one publication."
  },
  { 
    id: "TXN-003", 
    type: "payout", 
    description: "Monthly Payout to Stripe", 
    amount: -250.00, 
    date: "2025-01-20", 
    status: "settled"
  },
  { 
    id: "TXN-004", 
    type: "ai_ingestion", 
    description: "AI Training License - Anthropic Claude", 
    amount: 49.99, 
    date: "2025-01-19", 
    status: "processing",
    assetTitle: "Neural Network Architecture Patterns",
    assetId: "asset-003",
    storyProtocolHash: "0x9a1fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91456",
    licenseeEmail: "data@anthropic.com",
    licenseTerms: "Non-exclusive license for AI model training. Pending confirmation from Story Protocol network."
  },
  { 
    id: "TXN-005", 
    type: "human_license", 
    description: "Human Republication - News Outlet", 
    amount: 4.99, 
    date: "2025-01-18", 
    status: "settled",
    assetTitle: "Global Economic Outlook 2025",
    assetId: "asset-004",
    fromDirectLink: true,
    storyProtocolHash: "0x2b4fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91789",
    licenseeEmail: "licensing@reuters.com",
    licenseTerms: "Single-use republication license for news distribution. Full attribution required."
  },
  { 
    id: "TXN-006", 
    type: "ai_ingestion", 
    description: "AI Training License - Google DeepMind", 
    amount: 99.99, 
    date: "2025-01-17", 
    status: "disputed",
    assetTitle: "Reinforcement Learning Case Studies",
    assetId: "asset-005",
    storyProtocolHash: "0x5c7fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91abc",
    licenseeEmail: "research@deepmind.com",
    licenseTerms: "License under review due to usage scope clarification request."
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }
  }
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  }
};

export default function Ledger() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = mockTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const activeLicenses = mockTransactions.filter(t => 
      t.type !== "payout" && t.status === "settled"
    ).length;

    // Find top asset by revenue
    const assetRevenue = mockTransactions
      .filter(t => t.assetTitle && t.amount > 0)
      .reduce((acc, t) => {
        if (t.assetTitle) {
          acc[t.assetTitle] = (acc[t.assetTitle] || 0) + t.amount;
        }
        return acc;
      }, {} as Record<string, number>);

    const topAsset = Object.entries(assetRevenue).sort((a, b) => b[1] - a[1])[0];

    return {
      totalRevenue,
      activeLicenses,
      topAsset: topAsset ? { name: topAsset[0], revenue: topAsset[1] } : null
    };
  }, []);

  // Check if there are any transactions (excluding payouts for empty state)
  const hasTransactions = mockTransactions.filter(t => t.type !== "payout").length > 0;

  if (!user) return null;

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDrawerOpen(true);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    toast({
      title: "Preparing your report...",
      description: "Your CSV export will be ready shortly.",
    });

    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create CSV content
    const headers = ["ID", "Type", "Asset Name", "Buyer Type", "Amount", "Date", "Status"];
    const rows = mockTransactions.map(tx => [
      tx.id,
      tx.type,
      tx.assetTitle || "—",
      tx.type === "ai_ingestion" ? "AI" : tx.type === "human_license" ? "Individual" : "Payout",
      tx.amount.toFixed(2),
      tx.date,
      tx.status
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
    toast({
      title: "Export complete!",
      description: "Your transaction report has been downloaded.",
    });
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
      case "payout":
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
            <Sparkles size={12} className="mr-1" />
            AI
          </Badge>
        );
      case "human_license":
        return (
          <Badge className="bg-[#D1009A]/10 text-[#D1009A] border border-[#D1009A]/20 hover:bg-[#D1009A]/10 font-medium">
            <User size={12} className="mr-1" />
            Individual
          </Badge>
        );
      case "payout":
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
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">
            Success
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50 font-medium">
            Pending
          </Badge>
        );
      case "disputed":
        return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-medium">
            Disputed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <motion.div 
          className="p-8 max-w-7xl w-full mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Page Header with Export Button */}
          <motion.div 
            className="flex items-center justify-between"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-[#4A26ED]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#040042]">Revenue Ledger</h1>
                <p className="text-[#040042]/60 text-sm">IP licensing revenue & Story Protocol settlements</p>
              </div>
            </div>
            
            <Button
              onClick={handleExportCSV}
              disabled={isExporting || !hasTransactions}
              className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3d1ecc] hover:to-[#6b2ed4] text-white font-medium px-5 h-11 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={18} className="mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </motion.div>

          {/* Metric Cards Row */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={itemVariants}
          >
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4A26ED]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={24} className="text-white/80" />
                  <Sparkline value={metrics.totalRevenue} className="opacity-80" />
                </div>
                <p className="text-white/70 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">${metrics.totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Active Licenses */}
            <div className="bg-white rounded-2xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <FileCheck size={24} className="text-[#4A26ED]" />
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium">
                  Active
                </Badge>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Active Licenses</p>
              <p className="text-3xl font-bold text-[#040042] mt-1">{metrics.activeLicenses}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#4A26ED]" />
                  <span className="text-[#040042]/60">AI: {mockTransactions.filter(t => t.type === "ai_ingestion" && t.status === "settled").length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[#D1009A]" />
                  <span className="text-[#040042]/60">Human: {mockTransactions.filter(t => t.type === "human_license" && t.status === "settled").length}</span>
                </span>
              </div>
            </div>

            {/* Top Asset */}
            <div className="bg-white rounded-2xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Trophy size={24} className="text-amber-500" />
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium">
                  Top Performer
                </Badge>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Top Asset</p>
              {metrics.topAsset ? (
                <>
                  <p className="text-lg font-bold text-[#040042] mt-1 truncate" title={metrics.topAsset.name}>
                    {metrics.topAsset.name}
                  </p>
                  <p className="text-emerald-600 font-semibold mt-1">
                    ${metrics.topAsset.revenue.toFixed(2)} revenue
                  </p>
                </>
              ) : (
                <p className="text-[#040042]/40 mt-1">No sales yet</p>
              )}
            </div>
          </motion.div>

          {/* Transaction History or Empty State */}
          <motion.div variants={itemVariants}>
            {!hasTransactions ? (
              <EmptyState onAddClick={() => navigate("/dashboard")} />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8F2FB] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E8F2FB] flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#040042] text-lg">Transaction History</h2>
                    <p className="text-sm text-[#040042]/60">All IP licensing activity and protocol settlements</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#040042]/5 rounded-lg">
                    <Shield size={14} className="text-[#4A26ED]" />
                    <span className="text-xs font-medium text-[#040042]/70">Verified by Story Protocol</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E8F2FB] bg-slate-50/50">
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Asset Name</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Buyer Type</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Revenue</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {mockTransactions.map((tx, index) => (
                        <motion.tr
                          key={tx.id}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: index * 0.05 }}
                          className="border-[#E8F2FB] cursor-pointer hover:bg-slate-50/80 transition-colors group"
                          onClick={() => handleRowClick(tx)}
                        >
                          <TableCell>
                            {getTypeIcon(tx.type)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {tx.assetTitle ? (
                                <span className="font-medium text-[#040042] text-sm group-hover:text-[#4A26ED] transition-colors">
                                  {tx.assetTitle}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                              {tx.fromDirectLink && (
                                <Badge className="bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-50 text-xs px-1.5 py-0 h-5">
                                  <Link2 size={10} className="mr-1" />
                                  Direct
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getBuyerTypeBadge(tx.type)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className={`font-semibold text-sm ${
                                tx.amount > 0 ? "text-emerald-600" : "text-[#040042]"
                              }`}>
                                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                              </span>
                              <Sparkline value={tx.amount > 0 ? tx.amount : 0} />
                            </div>
                          </TableCell>
                          <TableCell className="text-[#040042]/60 text-sm">{tx.date}</TableCell>
                          <TableCell>
                            {getStatusBadge(tx.status)}
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
      </main>

      <TransactionReceiptDrawer
        transaction={selectedTransaction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
