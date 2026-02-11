import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Shield, ArrowLeft, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const EXT_SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const EXT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

type CheckoutStatus = "pending" | "completed" | "failed";

interface CheckoutData {
  status: CheckoutStatus;
  license_key?: string;
  article_title?: string;
  amount?: number;
}

export default function LicenseSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) {
      setData({ status: "failed" });
      setLoading(false);
      return;
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
      } else {
        setData({ status: "failed" });
        setLoading(false);
        return "failed";
      }
    } catch {
      setData({ status: "failed" });
      setLoading(false);
      return "failed";
    }
  }, [sessionId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const status = await fetchStatus();
      if (status === "pending") {
        interval = setInterval(async () => {
          const s = await fetchStatus();
          if (s !== "pending" && interval) {
            clearInterval(interval);
          }
        }, 3000);
      }
    };

    poll();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus]);

  const handleCopy = () => {
    if (!data?.license_key) return;
    navigator.clipboard.writeText(data.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#4A26ED]/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Center content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        {/* Loading / Pending */}
        {(loading || data?.status === "pending") && (
          <div className="text-center space-y-6">
            <Loader2 className="h-10 w-10 animate-spin text-white/40 mx-auto" />
            <p className="text-white/60 text-sm">Processing your payment…</p>
          </div>
        )}

        {/* Failed */}
        {!loading && data?.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full text-center space-y-6"
          >
            <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
              <XCircle size={40} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Payment was not completed</h1>
            <p className="text-white/50 text-sm">Your payment could not be processed. Please try again or contact support.</p>
            <Link to="/" className="inline-block text-sm text-[#A78BFA] hover:underline">
              ← Return to Opedd
            </Link>
          </motion.div>
        )}

        {/* Completed */}
        {!loading && data?.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full text-center space-y-8"
          >
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
              {data.article_title && (
                <p className="text-white/70 text-base font-medium" style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}>
                  {data.article_title}
                </p>
              )}
              <p className="text-white/50 text-sm leading-relaxed">
                Your license key has been issued. A confirmation has been sent to your email and the author has been notified.
              </p>
            </div>

            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">
              <Shield size={12} className="mr-1.5" />
              Verified & Recorded
            </Badge>

            {/* License key */}
            {data.license_key && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
                <p className="text-xs text-white/40 uppercase tracking-wider">License Key</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-3xl md:text-4xl font-mono font-bold text-white tracking-[0.25em] leading-none">
                    {data.license_key}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {data.amount != null && (
                  <p className="text-sm text-white/40">Amount: ${data.amount.toFixed(2)}</p>
                )}
              </div>
            )}

            <Link to="/" className="inline-block text-sm text-[#A78BFA] hover:underline">
              ← Return to Opedd
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
