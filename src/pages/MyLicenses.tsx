import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, CheckCircle, KeyRound, Search, Copy, Check, Download, FileText, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_SUPABASE_REST, EXT_ANON_KEY } from "@/lib/constants";
import { getLicenseTypeLabel, getLicenseTypeBadgeClass } from "@/lib/licenseTypes";
import { Spinner } from "@/components/ui/Spinner";

interface LicenseData {
  license_key: string;
  license_type: string;
  status: string;
  article_title: string;
  publisher_name: string;
  amount: number;
  created_at: string;
  buyer_email?: string;
  buyer_name?: string;
}

export default function MyLicenses() {
  // Email resend state
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Key lookup state
  const [licenseKey, setLicenseKey] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setEmailLoading(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.status === 429) {
        setEmailError("Too many requests. Please wait and try again.");
        return;
      }
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "Something went wrong");
      }
      setEmailSent(true);
    } catch (err: any) {
      setEmailError(err.message || "Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleKeyLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = licenseKey.trim();
    if (!trimmed) return;
    setKeyError(null);
    setKeyLoading(true);
    setLicense(null);
    try {
      const res = await fetch(
        `${EXT_SUPABASE_REST}/functions/v1/verify-license?key=${encodeURIComponent(trimmed)}`,
        { headers: { apikey: EXT_ANON_KEY } }
      );
      if (!res.ok) {
        if (res.status === 404) {
          setKeyError("License not found. Check the key format and try again.");
          return;
        }
        throw new Error("Verification failed");
      }
      const data = await res.json();
      setLicense({
        license_key: data.license_key || trimmed,
        license_type: data.license_type || "unknown",
        status: data.status || "active",
        article_title: data.article_title || data.title || "Untitled",
        publisher_name: data.publisher_name || "",
        amount: data.amount || 0,
        created_at: data.created_at || new Date().toISOString(),
        buyer_email: data.buyer_email,
        buyer_name: data.buyer_name,
      });
    } catch (err: any) {
      setKeyError(err.message || "Something went wrong. Please try again.");
    } finally {
      setKeyLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!license) return;
    navigator.clipboard.writeText(license.license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Canonical labels — sourced from src/lib/licenseTypes (handles legacy tokens).
  const licenseTypeLabel = (type: string) => getLicenseTypeLabel(type);

  const isRevoked = license?.status === "revoked";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/">
            <img src={opeddLogoColor} alt="Opedd" className="h-7" />
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Publisher login →
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-[640px]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">My Licenses</h1>
            <p className="text-sm text-gray-500 mt-1">
              Retrieve your purchased licenses, download certificates, and verify proof.
            </p>
          </div>

          {/* License card result */}
          {license && (
            <div className="mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card space-y-4">
                {/* Status + type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={
                    isRevoked
                      ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-50"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  }>
                    {isRevoked ? (
                      <><ShieldAlert size={12} className="mr-1" />Revoked</>
                    ) : (
                      <><ShieldCheck size={12} className="mr-1" />Active</>
                    )}
                  </Badge>
                  <Badge className={getLicenseTypeBadgeClass(license.license_type)}>
                    {licenseTypeLabel(license.license_type)}
                  </Badge>
                </div>

                {/* Article title */}
                <h2 className="text-lg font-bold text-gray-900">{license.article_title}</h2>
                {license.publisher_name && (
                  <p className="text-sm text-gray-500">{license.publisher_name}</p>
                )}

                {/* Revoked notice */}
                {isRevoked && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">
                      This license was revoked. Contact the publisher for more information.
                    </p>
                  </div>
                )}

                {/* Key */}
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-oxford bg-oxford-light px-3 py-1.5 rounded-lg flex-1 truncate">
                    {license.license_key}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                    title="Copy key"
                  >
                    {copiedKey ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Issued</p>
                    <p className="text-gray-900 font-medium">
                      {new Date(license.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Territory</p>
                    <p className="text-gray-900 font-medium">Worldwide</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <a
                    href={`${EXT_SUPABASE_REST}/functions/v1/certificate?key=${encodeURIComponent(license.license_key)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-900 transition-colors"
                  >
                    <Download size={14} /> Download Certificate
                  </a>
                  <a
                    href={`${EXT_SUPABASE_REST}/functions/v1/invoice?key=${encodeURIComponent(license.license_key)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-900 transition-colors"
                  >
                    <FileText size={14} /> Download Invoice
                  </a>
                </div>

                <Link
                  to={`/verify/${license.license_key}`}
                  className="inline-flex items-center gap-1.5 text-sm text-oxford hover:underline"
                >
                  <ExternalLink size={14} /> View verification proof →
                </Link>
              </div>

              <button
                onClick={() => { setLicense(null); setLicenseKey(""); setKeyError(null); }}
                className="text-sm text-gray-400 hover:text-gray-500 transition-colors mt-3 w-full text-center"
              >
                ← Look up another license
              </button>
            </div>
          )}

          {/* Two cards side by side */}
          {!license && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                {emailSent ? (
                  <div className="text-center space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">Check your inbox</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      We've sent all licenses associated with <strong>{email}</strong> to that address.
                    </p>
                    <button
                      onClick={() => { setEmailSent(false); setEmail(""); }}
                      className="text-sm text-oxford hover:underline font-medium"
                    >
                      Try a different email
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-oxford-light flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-oxford" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900">Get all my licenses</h2>
                        <p className="text-xs text-gray-500">We'll email them to you</p>
                      </div>
                    </div>
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <Input
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                        required
                      />
                      {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                      <Button type="submit" disabled={emailLoading || !email.trim()} className="w-full h-10">
                        {emailLoading ? (
                          <><Spinner size="md" className="mr-2" />Sending…</>
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>

              {/* Key lookup card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-oxford-light flex items-center justify-center shrink-0">
                    <KeyRound className="h-5 w-5 text-oxford" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Look up a license</h2>
                    <p className="text-xs text-gray-500">Enter your license key directly</p>
                  </div>
                </div>
                <form onSubmit={handleKeyLookup} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="OP-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => { setLicenseKey(e.target.value); setKeyError(null); }}
                    className="font-mono"
                    required
                  />
                  {keyError && <p className="text-sm text-red-500">{keyError}</p>}
                  <Button type="submit" disabled={keyLoading || !licenseKey.trim()} className="w-full h-10">
                    {keyLoading ? (
                      <><Spinner size="md" className="mr-2" />Looking up…</>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" />Look up</>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center border-t border-gray-200">
        <div className="flex items-center justify-center gap-4">
          <Link to="/verify" className="text-xs text-gray-400 hover:text-gray-500">Verify a license</Link>
          <span className="text-gray-200">·</span>
          <Link to="/licenses" className="text-xs text-gray-400 hover:text-gray-500">Advanced portal</Link>
          <span className="text-gray-200">·</span>
          <a href="mailto:support@opedd.com" className="text-xs text-gray-400 hover:text-gray-500">Support</a>
        </div>
      </div>
    </div>
  );
}
