import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Rss, 
  FileText, 
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Users,
  Bot,
  Check
} from "lucide-react";

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type SourceType = "publication" | "individual" | null;

export function AddAssetModal({ open, onOpenChange, onSuccess }: AddAssetModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Source Selection
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [rssUrl, setRssUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");

  // Step 2: Licensing Rules
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");
  const [storyProtocolEnabled, setStoryProtocolEnabled] = useState(true);

  const resetForm = () => {
    setStep(1);
    setSourceType(null);
    setRssUrl("");
    setTitle("");
    setPastedContent("");
    setHumanPrice("4.99");
    setAiPrice("49.99");
    setStoryProtocolEnabled(true);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNextStep = () => {
    if (!sourceType) {
      toast({
        title: "Select a Source",
        description: "Please choose how you want to add your content",
        variant: "destructive",
      });
      return;
    }
    if (sourceType === "publication" && !rssUrl) {
      toast({
        title: "RSS URL Required",
        description: "Please enter your publication's RSS feed URL",
        variant: "destructive",
      });
      return;
    }
    if (sourceType === "individual" && !title) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your work",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // TODO: Integrate with Supabase backend
      await new Promise((r) => setTimeout(r, 2000));

      toast({
        title: "Asset Registered",
        description: `Your content has been protected on Story Protocol`,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white border-none text-[#040042] sm:max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Header with Logo & Progress Stepper */}
        <div className="bg-[#040042] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A26ED] to-[#D1009A] flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">Opedd</span>
            </div>
            <span className="text-white/50 text-xs uppercase tracking-wider">IP Registration</span>
          </div>

          {/* Progress Stepper */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 1 ? "text-white" : "text-white/50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === 1 
                  ? "bg-[#4A26ED] text-white" 
                  : step === 2 
                    ? "bg-[#4A26ED] text-white" 
                    : "bg-white/10 text-white/50"
              }`}>
                {step > 1 ? <Check size={14} /> : "1"}
              </div>
              <span className="text-sm font-medium">Source</span>
            </div>
            
            <div className="flex-1 h-px bg-white/20 relative">
              <div className={`absolute inset-y-0 left-0 bg-[#4A26ED] transition-all duration-300 ${
                step >= 2 ? "w-full" : "w-0"
              }`} />
            </div>
            
            <div className={`flex items-center gap-2 ${step === 2 ? "text-white" : "text-white/50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === 2 
                  ? "bg-[#4A26ED] text-white" 
                  : "bg-white/10 text-white/50"
              }`}>
                2
              </div>
              <span className="text-sm font-medium">License</span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#040042] mb-1">Select Content Source</h2>
                <p className="text-sm text-[#040042]/60">Choose how you want to register your intellectual property</p>
              </div>

              {/* Source Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Connect Publication Card */}
                <button
                  type="button"
                  onClick={() => setSourceType("publication")}
                  className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                    sourceType === "publication"
                      ? "border-[#4A26ED] bg-[#4A26ED]/5 shadow-lg shadow-[#4A26ED]/10"
                      : "border-[#E8F2FB] bg-white hover:border-[#4A26ED]/30 hover:bg-[#F8FAFF]"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    sourceType === "publication" 
                      ? "bg-[#4A26ED] text-white" 
                      : "bg-[#F2F9FF] text-[#4A26ED]"
                  }`}>
                    <Rss size={24} />
                  </div>
                  <h3 className="font-bold text-[#040042] mb-1">Connect Publication</h3>
                  <p className="text-xs text-[#040042]/60 leading-relaxed">
                    Sync your Substack, Ghost, or any RSS feed for automated protection
                  </p>
                  {sourceType === "publication" && (
                    <div className="mt-3 flex items-center gap-1.5 text-[#4A26ED] text-xs font-medium">
                      <Check size={12} />
                      Selected
                    </div>
                  )}
                </button>

                {/* Individual Work Card */}
                <button
                  type="button"
                  onClick={() => setSourceType("individual")}
                  className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                    sourceType === "individual"
                      ? "border-[#4A26ED] bg-[#4A26ED]/5 shadow-lg shadow-[#4A26ED]/10"
                      : "border-[#E8F2FB] bg-white hover:border-[#4A26ED]/30 hover:bg-[#F8FAFF]"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    sourceType === "individual" 
                      ? "bg-[#4A26ED] text-white" 
                      : "bg-[#F2F9FF] text-[#4A26ED]"
                  }`}>
                    <FileText size={24} />
                  </div>
                  <h3 className="font-bold text-[#040042] mb-1">Individual Work</h3>
                  <p className="text-xs text-[#040042]/60 leading-relaxed">
                    Register a single article, essay, or written piece manually
                  </p>
                  {sourceType === "individual" && (
                    <div className="mt-3 flex items-center gap-1.5 text-[#4A26ED] text-xs font-medium">
                      <Check size={12} />
                      Selected
                    </div>
                  )}
                </button>
              </div>

              {/* Conditional Inputs */}
              {sourceType === "publication" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="rss-url" className="text-[#040042] font-semibold text-sm">
                      RSS Feed URL
                    </Label>
                    <Input
                      id="rss-url"
                      type="url"
                      placeholder="https://yourpublication.substack.com/feed"
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl text-[#040042] placeholder:text-[#040042]/40 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                    />
                    <p className="text-xs text-[#040042]/50">We'll automatically sync and protect all your articles</p>
                  </div>
                </div>
              )}

              {sourceType === "individual" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[#040042] font-semibold text-sm">
                      Work Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="The Future of AI Governance"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl text-[#040042] placeholder:text-[#040042]/40 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-[#040042] font-semibold text-sm">
                      Paste Content or URL
                    </Label>
                    <Textarea
                      id="content"
                      placeholder="Paste your article content or a direct link to the published work..."
                      value={pastedContent}
                      onChange={(e) => setPastedContent(e.target.value)}
                      className="bg-[#F2F9FF] border-[#E8F2FB] rounded-xl min-h-[100px] text-[#040042] placeholder:text-[#040042]/40 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#040042] mb-1">Configure Licensing</h2>
                <p className="text-sm text-[#040042]/60">Set your terms for how your content can be used and monetized</p>
              </div>

              {/* Licensing Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Human Licensing */}
                <div className="p-5 rounded-xl border border-[#E8F2FB] bg-[#F8FAFF]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center">
                      <Users size={20} className="text-[#4A26ED]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#040042] text-sm">Human Licensing</h3>
                      <p className="text-xs text-[#040042]/50">Republication & citation</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="human-price" className="text-[#040042]/70 text-xs font-medium">
                      Price per license ($)
                    </Label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/40" />
                      <Input
                        id="human-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={humanPrice}
                        onChange={(e) => setHumanPrice(e.target.value)}
                        className="bg-white border-[#E8F2FB] h-11 rounded-lg pl-9 text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Training Access */}
                <div className="p-5 rounded-xl border border-[#E8F2FB] bg-[#F8FAFF]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#D1009A]/10 flex items-center justify-center">
                      <Bot size={20} className="text-[#D1009A]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#040042] text-sm">AI Training Access</h3>
                      <p className="text-xs text-[#040042]/50">Model ingestion & training</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-price" className="text-[#040042]/70 text-xs font-medium">
                      Price per license ($)
                    </Label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/40" />
                      <Input
                        id="ai-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={aiPrice}
                        onChange={(e) => setAiPrice(e.target.value)}
                        className="bg-white border-[#E8F2FB] h-11 rounded-lg pl-9 text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Story Protocol Section */}
              <div className="p-5 rounded-xl border-2 border-[#4A26ED]/20 bg-gradient-to-br from-[#4A26ED]/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#4A26ED] flex items-center justify-center">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#040042]">Story Protocol Registration</h3>
                      <p className="text-sm text-[#040042]/60">Automated on-chain IP protection & provenance</p>
                    </div>
                  </div>
                  <Switch
                    checked={storyProtocolEnabled}
                    onCheckedChange={setStoryProtocolEnabled}
                    className="data-[state=checked]:bg-[#4A26ED]"
                  />
                </div>
                {storyProtocolEnabled && (
                  <div className="mt-4 pt-4 border-t border-[#4A26ED]/10 flex items-center gap-2 text-xs text-[#4A26ED]">
                    <Check size={14} />
                    <span>Your work will be registered with immutable ownership proof</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-5 border-t border-[#E8F2FB]">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12 rounded-xl border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF] font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!sourceType}
                  className="flex-1 h-12 rounded-xl bg-[#040042] hover:bg-[#0A0066] text-white font-semibold disabled:opacity-40"
                >
                  Continue to Licensing
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="h-12 px-6 rounded-xl border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF] font-medium"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7B5CF5] hover:from-[#3D1FD1] hover:to-[#6B4CE5] text-white font-semibold shadow-lg shadow-[#4A26ED]/25 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Minting on Story Protocol...
                    </>
                  ) : (
                    <>
                      <Shield size={18} className="mr-2" />
                      Register & Protect on Story Protocol
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
