import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * Phase 3 Session 3.1 — terminal-state display for SetupV2.
 *
 * Renders when a publisher visits /setup-v2 in setup_state ∈
 * { connected, suspended }. The verified state is handled by
 * SetupV2 itself via Navigate to /dashboard (no UI here).
 *
 * Phase 11 close-validation pass UX-2 (2026-05-15) — auto-redirect with
 * success toast for the `connected` branch. Pre-fix, post-wizard land
 * users hit a "Your setup is complete → Go to dashboard" page requiring
 * a manual click. Dead-click weight. Now: setTimeout 2.5s + navigate +
 * toast. Founder ratification: "auto-redirect to Dashboard with success
 * toast, remove the manual click step." The `suspended` branch retains
 * the manual click (it routes to support email, not Dashboard).
 */

interface TerminalStateProps {
  state: "connected" | "suspended";
}

export function TerminalState({ state }: TerminalStateProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Phase 11 UX-2: auto-redirect 2.5s after the celebration page mounts.
  // Toast notifies the publisher while the redirect is pending so the page
  // doesn't feel like a flash. `replace: true` so back-button doesn't loop
  // them back to the wizard.
  useEffect(() => {
    if (state !== "connected") return;
    toast({
      title: "Setup complete",
      description: "Redirecting to your Dashboard…",
    });
    const t = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  }, [state, navigate, toast]);

  if (state === "connected") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 text-center">
            <h1 className="text-2xl font-semibold text-navy-deep mb-3">
              Your setup is complete.
            </h1>
            <p className="text-gray-600 text-sm">
              Taking you to your dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 text-center">
          <h1 className="text-2xl font-semibold text-navy-deep mb-3">
            Account suspended
          </h1>
          <p className="text-gray-600 leading-relaxed mb-6">
            Your verification has been temporarily suspended. Contact support
            for details.
          </p>
          <a
            href="mailto:support@opedd.com?subject=Verification%20suspended"
            className="inline-block bg-navy-deep text-white font-medium px-6 py-3 rounded-lg hover:bg-oxford transition"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
