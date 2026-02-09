import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  User,
  Sparkles,
  Loader2,
  Lock,
  ArrowLeft,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface AssetData {
  id: string;
  title: string;
  description: string;
  humanPrice: number;
  aiPrice: number;
  wordCount: number;
  publishedAt: string | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function countWords(text?: string | null): number {
  if (!text) return 0;
  return stripHtml(text).split(/\s+/).filter(Boolean).length;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LicenseCheckout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<"human" | "ai" | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("assets")
          .select("id, title, description, content, human_price, ai_price, published_at, verification_status")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          setAsset(null);
        } else {
          setAsset({
            id: data.id,
            title: data.title,
            description: data.description || "",
            humanPrice: Number(data.human_price) || 0,
            aiPrice: Number(data.ai_price) || 0,
            wordCount: countWords(data.content || data.description),
            publishedAt: data.published_at,
          });
        }
      } catch {
        setAsset(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAsset();
  }, [id]);

  const handlePurchase = async (type: "human" | "ai") => {
    if (!asset) return;
    setPurchasing(type);

    try {
      // TODO: call create-licensing-session edge function → redirect to Stripe
      // For now, simulate and redirect to success
      await new Promise((r) => setTimeout(r, 1500));
      navigate("/license/success");
    } catch {
      toast({
        title: "Error",
        description: "Unable to start checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

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
          <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-white/60 mb-4">This licensing link may be invalid or expired.</p>
          <Link to="/" className="text-[#A78BFA] hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  const snippet = asset.description
    ? stripHtml(asset.description).slice(0, 200) + (asset.description.length > 200 ? "…" : "")
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4A26ED]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
          <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 backdrop-blur-sm">
            <Lock size={12} className="mr-1.5" />
            Secure Licensing
          </Badge>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 px-6 pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }}
          className="max-w-3xl mx-auto space-y-8"
        >
          {/* Article Info */}
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{asset.title}</h1>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0">
                <Shield size={12} className="mr-1" />
                Verified
              </Badge>
            </div>

            {snippet && (
              <p className="text-white/60 text-sm leading-relaxed mb-5">{snippet}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-white/40 text-xs">
              {asset.wordCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  {asset.wordCount.toLocaleString()} words
                </span>
              )}
              {asset.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {new Date(asset.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </div>
          </motion.div>

          {/* License Choice */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold text-white mb-4">Choose a License</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Human License */}
              <button
                onClick={() => handlePurchase("human")}
                disabled={purchasing !== null || asset.humanPrice <= 0}
                className="group text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#4A26ED]/60 rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(74,38,237,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-gradient-to-br group-hover:from-[#4A26ED] group-hover:to-[#7C3AED] flex items-center justify-center mb-4 transition-all">
                  <User size={24} className="text-white/60 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Human License</h3>
                <p className="text-sm text-white/50 mb-4">
                  For citation, republication, and personal research use.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-white">
                    {asset.humanPrice > 0 ? `$${asset.humanPrice.toFixed(2)}` : "—"}
                  </span>
                  {purchasing === "human" && <Loader2 size={20} className="text-white animate-spin" />}
                </div>
              </button>

              {/* AI License */}
              <button
                onClick={() => handlePurchase("ai")}
                disabled={purchasing !== null || asset.aiPrice <= 0}
                className="group text-left bg-white/5 backdrop-blur-xl border border-white/10 hover:border-[#4A26ED]/60 rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(74,38,237,0.15)] disabled:opacity-40 disabled:cursor-not-allowed relative"
              >
                {asset.aiPrice > 0 && (
                  <div className="absolute -top-3 left-6">
                    <Badge className="bg-gradient-to-r from-[#D1009A] to-[#FF4DA6] text-white border-0 text-xs">
                      <Sparkles size={10} className="mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-gradient-to-br group-hover:from-[#4A26ED] group-hover:to-[#7C3AED] flex items-center justify-center mb-4 transition-all">
                  <Sparkles size={24} className="text-white/60 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">AI Training License</h3>
                <p className="text-sm text-white/50 mb-4">
                  For LLM training, RAG ingestion, and commercial AI use.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-white">
                    {asset.aiPrice > 0 ? `$${asset.aiPrice.toFixed(2)}` : "—"}
                  </span>
                  {purchasing === "ai" && <Loader2 size={20} className="text-white animate-spin" />}
                </div>
              </button>
            </div>
          </motion.div>

          {/* Footer trust */}
          <motion.div variants={itemVariants} className="text-center text-white/30 text-xs flex items-center justify-center gap-2">
            <Shield size={12} />
            Licensed & verified on the Opedd Rights Ledger
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
