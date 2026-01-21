import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// GET /api/number-limits?eventId=UUID
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get("eventId")
    if (!eventId) {
      return NextResponse.json({ error: { message: "eventId es requerido" } }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from("number_limits")
      .select("*")
      .eq("event_id", eventId)
      .order("number_range", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ limits: data ?? [] }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

// POST /api/number-limits
// body: { eventId: string; numberRange: string; maxTimes: number }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventId, numberRange, maxTimes } = body || {}
    if (!eventId || !numberRange || typeof maxTimes !== 'number') {
      return NextResponse.json({ error: { message: "eventId, numberRange y maxTimes son requeridos" } }, { status: 400 })
    }

    // Upsert por (event_id, number_range)
    const { data: upserted, error } = await getSupabaseAdmin()
      .from("number_limits")
      .upsert({
        event_id: eventId,
        number_range: numberRange,
        max_times: maxTimes,
        times_sold: 0,
      }, { onConflict: "event_id,number_range" })
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ limit: upserted }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

// DELETE /api/number-limits?id=UUID
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: { message: "id es requerido" } }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from("number_limits")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}