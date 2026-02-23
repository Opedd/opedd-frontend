import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ImportRecord {
  status: "queued" | "processing" | "done" | "failed";
  total_urls: number;
  inserted_count: number;
  processed_urls: number;
  created_at: string;
}

export function ImportProgressBanner({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchImport = useCallback(async () => {
    if (!user) return;
    try {
      const { data: pub } = await (supabase.from as any)("publishers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!pub) return;
      const { data } = await (supabase.from as any)("import_queue")
        .select("status, inserted_count, total_urls, processed_urls, created_at")
        .eq("publisher_id", pub.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setRecord(data as ImportRecord);
    } catch {
      // no records
    }
  }, [user]);

  // Polling
  useEffect(() => {
    fetchImport();
    const poll = () => {
      timerRef.current = setTimeout(async () => {
        await fetchImport();
        poll();
      }, 5000);
    };
    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchImport]);

  // Stop polling + auto-dismiss on done
  useEffect(() => {
    if (!record) return;
    if (record.status === "done") {
      if (timerRef.current) clearTimeout(timerRef.current);
      onComplete?.();
      autoDismissRef.current = setTimeout(() => setDismissed(true), 4000);
    }
    if (record.status === "failed") {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [record?.status, onComplete]);

  if (dismissed || !record) return null;
  if (record.status !== "queued" && record.status !== "processing" && record.status !== "done" && record.status !== "failed") return null;

  // Done state
  if (record.status === "done") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        <p className="text-sm text-emerald-700 font-medium flex-1">
          Import complete — {record.inserted_count.toLocaleString()} articles added
        </p>
        <button onClick={() => setDismissed(true)} className="text-emerald-400 hover:text-emerald-600">
          <XCircle size={14} />
        </button>
      </div>
    );
  }

  // Failed state
  if (record.status === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <XCircle size={16} className="text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700 font-medium flex-1">Import failed — please try again</p>
        <button onClick={() => setDismissed(true)} className="text-red-400 hover:text-red-600">
          <XCircle size={14} />
        </button>
      </div>
    );
  }

  // Active state (queued / processing)
  const progress = record.total_urls > 0 ? (record.inserted_count / record.total_urls) * 100 : 0;
  const remaining = record.total_urls - record.inserted_count;
  const etaMinutes = Math.ceil(remaining / 250);
  const etaLabel = etaMinutes > 60
    ? `~${Math.ceil(etaMinutes / 60)} hours remaining`
    : `~${etaMinutes} minute${etaMinutes !== 1 ? "s" : ""} remaining`;

  return (
    <div className="bg-[#4A26ED]/5 border border-[#4A26ED]/15 rounded-xl px-4 py-3 flex items-center gap-4">
      <Loader2 size={16} className="text-[#4A26ED] animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#040042]">Importing your archive…</p>
        <p className="text-xs text-slate-500">
          {record.inserted_count.toLocaleString()} of {record.total_urls.toLocaleString()} articles
          {record.total_urls > 0 && ` · ${etaLabel}`}
        </p>
      </div>
      <div className="w-32 h-1.5 rounded-full bg-[#4A26ED]/20 flex-shrink-0 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#4A26ED] transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}
