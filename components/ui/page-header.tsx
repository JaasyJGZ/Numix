"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: ReactNode
  backUrl?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  rightContent?: ReactNode
}

export function PageHeader({ title, backUrl, onRefresh, isRefreshing, rightContent }: PageHeaderProps) {
  const router = useRouter()

  const handleBackClick = () => {
    // Usar router.back() en lugar de router.push(backUrl) para navegación natural
    if (window.history.length > 1) {
      router.back()
    } else {
      // Fallback si no hay historial (ej: acceso directo a la página)
      router.push(backUrl || "/vendedor/dashboard")
    }
  }

  return (
    <header className="sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {(backUrl !== undefined) && (
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className="p-2 hover:bg-muted rounded-full"
              aria-label="Volver a la página anterior"
            >
              <ArrowLeft className="h-6 w-6 text-foreground" aria-hidden="true" />
            </Button>
          )}
          <h1 className="text-lg md:text-2xl font-bold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              onClick={onRefresh}
              className={`text-primary hover:text-primary/80 p-2 transition-transform ${
                isRefreshing ? "animate-spin" : ""
              }`}
              disabled={isRefreshing}
              aria-label="Refrescar"
              aria-busy={isRefreshing}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Refrescar</span>
            </Button>
          )}
          {rightContent}
        </div>
      </div>
    </header>
  )
}

