import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Plus, Search, Filter, ChevronDown, Loader2, Bot, AlertTriangle, HelpCircle, Rss, List } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SmartLibraryTable } from "@/components/dashboard/SmartLibraryTable";
import { SourcesView } from "@/components/dashboard/SourcesView";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Asset, AccessType } from "@/types/asset";

// API response type from content-sources/me/assets
interface ApiAsset {
  id: string;
  title: string;
  description?: string;
  humanPrice?: number;
  aiPrice?: number;
  accessType?: string;
  licensingEnabled?: boolean;
  totalRevenue?: number;
  createdAt?: string;
  sourceUrl?: string;
  sourceId?: string;
  verificationToken?: string;
  verificationStatus?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
}

// Map API asset to UI format
const mapApiAssetToUiAsset = (apiAsset: ApiAsset): Asset => {
  let licenseType: AccessType = "human";
  if (apiAsset.accessType === "both" || apiAsset.accessType === "human" || apiAsset.accessType === "ai") {
    licenseType = apiAsset.accessType;
  } else {
    const hasHuman = (apiAsset.humanPrice ?? 0) > 0;
    const hasAi = (apiAsset.aiPrice ?? 0) > 0;
    if (hasHuman && hasAi) licenseType = "both";
    else if (hasAi) licenseType = "ai";
  }

  let status: "active" | "pending" | "minted" = "pending";
  if (apiAsset.licensingEnabled) {
    status = (apiAsset.totalRevenue ?? 0) > 0 ? "minted" : "active";
  }

  const hasSourceId = !!apiAsset.sourceId;

  return {
    id: apiAsset.id,
    title: apiAsset.title,
    licenseType,
    status,
    revenue: apiAsset.totalRevenue ?? 0,
    createdAt: apiAsset.createdAt?.split("T")[0] ?? "",
    format: hasSourceId ? "publication" : "single",
    sourceUrl: apiAsset.sourceUrl,
    source_id: apiAsset.sourceId,
    verification_token: apiAsset.verificationToken,
    verification_status: (apiAsset.verificationStatus as "pending" | "verified") ?? "pending",
    content_hash: apiAsset.contentHash,
    metadata: apiAsset.metadata,
    description: apiAsset.description,
  };
};

