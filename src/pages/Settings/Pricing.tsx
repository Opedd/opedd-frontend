// Phase 5.4-β commit 1 — dedicated /settings/pricing page.
//
// Editor for the 4-vocab × 3-payment-model matrix shipped in
// Phase 5.4-α. Backend allowlist (publisher-profile/index.ts:1571)
// validates the writes; this page is the canonical UI surface.
//
// Founder direction (2026-05-05 design proposal): B2 dedicated page
// (NOT extending Step4Categorize wizard). Wizard-as-pricing-editor
// was always wrong; pricing changes post-onboarding need their own
// surface. Step4Categorize stays as the wizard-completion step but
// writes to the same pricing_rules JSONB this page reads/writes.
//
// JSONB shape (matches _shared/pricing.ts:resolvePrice):
//   pricing_rules.license_types: {
//     ai_training?:        { price?, price_annual? },
//     ai_retrieval?:       { price?, price_annual?, price_metered? },
//     human_per_article?:  { price? },
//     human_full_archive?: { price_annual? },
//   }
// Field presence + non-zero implies "this payment_model enabled."
// Absent / zero / null means "this payment_model not configured."

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { publisherProfileApi } from "@/lib/api";
import { EXT_SUPABASE_URL } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────

type LicenseType =
  | "ai_training"
  | "ai_retrieval"
  | "human_per_article"
  | "human_full_archive";

type PaymentModel = "one_time" | "subscription" | "metered";

interface LicenseTypeEntry {
  price?: number | null;
  price_annual?: number | null;
  price_metered?: number | null;
  [k: string]: unknown;
}

interface PricingProfileSlice {
  pricing_rules: {
    license_types?: Partial<Record<LicenseType, LicenseTypeEntry>>;
    [k: string]: unknown;
  } | null;
  // Phase 10 M7 — direct-licensing carveouts. JSONB on publishers row;
  // shape `{ <license_type>: true }`. Absent keys default to opted-in
  // (eligible for buyer-driven filtered subscriptions via /enterprise-license).
  // Setting a key to `true` opts that license_type out — buyers can't
  // include this publisher in a filtered subscription for that type.
  direct_license_carveouts?: Partial<Record<LicenseType, boolean>> | null;
}

// Valid (license_type, payment_model) combinations — mirrors
// _shared/pricing.ts:VALID_COMBINATIONS. Invalid combinations don't
// render in the editor; backend allowlist + resolver enforce the
// same set server-side.
const VALID_FIELDS: Record<LicenseType, ReadonlyArray<PaymentModel>> = {
  ai_training: ["one_time", "subscription"],
  ai_retrieval: ["one_time", "subscription", "metered"],
  human_per_article: ["one_time"],
  human_full_archive: ["subscription"],
};

const PAYMENT_MODEL_FIELD: Record<PaymentModel, "price" | "price_annual" | "price_metered"> = {
  one_time: "price",
  subscription: "price_annual",
  metered: "price_metered",
};

const PAYMENT_MODEL_LABEL: Record<PaymentModel, string> = {
  one_time: "Per transaction (one-time)",
  subscription: "Annual subscription ($/year)",
  metered: "Per call (metered, $/call)",
};

const LICENSE_TYPE_LABEL: Record<LicenseType, string> = {
  ai_training: "AI Training",
  ai_retrieval: "AI Retrieval",
  human_per_article: "Human — per article",
  human_full_archive: "Human — full archive",
};

const LICENSE_TYPE_DESC: Record<LicenseType, string> = {
  ai_training: "Bulk training-data corpus access for model fine-tuning",
  ai_retrieval: "RAG / inference-time API access (per-call or subscription)",
  human_per_article: "Single-article republication right",
  human_full_archive: "Annual access to publisher's full archive",
};

// ─── Component ────────────────────────────────────────────────────

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ready";
      pricing: PricingProfileSlice["pricing_rules"];
      carveouts: Partial<Record<LicenseType, boolean>>;
    }
  | { kind: "error"; message: string };

