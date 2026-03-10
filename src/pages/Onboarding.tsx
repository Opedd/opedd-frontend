import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Loader2,
  CheckCircle2,
  Rss,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Code,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

type Step = "domain" | "feeds" | "verify" | "prices" | "embed";

interface FeedInfo {
  base_url: string;
  sitemap_urls: string[];
  rss_urls: string[];
  estimated_article_count: number;
  has_sitemap: boolean;
  has_rss: boolean;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("domain");
  const [domain, setDomain] = useState("");
  const [feedInfo, setFeedInfo] = useState<FeedInfo | null>(null);
  const [selectedSitemap, setSelectedSitemap] = useState("");
  const [humanPrice, setHumanPrice] = useState("10");
  const [aiPrice, setAiPrice] = useState("50");
  const [isDetecting, setIsDetecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSettingPrices, setIsSettingPrices] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [verificationToken] = useState(() => `opedd-verify-${Math.random().toString(36).slice(2, 10)}`);
  const [copiedTxt, setCopiedTxt] = useState(false);
  const [dnsCheckStatus, setDnsCheckStatus] = useState<"idle" | "checking" | "pending" | "verified">("idle");
  const embedSnippet = `<script src="${EXT_SUPABASE_URL}/widget" data-publisher-id="YOUR_PUBLISHER_ID"><\/script>`;