type StatusFilter = "all" | "active" | "pending" | "minted";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { contentSources, licenses } = useAuthenticatedApi();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"choice" | "publication" | "single">("choice");
  const [registryTab, setRegistryTab] = useState<"sources" | "library">("sources");
  const [sourceLookup, setSourceLookup] = useState<Record<string, string>>({});
  const [sourceList, setSourceList] = useState<{ id: string; name: string }[]>([]);

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

  const fetchAssets = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      
      // Fetch sources and assets independently so one failure doesn't block the other
      const sourcesPromise = supabase.from("rss_sources").select("id, name").eq("user_id", user.id);
      let assetsData: ApiAsset[] | null = null;
      try {
        assetsData = await contentSources.listAssets<ApiAsset[]>();
      } catch (apiErr) {
        console.warn("[Dashboard] API assets fetch failed (non-blocking):", apiErr);
      }

      const sourcesResult = await sourcesPromise;
      const sources = sourcesResult.data || [];
      const lookup: Record<string, string> = {};
      sources.forEach((s) => { lookup[s.id] = s.name; });
      setSourceLookup(lookup);
      setSourceList(sources);
      
      console.log("[Dashboard] API returned", assetsData?.length || 0, "assets,", sources.length, "sources");
      const mappedAssets: Asset[] = (assetsData || []).map((item) => mapApiAssetToUiAsset(item));
      setAssets(mappedAssets);
    } catch (err) {
      console.error("Error fetching assets:", err);
      toast({
        title: "Connection Error",
        description: "Failed to load assets. Please try again.",
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
      await licenses.delete(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "License Removed", description: "The license has been deleted from your library" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "Delete Failed", description: "Could not remove the license. Please try again.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => licenses.delete(id)));
      setAssets((prev) => prev.filter((a) => !ids.includes(a.id)));
      toast({ title: "Assets Removed", description: `${ids.length} assets have been deleted` });
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast({ title: "Bulk Delete Failed", description: "Could not remove the assets. Please try again.", variant: "destructive" });
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSource = sourceFilter === "all" || 
      (sourceFilter === "direct" ? !a.source_id : a.source_id === sourceFilter);
    return matchesSearch && matchesStatus && matchesSource;
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
              <h1 className="text-xl font-bold text-[#040042]">Registry</h1>
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
              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors cursor-pointer">
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="w-5 h-5 rounded-full bg-amber-100/80 flex items-center justify-center hover:bg-amber-200 transition-colors">
                        <HelpCircle size={12} className="text-amber-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      <p>Revenue lost to unlicensed AI scraping. Mint your assets to enable billing.</p>
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

          {/* Sources / Library Sub-tabs */}
          <Tabs value={registryTab} onValueChange={(v) => setRegistryTab(v as "sources" | "library")} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="bg-gray-100 border border-gray-200 p-1 rounded-xl">
                <TabsTrigger
                  value="sources"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm rounded-lg px-5 py-2 text-sm font-medium text-[#040042]/60 transition-all gap-2"
                >
                  <Rss size={15} />
                  Sources
                </TabsTrigger>
                <TabsTrigger
                  value="library"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm rounded-lg px-5 py-2 text-sm font-medium text-[#040042]/60 transition-all gap-2"
                >
                  <List size={15} />
                  Library
                </TabsTrigger>
              </TabsList>

              {registryTab === "library" && (
                <span className="text-sm text-[#040042]/50">{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Sources Tab */}
            <TabsContent value="sources" className="mt-4">
              <SourcesView onAddSource={openPublicationSync} />
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library" className="mt-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8F2FB] rounded-xl text-sm text-[#040042] hover:border-[#4A26ED]/40 transition-all">
                      <Filter size={16} className="text-[#040042]/50" />
                      <span className="font-medium">{getFilterLabel(statusFilter)}</span>
                      <ChevronDown size={14} className="text-[#040042]/50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white border-[#E8F2FB] shadow-lg rounded-xl w-40">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")} className={`cursor-pointer rounded-lg ${statusFilter === "all" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>All Assets</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("active")} className={`cursor-pointer rounded-lg ${statusFilter === "active" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("pending")} className={`cursor-pointer rounded-lg ${statusFilter === "pending" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("minted")} className={`cursor-pointer rounded-lg ${statusFilter === "minted" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                      <span className="w-2 h-2 rounded-full bg-[#4A26ED] mr-2" />Minted
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Source Filter */}
                {sourceList.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8F2FB] rounded-xl text-sm text-[#040042] hover:border-[#4A26ED]/40 transition-all">
                        <Rss size={16} className="text-[#040042]/50" />
                        <span className="font-medium truncate max-w-[120px]">
                          {sourceFilter === "all" ? "All Sources" : sourceFilter === "direct" ? "Direct Upload" : sourceLookup[sourceFilter] || "Source"}
                        </span>
                        <ChevronDown size={14} className="text-[#040042]/50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-white border-[#E8F2FB] shadow-lg rounded-xl w-48">
                      <DropdownMenuItem onClick={() => setSourceFilter("all")} className={`cursor-pointer rounded-lg ${sourceFilter === "all" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>All Sources</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSourceFilter("direct")} className={`cursor-pointer rounded-lg ${sourceFilter === "direct" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>Direct Upload</DropdownMenuItem>
                      {sourceList.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => setSourceFilter(s.id)} className={`cursor-pointer rounded-lg truncate ${sourceFilter === s.id ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                          {s.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Table */}
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
                  onVerify={() => fetchAssets()}
                  isLoading={isLoading}
                  onAddClick={openRegisterModal}
                  onSyncClick={openPublicationSync}
                  onRegisterClick={openSingleWork}
                  sourceLookup={sourceLookup}
                  showPulse={assets.length === 0 && !isLoading}
                />
              )}
            </TabsContent>
          </Tabs>
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
