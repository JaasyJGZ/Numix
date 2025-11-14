import type React from "react"
import { Montserrat } from "next/font/google"
import "@/styles/globals.css"
import { AuthProvider } from "@/lib/auth-context"
import ClientLayout from "@/components/client-layout"

// Configurar la fuente Montserrat con opciones optimizadas
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: true,
})

// Definir los metadatos de la aplicación
export const metadata = {
  title: "NUMIX - Sistema de Gestión de Sorteos",
  description: "Plataforma para la gestión de sorteos y vendedores",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="font-sans">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'