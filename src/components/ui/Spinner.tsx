import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical loading spinner. Use everywhere instead of raw Loader2.
 *
 * Sizes:
 *   sm = 14px  — inside buttons, inline text
 *   md = 20px  — default, centered in cards/sections
 *   lg = 32px  — full-page loading states
 *
 * Color: inherits from parent via currentColor. For brand-tinted
 * usage on neutral backgrounds, pass `className="text-oxford"` etc.
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = size === "sm" ? 14 : size === "lg" ? 32 : 20;
  return (
    <Loader2
      size={px}
      className={cn("animate-spin", className)}
      aria-hidden="true"
    />
  );
}
