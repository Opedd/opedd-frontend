import React, { useState } from "react";
import { ShieldCheck, Loader2, Mail, ArrowRight, Copy, Check, FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { Link } from "react-router-dom";

interface BuyerLicense {
  license_key: string;
  license_type: string;
  article_title: string;
  publisher_name: string;
  amount: number;
  created_at: string;
}

export default function Licenses() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "results">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<BuyerLicense[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/buyer-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ action: "send_otp", email: trimmed }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Request failed (${res.status})`); }
      setStep("otp");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to send code."); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/buyer-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ action: "verify_otp", email: email.trim(), otp }),
      });
      if (res.status === 401) { setError("Invalid or expired code. Please try again."); return; }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Verification failed (${res.status})`); }
      const data = await res.json();
      setLicenses(data.licenses ?? []);
      setStep("results");
    } catch (err) { if (!error) setError(err instanceof Error ? err.message : "Verification failed."); }
    finally { setLoading(false); }
  };

  const handleCopyKey = (key: string) => { navigator.clipboard.writeText(key); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/"><img src={opeddLogoColor} alt="Opedd" className="h-7" /></Link>
          <Link to="/login" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">Publisher login →</Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl max-w-[480px] w-full p-8">

          {step === "email" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-[#EEF0FD] rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-xl font-bold text-[#111827]">Look up your licenses</h1>
                <p className="text-sm text-[#6B7280] mt-1">Enter the email address you used to purchase a license.</p>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendCode()} placeholder="you@company.com" className="pl-10" />
                </div>
              </div>
              {error && <p className="text-sm text-[#EF4444]">{error}</p>}
              <Button onClick={handleSendCode} disabled={loading || !email.trim()} className="w-full h-11">
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Sending…</> : <>Send verification code<ArrowRight size={16} className="ml-2" /></>}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-[#111827]">Enter verification code</h1>
                <p className="text-sm text-[#6B7280] mt-1">We sent a 6-digit code to <strong className="text-[#111827]">{email}</strong></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="border-[#E5E7EB] text-[#111827]" />
                    <InputOTPSlot index={1} className="border-[#E5E7EB] text-[#111827]" />
                    <InputOTPSlot index={2} className="border-[#E5E7EB] text-[#111827]" />
                    <InputOTPSlot index={3} className="border-[#E5E7EB] text-[#111827]" />
                    <InputOTPSlot index={4} className="border-[#E5E7EB] text-[#111827]" />
                    <InputOTPSlot index={5} className="border-[#E5E7EB] text-[#111827]" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-[#EF4444] text-center">{error}</p>}
              <Button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full h-11">
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Verifying…</> : "Verify"}
              </Button>
              <button onClick={() => { setStep("email"); setOtp(""); setError(null); }} className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors w-full text-center">
                ← Use a different email
              </button>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-[#111827]">Your licenses</h1>
                <p className="text-sm text-[#6B7280] mt-1">{email}</p>
              </div>

              {licenses.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={36} className="text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#374151]">No licenses found for this email.</p>
                  <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-[320px] mx-auto">
                    If you made a purchase, make sure you're using the same email address you used at checkout.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {licenses.map((lic) => (
                    <div key={lic.license_key} className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[#111827] truncate flex-1">{lic.article_title}</p>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#4A26ED]">
                          {lic.license_type}
                        </span>
                      </div>
                      {lic.publisher_name && <p className="text-xs text-[#9CA3AF]">{lic.publisher_name}</p>}
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-[#4A26ED] bg-[#EEF0FD] px-2 py-1 rounded flex-1 truncate">
                          {lic.license_key}
                        </code>
                        <button onClick={() => handleCopyKey(lic.license_key)} className="text-[#9CA3AF] hover:text-[#111827] transition-colors" title="Copy key">
                          {copiedKey === lic.license_key ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                        <span>${lic.amount.toFixed(2)}</span>
                        <span>{new Date(lic.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <Link to={`/verify/${lic.license_key}`} className="text-xs text-[#4A26ED] hover:underline flex items-center gap-1">
                          <ExternalLink size={12} /> Verify
                        </Link>
                        <a href={`${EXT_SUPABASE_URL}/certificate?key=${encodeURIComponent(lic.license_key)}`} target="_blank" className="text-xs text-[#4A26ED] hover:underline flex items-center gap-1">
                          <Download size={12} /> Certificate
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => { setStep("email"); setEmail(""); setOtp(""); setLicenses([]); setError(null); }} className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors w-full text-center">
                ← Look up a different email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-[#9CA3AF]">
          Powered by <Link to="/" className="text-[#6B7280] hover:text-[#111827] transition-colors">Opedd Protocol</Link>
        </p>
      </div>
    </div>
  );
}