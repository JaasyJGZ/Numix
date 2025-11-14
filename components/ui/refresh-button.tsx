"use client"

import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RefreshButtonProps {
  className?: string
}

export function RefreshButton({ className }: RefreshButtonProps) {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <Button variant="ghost" onClick={handleRefresh} className={`text-[#4ECDC4] hover:text-[#3DBCB4] p-2 ${className}`}>
      <RotateCw className="h-5 w-5" />
    </Button>
  )
}

