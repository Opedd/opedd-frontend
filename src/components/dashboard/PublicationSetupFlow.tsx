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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import opeddIcon from "@/assets/opedd-icon.svg";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";

type Platform = "substack" | "beehiiv" | "ghost" | "wordpress" | "custom";

interface PlatformOption {
  key: Platform;
  name: string;
  descriptor: string;
  logo: string | null;
  placeholder: string;
}

const PLATFORMS: PlatformOption[] = [
  { key: "substack", name: "Substack", descriptor: "Newsletter", logo: substackLogo, placeholder: "yourname.substack.com" },
  { key: "beehiiv", name: "Beehiiv", descriptor: "Newsletter", logo: beehiivLogo, placeholder: "yourname.beehiiv.com" },
  { key: "ghost", name: "Ghost", descriptor: "Blog / CMS", logo: ghostLogo, placeholder: "yourblog.ghost.io" },
  { key: "wordpress", name: "WordPress", descriptor: "Blog / CMS", logo: wordpressLogo, placeholder: "yourblog.com" },
  { key: "custom", name: "Custom / Enterprise", descriptor: "Media company", logo: null, placeholder: "theinformation.com" },
];

type StepState = "locked" | "active" | "verifying" | "done";

interface StepData {
  platform: Platform | null;
  pubUrl: string;
  pubName: string;
  articleCount: number;
  sourceId: string;
  verificationToken: string;
  humanPrice: string;
  aiPrice: string;
  widgetCopied: boolean;
  widgetSkipped: boolean;
  publisherId: string;
}

const generateVerificationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `OPEDD-${code}`;
};

interface PublicationSetupFlowProps {
  onComplete: () => void;
}

