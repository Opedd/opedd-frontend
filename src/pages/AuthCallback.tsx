import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

// KI #80 fix (2026-05-01): the previous implementation called
// supabase.auth.exchangeCodeForSession(window.location.href) manually
// inside this useEffect. That collided with the SDK's automatic
// auto-detect (detectSessionInUrl=true default in client.ts), causing
// two concurrent token-exchange requests against the same single-use
// magic-link code. The SDK's internal request manager aborted one,
// surfacing as `AbortError: signal is aborted without reason`.
//
// Fix: let the SDK auto-detect handle the exchange (single source of
// truth). This component just waits for the SIGNED_IN event via the
// auth-state subscription, with a getSession() fast-path for the case
// where the SDK has already resolved by the time React mounts. No
// manual exchangeCodeForSession call.
//
// Affects: all flows hitting /auth/callback — publisher Google OAuth
// (Login.tsx + Signup.tsx), publisher email confirmation (Signup.tsx),
// buyer magic-link (BuyerSignup.tsx — Phase 5.2.2). The race was
// latent for publishers (signInWithPassword bypasses callback; OAuth
// wins the race more often; 3-sec error redirect is forgiving) but
// surfaced reliably for buyer magic-link in incognito (Sentry ID
// a796cb555e3f4e3c9e8aa93c8a11a522).

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null = null;

    // KI #80 Part 1 follow-up (2026-05-01): detect Supabase Auth
    // error redirects at top-of-effect and route directly to friendly
    // error UI. Expired/consumed magic links produce URLs like
    // /auth/callback?error=access_denied&error_code=otp_expired ;
    // without this short-circuit, the SDK auto-detect attempts to
    // process the error URL (raising an internal AbortError caught
    // by Sentry's browserTracingIntegration) AND the user waits the
    // 5-second timeout before seeing a generic "link may have
    // expired" message. Detecting the error params immediately
    // gives instant friendly feedback.
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error_code");
    const errorParam = params.get("error");
    if (errorCode || errorParam) {
      const friendly =
        errorCode === "otp_expired"
          ? "Your sign-in link has expired. Please request a new one."
          : "Sign-in could not be completed. Please try again.";
      setErrorMsg(friendly);
      setStatus("error");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
      return;
    }

    // Snapshot URL detection at mount-time. The SDK's auto-detect
    // clears the URL hash/query after exchange; capture before that.
    const isNewUser = window.location.href.includes("type=signup") || window.location.href.includes("confirmation_token");

    // Honor ?next= query param if present (Phase 5.2.2 BuyerSignup.tsx
    // passes ?next=/buyer/signup so the buyer lands on signup form
    // instead of /welcome publisher-onboarding). Hardened against
    // open-redirect bypasses:
    //   - startsWith("/")  rejects absolute URLs (https://evil.com/...)
    //   - !startsWith("//") rejects protocol-relative URLs (//evil.com/...
    //                       which the browser treats as evil.com)
    //   - !includes("\\")  rejects backslash-escape bypasses
    const urlNext = new URLSearchParams(window.location.search).get("next");
    const safeNext =
      urlNext &&
      urlNext.startsWith("/") &&
      !urlNext.startsWith("//") &&
      !urlNext.includes("\\")
        ? urlNext
        : null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };

    const finish = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      setStatus("success");
      const dest = safeNext ?? (isNewUser ? "/welcome" : "/dashboard");
      setTimeout(() => navigate(dest, { replace: true }), 1500);
    };

    const fail = (msg: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      console.error("[AuthCallback] Error:", msg);
      setErrorMsg(msg || "Verification failed");
      setStatus("error");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    };

    // 1. Fast path: the SDK may have already auto-exchanged the code
    //    by the time React mounts. If a session exists, finish.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resolved) return;
      if (session) {
        finish();
        return;
      }

      // 2. Wait for the SDK's auto-exchange to complete. Subscribe to
      //    the auth-state stream; SIGNED_IN fires once the token
      //    request resolves.
      const { data } = supabase.auth.onAuthStateChange((event, sess) => {
        if (event === "SIGNED_IN" && sess) finish();
      });
      subscription = data.subscription;

      // 3. Timeout fallback: if SIGNED_IN doesn't fire within 5s, the
      //    code is invalid/expired or the URL doesn't carry one.
      timeoutId = setTimeout(() => fail("The link may have expired or is invalid"), 5000);
    }).catch((err) => {
      fail(err instanceof Error ? err.message : "Verification failed");
    });

    return cleanup;
  }, [navigate]);

  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-blue-50 p-8 shadow-sm text-center max-w-sm w-full mx-4">
        {status === "loading" && (
          <>
            <Spinner size="lg" className="text-oxford mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-navy-deep mb-1">Verifying your email...</h2>
            <p className="text-sm text-navy-deep/60">Please wait a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-navy-deep mb-1">Email Verified!</h2>
            <p className="text-sm text-navy-deep/60">Redirecting to your dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={40} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-navy-deep mb-1">Verification Failed</h2>
            <p className="text-sm text-navy-deep/60 mb-2">{errorMsg || "The link may have expired"}</p>
            <p className="text-xs text-navy-deep/40">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
