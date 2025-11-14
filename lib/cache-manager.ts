/**
 * Sistema de caché con invalidación selectiva para consultas a Supabase
 * Implementación progresiva para optimizaciones de producción
 */

import { LogLevel, log } from "./error-logger"
import { validateWithSchema, cacheOptionsSchema } from './validation-schemas'

/**
 * Opciones para la función de caché
 */
export interface CacheOptions {
  /** Tiempo de vida en milisegundos */
  ttl?: number
  /** Clave personalizada para identificar la entrada en caché */
  key?: string
  /** Si es true, no se utilizará la caché y siempre se ejecutará la consulta */
  bypass?: boolean
}

/**
 * Entrada de caché con metadatos
 */
interface CacheEntry<T> {
  /** Datos almacenados en caché */
  data: T
  /** Timestamp de cuando se almacenó la entrada */
  timestamp: number
  /** Tiempo de vida en milisegundos */
  ttl: number
}

// Almacenamiento de caché en memoria
const cache = new Map<string, CacheEntry<any>>()

// Configuración por defecto
const DEFAULT_TTL = 60000 // 1 minuto por defecto
const MAX_CACHE_SIZE = 100 // Número máximo de entradas en caché

/**
 * Ejecuta una función de consulta con caché
 * @param queryFn - Función que realiza la consulta
 * @param options - Opciones de configuración para la caché
 * @returns Resultado de la consulta, ya sea desde caché o ejecutando la función
 */

export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  try {
    // Validar opciones con Zod
    const validatedOptions = validateWithSchema(cacheOptionsSchema, options, 'Cache Options') || {}
    
    // Extraer opciones con valores por defecto
    const {
      ttl = DEFAULT_TTL,
      key = queryFn.toString(),
      bypass = false
    } = { ...options, ...validatedOptions } // Combinar opciones originales con validadas

    // Si se solicita bypass, ejecutar la consulta directamente sin usar caché
    if (bypass || process.env.NODE_ENV === "development") {
      return await queryFn()
    }

    const now = Date.now()
    const cached = cache.get(key)

    // Si hay datos en caché y no han expirado, devolverlos
    if (cached && now - cached.timestamp < cached.ttl) {
      log(
        LogLevel.DEBUG,
        `Usando datos en caché para clave: ${key.substring(0, 50)}...`,
        { cacheHit: true, age: now - cached.timestamp }
      )
      return cached.data
    }

    // Si no hay datos en caché o han expirado, ejecutar la consulta
    try {
      const result = await queryFn()
      
      // Asegurarse de que estamos trabajando con los datos correctos
      // Manejar tanto objetos simples como respuestas de Supabase que pueden tener diferentes estructuras
      let data;
      if (result && typeof result === 'object') {
        if ('data' in result) {
          // Es una respuesta de Supabase con estructura { data, error }
          data = result.data;
        } else if ('headers' in result) {
          // Es una respuesta HTTP con headers
          // Extraer los datos relevantes
          data = result;
          
          // No intentamos manipular los headers, simplemente usamos el resultado tal como está
          // Esto evita el error "result.headers is not a function"
          log(
            LogLevel.DEBUG,
            `Procesando respuesta con headers`,
            { hasHeaders: true }
          );
        } else {
          // Es otro tipo de objeto, usarlo directamente
          data = result;
        }
      } else {
        // No es un objeto, usarlo directamente
        data = result;
      }

      // Guardar en caché
      cache.set(key, { data, timestamp: now, ttl })

      // Controlar el tamaño de la caché
      if (cache.size > MAX_CACHE_SIZE) {
        // Eliminar la entrada más antigua
        const oldestKey = findOldestCacheEntry()
        if (oldestKey) {
          cache.delete(oldestKey)
        }
      }

      log(
        LogLevel.DEBUG,
        `Datos almacenados en caché para clave: ${key.substring(0, 50)}...`,
        { cacheHit: false }
      )

      return data
    } catch (error) {
      // En caso de error, registrar y relanzar
      log(
        LogLevel.ERROR,
        `Error en consulta cacheada: ${error instanceof Error ? error.message : "Error desconocido"}`,
        { key: key.substring(0, 50) }
      )
      throw error
    }
  } catch (error) {
    // En caso de error durante la validación o configuración, registrar y relanzar
    log(
      LogLevel.ERROR,
      `Error en configuración de caché: ${error instanceof Error ? error.message : "Error desconocido"}`,
      { key: options.key || 'unknown' }
    )
    throw error
  }
}

/**
 * Invalida entradas específicas de la caché que coincidan con un patrón
 * @param keyPattern - Patrón para identificar las entradas a invalidar
 */
export function invalidateCache(keyPattern?: string): void {
  if (!keyPattern) {
    // Si no se proporciona un patrón, limpiar toda la caché
    const cacheSize = cache.size
    cache.clear()
    
    log(
      LogLevel.INFO,
      `Caché completamente invalidada`,
      { entriesCleared: cacheSize }
    )
    return
  }

  // Invalidar entradas específicas que coincidan con el patrón
  let invalidatedCount = 0
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key)
      invalidatedCount++
    }
  }

  if (invalidatedCount > 0) {
    log(
      LogLevel.INFO,
      `Caché invalidada para patrón: ${keyPattern}`,
      { entriesCleared: invalidatedCount }
    )
  }
}

/**
 * Encuentra la entrada más antigua en la caché
 * @returns Clave de la entrada más antigua o undefined si la caché está vacía
 */
function findOldestCacheEntry(): string | undefined {
  let oldestKey: string | undefined
  let oldestTime = Infinity

  for (const [key, entry] of cache.entries()) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp
      oldestKey = key
    }
  }

  return oldestKey
}

/**
 * Inicializa el sistema de caché
 */
export function initCacheSystem(): void {
  if (typeof window === "undefined") return

  // Limpiar la caché al iniciar
  cache.clear()

  // Configurar limpieza periódica de entradas expiradas
  setInterval(() => {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        cache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      log(
        LogLevel.DEBUG,
        `Limpieza automática de caché: ${expiredCount} entradas expiradas eliminadas`,
        { cacheSize: cache.size }
      )
    }
  }, 60000) // Ejecutar cada minuto

  log(
    LogLevel.INFO,
    "Sistema de caché inicializado",
    { maxSize: MAX_CACHE_SIZE, defaultTTL: DEFAULT_TTL }
  )
}