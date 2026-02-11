import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Shield, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

const EXT_SUPABASE_URL = "https://djdzcciayennqchjgybx.supabase.co";
const EXT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E";

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

export default function LicensePublicCheckout() {
  const { id } = useParams<{ id: string }>();

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selected, setSelected] = useState<LicenseType | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch asset via PostgREST (anon, public SELECT policy)
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const url = `${EXT_SUPABASE_URL}/rest/v1/assets?select=id,title,description,human_price,ai_price,verification_status,licensing_enabled&id=eq.${id}&limit=1`;
        const res = await fetch(url, {
          headers: { apikey: EXT_ANON_KEY, Accept: "application/json" },
        });
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row || !row.licensing_enabled) {
          setNotFound(true);
        } else {
          setAsset(row);
          // Auto-select if only one price available
          const hasHuman = (row.human_price ?? 0) > 0;
          const hasAi = (row.ai_price ?? 0) > 0;
          if (hasHuman && !hasAi) setSelected("human");
          if (hasAi && !hasHuman) setSelected("ai");
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

    setSubmitting(true);
    try {
      const res = await fetch(
        `${EXT_SUPABASE_URL}/functions/v1/issue-license`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
          body: JSON.stringify({
            article_id: asset.id,
            buyer_email: email,
            license_type: selected,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "License issuance failed");
      }

      setLicenseKey(result.data.license_key);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasHuman = (asset?.human_price ?? 0) > 0;
  const hasAi = (asset?.ai_price ?? 0) > 0;
  const isVerified = asset?.verification_status === "verified";

  // — Loading —
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // — Not found / not licensable —
  if (notFound || !asset) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogo} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-muted-foreground text-sm">
          This content is not available for licensing.
        </p>
      </div>
    );
  }

  // — Success —
  if (licenseKey) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-4">
        <header className="pt-10 pb-16">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </header>
        <div className="w-full max-w-[560px] text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium mb-6">
            <Check className="h-4 w-4" />
            License Secured
          </div>

          <h1
            className="text-2xl md:text-3xl font-semibold text-foreground mb-3"
            style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}
          >
            {asset.title}
          </h1>

          <p className="text-muted-foreground text-sm mb-10">
            Your license key has been issued. A confirmation has been sent to
            your email and the author has been notified.
          </p>

          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              License Key
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-3xl md:text-4xl font-mono font-bold text-foreground tracking-[0.25em] leading-none">
                {licenseKey}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Powered by{" "}
            <span className="text-foreground font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>
    );
  }

  // — Main checkout —
  const licenseOptions: { type: LicenseType; label: string; price: number }[] =
    [];
  if (hasHuman)
    licenseOptions.push({
      type: "human",
      label: "Human License",
      price: asset.human_price!,
    });
  if (hasAi)
    licenseOptions.push({
      type: "ai",
      label: "AI Training License",
      price: asset.ai_price!,
    });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      <header className="pt-10 pb-12">
        <img src={opeddLogo} alt="Opedd" className="h-7" />
      </header>

      <div className="w-full max-w-[560px] animate-fade-in">
        {/* Asset identification */}
        <div className="text-center mb-10">
          {isVerified && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
              <Shield className="h-3 w-3" />
              Verified by Opedd
            </div>
          )}

          <h1
            className="text-2xl md:text-3xl font-semibold text-foreground leading-tight"
            style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}
          >
            {asset.title}
          </h1>

          {asset.description && (
            <p className="text-muted-foreground text-sm mt-3 line-clamp-2">
              {asset.description}
            </p>
          )}
        </div>

        {/* License cards — only show cards with price > 0 */}
        <div
          className={`grid gap-4 mb-8 ${licenseOptions.length === 2 ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"}`}
        >
          {licenseOptions.map(({ type, label, price }) => {
            const active = selected === type;
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={`rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                  active
                    ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--oxford-blue)/0.15)]"
                    : "border-border hover:border-muted-foreground/40 bg-transparent"
                }`}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {label}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  ${price.toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Email + submit */}
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="Licensee email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="h-12 text-sm bg-card border-border"
          />

          {error && (
            <p className="text-destructive text-sm px-1">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selected || !email || submitting}
            variant="oxford"
            size="lg"
            className="w-full h-12"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing…
              </>
            ) : (
              "Secure License"
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10 pb-10">
          Powered by{" "}
          <span className="text-foreground font-medium">Opedd Protocol</span>
        </p>
      </div>
    </div>
  );
}
