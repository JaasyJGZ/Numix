"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { verifyVendorCredentials } from "@/lib/vendors"
import { supabase } from "@/lib/supabase"

// Definir la interfaz para el usuario autenticado
export interface AuthUser {
  id: string
  email: string
  name: string
  role: "vendor" | "admin"
}

// Definir la interfaz para el contexto de autenticación
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => void
  refreshUser: () => Promise<void>
}

// Crear el contexto con un valor predeterminado
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider")
  }
  return context
}

// Proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Función para obtener la sesión actual
  const getSession = () => {
    // Si estamos en el servidor, no hay sesión
    if (typeof window === "undefined") return null

    try {
      const sessionStr = localStorage.getItem("numix_session")
      if (!sessionStr) return null

      const session = JSON.parse(sessionStr)

      // Verificar si la sesión ha expirado
      if (session.expires_at < new Date().getTime()) {
        localStorage.removeItem("numix_session")
        return null
      }

      return session
    } catch (error) {
      console.error("Error getting session:", error)
      return null
    }
  }

  // Función para iniciar sesión
  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      // Verificar credenciales usando la función existente
      const vendor = await verifyVendorCredentials(email, password)

      if (!vendor) {
        setError("Credenciales inválidas o usuario inactivo")
        return { success: false, error: "Credenciales inválidas o usuario inactivo" }
      }

      // Crear objeto de sesión
      const session = {
        user: {
          id: vendor.id,
          email: vendor.email,
          name: vendor.name,
          role: "vendor" as const,
        },
        expires_at: new Date().getTime() + 7 * 24 * 60 * 60 * 1000, // 7 días
      }

      // Guardar sesión en localStorage
      localStorage.setItem("numix_session", JSON.stringify(session))

      // Para compatibilidad con código existente (temporal)
      localStorage.setItem("currentVendorEmail", vendor.email)
      
      // Asegurarse de que el email del vendedor esté disponible inmediatamente
      // para otras partes de la aplicación que lo necesiten
      console.log(`Sesión iniciada para: ${vendor.email}`)

      // Actualizar estado
      setUser(session.user)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al iniciar sesión"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Función para cerrar sesión
  const signOut = () => {
    localStorage.removeItem("numix_session")
    localStorage.removeItem("currentVendorEmail") // Para compatibilidad
    setUser(null)

    // Marcar que venimos de un cierre de sesión
    sessionStorage.setItem("fromLogout", "true")

    // Redirigir a la página de inicio
    router.push("/")
  }

  // Función para refrescar los datos del usuario
  const refreshUser = async () => {
    try {
      if (!user) return

      // Obtener datos actualizados del usuario desde Supabase
      const { data, error } = await supabase.from("vendors").select("*").eq("id", user.id).single()

      if (error || !data) {
        console.error("Error refreshing user data:", error)
        return
      }

      // Actualizar sesión con datos nuevos
      const session = getSession()
      if (session) {
        session.user = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: "vendor",
        }

        localStorage.setItem("numix_session", JSON.stringify(session))
        localStorage.setItem("currentVendorEmail", data.email) // Para compatibilidad

        setUser(session.user)
      }
    } catch (error) {
      console.error("Error in refreshUser:", error)
    }
  }

  // Cargar sesión al iniciar
  useEffect(() => {
    const loadSession = () => {
      setLoading(true)
      try {
        // Si estamos en el servidor, no hay sesión
        if (typeof window === "undefined") {
          setLoading(false)
          return
        }

        const session = getSession()
        if (session?.user) {
          setUser(session.user)
          
          // Asegurarse de que currentVendorEmail esté siempre sincronizado con la sesión
          // para mantener compatibilidad con el código existente
          if (session.user.email && session.user.role === "vendor") {
            localStorage.setItem("currentVendorEmail", session.user.email)
          }
        }
      } catch (error) {
        console.error("Error loading session:", error)
        setError("Error al cargar la sesión")
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  // Valor del contexto
  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

