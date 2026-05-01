import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Save, X, Activity } from "lucide-react";
import { getBuyerAccount, patchBuyer, type BuyerProfileResponse } from "@/lib/buyerApi";
import { PublisherCohabitationBanner } from "@/components/buyer/PublisherCohabitationBanner";

// Phase 5.2.2 OQ-1 hybrid routing: /buyer/account hosts Profile + Usage tabs.
// Keys are at /buyer/keys (separate top-level page).
// OQ-2: Usage tab is a "coming soon — Phase 5.4" placeholder for v1
// because usage_records.buyer_id is NULL for all current rows
// (legacy token paths predate enterprise_buyers — KI #71 / Path α).

export default function BuyerAccount() {
  useDocumentTitle("Account — Opedd Buyer");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<BuyerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTab = searchParams.get("tab") === "usage" ? "usage" : "profile";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { navigate("/buyer/signup"); return; }
      const result = await getBuyerAccount(token);
      if (!result) {
        // JWT valid but no buyer row — redirect to signup
        navigate("/buyer/signup", { replace: true });
        return;
      }
      setProfile(result);
      setEditName(result.buyer.name);
      setEditOrg(result.buyer.organization ?? "");
    } catch (err) {
      toast({
        title: "Couldn't load account",
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

  const handleSave = async () => {
    if (!profile) return;
    if (!editName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired");
      const { buyer } = await patchBuyer(token, {
        name: editName.trim(),
        organization: editOrg.trim() || null,
      });
      setProfile({ ...profile, buyer });
      setEditing(false);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Account" variant="buyer">
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" className="text-oxford" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return null;

  return (
    <DashboardLayout
      title="Account"
      subtitle={profile.buyer.organization ?? profile.buyer.name}
      variant="buyer"
    >
      <div className="px-6 py-6 max-w-3xl mx-auto">
        <PublisherCohabitationBanner />

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            if (v === "usage") setSearchParams({ tab: "usage" });
            else setSearchParams({});
          }}
        >
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-base">Buyer profile</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil size={14} className="mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(false);
                      setEditName(profile.buyer.name);
                      setEditOrg(profile.buyer.organization ?? "");
                    }} disabled={saving}>
                      <X size={14} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !editName.trim()}>
                      <Save size={14} className="mr-1" /> {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  {editing ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{profile.buyer.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Organization</Label>
                  {editing ? (
                    <Input value={editOrg} onChange={(e) => setEditOrg(e.target.value)} placeholder="Acme AI Lab" />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{profile.buyer.organization || <span className="text-gray-400 italic">Not set</span>}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Contact email</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{profile.buyer.contact_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Account created</Label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(profile.buyer.created_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">API keys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  You have <strong>{profile.keys.filter(k => !k.revoked_at).length}</strong> active key{profile.keys.filter(k => !k.revoked_at).length !== 1 ? "s" : ""}.
                </p>
                <Link to="/buyer/keys">
                  <Button variant="outline" size="sm">Manage keys</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity size={16} />
                  Usage analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-3xl font-bold text-gray-900 font-mono">0</p>
                  <p className="text-sm text-gray-500 mt-1">records this billing period</p>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Usage attribution arrives with metered billing. Your keys still serve content normally.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
