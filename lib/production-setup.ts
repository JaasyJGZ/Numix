/**
 * Configuración para entornos de producción
 */

import { setupGlobalErrorHandling, LogLevel, log } from "./error-logger"
import { initPerformanceMonitoring } from "./performance-monitor"
import { enhancedSyncManager } from "./enhanced-sync-manager"
import { cleanupStorage, initStorageMetadata } from "./storage-manager"

// Importar el sistema de reintentos RPC y el sistema de caché
import { callRPCWithRetry } from "./rpc-retry"
import { initCacheSystem } from "./cache-manager"

/**
 * Inicializa todas las mejoras para producción
 */
export function initProductionEnhancements(): void {
  if (typeof window === "undefined") return

  // Configurar manejo global de errores
  setupGlobalErrorHandling()

  // Inicializar monitoreo de rendimiento
  initPerformanceMonitoring()

  // Inicializar metadatos de almacenamiento
  initStorageMetadata()

  // Programar limpieza periódica de almacenamiento
  scheduleStorageCleanup()

  // Registrar eventos de ciclo de vida de la aplicación
  registerAppLifecycleEvents()

  // Inicializar sistema de reintentos RPC
  initRPCRetrySystem()
  
  // Inicializar sistema de caché
  initCacheSystem()

  console.log("Production enhancements initialized")
}

/**
 * Inicializa el sistema de reintentos para llamadas RPC
 */
function initRPCRetrySystem(): void {
  if (typeof window === "undefined") return

  // Configurar parámetros por defecto para reintentos RPC
  // Estos valores podrían configurarse desde variables de entorno en el futuro
  const defaultRetryConfig = {
    maxRetries: 3,
    baseDelay: 500,
    backoffFactor: 2,
    maxDelay: 5000,
  }

  // Registrar información sobre la inicialización
  log(
    LogLevel.INFO,
    "Sistema de reintentos RPC inicializado",
    { config: defaultRetryConfig }
  )

  console.log("RPC retry system initialized with config:", defaultRetryConfig)
}

/**
 * Programa limpieza periódica de almacenamiento
 */
function scheduleStorageCleanup(): void {
  // Ejecutar limpieza inicial después de 5 minutos
  setTimeout(
    () => {
      cleanupStorage()

      // Programar limpieza periódica cada 24 horas
      setInterval(
        () => {
          cleanupStorage()
        },
        24 * 60 * 60 * 1000,
      )
    },
    5 * 60 * 1000,
  )
}

/**
 * Registra eventos del ciclo de vida de la aplicación
 */
function registerAppLifecycleEvents(): void {
  // Sincronizar al cerrar la página
  window.addEventListener("beforeunload", () => {
    if (enhancedSyncManager && enhancedSyncManager.hasPendingOperations()) {
      enhancedSyncManager.forceSyncNow()
    }
  })

  // Sincronizar cuando la página vuelve a estar visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && enhancedSyncManager) {
      enhancedSyncManager.forceSyncNow()
    }
  })
}

/**
 * Verifica si la aplicación está en modo de producción
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

/**
 * Verifica si la aplicación está en modo de desarrollo
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}

