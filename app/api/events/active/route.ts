import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// GET /api/events/active?date=YYYY-MM-DD
// Devuelve eventos activos cuya fecha de inicio o fin coincide con la fecha dada
// y que aún no han terminado acorde a end_date + end_time
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const date = url.searchParams.get("date")
    if (!date) {
      return NextResponse.json({ error: { message: "Parámetro 'date' es requerido" } }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Obtiene eventos que coinciden con la fecha de inicio o fin y están marcados activos/"active"
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("active", true)
      .eq("status", "active")
      // Incluir también los sorteos diarios, sin depender de end_date
      .or(`end_date.eq.${date},start_date.eq.${date},repeat_daily.eq.true`)

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    // No filtrar por "now" en el servidor para evitar efectos por zona horaria.
    // La clasificación active/closed se realiza en el cliente con parseo local.
    // Para repeat_daily, el cierre automático se determina por hora del día actual.
    return NextResponse.json({ events }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}