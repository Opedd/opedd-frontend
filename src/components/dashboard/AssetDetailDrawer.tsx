import React from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { Asset, AssetStatus } from "@/types/asset";

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
        <div className="shrink-0 px-6 py-4 border-t border-[#E8F2FB] bg-white">
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
