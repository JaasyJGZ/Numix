"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface LiveRegionProps {
  children: React.ReactNode
  role?: "status" | "alert" | "log" | "marquee" | "timer"
  "aria-live"?: "off" | "polite" | "assertive"
  "aria-atomic"?: boolean
  "aria-relevant"?: "additions" | "removals" | "text" | "all" | "additions text"
  className?: string
}

export function LiveRegion({
  children,
  role = "status",
  "aria-live": ariaLive = "polite",
  "aria-atomic": ariaAtomic = true,
  "aria-relevant": ariaRelevant = "additions text",
  className,
}: LiveRegionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
      className={cn("sr-only", className)}
    >
      {children}
    </div>
  )
}

