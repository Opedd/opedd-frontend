import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Shield, Loader2, ChevronDown, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface AssetRow {
  id: string;
  title: string;
  description: string | null;
  human_price: number | null;
  ai_price: number | null;
  verification_status: string | null;
  licensing_enabled: boolean | null;
}

type LicenseType = "human" | "ai";

const INTENDED_USE_OPTIONS = [
  { value: "personal", label: "Personal Use" },
  { value: "editorial", label: "Editorial / Journalism" },
  { value: "commercial", label: "Commercial Use" },
  { value: "ai_training", label: "AI Model Training" },
  { value: "corporate", label: "Corporate / Internal" },
] as const;

export default function LicensePublicCheckout() {
  const { id } = useParams<{ id: string }>();

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selected, setSelected] = useState<LicenseType | null>(null);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeSuccess, setFreeSuccess] = useState<{ license_key: string } | null>(null);


  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const url = `${EXT_SUPABASE_URL}/rest/v1/licenses?select=id,title,description,human_price,ai_price,verification_status,licensing_enabled&id=eq.${id}&limit=1`;
        const res = await fetch(url, {
          headers: { apikey: EXT_ANON_KEY, Accept: "application/json" },
        });
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row || !row.licensing_enabled) {
          setNotFound(true);
        } else {
          setAsset(row);
          const hasH = row.human_price != null;
          const hasA = row.ai_price != null;
          if (hasH && !hasA) setSelected("human");
          if (hasA && !hasH) setSelected("ai");
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!selected || !email || !asset) return;
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const price = selected === "human" ? (asset.human_price ?? 0) : (asset.ai_price ?? 0);
    const isFree = price === 0;

    setSubmitting(true);
    try {
      if (isFree) {
        // Free license — call issue-license
        const res = await fetch(
          `${EXT_SUPABASE_URL}/functions/v1/issue-license`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
            body: JSON.stringify({
              article_id: asset.id,
              buyer_email: email,
              buyer_name: name || undefined,
              buyer_organization: organization || undefined,
              intended_use: intendedUse || undefined,
              license_type: selected,
            }),
          }
        );
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "License issuance failed");
        }
        setFreeSuccess({ license_key: result.data?.license_key || "N/A" });
      } else {
        // Paid license — call create-checkout → Stripe
        const res = await fetch(
          `${EXT_SUPABASE_URL}/functions/v1/create-checkout`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
            body: JSON.stringify({
              article_id: asset.id,
              buyer_email: email,
              license_type: selected,
              buyer_name: name || undefined,
              buyer_organization: organization || undefined,
              intended_use: intendedUse || undefined,
            }),
          }
        );
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Checkout creation failed");
        }
        window.location.href = result.data.checkout_url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };


  const hasHuman = asset?.human_price != null;
  const hasAi = asset?.ai_price != null;
  const isVerified = asset?.verification_status === "verified";
  const canSubmit = !!selected && !!email && !submitting && !freeSuccess;
  const selectedPrice = selected === "human" ? (asset?.human_price ?? 0) : selected === "ai" ? (asset?.ai_price ?? 0) : 0;
  const isPaid = selectedPrice > 0;

  const selectedLabel = selected === "human" ? "Human License" : selected === "ai" ? "AI Training License" : null;

  // — Loading —
  if (loading) {
    return (
      <div className="min-h-screen bg-[#040042] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  // — Not found —
  if (notFound || !asset) {
    return (
      <div className="min-h-screen bg-[#040042] flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogo} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-white/50 text-sm">
          This content is not available for licensing.
        </p>
      </div>
    );
  }


  // — License option cards —
  const licenseOptions: { type: LicenseType; label: string; price: number }[] = [];
  if (hasHuman) licenseOptions.push({ type: "human", label: "Human License", price: asset.human_price ?? 0 });
  if (hasAi) licenseOptions.push({ type: "ai", label: "AI Training License", price: asset.ai_price ?? 0 });

  // — Left panel content (shared between desktop and mobile) —
  const ArticleInfo = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "bg-[#040042] px-5 py-8 text-white" : ""}>
      {!mobile && (
        <img src={opeddLogo} alt="Opedd" className="h-7 mb-12" />
      )}

      {isVerified && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 text-white/70 px-3 py-1 text-xs font-medium mb-4">
          <Shield className="h-3 w-3" />
          Verified by Opedd
        </div>
      )}

      <h1
        className="text-2xl md:text-3xl font-semibold text-white leading-tight mb-3"
        style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}
      >
        {asset.title}
      </h1>

      {asset.description && (
        <p className="text-white/40 text-sm leading-relaxed line-clamp-3 mb-8">
          {asset.description}
        </p>
      )}

      {selected && selectedPrice != null && (
        <div className="border-t border-white/10 pt-6 mt-auto">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">
            Selected License
          </p>
          <p className="text-white/70 text-sm font-medium">{selectedLabel}</p>
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
      <div className="hidden md:flex md:w-[45%] bg-[#040042] text-white p-10 lg:p-14 flex-col sticky top-0 h-screen">
        <ArticleInfo />
        <div className="mt-auto pt-8">
          <p className="text-xs text-white/20">
            Powered by{" "}
            <span className="text-white/40 font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="bg-[#040042] px-5 pt-6 pb-2">
          <img src={opeddLogo} alt="Opedd" className="h-6 mb-4" />
        </div>
        <ArticleInfo mobile />
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 bg-white min-h-screen">
        <div className="max-w-lg mx-auto px-5 md:px-10 py-10 md:py-14">
          <h2 className="text-lg font-semibold text-[#040042] mb-1">
            License this content
          </h2>
          <p className="text-sm text-[#040042]/50 mb-8">
            Complete the form below to secure your license.
          </p>

          <div className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#040042]/70 text-sm">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                className="h-11 text-sm bg-white border-[#040042]/15 text-[#040042] placeholder:text-[#040042]/30 focus-visible:ring-[#4A26ED]/30 focus-visible:border-[#4A26ED]"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <Label htmlFor="org" className="text-[#040042]/70 text-sm">
                Organization <span className="text-[#040042]/30 font-normal">(optional)</span>
              </Label>
              <Input
                id="org"
                type="text"
                placeholder="Acme Corp"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="h-11 text-sm bg-white border-[#040042]/15 text-[#040042] placeholder:text-[#040042]/30 focus-visible:ring-[#4A26ED]/30 focus-visible:border-[#4A26ED]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#040042]/70 text-sm">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="h-11 text-sm bg-white border-[#040042]/15 text-[#040042] placeholder:text-[#040042]/30 focus-visible:ring-[#4A26ED]/30 focus-visible:border-[#4A26ED]"
              />
            </div>

            {/* Intended Use */}
            <div className="space-y-1.5">
              <Label htmlFor="intended-use" className="text-[#040042]/70 text-sm">
                Intended Use <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="intended-use"
                  value={intendedUse}
                  onChange={(e) => { setIntendedUse(e.target.value); setError(null); }}
                  className="w-full h-11 rounded-md border border-[#040042]/15 bg-white px-3 py-2 text-sm text-[#040042] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/30 focus:border-[#4A26ED] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select intended use…</option>
                  {INTENDED_USE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#040042]/30 pointer-events-none" />
              </div>
            </div>

            {/* License Type */}
            <div className="space-y-1.5">
              <Label className="text-[#040042]/70 text-sm">
                License Type <span className="text-red-500">*</span>
              </Label>
              <div
                className={`grid gap-3 ${licenseOptions.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {licenseOptions.map(({ type, label, price }) => {
                  const active = selected === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelected(type)}
                      className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        active
                          ? "border-[#4A26ED] bg-[#4A26ED]/5 shadow-[0_0_20px_rgba(74,38,237,0.12)]"
                          : "border-[#040042]/10 hover:border-[#040042]/25 bg-white"
                      }`}
                    >
                      <p className="text-xs text-[#040042]/40 uppercase tracking-wider mb-1.5">
                        {label}
                      </p>
                      <p className="text-xl font-semibold text-[#040042]">
                        {price > 0 ? `$${price.toFixed(2)}` : "Free"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm px-1">{error}</p>
            )}

            {/* Free success inline */}
            {freeSuccess ? (
              <div className="rounded-xl border-2 border-green-500/30 bg-green-50 p-6 text-center space-y-3">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                <p className="text-sm font-semibold text-[#040042]">License Issued!</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono bg-white border border-green-200 rounded px-3 py-1.5 text-[#040042]">
                    {freeSuccess.license_key}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(freeSuccess.license_key); }}
                    className="p-1.5 rounded hover:bg-green-100 text-green-700"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[#040042]/40">Save this key — it's your proof of license.</p>
              </div>
            ) : (
              /* Submit */
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 bg-[#040042] text-white hover:bg-[#040042]/90 rounded-xl text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isPaid ? "Redirecting to payment…" : "Processing…"}
                  </>
                ) : isPaid ? (
                  `Pay $${selectedPrice.toFixed(2)} · Secure License`
                ) : (
                  "Secure Free License"
                )}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-[#040042]/25 mt-10">
            Powered by{" "}
            <span className="text-[#040042]/45 font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>
    </div>
  );
}
