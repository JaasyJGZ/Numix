"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AlertCircle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createTicket, deleteTicket, getTickets, updateTicket } from "@/lib/tickets"
import { NumberLimitsDisplay } from "@/components/ui/number-limits-display"
import { getNumberStyle } from "@/lib/prize-utils"
import { SkipLink } from "@/components/ui/skip-link"
import { LiveRegion } from "@/components/ui/live-region"
import { generateUUID } from "@/lib/uuid-utils"
import { enhancedSyncManager } from "@/lib/enhanced-sync-manager"
import { PageHeader } from "@/components/ui/page-header"
import { SearchFilter } from "@/components/ui/search-filter"
import { StatusAlert } from "@/components/ui/status-alert"
import { GradientHeader } from "@/components/ui/gradient-header"
import { PageContainer } from "@/components/ui/page-container"
import { InfoCard } from "@/components/ui/info-card"
import { FloatingButton } from "@/components/ui/floating-button"
import TicketDialog from "@/components/ui/ticket-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SyncStatusIndicator } from "@/components/ui/sync-status-indicator"
import { migrateTicketsWithoutVendor } from "@/lib/tickets"
import { useTickets } from "@/hooks/useTickets"
import { toLocalDateTime, getCurrentLocalDate } from "@/lib/date-utils"

interface TicketRow {
  id: string
  times: string
  actions: string
  value: number
}

interface Ticket {
  id: string
  clientName: string
  amount: number
  numbers: string
  rows: TicketRow[]
  vendorEmail?: string
}

interface Event {
  id: string
  name: string
  startDateTime: string
  endDateTime: string
  totalSold: number
  sellerTimes: number
  tickets: Ticket[]
  status: string
  prize: number
  pricePerTime?: number
  awardedNumbers?: {
    firstPrize: string
    secondPrize: string
    thirdPrize: string
    awardedAt: string
  }
}

