import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MODES = ["card", "compact", "badge"] as const;
type WidgetMode = (typeof MODES)[number];

const LABELS: Record<WidgetMode, string> = { card: "Card", compact: "Compact", badge: "Badge" };

export function WidgetEmbedCard({ publisherId }: { publisherId: string }) {
  const [mode, setMode] = useState<WidgetMode>("card");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const snippet = `<script
  src="https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget"
  data-publisher-id="${publisherId}"
  data-mode="${mode}">
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Embed snippet copied to clipboard" });
    } catch {
      toast({ title: "Copy Failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8F2FB] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 flex items-center justify-center">
          <Code2 size={16} className="text-[#4A26ED]" />
        </div>
        <div>
          <h2 className="font-bold text-[#040042]">Widget Embed Code</h2>
          <p className="text-slate-500 text-xs">Add this script once to your article template. It automatically detects and registers each article — no per-page configuration needed.</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-4">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              mode === m
                ? "bg-white text-[#040042] shadow-sm"
                : "text-slate-500 hover:text-[#040042]"
            }`}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="bg-[#0F172A] rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-slate-300 whitespace-pre">{snippet}</pre>
      </div>

      {/* Copy button */}
      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" onClick={handleCopy} className="h-9 px-4 bg-[#3182CE] hover:bg-[#2B6CB0] text-white rounded-lg font-medium transition-all">
          {copied ? <><Check size={14} className="mr-2" />Copied</> : <><Copy size={14} className="mr-2" />Copy snippet</>}
        </Button>
        <p className="text-xs text-slate-400 max-w-xs text-right">
          Place this tag at the bottom of your article body in your CMS theme. Requires your Website URL to be set above.
        </p>
      </div>
    </div>
  );
}
