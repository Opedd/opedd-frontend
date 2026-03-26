import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { PageLoader } from "@/components/ui/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Copy, Check, Globe, ChevronRight, ChevronDown, Mail, ExternalLink, Wallet, Info, CheckCircle2, Upload, FileText, AlertTriangle, Radio } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { EXT_SUPABASE_REST } from "@/lib/constants";
import { copyToClipboard } from "@/lib/clipboard";
import { deriveSlug } from "@/lib/utils";

import substackLogo from "@/assets/platforms/substack.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";

type Platform = "ghost" | "wordpress" | "beehiiv" | "substack" | "custom";

const STEP_TITLES = [
  "Connect Publication",
  "Import Progress",
  "Install Widget",
  "Connect Stripe",
  "Set Pricing",
  "Categorise",
];

const CATEGORIES = [
  "Finance & Markets", "Technology", "Politics & Policy", "Business",
  "Media & Journalism", "Science", "Health & Medicine", "Law & Regulation",
  "Energy & Climate", "Defence & Security", "Culture & Society", "Sports",
  "Travel", "Food & Lifestyle", "Education", "Real Estate",
  "Crypto & Web3", "AI & Machine Learning",
];

const PLATFORM_OPTIONS: { id: Platform; label: string; desc: string; logo: string | null }[] = [
  { id: "substack", label: "Substack", desc: "Archive via data export (includes premium content)", logo: substackLogo },
  { id: "beehiiv", label: "Beehiiv", desc: "Full archive via API key (includes premium content)", logo: beehiivLogo },
  { id: "ghost", label: "Ghost", desc: "Full archive via Admin API (includes members-only)", logo: ghostLogo },
  { id: "wordpress", label: "WordPress", desc: "Full archive — automatic, no credentials needed", logo: wordpressLogo },
  { id: "custom", label: "Custom / Other", desc: "Any CMS with a sitemap URL", logo: null },
];

