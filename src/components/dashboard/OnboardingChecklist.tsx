import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingData {
  completed: boolean;
  progress: number;
  total: number;
  profile_complete: boolean;
  publication_verified: boolean;
  content_imported: boolean;
  pricing_set: boolean;
  stripe_connected: boolean;
}

interface OnboardingChecklistProps {
  onboarding: OnboardingData;
}

const STEPS = [
  { key: "profile_complete" as const, label: "Complete your profile", path: "/settings" },
  { key: "publication_verified" as const, label: "Verify your publication", path: "/settings?tab=sources" },
  { key: "content_imported" as const, label: "Import your content", path: "/content" },
  { key: "pricing_set" as const, label: "Set your pricing", path: "/settings?tab=pricing" },
  { key: "stripe_connected" as const, label: "Connect Stripe", path: "/settings?tab=payouts" },
];

export function OnboardingChecklist({ onboarding }: OnboardingChecklistProps) {
  const navigate = useNavigate();

  if (onboarding.completed) return null;

  const firstIncompleteIdx = STEPS.findIndex((s) => !onboarding[s.key]);
  const pct = onboarding.total > 0 ? (onboarding.progress / onboarding.total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111827]">Get started with Opedd</h3>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {onboarding.progress} of {onboarding.total} steps complete
          </p>
        </div>
      </div>

      <Progress value={pct} className="h-2 mb-5 bg-[#F3F4F6] [&>div]:bg-[#4A26ED]" />

      <ul className="space-y-1">
        {STEPS.map((step, idx) => {
          const done = onboarding[step.key];
          const isNext = idx === firstIncompleteIdx;

          return (
            <li key={step.key}>
              <button
                onClick={() => navigate(step.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isNext
                    ? "bg-[#4A26ED]/5 hover:bg-[#4A26ED]/10"
                    : "hover:bg-[#F9FAFB]"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle size={20} className={`flex-shrink-0 ${isNext ? "text-[#4A26ED]" : "text-[#D1D5DB]"}`} />
                )}
                <span
                  className={`text-sm flex-1 ${
                    done
                      ? "text-[#9CA3AF] line-through"
                      : isNext
                        ? "text-[#111827] font-semibold"
                        : "text-[#6B7280]"
                  }`}
                >
                  {step.label}
                </span>
                {isNext && <ArrowRight size={16} className="text-[#4A26ED] flex-shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
