import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Award,
  Calendar,
  Hash,
  Fingerprint
} from "lucide-react";

interface Asset {
  id: string;
  title: string;
  licenseType: "human" | "ai" | "both";
  status: "active" | "pending" | "minted";
  revenue: number;
  createdAt: string;
  storyProtocolHash?: string;
}

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
}

export function CertificateModal({ open, onOpenChange, asset }: CertificateModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!asset) return null;

  // Generate a mock Story Protocol hash if none exists
  const protocolHash = asset.storyProtocolHash || `sp_ip_${asset.id.slice(0, 8)}${Date.now().toString(16).slice(-8)}`;
  const shortHash = `0x${protocolHash.slice(-12)}...${protocolHash.slice(-6)}`;
  const ipId = `0x${asset.id.replace(/-/g, '').slice(0, 6)}...${asset.id.slice(-4)}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(protocolHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(asset.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-[#040042] to-[#0a0066] border-[#7C3AED]/30 text-white rounded-2xl overflow-hidden p-0">
        {/* Certificate Header with Story Protocol branding */}
        <div className="relative p-6 pb-4 border-b border-white/10">
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#7C3AED]/20 blur-3xl rounded-full" />
          
          <div className="relative flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4A26ED] flex items-center justify-center shadow-lg shadow-[#7C3AED]/30">
              <Shield size={24} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-[#7C3AED] text-xs font-semibold tracking-widest uppercase">Story Protocol</p>
              <h3 className="text-white font-bold text-lg">IP Registry</h3>
            </div>
          </div>

          <DialogHeader className="text-center">
            <DialogTitle className="text-white/60 text-xs tracking-widest uppercase font-normal">
              Certificate of Ownership
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Certificate Body */}
        <div className="p-6 space-y-5">
          {/* Award Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7C3AED]/20 to-[#4A26ED]/20 flex items-center justify-center border border-[#7C3AED]/30">
                <Award size={36} className="text-[#7C3AED]" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            </div>
          </div>

          {/* Asset Title */}
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Registered Asset</p>
            <h4 className="text-white font-bold text-xl leading-tight">{asset.title}</h4>
          </div>

          {/* Minted Badge */}
          <div className="flex justify-center">
            <Badge className="bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30 px-4 py-1">
              <Shield size={12} className="mr-1.5" />
              IP Protected
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/10">
            {/* IP ID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} className="text-[#7C3AED]" />
                <span className="text-white/50 text-xs uppercase tracking-wider">IP ID</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[#7C3AED] font-mono text-sm">{ipId}</code>
                <button
                  onClick={handleCopyId}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {copiedId ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Registration Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#7C3AED]" />
                <span className="text-white/50 text-xs uppercase tracking-wider">Registered</span>
              </div>
              <span className="text-white/80 text-sm">{formatDate(asset.createdAt)}</span>
            </div>

            {/* Transaction Hash */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-[#7C3AED]" />
                <span className="text-white/50 text-xs uppercase tracking-wider">TX Hash</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-emerald-400 font-mono text-sm">{shortHash}</code>
                <button
                  onClick={handleCopyHash}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {copiedHash ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Verify Button */}
          <a
            href={`https://explorer.story.foundation/ipa/${asset.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4A26ED] text-white font-semibold hover:from-[#8B5CF6] hover:to-[#5B3AED] transition-all shadow-lg shadow-[#7C3AED]/30"
          >
            Verify on Ledger
            <ExternalLink size={16} />
          </a>

          {/* Security Note */}
          <p className="text-center text-white/30 text-[10px] leading-relaxed">
            This certificate is cryptographically secured on the Story Protocol blockchain. 
            Verification ensures immutable proof of intellectual property ownership.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
