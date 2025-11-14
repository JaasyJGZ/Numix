import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST() {
  try {
    const now = new Date()
    // Usar fecha local en formato YYYY-MM-DD para evitar cierres prematuros por desfase UTC
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const currentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM (local)

    const admin = getSupabaseAdmin()

    // Buscar eventos activos expirados
    const { data: expiredEvents, error } = await admin
      .from("events")
      .select("id")
      .eq("status", "active")
      .or(`end_date.lt.${currentDate},and(end_date.eq.${currentDate},end_time.lte.${currentTime})`)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      return NextResponse.json({ closedCount: 0, closedIds: [] }, { status: 200 })
    }

    const ids = expiredEvents.map((e: any) => e.id)

    // Cerrar eventos expirados
    const { error: updateError } = await admin
      .from("events")
      .update({ status: "closed_not_awarded" })
      .in("id", ids)

    if (updateError) {
      return NextResponse.json({ error: { message: updateError.message } }, { status: 500 })
    }

    return NextResponse.json({ closedCount: ids.length, closedIds: ids }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}