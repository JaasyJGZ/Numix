"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "vendor" | "admin"
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Si no está cargando y no hay usuario, redirigir al inicio de sesión
    if (!loading && !user) {
      router.push("/")
      return
    }

    // Si se requiere un rol específico y el usuario no lo tiene, redirigir
    if (!loading && user && requiredRole && user.role !== requiredRole) {
      if (user.role === "vendor") {
        router.push("/vendedor/dashboard")
      } else {
        router.push("/")
      }
    }
  }, [user, loading, router, requiredRole])

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-[#4ECDC4] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
          <p>Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si se requiere un rol específico y el usuario no lo tiene, no mostrar nada
  if (requiredRole && user?.role !== requiredRole) {
    return null
  }

  // Si el usuario está autenticado, mostrar el contenido
  return user ? <>{children}</> : null
}

