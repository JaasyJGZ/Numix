import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GradientHeaderProps {
  children: ReactNode
  className?: string
}

export function GradientHeader({ children, className }: GradientHeaderProps) {
  return (
    <div className={cn("bg-gradient-to-r from-primary to-secondary py-4", className)}>
      <h2 className="text-center text-xl font-semibold text-primary-foreground">{children}</h2>
    </div>
  )
}