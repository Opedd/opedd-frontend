import React, { useState, useEffect, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, FileText, Loader2, Link2, MoreHorizontal, Check,
  Globe, Calendar, User, ExternalLink, Copy, X, AlertTriangle,
  ArrowUpDown, Download, Handshake, Upload, ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Asset, PaginatedResponse, DbAsset, mapDbAssetToUiAsset } from "@/types/asset";
import { BulkPricingModal } from "@/components/dashboard/BulkPricingModal";
import { IssueArchiveLicenseModal } from "@/components/dashboard/IssueArchiveLicenseModal";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";
import { formatUSD } from "@/lib/formatNumber";
import { Spinner } from "@/components/ui/Spinner";

function getPlatformLogo(url: string | undefined): string | null {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("substack.com")) return substackLogo;
  if (u.includes("ghost.io") || u.includes(".ghost.")) return ghostLogo;
  if (u.includes("beehiiv.com")) return beehiivLogo;
  if (u.includes("wordpress.com") || u.includes("wp.com")) return wordpressLogo;
  return null;
}

function formatDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return null; }
}

function getHostname(url: string | undefined): string {
  if (!url) return "Unknown";
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { return url; }
}

type StatusFilter = "all" | "active" | "pending" | "syncing" | "failed";
type SortKey = "title" | "revenue" | "status";
type SortDir = "asc" | "desc";

