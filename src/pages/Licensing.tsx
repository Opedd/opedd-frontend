import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import SEO from "@/components/SEO";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";

/**
 * Phase 5 Session 5.1 — Licensing page placeholder. The legacy editor
 * (~762 LOC) wrote pricing_rules.license_types with the pre-Phase-5.1
 * vocabulary {editorial, archive, corporate, syndication}. Phase 5.1
 * unified the canonical vocab to {human_per_article, human_full_archive,
 * ai_retrieval, ai_training}; the legacy editor's writes would 400
 * against the new backend allowlist on every save.
 *
 * Path (d) decision: replace the editor with a placeholder + hide the
 * /licensing nav links across DashboardSidebar / MobileSidebar /
 * DashboardLayout / Dashboard quick action / NotificationsPage. The
 * /licensing route stays mounted so bookmarked URLs land on this
 * placeholder rather than 404. Backend publisher-profile PATCH is
 * still capable of writing the new vocab (Step4Categorize uses it
 * during onboarding); a proper Settings page revision is deferred
 * to Phase 5.x or later (Phase 4.7 OQ-D — Settings page deferral).
 *
 * Pre-Phase-5.1 Sentry pageloads (last 30d): 530 on /licensing
 * (~17/day). Publishers actively visited the editor; this placeholder
 * provides an honest support-mediated path until the Settings revision
 * ships. See KI #66 (Licensing.tsx full revision deferred).
 */
export default function Licensing() {
  useDocumentTitle("Pricing settings — Opedd");

  return (
    <DashboardLayout title="Pricing" subtitle="Pricing settings — being redesigned">
      <SEO
        title="Pricing settings — Opedd"
        description="Pricing settings are being redesigned. Existing prices stay active; contact support to update during the transition."
        path="/licensing"
        noindex
      />

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-6">
          <header>
            <h1 className="text-2xl font-semibold text-navy-deep mb-2">
              Pricing settings — being redesigned
            </h1>
            <p className="text-gray-600 leading-relaxed">
              We're rebuilding the pricing editor as part of Phase 5
              (buyer marketplace launch). Your existing prices stay
              active and continue to apply to all incoming buyer
              purchases.
            </p>
          </header>

          <section className="border border-gray-200 rounded-xl p-5 bg-alice-gray/30 space-y-3">
            <h2 className="text-sm font-semibold text-navy-deep">
              How to change your pricing during this transition
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Email{" "}
              <a
                href="mailto:support@opedd.com?subject=Pricing%20update%20request"
                className="text-navy-deep font-medium underline underline-offset-2 hover:text-oxford"
              >
                support@opedd.com
              </a>{" "}
              with your publisher name and the price changes you'd like
              to make. We'll apply the changes within 24 hours and
              confirm via reply.
            </p>
          </section>

          <div className="pt-2">
            <Link to="/dashboard">
              <Button type="button" variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
