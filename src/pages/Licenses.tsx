import React, { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ShieldCheck, Loader2, Mail, ArrowRight, Copy, Check, FileText, ExternalLink, Download, Key, ChevronDown, ChevronUp, Trash2, Plus, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { getLicenseTypeLabel, getLicenseTypeBadgeClass } from "@/lib/licenseTypes";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { Link } from "react-router-dom";
import { formatUSD } from "@/lib/formatNumber";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/dashboard/EmptyState";

interface BuyerToken {
  id: string;
  name: string;
  token_preview: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface LicenseApiKeysProps {
  email: string;
  licenseKey: string;
}

function LicenseApiKeys({ email, licenseKey }: LicenseApiKeysProps) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<BuyerToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (action: string, extra: Record<string, string> = {}) => {
    const res = await fetch(`${EXT_SUPABASE_URL}/buyer-portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
      body: JSON.stringify({ action, email, license_key: licenseKey, ...extra }),
    });
    return res.json();
  };

  const loadTokens = async () => {
    setLoading(true); setError(null);
    try {
      const result = await call("list_tokens");
      if (result.success) setTokens(result.data.tokens || []);
      else setError(result.error || "Failed to load tokens");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    if (!open) loadTokens();
    setOpen((v) => !v);
    setJustCreated(null);
  };

  const handleCreate = async () => {
    setCreating(true); setError(null);
    try {
      const result = await call("create_token", { name: newName.trim() || "API Key" });
      if (result.success) {
        setJustCreated(result.data.token);
        setNewName("");
        await loadTokens();
      } else {
        setError(result.error || "Failed to create token");
      }
    } catch { setError("Network error"); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (tokenId: string) => {
    setRevoking(tokenId); setError(null);
    try {
      const result = await call("revoke_token", { token_id: tokenId });
      if (result.success) await loadTokens();
      else setError(result.error || "Failed to revoke");
    } catch { setError("Network error"); }
    finally { setRevoking(null); }
  };

  const handleCopyToken = () => {
    if (!justCreated) return;
    navigator.clipboard.writeText(justCreated);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const activeTokens = tokens.filter((t) => !t.revoked_at);

  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
      >
        <Key size={12} />
        API Keys {activeTokens.length > 0 && `(${activeTokens.length})`}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Just-created token — show once */}
          {justCreated && (
            <div className="bg-emerald-50 border border-emerald-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-600">Token created — copy it now. You won't see it again.</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-emerald-600 bg-white border border-emerald-500/20 rounded px-2 py-1 flex-1 truncate">
                  {justCreated}
                </code>
                <button onClick={handleCopyToken} className="shrink-0 text-emerald-500 hover:text-emerald-600">
                  {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* Token list */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Spinner size="sm" /> Loading…
            </div>
          ) : activeTokens.length === 0 ? (
            <p className="text-xs text-gray-400">No active API keys.</p>
          ) : (
            <div className="space-y-1.5">
              {activeTokens.map((t) => (
                <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{t.name}</p>
                    <code className="text-[10px] font-mono text-gray-400">{t.token_preview}</code>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {t.last_used_at ? `Used ${new Date(t.last_used_at).toLocaleDateString()}` : "Never used"}
                  </span>
                  <button
                    onClick={() => handleRevoke(t.id)}
                    disabled={revoking === t.id}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Revoke"
                  >
                    {revoking === t.id ? <Spinner size="sm" /> : <Trash2 size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new token */}
          {activeTokens.length < 5 && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Key name (optional)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              />
              <Button size="sm" onClick={handleCreate} disabled={creating} className="h-7 px-2 text-xs shrink-0">
                {creating ? <Spinner size="sm" /> : <Plus size={11} />}
              </Button>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

interface ArchiveWebhookProps {
  licenseKey: string;
}

function ArchiveWebhook({ licenseKey }: ArchiveWebhookProps) {
  const [open, setOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!webhookUrl.trim()) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/register-buyer-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ license_key: licenseKey, webhook_url: webhookUrl.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setSecret(result.data.webhook_secret);
        setWebhookUrl("");
      } else {
        setError(result.error || "Failed to register webhook");
      }
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="mt-2 border-t border-gray-200 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
      >
        <Webhook size={12} />
        Content Webhook
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {secret ? (
            <div className="bg-emerald-50 border border-emerald-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-600">Webhook registered. Copy your signing secret — it won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-mono text-emerald-600 bg-white border border-emerald-500/20 rounded px-2 py-1 flex-1 truncate">
                  {secret}
                </code>
                <button onClick={handleCopySecret} className="shrink-0 text-emerald-500 hover:text-emerald-600">
                  {copiedSecret ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500">Verify incoming requests using the <code className="font-mono">X-Opedd-Signature</code> header with HMAC-SHA256.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">Receive a webhook when new content is published under your archive license.</p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://yourserver.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && !saving && handleRegister()}
                />
                <Button size="sm" onClick={handleRegister} disabled={saving || !webhookUrl.trim()} className="h-7 px-2 text-xs shrink-0">
                  {saving ? <Spinner size="sm" /> : "Save"}
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

interface BuyerLicense {
  license_key: string;
  license_type: string;
  article_title: string;
  publisher_name: string;
  amount: number;
  created_at: string;
}

export default function Licenses() {
  useDocumentTitle("Look Up Licenses — Opedd");
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/"><img src={opeddLogoColor} alt="Opedd" className="h-7" /></Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Publisher login →</Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-gray-200 shadow-card rounded-xl max-w-[480px] w-full p-8">

          {step === "email" && (
            <div className="space-y-6">
              <div>
                <div className="w-12 h-12 bg-oxford-light rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck size={24} className="text-oxford" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Look up your licenses</h1>
                <p className="text-sm text-gray-500 mt-1">Enter the email address you used to purchase a license.</p>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendCode()} placeholder="you@company.com" className="pl-10" />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button onClick={handleSendCode} disabled={loading || !email.trim()} className="w-full h-11">
                {loading ? <><Spinner size="md" className="mr-2" />Sending…</> : <>Send verification code<ArrowRight size={16} className="ml-2" /></>}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Enter verification code</h1>
                <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to <strong className="text-gray-900">{email}</strong></p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="border-gray-200 text-gray-900" />
                    <InputOTPSlot index={1} className="border-gray-200 text-gray-900" />
                    <InputOTPSlot index={2} className="border-gray-200 text-gray-900" />
                    <InputOTPSlot index={3} className="border-gray-200 text-gray-900" />
                    <InputOTPSlot index={4} className="border-gray-200 text-gray-900" />
                    <InputOTPSlot index={5} className="border-gray-200 text-gray-900" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full h-11">
                {loading ? <><Spinner size="md" className="mr-2" />Verifying…</> : "Verify"}
              </Button>
              <button onClick={() => { setStep("email"); setOtp(""); setError(null); }} className="text-sm text-gray-400 hover:text-gray-500 transition-colors w-full text-center">
                ← Use a different email
              </button>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Your licenses</h1>
                <p className="text-sm text-gray-500 mt-1">{email}</p>
              </div>

              {licenses.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No licenses found for this email"
                  description="If you made a purchase, make sure you're using the same email address you used at checkout."
                />
              ) : (
                <div className="space-y-3">
                  {licenses.map((lic) => (
                    <div key={lic.license_key} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate flex-1">{lic.article_title}</p>
                        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${getLicenseTypeBadgeClass(lic.license_type)}`}>
                          {getLicenseTypeLabel(lic.license_type, "short")}
                        </span>
                      </div>
                      {lic.publisher_name && <p className="text-xs text-gray-400">{lic.publisher_name}</p>}
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-oxford bg-oxford-light px-2 py-1 rounded flex-1 truncate">
                          {lic.license_key}
                        </code>
                        <button onClick={() => handleCopyKey(lic.license_key)} className="text-gray-400 hover:text-gray-900 transition-colors" title="Copy key">
                          {copiedKey === lic.license_key ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatUSD(lic.amount)}</span>
                        <span>{new Date(lic.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <Link to={`/verify/${lic.license_key}`} className="text-xs text-oxford hover:underline flex items-center gap-1">
                          <ExternalLink size={12} /> Verify
                        </Link>
                        <a href={`${EXT_SUPABASE_URL}/certificate?key=${encodeURIComponent(lic.license_key)}`} target="_blank" className="text-xs text-oxford hover:underline flex items-center gap-1">
                          <Download size={12} /> Certificate
                        </a>
                      </div>
                      <LicenseApiKeys email={email} licenseKey={lic.license_key} />
                      {lic.license_type === "archive" && (
                        <ArchiveWebhook licenseKey={lic.license_key} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => { setStep("email"); setEmail(""); setOtp(""); setLicenses([]); setError(null); }} className="text-sm text-gray-400 hover:text-gray-500 transition-colors w-full text-center">
                ← Look up a different email
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-gray-400">
          Powered by <Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors">Opedd Protocol</Link>
        </p>
      </div>
    </div>
  );
}