import React from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EXT_SUPABASE_URL, EXT_ANON_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, User, FileText, ExternalLink, Copy, CheckCircle2,
  Link2, Shield, Bot, Cpu, Hash, Download, Building2, Briefcase,
  Archive, Calendar, AlertTriangle, RefreshCw, Loader2,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  type: "ai_ingestion" | "human_license" | "archive_license" | "enterprise_license" | "payout";
  description: string;
  amount: number;
  date: string;
  status: "settled" | "processing" | "disputed" | "revoked";
  assetTitle?: string;
  assetId?: string;
  fromDirectLink?: boolean;
  storyProtocolHash?: string;
  licenseeEmail?: string;
  licenseTerms?: string;
  licenseKey?: string;
  buyerName?: string;
  buyerOrganization?: string;
  intendedUse?: string;
  aiLabName?: string;
  aiModel?: string;
  tokenVolume?: number;
  validFrom?: string;
  validUntil?: string;
  blockchainTxHash?: string | null;
  blockchainStatus?: string | null;
}

interface TransactionReceiptDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryBlockchain?: (transactionId: string) => Promise<void>;
  onTransactionUpdate?: (id: string, updates: Partial<Transaction>) => void;
}

export function TransactionReceiptDrawer({ transaction, open, onOpenChange, onRetryBlockchain, onTransactionUpdate }: TransactionReceiptDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const { toast } = useToast();

  if (!transaction) return null;

  const handleCopyHash = () => { if (transaction.blockchainTxHash) { navigator.clipboard.writeText(transaction.blockchainTxHash); setCopiedHash(true); setTimeout(() => setCopiedHash(false), 2000); } };
  const handleRetryBlockchain = async () => { if (!onRetryBlockchain) return; setRetrying(true); try { await onRetryBlockchain(transaction.id); } finally { setRetrying(false); } };
  const handleCopyLicenseKey = () => { if (transaction.licenseKey) { navigator.clipboard.writeText(transaction.licenseKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); } };
  const handleDownloadCertificate = () => { if (transaction.licenseKey) window.open(`${EXT_SUPABASE_URL}/certificate?key=${encodeURIComponent(transaction.licenseKey)}`, "_blank"); };
  const handleDownloadInvoice = () => { if (transaction.licenseKey) window.open(`${EXT_SUPABASE_URL}/invoice?key=${encodeURIComponent(transaction.licenseKey)}`, "_blank"); };

  const handleRefund = async () => {
    if (!transaction.licenseKey) return;
    setRefunding(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${EXT_SUPABASE_URL}/functions/v1/refund-license`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EXT_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ license_key: transaction.licenseKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Refund failed" }));
        throw new Error(err.error || "Refund failed");
      }
      toast({ title: "Refund issued", description: `$${transaction.amount.toFixed(2)} refunded to ${transaction.licenseeEmail || "buyer"}.` });
      onTransactionUpdate?.(transaction.id, { status: "refunded" as any });
    } catch (e: any) {
      toast({ title: "Refund failed", description: e.message, variant: "destructive" });
    } finally {
      setRefunding(false);
    }
  };

  const isExpired = transaction.validUntil && new Date(transaction.validUntil) < new Date();
  const canRevoke = transaction.status === "settled" && transaction.licenseKey;
  const canRefund = transaction.status === "settled" && transaction.licenseKey && transaction.type !== "enterprise_license";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Completed</Badge>;
      case "processing": return <Badge className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">Pending</Badge>;
      case "disputed": return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Failed</Badge>;
      case "revoked": return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Revoked</Badge>;
      default: return null;
    }
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case "ai_ingestion": return <Sparkles className="text-oxford" size={20} />;
      case "human_license": return <User className="text-plum-magenta" size={20} />;
      case "archive_license": return <Archive className="text-amber-600" size={20} />;
      case "payout": return <FileText className="text-gray-900" size={20} />;
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case "ai_ingestion": return "AI Ingestion License";
      case "human_license": return "Human Republication License";
      case "archive_license": return "Archive License";
      case "payout": return "Payout to Bank";
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] bg-white">
        <DrawerHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">{getTypeIcon()}</div>
            <div>
              <DrawerTitle className="text-gray-900 font-bold">Transaction Receipt</DrawerTitle>
              <DrawerDescription className="text-gray-500">{getTypeLabel()}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Amount & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Amount</p>
              <p className={`text-3xl font-bold ${transaction.amount > 0 ? "text-emerald-600" : "text-gray-900"}`}>
                {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Status</p>
              {getStatusBadge(transaction.status)}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Description</p>
              <p className="text-gray-900 font-medium">{transaction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Date</p>
                <p className="text-gray-900">{transaction.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Transaction ID</p>
                <p className="text-gray-900 font-mono text-sm">{transaction.id}</p>
              </div>
            </div>

            {/* Coverage Period */}
            {transaction.type === "archive_license" && transaction.validFrom && transaction.validUntil && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Coverage Period</p>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <Calendar size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-amber-800 font-medium text-sm flex-1">
                    {new Date(transaction.validFrom).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    {" – "}
                    {new Date(transaction.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  {isExpired && <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">EXPIRED</Badge>}
                </div>
              </div>
            )}

            {transaction.assetTitle && !(transaction.type === "archive_license" && transaction.validFrom) && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Associated Article</p>
                <div className="flex items-center gap-2"><FileText size={16} className="text-oxford" /><p className="text-gray-900 font-medium">{transaction.assetTitle}</p></div>
              </div>
            )}

            {transaction.licenseKey && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">License Key</p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <code className="text-sm font-mono text-gray-900 flex-1 truncate">{transaction.licenseKey}</code>
                  <button onClick={handleCopyLicenseKey} className="text-gray-400 hover:text-oxford transition-colors flex-shrink-0">
                    {copiedKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Buyer Details */}
            {(transaction.buyerName || transaction.buyerOrganization || transaction.licenseeEmail) && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Buyer Details</p>
                {transaction.buyerName && <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="text-sm text-gray-900">{transaction.buyerName}</span></div>}
                {transaction.buyerOrganization && <div className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /><span className="text-sm text-gray-900">{transaction.buyerOrganization}</span></div>}
                {transaction.licenseeEmail && <div className="flex items-center gap-2"><ExternalLink size={14} className="text-gray-400" /><span className="text-sm text-gray-900">{transaction.licenseeEmail}</span></div>}
                {transaction.intendedUse && <div className="flex items-start gap-2"><Briefcase size={14} className="text-gray-400 mt-0.5" /><span className="text-sm text-gray-900">{transaction.intendedUse}</span></div>}
              </div>
            )}

            {transaction.fromDirectLink && (
              <div className="flex items-center gap-2 bg-sky-50 px-3 py-2 rounded-lg">
                <Link2 size={16} className="text-sky-600" /><span className="text-sky-700 text-sm font-medium">Acquired via Direct Pay Link</span>
              </div>
            )}

            {/* AI Lab Details */}
            {transaction.type === "ai_ingestion" && (transaction.aiLabName || transaction.aiModel || transaction.tokenVolume) && (
              <div className="bg-oxford/5 rounded-xl p-4 space-y-3 border border-oxford/10">
                <div className="flex items-center gap-2 mb-2"><Bot size={16} className="text-oxford" /><span className="text-sm font-semibold text-gray-900">AI Lab Details</span></div>
                {transaction.aiLabName && <div className="flex items-center justify-between"><span className="text-xs text-gray-500 uppercase tracking-wider">Lab</span><span className="text-sm font-medium text-gray-900">{transaction.aiLabName}</span></div>}
                {transaction.aiModel && <div className="flex items-center justify-between"><span className="text-xs text-gray-500 uppercase tracking-wider">Model</span><span className="text-sm font-medium text-gray-900">{transaction.aiModel}</span></div>}
                {transaction.tokenVolume && <div className="flex items-center justify-between"><span className="text-xs text-gray-500 uppercase tracking-wider">Token Volume</span><span className="text-sm font-medium text-gray-900">{transaction.tokenVolume.toLocaleString()} Tokens</span></div>}
              </div>
            )}
          </div>

          <Separator />

          {/* Opedd Protocol */}
          <div className="bg-gradient-to-br from-navy-deep to-navy-deep rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4"><Shield size={18} className="text-oxford" /><p className="font-semibold">Opedd Protocol Record</p></div>
            {transaction.blockchainTxHash ? (
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <code className="text-emerald-400 text-sm font-mono flex-1 truncate">{transaction.blockchainTxHash}</code>
                  <button onClick={handleCopyHash} className="text-white/70 hover:text-white transition-colors">{copiedHash ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}</button>
                </div>
                {transaction.blockchainStatus === "confirmed" && (
                  <p className="text-xs text-emerald-400 mt-2">Confirmed on Tempo</p>
                )}
              </div>
            ) : transaction.blockchainStatus === "pending" || transaction.blockchainStatus === "submitted" ? (
              <p className="text-white/60 text-sm">On-chain registration in progress — hash will appear shortly.</p>
            ) : transaction.blockchainStatus === "failed" ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-amber-400 text-sm">On-chain registration failed. The license is still valid.</p>
                {onRetryBlockchain && (
                  <button onClick={handleRetryBlockchain} disabled={retrying} className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0">
                    {retrying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {retrying ? "Retrying…" : "Retry"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-white/60 text-sm">No blockchain record for this transaction type.</p>
            )}
          </div>

          {transaction.licenseTerms && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">License Terms</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 leading-relaxed">{transaction.licenseTerms}</div>
            </div>
          )}

          {/* Action buttons */}
          {transaction.licenseKey && (
            <div className="space-y-2">
              <Button onClick={handleDownloadCertificate} variant="outline" className="w-full h-11 gap-2 border-oxford/20 text-oxford hover:bg-oxford/5">
                <Download size={16} />Download License Certificate
              </Button>
              <Button onClick={handleDownloadInvoice} variant="outline" className="w-full h-11 gap-2 border-gray-200 text-gray-700 hover:bg-gray-50">
                <FileText size={16} />Download Invoice PDF
              </Button>
            </div>
          )}

          {/* Refund */}
          {canRefund && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-11 gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                  <RefreshCw size={16} />Refund Buyer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-gray-900">
                    <RefreshCw size={20} className="text-amber-600" />Refund this license?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-500">
                    Refund ${transaction.amount.toFixed(2)} to {transaction.licenseeEmail || "the buyer"}? This will revoke the license. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg border-gray-200">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRefund}
                    disabled={refunding}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-2"
                  >
                    {refunding && <Loader2 size={14} className="animate-spin" />}
                    {refunding ? "Processing…" : "Yes, Refund"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Revoke License */}
          {canRevoke && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-11 gap-2 border-red-600/30 text-red-600 hover:bg-red-50">
                  <AlertTriangle size={16} />Revoke License
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-gray-900"><AlertTriangle size={20} className="text-red-600" />Revoke this license?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-500">This will permanently revoke this license. The buyer will no longer have access rights. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg border-gray-200">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Yes, Revoke</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <DrawerFooter className="border-t border-gray-100 pt-4">
          <DrawerClose asChild><Button variant="outline" className="w-full h-11 border-gray-200 text-gray-700">Close</Button></DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
