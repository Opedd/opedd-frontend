import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Copy,
  Loader2,
  Globe,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Download,
  FileText,
  Mail,
  Layers,
  ChevronRight,
  ArrowLeft,
  Rss,
  Code2,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import opeddIcon from "@/assets/opedd-icon.svg";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";

// ─── Types ───

interface DetectFeedsResult {
  platform: "substack" | "ghost" | "wordpress" | "beehiiv" | "unknown";
  has_rss: boolean;
  has_sitemap: boolean;
  rss_urls: string[];
  sitemap_urls: string[];
  estimated_article_count: number;
}

type FlowStep = "url_input" | "detection_result" | "ghost_api_key" | "post_import" | "api_path";

interface PublicationSetupFlowProps {
  onComplete: (completionState?: { pricingDone: boolean; widgetDone: boolean }) => void;
}

const PLATFORM_META: Record<string, { label: string; logo: string | null; color: string }> = {
  substack: { label: "Substack", logo: substackLogo, color: "bg-orange-100 text-orange-700 border-orange-200" },
  beehiiv: { label: "Beehiiv", logo: beehiivLogo, color: "bg-orange-100 text-orange-700 border-orange-200" },
  ghost: { label: "Ghost", logo: ghostLogo, color: "bg-slate-100 text-slate-700 border-slate-200" },
  wordpress: { label: "WordPress", logo: wordpressLogo, color: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function PublicationSetupFlow({ onComplete }: PublicationSetupFlowProps) {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<FlowStep>("url_input");
  const [url, setUrl] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [detection, setDetection] = useState<DetectFeedsResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [publisherId, setPublisherId] = useState("");

  // Manual fallback URL for Case C
  const [manualFeedUrl, setManualFeedUrl] = useState("");
  const [ghostAdminKey, setGhostAdminKey] = useState("");
  const [ghostImporting, setGhostImporting] = useState(false);
  const [ghostImportError, setGhostImportError] = useState("");

  // Fetch publisher profile (API key + ID)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const result = await res.json();
        if (result.success && result.data) {
          const pub = result.data.publisher || result.data;
          if (pub.api_key) setApiKey(pub.api_key);
          if (pub.id) setPublisherId(pub.id);
        }
      } catch {}
    })();
  }, [user, getAccessToken]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  // ─── Step 1: Detect feeds ───
  const handleDetect = async () => {
    if (!url.trim()) return;
    setIsDetecting(true);
    try {
      const domain = url.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const res = await fetch(
        `${EXT_SUPABASE_URL}/detect-feeds?domain=${encodeURIComponent(domain)}`,
        { headers: { apikey: EXT_ANON_KEY } }
      );
      const result = await res.json();
      if (result.success && result.data) {
        setDetection(result.data);
        setStep("detection_result");
      } else {
        // Treat as "nothing found"
        setDetection({
          platform: "unknown",
          has_rss: false,
          has_sitemap: false,
          rss_urls: [],
          sitemap_urls: [],
          estimated_article_count: 0,
        });
        setStep("detection_result");
      }
    } catch {
      setDetection({
        platform: "unknown",
        has_rss: false,
        has_sitemap: false,
        rss_urls: [],
        sitemap_urls: [],
        estimated_article_count: 0,
      });
      setStep("detection_result");
    } finally {
      setIsDetecting(false);
    }
  };

  // Determine which case we're in
  const getCase = (): "rss" | "sitemap" | "nothing" => {
    if (!detection) return "nothing";
    const { platform, has_rss, has_sitemap } = detection;
    // Case A: Substack/Beehiiv, or unknown with RSS only
    if (platform === "substack" || platform === "beehiiv") return "rss";
    if (platform === "unknown" && has_rss && !has_sitemap) return "rss";
    // Case B: Ghost/WordPress (has sitemap)
    if ((platform === "ghost" || platform === "wordpress") && has_sitemap) return "sitemap";
    if (has_sitemap) return "sitemap";
    if (has_rss) return "rss";
    return "nothing";
  };

  // ─── Connect RSS ───
  const handleConnectRss = async () => {
    if (!detection || !user) return;
    const feedUrl = detection.rss_urls[0];
    if (!feedUrl) return;
    setIsConnecting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const domain = url.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const rawName = domain.split(".")[0];
      const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const platform = detection.platform === "unknown" ? "other" : detection.platform;

      // Upsert rss_source
      const { data: existing } = await supabase
        .from("rss_sources")
        .select("id")
        .eq("user_id", user.id)
        .eq("feed_url", feedUrl)
        .maybeSingle();

      let sourceId = "";
      if (existing?.id) {
        await supabase.from("rss_sources").update({
          sync_status: "syncing",
          registration_path: "newsletter_feed",
        }).eq("id", existing.id);
        sourceId = existing.id;
      } else {
        const { data: inserted } = await supabase
          .from("rss_sources")
          .insert({
            user_id: user.id,
            name: pubName,
            feed_url: feedUrl,
            platform,
            sync_status: "syncing",
            registration_path: "newsletter_feed",
            sync_method: "rss",
          })
          .select("id")
          .single();
        sourceId = inserted?.id || "";
      }

      // Trigger sync
      const syncRes = await fetch(`${EXT_SUPABASE_URL}/sync-content-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sourceUrl: feedUrl }),
      });
      let articleCount = 0;
      if (syncRes.ok) {
        const syncData = await syncRes.json().catch(() => ({}));
        articleCount = syncData.data?.items_imported ?? syncData.data?.items_found ?? 0;
      }

      await supabase.from("rss_sources").update({
        sync_status: "active",
        article_count: articleCount,
        last_synced_at: new Date().toISOString(),
      }).eq("id", sourceId);

      toast({ title: "RSS feed connected", description: `${articleCount} articles synced from ${pubName}` });
      setStep("post_import");
    } catch (err: any) {
      toast({ title: "Connection failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Import sitemap ───
  const handleImportSitemap = async () => {
    if (!detection || !user) return;
    const sitemapUrl = detection.sitemap_urls[0];
    if (!sitemapUrl) return;
    setIsConnecting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const domain = url.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const rawName = domain.split(".")[0];
      const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const platform = detection.platform === "unknown" ? "other" : detection.platform;

      // Upsert rss_source
      const { data: existing } = await supabase
        .from("rss_sources")
        .select("id")
        .eq("user_id", user.id)
        .eq("feed_url", sitemapUrl)
        .maybeSingle();

      let sourceId = "";
      if (existing?.id) {
        await supabase.from("rss_sources").update({
          sync_status: "syncing",
          registration_path: "sitemap_import",
        }).eq("id", existing.id);
        sourceId = existing.id;
      } else {
        const { data: inserted } = await supabase
          .from("rss_sources")
          .insert({
            user_id: user.id,
            name: pubName,
            feed_url: sitemapUrl,
            platform,
            sync_status: "syncing",
            registration_path: "sitemap_import",
            sync_method: "sitemap",
          })
          .select("id")
          .single();
        sourceId = inserted?.id || "";
      }

      // Trigger import
      const importRes = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sitemap_url: sitemapUrl }),
      });

      if (importRes.ok) {
        const importData = await importRes.json().catch(() => ({}));
        const queued = importData.data?.article_urls_queued || detection.estimated_article_count || 0;
        await supabase.from("rss_sources").update({
          sync_status: "active",
          article_count: queued,
          last_synced_at: new Date().toISOString(),
        }).eq("id", sourceId);
        toast({ title: "Import started", description: `${queued} articles queued for import` });
      }

      setStep("post_import");
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Manual connect (Case C) ───
  const handleManualConnect = async () => {
    if (!manualFeedUrl.trim() || !user) return;
    setIsConnecting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const feedUrl = manualFeedUrl.trim();
      const isSitemap = feedUrl.includes("sitemap");
      const domain = url.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const rawName = domain.split(".")[0];
      const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const { data: inserted } = await supabase
        .from("rss_sources")
        .insert({
          user_id: user.id,
          name: pubName,
          feed_url: feedUrl,
          platform: "other",
          sync_status: "syncing",
          registration_path: isSitemap ? "sitemap_import" : "newsletter_feed",
          sync_method: isSitemap ? "sitemap" : "rss",
        })
        .select("id")
        .single();

      const sourceId = inserted?.id || "";

      if (isSitemap) {
        await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sitemap_url: feedUrl }),
        });
      } else {
        await fetch(`${EXT_SUPABASE_URL}/sync-content-source`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sourceUrl: feedUrl }),
        });
      }

      await supabase.from("rss_sources").update({
        sync_status: "active",
        last_synced_at: new Date().toISOString(),
      }).eq("id", sourceId);

      // Fake detection for post-import step
      setDetection({
        platform: "unknown",
        has_rss: !isSitemap,
        has_sitemap: isSitemap,
        rss_urls: isSitemap ? [] : [feedUrl],
        sitemap_urls: isSitemap ? [feedUrl] : [],
        estimated_article_count: 0,
      });

      toast({ title: "Content connected", description: "Processing your content" });
      setStep("post_import");
    } catch (err: any) {
      toast({ title: "Connection failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const webhookUrl = `${EXT_SUPABASE_URL}/api`;
  const detectedCase = getCase();
  const isRssFlow = detectedCase === "rss" || (detection?.platform === "substack") || (detection?.platform === "beehiiv");

  // ─── Render ───
  return (
    <div className="p-6 max-w-xl w-full mx-auto space-y-5">
      {/* ════════ Step 1: URL Input ════════ */}
      {step === "url_input" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-[#040042]">Add your content</h3>
            <p className="text-sm text-slate-500 mt-1">Enter your website or newsletter URL</p>
          </div>

          <div className="space-y-3">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="h-12 text-base"
              onKeyDown={e => e.key === "Enter" && handleDetect()}
            />

            <button
              onClick={handleDetect}
              disabled={isDetecting || !url.trim()}
              className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center disabled:opacity-50 transition-all hover:shadow-lg"
            >
              {isDetecting ? (
                <>
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                  <span>Scanning your site…</span>
                </>
              ) : (
                <>
                  <span>Detect my content</span>
                  <ArrowRight size={16} className="flex-shrink-0" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            onClick={() => setStep("api_path")}
            className="text-sm text-[#4A26ED] hover:underline font-medium flex items-center gap-1.5 min-h-[44px] px-2"
          >
            <Terminal size={14} className="flex-shrink-0" />
            Use API instead
          </button>
        </div>
      )}

      {/* ════════ Step 2: Detection Result ════════ */}
      {step === "detection_result" && detection && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          {/* Case A: RSS (Substack/Beehiiv/unknown with RSS) */}
          {detectedCase === "rss" && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold text-[#040042]">
                    {detection.platform !== "unknown"
                      ? `${PLATFORM_META[detection.platform]?.label || detection.platform} detected`
                      : "RSS feed found"}
                  </h3>
                </div>
                {detection.platform !== "unknown" && PLATFORM_META[detection.platform] && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${PLATFORM_META[detection.platform].color}`}>
                    {PLATFORM_META[detection.platform].logo && (
                      <img src={PLATFORM_META[detection.platform].logo!} alt="" className="w-3.5 h-3.5" />
                    )}
                    {PLATFORM_META[detection.platform].label}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                We found your RSS feed. We'll sync your newsletter automatically — new posts appear in Opedd within the hour.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <Rss size={14} className="text-slate-400 flex-shrink-0" />
                <code className="text-sm text-[#040042] font-mono truncate">{detection.rss_urls[0]}</code>
              </div>

              <button
                onClick={handleConnectRss}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center disabled:opacity-50 transition-all hover:shadow-lg"
              >
                {isConnecting ? (
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                ) : (
                  <>
                    <span>Connect RSS feed</span>
                    <ArrowRight size={16} className="flex-shrink-0" />
                  </>
                )}
              </button>
            </>
          )}

          {/* Case B: Sitemap (Ghost/WordPress) */}
          {detectedCase === "sitemap" && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <h3 className="text-lg font-bold text-[#040042]">
                    {detection.platform !== "unknown"
                      ? `${PLATFORM_META[detection.platform]?.label || detection.platform} detected`
                      : "Sitemap found"}
                  </h3>
                </div>
                {detection.platform !== "unknown" && PLATFORM_META[detection.platform] && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${PLATFORM_META[detection.platform].color}`}>
                    {PLATFORM_META[detection.platform].logo && (
                      <img src={PLATFORM_META[detection.platform].logo!} alt="" className="w-3.5 h-3.5" />
                    )}
                    {PLATFORM_META[detection.platform].label}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                We found {detection.estimated_article_count > 0 ? (
                  <><strong>{detection.estimated_article_count.toLocaleString()}</strong> articles</>
                ) : (
                  "articles"
                )} in your sitemap. We'll import your full archive now, then show you how to sync new posts.
              </p>

              <button
                onClick={handleImportSitemap}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center disabled:opacity-50 transition-all hover:shadow-lg"
              >
                {isConnecting ? (
                  <Loader2 size={16} className="animate-spin flex-shrink-0" />
                ) : (
                  <>
                    <span>
                      Import {detection.estimated_article_count > 0 ? `${detection.estimated_article_count.toLocaleString()} articles` : "articles"}
                    </span>
                    <ArrowRight size={16} className="flex-shrink-0" />
                  </>
                )}
              </button>
            </>
          )}

          {/* Case C: Nothing found */}
          {detectedCase === "nothing" && (
            <>
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
                <h3 className="text-lg font-bold text-[#040042]">We couldn't auto-detect your content</h3>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-600">Paste your RSS feed or sitemap URL:</p>
                <div className="flex gap-2">
                  <Input
                    value={manualFeedUrl}
                    onChange={e => setManualFeedUrl(e.target.value)}
                    placeholder="https://yoursite.com/feed"
                    className="flex-1"
                  />
                  <button
                    onClick={handleManualConnect}
                    disabled={isConnecting || !manualFeedUrl.trim()}
                    className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className="animate-spin flex-shrink-0" />
                    ) : (
                      <span>Connect</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <p className="text-sm text-slate-600">
                Use our API to register content programmatically.{" "}
                <button
                  onClick={() => setStep("api_path")}
                  className="text-[#4A26ED] hover:underline font-medium"
                >
                  View API docs
                </button>
              </p>
            </>
          )}

          {/* Back link */}
          <button
            onClick={() => { setStep("url_input"); setDetection(null); }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Try a different URL
          </button>
        </div>
      )}

      {/* ════════ Step 3: Post-import ════════ */}
      {step === "post_import" && detection && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          {isRssFlow ? (
            /* RSS: You're all set */
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                <h3 className="text-lg font-bold text-[#040042]">You're all set</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your RSS feed syncs automatically every hour. New posts appear in Opedd without any action needed.
              </p>
              <button
                onClick={() => onComplete({ pricingDone: false, widgetDone: false })}
                className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center transition-all hover:shadow-lg"
              >
                <span>Go to my content</span>
                <ArrowRight size={16} className="flex-shrink-0" />
              </button>
            </>
          ) : (
            /* Sitemap: Sync new articles */
            <>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="text-lg font-bold text-[#040042]">Sync new articles automatically</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Set up a publish webhook so new articles appear in Opedd the moment you publish.
              </p>

              {/* Ghost instructions */}
              {(detection.platform === "ghost" || detection.platform === "unknown" || detection.platform === "wordpress") && (
                <div className="space-y-4">
                  {(detection.platform === "ghost" || detection.platform === "unknown") && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-[#040042]">Ghost</p>
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>Settings → Integrations → Add webhook</p>
                        <p>Event: <strong>Post published</strong></p>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <label className="text-xs text-slate-400">URL:</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-[#040042] truncate">
                              {webhookUrl}
                            </code>
                            <button
                              onClick={() => handleCopy(webhookUrl, "webhook-url-ghost")}
                              className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
                            >
                              {copied === "webhook-url-ghost" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                            </button>
                          </div>
                        </div>
                        {apiKey && (
                          <div>
                            <label className="text-xs text-slate-400">Header: X-API-Key</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-[#040042] truncate">
                                {apiKey}
                              </code>
                              <button
                                onClick={() => handleCopy(apiKey, "api-key-ghost")}
                                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
                              >
                                {copied === "api-key-ghost" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(detection.platform === "wordpress" || detection.platform === "unknown") && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-semibold text-[#040042]">WordPress</p>
                      <p className="text-xs text-slate-500">
                        Use the WP Webhooks plugin with the same URL and API key above.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-[#040042] truncate">
                          {webhookUrl}
                        </code>
                        <button
                          onClick={() => handleCopy(webhookUrl, "webhook-url-wp")}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
                        >
                          {copied === "webhook-url-wp" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => onComplete({ pricingDone: false, widgetDone: false })}
                className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center transition-all hover:shadow-lg"
              >
                <span>Done — go to my content</span>
                <ArrowRight size={16} className="flex-shrink-0" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ════════ Path 3: API ════════ */}
      {step === "api_path" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-[#040042]">Register content via API</h3>
            <p className="text-sm text-slate-500 mt-1">
              Use your API key to register articles directly from your CMS or publish hook.
            </p>
          </div>

          {/* API Key */}
          {apiKey && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Your API key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono text-[#040042] truncate">
                  {apiKey}
                </code>
                <button
                  onClick={() => handleCopy(apiKey, "api-key")}
                  className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
                >
                  {copied === "api-key" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                </button>
              </div>
            </div>
          )}

          {/* cURL example */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Register an article</label>
            <div className="bg-[#1E1E2E] rounded-xl p-4 relative">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{`curl -X POST \\
  ${EXT_SUPABASE_URL}/api \\
  -H "X-API-Key: ${apiKey || "op_xxxx"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "articles",
    "title": "Your article title",
    "source_url": "https://..."
  }'`}</pre>
              <button
                onClick={() => handleCopy(`curl -X POST \\\n  ${EXT_SUPABASE_URL}/api \\\n  -H "X-API-Key: ${apiKey || "op_xxxx"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "action": "articles",\n    "title": "Your article title",\n    "source_url": "https://..."\n  }'`, "curl")}
                className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
              >
                {copied === "curl" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Works with any CMS, automation tool, or publish webhook. Articles appear in Opedd instantly.
          </p>

          <button
            onClick={() => onComplete({ pricingDone: false, widgetDone: false })}
            className="w-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 justify-center transition-all hover:shadow-lg"
          >
            <span>Done — go to my content</span>
            <ArrowRight size={16} className="flex-shrink-0" />
          </button>

          {/* Back link */}
          <button
            onClick={() => setStep("url_input")}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to URL detection
          </button>
        </div>
      )}
    </div>
  );
}
