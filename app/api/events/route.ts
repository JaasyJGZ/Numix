import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          error: {
            message: error.message,
            details: error.details,
            hint: (error as any).hint,
            code: error.code,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ events: data ?? [] }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json(
      { error: { message: err.message, stack: err.stack } },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabaseEvent = {
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      start_time: body.start_time,
      end_time: body.end_time,
      active: body.active ?? true,
      repeat_daily: body.repeat_daily ?? false,
      price_per_time: body.price_per_time ?? 0.20,
      status: body.status ?? "active",
      first_prize: body.first_prize ?? null,
      second_prize: body.second_prize ?? null,
      third_prize: body.third_prize ?? null,
      awarded_at: body.awarded_at ?? null,
    }

    // Normalizar y validar price_per_time a los valores permitidos (0.20, 0.25)
    const allowedPrices = [0.20, 0.25]
    const price = Number(supabaseEvent.price_per_time)
    supabaseEvent.price_per_time = allowedPrices.includes(price) ? price : 0.20

    const { data, error } = await getSupabaseAdmin()
      .from("events")
      .insert([supabaseEvent])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          error: {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ event: data }, { status: 201 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json(
      { error: { message: err.message, stack: err.stack } },
      { status: 500 }
    )
  }
}