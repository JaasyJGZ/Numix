"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startDate: Date | null
  onStartDateChange: (date: Date | null) => void
}

export default function FilterDialog({ open, onOpenChange, startDate, onStartDateChange }: FilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Filtrar tickets</DialogTitle>
          <DialogDescription>Selecciona los criterios para filtrar la lista de tickets</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha</label>
            <Input
              type="date"
              value={startDate ? startDate.toISOString().split("T")[0] : ""}
              onChange={(e) => onStartDateChange(e.target.value ? new Date(e.target.value) : null)}
              className="bg-input border border-border text-foreground"
            />
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] hover:opacity-90"
          >
            Aplicar filtro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
