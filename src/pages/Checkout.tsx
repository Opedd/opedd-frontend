import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  User, 
  Sparkles, 
  Check, 
  Loader2, 
  Download,
  ExternalLink,
  Lock,
  ArrowLeft,
  FileText
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface AssetData {
  id: string;
  title: string;
  publisher: string;
  description: string;
  humanPrice: number;
  aiPrice: number;
  thumbnailUrl?: string;
  publisherId: string;
}

type LicenseType = "human" | "ai";
type CheckoutState = "selection" | "processing" | "success";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const cardHoverVariants = {
  idle: { scale: 1, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
  hover: { scale: 1.02, boxShadow: "0 8px 30px rgba(74,38,237,0.15)" },
};

// Generate a mock Story Protocol hash
const generateStoryProtocolHash = () => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

export default function Checkout() {
  const { assetId } = useParams<{ assetId: string }>();
  const { toast } = useToast();
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>("human");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("selection");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  // Fetch asset data from Supabase
  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      
      if (!assetId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("assets")
          .select("id, title, description, human_price, ai_price, thumbnail_url, user_id")
          .eq("id", assetId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching asset:", error);
          toast({
            title: "Error",
            description: "Unable to load asset details.",
            variant: "destructive",
          });
        } else if (data) {
          setAsset({
            id: data.id,
            title: data.title,
            publisher: "Opedd Publisher", // Could fetch from profiles table
            description: data.description || "Premium licensed content available for human citation and AI training.",
            humanPrice: Number(data.human_price) || 4.99,
            aiPrice: Number(data.ai_price) || 49.99,
            thumbnailUrl: data.thumbnail_url || undefined,
            publisherId: data.user_id,
          });
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [assetId, toast]);

  const handlePurchase = async () => {
    if (!asset) return;
    
    if (!buyerEmail || !buyerEmail.includes("@")) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address to receive your license.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutState("processing");
    
    try {
      // Generate transaction hash
      const hash = generateStoryProtocolHash();
      setTransactionHash(hash);
      
      // Simulate blockchain transaction delay
      await new Promise((r) => setTimeout(r, 2000));
      
      // Insert transaction into database
      const { error } = await supabase
        .from("transactions")
        .insert({
          asset_id: asset.id,
          publisher_id: asset.publisherId,
          amount: selectedLicense === "human" ? asset.humanPrice : asset.aiPrice,
          license_type: selectedLicense,
          status: "settled",
          story_protocol_hash: hash,
          buyer_email: buyerEmail,
        });

      if (error) {
        console.error("Transaction insert error:", error);
        toast({
          title: "Transaction Failed",
          description: "Unable to complete the purchase. Please try again.",
          variant: "destructive",
        });
        setCheckoutState("selection");
        return;
      }

      // Update asset license counts
      const updateField = selectedLicense === "human" ? "human_licenses_sold" : "ai_licenses_sold";
      const priceField = selectedLicense === "human" ? asset.humanPrice : asset.aiPrice;
      
      // Fetch current values first
      const { data: currentAsset } = await supabase
        .from("assets")
        .select("human_licenses_sold, ai_licenses_sold, total_revenue")
        .eq("id", asset.id)
        .maybeSingle();

      if (currentAsset) {
        const currentLicenses = selectedLicense === "human" 
          ? (currentAsset.human_licenses_sold || 0) 
          : (currentAsset.ai_licenses_sold || 0);
        const currentRevenue = currentAsset.total_revenue || 0;

        await supabase
          .from("assets")
          .update({
            [updateField]: currentLicenses + 1,
            total_revenue: Number(currentRevenue) + priceField,
          })
          .eq("id", asset.id);
      }

      setCheckoutState("success");
      toast({
        title: "License Secured!",
        description: "Your transaction has been recorded on the blockchain.",
      });
    } catch (err) {
      console.error("Purchase error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      setCheckoutState("selection");
    }
  };

  const selectedPrice = selectedLicense === "human" ? asset?.humanPrice : asset?.aiPrice;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Asset Not Found</h1>
          <p className="text-white/60 mb-4">The requested content could not be located.</p>
          <Link to="/" className="text-[#A78BFA] hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4A26ED]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
          <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 backdrop-blur-sm">
            <Lock size={12} className="mr-1.5" />
            Secure Checkout
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {checkoutState === "selection" && (
              <motion.div
                key="selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Asset Preview Card */}
                <motion.div variants={itemVariants}>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Thumbnail */}
                      <div className="w-full md:w-48 h-32 md:h-auto rounded-xl bg-gradient-to-br from-[#4A26ED]/30 to-[#7C3AED]/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                        <FileText size={48} className="text-white/40" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-white/50 text-sm mb-1">{asset.publisher}</p>
                            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                              {asset.title}
                            </h1>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex-shrink-0">
                            <Shield size={12} className="mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed">
                          {asset.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* License Selection */}
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Select License Type</h2>
                    <Badge variant="outline" className="border-[#4A26ED]/50 text-[#A78BFA] bg-[#4A26ED]/10">
                      <Shield size={12} className="mr-1.5" />
                      Verified by Story Protocol
                    </Badge>
                  </div>

                  <RadioGroup
                    value={selectedLicense}
                    onValueChange={(v) => setSelectedLicense(v as LicenseType)}
                    className="grid md:grid-cols-2 gap-4"
                  >
                    {/* Human License Card */}
                    <motion.label
                      variants={cardHoverVariants}
                      initial="idle"
                      whileHover="hover"
                      className="cursor-pointer"
                    >
                      <div
                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                          selectedLicense === "human"
                            ? "bg-white border-[#4A26ED] shadow-[0_0_30px_rgba(74,38,237,0.3)]"
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        }`}
                      >
                        <RadioGroupItem value="human" className="absolute top-4 right-4" />
                        
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                          selectedLicense === "human" 
                            ? "bg-gradient-to-br from-[#4A26ED] to-[#7C3AED]" 
                            : "bg-white/10"
                        }`}>
                          <User size={24} className={selectedLicense === "human" ? "text-white" : "text-white/60"} />
                        </div>

                        <h3 className={`text-lg font-bold mb-1 ${
                          selectedLicense === "human" ? "text-[#040042]" : "text-white"
                        }`}>
                          Individual / Human License
                        </h3>
                        
                        <p className={`text-sm mb-4 ${
                          selectedLicense === "human" ? "text-[#040042]/60" : "text-white/50"
                        }`}>
                          For personal citation, social sharing, and research.
                        </p>

                        <div className={`text-3xl font-bold ${
                          selectedLicense === "human" ? "text-[#4A26ED]" : "text-white"
                        }`}>
                          ${asset.humanPrice.toFixed(2)}
                        </div>
                      </div>
                    </motion.label>

                    {/* AI License Card */}
                    <motion.label
                      variants={cardHoverVariants}
                      initial="idle"
                      whileHover="hover"
                      className="cursor-pointer"
                    >
                      <div
                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                          selectedLicense === "ai"
                            ? "bg-white border-[#4A26ED] shadow-[0_0_30px_rgba(74,38,237,0.3)]"
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        }`}
                      >
                        <RadioGroupItem value="ai" className="absolute top-4 right-4" />
                        
                        {/* Popular badge */}
                        <div className="absolute -top-3 left-6">
                          <Badge className="bg-gradient-to-r from-[#D1009A] to-[#FF4DA6] text-white border-0 text-xs">
                            <Sparkles size={10} className="mr-1" />
                            Most Popular
                          </Badge>
                        </div>

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                          selectedLicense === "ai" 
                            ? "bg-gradient-to-br from-[#4A26ED] to-[#7C3AED]" 
                            : "bg-white/10"
                        }`}>
                          <Sparkles size={24} className={selectedLicense === "ai" ? "text-white" : "text-white/60"} />
                        </div>

                        <h3 className={`text-lg font-bold mb-1 ${
                          selectedLicense === "ai" ? "text-[#040042]" : "text-white"
                        }`}>
                          AI Training / Ingestion License
                        </h3>
                        
                        <p className={`text-sm mb-4 ${
                          selectedLicense === "ai" ? "text-[#040042]/60" : "text-white/50"
                        }`}>
                          For LLM training, RAG ingestion, and commercial AI agents.
                        </p>

                        <div className={`text-3xl font-bold ${
                          selectedLicense === "ai" ? "text-[#4A26ED]" : "text-white"
                        }`}>
                          ${asset.aiPrice.toFixed(2)}
                        </div>
                      </div>
                    </motion.label>
                  </RadioGroup>
                </motion.div>

                {/* Buyer Email & Purchase */}
                <motion.div variants={itemVariants}>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    {/* Email Input */}
                    <div className="mb-6">
                      <Label htmlFor="email" className="text-white/80 text-sm font-medium mb-2 block">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email for license delivery"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12 rounded-xl focus:border-[#4A26ED] focus:ring-[#4A26ED]/30"
                      />
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-white/50 text-sm">Total Amount</p>
                        <p className="text-3xl font-bold text-white">${selectedPrice?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Lock size={14} />
                        <span>256-bit SSL Encryption</span>
                      </div>
                    </div>

                    <Button
                      onClick={handlePurchase}
                      className="w-full h-14 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl font-semibold text-lg shadow-lg shadow-[#4A26ED]/30 transition-all active:scale-[0.98]"
                    >
                      <Lock size={18} className="mr-2" />
                      Complete Purchase
                    </Button>

                    <p className="text-center text-white/40 text-xs mt-4">
                      By completing this purchase, you agree to the license terms.
                      <br />
                      Rights are secured on the Story Protocol blockchain.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {checkoutState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-24"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] flex items-center justify-center">
                    <Loader2 size={40} className="text-white animate-spin" />
                  </div>
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full bg-[#4A26ED]/20 animate-ping" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mt-8 mb-2">
                  Securing Rights on Ledger...
                </h2>
                <p className="text-white/60 text-center max-w-md">
                  Your license is being permanently recorded on the Story Protocol blockchain.
                  This ensures verifiable ownership and usage rights.
                </p>

                {/* Progress steps */}
                <div className="flex items-center gap-3 mt-8">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check size={16} />
                    <span className="text-sm">Payment verified</span>
                  </div>
                  <div className="w-8 h-px bg-white/20" />
                  <div className="flex items-center gap-2 text-white animate-pulse">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Minting license...</span>
                  </div>
                  <div className="w-8 h-px bg-white/20" />
                  <div className="flex items-center gap-2 text-white/40">
                    <div className="w-4 h-4 rounded-full border border-white/40" />
                    <span className="text-sm">Complete</span>
                  </div>
                </div>
              </motion.div>
            )}

            {checkoutState === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center mb-8"
                >
                  <Check size={48} className="text-white" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2">License Secured!</h2>
                <p className="text-white/60 text-center max-w-md mb-8">
                  Your {selectedLicense === "human" ? "Individual" : "AI Training"} license for 
                  "{asset.title}" has been successfully recorded.
                </p>

                {/* Transaction Details */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md mb-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">License Type</span>
                      <span className="text-white font-medium">
                        {selectedLicense === "human" ? "Individual / Human" : "AI Training"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Amount Paid</span>
                      <span className="text-white font-medium">${selectedPrice?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Email</span>
                      <span className="text-white font-medium truncate max-w-[200px]">{buyerEmail}</span>
                    </div>
                    <hr className="border-white/10" />
                    <div>
                      <span className="text-white/50 text-sm block mb-1">Story Protocol TX</span>
                      <code className="text-[#A78BFA] text-xs break-all">{transactionHash}</code>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 border-white/20 text-white bg-white/5 hover:bg-white/10 rounded-xl"
                  >
                    <Download size={18} className="mr-2" />
                    Download Receipt
                  </Button>
                  <a
                    href={`https://explorer.story.foundation/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white rounded-xl"
                    >
                      <ExternalLink size={18} className="mr-2" />
                      View on Explorer
                    </Button>
                  </a>
                </div>

                <Link to="/" className="mt-8 text-white/50 hover:text-white text-sm transition-colors">
                  Return to Opedd Home
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
