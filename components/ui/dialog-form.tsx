"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface DialogFormProps extends React.HTMLAttributes<HTMLFormElement> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  submitText?: string
  cancelText?: string
  loading?: boolean
}

export function DialogForm({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitText = "Guardar",
  cancelText = "Cancelar",
  loading = false,
  className,
  ...props
}: DialogFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background text-foreground border border-border p-6 w-[95%] max-w-lg mx-auto">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          ) : (
            <DialogDescription className="text-sm text-muted-foreground">Formulario de {title}</DialogDescription>
          )}
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.(e)
          }}
          className={cn("space-y-4 mt-4", className)}
          {...props}
        >
          <div className="space-y-4">{children}</div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
          >
            {submitText}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FormField({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

