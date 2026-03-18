import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, X, Loader2 } from "lucide-react";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useToast } from "@/hooks/use-toast";

interface SourcePricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceName: string;
  onSuccess: () => void;
}

export function SourcePricingModal({ open, onOpenChange, sourceId, sourceName, onSuccess }: SourcePricingModalProps) {
  const { licenses } = useAuthenticatedApi();
  const { toast } = useToast();
  const [humanPrice, setHumanPrice] = useState("");
  const [aiPrice, setAiPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const body: {
        sourceId: string;
        humanPrice?: number;
        aiPrice?: number;
      } = { sourceId };
      if (humanPrice !== "") body.humanPrice = parseFloat(humanPrice) || 0;
      if (aiPrice !== "") body.aiPrice = parseFloat(aiPrice) || 0;

      await licenses.updatePrices(body);

      toast({
        title: "Default Pricing Set",
        description: `All articles from "${sourceName}" have been updated.`,
      });
      onSuccess();
      onOpenChange(false);
      setHumanPrice("");
      setAiPrice("");
    } catch (err) {
      console.error("Source pricing error:", err);
      toast({
        title: "Update Failed",
        description: "Could not apply pricing to this source.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="bg-white border-none text-[#040042] sm:max-w-md rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#040042] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <DollarSign size={20} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Set Default Pricing</h2>
                <p className="text-white/60 text-sm truncate max-w-[200px]">{sourceName}</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-[#040042]/50">
            Set default license prices for all articles from this source. This will update all existing articles from this feed.
          </p>

          {/* Human License Price */}
          <div className="space-y-2">
            <Label className="text-[#040042] font-bold text-sm">Human Republication License</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={humanPrice}
                onChange={(e) => setHumanPrice(e.target.value)}
                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 text-sm"
              />
            </div>
          </div>

          {/* AI Training Price */}
          <div className="space-y-2">
            <Label className="text-[#040042] font-bold text-sm">AI Training / Ingestion License</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/40 font-semibold text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={aiPrice}
                onChange={(e) => setAiPrice(e.target.value)}
                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-xl bg-[#4A26ED] hover:bg-[#3B1ED1] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all active:scale-[0.98] gap-2"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <DollarSign size={16} />
            )}
            {isSaving ? "Applying…" : "Apply Pricing to All Articles"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
