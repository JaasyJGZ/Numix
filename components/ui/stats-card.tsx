import { Card } from "@/components/ui/card"
import type { ReactNode } from "react"

interface StatsCardProps {
  value: string | number
  label: string
  icon?: ReactNode
  className?: string
}

export function StatsCard({ value, label, icon, className }: StatsCardProps) {
  return (
    <Card className={`bg-white/5 border-0 p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="text-2xl font-bold text-[#4ECDC4]">{value}</h3>
        </div>
        {icon && <div className="h-12 w-12 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center">{icon}</div>}
      </div>
    </Card>
  )
}

