import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type BannerState =
  | { kind: "none" }
  | { kind: "publisher_pending" }
  | { kind: "content_sources_pending" };

// Two distinct verification gates. We prefer to show the publisher-level
// one when both apply because it's the blocker that actually prevents
// buyers from seeing the content.
//
//   publisher.verification_status='pending'  → admin review queue (Phase B)
//   content_sources.sync_status='pending'    → per-URL ownership (legacy)
export function VerificationPendingBanner() {
  const { user } = useAuth();
  const [state, setState] = useState<BannerState>({ kind: "none" });

  const check = useCallback(async () => {
    if (!user) return;
    try {
      const sb = supabase as any;

      // 1. Publisher-level verification gate (takes precedence).
      const { data: pubRow } = await sb
        .from("publishers")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pubRow?.verification_status === "pending") {
        setState({ kind: "publisher_pending" });
        return;
      }

      // 2. Per-URL ownership gate (legacy path, still active for some flows).
      const { count } = await sb
        .from("content_sources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sync_status", "pending");
      if ((count ?? 0) > 0) {
        setState({ kind: "content_sources_pending" });
        return;
      }

      setState({ kind: "none" });
    } catch {
      setState({ kind: "none" });
    }
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  if (state.kind === "none") return null;

  if (state.kind === "publisher_pending") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">
            Your account is in the verification queue
          </p>
          <p className="text-xs text-blue-800 mt-0.5">
            We manually verify each publisher before their licenses go live to buyers — typically 1–3 business days. Your content is imported and safe; you can keep configuring pricing and rights. Buyers won't see your catalog until we've approved the account.
          </p>
        </div>
      </div>
    );
  }

  // content_sources_pending
  const scrollToSources = () => {
    const el = document.getElementById("sources-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Ownership verification pending</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Your articles have been imported but aren't licensable yet. Verify ownership of your publication to activate licensing.
          </p>
        </div>
      </div>
      <button
        onClick={scrollToSources}
        className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline shrink-0"
      >
        Verify now →
      </button>
    </div>
  );
}
