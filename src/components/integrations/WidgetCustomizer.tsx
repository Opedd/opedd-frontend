import React, { useState } from "react";
import { Copy, Check, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import opeddIcon from "@/assets/opedd-icon.svg";

interface WidgetCustomizerProps {
  publisherId: string;
}

export function WidgetCustomizer({ publisherId }: WidgetCustomizerProps) {
  const { toast } = useToast();

  // Customization State
  const [labelText, setLabelText] = useState("Proceed to Payment");
  const [primaryColor, setPrimaryColor] = useState("#4A26ED");
  const [borderRadius, setBorderRadius] = useState([16]);
  const [darkTheme, setDarkTheme] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const colorPresets = [
    { name: "Opedd Purple", value: "#4A26ED" },
    { name: "Oxford Blue", value: "#040042" },
    { name: "Plum Magenta", value: "#D1009A" },
    { name: "Emerald", value: "#059669" },
    { name: "Ocean Blue", value: "#2563EB" },
    { name: "Slate", value: "#475569" },
  ];

  // Generate dynamic widget code
  const widgetCode = `<script src="https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget"
  data-publisher-id="${publisherId}"
  data-color="${primaryColor}"
  data-radius="${borderRadius[0]}"
  data-theme="${darkTheme ? 'dark' : 'light'}"
  data-text="${labelText}"
  data-frontend-url="${window.location.origin}">
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

  // Theme-dependent colors matching the actual widget
  const bg = darkTheme ? "hsl(244,100%,10%)" : "#ffffff";
  const textClr = darkTheme ? "hsl(210,100%,99%)" : "hsl(244,100%,8%)";
  const mutedClr = darkTheme ? "hsl(210,60%,80%)" : "hsla(244,100%,8%,0.5)";
  const borderClr = darkTheme ? "hsla(210,100%,99%,0.12)" : "hsl(210,100%,97%)";
  const inputBgClr = darkTheme ? "hsla(210,100%,99%,0.08)" : "#ffffff";
  const inputBorderClr = darkTheme ? "hsla(210,100%,99%,0.15)" : "#e2e8f0";
  const priceBgClr = darkTheme ? "hsl(244,50%,18%)" : "hsl(210,100%,97%)";
  const statBgClr = darkTheme ? "hsla(244,50%,18%,0.6)" : "hsl(210,100%,97%)";

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
              Button Text
            </Label>
            <Input
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              placeholder="Proceed to Payment"
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

          {/* Widget Card Preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${primaryColor}-${borderRadius[0]}-${darkTheme}-${labelText}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <div
                style={{
                  background: bg,
                  border: `1px solid ${borderClr}`,
                  borderRadius: `${borderRadius[0]}px`,
                  maxWidth: 360,
                  width: "100%",
                  overflow: "hidden",
                  boxShadow: darkTheme
                    ? "0 8px 32px hsla(244,100%,5%,0.5)"
                    : "0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)",
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "16px 20px 12px",
                    borderBottom: `1px solid ${borderClr}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      ...(darkTheme ? {} : { background: "#040042", padding: 4 }),
                    }}
                  >
                    <img src={opeddIcon} alt="Opedd" style={{ width: "100%", height: "100%" }} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: mutedClr,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Opedd License
                  </span>
                </div>

                {/* Title */}
                <div style={{ padding: "16px 20px 12px" }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: textClr,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    The Future of Content Sovereignty
                  </h3>
                </div>

                {/* Stats Bar */}
                <div
                  style={{
                    display: "flex",
                    margin: "0 20px 16px",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: statBgClr,
                  }}
                >
                  <div style={{ flex: 1, textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: mutedClr }}>Human</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textClr }}>12</div>
                  </div>
                  <div style={{ width: 1, background: borderClr }} />
                  <div style={{ flex: 1, textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: mutedClr }}>AI</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: textClr }}>4</div>
                  </div>
                </div>

                {/* Price Selector */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    margin: "0 20px 16px",
                    padding: 4,
                    borderRadius: 12,
                    background: priceBgClr,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      background: `linear-gradient(to right, hsl(245,83%,54%), hsl(245,83%,62%))`,
                      color: "#ffffff",
                    }}
                  >
                    Human · $10.00
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: mutedClr,
                      background: "transparent",
                    }}
                  >
                    AI Training · $50.00
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input readOnly placeholder="First name" style={{ flex: 1, height: 36, padding: "0 12px", border: `1px solid ${inputBorderClr}`, borderRadius: 8, fontSize: 12, color: textClr, background: inputBgClr, outline: "none", minWidth: 0, fontFamily: "inherit" }} />
                    <input readOnly placeholder="Last name" style={{ flex: 1, height: 36, padding: "0 12px", border: `1px solid ${inputBorderClr}`, borderRadius: 8, fontSize: 12, color: textClr, background: inputBgClr, outline: "none", minWidth: 0, fontFamily: "inherit" }} />
                  </div>
                  <input readOnly placeholder="Email address" style={{ width: "100%", height: 36, padding: "0 12px", border: `1px solid ${inputBorderClr}`, borderRadius: 8, fontSize: 12, color: textClr, background: inputBgClr, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  <input readOnly placeholder="Company / Organization" style={{ width: "100%", height: 36, padding: "0 12px", border: `1px solid ${inputBorderClr}`, borderRadius: 8, fontSize: 12, color: textClr, background: inputBgClr, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${inputBorderClr}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: mutedClr }}>Individual (no organization)</span>
                  </div>
                  <div style={{ width: "100%", height: 36, padding: "0 12px", border: `1px solid ${inputBorderClr}`, borderRadius: 8, fontSize: 12, color: mutedClr, background: inputBgClr, display: "flex", alignItems: "center", boxSizing: "border-box" }}>
                    Intended use
                  </div>
                </div>

                {/* CTA Button */}
                <div style={{ padding: "0 20px 12px" }}>
                  <button
                    style={{
                      display: "block",
                      width: "100%",
                      height: 40,
                      border: "none",
                      borderRadius: 12,
                      background: `linear-gradient(to right, hsl(245,83%,54%), hsl(245,83%,62%))`,
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {labelText || "Proceed to Payment"}
                  </button>
                </div>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "12px 20px",
                    borderTop: `1px solid ${borderClr}`,
                  }}
                >
                  <img src={opeddIcon} alt="Opedd" style={{ width: 12, height: 12, opacity: 0.5 }} />
                  <span style={{ fontSize: 10, color: mutedClr }}>Powered by Opedd Protocol</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

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
                <span className="text-emerald-400">"https://djdzcciayennqchjgybx.supabase.co/functions/v1/widget"</span>
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
                {"\n"}
                <span className="text-slate-400">  data-frontend-url=</span>
                <span className="text-amber-400">"{typeof window !== 'undefined' ? window.location.origin : ''}"</span>
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
