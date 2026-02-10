import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface AssetData {
  id: string;
  title: string;
  description: string | null;
  human_price: number | null;
  ai_price: number | null;
  verification_status: string | null;
}

type LicenseType = "human" | "ai";

export default function LicensePublicCheckout() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [asset, setAsset] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selected, setSelected] = useState<LicenseType | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, title, description, human_price, ai_price, verification_status")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setAsset(data);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!selected || !email || !asset) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-license`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            asset_id: asset.id,
            email,
            license_type: selected,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "License issuance failed");
      }

      setLicenseKey(result.license_key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
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

  const price = (type: LicenseType) =>
    type === "human" ? (asset?.human_price ?? 0) : (asset?.ai_price ?? 0);

  // — Loading / Error states —
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <img src={opeddLogo} alt="Opedd" className="h-7 opacity-60" />
        <p className="text-muted-foreground text-sm">This content is not available for licensing.</p>
      </div>
    );
  }

  const isVerified = asset.verification_status === "verified";

  // — Success state —
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
            Your license key has been issued. A confirmation has been sent to your email and the author has been notified.
          </p>

          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">License Key</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-xl md:text-2xl font-mono font-semibold text-foreground tracking-widest">
                {licenseKey}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Powered by <span className="text-foreground font-medium">Opedd Protocol</span>
          </p>
        </div>
      </div>
    );
  }

  // — Main checkout state —
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      {/* Logo */}
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

        {/* License selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {(["human", "ai"] as const).map((type) => {
            const active = selected === type;
            const label = type === "human" ? "Human License" : "AI Training License";
            const p = price(type);
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
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                <p className="text-2xl font-semibold text-foreground">
                  {p > 0 ? `$${p.toFixed(2)}` : "Free"}
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
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-sm bg-card border-border"
          />
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-10 pb-10">
          Powered by <span className="text-foreground font-medium">Opedd Protocol</span>
        </p>
      </div>
    </div>
  );
}
