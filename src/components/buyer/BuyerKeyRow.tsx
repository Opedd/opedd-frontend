import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Clock } from "lucide-react";
import type { MaskedBuyerKey } from "@/lib/buyerApi";

// Phase 5.2.2: row component for the masked-key list at /buyer/keys.
// Never displays the full token — only key_prefix + metadata, per the
// one-time-display invariant (full token is only shown in OneTimeKeyModal
// at issuance time).

interface Props {
  k: MaskedBuyerKey;
  onRevokeClick: (k: MaskedBuyerKey) => void;
  isRevoking: boolean;
}

export function BuyerKeyRow({ k, onRevokeClick, isRevoking }: Props) {
  const isRevoked = !!k.revoked_at;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 last:border-0"
      data-testid="buyer-key-row"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="font-mono text-sm text-gray-900" data-testid="key-prefix">
            opedd_buyer_{k.environment}_{k.key_prefix}…
          </code>
          {k.environment === "test" ? (
            <Badge variant="secondary" className="text-[10px] uppercase">test</Badge>
          ) : (
            <Badge className="text-[10px] uppercase bg-oxford text-white">live</Badge>
          )}
          {isRevoked && (
            <Badge variant="outline" className="text-[10px] uppercase text-red-600 border-red-200">
              revoked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {k.name && <span>{k.name}</span>}
          {k.name && <span>·</span>}
          <span>created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}</span>
          {k.last_used_at && (
            <>
              <span>·</span>
              <span>last used {formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}</span>
            </>
          )}
          {isRevoked && k.revoked_at && (
            <>
              <span>·</span>
              <span className="text-red-600 flex items-center gap-1">
                <Clock size={11} /> revoked {formatDistanceToNow(new Date(k.revoked_at), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>

      {!isRevoked && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRevokeClick(k)}
          disabled={isRevoking}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          data-testid="revoke-btn"
        >
          <Trash2 size={14} className="mr-1" />
          Revoke
        </Button>
      )}
    </div>
  );
}
