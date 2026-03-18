import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Archive,
  Cpu,
  Brain,
  Share2,
  Building2,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

// --- Interfaces ---

interface LicenseTypeConfig {
  enabled: boolean;
  price_per_article?: number | null;
  price_annual?: number | null;
  price_monthly?: number | null;
  price_onetime?: number | null;
  quote_only?: boolean;
}

interface PricingRules {
  license_types: {
    editorial: LicenseTypeConfig;
    archive: LicenseTypeConfig;
    ai_retrieval: LicenseTypeConfig;
    ai_training: LicenseTypeConfig;
    corporate: LicenseTypeConfig;
    syndication: LicenseTypeConfig;
  };
}

interface PublisherProfile {
  id: string;
  name: string;
  website_url: string | null;
  default_human_price: number | null;
  default_ai_price: number | null;
  pricing_rules: PricingRules | null;
  stripe_onboarding_complete: boolean;
  article_count?: number;
}

interface Transaction {
  id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  license_type: string | null;
  asset_title: string | null;
  amount: number | null;
  valid_until: string | null;
  status: string;
}

// --- Helpers ---

function deriveSlug(websiteUrl: string | null): string {
  if (!websiteUrl) return "";
  const domain = websiteUrl
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
  return domain.split(".")[0].toLowerCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function licenseTypeBadgeVariant(type: string | null): string {
  if (!type) return "secondary";
  const map: Record<string, string> = {
    human: "default",
    ai: "secondary",
    ai_inference: "secondary",
    ai_training: "secondary",
    archive: "outline",
  };
  return map[type] ?? "secondary";
}

const DEFAULT_PRICING_RULES: PricingRules = {
  license_types: {
    editorial: { enabled: false, price_per_article: null },
    archive: { enabled: false, price_annual: null },
    ai_retrieval: { enabled: false, price_monthly: null },
    ai_training: { enabled: false, price_onetime: null },
    corporate: { enabled: false, price_annual: null },
    syndication: { enabled: false, price_per_article: null, quote_only: false },
  },
};

function mergePricingRules(saved: PricingRules | null): PricingRules {
  if (!saved) return DEFAULT_PRICING_RULES;
  return {
    license_types: {
      editorial: { ...DEFAULT_PRICING_RULES.license_types.editorial, ...saved.license_types?.editorial },
      archive: { ...DEFAULT_PRICING_RULES.license_types.archive, ...saved.license_types?.archive },
      ai_retrieval: { ...DEFAULT_PRICING_RULES.license_types.ai_retrieval, ...saved.license_types?.ai_retrieval },
      ai_training: { ...DEFAULT_PRICING_RULES.license_types.ai_training, ...saved.license_types?.ai_training },
      corporate: { ...DEFAULT_PRICING_RULES.license_types.corporate, ...saved.license_types?.corporate },
      syndication: { ...DEFAULT_PRICING_RULES.license_types.syndication, ...saved.license_types?.syndication },
    },
  };
}

function isPricingDone(rules: PricingRules | null): boolean {
  if (!rules?.license_types) return false;
  const lt = rules.license_types;
  return (
    (lt.editorial.enabled && !!lt.editorial.price_per_article) ||
    (lt.archive.enabled && !!lt.archive.price_annual) ||
    (lt.ai_retrieval.enabled && !!lt.ai_retrieval.price_monthly) ||
    (lt.ai_training.enabled && !!lt.ai_training.price_onetime) ||
    (lt.corporate.enabled && !!lt.corporate.price_annual) ||
    (lt.syndication.enabled && (!!lt.syndication.quote_only || !!lt.syndication.price_per_article))
  );
}

// --- PriceInput ---

interface PriceInputProps {
  value: number | null | undefined;
  label: string;
  onChange: (val: number | null) => void;
  disabled?: boolean;
}

function PriceInput({ value, label, onChange, disabled }: PriceInputProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-gray-400 text-sm font-medium">$</span>
      <Input
        type="number"
        min="0"
        step="1"
        placeholder="0"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? null : v);
        }}
        className="w-28 h-8 text-sm"
      />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

// --- CopyableTextarea ---

