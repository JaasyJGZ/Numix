"use client"

import { DialogForm, FormField } from "@/components/ui/dialog-form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import type { Event } from "@/types"

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event
  onSubmit: (data: Event) => void
}

export function EditEventDialog({ open, onOpenChange, event, onSubmit }: EditEventDialogProps) {
  if (!event && open) {
    return null
  }

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Evento"
      submitText="Actualizar Evento"
      onSubmit={(e) => {
        if (!event) return

        const formData = new FormData(e.currentTarget)
        onSubmit({
          ...event,
          name: formData.get("name") as string,
          startDate: formData.get("startDate") as string,
          endDate: formData.get("endDate") as string,
          startTime: formData.get("startTime") as string,
          endTime: formData.get("endTime") as string,
          active: formData.get("active") === "on",
          repeatDaily: formData.get("repeatDaily") === "on",
        })
      }}
    >
      {event && (
        <>
          <FormField label="Nombre">
            <Input
              name="name"
              defaultValue={event.name}
              placeholder="Nombre del sorteo"
              required
              className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Fecha de inicio">
              <Input
                name="startDate"
                type="date"
                defaultValue={event.startDate}
                required
                className="h-12 bg-input border border-border text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>

            <FormField label="Fecha de finalización">
              <Input
                name="endDate"
                type="date"
                defaultValue={event.endDate}
                required
                className="h-12 bg-input border border-border text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Hora de inicio">
              <Input
                name="startTime"
                type="time"
                defaultValue={event.startTime}
                required
                className="h-12 bg-input border border-border text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>

            <FormField label="Hora de finalización">
              <Input
                name="endTime"
                type="time"
                defaultValue={event.endTime}
                required
                className="h-12 bg-input border border-border text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </FormField>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="active" name="active" defaultChecked={event.active} className="border-border" />
              <label htmlFor="active" className="text-sm text-muted-foreground select-none cursor-pointer">
                Activo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="repeatDaily"
                name="repeatDaily"
                defaultChecked={event.repeatDaily}
                className="border-border"
              />
              <label htmlFor="repeatDaily" className="text-sm text-muted-foreground select-none cursor-pointer">
                Repetir diariamente
              </label>
            </div>
          </div>
        </>
      )}
    </DialogForm>
  )
}

