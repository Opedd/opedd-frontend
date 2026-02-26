import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  FileText,
  Loader2,
  Link2,
  MoreHorizontal,
  Check,
  Globe,
  Calendar,
  User,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Asset, PaginatedResponse, DbAsset, mapDbAssetToUiAsset } from "@/types/asset";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";

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
  } catch {
    return null;
  }
}

function getHostname(url: string | undefined): string {
  if (!url) return "Unknown";
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { return url; }
}

type StatusFilter = "all" | "active" | "pending";

export default function Content() {
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
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
  const [sourceLookup, setSourceLookup] = useState<Record<string, string>>({});
  const [platformLookup, setPlatformLookup] = useState<Record<string, string>>({});
  const [sourceList, setSourceList] = useState<{ id: string; name: string }[]>([]);

  // Detail drawer
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerCopied, setDrawerCopied] = useState(false);

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
        status: statusFilter !== "all" ? (statusFilter === "active" ? "protected" : "pending") : undefined,
        source_id: sourceFilter !== "all" ? sourceFilter : undefined,
      });
      const mapped: Asset[] = (Array.isArray(result.data) ? result.data : []).map((item: any) => mapDbAssetToUiAsset(item as DbAsset));
      setAssets(mapped);
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

  if (!user) return null;

  const totalPages = Math.max(1, Math.ceil(totalAssets / PAGE_SIZE));
  const sourceCount = sourceList.length;

  const handleCopyLink = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/license/${articleId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(articleId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDrawerCopy = () => {
    if (!selectedAsset) return;
    const link = `opedd.com/l/${selectedAsset.id}`;
    navigator.clipboard.writeText(link);
    setDrawerCopied(true);
    setTimeout(() => setDrawerCopied(false), 1500);
  };

  const openDrawer = (asset: Asset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
    setDrawerCopied(false);
  };

  const getSourceName = (asset: Asset): string => {
    if (asset.source_name) return asset.source_name;
    if (asset.source_id && sourceLookup[asset.source_id]) return sourceLookup[asset.source_id];
    return "Direct";
  };

  const getSourceUrl = (asset: Asset): string | undefined => {
    return asset.sourceUrl;
  };

  return (
    <DashboardLayout title="Content">
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[#040042]">Content</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalAssets} article{totalAssets !== 1 ? "s" : ""} across {sourceCount} publication{sourceCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search articles..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-sm border-slate-200 rounded-lg"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-[140px] text-sm border-slate-200 rounded-lg text-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          {sourceList.length > 0 && (
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 w-[160px] text-sm border-slate-200 rounded-lg text-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#4A26ED]" />
            </div>
          ) : assets.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No articles yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Register a publication on the Dashboard to start importing articles.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap">Title</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[140px]">Source</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[120px]">Published</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[100px]">Status</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[100px]">Permission</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-left py-3 px-4 whitespace-nowrap w-[100px]">Revenue</th>
                  <th className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right py-3 px-4 whitespace-nowrap w-[80px]"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const logo = getPlatformLogo(asset.sourceUrl);
                  const isActive = asset.status === "protected" || asset.status === "verified";
                  const sourceName = getSourceName(asset);
                  const pubDate = formatDate(asset.publishedAt || asset.createdAt);
                  const isCopied = copiedId === asset.id;

                  return (
                    <tr
                      key={asset.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors group"
                      onClick={() => openDrawer(asset)}
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#040042] truncate max-w-[380px]">
                            {asset.title}
                          </span>
                          {asset.sourceUrl && (
                            <span className="text-xs text-slate-400 truncate max-w-[380px] mt-0.5">
                              {asset.sourceUrl}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {logo ? (
                            <img src={logo} className="w-4 h-4 object-contain flex-shrink-0" alt="" />
                          ) : (
                            <Globe size={14} className="text-slate-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-slate-600 truncate">{sourceName}</span>
                        </div>
                      </td>
                      {/* Published */}
                      <td className="py-3.5 px-4">
                        {pubDate ? (
                          <span className="text-sm text-slate-500">{pubDate}</span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Pending
                          </span>
                        )}
                      </td>
                      {/* Permission */}
                      <td className="py-3.5 px-4">
                        {asset.human_price ? (
                          <span className="text-sm font-medium text-[#040042]">${asset.human_price}</span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      {/* Revenue */}
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-slate-600">${(asset.total_revenue ?? 0).toFixed(2)}</span>
                      </td>
                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleCopyLink(e, asset.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#4A26ED] transition-colors"
                            title="Copy license link"
                          >
                            {isCopied ? <Check size={15} className="text-emerald-500" /> : <Link2 size={15} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDrawer(asset); }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalAssets > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalAssets)} of {totalAssets} articles
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Article Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full p-0 flex flex-col bg-white">
          {selectedAsset && (
            <>
              {/* Header */}
              <div className="bg-[#040042] px-6 py-5 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-[#A78BFA] text-xs font-semibold uppercase tracking-wide mb-1">Article</p>
                    <h2 className="text-white font-bold text-base leading-snug">{selectedAsset.title}</h2>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Metadata */}
                <div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Globe size={13} /> {getHostname(selectedAsset.sourceUrl)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} /> {formatDate(selectedAsset.publishedAt || selectedAsset.createdAt) || "Unknown"}
                    </span>
                  </div>
                  {selectedAsset.sourceUrl && (
                    <a
                      href={selectedAsset.sourceUrl.startsWith("http") ? selectedAsset.sourceUrl : `https://${selectedAsset.sourceUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#4A26ED] hover:underline flex items-center gap-1 mt-2"
                    >
                      {selectedAsset.sourceUrl} <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {/* License link */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">License link</p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <code className="text-sm text-[#040042] font-mono flex-1 truncate">
                      opedd.com/l/{selectedAsset.id}
                    </code>
                    <button
                      onClick={handleDrawerCopy}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#4A26ED] hover:text-[#3B1ED1] transition-colors"
                    >
                      {drawerCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      {drawerCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Share this link so buyers can license this article directly.
                  </p>
                </div>

                {/* Rates */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rates</p>
                  </div>
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-[#040042]">Permission</p>
                        <p className="text-xs text-slate-400">Quote, cite, or share</p>
                      </div>
                      <span className="text-sm font-semibold text-[#040042]">
                        {selectedAsset.human_price ? `$${selectedAsset.human_price}` : <span className="text-slate-300 font-normal">Not set</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-[#040042]">Syndication</p>
                        <p className="text-xs text-slate-400">Republication, translation</p>
                      </div>
                      <span className="text-sm font-semibold text-[#040042] text-slate-300 font-normal">Not set</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-[#040042]">AI training</p>
                        <p className="text-xs text-slate-400">Dataset licensing</p>
                      </div>
                      <span className="text-sm font-semibold text-[#040042]">
                        {selectedAsset.ai_price ? `$${selectedAsset.ai_price}` : <span className="text-slate-300 font-normal">Disabled</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revenue summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#040042]">${(selectedAsset.total_revenue ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Total revenue</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#040042]">{selectedAsset.human_licenses_sold ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Permission</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-[#040042]">{selectedAsset.ai_licenses_sold ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-0.5">AI licenses</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 px-6 py-4 bg-white flex gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                  onClick={() => setDrawerOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 h-10 text-sm bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white font-semibold hover:opacity-90"
                  onClick={() => navigate(`/ledger?article=${selectedAsset.id}`)}
                >
                  View transactions
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
