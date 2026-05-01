import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Pencil, Save, X, Activity, AlertCircle } from "lucide-react";
import {
  getBuyerAccount,
  patchBuyer,
  type BuyerProfileResponse,
  type BuyerType,
  BUYER_TYPES,
  BUYER_TYPE_LABELS,
} from "@/lib/buyerApi";
import { COUNTRY_CODES, findCountryByCode, searchCountries } from "@/lib/countryCodes";
import { PublisherCohabitationBanner } from "@/components/buyer/PublisherCohabitationBanner";

// Phase 5.2.2 OQ-1 hybrid routing: /buyer/account hosts Profile + Usage tabs.
// Keys are at /buyer/keys (separate top-level page).
// OQ-2: Usage tab is a "coming soon — Phase 5.4" placeholder for v1
// because usage_records.buyer_id is NULL for all current rows
// (legacy token paths predate enterprise_buyers — KI #71 / Path α).
//
// Phase 5.2.3: Profile tab now displays + edits the 6 new identity fields
// (first/last name, company_name, company_website, buyer_type, country).
// Legacy rows (any new field NULL) surface a "Complete profile" banner
// that scrolls to + opens the edit form.

export default function BuyerAccount() {
  useDocumentTitle("Account — Opedd Buyer");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<BuyerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state — covers legacy fields + Phase 5.2.3 new fields.
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyWebsite, setEditCompanyWebsite] = useState("");
  const [editBuyerType, setEditBuyerType] = useState<BuyerType>("ai_retrieval");
  const [editCountryCode, setEditCountryCode] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const activeTab = searchParams.get("tab") === "usage" ? "usage" : "profile";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) { navigate("/buyer/signup"); return; }
      const result = await getBuyerAccount(token);
      if (!result) {
        navigate("/buyer/signup", { replace: true });
        return;
      }
      setProfile(result);
      // Pre-fill edit state from current values (or "" for legacy NULLs).
      setEditFirstName(result.buyer.first_name ?? "");
      setEditLastName(result.buyer.last_name ?? "");
      setEditCompanyName(result.buyer.company_name ?? result.buyer.organization ?? "");
      setEditCompanyWebsite(result.buyer.company_website ?? "");
      setEditBuyerType(result.buyer.buyer_type ?? "ai_retrieval");
      setEditCountryCode(result.buyer.country_of_incorporation ?? "");
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

  // Legacy detection: any Phase 5.2.3 required field NULL means the row
  // pre-dates migration 081 (or signup somehow skipped a field). Surface
  // a "Complete profile" prompt; the action enters edit mode on click.
  const isLegacyProfile = useMemo(() => {
    if (!profile) return false;
    const b = profile.buyer;
    return (
      !b.first_name ||
      !b.last_name ||
      !b.company_name ||
      !b.company_website ||
      !b.buyer_type ||
      !b.country_of_incorporation
    );
  }, [profile]);

  const filteredCountries = useMemo(
    () => searchCountries(countryQuery).slice(0, 50),
    [countryQuery],
  );

  const selectedCountryName = useMemo(
    () => findCountryByCode(editCountryCode)?.name ?? "",
    [editCountryCode],
  );

  const handleSave = async () => {
    if (!profile) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editCompanyName.trim()) {
      toast({ title: "First name, last name, and company name are required", variant: "destructive" });
      return;
    }
    if (!/^https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(editCompanyWebsite.trim())) {
      toast({ title: "Company website must start with https:// or http://", variant: "destructive" });
      return;
    }
    if (!/^[A-Z]{2}$/.test(editCountryCode)) {
      toast({ title: "Pick a country", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired");
      const { buyer } = await patchBuyer(token, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        company_name: editCompanyName.trim(),
        company_website: editCompanyWebsite.trim(),
        buyer_type: editBuyerType,
        country_of_incorporation: editCountryCode,
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

  const b = profile.buyer;
  const displayName =
    b.first_name && b.last_name ? `${b.first_name} ${b.last_name}` : b.name ?? "";
  const displayCompany = b.company_name ?? b.organization ?? "";

  return (
    <DashboardLayout
      title="Account"
      subtitle={displayCompany || displayName}
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

          <TabsContent value="profile" className="mt-6 space-y-4">
            {isLegacyProfile && !editing && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Complete your profile</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Required for billing and licensing.
                  </p>
                </div>
                <Button size="sm" onClick={() => setEditing(true)}>Complete now</Button>
              </div>
            )}

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
                      setEditFirstName(b.first_name ?? "");
                      setEditLastName(b.last_name ?? "");
                      setEditCompanyName(b.company_name ?? b.organization ?? "");
                      setEditCompanyWebsite(b.company_website ?? "");
                      setEditBuyerType(b.buyer_type ?? "ai_retrieval");
                      setEditCountryCode(b.country_of_incorporation ?? "");
                    }} disabled={saving}>
                      <X size={14} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save size={14} className="mr-1" /> {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Identity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">First name</Label>
                    {editing ? (
                      <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {b.first_name || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Last name</Label>
                    {editing ? (
                      <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {b.last_name || <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div>
                  <Label className="text-xs text-gray-500">Company name</Label>
                  {editing ? (
                    <Input value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} placeholder="Acme AI Lab" />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {displayCompany || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Company website</Label>
                  {editing ? (
                    <Input type="url" value={editCompanyWebsite} onChange={(e) => setEditCompanyWebsite(e.target.value)} placeholder="https://acme.ai" />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {b.company_website ? (
                        <a href={b.company_website} target="_blank" rel="noopener noreferrer" className="text-oxford hover:underline">
                          {b.company_website}
                        </a>
                      ) : <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Use case</Label>
                  {editing ? (
                    <select
                      value={editBuyerType}
                      onChange={(e) => setEditBuyerType(e.target.value as BuyerType)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-oxford"
                    >
                      {BUYER_TYPES.map((t) => (
                        <option key={t} value={t}>{BUYER_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {b.buyer_type ? BUYER_TYPE_LABELS[b.buyer_type] : <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Legal */}
                <div>
                  <Label className="text-xs text-gray-500">Country of incorporation</Label>
                  {editing ? (
                    <div className="relative">
                      <Input
                        value={countryDropdownOpen ? countryQuery : selectedCountryName}
                        onChange={(e) => { setCountryQuery(e.target.value); setCountryDropdownOpen(true); }}
                        onFocus={() => { setCountryQuery(""); setCountryDropdownOpen(true); }}
                        onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
                        placeholder="Type to search…"
                        autoComplete="off"
                      />
                      {countryDropdownOpen && filteredCountries.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEditCountryCode(c.code);
                                setCountryQuery("");
                                setCountryDropdownOpen(false);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                            >
                              <span className="font-mono text-gray-400 mr-2">{c.code}</span>{c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {b.country_of_incorporation
                        ? `${findCountryByCode(b.country_of_incorporation)?.name ?? b.country_of_incorporation} (${b.country_of_incorporation})`
                        : <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Static fields */}
                <div>
                  <Label className="text-xs text-gray-500">Contact email</Label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{b.contact_email}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Account created</Label>
                  <p className="text-sm text-gray-900 mt-1">{new Date(b.created_at).toLocaleDateString()}</p>
                </div>

                {/* Phase 5.3-attribution: privacy-by-default toggle. */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={b.public_attribution_consent}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        try {
                          const token = await getAccessToken();
                          if (!token) throw new Error("Session expired");
                          const { buyer } = await patchBuyer(token, { public_attribution_consent: next });
                          setProfile({ ...profile, buyer });
                          toast({ title: next ? "Public attribution on" : "Public attribution off" });
                        } catch (err) {
                          toast({
                            title: "Couldn't save",
                            description: err instanceof Error ? err.message : "Try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-oxford focus:ring-oxford"
                      data-testid="public-attribution-toggle"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Public attribution</p>
                      <p className="text-xs text-gray-500 mt-0.5">Allow publishers to see your company name on their analytics.</p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
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
