import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Plus, Check, X, Trash2 } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { enhancedSyncManager } from '../../lib/enhanced-sync-manager'

// ==========================================
// TIPOS Y CONSTANTES
// ==========================================

interface TicketRow {
  id: string
  times: string
  actions: string
  value: number
}

interface TicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  clientName: string
  onClientNameChange: (name: string) => void
  ticketRows: TicketRow[]
  onAddRow: () => void
  onRemoveRow?: (id: string) => void
  onInputChange: (id: string, field: 'times' | 'actions', value: string) => void
  onComplete: () => void
  isReadOnly?: boolean
  selectedTicket?: any
  onDelete?: () => void
}

interface TicketRowComponentProps {
  row: TicketRow
  index: number
  isReadOnly: boolean
  ticketRowsLength: number
  onInputChange: (id: string, field: 'times' | 'actions', value: string) => void
  onKeyDown: (e: React.KeyboardEvent, rowId: string, field: 'times' | 'actions', rowIndex: number) => void
  onRemoveRow?: (id: string) => void
  onAutoComplete: (rowId: string) => void
  inputRefs: React.MutableRefObject<Map<string, HTMLInputElement>>
}

interface TouchState {
  isActive: boolean
  startTime: number
  rowId: string | null
}

// Constantes
const AUTO_COMPLETE_DELAY = 100 // ms
const MAX_ROWS_LIMIT = 500
const LONG_PRESS_DURATION = 500 // ms

// ==========================================
// COMPONENTE DE FILA INDIVIDUAL
// ==========================================

