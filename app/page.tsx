"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeOff, Eye, User } from "lucide-react"
import { verifyVendorCredentials } from "@/lib/vendors"
import type React from "react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Primero intentar con el sistema nuevo (Supabase)
      const vendor = await verifyVendorCredentials(username, password)
      
      if (vendor) {
        // Guardar información del vendedor logueado
        localStorage.setItem("currentVendorEmail", vendor.email)
        localStorage.setItem("currentVendorId", vendor.id)
        localStorage.setItem("currentVendorName", vendor.name)
        
        if (rememberMe) {
          localStorage.setItem("rememberVendor", "true")
          localStorage.setItem("vendorUsername", username)
        }
        
        router.push("/vendedor")
        return
      }
      
      // Fallback: sistema legacy para compatibilidad
      const storedName = localStorage.getItem("vendorName") || "vendedor"
      const storedPassword = localStorage.getItem("vendorPassword") || "123"

      if (username === storedName && password === storedPassword) {
        if (rememberMe) {
          localStorage.setItem("rememberVendor", "true")
          localStorage.setItem("vendorUsername", username)
        }
        router.push("/vendedor")
      } else {
        setError("Credenciales inválidas")
      }
    } catch (error) {
      console.error("Error durante el login:", error)
      setError("Error al verificar credenciales")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary/5 to-secondary/10 text-foreground flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Icono de Super Usuario en esquina superior izquierda */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          onClick={() => router.push("/super-usuario")}
          className="bg-background/80 hover:bg-background/90 rounded-full p-3 shadow-lg backdrop-blur-sm border border-border/50"
          variant="ghost"
          title="Panel de Super Usuario"
        >
          <User className="h-5 w-5 text-primary" />
        </Button>
      </div>

      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo NUMIX */}
        <div className="text-center mb-12">
          <h1 className="text-[15vw] sm:text-[10vw] md:text-[8vw] font-bold leading-none tracking-tight mx-auto animate-pulse-slow gradient-text">
            NUMIX
          </h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {error && <div className="text-destructive text-center font-medium">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="username" className="text-lg font-bold text-foreground">
              Email
            </label>
            <Input
              id="username"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-14 bg-background/80 border border-border rounded-xl text-lg text-foreground placeholder-muted-foreground focus:bg-background/90 focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              name="username"
              aria-label="Email del vendedor"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-lg font-bold text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-background/80 border border-border rounded-xl text-lg pr-12 text-foreground placeholder-muted-foreground focus:bg-background/90 focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
                name="password"
                aria-label="Contraseña"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              disabled={isLoading}
            />
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              Recordarme
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Iniciando..." : "Iniciar Sesión"}
          </Button>
        </form>
      </div>
    </div>
  )
}

