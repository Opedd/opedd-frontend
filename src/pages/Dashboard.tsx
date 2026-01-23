import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Wallet, Zap, Settings, Plus, Search, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#06061a] text-white overflow-hidden">
      {/* --- SIDEBAR NAV --- */}
      <aside className="w-64 bg-[#06061e] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5d5dff] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-xl">o</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">opedd</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-[#12123d] text-[#5d5dff] rounded-2xl border border-white/5 cursor-pointer">
            <LayoutDashboard size={20} />
            <span className="font-semibold text-sm">Assets</span>
            <ChevronRight size={14} className="ml-auto opacity-40" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-gray-400 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
            <Wallet size={20} className="group-hover:text-white" />
            <span className="font-medium text-sm group-hover:text-white">Ledger</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-gray-400 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
            <Zap size={20} className="group-hover:text-white" />
            <span className="font-medium text-sm group-hover:text-white">Integrations</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-gray-400 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group">
            <Settings size={20} className="group-hover:text-white" />
            <span className="font-medium text-sm group-hover:text-white">Settings</span>
          </div>
        </nav>
      </aside>

      {/* --- MAIN PORTAL --- */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-[#06061a]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">Publisher Portal</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#12123d] rounded-full border border-white/10">
              <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-inner">
                A
              </div>
              <span className="text-xs font-medium text-gray-300">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400 text-xs"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-10 max-w-7xl w-full mx-auto space-y-10">
          {/* Header Section */}
          <div className="flex items-end justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#5d5dff]">
                <LayoutDashboard size={32} strokeWidth={2.5} />
                <h1 className="text-4xl font-extrabold tracking-tight">Smart Library</h1>
              </div>
              <p className="text-gray-400 text-lg font-medium">Manage your content assets and licensing</p>
            </div>
            <Button className="bg-[#5d5dff] hover:bg-[#4a4aff] text-white h-14 px-8 rounded-2xl font-bold shadow-xl shadow-blue-500/20 flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Plus size={22} />
              Add New Asset
            </Button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#11113a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
              <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-tight">Total Assets</p>
              <p className="text-6xl font-black">0</p>
            </div>
            <div className="bg-[#11113a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
              <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-tight">Active Licenses</p>
              <p className="text-6xl font-black text-[#5d5dff]">0</p>
            </div>
            <div className="bg-[#11113a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
              <p className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-tight">Total Revenue</p>
              <p className="text-6xl font-black text-[#ff3b8d]">$0.00</p>
            </div>
          </div>

          {/* Search Bar - Custom Styled */}
          <div className="relative group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#5d5dff] transition-colors"
              size={24}
            />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full bg-[#11113a] border border-white/10 rounded-[1.5rem] py-6 pl-16 pr-6 text-white text-lg placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-[#5d5dff]/10 focus:border-[#5d5dff]/50 transition-all shadow-inner"
            />
          </div>

          {/* Content Body - Empty State */}
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-[#11113a]/30 space-y-6">
            <div className="p-6 bg-[#11113a] rounded-3xl border border-white/5 shadow-xl">
              <LayoutDashboard size={64} className="text-gray-700" />
            </div>
            <p className="text-gray-500 text-xl font-medium tracking-tight">
              No assets yet. Add your first content asset!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
