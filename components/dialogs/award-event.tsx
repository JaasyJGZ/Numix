"use client"

import { DialogForm, FormField } from "@/components/ui/dialog-form"
import { Input } from "@/components/ui/input"
import type { Event } from "@/types"
import { useState, useEffect } from "react"

interface AwardEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event
  onSubmit: (numbers: { firstPrize: string; secondPrize: string; thirdPrize: string }) => void
}

export function AwardEventDialog({ open, onOpenChange, event, onSubmit }: AwardEventDialogProps) {
  const [numbers, setNumbers] = useState({
    firstPrize: "",
    secondPrize: "",
    thirdPrize: "",
  })

  // Cambiar el useEffect en las líneas 24-40:
  useEffect(() => {
    if (open && event) {
      if (event.status === "closed_awarded" && event.awardedNumbers) {
        // Si el evento ya fue premiado, pre-llenar con los números existentes
        setNumbers({
          firstPrize: event.awardedNumbers.firstPrize || "",
          secondPrize: event.awardedNumbers.secondPrize || "",
          thirdPrize: event.awardedNumbers.thirdPrize || "",
        })
      } else {
        // Si es un evento nuevo, limpiar los campos
        setNumbers({
          firstPrize: "",
          secondPrize: "",
          thirdPrize: "",
        })
      }
    }
  }, [open, event])

  if (!event && open) {
    return null
  }

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title="Premiar Evento"
      description="Ingrese los números ganadores (00-99)"
      submitText="Premiar y Cerrar Evento"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget)
        onSubmit({
          firstPrize: formData.get("firstPrize") as string,
          secondPrize: formData.get("secondPrize") as string,
          thirdPrize: formData.get("thirdPrize") as string,
        })
      }}
    >
      <div className="space-y-6">
        <FormField label={event?.pricePerTime === 0.25 ? "Primer Premio (x14)" : "Primer Premio (x11)"}>
          <Input
            name="firstPrize"
            type="text"
            maxLength={2}
            pattern="[0-9]*"
            placeholder="00"
            value={numbers.firstPrize}
            onChange={(e) => setNumbers({ ...numbers, firstPrize: e.target.value })}
            required
            className="h-16 text-center text-2xl font-bold bg-gradient-to-r from-primary/10 to-accent/10 border-0 text-secondary"
          />
        </FormField>

        <FormField label="Segundo Premio (x3)">
          <Input
            name="secondPrize"
            type="text"
            maxLength={2}
            pattern="[0-9]*"
            placeholder="00"
            value={numbers.secondPrize}
            onChange={(e) => setNumbers({ ...numbers, secondPrize: e.target.value })}
            required
            className="h-16 text-center text-2xl font-bold bg-gradient-to-r from-primary/10 to-accent/10 border-0 text-accent"
          />
        </FormField>

        <FormField label="Tercer Premio (x2)">
          <Input
            name="thirdPrize"
            type="text"
            maxLength={2}
            pattern="[0-9]*"
            placeholder="00"
            value={numbers.thirdPrize}
            onChange={(e) => setNumbers({ ...numbers, thirdPrize: e.target.value })}
            required
            className="h-16 text-center text-2xl font-bold bg-gradient-to-r from-primary/10 to-accent/10 border-0 text-primary"
          />
        </FormField>
      </div>
    </DialogForm>
  )
}

