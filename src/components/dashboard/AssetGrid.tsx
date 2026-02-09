import React from "react";
import { format } from "date-fns";
import { Shield, Clock, Loader2, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Asset } from "@/types/asset";

interface AssetGridProps {
  assets: Asset[];
  onViewDetails: (asset: Asset) => void;
  isLoading?: boolean;
  sourceLookup?: Record<string, string>;
}

const getStatusConfig = (status: Asset["status"]) => {
  switch (status) {
    case "protected":
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
  }
};

export function AssetGrid({ assets, onViewDetails, isLoading, sourceLookup = {} }: AssetGridProps) {
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
        const statusConfig = getStatusConfig(asset.status);
        const syncDate = asset.createdAt
          ? format(new Date(asset.createdAt), "MMM d, yyyy")
          : "—";
        const sourceName = asset.source_id && sourceLookup[asset.source_id]
          ? sourceLookup[asset.source_id]
          : null;

        return (
          <div
            key={asset.id}
            className="bg-white rounded-xl border border-[#E8F2FB] p-5 hover:shadow-md hover:border-[#4A26ED]/20 transition-all group"
          >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${statusConfig.className}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              {sourceName && (
                <span className="text-[10px] text-[#040042]/40 font-medium truncate max-w-[100px]">
                  {sourceName}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-[#040042] text-sm leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
              {asset.title}
            </h3>

            {/* Sync Date */}
            <p className="text-xs text-[#040042]/40 mb-4 flex items-center gap-1.5">
              <Clock size={11} />
              Synced {syncDate}
            </p>

            {/* View Details */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(asset)}
              className="w-full h-9 text-xs font-medium gap-1.5 border-[#E8F2FB] hover:border-[#4A26ED]/40 hover:bg-[#4A26ED]/5 hover:text-[#4A26ED] transition-all"
            >
              <Eye size={13} />
              View Details
            </Button>
          </div>
        );
      })}
    </div>
  );
}
