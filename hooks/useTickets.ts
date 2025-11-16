"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { createTicketBatch, updateTicket, deleteTicket } from "@/lib/tickets"
import { PRICE_PER_TIME } from "@/lib/constants"

// === TIPOS OPTIMIZADOS ===
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
  numbers?: string
  rows: TicketRow[]
  vendorEmail?: string
}

interface UseTicketsProps {
  eventId: string
  setTickets?: (tickets: any) => void
  setError?: (error: string | null) => void
  setIsProcessing?: (processing: boolean) => void
  onSuccess?: () => void
  pricePerTime?: number
}

interface ProcessingSteps {
  validating: boolean
  checking: boolean
  creating: boolean
  completed: boolean
}

interface ValidationResult {
  isValid: boolean
  error?: string
  consolidatedNumbers?: Map<string, number>
}

// === CACHE Y OPTIMIZACIONES GLOBALES ===
const processingCache = new Map<string, Promise<any>>()
const PROCESSING_CACHE_TTL = 2000 // 2 segundos
let globalProcessingLock = false

// === FUNCIÓN DE VALIDACIÓN OPTIMIZADA ===
function validateTicketBeforeSubmit(ticket: Omit<Ticket, "id">): ValidationResult {
  // Validar nombre del cliente (optimizado)
  const trimmedName = ticket.clientName?.trim()
  if (!trimmedName || trimmedName.length === 0) {
    return { isValid: false, error: "El nombre del cliente es requerido" }
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: "El nombre del cliente es demasiado largo" }
  }

  // Filtrar y consolidar números en una sola pasada
  const consolidatedNumbers = new Map<string, number>()
  let hasValidRows = false

  for (const row of ticket.rows) {
    if (!row.actions || !row.times) continue
    
    const times = parseInt(row.times, 10)
    if (times <= 0) continue
    
    // Validar rango de números (optimizado)
    const numberValue = parseInt(row.actions, 10)
    if (isNaN(numberValue) || numberValue < 0 || numberValue > 9999) {
      return { isValid: false, error: `Número inválido: ${row.actions}` }
    }
    
    // Validar cantidad de veces (optimizado)
    if (times > 999999) {
      return { isValid: false, error: `Cantidad inválida para el número ${row.actions}: ${times}` }
    }
    
    consolidatedNumbers.set(row.actions, (consolidatedNumbers.get(row.actions) || 0) + times)
    hasValidRows = true
  }

  if (!hasValidRows) {
    return { isValid: false, error: "Debe agregar al menos un número válido" }
  }

  return { isValid: true, consolidatedNumbers }
}

