import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/card"; // Using Shadcn UI
import { LayoutDashboard, Wallet, Zap, Settings, Plus, Search, ChevronRight, X } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#06061a] text-white overflow-hidden selection:bg-blue-500/30">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#06061e] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-[#5d5dff] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-transform">
              <span className="font-bold text-xl">o</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">opedd</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Assets" active />
          <NavItem icon={<Wallet size={20} />} label="Ledger" />
          <NavItem icon={<Zap size={20} />} label="Integrations" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-gradient-to-b from-[#080825] to-[#06061a]">
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 sticky top-0 bg-[#06061a]/60 backdrop-blur-xl z-20">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Publisher Portal</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#12123d] rounded-full border border-white/10 hover:border-white/20 transition-all cursor-default">
              <div className="w-7 h-7 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                A
              </div>
              <span className="text-xs font-medium text-gray-300">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-red-400 text-xs transition-colors"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </header>

        <div className="p-10 max-w-7xl w-full mx-auto space-y-10">
          {/* Header & Interaction */}
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[#5d5dff] animate-in fade-in slide-in-from-left-4 duration-500">
                <LayoutDashboard size={32} strokeWidth={2.5} />
                <h1 className="text-4xl font-black tracking-tight">Smart Library</h1>
              </div>
              <p className="text-gray-400 font-medium">Manage your content assets and licensing</p>
            </div>

            {/* The "Action" Button */}
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#5d5dff] hover:bg-[#4a4aff] text-white h-14 px-8 rounded-2xl font-bold shadow-xl shadow-blue-500/25 flex items-center gap-3 transform transition-all hover:-translate-y-1 active:scale-95"
            >
              <Plus size={22} />
              Add New Asset
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard label="Total Assets" value="0" />
            <StatCard label="Active Licenses" value="0" color="text-[#5d5dff]" />
            <StatCard label="Total Revenue" value="$0.00" color="text-[#ff3b8d]" />
          </div>

          {/* Search */}
          <div className="relative group max-w-2xl">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#5d5dff] transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full bg-[#11113a] border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#5d5dff]/20 focus:border-[#5d5dff]/40 transition-all shadow-2xl"
            />
          </div>

          {/* Placeholder for Content */}
          <div
            className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-[#11113a]/20 group hover:bg-[#11113a]/30 transition-all cursor-pointer"
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="p-6 bg-[#11113a] rounded-3xl border border-white/5 shadow-2xl mb-6 group-hover:scale-110 transition-transform">
              <LayoutDashboard size={48} className="text-gray-600 group-hover:text-[#5d5dff] transition-colors" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No assets yet. Add your first content asset!</p>
          </div>
        </div>
      </main>

      {/* --- ADD ASSET MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#11113a] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Add New Asset</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Asset Title</label>
                <input
                  className="w-full bg-[#06061a] border border-white/5 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#5d5dff]/40"
                  placeholder="e.g. Cyberpunk Texture Pack"
                />
              </div>
              <Button
                className="w-full bg-[#5d5dff] h-14 rounded-xl font-bold text-lg"
                onClick={() => setIsAddModalOpen(false)}
              >
                Register Asset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components for cleaner code
function NavItem({ icon, label, active = false }: { icon: any; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer group ${active ? "bg-[#12123d] text-[#5d5dff] border border-white/5" : "text-gray-400 hover:bg-white/5"}`}
    >
      {icon}
      <span className={`font-semibold text-sm ${active ? "" : "group-hover:text-white"}`}>{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-40" />}
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#11113a] border border-white/5 p-8 rounded-[2rem] shadow-2xl hover:border-white/10 transition-colors group">
      <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-widest">{label}</p>
      <p
        className={`text-5xl font-black ${color} tracking-tighter group-hover:scale-105 transition-transform origin-left`}
      >
        {value}
      </p>
    </div>
  );
}
