import React from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EXT_SUPABASE_URL } from "@/lib/constants";
import {
  Sparkles, User, FileText, ExternalLink, Copy, CheckCircle2,
  Link2, Shield, Bot, Cpu, Hash, Download, Building2, Briefcase,
  Archive, Calendar, AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  type: "ai_ingestion" | "human_license" | "archive_license" | "payout";
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
}

interface TransactionReceiptDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionReceiptDrawer({ transaction, open, onOpenChange }: TransactionReceiptDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!transaction) return null;

  const handleCopyHash = () => { if (transaction.storyProtocolHash) { navigator.clipboard.writeText(transaction.storyProtocolHash); setCopiedHash(true); setTimeout(() => setCopiedHash(false), 2000); } };
  const handleCopyLicenseKey = () => { if (transaction.licenseKey) { navigator.clipboard.writeText(transaction.licenseKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); } };
  const handleDownloadCertificate = () => { if (transaction.licenseKey) window.open(`${EXT_SUPABASE_URL}/certificate?key=${encodeURIComponent(transaction.licenseKey)}`, "_blank"); };
  const handleDownloadInvoice = () => { if (transaction.licenseKey) window.open(`${EXT_SUPABASE_URL}/invoice?key=${encodeURIComponent(transaction.licenseKey)}`, "_blank"); };

  const isExpired = transaction.validUntil && new Date(transaction.validUntil) < new Date();
  const canRevoke = transaction.status === "settled" && transaction.licenseKey;

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
      case "ai_ingestion": return <Sparkles className="text-[#4A26ED]" size={20} />;
      case "human_license": return <User className="text-[#D1009A]" size={20} />;
      case "archive_license": return <Archive className="text-amber-600" size={20} />;
      case "payout": return <FileText className="text-[#111827]" size={20} />;
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
        <DrawerHeader className="border-b border-[#F3F4F6] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">{getTypeIcon()}</div>
            <div>
              <DrawerTitle className="text-[#111827] font-bold">Transaction Receipt</DrawerTitle>
              <DrawerDescription className="text-[#6B7280]">{getTypeLabel()}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Amount & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Amount</p>
              <p className={`text-3xl font-bold ${transaction.amount > 0 ? "text-emerald-600" : "text-[#111827]"}`}>
                {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-2">Status</p>
              {getStatusBadge(transaction.status)}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Description</p>
              <p className="text-[#111827] font-medium">{transaction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Date</p>
                <p className="text-[#111827]">{transaction.date}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Transaction ID</p>
                <p className="text-[#111827] font-mono text-sm">{transaction.id}</p>
              </div>
            </div>

            {/* Coverage Period */}
            {transaction.type === "archive_license" && transaction.validFrom && transaction.validUntil && (
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Coverage Period</p>
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
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">Associated Article</p>
                <div className="flex items-center gap-2"><FileText size={16} className="text-[#4A26ED]" /><p className="text-[#111827] font-medium">{transaction.assetTitle}</p></div>
              </div>
            )}

            {transaction.licenseKey && (
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-1">License Key</p>
                <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2">
                  <code className="text-sm font-mono text-[#111827] flex-1 truncate">{transaction.licenseKey}</code>
                  <button onClick={handleCopyLicenseKey} className="text-[#9CA3AF] hover:text-[#4A26ED] transition-colors flex-shrink-0">
                    {copiedKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Buyer Details */}
            {(transaction.buyerName || transaction.buyerOrganization || transaction.licenseeEmail) && (
              <div className="bg-[#F9FAFB] rounded-xl p-4 space-y-3 border border-[#F3F4F6]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium">Buyer Details</p>
                {transaction.buyerName && <div className="flex items-center gap-2"><User size={14} className="text-[#9CA3AF]" /><span className="text-sm text-[#111827]">{transaction.buyerName}</span></div>}
                {transaction.buyerOrganization && <div className="flex items-center gap-2"><Building2 size={14} className="text-[#9CA3AF]" /><span className="text-sm text-[#111827]">{transaction.buyerOrganization}</span></div>}
                {transaction.licenseeEmail && <div className="flex items-center gap-2"><ExternalLink size={14} className="text-[#9CA3AF]" /><span className="text-sm text-[#111827]">{transaction.licenseeEmail}</span></div>}
                {transaction.intendedUse && <div className="flex items-start gap-2"><Briefcase size={14} className="text-[#9CA3AF] mt-0.5" /><span className="text-sm text-[#111827]">{transaction.intendedUse}</span></div>}
              </div>
            )}

            {transaction.fromDirectLink && (
              <div className="flex items-center gap-2 bg-sky-50 px-3 py-2 rounded-lg">
                <Link2 size={16} className="text-sky-600" /><span className="text-sky-700 text-sm font-medium">Acquired via Direct Pay Link</span>
              </div>
            )}

            {/* AI Lab Details */}
            {transaction.type === "ai_ingestion" && (transaction.aiLabName || transaction.aiModel || transaction.tokenVolume) && (
              <div className="bg-[#4A26ED]/5 rounded-xl p-4 space-y-3 border border-[#4A26ED]/10">
                <div className="flex items-center gap-2 mb-2"><Bot size={16} className="text-[#4A26ED]" /><span className="text-sm font-semibold text-[#111827]">AI Lab Details</span></div>
                {transaction.aiLabName && <div className="flex items-center justify-between"><span className="text-xs text-[#6B7280] uppercase tracking-wider">Lab</span><span className="text-sm font-medium text-[#111827]">{transaction.aiLabName}</span></div>}
                {transaction.aiModel && <div className="flex items-center justify-between"><span className="text-xs text-[#6B7280] uppercase tracking-wider">Model</span><span className="text-sm font-medium text-[#111827]">{transaction.aiModel}</span></div>}
                {transaction.tokenVolume && <div className="flex items-center justify-between"><span className="text-xs text-[#6B7280] uppercase tracking-wider">Token Volume</span><span className="text-sm font-medium text-[#111827]">{transaction.tokenVolume.toLocaleString()} Tokens</span></div>}
              </div>
            )}
          </div>

          <Separator />

          {/* Opedd Protocol */}
          <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4"><Shield size={18} className="text-[#4A26ED]" /><p className="font-semibold">Opedd Protocol Record</p></div>
            {transaction.storyProtocolHash ? (
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">Transaction Hash</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <code className="text-emerald-400 text-sm font-mono flex-1 truncate">{transaction.storyProtocolHash}</code>
                  <button onClick={handleCopyHash} className="text-white/70 hover:text-white transition-colors">{copiedHash ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}</button>
                </div>
              </div>
            ) : <p className="text-white/60 text-sm">No blockchain record for this transaction type.</p>}
          </div>

          {transaction.licenseTerms && (
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium mb-2">License Terms</p>
              <div className="bg-[#F9FAFB] rounded-lg p-4 text-sm text-[#6B7280] leading-relaxed">{transaction.licenseTerms}</div>
            </div>
          )}

          {/* Action buttons */}
          {transaction.licenseKey && (
            <div className="space-y-2">
              <Button onClick={handleDownloadCertificate} variant="outline" className="w-full h-11 gap-2 border-[#4A26ED]/20 text-[#4A26ED] hover:bg-[#4A26ED]/5">
                <Download size={16} />Download License Certificate
              </Button>
              <Button onClick={handleDownloadInvoice} variant="outline" className="w-full h-11 gap-2 border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]">
                <FileText size={16} />Download Invoice PDF
              </Button>
            </div>
          )}

          {/* Revoke License */}
          {canRevoke && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-11 gap-2 border-[#DC2626]/30 text-[#DC2626] hover:bg-red-50">
                  <AlertTriangle size={16} />Revoke License
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-[#111827]"><AlertTriangle size={20} className="text-[#DC2626]" />Revoke this license?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#6B7280]">This will permanently revoke this license. The buyer will no longer have access rights. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg border-[#E5E7EB]">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-[#DC2626] hover:bg-red-700 text-white rounded-lg">Yes, Revoke</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <DrawerFooter className="border-t border-[#F3F4F6] pt-4">
          <DrawerClose asChild><Button variant="outline" className="w-full h-11 border-[#E5E7EB] text-[#374151]">Close</Button></DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
