import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Clonar la respuesta para modificarla
  const response = NextResponse.next()

  // Obtener la ruta de la URL
  const pathname = request.nextUrl.pathname

  // Aplicar encabezados de seguridad a todas las respuestas
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  // Configurar encabezados de caché según el tipo de ruta
  if (pathname.startsWith("/_next/static")) {
    // Recursos estáticos de Next.js (JS, CSS)
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
  } else if (pathname.match(/\.(jpg|jpeg|png|webp|avif|gif|ico|svg)$/) || pathname.startsWith("/images/")) {
    // Imágenes y otros medios
    response.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=31536000")
  } else if (pathname.startsWith("/api/")) {
    // Rutas de API
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate")
  } else {
    // Páginas HTML y otras rutas
    response.headers.set("Cache-Control", "public, max-age=3600, must-revalidate")
  }

  return response
}

// Configurar en qué rutas se ejecutará el middleware
export const config = {
  matcher: [
    // Excluir archivos estáticos en la carpeta public
    "/((?!_next/static|favicon.ico).*)",
  ],
}

