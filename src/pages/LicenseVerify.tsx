import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Check, Copy, Loader2, ExternalLink, AlertTriangle, Search, Download, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
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
  licensee: {
    name: string | null;
    organization: string | null;
    email: string;
  };
  content: {
    title: string;
    description: string | null;
    source_url: string | null;
    publisher: string;
  };
  amount: number;
  currency: string;
  issued_at: string;
  valid_from?: string | null;
  valid_until?: string | null;
  is_expired?: boolean;
  machine_readable?: object;
  blockchain_proof?: BlockchainProof | null;
}

export default function LicenseVerify() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();

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
    setLoading(true);
    setNotFound(false);
    setData(null);
    setLookupKey(key);
    (async () => {
      try {
        const res = await fetch(
          `${EXT_SUPABASE_URL}/functions/v1/verify-license?key=${encodeURIComponent(key)}`,
          { headers: { apikey: EXT_ANON_KEY, Accept: "application/json" } }
        );
        const result = await res.json();
        if (!res.ok || !result.success) {
          setNotFound(true);
        } else {
          setData(result.data);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [key]);

  const handleCopyKey = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyJson = () => {
    if (!data?.machine_readable) return;
    navigator.clipboard.writeText(JSON.stringify(data.machine_readable, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleRegisterWebhook = async () => {
    if (!data || !webhookUrl.trim()) return;
    setWebhookLoading(true);
    try {
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/register-buyer-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EXT_ANON_KEY },
        body: JSON.stringify({ license_key: data.license_key, webhook_url: webhookUrl.trim() }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Registration failed");
      setWebhookSecret(result.data.webhook_secret);
    } catch (err: any) {
      alert(err?.message || "Could not register webhook. Check the URL and try again.");
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleLookup = () => {
    const trimmed = lookupKey.trim();
    if (trimmed) navigate(`/verify/${encodeURIComponent(trimmed)}`);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  // — Loading —
  if (loading) {
    return (
      <div className="min-h-screen bg-[#040042] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  // — No key param: show lookup form —
  if (!key) {
    return (
      <div className="min-h-screen bg-[#040042] flex flex-col">
        <div className="px-6 py-6">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 text-white/70 px-4 py-1.5 text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Verify a License
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">License Verification</h1>
            <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
              Paste a license key below to verify its authenticity against the Opedd registry.
            </p>
            <div className="flex gap-2">
              <Input
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="OP-XXXX-XXXX"
                className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono focus-visible:ring-[#4A26ED]/30 focus-visible:border-[#4A26ED]"
              />
              <Button
                onClick={handleLookup}
                disabled={!lookupKey.trim()}
                className="h-11 px-5 bg-[#4A26ED] hover:bg-[#4A26ED]/90 text-white shrink-0"
              >
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-xs text-white/20 mt-10">
              Powered by <span className="text-white/40 font-medium">Opedd Protocol</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // — Not Found —
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#040042] flex flex-col">
        <div className="px-6 py-6">
          <img src={opeddLogo} alt="Opedd" className="h-7" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-1.5 text-sm font-medium mb-6">
              <AlertTriangle className="h-4 w-4" />
              License Not Found
            </div>
            <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
              The key you entered does not match any record in the Opedd registry.
            </p>
            <div className="flex gap-2">
              <Input
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="OP-XXXX-XXXX"
                className="h-11 bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono focus-visible:ring-[#4A26ED]/30 focus-visible:border-[#4A26ED]"
              />
              <Button
                onClick={handleLookup}
                className="h-11 px-5 bg-[#4A26ED] hover:bg-[#4A26ED]/90 text-white shrink-0"
              >
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
            <p className="text-xs text-white/20 mt-10">
              Powered by <span className="text-white/40 font-medium">Opedd Protocol</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRevoked = data.status === "refunded";
  const bp = data.blockchain_proof;

  // — Valid License —
  return (
    <div className="min-h-screen bg-[#040042] flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-white/5">
        <img src={opeddLogo} alt="Opedd" className="h-7" />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[640px] space-y-6 animate-fade-in">
          {/* Status Badge */}
          <div className="text-center">
            {isRevoked ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-1.5 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                License Revoked
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-sm font-medium">
                <Check className="h-4 w-4" />
                License Verified
              </div>
            )}
          </div>

          {/* License Key */}
          <div className="text-center">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-2">License Key</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-2xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] leading-none">
                {data.license_key}
              </code>
              <button
                onClick={handleCopyKey}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              >
                {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Details Card */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm text-white">
            <CardContent className="p-6 space-y-4">
              <DetailRow label="Content">
                {data.content.source_url ? (
                  <a
                    href={data.content.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline inline-flex items-center gap-1.5"
                    style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}
                  >
                    {data.content.title}
                    <ExternalLink className="h-3.5 w-3.5 text-white/40" />
                  </a>
                ) : (
                  <span className="font-medium" style={{ fontFamily: "'Newsreader', 'Georgia', serif" }}>
                    {data.content.title}
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Publisher">{data.content.publisher}</DetailRow>
              <DetailRow label="Licensed To">
                {data.licensee.name
                  ? `${data.licensee.name}${data.licensee.organization ? ` (${data.licensee.organization})` : ""}`
                  : data.licensee.email}
              </DetailRow>
              <DetailRow label="License Type">{data.license_type_label}</DetailRow>
              {data.intended_use_label && (
                <DetailRow label="Intended Use">{data.intended_use_label}</DetailRow>
              )}
              <DetailRow label="Amount">${data.amount.toFixed(2)}</DetailRow>
              <DetailRow label="Issued">{formatDate(data.issued_at)}</DetailRow>
            </CardContent>
          </Card>

          {/* Rights */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-blue-400 uppercase tracking-wider font-medium mb-1.5">Rights Summary</p>
                <p className="text-sm text-white/70 leading-relaxed">{data.rights}</p>
              </div>
            </div>
          </div>

          {/* Blockchain Proof */}
          {bp && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-purple-400 uppercase tracking-wider font-medium">On-Chain Proof</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                  bp.registered
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-white/15 bg-white/5 text-white/40"
                }`}>
                  <Check className="h-3 w-3" />
                  Registered on Base
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                  bp.valid
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}>
                  {bp.valid ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {bp.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              {bp.explorer_url && (
                <a
                  href={bp.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:underline"
                >
                  View on BaseScan
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {bp.contract_address && (
                <p className="text-xs text-white/30 font-mono break-all">
                  Contract: {bp.contract_address}
                </p>
              )}
            </div>
          )}

          {/* Machine-Readable License (AI only) */}
          {data.machine_readable && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium">
                  Machine-Readable License (license.json)
                </p>
                <button
                  onClick={handleCopyJson}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-emerald-400/60 hover:text-emerald-400"
                >
                  {copiedJson ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="text-xs text-white/60 font-mono overflow-x-auto leading-relaxed bg-black/20 rounded-lg p-4">
                {JSON.stringify(data.machine_readable, null, 2)}
              </pre>
            </div>
          )}

          {/* Buyer Webhook Registration (archive licenses only) */}
          {data.license_type === "archive" && data.status === "completed" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">New Article Notifications</p>
              <p className="text-sm text-white/60">Register a webhook to receive a POST request whenever a new article is added to your archive coverage.</p>
              {webhookSecret ? (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-400 font-medium">Webhook registered. Save this secret — it won't be shown again.</p>
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3">
                    <code className="text-xs text-emerald-400 font-mono flex-1 truncate">{webhookSecret}</code>
                    <button onClick={() => { navigator.clipboard.writeText(webhookSecret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }} className="text-white/40 hover:text-white shrink-0">
                      {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  />
                  <Button onClick={handleRegisterWebhook} disabled={webhookLoading || !webhookUrl.trim()} className="bg-white/10 hover:bg-white/20 text-white border-none shrink-0">
                    {webhookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center space-y-4 pt-4">
            <a
              href={`${EXT_SUPABASE_URL}/functions/v1/certificate?key=${encodeURIComponent(data.license_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Certificate
            </a>
            <p className="text-xs text-white/20">
              Powered by <span className="text-white/40 font-medium">Opedd Protocol</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 border-b border-white/5 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-white/30 uppercase tracking-wider sm:w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/80">{children}</span>
    </div>
  );
}
