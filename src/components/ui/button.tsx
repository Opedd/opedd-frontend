import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(245_83%_54%/0.4)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-soft-white/20 bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline hover:text-accent",
        // Opedd custom variants - Oxford Blue primary CTAs
        oxford: "bg-gradient-to-r from-oxford to-oxford-glow text-white hover:shadow-[0_0_25px_hsl(245_83%_54%/0.4)] hover:-translate-y-0.5",
        "ghost-oxford": "border border-foreground/30 bg-transparent text-foreground hover:border-oxford hover:text-oxford hover:shadow-[0_0_15px_hsl(245_83%_54%/0.2)]",
        "hero-primary": "bg-gradient-to-r from-oxford to-oxford-glow text-white font-semibold hover:shadow-[0_0_30px_hsl(245_83%_54%/0.5)] hover:-translate-y-1 transition-all duration-300",
        "hero-ghost": "border border-foreground/30 bg-transparent text-foreground hover:border-oxford hover:text-oxford hover:shadow-[0_0_15px_hsl(245_83%_54%/0.2)] transition-all duration-300",
        // Navy variant for light backgrounds
        navy: "bg-navy-deep text-white hover:bg-navy-deep/90 hover:shadow-lg",
        // Legacy plum variants for secondary/hover accents
        plum: "bg-gradient-to-r from-plum to-plum-glow text-white hover:shadow-[0_0_20px_hsl(322_100%_41%/0.3)] hover:-translate-y-0.5",
        "ghost-plum": "border border-accent/50 bg-transparent text-accent hover:bg-accent/10 hover:shadow-[0_0_15px_hsl(322_100%_41%/0.2)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
