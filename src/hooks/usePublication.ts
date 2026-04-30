import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type {
  BrandingData,
  ContentSourceSyncState,
  Publication,
  PublicationCTA,
  SetupData,
} from "@/types/dashboard";

/**
 * Phase 4.7.1 — composed-data hook for the dashboard publication card.
 *
 * Runs 3 parallel queries per OQ-G + composes shape per OQ.1:
 *   1. publishers (branding_data + verification_status + wizard state)
 *   2. content_sources (sync state — multiple rows aggregated per OQ-E)
 *   3. licenses count (total per OQ-B / OQ.5)
 *
 * Field-source rules per OQ.5:
 *   - logo: branding_data.logo_url (caller falls back to Google favicon)
 *   - name: branding_data.name → URL-derived → generic
 *   - publicationUrl: content_sources.url → setup_data.ownership_verification.evidence.publication_url
 *   - verificationStatus: publishers.verification_status DIRECT (not content_sources.*)
 *   - licenseCount: licenses table count(*) — NOT content_sources.article_count (KI #60)
 *   - last sync: most-recent content_sources.last_sync_at (OQ-E; column is last_sync_at not
 *     last_synced_at — KI #62 closure happens via this hook never reading the wrong name)
 *
 * Primary CTA per OQ-C decision (option a): verified+setup_complete=false → "Continue setup"
 * not "Import content". Surfaces the wizard incompleteness honestly.
 */

const VERIFICATION_STATUS_ALLOWED = new Set([
  "pending",
  "verified",
  "failed",
  "suspended",
]);

const SETUP_STATE_ALLOWED = new Set([
  "prospect",
  "in_setup",
  "connected",
  "verified",
  "suspended",
]);

function deriveCTA(args: {
  setupState: string;
  setupComplete: boolean;
  verificationStatus: string;
  licenseCount: number;
}): PublicationCTA {
  if (args.verificationStatus === "suspended" || args.setupState === "suspended") {
    return "contact_support";
  }
  if (args.setupState === "prospect") {
    return "get_started";
  }
  // OQ-C: verified+setup_complete=false → "Continue setup" (acknowledges both states honestly).
  if (!args.setupComplete) {
    return "continue_setup";
  }
  if (args.verificationStatus === "verified") {
    return args.licenseCount > 0 ? "view_licenses" : "import_content";
  }
  return "continue_setup";
}

function deriveName(branding: BrandingData | null, fallbackUrl: string | null): string {
  if (branding?.name && branding.name.trim().length > 0) return branding.name;
  if (fallbackUrl) {
    try {
      return new URL(fallbackUrl).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  return "Your publication";
}

function aggregateContentSources(
  rows: Array<{
    id: string;
    url: string | null;
    last_sync_at: string | null;
    sync_status: string | null;
    created_at: string | null;
  }>,
): ContentSourceSyncState | null {
  if (rows.length === 0) return null;
  // OQ-E: most-recent last_sync_at wins; tie-break by created_at desc.
  const winner = [...rows].sort((a, b) => {
    const aSync = a.last_sync_at ? new Date(a.last_sync_at).getTime() : -Infinity;
    const bSync = b.last_sync_at ? new Date(b.last_sync_at).getTime() : -Infinity;
    if (aSync !== bSync) return bSync - aSync;
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : -Infinity;
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : -Infinity;
    return bCreated - aCreated;
  })[0];
  return {
    last_sync_at: winner.last_sync_at,
    sync_status: winner.sync_status,
    url: winner.url,
    rowCount: rows.length,
  };
}

export interface UsePublicationResult {
  publication: Publication | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePublication(): UsePublicationResult {
  const { user } = useAuth();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setPublication(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. publishers row
      const pubRes = await (supabase.from as any)("publishers")
        .select(
          "id, name, branding_data, verification_status, setup_state, setup_step, setup_complete, setup_data",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (pubRes.error) throw pubRes.error;
      if (!pubRes.data) {
        // No publisher row — defensive: render nothing. Real publishers always have a row
        // (publisher-profile GET auto-creates).
        setPublication(null);
        setIsLoading(false);
        return;
      }
      const pub = pubRes.data as {
        id: string;
        name: string | null;
        branding_data: BrandingData | null;
        verification_status: string | null;
        setup_state: string | null;
        setup_step: number | null;
        setup_complete: boolean | null;
        setup_data: SetupData | null;
      };

      // 2. content_sources rows + 3. licenses count — parallel
      const [csRes, licRes] = await Promise.all([
        (supabase.from as any)("content_sources")
          .select("id, url, last_sync_at, sync_status, created_at")
          .eq("user_id", user.id),
        (supabase.from as any)("licenses")
          .select("*", { count: "exact", head: true })
          .eq("publisher_id", pub.id),
      ]);

      if (csRes.error) throw csRes.error;
      if (licRes.error) throw licRes.error;

      const sources = (csRes.data ?? []) as Array<{
        id: string;
        url: string | null;
        last_sync_at: string | null;
        sync_status: string | null;
        created_at: string | null;
      }>;
      const contentSources = aggregateContentSources(sources);
      const licenseCount = (licRes.count as number | null) ?? 0;

      const verificationStatus = (
        VERIFICATION_STATUS_ALLOWED.has(pub.verification_status ?? "")
          ? pub.verification_status
          : "pending"
      ) as Publication["verificationStatus"];
      const setupState = (
        SETUP_STATE_ALLOWED.has(pub.setup_state ?? "")
          ? pub.setup_state
          : "prospect"
      ) as Publication["setupState"];
      const setupComplete = pub.setup_complete === true;

      const evidenceUrl =
        pub.setup_data?.ownership_verification?.evidence?.publication_url ?? null;
      const publicationUrl = contentSources?.url ?? evidenceUrl ?? null;
      const name = deriveName(pub.branding_data, publicationUrl);
      const logoUrl = pub.branding_data?.logo_url ?? null;

      const primaryCTA = deriveCTA({
        setupState,
        setupComplete,
        verificationStatus,
        licenseCount,
      });

      setPublication({
        id: pub.id,
        name,
        logoUrl,
        publicationUrl,
        verificationStatus,
        setupState,
        setupStep: pub.setup_step,
        setupComplete,
        licenseCount,
        contentSources,
        primaryCTA,
        brandingData: pub.branding_data,
      });
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { publication, isLoading, error, refetch: load };
}

export const __test = {
  deriveCTA,
  deriveName,
  aggregateContentSources,
};
