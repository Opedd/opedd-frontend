import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Shield,
  Clock,
  Loader2,
  ExternalLink,
  FileText,
  Calendar,
  Link2,
  DollarSign,
  AlertTriangle,
  Archive,
  Copy,
  Check,
  Pencil,
  X,
  Code2,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { Asset, AssetStatus } from "@/types/asset";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { decodeText } from "@/lib/utils";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";
import mediumLogo from "@/assets/platforms/medium.svg";

const platformLogos: Record<string, string> = {
  substack: substackLogo,
  ghost: ghostLogo,
  wordpress: wordpressLogo,
  beehiiv: beehiivLogo,
  medium: mediumLogo,
};

interface AssetDetailDrawerProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: string;
  onSetLicenseTerms?: (asset: Asset) => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function wordCount(text?: string): number {
  if (!text) return 0;
  const plain = stripHtml(text);
  return plain.split(/\s+/).filter(Boolean).length;
}

const statusConfig = (status: AssetStatus) => {
  switch (status) {
    case "protected":
    case "verified":
      return { label: "Protected", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Shield size={12} /> };
    case "syncing":
      return { label: "Syncing", className: "bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20", icon: <Loader2 size={12} className="animate-spin" /> };
    case "pending":
      return { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> };
    case "failed":
      return { label: "Failed", className: "bg-red-50 text-red-700 border-red-200", icon: <AlertTriangle size={12} /> };
    case "source_archived":
      return { label: "Archived", className: "bg-slate-50 text-slate-600 border-slate-200", icon: <Archive size={12} /> };
    default:
      return { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> };
  }
};

