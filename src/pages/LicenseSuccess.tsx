import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Shield, ArrowLeft, Loader2, XCircle, Download, Mail, FileText, Receipt, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface CheckoutData {
  status: "pending" | "completed" | "failed";
  license_key?: string | null;
  article_title?: string;
  amount?: number;
  license_type?: string;
  buyer_email?: string;
  valid_from?: string;
  valid_until?: string;
  processing_timeout?: boolean;
}

export default function LicenseSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
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
        if (result.data.processing_timeout) {
          setTimedOut(true);
        }
        setLoading(false);
        return result.data.processing_timeout ? "timeout" : result.data.status;
      }
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
          if ((s !== "pending" && s !== "timeout") || s === "timeout") {
            if (intervalRef.current) clearInterval(intervalRef.current);
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

  const handleResend = async () => {
    if (!data?.buyer_email || resending) return;
    setResending(true);
    try {
      await fetch(`${EXT_SUPABASE_URL}/functions/v1/resend-licenses`, {
        method: "POST",
        headers: { apikey: EXT_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.buyer_email }),
      });
      setResent(true);
    } catch { /* silent */ }
    finally { setResending(false); }
  };

  const licenseTypeLabel = data?.license_type === "ai" ? "AI Training License" : "Human Republication License";

  
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
  if (timedOut && (!data || data.status === "pending")) {
    return (
      <Shell>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
            <Mail size={36} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">This is taking longer than expected</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Your license key will arrive by email shortly. If you don't receive it within 10 minutes, use the{" "}
            <Link to="/my-licenses" className="text-[#A78BFA] hover:underline font-medium">"Resend my licenses"</Link>{" "}
            option below.
          </p>
          <Link to="/my-licenses" className="inline-flex items-center gap-1.5 text-sm text-[#A78BFA] hover:underline">
            <Mail size={14} />
            Resend my licenses
          </Link>
          <div>
            <Link to="/" className="inline-block text-sm text-white/40 hover:text-white/60 transition-colors mt-2">← Return to Opedd</Link>
          </div>
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
            <div className="flex items-center justify-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <code className="text-lg md:text-xl font-mono font-bold text-white tracking-[0.15em] leading-none select-all">
                {data.license_key}
              </code>
              <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* License details */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">License type</p>
                <p className="text-sm text-white/80 font-medium">{licenseTypeLabel}</p>
              </div>
              {data.amount != null && data.amount > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Amount paid</p>
                  <p className="text-sm text-white/80 font-medium">${data.amount.toFixed(2)}</p>
                </div>
              )}
              {data.valid_from && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Valid from</p>
                  <p className="text-sm text-white/80 font-medium">{new Date(data.valid_from).toLocaleDateString()}</p>
                </div>
              )}
              {data.valid_until && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Valid until</p>
                  <p className="text-sm text-white/80 font-medium">{new Date(data.valid_until).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {data?.license_key && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`${EXT_SUPABASE_URL}/functions/v1/certificate?key=${encodeURIComponent(data.license_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
            >
              <FileText size={15} />
              Certificate
            </a>
            <a
              href={`${EXT_SUPABASE_URL}/functions/v1/invoice?key=${encodeURIComponent(data.license_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
            >
              <Receipt size={15} />
              Invoice
            </a>
          </div>
        )}

        {/* Secondary links */}
        <div className="flex flex-col items-center gap-3">
          {data?.license_key && (
            <Link
              to={`/verify/${encodeURIComponent(data.license_key)}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#A78BFA] hover:underline"
            >
              <Shield size={14} />
              Verify this license
            </Link>
          )}
          {data?.buyer_email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="inline-flex items-center gap-1.5 text-sm text-[#A78BFA] hover:underline disabled:opacity-50"
            >
              {resent ? (
                <><Check size={14} /> License details sent to your email</>
              ) : resending ? (
                <><Loader2 size={14} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={14} /> Resend license to my email</>
              )}
            </button>
          )}
          <Link to="/my-licenses" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
            <Mail size={14} />
            Lost your license? Resend by email
          </Link>
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
