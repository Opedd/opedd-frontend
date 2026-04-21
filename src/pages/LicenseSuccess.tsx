import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Check, Copy, Shield, Loader2, XCircle, Download, Mail, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { copyToClipboard } from "@/lib/clipboard";

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
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-gray-400 uppercase tracking-wider sm:w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-6 py-5 bg-white border-b border-gray-200">
        <Link to="/">
          <img src={opeddLogoColor} alt="Opedd" className="h-7" />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        {children}
      </div>
      <div className="text-center pb-6">
        <div className="flex items-center justify-center gap-3">
          <p className="text-xs text-gray-400">
            Powered by <span className="text-gray-500 font-medium">Opedd Protocol</span>
          </p>
          <span className="text-gray-200">·</span>
          <a href="mailto:support@opedd.com" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
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
  useDocumentTitle("License Confirmed — Opedd");

  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  const fetchStatus = useCallback(async (): Promise<string> => {
    if (!sessionId) { setLoading(false); return "no_session"; }
    try {
      const res = await fetch(
        `${EXT_SUPABASE_URL}/checkout-status?session_id=${encodeURIComponent(sessionId)}`,
        { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } }
      );
      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        if (result.data.processing_timeout) setTimedOut(true);
        setLoading(false);
        return result.data.processing_timeout ? "timeout" : result.data.status;
      }
      setLoading(false);
      return "unknown";
    } catch {
      setData({ status: "failed" });
      setLoading(false);
      return "failed";
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    startRef.current = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    // Adaptive backoff: 2s for first 30s (tight), then 5s up to 60s (relaxed), then stop.
    const scheduleNext = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startRef.current;
      if (elapsed > 60_000) {
        setTimedOut(true); setLoading(false);
        return;
      }
      const delay = elapsed < 30_000 ? 2_000 : 5_000;
      timeoutId = setTimeout(async () => {
        const s = await fetchStatus();
        if (s === "pending") scheduleNext();
      }, delay);
    };

    (async () => {
      const status = await fetchStatus();
      if (status === "pending") scheduleNext();
    })();

    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [fetchStatus, sessionId]);

  const handleCopy = async () => {
    if (!data?.license_key) return;
    await copyToClipboard(data.license_key);
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

  const licenseTypeLabel =
    data?.license_type === "ai" ? "AI Training License" :
    data?.license_type === "ai_inference" ? "AI Inference / RAG License" :
    data?.license_type === "archive" ? "Archive License" :
    data?.license_type === "syndication" ? "Syndication License" :
    "Editorial License";

  if (!sessionId && !loading) {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-600 px-4 py-1.5 text-sm font-medium mb-6">
            <XCircle className="h-4 w-4" />
            No Session Found
          </div>
          <p className="text-gray-500 text-sm mb-6">No checkout session found. Please try purchasing again.</p>
          <Link to="/" className="text-sm text-oxford hover:underline">← Return to Opedd</Link>
        </div>
      </Shell>
    );
  }

  if (timedOut && (!data || data.status === "pending")) {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-600 px-4 py-1.5 text-sm font-medium mb-6">
            <Mail className="h-4 w-4" />
            Processing
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">This is taking longer than expected</h1>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Your license key will arrive by email shortly. If you don't receive it within 10 minutes, use the resend option below.
          </p>
          {data?.buyer_email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="inline-flex items-center gap-1.5 text-sm text-oxford hover:underline disabled:opacity-50"
            >
              {resent ? (
                <><Check className="h-3.5 w-3.5 text-emerald-500" /> Sent to {data.buyer_email}</>
              ) : resending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Resend license to {data.buyer_email}</>
              )}
            </button>
          )}
          {sessionId && (
            <p className="text-xs text-gray-400 mt-4">Session: {sessionId}</p>
          )}
        </div>
      </Shell>
    );
  }

  if (loading || data?.status === "pending") {
    return (
      <Shell>
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-oxford mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Confirming your payment...</p>
        </div>
      </Shell>
    );
  }

  if (data?.status === "failed") {
    return (
      <Shell>
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-600 px-4 py-1.5 text-sm font-medium mb-6">
            <XCircle className="h-4 w-4" />
            Payment Failed
          </div>
          <p className="text-gray-500 text-sm mb-6">Your payment could not be processed. Please try again or contact support.</p>
          <Link to="/" className="text-sm text-oxford hover:underline">← Return to Opedd</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-[520px] space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          {/* Status */}
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">License Issued</h1>
            {data?.buyer_email && (
              <p className="text-sm text-gray-500 mt-1">Sent to {data.buyer_email}</p>
            )}
          </div>

          {/* License Key */}
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">License Key</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-xl md:text-2xl font-mono font-bold text-oxford bg-oxford-light px-4 py-2 rounded-lg tracking-[0.15em] leading-none select-all">
                {data?.license_key}
              </code>
              <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 pt-2">
            {data?.article_title && (
              <DetailRow label="Content">
                <span className="font-medium">{data.article_title}</span>
              </DetailRow>
            )}
            <DetailRow label="License Type">{licenseTypeLabel}</DetailRow>
            {data?.amount != null && data.amount > 0 && (
              <DetailRow label="Amount Paid">${data.amount.toFixed(2)}</DetailRow>
            )}
          </div>

          {/* Action Buttons */}
          {data?.license_key && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <Link
                to={`/verify/${encodeURIComponent(data.license_key)}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-oxford hover:bg-oxford-dark text-white px-6 py-2.5 text-sm font-medium transition-colors w-full"
              >
                <Shield className="h-4 w-4" />
                Verify License
              </Link>
              <a
                href={`${EXT_SUPABASE_URL}/invoice?key=${encodeURIComponent(data.license_key)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-900 transition-colors w-full"
              >
                <Download className="h-4 w-4" />
                Download Invoice
              </a>
            </div>
          )}
        </div>

          {/* Buyer Portal CTA for AI/Archive licenses */}
          {(data?.license_type === "ai" || data?.license_type === "ai_inference" || data?.license_type === "archive") && (
            <div className="bg-oxford-light border border-oxford-pale rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Access Content Programmatically</h3>
              <p className="text-sm text-gray-500">
                To retrieve article content via API for AI pipelines or RAG, you need a <code className="font-mono text-xs bg-white/60 px-1 py-0.5 rounded">bk_live_</code> access token. Go to your license dashboard to generate one.
              </p>
              <Link
                to="/licenses"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-oxford hover:underline mt-1"
              >
                View My Licenses →
              </Link>
            </div>
          )}

          {/* Resend */}
        <div className="text-center">
          {data?.buyer_email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50"
            >
              {resent ? (
                <><Check className="h-3.5 w-3.5 text-emerald-500" /> Sent to your email</>
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