import React, { useState } from "react";
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
} from "lucide-react";
import { Asset, AssetStatus } from "@/types/asset";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useToast } from "@/hooks/use-toast";

import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.png";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.png";
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

export function AssetDetailDrawer({ asset, open, onOpenChange, platform, onSetLicenseTerms }: AssetDetailDrawerProps) {
  const [copied, setCopied] = React.useState(false);
  const [editingPricing, setEditingPricing] = useState(false);
  const [humanPrice, setHumanPrice] = useState("");
  const [aiPrice, setAiPrice] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);
  const { licenses } = useAuthenticatedApi();
  const { toast } = useToast();

  if (!asset) return null;

  const sc = statusConfig(asset.status);
  const logoSrc = platform ? platformLogos[platform.toLowerCase()] : undefined;
  const words = wordCount(asset.content);
  const plainContent = asset.content ? stripHtml(asset.content) : null;
  const pubDate = asset.publishedAt
    ? format(new Date(asset.publishedAt), "MMMM d, yyyy")
    : asset.createdAt
    ? format(new Date(asset.createdAt), "MMMM d, yyyy")
    : null;
  const licenseLink = `opedd.com/license/${asset.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${licenseLink}`);
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
      await licenses.updatePrices({
        articleIds: [asset.id],
        humanPrice: humanPrice !== "" ? parseFloat(humanPrice) || 0 : undefined,
        aiPrice: aiPrice !== "" ? parseFloat(aiPrice) || 0 : undefined,
        licensingEnabled: true,
      });
      toast({ title: "Pricing Updated", description: `Prices saved for "${asset.title}".` });
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
            {asset.title}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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
                <button
                  onClick={handleEditPricing}
                  className="flex items-center gap-1 text-xs text-[#4A26ED] hover:text-[#3B1ED1] font-medium"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              )}
            </div>

            {editingPricing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#040042]/60">Human License ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={humanPrice}
                    onChange={(e) => setHumanPrice(e.target.value)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#040042]/60">AI Training License ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={aiPrice}
                    onChange={(e) => setAiPrice(e.target.value)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSavePricing}
                    disabled={savingPricing}
                    className="h-8 text-xs gap-1.5 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white"
                  >
                    {savingPricing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPricing(false)}
                    className="h-8 text-xs gap-1"
                  >
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
                    {asset.human_price != null && asset.human_price > 0 ? `$${asset.human_price.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#040042]/40 uppercase mb-0.5">AI Training</p>
                  <p className="text-sm font-bold text-[#040042]">
                    {asset.ai_price != null && asset.ai_price > 0 ? `$${asset.ai_price.toFixed(2)}` : "—"}
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
              <a
                href={asset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#4A26ED] hover:underline break-all flex items-center gap-1.5"
              >
                {asset.sourceUrl}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}

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
                  <a
                    href={asset.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4A26ED] hover:underline"
                  >
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
          {/* Copy Licensing Link */}
          <button
            onClick={handleCopyLink}
            className="w-full h-10 rounded-xl border border-[#E8F2FB] bg-slate-50 hover:bg-slate-100 text-sm font-medium text-[#040042]/70 flex items-center justify-center gap-2 transition-all"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? "Link Copied!" : `Copy Licensing Link`}
          </button>
          <Button
            onClick={() => onSetLicenseTerms?.(asset)}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all active:scale-[0.98] gap-2"
          >
            <DollarSign size={16} />
            Set License Terms
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
