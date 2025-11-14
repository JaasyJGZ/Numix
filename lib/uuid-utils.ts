/**
 * Genera un UUID v4 compatible con todos los entornos
 * Funciona tanto en el navegador como en Node.js, independientemente de la versión
 */
export function generateUUID(): string {
  // Verificar si crypto.randomUUID está disponible
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  // Alternativa para entornos donde randomUUID no está disponible
  // Esta implementación es compatible con todos los navegadores y versiones de Node.js
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

