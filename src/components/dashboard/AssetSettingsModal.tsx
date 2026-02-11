import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign,
  Loader2,
  X,
  Code,
  Link2,
  Clipboard,
  Check,
  Users,
  Bot,
  ExternalLink
} from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";
import { Asset } from "@/types/asset";

interface AssetSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  onUpdate?: (id: string, humanPrice: string, aiPrice: string) => void;
}

export function AssetSettingsModal({ open, onOpenChange, asset, onUpdate }: AssetSettingsModalProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!asset || !open) return null;

  const directPayLink = `${window.location.origin}/l/${asset.id}`;
  const widgetCode = `<script src="https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget" data-asset-id="${asset.id}" data-frontend-url="${window.location.origin}"></script>`;

  const handleCopy = async (text: string, type: "widget" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "widget") {
        setCopiedWidget(true);
        setTimeout(() => setCopiedWidget(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast({
        title: "Copied!",
        description: type === "widget" ? "Widget code copied to clipboard" : "Direct link copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePricing = async () => {
    setIsUpdating(true);
    try {
      // TODO: Integrate with Supabase
      await new Promise((r) => setTimeout(r, 1500));
      onUpdate?.(asset.id, humanPrice, aiPrice);
      toast({
        title: "Pricing Updated",
        description: "Your licensing fees have been saved",
      });
    } catch {
      toast({
        title: "Update Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-50 border-none text-[#040042] sm:max-w-xl rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Branded Header */}
        <div className="bg-[#040042] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={opeddLogo} alt="Opedd" className="h-7" />
              <div className="h-5 w-px bg-white/20" />
              <div>
                <h1 className="text-white font-bold text-base leading-tight">Asset Settings</h1>
                <p className="text-white/60 text-sm truncate max-w-[250px]">{asset.title}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Distribution Tabs */}
          <div>
            <h3 className="text-sm font-bold text-[#040042] mb-3">Distribution</h3>
            <Tabs defaultValue="widget" className="w-full">
              <TabsList className="w-full bg-slate-100 p-1 rounded-xl h-11">
                <TabsTrigger 
                  value="widget" 
                  className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                >
                  <Code size={14} className="mr-2" />
                  Embed Widget
                </TabsTrigger>
                <TabsTrigger 
                  value="link" 
                  className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#040042] data-[state=active]:shadow-sm"
                >
                  <Link2 size={14} className="mr-2" />
                  Direct Pay Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="widget" className="mt-3">
                <div className="bg-slate-900 rounded-xl p-4 relative group">
                  <code className="text-xs text-emerald-400 font-mono break-all leading-relaxed">
                    {widgetCode}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(widgetCode, "widget")}
                    className="absolute top-2 right-2 h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
                  >
                    {copiedWidget ? (
                      <>
                        <Check size={12} className="mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Clipboard size={12} className="mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Add this script to your website to enable licensing
                </p>
              </TabsContent>

              <TabsContent value="link" className="mt-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5">
                    <code className="text-sm text-[#4A26ED] font-mono">
                      {directPayLink}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(directPayLink, "link")}
                    className="h-9 px-4 bg-[#040042] hover:bg-[#0A0066] text-white rounded-lg text-xs font-medium"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={12} className="mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Clipboard size={12} className="mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-slate-400">
                    Share this link to accept payments directly
                  </p>
                  <a 
                    href={directPayLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#4A26ED] hover:underline flex items-center gap-1"
                  >
                    Preview <ExternalLink size={10} />
                  </a>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200" />

          {/* Update Pricing */}
          <div>
            <h3 className="text-sm font-bold text-[#040042] mb-3">Update Pricing</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Human Fee */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-[#4A26ED]/10 flex items-center justify-center">
                    <Users size={14} className="text-[#4A26ED]" />
                  </div>
                  <Label className="text-xs font-semibold text-[#040042]">Human Fee</Label>
                </div>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={humanPrice}
                    onChange={(e) => setHumanPrice(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-9 rounded-lg pl-8 text-sm text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                  />
                </div>
              </div>

              {/* AI Fee */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-[#D1009A]/10 flex items-center justify-center">
                    <Bot size={14} className="text-[#D1009A]" />
                  </div>
                  <Label className="text-xs font-semibold text-[#040042]">AI Fee</Label>
                </div>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={aiPrice}
                    onChange={(e) => setAiPrice(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-9 rounded-lg pl-8 text-sm text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <Button
            type="button"
            onClick={handleClose}
            className="h-10 px-5 rounded-xl bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleUpdatePricing}
            disabled={isUpdating}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all disabled:opacity-60"
          >
            {isUpdating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
