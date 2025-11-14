import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.id || !body.numbers) {
      return NextResponse.json({ error: { message: "Faltan parámetros 'id' y 'numbers'" } }, { status: 400 })
    }

    const { id, numbers, awardedAt } = body as {
      id: string
      numbers: { firstPrize: string; secondPrize: string; thirdPrize: string }
      awardedAt?: string
    }

    const now = awardedAt || new Date().toISOString()

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from("events")
      .update({
        status: "closed_awarded",
        first_prize: numbers.firstPrize,
        second_prize: numbers.secondPrize,
        third_prize: numbers.thirdPrize,
        awarded_at: now,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: data }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}