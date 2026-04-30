import { useState, useRef } from "react";
import * as Sentry from "@sentry/react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import substackLogo from "@/assets/platforms/substack.svg";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Phase 4.7.5 — defensive hardening + UX feedback per OQ.4 follow-up:
 *   - Sentry breadcrumbs at handler entry, post-getAccessToken, post-fetch, in finally
 *     (replaces console.log per PFQ-2-bis; cleaner production output).
 *   - 60s Promise.race timeout on the fetch — surfaces network/server hang as toast.
 *   - null-token early-return + error toast (currently silent on getAccessToken null).
 *   - Success toast ("Import complete: X articles") — survives modal close per PFQ-A (iii).
 *   - Envelope unwrap fix: backend returns `{ success: true, data: { imported, updated, ... } }`;
 *     prior code read `json.imported` (undefined) and showed "0 articles imported" silently
 *     even on successful upload. Now reads `json.data.imported + json.data.updated` for
 *     accurate count.
 */

interface SubstackImportCardProps {
  onImportComplete?: () => void;
}

interface ImportSuccessData {
  imported: number;
  updated: number;
  errored: number;
  total_posts: number;
}

const UPLOAD_TIMEOUT_MS = 60_000;

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

export function SubstackImportCard({ onImportComplete }: SubstackImportCardProps) {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportSuccessData | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    Sentry.addBreadcrumb({
      category: "substack-upload",
      level: "info",
      message: "handleImport entry",
      data: { fileName: file.name, fileSize: file.size },
    });
    setUploading(true);
    setResult(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        Sentry.addBreadcrumb({
          category: "substack-upload",
          level: "warning",
          message: "getAccessToken returned null",
        });
        toast({
          title: "Authentication required",
          description: "Your session may have expired. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }
      Sentry.addBreadcrumb({
        category: "substack-upload",
        level: "info",
        message: "got access token; firing fetch",
      });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchWithTimeout(
        `${EXT_SUPABASE_REST}/functions/v1/substack-upload`,
        {
          method: "POST",
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
        UPLOAD_TIMEOUT_MS,
      );
      Sentry.addBreadcrumb({
        category: "substack-upload",
        level: "info",
        message: "fetch returned",
        data: { status: res.status, ok: res.ok },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        const errMsg =
          (typeof json?.error === "string" ? json.error : json?.error?.message) ||
          json?.message ||
          "Upload failed";
        throw new Error(errMsg);
      }
      // Envelope unwrap: backend returns { success: true, data: { imported, updated, ... } }
      const data = json.data ?? {};
      const successData: ImportSuccessData = {
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        errored: data.errored ?? 0,
        total_posts: data.total_posts ?? 0,
      };
      setResult(successData);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";

      const totalProcessed = successData.imported + successData.updated;
      toast({
        title: `Import complete: ${totalProcessed} article${totalProcessed === 1 ? "" : "s"}`,
        description:
          successData.errored > 0
            ? `${successData.errored} article${successData.errored === 1 ? "" : "s"} couldn't be imported.`
            : undefined,
      });

      onImportComplete?.();
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      Sentry.addBreadcrumb({
        category: "substack-upload",
        level: "error",
        message: "handleImport caught error",
        data: { isAbort, error: String(err).slice(0, 200) },
      });
      Sentry.captureException(err, { tags: { component: "SubstackImportCard" } });
      toast({
        title: isAbort ? "Upload timed out" : "Import failed",
        description: isAbort
          ? "The upload took longer than 60 seconds. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Could not upload export.",
        variant: "destructive",
      });
    } finally {
      Sentry.addBreadcrumb({
        category: "substack-upload",
        level: "info",
        message: "handleImport finally",
      });
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-substack-orange/10 flex items-center justify-center flex-shrink-0">
          <img src={substackLogo} alt="Substack" className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy-deep">Import from Substack</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload your Substack export <code className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded">.zip</code> to import your full archive (including paid-post bodies).
          </p>
        </div>
      </div>

      {/* Collapsible instructions */}
      <button
        onClick={() => setInstructionsOpen(!instructionsOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-oxford hover:text-oxford-dark mb-3 transition-colors"
      >
        {instructionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        How to get your export
      </button>
      {instructionsOpen && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5">
          <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
            <li>Go to <span className="font-medium">substack.com → Settings → Export data</span></li>
            <li>Download the ZIP file</li>
            <li>Upload the <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-gray-200">.zip</code> file directly here</li>
          </ol>
        </div>
      )}

      {/* Success banner */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
            <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
            ✓ Import complete: {result.imported + result.updated} article
            {result.imported + result.updated === 1 ? "" : "s"} processed
            {result.imported > 0 && ` (${result.imported} new)`}
          </div>
          {result.errored > 0 && (
            <p className="text-xs text-amber-600 mt-1 ml-6">
              {result.errored} article{result.errored === 1 ? "" : "s"} couldn't be imported.
            </p>
          )}
        </div>
      )}

      {/* File picker + Import button */}
      <div className="flex items-center gap-3">
        <label className="flex-1 relative">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-2 h-10 px-3 border border-gray-200 rounded-lg bg-white text-sm text-gray-500 cursor-pointer hover:border-oxford/30 transition-colors">
            <Upload size={14} className="flex-shrink-0" />
            <span className="truncate">{file ? file.name : "Choose export.zip"}</span>
          </div>
        </label>
        <Button
          onClick={handleImport}
          disabled={!file || uploading}
          className="h-10 px-5 bg-oxford hover:bg-oxford-dark text-white text-sm font-medium shrink-0"
        >
          {uploading && <Spinner size="sm" className="mr-1.5" />}
          Import
        </Button>
      </div>
    </div>
  );
}
