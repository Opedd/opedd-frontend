import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Shield, Loader2, ChevronDown, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";

interface AssetRow {
  id: string;
  title: string;
  description: string | null;
  human_price: number | null;
  ai_price: number | null;
  verification_status: string | null;
  licensing_enabled: boolean | null;
  publisher_id: string | null;
  content_delivery_available?: boolean | null;
}

type LicenseType = "editorial" | "ai_inference" | "ai_training" | "corporate" | "syndication";

const BASE_LICENSE_TYPE_OPTIONS: { value: LicenseType; label: string }[] = [
  { value: "editorial",    label: "Editorial License" },
  { value: "ai_inference", label: "AI / RAG License" },
  { value: "ai_training",  label: "AI Training License" },
  { value: "corporate",    label: "Corporate License" },
  { value: "syndication",  label: "Syndication License" },
];

const VALID_LICENSE_TYPES = new Set<string>(BASE_LICENSE_TYPE_OPTIONS.map((o) => o.value));

function parseLicenseType(raw: string | null): LicenseType {
  if (raw && VALID_LICENSE_TYPES.has(raw)) return raw as LicenseType;
  return "editorial";
}

function getPrice(type: LicenseType, asset: AssetRow, pricingRules?: any): number {
  switch (type) {
    case "editorial":    return asset.human_price ?? 0;
    case "ai_inference": return asset.ai_price ?? 0;
    case "ai_training":  return asset.ai_price ?? 0;
    case "corporate": {
      const rulePrice = pricingRules?.license_types?.corporate?.price_per_article;
      return (rulePrice != null && rulePrice > 0) ? rulePrice : (asset.human_price ?? 0) * 5;
    }
    case "syndication": {
      const synPrice = pricingRules?.license_types?.syndication?.price_per_article;
      return synPrice != null ? Number(synPrice) : 0;
    }
  }
}

