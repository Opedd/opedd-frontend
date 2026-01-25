import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  LinkIcon, 
  FileText, 
  Bot, 
  Users, 
  Building2, 
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield
} from "lucide-react";

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAssetModal({ open, onOpenChange, onSuccess }: AddAssetModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Source Connection
  const [contentUrl, setContentUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("article");

  // Step 2: Licensing Rules
  const [humanConsumption, setHumanConsumption] = useState(true);
  const [aiTraining, setAiTraining] = useState(true);
  const [commercialRedist, setCommercialRedist] = useState(false);
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");

  const resetForm = () => {
    setStep(1);
    setContentUrl("");
    setTitle("");
    setDescription("");
    setCategory("article");
    setHumanConsumption(true);
    setAiTraining(true);
    setCommercialRedist(false);
    setHumanPrice("4.99");
    setAiPrice("49.99");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNextStep = () => {
    if (!contentUrl || !title) {
      toast({
        title: "Required Fields",
        description: "Please enter the content URL and title",
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
        description: `"${title}" has been minted and added to your Smart Library`,
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
      <DialogContent className="bg-white border-[#040042]/10 text-[#040042] sm:max-w-xl rounded-2xl p-0 overflow-hidden">
        {/* Header with Step Indicator */}
        <div className="bg-gradient-to-r from-[#040042] to-[#4A26ED] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-[#D1009A]" />
              Register New Asset
            </DialogTitle>
            <DialogDescription className="text-white/70 mt-1">
              {step === 1 ? "Connect your content source" : "Configure licensing rules"}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-3 mt-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              step === 1 ? "bg-white text-[#040042]" : "bg-white/20 text-white/80"
            }`}>
              <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
              Source
            </div>
            <div className="w-8 h-px bg-white/30" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              step === 2 ? "bg-white text-[#040042]" : "bg-white/20 text-white/80"
            }`}>
              <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
              Licensing
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-5">
              {/* Content URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="text-[#040042]/80 font-medium flex items-center gap-2">
                  <LinkIcon size={14} className="text-[#4A26ED]" />
                  Content URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-publication.com/article"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl text-[#040042] placeholder:text-[#040042]/40"
                />
                <p className="text-xs text-[#040042]/50">Paste the URL of your article, video, or audio content</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#040042]/80 font-medium flex items-center gap-2">
                  <FileText size={14} className="text-[#4A26ED]" />
                  Asset Title
                </Label>
                <Input
                  id="title"
                  placeholder="The Future of AI Governance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#F2F9FF] border-[#E8F2FB] h-12 rounded-xl text-[#040042] placeholder:text-[#040042]/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#040042]/80 font-medium">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="A comprehensive analysis of..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[#F2F9FF] border-[#E8F2FB] rounded-xl min-h-[80px] text-[#040042] placeholder:text-[#040042]/40"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[#040042]/80 font-medium">
                  Content Type
                </Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#F2F9FF] border border-[#E8F2FB] h-12 rounded-xl px-4 text-[#040042] focus:outline-none focus:ring-2 focus:ring-[#4A26ED]/20"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio / Podcast</option>
                  <option value="research">Research Paper</option>
                  <option value="dataset">Dataset</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Licensing Toggles */}
              <div className="space-y-3">
                <Label className="text-[#040042]/80 font-medium flex items-center gap-2">
                  <Bot size={14} className="text-[#4A26ED]" />
                  Licensing Engine
                </Label>

                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl border border-[#E8F2FB]">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">Human Consumption</p>
                      <p className="text-xs text-[#040042]/50">Individual readers and subscribers</p>
                    </div>
                  </div>
                  <Switch checked={humanConsumption} onCheckedChange={setHumanConsumption} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl border border-[#E8F2FB]">
                  <div className="flex items-center gap-3">
                    <Bot size={18} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">AI Model Training</p>
                      <p className="text-xs text-[#040042]/50">LLM providers and AI companies</p>
                    </div>
                  </div>
                  <Switch checked={aiTraining} onCheckedChange={setAiTraining} />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F2F9FF] rounded-xl border border-[#E8F2FB]">
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-[#4A26ED]" />
                    <div>
                      <p className="font-medium text-[#040042] text-sm">Commercial Redistribution</p>
                      <p className="text-xs text-[#040042]/50">Syndication and republishing rights</p>
                    </div>
                  </div>
                  <Switch checked={commercialRedist} onCheckedChange={setCommercialRedist} />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <Label className="text-[#040042]/80 font-medium flex items-center gap-2">
                  <DollarSign size={14} className="text-[#D1009A]" />
                  Dynamic Pricing
                </Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#040042]/60 text-xs">Human License</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/50 text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={humanPrice}
                        onChange={(e) => setHumanPrice(e.target.value)}
                        disabled={!humanConsumption}
                        className="bg-[#F2F9FF] border-[#E8F2FB] h-11 rounded-xl pl-8 text-[#040042] disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#040042]/60 text-xs">AI Training License</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#040042]/50 text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={aiPrice}
                        onChange={(e) => setAiPrice(e.target.value)}
                        disabled={!aiTraining}
                        className="bg-[#F2F9FF] border-[#E8F2FB] h-11 rounded-xl pl-8 text-[#040042] disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-[#E8F2FB]">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12 rounded-xl border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 rounded-xl bg-[#040042] hover:bg-[#0A0066] text-white font-semibold"
                >
                  Continue
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
                  className="flex-1 h-12 rounded-xl border-[#E8F2FB] text-[#040042] hover:bg-[#F2F9FF]"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl bg-[#D1009A] hover:bg-[#B8008A] text-white font-semibold disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Minting on Story Protocol...
                    </>
                  ) : (
                    <>
                      <Shield size={16} className="mr-2" />
                      Register Asset
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
