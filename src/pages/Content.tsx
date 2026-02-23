import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Filter, ChevronDown, Rss, CheckSquare, ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Handshake } from "lucide-react";
import { ImportProgressBanner } from "@/components/dashboard/ImportProgressBanner";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AssetGrid } from "@/components/dashboard/AssetGrid";
import { AssetDetailDrawer } from "@/components/dashboard/AssetDetailDrawer";
import { RegisterContentModal } from "@/components/dashboard/RegisterContentModal";
import { FloatingPriceBar } from "@/components/dashboard/FloatingPriceBar";
import { BulkPricingModal } from "@/components/dashboard/BulkPricingModal";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Asset, PaginatedResponse } from "@/types/asset";
import { mapDbAssetToUiAsset, DbAsset } from "@/types/asset";

type StatusFilter = "all" | "protected" | "syncing" | "pending" | "failed";

export default function Content() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const { licenses } = useAuthenticatedApi();
  const PAGE_SIZE = 30;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<"choice" | "publication" | "single" | "enterprise">("choice");
  const [modalKey, setModalKey] = useState(0);
  const [sourceLookup, setSourceLookup] = useState<Record<string, string>>({});
  const [platformLookup, setPlatformLookup] = useState<Record<string, string>>({});
  const [sourceList, setSourceList] = useState<{ id: string; name: string }[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAssetDetailsOpen, setIsAssetDetailsOpen] = useState(false);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // (Sitemap import state removed — now handled inside RegisterContentModal)

  const [activeImport, setActiveImport] = useState<{ status: string; inserted_count: number; total_urls: number } | null>(null);
  const [publisherPlan, setPublisherPlan] = useState<string | null>(null);
  const [articleCount, setArticleCount] = useState(0);

  const fetchPublisherPlan = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const pub = result.data.publisher || result.data;
        const stats = result.data.stats || {};
        setPublisherPlan(pub.plan || "free");
        setArticleCount(stats.article_count ?? pub.article_count ?? 0);
      }
    } catch (err) {
      console.warn("[Content] Plan fetch failed:", err);
    }
  }, [getAccessToken]);

  const fetchActiveImport = useCallback(async () => {
    if (!user) return;
    try {
      const { data: pub } = await (supabase.from as any)("publishers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!pub) return;
      const { data } = await (supabase.from as any)("import_queue")
        .select("status, inserted_count, total_urls, created_at")
        .eq("publisher_id", pub.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data && (data.status === "processing" || data.status === "done")) {
        setActiveImport(data as any);
      }
    } catch {
      // No import queue records
    }
  }, [user]);


  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const openRegisterModal = () => {
    setModalKey(k => k + 1);
    setModalInitialView("choice");
    setIsAddModalOpen(true);
  };

  const fetchSources = useCallback(async () => {
    if (!user) return;
    const sourcesResult = await supabase
      .from("rss_sources")
      .select("id, name, platform")
      .eq("user_id", user.id);

    const sources = sourcesResult.data || [];
    const lookup: Record<string, string> = {};
    const platLookup: Record<string, string> = {};
    sources.forEach((s) => { lookup[s.id] = s.name; platLookup[s.id] = s.platform || ""; });
    setSourceLookup(lookup);
    setPlatformLookup(platLookup);
    setSourceList(sources);
  }, [user]);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const result = await licenses.list<PaginatedResponse<DbAsset>>({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        source_id: sourceFilter !== "all" ? sourceFilter : undefined,
      });
      const mappedAssets: Asset[] = (Array.isArray(result.data) ? result.data : []).map((item: any) => mapDbAssetToUiAsset(item as DbAsset));
      setAssets(mappedAssets);
      setTotalAssets(result.total);
    } catch (err: any) {
      console.warn("[Content] Fetch error:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, debouncedSearch, statusFilter, sourceFilter, licenses]);

  useEffect(() => { fetchSources(); }, [fetchSources]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, sourceFilter]);
  useEffect(() => { fetchActiveImport(); }, [fetchActiveImport]);
  useEffect(() => { fetchPublisherPlan(); }, [fetchPublisherPlan]);

  if (!user) return null;

  const totalPages = Math.ceil(totalAssets / PAGE_SIZE);

  const getFilterLabel = (filter: StatusFilter) => {
    switch (filter) {
      case "all": return "All Assets";
      case "protected": return "Protected";
      case "syncing": return "Syncing";
      case "pending": return "Pending";
      case "failed": return "Failed";
    }
  };

  return (
    <DashboardLayout title="Content" subtitle="Manage your registered articles and content sources">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">

        {/* Import Progress Banner */}
        <ImportProgressBanner onComplete={fetchAssets} />

        {/* Article Usage Bar (Free plan only) */}
        {publisherPlan === "free" && (
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className={`h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all ${
                    articleCount >= 100 ? "bg-[#EF4444]" : articleCount >= 80 ? "bg-[#F59E0B]" : "bg-[#4A26ED]"
                  }`}
                  style={{ width: `${Math.min(100, (articleCount / 100) * 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-xs whitespace-nowrap ${
              articleCount >= 100 ? "text-red-600" : articleCount >= 80 ? "text-amber-600" : "text-slate-500"
            }`}>
              {articleCount} / 100 articles used
            </span>
            <Link to="/pricing" className="text-xs font-medium text-[#4A26ED] hover:underline whitespace-nowrap">
              Upgrade for unlimited →
            </Link>
          </div>
        )}

        {/* Top bar: Select + Register */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant={selectionMode ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                if (selectionMode) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              className={`h-8 text-xs gap-1.5 rounded-lg border ${
                selectionMode
                  ? "bg-[#4A26ED] hover:bg-[#3B1ED1] text-white border-transparent"
                  : "border-[#E8F2FB] text-slate-400 hover:bg-transparent hover:text-[#040042] hover:border-[#040042]"
              }`}
            >
              <CheckSquare size={14} />
              {selectionMode ? `${selectedIds.size} Selected` : "Select"}
            </Button>
            <span className="text-sm text-[#040042]/50">{totalAssets} asset{totalAssets !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openRegisterModal}
              className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white h-9 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              Register Content
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40" size={18} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
              <DropdownMenuItem onClick={() => setStatusFilter("protected")} className={`cursor-pointer rounded-lg ${statusFilter === "protected" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />Protected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("syncing")} className={`cursor-pointer rounded-lg ${statusFilter === "syncing" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                <span className="w-2 h-2 rounded-full bg-[#4A26ED] mr-2" />Syncing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")} className={`cursor-pointer rounded-lg ${statusFilter === "pending" ? "bg-[#4A26ED]/5 text-[#4A26ED]" : ""}`}>
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />Pending
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

        {/* Asset Grid */}
        <AssetGrid
          assets={assets}
          onViewDetails={(asset) => {
            setSelectedAsset(asset);
            setIsAssetDetailsOpen(true);
          }}
          isLoading={isLoading}
          sourceLookup={sourceLookup}
          platformLookup={platformLookup}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          selectionMode={selectionMode}
        />

        {/* Pagination */}
        {totalAssets > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-[#040042]/50">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalAssets)} of {totalAssets}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 rounded-lg border-[#E8F2FB] text-[#040042]/60"
              >
                <ChevronLeft size={14} className="mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium px-3 text-[#040042]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-lg border-[#E8F2FB] text-[#040042]/60"
              >
                Next
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Price Bar */}
      <FloatingPriceBar
        selectedCount={selectedIds.size}
        onSetPrices={() => setIsPricingModalOpen(true)}
        onClearSelection={clearSelection}
      />

      {/* Bulk Pricing Modal */}
      <BulkPricingModal
        open={isPricingModalOpen}
        onOpenChange={setIsPricingModalOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => {
          clearSelection();
          fetchAssets();
        }}
      />

      {/* Register Content Modal */}
      <RegisterContentModal
        key={modalKey}
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        initialView={modalInitialView}
        onSuccess={() => {
          fetchAssets();
          toast({
            title: "Content Protected",
            description: "Your content has been registered and synced to your library",
          });
        }}
      />

      {/* Asset Detail Slide-over */}
      <AssetDetailDrawer
        asset={selectedAsset}
        open={isAssetDetailsOpen}
        onOpenChange={setIsAssetDetailsOpen}
        platform={selectedAsset?.source_id ? platformLookup[selectedAsset.source_id] : undefined}
        onSetLicenseTerms={(asset) => {
          setIsAssetDetailsOpen(false);
          setSelectedAsset(asset);
          setSelectedIds(new Set([asset.id]));
          setIsPricingModalOpen(true);
        }}
      />

    </DashboardLayout>
  );
}
