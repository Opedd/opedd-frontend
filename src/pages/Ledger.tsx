import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TransactionReceiptDrawer } from "@/components/dashboard/TransactionReceiptDrawer";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  AlertCircle,
  HelpCircle
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
  // AI Lab specific fields
  aiLabName?: string;
  aiModel?: string;
  tokenVolume?: number;
}

// AI Labs for realistic transaction simulation
const AI_LABS = [
  { name: "OpenAI", model: "GPT-4o Fine-tuning", tokens: 120000 },
  { name: "Anthropic", model: "Claude 3.5 Training", tokens: 85000 },
  { name: "Google DeepMind", model: "Gemini Pro", tokens: 210000 },
  { name: "Perplexity AI", model: "pplx-online", tokens: 45000 },
];

// Sample transactions for demo mode
const sampleTransactions: Transaction[] = [
  { 
    id: "DEMO-001", 
    type: "ai_ingestion", 
    description: "AI Training License - OpenAI GPT-4", 
    amount: 49.99, 
    date: "2025-01-23", 
    status: "settled",
    assetTitle: "The Future of Quantum Computing",
    assetId: "sample-001",
    storyProtocolHash: "0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385",
    licenseeEmail: "training@openai.com",
    licenseTerms: "Non-exclusive license for AI model training. Valid for 12 months from date of purchase.",
    aiLabName: "OpenAI",
    aiModel: "GPT-4o Fine-tuning",
    tokenVolume: 120000
  },
  { 
    id: "DEMO-002", 
    type: "human_license", 
    description: "Human Republication - Academic Journal", 
    amount: 4.99, 
    date: "2025-01-22", 
    status: "settled",
    assetTitle: "Climate Policy Framework Analysis",
    assetId: "sample-002",
    fromDirectLink: true,
    storyProtocolHash: "0x3e8fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91123",
    licenseeEmail: "editor@nature.com",
    licenseTerms: "Single-use republication license for academic purposes."
  },
  { 
    id: "DEMO-003", 
    type: "ai_ingestion", 
    description: "AI Training License - Anthropic Claude", 
    amount: 49.99, 
    date: "2025-01-19", 
    status: "processing",
    assetTitle: "Neural Network Architecture Patterns",
    assetId: "sample-003",
    storyProtocolHash: "0x9a1fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91456",
    licenseeEmail: "data@anthropic.com",
    licenseTerms: "Non-exclusive license for AI model training. Pending confirmation.",
    aiLabName: "Anthropic",
    aiModel: "Claude 3.5 Training",
    tokenVolume: 85000
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
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch transactions from Supabase
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select(`
            id,
            created_at,
            asset_id,
            amount,
            license_type,
            status,
            story_protocol_hash,
            buyer_email,
            assets (
              title
            )
          `)
          .eq("publisher_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching transactions:", error);
          toast({
            title: "Connection Error",
            description: "Unable to load transactions. Showing demo data.",
            variant: "destructive",
          });
          setTransactions([]);
        } else if (data && data.length > 0) {
          // Map database transactions to UI format
          const mappedTransactions: Transaction[] = data.map((tx: any, index: number) => {
            const isAI = tx.license_type === "ai";
            const aiLab = isAI ? AI_LABS[index % AI_LABS.length] : null;
            
            return {
              id: tx.id,
              type: isAI ? "ai_ingestion" : "human_license",
              description: isAI 
                ? `AI Training License - ${aiLab?.name || 'AI Lab'}` 
                : `Human Republication License`,
              amount: Number(tx.amount),
              date: new Date(tx.created_at).toISOString().split("T")[0],
              status: tx.status === "settled" ? "settled" : tx.status === "disputed" ? "disputed" : "processing",
              assetTitle: tx.assets?.title || "Unknown Asset",
              assetId: tx.asset_id,
              storyProtocolHash: tx.story_protocol_hash,
              licenseeEmail: tx.buyer_email,
              licenseTerms: isAI 
                ? "Non-exclusive license for AI model training. Valid for 12 months."
                : "Single-use republication license. Attribution required.",
              // AI Lab specific fields
              aiLabName: aiLab?.name,
              aiModel: aiLab?.model,
              tokenVolume: aiLab?.tokens
            };
          });
          setTransactions(mappedTransactions);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user, toast]);

  // Determine which data to display
  const isShowingDemo = !isLoading && transactions.length === 0;
  const displayTransactions = isShowingDemo ? sampleTransactions : transactions;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = displayTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const activeLicenses = displayTransactions.filter(t => 
      t.type !== "payout" && t.status === "settled"
    ).length;

    // Find top asset by revenue
    const assetRevenue = displayTransactions
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
  }, [displayTransactions]);

  // Check if there are any transactions (excluding payouts for empty state)
  const hasTransactions = displayTransactions.filter(t => t.type !== "payout").length > 0;

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
    const rows = displayTransactions.map(tx => [
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
      description: isShowingDemo ? "Demo data exported." : "Your transaction report has been downloaded.",
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
          <DashboardHeader />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-[#4A26ED]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <motion.div 
          className="p-8 pt-20 lg:pt-8 max-w-7xl w-full mx-auto space-y-8"
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#040042]">Revenue Ledger</h1>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="w-6 h-6 rounded-full bg-[#F2F9FF] flex items-center justify-center hover:bg-[#E8F2FB] transition-colors">
                          <HelpCircle size={14} className="text-[#040042]/50" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px] text-xs">
                        <p>Track all your IP licensing revenue and Story Protocol settlements in one place.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-[#040042]/60 text-sm">IP licensing revenue & Story Protocol settlements</p>
              </div>
            </div>
            
            <Button
              onClick={handleExportCSV}
              disabled={isExporting}
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

          {/* Demo Mode Banner */}
          {isShowingDemo && (
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-r from-[#040042]/5 to-[#4A26ED]/5 border border-[#4A26ED]/20 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center">
                  <AlertCircle size={20} className="text-[#4A26ED]" />
                </div>
                <div>
                  <p className="text-[#040042] font-semibold text-sm">Viewing Demo Data</p>
                  <p className="text-[#040042]/60 text-xs">Add your first asset to start tracking real transactions.</p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl shadow-lg shadow-[#4A26ED]/20"
              >
                Go to Library
              </Button>
            </motion.div>
          )}

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
                <p className="text-white/70 text-sm font-medium">Total Revenue {isShowingDemo && "(Demo)"}</p>
                <p className="text-4xl font-bold mt-1 tracking-tight">${metrics.totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Active Licenses */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <FileCheck size={24} className="text-[#4A26ED]" />
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium">
                  Active
                </Badge>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Active Licenses {isShowingDemo && "(Demo)"}</p>
              <p className="text-4xl font-bold text-[#040042] mt-1 tracking-tight">{metrics.activeLicenses}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#4A26ED]" />
                  <span className="text-[#040042]/60">AI: {displayTransactions.filter(t => t.type === "ai_ingestion" && t.status === "settled").length}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[#D1009A]" />
                  <span className="text-[#040042]/60">Human: {displayTransactions.filter(t => t.type === "human_license" && t.status === "settled").length}</span>
                </span>
              </div>
            </div>

            {/* Top Asset */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Trophy size={24} className="text-amber-500" />
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium">
                  Top Performer
                </Badge>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Best Selling Asset {isShowingDemo && "(Demo)"}</p>
              {metrics.topAsset ? (
                <>
                  <p className="text-lg font-bold text-[#040042] mt-1 truncate" title={metrics.topAsset.name}>
                    {metrics.topAsset.name}
                  </p>
                  <p className="text-emerald-600 font-bold mt-1 text-xl">
                    ${metrics.topAsset.revenue.toFixed(2)}
                  </p>
                </>
              ) : (
                <p className="text-[#040042]/40 mt-1">No sales yet</p>
              )}
            </div>
          </motion.div>

          {/* Transaction History or Empty State */}
          <motion.div variants={itemVariants}>
            {!hasTransactions && !isShowingDemo ? (
              <EmptyState onAddClick={() => navigate("/dashboard")} />
            ) : (
              <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${isShowingDemo ? 'opacity-90' : ''}`}>
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-[#040042] text-lg">Transaction History</h2>
                    <p className="text-sm text-[#040042]/60">All IP licensing revenue</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                    <Shield size={14} className="text-[#4A26ED]" />
                    <span className="text-xs font-medium text-[#040042]/70">Verified by Story Protocol</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 bg-gray-50">
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Asset Name</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">License Type</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Buyer</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Revenue</TableHead>
                      <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {displayTransactions.map((tx, index) => {
                        const isDemo = tx.id.startsWith('DEMO-');
                        return (
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
                                <span className="text-[#040042] font-medium text-sm">{tx.assetTitle || "—"}</span>
                                {isDemo && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#040042]/40 border-[#040042]/20">
                                    Demo
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getBuyerTypeBadge(tx.type)}</TableCell>
                            <TableCell>
                              <span className="text-[#040042]/70 text-sm">
                                {tx.licenseeEmail ? tx.licenseeEmail.split('@')[0] + '...' : 'Anonymous'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Sparkline value={tx.amount > 0 ? tx.amount : 0} />
                                <span className={`font-bold tabular-nums text-lg ${
                                  tx.amount > 0 ? "text-emerald-600" : "text-slate-600"
                                }`}>
                                  ${Math.abs(tx.amount).toFixed(2)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-[#040042]/60 text-sm">{tx.date}</span>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      {/* Transaction Receipt Drawer */}
      <TransactionReceiptDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}