export default function Setup() {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [wpUrl, setWpUrl] = useState("");
  const [wpConfirmed, setWpConfirmed] = useState(false);
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [substackMode, setSubstackMode] = useState<"csv" | "sitemap">("csv");
  const [substackFile, setSubstackFile] = useState<File | null>(null);
  const [substackDragging, setSubstackDragging] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  // Feed detection
  type DetectedFeed = { url: string; type: "sitemap" | "rss" };
  const [detectingFeeds, setDetectingFeeds] = useState(false);
  const [detectedFeeds, setDetectedFeeds] = useState<DetectedFeed[]>([]);
  const [feedDetectionDone, setFeedDetectionDone] = useState(false);
  const [selectedFeedUrl, setSelectedFeedUrl] = useState<string>("");

  // Derive the URL to detect feeds for (only for sitemap-based flows)
  // Beehiiv uses API key, Ghost uses Admin API — no feed detection needed for those
  const feedDetectInput =
    platform === "substack" && substackMode === "sitemap" ? substackUrl :
    platform === "custom" ? sitemapUrl : "";

  const debouncedFeedUrl = useDebounce(feedDetectInput, 600);

  // Step 2
  const [importDone, setImportDone] = useState(false);
  const [articleCount, setArticleCount] = useState(0);

  // Step 3
  const [embedSnippet, setEmbedSnippet] = useState("");

  // Step 4
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Step 5 — AI Pricing
  const [setupAiAnnualPrice, setSetupAiAnnualPrice] = useState("");
  const [setupAiPrice, setSetupAiPrice] = useState("25");
  const [setupHumanPrice, setSetupHumanPrice] = useState("5");
  const [setupAiTypes, setSetupAiTypes] = useState({ rag: true, training: true, inference: true });
  const [pricingSaving, setPricingSaving] = useState(false);

  // Step 6
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expertiseSummary, setExpertiseSummary] = useState("");
  const [finishLoading, setFinishLoading] = useState(false);

  // Copy states
  const [emailCopied, setEmailCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initial load — check setup_complete, restore step
  useEffect(() => {
    if (!user) return;
    (async () => {
      const p = await fetchProfile();
      if (p?.setup_complete) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setProfile(p);
      setPublisherId(p?.id || user.id);
      setStripeConnected(!!p?.stripe_onboarding_complete);
      if (p?.categories?.length) setSelectedCategories(p.categories);
      if (p?.expertise_summary) setExpertiseSummary(p.expertise_summary);

      // Restore step
      const saved = localStorage.getItem(`opedd_setup_step_${user.id}`);
      if (saved) {
        const s = parseInt(saved, 10);
        if (s >= 1 && s <= 6) setStep(s);
      }
      setLoading(false);
    })();
  }, [user, fetchProfile, navigate]);

  // Persist step
  useEffect(() => {
    if (user) localStorage.setItem(`opedd_setup_step_${user.id}`, String(step));
  }, [step, user]);

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
    let domain = debouncedFeedUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!domain) return;

    let cancelled = false;
    setDetectingFeeds(true);
    setDetectedFeeds([]);
    setFeedDetectionDone(false);
    setSelectedFeedUrl("");

    (async () => {
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/detect-feeds?domain=${encodeURIComponent(domain)}`, {
          headers: { apikey: EXT_ANON_KEY },
        });
        if (cancelled) return;
        const json = await res.json();
        const feeds: DetectedFeed[] = [];
        if (json.sitemaps?.length) {
          json.sitemaps.forEach((s: string) => feeds.push({ url: s, type: "sitemap" }));
        }
        if (json.feeds?.length) {
          json.feeds.forEach((f: string) => feeds.push({ url: f, type: "rss" }));
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

    // ── WORDPRESS: REST API (no credentials needed) ──
    if (platform === "wordpress") {
      if (!wpUrl) { setStep1Error("Please enter your WordPress site URL."); return; }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST",
          headers,
          body: JSON.stringify({ url: wpUrl, platform: "wordpress", credentials: { site_url: wpUrl, username: wpUsername, app_password: wpAppPassword } }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStep1Error(json?.error || "WordPress REST API not accessible — check the URL.");
          return;
        }
        setStep(2);
        startImportPoll();
      } catch {
        setStep1Error("Network error. Please try again.");
      } finally {
        setStep1Loading(false);
      }
      return;
    }

    // ── SUBSTACK CSV: upload posts.csv ──
    if (platform === "substack" && substackMode === "csv") {
      if (!substackFile) { setStep1Error("Please select a posts.csv file."); return; }
      if (substackFile.size > 50 * 1024 * 1024) { setStep1Error("File too large (max 50 MB)."); return; }
      if (!substackFile.name.endsWith(".csv")) { setStep1Error("Please upload a .csv file from your Substack export."); return; }
      setStep1Loading(true);
      try {
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
        setCsvImportResult({ imported: json.imported ?? 0, skipped: json.skipped ?? 0 });
        setTimeout(() => { setStep(2); startImportPoll(); }, 2000);
      } catch (err: any) {
        setStep1Error(err?.message || "Upload failed — please try again.");
      } finally {
        setStep1Loading(false);
      }
      return;
    }

    // ── BEEHIIV: API v2 (full archive including premium) ──
    if (platform === "beehiiv") {
      if (!beehiivApiKey || !beehiivPubId) {
        setStep1Error("Please enter your API Key and Publication ID.");
        return;
      }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        const url = beehiivUrl || `https://${beehiivPubId}.beehiiv.com`;
        const res = await fetch(`${EXT_SUPABASE_URL}/platform-connect`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            url,
            platform: "beehiiv",
            credentials: { api_key: beehiivApiKey, pub_id: beehiivPubId },
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStep1Error(json?.error || "Connection failed — check your API Key and Publication ID.");
          return;
        }
        setStep(2);
        startImportPoll();
      } catch {
        setStep1Error("Network error. Please try again.");
      } finally {
        setStep1Loading(false);
      }
      return;
    }

    // ── GHOST: Admin API (full archive including members-only) ──
    if (platform === "ghost") {
      if (!ghostUrl || !ghostKey) {
        setStep1Error("Please enter your Ghost URL and Admin API Key.");
        return;
      }
      setStep1Loading(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${EXT_SUPABASE_URL}/import-ghost`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ghost_url: ghostUrl, admin_api_key: ghostKey }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (res.status === 401) { setStep1Error("Authentication failed — check your Admin API Key."); }
          else if (res.status === 502) { setStep1Error("Could not reach your Ghost blog — check the URL."); }
          else { setStep1Error(json?.error || "Import failed."); }
          return;
        }
        setStep(2);
        startImportPoll();
      } catch {
        setStep1Error("Network error. Please try again.");
      } finally {
        setStep1Loading(false);
      }
      return;
    }

    // ── SUBSTACK SITEMAP / CUSTOM: sitemap-based import ──
    setStep1Loading(true);
    try {
      const headers = await authHeaders();
      let url = selectedFeedUrl || sitemapUrl;
      if (!selectedFeedUrl && platform === "substack" && substackUrl) {
        url = substackUrl.replace(/\/$/, "") + "/sitemap.xml";
      }
      if (!url) { setStep1Error("Please enter a URL."); setStep1Loading(false); return; }

      const res = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sitemap_url: url }),
      });
      if (!res.ok) {
        setStep1Error("Import failed — check the URL and try again.");
        return;
      }
      setStep(2);
      startImportPoll();
    } catch {
      setStep1Error("Network error. Please try again.");
    } finally {
      setStep1Loading(false);
    }
  };

  const startImportPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const p = await fetchProfile();
      if (p) {
        setArticleCount(p.article_count || 0);
        if (p.content_imported) {
          setImportDone(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    }, 5000);
  };

  // Step 3 — fetch embed snippet
  useEffect(() => {
    if (step === 3) {
      (async () => {
        try {
          const headers = await authHeaders();
          const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile?action=embed_snippets`, { headers });
          const json = await res.json();
          if (json.success && json.data?.html_snippet) setEmbedSnippet(json.data.html_snippet);
        } catch { /* ignore */ }
      })();
    }
  }, [step, authHeaders]);

  // Step 4 — auto-skip if stripe connected
  useEffect(() => {
    if (step === 4 && stripeConnected) setStep(5);
  }, [step, stripeConnected]);

  // Step 5 — compute suggested price
  const suggestedPrice = React.useMemo(() => {
    const count = articleCount || 0;
    if (count === 0) return 0;
    const base = Math.max(count * 15, 3000);
    const capped = Math.min(base, 50000);
    const cat = selectedCategories[0] || "";
    let multiplier = 1.0;
    if (/finance|legal|law|healthcare|health|medicine|defen/i.test(cat)) multiplier = 2.0;
    else if (/energy|policy|politic/i.test(cat)) multiplier = 1.5;
    else if (/technology/i.test(cat)) multiplier = 1.3;
    return Math.round((capped * multiplier) / 500) * 500;
  }, [articleCount, selectedCategories]);

  // Pre-fill suggested price when entering step 5
  useEffect(() => {
    if (step === 5 && suggestedPrice > 0 && !setupAiAnnualPrice) {
      setSetupAiAnnualPrice(String(suggestedPrice));
  }, [step, stripeConnected]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "connect_stripe" }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      toast({ title: "Error", description: "Couldn't start Stripe setup.", variant: "destructive" });
    } finally {
      setStripeLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ categories: selectedCategories, expertise_summary: expertiseSummary, setup_complete: true }),
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
    } finally {
      setFinishLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    const ok = await copyToClipboard("newsletter@inbound.opedd.com");
    if (ok) { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000); }
  };

  const handleCopySnippet = async () => {
    const ok = await copyToClipboard(embedSnippet);
    if (ok) { setSnippetCopied(true); setTimeout(() => setSnippetCopied(false), 2000); }
  };

  const toggleCategory = (c: string) => {
    setSelectedCategories(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 5 ? [...prev, c] : prev
    );
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
                <span className="text-xs font-medium text-[#040042]">{feed.type === "sitemap" ? "Sitemap" : "RSS Feed"}</span>
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

  if (!user || loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Step indicator */}
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            {STEP_TITLES.map((title, i) => {
              const n = i + 1;
              const isCurrent = n === step;
              const isDone = n < step;
              return (
                <React.Fragment key={n}>
                  {i > 0 && <div className={`w-6 h-px ${isDone ? "bg-[#4A26ED]" : "bg-[#E5E7EB]"}`} />}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                      ${isCurrent ? "bg-[#4A26ED] text-white" : isDone ? "bg-[#4A26ED]/10 text-[#4A26ED]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {isDone ? <Check size={14} /> : n}
                    </div>
                    <span className={`text-xs hidden sm:inline ${isCurrent ? "text-[#040042] font-medium" : "text-[#9CA3AF]"}`}>{title}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Where do you publish?</h1>
              <p className="text-sm text-[#6B7280] mt-1">We'll pull your full archive — including paywalled content where possible.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setStep1Error(""); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${platform === p.id ? "border-[#4A26ED] bg-[#4A26ED]/5" : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"}`}
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

            {/* Platform-specific fields */}
            {platform === "ghost" && (
              <div className="space-y-3 bg-white rounded-xl border border-[#E5E7EB] p-5">
                <p className="text-sm text-[#9CA3AF] italic mb-4">The Admin API Key gives us read access to your full archive, including members-only posts. It's created in Ghost Admin → Settings → Integrations.</p>
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

                {/* Ghost webhook callout */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mt-2 group">
                    <div className="flex items-center gap-2 flex-1">
                      <img src={ghostLogo} alt="Ghost" className="w-4 h-4" />
                      <span className="text-sm font-medium text-[#040042]">Live sync via Ghost webhook</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D1D5DB] text-[#6B7280]">Optional</Badge>
                    </div>
                    <ChevronDown size={14} className="text-[#9CA3AF] transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    <p className="text-xs text-[#6B7280]">
                      To receive new articles instantly when you publish, add a webhook in your Ghost Admin panel:
                    </p>
                    <ol className="text-xs text-[#6B7280] space-y-1 list-decimal list-inside">
                      <li>Go to Ghost Admin → Settings → Integrations → Add custom integration</li>
                      <li>Name it <span className="font-medium text-[#040042]">"Opedd"</span></li>
                      <li>Under Webhooks, add: <span className="font-medium text-[#040042]">Event = Post published</span></li>
                      <li>Paste the URL below and save</li>
                    </ol>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs font-mono text-[#040042] truncate">
                        https://djdzcciayennqchjgybx.supabase.co/functions/v1/platform-webhook
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs gap-1"
                        onClick={async () => {
                          const ok = await copyToClipboard("https://djdzcciayennqchjgybx.supabase.co/functions/v1/platform-webhook");
                          if (ok) { setWebhookCopied(true); setTimeout(() => setWebhookCopied(false), 2000); }
                        }}
                      >
                        {webhookCopied ? <Check size={12} /> : <Copy size={12} />}
                        {webhookCopied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF]">
                      Without this, articles sync via our scheduled feed (up to 15 min delay).
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {platform === "wordpress" && (
              <div className="space-y-3 bg-white rounded-xl border border-[#E5E7EB] p-5">
                <h3 className="text-sm font-semibold text-[#040042]">Connect your WordPress site</h3>
                <p className="text-xs text-[#6B7280]">We'll import all your published posts automatically.</p>
                <p className="text-sm text-[#9CA3AF] italic mb-4">We use an Application Password to verify you own this site and import your content. Your password is only used once during import — we don't store it.</p>
                <div>
                  <label className="text-sm font-medium text-[#040042]">Site URL</label>
                  <Input placeholder="https://yoursite.com" value={wpUrl} onChange={e => setWpUrl(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#040042]">Username</label>
                  <Input placeholder="admin" value={wpUsername} onChange={e => setWpUsername(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#040042]">Application Password</label>
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
              <div className="space-y-3 bg-white rounded-xl border border-[#E5E7EB] p-5">
                <p className="text-sm text-[#9CA3AF] italic mb-4">Your API key lets us securely import your full archive — including premium posts — directly from Beehiiv. This is the fastest way to get started.</p>
                <div>
                  <label className="text-sm font-medium text-[#040042]">API Key</label>
                  <Input type="password" placeholder="Your Beehiiv API key" value={beehiivApiKey} onChange={e => setBeehiivApiKey(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#040042]">Publication ID</label>
                  <Input placeholder="pub_xxxxxxxx" value={beehiivPubId} onChange={e => setBeehiivPubId(e.target.value)} className="mt-1" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">Find these in Beehiiv → Settings → Integrations → API</p>
                <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-[#7C3AED]" />
                    <span className="text-sm font-medium text-[#040042]">For new posts</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">Add <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> as a subscriber in Beehiiv → Subscribers → Add Subscriber</p>
                  <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                    {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {emailCopied ? "Copied!" : "Copy email"}
                  </Button>
                </div>
              </div>
            )}

            {platform === "substack" && (
              <div className="space-y-4 bg-white rounded-xl border border-[#E5E7EB] p-5">
                <p className="text-sm text-[#9CA3AF] italic mb-4">Your archive export is the only way to capture premium content from Substack, since Substack has no API. Public posts can be imported via URL, but paywalled content requires the data export.</p>
                {/* Instructions */}
                <ol className="text-xs text-[#6B7280] space-y-0.5 list-decimal list-inside">
                  <li>Go to <span className="font-medium text-[#374151]">substack.com/settings/account</span></li>
                  <li>Click <span className="font-medium text-[#374151]">"Export data"</span></li>
                  <li>Download the ZIP and extract <code className="font-mono text-[10px] bg-[#F3F4F6] px-1 py-0.5 rounded">posts.csv</code></li>
                  <li>Drag <span className="font-medium text-[#374151]">posts.csv</span> into the box below</li>
                </ol>

                {/* Success state */}
                {csvImportResult && (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        ✓ {csvImportResult.imported} post{csvImportResult.imported !== 1 ? "s" : ""} imported ({csvImportResult.skipped} skipped)
                      </div>
                      <p className="text-xs text-emerald-600 mt-1 ml-6">Paywalled content included — full article bodies stored for AI delivery.</p>
                    </div>
                    {/* Inbound email callout after successful import */}
                    <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={14} className="text-[#7C3AED]" />
                        <span className="text-sm font-medium text-[#040042]">For new posts</span>
                      </div>
                      <p className="text-xs text-[#6B7280]">Add <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> as a free subscriber in Substack → Settings → Email</p>
                      <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                        {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                        {emailCopied ? "Copied!" : "Copy email"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Drag & drop zone */}
                {!csvImportResult && (
                  <div
                    onDragOver={e => { e.preventDefault(); setSubstackDragging(true); }}
                    onDragLeave={() => setSubstackDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setSubstackDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        if (!f.name.endsWith(".csv")) { setStep1Error("Please upload a .csv file from your Substack export."); return; }
                        if (f.size > 50 * 1024 * 1024) { setStep1Error("File too large. Split your export or use sitemap import instead."); return; }
                        setSubstackFile(f);
                        setStep1Error("");
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv";
                      input.onchange = (e: any) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (!f.name.endsWith(".csv")) { setStep1Error("Please upload a .csv file from your Substack export."); return; }
                          if (f.size > 50 * 1024 * 1024) { setStep1Error("File too large. Split your export or use sitemap import instead."); return; }
                          setSubstackFile(f);
                          setStep1Error("");
                        }
                      };
                      input.click();
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                      ${substackDragging ? "border-[#4A26ED] bg-[#4A26ED]/5" : substackFile ? "border-emerald-300 bg-emerald-50" : "border-[#D1D5DB] hover:border-[#4A26ED]/40"}`}
                  >
                    {substackFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText size={18} className="text-emerald-600" />
                        <span className="text-sm font-medium text-[#040042]">{substackFile.name}</span>
                        <span className="text-xs text-[#6B7280]">({(substackFile.size / 1024).toFixed(0)} KB)</span>
                        <button onClick={e => { e.stopPropagation(); setSubstackFile(null); }} className="text-xs text-[#6B7280] hover:text-red-500 ml-2 underline">Remove</button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload size={24} className="mx-auto text-[#9CA3AF]" />
                        <p className="text-sm text-[#6B7280]">Drag & drop <span className="font-medium">posts.csv</span> here, or click to browse</p>
                        <p className="text-xs text-[#9CA3AF]">Max 50MB</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible fallback to sitemap */}
                {!csvImportResult && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#4A26ED] transition-colors">
                      <ChevronDown size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                      Don't have the export? Import via URL instead
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-[#040042]">Substack URL</label>
                        <Input placeholder="https://yourname.substack.com" value={substackUrl} onChange={e => { setSubstackUrl(e.target.value); setSubstackMode("sitemap"); }} className="mt-1" />
                      </div>
                      {renderFeedDetection()}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {platform === "custom" && (
              <div className="space-y-3 bg-white rounded-xl border border-[#E5E7EB] p-5">
                <p className="text-sm text-[#9CA3AF] italic mb-4">Enter your sitemap URL and we'll import all article URLs. You'll need to verify ownership before your content becomes licensable.</p>
                <div>
                  <label className="text-sm font-medium text-[#040042]">Sitemap URL</label>
                  <Input placeholder="https://yoursite.com/sitemap.xml" value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)} className="mt-1" />
                  <p className="text-xs text-[#6B7280] mt-1">We'll import all article URLs from your sitemap.</p>
                </div>
                {renderFeedDetection()}
              </div>
            )}

            {step1Error && (
              <p className="text-sm text-red-600 font-medium">{step1Error}</p>
            )}

            {platform && !csvImportResult && (
              <Button
                onClick={handleStep1Continue}
                disabled={step1Loading || (platform === "substack" && substackMode === "csv" && !substackFile)}
                className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11"
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
            )}
          </>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Importing your archive</h1>
              <p className="text-sm text-[#6B7280] mt-1">This runs in the background — you can continue setting up while we import.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
              {platform && (
                <div className="flex items-center gap-3">
                  {PLATFORM_OPTIONS.find(p => p.id === platform)?.logo ? (
                    <img src={PLATFORM_OPTIONS.find(p => p.id === platform)!.logo!} alt="" className="w-6 h-6" />
                  ) : (
                    <Globe size={20} className="text-[#6B7280]" />
                  )}
                  <span className="font-medium text-[#040042] text-sm">{PLATFORM_OPTIONS.find(p => p.id === platform)?.label}</span>
                </div>
              )}

              {!importDone ? (
                <>
                  <div className="w-full h-1.5 bg-[#EEF0FF] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4A26ED] rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                  <p className="text-xs text-[#6B7280]">Importing your archive — this can take a few minutes for large publications. You can close this window and come back; the import will continue in the background.</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Import complete — {articleCount} articles registered</span>
                </div>
              )}

              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  {importDone ? <CheckCircle2 size={14} className="text-green-600" /> : <Loader2 size={14} className="text-[#9CA3AF] animate-spin" />}
                  <span className={importDone ? "text-green-700" : "text-[#6B7280]"}>Articles registered</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {importDone ? <CheckCircle2 size={14} className="text-green-600" /> : <Loader2 size={14} className="text-[#9CA3AF] animate-spin" />}
                  <span className={importDone ? "text-green-700" : "text-[#6B7280]"}>Licensing activated</span>
                </div>
              </div>

              {/* Platform-specific inbound email / sync callout */}
              {importDone && platform === "substack" && (
                <div className="bg-[#EEF0FD] rounded-lg p-4 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-[#7C3AED]" />
                    <span className="text-sm font-medium text-[#040042]">Receive new premium posts automatically</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">Add <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> as a free subscriber in Substack → Settings → Email → Manage.</p>
                  <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                    {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {emailCopied ? "Copied!" : "Copy email"}
                  </Button>
                </div>
              )}
              {importDone && platform === "beehiiv" && (
                <div className="bg-[#EEF0FD] rounded-lg p-4 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-[#7C3AED]" />
                    <span className="text-sm font-medium text-[#040042]">Receive new posts automatically</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">Add <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> as a subscriber in Beehiiv → Audience → Add Subscriber.</p>
                  <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                    {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {emailCopied ? "Copied!" : "Copy email"}
                  </Button>
                </div>
              )}
              {importDone && platform === "ghost" && (
                <div className="bg-[#EEF0FD] rounded-lg p-4 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-[#7C3AED]" />
                    <span className="text-sm font-medium text-[#040042]">Real-time sync</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">Ghost supports webhooks for real-time sync — set one up in Ghost Admin → Settings → Integrations for instant content delivery. Alternatively, add <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> as a member.</p>
                  <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                    {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {emailCopied ? "Copied!" : "Copy email"}
                  </Button>
                </div>
              )}
              {importDone && platform === "wordpress" && (
                <div className="bg-[#EEF0FD] rounded-lg p-4 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-[#040042]">Automatic sync active</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">New posts will sync automatically via the WordPress REST API on a regular schedule. No additional setup needed.</p>
                </div>
              )}
              {importDone && platform === "custom" && (
                <div className="bg-[#EEF0FD] rounded-lg p-4 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} className="text-[#7C3AED]" />
                    <span className="text-sm font-medium text-[#040042]">Receive new content automatically</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">Forward your newsletter to <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">newsletter@inbound.opedd.com</code> or set up a webhook.</p>
                  <Button size="sm" variant="ghost" className="text-xs mt-2 text-[#7C3AED]" onClick={handleCopyEmail}>
                    {emailCopied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                    {emailCopied ? "Copied!" : "Copy email"}
                  </Button>
                </div>
              )}
            </div>

            <Button onClick={() => setStep((platform === "substack" || platform === "beehiiv") ? 4 : 3)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11">
              {(platform === "substack" || platform === "beehiiv") ? "Continue" : "Continue to widget setup"} <ChevronRight size={16} className="ml-1" />
            </Button>
          </>
        )}

        {/* ===== STEP 3 ===== */}
        {step === 3 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Add the licensing widget to your site</h1>
              <p className="text-sm text-[#6B7280] mt-1">One snippet. Works on every article — no per-article setup needed.</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
              {platform === "wordpress" ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Already done — the plugin auto-injects the widget on all posts.</span>
                </div>
              ) : platform === "beehiiv" || platform === "substack" ? (
                <div className="space-y-3">
                  <p className="text-sm text-[#6B7280]">
                    {platform === "beehiiv" ? "Beehiiv" : "Substack"} doesn't support custom JS on article pages. Your widget is available as a standalone page instead.
                  </p>
                  {embedSnippet && (
                    <div className="relative">
                      <pre className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{embedSnippet}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-xs" onClick={handleCopySnippet}>
                        {snippetCopied ? <Check size={12} /> : <Copy size={12} />}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-[#6B7280]">Use this snippet in email footers or link to it from your publication.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {platform === "ghost" && (
                    <p className="text-sm text-[#6B7280]">Ghost Admin → Settings → Code Injection → Site Header. Paste the snippet and save.</p>
                  )}
                  {embedSnippet ? (
                    <div className="relative">
                      <pre className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{embedSnippet}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-xs" onClick={handleCopySnippet}>
                        {snippetCopied ? <Check size={12} /> : <Copy size={12} />}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]"><Loader2 size={14} className="animate-spin" /> Loading snippet...</div>
                  )}
                </div>
              )}

              {profile?.website_url && (
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="text-xs text-[#4A26ED] hover:underline inline-flex items-center gap-1">
                  Test your widget <ExternalLink size={10} />
                </a>
              )}
            </div>

            <Button onClick={() => setStep(4)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </>
        )}

        {/* ===== STEP 4 ===== */}
        {step === 4 && (
          <>
            {(platform === "substack" || platform === "beehiiv") && (() => {
              const pubUrl = platform === "substack" ? substackUrl : beehiivUrl;
              const slug = deriveSlug(pubUrl);
              return slug ? (
                <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2 mb-4">
                  Your licensing page is live at <span className="font-mono font-semibold">opedd.com/p/{slug}</span> — share it with buyers.
                </p>
              ) : null;
            })()}
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Get paid for your content</h1>
              <p className="text-sm text-[#6B7280] mt-1">Connect Stripe to receive payouts, or skip and connect later — nothing is lost.</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700">Your earnings are held safely in escrow until you connect. No money is lost — you can connect Stripe anytime from Settings.</p>
            </div>

            <Button onClick={() => setStep(5)} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11">
              Continue — I'll connect Stripe when I earn <ChevronRight size={16} className="ml-1" />
            </Button>

            <div className="text-center">
              <button onClick={handleConnectStripe} disabled={stripeLoading} className="text-sm text-[#4A26ED] hover:underline font-medium inline-flex items-center gap-1.5">
                {stripeLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                Or connect Stripe now (3–5 minutes)
              </button>
            </div>
          </>
        )}

        {/* ===== STEP 5 ===== */}
        {step === 5 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-[#040042]">Help buyers find your content</h1>
              <p className="text-sm text-[#6B7280] mt-1">Tell us what you write about. AI companies and media groups use this to discover publishers in their industry.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${selectedCategories.includes(c)
                      ? "bg-[#4A26ED] text-white border-[#4A26ED]"
                      : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#D1D5DB]"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            {selectedCategories.length >= 5 && (
              <p className="text-xs text-[#6B7280]">Maximum 5 categories selected.</p>
            )}

            <div>
              <label className="text-sm font-medium text-[#040042]">One-sentence expertise summary</label>
              <Input
                placeholder="e.g. Covering US-China geopolitics and Asian markets since 2003."
                value={expertiseSummary}
                onChange={e => { if (e.target.value.length <= 200) setExpertiseSummary(e.target.value); }}
                className="mt-1"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">{expertiseSummary.length}/200</p>
            </div>

            <Button onClick={handleFinish} disabled={finishLoading} className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white w-full h-11">
              {finishLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Go live →
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
