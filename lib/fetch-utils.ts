/**
 * Utilidades para realizar solicitudes HTTP con los encabezados correctos
 * Este archivo soluciona el problema de error 406 (Not Acceptable) en solicitudes a Supabase
 */

import { supabase, getSupabaseAdmin } from "./supabase";

/**
 * Wrapper para obtener el cliente de Supabase adecuado
 * 
 * NOTA: Ya no es necesario configurar encabezados aquí porque ahora están configurados
 * globalmente en lib/supabase.ts para todas las solicitudes.
 * 
 * Esta función ahora simplemente devuelve el cliente apropiado sin modificaciones adicionales.
 */
export function getSupabaseClient(useAdmin = false) {
  // En servidor, podemos usar el cliente admin seguro
  if (useAdmin && typeof window === "undefined") {
    return getSupabaseAdmin()
  }
  // En navegador, nunca exponemos el cliente admin
  return supabase
}

/**
 * Función de utilidad para realizar solicitudes HTTP con los encabezados correctos
 * 
 * NOTA: Esta función mantiene la compatibilidad con código existente, pero los encabezados
 * para las solicitudes a Supabase ya están configurados globalmente en lib/supabase.ts
 * 
 * @param url - URL a la que se realizará la solicitud
 * @param options - Opciones de la solicitud
 * @returns Respuesta de la solicitud
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Asegurar que los encabezados incluyan Accept y Content-Type con valores mejorados
  const headers = {
    'Accept': 'application/json, */*',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
    ...options.headers,
  };
  
  // Realizar la solicitud con los encabezados correctos
  return fetch(url, {
    ...options,
    headers,
  });
}