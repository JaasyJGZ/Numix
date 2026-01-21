/**
 * Gestor de almacenamiento local con funciones de limpieza y optimización
 * para entornos de producción
 */

// Configuración
const STORAGE_VERSION = "1.0.0"
const MAX_STORAGE_AGE_DAYS = 30
const STORAGE_PREFIX = "numix_"
const STORAGE_METADATA_KEY = `${STORAGE_PREFIX}metadata`

// Interfaz para metadatos de almacenamiento
interface StorageMetadata {
  version: string
  lastCleanup: string // ISO date string
  items: {
    key: string
    createdAt: string
    updatedAt: string
    size: number
  }[]
}

/**
 * Inicializa los metadatos de almacenamiento si no existen
 */
export function initStorageMetadata(): StorageMetadata {
  if (typeof window === "undefined") {
    return createEmptyMetadata()
  }

  try {
    const metadata = localStorage.getItem(STORAGE_METADATA_KEY)
    if (metadata) {
      return JSON.parse(metadata)
    }

    const newMetadata = createEmptyMetadata()
    saveMetadata(newMetadata)
    return newMetadata
  } catch (error) {
    console.error("Error initializing storage metadata:", error)
    return createEmptyMetadata()
  }
}

/**
 * Crea un objeto de metadatos vacío
 */
function createEmptyMetadata(): StorageMetadata {
  return {
    version: STORAGE_VERSION,
    lastCleanup: new Date().toISOString(),
    items: [],
  }
}

/**
 * Guarda los metadatos en localStorage
 */
function saveMetadata(metadata: StorageMetadata): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error("Error saving storage metadata:", error)
  }
}

/**
 * Registra un elemento en los metadatos cuando se guarda
 */
export function trackStorageItem(key: string, value: any): void {
  if (typeof window === "undefined") return

  try {
    const metadata = initStorageMetadata()
    const now = new Date().toISOString()
    const size = JSON.stringify(value).length

    const existingItemIndex = metadata.items.findIndex((item) => item.key === key)

    if (existingItemIndex >= 0) {
      metadata.items[existingItemIndex].updatedAt = now
      metadata.items[existingItemIndex].size = size
    } else {
      metadata.items.push({
        key,
        createdAt: now,
        updatedAt: now,
        size,
      })
    }

    saveMetadata(metadata)
  } catch (error) {
    console.error("Error tracking storage item:", error)
  }
}

/**
 * Guarda un elemento en localStorage con seguimiento
 */
export function setStorageItem(key: string, value: any): void {
  if (typeof window === "undefined") return

  try {
    const prefixedKey = key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`
    localStorage.setItem(prefixedKey, JSON.stringify(value))
    trackStorageItem(prefixedKey, value)

    // Verificar si es necesario hacer limpieza
    checkAndCleanupStorage()
  } catch (error) {
    console.error(`Error setting storage item ${key}:`, error)

    // Si el error es por exceder la cuota, intentar limpiar y reintentar
    if (error instanceof DOMException && (error.code === 22 || error.name === "QuotaExceededError")) {
      cleanupStorage(true)
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (retryError) {
        console.error(`Failed to save ${key} even after cleanup:`, retryError)
      }
    }
  }
}

/**
 * Obtiene un elemento de localStorage
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue

  try {
    const prefixedKey = key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`
    const item = localStorage.getItem(prefixedKey)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error getting storage item ${key}:`, error)
    return defaultValue
  }
}

/**
 * Elimina un elemento de localStorage y sus metadatos
 */
export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return

  try {
    const prefixedKey = key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`
    localStorage.removeItem(prefixedKey)

    // Actualizar metadatos
    const metadata = initStorageMetadata()
    metadata.items = metadata.items.filter((item) => item.key !== prefixedKey)
    saveMetadata(metadata)
  } catch (error) {
    console.error(`Error removing storage item ${key}:`, error)
  }
}

/**
 * Verifica si es necesario hacer limpieza y la ejecuta si corresponde
 */
function checkAndCleanupStorage(): void {
  if (typeof window === "undefined") return

  try {
    const metadata = initStorageMetadata()
    const lastCleanup = new Date(metadata.lastCleanup)
    const now = new Date()

    // Realizar limpieza si han pasado más de 7 días desde la última
    const daysSinceLastCleanup = Math.floor((now.getTime() - lastCleanup.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceLastCleanup >= 7) {
      cleanupStorage()
    }
  } catch (error) {
    console.error("Error checking storage cleanup:", error)
  }
}

/**
 * Limpia elementos antiguos del localStorage
 */
export function cleanupStorage(forceCleanup = false): void {
  if (typeof window === "undefined") return

  try {
    const metadata = initStorageMetadata()
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(now.getDate() - MAX_STORAGE_AGE_DAYS)

    // Identificar elementos antiguos
    const oldItems = metadata.items.filter((item) => {
      const updatedAt = new Date(item.updatedAt)
      return updatedAt < cutoffDate
    })

    // Si no hay elementos antiguos y no es limpieza forzada, salir
    if (oldItems.length === 0 && !forceCleanup) {
      metadata.lastCleanup = now.toISOString()
      saveMetadata(metadata)
      return
    }

    // Eliminar elementos antiguos
    for (const item of oldItems) {
      localStorage.removeItem(item.key)
    }

    // Si es limpieza forzada, eliminar también tickets cerrados
    if (forceCleanup) {
      // Buscar todos los elementos que sean tickets de eventos cerrados
      const allKeys = Object.keys(localStorage)
      const ticketKeys = allKeys.filter((key) => key.startsWith(`${STORAGE_PREFIX}tickets_`))

      // Obtener eventos
      const events = getStorageItem("events", [])
      const closedEventIds = events
        .filter((event: any) => event.status?.startsWith("closed_") || !event.active)
        .map((event: any) => event.id)

      // Eliminar tickets de eventos cerrados
      for (const key of ticketKeys) {
        const eventId = key.split("_")[1]
        if (closedEventIds.includes(eventId)) {
          localStorage.removeItem(key)
        }
      }
    }

    // Actualizar metadatos
    metadata.lastCleanup = now.toISOString()
    metadata.items = metadata.items.filter((item) => !oldItems.includes(item))
    saveMetadata(metadata)

    console.log(`Storage cleanup completed. Removed ${oldItems.length} old items.`)
  } catch (error) {
    console.error("Error during storage cleanup:", error)
  }
}

/**
 * Obtiene estadísticas de uso del almacenamiento
 */
export function getStorageStats(): {
  totalItems: number
  totalSize: number
  oldestItem: string | null
  newestItem: string | null
} {
  if (typeof window === "undefined") {
    return { totalItems: 0, totalSize: 0, oldestItem: null, newestItem: null }
  }

  try {
    const metadata = initStorageMetadata()
    const totalItems = metadata.items.length
    const totalSize = metadata.items.reduce((sum, item) => sum + item.size, 0)

    let oldestDate = new Date()
    let oldestKey = null
    let newestDate = new Date(0)
    let newestKey = null

    for (const item of metadata.items) {
      const createdAt = new Date(item.createdAt)
      const updatedAt = new Date(item.updatedAt)

      if (createdAt < oldestDate) {
        oldestDate = createdAt
        oldestKey = item.key
      }

      if (updatedAt > newestDate) {
        newestDate = updatedAt
        newestKey = item.key
      }
    }

    return {
      totalItems,
      totalSize,
      oldestItem: oldestKey,
      newestItem: newestKey,
    }
  } catch (error) {
    console.error("Error getting storage stats:", error)
    return { totalItems: 0, totalSize: 0, oldestItem: null, newestItem: null }
  }
}

