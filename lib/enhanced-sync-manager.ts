/**
 * Gestor de sincronización mejorado para entornos de producción
 */

import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { logError, logInfo } from "./error-logger"
import { measureAsyncExecutionTime } from "./performance-monitor"

// Configuración
const SYNC_QUEUE_KEY = "numix_sync_queue"
const MAX_RETRY_ATTEMPTS = 5
const RETRY_DELAY_MS = 5000 // 5 segundos
const BATCH_SIZE = 10

// Interfaz para operaciones pendientes
export interface PendingOperation {
  id: string
  type: "create" | "update" | "delete"
  table: string
  data: any
  timestamp: number
  retryCount: number
  lastAttempt?: number
  error?: string
}

// Estado de sincronización
export type SyncStatus = "synced" | "pending" | "error" | "offline"

/**
 * Clase mejorada para gestionar la sincronización
 */
export class EnhancedSyncManager {
  private pendingOperations: PendingOperation[] = []
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncStatus: SyncStatus = "synced"
  private statusListeners: ((status: SyncStatus) => void)[] = []
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private retryTimeouts: Record<string, NodeJS.Timeout> = {}
  private isPaused = false

  constructor() {
    if (typeof window === "undefined") return

    // Cargar operaciones pendientes
    this.loadPendingOperations()

    // Configurar listeners para estado de conexión
    window.addEventListener("online", this.handleOnline)
    window.addEventListener("offline", this.handleOffline)

    // Iniciar sincronización periódica
    this.startPeriodicSync()

    // Intentar sincronizar al inicio
    if (this.isOnline) {
      this.syncPendingOperations()
    }
  }