const TicketRowComponent = memo<TicketRowComponentProps>(({ 
  row, 
  index, 
  isReadOnly, 
  ticketRowsLength, 
  onInputChange, 
  onKeyDown, 
  onRemoveRow, 
  onAutoComplete, 
  inputRefs 
}) => {
  const actionsInputRef = useRef<HTMLInputElement>(null)
  const [isClickingNumber, setIsClickingNumber] = useState(false)

  const handleActionsClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const clickPosition = e.nativeEvent.offsetX
    const inputWidth = input.offsetWidth
    const textValue = row.actions
    
    // Solo activar auto-completado si hay un número de 2 dígitos
    if (textValue.length >= 1) {
      // Calcular el ancho aproximado del texto
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (context) {
        context.font = '16px sans-serif' // Mismo tamaño que el input
        const textWidth = context.measureText(textValue).width
        const textStartX = (inputWidth - textWidth) / 2 // Texto centrado
        const textEndX = textStartX + textWidth
        
        // Solo activar si el clic fue dentro del área del texto
        if (clickPosition >= textStartX && clickPosition <= textEndX) {
          const currentValue = parseInt(row.actions)
          const timesValue = parseInt(row.times)
          
          if (!isNaN(currentValue) && currentValue >= 0 && currentValue <= 99 && 
              !isNaN(timesValue) && timesValue > 0) {
            setIsClickingNumber(true)
            // Pequeño delay para evitar conflictos con la edición
            setTimeout(() => {
              onAutoComplete(row.id)
              setIsClickingNumber(false)
            }, 150)
            return
          }
        }
      }
    }
    
    // Si llegamos aquí, permitir edición normal
    setIsClickingNumber(false)
  }

  const handleActionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevenir cambios durante el auto-completado
    if (isClickingNumber) {
      return
    }
    onInputChange(row.id, "actions", e.target.value)
  }

  return (
    <div className="grid grid-cols-[2fr_2fr_1.5fr_auto] gap-4 items-center">
      {/* Campo Tiempos */}
      <div className="flex items-center justify-center">
        {isReadOnly ? (
          <span className="text-center text-foreground font-medium">{row.times}</span>
        ) : (
          <Input
            ref={(el) => {
              if (el) {
                inputRefs.current.set(`times-${row.id}`, el)
              } else {
                inputRefs.current.delete(`times-${row.id}`)
              }
            }}
            type="number"
            min="1"
            max="999"
            value={row.times}
            onChange={(e) => onInputChange(row.id, "times", e.target.value)}
            onKeyDown={(e) => onKeyDown(e, row.id, "times", index)}
            className="bg-input border-border text-foreground text-center h-10 text-base transition-all focus:ring-2 focus:ring-primary/20 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            style={{ fontSize: '16px' }}
            aria-label={`Tiempos para fila ${index + 1}`}
            placeholder="0"
          />
        )}
      </div>

      {/* Campo Acciones */}
      <div className="flex items-center justify-center">
        {isReadOnly ? (
          <span className="text-center text-foreground font-medium">{row.actions}</span>
        ) : (
          <Input
            ref={(el) => {
              if (el) {
                inputRefs.current.set(`actions-${row.id}`, el)
                actionsInputRef.current = el
              } else {
                inputRefs.current.delete(`actions-${row.id}`)
              }
            }}
            type="number"
            min="0"
            max="99"
            value={row.actions}
            onChange={handleActionsChange}
            onKeyDown={(e) => onKeyDown(e, row.id, "actions", index)}
            onClick={handleActionsClick}
            className="bg-input border-border text-foreground text-center h-10 text-base transition-all focus:ring-2 focus:ring-primary/20 cursor-text [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
            style={{ fontSize: '16px' }}
            aria-label={`Acciones para fila ${index + 1}`}
            placeholder="00"
            title="Haz clic directamente sobre el número para auto-completar decena (0-99)"
          />
        )}
      </div>

      {/* Valor */}
      <div className="flex items-center justify-center text-primary font-bold text-lg">
        ${row.value.toFixed(2)}
      </div>

      {/* Botón Eliminar */}
      <div className="flex items-center justify-center w-10">
        {!isReadOnly && ticketRowsLength > 1 && onRemoveRow ? (
          <Button
            onClick={() => onRemoveRow(row.id)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/20 transition-colors"
            aria-label={`Eliminar fila ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>
    </div>
  )
})

TicketRowComponent.displayName = 'TicketRowComponent'

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const TicketDialog: React.FC<TicketDialogProps> = ({
  open,
  onOpenChange,
  title,
  clientName,
  onClientNameChange,
  ticketRows,
  onAddRow,
  onRemoveRow,
  onInputChange,
  onComplete,
  isReadOnly = false,
  selectedTicket,
  onDelete
}) => {
  // ==========================================
  // ESTADO Y REFERENCIAS
  // ==========================================

  const [isProcessing, setIsProcessing] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [touchState, setTouchState] = useState<TouchState>({
    isActive: false,
    startTime: 0,
    rowId: null
  })

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const processingRef = useRef(false)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const focusTrapRef = useFocusTrap(open)

  // ==========================================
  // CÁLCULOS DERIVADOS
  // ==========================================

  const { totalTimes, totalPurchase, isFormValid } = React.useMemo(() => {
    const times = ticketRows.reduce((sum, row) => {
      const timesValue = parseInt(row.times) || 0
      return sum + timesValue
    }, 0)

    const purchase = ticketRows.reduce((sum, row) => {
      return sum + row.value
    }, 0)

    const valid = clientName.trim() !== '' && 
                  ticketRows.length > 0 && 
                  ticketRows.every(row => 
                    row.times && row.times !== '0' && 
                    row.actions && row.actions !== ''
                  )

    return {
      totalTimes: times,
      totalPurchase: purchase,
      isFormValid: valid
    }
  }, [ticketRows, clientName])

  // ==========================================
  // FUNCIONES DE UTILIDAD ESTABLES
  // ==========================================

  // Detectar dispositivo táctil
  const detectTouchDevice = useCallback(() => {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    )
  }, [])

  // Limpiar referencias de inputs - MEJORADO
  const cleanupInputRefs = useCallback(() => {
    if (!open) return // No limpiar si el diálogo está cerrado

    const currentRowIds = new Set(ticketRows.map(row => row.id))
    const refsToDelete: string[] = []

    inputRefs.current.forEach((_, key) => {
      const rowId = key.split('-')[1]
      if (!currentRowIds.has(rowId)) {
        refsToDelete.push(key)
      }
    })

    // Delay la limpieza para evitar conflictos con navegación
    setTimeout(() => {
      refsToDelete.forEach(key => {
        inputRefs.current.delete(key)
      })
    }, 200)
  }, [ticketRows, open])

  // Validar número para auto-completar
  const isValidForAutoComplete = useCallback((value: string, times: string): boolean => {
    const num = parseInt(value)
    const timesNum = parseInt(times)

    return (
      !isNaN(num) &&
      !isNaN(timesNum) &&
      num >= 0 &&
      num <= 99 &&
      timesNum > 0 &&
      times.trim() !== "" &&
      times !== "0"
    )
  }, [])

  // Auto-completar decenas con verificación robusta - SOLUCIÓN MEJORADA PARA PRODUCCIÓN
  // Auto-completar decenas - VERSIÓN CORREGIDA
 const autoCompleteDecenas = useCallback(async (rowId: string, baseNumber: number, times: string) => {
  if (processingRef.current || !isValidForAutoComplete(baseNumber.toString(), times)) {
    return
  }

  processingRef.current = true
  setIsProcessing(true)

  try {
    const startDecena = Math.floor(baseNumber / 10) * 10
    const numbersToAdd: number[] = []

    // Generar números de la decena (excluyendo el actual)
    for (let i = startDecena; i < startDecena + 10; i++) {
      if (i !== baseNumber && i >= 0 && i <= 99) {
        numbersToAdd.push(i)
      }
    }

    // Verificar límite de filas
    if (ticketRows.length + numbersToAdd.length > MAX_ROWS_LIMIT) {
      console.warn(`Límite de ${MAX_ROWS_LIMIT} filas alcanzado`)
      return
    }

    // Crear todas las filas directamente con sus valores - SIN DELAYS NI DOM REFS
    for (const number of numbersToAdd) {
      onAddRow({
        times: times,
        actions: number.toString()
      })
    }
  } catch (error) {
    console.error('Error en auto-completar decenas:', error)
  } finally {
    processingRef.current = false
    setIsProcessing(false)
  }
}, [onAddRow, onInputChange, isValidForAutoComplete, ticketRows.length])

  // ==========================================
  // MANEJADORES DE EVENTOS ESTABLES
  // ==========================================

  // Navegación con teclado - MEJORADO
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowId: string, field: "times" | "actions", rowIndex: number) => {
    if (e.key === 'Enter' && !isReadOnly && open) {
      e.preventDefault()

      if (field === 'times') {
        // Ir a acciones de la misma fila
        const actionsInput = inputRefs.current.get(`actions-${rowId}`)
        if (actionsInput) {
          actionsInput.focus()
        } else {
          // Fallback: buscar por DOM si la referencia no existe
          setTimeout(() => {
            const fallbackInput = document.querySelector(`[aria-label="Acciones para fila ${rowIndex + 1}"]`) as HTMLInputElement
            fallbackInput?.focus()
          }, 50)
        }
            } else if (field === 'actions') {
        // Ir a tiempos de la siguiente fila o crear nueva
        const nextRowIndex = rowIndex + 1
        if (nextRowIndex >= ticketRows.length) {
          // Crear nueva fila
          onAddRow()
          
          // Esperar a que React actualice el estado y renderice
          setTimeout(() => {
            // Después de onAddRow(), ticketRows.length habrá aumentado en 1
            // La nueva fila estará en el índice que antes era ticketRows.length
            const newRowIndex = nextRowIndex // Este es el índice de la nueva fila
            
            // Buscar por DOM directamente ya que es más confiable
            const newTimesInput = document.querySelector(`[aria-label="Tiempos para fila ${newRowIndex + 1}"]`) as HTMLInputElement
            
            if (newTimesInput) {
              newTimesInput.focus()
            }
          }, 100) // 100ms es suficiente para que React renderice
        } else {
          // Ir a la siguiente fila existente
          const nextRowId = ticketRows[nextRowIndex]?.id
          if (nextRowId) {
            const nextInput = inputRefs.current.get(`times-${nextRowId}`)
            if (nextInput) {
              nextInput.focus()
            } else {
              // Fallback DOM
              setTimeout(() => {
                const fallbackInput = document.querySelector(`[aria-label="Tiempos para fila ${nextRowIndex + 1}"]`) as HTMLInputElement
                fallbackInput?.focus()
              }, 50)
            }
          }
        }
      }
    }
  }, [isReadOnly, open, ticketRows, onAddRow])

  const handleInputChange = useCallback((rowId: string, field: "times" | "actions", value: string) => {
    // Validaciones básicas
    if (field === "times") {
      const numValue = parseInt(value)
      if (value !== "" && (isNaN(numValue) || numValue < 0)) {
        return // No permitir valores inválidos
      }
    } else if (field === "actions") {
      const numValue = parseInt(value)
      if (value !== "" && (isNaN(numValue) || numValue < 0 || numValue > 99)) {
        return // No permitir valores fuera del rango
      }
    }

    onInputChange(rowId, field, value)
  }, [onInputChange])

  // Manejo de auto-completado - ESTABLE
  const handleAutoComplete = useCallback((rowId: string) => {
    const input = inputRefs.current.get(`actions-${rowId}`)
    if (!input) return

    const currentValue = parseInt(input.value)
    const timesInput = inputRefs.current.get(`times-${rowId}`)
    const times = timesInput?.value || ""

    if (isValidForAutoComplete(currentValue.toString(), times)) {
      autoCompleteDecenas(rowId, currentValue, times)
    }
  }, [isValidForAutoComplete, autoCompleteDecenas])

  // ==========================================
  // EFECTOS
  // ==========================================

  // Detectar dispositivo táctil al montar
  useEffect(() => {
    setIsTouchDevice(detectTouchDevice())
  }, [detectTouchDevice])

  // Limpiar referencias cuando cambien las filas - MEJORADO
  useEffect(() => {
    if (!open) return // No ejecutar si el diálogo está cerrado

    // Solo limpiar si realmente hay filas que eliminar
    const timeoutId = setTimeout(() => {
      cleanupInputRefs()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [cleanupInputRefs, open])

  // Reinicializar referencias cuando se abre el diálogo - MOVIDO DENTRO DEL COMPONENTE
  useEffect(() => {
    if (open) {
      // Limpiar referencias al abrir para empezar limpio
      inputRefs.current.clear()

      // Dar tiempo para que se rendericen los componentes
      const initTimeout = setTimeout(() => {
        // Verificar que todas las referencias estén registradas
        const expectedRefs = ticketRows.length * 2 // times + actions por fila
        const actualRefs = inputRefs.current.size

        if (process.env.NODE_ENV === 'development') {
          console.log(`Referencias esperadas: ${expectedRefs}, Referencias actuales: ${actualRefs}`)
        }
      }, 200)

      return () => clearTimeout(initTimeout)
    }
  }, [open, ticketRows.length])

  // Manejo de sincronización
  useEffect(() => {
    if (open) {
      enhancedSyncManager?.pauseSync()
    } else {
      enhancedSyncManager?.resumeSync()
    }

    return () => {
      if (open) {
        enhancedSyncManager?.resumeSync()
      }
      // Limpiar timers al cerrar
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current)
        touchTimerRef.current = null
      }
    }
  }, [open])

  // ==========================================
  // MANEJADORES DE DIÁLOGO
  // ==========================================

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Limpiar estado al cerrar
      setTouchState({ isActive: false, startTime: 0, rowId: null })
      setIsProcessing(false)
      processingRef.current = false

      // Limpiar completamente las referencias al cerrar
      setTimeout(() => {
        inputRefs.current.clear()
      }, 100) // Pequeño delay para evitar errores durante el cierre
    } else {
      // Asegurar que las referencias estén limpias al abrir
      inputRefs.current.clear()
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  const handleComplete = useCallback(() => {
    if (isFormValid && !isProcessing) {
      onComplete()
    }
  }, [isFormValid, isProcessing, onComplete])

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-background/95 text-foreground border-border max-w-md w-[95%] mx-auto backdrop-blur-sm shadow-2xl"
        ref={focusTrapRef}
        id="ticket-dialog-content"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {isReadOnly
              ? "Detalles del ticket seleccionado"
              : selectedTicket
                ? "Modifica los datos del ticket"
                : "Completa los datos para crear el ticket"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campo Cliente */}
          <div className="space-y-2">
            <label 
              htmlFor="client-name" 
              className="text-sm font-medium text-foreground"
            >
            </label>
            <Input
              id="client-name"
              type="text"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              className="bg-input border-border text-foreground text-base h-12 transition-colors focus:ring-2 focus:ring-primary/20"
              style={{ fontSize: '16px' }}
              placeholder="Nombre del cliente *"
              required
              disabled={isReadOnly}
              aria-label="Nombre del cliente"
              aria-invalid={!clientName && !isReadOnly ? "true" : undefined}
              maxLength={100}
            />
          </div>

          {/* Sección de Filas */}
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6 border border-border/50">
            {/* Encabezados */}
            <div className="grid grid-cols-[2fr_2fr_1.5fr_auto] gap-4 mb-4 text-sm font-semibold text-black text-center">
              <div>Tiempos</div>
              <div>Acciones</div>
              <div>Valor</div>
              <div className="w-10"></div>
            </div>

            {/* Filas */}
            <div className="space-y-3">
              {ticketRows.map((row, index) => (
                <TicketRowComponent
                  key={row.id}
                  row={row}
                  index={index}
                  isReadOnly={isReadOnly}
                  ticketRowsLength={ticketRows.length}
                  onInputChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onRemoveRow={onRemoveRow}
                  onAutoComplete={handleAutoComplete}
                  inputRefs={inputRefs}
                />
              ))}
            </div>

            {/* Botón Agregar Fila */}
            {!isReadOnly && ticketRows.length < MAX_ROWS_LIMIT && (
              <Button
                onClick={onAddRow}
                disabled={isProcessing}
                className="w-full mt-6 h-12 bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground hover:from-primary/20 hover:to-secondary/20 border border-border transition-all"
                aria-label="Añadir otra fila"
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir otra fila
                {isProcessing && <span className="ml-2 text-xs">(Procesando...)</span>}
              </Button>
            )}

            {/* Límite de filas alcanzado */}
            {!isReadOnly && ticketRows.length >= MAX_ROWS_LIMIT && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                Límite máximo de {MAX_ROWS_LIMIT} filas alcanzado
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-2 border border-border/50 mt-6 mb-8">
            <div className="grid grid-cols-2 gap-1 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total Tiempos</p>
                <p className="text-sm font-bold text-primary">{totalTimes}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total a Pagar</p>
                <p className="text-sm font-bold text-primary">${totalPurchase.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 mt-6">
          {!isReadOnly && (
            <>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1 h-12 transition-all font-semibold"
                aria-label="Cancelar"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!isFormValid || isProcessing}
                className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 transition-all font-semibold"
                aria-label="Completar ticket"
              >
                <Check className="mr-2 h-4 w-4" />
                {selectedTicket ? "Actualizar" : "Completar"}
                {isProcessing && <span className="ml-2 text-xs">(Procesando...)</span>}
              </Button>
            </>
          )}

          {isReadOnly && onDelete && (
            <Button
              onClick={onDelete}
              variant="destructive"
              className="flex-1 h-12 transition-all font-semibold"
              aria-label="Eliminar ticket"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TicketDialog