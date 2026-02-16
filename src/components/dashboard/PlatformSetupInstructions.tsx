import React, { useState } from "react";
import { Shield, Check, Copy, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PlatformSetupInstructionsProps {
  platform: "ghost" | "wordpress" | "beehiiv" | "other";
  publisherId: string;
  onDone: () => void;
  onUseRss: () => void;
}

const WIDGET_BASE_URL = "https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget";

const PLATFORM_STEPS: Record<string, { title: string; steps: string[]; note?: string }> = {
  ghost: {
    title: "Ghost",
    steps: [
      "Open your Ghost Admin panel",
      "Go to Settings \u2192 Code injection",
      "Paste the code below into the Site Header field",
      "Click Save",
    ],
  },
  wordpress: {
    title: "WordPress",
    steps: [
      "Go to Appearance \u2192 Theme Editor \u2192 header.php",
      "Paste the code below before the closing </head> tag",
      "Click Update File",
    ],
    note: "Alternatively, install the Opedd WordPress plugin for a no-code setup.",
  },
  beehiiv: {
    title: "Beehiiv",
    steps: [
      "Go to Settings \u2192 Custom Code",
      "Open the Header Scripts section",
      "Paste the code below",
      "Click Save",
    ],
  },
  other: {
    title: "Custom CMS",
    steps: [
      "Open your site\u2019s HTML template or theme editor",
      "Locate the <head> section",
      "Paste the code below before the closing </head> tag",
      "Save and publish",
    ],
  },
};

export function PlatformSetupInstructions({
  platform,
  publisherId,
  onDone,
  onUseRss,
}: PlatformSetupInstructionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const config = PLATFORM_STEPS[platform];

  const widgetCode = `<script src="${WIDGET_BASE_URL}"
  data-publisher-id="${publisherId}">
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Widget code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Step-by-step instructions */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#040042] flex items-center gap-2">
          <Shield size={16} className="text-[#4A26ED]" />
          Install on {config.title}
        </h3>
        <ol className="space-y-2">
          {config.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#4A26ED]/10 text-[#4A26ED] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-[#040042]/80">{step}</span>
            </li>
          ))}
        </ol>
        {config.note && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
            {config.note}
          </p>
        )}
      </div>

      {/* Widget code block */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-[#040042]">Widget Code</label>
        <div className="relative">
          <pre className="bg-[#040042] text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
            <code>{widgetCode}</code>
          </pre>
          <Button
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white border-0 h-8"
          >
            {copied ? (
              <>
                <Check size={14} className="mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Auto-registration note */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
        <Shield size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          Every article auto-registers when a visitor loads the page. No manual registration needed.
        </p>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onUseRss}
          className="text-sm text-[#4A26ED] hover:text-[#3B1ED1] font-medium flex items-center gap-1.5 transition-colors"
        >
          <Rss size={14} />
          Use RSS Sync Instead
        </button>
        <Button
          onClick={onDone}
          className="h-10 px-6 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
