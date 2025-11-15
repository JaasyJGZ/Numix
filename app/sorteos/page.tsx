"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Award, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toLocalDateTime, getCurrentLocalDate, getCurrentLocalTime } from "@/lib/date-utils"
// Cambiar esta línea:
// import { supabase } from "@/lib/supabase"

// Por esta (o eliminarla si ya no se usa):
// La importación se hará dinámicamente dentro de fetchDraws

// Importar el componente PageHeader
import { PageHeader } from "@/components/ui/page-header"
import { SearchFilter } from "@/components/ui/search-filter"
import { SyncStatusIndicator } from "@/components/ui/sync-status-indicator"

interface Draw {
  id: string
  name: string
  datetime: string
  status: "active" | "closed" | "closed_awarded" | "closed_pending" | "closed_not_awarded"
  pricePerTime?: number
  awardedNumbers?: {
    firstPrize: string
    secondPrize: string
    thirdPrize: string
  }
}

export default function SorteosPage() {
  const router = useRouter()
  const [stateActiveDraws, setStateActiveDraws] = useState<Draw[]>([])
  const [stateClosedDraws, setStateClosedDraws] = useState<Draw[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterDate, setFilterDate] = useState<Date | null>(null)
  const [filterTime, setFilterTime] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("all")
  // Add state for reset animation
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = () => {
    setIsResetting(true)
    setSearchQuery("")
    setFilterDate(null)
    setFilterTime("")
    setFilterStatus("all")

    // Visual feedback for reset action
    setTimeout(() => {
      setIsResetting(false)
    }, 500)
  }

  const handleRefresh = () => {
    fetchDraws()
  }

  // Modificar fetchDraws para mejorar la carga de eventos
  const fetchDraws = useCallback(async () => {
    try {
      // Verificar primero la conexión a Supabase
      const { checkSupabaseConnection } = await import("@/lib/check-supabase")
      const connectionStatus = await checkSupabaseConnection()
      
      if (!connectionStatus.connected) {
        console.error("Error de conexión a Supabase:", connectionStatus.error)
        // Mostrar mensaje específico de error de conexión
        console.error("No se pudo conectar a Supabase. Usando datos locales.")
        fetchDrawsFromLocalStorage()
        return
      }
      
      // Intentar cerrar automáticamente eventos expirados usando hora local del cliente
      try {
        const body = {
          currentDate: getCurrentLocalDate(),
          currentTime: getCurrentLocalTime(),
        }
        await fetch("/api/events/auto-close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } catch (e) {
        console.warn("No se pudo ejecutar auto-close de eventos:", e)
      }

      // Usar API segura del servidor para obtener eventos (service role en servidor)
      const res = await fetch("/api/events", { method: "GET" })
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}))
        console.error("Error fetching events via API:", errPayload)
        fetchDrawsFromLocalStorage()
        return
      }
      const { events: eventsData } = await res.json()
      {
        console.log("Events fetched from API:", eventsData)
        const currentDate = new Date()

        // Utilidad robusta para parsear fecha y hora (compatible y sin ambigüedades)
        const toDateTime = (dateStr: string, timeStr: string) => {
          return toLocalDateTime(dateStr, timeStr)
        }

        // Filtrar eventos activos y cerrados con parseo fiable y considerando status
        const active = eventsData.filter((draw) => {
          const compareDate = draw.repeat_daily ? getCurrentLocalDate() : draw.end_date
          const endDT = toDateTime(compareDate, draw.end_time)
          return endDT > currentDate && draw.status === "active"
        })

        const closed = eventsData.filter((draw) => {
          const compareDate = draw.repeat_daily ? getCurrentLocalDate() : draw.end_date
          const endDT = toDateTime(compareDate, draw.end_time)
          return endDT <= currentDate || !draw.active || (typeof draw.status === "string" && draw.status.startsWith("closed_"))
        })

        // Mapear a formato esperado por el componente
        setStateActiveDraws(
          active.map((draw) => ({
            id: draw.id,
            name: draw.name,
            datetime: `${draw.start_date} ${draw.start_time}`,
            pricePerTime: typeof draw.price_per_time === 'number' ? draw.price_per_time : 0.20,
            status: draw.status || "active",
          })),
        )

        setStateClosedDraws(
          closed.map((draw) => ({
            id: draw.id,
            name: draw.name,
            datetime: `${draw.end_date} ${draw.end_time}`,
            pricePerTime: typeof draw.price_per_time === 'number' ? draw.price_per_time : 0.20,
            status: draw.status || "closed_pending",
            awardedNumbers: draw.first_prize
              ? {
                  firstPrize: draw.first_prize,
                  secondPrize: draw.second_prize,
                  thirdPrize: draw.third_prize,
                }
              : undefined,
          })),
        )

        // Actualizar localStorage para mantener sincronización
        localStorage.setItem(
          "events",
          JSON.stringify(
            [...active, ...closed].map((event) => ({
              id: event.id,
              name: event.name,
              startDate: event.start_date,
              endDate: event.end_date,
              startTime: event.start_time,
              endTime: event.end_time,
              active: event.active,
              repeatDaily: event.repeat_daily ?? false,
              pricePerTime: typeof event.price_per_time === 'number' ? event.price_per_time : 0.20,
              status: event.status || "active",
              awardedNumbers: event.first_prize
                ? {
                    firstPrize: event.first_prize,
                    secondPrize: event.second_prize,
                    thirdPrize: event.third_prize,
                    awardedAt: event.awarded_at,
                  }
                : undefined,
            })),
          ),
        )
      }
    } catch (error) {
      // Mejorar el registro de errores para proporcionar información más detallada
      console.error("Error in fetchDraws:", 
        error instanceof Error 
          ? { message: error.message, stack: error.stack } 
          : String(error)
      )
      // Fallback a localStorage
      fetchDrawsFromLocalStorage()
    }
  }, [])

  // Función para obtener sorteos de localStorage como fallback
  const fetchDrawsFromLocalStorage = () => {
    const storedDraws = localStorage.getItem("events")
    if (storedDraws) {
      const parsedDraws = JSON.parse(storedDraws)
      const currentDate = new Date()

      const toDateTime = (dateStr: string, timeStr: string) => {
        return toLocalDateTime(dateStr, timeStr)
      }

      const active = parsedDraws.filter((draw: any) => {
        const compareDate = draw.repeatDaily ? getCurrentLocalDate() : draw.endDate
        const endDT = toDateTime(compareDate, draw.endTime)
        return endDT > currentDate && draw.status === "active"
      })

      const closed = parsedDraws.filter((draw: any) => {
        const compareDate = draw.repeatDaily ? getCurrentLocalDate() : draw.endDate
        const endDT = toDateTime(compareDate, draw.endTime)
        return endDT <= currentDate || !draw.active || (typeof draw.status === "string" && draw.status.startsWith("closed_"))
      })

      setStateActiveDraws(
        active.map((draw) => ({
          id: draw.id,
          name: draw.name,
          datetime: `${draw.startDate} ${draw.startTime}`,
          pricePerTime: typeof draw.pricePerTime === 'number' ? draw.pricePerTime : 0.20,
          status: draw.status || "active",
        })),
      )

      setStateClosedDraws(
        closed.map((draw) => ({
          id: draw.id,
          name: draw.name,
          datetime: `${draw.endDate} ${draw.endTime}`,
          pricePerTime: typeof draw.pricePerTime === 'number' ? draw.pricePerTime : 0.20,
          status: draw.status || "closed_pending",
          awardedNumbers: draw.awardedNumbers,
        })),
      )
    }
  }

  useEffect(() => {
    fetchDraws()
    const interval = setInterval(fetchDraws, 60000)
    return () => clearInterval(interval)
  }, [fetchDraws])

  const filteredDraws = [...stateActiveDraws, ...stateClosedDraws].filter((draw) => {
    const matchesSearch = draw.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? draw.status === "active" : draw.status.startsWith("closed_"))

    if (!filterDate && !filterTime) return matchesSearch && matchesStatus

    const drawDate = new Date(draw.datetime)
    const searchDate = filterDate

    const matchesDate =
      !filterDate ||
      (drawDate.getDate() === filterDate.getDate() &&
        drawDate.getMonth() === filterDate.getMonth() &&
        drawDate.getFullYear() === filterDate.getFullYear())

    const matchesTime = !filterTime || draw.datetime.includes(filterTime)

    return matchesSearch && matchesStatus && matchesDate && matchesTime
  })

  const activeDraws = filteredDraws.filter((draw) => draw.status === "active")
  const closedDraws = filteredDraws.filter((draw) => draw.status.startsWith("closed_"))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Sorteos"
        backUrl="/vendedor/dashboard"
        onRefresh={handleReset}
        isRefreshing={isResetting}
        rightContent={<SyncStatusIndicator />}
      />

      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => setIsFilterOpen(true)}
      />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="py-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Sorteos activos</h2>
          <div className="grid gap-4">
            {activeDraws.map((draw) => (
              <Link key={draw.id} href={`/sorteos/${draw.id}`} className="block w-full">
                <Card className="bg-card border border-border p-4 hover:bg-muted transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className={`text-base md:text-lg font-semibold ${draw.pricePerTime === 0.25 ? 'text-green-600' : 'text-foreground'}`}>{draw.name}</h3>
                      <p className="text-sm text-muted-foreground">{draw.datetime}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
            {activeDraws.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No hay sorteos activos que coincidan con los filtros</div>
            )}
          </div>
        </div>

        <div className="py-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-foreground">Sorteos cerrados</h2>
          <div className="grid gap-4">
            {closedDraws.map((draw) => (
              <Link key={draw.id} href={`/sorteos/${draw.id}`} className="block w-full">
                <Card className="bg-card border border-border p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base md:text-lg font-semibold ${draw.pricePerTime === 0.25 ? 'text-green-600' : 'text-foreground'}`}>{draw.name}</h3>
                        <Badge
                          className={
                            draw.status === "closed_awarded"
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-yellow-500 hover:bg-yellow-600 text-white"
                          }
                        >
                          {draw.status === "closed_awarded" ? (
                            <Award className="h-4 w-4 mr-1" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-1" />
                          )}
                          {draw.status === "closed_awarded" ? "Premiado" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{draw.datetime}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {draw.status === "closed_awarded" && draw.awardedNumbers && (
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500 font-bold">{draw.awardedNumbers.firstPrize}</span>
                          <span className="text-purple-500 font-bold">{draw.awardedNumbers.secondPrize}</span>
                          <span className="text-primary font-bold">{draw.awardedNumbers.thirdPrize}</span>
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            {closedDraws.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No hay sorteos cerrados que coincidan con los filtros
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="bg-background text-foreground border-border w-[95%] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Filtrar sorteos</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <RadioGroup
                value={filterStatus}
                onValueChange={(value: "all" | "active" | "closed") => setFilterStatus(value)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" className="peer sr-only" />
                  <Label
                    htmlFor="all"
                    className="flex-1 cursor-pointer rounded-lg border border-border p-2 text-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                  >
                    Todos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" className="peer sr-only" />
                  <Label
                    htmlFor="active"
                    className="flex-1 cursor-pointer rounded-lg border border-border p-2 text-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                  >
                    Activos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="closed" id="closed" className="peer sr-only" />
                  <Label
                    htmlFor="closed"
                    className="flex-1 cursor-pointer rounded-lg border border-border p-2 text-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                  >
                    Cerrados
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha</label>
              <Input
                type="date"
                value={filterDate ? filterDate.toISOString().split("T")[0] : ""}
                onChange={(e) => setFilterDate(e.target.value ? new Date(e.target.value) : null)}
                className="w-full bg-input border border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Hora</label>
              <Input
                type="time"
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="bg-input border border-border text-foreground"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReset} variant="secondary" className="flex-1">
                Limpiar
              </Button>
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-primary-foreground"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

