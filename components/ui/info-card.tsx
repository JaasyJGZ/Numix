"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface InfoCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function InfoCard({ children, className, onClick, hover = true }: InfoCardProps) {
  return (
    <Card
      className={cn(
        "bg-card border-border p-3 sm:p-4 rounded-xl",
        hover && "hover:bg-muted transition-colors",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  )
}