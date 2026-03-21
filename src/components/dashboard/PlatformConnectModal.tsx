import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { copyToClipboard } from "@/lib/clipboard";
import {
  X,
  Check,
  Copy,
  Loader2,
  Upload,
  AlertTriangle,
  ChevronRight,
  Shield,
  Mail,
  Rss,
  Info,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import type { DetectionResult, ConnectResult, PlatformStatusResult } from "@/lib/api";

// Platform logos
import substackLogo from "@/assets/platforms/substack.svg";
import ghostLogo from "@/assets/platforms/ghost.svg";
import wordpressLogo from "@/assets/platforms/wordpress.svg";
import beehiivLogo from "@/assets/platforms/beehiiv.svg";

const platformLogos: Record<string, string> = {
  substack: substackLogo,
  ghost: ghostLogo,
  wordpress: wordpressLogo,
  beehiiv: beehiivLogo,
};

const platformNames: Record<string, string> = {
  substack: "Substack",
  beehiiv: "Beehiiv",
  ghost: "Ghost",
  wordpress: "WordPress",
  other: "Custom",
};

// Platforms where API key proves ownership (skip verification step)
const API_VERIFIED_PLATFORMS = ["beehiiv", "ghost", "wordpress"];

interface PlatformConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detection: DetectionResult;
  url: string;
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3;

export function PlatformConnectModal({
  open,
  onOpenChange,
  detection,
  url,
  onComplete,
}: PlatformConnectModalProps) {
  const { toast } = useToast();
  const { platform: platformApi } = useAuthenticatedApi();

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedPlatform, setSelectedPlatform] = useState(detection.platform);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null);

  // Step 1 — credentials
  const [apiKey, setApiKey] = useState("");
  const [pubId, setPubId] = useState("");
  const [ghostSiteUrl, setGhostSiteUrl] = useState(url);
  const [ghostApiKey, setGhostApiKey] = useState("");

  // Step 1 — archive progress
  const [archiveJob, setArchiveJob] = useState<PlatformStatusResult["job"]>(null);
  const [archivePolling, setArchivePolling] = useState(false);

  // Step 2 — verification (reuse existing logic)
  const [verifyResult, setVerifyResult] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 3 — forward sync
  const [inboundEmail, setInboundEmail] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const platform = selectedPlatform;
  const skipVerification = API_VERIFIED_PLATFORMS.includes(platform);
  const totalSteps = skipVerification ? 2 : 3;

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedPlatform(detection.platform);
      setIsConnecting(false);
      setConnectResult(null);
      setApiKey("");
      setPubId("");
      setGhostSiteUrl(url);
      setGhostApiKey("");
      setArchiveJob(null);
      setArchivePolling(false);
      setVerifyResult("idle");
      setVerificationToken(null);
      setCopied(false);
      setInboundEmail(null);
      setEmailCopied(false);
      setWebhookCopied(false);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, detection, url]);

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setter(true);
      setTimeout(() => setter(false), 2000);
    }
  };

  // Step 1: Connect & Import
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const credentials: Record<string, string> = {};
      if (platform === "beehiiv") {
        if (!apiKey.trim()) throw new Error("API Key is required");
        credentials.api_key = apiKey.trim();
        if (pubId.trim()) credentials.pub_id = pubId.trim();
      } else if (platform === "ghost") {
        if (!ghostApiKey.trim()) throw new Error("Content API Key is required");
        credentials.api_key = ghostApiKey.trim();
        credentials.site_url = ghostSiteUrl.trim();
      }

      const result = await platformApi.connect({
        url,
        platform,
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      });

      setConnectResult(result);
      if (result.inbound_email) setInboundEmail(result.inbound_email);

      // Start polling archive progress
      if (result.source_id) {
        startArchivePolling(result.source_id);
      }
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err?.message || "Could not connect to your publication.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const startArchivePolling = (sourceId: string) => {
    setArchivePolling(true);
    const poll = async () => {
      try {
        const status = await platformApi.status(sourceId);
        setArchiveJob(status.job);
        if (status.inbound_email) setInboundEmail(status.inbound_email);
        if (status.source?.sync_status === "active") {
          setVerificationToken(null); // Already verified via API
        }
        if (!status.job || status.job.status === "complete" || status.job.status === "failed") {
          setArchivePolling(false);
          setIsConnecting(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        setArchivePolling(false);
        setIsConnecting(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    };
    poll();
    pollingRef.current = setInterval(poll, 3000);
  };

  const handleSkipArchive = async () => {
    setIsConnecting(true);
    try {
      const result = await platformApi.connect({
        url,
        platform,
        credentials: undefined,
      });
      setConnectResult(result);
      if (result.inbound_email) setInboundEmail(result.inbound_email);
      setIsConnecting(false);
      // Skip to verification or forward sync
      advanceFromStep1();
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err?.message || "Could not register your publication.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const advanceFromStep1 = () => {
    if (skipVerification) {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  // Step 2: Verify
  const handleVerify = async () => {
    if (!connectResult?.source_id) return;
    setVerifyResult("loading");
    try {
      const status = await platformApi.status(connectResult.source_id);
      // The verify-source endpoint is called from VerifyOwnershipModal
      // For simplicity, we check source status
      if (status.source?.sync_status === "active") {
        setVerifyResult("success");
      } else {
        setVerifyResult("failed");
      }
    } catch {
      setVerifyResult("failed");
    }
  };

  // Stepper
  const stepLabels = skipVerification
    ? ["Import", "Forward Sync"]
    : ["Import", "Verify", "Forward Sync"];

  const getDisplayStep = () => {
    if (skipVerification) {
      return step === 1 ? 1 : 2;
    }
    return step;
  };

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const displayStep = getDisplayStep();
        const isActive = stepNum === displayStep;
        const isDone = stepNum < displayStep;
        return (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#4A26ED] text-white"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? <Check size={14} /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-[#040042]" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`w-6 h-0.5 rounded ${i + 1 < displayStep ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Platform badge
  const renderPlatformBadge = () => (
    <div className="flex items-center gap-3 mb-2">
      {platformLogos[platform] && (
        <img src={platformLogos[platform]} alt={platform} className="w-8 h-8" />
      )}
      <div>
        <p className="text-sm font-bold text-[#040042]">{platformNames[platform] || "Custom"}</p>
        {detection.confidence === "low" && (
          <p className="text-xs text-amber-600">Platform auto-detected with low confidence</p>
        )}
      </div>
    </div>
  );

  // Step 1 content
  const renderStep1 = () => {
    const archiveComplete = archiveJob?.status === "complete";
    const archiveFailed = archiveJob?.status === "failed";
    const archiveRunning = archivePolling || archiveJob?.status === "running" || archiveJob?.status === "pending";
    const progress = archiveJob && archiveJob.total_count > 0
      ? Math.round((archiveJob.processed_count / archiveJob.total_count) * 100)
      : 0;

    // Show archive progress if connected
    if (connectResult && (archiveRunning || archiveComplete || archiveFailed)) {
      return (
        <div className="space-y-5">
          {renderStepper()}
          {renderPlatformBadge()}

          {archiveRunning && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                <span className="text-sm font-medium text-[#040042]">Connected! Importing your archive…</span>
              </div>
              <div className="space-y-2">
                <div className="w-full h-1.5 bg-[#4A26ED]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4A26ED] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {archiveJob?.processed_count || 0} / {archiveJob?.total_count || "?"} articles processed
                </p>
              </div>
            </div>
          )}

          {archiveComplete && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Archive imported</p>
                <p className="text-xs text-emerald-600 mt-0.5">{archiveJob?.processed_count || 0} articles imported successfully.</p>
              </div>
            </div>
          )}

          {archiveFailed && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Import failed</p>
                <p className="text-xs text-red-600 mt-0.5">{archiveJob?.error || "An error occurred during import. You can retry later."}</p>
              </div>
            </div>
          )}

          {(archiveComplete || archiveFailed) && (
            <Button
              onClick={advanceFromStep1}
              className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
            >
              Continue
              <ChevronRight size={16} className="ml-1.5" />
            </Button>
          )}
        </div>
      );
    }

    // Platform-specific connect forms
    return (
      <div className="space-y-5">
        {renderStepper()}
        {renderPlatformBadge()}

        {detection.confidence === "low" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">We couldn't auto-detect your platform — you can correct it below:</p>
            <Select value={platform} onValueChange={(v) => setSelectedPlatform(v as DetectionResult["platform"])}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformNames).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {platform === "beehiiv" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#040042]">Connect via Beehiiv API</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#040042]/70 mb-1.5 block">API Key</label>
                <Input
                  type="password"
                  placeholder="bh_api_xxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#040042]/70 mb-1.5 block">Publication ID</label>
                <Input
                  placeholder="pub_xxxxxxxx"
                  value={pubId}
                  onChange={(e) => setPubId(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find these in Beehiiv Settings → API. Your Publication ID is in the URL of your dashboard.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !apiKey.trim()}
              className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
            >
              {isConnecting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Validate & Import Archive
            </Button>
          </div>
        )}

        {platform === "ghost" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#040042]">Connect via Ghost Content API</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#040042]/70 mb-1.5 block">Site URL</label>
                <Input
                  placeholder="https://yoursite.com"
                  value={ghostSiteUrl}
                  onChange={(e) => setGhostSiteUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#040042]/70 mb-1.5 block">Content API Key</label>
                <Input
                  type="password"
                  placeholder="Content API Key"
                  value={ghostApiKey}
                  onChange={(e) => setGhostApiKey(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In Ghost Admin → Settings → Integrations → Add Custom Integration → copy Content API Key.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !ghostApiKey.trim()}
              className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
            >
              {isConnecting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Validate & Import Archive
            </Button>
          </div>
        )}

        {platform === "wordpress" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#040042]">Import WordPress Archive</h3>
            <div className="bg-[#EEF0FD] border border-[#D5D9F2] rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-[#4A26ED] mt-0.5 shrink-0" />
              <p className="text-sm text-[#040042]/80">
                Your WordPress archive will be imported automatically. No credentials needed.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
            >
              {isConnecting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Import Archive
            </Button>
          </div>
        )}

        {(platform === "substack" || platform === "other") && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#040042]">Import your archive</h3>

            {platform === "substack" && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={16} className="text-[#D97706] mt-0.5 shrink-0" />
                <div className="text-sm text-[#92400E] leading-relaxed">
                  Substack doesn't have a public API. To import your existing archive: export your data from <strong>Substack Settings → Account → Export data</strong>, then upload the ZIP file here.
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#4A26ED]/30 transition-colors cursor-pointer">
              <Upload size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#040042]/70">
                {platform === "substack" ? "Drop your Substack export ZIP here" : "Drop your content export file here"}
              </p>
              <p className="text-xs text-slate-400 mt-1">ZIP files accepted</p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={handleSkipArchive}
              disabled={isConnecting}
              className="w-full text-sm font-medium text-[#4A26ED] hover:text-[#3B1ED1] transition-colors disabled:opacity-50 py-2"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Registering…
                </span>
              ) : (
                "Skip archive import — sync new posts only →"
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Step 2: Verify Ownership
  const renderStep2 = () => {
    const siteUrl = url;
    const hosted = ["substack.com", "beehiiv.com", "ghost.io", "medium.com", "wordpress.com"].some(d => {
      try { return new URL(siteUrl).hostname.endsWith(d); } catch { return false; }
    });

    let domainForDns = "";
    try { domainForDns = new URL(siteUrl).hostname; } catch { /* */ }

    // We need the verification token from the source
    const token = verificationToken || connectResult?.source_id || "—";

    return (
      <div className="space-y-5">
        {renderStepper()}
        <div className="text-center">
          <Shield size={28} className="text-[#4A26ED] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#040042]">Verify Ownership</h3>
          <p className="text-sm text-slate-500 mt-1">
            Prove you own this publication to activate licensing.
          </p>
        </div>

        {verifyResult === "success" ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#040042]">Verified!</h3>
              <p className="text-sm text-slate-500 mt-1">Your publication ownership has been confirmed.</p>
            </div>
            <Button onClick={() => setStep(3)} className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold">
              Continue
              <ChevronRight size={16} className="ml-1.5" />
            </Button>
          </div>
        ) : verifyResult === "loading" ? (
          <div className="text-center py-8">
            <Loader2 size={32} className="animate-spin text-[#4A26ED] mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Checking your publication…</p>
          </div>
        ) : verifyResult === "failed" ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <AlertTriangle size={36} className="text-amber-600" />
            </div>
            <p className="text-sm text-slate-500">We couldn't verify ownership yet. Make sure you've saved your changes.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { onOpenChange(false); onComplete(); }} className="flex-1 h-11">
                Verify Later
              </Button>
              <Button onClick={() => { setVerifyResult("idle"); handleVerify(); }} className="flex-1 h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold">
                <RefreshCw size={14} className="mr-1.5" />
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            {hosted ? (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-[#040042] leading-relaxed">
                    Add this verification code to your publication's About page or bio, then click Verify.
                  </p>
                </div>
                <div className="bg-[#040042] rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-medium">Verification Code</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-lg font-mono font-bold text-white tracking-[0.15em]">{token}</code>
                    <button
                      onClick={() => handleCopy(token, setCopied)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-[#040042]">Add a DNS TXT record</p>
                  <p className="text-xs text-slate-500 mt-1">DNS changes can take up to 48 hours to propagate.</p>
                </div>
                {[
                  { label: "Type", value: "TXT" },
                  { label: "Host", value: domainForDns || "@" },
                  { label: "Value", value: token },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <span className="text-xs font-semibold text-[#040042]">{item.label}</span>
                    </div>
                    <div className="p-3">
                      <div className="bg-[#040042] rounded-lg p-3 flex items-center justify-between gap-3">
                        <code className="text-xs text-emerald-400 font-mono">{item.value}</code>
                        <button onClick={() => handleCopy(item.value, setCopied)} className="text-white/60 hover:text-white">
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { onOpenChange(false); onComplete(); }}
                className="flex-1 h-11"
              >
                Verify Later
              </Button>
              <Button
                onClick={() => { setStep(2); handleVerify(); }}
                className="flex-1 h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
              >
                I've Added It — Verify
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Step 3: Forward Sync
  const renderStep3 = () => {
    const displayEmail = inboundEmail || `opedd+${connectResult?.source_id?.slice(0, 8) || "id"}@inbound.opedd.com`;
    const webhookUrl = "https://api.opedd.com/functions/v1/platform-webhook";

    return (
      <div className="space-y-5">
        {renderStepper()}
        <div className="text-center">
          <Rss size={28} className="text-[#4A26ED] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#040042]">Connect New Content</h3>
          <p className="text-sm text-slate-500 mt-1">Set up forward sync so new posts arrive automatically.</p>
        </div>

        {platform === "beehiiv" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Webhook registered</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                New posts will sync to Opedd automatically within seconds of publishing.
              </p>
            </div>
          </div>
        )}

        {platform === "ghost" && (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-[#040042]">Set up a Ghost webhook for real-time sync</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Go to Ghost Admin → Settings → Integrations → Your Integration → Add webhook.
              </p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>Event: <strong>Post published</strong></li>
                <li>Target URL:</li>
              </ul>
            </div>

            <div className="bg-[#040042] rounded-xl p-3 flex items-center justify-between gap-3">
              <code className="text-xs text-emerald-400 font-mono truncate">{webhookUrl}</code>
              <button onClick={() => handleCopy(webhookUrl, setWebhookCopied)} className="text-white/60 hover:text-white shrink-0">
                {webhookCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <p className="text-xs text-slate-400">Or skip — we'll sync via email instead.</p>
          </div>
        )}

        {platform === "wordpress" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-700">New public posts will be detected automatically.</p>
          </div>
        )}

        {/* Email ingestion — shown for all platforms */}
        <div className="space-y-3">
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={16} className="text-[#4A26ED]" />
              <p className="text-sm font-semibold text-[#040042]">Email Ingestion</p>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Add this email as a free subscriber to your newsletter. Every new post will be delivered to Opedd automatically.
            </p>
          </div>

          <div className="bg-[#EEF0FD] border border-[#D5D9F2] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <code className="text-sm font-mono font-semibold text-[#4A26ED] truncate">{displayEmail}</code>
              <button
                onClick={() => handleCopy(displayEmail, setEmailCopied)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#4A26ED] hover:text-[#3B1ED1] transition-colors"
              >
                {emailCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              {platform === "substack" && (
                <>Go to <strong>Substack Settings → Subscribers → Add subscriber</strong> → paste email → Comp subscription.</>
              )}
              {platform === "beehiiv" && (
                <>Go to <strong>Beehiiv Audience → Add subscriber</strong> → paste email.</>
              )}
              {platform === "ghost" && (
                <>Go to <strong>Ghost Members → Add member</strong> → paste email.</>
              )}
              {(platform === "wordpress" || platform === "other") && (
                <>Add this email as a subscriber in your newsletter or mailing list settings.</>
              )}
            </p>
          </div>
        </div>

        <Button
          onClick={() => { onOpenChange(false); onComplete(); }}
          className="w-full h-11 bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold"
        >
          Done — Start Licensing
          <ChevronRight size={16} className="ml-1.5" />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); } }}>
      <DialogContent
        hideCloseButton
        className="bg-white border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#040042] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {platformLogos[platform] ? (
              <img src={platformLogos[platform]} alt={platform} className="w-6 h-6" />
            ) : (
              <Rss size={20} className="text-[#A78BFA]" />
            )}
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Connect Publication</h1>
              <p className="text-[#A78BFA] text-xs truncate max-w-[250px]">{detection.name || url}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </DialogContent>
    </Dialog>
  );
}