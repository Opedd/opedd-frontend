import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/Spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Key, Plus, KeyRound } from "lucide-react";
import {
  getBuyerAccount,
  createBuyerKey,
  revokeBuyerKey,
  type BuyerProfileResponse,
  type MaskedBuyerKey,
} from "@/lib/buyerApi";
import { OneTimeKeyModal } from "@/components/buyer/OneTimeKeyModal";
import { BuyerKeyRow } from "@/components/buyer/BuyerKeyRow";
import { RevokeConfirmDialog } from "@/components/buyer/RevokeConfirmDialog";
import { QuickstartCard } from "@/components/buyer/QuickstartCard";

// Phase 5.2.2 OQ-1 hybrid routing: /buyer/keys is a separate top-level
// page (key management is the highest-frequency action; deserves its
// own URL). Combines key list + create dialog + revoke dialog +
// quickstart code samples for the empty-state per OQ-5.

export default function BuyerKeys() {
  useDocumentTitle("API Keys — Opedd Buyer");
  const navigate = useNavigate();
  const { getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<BuyerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Create-key dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"live" | "test">("live");
  const [creating, setCreating] = useState(false);

  // One-time-key display state
  const [issuedKey, setIssuedKey] = useState<{ key: string; environment: "live" | "test" } | null>(null);

  // Revoke state
  const [revokeTarget, setRevokeTarget] = useState<MaskedBuyerKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { navigate("/buyer/signup"); return; }
      const result = await getBuyerAccount(token);
      if (!result) { navigate("/buyer/signup", { replace: true }); return; }
      setProfile(result);
    } catch (err) {
      toast({
        title: "Couldn't load keys",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, navigate, toast]);

  useEffect(() => {
    if (authLoading) return;
    loadProfile();
  }, [authLoading, loadProfile]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired");
      const result = await createBuyerKey(token, {
        name: newKeyName.trim() || null,
        environment: newKeyEnv,
      });
      setIssuedKey({ key: result.key, environment: result.environment });
      setCreateOpen(false);
      setNewKeyName("");
      setNewKeyEnv("live");
      // Refresh masked list in the background
      loadProfile();
    } catch (err) {
      toast({
        title: "Couldn't create key",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (immediate: boolean) => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired");
      await revokeBuyerKey(token, { key_id: revokeTarget.id, immediate });
      toast({
        title: immediate ? "Key revoked immediately" : "Key revoked (24h grace period)",
      });
      setRevokeTarget(null);
      loadProfile();
    } catch (err) {
      toast({
        title: "Couldn't revoke key",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="API Keys" variant="buyer">
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-oxford" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  const activeKeys = profile.keys.filter(k => !k.revoked_at);
  const revokedKeys = profile.keys.filter(k => !!k.revoked_at);
  const hasOnlyInitialKey = profile.keys.length === 1 && !profile.keys[0].revoked_at;

  return (
    <DashboardLayout
      title="API Keys"
      subtitle={`${activeKeys.length} active`}
      variant="buyer"
      headerActions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={14} className="mr-1" /> New key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create a new API key</DialogTitle>
              <DialogDescription>
                The full key is shown ONCE at creation. Save it to your password manager or
                secrets vault before dismissing the dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="key_name">Name (optional)</Label>
                <Input
                  id="key_name"
                  placeholder="e.g. Production server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <Label className="block mb-2">Environment</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newKeyEnv === "live" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewKeyEnv("live")}
                  >
                    Live
                  </Button>
                  <Button
                    type="button"
                    variant={newKeyEnv === "test" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewKeyEnv("test")}
                  >
                    Test (sandbox)
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Test keys hit the sandbox surface (truncated content; no billing). Live keys
                  charge against your account.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={16} /> Active keys
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeKeys.length === 0 ? (
              <div className="text-center py-12">
                <KeyRound size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No active keys.</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-4">
                  <Plus size={14} className="mr-1" /> Create your first key
                </Button>
              </div>
            ) : (
              activeKeys.map((k) => (
                <BuyerKeyRow
                  key={k.id}
                  k={k}
                  onRevokeClick={setRevokeTarget}
                  isRevoking={revoking && revokeTarget?.id === k.id}
                />
              ))
            )}
          </CardContent>
        </Card>

        {revokedKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">Revoked keys</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {revokedKeys.map((k) => (
                <BuyerKeyRow
                  key={k.id}
                  k={k}
                  onRevokeClick={() => {/* noop on revoked */}}
                  isRevoking={false}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {hasOnlyInitialKey && <QuickstartCard />}
      </div>

      <OneTimeKeyModal
        fullKey={issuedKey?.key ?? null}
        environment={issuedKey?.environment ?? "live"}
        onClose={() => setIssuedKey(null)}
      />

      <RevokeConfirmDialog
        k={revokeTarget}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        isLoading={revoking}
      />
    </DashboardLayout>
  );
}
