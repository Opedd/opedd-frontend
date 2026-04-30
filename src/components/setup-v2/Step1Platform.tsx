import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWizardState } from "@/hooks/useWizardState";

/**
 * Phase 3 Session 3.1 — Step 1: platform picker (functional).
 *
 * Renders 5 platform cards per onboarding-redesign-v2.md §"Step 1".
 * Copy is v2 spec verbatim — institutional Plaid/Linear-toned, no
 * emoji. Lovable polish lands in Phase 10.
 *
 * State machine:
 *   - prospect → click card → wizard.advance({ platform }) → in_setup,1
 *     with platform stamped.
 *   - in_setup,1 (just landed from prospect, OR returning user) →
 *     click a different card → wizard.saveStepData({ platform }) to
 *     update selection without advancing. "Continue" button →
 *     wizard.advance({}) → in_setup,2.
 *
 * The two-click flow (pick → continue) is intentional for v1: it gives
 * the publisher a confirmation moment before the wizard advances. Less
 * elegant than a single click but lower-risk for the loop-fix session.
 *
 * Phase 4+ rebuild can collapse to single-click if user testing shows
 * the second click is redundant.
 */

export type PlatformId =
  | "substack"
  | "beehiiv"
  | "ghost"
  | "wordpress"
  | "custom";

interface PlatformCard {
  id: PlatformId;
  label: string;
  body: string;
  setupTime: string;
  includes: string;
  verification: string;
}

// v2 spec verbatim per docs/proposals/onboarding-redesign-v2.md §"Step 1"
const PLATFORMS: PlatformCard[] = [
  {
    id: "substack",
    label: "Substack",
    body:
      "Connect via your publication URL. We'll import recent posts immediately and your full archive shortly after.",
    setupTime: "about 7 minutes",
    includes: "Free + paid posts (full archive in step 2)",
    verification: "Paste a verification token on your About page",
  },
  {
    id: "beehiiv",
    label: "Beehiiv",
    body:
      "Connect via your Beehiiv API key. Full archive including premium posts imports automatically.",
    setupTime: "about 5 minutes",
    includes: "All posts, all tiers",
    verification: "API key",
  },
  {
    id: "ghost",
    label: "Ghost",
    body:
      "Connect via Admin API key. Works with Ghost(Pro) and self-hosted installations.",
    setupTime: "about 5 minutes",
    includes: "All posts including members-only",
    verification: "Admin API key",
  },
  {
    id: "wordpress",
    label: "WordPress",
    body:
      "Connect via your site URL and Application Password. Works with WordPress.com Business and self-hosted.",
    setupTime: "about 6 minutes",
    includes: "All posts and pages",
    verification: "Application Password",
  },
  {
    id: "custom",
    label: "Custom or Other",
    body:
      "For headless CMS, custom-built sites, or anything not listed above. We'll work with you to find the right approach.",
    setupTime: "5–10 minutes",
    includes: "Depends on platform",
    verification: "API key, DNS record, or email",
  },
];

export function Step1Platform() {
  const wizard = useWizardState();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProspect = wizard.setupState === "prospect";
  const currentPlatform = (wizard.setupData.platform as PlatformId | undefined) ?? null;

  const handlePick = async (platform: PlatformId) => {
    if (submitting || wizard.isMutating) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isProspect) {
        // prospect → in_setup,1 with platform stamped (single advance)
        await wizard.advance({ platform });
      } else if (currentPlatform === platform) {
        // already-selected card clicked again — treat as Continue
        await wizard.advance({ platform });
      } else {
        // changing platform within in_setup,1 — save without advancing
        await wizard.saveStepData({ platform });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong — please try again",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (submitting || wizard.isMutating || !currentPlatform) return;
    setSubmitting(true);
    setError(null);
    try {
      await wizard.advance({ platform: currentPlatform });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong — please try again",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-navy-deep mb-3">
            Where do you publish?
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
            We'll connect to your publication, structure your content for AI
            buyers, and start matching you with licensing opportunities.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 bg-red-50 border border-red-200 text-red-900 rounded-lg p-4 text-sm"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          {PLATFORMS.map((p) => {
            const selected = currentPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p.id)}
                disabled={submitting || wizard.isMutating}
                aria-pressed={selected}
                aria-label={`Select ${p.label}`}
                className={[
                  "w-full text-left bg-white rounded-xl border transition p-6",
                  selected
                    ? "border-navy-deep ring-2 ring-navy-deep/10"
                    : "border-gray-200 hover:border-gray-300",
                  submitting || wizard.isMutating
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-navy-deep">
                    {p.label}
                  </h2>
                  {selected && (
                    <span className="text-sm font-medium text-navy-deep">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                  {p.body}
                </p>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
                  <div>
                    <dt className="font-medium text-gray-700">Setup time</dt>
                    <dd>{p.setupTime}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Includes</dt>
                    <dd>{p.includes}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Verification</dt>
                    <dd>{p.verification}</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>

        {!isProspect && currentPlatform && (
          <div className="mt-8 text-center">
            <Button
              type="button"
              onClick={handleContinue}
              disabled={submitting || wizard.isMutating}
              className="px-8"
            >
              {submitting
                ? "Continuing…"
                : `Continue with ${PLATFORMS.find((p) => p.id === currentPlatform)?.label}`}
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Already connected on another platform? Add additional sources from
          your dashboard after setup.
        </p>
      </div>
    </div>
  );
}
