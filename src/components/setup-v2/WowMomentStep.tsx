import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { licensesApi } from "@/lib/api";
import { CUSTOM_API_SAMPLE_PREVIEW } from "./customApiSampleArticle";

/**
 * Phase 11 M1.c — Article-to-AI-format "wow moment" animation.
 *
 * Replaces the prior ResumeIntentCapture("Model Perception preview")
 * placeholder at SetupV2 Step 3. Publisher hits Verify → wizard advances
 * to Step 3 → WowMomentStep renders their latest article transforming
 * from publisher-formatted prose (left) into the structured JSON shape
 * /content-delivery returns to AI lab buyers (right).
 *
 * Data source: latest article from licensesApi.list({ limit: 1, status:
 * "verified" }). For Beehiiv/Ghost/Substack paths the M1.b backend
 * inline first-batch fetch hydrates this. For Custom API path the
 * publisher hasn't POSTed anything yet — render the curated static
 * sample fixture with framing "Here's what AI labs see when you POST
 * your first batch."
 *
 * Strategic frame (founder Correction 2): publisher's wow moment is
 * "Opedd is the rail between my work and the AI economy" — VISUAL
 * proof, not a revenue projection number. Five RAG-essential fields
 * populate one-by-one on the right side as the article transforms.
 */

interface PreviewArticle {
  id: string;
  title: string;
  description?: string | null;
  source_url: string;
  content_body?: string | null;
  author?: string | null;
  language?: string | null;
  word_count?: number | null;
  content_hash?: string | null;
  image_urls?: string[] | null;
  canonical_url?: string | null;
  tags?: string[] | null;
}

interface LoadState {
  kind: "loading" | "ready" | "fallback" | "error";
  article?: PreviewArticle;
  isFallback?: boolean;
}

// Ordered field reveal — drives the populating-fields animation on the
// right side. 600ms intervals = ~3s full reveal.
const REVEAL_FIELDS: Array<{ key: keyof PreviewArticle; label: string }> = [
  { key: "title", label: "title" },
  { key: "author", label: "author" },
  { key: "language", label: "language" },
  { key: "word_count", label: "word_count" },
  { key: "content_hash", label: "content_hash" },
  { key: "canonical_url", label: "canonical_url" },
  { key: "tags", label: "tags" },
];
const REVEAL_INTERVAL_MS = 600;

export function WowMomentStep() {
  const wizard = useWizardState();
  const { getAccessToken } = useAuth();
  const platform = (wizard.setupData?.platform_choice ?? null) as string | null;
  const isCustomApi = platform === "api" || platform === "custom_api";

  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [revealedCount, setRevealedCount] = useState(0);
  const [advancing, setAdvancing] = useState(false);

  // Fetch the latest article. Custom API path skips fetch and uses the
  // static sample directly (no real content yet — first POST is the
  // publisher's actual wow moment per Adjustment 1).
  useEffect(() => {
    let cancelled = false;
    if (isCustomApi) {
      setLoadState({ kind: "fallback", article: CUSTOM_API_SAMPLE_PREVIEW, isFallback: true });
      return;
    }
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await licensesApi.list<{ data: PreviewArticle[] }>({ limit: 1 }, token);
        if (cancelled) return;
        const article = res.data?.[0] ?? null;
        if (article && article.content_body) {
          setLoadState({ kind: "ready", article });
        } else {
          // Fail-soft: M1.b inline-fetch may have timed out OR hit the
          // Substack 100%-paid edge case. Frontend gracefully degrades.
          setLoadState({ kind: "fallback", article: CUSTOM_API_SAMPLE_PREVIEW, isFallback: true });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadState({ kind: "fallback", article: CUSTOM_API_SAMPLE_PREVIEW, isFallback: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustomApi, getAccessToken]);

  // Drive the staged reveal of structured fields on the right side.
  useEffect(() => {
    if (loadState.kind !== "ready" && loadState.kind !== "fallback") return;
    if (revealedCount >= REVEAL_FIELDS.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), REVEAL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [loadState.kind, revealedCount]);

  const handleContinue = useCallback(async () => {
    if (advancing || wizard.isMutating) return;
    setAdvancing(true);
    try {
      await wizard.advance({});
    } finally {
      setAdvancing(false);
    }
  }, [advancing, wizard]);

  if (loadState.kind === "loading") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  const article = loadState.article!;
  const sampleFrame = loadState.isFallback;

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-navy-deep mb-2">
            Your work, in the AI economy
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {sampleFrame
              ? "Here's what AI labs will see when you POST your first batch."
              : "Your latest article transformed into the structured format AI labs consume."}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: publisher prose */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8"
          >
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">As published</p>
            <h2 className="text-xl font-semibold text-navy-deep mb-3">{article.title}</h2>
            {article.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{article.description}</p>
            )}
            <div
              className="prose prose-sm max-w-none text-gray-700 max-h-64 overflow-hidden relative"
              dangerouslySetInnerHTML={{ __html: (article.content_body ?? "").slice(0, 1200) }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </motion.div>

          {/* RIGHT: structured JSON populating */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-navy-deep text-alice-gray rounded-2xl shadow-sm p-6 md:p-8 font-mono text-sm"
          >
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">As AI labs see it</p>
            <div className="space-y-2">
              <AnimatePresence>
                {REVEAL_FIELDS.slice(0, revealedCount).map((f) => {
                  const value = article[f.key];
                  if (value === null || value === undefined) return null;
                  const display =
                    Array.isArray(value)
                      ? JSON.stringify(value)
                      : typeof value === "string" && value.length > 60
                      ? `"${value.slice(0, 57)}…"`
                      : typeof value === "string"
                      ? `"${value}"`
                      : String(value);
                  return (
                    <motion.div
                      key={f.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-2"
                    >
                      <span className="text-plum-magenta">{f.label}:</span>
                      <span className="text-alice-gray break-all">{display}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {sampleFrame && !isCustomApi && (
            <p className="text-xs text-gray-500 text-center max-w-md">
              We're still indexing your archive. The sample shows the format
              your real content will arrive in once syncing completes.
            </p>
          )}
          <Button
            type="button"
            onClick={handleContinue}
            disabled={advancing || wizard.isMutating || revealedCount < REVEAL_FIELDS.length}
            className="w-full sm:w-auto sm:px-10"
          >
            {advancing ? "Continuing…" : "Continue"}
          </Button>
          <Link to="/dashboard" className="text-sm text-navy-deep hover:text-oxford font-medium">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
