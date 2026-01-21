"use client"

import { useState } from "react"
import { DialogForm, FormField } from "@/components/ui/dialog-form"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"

interface AddVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; email: string; password: string }) => void
}

export function AddVendorDialog({ open, onOpenChange, onSubmit }: AddVendorDialogProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar Nuevo Vendedor"
      submitText="Agregar Vendedor"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget)
        onSubmit({
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          password: formData.get("password") as string,
        })
      }}
    >
      <FormField label="Nombre">
        <Input
          name="name"
          placeholder="Nombre del vendedor"
          required
          className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
        />
      </FormField>

      <FormField label="Email">
        <Input
          name="email"
          type="email"
          placeholder="correo@ejemplo.com"
          required
          className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
        />
      </FormField>

      <FormField label="Contraseña">
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </FormField>
    </DialogForm>
  )
}