export default function EventDetailsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const eventId = typeof params === "object" && !("then" in params) ? params.id : undefined
  const router = useRouter()
  
  // Estados principales
  const [event, setEvent] = useState<Event | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | { status: "success" | "warning" | "error" | "info", text: string }>("")
  const [isLoading, setIsLoading] = useState(true)
  const [resolvedEventId, setResolvedEventId] = useState<string | undefined>(eventId)
  const [showStatusMessage, setShowStatusMessage] = useState(false)
  const [ticketError, setTicketError] = useState<{
    message: string;
    status: "warning" | "error" | "info";
    numberInfo?: { number: string; remaining: number; requested: number };
  } | null>(null)
  
  // Estados para selección múltiple
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [isDeleteMultipleDialogOpen, setIsDeleteMultipleDialogOpen] = useState(false)
  
  // Referencia para el controlador de cancelación
  const abortControllerRef = useRef<AbortController | null>(null)

  // Hook useTickets integrado correctamente con la solución
  const {
    clientName,
    setClientName,
    ticketRows,
    handleInputChange,
    addNewRow,
    removeRow,
    handleComplete: hookHandleComplete,
    totalTimes,
    totalPurchase,
    isProcessing,
    loadTicketForEdit,
    resetForm  // ✅ Agregar esta línea
  } = useTickets({
    eventId: resolvedEventId!,
    pricePerTime: event?.pricePerTime,
    setTickets: (ticketsOrUpdater) => {
      setEvent(prev => {
        if (!prev) return null
        
        let newTickets;
        if (typeof ticketsOrUpdater === 'function') {
          // Si es una función, la ejecutamos con los tickets actuales
          newTickets = ticketsOrUpdater(prev.tickets || [])
        } else {
          // Si es un array directo, lo usamos tal como está
          newTickets = ticketsOrUpdater
        }
        
        return { 
          ...prev, 
          tickets: Array.isArray(newTickets) ? newTickets : [] 
        }
      })
    },
    setError: (error) => {
      if (error) {
        setTicketError({ message: error, status: "error" })
      } else {
        setTicketError(null)
      }
    },
    setIsProcessing: (processing) => {
      // Manejar estado de procesamiento si es necesario
    },
    onSuccess: () => {
      setIsCreateTicketOpen(false)
      // ✅ El estado ya se actualiza correctamente en useTickets
      // No necesitamos llamar a fetchEvent() aquí
    }
  })

  // Efecto para resolver el ID del evento
  useEffect(() => {
    if (eventId) {
      setResolvedEventId(eventId)
    } else if (params && typeof params === "object" && "then" in params) {
      const resolveParams = async () => {
        try {
          const resolvedParams = await params
          setResolvedEventId(resolvedParams.id)
        } catch (error) {
          console.error("Error resolving params:", error)
          router.push("/sorteos")
        }
      }
      resolveParams()
    }
  }, [params, eventId, router])

  // Función auxiliar
  const isDrawClosed = useCallback((event: Event | null) => {
    if (!event) return false
    const [dateStr, timeStr = "00:00:00"] = event.endDateTime.split(" ")
    const endDateTime = toLocalDateTime(dateStr, timeStr)
    const now = new Date()
    return now > endDateTime || event.status === "closed"
  }, [])

  const calculateTotalPrizeMemoized = useCallback((event: Event | null) => {
    if (!event || !event.awardedNumbers) return 0

    const { firstPrize, secondPrize, thirdPrize } = event.awardedNumbers
    let firstPrizeTimes = 0, secondPrizeTimes = 0, thirdPrizeTimes = 0

    event.tickets.forEach((ticket) => {
      ticket.rows.forEach((row) => {
        if (row.actions === firstPrize) firstPrizeTimes += Number(row.times) || 0
        else if (row.actions === secondPrize) secondPrizeTimes += Number(row.times) || 0
        else if (row.actions === thirdPrize) thirdPrizeTimes += Number(row.times) || 0
      })
    })

    const firstMultiplier = event.pricePerTime === 0.25 ? 14 : 11
    return firstPrizeTimes * firstMultiplier + secondPrizeTimes * 3 + thirdPrizeTimes * 2
  }, [])

  const handleRefresh = () => fetchEvent()
  const handleReset = () => {
    setIsResetting(true)
    setSearchQuery("")
    setStartDate(null)
    setTimeout(() => setIsResetting(false), 500)
  }

  // Función fetchEvent optimizada
  const fetchEvent = useCallback(async () => {
    if (!resolvedEventId) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setIsLoading(true)
    setStatusMessage("Cargando datos del sorteo...")

    const currentVendorEmail = localStorage.getItem("currentVendorEmail")
    if (!currentVendorEmail) {
      setStatusMessage("Error: No se encontró email de vendedor actual")
      setShowStatusMessage(true)
      return
    }

    try {
      if (signal.aborted) return

      const ticketsFromSupabase = await getTickets(resolvedEventId, signal)
      if (signal.aborted) return

      const storedEvents = localStorage.getItem("events")
      if (storedEvents) {
        const events = JSON.parse(storedEvents)
        const currentEvent = events.find((e: any) => e.id === resolvedEventId)
        if (currentEvent) {
          const compareDate = currentEvent.repeatDaily ? getCurrentLocalDate() : `${currentEvent.endDate}`
          const endDateTime = toLocalDateTime(compareDate, `${currentEvent.endTime}`)
          const now = new Date()
          const isClosed = now > endDateTime || !currentEvent.active

          // ✅ FUSIÓN INTELIGENTE: Preservar tickets existentes + agregar nuevos de Supabase
          setEvent(prev => {
            // ✅ SOLUCIÓN: Usar directamente los tickets de Supabase
            const processedTickets = ticketsFromSupabase.map(supabaseTicket => ({
              ...supabaseTicket,
              numbers: supabaseTicket.numbers || ''
            }))
            
            const totalSellerTimes = processedTickets.reduce(
              (sum, ticket) => sum + (ticket.rows || []).reduce((rowSum, row) => rowSum + (Number(row.times) || 0), 0),
              0,
            )
            
            const totalSold = processedTickets.reduce((sum, ticket) => sum + ticket.amount, 0)
            
            if (signal.aborted) return prev
            
            const eventObj: Event = {
              id: currentEvent.id,
              name: currentEvent.name,
              startDateTime: `${currentEvent.startDate} ${currentEvent.startTime}`,
              endDateTime: `${compareDate} ${currentEvent.endTime}`,
              totalSold,
              sellerTimes: totalSellerTimes,
              tickets: processedTickets, // ✅ Solo tickets de Supabase (fuente de verdad)
              status: isClosed ? "closed" : "active",
              prize: 0,
              // Usar el valor del evento (camelCase) almacenado en localStorage/Supabase
              pricePerTime: typeof currentEvent.pricePerTime === 'number' ? currentEvent.pricePerTime : 0.20,
              awardedNumbers: currentEvent.awardedNumbers,
            }
            
            eventObj.prize = calculateTotalPrizeMemoized(eventObj)
            
            if (!signal.aborted) {
              setStatusMessage(`Sorteo ${currentEvent.name} actualizado con ${ticketsFromSupabase.length} tickets de Supabase`)
            }
            
            return eventObj
          })
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error("Error in fetchEvent:", error)
      if (!signal.aborted) {
        setStatusMessage("Error al cargar los datos del sorteo")
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false)
        setShowStatusMessage(true)
      }
    }
  }, [calculateTotalPrizeMemoized, resolvedEventId, router])

  // Efectos
  useEffect(() => {
    if (resolvedEventId) {
      fetchEvent()
      const interval = setInterval(() => {
        if (!enhancedSyncManager?.isPausedSync()) {
          fetchEvent()
        }
      }, 60000)
      
      return () => {
        clearInterval(interval)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }
  }, [fetchEvent, resolvedEventId])

  useEffect(() => {
    if (resolvedEventId) {
      migrateTicketsWithoutVendor(resolvedEventId)
        .then((success) => {
          if (success) {
            console.log("Tickets sin vendedor migrados correctamente")
          }
        })
        .catch((error) => {
          console.error("Error migrando tickets sin vendedor:", error)
        })
    }
  }, [resolvedEventId])
  
  useEffect(() => {
    if (showStatusMessage) {
      if (typeof statusMessage === 'object' && (statusMessage.status === 'warning' || statusMessage.status === 'error')) {
        return
      }
      
      const timer = setTimeout(() => {
        setShowStatusMessage(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [showStatusMessage, statusMessage])

  // Función de manejo
  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(ticketId)
      } else {
        newSet.delete(ticketId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(new Set(filteredTickets.map(ticket => ticket.id)))
    } else {
      setSelectedTickets(new Set())
    }
  }

  const handleDeleteSelectedTickets = async () => {
    if (!resolvedEventId) return
    
    try {
      // Obtener el email del vendedor actual
      const currentVendorEmail = localStorage.getItem("currentVendorEmail")
      if (!currentVendorEmail) {
        setStatusMessage({
          status: "error",
          text: "No se encontró email de vendedor"
        })
        setShowStatusMessage(true)
        return
      }
      
      const deletePromises = Array.from(selectedTickets).map(ticketId => 
        deleteTicket(ticketId, resolvedEventId, currentVendorEmail)
      )
      
      await Promise.all(deletePromises)
      
      setStatusMessage({
        status: "success",
        text: `${selectedTickets.size} ticket(s) eliminado(s) correctamente`
      })
      setShowStatusMessage(true)
      
      setSelectedTickets(new Set())
      setIsDeleteMultipleDialogOpen(false)
      fetchEvent()
    } catch (error) {
      console.error("Error deleting selected tickets:", error)
      setStatusMessage({
        status: "error",
        text: "Error al eliminar los tickets seleccionados"
      })
      setShowStatusMessage(true)
    }
}

  const handleEditTicket = (ticket: Ticket) => {
    loadTicketForEdit(ticket)  // ✅ Usar la nueva función
    setIsCreateTicketOpen(true)
    setStatusMessage(`Editando ticket de ${ticket.clientName}`)
  }

  const handleDeleteTicket = async () => {
    if (!event || !selectedTicket || !resolvedEventId) return

    setStatusMessage("Eliminando ticket...")
    const currentVendorEmail = localStorage.getItem("currentVendorEmail")
    const canDelete = !selectedTicket.vendorEmail || selectedTicket.vendorEmail === currentVendorEmail

    if (!canDelete) {
      alert("No puedes eliminar tickets de otros vendedores")
      setStatusMessage("No se puede eliminar: el ticket pertenece a otro vendedor")
      setShowStatusMessage(true)
      setIsDeleteDialogOpen(false)
      return
    }

    try {
      const currentVendorEmail = localStorage.getItem("currentVendorEmail")
      if (!currentVendorEmail) {
        throw new Error("No se encontró email de vendedor")
      }
      
      await deleteTicket(selectedTicket.id, resolvedEventId, currentVendorEmail)
      fetchEvent()
      setSelectedTicket(null)
      setIsDeleteDialogOpen(false)
      setStatusMessage("Ticket eliminado correctamente")
      setShowStatusMessage(true)
    } catch (error) {
      console.error("Error deleting ticket:", error)
      setStatusMessage("Error al eliminar el ticket")
      setShowStatusMessage(true)
    }
  }

  // Función handleComplete integrada con el hook
  const handleComplete = async () => {
    try {
      await hookHandleComplete()
      setSelectedTicket(null)
    } catch (error) {
      console.error("Error in handleComplete:", error)
    }
  }

  // Estados de carga y error
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div
            className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"
            role="status"
            aria-label="Cargando"
          ></div>
          <p className="text-muted-foreground">Cargando datos del sorteo...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 max-w-md mx-auto"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            <h3 className="text-lg font-semibold">Error al cargar el sorteo</h3>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            No se pudo cargar la información del sorteo. Por favor, intenta de nuevo.
          </p>
          <Button onClick={() => router.push("/sorteos")} className="w-full">
            Volver a sorteos
          </Button>
        </div>
      </div>
    )
  }

  // Filtrado de tickets
  const filteredTickets = (event?.tickets && Array.isArray(event.tickets) ? event.tickets : [])
  .filter((ticket) => {
    // ✅ Validación defensiva: verificar que el ticket tenga las propiedades necesarias
    if (!ticket || typeof ticket !== 'object' || !ticket.clientName || !ticket.numbers) {
      return false
    }
    
    const matchesSearch =
      ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ticket.numbers.includes(searchQuery)
  
    if (!startDate) return matchesSearch
  
    const ticketDate = new Date(event.startDateTime)
    const filterDate = startDate
  
    return (
      matchesSearch &&
      ticketDate.getDate() === filterDate.getDate() &&
      ticketDate.getMonth() === filterDate.getMonth() &&
      ticketDate.getFullYear() === filterDate.getFullYear() &&
      (!filterDate || ticketDate.getHours() === filterDate.getHours())
    )
  })

  // Variables para el estado de selección
  const isAllSelected = filteredTickets.length > 0 && selectedTickets.size === filteredTickets.length
  const isPartiallySelected = selectedTickets.size > 0 && selectedTickets.size < filteredTickets.length

  const getTicketNumberStyle = (number: string): React.CSSProperties => {
    return getNumberStyle(number, event?.awardedNumbers)
  }

  return (
    <>
      <SkipLink />
      <LiveRegion role="status">
        {typeof statusMessage === 'string' 
          ? statusMessage 
          : statusMessage.text ? statusMessage.text : ''}
      </LiveRegion>

      <div className="min-h-screen bg-background text-foreground">
        <PageHeader
          title="Detalles del Sorteo"
          backUrl="/sorteos"
          onRefresh={handleReset}
          isRefreshing={isResetting}
          rightContent={<SyncStatusIndicator />}
        />

        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
        />

        {isDrawClosed(event) && (
          <PageContainer maxWidth="md">
            <StatusAlert
              status="error"
              icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}
              className="mt-4 mb-2"
            >
              Este sorteo está cerrado. Solo puedes ver la información de los tickets vendidos.
            </StatusAlert>
          </PageContainer>
        )}
        
        {showStatusMessage && (
          <PageContainer maxWidth="md">
            <StatusAlert
              status={typeof statusMessage === 'object' ? statusMessage.status : 'info'}
              icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}
              className="mt-4 mb-2"
            >
              {typeof statusMessage === 'object' ? statusMessage.text : statusMessage}
            </StatusAlert>
          </PageContainer>
        )}

        <GradientHeader>{event.name}</GradientHeader>

        <main id="main-content" className="p-4 pb-8 bg-muted/30" tabIndex={-1}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Inicio</h3>
              <p className="text-lg text-foreground">{event.startDateTime}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-medium text-muted-foreground">Finalización</h3>
              <p className="text-lg text-foreground">{event.endDateTime}</p>
            </div>
          </div>

          <PageContainer maxWidth="md">
            {resolvedEventId && <NumberLimitsDisplay eventId={resolvedEventId} />}
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <InfoCard>
                <div className="text-xl font-bold text-primary" aria-label="Total vendido">
                  ${event.totalSold.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total vendido</div>
              </InfoCard>
              <InfoCard>
                <div className="text-xl font-bold text-primary" aria-label="Tiempos del vendedor">
                  {event.sellerTimes}
                </div>
                <div className="text-sm text-muted-foreground">Tiempos del vendedor</div>
              </InfoCard>
              <InfoCard>
                <div className="text-xl font-bold text-primary" aria-label="Ganancias">
                  ${(event.totalSold - event.prize).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Ganancias</div>
              </InfoCard>
              <InfoCard>
                <div className="text-xl font-bold text-primary" aria-label="Premio">
                  ${event.prize.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Premio</div>
              </InfoCard>
            </div>

            <div className="space-y-4 mb-20">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Tickets</h3>
                <div className="flex items-center gap-4">
                  {selectedTickets.size > 0 && !isDrawClosed(event) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeleteMultipleDialogOpen(true)}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar ({selectedTickets.size})
                    </Button>
                  )}
                  <div aria-live="polite" aria-atomic="true">
                    {filteredTickets.length > 0 && (
                      <span className="text-sm text-gray-400">
                        {filteredTickets.length} {filteredTickets.length === 1 ? "ticket" : "tickets"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {filteredTickets.length > 0 && !isDrawClosed(event) && (
                <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isPartiallySelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    aria-label="Seleccionar todos los tickets"
                  />
                  <span className="text-sm text-muted-foreground">
                    {isAllSelected ? 'Deseleccionar todos' : isPartiallySelected ? 'Seleccionar todos' : 'Seleccionar todos'}
                    {selectedTickets.size > 0 && ` (${selectedTickets.size} seleccionados)`}
                  </span>
                </div>
              )}

              {filteredTickets.map((ticket) => (
                <InfoCard
                  key={ticket.id}
                  className={`py-2 sm:py-4 transition-all ${
                    selectedTickets.has(ticket.id) 
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isDrawClosed(event) && (
                      <input
                        type="checkbox"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={(e) => handleSelectTicket(ticket.id, e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-border rounded flex-shrink-0"
                        aria-label={`Seleccionar ticket de ${ticket.clientName}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    
                  <div 
  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 flex-1 cursor-pointer"
  onClick={() => handleEditTicket(ticket)}
>
  <div className="flex-1 min-w-0">
    <h4 className="text-base font-semibold text-primary truncate">{ticket.clientName}</h4>
    <div className="text-sm sm:text-base font-bold text-primary">${ticket.amount.toFixed(2)}</div>
  </div>
  <div className="text-left sm:text-right w-full sm:w-auto sm:flex-shrink-0 sm:max-w-lg">
    <div className="text-xs text-muted-foreground">Números</div>
    <div 
      className="text-sm sm:text-base font-bold text-primary break-words"
      style={{
        wordSpacing: '0.25rem',
        lineHeight: '1.4',
        maxWidth: '60ch'
      }}
    >
      {ticket.numbers}
    </div>
  </div>
</div>
                    
                    {!isDrawClosed(event) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTicket(ticket)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/20 flex-shrink-0"
                        aria-label={`Eliminar ticket de ${ticket.clientName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </InfoCard>
              ))}

              {filteredTickets.length === 0 && (
                <div className="text-center text-gray-400 py-8" aria-live="polite">
                  No hay tickets que coincidan con los filtros
                </div>
              )}
            </div>
          </PageContainer>
        </main>

        {!isDrawClosed(event) && (
          <FloatingButton
            onClick={() => {
              setSelectedTicket(null)
              setClientName("")
              setIsCreateTicketOpen(true)
            }}
            aria-label="Crear nuevo ticket"
          >
            Crear nuevo ticket 🎟️
          </FloatingButton>
        )}

        {/* ELIMINAR ESTA LÍNEA - Ya no es necesaria con sticky positioning */}
        {/* <div className="pb-20 bg-background" aria-hidden="true" /> */}

        <TicketDialog
          open={isCreateTicketOpen}
          onOpenChange={(open) => {
            setIsCreateTicketOpen(open)
            if (!open) {
              setTicketError(null)
              resetForm() // ✅ Limpiar el formulario al cerrar
            }
          }}
          clientName={clientName}
          onClientNameChange={setClientName}
          ticketRows={ticketRows}
          onInputChange={handleInputChange}
          onAddRow={addNewRow}
          onRemoveRow={removeRow}
          onComplete={async () => {
            if ((window as any)._isProcessingTicket) {
              console.log('Ya hay un proceso de creación de ticket en curso, evitando duplicación')
              return
            }
            
            try {
              (window as any)._isProcessingTicket = true
              await handleComplete()
            } finally {
              setTimeout(() => {
                (window as any)._isProcessingTicket = false
              }, 1000)
            }
          }}
          onDelete={
            selectedTicket
              ? () => {
                  setIsCreateTicketOpen(false)
                  setIsDeleteDialogOpen(true)
                }
              : undefined
          }
          isReadOnly={isDrawClosed(event)}
          title={isDrawClosed(event) ? "Detalles del ticket" : selectedTicket ? "Editar ticket" : "Nuevo ticket"}
          selectedTicket={selectedTicket}
          errorMessage={ticketError?.message}
          errorStatus={ticketError?.status}
          numberInfo={ticketError?.numberInfo}
        />

        <AlertDialog open={isDeleteDialogOpen && !isDrawClosed(event)} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-card text-foreground border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ticket?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción no se puede deshacer. El ticket será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setIsCreateTicketOpen(true)
                }}
                className="bg-input border border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteMultipleDialogOpen && !isDrawClosed(event)} onOpenChange={setIsDeleteMultipleDialogOpen}>
          <AlertDialogContent className="bg-card text-foreground border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tickets seleccionados?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Esta acción no se puede deshacer. Se eliminarán {selectedTickets.size} ticket(s) permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setIsDeleteMultipleDialogOpen(false)}
                className="bg-input border border-border text-foreground hover:bg-muted"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteSelectedTickets} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Eliminar {selectedTickets.size} ticket(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="bg-card text-foreground border-border">
            <DialogHeader>
              <DialogTitle>Filtrar tickets</DialogTitle>
              <DialogDescription className="text-muted-foreground">Selecciona una fecha para filtrar los tickets</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="filter-date" className="block text-sm font-medium text-muted-foreground mb-1">
                  Fecha
                </label>
                <Input
                  id="filter-date"
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90"
              >
                Aplicar filtro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}