import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Rss, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  ExternalLink,
  CheckCircle,
  Clock,
  Globe,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  X,
  Shield,
  Eye,
  EyeOff,
  HelpCircle,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.png";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.png";
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
  const { contentSources } = useAuthenticatedApi();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyFailedId, setVerifyFailedId] = useState<string | null>(null);
  const [instructionsSource, setInstructionsSource] = useState<Source | null>(null);
  const [troubleshootSource, setTroubleshootSource] = useState<Source | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchSources = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("rss_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSources(data || []);
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
      await contentSources.sync(source.id);
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
      await supabase
        .from("rss_sources")
        .delete()
        .eq("id", source.id)
        .eq("user_id", user!.id);

      setSources(prev => prev.filter(s => s.id !== source.id));
      toast({
        title: "Source Removed",
        description: `${source.name} has been disconnected.`,
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

  const handleVerify = async (source: Source) => {
    setVerifyingId(source.id);
    setVerifyFailedId(null);
    try {
      await contentSources.verify(source.id);
      // Update local state to verified
      setSources(prev => prev.map(s =>
        s.id === source.id ? { ...s, sync_status: "active" } : s
      ));
      toast({
        title: "Verified!",
        description: `${source.name} ownership has been confirmed.`,
      });
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyFailedId(source.id);
      toast({
        title: "Verification Failed",
        description: "We couldn't find the verification code on your site. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCopyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  // Get verification code for a source from its assets
  const getVerificationCode = (source: Source) => {
    // Generate a deterministic code from the source id
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let hash = 0;
    for (let i = 0; i < source.id.length; i++) {
      hash = ((hash << 5) - hash) + source.id.charCodeAt(i);
      hash = hash & hash;
    }
    const code = Array.from({ length: 4 }, (_, i) => {
      const idx = Math.abs((hash >> (i * 5)) % chars.length);
      return chars[idx];
    }).join("");
    return `OPEDD-${code}`;
  };

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
          const logo = platformLogos[source.platform || ""] || null;
          const isVerified = source.sync_status === "active";
          const isPending = !isVerified;
          const isSyncing = syncingId === source.id;
          const isVerifying = verifyingId === source.id;
          const hasFailed = verifyFailedId === source.id;

          return (
            <div
              key={source.id}
              className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Platform Icon */}
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 flex-shrink-0">
                  {logo ? (
                    <img src={logo} alt={source.platform || ""} className="w-full h-full object-contain" />
                  ) : (
                    <Globe size={20} className="text-slate-400" />
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

              {/* Verification Failed Banner */}
              {hasFailed && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-700 flex-1">
                    <p className="font-medium">Verification code not found on your site.</p>
                    <p className="mt-0.5 text-red-600">Make sure you've added the code to your bio or header, then try again.</p>
                  </div>
                  <button
                    onClick={() => setTroubleshootSource(source)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold underline underline-offset-2 flex items-center gap-1 flex-shrink-0 mt-0.5"
                  >
                    <HelpCircle size={12} />
                    Troubleshoot
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E8F2FB]">
                {/* Verify or Re-sync based on status */}
                {isPending ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleVerify(source)}
                      disabled={isVerifying}
                      className="h-8 text-xs gap-1.5 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white"
                    >
                      {isVerifying ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : hasFailed ? (
                        <RefreshCw size={12} />
                      ) : (
                        <ShieldCheck size={12} />
                      )}
                      {hasFailed ? "Retry" : "Verify Ownership"}
                    </Button>
                    {hasFailed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInstructionsSource(source)}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Eye size={12} />
                        View Instructions
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResync(source)}
                            disabled={isSyncing}
                            className="h-8 text-xs gap-1.5"
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

                    {/* Sync Now — manual trigger */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResync(source)}
                            disabled={isSyncing}
                            className="h-8 w-8 p-0 text-[#040042]/40 hover:text-[#4A26ED]"
                          >
                            {isSyncing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Rss size={14} />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sync now — don't wait 12 hours</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                {source.feed_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 text-xs gap-1.5 text-[#040042]/60"
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
                  onClick={() => handleDelete(source)}
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

      {/* View Instructions Dialog */}
      {instructionsSource && (() => {
        const code = getVerificationCode(instructionsSource);
        const optionAText = `Verify with Opedd: ${code}`;
        const optionBText = `<meta name="opedd-verification" content="${code}" />`;

        return (
          <Dialog open={!!instructionsSource} onOpenChange={() => setInstructionsSource(null)}>
            <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="bg-[#040042] px-6 py-5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield size={20} className="text-[#A78BFA]" />
                    <div>
                      <h1 className="text-white font-bold text-base leading-tight">Verification Instructions</h1>
                      <p className="text-[#A78BFA] text-sm">{instructionsSource.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInstructionsSource(null)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <p className="text-sm text-slate-600">
                  Add one of the following to your publication so we can confirm ownership. Then click <strong>"Verify Ownership"</strong> on the source card.
                </p>

                {/* Option A */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20 font-semibold">Option A</Badge>
                    <span className="text-sm font-semibold text-[#040042]">Visible — Add to About / Bio</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500">Paste this text into your publication's About section, bio, or footer.</p>
                    <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between gap-3">
                      <code className="text-xs text-emerald-400 font-mono truncate">{optionAText}</code>
                      <Button size="sm" onClick={() => handleCopyCode(optionAText)} className="h-7 px-2.5 bg-white/10 hover:bg-white/20 text-white text-xs flex-shrink-0">
                        {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Option B */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 bg-teal-50 text-teal-700 border-teal-200 font-semibold">Option B</Badge>
                    <span className="text-sm font-semibold text-[#040042]">Hidden — Meta Tag in Header</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500">
                      Add this invisible meta tag to your site's <code className="bg-slate-100 px-1 rounded text-[#040042]">&lt;head&gt;</code> for a clean About section.
                    </p>
                    <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between gap-3">
                      <code className="text-xs text-emerald-400 font-mono truncate">{optionBText}</code>
                      <Button size="sm" onClick={() => handleCopyCode(optionBText)} className="h-7 px-2.5 bg-white/10 hover:bg-white/20 text-white text-xs flex-shrink-0">
                        {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <Button
                  onClick={() => {
                    setInstructionsSource(null);
                    handleVerify(instructionsSource);
                  }}
                  className="w-full h-11 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold"
                >
                  <ShieldCheck size={16} className="mr-2" />
                  Verify Now
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Troubleshoot Dialog */}
      {troubleshootSource && (() => {
        const code = getVerificationCode(troubleshootSource);
        const optionAText = `Verify with Opedd: ${code}`;
        const optionBText = `<meta name="opedd-verification" content="${code}" />`;

        return (
          <Dialog open={!!troubleshootSource} onOpenChange={() => setTroubleshootSource(null)}>
            <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="bg-red-600 px-6 py-5 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HelpCircle size={20} className="text-white" />
                    <div>
                      <h1 className="text-white font-bold text-base leading-tight">Troubleshoot Verification</h1>
                      <p className="text-red-200 text-sm">{troubleshootSource.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTroubleshootSource(null)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#040042] flex items-center gap-2">
                    <BookOpen size={14} className="text-red-500" />
                    Common Issues
                  </h3>
                  <div className="space-y-2">
                    {[
                      { q: "Code not found on your site", a: "Make sure the verification code is publicly visible — not behind a login wall or paywall." },
                      { q: "Using Option B (meta tag)?", a: "Ensure the <meta> tag is inside the <head> section of your site, not inside an article body." },
                      { q: "Ghost or WordPress site?", a: "Add the code to your site's 'Code injection → Site Header' section in admin settings." },
                      { q: "Substack publication?", a: "Add the visible text to your publication's About page. Meta tags are not supported on Substack." },
                      { q: "Recently updated?", a: "It may take a few minutes for changes to propagate. Wait 2–3 minutes and retry." },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs font-semibold text-[#040042]">{item.q}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="text-sm font-bold text-[#040042]">Your Verification Code</h3>
                  <div className="bg-[#F2F9FF] border-2 border-[#4A26ED]/20 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-xl font-mono font-bold text-[#4A26ED] tracking-wider">{code}</p>
                    <Button size="sm" onClick={() => handleCopyCode(code)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white border-none h-8 text-xs">
                      {copiedCode ? <><Check size={12} className="mr-1.5" />Copied</> : <><Copy size={12} className="mr-1.5" />Copy</>}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-[9px] text-slate-400 mb-1">Option A — Visible</p>
                      <code className="text-[10px] text-emerald-400 font-mono">{optionAText}</code>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2.5">
                      <p className="text-[9px] text-slate-400 mb-1">Option B — Meta Tag</p>
                      <code className="text-[10px] text-emerald-400 font-mono break-all">{optionBText}</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTroubleshootSource(null);
                    setInstructionsSource(troubleshootSource);
                  }}
                  className="flex-1 h-11"
                >
                  <Eye size={14} className="mr-2" />
                  Full Instructions
                </Button>
                <Button
                  onClick={() => {
                    setTroubleshootSource(null);
                    handleVerify(troubleshootSource);
                  }}
                  className="flex-1 h-11 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold"
                >
                  <RefreshCw size={14} className="mr-2" />
                  Retry Verification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
