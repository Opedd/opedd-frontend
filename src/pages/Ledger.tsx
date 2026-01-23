import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Wallet, TrendingUp, Clock, FileCheck, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockTransactions = [
  { id: "1", type: "royalty", description: "AI Training License - GPT-4", amount: 49.99, date: "2025-01-23", status: "completed" },
  { id: "2", type: "royalty", description: "Human Access - Article View", amount: 4.99, date: "2025-01-22", status: "completed" },
  { id: "3", type: "payout", description: "Monthly Payout to Stripe", amount: -250.00, date: "2025-01-20", status: "completed" },
  { id: "4", type: "royalty", description: "AI Training License - Claude", amount: 49.99, date: "2025-01-19", status: "pending" },
  { id: "5", type: "royalty", description: "Human Access - Article View", amount: 4.99, date: "2025-01-18", status: "completed" },
];

export default function Ledger() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#D1009A]/10 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-[#D1009A]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Revenue Ledger</h1>
              <p className="text-[#040042]/60 text-sm">Track your earnings and payouts</p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lifetime Earnings */}
            <div className="bg-gradient-to-br from-[#D1009A] to-[#9B0073] rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={24} className="text-white/80" />
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">All Time</span>
              </div>
              <p className="text-white/70 text-sm font-medium">Lifetime Earnings</p>
              <p className="text-3xl font-bold mt-1">$1,247.50</p>
            </div>

            {/* Pending Payouts */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Clock size={24} className="text-[#4A26ED]" />
                <span className="text-xs font-medium bg-[#4A26ED]/10 text-[#4A26ED] px-2 py-1 rounded-full">Pending</span>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Pending Payouts</p>
              <p className="text-3xl font-bold text-[#040042] mt-1">$149.97</p>
            </div>

            {/* Active Licenses */}
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <FileCheck size={24} className="text-[#4A26ED]" />
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Active</span>
              </div>
              <p className="text-[#040042]/60 text-sm font-medium">Active Licenses</p>
              <p className="text-3xl font-bold text-[#040042] mt-1">12</p>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm">
            <div className="p-6 border-b border-[#E8F2FB]">
              <h2 className="font-semibold text-[#040042]">Transaction History</h2>
              <p className="text-sm text-[#040042]/60">All licensing activity and payouts</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-[#E8F2FB]">
                  <TableHead className="text-[#040042]/60 text-xs font-medium">Type</TableHead>
                  <TableHead className="text-[#040042]/60 text-xs font-medium">Description</TableHead>
                  <TableHead className="text-[#040042]/60 text-xs font-medium">Date</TableHead>
                  <TableHead className="text-[#040042]/60 text-xs font-medium">Status</TableHead>
                  <TableHead className="text-[#040042]/60 text-xs font-medium text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-[#E8F2FB]">
                    <TableCell>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === "royalty" ? "bg-emerald-100" : "bg-amber-100"
                      }`}>
                        {tx.type === "royalty" ? (
                          <ArrowDownLeft size={16} className="text-emerald-600" />
                        ) : (
                          <ArrowUpRight size={16} className="text-amber-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-[#040042] text-sm">{tx.description}</TableCell>
                    <TableCell className="text-[#040042]/60 text-sm">{tx.date}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        tx.status === "completed" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {tx.status}
                      </span>
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
    </div>
  );
}
