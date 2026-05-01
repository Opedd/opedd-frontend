import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/formatNumber";
import { formatDistanceToNow } from "date-fns";
import { Building2 } from "lucide-react";
import type { Licensee } from "@/lib/publisherLicenseesApi";

// Phase 5.3-attribution OQ-3 hybrid: drill-down modal showing per-row
// detail. v1 surfaces the same aggregated fields with extra context.
// Per-article + per-call timeline deferred (file follow-up KI if a
// publisher requests it — see proposal § Session 5.3-attribution).

interface Props {
  licensee: Licensee | null;
  onClose: () => void;
}

export function LicenseeDetailsModal({ licensee, onClose }: Props) {
  return (
    <Dialog open={!!licensee} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {licensee && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-oxford-light flex items-center justify-center">
                  <Building2 size={14} className="text-oxford" />
                </div>
                {licensee.display_name}
                {licensee.attribution_status === "pending" && (
                  <Badge variant="outline" className="text-[10px] uppercase text-gray-500 border-gray-300 ml-1">
                    legacy
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {licensee.attribution_status === "pending"
                  ? "Legacy enterprise license — full attribution pending Phase 5.4 metered billing."
                  : "Licensing relationship summary."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Row label="Licenses" value={`${licensee.license_count}`} />
              {licensee.license_types.length > 0 && (
                <Row
                  label="License types"
                  value={
                    <div className="flex gap-1 flex-wrap">
                      {licensee.license_types.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  }
                />
              )}
              <Row label="Calls served" value={`${licensee.calls_count}`} />
              <Row label="Revenue (pro-rated)" value={formatUSD(licensee.revenue_cents_pro_rated / 100)} />
              <Row label="Earliest license" value={formatDistanceToNow(new Date(licensee.earliest_license_at), { addSuffix: true })} />
              {licensee.organization && (
                <Row label="Organization" value={licensee.organization} />
              )}
              {licensee.contact_email && (
                <Row label="Contact" value={<code className="text-xs">{licensee.contact_email}</code>} />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider shrink-0">{label}</p>
      <div className="text-sm text-gray-900 text-right">{value}</div>
    </div>
  );
}
