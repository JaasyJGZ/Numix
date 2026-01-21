/**
 * Utilidades para manejar fallbacks de RPC
 * Este archivo contiene funciones auxiliares para reducir la duplicación de código
 * en las operaciones que utilizan RPC con fallback a implementaciones directas
 */

import { LogLevel, log } from "./error-logger";
import { getSupabaseClient } from "./fetch-utils";
import { callRPCWithRetry } from "./rpc-retry";

/**
 * Tipo genérico para funciones que ejecutan operaciones RPC con fallback
 */
export type RPCWithFallbackFunction<T, P> = (
  rpcName: string,
  rpcParams: P,
  fallbackFn: () => Promise<T>,
  errorContext: string
) => Promise<T>;

/**
 * Ejecuta una operación RPC con fallback a una implementación directa
 * @param rpcName - Nombre de la función RPC a llamar
 * @param rpcParams - Parámetros para la función RPC
 * @param fallbackFn - Función de fallback a ejecutar si falla la RPC
 * @param errorContext - Contexto para el registro de errores
 * @returns Resultado de la operación
 */
export async function executeRPCWithFallback<T, P>(
  rpcName: string,
  rpcParams: P,
  fallbackFn: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    try {
      // Llamar a la función RPC
      const data = await callRPCWithRetry<T>(rpcName, rpcParams);
      return data;
    } catch (rpcError) {
      // Registrar el error de RPC con más detalles
      const errorDetails = {
        rpcParams,
        errorType: rpcError instanceof Error ? rpcError.constructor.name : typeof rpcError,
        stack: rpcError instanceof Error ? rpcError.stack : undefined
      };
      
      // Registrar como DEBUG en lugar de INFO para reducir ruido en la consola
      log(
        LogLevel.DEBUG,
        `Usando fallback para ${rpcName} en ${errorContext}: ${rpcError instanceof Error ? rpcError.message : "Error desconocido"}`,
        errorDetails
      );
      
      // Ejecutar la implementación de fallback sin mostrar error en consola
      return await fallbackFn();
    }
  } catch (error) {
    // Registrar el error general con más detalles
    const errorDetails = {
      rpcParams,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    };
    
    // Registrar el error pero no lanzarlo para evitar que se rompa la UI
    log(
      LogLevel.ERROR,
      `Error en ${errorContext}: ${error instanceof Error ? error.message : "Error desconocido"}`,
      errorDetails
    );
    
    // Intentar ejecutar la implementación de fallback incluso si hay un error general
    try {
      return await fallbackFn();
    } catch (fallbackError) {
      // Si también falla el fallback, registrar y devolver un valor por defecto seguro
      log(
        LogLevel.ERROR,
        `Error en implementación fallback para ${rpcName}: ${fallbackError instanceof Error ? fallbackError.message : "Error desconocido"}`,
        { originalError: errorDetails }
      );
      
      // Devolver un valor seguro según el contexto
      return ([] as unknown) as T; // Para la mayoría de casos, un array vacío es seguro
    }
  }
}

/**
 * Invalida la caché para una clave específica
 * @param cacheKey - Clave de caché a invalidar
 */
export async function invalidateCacheKey(cacheKey: string): Promise<void> {
  try {
    const { invalidateCache } = await import('./cache-manager');
    invalidateCache(cacheKey);
  } catch (cacheError) {
    log(
      LogLevel.WARN,
      `Error al invalidar caché para ${cacheKey}: ${cacheError instanceof Error ? cacheError.message : "Error desconocido"}`
    );
  }
}

/**
 * Ejecuta una operación con validación de esquema
 * @param schemaName - Nombre del esquema a utilizar
 * @param data - Datos a validar
 * @param context - Contexto para el registro de errores
 * @param operation - Operación a ejecutar si la validación es exitosa
 * @returns Resultado de la operación o valor por defecto si falla la validación
 */
export async function executeWithSchemaValidation<T, D, R>(
  schemaName: string,
  data: D,
  context: string,
  operation: (validatedData: T) => Promise<R>,
  defaultValue: R
): Promise<R> {
  try {
    // Importar los esquemas de validación de forma dinámica
    const validationModule = await import('./validation-schemas');
    const schema = validationModule[schemaName];
    
    if (!schema) {
      log(LogLevel.ERROR, `Esquema de validación no encontrado: ${schemaName}`, { context });
      return defaultValue;
    }
    
    const validatedData = validationModule.validateWithSchema(
      schema,
      data,
      context
    );
    
    if (!validatedData) {
      return defaultValue; // La función validateWithSchema ya registra los errores
    }
    
    return await operation(validatedData);
  } catch (error) {
    log(
      LogLevel.ERROR,
      `Error en validación para ${context}: ${error instanceof Error ? error.message : "Error desconocido"}`,
      { data }
    );
    return defaultValue;
  }
}