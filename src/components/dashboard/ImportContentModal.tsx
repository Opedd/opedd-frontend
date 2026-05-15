import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, RefreshCw, Code2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { SubstackImportCard } from "@/components/dashboard/SubstackImportCard";

/**
 * Phase 4.7.3 — Unified Import Content modal.
 *
 * Phase 11 close-validation pass UX-4 (2026-05-15) — context-aware per platform.
 * Pre-fix: 3 tabs (Upload archive / Connect RSS / API) shown regardless of
 * publisher's platform. Beehiiv/Ghost-verified publishers saw irrelevant
 * options. Founder ratification:
 *   - Beehiiv/Ghost verified → "Sync now" + last-synced timestamp + webhook status
 *   - Substack → "Upload export ZIP" (existing SubstackImportCard)
 *   - Custom API → "Upload CSV" + link to /dashboard/import + cookbook
 *   - Unknown/in-setup → fallback to legacy 3-tab view
 *
 * State owned by SourcesView per PFQ-4 (α). Modal opens via PublicationCard's
 * primary "Import content" CTA (verified + licenseCount=0) OR secondary
 * "Import content" link (verified + licenseCount > 0; PFQ-6 option ii).
 */

type Platform = "substack" | "beehiiv" | "ghost" | "api" | string | null | undefined;

export interface ImportContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires when the upload completes successfully — used to refetch publication state. */
  onImportComplete?: () => void;
  /** Phase 11 UX-4: platform per setup_data.platform. Drives the context-aware body. */
  platform?: Platform;
  /** Phase 11 UX-4: ISO timestamp of last archive sync (for Beehiiv/Ghost "Last synced" line). */
  lastSyncedAt?: string | null;
}

export function ImportContentModal({
  open,
  onOpenChange,
  onImportComplete,
  platform,
  lastSyncedAt,
}: ImportContentModalProps) {
  const handleImportComplete = () => {
    onImportComplete?.();
    // Phase 4.7.5 PFQ-C: 2.5s delay before auto-close so the success banner
    // inside SubstackImportCard renders visibly.
    setTimeout(() => onOpenChange(false), 2500);
  };

  const isBeehiivOrGhost = platform === "beehiiv" || platform === "ghost";
  const isSubstack = platform === "substack";
  const isCustomApi = platform === "api";

  const platformLabel = isBeehiivOrGhost
    ? platform === "beehiiv" ? "Beehiiv" : "Ghost"
    : isSubstack ? "Substack" : isCustomApi ? "Custom API" : null;

  const lastSyncedDisplay = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString()
    : "never";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-xl rounded-xl border border-gray-200 p-6 shadow-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-navy-deep">Import content</DialogTitle>
          <DialogDescription className="text-sm text-navy-deep/60 mt-1">
            {platformLabel
              ? `Manage content sync for your ${platformLabel} publication.`
              : "Add content to your publication. Pick a mechanism below."}
          </DialogDescription>
        </DialogHeader>

        {/* Phase 11 UX-4: Beehiiv/Ghost — sync now + last-synced + webhook posture */}
        {isBeehiivOrGhost && (
          <div className="mt-4 space-y-3">
            <div className="bg-alice-gray border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <RefreshCw size={18} className="text-oxford mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-deep">
                    Auto-sync is active
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {platformLabel} content syncs automatically via webhook on publish
                    events + the platform-archives cron every 2 minutes. Last synced:{" "}
                    <strong>{lastSyncedDisplay}</strong>.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 px-1">
              No manual import needed. New posts appear in your Dashboard automatically
              within ~2 minutes of publishing on {platformLabel}.
            </p>
          </div>
        )}

        {/* Phase 11 UX-4: Substack — ZIP upload (legacy path, primary use case) */}
        {isSubstack && (
          <div className="mt-4 space-y-3">
            <SubstackImportCard onImportComplete={handleImportComplete} />
            <p className="text-xs text-gray-500 px-1">
              Ongoing posts auto-sync via your Substack RSS feed every 30 minutes.
              Manual ZIP upload above is for backfilling the full archive that the
              RSS feed only carries the last 25 items of.
            </p>
          </div>
        )}

        {/* Phase 11 UX-4: Custom API — CSV upload link */}
        {isCustomApi && (
          <div className="mt-4 space-y-3">
            <div className="bg-alice-gray border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-oxford mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-deep">
                    Upload content via CSV
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Custom API publishers ingest content via CSV upload OR direct{" "}
                    <code className="text-xs">POST /publishers-content</code> HTTP. Required
                    columns: <code className="text-xs">title</code>, <code className="text-xs">url</code>,{" "}
                    <code className="text-xs">published_at</code>.
                  </p>
                  <Link
                    to="/dashboard/import"
                    onClick={() => onOpenChange(false)}
                    className="inline-block mt-3 text-xs font-medium text-oxford underline hover:text-navy-deep"
                  >
                    Open CSV import page →
                  </Link>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 px-1">
              For larger archives (&gt;5K articles), email{" "}
              <a href="mailto:support@opedd.com" className="text-oxford underline">
                support@opedd.com
              </a>{" "}
              for a managed migration.
            </p>
          </div>
        )}

        {/* Phase 11 UX-4: Unknown/in-setup — legacy generic placeholder */}
        {!isBeehiivOrGhost && !isSubstack && !isCustomApi && (
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center space-y-2">
              <Upload size={24} className="text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-navy-deep">
                Complete onboarding first
              </p>
              <p className="text-xs text-navy-deep/60">
                Pick a platform path in the setup wizard to enable content import.
              </p>
              <Code2 size={12} className="text-gray-400 mx-auto" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
