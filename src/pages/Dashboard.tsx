import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { contentSourcesApi } from "@/lib/api";
import { LayoutDashboard, Plus, Search, Filter, ChevronDown, Loader2, Bot, AlertTriangle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SmartLibraryTable } from "@/components/dashboard/SmartLibraryTable";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Asset, DbAsset, mapDbAssetToUiAsset } from "@/types/asset";

type StatusFilter = "all" | "active" | "pending" | "minted";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"choice" | "publication" | "single">("choice");

  // Handlers to open specific modal views
  const openPublicationSync = () => {
    setModalInitialView("publication");
    setIsAddModalOpen(true);
  };

  const openSingleWork = () => {
    setModalInitialView("single");
    setIsAddModalOpen(true);
  };

  const openRegisterModal = () => {
    setModalInitialView("choice");
    setIsAddModalOpen(true);
  };

  // Fetch licenses directly from Supabase assets table
  // The table is named "assets" in the database but represents "licenses" in our domain
  const fetchAssets = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch directly from Supabase assets table (which stores licenses)
      // Field mapping: publication_id → source_id (in UI), asset_id → license_id (in transactions)
      const { data, error } = await supabase
        .from("assets")
        .select(`
          id,
          title,
          description,
          human_price,
          ai_price,
          license_type,
          licensing_enabled,
          total_revenue,
          created_at,
          source_url,
          content,
          user_id,
          publication_id,
          verification_token,
          verification_status,
          content_hash,
          metadata
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching licenses:", error);
        toast({
          title: "Connection Error",
          description: "Failed to load licenses from the database",
          variant: "destructive",
        });
        return;
      }

      console.log("[Dashboard] Supabase returned", data?.length || 0, "licenses");
      
      // Map DB assets to UI format - filter out any null/undefined entries
      // publication_id maps to source_id in the UI
      const mappedAssets = (data || [])
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map((item) => mapDbAssetToUiAsset(item as DbAsset));
      setAssets(mappedAssets);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Connection Error",
        description: "Unable to reach the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [user]);

  if (!user) return null;

  const handleDelete = async (id: string) => {
    try {
      // Delete from assets table (licenses)
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Delete Failed",
          description: "Could not remove the license. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast({
        title: "License Removed",
        description: "The license has been deleted from your library",
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Connection Error",
        description: "Unable to delete license. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Bulk Delete Failed",
          description: "Could not remove the assets. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setAssets((prev) => prev.filter((a) => !ids.includes(a.id)));
      toast({
        title: "Assets Removed",
        description: `${ids.length} assets have been deleted`,
      });
    } catch (err) {
      console.error("Bulk delete error:", err);
    }
  };

  // Apply search and status filters
  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = assets.reduce((sum, a) => sum + a.revenue, 0);
  const activeCount = assets.filter((a) => a.status === "active").length;

  const getFilterLabel = (filter: StatusFilter) => {
    switch (filter) {
      case "all": return "All Assets";
      case "active": return "Active";
      case "pending": return "Pending";
      case "minted": return "Minted";
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-[#040042] overflow-hidden">
      <DashboardSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-white">
        <DashboardHeader />

        <div className="p-6 pt-20 lg:pt-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Page Title & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={22} className="text-[#4A26ED]" />
              <h1 className="text-xl font-bold text-[#040042]">Licensing Hub</h1>
            </div>

            <button
              onClick={openRegisterModal}
              className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white h-10 px-5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#4A26ED]/20"
            >
              <Plus size={18} />
              Register Content
            </button>
          </div>

          {/* Compact Metrics */}
          <TooltipProvider>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[#040042]/60 text-xs font-medium uppercase tracking-wide">Total Assets</p>
                <p className="text-2xl font-bold text-[#040042] mt-1">{assets.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[#4A26ED] text-xs font-medium uppercase tracking-wide">Active Licenses</p>
                <p className="text-2xl font-bold text-[#040042] mt-1">{activeCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-[#D1009A] text-xs font-medium uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-[#040042] mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
              {/* Unlicensed AI Scrapes Card with Help Tooltip */}
              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors cursor-pointer">
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-5 h-5 rounded-full bg-amber-100/80 flex items-center justify-center hover:bg-amber-200 transition-colors">
                        <HelpCircle size={12} className="text-amber-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p>This shows revenue lost to unlicensed AI scraping. Mint your assets to enable billing.</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Bot size={14} className="text-amber-600" />
                  </div>
                </div>
                <p className="text-amber-600 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Unlicensed AI Scrapes
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">142</p>
                <p className="text-[10px] text-amber-500/70 mt-1">This week</p>
              </div>
            </div>
          </TooltipProvider>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40" size={18} />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E8F2FB] rounded-xl py-2.5 pl-11 pr-4 text-sm text-[#040042] placeholder:text-[#040042]/40 focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:border-[#4A26ED]/40 transition-all"
              />
            </div>

            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8F2FB] rounded-xl text-sm text-[#040042] hover:border-[#4A26ED]/40 transition-all">
                  <Filter size={16} className="text-[#040042]/50" />
                  <span className="font-medium">{getFilterLabel(statusFilter)}</span>
                  <ChevronDown size={14} className="text-[#040042]/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border-[#E8F2FB] shadow-lg rounded-xl w-40">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className={`cursor-pointer rounded-lg ${statusFilter === "all" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}
                >
                  All Assets
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("active")}
                  className={`cursor-pointer rounded-lg ${statusFilter === "active" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("pending")}
                  className={`cursor-pointer rounded-lg ${statusFilter === "pending" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("minted")}
                  className={`cursor-pointer rounded-lg ${statusFilter === "minted" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#4A26ED] mr-2" />
                  Minted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content Area - Full Width Table */}
          <div className="space-y-3">
            <TooltipProvider>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#040042]">Licensing Hub</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-5 h-5 rounded-full bg-[#F2F9FF] flex items-center justify-center hover:bg-[#E8F2FB] transition-colors">
                        <HelpCircle size={12} className="text-[#040042]/50" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p>Your registered content assets. Enable licensing to monetize from human citations and AI model access.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
            {filteredAssets.length === 0 && assets.length > 0 && !isLoading ? (
              <div className="bg-white rounded-xl border border-[#E8F2FB] p-8 text-center">
                <p className="text-[#040042]/60 text-sm">
                  {searchQuery ? "No assets match your search" : "No assets match this filter"}
                </p>
              </div>
            ) : (
              <SmartLibraryTable 
                assets={filteredAssets} 
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                onVerify={(id) => {
                  // Refresh assets after verification attempt
                  fetchAssets();
                }}
                isLoading={isLoading}
                onAddClick={openRegisterModal}
                onSyncClick={openPublicationSync}
                onRegisterClick={openSingleWork}
                showPulse={assets.length === 0 && !isLoading}
              />
            )}
          </div>
        </div>
      </main>

      {/* Register Content Modal */}
      <RegisterContentModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        initialView={modalInitialView}
        checkIntegrations={modalInitialView === "publication"}
        onSuccess={() => {
          fetchAssets();
          toast({
            title: "Data Sync Successful",
            description: "Your content has been registered and synced to the database",
          });
        }}
      />
    </div>
  );
}
