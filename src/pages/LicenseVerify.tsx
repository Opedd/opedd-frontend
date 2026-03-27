import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Shield, Check, Copy, Loader2, ExternalLink, AlertTriangle, Search, Download, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import opeddLogoColor from "@/assets/opedd-logo.png";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";

interface BlockchainProof {
  registered: boolean;
  valid: boolean;
  explorer_url: string;
  contract_address: string;
}

interface LicenseData {
  license_key: string;
  status: "completed" | "refunded" | "expired";
  license_type: "human" | "ai" | "archive";
  license_type_label: string;
  intended_use: string | null;
  intended_use_label: string | null;
  rights: string;
  licensee: { name: string | null; organization: string | null; email: string };
  content: { title: string; description: string | null; source_url: string | null; publisher: string };
  amount: number;
  currency: string;
  issued_at: string;
  valid_from?: string | null;
  valid_until?: string | null;
  is_expired?: boolean;
  machine_readable?: object;
  blockchain_proof?: BlockchainProof | null;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 border-b border-[#F3F4F6] pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-[#9CA3AF] uppercase tracking-wider sm:w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#111827]">{children}</span>
    </div>
  );
}

export default function LicenseVerify() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  useDocumentTitle("Verify License — Opedd");

  const [data, setData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupKey, setLookupKey] = useState(key || "");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (!key) { setLoading(false); return; }
    setLoading(true); setNotFound(false); setData(null); setLookupKey(key);
    (async () => {
      try {
        const res = await fetch(`${EXT_SUPABASE_URL}/verify-license?key=${encodeURIComponent(key)}`, { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } });
        const result = await res.json();
        if (!res.ok || !result.success) { setNotFound(true); } else { setData(result.data); }
      } catch { setNotFound(true); }
      setLoading(false);
    })();
  }, [key]);

  const handleCopyKey = () => { if (!data) return; navigator.clipboard.writeText(data.license_key); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); };
  const handleCopyJson = () => { if (!data?.machine_readable) return; navigator.clipboard.writeText(JSON.stringify(data.machine_readable, null, 2)); setCopiedJson(true); setTimeout(() => setCopiedJson(false), 2000); };

  const handleRegisterWebhook = async () => {
    if (!data || !webhookUrl.trim()) return;
    setWebhookLoading(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/register-buyer-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ license_key: data.license_key, webhook_url: webhookUrl.trim() }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Registration failed");
      setWebhookSecret(result.data.webhook_secret);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Webhook registration failed", description: err?.message || "Could not register webhook. Check the URL and try again." });
    } finally { setWebhookLoading(false); }
  };

  const handleLookup = () => { const trimmed = lookupKey.trim(); if (trimmed) navigate(`/verify/${encodeURIComponent(trimmed)}`); };
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#4A26ED]" />
      </div>
    );
  }

  if (!key) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
        <div className="px-6 py-5 bg-white border-b border-[#E5E7EB]">
          <img src={opeddLogoColor} alt="Opedd" className="h-7" />
        </div>
        <div className="flex-1 flex items-start justify-center px-4 pt-20 pb-12">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF0FD] text-[#4A26ED] px-4 py-1.5 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Verify a License
            </div>
            <h1 className="text-2xl font-bold text-[#111827] mb-2">License Verification</h1>
            <p className="text-[#6B7280] text-sm mb-8 max-w-sm mx-auto">
              Paste a license key below to verify its authenticity against the Opedd registry.
            </p>
            <div className="flex gap-2">
              <Input
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="OP-XXXX-XXXX"
                className="h-10 font-mono"
              />
              <Button onClick={handleLookup} disabled={!lookupKey.trim()} className="h-10 px-5 shrink-0">
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-10">
              Powered by <span className="text-[#6B7280] font-medium">Opedd Protocol</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
        <div className="px-6 py-5 bg-white border-b border-[#E5E7EB]">
          <img src={opeddLogoColor} alt="Opedd" className="h-7" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF2F2] text-[#DC2626] px-4 py-1.5 text-sm font-medium mb-6">
              <AlertTriangle className="h-4 w-4" />
              License Not Found
            </div>
            <p className="text-[#6B7280] text-sm mb-8 max-w-sm mx-auto">
              The key you entered does not match any record in the Opedd registry.
            </p>
            <div className="flex gap-2">
              <Input
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="OP-XXXX-XXXX"
                className="h-10 font-mono"
              />
              <Button onClick={handleLookup} className="h-10 px-5 shrink-0">
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-10">
              Powered by <span className="text-[#6B7280] font-medium">Opedd Protocol</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRevoked = data.status === "refunded";
  const bp = data.blockchain_proof;

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <div className="px-6 py-5 bg-white border-b border-[#E5E7EB]">
        <img src={opeddLogoColor} alt="Opedd" className="h-7" />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[640px] space-y-6 animate-fade-in">
          {/* Status Badge */}
          <div className="text-center">
            {isRevoked ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FEF2F2] text-[#DC2626] px-4 py-1.5 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                License Revoked
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] text-[#059669] px-4 py-1.5 text-sm font-medium">
                <Check className="h-4 w-4" />
                License Verified
              </div>
            )}
          </div>

          {/* License Key */}
          <div className="text-center">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-2">License Key</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-xl md:text-2xl font-mono font-bold text-[#4A26ED] bg-[#EEF0FD] px-4 py-2 rounded-lg tracking-[0.15em] leading-none">
                {data.license_key}
              </code>
              <button onClick={handleCopyKey} className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors text-[#9CA3AF] hover:text-[#111827]">
                {copiedKey ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Details Card */}
          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-6 space-y-4">
              <DetailRow label="Content">
                {data.content.source_url ? (
                  <a href={data.content.source_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline inline-flex items-center gap-1.5 text-[#111827]">
                    {data.content.title}
                    <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  </a>
                ) : (
                  <span className="font-medium">{data.content.title}</span>
                )}
              </DetailRow>
              <DetailRow label="Publisher">{data.content.publisher}</DetailRow>
              <DetailRow label="Licensed To">
                {data.licensee.name ? `${data.licensee.name}${data.licensee.organization ? ` (${data.licensee.organization})` : ""}` : data.licensee.email}
              </DetailRow>
              <DetailRow label="License Type">{data.license_type_label}</DetailRow>
              {data.intended_use_label && <DetailRow label="Intended Use">{data.intended_use_label}</DetailRow>}
              <DetailRow label="Amount">${data.amount.toFixed(2)}</DetailRow>
              <DetailRow label="Issued">{formatDate(data.issued_at)}</DetailRow>
            </CardContent>
          </Card>

          {/* Rights */}
          <div className="rounded-xl border border-[#3B82F6]/20 bg-[#EFF6FF] p-5">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-[#3B82F6] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#3B82F6] uppercase tracking-wider font-medium mb-1.5">Rights Summary</p>
                <p className="text-sm text-[#111827] leading-relaxed">{data.rights}</p>
              </div>
            </div>
          </div>

          {/* Blockchain Proof */}
          {bp && (
            <div className="rounded-xl border border-[#4A26ED]/20 bg-[#EEF0FD] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-[#4A26ED]" />
                <p className="text-xs text-[#4A26ED] uppercase tracking-wider font-medium">On-Chain Proof</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bp.registered ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                  <Check className="h-3 w-3" />
                  Registered on Tempo
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bp.valid ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
                  {bp.valid ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {bp.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              {bp.explorer_url && (
                <a href={bp.explorer_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#4A26ED] hover:underline">
                  View on Tempo Explorer <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {bp.contract_address && (
                <p className="text-xs text-[#9CA3AF] font-mono break-all">Contract: {bp.contract_address}</p>
              )}
            </div>
          )}

          {/* Machine-Readable License */}
          {data.machine_readable && (
            <div className="rounded-xl border border-[#10B981]/20 bg-[#ECFDF5] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#059669] uppercase tracking-wider font-medium">Machine-Readable License (license.json)</p>
                <button onClick={handleCopyJson} className="p-1.5 rounded-md hover:bg-[#D1FAE5] transition-colors text-[#059669]/60 hover:text-[#059669]">
                  {copiedJson ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="text-xs text-[#111827] font-mono overflow-x-auto leading-relaxed bg-white border border-[#E5E7EB] rounded-lg p-4">
                {JSON.stringify(data.machine_readable, null, 2)}
              </pre>
            </div>
          )}

          {/* Buyer Webhook */}
          {data.license_type === "archive" && data.status === "completed" && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3 shadow-sm">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium">New Article Notifications</p>
              <p className="text-sm text-[#6B7280]">Register a webhook to receive a POST request whenever a new article is added to your archive coverage.</p>
              {webhookSecret ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#059669] font-medium">Webhook registered. Save this secret — it won't be shown again.</p>
                  <div className="flex items-center gap-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg p-3">
                    <code className="text-xs text-[#4A26ED] font-mono flex-1 truncate">{webhookSecret}</code>
                    <button onClick={() => { navigator.clipboard.writeText(webhookSecret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }} className="text-[#9CA3AF] hover:text-[#111827] shrink-0">
                      {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button onClick={handleRegisterWebhook} disabled={webhookLoading || !webhookUrl.trim()} variant="outline" className="shrink-0">
                    {webhookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center space-y-4 pt-4">
            <a
              href={`${EXT_SUPABASE_URL}/certificate?key=${encodeURIComponent(data.license_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] px-5 py-2.5 text-sm font-medium text-[#111827] transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Certificate
            </a>
            <div className="flex items-center justify-center gap-3">
              <p className="text-xs text-[#9CA3AF]">
                Powered by <span className="text-[#6B7280] font-medium">Opedd Protocol</span>
              </p>
              <span className="text-[#E5E7EB]">·</span>
              <a href="mailto:support@opedd.com" className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                Help & Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}