/**
 * Sistema de reintentos con backoff exponencial para llamadas RPC
 * Implementación básica para optimizaciones de producción
 */

import { PostgrestError } from "@supabase/supabase-js"
import { supabaseAdmin } from "./supabase"
import { LogLevel, log } from "./error-logger"

/**
 * Opciones para la función de reintento
 */
interface RetryOptions {
  /** Número máximo de reintentos antes de fallar */
  maxRetries?: number
  /** Retraso base en milisegundos para el backoff exponencial */
  baseDelay?: number
  /** Factor de multiplicación para el backoff exponencial */
  backoffFactor?: number
  /** Retraso máximo en milisegundos */
  maxDelay?: number
}

// Códigos de error comunes que deberían provocar un reintento
const DEFAULT_RETRYABLE_ERRORS = [
  "23505", // Violación de restricción única (puede ocurrir en condiciones de carrera)
  "40001", // Serialización fallida (conflictos de transacción)
  "57014", // Cancelación de consulta
  "PGRST301", // Timeout de conexión
  "PGRST408", // Timeout de solicitud
  "PGRST499", // Cliente cerró la conexión
  "PGRST500", // Error interno del servidor
  "PGRST503", // Servicio no disponible
  "PGRST504", // Timeout de gateway
  "PGRST429", // Demasiadas solicitudes
];

/**
 * Ejecuta una llamada RPC con reintentos automáticos usando backoff exponencial
 * @param rpcName - Nombre de la función RPC a llamar
 * @param params - Parámetros para la función RPC
 * @param options - Opciones de configuración para los reintentos
 * @returns Resultado de la llamada RPC
 */
export async function callRPCWithRetry<T = any>(
  rpcName: string,
  params: any,
  options: RetryOptions = {}
): Promise<T> {
  // Configuración por defecto
  const {
    maxRetries = 3,
    baseDelay = 500,
    backoffFactor = 2,
    maxDelay = 5000,
  } = options

  let lastError: Error | PostgrestError | null = null
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const { data, error } = await supabaseAdmin.rpc(rpcName, params)

      if (error) {
        // Registrar el error para análisis
        log(
          LogLevel.WARN,
          `Error en llamada RPC ${rpcName} (intento ${retryCount + 1}/${maxRetries})`,
          { error: error.message, code: error.code, details: error.details }
        )
        throw error
      }
      
      // Si llegamos aquí, la llamada fue exitosa
      if (retryCount > 0) {
        // Solo registrar si hubo reintentos exitosos
        log(
          LogLevel.INFO,
          `Llamada RPC ${rpcName} exitosa después de ${retryCount + 1} intentos`
        )
      }

      return data
    } catch (error) {
      lastError = error as Error | PostgrestError
      
      // Determinar si debemos reintentar basado en el tipo de error
      const canRetry = shouldRetry(lastError);
      
      if (!canRetry) {
        log(
          LogLevel.INFO,
          `No se reintentará la llamada RPC ${rpcName} debido al tipo de error`,
          { error: lastError instanceof Error ? lastError.message : "Error desconocido" }
        )
        break;
      }
      
      retryCount++

      // Si hemos alcanzado el número máximo de reintentos, lanzar el error
      if (retryCount >= maxRetries) {
        break
      }

      // Calcular el tiempo de espera con backoff exponencial
      const delay = Math.min(
        Math.pow(backoffFactor, retryCount) * baseDelay,
        maxDelay
      )

      // Registrar información sobre el reintento
      log(
        LogLevel.INFO,
        `Reintentando llamada RPC ${rpcName} en ${delay}ms (intento ${retryCount}/${maxRetries})`,
        { error: lastError instanceof Error ? lastError.message : "Error desconocido" }
      )

      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  const errorMessage = lastError instanceof Error ? lastError.message : "Error desconocido"
  
  log(
    LogLevel.ERROR,
    `Todos los intentos de llamada RPC ${rpcName} fallaron después de ${maxRetries} intentos`,
    { error: errorMessage, params }
  )

  throw lastError || new Error(`Fallo en llamada RPC ${rpcName} después de ${maxRetries} intentos`)
}

/**
 * Función para determinar si un error debería provocar un reintento
 * @param error - Error ocurrido durante la llamada RPC
 * @returns true si el error debería provocar un reintento, false en caso contrario
 */
function shouldRetry(error: Error | PostgrestError): boolean {
  // Si es un error de Postgres, verificar el código
  if ('code' in error && error.code) {
    // No reintentar errores de función no encontrada
    if (error.code === 'PGRST202') {
      return false;
    }
    return DEFAULT_RETRYABLE_ERRORS.includes(error.code);
  }
  
  // Para errores de red o timeout, reintentar
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('network') ||
    message.includes('temporarily unavailable') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  );
}

/**
 * Ejecuta una función con reintentos automáticos usando backoff exponencial
 * Útil para operaciones que no son RPC pero necesitan reintentos
 * @param fn - Función a ejecutar
 * @param options - Opciones de configuración para los reintentos
 * @returns Resultado de la función
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Configuración por defecto
  const {
    maxRetries = 3,
    baseDelay = 500,
    backoffFactor = 2,
    maxDelay = 5000,
  } = options

  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      retryCount++;

      // Si hemos alcanzado el número máximo de reintentos, lanzar el error
      if (retryCount >= maxRetries) {
        break;
      }

      // Calcular el tiempo de espera con backoff exponencial
      const delay = Math.min(
        Math.pow(backoffFactor, retryCount) * baseDelay,
        maxDelay
      );

      // Registrar información sobre el reintento
      log(
        LogLevel.INFO,
        `Reintentando operación en ${delay}ms (intento ${retryCount}/${maxRetries})`,
        { error: lastError instanceof Error ? lastError.message : "Error desconocido" }
      );

      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  const errorMessage = lastError instanceof Error ? lastError.message : "Error desconocido";
  
  log(
    LogLevel.ERROR,
    `Todos los intentos de la operación fallaron después de ${maxRetries} intentos`,
    { error: errorMessage }
  );

  throw lastError || new Error(`Fallo en operación después de ${maxRetries} intentos`);
}