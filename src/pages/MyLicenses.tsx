import { useState } from "react";
import { EXT_SUPABASE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Loader2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const BUYER_PORTAL_URL = `${EXT_SUPABASE_URL}/buyer-portal`;
const CERT_URL = `${EXT_SUPABASE_URL}/certificate`;

interface BuyerLicense {
  license_key: string;
  article_title: string;
  license_type: string;
  created_at: string;
}

type Step = "email" | "otp" | "results";

export default function MyLicenses() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<BuyerLicense[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BUYER_PORTAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BUYER_PORTAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setLicenses(data.data?.licenses || []);
        setStep("results");
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({ title: "Copied!", description: "License key copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <div className="w-full max-w-lg">
          {/* Email step */}
          {step === "email" && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F0EBFF] mb-4">
                  <Mail size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-3xl font-bold text-[#040042]">Retrieve your licenses</h1>
                <p className="text-sm mt-2 text-slate-500">
                  Enter the email you used at checkout. We'll send a verification code.
                </p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="mt-1"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-[#4A26ED] hover:bg-[#3B1FD4] text-white">
                  {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {loading ? "Sending..." : "Send me my licenses"}
                </Button>
              </form>
            </div>
          )}

          {/* OTP step */}
          {step === "otp" && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#F0EBFF] mb-4">
                  <ShieldCheck size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-3xl font-bold text-[#040042]">Check your inbox</h1>
                <p className="text-sm mt-2 text-slate-500">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium text-slate-700">Verification code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                    className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-[#4A26ED] hover:bg-[#3B1FD4] text-white">
                  {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {loading ? "Verifying..." : "Verify & retrieve"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                  className="w-full text-sm text-slate-400 hover:text-[#4A26ED] underline"
                >
                  Use a different email
                </button>
              </form>
            </div>
          )}

          {/* Results step */}
          {step === "results" && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
                  <KeyRound size={24} className="text-emerald-600" />
                </div>
                <h1 className="text-3xl font-bold text-[#040042]">Your licenses</h1>
                <p className="text-sm mt-2 text-slate-500">{email}</p>
              </div>

              {licenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No licenses found for this email.</p>
                  <p className="text-sm text-slate-400 mt-1">
                    If you made a purchase, make sure you're using the same email address you used at checkout.
                  </p>
                  <button
                    onClick={() => { setStep("email"); setEmail(""); setOtp(""); }}
                    className="mt-4 text-sm text-[#4A26ED] underline hover:text-[#3B1FD4]"
                  >
                    Try a different email
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {licenses.map((lic) => (
                    <div
                      key={lic.license_key}
                      className="bg-white border border-slate-200 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#040042] text-sm truncate">{lic.article_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0EBFF] text-[#4A26ED] font-medium capitalize">
                              {lic.license_type}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(lic.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-slate-600 truncate flex-1">{lic.license_key}</code>
                        <button
                          onClick={() => handleCopyKey(lic.license_key)}
                          className="text-slate-400 hover:text-[#4A26ED] flex-shrink-0"
                        >
                          {copiedKey === lic.license_key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <a
                        href={`${CERT_URL}?key=${lic.license_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#4A26ED] hover:underline font-medium"
                      >
                        <Download size={12} />
                        Download Certificate
                      </a>
                    </div>
                  ))}

                  <button
                    onClick={() => { setStep("email"); setEmail(""); setOtp(""); setLicenses([]); }}
                    className="w-full mt-4 text-sm text-slate-400 hover:text-[#4A26ED] underline"
                  >
                    Look up another email
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
