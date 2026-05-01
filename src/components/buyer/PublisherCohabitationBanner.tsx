import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { Building2, ArrowRight } from "lucide-react";

// Phase 5.2.2 OQ-3: lenient cohabitation. If the same auth.uid() also
// has a publishers row, show a small cross-link banner so the user
// can switch contexts without confusion. Probes via the publisher-profile
// edge function (200 = has publisher row; non-200 = doesn't). Avoids
// direct supabase.from("publishers") which doesn't exist in this
// repo's generated Database types. Result cached for the session.

const CACHE_KEY = "opedd_buyer_publisher_check";

export function PublisherCohabitationBanner() {
  const { user, getAccessToken } = useAuth();
  const [hasPublisherRow, setHasPublisherRow] = useState<boolean | null>(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached === "true") return true;
    if (cached === "false") return false;
    return null;
  });

  useEffect(() => {
    if (!user || hasPublisherRow !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) { if (!cancelled) setHasPublisherRow(false); return; }
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (cancelled) return;
        // 200 → publisher row exists for this auth.uid(); 4xx → it doesn't.
        const hasRow = res.ok;
        setHasPublisherRow(hasRow);
        sessionStorage.setItem(CACHE_KEY, String(hasRow));
      } catch {
        // Network blip — treat as "no publisher row" for UX (banner stays hidden).
        if (!cancelled) setHasPublisherRow(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, hasPublisherRow, getAccessToken]);

  if (!hasPublisherRow) return null;

  return (
    <div className="rounded-lg border border-oxford-pale bg-oxford-light/40 px-4 py-3 mb-4 flex items-center gap-3">
      <Building2 size={16} className="text-oxford shrink-0" />
      <p className="text-sm text-oxford flex-1">
        You're also registered as a publisher on Opedd.
      </p>
      <Link
        to="/dashboard"
        className="text-xs font-semibold text-oxford hover:underline flex items-center gap-1 shrink-0"
      >
        Publisher dashboard <ArrowRight size={12} />
      </Link>
    </div>
  );
}
