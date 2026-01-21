import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type TicketRow = {
  actions: string // número
  times: string // cantidad como string
}

type TicketInput = {
  id: string
  clientName: string
  amount: number
  numbers?: string
  vendorEmail: string
  rows: TicketRow[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventId, ticket } = body as { eventId: string; ticket: TicketInput }

    if (!eventId || !ticket || !ticket.vendorEmail) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    // Consolidar cantidades por número
    const numbersMap = new Map<string, number>()
    for (const row of ticket.rows || []) {
      const times = parseInt(row.times, 10)
      if (row.actions && Number.isFinite(times) && times > 0) {
        numbersMap.set(row.actions, (numbersMap.get(row.actions) || 0) + times)
      }
    }

    // Verificar disponibilidad de todos los números
    const checks: Array<{ number: string; requested: number; remaining: number; available: boolean; limit_id?: string }> = []
    for (const [number, requested] of numbersMap.entries()) {
      const { data: checkData, error: checkError } = await supabaseAdmin.rpc("numix_check_available", {
        p_event_id: eventId,
        p_number_range: number,
        p_requested_amount: requested,
      })

      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }

      const available = !!checkData?.available
      const remaining = typeof checkData?.remaining === "number" ? checkData.remaining : null
      const limitId = checkData?.limit_id as string | undefined
      checks.push({ number, requested, remaining: remaining ?? Infinity, available, limit_id: limitId })

      // Log de verificación para diagnóstico de incrementos inesperados
      console.debug('[tickets:create] check disponibilidad', {
        number,
        requested,
        available,
        remaining,
        limitId,
      })

      if (!available) {
        return NextResponse.json(
          {
            success: false,
            status: "warning",
            message: `Límite excedido para el número ${number}`,
            numberInfo: { number, remaining: remaining ?? 0, requested },
          },
          { status: 409 }
        )
      }
    }

    // Ejecutar incrementos (por cada número con límite)
    const appliedIncrements: Array<{ number: string; increment: number; limitId: string }> = []
    for (const check of checks) {
      if (!check.limit_id) continue // Sin límite -> sin incremento

      console.debug('[tickets:create] aplicando incremento', {
        number: check.number,
        increment: check.requested,
        limitId: check.limit_id,
      })

      // Obtener max_times para el límite
      const { data: limitRes, error: limitErr } = await supabaseAdmin.rpc("numix_get_limit", {
        p_event_id: eventId,
        p_number_range: check.number,
      })
      if (limitErr) {
        // revertir lo aplicado hasta ahora
        for (const inc of appliedIncrements) {
          await supabaseAdmin.rpc("numix_decrement", {
            p_event_id: eventId,
            p_number_range: inc.number,
            p_decrement: inc.increment,
          })
        }
        return NextResponse.json({ error: limitErr.message }, { status: 500 })
      }

      const maxTimes = limitRes?.data?.max_times as number | undefined
      const limitId = check.limit_id
      if (!limitId || typeof maxTimes !== "number") {
        continue
      }

      const { data: incRes, error: incErr } = await supabaseAdmin.rpc("numix_increment", {
        p_limit_id: limitId,
        p_increment: check.requested,
        p_max_times: maxTimes,
      })
      if (incErr || incRes !== true) {
        // revertir lo aplicado hasta ahora
        for (const inc of appliedIncrements) {
          await supabaseAdmin.rpc("numix_decrement", {
            p_event_id: eventId,
            p_number_range: inc.number,
            p_decrement: inc.increment,
          })
        }
        return NextResponse.json(
          {
            success: false,
            status: "error",
            message: incErr?.message || `No se pudo incrementar el número ${check.number}`,
          },
          { status: 409 }
        )
      }
      appliedIncrements.push({ number: check.number, increment: check.requested, limitId })
    }

    // Insertar el ticket
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from("tickets")
      .insert({
        id: ticket.id,
        event_id: eventId,
        client_name: ticket.clientName,
        amount: ticket.amount,
        numbers: ticket.numbers || "",
        vendor_email: ticket.vendorEmail,
        rows: ticket.rows,
      })
      .select()
      .single()

    if (insertErr) {
      // revertir incrementos si falla inserción
      for (const inc of appliedIncrements) {
        await supabaseAdmin.rpc("numix_decrement", {
          p_event_id: eventId,
          p_number_range: inc.number,
          p_decrement: inc.increment,
        })
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    console.debug('[tickets:create] ticket creado', { ticketId: ticket.id, eventId, appliedIncrements })

    return NextResponse.json({ success: true, ticket: insertData }, { status: 201 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}