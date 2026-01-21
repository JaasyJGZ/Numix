import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.id) {
      return NextResponse.json({ error: { message: "Falta parámetro 'id'" } }, { status: 400 })
    }

    const { id } = body as { id: string }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from("events").delete().eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}