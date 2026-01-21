import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }

function getServerLocalDateTime() {
  const now = new Date()
  const currentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  return { currentDate, currentTime }
}

// POST /api/events/auto-close
// Cierra eventos "active" cuyo end_date/end_time ya expiró.
// Acepta opcionalmente { currentDate, currentTime } en el body para usar hora local del cliente.
export async function POST(req: Request) {
  try {
    let provided: any = {}
    try {
      provided = await req.json()
    } catch {}
    const bodyDate: string | undefined = provided?.currentDate
    const bodyTime: string | undefined = provided?.currentTime
    const { currentDate, currentTime } = bodyDate && bodyTime ? { currentDate: bodyDate, currentTime: bodyTime } : getServerLocalDateTime()

    const supabase = getSupabaseAdmin()

    // Seleccionar eventos activos que ya expiraron respecto a currentDate/currentTime provistos,
    // usando únicamente la fecha y hora de fin (independiente de repeat_daily)
    const orCondition = [
      `and(end_date.lt.${currentDate})`,
      `and(end_date.eq.${currentDate},end_time.lte.${currentTime})`,
    ].join(",")
    const { data: expired, error } = await supabase
      .from("events")
      .select("id,status,active")
      .eq("active", true)
      .eq("status", "active")
      .or(orCondition)

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const idsToClose = (expired || []).map((e: any) => e.id)

    let updatedCount = 0
    if (idsToClose.length > 0) {
      const { error: updateErr, count } = await supabase
        .from("events")
        .update({ status: "closed_not_awarded" })
        .in("id", idsToClose)
        .select("id", { count: "exact" })

      if (updateErr) {
        return NextResponse.json({ error: { message: updateErr.message } }, { status: 500 })
      }
      updatedCount = count || idsToClose.length
    }

    return NextResponse.json({ closed: updatedCount, usedDate: currentDate, usedTime: currentTime }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}
