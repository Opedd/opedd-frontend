import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function VerificationPendingBanner() {
  const { user } = useAuth();
  const [hasPending, setHasPending] = useState(false);

  const check = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from("rss_sources" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sync_status", "pending");
      setHasPending((count ?? 0) > 0);
    } catch {
      setHasPending(false);
    }
  }, [user]);

  useEffect(() => { check(); }, [check]);

  if (!hasPending) return null;

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
            Your articles have been imported but aren't licensable yet.
            Verify ownership of your publication to activate licensing.
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
