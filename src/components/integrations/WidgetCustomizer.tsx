import React, { useState } from "react";
import { Shield, Copy, Check, Circle, Square, Minus, AlignLeft, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type WidgetStyle = "pill" | "rectangle" | "minimal";
type WidgetPosition = "inline" | "floating";

interface WidgetCustomizerProps {
  publisherId: string;
}

export function WidgetCustomizer({ publisherId }: WidgetCustomizerProps) {
  const { toast } = useToast();
  
  // Customization State
  const [widgetStyle, setWidgetStyle] = useState<WidgetStyle>("pill");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [position, setPosition] = useState<WidgetPosition>("inline");
  const [buttonText, setButtonText] = useState("License this Article");
  const [codeCopied, setCodeCopied] = useState(false);

  const colorPresets = [
    { name: "Opedd Purple", value: "#7C3AED" },
    { name: "Deep Navy", value: "#040042" },
    { name: "Plum", value: "#D1009A" },
    { name: "Emerald", value: "#059669" },
    { name: "Ocean Blue", value: "#2563EB" },
    { name: "Slate", value: "#475569" },
  ];

  const styleOptions: { id: WidgetStyle; label: string; icon: React.ReactNode }[] = [
    { id: "pill", label: "Pill", icon: <Circle size={16} /> },
    { id: "rectangle", label: "Rectangle", icon: <Square size={16} /> },
    { id: "minimal", label: "Minimal", icon: <Minus size={16} /> },
  ];

  const positionOptions: { id: WidgetPosition; label: string; icon: React.ReactNode }[] = [
    { id: "inline", label: "Inline", icon: <AlignLeft size={16} /> },
    { id: "floating", label: "Floating", icon: <Move size={16} /> },
  ];

  // Generate dynamic widget code
  const widgetCode = `<script src="https://opedd.io/widget.js"
  data-publisher="${publisherId}"
  data-style="${widgetStyle}"
  data-color="${primaryColor}"
  data-text-color="${textColor}"
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
  const getButtonStyles = () => {
    const baseStyles = "font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-[0.98]";
    
    switch (widgetStyle) {
      case "pill":
        return cn(baseStyles, "px-5 py-2.5 rounded-full text-sm shadow-lg");
      case "rectangle":
        return cn(baseStyles, "px-5 py-2.5 rounded-lg text-sm shadow-md");
      case "minimal":
        return cn(baseStyles, "p-2.5 rounded-lg text-sm");
      default:
        return baseStyles;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8F2FB] shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#E8F2FB]">
        {/* Controls Sidebar - 2 columns */}
        <div className="lg:col-span-2 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[#040042] mb-1">Widget Customizer</h3>
            <p className="text-xs text-[#040042]/50">Configure your licensing button appearance</p>
          </div>

          {/* Style Toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#040042] uppercase tracking-wide">Button Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setWidgetStyle(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                    widgetStyle === option.id
                      ? "border-[#4A26ED] bg-[#4A26ED]/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className={widgetStyle === option.id ? "text-[#4A26ED]" : "text-slate-400"}>
                    {option.icon}
                  </span>
                  <span className={cn(
                    "text-xs font-medium",
                    widgetStyle === option.id ? "text-[#4A26ED]" : "text-[#040042]/60"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#040042] uppercase tracking-wide">Primary Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95",
                    primaryColor === color.value
                      ? "border-[#040042] ring-2 ring-[#040042]/20"
                      : "border-white shadow-sm"
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
                  className="w-8 h-8 p-0 border-0 cursor-pointer rounded-lg overflow-hidden"
                />
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#040042] uppercase tracking-wide">Text Color</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setTextColor("#FFFFFF")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                  textColor === "#FFFFFF"
                    ? "border-[#4A26ED] bg-[#4A26ED]/5"
                    : "border-slate-200"
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white border border-slate-200" />
                <span className="text-xs font-medium text-[#040042]">White</span>
              </button>
              <button
                onClick={() => setTextColor("#040042")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                  textColor === "#040042"
                    ? "border-[#4A26ED] bg-[#4A26ED]/5"
                    : "border-slate-200"
                )}
              >
                <div className="w-4 h-4 rounded-full bg-[#040042]" />
                <span className="text-xs font-medium text-[#040042]">Dark</span>
              </button>
            </div>
          </div>

          {/* Position Toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#040042] uppercase tracking-wide">Position</Label>
            <div className="grid grid-cols-2 gap-2">
              {positionOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPosition(option.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                    position === option.id
                      ? "border-[#4A26ED] bg-[#4A26ED]/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span className={position === option.id ? "text-[#4A26ED]" : "text-slate-400"}>
                    {option.icon}
                  </span>
                  <span className={cn(
                    "text-xs font-medium",
                    position === option.id ? "text-[#4A26ED]" : "text-[#040042]/60"
                  )}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Button Text */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-[#040042] uppercase tracking-wide">Button Text</Label>
            <Input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="License this Article"
              className="border-slate-200 h-10 text-sm"
              maxLength={30}
            />
            <p className="text-[10px] text-[#040042]/40">{buttonText.length}/30 characters</p>
          </div>
        </div>

        {/* Live Preview - 3 columns */}
        <div className="lg:col-span-3 p-6 bg-gradient-to-br from-slate-50 to-slate-100/50">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-bold text-[#040042]">Live Preview</Label>
            <div className="flex items-center gap-1.5 text-xs text-[#040042]/40">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Updates in real-time
            </div>
          </div>
          
          {/* Preview Window - Blog Post Mockup */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[320px] relative">
            {/* Browser Chrome */}
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 border border-slate-200">
                  yourblog.com/article
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div className="p-6">
              {/* Article Header */}
              <div className="mb-4">
                <div className="h-2 w-16 bg-[#4A26ED]/20 rounded mb-2" />
                <div className="h-5 w-4/5 bg-slate-800 rounded mb-1" />
                <div className="h-3 w-1/2 bg-slate-300 rounded" />
              </div>
              
              {/* Article Body */}
              <div className="space-y-2 mb-6">
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-11/12 bg-slate-100 rounded" />
                <div className="h-2 w-full bg-slate-100 rounded" />
                <div className="h-2 w-3/4 bg-slate-100 rounded" />
              </div>

              {/* Article Footer with Widget */}
              <div className="border-t border-slate-100 pt-5">
                <div className={cn(
                  "flex items-center gap-3",
                  position === "inline" ? "" : ""
                )}>
                  {/* The Widget Button */}
                  <button
                    className={getButtonStyles()}
                    style={{ 
                      backgroundColor: widgetStyle === "minimal" ? "transparent" : primaryColor,
                      color: widgetStyle === "minimal" ? primaryColor : textColor,
                      boxShadow: widgetStyle !== "minimal" ? `0 10px 25px -5px ${primaryColor}40` : "none",
                      border: widgetStyle === "minimal" ? `2px solid ${primaryColor}` : "none"
                    }}
                  >
                    <Shield size={widgetStyle === "minimal" ? 18 : 15} />
                    {widgetStyle !== "minimal" && buttonText}
                  </button>
                  
                  {/* Story Protocol Badge */}
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} className="text-[#4A26ED]" />
                    <span className="text-[10px] text-slate-400 font-medium">Story Protocol</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Button Preview */}
            {position === "floating" && (
              <div className="absolute bottom-4 right-4">
                <button
                  className={cn(getButtonStyles(), "shadow-xl")}
                  style={{ 
                    backgroundColor: widgetStyle === "minimal" ? "transparent" : primaryColor,
                    color: widgetStyle === "minimal" ? primaryColor : textColor,
                    boxShadow: `0 20px 40px -10px ${primaryColor}50`,
                    border: widgetStyle === "minimal" ? `2px solid ${primaryColor}` : "none"
                  }}
                >
                  <Shield size={widgetStyle === "minimal" ? 18 : 15} />
                  {widgetStyle !== "minimal" && buttonText}
                </button>
              </div>
            )}
          </div>

          {/* Code Block */}
          <div className="mt-6 space-y-3">
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
            <div className="relative">
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
                  <span className="text-slate-400">  data-text-color=</span>
                  <span className="text-amber-400">"{textColor}"</span>
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
    </div>
  );
}