export default function Content() {
  useDocumentTitle("Catalog — Opedd");
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    if (tab === "archive-license" || tab === "substack") return tab;
    return "articles";
  });
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { licenses } = useAuthenticatedApi();
  const PAGE_SIZE = 50;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [sourceLookup, setSourceLookup] = useState<Record<string, string>>({});
  const [platformLookup, setPlatformLookup] = useState<Record<string, string>>({});
  const [sourceList, setSourceList] = useState<{ id: string; name: string }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPricingOpen, setBulkPricingOpen] = useState(false);

  // Detail drawer
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerCopied, setDrawerCopied] = useState(false);

  // Archive license modal
  const [archiveLicenseOpen, setArchiveLicenseOpen] = useState(false);

  // Substack import state
  const [substackFile, setSubstackFile] = useState<File | null>(null);
  const [substackLicensing, setSubstackLicensing] = useState(true);
  const [substackHumanPrice, setSubstackHumanPrice] = useState("");
  const [substackAiPrice, setSubstackAiPrice] = useState("");
  const [substackImporting, setSubstackImporting] = useState(false);

  // Pricing edit inside drawer
  const [editingRates, setEditingRates] = useState(false);
  const [rateHuman, setRateHuman] = useState("");
  const [rateAi, setRateAi] = useState("");
  const [savingRates, setSavingRates] = useState(false);

  const fetchSources = useCallback(async () => {
    if (!user) return;
    const sourcesResult = await (supabase as any)
      .from("content_sources").select("id, name, source_type").eq("user_id", user.id);
    const sources = sourcesResult.data || [];
    const lookup: Record<string, string> = {};
    const platLookup: Record<string, string> = {};
    sources.forEach((s: any) => { lookup[s.id] = s.name; platLookup[s.id] = s.source_type || ""; });
    setSourceLookup(lookup);
    setPlatformLookup(platLookup);
    setSourceList(sources as any);
  }, [user]);

  const fetchAssets = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setFetchError(false);
      const statusMap: Record<string, string> = { active: "protected", pending: "pending", syncing: "syncing", failed: "failed" };
      const result = await licenses.list<PaginatedResponse<DbAsset>>({
        page, limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusMap[statusFilter] : undefined,
        source_id: sourceFilter !== "all" ? sourceFilter : undefined,
      });
      const mapped: Asset[] = (Array.isArray(result.data) ? result.data : []).map((item: any) => mapDbAssetToUiAsset(item as DbAsset));
      setAssets(mapped);
      setTotalAssets(result.total);
    } catch (err: any) {
      console.warn("[Content] Fetch error:", err?.message || err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, debouncedSearch, statusFilter, sourceFilter, licenses]);

  useEffect(() => { fetchSources(); }, [fetchSources]);
  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, sourceFilter]);

  if (!user) return null;

  const totalPages = Math.max(1, Math.ceil(totalAssets / PAGE_SIZE));
  const sourceCount = sourceList.length;

  // Sort assets client-side
  const sortedAssets = [...assets].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "title") return a.title.localeCompare(b.title) * dir;
    if (sortKey === "revenue") return ((a.total_revenue ?? 0) - (b.total_revenue ?? 0)) * dir;
    if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
    return 0;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleCopyLink = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/l/${articleId}`);
    setCopiedId(articleId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDrawerCopy = () => {
    if (!selectedAsset) return;
    navigator.clipboard.writeText(`opedd.com/l/${selectedAsset.id}`);
    setDrawerCopied(true);
    setTimeout(() => setDrawerCopied(false), 1500);
  };

  const openDrawer = (asset: Asset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
    setDrawerCopied(false);
    setEditingRates(false);
  };

  const handleEditRates = () => {
    if (!selectedAsset) return;
    setRateHuman(selectedAsset.human_price != null ? String(selectedAsset.human_price) : "");
    setRateAi(selectedAsset.ai_price != null ? String(selectedAsset.ai_price) : "");
    setEditingRates(true);
  };

  const handleSaveRates = async () => {
    if (!selectedAsset) return;
    const newHuman = rateHuman !== "" ? parseFloat(rateHuman) : undefined;
    const newAi = rateAi !== "" ? parseFloat(rateAi) : undefined;
    if ((newHuman !== undefined && newHuman < 0) || (newAi !== undefined && newAi < 0)) {
      toast({ variant: "destructive", title: "Invalid price", description: "Prices cannot be negative." });
      return;
    }
    setSavingRates(true);
    try {
      const token = await getAccessToken();

      // API expects: { articleIds: [...], humanPrice, aiPrice }
      const payload: Record<string, unknown> = { articleIds: [selectedAsset.id] };
      if (newHuman !== undefined && !isNaN(newHuman)) payload.humanPrice = newHuman;
      if (newAi !== undefined && !isNaN(newAi)) payload.aiPrice = newAi;

      const res = await fetch(`${EXT_SUPABASE_URL}/update-license-prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Update the drawer display immediately
      const updatedAsset = {
        ...selectedAsset,
        human_price: newHuman !== undefined && !isNaN(newHuman) ? newHuman : selectedAsset.human_price,
        ai_price: newAi !== undefined && !isNaN(newAi) ? newAi : selectedAsset.ai_price,
      };
      setSelectedAsset(updatedAsset);
      // Also update the row in the table
      setAssets(prev => prev.map(a => a.id === selectedAsset.id ? updatedAsset : a));
      setEditingRates(false);
      toast({ title: "Rates updated", description: "Pricing saved successfully." });
    } catch (err) {
      console.error("Save rates error:", err);
      toast({ title: "Save failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSavingRates(false);
    }
  };

  const getSourceName = (asset: Asset): string => {
    if (asset.source_name) return asset.source_name;
    if (asset.source_id && sourceLookup[asset.source_id]) return sourceLookup[asset.source_id];
    return "Direct";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedAssets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedAssets.map(a => a.id)));
  };

  const getStatusBadge = (asset: Asset) => {
    const isActive = asset.status === "protected" || asset.status === "verified";
    const isSyncing = asset.status === "syncing";
    const isFailed = asset.status === "failed";
    if (isActive) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Protected
      </span>
    );
    if (isSyncing) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-oxford bg-oxford/10 border border-oxford/20 rounded-full px-2.5 py-0.5">
        <Spinner size="sm" />Syncing
      </span>
    );
    if (isFailed) return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Failed
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pending
      </span>
    );
  };

  const handleExportCSV = () => {
    const headers = ["Title", "Source", "Published", "Status", "Human Price", "AI Price", "Revenue"];
    const rows = sortedAssets.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      getSourceName(a),
      formatDate(a.publishedAt || a.createdAt) || "",
      a.status,
      a.human_price ? `$${a.human_price}` : "",
      a.ai_price ? `$${a.ai_price}` : "",
      `${formatUSD((a.total_revenue ?? 0))}`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `opedd-content-${new Date().toISOString().split("T")[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: "CSV downloaded." });
  };

  return (
    <DashboardLayout title="Catalog">
      <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Catalog</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalAssets} article{totalAssets !== 1 ? "s" : ""} across {sourceCount} publication{sourceCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} disabled={assets.length === 0} className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-deep hover:underline transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={14} />Export CSV
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="h-9 gap-1.5">
                  Actions
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white w-56">
                <DropdownMenuItem onClick={() => setActiveTab("substack")}>
                  <Upload size={14} className="mr-2" /> Import articles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("archive-license")}>
                  <Handshake size={14} className="mr-2" /> Issue archive license
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} disabled={assets.length === 0} className="sm:hidden">
                  <Download size={14} className="mr-2" /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs (controlled by Actions dropdown — tab list hidden) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {activeTab !== "articles" && (
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setActiveTab("articles")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                ← Back to Articles
              </button>
            </div>
          )}

          <TabsContent value="articles" className="mt-0 space-y-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search articles..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9 h-9 text-sm border-slate-200 rounded-lg" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[140px] text-sm border-slate-200 rounded-lg text-gray-500"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Protected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="syncing">Syncing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {sourceList.length > 0 && (
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 w-[160px] text-sm border-slate-200 rounded-lg text-gray-500"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Error state */}
        {fetchError && !isLoading && (
          <div className="bg-white rounded-xl border border-red-600/30 p-6 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600">Failed to load articles.</p>
            </div>
            <button onClick={fetchAssets} className="text-sm font-semibold text-oxford hover:underline">Try again</button>
          </div>
        )}

        {/* Table */}
        {!fetchError && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-card overflow-x-auto">
            {isLoading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-4 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                    <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" style={{ maxWidth: `${55 + (i % 3) * 15}%` }} />
                    <div className="w-24 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                    <div className="w-20 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                    <div className="w-16 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                    <div className="w-16 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            ) : assets.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No articles yet"
                description="Import your content catalog to start licensing it."
                action={{ label: "Import from Sitemap", onClick: () => navigate("/setup-v2") }}
                secondaryAction={{ label: "Connect Publication", onClick: () => navigate("/setup-v2") }}
              />
            ) : (
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-10 py-3 px-3">
                      <Checkbox
                        checked={selectedIds.size === sortedAssets.length && sortedAssets.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort("title")}>
                      <span className="flex items-center gap-1">Title <ArrowUpDown size={12} className="text-gray-400" /></span>
                    </th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[140px]">Source</th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[120px]">Published</th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[100px] cursor-pointer select-none" onClick={() => toggleSort("status")}>
                      <span className="flex items-center gap-1">Status <ArrowUpDown size={12} className="text-gray-400" /></span>
                    </th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[100px]">Permission</th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right py-3 px-4 whitespace-nowrap w-[90px]">AI Price</th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right py-3 px-4 whitespace-nowrap w-[100px] cursor-pointer select-none" onClick={() => toggleSort("revenue")}>
                      <span className="flex items-center gap-1 justify-end w-full">Revenue <ArrowUpDown size={12} className="text-gray-400" /></span>
                    </th>
                    <th className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right py-3 px-4 whitespace-nowrap w-[80px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssets.map((asset) => {
                    const logo = getPlatformLogo(asset.sourceUrl);
                    const sourceName = getSourceName(asset);
                    const pubDate = formatDate(asset.publishedAt || asset.createdAt);
                    const isCopied = copiedId === asset.id;
                    const isSelected = selectedIds.has(asset.id);

                    return (
                      <tr
                        key={asset.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group ${isSelected ? "bg-oxford/5" : ""}`}
                        onClick={() => openDrawer(asset)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(asset.id)} className="h-4 w-4" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {logo ? <img src={logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" /> : <Globe size={14} className="text-gray-400 flex-shrink-0" />}
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[380px]">{asset.title}</span>
                              {asset.sourceUrl && <span className="text-xs text-gray-400 truncate max-w-[380px] mt-0.5">{asset.sourceUrl}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {logo ? <img src={logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" /> : <Globe size={14} className="text-gray-400 flex-shrink-0" />}
                            <span className="text-sm text-gray-500 truncate">{sourceName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {pubDate ? <span className="text-sm text-gray-500">{pubDate}</span> : <span className="text-sm text-gray-300">—</span>}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(asset)}</td>
                        <td className="py-3.5 px-4">
                          {asset.human_price ? <span className="text-sm font-medium text-gray-900">${asset.human_price}</span> : <span className="text-sm text-gray-300">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          {asset.ai_price ? <span className="text-sm font-medium text-gray-900">${asset.ai_price}</span> : <span className="text-sm text-gray-300">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <span className="text-sm text-gray-500">{formatUSD((asset.total_revenue ?? 0))}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleCopyLink(e, asset.id)} aria-label={`Copy license link for ${asset.title}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-oxford transition-colors" title="Copy license link">
                              {isCopied ? <Check size={15} className="text-emerald-500" /> : <Link2 size={15} />}
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} aria-label={`More actions for ${asset.title}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-500 transition-colors">
                                  <MoreHorizontal size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuItem onClick={() => openDrawer(asset)}>View details</DropdownMenuItem>
                                {asset.sourceUrl && <DropdownMenuItem onClick={() => window.open(asset.sourceUrl!.startsWith("http") ? asset.sourceUrl : `https://${asset.sourceUrl}`, "_blank")}>View article</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Floating Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl px-6 py-3 flex items-center gap-4 shadow-card">
            <span className="text-sm font-medium">{selectedIds.size} article{selectedIds.size !== 1 ? "s" : ""} selected</span>
            <Button size="sm" onClick={() => { setBulkPricingOpen(true); setDrawerOpen(false); }} disabled={savingRates} className="h-8 bg-oxford hover:bg-oxford-dark text-white text-xs rounded-lg disabled:opacity-50">Set Prices</Button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-white/60 hover:text-white transition-colors">Clear</button>
          </div>
        )}

        {/* Pagination */}
        {!fetchError && totalAssets > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalAssets)} of {totalAssets} articles</span>
            <div className="flex items-center gap-3">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={`text-sm font-medium transition-colors ${page === 1 ? "text-gray-300 cursor-not-allowed" : "text-navy-deep hover:underline"}`}>← Previous</button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={`text-sm font-medium transition-colors ${page === totalPages ? "text-gray-300 cursor-not-allowed" : "text-navy-deep hover:underline"}`}>Next →</button>
            </div>
          </div>
        )}
          </TabsContent>

           {/* Re-import Archive Tab */}
           <TabsContent value="substack" className="mt-6">
             <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl space-y-5">
               <div className="flex items-center gap-3">
                 <img src={substackLogo} alt="Substack" className="w-10 h-10 rounded-xl" />
                 <div>
                   <h2 className="text-base font-bold text-gray-900">Re-import Archive</h2>
                   <p className="text-sm text-gray-500 mt-0.5">Already imported during setup? Use this to import additional posts or update your archive with a new <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">posts.csv</code> export.</p>
                 </div>
               </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 space-y-1">
                <p className="font-medium text-gray-900 text-xs uppercase tracking-wider mb-2">How to get your CSV</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <span className="font-medium text-gray-900">substack.com → Settings → Export data</span></li>
                  <li>Download the ZIP file</li>
                  <li>Open the ZIP and find <code className="bg-white px-1 py-0.5 rounded text-xs font-mono border border-gray-200">posts.csv</code></li>
                  <li>Upload it below</li>
                </ol>
              </div>

              {/* File dropzone */}
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  substackFile ? "border-oxford bg-oxford/5" : "border-gray-200 hover:border-oxford/40 bg-gray-50"
                }`}
              >
                <Upload size={20} className={substackFile ? "text-oxford" : "text-gray-400"} />
                <p className="mt-2 text-sm font-medium text-gray-500">
                  {substackFile ? substackFile.name : "Choose posts.csv"}
                </p>
                {substackFile && (
                  <p className="text-xs text-gray-400 mt-0.5">{(substackFile.size / 1024).toFixed(0)} KB</p>
                )}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setSubstackFile(e.target.files?.[0] || null)}
                />
              </label>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={substackLicensing}
                    onCheckedChange={(v) => setSubstackLicensing(!!v)}
                  />
                  <span className="text-sm text-gray-900">Enable licensing on all imported posts</span>
                </label>

                {substackLicensing && (
                  <div className="grid grid-cols-2 gap-3 pl-7">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Human price ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 5.00"
                        value={substackHumanPrice}
                        onChange={(e) => setSubstackHumanPrice(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">AI price ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 10.00"
                        value={substackAiPrice}
                        onChange={(e) => setSubstackAiPrice(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                disabled={!substackFile || substackImporting}
                className="bg-oxford hover:bg-oxford-dark text-white rounded-lg h-10 px-5 font-medium text-sm gap-2"
                onClick={async () => {
                  if (!substackFile) return;
                  setSubstackImporting(true);
                  try {
                    const csvContent = await substackFile.text();
                    const token = await getAccessToken();
                    const body: Record<string, unknown> = {
                      csv_content: csvContent,
                      licensing_enabled: substackLicensing,
                    };
                    if (substackHumanPrice) body.human_price = parseFloat(substackHumanPrice);
                    if (substackAiPrice) body.ai_price = parseFloat(substackAiPrice);

                    const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/substack-upload`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        apikey: EXT_ANON_KEY,
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(body),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Import failed");
                    toast({
                      title: "Import complete",
                      description: `${json.imported ?? 0} articles imported, ${json.skipped ?? 0} skipped.`,
                    });
                    setSubstackFile(null);
                    fetchAssets();
                  } catch (err: any) {
                    toast({ title: "Import failed", description: err.message, variant: "destructive" });
                  } finally {
                    setSubstackImporting(false);
                  }
                }}
              >
                {substackImporting ? <Spinner size="md" /> : <Upload size={16} />}
                {substackImporting ? "Importing…" : "Import"}
              </Button>
            </div>
          </TabsContent>


          <TabsContent value="archive-license" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <Handshake size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Archive License</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Issue a site-wide license covering all your published content for a negotiated date range.</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Archive licenses are enterprise deals — one license key grants access to your entire content archive for a defined coverage period. Use this to close bulk AI training, syndication, or republication agreements.
              </p>
              <Button
                onClick={() => setArchiveLicenseOpen(true)}
                className="bg-oxford hover:bg-oxford-dark text-white rounded-lg h-10 px-5 font-medium text-sm gap-2"
              >
                <Handshake size={16} />
                Issue Archive License
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Article Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full !p-0 flex flex-col bg-white [&>button.absolute]:hidden">
          {selectedAsset && (
            <>
              <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-oxford text-xs font-semibold uppercase tracking-wide mb-1">Article</p>
                    <h2 className="text-gray-900 font-bold text-base leading-snug">{selectedAsset.title}</h2>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Globe size={13} /> {getHostname(selectedAsset.sourceUrl)}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDate(selectedAsset.publishedAt || selectedAsset.createdAt) || "Unknown"}</span>
                  </div>
                  {selectedAsset.sourceUrl && (
                    <a href={selectedAsset.sourceUrl.startsWith("http") ? selectedAsset.sourceUrl : `https://${selectedAsset.sourceUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-oxford hover:underline flex items-center gap-1 mt-2">
                      {selectedAsset.sourceUrl} <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">License link</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <code className="text-sm text-gray-900 font-mono flex-1 truncate">opedd.com/l/{selectedAsset.id}</code>
                    <button onClick={handleDrawerCopy} className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-oxford hover:text-oxford-dark transition-colors">
                      {drawerCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      {drawerCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Share this link so buyers can license this article directly.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rates</p>
                    {!editingRates && (
                      <button onClick={handleEditRates} className="text-xs text-oxford font-medium hover:underline">Edit</button>
                    )}
                  </div>
                  {editingRates ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Human / Permission ($)</label>
                        <Input
                          type="text" inputMode="decimal" placeholder="0.00"
                          value={rateHuman}
                          onChange={(e) => setRateHuman(e.target.value)}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">AI Training ($)</label>
                        <Input
                          type="text" inputMode="decimal" placeholder="0.00"
                          value={rateAi}
                          onChange={(e) => setRateAi(e.target.value)}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveRates} disabled={savingRates}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-oxford text-white rounded-lg hover:bg-oxford-dark disabled:opacity-50"
                        >
                          {savingRates ? <Spinner size="sm" /> : <Check size={12} />}
                          Save
                        </button>
                        <button onClick={() => setEditingRates(false)} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-navy-deep">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                        <div><p className="text-sm font-medium text-gray-900">Permission</p><p className="text-xs text-gray-400">Quote, cite, or share</p></div>
                        <span className="text-sm font-semibold text-gray-900">{selectedAsset.human_price ? `$${selectedAsset.human_price}` : <span className="text-gray-300 font-normal">Not set</span>}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <div><p className="text-sm font-medium text-gray-900">AI training</p><p className="text-xs text-gray-400">Dataset licensing</p></div>
                        <span className="text-sm font-semibold text-gray-900">{selectedAsset.ai_price ? `$${selectedAsset.ai_price}` : <span className="text-gray-300 font-normal">Disabled</span>}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{formatUSD((selectedAsset.total_revenue ?? 0))}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total revenue</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{selectedAsset.human_licenses_sold ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Permission</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{selectedAsset.ai_licenses_sold ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI licenses</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-6 py-4 bg-white flex gap-3 flex-shrink-0">
                <button onClick={() => setDrawerOpen(false)} className="flex-1 h-10 text-sm text-gray-500 hover:text-navy-deep hover:underline transition-colors font-medium">Close</button>
                <Button className="flex-1 h-10 text-sm bg-navy-deep hover:bg-navy-deep/90 text-white font-semibold rounded-lg" onClick={() => navigate(`/ledger?article=${selectedAsset.id}`)}>View transactions</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <BulkPricingModal
        open={bulkPricingOpen}
        onOpenChange={setBulkPricingOpen}
        selectedIds={Array.from(selectedIds)}
        onSuccess={() => { setBulkPricingOpen(false); setSelectedIds(new Set()); fetchAssets(); }}
      />

      <IssueArchiveLicenseModal
        open={archiveLicenseOpen}
        onOpenChange={setArchiveLicenseOpen}
        onSuccess={() => setArchiveLicenseOpen(false)}
      />
    </DashboardLayout>
  );
}
