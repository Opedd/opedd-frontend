import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingPriceBarProps {
  selectedCount: number;
  onSetPrices: () => void;
  onClearSelection: () => void;
}

export function FloatingPriceBar({ selectedCount, onSetPrices, onClearSelection }: FloatingPriceBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-[#040042] text-white rounded-2xl px-5 py-3 shadow-2xl shadow-[#040042]/30 flex items-center gap-4 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#4A26ED] flex items-center justify-center text-sm font-bold">
                {selectedCount}
              </div>
              <span className="text-sm text-white/80">
                item{selectedCount !== 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <Button
              onClick={onSetPrices}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-9 px-4 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
            >
              <DollarSign size={14} />
              Set Prices for {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
            </Button>

            <button
              onClick={onClearSelection}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
