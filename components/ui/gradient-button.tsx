import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  icon?: ReactNode
}

export function GradientButton({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  ...props
}: GradientButtonProps) {
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  }

  const variantClasses = {
    primary: "bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90 text-black font-medium",
    secondary:
      "bg-gradient-to-r from-[#FF6B6B]/20 to-[#4ECDC4]/20 hover:from-[#FF6B6B]/30 hover:to-[#4ECDC4]/30 text-white",
    outline: "bg-input hover:bg-muted text-foreground border border-border",
  }

  return (
    <Button
      className={cn(
        "rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  )
}