// === HOOK PRINCIPAL OPTIMIZADO ===
export function useTickets({
  eventId,
  setTickets,
  setError,
  setIsProcessing,
  onSuccess,
  pricePerTime
}: UseTicketsProps) {
  // === ESTADOS OPTIMIZADOS ===
  const [clientName, setClientName] = useState("")
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([
    { id: "1", times: "", actions: "", value: 0 }
  ])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [processingSteps, setProcessingSteps] = useState<ProcessingSteps>({
    validating: false,
    checking: false,
    creating: false,
    completed: false
  })

  // Referencias para optimización
  const processingRef = useRef(false)
  const lastProcessingTime = useRef(0)
  const unitPrice = typeof pricePerTime === 'number' ? pricePerTime : PRICE_PER_TIME

  // === CÁLCULOS MEMOIZADOS OPTIMIZADOS ===
  const memoizedTotals = useMemo(() => {
    let totalTimes = 0
    let hasValidData = false

    for (const row of ticketRows) {
      const times = parseInt(row.times, 10)
      if (!isNaN(times) && times > 0) {
        totalTimes += times
        hasValidData = true
      }
    }
    
    return {
      totalTimes,
      totalPurchase: totalTimes * unitPrice,
      hasValidData
    }
  }, [ticketRows, unitPrice])

  // === MANEJADORES OPTIMIZADOS ===
  const handleInputChange = useCallback((id: string, field: keyof TicketRow, value: string | number) => {
    setTicketRows(prevRows => {
      const newRows = [...prevRows]
      const rowIndex = newRows.findIndex(row => row.id === id)
      
      if (rowIndex === -1) return prevRows
      
      const updatedRow = { ...newRows[rowIndex], [field]: value }
      
      // Calcular valor automáticamente si es necesario
      if (field === 'times') {
        const times = parseInt(value as string, 10) || 0
        updatedRow.value = times * unitPrice
      }
      
      newRows[rowIndex] = updatedRow
      return newRows
    })
  }, [unitPrice])

  const removeRow = useCallback((id: string) => {
    setTicketRows(prevRows => {
      if (prevRows.length <= 1) return prevRows
      return prevRows.filter(row => row.id !== id)
    })
  }, [])
const addNewRow = useCallback((initialValues?: { times?: string; actions?: string }) => {
  const newRowId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  setTicketRows(prevRows => [
    ...prevRows, 
    { 
      id: newRowId, 
      times: initialValues?.times || "", 
      actions: initialValues?.actions || "", 
      value: initialValues?.times ? parseInt(initialValues.times, 10) * unitPrice || 0 : 0
      // value computed with unitPrice below
    }
  ])
}, [unitPrice])

  const resetForm = useCallback(() => {
    setClientName("")
    setTicketRows([{ id: "1", times: "", actions: "", value: 0 }])
    setSelectedTicket(null)
    setProcessingSteps({
      validating: false,
      checking: false,
      creating: false,
      completed: false
    })
  }, [])

  // === FUNCIÓN HANDLECOMPLETE ULTRA-OPTIMIZADA ===
  // Modificar handleComplete para detectar si es edición o creación
  const handleComplete = useCallback(async () => {
    if (processingRef.current) return
    
    processingRef.current = true
    setIsProcessing?.(true)
    
    try {
      const ticket: Omit<Ticket, "id"> = {
        clientName,
        amount: memoizedTotals.totalPurchase,
        rows: ticketRows,
        numbers: ticketRows.map(row => row.actions).filter(action => action).join(", ")
      }
      
      const validation = validateTicketBeforeSubmit(ticket)
      if (!validation.isValid) {
        setError?.(validation.error || "Datos inválidos")
        return
      }
      
      let result
      
      if (selectedTicket) {
        // ✅ Es una edición - validar y conservar vendorEmail
        const currentVendorEmail = localStorage.getItem("currentVendorEmail")
        if (!currentVendorEmail) {
          setError("No se encontró email de vendedor actual")
          return
        }
        
        // ✅ Asegurar que el vendorEmail esté presente
        const vendorEmailToUse = selectedTicket.vendorEmail || currentVendorEmail
        
        if (!vendorEmailToUse) {
          setError("No se pudo determinar el vendedor del ticket")
          return
        }
        
        result = await updateTicket({ 
          ...ticket, 
          id: selectedTicket.id,
          vendorEmail: vendorEmailToUse
        }, eventId, currentVendorEmail)
        // ✅ Manejo explícito de éxito/error
        if (result && 'success' in result && !result.success) {
          // Error al actualizar
          setError?.(result.message)
          return
        }
        if (result && !('success' in result)) {
          // Actualización exitosa: actualizar lista y cerrar
          setTickets?.((prev: any) => 
            prev.map((t: any) => t.id === selectedTicket.id ? result : t)
          )
          setError?.(null)
          onSuccess?.()
          resetForm()
        }
      } else {
        // ✅ Es una creación nueva
        result = await createTicketBatch(ticket, eventId)
        
        // ✅ VERIFICAR ERROR ANTES de agregar al estado
        if (result && 'success' in result && !result.success) {
          setError?.(result.message)
          return
        }
        
        // ✅ Solo agregar tickets válidos al estado
        if (result && !('success' in result)) {
          setTickets?.((prev: any) => {
            const exists = prev.some((t: any) => t.id === result.id)
            return exists ? prev : [result, ...prev]
          })
          setError?.(null)
          onSuccess?.()
          resetForm()
        }
      }
    } catch (error) {
      console.error("Error en handleComplete:", error)
      setError?.("Error procesando ticket")
    } finally {
      setIsProcessing?.(false)
      processingRef.current = false
    }
  }, [clientName, ticketRows, memoizedTotals.totalPurchase, eventId, selectedTicket, setTickets, setError, setIsProcessing, onSuccess, resetForm])

  // === FUNCIÓN DELETE OPTIMIZADA ===
  const handleDeleteTicket = useCallback(async () => {
    if (!selectedTicket || processingRef.current) return

    processingRef.current = true
    setIsProcessing?.(true)

    try {
      // Obtener el email del vendedor actual
      const currentVendorEmail = localStorage.getItem("currentVendorEmail")
      if (!currentVendorEmail) {
        setError?.("No se encontró email de vendedor")
        return
      }
      
      const success = await deleteTicket(selectedTicket.id, eventId, currentVendorEmail)
      
      if (success) {
        onSuccess?.()
        resetForm()
        setIsDeleteDialogOpen(false)
        setError?.(null)
      } else {
        setError?.("Error al eliminar el ticket")
      }
    } catch (error) {
      console.error("Error deleting ticket:", error)
      setError?.("Error al eliminar el ticket")
    } finally {
      setIsProcessing?.(false)
      processingRef.current = false
    }
  }, [eventId, onSuccess, resetForm, selectedTicket, setError, setIsProcessing])

  // === FUNCIÓN UPDATE OPTIMIZADA ===
  const handleUpdateTicket = useCallback(async (ticket: Ticket) => {
    if (processingRef.current) {
      console.log("🔒 Actualización bloqueada - procesamiento en curso")
      return
    }

    processingRef.current = true
    setIsProcessing?.(true)

    try {
      const result = await updateTicket(ticket, eventId)
      
      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        setError?.(result.message)
        return
      }

      if (result) {
        setTickets?.((prev: any) => 
          prev.map((t: any) => t.id === ticket.id ? result : t)
        )
        setError?.(null)
        onSuccess?.()
        resetForm()
      } else {
        setError?.("Error al actualizar el ticket")
      }
    } catch (error) {
      console.error("Error en handleUpdateTicket:", error)
      setError?.("Error inesperado al actualizar el ticket")
    } finally {
      setIsProcessing?.(false)
      processingRef.current = false
    }
  }, [eventId, setTickets, setError, setIsProcessing, onSuccess, resetForm])

  // Agregar la función loadTicketForEdit ANTES del return
  const loadTicketForEdit = useCallback((ticket: Ticket) => {
    // ✅ Asegurar que el ticket tenga vendorEmail
    const currentVendorEmail = localStorage.getItem("currentVendorEmail")
    const ticketWithVendor = {
      ...ticket,
      vendorEmail: ticket.vendorEmail || currentVendorEmail || "unknown"
    }
    
    setSelectedTicket(ticketWithVendor)
    setClientName(ticket.clientName)
    
    // Cargar las filas del ticket
    if (ticket.rows && ticket.rows.length > 0) {
      setTicketRows(ticket.rows.map(row => ({
        ...row,
        // Preservar el valor guardado en el ticket; solo calcular si falta
        value: typeof row.value === 'number' ? row.value : (parseInt(row.times) * unitPrice || 0)
      })))
    } else {
      // Si no hay filas, usar una fila vacía por defecto
      setTicketRows([{ id: "1", times: "", actions: "", value: 0 }])
    }
  }, [])

  // === RETORNO OPTIMIZADO ===
  return {
    // Estados
    clientName,
    setClientName,
    ticketRows,
    selectedTicket,
    setSelectedTicket,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    processingSteps,
    
    // Totales memoizados
    totalTimes: memoizedTotals.totalTimes,
    totalPurchase: memoizedTotals.totalPurchase,
    hasValidData: memoizedTotals.hasValidData,
    
    // Funciones optimizadas
    handleInputChange,
    removeRow,
    addNewRow,
    resetForm,
    handleComplete,
    handleDeleteTicket,
    handleUpdateTicket,
    loadTicketForEdit,  // ✅ Agregar esta función
    
    // Utilidades
    isProcessing: processingRef.current,
    canProcess: !processingRef.current && memoizedTotals.hasValidData
  }
}

// === UTILIDADES EXPORTADAS ===
export { validateTicketBeforeSubmit }
export type { TicketRow, Ticket, UseTicketsProps, ProcessingSteps }