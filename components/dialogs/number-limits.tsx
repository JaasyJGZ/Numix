"use client"

import { useState, useEffect } from "react"
import { DialogForm, FormField } from "@/components/ui/dialog-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, X } from "lucide-react"
import { getNumberLimits, updateNumberLimit, deleteNumberLimit } from "@/lib/number-limits"

interface NumberLimit {
  id: string
  event_id: string
  number_range: string
  max_times: number
  times_sold: number
  created_at: string
}

interface NumberLimitsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

export function NumberLimitsDialog({ open, onOpenChange, eventId }: NumberLimitsDialogProps) {
  const [numberRange, setNumberRange] = useState("")
  const [maxTimes, setMaxTimes] = useState<number | "">("") 
  const [limits, setLimits] = useState<NumberLimit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingLimit, setEditingLimit] = useState<NumberLimit | null>(null)

  // Cargar límites existentes
  useEffect(() => {
    if (open) {
      loadLimits()
    }
  }, [open, eventId])

  const loadLimits = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Intentar cargar los límites con un timeout para evitar bloqueos indefinidos
      const fetchedLimits = await Promise.race([
        getNumberLimits(eventId, { bypassCache: true }),
        new Promise<[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout al cargar límites')), 8000)
        )
      ])
      
      setLimits(Array.isArray(fetchedLimits) ? fetchedLimits : [])
      
      // Si no hay límites, mostrar un mensaje informativo en lugar de error
      if (fetchedLimits.length === 0) {
        console.info('No hay límites configurados para este evento')
      }
    } catch (err) {
      console.error("Error al cargar límites:", err)
      setError("No se pudieron cargar los límites. Intente nuevamente.")
      // Establecer un array vacío para evitar que la interfaz se rompa
      setLimits([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLimit = async () => {
    if (!numberRange.trim()) {
      setError("Debes especificar un número o rango")
      return
    }

    if (maxTimes === "" || maxTimes <= 0) {
      setError("Debes especificar una cantidad máxima válida")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await updateNumberLimit(eventId, numberRange, maxTimes)
      if (result) {
        // Limpiar el formulario
        setNumberRange("")
        setMaxTimes("")
        setEditingLimit(null)
        // Recargar límites
        await loadLimits()
      } else {
        setError("No se pudo guardar el límite")
      }
    } catch (err) {
      console.error("Error al guardar límite:", err)
      setError("Ocurrió un error al guardar el límite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLimit = async (limitId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const success = await deleteNumberLimit(limitId)
      if (success) {
        // Recargar límites
        await loadLimits()
      } else {
        setError("No se pudo eliminar el límite")
      }
    } catch (err) {
      console.error("Error al eliminar límite:", err)
      setError("Ocurrió un error al eliminar el límite")
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleEditLimit = (limit: NumberLimit, e?: React.MouseEvent) => {
    // Prevenir la propagación del evento para evitar que el modal se cierre
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setEditingLimit(limit)
    setNumberRange(limit.number_range)
    setMaxTimes(limit.max_times)
  }
  
  const cancelEdit = () => {
    setEditingLimit(null)
    setNumberRange("")
    setMaxTimes("")
    setError(null)
  }

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      title="Gestionar Límites de Números"
      description="Establece límites para la cantidad de tiempos que se pueden vender por número"
      submitText="Cerrar"
      onSubmit={() => onOpenChange(false)}
    >
      <div className="space-y-4">
        <div className="bg-card/50 p-4 rounded-xl space-y-4 border border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {editingLimit ? "Editar límite" : "Añadir nuevo límite"}
            {editingLimit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 text-muted-foreground hover:text-foreground"
                onClick={cancelEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </h3>
          
          <FormField label="Número">
            <Input
              placeholder="00-99"
              value={numberRange}
              onChange={(e) => setNumberRange(e.target.value)}
              className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
            />
          </FormField>
          
          <FormField label="Límite">
            <Input
              placeholder="Cantidad máxima"
              type="number"
              min="1"
              value={maxTimes === "" ? "" : String(maxTimes)}
              onChange={(e) => setMaxTimes(e.target.value ? parseInt(e.target.value) : "")}
              className="h-12 bg-input border border-border text-foreground placeholder-muted-foreground"
            />
          </FormField>
          
          <Button
            type="button"
            onClick={handleAddLimit}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
          >
            {editingLimit ? "Actualizar límite" : "Guardar límite"}
          </Button>
          
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Límites actuales</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
          ) : limits.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay límites establecidos</p>
          ) : (
            <div className="space-y-2">
              {limits.map((limit) => {
                const remaining = limit.max_times - limit.times_sold
                return (
                  <div key={limit.id} className="bg-card/50 p-3 rounded-lg flex justify-between items-center border border-border">
                    <div>
                      <span className="text-xl font-bold text-foreground">{limit.number_range}</span>
                      <div className="text-sm text-muted-foreground">
                        {limit.times_sold} de {limit.max_times} tiempos vendidos
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                          onClick={(e) => handleEditLimit(limit, e)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                          onClick={() => handleDeleteLimit(limit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DialogForm>
  )
}