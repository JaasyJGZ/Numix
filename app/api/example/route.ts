import { NextResponse } from "next/server"

export async function GET() {
  const data = { message: "Hello World" }

  // Crear respuesta con encabezados de seguridad
  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      },
    },
  )
}

