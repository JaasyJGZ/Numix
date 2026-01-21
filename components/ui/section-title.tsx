import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionTitleProps {
  children: ReactNode
  className?: string
  description?: string
}

export function SectionTitle({ children, className, description }: SectionTitleProps) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-lg md:text-xl font-semibold text-white">{children}</h2>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}

