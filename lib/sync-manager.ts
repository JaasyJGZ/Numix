"use client"

import { useEffect } from "react"

import { useState } from "react"

import { supabase } from "./supabase"
import { debounce } from "./performance-utils"

// Interfaz para operaciones pendientes
interface PendingOperation {
  type: "create" | "update" | "delete"
  table: string
  data: any
  id: string
  timestamp: number
}

// Estado de sincronización
export type SyncStatus = "synced" | "pending" | "error" | "offline"

// Clase para manejar la sincronización
class SyncManager {
  private pendingOperations: PendingOperation[] = []
  private isOnline: boolean = navigator.onLine
  private syncStatus: SyncStatus = "synced"
  private statusListeners: ((status: SyncStatus) => void)[] = []
  private syncInProgress = false
  private storageKey = "numix_pending_operations"

  constructor() {
    // Cargar operaciones pendientes del localStorage
    this.loadPendingOperations()

    // Configurar listeners para estado de conexión
    window.addEventListener("online", this.handleOnline)
    window.addEventListener("offline", this.handleOffline)

    // Intentar sincronizar al inicio
    if (this.isOnline) {
      this.syncPendingOperations()
    }
  }

  // Cargar operaciones pendientes del localStorage
  private loadPendingOperations() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        this.pendingOperations = JSON.parse(stored)
        if (this.pendingOperations.length > 0) {
          this.updateSyncStatus("pending")
        }
      }
    } catch (error) {
      console.error("Error loading pending operations:", error)
      this.pendingOperations = []
    }
  }

  // Guardar operaciones pendientes en localStorage
  private savePendingOperations() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.pendingOperations))
    } catch (error) {
      console.error("Error saving pending operations:", error)
    }
  }

  // Manejar evento online
  private handleOnline = () => {
    this.isOnline = true
    console.log("🌐 Conexión restablecida")
    this.syncPendingOperations()
  }

  // Manejar evento offline
  private handleOffline = () => {
    this.isOnline = false
    console.log("🔌 Sin conexión")
    this.updateSyncStatus("offline")
  }

  // Actualizar estado de sincronización
  private updateSyncStatus(status: SyncStatus) {
    if (this.syncStatus !== status) {
      this.syncStatus = status
      this.notifyStatusListeners()
    }
  }

  // Notificar a los listeners sobre cambios de estado
  private notifyStatusListeners() {
    this.statusListeners.forEach((listener) => listener(this.syncStatus))
  }

  // Agregar listener de estado
  public addStatusListener(listener: (status: SyncStatus) => void) {
    this.statusListeners.push(listener)
    // Notificar estado actual inmediatamente
    listener(this.syncStatus)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener)
    }
  }

  // Agregar operación pendiente
  public addPendingOperation(operation: Omit<PendingOperation, "timestamp">) {
    const newOperation = {
      ...operation,
      timestamp: Date.now(),
    }

    this.pendingOperations.push(newOperation)
    this.savePendingOperations()
    this.updateSyncStatus("pending")

    // Intentar sincronizar si estamos online
    if (this.isOnline) {
      this.debouncedSync()
    }
  }

  // Sincronizar operaciones pendientes con debounce
  private debouncedSync = debounce(() => {
    this.syncPendingOperations()
  }, 2000)

  // Sincronizar operaciones pendientes
  private async syncPendingOperations() {
    if (!this.isOnline || this.syncInProgress || this.pendingOperations.length === 0) {
      return
    }

    this.syncInProgress = true
    this.updateSyncStatus("pending")

    try {
      // Ordenar operaciones por timestamp
      const sortedOperations = [...this.pendingOperations].sort((a, b) => a.timestamp - b.timestamp)

      // Procesar operaciones en orden
      for (let i = 0; i < sortedOperations.length; i++) {
        const operation = sortedOperations[i]

        try {
          await this.processOperation(operation)
          // Eliminar operación completada
          this.pendingOperations = this.pendingOperations.filter(
            (op) => !(op.id === operation.id && op.type === operation.type && op.table === operation.table),
          )
          this.savePendingOperations()
        } catch (error) {
          console.error(`Error processing operation:`, operation, error)
          // Si hay un error, detenemos la sincronización
          this.updateSyncStatus("error")
          break
        }
      }

      // Actualizar estado final
      if (this.pendingOperations.length === 0) {
        this.updateSyncStatus("synced")
      } else {
        this.updateSyncStatus("error")
      }
    } catch (error) {
      console.error("Error in syncPendingOperations:", error)
      this.updateSyncStatus("error")
    } finally {
      this.syncInProgress = false
    }
  }

  // Procesar una operación individual
  private async processOperation(operation: PendingOperation): Promise<void> {
    const { type, table, data, id } = operation

    switch (type) {
      case "create":
        await supabase.from(table).insert(data)
        break
      case "update":
        await supabase.from(table).update(data).eq("id", id)
        break
      case "delete":
        await supabase.from(table).delete().eq("id", id)
        break
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  // Verificar si hay operaciones pendientes
  public hasPendingOperations(): boolean {
    return this.pendingOperations.length > 0
  }

  // Obtener estado actual de sincronización
  public getSyncStatus(): SyncStatus {
    return this.syncStatus
  }

  // Forzar sincronización manual
  public forceSyncNow() {
    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingOperations()
    }
  }

  // Limpiar al desmontar
  public cleanup() {
    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)
  }
}

// Singleton para usar en toda la aplicación
export const syncManager = typeof window !== "undefined" ? new SyncManager() : null

// Hook para usar el estado de sincronización en componentes
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncManager?.getSyncStatus() || "synced")

  useEffect(() => {
    if (!syncManager) return

    // Suscribirse a cambios de estado
    const unsubscribe = syncManager.addStatusListener(setStatus)

    return unsubscribe
  }, [])

  return {
    status,
    hasPendingOperations: syncManager?.hasPendingOperations() || false,
    forceSyncNow: () => syncManager?.forceSyncNow(),
  }
}

