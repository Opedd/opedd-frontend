import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Phase 5.2.2 OQ-5: quickstart for the AI-lab buyer audience.
// Empty-state for new buyers (1 key, 0 usage records). Shows
// curl / Python / Node code samples calling /content-delivery
// with the buyer's freshly-issued key. Aesthetic per OQ-6:
// monospace + terminal feel, less marketing polish than the
// publisher dashboard.
//
// The keyHint is intentionally a generic placeholder, not the
// actual key — the actual key was shown ONCE in OneTimeKeyModal
// and is no longer in scope. Buyers paste their saved key into
// these snippets themselves.

const KEY_PLACEHOLDER = "opedd_buyer_live_<paste_your_key>";
const ARTICLE_PLACEHOLDER = "<article_uuid>";

const SAMPLES: Array<{ id: string; label: string; code: string }> = [
  {
    id: "curl",
    label: "curl",
    code: `curl 'https://api.opedd.com/content-delivery?article_id=${ARTICLE_PLACEHOLDER}' \\
  -H 'Authorization: Bearer ${KEY_PLACEHOLDER}'`,
  },
  {
    id: "python",
    label: "Python",
    code: `import requests

BASE = "https://api.opedd.com"
KEY = "${KEY_PLACEHOLDER}"

resp = requests.get(
    f"{BASE}/content-delivery",
    params={"article_id": "${ARTICLE_PLACEHOLDER}"},
    headers={"Authorization": f"Bearer {KEY}"},
)
data = resp.json()
print(data["data"]["title"])
print(data["data"]["content"][:200])`,
  },
  {
    id: "node",
    label: "Node.js",
    code: `const BASE = "https://api.opedd.com";
const KEY = "${KEY_PLACEHOLDER}";

const res = await fetch(
  \`\${BASE}/content-delivery?article_id=${ARTICLE_PLACEHOLDER}\`,
  { headers: { Authorization: \`Bearer \${KEY}\` } },
);
const data = await res.json();
console.log(data.data.title);`,
  },
];

export function QuickstartCard() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast({ title: `${id} sample copied` });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Make your first request</h3>
      </div>

      <Tabs defaultValue="curl" className="w-full">
        <TabsList className="bg-gray-50">
          {SAMPLES.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>
          ))}
        </TabsList>
        {SAMPLES.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-3">
            <div className="relative rounded-lg bg-gray-900 p-4 group">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(s.id, s.code)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`quickstart-copy-${s.id}`}
              >
                {copiedId === s.id ? <Check size={14} /> : <Copy size={14} />}
              </Button>
              <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-all overflow-x-auto">
                {s.code}
              </pre>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <a
        href="https://docs.opedd.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-gray-400 hover:text-oxford mt-3 inline-block"
      >
        Full API reference →
      </a>
    </div>
  );
}
