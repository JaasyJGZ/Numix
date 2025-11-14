import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// === CONFIGURACIÓN DE VARIABLES DE ENTORNO ===
// Sin valores por defecto hardcodeados para evitar uso accidental
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// === CONFIGURACIONES OPTIMIZADAS ===
// Configuración base compartida
const baseConfig = {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Accept': 'application/json, */*',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Accept-Profile': 'public',
      'Content-Profile': 'public',
      'x-client-info': 'numixpro-optimized'
    }
  }
}

// Configuración optimizada para realtime
const realtimeConfig = {
  params: {
    eventsPerSecond: 8, // Optimizado: reducido de 10 a 8 para mejor rendimiento
  },
  heartbeatIntervalMs: 20000, // Optimizado: aumentado a 20s para reducir overhead
  disconnectAfterMs: 90000, // Optimizado: aumentado a 90s para mayor estabilidad
  reconnectAfterMs: (attempts: number) => {
    // Backoff exponencial optimizado con jitter
    const baseDelay = Math.min(1500 * Math.pow(1.8, attempts), 15000) // Más conservador
    const jitter = Math.floor(Math.random() * 500) // Jitter reducido
    return baseDelay + jitter
  },
}

// Configuración de autenticación optimizada
const authConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce' as const, // Más seguro
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  storageKey: 'numixpro-auth-token',
}

// === CLIENTES SUPABASE OPTIMIZADOS ===
const isServer = typeof window === 'undefined'
// Validación básica de entorno en tiempo de ejecución
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase: faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu .env.local"
  )
}
if (!supabaseServiceKey) {
  console.warn(
    "Supabase: falta SUPABASE_SERVICE_ROLE_KEY. Las operaciones admin en servidor fallarán."
  )
}

// Cliente para operaciones del lado del cliente (con clave anónima)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  ...baseConfig,
  realtime: realtimeConfig,
  auth: authConfig,
})

// Cliente para operaciones del lado del servidor (con clave de servicio)
// Solo usar en Server Components, Server Actions o API Routes (no en el navegador)
// Evitar crearlo en el navegador para no requerir la service role key en cliente
export const supabaseAdmin = (isServer && supabaseServiceKey)
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      ...baseConfig,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (undefined as unknown as ReturnType<typeof createClient<Database>>)

export function getSupabaseAdmin() {
  if (!isServer) {
    throw new Error('supabaseAdmin no está disponible en el navegador. Use endpoints del servidor.')
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definido en el entorno del servidor')
  }
  return supabaseAdmin
}

// === UTILIDADES DE CONEXIÓN ===
// Cache para el estado de conexión realtime
let realtimeConnectionCache: { status: boolean; timestamp: number } | null = null
const CONNECTION_CACHE_TTL = 30000 // 30 segundos

/**
 * Verifica el estado de la conexión realtime con cache
 */
export async function checkRealtimeConnection(): Promise<boolean> {
  // Verificar cache
  if (realtimeConnectionCache) {
    const now = Date.now()
    if (now - realtimeConnectionCache.timestamp < CONNECTION_CACHE_TTL) {
      return realtimeConnectionCache.status
    }
  }

  try {
    const channel = supabase.channel(`connection-test-${Date.now()}`)
    
    const connectionPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        channel.unsubscribe()
        resolve(false)
      }, 5000) // Timeout de 5 segundos

      channel
        .on('system', { event: 'connected' }, () => {
          clearTimeout(timeout)
          channel.unsubscribe()
          resolve(true)
        })
        .subscribe()
    })

    const isConnected = await connectionPromise
    
    // Actualizar cache
    realtimeConnectionCache = {
      status: isConnected,
      timestamp: Date.now()
    }

    return isConnected
  } catch (error) {
    console.error('Error checking Realtime connection:', error)
    
    // Actualizar cache con estado de error
    realtimeConnectionCache = {
      status: false,
      timestamp: Date.now()
    }
    
    return false
  }
}

/**
 * Obtiene un cliente Supabase con configuración específica
 */
export function getSupabaseClient(options?: {
  useAdmin?: boolean
  customConfig?: Record<string, any>
}) {
  const { useAdmin = false, customConfig = {} } = options || {}
  
  if (useAdmin) {
    return customConfig ? 
      createClient<Database>(supabaseUrl, supabaseServiceKey, {
        ...baseConfig,
        ...customConfig
      }) : 
      supabaseAdmin
  }
  
  return customConfig ? 
    createClient<Database>(supabaseUrl, supabaseAnonKey, {
      ...baseConfig,
      realtime: realtimeConfig,
      auth: authConfig,
      ...customConfig
    }) : 
    supabase
}

/**
 * Limpia el cache de conexión realtime
 */
export function clearRealtimeConnectionCache(): void {
  realtimeConnectionCache = null
}

/**
 * Obtiene estadísticas del cliente Supabase
 */
export function getSupabaseStats() {
  return {
    url: supabaseUrl,
    hasCustomUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasCustomAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasCustomServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    realtimeConfig: {
      eventsPerSecond: realtimeConfig.params.eventsPerSecond,
      heartbeatInterval: realtimeConfig.heartbeatIntervalMs,
      disconnectAfter: realtimeConfig.disconnectAfterMs,
    },
    connectionCacheStatus: realtimeConnectionCache ? {
      cached: true,
      status: realtimeConnectionCache.status,
      age: Date.now() - realtimeConnectionCache.timestamp
    } : { cached: false }
  }
}

// === VALIDACIONES EN DESARROLLO ===
if (process.env.NODE_ENV === 'development') {
  // Validar variables de entorno
  const warnings: string[] = []
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL no está definida')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida')
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY no está definida')
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Configuración de Supabase:', warnings.join(', ') + '. Usando valores por defecto.')
  }
  
  // Log de configuración optimizada
  console.log('🚀 Supabase optimizado cargado:', {
    eventsPerSecond: realtimeConfig.params.eventsPerSecond,
    heartbeatInterval: `${realtimeConfig.heartbeatIntervalMs}ms`,
    disconnectAfter: `${realtimeConfig.disconnectAfterMs}ms`
  })
}

// === TIPOS EXPORTADOS ===
export type SupabaseClient = typeof supabase
export type SupabaseAdminClient = typeof supabaseAdmin