import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, ChevronRight, ChevronDown } from "lucide-react";
import {
  getBuyerAudit,
  type AuditEvent,
} from "@/lib/buyerApi";

/**
 * Phase 10 M3 — buyer audit log viewer.
 *
 * Renders paginated content.accessed events from /buyer-audit (Phase 5.5
 * existing endpoint, JWT-authed via enterprise_buyers.user_id mapping).
 * Each row expandable to show full compliance envelope.
 *
 * M3: Merkle inclusion proof column shows "pending (M5)" for all rows.
 * M5: same UI but each row also shows {merkle_root, inclusion_proof,
 * blockchain_tx_hash} + "verify on chain" deep link.
 */

export default function BuyerAudit() {
  useDocumentTitle("Audit log — Opedd Buyer");
  const navigate = useNavigate();
  const { getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadEvents = useCallback(async (nextCursor?: string | null) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        navigate("/buyer/signup");
        return;
      }
      const page = await getBuyerAudit(token, { cursor: nextCursor ?? undefined, limit: 25 });
      setEvents((prev) => (nextCursor ? [...prev, ...page.events] : page.events));
      setCursor(page.pagination.next_cursor);
      setHasMore(page.pagination.next_cursor !== null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no buyer account|signup/i.test(msg)) {
        navigate("/buyer/signup", { replace: true });
        return;
      }
      toast({
        title: "Couldn't load audit log",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, navigate, toast]);

  useEffect(() => {
    if (authLoading) return;
    loadEvents(null);
  }, [authLoading, loadEvents]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if ((loading && events.length === 0) || authLoading) {
    return (
      <DashboardLayout title="Audit log" variant="buyer">
        <div className="flex justify-center py-12"><Spinner /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit log" variant="buyer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-gray-600 mt-1">
            Compliance audit trail of content accessed under your subscription. Each row is a license_events row written when your buyer key fetched content via /content-delivery. Merkle inclusion proofs ship in M5 (currently pending; on-chain attestation cron not yet wired).
          </p>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No audit events yet</CardTitle>
              <CardDescription>
                Once your subscription is active and you fetch content via /content-delivery, every access produces a row here. M4 Stripe Billing meter wiring activates the consumption path; M5 adds Merkle inclusion proofs to each row.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate("/buyer/subscription")}>
                Manage filter subscription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Content access events ({events.length} loaded)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-gray-200">
                {events.map((evt) => {
                  const isOpen = expanded.has(evt.event_id);
                  const hasProof = evt.attestation != null;
                  return (
                    <li key={evt.event_id} className="py-3 px-4">
                      <button
                        className="w-full flex items-start gap-3 text-left"
                        onClick={() => toggleExpanded(evt.event_id)}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4 mt-1 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-700">{new Date(evt.timestamp).toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">{evt.action_type}</Badge>
                            {hasProof ? (
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                                Merkle verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Pending Merkle batch (M5)
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-mono break-all">
                            article={evt.article_id} · publisher={evt.publisher_id}
                          </div>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="mt-3 ml-7 p-3 bg-gray-50 rounded text-xs space-y-2">
                          <div>
                            <span className="font-semibold">Event ID:</span> <code className="font-mono">{evt.event_id}</code>
                          </div>
                          <div>
                            <span className="font-semibold">License:</span> <code className="font-mono">{evt.license_id ?? "(none)"}</code>
                          </div>
                          <div>
                            <span className="font-semibold">Contract:</span> {evt.contract_version} <code className="font-mono text-gray-600">{evt.contract_hash}</code>
                          </div>
                          {hasProof && evt.attestation && (
                            <div className="space-y-1 pt-2 border-t border-gray-300">
                              <div>
                                <span className="font-semibold">Merkle root:</span> <code className="font-mono break-all">{evt.attestation.merkle_root}</code>
                              </div>
                              <div>
                                <span className="font-semibold">Tx hash:</span>{" "}
                                <code className="font-mono break-all">{evt.attestation.blockchain_tx_hash}</code>{" "}
                                <span className="text-gray-500">({evt.attestation.blockchain_chain})</span>
                              </div>
                              <div>
                                <span className="font-semibold">Inclusion proof ({evt.attestation.inclusion_proof.length} elements):</span>
                                <ul className="ml-3 mt-1 list-disc">
                                  {evt.attestation.inclusion_proof.map((h, i) => (
                                    <li key={i}><code className="font-mono break-all">{h}</code></li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                          {!hasProof && (
                            <div className="pt-2 border-t border-gray-300 text-gray-600 italic">
                              On-chain attestation lands when tempo-attestation-batch cron (M5) Merkleizes recent events + writes the root to Tempo. Verify the cron status via Opedd ops.
                            </div>
                          )}
                          <details className="pt-2 border-t border-gray-300">
                            <summary className="cursor-pointer font-semibold">Compliance snapshot (raw)</summary>
                            <pre className="mt-2 overflow-x-auto text-xs bg-white p-2 rounded border">
{JSON.stringify(evt.compliance_snapshot, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => loadEvents(cursor)} disabled={loading}>
              {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Load more
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
