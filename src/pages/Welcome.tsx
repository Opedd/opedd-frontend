import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { ReferralStep } from "@/components/dashboard/ReferralStep";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Post-verification welcome screen. Shown once immediately after a publisher
 * verifies their email, before they ever see the dashboard.
 *
 * Gates on `publishers.welcome_completed_at` (server-side). If already set,
 * redirects silently to /dashboard — welcome never re-appears.
 *
 * The ReferralStep modal handles the "how did you hear about us?" capture.
 * Referral is optional; hitting Continue without a selection still stamps
 * welcome_completed_at and proceeds to /dashboard.
 */
export default function Welcome() {
  useDocumentTitle("Welcome to Opedd");
  const { user, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) navigate("/login", { replace: true });
          return;
        }
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { apikey: EXT_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (json?.success && json.data?.welcome_completed_at) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getAccessToken, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center">
        <Spinner size="lg" className="text-oxford" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alice-gray">
      {/* Session 1.9 — celebratory headline above the ReferralStep modal.
          Shown to publishers landing here via Dashboard's auto-redirect on
          the first verified render. Plaid/Linear-toned: warm + concise +
          professional. ReferralStep modal renders on top with the actual
          referral capture; this header is the celebration surface. */}
      <div className="max-w-md mx-auto pt-20 px-6 text-center">
        <h1 className="text-2xl font-semibold text-navy-deep">
          Your publication is verified.
        </h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          You're live in the marketplace. One quick question before we hand
          you the keys.
        </p>
      </div>
      <ReferralStep onComplete={() => navigate("/dashboard", { replace: true })} />
    </div>
  );
}
