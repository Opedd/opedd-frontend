import { AlertTriangle } from "lucide-react";

/**
 * Phase 3 Session 3.5 — Stripe disabled-reason display.
 *
 * Renders the parsed `publishers.stripe_disabled_reason` field for
 * publishers whose Stripe Express onboarding is partially complete.
 * Used by Step5Stripe (Phase 3 Session 3.5) and likely by Session 3.6
 * dashboard partnership header for publishers in the same partial-
 * onboarding state.
 *
 * Parser ports from legacy Setup.tsx:1441-1447 VERBATIM per the
 * verbatim-port discipline — production-tested logic that the
 * stripe-webhook account.updated handler (supabase/functions/
 * stripe-webhook/index.ts:794-801) populates with values like
 * "currently_due:individual.address.city,individual.dob.day" or
 * "requirements.past_due".
 *
 * The Phase 3 Session 3.5.0 probe validated that the full pipeline
 * (Stripe API → webhook simulation → DB column → component read)
 * lands the right value here.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Parser output is verbose ("individual address city" instead of
 *   "address city" or "city"). Verbatim port from legacy per
 *   CLAUDE.md discipline; reword in Phase 10 to drop the "individual"
 *   prefix and group by sub-object (address, dob, etc.).
 * - Icon + amber color block lifted from legacy. Brand polish
 *   pending — Lovable may want a softer warning color or a dedicated
 *   "in progress" tonal palette distinct from "warning".
 * - No animations on appearance. Static render.
 */

interface StripeDisabledReasonDisplayProps {
  reason: string | null | undefined;
}

export function StripeDisabledReasonDisplay({
  reason,
}: StripeDisabledReasonDisplayProps) {
  if (!reason) return null;

  // Verbatim port from Setup.tsx:1441-1447. Don't refactor.
  const message = reason.startsWith("currently_due:")
    ? `Missing: ${reason
        .replace("currently_due:", "")
        .split(",")
        .map((r) => r.replace(/[._]/g, " "))
        .join(", ")}`
    : reason.replace(/[._]/g, " ");

  return (
    <div
      role="status"
      className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
    >
      <AlertTriangle
        size={18}
        className="text-amber-600 mt-0.5 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Stripe is waiting on one more step
        </p>
        <p className="text-xs text-amber-700 mt-1">{message}</p>
      </div>
    </div>
  );
}
