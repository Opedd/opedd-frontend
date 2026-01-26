import React, { useState } from "react";
import { Shield, Copy, Check, AlignLeft, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type WidgetStyle = "solid" | "outline" | "glass";
type WidgetPosition = "inline" | "floating";

interface WidgetCustomizerProps {
  publisherId: string;
}

export function WidgetCustomizer({ publisherId }: WidgetCustomizerProps) {
  const { toast } = useToast();
  
  // Customization State
  const [widgetStyle, setWidgetStyle] = useState<WidgetStyle>("solid");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [buttonText, setButtonText] = useState("License this Article");
  const [position, setPosition] = useState<WidgetPosition>("inline");
  const [codeCopied, setCodeCopied] = useState(false);

  const colorPresets = [
    { name: "Opedd Purple", value: "#7C3AED" },
    { name: "Deep Navy", value: "#040042" },
    { name: "Plum", value: "#D1009A" },
    { name: "Emerald", value: "#059669" },
    { name: "Ocean Blue", value: "#2563EB" },
    { name: "Slate", value: "#475569" },
  ];

  // Generate dynamic widget code
  const widgetCode = `<script src="https://opedd.io/widget.js"
  data-publisher="${publisherId}"
  data-style="${widgetStyle}"
  data-color="${primaryColor}"
  data-position="${position}"
  data-text="${buttonText}">
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    setCodeCopied(true);
    toast({
      title: "Code Copied!",
      description: "Widget code copied to clipboard.",
    });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Dynamic button styles based on settings
  const getButtonStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      borderRadius: "9999px",
      fontSize: "14px",
      transition: "all 0.2s ease",
      cursor: "pointer",
    };
    
    switch (widgetStyle) {
      case "solid":
        return {
          ...baseStyles,
          backgroundColor: primaryColor,
          color: "#FFFFFF",
          border: "none",
          boxShadow: `0 10px 25px -5px ${primaryColor}40`,
        };
      case "outline":
        return {
          ...baseStyles,
          backgroundColor: "transparent",
          color: primaryColor,
          border: `2px solid ${primaryColor}`,
          boxShadow: "none",
        };
      case "glass":
        return {
          ...baseStyles,
          backgroundColor: `${primaryColor}20`,
          color: primaryColor,
          border: `1px solid ${primaryColor}40`,
          backdropFilter: "blur(12px)",
          boxShadow: `0 8px 32px -8px ${primaryColor}30`,
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E8F2FB]">
        {/* Left Side: Controls Panel */}
        <div className="p-6 bg-[#040042] text-white space-y-6">
          <div>
            <h3 className="text-lg font-bold mb-1">Widget Customizer</h3>
            <p className="text-sm text-white/60">Configure your licensing button appearance</p>
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">Button Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={cn(
                    "w-9 h-9 rounded-lg transition-all hover:scale-110 active:scale-95",
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
                  className="w-9 h-9 p-0 border-0 cursor-pointer rounded-lg overflow-hidden bg-transparent"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Button Text */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">Button Text</Label>
            <Input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="License this Article"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11"
              maxLength={30}
            />
            <p className="text-[10px] text-white/40">{buttonText.length}/30 characters</p>
          </div>

          {/* Style Radio Group */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">Button Style</Label>
            <RadioGroup
              value={widgetStyle}
              onValueChange={(value: WidgetStyle) => setWidgetStyle(value)}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { id: "solid", label: "Solid" },
                { id: "outline", label: "Outline" },
                { id: "glass", label: "Glass" },
              ].map((option) => (
                <div key={option.id}>
                  <RadioGroupItem
                    value={option.id}
                    id={`style-${option.id}`}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`style-${option.id}`}
                    className={cn(
                      "flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium",
                      widgetStyle === option.id
                        ? "border-[#7C3AED] bg-[#7C3AED]/20 text-white"
                        : "border-white/20 text-white/60 hover:border-white/40"
                    )}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Position Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide text-white/80">Position</Label>
            <RadioGroup
              value={position}
              onValueChange={(value: WidgetPosition) => setPosition(value)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { id: "inline", label: "Inline", icon: <AlignLeft size={16} /> },
                { id: "floating", label: "Floating", icon: <Move size={16} /> },
              ].map((option) => (
                <div key={option.id}>
                  <RadioGroupItem
                    value={option.id}
                    id={`position-${option.id}`}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`position-${option.id}`}
                    className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium",
                      position === option.id
                        ? "border-[#7C3AED] bg-[#7C3AED]/20 text-white"
                        : "border-white/20 text-white/60 hover:border-white/40"
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
          
          {/* Browser Mockup - Substack Style Article */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Browser Chrome */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-4 py-1.5 text-xs text-slate-500 border border-slate-200 font-medium">
                  yourblog.substack.com/p/the-future-of-content
                </div>
              </div>
            </div>

            {/* Article Content - Premium Substack Style */}
            <div className="p-8 max-w-xl mx-auto relative min-h-[360px]">
              {/* Publication Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D1009A]" />
                <div>
                  <div className="text-sm font-bold text-[#040042]">The Knowledge Economy</div>
                  <div className="text-xs text-slate-400">Jan 26, 2026 · 8 min read</div>
                </div>
              </div>
              
              {/* Article Title */}
              <h1 className="text-2xl font-bold text-[#040042] mb-4 leading-tight">
                Why Content Licensing Will Define the Next Decade
              </h1>
              
              {/* Article Body */}
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed mb-8">
                <p>
                  The relationship between content creators and AI companies has reached an inflection point. As large language models become increasingly sophisticated, the question of fair compensation...
                </p>
                <div className="h-2 w-11/12 bg-slate-100 rounded" />
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-4/5 bg-slate-100 rounded" />
              </div>

              {/* Article Footer with Widget */}
              <div className="border-t border-slate-100 pt-6">
                <div className={cn(
                  "flex items-center gap-4",
                  position === "floating" ? "opacity-50" : ""
                )}>
                  {/* The Widget Button */}
                  <button style={getButtonStyles()}>
                    <Shield size={16} />
                    {buttonText}
                  </button>
                  
                  {/* Story Protocol Badge */}
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-[#7C3AED]" />
                    <span className="text-[10px] text-slate-400 font-medium">Protected by Story Protocol</span>
                  </div>
                </div>
              </div>

              {/* Floating Button Preview */}
              {position === "floating" && (
                <div className="absolute bottom-6 right-6">
                  <button 
                    style={{
                      ...getButtonStyles(),
                      boxShadow: `0 20px 40px -10px ${primaryColor}50`,
                    }}
                  >
                    <Shield size={16} />
                    {buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Code Generator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-[#040042]">Embed Code</Label>
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
                <span className="text-emerald-400">"https://opedd.io/widget.js"</span>
                {"\n"}
                <span className="text-slate-400">  data-publisher=</span>
                <span className="text-emerald-400">"{publisherId}"</span>
                {"\n"}
                <span className="text-slate-400">  data-style=</span>
                <span className="text-amber-400">"{widgetStyle}"</span>
                {"\n"}
                <span className="text-slate-400">  data-color=</span>
                <span className="text-amber-400">"{primaryColor}"</span>
                {"\n"}
                <span className="text-slate-400">  data-position=</span>
                <span className="text-amber-400">"{position}"</span>
                {"\n"}
                <span className="text-slate-400">  data-text=</span>
                <span className="text-amber-400">"{buttonText}"</span>
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
