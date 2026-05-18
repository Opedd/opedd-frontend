import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useWizardState } from "@/hooks/useWizardState";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { EXT_SUPABASE_REST } from "@/lib/constants";

/**
 * Phase 11 M7.2 — Dashboard /import page.
 *
 * Generic CSV upload surface for Custom API publishers (the four-paths
 * rule: Substack/Beehiiv/Ghost have their own connector path; everyone
 * else routes here OR through scripts/<cms>-import.ts).
 *
 * Backend reuse: POSTs to the existing `substack-upload` edge function
 * via Supabase JWT auth + text/csv body. The endpoint name is historical;
 * its CSV path accepts any CSV matching the canonical column schema
 * (title + url + published_at required; html_body / description /
 * author / language / tags / image_urls / canonical_url / is_paid
 * optional). Phase 12 ops-hygiene candidate: rename to
 * `publishers-import-csv` for clarity.
 *
 * Limits inherited from substack-upload: 5,000 rows / file, 200MB
 * content-length cap. For larger archives, use scripts/rebelmouse-import.ts
 * (or future scripts/<cms>-import.ts) OR multiple files OR raw HTTP
 * POST /publishers-content directly.
 */
export default function Import() {
  useDocumentTitle("Import content — Opedd");
  const { getAccessToken } = useAuth();
  const wizardState = useWizardState();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Bug #2.3 (2026-05-18) — errors is string[], not number. Backend
  // returns per-row skip-reason strings in data.errors[] (e.g.
  // "Row 3: invalid published_at format", "Row 7: duplicate source_url").
  // Pre-fix we collapsed errors into a length count, so the publisher
  // saw "0 errors" but had no signal on WHY rows were skipped. The
  // banner now surfaces the strings inline.
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (isUploading) return;
      setIsUploading(true);
      setErrorMessage(null);
      setResult(null);

      try {
        if (file.size > 200 * 1024 * 1024) {
          throw new Error("File exceeds 200MB limit. Split into multiple files or use scripts/ migration tooling.");
        }

        const token = await getAccessToken();
        if (!token) throw new Error("Not signed in.");

        const resp = await fetch(`${EXT_SUPABASE_REST}/functions/v1/substack-upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/csv",
          },
          body: file,
        });

        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(
            (body as { error?: string }).error ||
              `Upload failed with HTTP ${resp.status}`,
          );
        }

        // Bug #2.2 fix (2026-05-18) — substack-upload returns a
        // {success, data} envelope per the response-envelope helper
        // contract; counts live at body.data.X, NOT body.X. Pre-fix we
        // read body.imported (undefined) → fallback 0 → Bug #1's
        // three-state pattern rendered amber "No rows found" even
        // when the backend had successfully inserted N rows.
        const envelope = body as { data?: Record<string, unknown> };
        const data = (envelope.data ?? body) as Record<string, unknown>;

        const imported = typeof data.imported === "number" ? data.imported : 0;
        const skipped = typeof data.skipped === "number" ? data.skipped : 0;
        const errors = Array.isArray(data.errors)
          ? (data.errors as unknown[]).filter(
              (e): e is string => typeof e === "string",
            )
          : [];

        setResult({ imported, skipped, errors });
        // Bug #1 fix (2026-05-18) — three-state toast: complete / empty /
        // failed. When the backend returns 200 but with 0/0/0 counts, the
        // request succeeded but no user-meaningful work happened. Surface
        // a distinct empty-state copy instead of "Import complete" which
        // implies success.
        const totalProcessed = imported + skipped + errors.length;
        if (totalProcessed === 0) {
          toast({
            title: "No rows found",
            description:
              "We received your file but found no data rows. Check that your CSV has a header row plus at least one data row.",
          });
        } else {
          toast({
            title: "Import complete",
            description: `${imported} imported, ${skipped} skipped, ${errors.length} errors.`,
          });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { surface: "dashboard-import" } });
        const msg = err instanceof Error ? err.message : "Upload failed.";
        setErrorMessage(msg);
        toast({ title: "Import failed", description: msg, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    },
    [getAccessToken, isUploading, toast],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  // Custom API publishers only — Substack/Beehiiv/Ghost have their own
  // wizard + ingestion path. Display a hint if a platform publisher
  // lands here by mistake.
  const platform = wizardState.setupData?.platform as string | undefined;
  const isCustomApi = platform === "api" || !platform;

  return (
    <DashboardLayout title="Import content" headerActions={<></>}>
      <div className="p-4 sm:p-8 max-w-3xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-oxford">Import content</h1>
          <p className="text-sm text-gray-600 mt-2">
            Upload a CSV of your articles to ingest them into Opedd. Each row becomes a licensable article.
          </p>
        </div>

        {!isCustomApi && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">You're on the {platform} platform.</p>
              <p className="mt-1">
                Your content syncs automatically via the {platform} connector. The CSV import is for Custom API publishers only.
              </p>
              <Button
                variant="link"
                className="px-0 mt-1 text-amber-900 underline"
                onClick={() => navigate("/dashboard")}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-base font-semibold text-oxford mb-2">CSV file</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Required columns:</strong> <code className="text-xs">title</code>, <code className="text-xs">url</code>, <code className="text-xs">published_at</code> (ISO 8601).
            <br />
            <strong>Optional columns:</strong> <code className="text-xs">description</code>, <code className="text-xs">html_body</code>, <code className="text-xs">author</code>, <code className="text-xs">language</code>, <code className="text-xs">tags</code> (semicolon-separated), <code className="text-xs">image_urls</code> (semicolon-separated), <code className="text-xs">canonical_url</code>, <code className="text-xs">is_paid</code> (true/false).
            <br />
            <strong>Limits:</strong> 5,000 rows per file. 200MB max. For larger archives, split into multiple files or use{" "}
            <Link to="/dashboard" className="text-oxford underline">
              the canonical Custom API
            </Link>.
          </p>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-oxford hover:bg-alice-gray transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-3 text-gray-600">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-600">
                <Upload className="w-8 h-8" />
                <p className="text-sm font-medium">Drop your CSV here, or click to browse</p>
                <p className="text-xs text-gray-500">.csv up to 200MB</p>
              </div>
            )}
          </div>
        </div>

        {result && (() => {
          // Bug #1 fix (2026-05-18) — three-state invariant. A truthy
          // result envelope means "HTTP request succeeded," which is
          // distinct from "user-meaningful work happened." Render the
          // amber empty state when all three counts are zero; render
          // the green success state otherwise. Failed state (red) is
          // surfaced separately via errorMessage at this surface's
          // catch branch.
          const totalProcessed = result.imported + result.skipped + result.errors.length;

          if (totalProcessed === 0) {
            // EMPTY state — request succeeded but file produced no rows.
            // Common causes: header-only file, no data rows, parser
            // skipped all rows for upstream reasons (Bug #2 territory).
            // The amber banner must NOT show the green checkmark, so a
            // future regression cannot quietly re-introduce the
            // false-success state.
            return (
              <div
                data-testid="import-result-banner-empty"
                className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium">No rows found</p>
                  <p className="mt-1">
                    We received your file but found no data rows to import.
                    Check that your CSV has a header row plus at least one
                    data row.
                  </p>
                  <Button
                    variant="link"
                    className="px-0 mt-1 text-amber-900 underline"
                    onClick={() => navigate("/dashboard")}
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            );
          }

          // COMPLETE state — at least one row was processed (imported,
          // skipped with reason, OR errored). Bug #2.3: surface
          // per-row skip-reason strings under the counts so the
          // publisher can see WHY rows didn't import.
          return (
            <div
              data-testid="import-result-banner-complete"
              className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-medium">Import complete</p>
                <p className="mt-1">
                  <strong>{result.imported}</strong> imported,{" "}
                  <strong>{result.skipped}</strong> skipped,{" "}
                  <strong>{result.errors.length}</strong> errors.
                </p>
                {result.errors.length > 0 && (
                  <ul
                    data-testid="import-result-errors-list"
                    className="mt-2 list-disc pl-5 text-xs text-green-800 space-y-0.5 max-h-40 overflow-y-auto"
                  >
                    {result.errors.map((errMsg, i) => (
                      <li key={i}>{errMsg}</li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="link"
                  className="px-0 mt-1 text-green-900 underline"
                  onClick={() => navigate("/dashboard")}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          );
        })()}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium">Import failed</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
            <div>
              <p className="font-medium text-oxford">Need to import more than 5,000 articles?</p>
              <p className="mt-1">
                For larger migrations (e.g., 50K+ Rebel Mouse articles), email{" "}
                <a href="mailto:support@opedd.com" className="text-oxford underline">
                  support@opedd.com
                </a>{" "}
                — we'll run a migration script directly. See the{" "}
                <a
                  href="https://docs.opedd.com/managed-ingestion.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-oxford underline"
                >
                  managed ingestion direction
                </a>{" "}
                for full options.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
