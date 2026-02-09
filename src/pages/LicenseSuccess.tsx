import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Download, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

export default function LicenseSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040042] via-[#0A0066] to-[#040042] relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#4A26ED]/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <img src={opeddLogo} alt="Opedd" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Center content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center space-y-8"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
          >
            <Check size={40} className="text-emerald-400" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">License Secured!</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Your license has been recorded on the Opedd Rights Ledger. You now have authorized access to use this content under the selected terms.
            </p>
          </div>

          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mx-auto">
            <Shield size={12} className="mr-1.5" />
            Verified & Recorded
          </Badge>

          {/* Certificate placeholder */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white/80">License Certificate</h2>
            <p className="text-xs text-white/40">
              Your certificate will be available for download shortly. We'll also email it to you.
            </p>
            <Button
              disabled
              className="w-full bg-white/10 border border-white/20 text-white/60 hover:bg-white/15 h-11 rounded-xl gap-2 cursor-not-allowed"
            >
              <Download size={16} />
              Download Certificate (Coming Soon)
            </Button>
          </div>

          <Link
            to="/"
            className="inline-block text-sm text-[#A78BFA] hover:underline"
          >
            ← Return to Opedd
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
