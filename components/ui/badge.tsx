import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "accent"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 py-1 text-xs font-medium",
          {
            "bg-secondary text-secondary-foreground": variant === "default",
            "bg-primary text-primary-foreground": variant === "primary",
            "bg-accent text-accent-foreground": variant === "accent",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
