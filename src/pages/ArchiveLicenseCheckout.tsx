import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Shield, Loader2, ChevronDown, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";
import { formatUSD } from "@/lib/formatNumber";

interface PublisherRow {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  pricing_rules: any;
  stripe_onboarding_complete: boolean | null;
}

const INTENDED_USE_OPTIONS = [
  { value: "personal", label: "Personal Use" },
  { value: "editorial", label: "Editorial / Journalism" },
  { value: "commercial", label: "Commercial Use" },
  { value: "ai_training", label: "AI Model Training" },
  { value: "corporate", label: "Corporate / Internal" },
] as const;

export default function ArchiveLicenseCheckout() {
  const { publisher_id } = useParams<{ publisher_id: string }>();

  const [publisher, setPublisher] = useState<PublisherRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noArchivePrice, setNoArchivePrice] = useState(false);
  const [archivePrice, setArchivePrice] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publisher_id) return;
    (async () => {
      try {
        const url = `${EXT_SUPABASE_REST}/rest/v1/publishers?select=id,name,website_url,logo_url,pricing_rules,stripe_onboarding_complete&id=eq.${publisher_id}&limit=1`;
        const res = await fetch(url, {
          headers: { apikey: EXT_ANON_KEY, Accept: "application/json" },
        });
        const rows = await res.json();
        const row: PublisherRow | undefined = Array.isArray(rows) ? rows[0] : undefined;
        if (!row) {
          setNotFound(true);
        } else {
          setPublisher(row);
          const price = row.pricing_rules?.license_types?.archive?.price_annual;
          if (price == null || Number(price) <= 0) {
            setNoArchivePrice(true);
          } else {
            setArchivePrice(Number(price));
          }
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [publisher_id]);

  const handleSubmit = async () => {
    if (!email || !publisher_id) return;
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return; }
    if (!name.trim()) { setError("Full name is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({
          publisher_id,
          buyer_email: email,
          buyer_name: name.trim(),
          buyer_organization: organization.trim() || undefined,
          intended_use: intendedUse || undefined,
          license_type: "archive",
          return_url: window.location.href,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Checkout creation failed");
      if (!result.data?.checkout_url) throw new Error("Invalid checkout response");
      window.location.href = result.data.checkout_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!email && !!name.trim() && !submitting;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-oxford" />
      </div>
    );
  }

  if (notFound || !publisher) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogoColor} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-gray-500 text-sm">Publisher not found.</p>
      </div>
    );
  }

  if (noArchivePrice) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogoColor} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-gray-900 text-sm font-medium">Archive licensing not available</p>
        <p className="text-gray-500 text-xs max-w-xs text-center">
          Archive licensing is not currently available from <strong>{publisher.name}</strong>. Please contact the publisher directly.
        </p>
      </div>
    );
  }

  const LeftPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "bg-oxford px-5 py-8 text-white" : ""}>
      {!mobile && (
        <img src={opeddLogo} alt="Opedd" className="h-7 mb-12" />
      )}

      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 text-white/80 px-3 py-1 text-xs font-medium mb-4">
        <Archive className="h-3 w-3" />
        Archive License
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-white leading-tight mb-2">
        {publisher.name}
      </h1>
      <p className="text-white/60 text-sm mb-8">Full catalog access · 1 year</p>

      <div className="border-t border-white/15 pt-6 mt-auto">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Annual License</p>
        <p className="text-2xl font-semibold text-white mt-1">
          {formatUSD(archivePrice!)}<span className="text-base font-normal text-white/60">/year</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel — Desktop */}
      <div className="hidden md:flex md:w-[45%] bg-oxford text-white p-10 lg:p-14 flex-col sticky top-0 h-screen">
        <LeftPanel />
        <div className="mt-auto pt-8">
          <p className="text-xs text-white/30">
            Powered by <span className="text-white/50 font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="bg-oxford px-5 pt-6 pb-2">
          <img src={opeddLogo} alt="Opedd" className="h-6 mb-4" />
        </div>
        <LeftPanel mobile />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 bg-white min-h-screen">
        <div className="max-w-lg mx-auto px-5 md:px-10 py-10 md:py-14">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Purchase Archive License</h2>
          <p className="text-sm text-gray-500 mb-8">Complete the form below to secure full catalog access.</p>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-gray-500">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org" className="text-xs font-medium text-gray-500">
                Organization <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="org"
                type="text"
                placeholder="Acme Corp"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-gray-500">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intended-use" className="text-xs font-medium text-gray-500">
                Intended Use
              </Label>
              <div className="relative">
                <select
                  id="intended-use"
                  value={intendedUse}
                  onChange={(e) => { setIntendedUse(e.target.value); setError(null); }}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-oxford/20 focus:border-oxford"
                >
                  <option value="">Select intended use…</option>
                  {INTENDED_USE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {publisher.stripe_onboarding_complete === false && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-oxford mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your license is guaranteed by Opedd. Funds are securely held until the publisher activates payouts.
                </p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm px-1">{error}</p>}

            <div className="relative group">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-11 text-sm font-semibold bg-oxford hover:bg-oxford-dark text-white"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting to payment…</>
                ) : (
                  `Pay ${formatUSD(archivePrice!)}/year · Secure License`
                )}
              </Button>
                {!canSubmit && !submitting && (
                  <div
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out pointer-events-none z-10 shadow-popover"
                  >
                    {!email ? "Enter your email" : !name.trim() ? "Enter your name" : "Complete all required fields"}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <a href="https://opedd.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-500 transition-colors">
              Powered by
              <img src={opeddLogoColor} alt="Opedd" className="h-3.5 opacity-50" />
            </a>
            <span className="text-gray-200">·</span>
            <a href="mailto:support@opedd.com" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
              Help & Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
