import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4"
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}