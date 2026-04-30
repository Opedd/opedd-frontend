import { Link } from "react-router-dom";

/**
 * Phase 3 Session 3.1 — terminal-state display for SetupV2.
 *
 * Renders when a publisher visits /setup-v2 in setup_state ∈
 * { connected, suspended }. The verified state is handled by
 * SetupV2 itself via Navigate to /dashboard (no UI here).
 *
 * Copy is v1 minimum — Lovable design polish lands in Phase 10.
 */

interface TerminalStateProps {
  state: "connected" | "suspended";
}

export function TerminalState({ state }: TerminalStateProps) {
  if (state === "connected") {
    return (
      <div className="min-h-screen bg-alice-gray flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 text-center">
            <h1 className="text-2xl font-semibold text-navy-deep mb-6">
              Your setup is complete.
            </h1>
            <Link
              to="/dashboard"
              className="inline-block bg-navy-deep text-white font-medium px-6 py-3 rounded-lg hover:bg-oxford transition"
            >
              Go to dashboard
            </Link>
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