  const detectFeeds = async () => {
    if (!domain.trim()) return;
    setIsDetecting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${EXT_SUPABASE_URL}/detect-feeds?domain=${encodeURIComponent(domain.trim())}`,
        {
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Detection failed");
      setFeedInfo(result.data);
      setSelectedSitemap(result.data.sitemap_urls[0] || result.data.rss_urls[0] || "");
      setStep("feeds");
    } catch (err) {
      toast({
        title: "Detection failed",
        description: err instanceof Error ? err.message : "Could not detect feeds",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const importSitemap = async () => {
    if (!selectedSitemap) return;
    setIsImporting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/import-sitemap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sitemap_url: selectedSitemap }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Import failed");
      setImportResult({ inserted: result.data.new_articles_inserted });
      // If using sitemap (custom domain), offer verification; otherwise skip to prices
      if (selectedSitemap && !selectedSitemap.includes("substack") && !selectedSitemap.includes("beehiiv")) {
        setStep("verify");
      } else {
        setStep("prices");
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Could not import sitemap",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const savePrices = async () => {
    const human = parseFloat(humanPrice);
    const ai = parseFloat(aiPrice);
    if (isNaN(human) || human < 0 || isNaN(ai) || ai < 0) {
      toast({ title: "Invalid prices", description: "Prices must be non-negative numbers.", variant: "destructive" });
      return;
    }
    setIsSettingPrices(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ default_human_price: human, default_ai_price: ai }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to save prices");
      setStep("embed");
    } catch (err) {
      toast({
        title: "Failed to save prices",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSettingPrices(false);
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const steps: Step[] = ["domain", "feeds", "verify", "prices", "embed"];
  const stepLabels = ["Your site", "Content", "Verify", "Pricing", "Embed"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#040042] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <img src={opeddLogo} alt="Opedd" className="h-8" />
        <div>{/* spacer */}</div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-3 pt-8 pb-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < stepIndex
                    ? "bg-emerald-500 text-white"
                    : i === stepIndex
                    ? "bg-[#4A26ED] text-white"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {i < stepIndex ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs ${i === stepIndex ? "text-white" : "text-white/40"}`}>
                {stepLabels[i]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-12 mb-5 ${i < stepIndex ? "bg-emerald-500" : "bg-white/10"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">

          {/* Step 1: Domain */}
          {step === "domain" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-[#4A26ED]/10 rounded-xl flex items-center justify-center mb-4">
                  <Globe size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-2xl font-bold text-[#040042]">What's your publication's URL?</h1>
                <p className="text-slate-500 mt-1">We'll auto-detect your sitemap and RSS feeds to import your content.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#040042]">Publication domain</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. theinformation.com"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && detectFeeds()}
                    className="border-slate-200 flex-1"
                  />
                </div>
                <p className="text-xs text-slate-400">Don't include https:// — just the domain name</p>
              </div>

              <Button
                onClick={detectFeeds}
                disabled={!domain.trim() || isDetecting}
                className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white h-11"
              >
                {isDetecting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Detecting feeds...</>
                ) : (
                  <><Rss size={16} className="mr-2" />Detect Content Feeds</>
                )}
              </Button>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-slate-400 hover:text-slate-500 text-xs transition-colors mt-2 self-center"
              >
                I'll do this later
              </button>
            </div>
          )}

          {/* Step 2: Feeds detected */}
          {step === "feeds" && feedInfo && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                  <FileText size={24} className="text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#040042]">We found your content</h1>
                <p className="text-slate-500 mt-1">
                  {feedInfo.estimated_article_count > 0
                    ? `~${feedInfo.estimated_article_count.toLocaleString()} articles detected`
                    : "Ready to import your content"}
                </p>
              </div>

              {feedInfo.has_sitemap && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sitemap (recommended)</p>
                  {feedInfo.sitemap_urls.map(url => (
                    <label key={url} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedSitemap === url ? "border-[#4A26ED] bg-[#4A26ED]/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <input
                        type="radio"
                        name="feed"
                        value={url}
                        checked={selectedSitemap === url}
                        onChange={() => setSelectedSitemap(url)}
                        className="mt-0.5 accent-[#4A26ED]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#040042] truncate">{url.replace(/^https?:\/\//, "")}</p>
                        <p className="text-xs text-slate-400">Full archive import</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {feedInfo.has_rss && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RSS feeds</p>
                  {feedInfo.rss_urls.map(url => (
                    <label key={url} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedSitemap === url ? "border-[#4A26ED] bg-[#4A26ED]/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <input
                        type="radio"
                        name="feed"
                        value={url}
                        checked={selectedSitemap === url}
                        onChange={() => setSelectedSitemap(url)}
                        className="mt-0.5 accent-[#4A26ED]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#040042] truncate">{url.replace(/^https?:\/\//, "")}</p>
                        <p className="text-xs text-slate-400">Latest ~50 articles</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!feedInfo.has_sitemap && !feedInfo.has_rss && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No feeds detected automatically</p>
                    <p className="text-xs text-amber-600 mt-1">You can manually enter a sitemap URL or skip and add content later.</p>
                  </div>
                </div>
              )}

              {(!feedInfo.has_sitemap && !feedInfo.has_rss) && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#040042]">Enter sitemap URL manually</Label>
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    value={selectedSitemap}
                    onChange={e => setSelectedSitemap(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("domain")} className="gap-2">
                  <ArrowLeft size={16} />Back
                </Button>
                {selectedSitemap ? (
                  <Button
                    onClick={importSitemap}
                    disabled={isImporting}
                    className="flex-1 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
                  >
                    {isImporting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Importing...</>
                    ) : (
                      <><Sparkles size={16} className="mr-2" />Import Content</>
                    )}
                  </Button>
                ) : (
                  <Button onClick={() => setStep("prices")} className="flex-1 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white gap-2">
                    Skip for now<ArrowRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step: Verify Domain */}
          {step === "verify" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                  <Shield size={24} className="text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#040042]">Verify domain ownership</h1>
                <p className="text-slate-500 mt-1">
                  Add a DNS TXT record to prove you own this domain. Verification unlocks trust badges on your widget.
                </p>
                <p className="text-xs text-slate-400 mt-2 italic">Optional but recommended</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TXT Record to add</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Host / Name</p>
                      <code className="text-sm font-mono text-[#040042]">_opedd-verify.{domain || "yourdomain.com"}</code>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <p className="text-xs text-slate-400">Value</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-[#040042] flex-1 truncate">{verificationToken}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(verificationToken);
                          setCopiedTxt(true);
                          setTimeout(() => setCopiedTxt(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-[#4A26ED] hover:text-[#3B1ED1]"
                      >
                        {copiedTxt ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setDnsCheckStatus("checking");
                  // Placeholder — will call verify-license endpoint when backend is ready
                  setTimeout(() => setDnsCheckStatus("pending"), 2000);
                }}
                disabled={dnsCheckStatus === "checking"}
                variant="outline"
                className="w-full h-11 border-slate-200"
              >
                {dnsCheckStatus === "checking" ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Checking DNS...</>
                ) : dnsCheckStatus === "pending" ? (
                  <><AlertCircle size={16} className="mr-2 text-amber-500" />Pending — DNS may take up to 48h to propagate</>
                ) : dnsCheckStatus === "verified" ? (
                  <><CheckCircle2 size={16} className="mr-2 text-emerald-500" />Domain Verified!</>
                ) : (
                  <><Shield size={16} className="mr-2" />Check DNS</>
                )}
              </Button>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("feeds")} className="gap-2">
                  <ArrowLeft size={16} />Back
                </Button>
                <Button
                  onClick={() => setStep("prices")}
                  className="flex-1 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white gap-2"
                >
                  {dnsCheckStatus === "verified" ? "Continue" : "Skip for now"}<ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Prices */}
          {step === "prices" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-[#D1009A]/10 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign size={24} className="text-[#D1009A]" />
                </div>
                <h1 className="text-2xl font-bold text-[#040042]">Set your default prices</h1>
                <p className="text-slate-500 mt-1">
                  {importResult
                    ? `${importResult.inserted.toLocaleString()} articles imported! Now set default licensing prices.`
                    : "Set default prices for licensing your content."}
                </p>
              </div>

              {importResult && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-emerald-700 font-medium">
                    {importResult.inserted.toLocaleString()} articles imported successfully
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#040042]">
                    Human republication
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={humanPrice}
                      onChange={e => setHumanPrice(e.target.value)}
                      className="border-slate-200 pl-7"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Per article, human use</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#040042]">
                    AI training
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={aiPrice}
                      onChange={e => setAiPrice(e.target.value)}
                      className="border-slate-200 pl-7"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Per article, AI ingestion</p>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                You can set per-article or per-category prices later in Settings → Content.
              </p>

              <Button
                onClick={savePrices}
                disabled={isSettingPrices}
                className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white h-11"
              >
                {isSettingPrices ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</>
                ) : (
                  <><ArrowRight size={16} className="mr-2" />Continue</>
                )}
              </Button>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-slate-400 hover:text-slate-500 text-xs transition-colors mt-2 self-center"
              >
                I'll do this later
              </button>
            </div>
          )}

          {/* Step 4: Embed snippet */}
          {step === "embed" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-[#4A26ED]/10 rounded-xl flex items-center justify-center mb-4">
                  <Code size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-2xl font-bold text-[#040042]">You're all set!</h1>
                <p className="text-slate-500 mt-1">Add this snippet to your site to show the licensing widget on every article.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Embed snippet</p>
                <div className="bg-[#040042] rounded-xl p-4 relative group">
                  <code className="text-emerald-400 text-xs font-mono break-all leading-relaxed">
                    {embedSnippet}
                  </code>
                  <button
                    onClick={copySnippet}
                    className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {copiedSnippet ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/60" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  The widget auto-detects article URLs and registers them. No per-page configuration needed.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next steps</p>
                <div className="space-y-2">
                  {[
                    "Paste the snippet in your site's <head> or before </body>",
                    "Visit a few article pages — they'll register automatically",
                    "Check your Content library to see imported articles",
                    "Set per-article prices or category-level pricing in Settings",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#4A26ED]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[#4A26ED] text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-[#4A26ED] hover:bg-[#3B1ED1] text-white h-11"
              >
                Go to Dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
