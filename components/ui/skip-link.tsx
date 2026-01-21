"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function SkipLink() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "bg-black text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]",
      )}
    >
      Saltar al contenido principal
    </a>
  )
}

