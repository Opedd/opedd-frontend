import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, X, Loader2, ShoppingBag } from "lucide-react";
import { useAuthenticatedApi } from "@/hooks/useAuthenticatedApi";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/Spinner";

interface BulkPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

export function BulkPricingModal({ open, onOpenChange, selectedIds, onSuccess }: BulkPricingModalProps) {
  const { licenses } = useAuthenticatedApi();
  const { toast } = useToast();
  const [humanPrice, setHumanPrice] = useState("");
  const [aiPrice, setAiPrice] = useState("");
  const [listOnMarketplace, setListOnMarketplace] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsedHuman = humanPrice !== "" ? parseFloat(humanPrice) : undefined;
    const parsedAi = aiPrice !== "" ? parseFloat(aiPrice) : undefined;
    if ((parsedHuman !== undefined && parsedHuman < 0) || (parsedAi !== undefined && parsedAi < 0)) {
      toast({ variant: "destructive", title: "Invalid price", description: "Prices cannot be negative." });
      return;
    }
    setIsSaving(true);
    try {
      const body: {
        articleIds: string[];
        humanPrice?: number;
        aiPrice?: number;
        licensingEnabled: boolean;
      } = {
        articleIds: selectedIds,
        licensingEnabled: listOnMarketplace,
      };
      if (parsedHuman !== undefined && !isNaN(parsedHuman)) body.humanPrice = parsedHuman;
      if (parsedAi !== undefined && !isNaN(parsedAi)) body.aiPrice = parsedAi;

      await licenses.updatePrices(body);

      toast({
        title: "Prices Updated",
        description: `Pricing applied to ${selectedIds.length} asset${selectedIds.length !== 1 ? "s" : ""}.`,
      });
      onSuccess();
      onOpenChange(false);
      setHumanPrice("");
      setAiPrice("");
    } catch (err) {
      console.error("Bulk pricing error:", err);
      toast({
        title: "Update Failed",
        description: "Could not apply pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-none text-navy-deep sm:max-w-md rounded-xl p-0 overflow-hidden shadow-modal">
        {/* Header */}
        <div className="bg-navy-deep px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Set License Prices</h2>
              <p className="text-white/60 text-sm">{selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Human License Price */}
          <div className="space-y-2">
            <Label className="text-navy-deep font-bold text-sm">Human Republication License</Label>
            <p className="text-xs text-navy-deep/50">Fee for human readers or publishers to republish.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-deep/40 font-semibold text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={humanPrice}
                onChange={(e) => setHumanPrice(e.target.value)}
                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-oxford focus:ring-oxford/20 text-sm"
              />
            </div>
          </div>

          {/* AI Training Price */}
          <div className="space-y-2">
            <Label className="text-navy-deep font-bold text-sm">AI Training / Ingestion License</Label>
            <p className="text-xs text-navy-deep/50">Fee for AI companies to train on or ingest this content.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-deep/40 font-semibold text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={aiPrice}
                onChange={(e) => setAiPrice(e.target.value)}
                className="bg-slate-50 border-slate-200 h-12 rounded-xl pl-8 focus:border-oxford focus:ring-oxford/20 text-sm"
              />
            </div>
          </div>

          {/* Marketplace Toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag size={18} className="text-oxford" />
              <div>
                <p className="text-sm font-semibold text-navy-deep">List on Marketplace</p>
                <p className="text-xs text-navy-deep/50">Make these assets available for licensing</p>
              </div>
            </div>
            <Switch
              checked={listOnMarketplace}
              onCheckedChange={setListOnMarketplace}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-xl bg-oxford hover:bg-oxford-dark text-white font-semibold text-sm shadow-card shadow-card/25 transition-all active:scale-[0.98] gap-2"
          >
            {isSaving ? (
              <Spinner size="md" />
            ) : (
              <DollarSign size={16} />
            )}
            {isSaving ? "Applying…" : `Apply Prices to ${selectedIds.length} Item${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
