/**
 * Sistema de logging y manejo de errores para entornos de producción
 */

// Niveles de log
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

// Configuración
const LOG_LEVEL = process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG
const MAX_LOGS_STORED = 100
const LOGS_STORAGE_KEY = "numix_error_logs"

// Interfaz para entradas de log
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: any
  context?: {
    url?: string
    userAgent?: string
    vendorEmail?: string
  }
}

/**
 * Registra un mensaje de log
 */
export function log(level: LogLevel, message: string, details?: any): void {
  // No registrar logs de nivel inferior en producción
  if (shouldSkipLog(level)) return

  try {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      context: getLogContext(),
    }

    // Siempre mostrar en consola
    logToConsole(entry)

    // En producción, almacenar logs para posible envío
    if (process.env.NODE_ENV === "production") {
      storeLog(entry)
    }

    // Si es un error crítico, intentar enviarlo inmediatamente
    if (level === LogLevel.CRITICAL && process.env.NODE_ENV === "production") {
      sendLogsToServer()
    }
  } catch (error) {
    // Fallback básico si falla el sistema de logging
    console.error("Error logging:", error)
    console.error("Original log:", { level, message, details })
  }
}

/**
 * Determina si un nivel de log debe ser omitido según la configuración
 */
function shouldSkipLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL]
  const configLevelIndex = levels.indexOf(LOG_LEVEL)
  const currentLevelIndex = levels.indexOf(level)

  return currentLevelIndex < configLevelIndex
}

/**
 * Muestra un log en la consola
 */
function logToConsole(entry: LogEntry): void {
  const { level, message, details } = entry

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(`[DEBUG] ${message}`, details || "")
      break
    case LogLevel.INFO:
      console.info(`[INFO] ${message}`, details || "")
      break
    case LogLevel.WARN:
      console.warn(`[WARN] ${message}`, details || "")
      break
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      console.error(`[${level.toUpperCase()}] ${message}`, details || "")
      break
  }
}

/**
 * Obtiene información contextual para el log
 */
function getLogContext(): LogEntry["context"] {
  if (typeof window === "undefined") return {}

  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    vendorEmail: localStorage.getItem("currentVendorEmail") || undefined,
  }
}

/**
 * Almacena un log en localStorage para envío posterior
 */
function storeLog(entry: LogEntry): void {
  if (typeof window === "undefined") return

  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]") as LogEntry[]

    // Añadir nuevo log
    logs.push(entry)

    // Mantener solo los últimos N logs
    if (logs.length > MAX_LOGS_STORED) {
      logs.splice(0, logs.length - MAX_LOGS_STORED)
    }

    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs))
  } catch (error) {
    console.error("Error storing log:", error)
  }
}

/**
 * Envía logs almacenados al servidor
 */
export async function sendLogsToServer(): Promise<boolean> {
  if (typeof window === "undefined") return false

  try {
    const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || "[]") as LogEntry[]

    if (logs.length === 0) return true

    // Aquí implementarías la lógica para enviar logs a tu servidor
    // Por ejemplo, usando fetch:
    /*
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });
    
    if (response.ok) {
      localStorage.removeItem(LOGS_STORAGE_KEY);
      return true;
    }
    */

    // Por ahora, solo simulamos el envío en producción
    if (process.env.NODE_ENV === "production") {
      console.log(`[LOGS] Would send ${logs.length} logs to server in production`)
    }

    // En un entorno real, solo limpiaríamos después de enviar exitosamente
    localStorage.removeItem(LOGS_STORAGE_KEY)
    return true
  } catch (error) {
    console.error("Error sending logs to server:", error)
    return false
  }
}

/**
 * Registra un error con stack trace
 */
export function logError(error: Error, context?: string): void {
  log(LogLevel.ERROR, context ? `${context}: ${error.message}` : error.message, {
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  })
}

/**
 * Registra un mensaje de información
 */
export function logInfo(message: string, details?: any): void {
  log(LogLevel.INFO, message, details)
}

/**
 * Registra un error crítico que requiere atención inmediata
 */
export function logCritical(error: Error, context?: string): void {
  log(LogLevel.CRITICAL, context ? `${context}: ${error.message}` : error.message, {
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  })
}

/**
 * Captura errores no manejados a nivel global
 */
export function setupGlobalErrorHandling(): void {
  if (typeof window === "undefined") return

  // Capturar errores no manejados
  window.addEventListener("error", (event) => {
    logError(event.error, "Unhandled error")
  })

  // Capturar promesas rechazadas no manejadas
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

    logError(error, "Unhandled promise rejection")
  })
}

