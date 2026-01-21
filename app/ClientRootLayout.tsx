import type React from "react"
import { Montserrat } from "next/font/google"
import "@/styles/globals.css"
import { AuthProvider } from "@/lib/auth-context"

// Configurar la fuente Montserrat con opciones optimizadas
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap", // Usar 'swap' para mejor rendimiento
  variable: "--font-montserrat",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
})

// Componente de cliente para inicializar características del lado del cliente
function ClientInitializers({ children }: { children: React.ReactNode }) {
  "use client"

  // Importamos los componentes del cliente de forma dinámica para evitar errores de SSR
  const { default: ClientLayout } = require("@/components/client-layout")

  return <ClientLayout>{children}</ClientLayout>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={montserrat.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="font-sans">
        <AuthProvider>
          <ClientInitializers>{children}</ClientInitializers>
        </AuthProvider>
      </body>
    </html>
  )
}

