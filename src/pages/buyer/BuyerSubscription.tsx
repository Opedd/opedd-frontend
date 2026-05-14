import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Save, Plus, ExternalLink } from "lucide-react";
import {
  getBuyerAccount,
  createFilteredSubscription,
  updateFilterRules,
  FILTER_CATEGORIES,
  FILTER_LICENSE_TYPES,
  FILTER_LICENSE_TYPE_LABELS,
  type FilterRules,
  type FilterLicenseType,
  type FilteredSubscription,
  type Buyer,
} from "@/lib/buyerApi";

/**
 * Phase 10 M3 — buyer filter subscription editor.
 *
 * Two modes:
 *   1. No active filtered subscription → render "Create" CTA + form;
 *      POST /enterprise-license { scope: 'filtered', filter_rules }.
 *   2. Active subscription → render current filter_rules + edit form;
 *      PATCH /buyer-account { filter_rules } on save.
 *
 * The subscription state ('pending') is the M3 expected baseline.
 * M4 Stripe Billing meter wiring flips status to 'active' once first
 * meter event is acknowledged. M3 ships the management surface; M5
 * adds inclusion-proof Merkle column to /buyer/audit.
 */

interface FilterFormState {
  categories: string[]; // selected category strings
  license_types: FilterLicenseType[];
  max_price_per_event: string; // string for input control; parsed to number on save
  excluded_publisher_ids: string; // newline-separated textarea
  per_publisher_monthly_cap: string;
  global_monthly_cap: string;
}

const EMPTY_FORM: FilterFormState = {
  categories: [],
  license_types: ["ai_retrieval"],
  max_price_per_event: "",
  excluded_publisher_ids: "",
  per_publisher_monthly_cap: "",
  global_monthly_cap: "",
};

function rulesToForm(rules: FilterRules): FilterFormState {
  return {
    categories: rules.categories ?? [],
    license_types: rules.license_types ?? ["ai_retrieval"],
    max_price_per_event: rules.max_price_per_event != null ? String(rules.max_price_per_event) : "",
    excluded_publisher_ids: (rules.excluded_publisher_ids ?? []).join("\n"),
    per_publisher_monthly_cap: rules.per_publisher_monthly_cap != null ? String(rules.per_publisher_monthly_cap) : "",
    global_monthly_cap: rules.global_monthly_cap != null ? String(rules.global_monthly_cap) : "",
  };
}

function formToRules(form: FilterFormState): { ok: true; rules: FilterRules } | { ok: false; error: string } {
  const rules: FilterRules = {};

  if (form.categories.length > 0) rules.categories = form.categories;
  if (form.license_types.length > 0) rules.license_types = form.license_types;

  if (form.max_price_per_event.trim()) {
    const n = Number(form.max_price_per_event);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Max price per event must be a non-negative number" };
    rules.max_price_per_event = n;
  }

  if (form.excluded_publisher_ids.trim()) {
    const lines = form.excluded_publisher_ids.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of lines) {
      if (!uuidRe.test(id)) return { ok: false, error: `"${id}" is not a valid publisher UUID` };
    }
    rules.excluded_publisher_ids = lines;
  }

  if (form.per_publisher_monthly_cap.trim()) {
    const n = Number(form.per_publisher_monthly_cap);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Per-publisher monthly cap must be a non-negative number" };
    rules.per_publisher_monthly_cap = n;
  }

  if (form.global_monthly_cap.trim()) {
    const n = Number(form.global_monthly_cap);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Global monthly cap must be a non-negative number" };
    rules.global_monthly_cap = n;
  }

  if (Object.keys(rules).length === 0) {
    return { ok: false, error: "Set at least one filter dimension (categories, license types, max price, exclusion list, or caps)." };
  }

  return { ok: true, rules };
}

