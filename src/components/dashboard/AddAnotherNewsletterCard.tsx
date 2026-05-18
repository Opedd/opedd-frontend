import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlatformId } from "@/components/setup-v2/Step1Platform";

/**
 * Phase 11 M7.1 — Add Another Newsletter card.
 *
 * Visible on Dashboard for verified publishers across all 4 onboarding
 * paths (Beehiiv / Ghost / Substack / Custom API). The card always shows
 * THREE platform-native buttons: + Beehiiv / + Ghost / + Substack. Each
 * deep-links to:
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
 * changes shipped in M7.1. verify-ownership has NO gate on the
 * publisher's initial `setup_data.platform` — any verified publisher
 * can submit a `method=platform_native_api` call for any of the 3
 * platforms, regardless of which path they originally onboarded with.
 *
 * No "+ Custom API" button by design (2026-05-18 Q1 verdict): Custom
 * API is an account-level ingestion METHOD, not a per-publication
 * content_source. There's no `content_source_id` column on the
 * `licenses` table; `publishers-content` keys articles on
 * `publisher_id + source_url`. A "+ Custom API" button would have no
 * honest target action — Custom API publishers already have an
 * account-level API key from Step2Api / Settings → Developer and
 * push more content via existing surfaces (raw HTTP / CSV upload /
 * Opedd-team migration script). See `opedd-docs/managed-ingestion.md`
 * for the canonical Custom API surface design + the three v1 ingestion
 * surfaces.
 *
 * Display rules:
 *   - Verified publisher on ANY of the 4 onboarding paths
 *     (beehiiv/ghost/substack/api) → render card with 3 platform-native
 *     buttons. Phase 11.5 inverse-asymmetry fix (2026-05-18 Q2):
 *     api-origin publishers previously had the card hidden entirely.
 *     Founder ratification: a Custom-API-origin publisher should be
 *     able to add a Beehiiv newsletter via Dashboard (cross-category
 *     onboarding). Backend already supports it.
 *   - Unverified publisher → no card (handled by parent guard in
 *     Dashboard.tsx:362, `verificationStatus === "verified"`).
 *   - Unknown platform value → no card (defensive).
 */
interface AddAnotherNewsletterCardProps {
  /** Current platform per setup_data.platform — present for visibility
   * defensive-check only. All 4 onboarding paths render the same 3
   * platform-native buttons. */
  platform: PlatformId | null;
}

export function AddAnotherNewsletterCard({ platform }: AddAnotherNewsletterCardProps) {
  // Defensive: render only for the 4 known onboarding paths. Unknown
  // platform values (legacy data, future paths not yet wizard-supported)
  // hide the card. The parent gate at Dashboard.tsx:362 already enforces
  // `verificationStatus === "verified"` — this is the secondary defense.
  if (
    platform !== "beehiiv" &&
    platform !== "ghost" &&
    platform !== "substack" &&
    platform !== "api"
  ) {
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