export function PublicationSetupFlow({ onComplete }: PublicationSetupFlowProps) {
  const { user, getAccessToken } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepState, setStepState] = useState<Record<number, StepState>>({
    1: "active", 2: "locked", 3: "locked", 4: "locked",
  });

  const [data, setData] = useState<StepData>({
    platform: null,
    pubUrl: "",
    pubName: "",
    articleCount: 0,
    sourceId: "",
    verificationToken: generateVerificationCode(),
    humanPrice: "4.99",
    aiPrice: "49.99",
    widgetCopied: false,
    widgetSkipped: false,
    publisherId: "",
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch publisher ID on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const result = await res.json();
        if (result.success && result.data) {
          const pub = result.data.publisher || result.data;
          if (pub.id) setData(d => ({ ...d, publisherId: pub.id }));
        }
      } catch {}
    })();
  }, [user, getAccessToken]);

  const markStepDone = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setStepState(prev => ({ ...prev, [step]: "done" }));
    const next = step + 1;
    if (next <= 4) {
      setCurrentStep(next);
      setStepState(prev => ({ ...prev, [next]: "active" }));
    }
  };

  const completedCount = completedSteps.size;
  const isAllDone = completedSteps.has(1) && completedSteps.has(2) && completedSteps.has(3);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  // ─── Step 1: Connect Publication ───
  const handleConnectPublication = async () => {
    if (!data.platform || !data.pubUrl.trim() || !user) return;
    setIsConnecting(true);

    try {
      const domain = data.pubUrl.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const rawName = domain.split(".")[0];
      const pubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const verifyToken = generateVerificationCode();

      // Determine feed/sitemap URL based on platform
      let feedUrl = `https://${domain}`;
      let registrationPath = "newsletter_feed";

      if (data.platform === "substack" || data.platform === "beehiiv") {
        feedUrl = `https://${domain}/feed`;
        registrationPath = "newsletter_feed";
      } else if (data.platform === "ghost") {
        feedUrl = `https://${domain}/sitemap.xml`;
        registrationPath = "sitemap_import";
      } else if (data.platform === "wordpress") {
        feedUrl = `https://${domain}/sitemap.xml`;
        registrationPath = "sitemap_import";
      } else {
        feedUrl = `https://${domain}`;
        registrationPath = "bulk_enterprise";
      }

      // Insert rss_sources record
      const { data: existing } = await supabase
        .from("rss_sources")
        .select("id")
        .eq("user_id", user.id)
        .eq("feed_url", feedUrl)
        .maybeSingle();

      let sourceId = "";
      if (existing?.id) {
        await supabase.from("rss_sources").update({
          verification_token: verifyToken,
          sync_status: "syncing",
          registration_path: registrationPath,
        }).eq("id", existing.id);
        sourceId = existing.id;
      } else {
        const { data: inserted } = await supabase
          .from("rss_sources")
          .insert({
            user_id: user.id,
            name: pubName,
            feed_url: feedUrl,
            platform: data.platform === "custom" ? "other" : data.platform,
            sync_status: "syncing",
            registration_path: registrationPath,
            verification_token: verifyToken,
          })
          .select("id")
          .single();
        sourceId = inserted?.id || "";
      }

      // Trigger sync/import
      let articleCount = 0;
      if (data.platform === "substack" || data.platform === "beehiiv") {
        // RSS sync
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/sync-content-source`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sourceUrl: feedUrl }),
        });
        if (res.ok) {
          const syncData = await res.json().catch(() => ({}));
          articleCount = syncData.data?.items_imported ?? syncData.data?.items_found ?? 0;
        }
      } else {
        // Sitemap import (background)
        const sitemapUrl = data.platform === "custom"
          ? `https://${domain}/sitemap.xml`
          : feedUrl;
        const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/import-sitemap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sitemap_url: sitemapUrl }),
        });
        if (res.ok) {
          const result = await res.json().catch(() => ({}));
          articleCount = result.data?.new_articles_inserted || 0;
        }
      }

      // Update source record
      await supabase.from("rss_sources").update({
        sync_status: "active",
        article_count: articleCount,
        last_synced_at: new Date().toISOString(),
      }).eq("id", sourceId);

      setData(d => ({
        ...d,
        pubName,
        articleCount,
        sourceId,
        verificationToken: verifyToken,
      }));

      markStepDone(1);
      toast({ title: "Publication connected", description: `${articleCount} articles imported from ${pubName}` });
    } catch (err: any) {
      toast({ title: "Connection failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  // ─── Step 2: Verify Ownership ───
  const handleVerify = async () => {
    if (!data.sourceId) return;
    setIsVerifying(true);
    setStepState(prev => ({ ...prev, 2: "verifying" }));

    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/verify-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source_id: data.sourceId }),
      });
      const result = await res.json();
      if (result.success || result.data?.verified) {
        markStepDone(2);
        toast({ title: "Ownership verified", description: `${data.pubName} is now verified` });
      } else {
        setStepState(prev => ({ ...prev, 2: "active" }));
        toast({ title: "Verification failed", description: result.error?.message || "Code not found. Please check and try again.", variant: "destructive" });
      }
    } catch {
      setStepState(prev => ({ ...prev, 2: "active" }));
      toast({ title: "Verification failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Step 3: Save Pricing ───
  const handleSavePricing = async () => {
    if (!data.sourceId) return;
    setIsSavingPricing(true);
    try {
      const token = await getAccessToken();
      await fetch(`${EXT_SUPABASE_URL}/functions/v1/update-license-prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceId: data.sourceId,
          humanPrice: parseFloat(data.humanPrice) || 4.99,
          aiPrice: parseFloat(data.aiPrice) || 49.99,
          licensingEnabled: true,
        }),
      });
      markStepDone(3);
      toast({ title: "Pricing saved", description: `$${data.humanPrice} human · $${data.aiPrice} AI` });
    } catch {
      toast({ title: "Failed to save pricing", variant: "destructive" });
    } finally {
      setIsSavingPricing(false);
    }
  };

  // ─── Step 4: Widget ───
  const widgetCode = data.publisherId
    ? `<script src="${EXT_SUPABASE_URL}/functions/v1/widget"\n  data-publisher-id="${data.publisherId}"\n  async></script>`
    : `<script src="${EXT_SUPABASE_URL}/functions/v1/widget"\n  data-publisher="pub_XXXXXX"\n  async></script>`;

  const handleSkipWidget = () => {
    setData(d => ({ ...d, widgetSkipped: true }));
    setCompletedSteps(prev => new Set([...prev, 4]));
    setStepState(prev => ({ ...prev, 4: "done" }));
  };

  const handleWidgetDone = () => {
    setData(d => ({ ...d, widgetCopied: true }));
    markStepDone(4);
  };

  // ─── Step Indicator ───
  const StepCircle = ({ step, state }: { step: number; state: StepState }) => {
    if (state === "done") {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
          <Check size={16} strokeWidth={2.5} />
        </div>
      );
    }
    if (state === "verifying") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#4A26ED]/20 flex items-center justify-center flex-shrink-0">
          <Loader2 size={16} className="text-[#4A26ED] animate-spin" />
        </div>
      );
    }
    if (state === "active") {
      return (
        <div className="w-8 h-8 rounded-full bg-[#4A26ED] text-white flex items-center justify-center flex-shrink-0 text-sm font-semibold">
          {step}
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-sm font-medium">
        {step}
      </div>
    );
  };

  // ─── Render ───
  return (
    <div className="p-8 max-w-3xl w-full mx-auto space-y-6">
      {/* Header Card */}
      {isAllDone ? (
        <div className="bg-[#040042] rounded-2xl p-6 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">You're live on Opedd</h2>
            <p className="text-sm text-[#A78BFA] mt-0.5">
              {data.pubUrl} · Verified · {data.articleCount} articles · ${data.humanPrice}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm"
            >
              Go to dashboard
            </button>
            <button className="text-[#A78BFA] hover:text-white text-sm font-medium transition-colors">
              Add another publication
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#040042] rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <img src={opeddIcon} alt="" className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">Set up your publication</h2>
            <p className="text-sm text-[#A78BFA] mt-0.5">
              Complete each step to activate licensing on your content
            </p>
          </div>
          <div className="text-sm text-white/60 font-medium flex-shrink-0">
            Step {currentStep} of 4
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {/* Step 1: Your Publication */}
        <StepCard
          step={1}
          title="Your publication"
          state={stepState[1]}
          doneSummary={
            data.platform
              ? `${PLATFORMS.find(p => p.key === data.platform)?.name} · ${data.pubUrl} · ${data.articleCount} articles imported`
              : ""
          }
          StepCircle={StepCircle}
        >
          {/* Platform picker */}
          {!data.platform ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setData(d => ({ ...d, platform: p.key }))}
                  className="border border-slate-200 rounded-xl p-4 hover:border-[#4A26ED] hover:bg-[#4A26ED]/5 transition-all text-center group"
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-slate-50 flex items-center justify-center">
                    {p.logo ? (
                      <img src={p.logo} alt={p.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <Globe size={20} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#040042]">{p.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.descriptor}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setData(d => ({ ...d, platform: null, pubUrl: "" }))}
                  className="text-xs text-[#4A26ED] hover:underline"
                >
                  ← Change platform
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-[#040042] block mb-1.5">
                  {data.platform === "custom" ? "Domain" : "Publication URL"}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={data.pubUrl}
                    onChange={e => setData(d => ({ ...d, pubUrl: e.target.value }))}
                    placeholder={PLATFORMS.find(p => p.key === data.platform)?.placeholder}
                    className="flex-1"
                  />
                  <button
                    onClick={handleConnectPublication}
                    disabled={isConnecting || !data.pubUrl.trim()}
                    className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Connect publication
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </StepCard>

        {/* Step 2: Verify Ownership */}
        <StepCard
          step={2}
          title="Verify ownership"
          state={stepState[2]}
          doneSummary={`Ownership verified · ${data.pubUrl}`}
          StepCircle={StepCircle}
        >
          {data.platform === "substack" || data.platform === "beehiiv" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Add this to your publication description</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono text-[#040042]">
                  opedd-verification: {data.verificationToken}
                </code>
                <button
                  onClick={() => handleCopy(`opedd-verification: ${data.verificationToken}`, "verify-code")}
                  className="h-10 w-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  {copied === "verify-code" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                </button>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>Go to <strong>Settings → Publication details → Description</strong></p>
                <p>Paste the code, save. Then click Verify below.</p>
                <p className="text-slate-400">You can remove it after verification is complete.</p>
              </div>
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : "Verify ownership"}
              </button>
              {stepState[2] === "verifying" && (
                <p className="text-xs text-[#4A26ED] flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Checking…
                </p>
              )}
            </div>
          ) : data.platform === "ghost" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#040042]">Connect via Ghost Content API</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>In Ghost Admin → <strong>Settings → Integrations</strong></p>
                <p>→ Add custom integration → copy the Content API Key</p>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Content API Key" className="flex-1" />
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <>Verify <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          ) : data.platform === "wordpress" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#040042]">Connect via Application Password</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>In WP Admin → <strong>Users → Profile → Application Passwords</strong></p>
                <p>→ Add New → copy the generated password</p>
              </div>
              <div className="space-y-3">
                <Input placeholder="Username" />
                <div className="flex gap-2">
                  <Input placeholder="App Password" className="flex-1" />
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-10 px-5 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <>Verify <ArrowRight size={14} /></>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Custom / Enterprise — DNS TXT */
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#040042]">Add a DNS TXT record to verify domain ownership</p>
              <p className="text-xs text-slate-500">
                Add the following record via your DNS provider (Cloudflare, Route 53, GoDaddy, Namecheap, etc.)
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-4 py-2 font-medium text-slate-500">Type</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500">Host</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-3 font-mono text-[#040042]">TXT</td>
                      <td className="px-4 py-3 font-mono text-[#040042]">
                        <span className="flex items-center gap-1.5">
                          _opedd.{data.pubUrl || "yourdomain.com"}
                          <button
                            onClick={() => handleCopy(`_opedd.${data.pubUrl || "yourdomain.com"}`, "dns-host")}
                            className="text-slate-400 hover:text-[#4A26ED]"
                          >
                            {copied === "dns-host" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#040042]">
                        <span className="flex items-center gap-1.5">
                          opedd-site-verify={data.verificationToken}
                          <button
                            onClick={() => handleCopy(`opedd-site-verify=${data.verificationToken}`, "dns-value")}
                            className="text-slate-400 hover:text-[#4A26ED]"
                          >
                            {copied === "dns-value" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400">DNS changes typically take 5–15 minutes to propagate.</p>
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : "I've added the record — Verify now"}
              </button>
              {stepState[2] === "verifying" && (
                <p className="text-xs text-[#4A26ED] flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Checking DNS…
                </p>
              )}
            </div>
          )}
        </StepCard>

        {/* Step 3: Set Your Pricing */}
        <StepCard
          step={3}
          title="Set your pricing"
          state={stepState[3]}
          doneSummary={`Pricing set · $${data.humanPrice} human · $${data.aiPrice} AI`}
          StepCircle={StepCircle}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#040042] block mb-1.5">Human license price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={data.humanPrice}
                    onChange={e => setData(d => ({ ...d, humanPrice: e.target.value }))}
                    className="pl-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">per use</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Charged per article, per buyer</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#040042] block mb-1.5">AI license price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={data.aiPrice}
                    onChange={e => setData(d => ({ ...d, aiPrice: e.target.value }))}
                    className="pl-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">per use</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Typically 10–50× the human rate for AI training use</p>
              </div>
            </div>
            <button
              onClick={handleSavePricing}
              disabled={isSavingPricing}
              className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingPricing ? <Loader2 size={16} className="animate-spin" /> : "Save pricing"}
            </button>
          </div>
        </StepCard>

        {/* Step 4: Embed the Widget */}
        <StepCard
          step={4}
          title="Embed the widget"
          state={stepState[4]}
          doneSummary={
            data.widgetSkipped
              ? "Widget · not yet embedded"
              : "Widget active"
          }
          doneSummaryAmber={data.widgetSkipped}
          StepCircle={StepCircle}
        >
          <Tabs defaultValue="script" className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="script" className="text-xs">Script tag</TabsTrigger>
              <TabsTrigger value="wordpress" className="text-xs">WordPress plugin</TabsTrigger>
            </TabsList>
            <TabsContent value="script">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Paste this into your site's <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> or article template
                </p>
                <div className="bg-slate-900 rounded-xl p-4 relative">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{widgetCode}</pre>
                </div>
                <button
                  onClick={() => {
                    handleCopy(widgetCode, "widget");
                    handleWidgetDone();
                  }}
                  className="bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] text-white h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2"
                >
                  {copied === "widget" ? <Check size={16} /> : <Copy size={16} />}
                  Copy snippet
                </button>
                <p className="text-xs text-slate-400">
                  The widget auto-detects each article and shows the license button to visitors. Works on paywalled articles.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="wordpress">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Download and install the Opedd WordPress plugin</p>
                <button className="border border-slate-200 text-[#040042] h-11 px-6 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors">
                  <ExternalLink size={16} />
                  Download WordPress Plugin
                </button>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>1. Download the .zip file</p>
                  <p>2. In WP Admin → Plugins → Add New → Upload Plugin</p>
                  <p>3. Activate and enter your publisher ID in the settings</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <button
            onClick={handleSkipWidget}
            className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now
          </button>
        </StepCard>
      </div>
    </div>
  );
}

// ─── Step Card Component ───
interface StepCardProps {
  step: number;
  title: string;
  state: StepState;
  doneSummary: string;
  doneSummaryAmber?: boolean;
  children: React.ReactNode;
  StepCircle: React.FC<{ step: number; state: StepState }>;
}

function StepCard({ step, title, state, doneSummary, doneSummaryAmber, children, StepCircle }: StepCardProps) {
  const isExpanded = state === "active" || state === "verifying";
  const isDone = state === "done";
  const isLocked = state === "locked";

  return (
    <div
      className={`
        rounded-2xl border shadow-sm transition-all
        ${isExpanded ? "border-[#4A26ED]/30 bg-[#4A26ED]/[0.02]" : "border-slate-200 bg-white"}
        ${isLocked ? "opacity-60" : ""}
      `}
    >
      <div className="flex items-center gap-4 p-5">
        <StepCircle step={step} state={state} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isLocked ? "text-slate-400" : "text-[#040042]"}`}>
            {title}
          </h3>
          {isDone && doneSummary && (
            <p className={`text-xs mt-0.5 ${doneSummaryAmber ? "text-amber-500" : "text-slate-500"}`}>
              ✓ {doneSummary}
            </p>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="px-5 pb-5 pl-[4.25rem]">
          {children}
        </div>
      )}
    </div>
  );
}
