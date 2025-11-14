"use client"

import { DialogForm, FormField } from "@/components/ui/dialog-form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Trash, RefreshCw } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: {
    superUserName: string
    superUserPassword: string
  }
  onSubmit: (data: { superUserName: string; superUserPassword: string }) => void
  onClearCache: () => void
  onFixErrors: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSubmit,
  onClearCache,
  onFixErrors,
}: SettingsDialogProps) {
  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title="Configuración del Sistema"
      submitText="Guardar Cambios"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget)
        onSubmit({
          superUserName: formData.get("superUserName") as string,
          superUserPassword: formData.get("superUserPassword") as string,
        })
      }}
    >
      <FormField label="Nombre de Administrador">
        <Input
          name="superUserName"
          defaultValue={settings.superUserName}
          required
          className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
        />
      </FormField>

      <FormField label="Contraseña de Administrador">
        <Input
          name="superUserPassword"
          type="password"
          defaultValue={settings.superUserPassword}
          required
          className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
        />
      </FormField>

      <Separator className="bg-border" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClearCache}
          className="h-12 bg-destructive/10 hover:bg-destructive/20 border-destructive/20 text-destructive"
        >
          <Trash className="mr-2 h-5 w-5" />
          Limpiar Caché
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onFixErrors}
          className="h-12 bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Solucionar Errores
        </Button>
      </div>
    </DialogForm>
  )
}