import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
/**
 * POST /api/events/update
 * Actualiza un evento existente usando service role (seguro desde cliente)
 * Body esperado:
 * {
 *   id: string,
 *   name: string,
 *   start_date: string,
 *   end_date: string,
 *   start_time: string,
 *   end_time: string,
 *   active?: boolean,
 *   repeat_daily?: boolean,
 *   status: "active" | "closed_awarded" | "closed_not_awarded" | "closed_pending",
 *   first_prize?: string | null,
 *   second_prize?: string | null,
 *   third_prize?: string | null,
 *   awarded_at?: string | null
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = body?.id
    if (!id) {
      return NextResponse.json({ error: { message: "Falta id del evento" } }, { status: 400 })
    }
    const allowedStatus = new Set(["active", "closed_awarded", "closed_not_awarded", "closed_pending"])
    const status = typeof body.status === "string" && allowedStatus.has(body.status) ? body.status : "active"
    const supabaseEvent = {
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      start_time: body.start_time,
      end_time: body.end_time,
      active: body.active ?? true,
      repeat_daily: body.repeat_daily ?? false,
      status,
      first_prize: body.first_prize ?? null,
      second_prize: body.second_prize ?? null,
      third_prize: body.third_prize ?? null,
      awarded_at: body.awarded_at ?? null,
    }
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from("events")
      .update(supabaseEvent)
      .eq("id", id)
      .select("*")
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
        { status: 500 },
      )
    }
    return NextResponse.json({ event: data }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}
