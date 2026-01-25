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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Rss, 
  FileText, 
  DollarSign,
  Loader2,
  Shield,
  Users,
  Bot,
  X,
  Link2,
  Code,
  Clipboard,
  Check,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface AddAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type SourceType = "publication" | "individual";
type ModalState = "form" | "success";

export function AddAssetModal({ open, onOpenChange, onSuccess }: AddAssetModalProps) {
  const { toast } = useToast();
  const [modalState, setModalState] = useState<ModalState>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredAssetId, setRegisteredAssetId] = useState<string | null>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Source Selection
  const [sourceType, setSourceType] = useState<SourceType>("publication");
  const [rssUrl, setRssUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");

  // Licensing Rules
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");
  const [attributionRequired, setAttributionRequired] = useState(true);

  const resetForm = () => {
    setModalState("form");
    setSourceType("publication");
    setRssUrl("");
    setTitle("");
    setPastedContent("");
    setHumanPrice("4.99");
    setAiPrice("49.99");
    setAttributionRequired(true);
    setRegisteredAssetId(null);
    setCopiedWidget(false);
    setCopiedLink(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Generate distribution links
  const directPayLink = registeredAssetId 
    ? `https://opedd.io/pay/${registeredAssetId}` 
    : "";
  const widgetCode = registeredAssetId 
    ? `<script src="https://opedd.io/widget.js" data-asset-id="${registeredAssetId}"></script>` 
    : "";

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

  const handleSubmit = async () => {
    // Validation
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

    setIsSubmitting(true);

    try {
      // TODO: Integrate with Supabase backend
      await new Promise((r) => setTimeout(r, 2500));

      // Generate a mock asset ID for demo
      const mockAssetId = crypto.randomUUID();
      setRegisteredAssetId(mockAssetId);
      setModalState("success");

      toast({
        title: "Asset Registered",
        description: "Your content has been protected on Story Protocol",
      });

      onSuccess?.();
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

  // SUCCESS STATE VIEW
  if (modalState === "success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-50 border-none text-[#040042] sm:max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl">
          {/* Branded Header */}
          <div className="bg-[#040042] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={opeddLogo} alt="Opedd" className="h-8" />
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight">Registration Complete</h1>
                  <p className="text-emerald-400 text-sm">Your IP is now protected on Story Protocol</p>
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

          {/* Success Content */}
          <div className="p-6">
            {/* Success Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
            </div>

            {/* Distribution Tabs */}
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

              <TabsContent value="widget" className="mt-4">
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
                <p className="text-xs text-slate-500 mt-2">
                  Add this script tag to your website to enable licensing
                </p>
              </TabsContent>

              <TabsContent value="link" className="mt-4">
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 overflow-hidden">
                    <code className="text-sm text-[#4A26ED] font-mono truncate block">
                      {directPayLink}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(directPayLink, "link")}
                    className="h-9 px-4 bg-[#040042] hover:bg-[#0A0066] text-white rounded-lg text-xs font-medium flex-shrink-0"
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
                  <p className="text-xs text-slate-500">
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

          {/* Footer */}
          <div className="p-5 bg-white border-t border-slate-200">
            <Button
              type="button"
              onClick={handleClose}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-sm shadow-lg shadow-[#4A26ED]/25 transition-all"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // FORM STATE VIEW
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-50 border-none text-[#040042] sm:max-w-3xl rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Branded Header */}
        <div className="bg-[#040042] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={opeddLogo} alt="Opedd" className="h-8" />
              <div className="h-6 w-px bg-white/20" />
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">Register Intellectual Property</h1>
                <p className="text-[#A78BFA] text-sm">Set your licensing terms on Story Protocol</p>
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

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left Column: Source */}
          <div className="p-6 bg-white border-r border-slate-200">
            <h2 className="text-lg font-bold text-[#040042] mb-1">Content Source</h2>
            <p className="text-sm text-slate-500 mb-5">Choose how to register your work</p>

            {/* Source Type Toggle Cards */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setSourceType("publication")}
                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  sourceType === "publication"
                    ? "border-[#4A26ED] bg-[#4A26ED]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    sourceType === "publication" 
                      ? "bg-[#4A26ED] text-white" 
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    <Rss size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${sourceType === "publication" ? "text-[#040042]" : "text-slate-700"}`}>
                      Publication Feed
                    </p>
                    <p className="text-xs text-slate-400">RSS / Atom</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("individual")}
                className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  sourceType === "individual"
                    ? "border-[#4A26ED] bg-[#4A26ED]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    sourceType === "individual" 
                      ? "bg-[#4A26ED] text-white" 
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${sourceType === "individual" ? "text-[#040042]" : "text-slate-700"}`}>
                      Individual Work
                    </p>
                    <p className="text-xs text-slate-400">PDF / Text</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Context-Aware Input */}
            {sourceType === "publication" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rss-url" className="text-[#040042] font-semibold text-sm">
                    RSS Feed URL
                  </Label>
                  <div className="relative">
                    <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="rss-url"
                      type="url"
                      placeholder="https://your-publication.substack.com/feed"
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      className="bg-slate-50 border-slate-200 h-11 rounded-xl pl-10 text-[#040042] placeholder:text-slate-400 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Supports Substack, Ghost, Medium, WordPress & more</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#040042] font-semibold text-sm">
                    Work Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="The Future of AI Governance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-11 rounded-xl text-[#040042] placeholder:text-slate-400 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-[#040042] font-semibold text-sm">
                    Content or URL
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your article text or a direct URL to the work..."
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-xl min-h-[100px] text-[#040042] placeholder:text-slate-400 focus:border-[#4A26ED] focus:ring-[#4A26ED]/20 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Licensing Engine */}
          <div className="p-6 bg-slate-50">
            <h2 className="text-lg font-bold text-[#040042] mb-1">Commercial Terms</h2>
            <p className="text-sm text-slate-500 mb-5">Define how your IP can be licensed</p>

            {/* Pricing Grid */}
            <div className="space-y-4">
              {/* Human Fee */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#4A26ED]/10 flex items-center justify-center">
                    <Users size={18} className="text-[#4A26ED]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#040042]">Human Fee</p>
                    <p className="text-xs text-slate-400">Republication & citation</p>
                  </div>
                </div>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="human-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={humanPrice}
                    onChange={(e) => setHumanPrice(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-9 text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                  />
                </div>
              </div>

              {/* AI Fee */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#D1009A]/10 flex items-center justify-center">
                    <Bot size={18} className="text-[#D1009A]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#040042]">AI Fee</p>
                    <p className="text-xs text-slate-400">LLM training & ingestion</p>
                  </div>
                </div>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="ai-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={aiPrice}
                    onChange={(e) => setAiPrice(e.target.value)}
                    className="bg-slate-50 border-slate-200 h-10 rounded-lg pl-9 text-[#040042] font-semibold focus:border-[#4A26ED] focus:ring-[#4A26ED]/20"
                  />
                </div>
              </div>

              {/* Attribution Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Shield size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#040042]">Require Canonical Attribution</p>
                      <p className="text-xs text-slate-400">Licensees must credit you as the source</p>
                    </div>
                  </div>
                  <Switch
                    checked={attributionRequired}
                    onCheckedChange={setAttributionRequired}
                    className="data-[state=checked]:bg-[#4A26ED]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-5 bg-white border-t border-slate-200 flex gap-3">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-12 px-6 rounded-xl bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all disabled:opacity-60"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3B1ED1] hover:to-[#6D28D9] text-white font-semibold text-base shadow-lg shadow-[#4A26ED]/25 transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Minting on Story Protocol...
              </>
            ) : (
              <>
                <Shield size={18} className="mr-2" />
                Mint & Protect on Story Protocol
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
