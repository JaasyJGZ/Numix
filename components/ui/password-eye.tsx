"use client"

import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordEyeProps {
  isVisible: boolean
  onToggle: () => void
  className?: string
}

export function PasswordEye({ isVisible, onToggle, className }: PasswordEyeProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
        "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {isVisible ? (
        <Eye className="h-4 w-4 transition-transform hover:scale-110" />
      ) : (
        <EyeOff className="h-4 w-4 transition-transform hover:scale-110" />
      )}
      <span className="sr-only">{isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
    </button>
  )
}

