"use client"

import { useEffect } from "react"
import { Cloud, CloudOff, AlertCircle, RefreshCw } from "lucide-react"
import { useEnhancedSyncStatus } from "@/lib/enhanced-sync-manager"
import { cn } from "@/lib/utils"

interface SyncStatusIndicatorProps {
  className?: string
}

export function SyncStatusIndicator({ className }: SyncStatusIndicatorProps) {
  const { status, pendingCount, hasPendingOperations, forceSyncNow } = useEnhancedSyncStatus()

  // Intentar sincronizar cuando el componente se monta
  useEffect(() => {
    if (hasPendingOperations) {
      forceSyncNow()
    }
  }, [hasPendingOperations, forceSyncNow])

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "synced":
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: "Sincronizado",
          color: "text-primary",
          bgColor: "bg-primary/10",
          ariaLabel: "Todos los datos están sincronizados",
        }
      case "pending":
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: `Sincronizando${pendingCount > 0 ? ` (${pendingCount})` : "..."}`,
          color: "text-accent",
          bgColor: "bg-accent/10",
          ariaLabel: "Sincronización en progreso",
        }
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Error de sincronización",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          ariaLabel: "Error al sincronizar datos",
        }
      case "offline":
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: "Sin conexión",
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          ariaLabel: "Trabajando sin conexión",
        }
      default:
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: "Estado desconocido",
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          ariaLabel: "Estado de sincronización desconocido",
        }
    }
  }

  const { icon, text, color, bgColor, ariaLabel } = getStatusInfo(status)

  return (
    <button
      onClick={forceSyncNow}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        bgColor,
        color,
        "transition-all duration-300",
        "hover:opacity-80",
        className,
      )}
      aria-label={ariaLabel}
      title={text}
    >
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </button>
  )
}

