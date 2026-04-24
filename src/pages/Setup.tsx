import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Copy, Check, Globe, ChevronRight, ChevronDown, Mail, ExternalLink,
  Wallet, Info, CheckCircle2, Upload, FileText, AlertTriangle, Radio,
  Plug, Tags, Download, DollarSign, CreditCard, ArrowLeft, RefreshCw,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { EXT_SUPABASE_REST } from "@/lib/constants";
import { copyToClipboard } from "@/lib/clipboard";
import { deriveSlug } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import opeddLogoColor from "@/assets/opedd-logo.png";
import substackLogo from "@/assets/platforms/substack.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";

type Platform = "ghost" | "wordpress" | "beehiiv" | "substack" | "custom";

const STEP_TITLES = [
  "Connect Publication",
  "Categorise",
  "Import Progress",
  "Set Up Sync",
  "Set Pricing",
  "Connect Stripe",
];

const STEP_ICONS = [Plug, Tags, Download, RefreshCw, DollarSign, CreditCard];

const CATEGORIES = [
  "Financial Markets & Investing",
  "Pharmaceuticals & Life Sciences",
  "Defense & Aerospace",
  "Enterprise Software & SaaS",
  "Cybersecurity & Privacy",
  "Semiconductors & Hardware",
  "Energy & Commodities",
  "Legal & Regulatory Affairs",
  "Healthcare Policy & Systems",
  "Macroeconomics & Central Banking",
  "Supply Chain & Logistics",
  "Climate & Sustainability",
  "AI & Machine Learning",
  "Media & Publishing",
  "Government & Public Policy",
  "Telecommunications & Connectivity",
  "Education & Workforce",
];

const PLATFORM_OPTIONS: { id: Platform; label: string; desc: string; logo: string | null }[] = [
  { id: "substack", label: "Substack", desc: "Archive via data export (includes premium content)", logo: substackLogo },
  { id: "beehiiv", label: "Beehiiv", desc: "Full archive via API key (includes premium content)", logo: beehiivLogo },
  { id: "ghost", label: "Ghost", desc: "Full archive via Admin API (includes members-only)", logo: ghostLogo },
  { id: "wordpress", label: "WordPress", desc: "Connect with your site URL + Application Password", logo: wordpressLogo },
  { id: "custom", label: "Custom / Other", desc: "Any CMS — connect via API key, sitemap, or email", logo: null },
];

