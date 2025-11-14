import { supabase } from "./supabase"

/**
 * Verifica la conexión a Supabase con reintentos
 * @returns Objeto con estado de conexión y datos o error
 */
export async function checkSupabaseConnection() {
  // Configuración de reintentos
  const maxRetries = 2
  const baseDelay = 500
  
  let lastError = null
  
  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    try {
      // Si no es el primer intento, esperar antes de reintentar
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Reintentando conexión a Supabase (intento ${attempt}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Intentar una consulta simple para verificar la conexión
      const { data, error } = await supabase
        .from("events")
        .select("count")
        .limit(1)

      if (error) {
        lastError = error
        console.error(`Error de conexión a Supabase (intento ${attempt + 1}/${maxRetries + 1}):`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        
        // Si no es el último intento, continuar al siguiente
        if (attempt < maxRetries) continue
        
        return {
          connected: false,
          error: error.message,
          details: {
            code: error.code,
            hint: error.hint,
            details: error.details
          }
        }
      }

      // Si llegamos aquí, la conexión fue exitosa
      if (attempt > 0) {
        console.log(`Conexión a Supabase recuperada después de ${attempt + 1} intentos`)
      }
      
      return {
        connected: true,
        data,
      }
    } catch (error) {
      lastError = error
      console.error(`Excepción al verificar conexión a Supabase (intento ${attempt + 1}/${maxRetries + 1}):`, 
        error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      )
      
      // Si no es el último intento, continuar al siguiente
      if (attempt < maxRetries) continue
    }
  }
  
  // Si llegamos aquí, se agotaron los reintentos
  return {
    connected: false,
    error: lastError instanceof Error ? lastError.message : "Error desconocido",
    details: {
      type: lastError instanceof Error ? lastError.name : typeof lastError,
      stack: lastError instanceof Error ? lastError.stack : null
    }
  }
}

