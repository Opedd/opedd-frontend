import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlatformId } from "@/components/setup-v2/Step1Platform";

/**
 * Phase 11 M7.1 — Add Another Newsletter card.
 *
 * Visible on Dashboard for verified publishers on beehiiv / ghost /
 * substack platforms. Each button deep-links to:
 *   /setup-v2?mode=add-newsletter&platform=<beehiiv|ghost|substack>
 *
 * SetupV2 reads the query string and renders Step2<Platform> directly,
 * bypassing the verified-publisher → /dashboard redirect for this single
 * code path. Step2 components run in their canonical state-machine but
 * (a) skip the mount-resume probe, (b) skip wizard.saveStepData (preserves
 * original setup_data), and (c) call onCompletionRedirect on success
 * instead of wizard.advance — landing back on Dashboard with a toast.
 *
 * Backend (per `_shared/platform_native_api.ts` audit): the existing
 * upsert-on-(user_id, url) + .single() pattern handles the 1:N case
 * correctly when called with a different pub_id / site_url / URL. Each
 * new newsletter creates a new content_sources row + new
 * platform_archive_jobs row under the SAME publishers row. No backend
 * changes shipped in M7.1.
 *
 * Display rules:
 *   - Custom API platform → no card (Custom API publishers use
 *     /dashboard/import for additional content streams; M7.2 surface).
 *   - Unverified publisher → no card (handled by parent guard in
 *     Dashboard.tsx).
 *   - Unknown platform value → no card (defensive).
 */
interface AddAnotherNewsletterCardProps {
  /** Current platform per setup_data.platform — drives which buttons
   * surface. Custom API ("api") hides the card. */
  platform: PlatformId | null;
}

export function AddAnotherNewsletterCard({ platform }: AddAnotherNewsletterCardProps) {
  // Card only meaningful for the 3 platform-native paths. Custom API
  // publishers add additional content streams via /dashboard/import
  // (M7.2 surface), not via the wizard re-entry pattern.
  if (platform !== "beehiiv" && platform !== "ghost" && platform !== "substack") {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-alice-gray p-2 text-oxford">
          <Plus className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-oxford">Add another newsletter</h2>
          <p className="text-sm text-gray-600 mt-1">
            Run multiple newsletters? Connect each one to license its content separately.
            Each newsletter becomes its own content source under your publisher account.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <NewsletterButton platform="beehiiv" label="Beehiiv" />
        <NewsletterButton platform="ghost" label="Ghost" />
        <NewsletterButton platform="substack" label="Substack" />
      </div>
    </div>
  );
}

interface NewsletterButtonProps {
  platform: "beehiiv" | "ghost" | "substack";
  label: string;
}

function NewsletterButton({ platform, label }: NewsletterButtonProps) {
  return (
    <Link
      to={`/setup-v2?mode=add-newsletter&platform=${platform}`}
      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium text-sm hover:bg-alice-gray hover:border-oxford transition"
    >
      + {label}
    </Link>
  );
}
