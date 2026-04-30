import { useCallback, useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { publisherProfileApi } from "@/lib/api";
import { CATEGORIES, OTHER_CATEGORY_ID } from "./categories";

/**
 * Phase 3 Session 3.4 — Step 4 Categorize & Price (functional).
 *
 * Replaces the Session 3.1 stub (ResumeIntentCapture). Single screen
 * with category picker (12 hardcoded + Other free-text) + 3 price
 * inputs (annual catalog, per-article AI, per-article human) + 3
 * license-type checkboxes (AI training / Retrieval / Human research)
 * + "Switch to retrieval-only mode" toggle that locks the AI training
 * checkbox per v2 spec.
 *
 * Persistence (per INVARIANTS.md "save_step_data is restricted to
 * setup_state='in_setup'... Post-onboarding data capture belongs in
 * dedicated columns or a different field, NOT setup_data"): writes
 * direct to publishers.* columns via publisher-profile PATCH on
 * Continue. NOT to wizard-state save_step_data.
 *
 * Canonical-field write correction vs legacy: writes to
 * pricing_rules.license_types.archive.price_annual (canonical;
 * create-checkout reads this for archive license purchases) NOT to
 * publishers.ai_annual_price (legacy top-level; create-checkout
 * archive path silently ignores it). Legacy was broken on archive
 * purchases — this v1 ships the fix. Existing publishers with
 * non-canonical ai_annual_price values retain those values until they
 * revisit Step 4.
 *
 * KNOWN_ISSUES #18 cleanup: Step 4 v1 does NOT write
 * publishers.ai_license_types (the deprecated shim from migration
 * 060). Frontend writer count drops to 0 once Step 4 ships +
 * legacy Setup.tsx is unreachable (Phase 3 Session 3.1 redirect).
 * Backend cleanup of #18 is a separate session; the frontend gate
 * is now closed.
 *
 * Phase 2 / AI-lab-feedback rework profile (per Session 3.4 design):
 * - Phase 2 Session 2.4a ships canonical taxonomy → swap CATEGORIES
 *   import for taxonomy.ts import. Single line.
 * - AI labs prefer per-license-type pricing → extend
 *   pricing_rules.license_types.{type} to include `price` field;
 *   v1's default_ai_price stays as fallback. Additive.
 * - AI labs prefer subscription model → new top-level toggle in
 *   Step 4 + new pricing_rules.license_types.subscription.{...}
 *   slice. Additive; doesn't break v1 publishers.
 * - AI labs reject categorize-first framing → category becomes
 *   optional; rest of v1 unchanged.
 *
 * LOVABLE-POLISH (Phase 10 handoff):
 * - Hardcoded category list pending Phase 2 Session 2.4a taxonomy
 *   import. Drop "Other (specify)" sentinel + free-text input when
 *   real taxonomy provides full coverage.
 * - Pricing benchmark numbers ($48,000 annual / $35 AI / $8 human)
 *   are v2 spec example placeholders. Replace with calibrated-
 *   defaults engine output (per-category, real network data) when
 *   that ships.
 * - "Switch to retrieval-only mode" copy + 60-70% revenue framing
 *   verbatim from v2 spec — Phase 10 may want to refine the
 *   percentage range as real licensing data accumulates.
 * - Per-category pricing override UI not implemented (defer to
 *   Phase 10 advanced settings or a Settings.tsx pricing editor).
 * - blockMode is derived state, not persistent — a publisher who
 *   unchecked AI training via the checkbox alone (without engaging
 *   the toggle) sees the toggle reading ON on revisit. Outcome is
 *   correct (ai_training is blocked); the label commits to the
 *   values stance more strongly than that publisher may have
 *   intended. Phase 10 may add a persistent intent flag if this
 *   bites.
 * - Always-enabled Continue button lets publisher save zero/empty
 *   values — natural skip-equivalent semantics for this step.
 * - No state-transition animations.
 */

// v2 spec §"Step 4" Refinement 1 placeholder benchmarks
const PLACEHOLDER_ANNUAL = 48_000;
const PLACEHOLDER_AI_PER_ARTICLE = 35;
const PLACEHOLDER_HUMAN_PER_ARTICLE = 8;

const PROFILE_URL =
  (import.meta as unknown as { env: { VITE_SUPABASE_URL?: string } }).env
    .VITE_SUPABASE_URL ?? "https://api.opedd.com";

interface PricingProfileSlice {
  category: string | null;
  default_human_price: number;
  default_ai_price: number;
  pricing_rules: {
    license_types?: {
      ai_training?: { enabled?: boolean; [k: string]: unknown };
      ai_retrieval?: { enabled?: boolean; [k: string]: unknown };
      human?: { enabled?: boolean; [k: string]: unknown };
      archive?: { price_annual?: number; [k: string]: unknown };
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; profile: PricingProfileSlice }
  | { kind: "error"; message: string };

async function fetchPricingSlice(
  token: string | null,
): Promise<PricingProfileSlice> {
  const res = await fetch(`${PROFILE_URL}/publisher-profile`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`publisher-profile GET ${res.status}`);
  const body = await res.json();
  const data = body?.data ?? body ?? {};
  return {
    category: typeof data.category === "string" ? data.category : null,
    default_human_price: Number(data.default_human_price) || 0,
    default_ai_price: Number(data.default_ai_price) || 0,
    pricing_rules:
      typeof data.pricing_rules === "object" && data.pricing_rules !== null
        ? (data.pricing_rules as PricingProfileSlice["pricing_rules"])
        : {},
  };
}

export function Step4Categorize() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState<string>("");
  const [otherCategoryText, setOtherCategoryText] = useState("");
  const [annualPrice, setAnnualPrice] = useState<string>("");
  const [aiPerArticle, setAiPerArticle] = useState<string>("");
  const [humanPerArticle, setHumanPerArticle] = useState<string>("");
  const [aiTrainingChecked, setAiTrainingChecked] = useState(true);
  const [aiRetrievalChecked, setAiRetrievalChecked] = useState(true);
  const [humanResearchChecked, setHumanResearchChecked] = useState(true);
  const [blockMode, setBlockMode] = useState(false);

  // Initial load — hydrate form state from publishers row
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const profile = await fetchPricingSlice(token);
        if (cancelled) return;

        // Category: match against hardcoded list or fall to Other + free text
        if (profile.category) {
          const known = CATEGORIES.find(
            (c) => c.id !== OTHER_CATEGORY_ID && c.id === profile.category,
          );
          if (known) {
            setCategoryId(known.id);
          } else {
            setCategoryId(OTHER_CATEGORY_ID);
            setOtherCategoryText(profile.category);
          }
        }

        // Prices: hydrate as strings (so empty input renders as "" not "0")
        const archive =
          profile.pricing_rules?.license_types?.archive?.price_annual;
        if (typeof archive === "number" && archive > 0) {
          setAnnualPrice(String(archive));
        }
        if (profile.default_ai_price > 0) {
          setAiPerArticle(String(profile.default_ai_price));
        }
        if (profile.default_human_price > 0) {
          setHumanPerArticle(String(profile.default_human_price));
        }

        // License-type checkbox state — derive from pricing_rules
        const lt = profile.pricing_rules?.license_types ?? {};
        const aiTrainingEnabled = lt.ai_training?.enabled !== false;
        const aiRetrievalEnabled = lt.ai_retrieval?.enabled !== false;
        const humanEnabled = lt.human?.enabled !== false;
        setAiTrainingChecked(aiTrainingEnabled);
        setAiRetrievalChecked(aiRetrievalEnabled);
        setHumanResearchChecked(humanEnabled);
        // blockMode is derived — see component header comment
        setBlockMode(aiTrainingEnabled === false);

        setLoadState({ kind: "ready", profile });
      } catch (err) {
        Sentry.addBreadcrumb({
          category: "step4-categorize",
          level: "warning",
          message: "publisher-profile fetch failed",
          data: { error: String(err).slice(0, 120) },
        });
        if (cancelled) return;
        setLoadState({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Failed to load profile — please reload",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // Resolved category for PATCH: free-text if Other selected, otherwise the id
  const resolvedCategory = (() => {
    if (!categoryId) return null;
    if (categoryId === OTHER_CATEGORY_ID) {
      const trimmed = otherCategoryText.trim();
      return trimmed.length > 0 ? trimmed.slice(0, 100) : null;
    }
    return categoryId;
  })();

  const handleContinue = useCallback(async () => {
    if (submitting || wizard.isMutating) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // blockMode wins over aiTrainingChecked per design (toggle is the
      // higher-priority intent control).
      const aiTrainingEnabled = blockMode ? false : aiTrainingChecked;

      // Build pricing_rules.license_types payload — preserve any
      // pre-existing non-license-type pricing_rules keys we don't manage.
      const existingRules =
        loadState.kind === "ready" ? loadState.profile.pricing_rules : {};
      const existingLT = existingRules.license_types ?? {};
      const archiveBlock =
        annualPrice && Number(annualPrice) > 0
          ? {
              ...(existingLT.archive ?? {}),
              price_annual: Number(annualPrice),
            }
          : existingLT.archive;

      const payload: Record<string, unknown> = {
        category: resolvedCategory,
        default_human_price:
          humanPerArticle && Number(humanPerArticle) >= 0
            ? Number(humanPerArticle)
            : 0,
        default_ai_price:
          aiPerArticle && Number(aiPerArticle) >= 0 ? Number(aiPerArticle) : 0,
        pricing_rules: {
          ...existingRules,
          license_types: {
            ...existingLT,
            ai_training: {
              ...(existingLT.ai_training ?? {}),
              enabled: aiTrainingEnabled,
            },
            ai_retrieval: {
              ...(existingLT.ai_retrieval ?? {}),
              enabled: aiRetrievalChecked,
            },
            human: {
              ...(existingLT.human ?? {}),
              enabled: humanResearchChecked,
            },
            ...(archiveBlock ? { archive: archiveBlock } : {}),
          },
        },
      };

      // CRITICAL: do NOT include ai_license_types in payload — KNOWN_ISSUES
      // #18 cleanup proof. Negative test 10 in Step4Categorize.test.tsx
      // locks this in.

      const token = await getAccessToken();
      await publisherProfileApi.patch(payload, token);
      await wizard.advance({});
      // SetupV2 routing re-renders to Step5Stripe on next paint.
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Couldn't save — please try again",
      );
      Sentry.captureException(err, { tags: { component: "Step4Categorize" } });
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    wizard,
    blockMode,
    aiTrainingChecked,
    aiRetrievalChecked,
    humanResearchChecked,
    resolvedCategory,
    annualPrice,
    aiPerArticle,
    humanPerArticle,
    loadState,
    getAccessToken,
  ]);

  if (loadState.kind === "loading") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  if (loadState.kind === "error") {
    return (
      <div className="min-h-screen bg-alice-gray px-6 py-12">
        <div className="max-w-lg mx-auto">
          <div
            role="alert"
            className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center space-y-4"
          >
            <h1 className="text-xl font-semibold text-red-900">
              Couldn't load your profile
            </h1>
            <p className="text-gray-600">{loadState.message}</p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="px-8"
            >
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 space-y-8">
          <header>
            <h1 className="text-2xl font-semibold text-navy-deep mb-2">
              Categorize and price your content
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Help buyers find your work and set what your content is worth to
              AI labs and human researchers.
            </p>
          </header>

          {/* Category picker */}
          <section aria-labelledby="category-label" className="space-y-3">
            <label
              id="category-label"
              htmlFor="category-select"
              className="block text-sm font-medium text-gray-700"
            >
              What's the primary domain of your publication?
            </label>
            <select
              id="category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={submitting}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-deep/20"
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {categoryId === OTHER_CATEGORY_ID && (
              <Input
                type="text"
                placeholder="Describe your category in a few words"
                value={otherCategoryText}
                onChange={(e) => setOtherCategoryText(e.target.value)}
                disabled={submitting}
                maxLength={100}
                aria-label="Custom category"
              />
            )}
          </section>

          {/* Pricing — v2 spec Refinement 1 */}
          <section aria-labelledby="pricing-label" className="space-y-4">
            <div>
              <h2
                id="pricing-label"
                className="text-base font-semibold text-navy-deep mb-1"
              >
                Set your prices
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Here's what publishers in your category typically charge. You
                can adjust anything. These are starting points based on
                comparable publishers — replace with your own when you know
                what your audience is worth.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="annual-price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Annual catalog license (USD / year)
                </label>
                <Input
                  id="annual-price"
                  type="number"
                  min="0"
                  step="100"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  disabled={submitting}
                  placeholder={String(PLACEHOLDER_ANNUAL)}
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="ai-per-article"
                  className="block text-sm font-medium text-gray-700"
                >
                  Per-article AI training (USD)
                </label>
                <Input
                  id="ai-per-article"
                  type="number"
                  min="0"
                  step="0.01"
                  value={aiPerArticle}
                  onChange={(e) => setAiPerArticle(e.target.value)}
                  disabled={submitting}
                  placeholder={String(PLACEHOLDER_AI_PER_ARTICLE)}
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="human-per-article"
                  className="block text-sm font-medium text-gray-700"
                >
                  Per-article human research (USD)
                </label>
                <Input
                  id="human-per-article"
                  type="number"
                  min="0"
                  step="0.01"
                  value={humanPerArticle}
                  onChange={(e) => setHumanPerArticle(e.target.value)}
                  disabled={submitting}
                  placeholder={String(PLACEHOLDER_HUMAN_PER_ARTICLE)}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {/* License-type checkboxes — v2 spec Refinement 2 */}
          <section aria-labelledby="licensetypes-label" className="space-y-3">
            <h2
              id="licensetypes-label"
              className="text-base font-semibold text-navy-deep"
            >
              What can buyers license your content for?
            </h2>
            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 ${blockMode ? "opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={blockMode ? false : aiTrainingChecked}
                  onChange={(e) => setAiTrainingChecked(e.target.checked)}
                  disabled={blockMode || submitting}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30 disabled:cursor-not-allowed"
                  aria-label="AI training"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-deep">AI training</p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                    Used to train new language models. Highest licensing rates,
                    but content becomes part of the model's weights.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={aiRetrievalChecked}
                  onChange={(e) => setAiRetrievalChecked(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
                  aria-label="Retrieval / RAG"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-deep">
                    Retrieval / RAG
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                    Used at inference time as context for AI responses. Each
                    retrieval is logged, attributed, and paid.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={humanResearchChecked}
                  onChange={(e) => setHumanResearchChecked(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
                  aria-label="Human research"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-deep">
                    Human research
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
                    Used by analysts and researchers (no AI involved). Standard
                    licensing, lowest rates.
                  </p>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              You can change these later. Most publishers enable all three to
              maximize earnings — different buyers want different rights.
            </p>
          </section>

          {/* "Switch to retrieval-only mode" — v2 spec Refinement 3 */}
          <section
            aria-labelledby="blockmode-label"
            className="border border-gray-200 rounded-xl p-5 space-y-3"
          >
            <h2
              id="blockmode-label"
              className="text-sm font-semibold text-navy-deep"
            >
              Don't want your content used to train AI models?
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Some publishers prefer retrieval-only licensing — your content is
              used at query time but never absorbed into model weights. This
              typically reduces total earnings by 60-70% but preserves stronger
              ownership.
            </p>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={blockMode}
                onChange={(e) => setBlockMode(e.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
                aria-label="Switch to retrieval-only mode"
              />
              <span className="text-sm font-medium text-navy-deep">
                Switch to retrieval-only mode
              </span>
            </label>
          </section>

          {submitError && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {submitError}
            </p>
          )}

          <div className="pt-2">
            <Button
              type="button"
              onClick={handleContinue}
              disabled={submitting || wizard.isMutating}
              className="w-full"
            >
              {submitting ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
