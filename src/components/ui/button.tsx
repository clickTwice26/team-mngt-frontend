import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 focus-visible:ring-foreground/40",
  secondary:
    "border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-foreground/30",
  ghost: "hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-foreground/20",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium",
        "transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
