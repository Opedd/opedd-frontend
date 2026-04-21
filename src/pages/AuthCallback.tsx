import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the code/token from the URL for a session
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          // If code exchange fails, the URL might use hash-based tokens
          // which are handled automatically by the Supabase client
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus("success");
            const isNewUser = !!(window.location.href.includes("type=signup") || window.location.href.includes("confirmation_token"));
            setTimeout(() => navigate(isNewUser ? "/onboarding" : "/dashboard", { replace: true }), 1500);
            return;
          }
          throw error;
        }

        setStatus("success");
        // Redirect new users (no prior session) to onboarding; returning users to dashboard
        const isNewUser = !!(window.location.href.includes("type=signup") || window.location.href.includes("confirmation_token"));
        setTimeout(() => navigate(isNewUser ? "/onboarding" : "/dashboard", { replace: true }), 1500);
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Verification failed");
        setStatus("error");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-blue-50 p-8 shadow-sm text-center max-w-sm w-full mx-4">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="text-oxford animate-spin mx-auto mb-4" />
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
