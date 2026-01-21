import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface FloatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  className?: string
}

export function FloatingButton({ children, className, ...props }: FloatingButtonProps) {
  return (
    <div
      className="sticky bottom-4 left-0 right-0 z-50 pointer-events-none"
      role="region"
      aria-label="Acciones"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-center pointer-events-auto">
        <Button
          className={cn(
            "h-10 px-6 text-base font-semibold rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-primary-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </Button>
      </div>
    </div>
  )
}