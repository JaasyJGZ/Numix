import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { verifyPassword } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body.email as string
    const password = body.password as string

    if (!email || !password) {
      return NextResponse.json({ error: { message: "email y password son requeridos" } }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from("vendors")
      .select("*")
      .eq("email", email)
      .eq("active", true)
      .limit(1)

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: { message: "Vendedor no encontrado o inactivo" } }, { status: 404 })
    }

    const vendor = data[0]
    const isValid = await verifyPassword(password, vendor.password)
    if (!isValid) {
      return NextResponse.json({ error: { message: "Credenciales inválidas" } }, { status: 401 })
    }

    return NextResponse.json({ vendor }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}