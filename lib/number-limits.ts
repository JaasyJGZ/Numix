import { supabase, supabaseAdmin } from "./supabase"
import { getSupabaseClient, fetchWithAuth } from "./fetch-utils"
import { LogLevel, log } from "./error-logger"
import { cachedQuery, invalidateCache } from "./cache-manager"
import { executeRPCWithFallback } from "./rpc-fallback-utils"
import { callRPCWithRetry } from "./rpc-retry"
import { validateWithSchema, numberSoldSchema } from "./validation-schemas"
import { useMemo } from 'react'

interface NumberLimit {
  id: string
  event_id: string
  number_range: string
  max_times: number
  times_sold: number
  created_at: string
}

// 🎯 CACHE OPTIMIZADO CON DEBOUNCE
const CACHE_TTL = 30000 // 30 segundos
const DEBOUNCE_DELAY = 100 // 100ms
let updateTimeout: NodeJS.Timeout | null = null
const numberLimitsCache = new Map<string, { data: any; timestamp: number }>()

// 🚀 FUNCIÓN HELPER PARA CACHE INTELIGENTE
function getCachedData<T>(key: string): T | null {
  const cached = numberLimitsCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedData<T>(key: string, data: T): void {
  numberLimitsCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

// 🎯 DEBOUNCE HELPER OPTIMIZADO
const debouncedCallback = (callback: (data: any) => void) => {
  return (payload: any) => {
    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      callback(payload)
    }, DEBOUNCE_DELAY)
  }
}

/**
 * 🚀 FUNCIÓN PRINCIPAL OPTIMIZADA: Obtiene los límites de números para un evento específico
 * @param eventId - ID del evento
 * @param options - Opciones de caché
 * @returns Array de límites de números
 */