export default function Setup() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [publisherId, setPublisherId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);

  // Step 1 fields
  const [ghostUrl, setGhostUrl] = useState("");
  const [ghostKey, setGhostKey] = useState("");
  const [beehiivUrl, setBeehiivUrl] = useState("");
  const [beehiivApiKey, setBeehiivApiKey] = useState("");
  const [beehiivPubId, setBeehiivPubId] = useState("");
  const [substackUrl, setSubstackUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [wpUrl, setWpUrl] = useState("");
  const [wpConfirmed, setWpConfirmed] = useState(false);
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [substackMode, setSubstackMode] = useState<"csv" | "sitemap">("csv");
  const [substackFile, setSubstackFile] = useState<File | null>(null);
  const [rssImporting, setRssImporting] = useState(false);
  const [rssImportResult, setRssImportResult] = useState<{
    imported: number; updated: number; truncated: number; total: number;
  } | null>(null);
  const [substackDragging, setSubstackDragging] = useState(false);
  // Renamed from csvImportResult — backend now returns richer stats for ZIP
  // (matched, updated, draft_skipped, podcast_or_thread_skipped,
  // files_ignored_count, privacy_note). Legacy CSV path still populates
  // just imported/skipped.
  const [csvImportResult, setCsvImportResult] = useState<{
    imported: number;
    skipped?: number;
    updated?: number;
    matched?: number;
    total_posts?: number;
    draft_skipped?: number;
    podcast_or_thread_skipped?: number;
    html_missing?: number;
    files_ignored_count?: number;
    privacy_note?: string;
  } | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  // Feed detection
  type DetectedFeed = { url: string; type: "sitemap" };
  const [detectingFeeds, setDetectingFeeds] = useState(false);
  const [detectedFeeds, setDetectedFeeds] = useState<DetectedFeed[]>([]);
  const [feedDetectionDone, setFeedDetectionDone] = useState(false);
  const [selectedFeedUrl, setSelectedFeedUrl] = useState<string>("");

  const feedDetectInput =
    platform === "substack" && substackMode === "sitemap" ? substackUrl :
    platform === "custom" ? sitemapUrl : "";

  const debouncedFeedUrl = useDebounce(feedDetectInput, 600);

  // Step 2 — Categorise
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");

  // Step 3 — Import
  const [importDone, setImportDone] = useState(false);
  const [importError, setImportError] = useState(false);
  const [articleCount, setArticleCount] = useState(0);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });

  // Step 4 — Sync
  const [syncConfirmed, setSyncConfirmed] = useState(false);
  const [webhookTestState, setWebhookTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [webhookTestMessage, setWebhookTestMessage] = useState<string>("");

  // Step 5 — Pricing
  const [setupAiAnnualPrice, setSetupAiAnnualPrice] = useState("");
  const [setupAiPrice, setSetupAiPrice] = useState("25");
  const [setupHumanPrice, setSetupHumanPrice] = useState("5");
  const [setupAiTypes, setSetupAiTypes] = useState({ rag: true, training: true, inference: true });
  const [pricingSaving, setPricingSaving] = useState(false);

  // Step 6 — Stripe
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);

  // Copy states
  const [emailCopied, setEmailCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveCategory = selectedCategory === "Other" ? customCategory : selectedCategory;
  const canProceedCategory = selectedCategory !== "" && (selectedCategory !== "Other" || customCategory.trim().length >= 2);

  const fetchProfile = useCallback(async () => {
    if (!user) return null;
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.success ? json.data : null;
    } catch { return null; }
  }, [user, getAccessToken]);

  // Initial load — check setup_complete, restore step, handle stripe redirect
  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await fetchProfile();
      const params = new URLSearchParams(window.location.search);
      if (p?.setup_complete && !params.has("add")) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setProfile(p);
      setPublisherId(p?.id || user.id);
      setStripeConnected(!!p?.stripe_onboarding_complete);
      if (p?.category) setSelectedCategory(p.category);

      // Handle Stripe redirect
      const stripeParam = searchParams.get("stripe");
      if (stripeParam === "success") {
        setStripeConnected(true);
        toast({ title: "Stripe connected!", description: "You're ready to receive payouts." });
      } else if (stripeParam === "error") {
        toast({ title: "Stripe connection failed", description: "Please try again.", variant: "destructive" });
      }

      // Restore step — server is source of truth so the wizard resumes
      // across devices; localStorage is a cache for offline/initial paint.
      const serverStep = typeof p?.setup_step === "number" ? p.setup_step : null;
      if (serverStep && serverStep >= 1 && serverStep <= 6) {
        setStep(serverStep);
      } else {
        const saved = localStorage.getItem(`opedd_setup_step_${user.id}`);
        if (saved) {
          const s = parseInt(saved, 10);
          if (s >= 1 && s <= 6) setStep(s);
        }
      }
      setLoading(false);
    })();
  }, [user, fetchProfile, navigate, searchParams, toast]);

  // Persist step: cache locally immediately, sync to server in the background.
  // Server sync is fire-and-forget — the localStorage write already keeps
  // single-device UX coherent if the server call fails.
  useEffect(() => {
    if (!user || loading) return;
    localStorage.setItem(`opedd_setup_step_${user.id}`, String(step));
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          method: "POST",
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "update_setup_step", step }),
        });
      } catch {
        // Silent — localStorage cache still protects UX until next load.
      }
    })();
  }, [step, user, loading, getAccessToken]);

  // Cleanup poll
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Feed detection effect
  useEffect(() => {
    if (!debouncedFeedUrl || debouncedFeedUrl.length < 8) {
      setDetectedFeeds([]);
      setFeedDetectionDone(false);
      setSelectedFeedUrl("");
      return;
    }
    const domain = debouncedFeedUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!domain) return;

    let cancelled = false;
    setDetectingFeeds(true);
    setDetectedFeeds([]);
    setFeedDetectionDone(false);
    setSelectedFeedUrl("");

    (async () => {
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/detect-feeds?domain=${encodeURIComponent(domain)}`, {
          headers: { apikey: EXT_ANON_KEY },
        });
        if (cancelled) return;
        const json = await res.json();
        const feeds: DetectedFeed[] = [];
        if (json.sitemaps?.length) {
          json.sitemaps.forEach((s: string) => feeds.push({ url: s, type: "sitemap" }));
        }
        if (!cancelled) {
          setDetectedFeeds(feeds);
          setFeedDetectionDone(true);
          if (feeds.length > 0) {
            setSelectedFeedUrl(feeds[0].url);
            if (platform === "custom") setSitemapUrl(feeds[0].url);
          }
        }
      } catch {
        if (!cancelled) setFeedDetectionDone(true);
      } finally {
        if (!cancelled) setDetectingFeeds(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedFeedUrl, platform]);


  const authHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return {
      "Content-Type": "application/json",
      apikey: EXT_ANON_KEY,
      Authorization: `Bearer ${token}`,
    };
  }, [getAccessToken]);

  // Step 1 — Continue
  const handleStep1Continue = async () => {
    setStep1Error("");
    if (!platform) return;

    // ── WORDPRESS ──
    if (platform === "wordpress") {
      if (!wpUrl) { setStep1Error("Please enter your WordPress site URL."); return; }
      if (!sitemapUrl && (!wpUsername || !wpAppPassword)) {
        setStep1Error("Please enter your username and Application Password to verify ownership.");
        return;
      }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        if (sitemapUrl) {
          const res = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
            method: "POST", headers,
            body: JSON.stringify({ sitemap_url: sitemapUrl }),
          });
          if (!res.ok) { setStep1Error("Sitemap import failed — check the URL and try again."); return; }
        } else {
          const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
            method: "POST", headers,
            body: JSON.stringify({ url: wpUrl, platform: "wordpress", credentials: { site_url: wpUrl, username: wpUsername, app_password: wpAppPassword } }),
          });
          const json = await res.json();
          if (!res.ok) { setStep1Error(json?.error || "WordPress connection failed — check the URL and credentials."); return; }
        }
        setStep(2);
        startImportPoll();
      } catch { setStep1Error("Network error. Please try again."); }
      finally { setStep1Loading(false); }
      return;
    }

    // ── SUBSTACK ZIP / CSV upload ──
    // ZIP is the primary path (only way to capture paid posts); CSV still
    // supported for older exports. Both require a content_sources row for
    // URL reconstruction, so we call platform-connect first (idempotent).
    if (platform === "substack" && substackMode === "csv") {
      if (!substackUrl.trim()) {
        setStep1Error("Please enter your Substack URL first.");
        return;
      }
      if (!substackFile) { setStep1Error("Please select your Substack export file (.zip or .csv)."); return; }
      const isZip = substackFile.name.toLowerCase().endsWith(".zip");
      const isCsv = substackFile.name.toLowerCase().endsWith(".csv");
      if (!isZip && !isCsv) { setStep1Error("Please upload a .zip or .csv file from your Substack export."); return; }
      const maxSize = isZip ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
      if (substackFile.size > maxSize) {
        setStep1Error(`File too large (max ${isZip ? "500" : "50"} MB).`);
        return;
      }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();

        // 1. Create/refresh the content_sources row. platform-connect is an
        //    upsert-ish; re-POSTing the same URL just updates the existing
        //    row. Required for ZIP path (URL reconstruction from post_id).
        const connectRes = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST",
          headers,
          body: JSON.stringify({ url: substackUrl.trim(), platform: "substack" }),
        });
        if (!connectRes.ok) {
          const cj = await connectRes.json().catch(() => ({}));
          throw new Error(cj?.error || "Could not register your Substack URL. Check that it's your real publication URL.");
        }

        // 2. Upload the archive. Backend auto-detects ZIP vs CSV by magic bytes.
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append("file", substackFile);
        const res = await fetch(`${EXT_SUPABASE_REST}/functions/v1/substack-upload`, {
          method: "POST",
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || json?.message || "Upload failed");
        const d = json?.data ?? json;
        setCsvImportResult({
          imported: d.imported ?? 0,
          skipped: d.skipped,
          updated: d.updated,
          matched: d.matched,
          total_posts: d.total_posts,
          draft_skipped: d.draft_skipped,
          podcast_or_thread_skipped: d.podcast_or_thread_skipped,
          html_missing: d.html_missing,
          files_ignored_count: d.files_ignored_count,
          privacy_note: d.privacy_note,
        });
        setTimeout(() => { setStep(2); startImportPoll(); }, 2500);
      } catch (err: any) {
        setStep1Error(err?.message || "Upload failed — please try again.");
      } finally { setStep1Loading(false); }
      return;
    }

    // ── BEEHIIV ──
    if (platform === "beehiiv") {
      if (!beehiivApiKey || !beehiivPubId) { setStep1Error("Please enter your API Key and Publication ID."); return; }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        const url = beehiivUrl || `https://${beehiivPubId}.beehiiv.com`;
        const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST", headers,
          body: JSON.stringify({ url, platform: "beehiiv", credentials: { api_key: beehiivApiKey, pub_id: beehiivPubId } }),
        });
        const json = await res.json();
        if (!res.ok) { setStep1Error(json?.error || "Connection failed — check your API Key and Publication ID."); return; }
        setStep(2);
        startImportPoll();
      } catch { setStep1Error("Network error. Please try again."); }
      finally { setStep1Loading(false); }
      return;
    }

    // ── GHOST ──
    if (platform === "ghost") {
      if (!ghostUrl || !ghostKey) { setStep1Error("Please enter your Ghost URL and Admin API Key."); return; }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST", headers,
          body: JSON.stringify({ url: ghostUrl, platform: "ghost", credentials: { api_url: ghostUrl, admin_api_key: ghostKey } }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 422 || res.status === 401) setStep1Error(json?.error || "Authentication failed — check your Admin API Key.");
          else if (res.status === 502) setStep1Error("Could not reach your Ghost blog — check the URL.");
          else setStep1Error(json?.error || "Import failed.");
          return;
        }
        setStep(2);
        startImportPoll();
      } catch { setStep1Error("Network error. Please try again."); }
      finally { setStep1Loading(false); }
      return;
    }

    // ── SUBSTACK SITEMAP / CUSTOM ──
    setStep1Loading(true);
    try {
      const headers = await authHeaders();
      let url = selectedFeedUrl || sitemapUrl;
      if (!selectedFeedUrl && platform === "substack" && substackUrl) {
        url = substackUrl.replace(/\/$/, "") + "/sitemap.xml";
      }
      if (!url) { setStep1Error("Please enter a URL."); setStep1Loading(false); return; }

      // Custom platform with API key → use platform-connect instead of import-sitemap
      if (platform === "custom" && customApiKey.trim()) {
        const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST", headers,
          body: JSON.stringify({ url, platform: "custom", credentials: { api_key: customApiKey.trim() } }),
        });
        const json = await res.json();
        if (!res.ok) { setStep1Error(json?.error || "Connection failed — check the API key and try again."); return; }
      } else {
        const res = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
          method: "POST", headers,
          body: JSON.stringify({ sitemap_url: url }),
        });
        if (!res.ok) { setStep1Error("Import failed — check the URL and try again."); return; }
      }
      setStep(2);
      startImportPoll();
    } catch { setStep1Error("Network error. Please try again."); }
    finally { setStep1Loading(false); }
  };

  // Substack RSS instant import. Non-blocking — user can keep the ZIP upload
  // as the primary path. Backend fetches {url}/feed, parses ~25 most recent
  // items, flags truncated paid-post previews as content_complete=false.
  const handleSubstackRssImport = async () => {
    if (!substackUrl.trim()) {
      setStep1Error("Please enter your Substack URL first.");
      return;
    }
    setStep1Error("");
    setRssImporting(true);
    setRssImportResult(null);
    try {
      const headers = await authHeaders();

      // Ensure content_sources row exists — same idempotent platform-connect
      // dance as the ZIP path. Safe to re-call on the same URL.
      const connectRes = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url: substackUrl.trim(), platform: "substack" }),
      });
      if (!connectRes.ok) {
        const cj = await connectRes.json().catch(() => ({}));
        throw new Error(cj?.error || "Could not register your Substack URL.");
      }

      const res = await fetch(`${EXT_SUPABASE_URL}/import-substack-rss`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "RSS import failed.");
      }
      const d = json?.data ?? json;
      setRssImportResult({
        imported: d.imported ?? 0,
        updated: d.updated ?? 0,
        truncated: d.truncated ?? 0,
        total: d.total ?? 0,
      });
    } catch (err: any) {
      setStep1Error(err?.message || "RSS import failed. Try the archive upload instead.");
    } finally {
      setRssImporting(false);
    }
  };

  const startImportPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks++;
      const p = await fetchProfile();
      if (p) {
        setArticleCount(p.article_count || 0);
        if (p.latest_import) {
          setImportProgress({
            processed: p.latest_import.processed || 0,
            total: p.latest_import.total || 0,
          });
        }
        if (p.content_imported) {
          setImportDone(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
      // 3-minute soft timeout (~36 ticks at 5s)
      if (ticks > 36 && !importDone) {
        setImportError(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 5000);
  };

  // Compute suggested price (category-based when articleCount is 0)
  const suggestedPrice = React.useMemo(() => {
    const count = articleCount || 0;
    const cat = effectiveCategory || "";
    let multiplier = 1.0;
    if (/financial|pharma|defense|legal|healthcare/i.test(cat)) multiplier = 2.0;
    else if (/energy|macro|government|policy/i.test(cat)) multiplier = 1.5;
    else if (/software|cyber|semi|ai/i.test(cat)) multiplier = 1.3;
    if (count === 0) {
      return Math.round((5000 * multiplier) / 500) * 500;
    }
    const base = Math.max(count * 15, 3000);
    const capped = Math.min(base, 50000);
    return Math.round((capped * multiplier) / 500) * 500;
  }, [articleCount, effectiveCategory]);

  // Pre-fill suggested price when entering step 5 (pricing)
  useEffect(() => {
    if (step === 5 && suggestedPrice > 0 && !setupAiAnnualPrice) {
      setSetupAiAnnualPrice(String(suggestedPrice));
    }
  }, [step, suggestedPrice]);

  const handleSaveCategory = async () => {
    try {
      const headers = await authHeaders();
      await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ category: effectiveCategory }),
      });
    } catch { /* silent — category save is best-effort during onboarding */ }
  };

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "connect_stripe", return_path: "/setup" }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      toast({ title: "Error", description: "Couldn't start Stripe setup.", variant: "destructive" });
    } finally { setStripeLoading(false); }
  };

  const handleFinish = async () => {
    setFinishLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ setup_complete: true }),
      });
      if (!res.ok) {
        toast({ title: "Couldn't save — please try again.", variant: "destructive" });
        return;
      }
      localStorage.removeItem(`opedd_setup_step_${user?.id}`);
      toast({ title: "You're all set", description: "Your archive is live and AI-ready." });
      navigate("/dashboard", { replace: true });
    } catch {
      toast({ title: "Couldn't save — please try again.", variant: "destructive" });
    } finally { setFinishLoading(false); }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCopyEmail = async () => {
    const email = profile?.inbound_email || "newsletter@inbound.opedd.com";
    const ok = await copyToClipboard(email);
    if (ok) { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000); }
  };

  const handleCopyWebhook = async () => {
    const ok = await copyToClipboard("https://api.opedd.com/platform-webhook");
    if (ok) { setWebhookCopied(true); setTimeout(() => setWebhookCopied(false), 2000); }
  };

  const handleTestWebhook = async () => {
    const key = profile?.api_key || "";
    if (!key) {
      setWebhookTestState("error");
      setWebhookTestMessage("No API key on your profile yet — refresh and try again.");
      return;
    }
    setWebhookTestState("loading");
    setWebhookTestMessage("");
    try {
      const res = await fetch("https://api.opedd.com/platform-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Opedd-Api-Key": key,
          "X-Platform": "custom",
        },
        body: JSON.stringify({
          post: {
            test: true,
            title: "Webhook Test",
            url: "https://example.com/webhook-test",
            published_at: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        setWebhookTestState("success");
        setWebhookTestMessage("Your API key is valid and Opedd accepts your payload.");
      } else if (res.status === 401) {
        setWebhookTestState("error");
        setWebhookTestMessage("API key rejected. Copy the key again and retry.");
      } else {
        const text = await res.text().catch(() => "");
        setWebhookTestState("error");
        setWebhookTestMessage(text || `Opedd returned ${res.status}. Try again.`);
      }
    } catch {
      setWebhookTestState("error");
      setWebhookTestMessage("Network error — check your connection and retry.");
    }
  };

  const handleCopyApiKey = async () => {
    const key = profile?.api_key || "";
    if (!key) return;
    const ok = await copyToClipboard(key);
    if (ok) { setApiKeyCopied(true); setTimeout(() => setApiKeyCopied(false), 2000); }
  };

  const renderFeedDetection = () => (
    <>
      {detectingFeeds && (
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <Loader2 size={14} className="animate-spin text-[#4A26ED]" />
          Detecting your content source…
        </div>
      )}
      {!detectingFeeds && feedDetectionDone && detectedFeeds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#040042]">Detected feeds:</p>
          {detectedFeeds.map((feed) => (
            <label key={feed.url} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedFeedUrl === feed.url ? "border-[#4A26ED] bg-[#4A26ED]/5" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}>
              <input
                type="radio"
                name="detected-feed"
                checked={selectedFeedUrl === feed.url}
                onChange={() => {
                  setSelectedFeedUrl(feed.url);
                  if (platform === "custom") setSitemapUrl(feed.url);
                }}
                className="accent-[#4A26ED]"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-[#040042]">Sitemap</span>
                <span className="text-xs text-[#6B7280] ml-1.5 truncate block">{feed.url}</span>
              </div>
            </label>
          ))}
        </div>
      )}
      {!detectingFeeds && feedDetectionDone && detectedFeeds.length === 0 && feedDetectInput.length >= 8 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          No sitemap detected — you can enter a URL manually.
        </div>
      )}
    </>
  );

  // Platform-specific sync instruction for step 4
  const getSyncInstruction = (): string => {
    switch (platform) {
      case "substack":
        return "In Substack Settings → Subscribers → Add subscriber, enter this address and select 'Paid' → 'Complimentary' (no charge). That gives us both free and paid posts. You can revoke anytime.";
      case "beehiiv":
        return "In Beehiiv → Subscribers → Add Subscriber, paste this email.";
      case "ghost":
        return "In Ghost Admin → Members → New member, add this email.";
      default:
        return "Add this email as a subscriber or contact in your email platform. Every newsletter you send will be imported automatically.";
    }
  };

  // Email-forwarding consent — records that the publisher has added our
  // ingest address to their Substack subscribers list. inbound-email will
  // stamp first_post_received_at on this row when the first post arrives,
  // closing the verification loop end-to-end.
  const [emailConsentGranting, setEmailConsentGranting] = useState(false);
  const [emailConsentGranted, setEmailConsentGranted] = useState(false);
  const [emailConsentError, setEmailConsentError] = useState("");

  const handleGrantEmailConsent = async () => {
    setEmailConsentError("");
    setEmailConsentGranting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "grant_email_forwarding_consent" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Could not record consent. Try again.");
      }
      setEmailConsentGranted(true);
    } catch (err: any) {
      setEmailConsentError(err?.message || "Could not record consent.");
    } finally {
      setEmailConsentGranting(false);
    }
  };

  if (!user || loading) return <PageLoader />;

  // ── Stepper ──
  const renderStepper = () => (
    <div className="border-b border-[#E5E7EB] bg-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between">
          {STEP_TITLES.map((title, i) => {
            const n = i + 1;
            const isCurrent = n === step;
            const isDone = n < step;
            const Icon = STEP_ICONS[i];
            return (
              <React.Fragment key={n}>
                {i > 0 && (
                  <div className="flex-1 flex items-center pt-5">
                    <div className="w-full h-0.5 relative bg-[#E5E7EB] rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-[#4A26ED] rounded-full"
                        initial={{ width: isDone ? "100%" : "0%" }}
                        animate={{ width: isDone ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5 min-w-0" style={{ width: 80 }}>
                  <Icon
                    size={16}
                    className={`mb-0.5 ${isCurrent ? "text-[#4A26ED]" : isDone ? "text-[#4A26ED]" : "text-[#9CA3AF]"}`}
                  />
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200
                      ${isCurrent
                        ? "bg-[#4A26ED] text-white shadow-[0_0_0_4px_rgba(74,38,237,0.12)]"
                        : isDone
                          ? "bg-[#4A26ED] text-white"
                          : "bg-white text-[#9CA3AF] border-2 border-[#E5E7EB]"
                      }`}
                  >
                    {isDone ? <Check size={14} /> : n}
                  </div>
                  <span
                    className={`text-[11px] leading-tight text-center
                      ${isCurrent ? "text-[#040042] font-medium" : isDone ? "text-[#4A26ED] font-medium" : "text-[#9CA3AF]"}`}
                  >
                    {title}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );

  const inboundEmail = profile?.inbound_email || "newsletter@inbound.opedd.com";
  const publisherApiKey = profile?.api_key || "";

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Logo + escape hatch */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={opeddLogoColor} alt="Opedd" className="h-7 w-auto" />
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#040042] transition-colors"
            aria-label="Exit setup and return to dashboard"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </button>
        </div>
      </div>

      {renderStepper()}

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* ===== STEP 1 — Connect Publication ===== */}
            {step === 1 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8">
                  <h1 className="text-2xl font-bold text-[#040042] tracking-tight">Where do you publish?</h1>
                  <p className="text-sm text-[#6B7280] leading-relaxed mt-2 max-w-prose">We'll pull your full archive — including paywalled content where possible.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {PLATFORM_OPTIONS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setPlatform(p.id); setStep1Error(""); }}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150
                          ${platform === p.id ? "border-[#4A26ED] bg-[#4A26ED]/5 shadow-sm" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"}`}
                      >
                        {p.logo ? (
                          <img src={p.logo} alt={p.label} className="w-8 h-8" />
                        ) : (
                          <Globe className="w-8 h-8 text-[#6B7280]" />
                        )}
                        <div>
                          <div className="font-semibold text-[#040042] text-sm">{p.label}</div>
                          <div className="text-xs text-[#6B7280]">{p.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform-specific fields */}
                {platform === "ghost" && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={ghostLogo} alt="Ghost" className="w-5 h-5" />
                      <span className="text-sm font-semibold text-[#040042]">Ghost Connection</span>
                    </div>
                    <p className="text-sm text-[#9CA3AF] italic">The Admin API Key gives us read access to your full archive, including members-only posts. It's created in Ghost Admin → Settings → Integrations.</p>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Ghost blog URL</label>
                      <Input placeholder="https://yourblog.ghost.io" value={ghostUrl} onChange={e => setGhostUrl(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Admin API Key (format: key_id:secret)</label>
                      <Input type="password" placeholder="key_id:hex_secret" value={ghostKey} onChange={e => setGhostKey(e.target.value)} className="mt-1" />
                      <p className="text-xs text-[#9CA3AF] mt-2">Ghost Admin → Settings → Integrations → Add Custom Integration → copy Admin API Key</p>
                    </div>
                    <p className="text-xs text-[#6B7280]">This gives us read access to your full post archive, including members-only content. We never write to your Ghost account.</p>
                  </div>
                )}

                {platform === "wordpress" && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={wordpressLogo} alt="WordPress" className="w-5 h-5" />
                      <span className="text-sm font-semibold text-[#040042]">WordPress Connection</span>
                    </div>
                    <p className="text-sm text-[#9CA3AF] italic">We use an Application Password to verify you own this site and import your content. Your password is only used once during import — we don't store it.</p>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Site URL</label>
                      <Input placeholder="https://yoursite.com" value={wpUrl} onChange={e => setWpUrl(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Username <span className="text-red-400">*</span></label>
                      <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Application Password <span className="text-red-400">*</span></label>
                      <Input type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" value={wpAppPassword} onChange={e => setWpAppPassword(e.target.value)} className="mt-1" />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                      To verify you own this site, we use a WordPress Application Password.
                      Create one in your WordPress Admin → Users → Profile → Application Passwords.
                      Enter any name (e.g. "Opedd") and click "Add New". Copy the generated password above.
                      This proves you're an admin and lets us import your full archive.
                    </div>
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#4A26ED] transition-colors">
                        <ChevronDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                        Don't have admin access? Import via sitemap instead
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-[#040042]">Sitemap URL</label>
                          <Input placeholder="https://yoursite.com/sitemap.xml" value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)} className="mt-1" />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                          Sitemap import requires ownership verification before your content becomes licensable. You'll need to add a verification code to your site.
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {platform === "beehiiv" && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={beehiivLogo} alt="Beehiiv" className="w-5 h-5" />
                      <span className="text-sm font-semibold text-[#040042]">Beehiiv Connection</span>
                    </div>
                    <p className="text-sm text-[#9CA3AF] italic">Your API key lets us securely import your full archive — including premium posts — directly from Beehiiv. This is the fastest way to get started.</p>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">API Key</label>
                      <Input type="password" placeholder="Your Beehiiv API key" value={beehiivApiKey} onChange={e => setBeehiivApiKey(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Publication ID</label>
                      <Input placeholder="pub_xxxxxxxx" value={beehiivPubId} onChange={e => setBeehiivPubId(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Publication URL <span className="text-[#9CA3AF] font-normal">(optional — only if you use a custom domain)</span></label>
                      <Input placeholder="https://yourpublication.com" value={beehiivUrl} onChange={e => setBeehiivUrl(e.target.value)} className="mt-1" />
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-2">Find your API Key and Publication ID in Beehiiv → Settings → Integrations → API</p>
                  </div>
                )}

                {platform === "substack" && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={substackLogo} alt="Substack" className="w-5 h-5" />
                      <span className="text-sm font-semibold text-[#040042]">Substack Connection</span>
                    </div>
                    <p className="text-sm text-[#6B7280] leading-relaxed">
                      Substack doesn't offer an API for third-party apps. We use three complementary paths — any combination works:
                    </p>
                    <ul className="text-xs text-[#6B7280] space-y-1 ml-4 list-disc">
                      <li><span className="font-medium text-[#374151]">RSS import</span> — pulls your last ~25 free posts instantly. Paid posts arrive as truncated previews (Substack limits RSS).</li>
                      <li><span className="font-medium text-[#374151]">Archive ZIP</span> — the only path that captures your full paid-post bodies. Exported from Substack Settings.</li>
                      <li><span className="font-medium text-[#374151]">Email forwarding</span> — subscribe our ingest address to catch new paid posts going forward (set up in the next step).</li>
                    </ul>

                    <div>
                      <label className="text-sm font-medium text-[#040042]">Your Substack URL</label>
                      <Input
                        placeholder="https://yourname.substack.com"
                        value={substackUrl}
                        onChange={e => setSubstackUrl(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-[#9CA3AF] mt-1">Custom domain is fine too — we detect the Substack alias.</p>
                    </div>

                    {/* ── RSS instant import ── */}
                    <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#040042]">Import recent posts now</p>
                          <p className="text-xs text-[#6B7280] mt-0.5">~25 most recent items via RSS. Instant.</p>
                        </div>
                        <Button
                          onClick={handleSubstackRssImport}
                          disabled={rssImporting || !substackUrl.trim()}
                          variant="outline"
                          className="h-9 px-4 text-sm"
                        >
                          {rssImporting ? (
                            <><Loader2 size={14} className="mr-2 animate-spin" /> Importing…</>
                          ) : (
                            <>Import from RSS</>
                          )}
                        </Button>
                      </div>
                      {rssImportResult && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            ✓ {rssImportResult.imported} new + {rssImportResult.updated} updated
                            {rssImportResult.truncated > 0 && (
                              <span className="text-emerald-600 font-normal">
                                ({rssImportResult.truncated} paid previews — upload the ZIP below for full bodies)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Archive ZIP upload ── */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-[#040042]">Upload your archive for full paid content</p>
                      <ol className="text-xs text-[#6B7280] space-y-0.5 list-decimal list-inside">
                        <li>Go to <span className="font-medium text-[#374151]">substack.com/settings/account</span></li>
                        <li>Click <span className="font-medium text-[#374151]">"Export data"</span>, wait for the email, download the ZIP</li>
                        <li>Drag the ZIP below — we'll read only <code className="font-mono text-[10px] bg-[#F3F4F6] px-1 py-0.5 rounded">posts.csv</code> and your post HTML bodies; everything else in the archive (subscribers, analytics, payments) is ignored by design</li>
                      </ol>

                      {csvImportResult && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            ✓ {csvImportResult.imported} imported
                            {csvImportResult.updated != null && csvImportResult.updated > 0 && `, ${csvImportResult.updated} updated`}
                            {csvImportResult.total_posts != null && ` (of ${csvImportResult.total_posts} rows)`}
                          </div>
                          {(csvImportResult.draft_skipped || csvImportResult.podcast_or_thread_skipped || csvImportResult.html_missing) ? (
                            <p className="text-xs text-emerald-600 ml-6">
                              Skipped: {csvImportResult.draft_skipped || 0} drafts · {csvImportResult.podcast_or_thread_skipped || 0} non-newsletter · {csvImportResult.html_missing || 0} missing HTML
                            </p>
                          ) : null}
                          {csvImportResult.privacy_note && (
                            <p className="text-xs text-[#6B7280] ml-6 italic">{csvImportResult.privacy_note}</p>
                          )}
                        </div>
                      )}

                      {!csvImportResult && (
                        <div
                          onDragOver={e => { e.preventDefault(); setSubstackDragging(true); }}
                          onDragLeave={() => setSubstackDragging(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setSubstackDragging(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) {
                              const n = f.name.toLowerCase();
                              if (!n.endsWith(".zip") && !n.endsWith(".csv")) {
                                setStep1Error("Please upload the .zip file Substack gave you (or posts.csv for older exports).");
                                return;
                              }
                              const maxSize = n.endsWith(".zip") ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
                              if (f.size > maxSize) {
                                setStep1Error(`File too large (max ${n.endsWith(".zip") ? "500" : "50"} MB).`);
                                return;
                              }
                              setSubstackFile(f);
                              setStep1Error("");
                            }
                          }}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".zip,.csv";
                            input.onchange = (e: any) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const n = f.name.toLowerCase();
                                if (!n.endsWith(".zip") && !n.endsWith(".csv")) {
                                  setStep1Error("Please upload the .zip file Substack gave you (or posts.csv for older exports).");
                                  return;
                                }
                                const maxSize = n.endsWith(".zip") ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
                                if (f.size > maxSize) {
                                  setStep1Error(`File too large (max ${n.endsWith(".zip") ? "500" : "50"} MB).`);
                                  return;
                                }
                                setSubstackFile(f);
                                setStep1Error("");
                              }
                            };
                            input.click();
                          }}
                          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-150
                            ${substackDragging ? "border-[#4A26ED] bg-[#4A26ED]/5" : substackFile ? "border-emerald-300 bg-emerald-50" : "border-[#D1D5DB] hover:border-[#4A26ED]/40"}`}
                        >
                          {substackFile ? (
                            <div className="flex items-center justify-center gap-2">
                              <FileText size={18} className="text-emerald-600" />
                              <span className="text-sm font-medium text-[#040042]">{substackFile.name}</span>
                              <span className="text-xs text-[#6B7280]">({(substackFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                              <button onClick={e => { e.stopPropagation(); setSubstackFile(null); }} className="text-xs text-[#6B7280] hover:text-red-500 ml-2 underline">Remove</button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload size={24} className="mx-auto text-[#9CA3AF]" />
                              <p className="text-sm text-[#6B7280]">Drag & drop the <span className="font-medium">ZIP</span> (or <span className="font-medium">posts.csv</span>) here, or click to browse</p>
                              <p className="text-xs text-[#9CA3AF]">ZIP up to 500 MB · CSV up to 50 MB</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {platform === "custom" && (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-4">
                    <p className="text-sm text-[#9CA3AF] italic">Enter your sitemap URL and we'll import all article URLs. You'll need to verify ownership before your content becomes licensable.</p>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">Sitemap URL</label>
                      <Input placeholder="https://yoursite.com/sitemap.xml" value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)} className="mt-1" />
                      <p className="text-xs text-[#6B7280] mt-1">We'll import all article URLs from your sitemap.</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#040042]">API Key (optional)</label>
                      <Input type="password" placeholder="API key (optional — for Brevo, ConvertKit, etc.)" value={customApiKey} onChange={e => setCustomApiKey(e.target.value)} className="mt-1" />
                      <p className="text-xs text-[#6B7280] mt-1">If your platform provides an API key, paste it here for full content import.</p>
                    </div>
                    {renderFeedDetection()}
                  </div>
                )}

                {step1Error && (
                  <p className="text-sm text-red-600 font-medium">{step1Error}</p>
                )}

                {/* Substack: allow continuing either via ZIP upload OR after a
                    successful RSS import. Both paths are valid for advancing. */}
                {platform && !csvImportResult && (
                  <>
                    {platform === "substack" && !substackFile && rssImportResult && (
                      <Button
                        onClick={() => { setStep(2); startImportPoll(); }}
                        className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11 rounded-xl font-medium shadow-sm"
                      >
                        Continue with RSS import (skip ZIP for now) <ChevronRight size={16} className="ml-1" />
                      </Button>
                    )}
                    <Button
                      onClick={handleStep1Continue}
                      disabled={step1Loading || (platform === "substack" && substackMode === "csv" && (!substackFile || !substackUrl.trim()))}
                      className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11 rounded-xl font-medium shadow-sm"
                    >
                      {step1Loading ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          {platform === "ghost" ? "Connecting to Ghost..." : platform === "substack" && substackMode === "csv" ? "Importing…" : "Importing..."}
                        </>
                      ) : (
                        platform === "substack" && substackMode === "csv" ? (
                          <>Upload and Import <ChevronRight size={16} className="ml-1" /></>
                        ) : platform === "wordpress" ? (
                          <>Verify & Import Archive <ChevronRight size={16} className="ml-1" /></>
                        ) : (
                          <>Continue <ChevronRight size={16} className="ml-1" /></>
                        )
                      )}
                    </Button>
                  </>
                )}
              </>
            )}

            {/* ===== STEP 2 — Categorise ===== */}
            {step === 2 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8">
                  <h1 className="text-2xl font-bold text-[#040042] tracking-tight">Help buyers find your content</h1>
                  <p className="text-sm text-[#6B7280] leading-relaxed mt-2 max-w-prose">Tell us what you write about. AI companies and media groups use this to discover publishers in their industry.</p>

                  <div className="flex flex-wrap gap-2 mt-6">
                    {[...CATEGORIES, "Other"].map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150
                          ${selectedCategory === c
                            ? "bg-[#4A26ED] text-white border-[#4A26ED] shadow-sm"
                            : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#4A26ED]/40 hover:shadow-[0_0_0_2px_rgba(74,38,237,0.08)]"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {selectedCategory === "Other" && (
                    <motion.div
                      initial={{ opacity: 0, maxHeight: 0 }}
                      animate={{ opacity: 1, maxHeight: 80 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4"
                    >
                      <Input
                        placeholder="Describe your content area…"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        autoFocus
                      />
                    </motion.div>
                  )}

                  {!canProceedCategory && selectedCategory === "Other" && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-[#9CA3AF]">
                      <Info size={12} />
                      <span>Required to continue — enter at least 2 characters.</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleSaveCategory();
                      setStep(3);
                      startImportPoll();
                    }}
                    disabled={!canProceedCategory}
                    className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-1 h-11 rounded-xl font-medium shadow-sm"
                  >
                    Continue <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </>
            )}

            {/* ===== STEP 3 — Import Progress ===== */}
            {step === 3 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-5">
                  <h1 className="text-2xl font-bold text-[#040042] tracking-tight">Importing your archive</h1>
                  <p className="text-sm text-[#6B7280] leading-relaxed mt-2 max-w-prose">This runs in the background — you can continue setting up while we import.</p>

                  {platform && (
                    <div className="flex items-center gap-3 bg-[#FAFAFA] rounded-xl px-4 py-3 border border-[#E5E7EB]">
                      {PLATFORM_OPTIONS.find(p => p.id === platform)?.logo ? (
                        <img src={PLATFORM_OPTIONS.find(p => p.id === platform)!.logo!} alt="" className="w-6 h-6" />
                      ) : (
                        <Globe size={20} className="text-[#6B7280]" />
                      )}
                      <span className="font-medium text-[#040042] text-sm">{PLATFORM_OPTIONS.find(p => p.id === platform)?.label}</span>
                    </div>
                  )}

                  {importError && !importDone ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-amber-700 font-medium">
                        <AlertTriangle size={16} />
                        Still working in background
                      </div>
                      <p className="text-xs text-amber-600">The import is taking longer than expected but is still running. You can continue setup — your content will appear once it's done.</p>
                    </div>
                  ) : !importDone ? (
                    <>
                      <div className="w-full h-2 bg-[#EEF0FF] rounded-full overflow-hidden">
                        {importProgress.total > 0 ? (
                          <motion.div
                            key="determinate"
                            className="h-full rounded-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED]"
                            initial={false}
                            animate={{ width: `${Math.min(99, Math.round((importProgress.processed / importProgress.total) * 100))}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        ) : (
                          <motion.div
                            key="indeterminate"
                            className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED]"
                            animate={{ x: ["-100%", "300%"] }}
                            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        {importProgress.total > 0
                          ? `Importing your archive — ${importProgress.processed} of ${importProgress.total} articles processed.`
                          : "Importing your archive — this can take a few minutes for large publications."}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                      <CheckCircle2 size={18} />
                      <span className="text-sm font-medium">Import complete — {articleCount} articles registered</span>
                    </div>
                  )}

                  <div className="space-y-2.5 mt-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      {importDone ? <CheckCircle2 size={16} className="text-emerald-600" /> : importError ? <AlertTriangle size={16} className="text-amber-500" /> : <Loader2 size={16} className="text-[#4A26ED] animate-spin" />}
                      <span className={importDone ? "text-emerald-700 font-medium" : "text-[#6B7280]"}>Articles registered</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      {importDone ? <CheckCircle2 size={16} className="text-emerald-600" /> : importError ? <AlertTriangle size={16} className="text-amber-500" /> : <Loader2 size={16} className="text-[#4A26ED] animate-spin" />}
                      <span className={importDone ? "text-emerald-700 font-medium" : "text-[#6B7280]"}>Licensing activated</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-1 h-11 rounded-xl font-medium shadow-sm"
                  >
                    Continue <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </>
            )}

            {/* ===== STEP 4 — Set Up Sync ===== */}
            {step === 4 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-2">
                  <h1 className="text-2xl font-bold text-[#040042] tracking-tight">Keep your content in sync</h1>
                  <p className="text-sm text-[#6B7280] leading-relaxed max-w-prose">Choose how new articles reach Opedd automatically.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1 — Email Sync */}
                  <div className="rounded-2xl border-2 border-[#4A26ED]/30 bg-white shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail size={18} className="text-[#4A26ED]" />
                      <span className="text-sm font-semibold text-[#040042]">Email Sync</span>
                      <Badge className="bg-[#4A26ED] text-white text-[10px] px-1.5 py-0">Recommended</Badge>
                    </div>

                    <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 flex items-center gap-2">
                      <code className="text-[#334155] font-mono text-sm flex-1 truncate">{inboundEmail}</code>
                      <Button size="sm" variant="ghost" className="shrink-0 text-xs gap-1 h-7" onClick={handleCopyEmail}>
                        {emailCopied ? <Check size={12} /> : <Copy size={12} />}
                        {emailCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <p className="text-xs text-[#6B7280]">{getSyncInstruction()}</p>

                    <p className="text-xs text-[#9CA3AF]">Works with every email platform. Full content including premium/paywalled posts.</p>

                    {/* Consent confirmation — records that the publisher has
                        added our ingest address. inbound-email stamps
                        first_post_received_at when the first post arrives. */}
                    <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                      {emailConsentGranted ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Consent recorded. We'll confirm when your first post arrives.
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs w-full"
                            disabled={emailConsentGranting}
                            onClick={handleGrantEmailConsent}
                          >
                            {emailConsentGranting ? (
                              <><Loader2 size={12} className="mr-1.5 animate-spin" /> Recording…</>
                            ) : (
                              <>I've added it — confirm</>
                            )}
                          </Button>
                          {emailConsentError && (
                            <p className="text-xs text-red-600">{emailConsentError}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card 2 — Publish Webhook */}
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-[#6B7280]" />
                      <span className="text-sm font-semibold text-[#040042]">Publish Webhook</span>
                    </div>

                    <p className="text-xs text-[#6B7280]">For content published on your website (not emailed)</p>

                    <div>
                      <label className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">Webhook URL</label>
                      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 flex items-center gap-2 mt-1">
                        <code className="text-[#334155] font-mono text-sm flex-1 truncate">https://api.opedd.com/platform-webhook</code>
                        <Button size="sm" variant="ghost" className="shrink-0 text-xs gap-1 h-7" onClick={handleCopyWebhook}>
                          {webhookCopied ? <Check size={12} /> : <Copy size={12} />}
                          {webhookCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {publisherApiKey && (
                      <div>
                        <label className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">API Key</label>
                        <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 flex items-center gap-2 mt-1">
                          <code className="text-[#334155] font-mono text-sm flex-1 truncate">{publisherApiKey}</code>
                          <Button size="sm" variant="ghost" className="shrink-0 text-xs gap-1 h-7" onClick={handleCopyApiKey}>
                            {apiKeyCopied ? <Check size={12} /> : <Copy size={12} />}
                            {apiKeyCopied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#4A26ED] transition-colors group">
                        <ChevronDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                        How to integrate
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-3 overflow-x-auto">
                          <pre className="text-[#334155] font-mono text-xs whitespace-pre">{`fetch("https://api.opedd.com/platform-webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Opedd-Api-Key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    post: {
      title: "Article Title",
      url: "https://yoursite.com/article",
      content: "Full HTML content...",
      published_at: new Date().toISOString()
    }
  })
})`}</pre>
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-2">Add this call to your CMS publish workflow. Works with any platform.</p>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Test webhook — validates API key + endpoint before the user wires it to their CMS */}
                    <div className="pt-2 border-t border-[#E5E7EB]">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={webhookTestState === "loading" || !publisherApiKey}
                        onClick={handleTestWebhook}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {webhookTestState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
                        {webhookTestState === "loading" ? "Testing..." : "Test webhook"}
                      </Button>
                      {webhookTestState === "success" && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{webhookTestMessage}</span>
                        </div>
                      )}
                      {webhookTestState === "error" && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{webhookTestMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncConfirmed}
                    onChange={e => setSyncConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#4A26ED] focus:ring-[#4A26ED]"
                  />
                  <span className="text-sm text-[#040042]">I have set up at least one sync method</span>
                </label>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(5)}
                    disabled={!syncConfirmed}
                    className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-1 h-11 rounded-xl font-medium shadow-sm"
                  >
                    Continue <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </>
            )}

            {/* ===== STEP 5 — Set Pricing ===== */}
            {step === 5 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-[#040042] tracking-tight">How much is your content worth to AI companies?</h1>
                    <p className="text-sm text-[#6B7280] leading-relaxed mt-2 max-w-prose">Set your AI licensing prices. You can adjust these anytime in Settings.</p>
                  </div>

                  {/* Suggested price hero card */}
                  {suggestedPrice > 0 && (
                    <div className="bg-gradient-to-br from-[#EEF0FD] to-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-5">
                      <p className="text-sm text-[#040042]">
                        {articleCount > 0 ? (
                          <>Based on your <span className="font-semibold">{articleCount}</span> articles{effectiveCategory ? <> in <span className="font-semibold">{effectiveCategory}</span></> : null}, we suggest:</>
                        ) : (
                          <>Based on your <span className="font-semibold">{effectiveCategory || "category"}</span>, we suggest:</>
                        )}
                      </p>
                      <p className="text-2xl font-bold text-[#4A26ED] mt-2">
                        ${suggestedPrice.toLocaleString()}/year
                        <span className="text-sm font-normal text-[#6B7280] ml-2">
                          (${(suggestedPrice / 12).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month)
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-[#040042]">Annual Catalog Price (USD)</label>
                      <Input
                        type="number" min="0" step="100"
                        value={setupAiAnnualPrice}
                        onChange={e => setSetupAiAnnualPrice(e.target.value)}
                        placeholder="e.g. 12000"
                        className="mt-1"
                      />
                      <p className="text-xs text-[#9CA3AF] mt-1">What AI labs pay per year for access to your full catalog.</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#040042]">Per-Article AI Price (USD)</label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={setupAiPrice}
                        onChange={e => setSetupAiPrice(e.target.value)}
                        placeholder="e.g. 25"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-[#040042]">Per-Article Human Price (USD)</label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={setupHumanPrice}
                        onChange={e => setSetupHumanPrice(e.target.value)}
                        placeholder="e.g. 5"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#040042]">Allow all AI use cases (recommended)</p>
                    {([
                      { key: "rag" as const, label: "RAG (Retrieval-Augmented Generation)" },
                      { key: "training" as const, label: "Model Training" },
                      { key: "inference" as const, label: "Inference (Real-time AI outputs)" },
                    ]).map(t => (
                      <label key={t.key} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setupAiTypes[t.key]}
                          onChange={e => setSetupAiTypes(prev => ({ ...prev, [t.key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-[#4A26ED] focus:ring-[#4A26ED]"
                        />
                        <span className="text-sm text-[#040042]">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  <Button
                    disabled={pricingSaving}
                    onClick={async () => {
                      setPricingSaving(true);
                      try {
                        const headers = await authHeaders();
                        const body: Record<string, unknown> = {
                          ai_license_types: setupAiTypes,
                          content_delivery_enabled: true,
                        };
                        if (setupAiAnnualPrice) body.ai_annual_price = Number(setupAiAnnualPrice);
                        if (setupAiPrice) body.default_ai_price = Number(setupAiPrice);
                        if (setupHumanPrice) body.default_human_price = Number(setupHumanPrice);
                        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
                          method: "PATCH", headers,
                          body: JSON.stringify(body),
                        });
                        const result = await res.json();
                        if (!result.success) throw new Error(result.error?.message || "Save failed");
                        toast({ title: "Pricing saved!" });
                        setStep(6);
                      } catch (err: unknown) {
                        toast({ title: "Save failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
                      } finally { setPricingSaving(false); }
                    }}
                    className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-1 h-11 rounded-xl font-medium shadow-sm"
                  >
                    {pricingSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Continue to Stripe <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </>
            )}

            {/* ===== STEP 6 — Connect Stripe ===== */}
            {step === 6 && (
              <>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm p-8 space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-[#040042] tracking-tight">Get paid for your content</h1>
                    <p className="text-sm text-[#6B7280] leading-relaxed mt-2 max-w-prose">Connect Stripe to receive payouts, or skip and connect later — nothing is lost.</p>
                  </div>

                  {stripeConnected ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                      <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                      <p className="text-lg font-semibold text-emerald-800">Stripe connected!</p>
                      <p className="text-sm text-emerald-600">You're ready to receive payouts when AI companies license your content.</p>
                    </div>
                  ) : (
                    <>
                      {profile?.stripe_account_id && profile?.stripe_disabled_reason ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                          <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">Stripe is waiting on one more step</p>
                            <p className="text-xs text-amber-700 mt-1">
                              {String(profile.stripe_disabled_reason).startsWith("currently_due:")
                                ? `Missing: ${String(profile.stripe_disabled_reason)
                                    .replace("currently_due:", "")
                                    .split(",")
                                    .map((r: string) => r.replace(/[._]/g, " "))
                                    .join(", ")}`
                                : String(profile.stripe_disabled_reason).replace(/[._]/g, " ")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                          <p className="text-sm text-emerald-700">Your earnings are held safely in escrow until you connect. No money is lost — you can connect Stripe anytime from Settings.</p>
                        </div>
                      )}

                      <Button
                        onClick={handleConnectStripe}
                        disabled={stripeLoading}
                        className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11 rounded-xl font-medium shadow-sm"
                      >
                        {stripeLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Wallet size={16} className="mr-2" />}
                        {profile?.stripe_account_id && profile?.stripe_disabled_reason ? "Resume Stripe setup" : "Connect Stripe now"}
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-shrink-0"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  {stripeConnected ? (
                    <Button
                      onClick={handleFinish}
                      disabled={finishLoading}
                      className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white flex-1 h-11 rounded-xl font-medium shadow-sm"
                    >
                      {finishLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Finish setup
                    </Button>
                  ) : (
                    <Button
                      onClick={handleFinish}
                      disabled={finishLoading}
                      variant="outline"
                      className="h-11 rounded-xl border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] flex-1"
                    >
                      {finishLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Skip — finish later
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
