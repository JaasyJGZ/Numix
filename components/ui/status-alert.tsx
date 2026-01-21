import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface StatusAlertProps {
  children: ReactNode
  status: "success" | "warning" | "error" | "info"
  icon?: ReactNode
  className?: string
}

export function StatusAlert({ children, status, icon, className }: StatusAlertProps) {
  const statusVariants = {
    success: "bg-primary/10 text-primary border-primary/50",
    warning: "bg-secondary/10 text-secondary border-secondary/50",
    error: "bg-destructive/10 text-destructive border-destructive/50",
    info: "bg-accent/10 text-accent border-accent/50",
  }

  return (
    <Alert className={cn(statusVariants[status], className)}>
      <div className="flex items-center gap-2">
        {icon}
        <AlertDescription className="text-sm">{children}</AlertDescription>
      </div>
    </Alert>
  )
}

