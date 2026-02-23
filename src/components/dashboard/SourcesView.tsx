import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Rss,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  Globe,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { VerifyOwnershipModal } from "@/components/dashboard/VerifyOwnershipModal";
import { SourcePricingModal } from "@/components/dashboard/SourcePricingModal";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";
import mediumLogo from "@/assets/platforms/medium.svg";

interface Source {
  id: string;
  name: string;
  feed_url: string;
  platform: string | null;
  sync_status: string | null;
  article_count: number | null;
  last_synced_at: string | null;
  created_at: string | null;
  verification_token?: string | null;
}

const platformLogos: Record<string, string> = {
  substack: substackLogo,
  ghost: ghostLogo,
  wordpress: wordpressLogo,
  beehiiv: beehiivLogo,
  medium: mediumLogo,
};

interface SourcesViewProps {
  onAddSource: () => void;
}

export function SourcesView({ onAddSource }: SourcesViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [verifyModalSource, setVerifyModalSource] = useState<Source | null>(null);
  const [tokenLookup, setTokenLookup] = useState<Record<string, string>>({});
  const [pricingSource, setPricingSource] = useState<Source | null>(null);
  const [deleteConfirmSource, setDeleteConfirmSource] = useState<Source | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [publisherLogoUrl, setPublisherLogoUrl] = useState<string | null>(null);

  const fetchSources = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [sourcesRes, publisherRes] = await Promise.all([
        supabase.from("rss_sources").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        (supabase.from as any)("publishers").select("logo_url").eq("user_id", user.id).maybeSingle(),
      ]);
      if (sourcesRes.error) throw sourcesRes.error;
      setSources(sourcesRes.data || []);
      setPublisherLogoUrl(publisherRes.data?.logo_url || null);
    } catch (err) {
      console.error("Error fetching sources:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [user]);

  const handleResync = async (source: Source) => {
    const previousCount = source.article_count || 0;
    setSyncingId(source.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/sync-content-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sourceUrl: source.feed_url }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Sync failed (${res.status})`);
      }
      toast({
        title: "Syncing…",
        description: `Fetching new articles from ${source.name}`,
      });

      let attempts = 0;
      const poll = async () => {
        attempts++;
        const { data } = await supabase
          .from("rss_sources")
          .select("article_count, last_synced_at, sync_status")
          .eq("id", source.id)
          .maybeSingle();

        if (data) {
          const newCount = data.article_count || 0;
          const added = newCount - previousCount;

          setSources(prev => prev.map(s =>
            s.id === source.id
              ? { ...s, article_count: newCount, last_synced_at: data.last_synced_at, sync_status: data.sync_status }
              : s
          ));

          if (added > 0 || data.sync_status === "active" || attempts >= 5) {
            setSyncingId(null);
            toast({
              title: "Sync Complete",
              description: added > 0
                ? `${added} new article${added !== 1 ? "s" : ""} added to your Library.`
                : "No new articles found — your Library is up to date.",
            });
            return;
          }
        }

        if (attempts < 5) {
          setTimeout(poll, 2000);
        } else {
          setSyncingId(null);
          toast({
            title: "Sync Complete",
            description: "Sync finished. Check your Library for updates.",
          });
        }
      };

      setTimeout(poll, 2000);
    } catch (err) {
      console.error("Resync error:", err);
      setSyncingId(null);
      toast({
        title: "Sync Failed",
        description: "Could not re-sync this source.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (source: Source) => {
    try {
      // Get the publisher for this user (needed for hostname-based delete)
      const { data: publisher } = await (supabase as any)
        .from("publishers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      // 1. RSS path: find content_sources by feed_url → delete articles by source_id
      const { data: contentSource } = await (supabase as any)
        .from("content_sources")
        .select("id")
        .eq("url", source.feed_url)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (contentSource?.id) {
        await (supabase as any).from("licenses").delete().eq("source_id", contentSource.id);
        await (supabase as any).from("content_sources").delete().eq("id", contentSource.id);
      }

      // 2. Sitemap path: delete articles by publisher + hostname match
      // import-sitemap doesn't create content_sources or set source_id,
      // so we must match by source_url hostname (covers Ghost, WordPress, Other, media orgs)
      if (publisher?.id) {
        try {
          const feedUrl = source.feed_url.startsWith("http") ? source.feed_url : `https://${source.feed_url}`;
          const hostname = new URL(feedUrl).hostname;
          if (hostname) {
            await (supabase as any)
              .from("licenses")
              .delete()
              .eq("publisher_id", publisher.id)
              .ilike("source_url", `%${hostname}%`);
          }
        } catch {}
      }

      // 3. Delete the rss_sources record
      await supabase
        .from("rss_sources")
        .delete()
        .eq("id", source.id)
        .eq("user_id", user!.id);

      setSources(prev => prev.filter(s => s.id !== source.id));
      toast({
        title: "Source Removed",
        description: `${source.name} and its articles have been removed.`,
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Delete Failed",
        description: "Could not remove this source.",
        variant: "destructive",
      });
    }
  };

  // Fetch verification tokens from API
  const fetchTokens = async () => {
    try {
      const apiSources = await contentSources.list<Array<{ id: string; verification_token?: string }>>();
      if (Array.isArray(apiSources)) {
        const lookup: Record<string, string> = {};
        apiSources.forEach((s) => {
          if (s.verification_token) lookup[s.id] = s.verification_token;
        });
        setTokenLookup(lookup);
      }
    } catch {
      // Token fetch is best-effort
    }
  };

  useEffect(() => {
    if (user) fetchTokens();
  }, [user]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8F2FB] p-12 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#4A26ED]/10 flex items-center justify-center">
          <Rss size={28} className="text-[#4A26ED]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#040042]">No Content Sources</h3>
          <p className="text-sm text-[#040042]/60 mt-1 max-w-sm mx-auto">
            Register a feed or sitemap to start syncing articles into your library automatically.
          </p>
        </div>
        <p className="text-xs text-[#040042]/40 mt-1">Use the <strong>"Register Content"</strong> button above to get started.</p>
      </div>
    );
  }

  const totalArticles = sources.reduce((sum, s) => sum + (s.article_count || 0), 0);

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#040042]/50">
          {sources.length} Source{sources.length !== 1 ? "s" : ""} · {totalArticles} Total Article{totalArticles !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((source) => {
          // Detect platform logo (small badge indicator)
          const platformKey = (source.platform || "").toLowerCase();
          const platformLogo = (() => {
            if (platformKey && platformLogos[platformKey]) return platformLogos[platformKey];
            const url = (source.feed_url || "").toLowerCase();
            if (url.includes("substack.com")) return substackLogo;
            if (url.includes("ghost.io") || url.includes(".ghost.")) return ghostLogo;
            if (url.includes("beehiiv.com")) return beehiivLogo;
            if (url.includes("medium.com")) return mediumLogo;
            return null;
          })();
          const isVerified = source.sync_status === "active";
          const isPending = !isVerified;
          const isSyncing = syncingId === source.id;

          return (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Publication logo (from settings) with platform badge overlay */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {publisherLogoUrl ? (
                      <img src={publisherLogoUrl} alt={source.name} className="w-full h-full object-cover" />
                    ) : (
                      <Globe size={20} className="text-slate-400" />
                    )}
                  </div>
                  {/* Small platform badge */}
                  {platformLogo && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center p-0.5">
                      <img src={platformLogo} alt={platformKey} className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#040042] text-sm truncate">{source.name}</h3>
                    {isVerified ? (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 flex-shrink-0">
                        <ShieldCheck size={8} />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200 gap-1 flex-shrink-0">
                        <Clock size={8} />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#040042]/50 truncate">{source.feed_url}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#040042]/40">
                    <span className="font-medium">{source.article_count || 0} articles</span>
                    {source.last_synced_at && (
                      <span>Synced {getRelativeTime(source.last_synced_at)}</span>
                    )}
                    {/* Sync Method Tag */}
                    {(() => {
                      const p = (source.platform || "").toLowerCase();
                      const isWebhook = p === "ghost" || p === "beehiiv";
                      return (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isWebhook ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {isWebhook ? '⚡ Real-time Sync' : '🔄 Scheduled Sync'}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Webhook URL info for Ghost/Beehiiv */}
              {(() => {
                const p = (source.platform || "").toLowerCase();
                const isWebhook = p === "ghost" || p === "beehiiv";
                if (!isWebhook || !isVerified) return null;
                const webhookUrl = `https://djdzcciayennqchjgybx.supabase.co/functions/v1/webhook-receiver?source_id=${source.id}`;
                return (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                    <Rss size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-emerald-700 flex-1 min-w-0">
                      <p className="font-medium">⚡ Real-time Sync Active</p>
                      <p className="mt-0.5 text-emerald-600">
                        Add this webhook URL to your {source.platform ? source.platform.charAt(0).toUpperCase() + source.platform.slice(1) : ''} admin to receive instant updates:
                      </p>
                      <code className="mt-1.5 block bg-emerald-100/60 rounded px-2 py-1 text-[10px] font-mono text-emerald-800 truncate">
                        {webhookUrl}
                      </code>
                    </div>
                  </div>
                );
              })()}

              {/* Empty source state — verified but 0 articles */}
              {isVerified && (source.article_count || 0) === 0 && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <Rss size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium">Everything is set up!</p>
                    <p className="mt-0.5 text-blue-600">
                      We're just waiting for your first post to appear on {source.platform ? source.platform.charAt(0).toUpperCase() + source.platform.slice(1) : 'your site'}.
                    </p>
                  </div>
                </div>
              )}

              {/* Amber verification banner for pending sources */}
              {isPending && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-800">Action required — Verify ownership to activate licensing</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">Add your verification code to your site, then click verify.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <Button
                      size="sm"
                      onClick={() => setVerifyModalSource({
                        ...source,
                        verification_token: tokenLookup[source.id] || source.verification_token || null,
                      })}
                      className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <ShieldCheck size={12} />
                      Verify Ownership
                    </Button>
                    <button
                      onClick={() => setVerifyModalSource({
                        ...source,
                        verification_token: tokenLookup[source.id] || source.verification_token || null,
                      })}
                      className="text-xs text-amber-700 hover:text-amber-800 font-medium underline underline-offset-2"
                    >
                      View Code
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E8F2FB]">
                {/* Verify or Re-sync based on status */}
                {isPending ? (
                  <span className="text-[11px] text-amber-600 font-medium">⚠ Pending verification</span>
                ) : (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => handleResync(source)}
                            disabled={isSyncing}
                            className="h-8 text-xs gap-1.5 bg-transparent border border-slate-200 text-slate-500 hover:bg-[#0A0066] hover:text-white hover:border-[#0A0066] transition-colors"
                          >
                            {isSyncing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                            Re-sync
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fetch new articles from this source</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Set Default Pricing */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => setPricingSource(source)}
                            className="h-8 text-xs gap-1.5 bg-transparent border border-slate-200 text-slate-500 hover:bg-[#0A0066] hover:text-white hover:border-[#0A0066] transition-colors"
                          >
                            <DollarSign size={12} />
                            Set Pricing
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set default pricing for all articles from this source</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                  </>
                )}

                {source.feed_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 text-xs gap-1.5 text-slate-400 hover:text-[#040042] hover:bg-transparent"
                  >
                    <a href={source.feed_url.startsWith("http") ? source.feed_url : `https://${source.feed_url}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={12} />
                      Visit
                    </a>
                  </Button>
                )}

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDeleteConfirmSource(source); setDeleteConfirmInput(""); }}
                  className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 size={12} />
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verify Ownership Modal */}
      <VerifyOwnershipModal
        open={!!verifyModalSource}
        onOpenChange={(open) => { if (!open) setVerifyModalSource(null); }}
        source={verifyModalSource}
        onVerified={() => {
          // Update local state to verified
          if (verifyModalSource) {
            setSources(prev => prev.map(s =>
              s.id === verifyModalSource.id ? { ...s, sync_status: "active" } : s
            ));
            toast({
              title: "Verified!",
              description: `${verifyModalSource.name} ownership has been confirmed.`,
            });
          }
        }}
      />

      {/* Source Pricing Modal */}
      {pricingSource && (
        <SourcePricingModal
          open={!!pricingSource}
          onOpenChange={(open) => { if (!open) setPricingSource(null); }}
          sourceId={pricingSource.id}
          sourceName={pricingSource.name}
          onSuccess={fetchSources}
        />
      )}

      {/* Remove Source Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmSource}
        onOpenChange={(open) => { if (!open) { setDeleteConfirmSource(null); setDeleteConfirmInput(""); } }}
      >
        <DialogContent hideCloseButton className="bg-white max-w-[420px] rounded-xl border border-[#E5E7EB] p-6 shadow-sm gap-0">
          <DialogHeader className="space-y-0 mb-5">
            <DialogTitle className="text-lg font-semibold text-[#040042]">Remove Source</DialogTitle>
            <DialogDescription className="text-sm text-[#040042]/50 mt-1.5 leading-relaxed">
              This will permanently disconnect <span className="font-semibold text-[#040042]">{deleteConfirmSource?.name}</span> and remove all synced articles from your library. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mb-6">
            <label className="text-xs font-medium text-[#040042]/50">
              Type <span className="font-mono font-semibold text-[#040042]">{deleteConfirmSource?.name}</span> to confirm
            </label>
            <Input
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={deleteConfirmSource?.name}
              className="bg-white border-slate-200 focus:border-[#4A26ED]/40 focus:ring-[#4A26ED]/10 h-10 rounded-lg text-sm"
            />
          </div>

          <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
            <Button
              onClick={() => { setDeleteConfirmSource(null); setDeleteConfirmInput(""); }}
              className="bg-white border border-[#E5E7EB] text-[#040042]/60 hover:bg-slate-50 hover:text-[#040042] rounded-lg h-9 px-4 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteConfirmInput !== deleteConfirmSource?.name}
              onClick={() => {
                if (deleteConfirmSource) {
                  handleDelete(deleteConfirmSource);
                  setDeleteConfirmSource(null);
                  setDeleteConfirmInput("");
                }
              }}
              className="bg-[#EF4444] hover:bg-red-600 text-white rounded-lg h-9 px-4 text-sm font-medium disabled:opacity-40"
            >
              <Trash2 size={14} className="mr-1.5" />
              Remove Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
