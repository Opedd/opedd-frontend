import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  X,
  Copy,
  Check,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Code,
} from "lucide-react";

interface VerifyOwnershipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: {
    id: string;
    name: string;
    platform: string | null;
    url?: string | null;
    feed_url?: string | null;
    verification_token?: string | null;
  } | null;
  registrationMode?: boolean;
  onVerified?: () => void;
}

const generateVerificationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const code = Array.from(bytes).map(b => chars[b % chars.length]).join("");
  return `OPEDD-${code}`;
};

type Step = 1 | 2;
type VerifyResult = "idle" | "loading" | "success" | "failed";

// Hosted platforms where publishers cannot add DNS TXT records
const HOSTED_DOMAINS = ["substack.com", "beehiiv.com", "ghost.io", "medium.com", "wordpress.com"];

function isHostedPlatform(platform: string | null, siteUrl?: string | null): boolean {
  const p = (platform || "").toLowerCase();
  if (p === "substack" || p === "beehiiv") return true;
  if (siteUrl) {
    try {
      const hostname = new URL(siteUrl).hostname.toLowerCase();
      return HOSTED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
    } catch { /* ignore */ }
  }
  return false;
}

const getPlatformInstructions = (platform: string | null): string => {
  switch ((platform || "").toLowerCase()) {
    case "substack":
      return "Go to your Substack Dashboard → Settings → Publication details. Paste the code anywhere in your About section, then Save.";
    case "ghost":
      return "Go to your Ghost Admin → Settings → General. Paste the code into your Site description, then Save.";
    case "wordpress":
      return "Go to your WordPress Admin → Settings → General. Paste the code into the Tagline field, then Save.";
    case "beehiiv":
      return "Go to your beehiiv Dashboard → Settings → Publication. Paste the code into your About section, then Save.";
    default:
      return "Paste the code anywhere on your website's About page or homepage where it's publicly visible.";
  }
};

