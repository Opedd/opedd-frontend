import React, { useState, useEffect } from "react";
import { Shield, Check, Copy, Loader2, FileText, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import opeddLogo from "@/assets/opedd-logo-inverse.png";

interface ConnectCMSModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformName: string;
  platformLogo: React.ReactNode;
  onComplete: (feedUrl: string, humanPrice: string, aiPrice: string) => void;
}

type ModalStep = "form" | "syncing" | "complete";

interface MockArticle {
  title: string;
  status: "pending" | "syncing" | "complete";
}

export function ConnectCMSModal({
  open,
  onOpenChange,
  platformName,
  platformLogo,
  onComplete,
}: ConnectCMSModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<ModalStep>("form");
  
  // Form State
  const [feedUrl, setFeedUrl] = useState("");
  const [humanPrice, setHumanPrice] = useState("4.99");
  const [aiPrice, setAiPrice] = useState("49.99");
  
  // Syncing State
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState(0);
  const [totalArticles] = useState(45);
  const [articles, setArticles] = useState<MockArticle[]>([
    { title: "The Future of Digital Publishing", status: "pending" },
    { title: "Why AI Licensing Matters in 2025", status: "pending" },
    { title: "Building a Sustainable Content Business", status: "pending" },
  ]);
  
  // Complete State
  const [codeCopied, setCodeCopied] = useState(false);
  const [publisherId] = useState(() => Math.random().toString(36).substring(2, 10));

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setProgress(0);
      setCurrentArticle(0);
      setCodeCopied(false);
      setArticles(prev => prev.map(a => ({ ...a, status: "pending" })));
    }
  }, [open]);

  // Syncing animation effect
  useEffect(() => {
    if (step !== "syncing") return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setStep("complete"), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const articleInterval = setInterval(() => {
      setCurrentArticle(prev => {
        const next = Math.min(prev + 1, totalArticles);
        return next;
      });
    }, 110);

    // Update article statuses progressively
    const statusTimeouts = articles.map((_, index) => 
      setTimeout(() => {
        setArticles(prev => 
          prev.map((article, i) => ({
            ...article,
            status: i <= index ? (i < index ? "complete" : "syncing") : "pending"
          }))
        );
      }, (index + 1) * 1200)
    );

    // Mark all complete at the end
    const finalTimeout = setTimeout(() => {
      setArticles(prev => prev.map(a => ({ ...a, status: "complete" })));
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(articleInterval);
      statusTimeouts.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [step, articles.length, totalArticles]);

  const handleConnect = () => {
    if (!feedUrl.trim()) {
      toast({
        title: "Feed URL Required",
        description: "Please enter your RSS feed URL to continue.",
        variant: "destructive",
      });
      return;
    }
    setStep("syncing");
  };

  const handleComplete = () => {
    onComplete(feedUrl, humanPrice, aiPrice);
    onOpenChange(false);
  };

  const widgetCode = `<script src="https://opedd.io/widget.js" 
  data-publisher="${publisherId}"
  data-human-fee="${humanPrice}"
  data-ai-fee="${aiPrice}">
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    setCodeCopied(true);
    toast({
      title: "Copied!",
      description: "Widget code copied to clipboard.",
    });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const getArticleStatusIcon = (status: MockArticle["status"]) => {
    switch (status) {
      case "complete":
        return <Check size={14} className="text-emerald-500" />;
      case "syncing":
        return <Loader2 size={14} className="text-[#4A26ED] animate-spin" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#040042] to-[#1a1a6c] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={opeddLogo} alt="Opedd" className="h-6" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {platformLogo}
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mt-4">
            {step === "complete" ? "Archive Protected" : "Automate Your Protection"}
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {step === "form" && `Connect your ${platformName} to automatically shield your content`}
            {step === "syncing" && "Importing and registering your content on Story Protocol"}
            {step === "complete" && "Your articles are now protected with IP rights"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Form */}
          {step === "form" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#040042]">RSS Feed URL</Label>
                <div className="relative">
                  <Rss size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/40" />
                  <Input 
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="yourname.substack.com/feed"
                    className="border-slate-200 h-12 pl-10 text-[#040042]"
                  />
                </div>
                <p className="text-xs text-[#040042]/50">
                  We'll fetch and protect all articles from this feed
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[#4A26ED]" />
                  <span className="text-sm font-semibold text-[#040042]">Global License Fees</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#040042]">Human Republication</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/50 font-medium">$</span>
                      <Input 
                        type="number"
                        value={humanPrice}
                        onChange={(e) => setHumanPrice(e.target.value)}
                        placeholder="4.99"
                        className="border-slate-200 h-11 pl-7 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-[#040042]/40">Per article license</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-[#040042]">AI Ingestion</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#040042]/50 font-medium">$</span>
                      <Input 
                        type="number"
                        value={aiPrice}
                        onChange={(e) => setAiPrice(e.target.value)}
                        placeholder="49.99"
                        className="border-slate-200 h-11 pl-7 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-[#040042]/40">LLM training rights</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleConnect}
                className="w-full h-12 bg-gradient-to-r from-[#4A26ED] to-[#7C3AED] hover:from-[#3d1ed4] hover:to-[#6d2ed4] text-white font-semibold"
              >
                <Shield size={18} className="mr-2" />
                Connect & Protect Archive
              </Button>
            </div>
          )}

          {/* Step 2: Syncing */}
          {step === "syncing" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A26ED]/10 mb-4">
                  <Loader2 size={32} className="text-[#4A26ED] animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-[#040042]">Syncing Archive</h3>
                <p className="text-sm text-[#040042]/60 mt-1">
                  Registering {currentArticle}/{totalArticles} articles on Story Protocol...
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#040042]/60">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#040042]/60 uppercase tracking-wide">
                  <FileText size={12} />
                  <span>Recently Fetched & Shielded</span>
                </div>
                <div className="space-y-2">
                  {articles.map((article, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        article.status === "syncing" 
                          ? "bg-[#4A26ED]/5 border border-[#4A26ED]/20" 
                          : article.status === "complete"
                          ? "bg-emerald-50/50"
                          : "bg-white border border-slate-100"
                      }`}
                    >
                      {getArticleStatusIcon(article.status)}
                      <span className={`text-sm flex-1 truncate ${
                        article.status === "complete" 
                          ? "text-[#040042]" 
                          : article.status === "syncing"
                          ? "text-[#4A26ED] font-medium"
                          : "text-[#040042]/50"
                      }`}>
                        {article.title}
                      </span>
                      {article.status === "complete" && (
                        <span className="text-xs text-emerald-600 font-medium">Protected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === "complete" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-[#040042]">Archive Protected!</h3>
                <p className="text-sm text-[#040042]/60 mt-1">
                  {totalArticles} articles registered on Story Protocol
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="text-xs font-semibold text-[#040042]">Human License</span>
                  </div>
                  <span className="text-sm font-bold text-[#040042]">${humanPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#4A26ED] rounded-full" />
                    <span className="text-xs font-semibold text-[#040042]">AI Ingestion</span>
                  </div>
                  <span className="text-sm font-bold text-[#040042]">${aiPrice}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#040042]">
                  Paste this code on your site to enable licensing buttons
                </Label>
                <div className="relative">
                  <pre className="bg-[#040042] text-slate-100 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
                    <code className="text-emerald-400">{widgetCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white border-0 h-8"
                  >
                    {codeCopied ? (
                      <>
                        <Check size={14} className="mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleComplete}
                className="w-full h-12 bg-[#040042] hover:bg-[#040042]/90 text-white font-semibold"
              >
                Done — Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
