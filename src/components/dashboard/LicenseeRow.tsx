import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatUSD } from "@/lib/formatNumber";
import type { Licensee } from "@/lib/publisherLicenseesApi";

// Phase 5.3-attribution: one row in the publisher's Insights
// Licensees section. Privacy-by-default: when attribution_status is
// "pending" OR consent is off, the backend returns display_name only
// (organization + contact_email are null in the response payload).

interface Props {
  licensee: Licensee;
  onViewDetails: (l: Licensee) => void;
}

export function LicenseeRow({ licensee, onViewDetails }: Props) {
  const isPending = licensee.attribution_status === "pending";
  const revenue = licensee.revenue_cents_pro_rated / 100;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
      data-testid="licensee-row"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-oxford-light flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-oxford" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 truncate" data-testid="licensee-display-name">
              {licensee.display_name}
            </p>
            {isPending && (
              <Badge variant="outline" className="text-[10px] uppercase text-gray-500 border-gray-300">
                legacy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span>{licensee.license_count} license{licensee.license_count !== 1 ? "s" : ""}</span>
            {licensee.license_types.length > 0 && (
              <>
                <span>·</span>
                <span>{licensee.license_types.join(", ")}</span>
              </>
            )}
            <span>·</span>
            <span>since {formatDistanceToNow(new Date(licensee.earliest_license_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
        <p className="text-sm font-semibold text-emerald-600" data-testid="licensee-revenue">
          {formatUSD(revenue)}
        </p>
        <p className="text-[11px] text-gray-400">
          {licensee.calls_count} call{licensee.calls_count !== 1 ? "s" : ""}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(licensee)}
        className="text-gray-500 hover:text-gray-900 shrink-0"
        data-testid="licensee-view-details"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
