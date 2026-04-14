import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical loading spinner for in-button and small inline contexts.
 * For full-page loading states, use PageLoader or DashboardSkeleton instead.
 *
 * Sizes map to pixel dimensions: sm=14, md=16 (default), lg=20, xl=24.
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const px = size === "sm" ? 14 : size === "lg" ? 20 : size === "xl" ? 24 : 16;
  return (
    <Loader2
      size={px}
      className={cn("animate-spin", className)}
      aria-hidden="true"
    />
  );
}