export default function BuyerSubscription() {
  useDocumentTitle("Subscription — Opedd Buyer");
  const navigate = useNavigate();
  const { getAccessToken, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [subscription, setSubscription] = useState<FilteredSubscription | null>(null);
  const [form, setForm] = useState<FilterFormState>(EMPTY_FORM);
  const [issuedAccessKey, setIssuedAccessKey] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        navigate("/buyer/signup");
        return;
      }
      const result = await getBuyerAccount(token);
      if (!result) {
        navigate("/buyer/signup", { replace: true });
        return;
      }
      setBuyer(result.buyer);

      // Probe for active filtered subscription via PATCH dry-call.
      // Cleaner: GET /buyer-account currently doesn't include
      // filtered_subscription. We surface state by attempting a no-op
      // filter check at PATCH time. For M3 simplicity, treat "404 on
      // PATCH with rules" as "no subscription yet". Caller path:
      // form stays at EMPTY_FORM until user creates or edits.
    } catch (err) {
      toast({
        title: "Couldn't load account",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, navigate, toast]);

  useEffect(() => {
    if (authLoading) return;
    loadState();
  }, [authLoading, loadState]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const toggleLicenseType = (lt: FilterLicenseType) => {
    setForm((f) => ({
      ...f,
      license_types: f.license_types.includes(lt)
        ? f.license_types.filter((t) => t !== lt)
        : [...f.license_types, lt],
    }));
  };

  const handleCreate = async () => {
    if (!buyer) return;
    const validation = formToRules(form);
    if (!validation.ok) {
      toast({ title: "Invalid filter rules", description: validation.error, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await createFilteredSubscription({
        buyer_email: buyer.contact_email,
        buyer_name: buyer.first_name && buyer.last_name ? `${buyer.first_name} ${buyer.last_name}` : (buyer.name ?? undefined),
        buyer_org: buyer.company_name ?? buyer.organization ?? undefined,
        filter_rules: validation.rules,
      });
      setSubscription({
        id: result.license_id,
        status: result.status,
        scope: "filtered",
        filter_rules: result.filter_rules,
        valid_from: result.valid_from,
        valid_until: result.valid_until,
      });
      setIssuedAccessKey(result.access_key);
      toast({
        title: "Filtered subscription created",
        description: `Access key issued: ${result.access_key.slice(0, 20)}… Status: ${result.status}. Save the access key — it's shown once.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't create subscription",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const validation = formToRules(form);
    if (!validation.ok) {
      toast({ title: "Invalid filter rules", description: validation.error, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await updateFilterRules(token, validation.rules);
      setSubscription(result.filtered_subscription);
      toast({ title: "Filter rules updated", description: "Your subscription now uses the new filter." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/No active filtered subscription/i.test(msg)) {
        toast({
          title: "No subscription yet",
          description: "Use the form below + 'Create subscription' button to start.",
          variant: "destructive",
        });
        setSubscription(null);
      } else {
        toast({ title: "Couldn't save", description: msg, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <DashboardLayout title="Filter subscription" variant="buyer">
        <div className="flex justify-center py-12"><Spinner /></div>
      </DashboardLayout>
    );
  }

  const hasSubscription = subscription !== null;

  return (
    <DashboardLayout title="Filter subscription" variant="buyer">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Filter subscription</h1>
          <p className="text-sm text-gray-600 mt-1">
            Phase 10 metered licensing. Set filter rules; articles auto-deliver as publishers publish matching content. Stripe billing meter wiring lights up in M4.
          </p>
        </div>

        {issuedAccessKey && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Save your access key</CardTitle>
              <CardDescription className="text-amber-800">
                This key is shown once. Use it as a Bearer token for content-delivery + buyer-audit endpoints. Store it now — Opedd cannot retrieve it later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block bg-white border border-amber-300 px-3 py-2 rounded text-sm font-mono break-all">
                {issuedAccessKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(issuedAccessKey);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </CardContent>
          </Card>
        )}

        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current subscription</span>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Valid {new Date(subscription.valid_from).toLocaleDateString()} → {new Date(subscription.valid_until).toLocaleDateString()}
                {subscription.status === "pending" && (
                  <span className="block text-xs text-amber-700 mt-1">
                    Status will flip to 'active' once Stripe Billing meter wiring ships (M4).
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filter rules</CardTitle>
            <CardDescription>
              At least one filter dimension required. Empty fields are ignored (no filter on that dimension).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            <div>
              <Label className="text-sm font-semibold">Categories</Label>
              <p className="text-xs text-gray-500 mb-2">Pick categories you want to receive. Empty = all categories.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FILTER_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.categories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* License types */}
            <div>
              <Label className="text-sm font-semibold">License types</Label>
              <p className="text-xs text-gray-500 mb-2">Which license forms you want to consume.</p>
              <div className="space-y-2">
                {FILTER_LICENSE_TYPES.map((lt) => (
                  <label key={lt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.license_types.includes(lt)}
                      onCheckedChange={() => toggleLicenseType(lt)}
                    />
                    {FILTER_LICENSE_TYPE_LABELS[lt]}
                  </label>
                ))}
              </div>
            </div>

            {/* Max price per event */}
            <div>
              <Label htmlFor="max_price">Max price per event ($USD)</Label>
              <Input
                id="max_price"
                type="number"
                step="0.001"
                min="0"
                value={form.max_price_per_event}
                onChange={(e) => setForm({ ...form, max_price_per_event: e.target.value })}
                placeholder="0.05"
              />
              <p className="text-xs text-gray-500 mt-1">Publishers priced above this are auto-excluded. Empty = no price ceiling.</p>
            </div>

            {/* Excluded publishers */}
            <div>
              <Label htmlFor="excluded">Excluded publishers</Label>
              <Textarea
                id="excluded"
                value={form.excluded_publisher_ids}
                onChange={(e) => setForm({ ...form, excluded_publisher_ids: e.target.value })}
                placeholder="One UUID per line (or comma-separated)"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Publisher UUIDs to explicitly exclude from this subscription.</p>
            </div>

            {/* Caps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="per_pub_cap">Per-publisher monthly cap ($USD)</Label>
                <Input
                  id="per_pub_cap"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.per_publisher_monthly_cap}
                  onChange={(e) => setForm({ ...form, per_publisher_monthly_cap: e.target.value })}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label htmlFor="global_cap">Global monthly cap ($USD)</Label>
                <Input
                  id="global_cap"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.global_monthly_cap}
                  onChange={(e) => setForm({ ...form, global_monthly_cap: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Caps are Stripe-enforced at billing time (M4). Empty = no cap.</p>

            {/* Save / Create button */}
            <div className="flex gap-3 pt-2">
              {hasSubscription ? (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save filter rules
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create subscription
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/buyer/audit")}>
                View audit log <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
