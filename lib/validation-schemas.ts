/**
 * Esquemas de validación con Zod para el proyecto NumixPro
 * Implementación progresiva para optimizaciones de producción
 */

import { z } from 'zod';
import { LogLevel, log } from './error-logger';

/**
 * Esquema para validar rangos de números
 * Acepta formatos: "X" (número único) o "X-Y" (rango)
 */
export const numberRangeSchema = z.string().refine(
  (val) => {
    // Validar que no sea vacío
    if (!val) return false;
    
    // Validar formato "X" (número único)
    if (/^\d+$/.test(val)) return true;
    
    // Validar formato "X-Y" (rango)
    if (/^\d+-\d+$/.test(val)) {
      const [start, end] = val.split('-').map(Number);
      return start <= end; // Asegurar que el inicio sea menor o igual que el fin
    }
    
    return false;
  },
  { message: "Formato inválido. Use un número o un rango (ej: 1-10)" }
);

/**
 * Esquema para validar parámetros de límites de números
 */
export const numberLimitSchema = z.object({
  eventId: z.string().uuid("ID de evento inválido"),
  numberRange: numberRangeSchema,
  maxTimes: z.number().int().nonnegative("El número máximo debe ser mayor o igual a cero")
});

/**
 * Esquema para validar parámetros de incremento/decremento de números vendidos
 */
export const numberSoldSchema = z.object({
  eventId: z.string().uuid("ID de evento inválido"),
  number: z.string().min(1, "Número no proporcionado"),
  increment: z.number().int().positive("El incremento debe ser un número positivo")
});

/**
 * Esquema para validar opciones de caché
 */
export const cacheOptionsSchema = z.object({
  ttl: z.number().int().nonnegative().optional(),
  key: z.string().optional(),
  bypass: z.boolean().optional()
});

/**
 * Esquema para validar opciones de reintentos RPC
 */
export const retryOptionsSchema = z.object({
  maxRetries: z.number().int().nonnegative().optional(),
  baseDelay: z.number().int().nonnegative().optional(),
  backoffFactor: z.number().positive().optional(),
  maxDelay: z.number().int().nonnegative().optional()
});

/**
 * Función para validar datos con un esquema Zod
 * @param schema - Esquema Zod para validar
 * @param data - Datos a validar
 * @param context - Contexto para el registro de errores
 * @returns Datos validados o null si hay errores
 */
export function validateWithSchema<T, S>(schema: z.ZodType<T>, data: S, context: string): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Registrar errores de validación
      const errorDetails = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      log(
        LogLevel.WARN,
        `Error de validación en ${context}: ${errorDetails}`,
        { data }
      );
    } else {
      // Registrar otros errores
      log(
        LogLevel.ERROR,
        `Error inesperado en validación (${context})`,
        { error: error instanceof Error ? error.message : "Error desconocido" }
      );
    }
    return null;
  }
}