function getLicenseLabel(type: LicenseType): string {
  return BASE_LICENSE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function toBackendLicenseType(type: LicenseType): string {
  switch (type) {
    case "editorial":    return "human";
    case "corporate":    return "human";
    case "ai_training":  return "ai";
    case "ai_inference": return "ai_inference";
    case "syndication":  return "syndication";
  }
}

const INTENDED_USE_OPTIONS = [
  { value: "personal", label: "Personal Use" },
  { value: "editorial", label: "Editorial / Journalism" },
  { value: "commercial", label: "Commercial Use" },
  { value: "ai_training", label: "AI Model Training" },
  { value: "corporate", label: "Corporate / Internal" },
] as const;

export default function LicensePublicCheckout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [licensingDisabled, setLicensingDisabled] = useState(false);

  const licenseTypeParam = new URLSearchParams(location.search).get("type");
  const [selected, setSelected] = useState<LicenseType>(parseLicenseType(licenseTypeParam));
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeSuccess, setFreeSuccess] = useState<{ license_key: string } | null>(null);
  const [contactForPricing, setContactForPricing] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [publisherPricingRules, setPublisherPricingRules] = useState<any>(null);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const url = `${EXT_SUPABASE_REST}/rest/v1/licenses?select=id,title,description,human_price,ai_price,verification_status,licensing_enabled,publisher_id&id=eq.${id}&limit=1`;
        const res = await fetch(url, {
          headers: { apikey: EXT_ANON_KEY, Accept: "application/json" },
        });
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) {
          setNotFound(true);
        } else if (!row.licensing_enabled) {
          setLicensingDisabled(true);
        } else {
          setAsset(row);
          if (row.publisher_id) {
            try {
              const pubRes = await fetch(
                `${EXT_SUPABASE_REST}/rest/v1/publishers?select=contact_for_pricing,pricing_rules,stripe_onboarding_complete&id=eq.${row.publisher_id}&limit=1`,
                { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } }
              );
              const pubRows = await pubRes.json();
              if (Array.isArray(pubRows) && pubRows[0]) {
                setContactForPricing(!!pubRows[0].contact_for_pricing);
                setPublisherPricingRules(pubRows[0].pricing_rules ?? null);
                setStripeOnboardingComplete(!!pubRows[0].stripe_onboarding_complete);
              }
            } catch { /* ignore */ }
          }
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!email || !asset) return;
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return; }
    const price = getPrice(selected, asset, publisherPricingRules);
    const isFree = price === 0;
    setSubmitting(true);
    try {
      if (isFree) {
        const res = await fetch(`${EXT_SUPABASE_URL}/issue-license`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
          body: JSON.stringify({ article_id: asset.id, buyer_email: email, buyer_name: name || undefined, buyer_organization: organization || undefined, intended_use: intendedUse || undefined, license_type: toBackendLicenseType(selected) }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "License issuance failed");
        setFreeSuccess({ license_key: result.data?.license_key || "N/A" });
      } else {
        const res = await fetch(`${EXT_SUPABASE_URL}/create-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
          body: JSON.stringify({ article_id: asset.id, buyer_email: email, license_type: toBackendLicenseType(selected), buyer_name: name || undefined, buyer_organization: organization || undefined, intended_use: intendedUse || undefined }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "Checkout creation failed");
        if (!result.data?.checkout_url) throw new Error("Invalid checkout response");
        window.location.href = result.data.checkout_url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = asset?.verification_status === "verified";
  const selectedPrice = asset ? getPrice(selected, asset, publisherPricingRules) : 0;
  const selectedLabel = getLicenseLabel(selected);
  const isPaid = selectedPrice > 0;
  const canSubmit = !!email && !submitting && !freeSuccess;
  const syndicationRules = publisherPricingRules?.license_types?.syndication;
  const syndicationEnabled = !!syndicationRules?.enabled;
  const syndicationQuoteOnly = !!syndicationRules?.quote_only;
  const isQuoteOnly = selected === "syndication" && syndicationQuoteOnly;

  // Build dynamic options list — only show syndication if enabled by publisher
  const licenseTypeOptions = BASE_LICENSE_TYPE_OPTIONS.filter(
    (o) => o.value !== "syndication" || syndicationEnabled
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  if (licensingDisabled) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogoColor} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-[#111827] text-sm font-medium">Licensing paused</p>
        <p className="text-[#6B7280] text-xs max-w-xs text-center">The publisher has temporarily paused licensing for this article. Check back later or contact the publisher directly.</p>
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogoColor} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-[#6B7280] text-sm">This article was not found or is no longer available for licensing.</p>
      </div>
    );
  }

  const ArticleInfo = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "bg-[#4A26ED] px-5 py-8 text-white" : ""}>
      {!mobile && (
        <img src={opeddLogo} alt="Opedd" className="h-7 mb-12" />
      )}

      {isVerified && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 text-white/80 px-3 py-1 text-xs font-medium mb-4">
          <Shield className="h-3 w-3" />
          Verified by Opedd
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight mb-3">
        {asset.title}
      </h1>

      {asset.description && (
        <p className="text-white/50 text-sm leading-relaxed line-clamp-3 mb-8">
          {asset.description}
        </p>
      )}

      {selected && selectedPrice != null && (
        <div className="border-t border-white/15 pt-6 mt-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Selected License</p>
          <p className="text-white/80 text-sm font-medium">{selectedLabel}</p>
          <p className="text-2xl font-semibold text-white mt-1">
            {selectedPrice > 0 ? `$${selectedPrice.toFixed(2)}` : "Free"}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel — Desktop */}
      <div className="hidden md:flex md:w-[45%] bg-[#4A26ED] text-white p-10 lg:p-14 flex-col sticky top-0 h-screen">
        <ArticleInfo />
        <div className="mt-auto pt-8">
          <p className="text-xs text-white/30">
            Powered by <span className="text-white/50 font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="bg-[#4A26ED] px-5 pt-6 pb-2">
          <img src={opeddLogo} alt="Opedd" className="h-6 mb-4" />
        </div>
        <ArticleInfo mobile />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 bg-white min-h-screen">
        <div className="max-w-lg mx-auto px-5 md:px-10 py-10 md:py-14">
          <h2 className="text-lg font-semibold text-[#111827] mb-1">License this content</h2>
          <p className="text-sm text-[#6B7280] mb-8">Complete the form below to secure your license.</p>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-[#6B7280]">
                Full Name <span className="text-[#EF4444]">*</span>
              </Label>
              <Input id="name" type="text" placeholder="Jane Smith" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org" className="text-xs font-medium text-[#6B7280]">
                Organization <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </Label>
              <Input id="org" type="text" placeholder="Acme Corp" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-[#6B7280]">
                Email Address <span className="text-[#EF4444]">*</span>
              </Label>
              <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intended-use" className="text-xs font-medium text-[#6B7280]">
                Intended Use <span className="text-[#EF4444]">*</span>
              </Label>
              <div className="relative">
                <select
                  id="intended-use"
                  value={intendedUse}
                  onChange={(e) => { setIntendedUse(e.target.value); setError(null); }}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:border-[#4A26ED]"
                >
                  <option value="" disabled>Select intended use…</option>
                  {INTENDED_USE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="license-type" className="text-xs font-medium text-[#6B7280]">
                License Type <span className="text-[#EF4444]">*</span>
              </Label>
              <div className="relative">
                <select
                  id="license-type"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value as LicenseType)}
                  className="w-full h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20 focus:border-[#4A26ED]"
                >
                  {licenseTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
              </div>
              {asset && (
                <p className="text-sm font-semibold text-[#111827] pt-1">
                  {selectedPrice > 0 ? `$${selectedPrice.toFixed(2)}` : "Free"}
                </p>
              )}
            </div>

            {error && <p className="text-[#EF4444] text-sm px-1">{error}</p>}

            {stripeOnboardingComplete === false && isPaid && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-[#4A26ED] mt-0.5 shrink-0" />
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Your license is guaranteed by Opedd. Funds are securely held until the publisher activates payouts.
                </p>
              </div>
            )}

            {isQuoteOnly ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-[#111827]">Custom quote required</p>
                <p className="text-xs text-[#6B7280]">This publisher handles syndication pricing on a case-by-case basis. Contact them directly to request a custom quote.</p>
                {contactSent ? (
                  <p className="text-sm font-semibold text-emerald-600">Request sent! The publisher will be in touch.</p>
                ) : (
                  <Button
                    onClick={async () => {
                      if (!email || contactSending) return;
                      setContactSending(true);
                      try {
                        await fetch(`${EXT_SUPABASE_URL}/contact-publisher`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
                          body: JSON.stringify({ article_id: asset?.id, buyer_email: email, buyer_name: name || undefined, buyer_organization: organization || undefined, license_type: "syndication" }),
                        });
                        setContactSent(true);
                      } catch { setContactSent(true); } finally { setContactSending(false); }
                    }}
                    disabled={!email || contactSending}
                    className="w-full h-11 text-sm font-semibold bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
                  >
                    {contactSending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</> : "Request Syndication Quote"}
                  </Button>
                )}
              </div>
            ) : freeSuccess ? (
              <div className="rounded-xl border-2 border-[#10B981]/30 bg-[#ECFDF5] p-6 text-center space-y-3">
                <CheckCircle className="h-8 w-8 text-[#10B981] mx-auto" />
                <p className="text-sm font-semibold text-[#111827]">License Issued!</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono bg-white border border-[#10B981]/20 rounded px-3 py-1.5 text-[#4A26ED]">
                    {freeSuccess.license_key}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(freeSuccess.license_key); }}
                    className="p-1.5 rounded hover:bg-[#ECFDF5] text-[#10B981]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[#9CA3AF]">Save this key — it's your proof of license.</p>
              </div>
            ) : contactForPricing && isPaid ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-[#111827]">Quote-based pricing</p>
                <p className="text-xs text-[#6B7280]">The publisher handles licensing inquiries directly. Fill in your details above and click below to send a request.</p>
                {contactSent ? (
                  <p className="text-sm font-semibold text-emerald-600">Request sent! The publisher will be in touch.</p>
                ) : (
                  <Button
                    onClick={async () => {
                      if (!email || contactSending) return;
                      setContactSending(true);
                      try {
                        await fetch(`${EXT_SUPABASE_URL}/contact-publisher`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
                          body: JSON.stringify({ article_id: asset?.id, buyer_email: email, buyer_name: name || undefined, buyer_organization: organization || undefined, license_type: toBackendLicenseType(selected) }),
                        });
                        setContactSent(true);
                      } catch { setContactSent(true); } finally { setContactSending(false); }
                    }}
                    disabled={!email || contactSending}
                    className="w-full h-11 text-sm font-semibold bg-[#4A26ED] hover:bg-[#3B1ED1] text-white"
                  >
                    {contactSending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</> : "Send License Request"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative group">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full h-11 text-sm font-semibold"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isPaid ? "Redirecting to payment…" : "Processing…"}</>
                  ) : isPaid ? (
                    `Pay $${selectedPrice.toFixed(2)} · Secure License`
                  ) : (
                    "Secure Free License"
                  )}
                </Button>
                {!canSubmit && !submitting && !freeSuccess && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#111827] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out pointer-events-none z-10 shadow-lg"
                  >
                    {!email ? "Enter your email to continue" : "Complete all required fields"}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111827]" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <a href="https://opedd.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              Powered by
              <img src={opeddLogoColor} alt="Opedd" className="h-3.5 opacity-50" />
            </a>
            <span className="text-[#E5E7EB]">·</span>
            <a href="mailto:support@opedd.com" className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              Help & Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}