function CopyableTextarea({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <Textarea
        readOnly
        value={value}
        rows={4}
        className="text-sm text-gray-600 bg-gray-50 resize-none pr-16"
      />
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors text-gray-500"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// --- Main Page ---

export default function Licensing() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [localRules, setLocalRules] = useState<PricingRules>(DEFAULT_PRICING_RULES);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const [linkCopied, setLinkCopied] = useState(false);
  const [shareKitOpen, setShareKitOpen] = useState(false);

  const originalRulesRef = useRef<PricingRules>(DEFAULT_PRICING_RULES);

  // Fetch publisher profile
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load profile");
      const pub = json.data as PublisherProfile;
      setProfile(pub);
      const merged = mergePricingRules(pub.pricing_rules);
      setLocalRules(merged);
      originalRulesRef.current = merged;
      setHasChanges(false);
    } catch (err) {
      toast({
        title: "Error loading profile",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  }, [getAccessToken, toast]);

  // Fetch recent transactions
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${EXT_SUPABASE_URL}/get-transactions`, {
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load transactions");
      const all = (json.data?.transactions ?? json.data ?? []) as Transaction[];
      const completed = all.filter((t) => t.status === "completed").slice(0, 5);
      setTransactions(completed);
    } catch {
      // Silently fail — not critical
    } finally {
      setTxLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, [fetchProfile, fetchTransactions]);

  // Track unsaved changes
  useEffect(() => {
    setHasChanges(
      JSON.stringify(localRules) !== JSON.stringify(originalRulesRef.current)
    );
  }, [localRules]);

  // Update a license type field
  const updateLicenseType = <K extends keyof PricingRules["license_types"]>(
    key: K,
    patch: Partial<LicenseTypeConfig>
  ) => {
    setLocalRules((prev) => ({
      ...prev,
      license_types: {
        ...prev.license_types,
        [key]: { ...prev.license_types[key], ...patch },
      },
    }));
  };

  // Validate before save
  const validate = (): string[] => {
    const errors: string[] = [];
    const lt = localRules.license_types;

    if (lt.editorial.enabled && !lt.editorial.price_per_article) {
      errors.push("Editorial: price per article is required");
    }
    if (lt.archive.enabled && !lt.archive.price_annual) {
      errors.push("Archive: annual price is required");
    }
    if (lt.ai_retrieval.enabled && !lt.ai_retrieval.price_monthly) {
      errors.push("AI / RAG: monthly price is required");
    }
    if (lt.ai_training.enabled && !lt.ai_training.price_onetime) {
      errors.push("AI Training: one-time price is required");
    }
    if (lt.corporate.enabled && !lt.corporate.price_annual) {
      errors.push("Corporate: annual price is required");
    }
    if (lt.syndication.enabled && !lt.syndication.quote_only && !lt.syndication.price_per_article) {
      errors.push("Syndication: price per article is required (or select quote only)");
    }
    return errors;
  };

  // Save pricing rules
  const handleSave = async () => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const token = await getAccessToken();

      const body: Record<string, unknown> = { pricing_rules: localRules };

      // Mirror editorial → default_human_price
      const editorialPrice = localRules.license_types.editorial.price_per_article;
      if (localRules.license_types.editorial.enabled && editorialPrice) {
        body.default_human_price = editorialPrice;
      }
      // Mirror ai_training → default_ai_price
      const aiTrainingPrice = localRules.license_types.ai_training.price_onetime;
      if (localRules.license_types.ai_training.enabled && aiTrainingPrice) {
        body.default_ai_price = aiTrainingPrice;
      }

      const res = await fetch(`${EXT_SUPABASE_URL}/publisher-profile`, {
        method: "PATCH",
        headers: {
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Save failed");

      toast({ title: "License types updated" });
      originalRulesRef.current = localRules;
      setHasChanges(false);
      setValidationErrors([]);
      await fetchProfile();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Copy licensing page link
  const handleCopyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`https://opedd.com/p/${slug}`);
    setLinkCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const slug = deriveSlug(profile?.website_url ?? null);
  const licensingUrl = slug ? `https://opedd.com/p/${slug}` : null;

  const emailTemplate = licensingUrl
    ? `Hi [Name],\n\nWe've made our content available for licensing directly at ${licensingUrl}. You can browse our catalog, select the articles or access tier that fits your needs, and complete the license in minutes.\n\nLet me know if you have any questions.`
    : "";

  const linkedInTemplate = licensingUrl
    ? `We've joined Opedd to make our content available for licensing to AI companies, researchers, and media organisations. You can browse our catalog and self-serve any license type at: ${licensingUrl} #ContentLicensing #AI #MediaRights`
    : "";

  // --- License type rows config ---
  const licenseRows: Array<{
    key: keyof PricingRules["license_types"];
    icon: React.ReactNode;
    label: string;
    description: string;
    priceFields: React.ReactNode;
  }> = [
    {
      key: "editorial",
      icon: <FileText size={18} className="text-indigo-500" />,
      label: "Editorial use",
      description: "Reuse in articles, reports, and analysis",
      priceFields: (
        <PriceInput
          value={localRules.license_types.editorial.price_per_article}
          label="/article"
          disabled={!localRules.license_types.editorial.enabled}
          onChange={(v) => updateLicenseType("editorial", { price_per_article: v })}
        />
      ),
    },
    {
      key: "archive",
      icon: <Archive size={18} className="text-blue-500" />,
      label: "Archive",
      description: "Full catalog access — all articles",
      priceFields: (
        <PriceInput
          value={localRules.license_types.archive.price_annual}
          label="/year"
          disabled={!localRules.license_types.archive.enabled}
          onChange={(v) => updateLicenseType("archive", { price_annual: v })}
        />
      ),
    },
    {
      key: "ai_retrieval",
      icon: <Cpu size={18} className="text-violet-500" />,
      label: "AI / RAG retrieval",
      description: "Structured API access for AI applications",
      priceFields: (
        <PriceInput
          value={localRules.license_types.ai_retrieval.price_monthly}
          label="/month"
          disabled={!localRules.license_types.ai_retrieval.enabled}
          onChange={(v) => updateLicenseType("ai_retrieval", { price_monthly: v })}
        />
      ),
    },
    {
      key: "ai_training",
      icon: <Brain size={18} className="text-purple-500" />,
      label: "AI Training",
      description: "License for model training & fine-tuning",
      priceFields: (
        <PriceInput
          value={localRules.license_types.ai_training.price_onetime}
          label="one-time"
          disabled={!localRules.license_types.ai_training.enabled}
          onChange={(v) => updateLicenseType("ai_training", { price_onetime: v })}
        />
      ),
    },
    {
      key: "corporate",
      icon: <Building2 size={18} className="text-slate-500" />,
      label: "Corporate blanket",
      description: "Internal enterprise-wide reuse",
      priceFields: (
        <PriceInput
          value={localRules.license_types.corporate.price_annual}
          label="/year"
          disabled={!localRules.license_types.corporate.enabled}
          onChange={(v) => updateLicenseType("corporate", { price_annual: v })}
        />
      ),
    },
    {
      key: "syndication",
      icon: <Share2 size={18} className="text-teal-500" />,
      label: "Syndication",
      description: "Republish in your publication",
      priceFields: localRules.license_types.syndication.enabled ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="syndication_mode"
                checked={!localRules.license_types.syndication.quote_only}
                onChange={() => updateLicenseType("syndication", { quote_only: false })}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">Self-serve price</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="syndication_mode"
                checked={!!localRules.license_types.syndication.quote_only}
                onChange={() => updateLicenseType("syndication", { quote_only: true })}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">Quote only</span>
            </label>
          </div>
          {!localRules.license_types.syndication.quote_only && (
            <PriceInput
              value={localRules.license_types.syndication.price_per_article}
              label="/article"
              disabled={false}
              onChange={(v) => updateLicenseType("syndication", { price_per_article: v })}
            />
          )}
        </div>
      ) : null,
    },
  ];

  const pricingDone = isPricingDone(profile?.pricing_rules ?? null);
  const contentDone = (profile?.article_count ?? 0) > 0;
  const showSetupBanner = !profileLoading && (!pricingDone || !contentDone);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-gray-900">Licensing</h1>

        {/* Setup incomplete banner */}
        {showSetupBanner && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              Complete your setup:{" "}
              {!pricingDone && !contentDone
                ? "enable at least one license type and import your content to activate your licensing page."
                : !pricingDone
                ? "enable at least one license type to activate your licensing page."
                : "import your content to activate your licensing page."}
            </span>
          </div>
        )}

        {/* SECTION 1 — Your Licensing Page */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Your licensing page</h2>

          {profileLoading ? (
            <Skeleton className="h-14 w-full rounded-lg" />
          ) : !profile?.website_url ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Add your website URL in{" "}
              <Link to="/settings" className="underline font-medium">
                Settings
              </Link>{" "}
              to generate your licensing page.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="flex-1 text-sm font-mono text-gray-700 truncate select-all">
                  {licensingUrl}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(slug)}
                    className="gap-1"
                  >
                    {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                    {linkCopied ? "Copied" : "Copy link"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open(`/p/${slug}`, "_blank")}
                    className="gap-1"
                  >
                    Preview
                    <ExternalLink size={14} />
                  </Button>
                </div>
              </div>

              {/* Share kit collapsible */}
              <div>
                <button
                  onClick={() => setShareKitOpen((o) => !o)}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                >
                  {shareKitOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  Share kit
                </button>
                {shareKitOpen && (
                  <div className="mt-3 space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Email template
                      </p>
                      <CopyableTextarea value={emailTemplate} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        LinkedIn post
                      </p>
                      <CopyableTextarea value={linkedInTemplate} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* SECTION 2 — License Types Configuration */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-1">
          <h2 className="text-base font-semibold text-gray-900 mb-4">License types</h2>

          {profileLoading ? (
            <div className="space-y-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {licenseRows.map((row) => {
                  const isEnabled = localRules.license_types[row.key].enabled;
                  return (
                    <div key={row.key} className="py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            updateLicenseType(row.key, { enabled: checked })
                          }
                          id={`toggle-${row.key}`}
                        />
                        <div className="min-w-0">
                          <Label
                            htmlFor={`toggle-${row.key}`}
                            className="inline-flex items-center gap-2 font-medium text-gray-900 cursor-pointer"
                          >
                            {row.icon}
                            {row.label}
                            {hasChanges && isEnabled !== (originalRulesRef.current.license_types[row.key].enabled) && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Unsaved changes" />
                            )}
                          </Label>
                          <p className="text-sm text-gray-500 mt-0.5">{row.description}</p>
                          {isEnabled && row.priceFields}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
                  {validationErrors.map((e) => (
                    <p key={e}>• {e}</p>
                  ))}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                {hasChanges && (
                  <span className="text-xs text-amber-600 font-medium inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Unsaved changes
                  </span>
                )}
                <div className={hasChanges ? "" : "ml-auto"}>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* SECTION 3 — Active Licenses */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Active licenses</h2>
            <Link
              to="/ledger"
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              View all in Buyers →
            </Link>
          </div>

          {txLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No active licenses yet. Share your licensing page to get started.
              </p>
              {licensingUrl && (
                <a
                  href={licensingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline mt-1 inline-block"
                >
                  {licensingUrl}
                </a>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left px-2 pb-2 font-medium">Buyer</th>
                    <th className="text-left px-2 pb-2 font-medium">Type</th>
                    <th className="text-left px-2 pb-2 font-medium hidden sm:table-cell">Article</th>
                    <th className="text-right px-2 pb-2 font-medium">Value</th>
                    <th className="text-right px-2 pb-2 font-medium hidden sm:table-cell">Valid until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2.5 font-medium text-gray-800 max-w-[120px] truncate">
                        {tx.buyer_name ?? tx.buyer_email ?? "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        <Badge
                          variant={licenseTypeBadgeVariant(tx.license_type) as "default" | "secondary" | "outline" | "destructive"}
                          className="text-xs capitalize"
                        >
                          {tx.license_type?.replace(/_/g, " ") ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 text-gray-500 hidden sm:table-cell max-w-[160px] truncate">
                        {tx.asset_title ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold text-gray-900">
                        {tx.amount != null ? `$${tx.amount}` : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right text-gray-400 hidden sm:table-cell">
                        {formatDate(tx.valid_until)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
