import React, { useState } from "react";
import { Shield, Copy, Check, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WidgetCustomizerProps {
  publisherId: string;
}

export function WidgetCustomizer({ publisherId }: WidgetCustomizerProps) {
  const { toast } = useToast();
  
  // Customization State
  const [labelText, setLabelText] = useState("Buy License");
  const [primaryColor, setPrimaryColor] = useState("#040042");
  const [borderRadius, setBorderRadius] = useState([12]);
  const [darkTheme, setDarkTheme] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const colorPresets = [
    { name: "Oxford Blue", value: "#040042" },
    { name: "Plum Magenta", value: "#D1009A" },
    { name: "Royal Purple", value: "#7C3AED" },
    { name: "Emerald", value: "#059669" },
    { name: "Ocean Blue", value: "#2563EB" },
    { name: "Slate", value: "#475569" },
  ];

  // Generate dynamic widget code
  const widgetCode = `<script src="https://cdn.opedd.io/widget.js"
  data-publisher-id="${publisherId}"
  data-color="${primaryColor}"
  data-radius="${borderRadius[0]}"
  data-theme="${darkTheme ? 'dark' : 'light'}"
  data-text="${labelText}">
</script>`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setCodeCopied(true);
      toast({
        title: "Embed Code Copied!",
        description: "Paste this snippet into your website's HTML.",
      });
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again or manually select the code.",
        variant: "destructive",
      });
    }
  };

  // Dynamic button styles based on settings
  const getButtonStyles = (): React.CSSProperties => ({
    backgroundColor: primaryColor,
    color: "#FFFFFF",
    border: "none",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    borderRadius: `${borderRadius[0]}px`,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: `0 10px 25px -5px ${primaryColor}40`,
    transition: "all 0.2s ease",
  });

  return (
    <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E8F2FB]">
        {/* Left Side: Control Panel */}
        <div className="p-6 bg-[#040042] text-white space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-1">Control Panel</h3>
            <p className="text-sm text-white/60">Customize your licensing widget appearance</p>
          </div>

          {/* Label Text */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">
              Label Text
            </Label>
            <Input
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="Buy License"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11"
              maxLength={24}
            />
            <p className="text-[10px] text-white/40">{labelText.length}/24 characters</p>
          </div>

          {/* Brand Color */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">
              Brand Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all hover:scale-110 active:scale-95",
                    primaryColor === color.value
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#040042]"
                      : "ring-1 ring-white/20"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="relative">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 p-0 border-0 cursor-pointer rounded-lg overflow-hidden bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wide text-white/80">
                Border Radius
              </Label>
              <span className="text-xs text-white/60 font-mono">{borderRadius[0]}px</span>
            </div>
            <Slider
              value={borderRadius}
              onValueChange={setBorderRadius}
              min={0}
              max={24}
              step={2}
              className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-white [&_.bg-primary]:bg-[#7C3AED]"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Square</span>
              <span>Rounded</span>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">
              Widget Theme
            </Label>
            <div className="flex items-center justify-between bg-white/10 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3">
                {darkTheme ? (
                  <Moon size={18} className="text-[#7C3AED]" />
                ) : (
                  <Sun size={18} className="text-amber-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {darkTheme ? "Dark Mode" : "Light Mode"}
                  </p>
                  <p className="text-[10px] text-white/50">
                    {darkTheme ? "For dark website backgrounds" : "For light website backgrounds"}
                  </p>
                </div>
              </div>
              <Switch
                checked={darkTheme}
                onCheckedChange={setDarkTheme}
                className="data-[state=checked]:bg-[#7C3AED]"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Live Preview */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-[#040042]">Live Preview</Label>
            <div className="flex items-center gap-1.5 text-xs text-[#040042]/40">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Updates in real-time
            </div>
          </div>
          
          {/* Browser Mockup - Mock Article with Serif Typography */}
          <motion.div 
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Browser Chrome */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-4 py-1.5 text-xs text-slate-500 border border-slate-200 font-medium">
                  thepremiumtimes.com/opinion/ai-licensing
                </div>
              </div>
            </div>

            {/* Article Content - Premium Publication Style with Serif Typography */}
            <div 
              className={cn(
                "p-8 max-w-xl mx-auto relative min-h-[380px] transition-colors duration-300",
                darkTheme ? "bg-slate-900" : "bg-white"
              )}
            >
              {/* Publication Masthead */}
              <div className="text-center mb-6 pb-4 border-b border-slate-200/50">
                <h2 
                  className={cn(
                    "text-xs uppercase tracking-[0.3em] font-semibold",
                    darkTheme ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  The Premium Times
                </h2>
              </div>
              
              {/* Article Title - Elegant Serif */}
              <h1 
                className={cn(
                  "text-2xl font-bold mb-4 leading-tight text-center",
                  darkTheme ? "text-white" : "text-[#040042]"
                )}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                The Future of AI Licensing
              </h1>

              {/* Article Byline */}
              <p 
                className={cn(
                  "text-center text-xs mb-6",
                  darkTheme ? "text-slate-500" : "text-slate-400"
                )}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
              >
                By Alexandra Chen · January 26, 2026
              </p>
              
              {/* Article Body - Serif Typography */}
              <div 
                className={cn(
                  "space-y-4 text-sm leading-relaxed mb-8",
                  darkTheme ? "text-slate-300" : "text-slate-700"
                )}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                <p>
                  As artificial intelligence reshapes the creative landscape, a new paradigm emerges for content creators and publishers alike. The question of fair compensation has never been more pressing—or more complex.
                </p>
                <p className={cn(
                  darkTheme ? "text-slate-500" : "text-slate-400"
                )}>
                  Industry analysts predict that content licensing will become a $50 billion market by 2030, fundamentally altering how intellectual property is valued and exchanged...
                </p>
              </div>

              {/* Opedd Widget - Animated */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`${primaryColor}-${borderRadius[0]}-${labelText}`}
                  className={cn(
                    "border-t pt-6",
                    darkTheme ? "border-slate-700" : "border-slate-100"
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-4">
                    {/* The Widget Button */}
                    <motion.button 
                      style={getButtonStyles()}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Shield size={16} />
                      {labelText || "Buy License"}
                    </motion.button>
                    
                    {/* Story Protocol Badge */}
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-[#7C3AED]" />
                      <span 
                        className={cn(
                          "text-[10px] font-medium",
                          darkTheme ? "text-slate-500" : "text-slate-400"
                        )}
                      >
                        Verified by Story Protocol
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Code Snippet Generator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-[#040042]">Copy Embed Code</Label>
              <Button
                size="sm"
                onClick={handleCopyCode}
                className={cn(
                  "h-9 px-4 font-semibold transition-all",
                  codeCopied 
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                    : "bg-[#040042] hover:bg-[#040042]/90 text-white"
                )}
              >
                {codeCopied ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-[#040042] text-slate-100 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed">
              <code>
                <span className="text-slate-500">{"<"}</span>
                <span className="text-[#7C3AED]">script</span>
                <span className="text-slate-400"> src=</span>
                <span className="text-emerald-400">"https://cdn.opedd.io/widget.js"</span>
                {"\n"}
                <span className="text-slate-400">  data-publisher-id=</span>
                <span className="text-emerald-400">"{publisherId}"</span>
                {"\n"}
                <span className="text-slate-400">  data-color=</span>
                <span className="text-amber-400">"{primaryColor}"</span>
                {"\n"}
                <span className="text-slate-400">  data-radius=</span>
                <span className="text-amber-400">"{borderRadius[0]}"</span>
                {"\n"}
                <span className="text-slate-400">  data-theme=</span>
                <span className="text-amber-400">"{darkTheme ? 'dark' : 'light'}"</span>
                {"\n"}
                <span className="text-slate-400">  data-text=</span>
                <span className="text-amber-400">"{labelText}"</span>
                <span className="text-slate-500">{">"}</span>
                {"\n"}
                <span className="text-slate-500">{"</"}</span>
                <span className="text-[#7C3AED]">script</span>
                <span className="text-slate-500">{">"}</span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