export function VerifyOwnershipModal({
  open,
  onOpenChange,
  source,
  registrationMode = false,
  onVerified,
}: VerifyOwnershipModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>("idle");

  React.useEffect(() => {
    if (open && source) {
      setStep(1);
      setToken(source.verification_token || null);
      setCopied(false);
      setVerifyResult("idle");
    }
  }, [open, source]);

  if (!source) return null;

  const displayToken = token || source.verification_token || "—";
  const siteUrl = source.url || source.feed_url || null;
  const hosted = isHostedPlatform(source.platform, siteUrl);
  const platformLower = (source.platform || "").toLowerCase();
  const showMetaOption = platformLower !== "substack" && platformLower !== "beehiiv";

  // Derive domain for DNS TXT instructions
  let domainForDns = "";
  try {
    if (siteUrl) domainForDns = new URL(siteUrl).hostname;
  } catch { /* ignore */ }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const newToken = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await (supabase as any)
        .from("content_sources")
        .update({ sync_status: "pending", verification_token: newToken, verification_status: "pending", verification_token_expires_at: expiresAt } as any)
        .eq("id", source.id);
      if (error) throw error;
      setToken(newToken);
      toast({ title: "Token Regenerated", description: "A new verification code has been generated." });
    } catch (err: any) {
      toast({ title: "Regeneration Failed", description: err?.message || "Could not regenerate token.", variant: "destructive" });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleVerify = async () => {
    setVerifyResult("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const res = await fetch(`${EXT_SUPABASE_URL}/verify-source`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          source_id: source.id,
          // Non-hosted platforms: DNS TXT is the default (backend also auto-detects)
          ...(hosted ? {} : { method: "dns_txt" }),
        }),
      });
      const result = await res.json();

      if (result.success && result.data?.verified) {
        setVerifyResult("success");
        onVerified?.();
      } else {
        setVerifyResult("failed");
        if (result.data?.message) {
          toast({ title: "Not Verified", description: result.data.message, variant: "destructive" });
        }
      }
    } catch {
      setVerifyResult("failed");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const stepIndicator = (
    <div className="flex items-center gap-2 justify-center mb-4">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            s === step
              ? "bg-oxford text-white"
              : s < step
              ? "bg-emerald-500 text-white"
              : "bg-slate-200 text-slate-500"
          }`}>
            {s < step ? <Check size={14} /> : s}
          </div>
          {s < 2 && (
            <div className={`w-8 h-0.5 rounded ${s < step ? "bg-emerald-500" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      {stepIndicator}
      <div className="text-center">
        <h3 className="text-base font-bold text-navy-deep">Verify your publication</h3>
        <p className="text-sm text-slate-500 mt-1">
          Add this code to your publication so we can confirm ownership.
        </p>
      </div>

      {/* Token display */}
      <div className="bg-navy-deep rounded-xl p-5 border border-slate-700">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-medium">Verification Code</p>
        <div className="flex items-center justify-between gap-3">
          <code className="text-2xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] leading-none">
            {displayToken}
          </code>
          <Button
            size="sm"
            onClick={() => handleCopy(displayToken)}
            className="bg-white/10 hover:bg-white/20 text-white border-none h-9 px-3 flex-shrink-0"
          >
            {copied ? <><Check size={14} className="mr-1.5" />Copied</> : <><Copy size={14} className="mr-1.5" />Copy</>}
          </Button>
        </div>
      </div>

      <button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="text-xs text-oxford hover:text-oxford-dark font-medium flex items-center gap-1.5 mx-auto transition-colors disabled:opacity-50"
      >
        {isRegenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        Regenerate Code
      </button>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Platform instructions or DNS instructions */}
      {hosted ? (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-navy-deep leading-relaxed">
              {getPlatformInstructions(source.platform)}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                <Badge variant="outline" className="text-[10px] px-2 py-0 bg-oxford/10 text-oxford border-oxford/20 font-semibold">Option A</Badge>
                <span className="text-xs font-semibold text-navy-deep">Visible — About / Bio</span>
              </div>
              <div className="p-3">
                <div className="bg-navy-deep rounded-lg p-3 flex items-center justify-between gap-3">
                  <code className="text-xs text-emerald-400 font-mono truncate">Verify with Opedd: {displayToken}</code>
                  <button onClick={() => handleCopy(`Verify with Opedd: ${displayToken}`)} aria-label="Copy visible verification snippet" className="text-white/60 hover:text-white flex-shrink-0">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {showMetaOption && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                  <Badge variant="outline" className="text-[10px] px-2 py-0 bg-teal-50 text-teal-700 border-teal-200 font-semibold">Option B</Badge>
                  <span className="text-xs font-semibold text-navy-deep">Hidden — Meta Tag</span>
                </div>
                <div className="p-3">
                  <div className="bg-navy-deep rounded-lg p-3 flex items-center justify-between gap-3">
                    <code className="text-xs text-emerald-400 font-mono truncate">{`<meta name="opedd-verification" content="${displayToken}" />`}</code>
                    <button onClick={() => handleCopy(`<meta name="opedd-verification" content="${displayToken}" />`)} aria-label="Copy verification meta tag" className="text-white/60 hover:text-white flex-shrink-0">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* DNS TXT verification for custom domains */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-navy-deep">Add a DNS TXT record to your domain</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log in to your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.) and add the following TXT record. DNS changes typically propagate within 5 minutes.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-navy-deep">Record Type</span>
              </div>
              <div className="p-3">
                <div className="bg-navy-deep rounded-lg p-3">
                  <code className="text-xs text-emerald-400 font-mono">TXT</code>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-navy-deep">Host / Name</span>
              </div>
              <div className="p-3">
                <div className="bg-navy-deep rounded-lg p-3 flex items-center justify-between gap-3">
                  <code className="text-xs text-emerald-400 font-mono">{domainForDns || "@"}</code>
                  <button onClick={() => handleCopy(domainForDns || "@")} aria-label="Copy DNS host" className="text-white/60 hover:text-white flex-shrink-0">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-navy-deep">Value</span>
              </div>
              <div className="p-3">
                <div className="bg-navy-deep rounded-lg p-3 flex items-center justify-between gap-3">
                  <code className="text-xs text-emerald-400 font-mono tracking-wider">{displayToken}</code>
                  <button onClick={() => handleCopy(displayToken)} aria-label="Copy DNS TXT value" className="text-white/60 hover:text-white flex-shrink-0">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      {stepIndicator}
      <div className="text-center space-y-4 py-4">
        {verifyResult === "loading" && (
          <>
            <Loader2 size={48} className="animate-spin text-oxford mx-auto" />
            <div>
              <h3 className="text-base font-bold text-navy-deep">Checking your publication…</h3>
              <p className="text-sm text-slate-500 mt-1">We're looking for your verification code.</p>
            </div>
          </>
        )}

        {verifyResult === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-deep">Ownership Verified!</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your source <strong>{source.name}</strong> is now fully verified and licensing is active.
              </p>
              <div className="mt-4 rounded-lg bg-oxford/5 border border-oxford/15 px-4 py-3 text-left">
                <p className="text-xs font-semibold text-oxford uppercase tracking-wide mb-1">Next step</p>
                <p className="text-sm text-slate-600">Embed the Opedd widget on your articles so buyers can license your content directly.</p>
              </div>
            </div>
          </>
        )}

        {verifyResult === "failed" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle size={36} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-deep">Code not found yet</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                We couldn't find the code on your publication yet. Make sure you've saved your changes and the code is visible on your About page. You can try again in a moment.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="bg-white border-none text-navy-deep sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-navy-deep px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-violet-400" />
              <div>
                <h1 className="text-white font-bold text-base leading-tight">Verify Ownership</h1>
                <p className="text-violet-400 text-sm truncate max-w-[250px]">{source.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-3">
          {step === 1 && (
            <>
              {registrationMode && (
                <Button variant="outline" onClick={handleClose} className="flex-1 h-11">
                  Verify Later
                </Button>
              )}
              <Button
                onClick={() => { setStep(2); handleVerify(); }}
                className={`${registrationMode ? 'flex-1' : 'w-full'} h-11 bg-gradient-to-r from-oxford to-violet-600 hover:from-oxford-dark hover:to-violet-700 text-white font-semibold`}
              >
                I've Added It
              </Button>
            </>
          )}

          {step === 2 && verifyResult === "success" && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11"
              >
                Done
              </Button>
              <Button
                onClick={() => { handleClose(); navigate("/distribution"); }}
                className="flex-1 h-11 bg-oxford hover:bg-oxford-dark text-white font-semibold gap-2"
              >
                <Code size={15} />
                Embed Widget
              </Button>
            </>
          )}

          {step === 2 && verifyResult === "failed" && (
            <>
              <Button variant="outline" onClick={handleClose} className="flex-1 h-11">
                Close
              </Button>
              <Button
                onClick={() => { setVerifyResult("idle"); handleVerify(); }}
                className="flex-1 h-11 bg-gradient-to-r from-oxford to-violet-600 hover:from-oxford-dark hover:to-violet-700 text-white font-semibold"
              >
                <RefreshCw size={14} className="mr-1.5" />
                Try Again
              </Button>
            </>
          )}

          {step === 2 && verifyResult === "loading" && (
            <Button disabled className="w-full h-11 bg-slate-200 text-slate-500">
              <Loader2 size={16} className="animate-spin mr-2" />
              Verifying…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
