import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SmartLibraryTable } from "@/components/dashboard/SmartLibraryTable";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  title: string;
  licenseType: "human" | "ai" | "both";
  status: "active" | "pending" | "minted";
  revenue: number;
  createdAt: string;
}

const mockAssets: Asset[] = [
  { id: "1", title: "The Future of AI Governance", licenseType: "both", status: "active", revenue: 124.50, createdAt: "2025-01-20" },
  { id: "2", title: "Understanding Machine Learning", licenseType: "ai", status: "minted", revenue: 89.99, createdAt: "2025-01-18" },
  { id: "3", title: "Content Monetization Strategies", licenseType: "human", status: "pending", revenue: 0, createdAt: "2025-01-15" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const handleDelete = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: "Asset Removed",
      description: "The asset has been deleted from your library",
    });
  };

  const filteredAssets = assets.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = assets.reduce((sum, a) => sum + a.revenue, 0);
  const activeCount = assets.filter((a) => a.status === "active").length;

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Page Title & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={22} className="text-[#4A26ED]" />
              <h1 className="text-xl font-bold text-[#040042]">Smart Library</h1>
            </div>

            <Link
              to="/add-asset"
              className="bg-[#040042] hover:bg-[#0A0066] text-white h-10 px-5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus size={18} />
              Add Asset
            </Link>
          </div>

          {/* Compact Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-4 shadow-sm">
              <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wide">Total Assets</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">{assets.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-4 shadow-sm">
              <p className="text-[#4A26ED] text-xs font-medium uppercase tracking-wide">Active Licenses</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">{activeCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E8F2FB] p-4 shadow-sm">
              <p className="text-[#D1009A] text-xs font-medium uppercase tracking-wide">Total Revenue</p>
              <p className="text-2xl font-bold text-[#040042] mt-1">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40" size={18} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8F2FB] rounded-xl py-2.5 pl-11 pr-4 text-sm text-[#040042] placeholder:text-[#040042]/40 focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:border-[#4A26ED]/40 transition-all"
            />
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Table */}
            <div className="lg:col-span-2">
              {filteredAssets.length === 0 && assets.length === 0 ? (
                <EmptyState onAddClick={() => {}} />
              ) : filteredAssets.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#E8F2FB] p-8 text-center">
                  <p className="text-[#040042]/60 text-sm">No assets match your search</p>
                </div>
              ) : (
                <SmartLibraryTable assets={filteredAssets} onDelete={handleDelete} />
              )}
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
