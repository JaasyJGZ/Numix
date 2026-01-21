import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cierra la sesión del usuario y previene la navegación hacia atrás
 * @param router - El router de Next.js
 */
export function handleSecureLogout(router: any) {
  // Esta función ahora está obsoleta, pero la mantenemos por compatibilidad
  // En su lugar, deberíamos usar el método signOut del contexto de autenticación

  // Limpiar datos de sesión del localStorage
  localStorage.removeItem("currentVendorEmail")
  localStorage.removeItem("numix_session")

  // Marcar que venimos de un cierre de sesión
  sessionStorage.setItem("fromLogout", "true")

  // Reemplazar la entrada actual en el historial (en lugar de agregar una nueva)
  router.replace("/")

  // Agregar una nueva entrada en el historial que reemplace la actual
  // Esto hace que al presionar "atrás", se vuelva a la página de inicio
  setTimeout(() => {
    window.history.pushState(null, "", "/")

    // Agregar un evento para capturar cuando el usuario presiona "atrás"
    window.addEventListener("popstate", function preventBack() {
      window.history.pushState(null, "", "/")
      // Remover el evento después de usarlo una vez
      window.removeEventListener("popstate", preventBack)
    })
  }, 100)
}

/**
 * Generates a UUID (Universally Unique Identifier).
 * @returns {string} A UUID string.
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

