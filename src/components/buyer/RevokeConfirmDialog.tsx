import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { MaskedBuyerKey } from "@/lib/buyerApi";

// Phase 5.2.2 OQ-3 (24h grace vs immediate). Default: 24h grace
// (per Phase 5.2.1b backend default; soft-revoke flow). Opt-in
// "immediate" via checkbox for compromise scenarios.

interface Props {
  k: MaskedBuyerKey | null;
  onConfirm: (immediate: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function RevokeConfirmDialog({ k, onConfirm, onCancel, isLoading }: Props) {
  const [immediate, setImmediate] = useState(false);

  return (
    <AlertDialog open={!!k} onOpenChange={(o) => { if (!o) { setImmediate(false); onCancel(); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {k && (
                  <code className="text-xs font-mono">opedd_buyer_{k.environment}_{k.key_prefix}…</code>
                )} will be marked revoked. By default, the key continues to work for 24 hours
                — giving running integrations time to migrate to a new key.
              </p>
              <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer">
                <Checkbox
                  checked={immediate}
                  onCheckedChange={(v) => setImmediate(v === true)}
                  className="mt-0.5"
                  data-testid="immediate-checkbox"
                />
                <span className="text-sm text-gray-900">
                  <span className="font-medium">Revoke immediately</span> — invalidate at the next API call.
                  Use this if the key was compromised. Active integrations will start receiving 401 errors.
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={() => { onConfirm(immediate); setImmediate(false); }}
            className="bg-red-600 hover:bg-red-700"
            data-testid="revoke-confirm-btn"
          >
            {isLoading ? "Revoking…" : immediate ? "Revoke immediately" : "Revoke (24h grace)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
