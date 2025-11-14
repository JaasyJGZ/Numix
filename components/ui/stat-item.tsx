import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface StatItemProps {
  value: string | number
  label: string
  icon?: ReactNode
  className?: string
}

export function StatItem({ value, label, icon, className }: StatItemProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="flex items-center justify-center gap-2">
        {icon}
        <div className="text-2xl font-bold text-[#4ECDC4]">{value}</div>
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

