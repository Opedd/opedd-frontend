import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Plus, Search } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AddAssetDialog } from "@/components/dashboard/AddAssetDialog";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assets, setAssets] = useState<Array<{ title: string; description: string; licenseType: string }>>([]);

  if (!user) return null;

  const handleAddAsset = async (data: { title: string; description: string; licenseType: string }) => {
    // TODO: Integrate with backend API
    setAssets((prev) => [...prev, data]);
    toast({
      title: "Asset Registered",
      description: `"${data.title}" has been added to your Smart Library`,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F2F9FF] text-[#040042] overflow-hidden selection:bg-[#4A26ED]/20">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader />

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Page Title & Action */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-[#4A26ED]">
                <LayoutDashboard size={28} strokeWidth={2} />
                <h1 className="text-3xl font-bold tracking-tight text-[#040042]">
                  Smart Library
                </h1>
              </div>
              <p className="text-[#040042]/60 font-medium">
                Manage your content assets and licensing
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#D1009A] hover:bg-[#B8008A] text-white h-14 px-8 rounded-2xl font-semibold shadow-lg shadow-[#D1009A]/25 flex items-center gap-3 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Plus size={20} />
              Add New Asset
            </button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard label="Total Assets" value={assets.length.toString()} />
            <MetricCard label="Active Licenses" value="0" accentColor="oxford" />
            <MetricCard label="Total Revenue" value="$0.00" accentColor="plum" />
          </div>

          {/* Search */}
          <div className="relative group max-w-2xl">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#040042]/40 group-focus-within:text-[#4A26ED] transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full bg-white border border-[#040042]/10 rounded-2xl py-4 pl-14 pr-6 text-[#040042] placeholder:text-[#040042]/40 focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:border-[#4A26ED]/40 transition-all shadow-md"
            />
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset List or Empty State */}
            <div className="lg:col-span-2">
              {assets.length === 0 ? (
                <EmptyState onAddClick={() => setIsAddModalOpen(true)} />
              ) : (
                <div className="space-y-4">
                  {assets.map((asset, index) => (
                    <div
                      key={index}
                      className="bg-white border border-[#040042]/5 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
                    >
                      <h3 className="text-[#040042] font-semibold text-lg">{asset.title}</h3>
                      <p className="text-[#040042]/60 text-sm mt-1">{asset.description || "No description"}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#F2F9FF] text-[#4A26ED] text-xs font-medium rounded-full">
                          {asset.licenseType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>

      {/* Add Asset Dialog */}
      <AddAssetDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddAsset}
      />
    </div>
  );
}