export default function PricingSettings() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  // Per-(license_type, payment_model) input state. Stored as strings
  // so input controls behave naturally; converted to numbers at save.
  const [inputs, setInputs] = useState<Record<string, string>>({});
  // Phase 10 M7 — per-license-type direct-license carveout toggle state.
  // True = this license_type is opted OUT of Opedd direct licensing
  // (buyers cannot include this publisher in filtered subscriptions
  // for that license_type). False / undefined = opted in (default).
  const [carveouts, setCarveouts] = useState<Partial<Record<LicenseType, boolean>>>({});
  // Soft-warning dialog state
  const [confirmDisableAll, setConfirmDisableAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) setLoadState({ kind: "error", message: "Not signed in" });
          return;
        }
        const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`publisher-profile GET ${res.status}`);
        const body = await res.json();
        const profile = (body?.data ?? body) as PricingProfileSlice;
        const pricing = profile?.pricing_rules ?? {};
        const carveoutsLoaded = (profile?.direct_license_carveouts ?? {}) as Partial<Record<LicenseType, boolean>>;
        if (cancelled) return;
        setLoadState({ kind: "ready", pricing, carveouts: carveoutsLoaded });
        setCarveouts(carveoutsLoaded);
        // Pre-fill inputs from existing pricing_rules.license_types
        const lt = pricing?.license_types ?? {};
        const seed: Record<string, string> = {};
        for (const ltKey of Object.keys(VALID_FIELDS) as LicenseType[]) {
          for (const pm of VALID_FIELDS[ltKey]) {
            const field = PAYMENT_MODEL_FIELD[pm];
            const value = lt[ltKey]?.[field];
            seed[`${ltKey}.${pm}`] =
              typeof value === "number" && value > 0 ? String(value) : "";
          }
        }
        setInputs(seed);
      } catch (err) {
        if (!cancelled) {
          setLoadState({
            kind: "error",
            message: err instanceof Error ? err.message : "Failed to load pricing",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  // Validate input on change. Frontend regex matches what backend
  // allowlist will reject anyway (number ≥ 0); also blocks save
  // button until all inputs are valid.
  const isValidInput = (value: string): boolean => {
    if (value.trim() === "") return true; // empty = "not set" = valid
    return /^[0-9]+(\.[0-9]+)?$/.test(value.trim()) && Number(value) >= 0;
  };

  const allValid = Object.values(inputs).every(isValidInput);

  // Build the pricing_rules.license_types JSONB payload from current
  // input state. Empty inputs → field absent from JSONB (semantic
  // "this payment_model not configured for this license_type").
  const buildPayload = (): Record<LicenseType, LicenseTypeEntry> => {
    const out: Partial<Record<LicenseType, LicenseTypeEntry>> = {};
    for (const ltKey of Object.keys(VALID_FIELDS) as LicenseType[]) {
      const entry: LicenseTypeEntry = {};
      let hasAny = false;
      for (const pm of VALID_FIELDS[ltKey]) {
        const inputValue = inputs[`${ltKey}.${pm}`] ?? "";
        if (inputValue.trim() === "") continue;
        const num = Number(inputValue);
        if (!Number.isFinite(num) || num <= 0) continue;
        entry[PAYMENT_MODEL_FIELD[pm]] = num;
        hasAny = true;
      }
      if (hasAny) out[ltKey] = entry;
    }
    return out as Record<LicenseType, LicenseTypeEntry>;
  };

  // Soft-warning check: would the new state result in zero non-null
  // prices across all license_types?
  const wouldDisableAll = (): boolean => {
    const payload = buildPayload();
    return Object.keys(payload).length === 0;
  };

  const handleSave = async () => {
    if (!allValid) return;
    if (wouldDisableAll() && !confirmDisableAll) {
      setConfirmDisableAll(true);
      return;
    }
    setSaving(true);
    setConfirmDisableAll(false);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired — sign in again");
      const payload = buildPayload();
      // Preserve any non-license-type pricing_rules keys (e.g.,
      // 'categories' from the legacy per-category override; out of
      // scope for 5.4-β editor but must not be clobbered).
      const existingNonLicenseTypes: Record<string, unknown> = {};
      if (loadState.kind === "ready" && loadState.pricing) {
        for (const k of Object.keys(loadState.pricing)) {
          if (k !== "license_types") {
            existingNonLicenseTypes[k] = loadState.pricing[k];
          }
        }
      }
      // Phase 10 M7 — emit direct_license_carveouts only with explicit
      // `true` keys (sparse JSONB); absent keys default to opted-in
      // server-side. Backend allowlist on publisher-profile PATCH
      // accepts the field (line 1061 allowlist extension shipping with
      // M3 buyer-account work).
      const carveoutsPayload: Partial<Record<LicenseType, boolean>> = {};
      for (const [k, v] of Object.entries(carveouts)) {
        if (v === true) carveoutsPayload[k as LicenseType] = true;
      }

      await publisherProfileApi.patch(
        {
          pricing_rules: {
            ...existingNonLicenseTypes,
            license_types: payload,
          },
          direct_license_carveouts: carveoutsPayload,
        },
        token,
      );
      toast({ title: "Pricing saved", description: "Your license pricing has been updated." });
      // Re-fetch to confirm persisted state
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      const profile = (body?.data ?? body) as PricingProfileSlice;
      const refreshedCarveouts = (profile?.direct_license_carveouts ?? {}) as Partial<Record<LicenseType, boolean>>;
      setLoadState({ kind: "ready", pricing: profile?.pricing_rules ?? {}, carveouts: refreshedCarveouts });
      setCarveouts(refreshedCarveouts);
    } catch (err) {
      toast({
        title: "Couldn't save pricing",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadState.kind === "loading") {
    return (
      <DashboardLayout title="Pricing">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  if (loadState.kind === "error") {
    return (
      <DashboardLayout title="Pricing">
        <div className="text-center py-12">
          <p className="text-gray-700">Couldn't load pricing: {loadState.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Confirmation dialog for "disable all" soft warning
  if (confirmDisableAll) {
    return (
      <DashboardLayout title="Pricing">
        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-900">You're disabling all license types</h2>
            <p className="mt-2 text-sm text-amber-800">
              Buyers won't be able to purchase your content via Opedd until you re-enable at least one license type.
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => setConfirmDisableAll(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => { void handleSave(); }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Save anyway
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pricing" subtitle="License pricing for your content">
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="text-sm text-gray-600">
          Set per-license-type pricing across the supported payment models. Leave a field blank to disable that payment model. Per-call (metered) pricing supports sub-cent rates (e.g., $0.005/call); other models require a Stripe minimum of $0.50.
        </div>

        {(Object.keys(VALID_FIELDS) as LicenseType[]).map((ltKey) => {
          const isCarvedOut = carveouts[ltKey] === true;
          return (
            <div
              key={ltKey}
              data-testid={`pricing-card-${ltKey}`}
              className={`border border-gray-200 rounded-lg p-5 bg-white ${isCarvedOut ? "opacity-75" : ""}`}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{LICENSE_TYPE_LABEL[ltKey]}</h3>
                  <p className="text-sm text-gray-500">{LICENSE_TYPE_DESC[ltKey]}</p>
                </div>
                {/* Phase 10 M7 — direct-licensing carveout toggle.
                    When ON, this publisher is excluded from buyer-driven
                    filtered subscriptions for this license_type (per
                    _shared/buyer-filter.ts Check 2 + metered-publisher-
                    payouts skip-rule). Default OFF = opted-in. */}
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isCarvedOut}
                    onChange={(e) =>
                      setCarveouts((c) => ({ ...c, [ltKey]: e.target.checked }))
                    }
                    disabled={saving}
                    className="h-4 w-4 rounded border-gray-300 text-navy-deep focus:ring-navy-deep/30"
                    data-testid={`carveout-toggle-${ltKey}`}
                    aria-label={`Opt out of Opedd direct licensing for ${LICENSE_TYPE_LABEL[ltKey]}`}
                  />
                  <span className="text-xs text-gray-700">Opt out of direct licensing</span>
                </label>
              </div>
              {isCarvedOut && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                  Opted out of Opedd direct licensing for this type. Buyers can't include this content in filtered subscriptions for {LICENSE_TYPE_LABEL[ltKey]}. Per-article licensing via the publisher API is unaffected.
                </p>
              )}
              <div className="space-y-3">
                {VALID_FIELDS[ltKey].map((pm) => {
                  const inputKey = `${ltKey}.${pm}`;
                  const value = inputs[inputKey] ?? "";
                  const valid = isValidInput(value);
                  return (
                    <div key={inputKey} className="flex items-center gap-3">
                      <Label htmlFor={inputKey} className="w-64 text-sm text-gray-700">
                        {PAYMENT_MODEL_LABEL[pm]}
                      </Label>
                      <Input
                        id={inputKey}
                        data-testid={`pricing-input-${ltKey}-${pm}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={value}
                        onChange={(e) => setInputs((s) => ({ ...s, [inputKey]: e.target.value }))}
                        className={`max-w-[160px] ${valid ? "" : "border-red-400"}`}
                        disabled={isCarvedOut}
                      />
                      {!valid && (
                        <span className="text-xs text-red-600">Must be a non-negative number</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => { void handleSave(); }}
            disabled={!allValid || saving}
            className="bg-[#4A26ED] hover:bg-[#3B1ED1] text-white px-6"
            data-testid="pricing-save-button"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Saving…
              </>
            ) : (
              "Save pricing"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
