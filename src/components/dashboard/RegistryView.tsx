import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  QrCode, 
  Sparkles, 
  Plus,
  Lock,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificateModal } from "./CertificateModal";

import { Asset } from "@/types/asset";

interface RegistryViewProps {
  assets: Asset[];
  isLoading?: boolean;
  isDemo?: boolean;
  onAddClick?: () => void;
}

export function RegistryView({ assets, isLoading, isDemo, onAddClick }: RegistryViewProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  // Filter to only show minted assets in registry
  const mintedAssets = assets.filter(a => a.status === "minted");

  const handleCardClick = (asset: Asset) => {
    if (isDemo) return;
    setSelectedAsset(asset);
    setIsCertificateOpen(true);
  };

  const generateIpId = (id: string) => {
    const hash = id.replace(/-/g, '');
    return `0x${hash.slice(0, 4)}...${hash.slice(-2)}`;
  };

  // Empty state for registry
  if (mintedAssets.length === 0) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#040042] to-[#0a0066] rounded-2xl border border-[#7C3AED]/20 p-12 text-center"
        >
          {/* Decorative vault icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-2xl blur-xl" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#4A26ED]/20 border border-[#7C3AED]/30 flex items-center justify-center">
              <Lock size={40} className="text-[#7C3AED]" />
            </div>
          </div>

          <h3 className="text-white font-bold text-xl mb-2">No IP Registered Yet</h3>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Mint your first asset to secure your content in the global AI-Rights ledger. 
            Once registered, your intellectual property will be cryptographically protected on Story Protocol.
          </p>

          {onAddClick && (
            <Button
              onClick={onAddClick}
              className="bg-gradient-to-r from-[#7C3AED] to-[#4A26ED] hover:from-[#8B5CF6] hover:to-[#5B3AED] text-white rounded-xl shadow-lg shadow-[#7C3AED]/30 gap-2"
            >
              <Plus size={18} />
              Register Your First Asset
            </Button>
          )}

          {/* Security badges */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[10px]">
              <Shield size={10} className="mr-1" />
              Blockchain Secured
            </Badge>
            <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[10px]">
              <Sparkles size={10} className="mr-1" />
              Story Protocol
            </Badge>
          </div>
        </motion.div>

        <CertificateModal
          open={isCertificateOpen}
          onOpenChange={setIsCertificateOpen}
          asset={selectedAsset}
        />
      </>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${isDemo ? 'opacity-75' : ''}`}>
        {mintedAssets.map((asset, index) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleCardClick(asset)}
            className={`group relative bg-gradient-to-br from-[#040042] to-[#0a0066] rounded-2xl border border-[#7C3AED]/20 overflow-hidden transition-all duration-300 hover:border-[#7C3AED]/50 hover:shadow-xl hover:shadow-[#7C3AED]/10 ${
              isDemo ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/0 to-[#7C3AED]/0 group-hover:from-[#7C3AED]/5 group-hover:to-transparent transition-all duration-300" />

            {/* Story IP Badge - Glowing */}
            <div className="absolute top-4 left-4 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-[#7C3AED] blur-md opacity-50 rounded-full" />
                <Badge className="relative bg-gradient-to-r from-[#7C3AED] to-[#4A26ED] text-white border-0 shadow-lg shadow-[#7C3AED]/30 px-3 py-1">
                  <Sparkles size={12} className="mr-1.5" />
                  Story IP
                </Badge>
              </div>
            </div>

            {/* QR Code Icon - Aesthetic */}
            <div className="absolute top-4 right-4 z-10">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                <QrCode size={18} className="text-white/40" />
              </div>
            </div>

            {/* Card Content */}
            <div className="relative p-6 pt-16">
              {/* Asset Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-[#4A26ED]/10 border border-[#7C3AED]/20 flex items-center justify-center mb-4">
                <FileText size={24} className="text-[#7C3AED]" />
              </div>

              {/* Asset Title */}
              <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 leading-tight group-hover:text-[#7C3AED] transition-colors">
                {asset.title}
              </h3>

              {/* IP ID - Serial Number Style */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  <Shield size={12} className="text-[#7C3AED]" />
                  <code className="text-[#7C3AED] font-mono text-xs tracking-wider">
                    {generateIpId(asset.id)}
                  </code>
                </div>
                {isDemo && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 text-white/30 border-white/10">
                    Demo
                  </Badge>
                )}
              </div>

              {/* Footer Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Revenue</p>
                  <p className="text-emerald-400 font-bold">${asset.revenue.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Status</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-sm font-medium">Protected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom glow accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />
          </motion.div>
        ))}
      </div>

      <CertificateModal
        open={isCertificateOpen}
        onOpenChange={setIsCertificateOpen}
        asset={selectedAsset}
      />
    </>
  );
}
