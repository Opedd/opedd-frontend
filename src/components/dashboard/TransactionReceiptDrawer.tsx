import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  User, 
  FileText, 
  ExternalLink, 
  Copy, 
  CheckCircle2,
  Link2,
  Shield
} from "lucide-react";
import { useState } from "react";

interface Transaction {
  id: string;
  type: "ai_ingestion" | "human_license" | "payout";
  description: string;
  amount: number;
  date: string;
  status: "settled" | "processing" | "disputed";
  assetTitle?: string;
  assetId?: string;
  fromDirectLink?: boolean;
  storyProtocolHash?: string;
  licenseeEmail?: string;
  licenseTerms?: string;
}

interface TransactionReceiptDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionReceiptDrawer({ 
  transaction, 
  open, 
  onOpenChange 
}: TransactionReceiptDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!transaction) return null;

  const handleCopyHash = () => {
    if (transaction.storyProtocolHash) {
      navigator.clipboard.writeText(transaction.storyProtocolHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            Settled
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">
            Processing
          </Badge>
        );
      case "disputed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
            Disputed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (transaction.type) {
      case "ai_ingestion":
        return <Sparkles className="text-[#4A26ED]" size={20} />;
      case "human_license":
        return <User className="text-[#D1009A]" size={20} />;
      case "payout":
        return <FileText className="text-[#040042]" size={20} />;
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case "ai_ingestion":
        return "AI Ingestion License";
      case "human_license":
        return "Human Republication License";
      case "payout":
        return "Payout to Bank";
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {getTypeIcon()}
            </div>
            <div>
              <DrawerTitle className="text-[#040042] font-bold">
                Transaction Receipt
              </DrawerTitle>
              <DrawerDescription className="text-slate-500">
                {getTypeLabel()}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Amount & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                Amount
              </p>
              <p className={`text-3xl font-bold ${
                transaction.amount > 0 ? "text-emerald-600" : "text-[#040042]"
              }`}>
                {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                Status
              </p>
              {getStatusBadge(transaction.status)}
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                Description
              </p>
              <p className="text-[#040042] font-medium">{transaction.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                  Date
                </p>
                <p className="text-[#040042]">{transaction.date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                  Transaction ID
                </p>
                <p className="text-[#040042] font-mono text-sm">{transaction.id}</p>
              </div>
            </div>

            {transaction.assetTitle && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                  Associated Asset
                </p>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#4A26ED]" />
                  <p className="text-[#040042] font-medium">{transaction.assetTitle}</p>
                </div>
              </div>
            )}

            {transaction.fromDirectLink && (
              <div className="flex items-center gap-2 bg-sky-50 px-3 py-2 rounded-lg">
                <Link2 size={16} className="text-sky-600" />
                <span className="text-sky-700 text-sm font-medium">
                  Acquired via Direct Pay Link
                </span>
              </div>
            )}

            {transaction.licenseeEmail && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
                  Licensee
                </p>
                <p className="text-[#040042]">{transaction.licenseeEmail}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Story Protocol Details */}
          <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-[#4A26ED]" />
              <p className="font-semibold">Story Protocol Record</p>
            </div>
            
            {transaction.storyProtocolHash ? (
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider font-medium mb-2">
                  Transaction Hash
                </p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <code className="text-emerald-400 text-sm font-mono flex-1 truncate">
                    {transaction.storyProtocolHash}
                  </code>
                  <button
                    onClick={handleCopyHash}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {copiedHash ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                <a
                  href={`https://explorer.story.foundation/tx/${transaction.storyProtocolHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#4A26ED] hover:text-[#6B4AED] mt-3 transition-colors"
                >
                  View on Story Explorer <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <p className="text-white/60 text-sm">
                No blockchain record for this transaction type.
              </p>
            )}
          </div>

          {/* License Terms */}
          {transaction.licenseTerms && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                License Terms
              </p>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
                {transaction.licenseTerms}
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-slate-100 pt-4">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-11">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
