import React from "react";
import { format } from "date-fns";
import { Shield, Clock, Loader2, FileText, Eye, AlertTriangle, Archive, DollarSign, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

interface AssetGridProps {
  assets: Asset[];
  onViewDetails: (asset: Asset) => void;
  isLoading?: boolean;
  sourceLookup?: Record<string, string>;
  platformLookup?: Record<string, string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

const getStatusConfig = (status: AssetStatus) => {
  switch (status) {
    case "protected":
    case "verified":
      return {
        label: "Protected",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: <Shield size={10} className="fill-emerald-100" />,
      };
    case "syncing":
      return {
        label: "Syncing",
        className: "bg-[#4A26ED]/10 text-[#4A26ED] border-[#4A26ED]/20",
        icon: <Loader2 size={10} className="animate-spin" />,
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Clock size={10} />,
      };
    case "failed":
      return {
        label: "Failed",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: <AlertTriangle size={10} />,
      };
    case "source_archived":
      return {
        label: "Archived",
        className: "bg-slate-50 text-slate-600 border-slate-200",
        icon: <Archive size={10} />,
      };
    default:
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <Clock size={10} />,
      };
  }
};

function getSnippet(description?: string, maxLen = 120): string {
  const text = description || "";
  if (!text) return "";
  const plain = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + "…" : plain;
}

function hasLivePrice(asset: Asset): boolean {
  const hasPrice = (asset.revenue > 0) || 
    (asset.metadata && ((asset.metadata as any).human_price > 0 || (asset.metadata as any).ai_price > 0));
  // Check if licensing_enabled via status being protected/verified
  return (asset.status === "protected" || asset.status === "verified") && !!hasPrice;
}

export function AssetGrid({ 
  assets, 
  onViewDetails, 
  isLoading, 
  sourceLookup = {}, 
  platformLookup = {},
  selectedIds = new Set(),
  onToggleSelect,
  selectionMode = false,
}: AssetGridProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyLink = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`https://opedd.com/license/${assetId}`);
    setCopiedId(assetId);
    toast({ title: "Link copied", description: "Licensing link copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E8F2FB] p-12 text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <FileText size={24} className="text-slate-400" />
        </div>
        <h3 className="text-base font-bold text-[#040042]">No assets yet</h3>
        <p className="text-sm text-[#040042]/50 max-w-xs mx-auto">
          Register a content source to start syncing articles into your library.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => {
        const statusCfg = getStatusConfig(asset.status);
        const displayDate = asset.publishedAt
          ? format(new Date(asset.publishedAt), "MMM d, yyyy")
          : asset.createdAt
          ? format(new Date(asset.createdAt), "MMM d, yyyy")
          : "—";
        const sourceName = asset.source_id && sourceLookup[asset.source_id]
          ? sourceLookup[asset.source_id]
          : null;
        const platform = asset.source_id ? platformLookup[asset.source_id] : undefined;
        const logoSrc = platform ? platformLogos[platform.toLowerCase()] : undefined;
        const snippet = getSnippet(asset.description);
        const isSelected = selectedIds.has(asset.id);
        const isLivePriced = hasLivePrice(asset);

        return (
          <div
            key={asset.id}
            className={`bg-white rounded-xl border hover:shadow-md transition-all group cursor-pointer flex flex-col overflow-hidden relative ${
              isSelected 
                ? "border-[#4A26ED] ring-2 ring-[#4A26ED]/20" 
                : "border-[#E8F2FB] hover:border-[#4A26ED]/20"
            }`}
          >
            {/* Checkbox */}
            {selectionMode && (
              <div 
                className="absolute top-3 left-3 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(asset.id);
                }}
              >
                <Checkbox
                  checked={isSelected}
                  className="h-5 w-5 border-2 border-slate-300 data-[state=checked]:bg-[#4A26ED] data-[state=checked]:border-[#4A26ED] bg-white shadow-sm"
                />
              </div>
            )}

            {/* Live Price Badge */}
            {isLivePriced && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                  <DollarSign size={12} className="text-white" />
                </div>
              </div>
            )}

            {/* Thumbnail */}
            {asset.thumbnailUrl && (
              <div 
                className="w-full h-36 bg-slate-100 overflow-hidden"
                onClick={() => onViewDetails(asset)}
              >
                <img
                  src={asset.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}

            <div 
              className={`p-5 flex flex-col flex-1 ${selectionMode ? 'pl-10' : ''}`}
              onClick={() => {
                if (selectionMode) {
                  onToggleSelect?.(asset.id);
                } else {
                  onViewDetails(asset);
                }
              }}
            >
              {/* Top row: badge + platform logo */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${statusCfg.className}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </Badge>
                <div className="flex items-center gap-1.5">
                  {logoSrc ? (
                    <img src={logoSrc} alt={platform} className="h-5 w-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
                  ) : sourceName ? (
                    <span className="text-[10px] text-[#040042]/40 font-medium truncate max-w-[100px]">
                      {sourceName}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-[#040042] text-sm leading-snug line-clamp-2 mb-1.5 min-h-[2.5rem]">
                {asset.title}
              </h3>

              {/* Snippet from description */}
              {snippet && (
                <p className="text-xs text-[#040042]/50 leading-relaxed line-clamp-3 mb-3 flex-1">
                  {snippet}
                </p>
              )}
              {!snippet && <div className="flex-1" />}

              {/* Footer: date + view */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8F2FB]">
                <p className="text-[11px] text-[#040042]/40 flex items-center gap-1.5">
                  <Clock size={11} />
                  {displayDate}
                </p>
                <div className="flex items-center gap-2">
                  {!selectionMode && (
                    <button
                      onClick={(e) => handleCopyLink(e, asset.id)}
                      className="text-[11px] font-medium text-[#040042]/40 hover:text-[#4A26ED] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                      title="Copy licensing link"
                    >
                      {copiedId === asset.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  )}
                  {!selectionMode && (
                    <span className="text-[11px] font-medium text-[#4A26ED] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <Eye size={12} />
                      View
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
