import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Optional secondary action rendered alongside the primary action. */
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/**
 * Canonical empty state for dashboard surfaces.
 *
 * Shape: ~48px tinted icon circle, semibold title, muted description
 * (max ~40ch), optional CTA(s) below. Vertically centered in its
 * container.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center text-center py-16 px-6" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="w-12 h-12 rounded-full bg-oxford/10 flex items-center justify-center mb-4">
        <Icon size={22} className="text-oxford" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-[40ch] mb-5">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {action && (
            <Button
              size="sm"
              variant={action.variant ?? "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="sm"
              variant={secondaryAction.variant ?? "secondary"}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
