"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EyeOff, Eye, ArrowLeft } from "lucide-react"
import type React from "react" // Importación añadida para React

export default function SuperUserLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const storedName = localStorage.getItem("superUserName") || "prueba"
    const storedPassword = localStorage.getItem("superUserPassword") || "12345"

    if (username === storedName && password === storedPassword) {
      router.push("/super-usuario/dashboard")
    } else {
      setError("Credenciales inválidas")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary/5 to-secondary/10 text-foreground flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md relative">
        <div className="flex justify-center mb-8">
          <Button
            onClick={() => router.push("/")}
            className="bg-transparent hover:bg-primary/10 rounded-full p-2"
            variant="ghost"
          >
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-center mb-8 gradient-text">
          Super Usuario
        </h1>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && <div className="text-destructive text-center">{error}</div>}

          <div className="space-y-2">
            <label htmlFor="username" className="text-lg font-bold text-foreground">
              Usuario
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-14 bg-background/80 border border-border rounded-xl text-lg text-foreground backdrop-blur-sm"
              required
              autoComplete="username"
              name="username"
              aria-label="Nombre de usuario"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-lg font-bold text-foreground">
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-background/80 border border-border rounded-xl text-lg pr-12 text-foreground backdrop-blur-sm"
                required
                autoComplete="current-password"
                name="password"
                aria-label="Contraseña de administrador"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground transition-all"
          >
            {isLoading ? "Verificando..." : "Acceder"}
          </Button>
        </form>
      </div>
    </div>
  )
}

