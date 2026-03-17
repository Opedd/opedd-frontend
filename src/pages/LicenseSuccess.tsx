import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Copy, Shield, Loader2, XCircle, Download, Mail, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-white/30 uppercase tracking-wider sm:w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/80">{children}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#040042] flex flex-col">
      <div className="px-6 py-6 border-b border-white/5">
        <Link to="/">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        {children}
      </div>
      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-3">
          <p className="text-xs text-white/20">
            Powered by <span className="text-white/40 font-medium">Opedd Protocol</span>
          </p>
          <span className="text-white/10">·</span>
          <a href="mailto:support@opedd.com" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            Help & Support
          </a>
        </div>
      </div>
    </div>
  );
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
        `${EXT_SUPABASE_URL}/checkout-status?session_id=${encodeURIComponent(sessionId)}`,
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
      await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, {
        method: "POST",
        headers: { apikey: EXT_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.buyer_email }),
      });
      setResent(true);
    } catch { /* silent */ }
    finally { setResending(false); }
  };

  const licenseTypeLabel = data?.license_type === "ai" ? "AI Training License" : "Human Republication License";

  // — No session —
  if (!sessionId && !loading) {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-1.5 text-sm font-medium mb-6">
            <XCircle className="h-4 w-4" />
            No Session Found
          </div>
          <p className="text-white/50 text-sm mb-6">No checkout session found. Please try purchasing again.</p>
          <Link to="/" className="text-sm text-white/30 hover:text-white/50 transition-colors">← Return to Opedd</Link>
        </div>
      </Shell>
    );
  }

  // — Timed out —
  if (timedOut && (!data || data.status === "pending")) {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-4 py-1.5 text-sm font-medium mb-6">
            <Mail className="h-4 w-4" />
            Processing
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">This is taking longer than expected</h1>
          <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto">
            Your license key will arrive by email shortly. If you don't receive it within 10 minutes, use the resend option below.
          </p>
        </div>
      </Shell>
    );
  }

  // — Loading / Pending —
  if (loading || data?.status === "pending") {
    return (
      <Shell>
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40 mx-auto mb-4" />
          <p className="text-white/50 text-sm">Confirming your payment...</p>
        </div>
      </Shell>
    );
  }

  // — Failed —
  if (data?.status === "failed") {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-1.5 text-sm font-medium mb-6">
            <XCircle className="h-4 w-4" />
            Payment Failed
          </div>
          <p className="text-white/50 text-sm mb-6">Your payment could not be processed. Please try again or contact support.</p>
          <Link to="/" className="text-sm text-white/30 hover:text-white/50 transition-colors">← Return to Opedd</Link>
        </div>
      </Shell>
    );
  }

  // — Completed —
  return (
    <Shell>
      <div className="w-full max-w-[640px] space-y-6 animate-fade-in">
        {/* Status Badge */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-sm font-medium">
            <Check className="h-4 w-4" />
            License Issued
          </div>
        </div>

        {/* License Key */}
        <div className="text-center">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2">License Key</p>
          <div className="flex items-center justify-center gap-3">
            <code className="text-2xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] leading-none select-all">
              {data?.license_key}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Details Card */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm text-white">
          <CardContent className="p-6 space-y-4">
            {data?.article_title && (
              <DetailRow label="Content">
                <span className="font-medium" style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}>
                  {data.article_title}
                </span>
              </DetailRow>
            )}
            <DetailRow label="License Type">{licenseTypeLabel}</DetailRow>
            {data?.amount != null && data.amount > 0 && (
              <DetailRow label="Amount Paid">${data.amount.toFixed(2)}</DetailRow>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {data?.license_key && (
          <div className="flex flex-col items-center gap-3">
            <Link
              to={`/verify/${encodeURIComponent(data.license_key)}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#040042] hover:bg-white/90 px-6 py-3 text-sm font-semibold transition-colors w-full max-w-xs"
            >
              <Shield className="h-4 w-4" />
              Verify License
            </Link>
            <a
              href={`${EXT_SUPABASE_URL}/invoice?key=${encodeURIComponent(data.license_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 px-6 py-2.5 text-sm font-medium text-white transition-colors w-full max-w-xs"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </a>
          </div>
        )}

        {/* Bottom Links */}
        <div className="text-center space-y-3 pt-2">
          {data?.buyer_email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/50 transition-colors disabled:opacity-50"
            >
              {resent ? (
                <><Check className="h-3.5 w-3.5 text-emerald-400" /> Sent to your email</>
              ) : resending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Resend to my email</>
              )}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
