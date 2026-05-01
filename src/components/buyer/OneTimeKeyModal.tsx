import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Phase 5.2.2 OQ-7 + INVARIANT: one-time-display contract.
// Full opedd_buyer_<env>_<32-hex> token is shown ONCE at issuance and
// never again. The modal forces the user to (1) copy the token and
// (2) confirm via checkbox before dismissal — preventing accidental
// page-refresh-loses-key disasters per failure mode #1 in the
// pre-impl plan.

interface Props {
  fullKey: string | null;
  environment: "live" | "test";
  onClose: () => void;
}

export function OneTimeKeyModal({ fullKey, environment, onClose }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const open = !!fullKey;

  const handleCopy = async () => {
    if (!fullKey) return;
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      toast({ title: "Key copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select the key text and copy manually.", variant: "destructive" });
    }
  };

  const handleClose = () => {
    if (!confirmed) return; // Hard gate — checkbox required
    setConfirmed(false);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && confirmed) handleClose(); }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => { if (!confirmed) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!confirmed) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Save this key now — it won't be shown again
          </DialogTitle>
          <DialogDescription>
            This is the only time the full key is displayed. Copy it to your password manager or
            secrets vault before dismissing this dialog. Lost keys can't be recovered — only
            revoked + reissued.
          </DialogDescription>
        </DialogHeader>

        {fullKey && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                {environment === "live" ? "Live key" : "Test key"} ({fullKey.length} chars)
              </p>
              <code className="block text-xs font-mono text-gray-900 break-all select-all" data-testid="full-key">
                {fullKey}
              </code>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopy}
              data-testid="copy-key-btn"
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>

            <label className={cn(
              "flex items-start gap-2 rounded-lg p-3 cursor-pointer transition-colors",
              confirmed ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200",
            )}>
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
                data-testid="confirm-checkbox"
              />
              <span className="text-sm text-gray-900">
                I have saved this key. I understand it cannot be retrieved later.
              </span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={!confirmed}
            onClick={handleClose}
            data-testid="dismiss-btn"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