/* ─── Embed Snippets Sub-component ─── */
function EmbedSnippetsSection({ articleId }: { articleId: string }) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "generate_embed_snippets", article_id: articleId }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSnippets(result.data);
      }
    } catch (err) {
      console.error("Embed snippets error:", err);
    } finally {
      setLoading(false);
    }
  }, [articleId, getAccessToken]);

  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
    toast({ title: "Copied!", description: "Snippet copied to clipboard." });
  };

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-[#040042]/30" /></div>;
  if (!snippets) return null;

  const tabs = [
    { key: "html_card", label: "Card" },
    { key: "html_badge", label: "Badge" },
    { key: "html_compact", label: "Compact" },
    { key: "wordpress_shortcode", label: "WordPress" },
    { key: "direct_link", label: "Direct Link" },
  ].filter(t => snippets[t.key]);

  if (tabs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Code2 size={13} className="text-[#040042]/40" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#040042]/40">Embed Snippets</h3>
      </div>
      <Tabs defaultValue={tabs[0]?.key} className="w-full">
        <TabsList className="w-full h-8 bg-slate-100 rounded-lg p-0.5">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-[10px] px-2 py-1 h-7 data-[state=active]:bg-white">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-2">
            {t.key === "direct_link" ? (
              <div className="flex items-center gap-2">
                <a href={snippets[t.key]} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4A26ED] hover:underline break-all flex-1">
                  {snippets[t.key]}
                </a>
                <button onClick={() => handleCopy(t.key, snippets[t.key])} className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 text-[#040042]/50">
                  {copiedTab === t.key ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-[#040042]/70 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                  {snippets[t.key]}
                </pre>
                <button
                  onClick={() => handleCopy(t.key, snippets[t.key])}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-white border border-slate-200 text-[#040042]/50"
                >
                  {copiedTab === t.key ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <p className="text-[10px] text-[#040042]/40 mt-2">
        Need publisher-level snippets? Find them on the <span className="text-[#4A26ED]">Integrations</span> page.
      </p>
    </div>
  );
}

/* ─── Certificates Sub-component ─── */
function CertificatesSection({ articleId }: { articleId: string }) {
  const { getAccessToken } = useAuth();
  const [transactions, setTransactions] = useState<Array<{ id: string; license_key: string; license_type: string; created_at: string; buyer_email?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${EXT_SUPABASE_URL}/get-transactions`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok && result.success) {
          const all = result.data?.transactions || [];
          setTransactions(all.filter((t: any) => t.article_id === articleId && t.license_key && t.status === "completed"));
        }
      } catch (err) {
        console.error("Certificates fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId, getAccessToken]);

  if (loading) return <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-[#040042]/30" /></div>;
  if (transactions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Award size={13} className="text-[#040042]/40" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#040042]/40">Certificates</h3>
      </div>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#040042] truncate">{tx.license_key}</p>
              <p className="text-[10px] text-[#040042]/40">
                {tx.license_type === "ai" ? "AI" : "Human"} · {format(new Date(tx.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <a
              href={`${EXT_SUPABASE_URL}/certificate?key=${tx.license_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-[#4A26ED] hover:underline"
            >
              <Download size={11} />
              PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Drawer ─── */
export function AssetDetailDrawer({ asset, open, onOpenChange, platform, onSetLicenseTerms }: AssetDetailDrawerProps) {
  const [copied, setCopied] = React.useState(false);
  const [editingPricing, setEditingPricing] = useState(false);
  const [humanPrice, setHumanPrice] = useState("");
  const [aiPrice, setAiPrice] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [displayHumanPrice, setDisplayHumanPrice] = useState<number | null>(null);
  const [displayAiPrice, setDisplayAiPrice] = useState<number | null>(null);
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setDisplayHumanPrice(asset?.human_price ?? null);
    setDisplayAiPrice(asset?.ai_price ?? null);
  }, [asset?.id]);

  if (!asset) return null;

  const sc = statusConfig(asset.status);
  const logoSrc = platform ? platformLogos[platform.toLowerCase()] : undefined;
  const words = wordCount(asset.content);
  const plainContent = asset.content ? decodeText(stripHtml(asset.content)) : null;
  const decodedTitle = decodeText(asset.title);
  const decodedDescription = asset.description ? decodeText(stripHtml(asset.description)) : null;
  const pubDate = asset.publishedAt
    ? format(new Date(asset.publishedAt), "MMMM d, yyyy")
    : asset.createdAt
    ? format(new Date(asset.createdAt), "MMMM d, yyyy")
    : null;
  const licenseLink = `${window.location.origin}/l/${asset.id}`;

  const humanSold = asset.human_licenses_sold ?? 0;
  const aiSold = asset.ai_licenses_sold ?? 0;
  const totalRev = asset.total_revenue ?? asset.revenue ?? 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(licenseLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditPricing = () => {
    setHumanPrice(asset.human_price != null ? String(asset.human_price) : "");
    setAiPrice(asset.ai_price != null ? String(asset.ai_price) : "");
    setEditingPricing(true);
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const token = await getAccessToken();
      const newHuman = humanPrice !== "" ? parseFloat(humanPrice) || 0 : undefined;
      const newAi = aiPrice !== "" ? parseFloat(aiPrice) || 0 : undefined;
      const res = await fetch(`${EXT_SUPABASE_URL}/update-license-prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updates: [{ article_id: asset.id, human_price: newHuman, ai_price: newAi }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (newHuman !== undefined) setDisplayHumanPrice(newHuman);
      if (newAi !== undefined) setDisplayAiPrice(newAi);
      toast({ title: "Pricing Updated", description: `Prices saved for "${decodedTitle}".` });
      setEditingPricing(false);
    } catch (err) {
      console.error("Pricing save error:", err);
      toast({ title: "Update Failed", description: "Could not save pricing.", variant: "destructive" });
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col bg-white border-l border-[#E8F2FB]">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E8F2FB] space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-xs px-2.5 py-1 gap-1.5 ${sc.className}`}>
              {sc.icon}
              {sc.label}
            </Badge>
            {logoSrc && (
              <img src={logoSrc} alt={platform} className="h-5 w-5 object-contain" />
            )}
          </div>
          <SheetTitle className="text-lg font-bold text-[#040042] leading-snug pr-8">
            {decodedTitle}
          </SheetTitle>
          {/* Licensing Stats */}
          {(humanSold > 0 || aiSold > 0 || totalRev > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {humanSold > 0 && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  {humanSold} Human License{humanSold !== 1 ? "s" : ""}
                </Badge>
              )}
              {aiSold > 0 && (
                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1">
                  {aiSold} AI License{aiSold !== 1 ? "s" : ""}
                </Badge>
              )}
              {totalRev > 0 && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  <DollarSign size={10} />${totalRev.toFixed(2)} Revenue
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          {decodedDescription && (
            <div>
              <p className={`text-sm text-[#040042]/70 leading-relaxed ${!contentExpanded ? "line-clamp-3" : ""}`}>
                {decodedDescription}
              </p>
              {decodedDescription.length > 200 && (
                <button
                  onClick={() => setContentExpanded(!contentExpanded)}
                  className="flex items-center gap-1 text-xs text-[#4A26ED] mt-1 hover:underline"
                >
                  {contentExpanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show more</>}
                </button>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            {words > 0 && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={13} className="text-[#040042]/40" />
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-[#040042]/40">Word Count</span>
                </div>
                <p className="text-sm font-bold text-[#040042]">{words.toLocaleString()}</p>
              </div>
            )}
            {pubDate && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={13} className="text-[#040042]/40" />
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-[#040042]/40">Published</span>
                </div>
                <p className="text-sm font-bold text-[#040042]">{pubDate}</p>
              </div>
            )}
          </div>

          {/* Current Pricing */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={13} className="text-[#040042]/40" />
                <span className="text-[10px] uppercase tracking-wide font-semibold text-[#040042]/40">License Pricing</span>
              </div>
              {!editingPricing && (
                <button onClick={handleEditPricing} className="flex items-center gap-1 text-xs text-[#4A26ED] hover:text-[#3B1ED1] font-medium">
                  <Pencil size={11} />
                  Edit
                </button>
              )}
            </div>

            {editingPricing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#040042]/60">Human License ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={humanPrice} onChange={(e) => setHumanPrice(e.target.value)} className="h-9 text-sm bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#040042]/60">AI Training License ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={aiPrice} onChange={(e) => setAiPrice(e.target.value)} className="h-9 text-sm bg-white" />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSavePricing} disabled={savingPricing} className="h-8 text-xs gap-1.5 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white">
                    {savingPricing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingPricing(false)} className="h-8 text-xs gap-1">
                    <X size={12} />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-[#040042]/40 uppercase mb-0.5">Human</p>
                  <p className="text-sm font-bold text-[#040042]">
                    {displayHumanPrice != null && displayHumanPrice > 0 ? `$${displayHumanPrice.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#040042]/40 uppercase mb-0.5">AI Training</p>
                  <p className="text-sm font-bold text-[#040042]">
                    {displayAiPrice != null && displayAiPrice > 0 ? `$${displayAiPrice.toFixed(2)}` : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Canonical URL */}
          {asset.sourceUrl && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 size={13} className="text-[#040042]/40" />
                <span className="text-[10px] uppercase tracking-wide font-semibold text-[#040042]/40">Canonical URL</span>
              </div>
              <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4A26ED] hover:underline break-all flex items-center gap-1.5">
                {asset.sourceUrl}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}

          {/* Embed Snippets */}
          <EmbedSnippetsSection articleId={asset.id} />

          {/* Certificates */}
          <CertificatesSection articleId={asset.id} />

          {/* Article Content */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#040042]/40 mb-3">Article Content</h3>
            {plainContent ? (
              <div className="prose prose-sm max-w-none text-[#040042]/80 leading-relaxed text-sm whitespace-pre-wrap">
                {plainContent}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-6 text-center space-y-3">
                <FileText size={24} className="text-slate-300 mx-auto" />
                <p className="text-sm text-[#040042]/50">Content not yet synced.</p>
                {asset.sourceUrl && (
                  <a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A26ED] hover:underline">
                    Visit Original
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E8F2FB] bg-white space-y-2">
          <button onClick={handleCopyLink} className="w-full h-10 rounded-xl border border-[#E8F2FB] bg-slate-50 hover:bg-slate-100 text-sm font-medium text-[#040042]/70 flex items-center justify-center gap-2 transition-all">
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? "Link Copied!" : "Copy Licensing Link"}
          </button>
          <Button onClick={() => onSetLicenseTerms?.(asset)} className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all active:scale-[0.98] gap-2">
            <DollarSign size={16} />
            Set License Terms
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
