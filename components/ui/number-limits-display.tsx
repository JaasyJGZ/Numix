"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Info } from "lucide-react"
import { getNumberLimits, subscribeToNumberLimits } from "@/lib/number-limits"

interface NumberLimit {
  id: string
  event_id: string
  number_range: string
  max_times: number
  times_sold: number
  created_at: string
}

interface NumberLimitsDisplayProps {
  eventId: string
}

export function NumberLimitsDisplay({ eventId }: NumberLimitsDisplayProps) {
  const [numberLimits, setNumberLimits] = useState<NumberLimit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar límites de números al montar el componente
    const fetchNumberLimits = async () => {
      setLoading(true)
      try {
        const limits = await getNumberLimits(eventId)
        setNumberLimits(limits)
      } catch (error) {
        console.error("Error fetching number limits:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNumberLimits()

    // Suscribirse a cambios en los límites de números
    const unsubscribe = subscribeToNumberLimits(eventId, (limits) => {
      setNumberLimits(limits)
    })

    // Limpiar suscripción al desmontar
    return () => {
      unsubscribe()
    }
  }, [eventId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="w-6 h-6 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (numberLimits.length === 0) {
    return (
      <Card className="bg-white/5 border-0 p-4 mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-5 w-5" />
          <p>No hay números con límites establecidos para este sorteo.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-foreground">Números Limitados</h3>
        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">{numberLimits.length}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {numberLimits.map((limit) => {
          const remaining = limit.max_times - limit.times_sold
          // Asegurarse de que percentUsed sea 0 cuando times_sold es 0
          const percentUsed = limit.times_sold > 0 ? (limit.times_sold / limit.max_times) * 100 : 0
          const isLow = remaining <= 5

          return (
            <Card 
              key={limit.id} 
              className={`bg-card/50 border-border p-3 relative overflow-hidden ${isLow ? 'border-l-2 border-l-secondary' : ''}`}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-foreground">{limit.number_range}</span>
                
                {/* Contador de tiempos disponibles */}
                <div className="flex items-center gap-1 mt-1">
                  {isLow && <AlertCircle className="h-3 w-3 text-secondary" />}
                  <span 
                    className={`text-sm font-medium ${percentUsed >= 90 ? 'text-destructive' : percentUsed >= 50 ? 'text-secondary' : 'text-primary'}`}
                  >
                    {limit.times_sold}/{limit.max_times}
                  </span>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full h-1 bg-muted mt-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${percentUsed >= 90 ? 'bg-destructive' : percentUsed >= 50 ? 'bg-secondary' : 'bg-primary'}`}
                    style={{ width: `${percentUsed}%` }}
                  ></div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}