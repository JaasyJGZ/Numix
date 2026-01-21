/**
 * Utilidades para optimización de rendimiento
 */

// Función para debounce (retrasar la ejecución de una función)
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Función para throttle (limitar la frecuencia de ejecución de una función)
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Función para memoizar resultados de funciones costosas
export function memoize<T extends (...args: any[]) => any>(func: T): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>()

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>
    }

    const result = func(...args)
    cache.set(key, result)
    return result
  }
}

// Función para detectar si estamos en un dispositivo móvil
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Función para detectar si la conexión es lenta
export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined" || !("connection" in navigator)) return false

  // @ts-ignore - La propiedad connection puede no estar definida en todos los navegadores
  const connection = navigator.connection

  if (!connection) return false

  // @ts-ignore - Estas propiedades pueden no estar definidas en todos los navegadores
  if (connection.saveData) return true

  // @ts-ignore
  const effectiveType = connection.effectiveType
  if (effectiveType === "slow-2g" || effectiveType === "2g") return true

  return false
}

