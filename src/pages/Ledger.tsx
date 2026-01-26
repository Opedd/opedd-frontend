import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TransactionReceiptDrawer } from "@/components/dashboard/TransactionReceiptDrawer";
import { 
  Wallet, 
  TrendingUp, 
  FileCheck, 
  Sparkles, 
  User, 
  Link2,
  Shield,
  ArrowUpRight
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

export default function Ledger() {
  const { user } = useAuth();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDrawerOpen(true);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">
            Settled
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-50 font-medium">
            Processing
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

  // Calculate totals from mock data
  const lifetimeEarnings = mockTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const settledAmount = mockTransactions
    .filter(t => t.status === "settled" && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const pendingAmount = mockTransactions
    .filter(t => t.status === "processing" && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const activeLicenses = mockTransactions.filter(t => 
    t.type !== "payout" && t.status === "settled"
  ).length;

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-[#4A26ED]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Revenue Ledger</h1>
              <p className="text-[#040042]/60 text-sm">IP licensing revenue & Story Protocol settlements</p>
            </div>
          </div>

          {/* Metric Cards - 3 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lifetime Earnings */}
            <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4A26ED]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={24} className="text-white/80" />
                  <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">All Time</span>
                </div>
                <p className="text-white/70 text-sm font-medium">Lifetime Earnings</p>
                <p className="text-3xl font-bold mt-1">${lifetimeEarnings.toFixed(2)}</p>
              </div>
            </div>

            {/* Story Protocol Balance */}
            <div className="bg-white rounded-2xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Shield size={24} className="text-[#4A26ED]" />
                <span className="text-xs font-medium bg-[#4A26ED]/10 text-[#4A26ED] px-2.5 py-1 rounded-full">
                  Story Protocol
                </span>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Protocol Balance</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-3xl font-bold text-[#040042]">${settledAmount.toFixed(2)}</p>
                <span className="text-sm text-emerald-600 font-medium">Settled</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-amber-600 font-medium">${pendingAmount.toFixed(2)} Pending</span>
              </div>
            </div>

            {/* Active Licenses */}
            <div className="bg-white rounded-2xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <FileCheck size={24} className="text-[#4A26ED]" />
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Active</span>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Active Licenses</p>
              <p className="text-3xl font-bold text-[#040042] mt-1">{activeLicenses}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#4A26ED]" />
                  <span className="text-[#040042]/60">AI: 3</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[#D1009A]" />
                  <span className="text-[#040042]/60">Human: 2</span>
                </span>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-2xl border border-[#E8F2FB] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#E8F2FB]">
              <h2 className="font-bold text-[#040042] text-lg">Transaction History</h2>
              <p className="text-sm text-[#040042]/60">All IP licensing activity and protocol settlements</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-[#E8F2FB] bg-slate-50/50">
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Associated Asset</TableHead>
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[#040042]/70 text-xs font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((tx) => (
                  <TableRow 
                    key={tx.id} 
                    className="border-[#E8F2FB] cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => handleRowClick(tx)}
                  >
                    <TableCell>
                      {getTypeIcon(tx.type)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#040042] text-sm">{tx.description}</span>
                        {tx.fromDirectLink && (
                          <Badge className="bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-50 text-xs px-1.5 py-0 h-5">
                            <Link2 size={10} className="mr-1" />
                            Direct
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tx.assetTitle ? (
                        <span className="text-[#040042]/80 text-sm">{tx.assetTitle}</span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#040042]/60 text-sm">{tx.date}</TableCell>
                    <TableCell>
                      {getStatusBadge(tx.status)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${
                      tx.amount > 0 ? "text-emerald-600" : "text-[#040042]"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <TransactionReceiptDrawer
        transaction={selectedTransaction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