  /**
   * Carga operaciones pendientes del localStorage
   */
  private loadPendingOperations(): void {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      if (stored) {
        this.pendingOperations = JSON.parse(stored)
        if (this.pendingOperations.length > 0) {
          this.updateSyncStatus("pending")
        }
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), "Error loading pending operations")
      this.pendingOperations = []
    }
  }

  /**
   * Guarda operaciones pendientes en localStorage
   */
  private savePendingOperations(): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.pendingOperations))
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), "Error saving pending operations")
    }
  }

  /**
   * Maneja el evento online
   */
  private handleOnline = (): void => {
    this.isOnline = true
    logInfo("Connection restored", { pendingOperations: this.pendingOperations.length })
    this.syncPendingOperations()
  }

  /**
   * Maneja el evento offline
   */
  private handleOffline = (): void => {
    this.isOnline = false
    logInfo("Connection lost", { pendingOperations: this.pendingOperations.length })
    this.updateSyncStatus("offline")
  }

  /**
   * Actualiza el estado de sincronización
   */
  private updateSyncStatus(status: SyncStatus): void {
    if (this.syncStatus !== status) {
      this.syncStatus = status
      this.notifyStatusListeners()
    }
  }

  /**
   * Notifica a los listeners sobre cambios de estado
   */
  private notifyStatusListeners(): void {
    this.statusListeners.forEach((listener) => listener(this.syncStatus))
  }

  /**
   * Inicia la sincronización periódica
   */
  private startPeriodicSync(): void {
    // Limpiar intervalo existente
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Crear nuevo intervalo (cada 5 minutos)
    this.syncInterval = setInterval(
      () => {
        if (this.isOnline && this.pendingOperations.length > 0 && !this.isPaused) {
          this.syncPendingOperations()
        }
      },
      5 * 60 * 1000,
    )
  }

  /**
   * Añade un listener de estado
   */
  public addStatusListener(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener)
    // Notificar estado actual inmediatamente
    listener(this.syncStatus)

    // Devolver función para eliminar listener
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  /**
   * Añade una operación pendiente
   */
  public addPendingOperation(operation: Omit<PendingOperation, "timestamp" | "retryCount" | "id">): void {
    const newOperation: PendingOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    this.pendingOperations.push(newOperation)
    this.savePendingOperations()
    this.updateSyncStatus("pending")

    // Intentar sincronizar si estamos online
    if (this.isOnline) {
      this.syncPendingOperations()
    }
  }

  /**
   * Sincroniza operaciones pendientes
   */
  public async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.pendingOperations.length === 0 || this.isPaused) {
      return
    }

    this.syncInProgress = true
    this.updateSyncStatus("pending")

    try {
      await measureAsyncExecutionTime(async () => {
        // Ordenar operaciones por timestamp
        const sortedOperations = [...this.pendingOperations].sort((a, b) => a.timestamp - b.timestamp)

        // Procesar operaciones en lotes
        for (let i = 0; i < sortedOperations.length; i += BATCH_SIZE) {
          const batch = sortedOperations.slice(i, i + BATCH_SIZE)

          // Procesar cada operación en el lote
          const results = await Promise.allSettled(batch.map((operation) => this.processOperation(operation)))

          // Manejar resultados
          results.forEach((result, index) => {
            const operation = batch[index]

            if (result.status === "fulfilled") {
              // Operación exitosa, eliminarla de pendientes
              this.pendingOperations = this.pendingOperations.filter((op) => op.id !== operation.id)
            } else {
              // Operación fallida, incrementar contador de reintentos
              const updatedOperation = this.pendingOperations.find((op) => op.id === operation.id)
              if (updatedOperation) {
                updatedOperation.retryCount++
                updatedOperation.lastAttempt = Date.now()
                updatedOperation.error = result.reason?.message || "Unknown error"

                // Programar reintento si no excede el máximo
                if (updatedOperation.retryCount < MAX_RETRY_ATTEMPTS) {
                  this.scheduleRetry(updatedOperation)
                }
              }
            }
          })

          // Guardar estado actualizado
          this.savePendingOperations()
        }
      }, "sync-pending-operations")

      // Actualizar estado final
      if (this.pendingOperations.length === 0) {
        this.updateSyncStatus("synced")
      } else {
        // Verificar si todas las operaciones pendientes han excedido los reintentos
        const allFailed = this.pendingOperations.every((op) => op.retryCount >= MAX_RETRY_ATTEMPTS)
        if (allFailed) {
          this.updateSyncStatus("error")
        } else {
          this.updateSyncStatus("pending")
        }
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), "Error in syncPendingOperations")
      this.updateSyncStatus("error")
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Programa un reintento para una operación fallida
   */
  private scheduleRetry(operation: PendingOperation): void {
    // Cancelar timeout existente si hay
    if (this.retryTimeouts[operation.id]) {
      clearTimeout(this.retryTimeouts[operation.id])
    }

    // Calcular retraso con backoff exponencial
    const delay = RETRY_DELAY_MS * Math.pow(2, operation.retryCount - 1)

    // Programar reintento
    this.retryTimeouts[operation.id] = setTimeout(() => {
      // Solo reintentar si seguimos online
      if (this.isOnline && !this.syncInProgress) {
        this.processOperation(operation)
          .then(() => {
            // Éxito, eliminar de pendientes
            this.pendingOperations = this.pendingOperations.filter((op) => op.id !== operation.id)
            this.savePendingOperations()

            // Actualizar estado si no hay más pendientes
            if (this.pendingOperations.length === 0) {
              this.updateSyncStatus("synced")
            }
          })
          .catch((error) => {
            // Fallo, actualizar error
            const updatedOperation = this.pendingOperations.find((op) => op.id === operation.id)
            if (updatedOperation) {
              updatedOperation.error = error.message
            }
            this.savePendingOperations()
          })
          .finally(() => {
            // Limpiar timeout
            delete this.retryTimeouts[operation.id]
          })
      }
    }, delay)
  }

  /**
   * Procesa una operación individual
   */
  private async processOperation(operation: PendingOperation): Promise<void> {
    const { type, table, data } = operation

    switch (type) {
      case "create":
        const { error: createError } = await supabase.from(table).insert(data)
        if (createError) throw createError
        break

      case "update":
        const { error: updateError } = await supabase.from(table).update(data).eq("id", data.id)
        if (updateError) throw updateError
        break

      case "delete":
        const { error: deleteError } = await supabase.from(table).delete().eq("id", data.id)
        if (deleteError) throw deleteError
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Verifica si hay operaciones pendientes
   */
  public hasPendingOperations(): boolean {
    return this.pendingOperations.length > 0
  }

  /**
   * Obtiene el número de operaciones pendientes
   */
  public getPendingOperationsCount(): number {
    return this.pendingOperations.length
  }

  /**
   * Obtiene el estado actual de sincronización
   */
  public getSyncStatus(): SyncStatus {
    return this.syncStatus
  }

  /**
   * Pausa la sincronización automática
   */
  public pauseSync(): void {
    this.isPaused = true
  }

  /**
   * Reanuda la sincronización automática
   */
  public resumeSync(): void {
    this.isPaused = false
    // Intentar sincronizar inmediatamente si hay operaciones pendientes
    if (this.isOnline && this.pendingOperations.length > 0) {
      this.syncPendingOperations()
    }
  }

  /**
   * Verifica si la sincronización está pausada
   */
  public isPausedSync(): boolean {
    return this.isPaused
  }

  /**
   * Fuerza sincronización manual
   */
  public forceSyncNow(): void {
    if (this.isOnline && !this.syncInProgress && !this.isPaused) {
      this.syncPendingOperations()
    }
  }

  /**
   * Limpia al desmontar
   */
  public cleanup(): void {
    if (typeof window === "undefined") return

    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Limpiar todos los timeouts de reintento
    Object.values(this.retryTimeouts).forEach((timeout) => {
      clearTimeout(timeout)
    })
  }
}

// Singleton para usar en toda la aplicación
export const enhancedSyncManager = typeof window !== "undefined" ? new EnhancedSyncManager() : null

// Hook para usar el estado de sincronización en componentes
export function useEnhancedSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(enhancedSyncManager?.getSyncStatus() || "synced")
  const [pendingCount, setPendingCount] = useState<number>(enhancedSyncManager?.getPendingOperationsCount() || 0)

  useEffect(() => {
    if (!enhancedSyncManager) return

    // Suscribirse a cambios de estado
    const unsubscribe = enhancedSyncManager.addStatusListener((newStatus) => {
      setStatus(newStatus)
      setPendingCount(enhancedSyncManager.getPendingOperationsCount())
    })

    return unsubscribe
  }, [])

  return {
    status,
    pendingCount,
    hasPendingOperations: pendingCount > 0,
    forceSyncNow: () => enhancedSyncManager?.forceSyncNow(),
    pauseSync: () => enhancedSyncManager?.pauseSync(),
    resumeSync: () => enhancedSyncManager?.resumeSync(),
    isPaused: enhancedSyncManager?.isPausedSync() || false,
  }
}