export async function getNumberLimits(
  eventId: string,
  options: { bypassCache?: boolean } = {}
): Promise<NumberLimit[]> {
  try {
    if (!eventId) {
      log(LogLevel.DEBUG, "ID de evento no proporcionado en getNumberLimits")
      return []
    }
    
    // 🎯 CACHE INTELIGENTE OPTIMIZADO
    const cacheKey = `number_limits_${eventId}`
    if (!options.bypassCache) {
      const cached = getCachedData<NumberLimit[]>(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    // 🚀 Cliente: usar endpoint del servidor para evitar RLS
    if (typeof window !== "undefined") {
      const res = await fetchWithAuth(`/api/number-limits?eventId=${encodeURIComponent(eventId)}`)
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        log(LogLevel.DEBUG, `Error HTTP al obtener límites: ${res.status} ${txt}`)
        return []
      }
      const payload = await res.json().catch(() => ({ limits: [] }))
      const result = Array.isArray(payload?.limits) ? payload.limits : []
      setCachedData(cacheKey, result)
      return result
    }

    // 🚀 Servidor: usar cliente admin directamente
    const client = getSupabaseClient(true)
    const { data, error } = await client
      .from("number_limits")
      .select("*")
      .eq("event_id", eventId)
      .order("number_range", { ascending: true })

    if (error) {
      log(LogLevel.DEBUG, `Error al obtener límites de números: ${error.message || error}`)
      return []
    }

    const result = data || []
    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    log(LogLevel.DEBUG, `Error en getNumberLimits: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return []
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Crea o actualiza un límite de número para un evento
 * @param eventId - ID del evento
 * @param numberRange - Rango de números (formato: "X" o "X-Y")
 * @param maxTimes - Número máximo de veces que se puede vender
 * @returns El límite creado o actualizado, o null si hubo un error
 */
export async function updateNumberLimit(
  eventId: string,
  numberRange: string,
  maxTimes: number
): Promise<NumberLimit | null> {
  try {
    // Cliente: enviar al endpoint para upsert
    if (typeof window !== "undefined") {
      const res = await fetchWithAuth(`/api/number-limits`, {
        method: "POST",
        body: JSON.stringify({ eventId, numberRange, maxTimes })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        log(LogLevel.DEBUG, `Error HTTP al guardar límite: ${res.status} ${txt}`)
        return null
      }
      const payload = await res.json().catch(() => ({ limit: null }))
      return payload?.limit ?? null
    }

    // Servidor: admin directo
    const adminClient = getSupabaseClient(true)
    const { data, error } = await adminClient
      .from("number_limits")
      .upsert({ event_id: eventId, number_range: numberRange, max_times: maxTimes, times_sold: 0 }, { onConflict: "event_id,number_range" })
      .select()
      .maybeSingle()

    if (error) {
      log(LogLevel.DEBUG, `Error al guardar límite: ${error.message || error}`)
      return null
    }
    return data
  } catch (error) {
    log(LogLevel.ERROR, `Error en updateNumberLimit: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return null
  } finally {
    // 🎯 INVALIDACIÓN DE CACHE OPTIMIZADA
    invalidateCache(`number_limits_${eventId}`)
    numberLimitsCache.delete(`number_limits_${eventId}`)
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Incrementar el contador de tiempos vendidos para un número
 * @param eventId - ID del evento
 * @param numberToIncrement - Número a incrementar
 * @param increment - Cantidad a incrementar
 * @returns true si se incrementó correctamente, false en caso contrario
 */
export async function incrementNumberSold(
  eventId: string,
  numberToIncrement: string,
  increment: number
): Promise<boolean> {
  try {
    // 🎯 VERIFICACIÓN PREVIA OPTIMIZADA
    const { available, limitId } = await checkNumberAvailability(eventId, numberToIncrement, increment)
    
    if (!available) {
      return false
    }
    
    if (!limitId) {
      log(LogLevel.DEBUG, `No hay límite aplicable para el número ${numberToIncrement}`)
      return true
    }
    
    // 🚀 INCREMENTO ATÓMICO OPTIMIZADO
    const adminClient = getSupabaseClient(true)
    const { data: updateResult, error: updateError } = await adminClient
      .from("number_limits")
      .update({ times_sold: supabase.sql`times_sold + ${increment}` })
      .eq("id", limitId)
      .lt("times_sold", supabase.sql`max_times - ${increment} + 1`)
      .select()
    
    if (updateError) {
      log(LogLevel.ERROR, `Error al incrementar contador: ${updateError.message || updateError}`)
      return false
    }
    
    if (!updateResult || updateResult.length === 0) {
      log(LogLevel.WARN, `No se pudo incrementar el contador para ${numberToIncrement} porque excedería el límite`)
      return false
    }
    
    return true
  } catch (error) {
    log(LogLevel.ERROR, `Error en incrementNumberSold: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return false
  } finally {
    // 🎯 INVALIDACIÓN DE CACHE OPTIMIZADA
    invalidateCache(`number_limits_${eventId}`)
    numberLimitsCache.delete(`number_limits_${eventId}`)
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Decrementar el contador de tiempos vendidos para un número
 * @param eventId - ID del evento
 * @param numberToDecrement - Número a decrementar
 * @param decrement - Cantidad a decrementar
 * @returns true si se decrementó correctamente, false en caso contrario
 */
export async function decrementNumberSold(
  eventId: string,
  numberToDecrement: string,
  decrement: number
): Promise<boolean> {
  try {
    const limit = await getNumberLimit(eventId, numberToDecrement)
    
    if (!limit) {
      log(LogLevel.DEBUG, `No hay límite aplicable para el número ${numberToDecrement}`)
      return true
    }
    
    // 🚀 DECREMENTO ATÓMICO CORREGIDO - Usar supabase.sql como incrementNumberSold
    const adminClient = getSupabaseClient(true)
    const { data: updateResult, error: updateError } = await adminClient
      .from("number_limits")
      .update({ 
        times_sold: supabase.sql`GREATEST(0, times_sold - ${decrement})`
      })
      .eq("id", limit.id)
      .select()
    
    if (updateError) {
      log(LogLevel.ERROR, `Error al decrementar contador: ${updateError.message || updateError}`)
      return false
    }
    
    if (!updateResult || updateResult.length === 0) {
      log(LogLevel.WARN, `No se pudo decrementar el contador para ${numberToDecrement}`)
      return false
    }
    
    log(LogLevel.DEBUG, `Contador decrementado exitosamente para ${numberToDecrement}`)
    return true
  } catch (error) {
    log(LogLevel.ERROR, `Error en decrementNumberSold: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return false
  } finally {
    // 🎯 INVALIDACIÓN DE CACHE OPTIMIZADA
    invalidateCache(`number_limits_${eventId}`)
    numberLimitsCache.delete(`number_limits_${eventId}`)
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Verifica si un número está dentro de un rango especificado
 * @param number - El número a verificar (como string)
 * @param range - El rango a verificar (formato: "X" o "X-Y")
 * @returns true si el número está dentro del rango, false en caso contrario
 */
function isNumberInRange(number: string, range: string): boolean {
  if (!number || !range) {
    return false
  }
  
  const num = parseInt(number, 10)
  if (isNaN(num)) {
    return false
  }
  
  // 🎯 COMPARACIÓN DIRECTA OPTIMIZADA
  if (range === number) {
    return true
  }
  
  // 🚀 VERIFICACIÓN DE RANGO OPTIMIZADA
  if (range.includes("-")) {
    const parts = range.split("-")
    if (parts.length !== 2) {
      return false
    }
    
    const [start, end] = parts.map(n => parseInt(n, 10))
    if (isNaN(start) || isNaN(end) || start > end) {
      return false
    }
    
    return num >= start && num <= end
  }
  
  const rangeNum = parseInt(range, 10)
  return !isNaN(rangeNum) && num === rangeNum
}

/**
 * 🚀 FUNCIÓN ULTRA-OPTIMIZADA: Verifica si un número está disponible para vender
 * @param eventId - ID del evento
 * @param numberToCheck - Número a verificar
 * @param timesToSell - Cantidad de veces que se quiere vender el número
 * @param signal - Señal de aborto opcional para cancelar la operación
 * @returns Objeto con información de disponibilidad, cantidad restante y ID del límite
 */
export async function checkNumberAvailability(
  eventId: string,
  numberToCheck: string,
  timesToSell: number,
  signal?: AbortSignal
): Promise<{ available: boolean; remaining: number; limitId?: string }> {
  try {
    if (signal?.aborted) {
      return { available: false, remaining: 0 }
    }
    
    // 🎯 VALIDACIÓN OPTIMIZADA
    const validatedData = validateWithSchema(
      numberSoldSchema,
      { eventId, number: numberToCheck, increment: timesToSell },
      'checkNumberAvailability'
    )
    
    if (!validatedData) {
      return { available: false, remaining: 0 }
    }
    
    const parsedNumber = parseInt(numberToCheck, 10)
    if (isNaN(parsedNumber)) {
      return { available: false, remaining: 0 }
    }
    
    // 🚀 CONSULTA OPTIMIZADA CON CACHE
    const cacheKey = `availability_${eventId}_${numberToCheck}`
    const cached = getCachedData<{ available: boolean; remaining: number; limitId?: string }>(cacheKey)
    if (cached) {
      return cached
    }
    
    // Cliente: obtener límites via endpoint
    let limits: any[] = []
    if (typeof window !== "undefined") {
      const res = await fetchWithAuth(`/api/number-limits?eventId=${encodeURIComponent(eventId)}`)
      if (res.ok) {
        const payload = await res.json().catch(() => ({ limits: [] }))
        limits = Array.isArray(payload?.limits) ? payload.limits : []
      } else {
        const txt = await res.text().catch(() => "")
        log(LogLevel.DEBUG, `Error HTTP al verificar límites: ${res.status} ${txt}`)
        limits = []
      }
    } else {
      const client = getSupabaseClient(true)
      const { data, error: fetchError } = await client
        .from("number_limits")
        .select("*")
        .eq("event_id", eventId)
      if (fetchError) {
        log(LogLevel.DEBUG, `Error al verificar límites de números: ${fetchError.message || fetchError}`)
        return { available: false, remaining: 0 }
      }
      limits = data || []
    }
    
    if (!limits || limits.length === 0) {
      const result = { available: true, remaining: Infinity }
      setCachedData(cacheKey, result)
      return result
    }
    
    // 🎯 BÚSQUEDA OPTIMIZADA EN RANGOS
    for (const limit of limits) {
      if (isNumberInRange(numberToCheck, limit.number_range)) {
        const timesSold = typeof limit.times_sold === 'number' ? limit.times_sold : 0
        const maxTimes = typeof limit.max_times === 'number' ? limit.max_times : 0
        const remaining = Math.max(0, maxTimes - timesSold)
        const available = remaining >= timesToSell
        
        const result = { available, remaining, limitId: limit.id }
        setCachedData(cacheKey, result)
        return result
      }
    }
    
    const result = { available: true, remaining: Infinity }
    setCachedData(cacheKey, result)
    return result
  } catch (error) {
    log(LogLevel.DEBUG, `Error en checkNumberAvailability: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return { available: false, remaining: 0 }
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Obtiene el límite de un número específico para un evento
 * @param eventId - ID del evento
 * @param numberRange - Rango de números (formato: "X" o "X-Y")
 * @returns El límite del número o null si no existe
 */
export async function getNumberLimit(
  eventId: string,
  numberRange: string
): Promise<NumberLimit | null> {
  try {
    if (!eventId || !numberRange) {
      return null
    }
    
    // 🎯 CACHE OPTIMIZADO
    const cacheKey = `limit_${eventId}_${numberRange}`
    const cached = getCachedData<NumberLimit | null>(cacheKey)
    if (cached !== null) {
      return cached
    }
    
    const client = getSupabaseClient()
    const { data: limits, error: fetchError } = await client
      .from("number_limits")
      .select("*")
      .eq("event_id", eventId)
      .eq("number_range", numberRange)
      .maybeSingle()

    if (fetchError) {
      log(LogLevel.ERROR, `Error obteniendo límites de números: ${fetchError.message || fetchError}`)
      return null
    }

    setCachedData(cacheKey, limits)
    return limits
  } catch (error) {
    log(LogLevel.ERROR, `Error en getNumberLimit: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return null
  }
}

/**
 * 🚀 FUNCIÓN OPTIMIZADA: Elimina un límite de número
 * @param limitId - ID del límite a eliminar
 * @returns true si se eliminó correctamente, false en caso contrario
 */
export async function deleteNumberLimit(limitId: string): Promise<boolean> {
  try {
    if (!limitId) {
      return false
    }

    // Cliente: usar endpoint
    if (typeof window !== "undefined") {
      const res = await fetchWithAuth(`/api/number-limits?id=${encodeURIComponent(limitId)}`, { method: "DELETE" })
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        log(LogLevel.ERROR, `Error HTTP al eliminar límite: ${res.status} ${txt}`)
        return false
      }
      numberLimitsCache.clear()
      return true
    }

    // Servidor: admin directo
    const { error } = await getSupabaseClient(true)
      .from("number_limits")
      .delete()
      .eq("id", limitId)

    if (error) {
      log(LogLevel.ERROR, `Error al eliminar límite: ${error.message || error}`)
      return false
    }

    // 🎯 LIMPIAR CACHE RELACIONADO
    numberLimitsCache.clear()
    return true
  } catch (error) {
    log(LogLevel.ERROR, `Error en deleteNumberLimit: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return false
  }
}

/**
 * 🚀 FUNCIÓN ULTRA-OPTIMIZADA: Suscribe a cambios en los límites de números
 * @param eventId - ID del evento
 * @param callback - Función a llamar cuando hay cambios en los límites
 * @returns Función para cancelar la suscripción
 */
export function subscribeToNumberLimits(
  eventId: string,
  callback: (limits: NumberLimit[]) => void
): () => void {
  try {
    if (!eventId || !callback || typeof callback !== 'function') {
      return () => {}
    }
    
    // 🎯 CANAL ÚNICO OPTIMIZADO
    const channelId = `number-limits-${eventId}-${Date.now()}`
    
    // 🚀 LIMPIAR CANALES EXISTENTES
    const existingChannels = supabase.getChannels()
    existingChannels.forEach(channel => {
      if (channel.topic.includes(`number-limits-${eventId}`)) {
        supabase.removeChannel(channel)
      }
    })

    const channel = supabase.channel(channelId)

    // 🎯 SUSCRIPCIÓN OPTIMIZADA CON DEBOUNCE
    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "number_limits",
          filter: `event_id=eq.${eventId}`,
        },
        debouncedCallback(async (payload) => {
          try {
            const oldTimes = (payload?.old as any)?.times_sold
            const newTimes = (payload?.new as any)?.times_sold
            const limitId = (payload?.new as any)?.id || (payload?.old as any)?.id
            const numberRange = (payload?.new as any)?.number_range || (payload?.old as any)?.number_range
            const evt = (payload as any)?.eventType || (payload as any)?.event

            // Log básico para rastrear eventos relacionados a cambios en límites
            console.debug('[number-limits] cambio recibido', {
              event: evt,
              limitId,
              numberRange,
              oldTimes,
              newTimes,
            })

            // Solo reaccionar si times_sold o max_times cambia; evitar refetch innecesario
            const oldMax = (payload?.old as any)?.max_times
            const newMax = (payload?.new as any)?.max_times
            const timesChanged = typeof oldTimes === 'number' && typeof newTimes === 'number' ? oldTimes !== newTimes : true
            const maxChanged = typeof oldMax === 'number' && typeof newMax === 'number' ? oldMax !== newMax : false
            if (!timesChanged && !maxChanged) {
              return
            }

            try {
              // 🚀 OBTENER DATOS ACTUALIZADOS
              const updatedLimits = await getNumberLimits(eventId, { bypassCache: true })
              const validLimits = Array.isArray(updatedLimits) ? updatedLimits : []
              callback(validLimits)
            } catch (callbackError) {
              log(LogLevel.DEBUG, `Error al procesar cambio en límites: ${callbackError instanceof Error ? callbackError.message : "Error desconocido"}`)
              callback([])
            }
          } catch (subErr) {
            log(LogLevel.DEBUG, `Error en manejo de evento de límites: ${subErr instanceof Error ? subErr.message : 'Error desconocido'}`)
          }
        })
      )
      .subscribe()

    // 🎯 FUNCIÓN DE LIMPIEZA OPTIMIZADA
    return () => {
      supabase.removeChannel(channel)
      if (updateTimeout) {
        clearTimeout(updateTimeout)
        updateTimeout = null
      }
    }
  } catch (error) {
    log(LogLevel.ERROR, `Error en subscribeToNumberLimits: ${error instanceof Error ? error.message : "Error desconocido"}`)
    return () => {}
  }
}

// 🚀 FUNCIÓN ADICIONAL: Limpiar cache manualmente
export function clearNumberLimitsCache(): void {
  numberLimitsCache.clear()
  if (updateTimeout) {
    clearTimeout(updateTimeout)
    updateTimeout = null
  }
}

// 🎯 FUNCIÓN ADICIONAL: Obtener estadísticas de cache
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: numberLimitsCache.size,
    keys: Array.from(numberLimitsCache.keys())
  }
}