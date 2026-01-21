"use client"

import { useRouter } from "next/navigation"

// Función para verificar si un usuario está autenticado
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem("currentVendorEmail")
}

// Función para obtener el email del vendedor actual
export function getCurrentVendorEmail(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("currentVendorEmail")
}

// Hook para proteger rutas
export function useAuthProtection() {
  const router = useRouter()

  // Verificar autenticación
  if (typeof window !== "undefined" && !isAuthenticated()) {
    router.push("/")
    return false
  }

  return true
}

