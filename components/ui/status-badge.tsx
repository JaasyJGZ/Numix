import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface StatusBadgeProps {
  children: ReactNode
  status: "success" | "warning" | "error" | "info"
  icon?: ReactNode
  className?: string
}

export function StatusBadge({ children, status, icon, className }: StatusBadgeProps) {
  const statusVariants = {
  success: "bg-primary hover:bg-primary/90",
  warning: "bg-secondary hover:bg-secondary/90",
  error: "bg-destructive hover:bg-destructive/90",
  info: "bg-accent hover:bg-accent/90",
}

  return (
    <Badge className={cn("inline-flex items-center gap-1", statusClasses[status], className)}>
      {icon}
      {children}
    </Badge>
  )
}

