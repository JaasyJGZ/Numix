/**
 * Utilidades de seguridad para validación y sanitización
 */

// Expresiones regulares para validación
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const NUMERIC_REGEX = /^[0-9]+$/
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Valida que un string sea numérico
 */
export function isNumeric(value: string): boolean {
  return NUMERIC_REGEX.test(value)
}

/**
 * Valida que un string sea alfanumérico
 */
export function isAlphanumeric(value: string): boolean {
  return ALPHANUMERIC_REGEX.test(value)
}

/**
 * Sanitiza un string para prevenir XSS
 */
export function sanitizeString(value: string): string {
  if (!value) return ""

  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T extends object>(obj: T): T {
  const result = { ...obj }

  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key]

      if (typeof value === "string") {
        result[key] = sanitizeString(value) as any
      } else if (typeof value === "object" && value !== null) {
        result[key] = sanitizeObject(value) as any
      }
    }
  }

  return result
}

/**
 * Valida un ticket antes de guardarlo
 */
export function validateTicket(ticket: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validar campos obligatorios
  if (!ticket.clientName) {
    errors.push("El nombre del cliente es obligatorio")
  }

  if (!ticket.rows || !Array.isArray(ticket.rows) || ticket.rows.length === 0) {
    errors.push("El ticket debe tener al menos una fila")
  } else {
    // Validar cada fila
    ticket.rows.forEach((row: any, index: number) => {
      if (!row.times) {
        errors.push(`La fila ${index + 1} debe tener un valor de tiempos`)
      } else if (!isNumeric(String(row.times))) {
        errors.push(`El valor de tiempos en la fila ${index + 1} debe ser numérico`)
      }

      if (!row.actions) {
        errors.push(`La fila ${index + 1} debe tener un valor de acciones`)
      } else if (!isNumeric(String(row.actions))) {
        errors.push(`El valor de acciones en la fila ${index + 1} debe ser numérico`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Genera un token CSRF
 */
export function generateCsrfToken(): string {
  if (typeof window === "undefined") return ""

  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Almacena un token CSRF en sessionStorage
 */
export function storeCsrfToken(token: string): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem("csrf_token", token)
}

/**
 * Verifica un token CSRF
 */
export function verifyCsrfToken(token: string): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem("csrf_token") === token
}

