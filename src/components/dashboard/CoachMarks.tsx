import { useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

type Step = {
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const STEPS: Step[] = [
  {
    target: "register-content",
    title: "Start your setup",
    body: "Register your publication to begin. We'll pull your archive, set licensing rules, and connect payouts.",
    placement: "bottom",
  },
  {
    target: "sidebar-settings",
    title: "Profile & billing",
    body: "Your profile, payouts, team, and API keys live here. Come back when you're ready.",
    placement: "right",
  },
  {
    target: "onboarding-checklist",
    title: "Track your progress",
    body: "This checklist shows every step left. You can always pause and come back.",
    placement: "top",
  },
];

interface CoachMarksProps {
  /** Fired once the tour is dismissed or completed — parent should PATCH tour_completed_at. */
  onComplete: () => void;
}

export function CoachMarks({ onComplete }: CoachMarksProps) {
  const { getAccessToken } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(true);

  const step = STEPS[stepIdx];

  // Re-measure the target on every step change AND on resize, so the popover
  // tracks the target even if layout shifts during the tour.
  useLayoutEffect(() => {
    if (!active || !step) return;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour-target="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [stepIdx, active, step]);

  const finish = async () => {
    setActive(false);
    // Fire-and-forget — UI already advanced; failure is not user-blocking.
    try {
      const token = await getAccessToken();
      if (token) {
        await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          method: "PATCH",
          headers: {
            apikey: EXT_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tour_completed_at: true }),
        });
      }
    } catch (err) {
      console.warn("[CoachMarks] failed to persist tour_completed_at:", err);
    }
    onComplete();
  };

  const advance = () => {
    if (stepIdx + 1 >= STEPS.length) {
      finish();
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  if (!active) return null;

  // No target element rendered on this page — skip this step silently rather
  // than trapping the user behind an invisible popover.
  if (!rect) {
    return (
      <AnimatePresence onExitComplete={advance}>
        <motion.div
          key={`skip-${stepIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
        />
      </AnimatePresence>
    );
  }

  // Popover position — default below target, with small offset.
  const PAD = 12;
  const POPOVER_W = 320;
  const placement = step.placement ?? "bottom";
  const top =
    placement === "top"
      ? rect.top - PAD
      : placement === "bottom"
        ? rect.bottom + PAD
        : rect.top + rect.height / 2;
  const left =
    placement === "left"
      ? rect.left - POPOVER_W - PAD
      : placement === "right"
        ? rect.right + PAD
        : Math.min(
            Math.max(rect.left + rect.width / 2 - POPOVER_W / 2, PAD),
            window.innerWidth - POPOVER_W - PAD
          );
  const translateY = placement === "top" ? "-100%" : placement === "bottom" ? "0" : "-50%";

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Click-anywhere catcher — dismisses the current step (advancing the tour) */}
      <button
        type="button"
        aria-label="Continue tour"
        onClick={advance}
        className="absolute inset-0 bg-black/35 cursor-pointer pointer-events-auto"
      />

      {/* Spotlight ring around the target */}
      <div
        className="absolute rounded-xl ring-4 ring-oxford ring-offset-2 ring-offset-white pointer-events-none"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="absolute pointer-events-auto"
          style={{ top, left, width: POPOVER_W, transform: `translateY(${translateY})` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-popover p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-oxford">
                  {stepIdx + 1} of {STEPS.length}
                </p>
                <h3 className="text-sm font-semibold text-[#040042] mt-0.5">{step.title}</h3>
              </div>
              <button
                type="button"
                aria-label="Skip tour"
                onClick={finish}
                className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">{step.body}</p>
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={finish}
                className="text-xs font-medium text-gray-500 hover:text-[#040042] transition-colors"
              >
                Skip tour
              </button>
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-1.5 bg-oxford hover:bg-oxford/90 text-white text-xs font-semibold h-8 px-3 rounded-lg transition-colors"
              >
                {stepIdx + 1 === STEPS.length ? "Done" : "Next"}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
