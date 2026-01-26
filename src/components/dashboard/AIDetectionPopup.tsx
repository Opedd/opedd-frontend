import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, ExternalLink } from "lucide-react";

interface AIDetectionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botName: string;
  assetTitle: string;
}

export function AIDetectionPopup({ 
  open, 
  onOpenChange, 
  botName, 
  assetTitle 
}: AIDetectionPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <AlertTriangle className="text-amber-600" size={24} />
          </div>
          <DialogTitle className="text-[#040042] text-xl">
            Unlicensed AI Activity Detected
          </DialogTitle>
          <DialogDescription className="text-[#040042]/60 mt-2">
            <span className="font-semibold text-[#4A26ED]">{botName}</span> accessed your content 
            <span className="font-medium text-[#040042]"> "{assetTitle}"</span> without a valid license.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gradient-to-br from-[#040042] to-[#1a1a5c] rounded-xl p-4 my-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-[#4A26ED]" />
            <p className="font-semibold text-sm">Protect Your Content</p>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            Mint this asset on Story Protocol to enable automated billing for AI Labs. 
            Every future access will be logged and monetized automatically.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Dismiss
          </Button>
          <Button
            className="w-full sm:w-auto bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white"
            onClick={() => {
              // In production, this would navigate to the minting flow
              onOpenChange(false);
            }}
          >
            <Shield size={16} className="mr-2" />
            Mint on Story Protocol
            <ExternalLink size={14} className="ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
