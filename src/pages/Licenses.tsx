import React, { useState } from "react";
import { FileText, Loader2, Mail, ArrowRight, Download, ExternalLink, Check, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import opeddLogo from "@/assets/opedd-logo.png";
import { Link } from "react-router-dom";

interface BuyerLicense {
  id: string;
  article_title: string;
  license_type: string;
  created_at: string;
  amount: number;
  license_key: string;
}

export default function Licenses() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "results">("email");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [licenses, setLicenses] = useState<BuyerLicense[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setIsSending(true);
    // Placeholder: will call buyer-portal edge function
    setTimeout(() => {
      setIsSending(false);
      setStep("otp");
    }, 1000);
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setIsVerifying(true);
    // Placeholder: will call buyer-portal edge function with OTP
    setTimeout(() => {
      setIsVerifying(false);
      setLicenses([]); // Empty state for now
      setStep("results");
    }, 1000);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/">
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
          <Link to="/login" className="text-sm text-[#4A26ED] font-medium hover:underline">
            Publisher login →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm max-w-[480px] w-full p-8">

          {step === "email" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-[#4A26ED]/10 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck size={24} className="text-[#4A26ED]" />
                </div>
                <h1 className="text-xl font-bold text-[#111827]">Look up your licenses</h1>
                <p className="text-sm text-[#6B7280] mt-1">
                  Enter the email address you used to purchase a license.
                </p>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    placeholder="you@company.com"
                    className="pl-10 h-11 border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <Button
                onClick={handleSendCode}
                disabled={isSending || !email.trim()}
                className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1FD4] text-white font-semibold rounded-lg"
              >
                {isSending ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Sending...</>
                ) : (
                  <>Send verification code<ArrowRight size={16} className="ml-2" /></>
                )}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-[#111827]">Enter verification code</h1>
                <p className="text-sm text-[#6B7280] mt-1">
                  We sent a 6-digit code to <strong className="text-[#111827]">{email}</strong>
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerify}
                disabled={isVerifying || otp.length < 6}
                className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1FD4] text-white font-semibold rounded-lg"
              >
                {isVerifying ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Verifying...</>
                ) : (
                  "Verify"
                )}
              </Button>
              <button
                onClick={() => { setStep("email"); setOtp(""); }}
                className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors w-full text-center"
              >
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
                  <p className="text-sm font-medium text-[#6B7280]">No licenses found for this email address.</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    If you recently purchased a license, it may take a few minutes to appear.
                  </p>
                </div>
              ) : (
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                        <th className="text-xs font-medium text-[#6B7280] uppercase tracking-wide text-left py-2.5 px-3">Content</th>
                        <th className="text-xs font-medium text-[#6B7280] uppercase tracking-wide text-left py-2.5 px-3">Type</th>
                        <th className="text-xs font-medium text-[#6B7280] uppercase tracking-wide text-left py-2.5 px-3">Amount</th>
                        <th className="text-xs font-medium text-[#6B7280] uppercase tracking-wide text-right py-2.5 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((lic) => (
                        <tr key={lic.id} className="border-b border-[#F3F4F6] last:border-0">
                          <td className="py-2.5 px-3">
                            <p className="text-sm font-medium text-[#111827] truncate max-w-[180px]">{lic.article_title}</p>
                            <p className="text-xs text-[#9CA3AF]">{new Date(lic.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-xs font-medium text-[#6B7280] capitalize">{lic.license_type}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-sm font-semibold text-[#111827]">${lic.amount.toFixed(2)}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleCopyKey(lic.license_key)}
                                className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4A26ED] transition-colors"
                                title="Copy license key"
                              >
                                {copiedKey === lic.license_key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                              <a
                                href={`${EXT_SUPABASE_URL}/functions/v1/certificate?key=${encodeURIComponent(lic.license_key)}`}
                                target="_blank"
                                className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4A26ED] transition-colors"
                                title="Download certificate"
                              >
                                <Download size={14} />
                              </a>
                              <a
                                href={`/verify/${lic.license_key}`}
                                className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4A26ED] transition-colors"
                                title="Verify license"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => { setStep("email"); setEmail(""); setOtp(""); setLicenses([]); }}
                className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors w-full text-center"
              >
                ← Look up a different email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E5E7EB] bg-white px-6 py-4 text-center">
        <p className="text-xs text-[#9CA3AF]">
          Powered by <a href="/" className="text-[#4A26ED] hover:underline">Opedd Protocol</a>
        </p>
      </div>
    </div>
  );
}
