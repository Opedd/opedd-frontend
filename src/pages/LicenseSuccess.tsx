import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Shield, ArrowLeft, Loader2, XCircle, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const EXT_SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const EXT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

interface CheckoutData {
  status: "pending" | "completed" | "failed";
  license_key?: string | null;
  article_title?: string;
  amount?: number;
}

export default function LicenseSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  const fetchStatus = useCallback(async (): Promise<string> => {
    if (!sessionId) {
      setLoading(false);
      return "no_session";
    }
    try {
      const res = await fetch(
        `${EXT_SUPABASE_URL}/functions/v1/checkout-status?session_id=${encodeURIComponent(sessionId)}`,
        { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } }
      );
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        setLoading(false);
        return result.data.status;
      }
      setData({ status: "failed" });
      setLoading(false);
      return "failed";
    } catch {
      setData({ status: "failed" });
      setLoading(false);
      return "failed";
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    startRef.current = Date.now();

    const poll = async () => {
      const status = await fetchStatus();
      if (status === "pending") {
        intervalRef.current = setInterval(async () => {
          // 60s timeout
          if (Date.now() - startRef.current > 60_000) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimedOut(true);
            setLoading(false);
            return;
          }
          const s = await fetchStatus();
          if (s !== "pending" && intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }, 2000);
      }
    };

    poll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, sessionId]);

  const handleCopy = () => {
    if (!data?.license_key) return;
    navigator.clipboard.writeText(data.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // — No session_id —
  if (!sessionId && !loading) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">No checkout session found</h1>
          <p className="text-white/50 text-sm">Please try purchasing again.</p>
          <Link to="/" className="inline-block text-sm text-[#A78BFA] hover:underline">← Return to Opedd</Link>
        </motion.div>
      </Shell>
    );
  }

  // — Timed out —
  if (timedOut && data?.status === "pending") {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
            <Mail size={36} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Taking longer than expected</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Payment is taking longer than expected. You'll receive an email with your license key shortly.
          </p>
          <Link to="/" className="inline-block text-sm text-[#A78BFA] hover:underline">← Return to Opedd</Link>
        </motion.div>
      </Shell>
    );
  }

  // — Loading / Pending —
  if (loading || data?.status === "pending") {
    return (
      <Shell>
        <div className="text-center space-y-6">
          <Loader2 className="h-10 w-10 animate-spin text-white/40 mx-auto" />
          <p className="text-white/60 text-sm">Confirming your payment...</p>
        </div>
      </Shell>
    );
  }

  // — Failed —
  if (data?.status === "failed") {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
            <XCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment was not completed</h1>
          <p className="text-white/50 text-sm">Your payment could not be processed. Please try again or contact support.</p>
          <Link to="/" className="inline-block text-sm text-[#A78BFA] hover:underline">← Return to Opedd</Link>
        </motion.div>
      </Shell>
    );
  }

  // — Completed —
  return (
    <Shell>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center space-y-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
        >
          <Check size={40} className="text-emerald-400" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">License Secured!</h1>
          {data?.article_title && (
            <p className="text-white/70 text-base font-medium" style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}>
              {data.article_title}
            </p>
          )}
        </div>

        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">
          <Shield size={12} className="mr-1.5" />
          Verified & Recorded
        </Badge>

        {/* License key card */}
        {data?.license_key && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">License Key</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-2xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] leading-none">
                {data.license_key}
              </code>
              <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {data.amount != null && data.amount > 0 && (
              <p className="text-sm text-white/40">Amount paid: <span className="text-white/70 font-medium">${data.amount.toFixed(2)}</span></p>
            )}
          </div>
        )}

        {/* Action links */}
        <div className="flex flex-col items-center gap-3">
          {data?.license_key && (
            <>
              <Link
                to={`/verify/${encodeURIComponent(data.license_key)}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#A78BFA] hover:underline"
              >
                <Shield size={14} />
                Verify this license
              </Link>
              <a
                href={`${EXT_SUPABASE_URL}/functions/v1/certificate?key=${encodeURIComponent(data.license_key)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#A78BFA] hover:underline"
              >
                <Download size={14} />
                Download Certificate (PDF)
              </a>
            </>
          )}
          <Link to="/" className="inline-block text-sm text-white/40 hover:text-white/60 transition-colors mt-2">
            ← Return to Opedd
          </Link>
        </div>

        <p className="text-xs text-white/30">
          A confirmation email has been sent to your inbox.
        </p>
      </motion.div>
    </Shell>
  );
}

/** Layout shell shared by all states */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#4A26ED]/15 rounded-full blur-3xl" />
      </div>
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
