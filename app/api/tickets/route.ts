import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get("eventId")
    const vendorEmail = url.searchParams.get("vendorEmail")
    if (!eventId || !vendorEmail) {
      return NextResponse.json({ error: { message: "eventId y vendorEmail son requeridos" } }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from("tickets")
      .select("*")
      .eq("event_id", eventId)
      .eq("vendor_email", vendorEmail)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ tickets: data ?? [] }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { ticketId, eventId, vendorEmail, ticket } = body || {}
    if (!ticketId || !eventId || !vendorEmail) {
      return NextResponse.json({ error: { message: "ticketId, eventId y vendorEmail son requeridos" } }, { status: 400 })
    }

    // Construir el objeto JSONB esperado por el RPC
    const newTicketData = {
      id: ticketId,
      event_id: eventId,
      client_name: ticket?.clientName,
      amount: ticket?.amount,
      numbers: ticket?.numbers,
      vendor_email: ticket?.vendorEmail ?? vendorEmail ?? "unknown",
      rows: Array.isArray(ticket?.rows) ? ticket?.rows : ticket?.rows,
    }

    const { data, error } = await getSupabaseAdmin().rpc('update_ticket_with_decrements', {
      p_ticket_id: ticketId,
      p_event_id: eventId,
      p_vendor_email: vendorEmail,
      p_new_ticket_data: newTicketData,
    })

    if (error) {
      // Fallback: realizar actualización manual cuando falle el RPC
      try {
        // 1) Obtener ticket original
        const { data: originalTicket, error: origErr } = await getSupabaseAdmin()
          .from('tickets')
          .select('id, event_id, vendor_email, rows')
          .eq('id', ticketId)
          .eq('event_id', eventId)
          .single()

        if (origErr || !originalTicket) {
          return NextResponse.json(
            { error: { message: origErr?.message || 'Ticket no encontrado' } },
            { status: 404 }
          )
        }

        // Permisos: permitir "unknown" para compatibilidad
        if (originalTicket.vendor_email !== vendorEmail && originalTicket.vendor_email !== 'unknown') {
          return NextResponse.json(
            { error: { message: 'No autorizado: ticket pertenece a otro vendedor' } },
            { status: 403 }
          )
        }

        // 2) Cargar todos los límites del evento una sola vez
        const { data: limits, error: limitsErr } = await getSupabaseAdmin()
          .from('number_limits')
          .select('id, event_id, number_range, max_times, times_sold')
          .eq('event_id', eventId)

        if (limitsErr) {
          return NextResponse.json(
            { error: { message: limitsErr.message } },
            { status: 500 }
          )
        }

        const originalRows = Array.isArray(originalTicket.rows)
          ? originalTicket.rows
          : (() => { try { return JSON.parse((originalTicket.rows as any) || '[]') } catch { return [] } })()

        const newRows = Array.isArray(newTicketData.rows)
          ? newTicketData.rows
          : (() => { try { return JSON.parse((newTicketData.rows as any) || '[]') } catch { return [] } })()

        // Utilidad: elegir el límite que aplica a un número/rango
        const pickMatchingLimit = (action: string) => {
          const isNumeric = /^\d+$/.test(action)
          const candidates = (limits || []).filter(l => {
            if (l.number_range === action) return true // exacto
            const isLimitNumeric = /^\d+$/.test(l.number_range)
            const isLimitRange = l.number_range.includes('-')
            if (isNumeric && isLimitRange) {
              const [a, b] = l.number_range.split('-').map(n => parseInt(n, 10))
              const n = parseInt(action, 10)
              return Number.isFinite(a) && Number.isFinite(b) && n >= a && n <= b
            }
            if (isNumeric && isLimitNumeric) {
              const base = parseInt(l.number_range, 10)
              const n = parseInt(action, 10)
              return Number.isFinite(base) && n >= base && n <= base + 9 // decena
            }
            return false
          })
          // Priorizar exacto > rango > decena
          candidates.sort((x, y) => {
            const score = (s: string) => s === action ? 3 : (s.includes('-') ? 2 : 1)
            return score(y.number_range) - score(x.number_range)
          })
          return candidates[0] || null
        }

        // 3) Preparar mapas de tiempos originales y nuevos
        const origMap = new Map<string, number>()
        for (const row of originalRows || []) {
          const action = String(row?.actions || '')
          const t = parseInt(String(row?.times || '0'), 10)
          if (action && Number.isFinite(t) && t > 0) {
            origMap.set(action, (origMap.get(action) || 0) + t)
          }
        }
        const newMap = new Map<string, number>()
        for (const row of newRows || []) {
          const action = String(row?.actions || '')
          const t = parseInt(String(row?.times || '0'), 10)
          if (action && Number.isFinite(t) && t > 0) {
            newMap.set(action, (newMap.get(action) || 0) + t)
          }
        }

        // 4) Calcular decrecimientos e incrementos necesarios
        const decrements: Array<{ action: string; amount: number; limit: any }> = []
        const increments: Array<{ action: string; amount: number; limit: any }> = []

        // Decrements: acciones presentes en original que disminuyen o se eliminan
        for (const [action, origTimes] of origMap.entries()) {
          const newTimes = newMap.get(action) || 0
          const diff = origTimes - newTimes
          if (diff > 0) {
            const limit = pickMatchingLimit(action)
            if (limit) {
              decrements.push({ action, amount: diff, limit })
            }
          }
        }

        // Increments: acciones que aumentan o aparecen nuevas
        for (const [action, newTimes] of newMap.entries()) {
          const origTimes = origMap.get(action) || 0
          const diff = newTimes - origTimes
          if (diff > 0) {
            const limit = pickMatchingLimit(action)
            if (limit) {
              increments.push({ action, amount: diff, limit })
            }
          }
        }

        // 5) Validación previa: todos los incrementos deben caber en sus límites
        for (const inc of increments) {
          const current = inc.limit.times_sold || 0
          const max = inc.limit.max_times || 0
          const candidate = current + inc.amount
          if (candidate > max) {
            return NextResponse.json(
              {
                success: false,
                status: 'warning',
                message: `Límite excedido para el número ${inc.action}`,
                numberInfo: { number: inc.action, remaining: Math.max(0, max - current), requested: inc.amount },
              },
              { status: 409 }
            )
          }
        }

        // 6) Aplicar decrecimientos
        for (const dec of decrements) {
          const current = dec.limit.times_sold || 0
          const newTimesSold = Math.max(0, current - dec.amount)
          const { error: updErr } = await getSupabaseAdmin()
            .from('number_limits')
            .update({ times_sold: newTimesSold })
            .eq('id', dec.limit.id)
          if (updErr) {
            console.error('Fallo decrementando límite (fallback PUT)', { limitId: dec.limit.id, action: dec.action, amount: dec.amount, error: updErr.message })
          } else {
            // mantener sincronizado el snapshot en memoria para incrementos posteriores
            dec.limit.times_sold = newTimesSold
          }
        }

        // 7) Aplicar incrementos
        for (const inc of increments) {
          const current = inc.limit.times_sold || 0
          const max = inc.limit.max_times || 0
          const newTimesSold = current + inc.amount
          if (newTimesSold > max) {
            // No debería ocurrir por la validación previa, pero por seguridad
            return NextResponse.json(
              {
                success: false,
                status: 'warning',
                message: `Límite excedido para el número ${inc.action}`,
                numberInfo: { number: inc.action, remaining: Math.max(0, max - current), requested: inc.amount },
              },
              { status: 409 }
            )
          }
          const { error: updErr } = await getSupabaseAdmin()
            .from('number_limits')
            .update({ times_sold: newTimesSold })
            .eq('id', inc.limit.id)
          if (updErr) {
            console.error('Fallo incrementando límite (fallback PUT)', { limitId: inc.limit.id, action: inc.action, amount: inc.amount, error: updErr.message })
            return NextResponse.json(
              {
                success: false,
                status: 'error',
                message: `No se pudo incrementar el contador para ${inc.action}`,
              },
              { status: 500 }
            )
          } else {
            inc.limit.times_sold = newTimesSold
          }
        }

        // 8) Actualizar el ticket con los nuevos datos
        const { error: updTicketErr } = await getSupabaseAdmin()
          .from('tickets')
          .update({
            client_name: newTicketData.client_name,
            amount: newTicketData.amount,
            numbers: newTicketData.numbers,
            rows: newRows,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId)

        if (updTicketErr) {
          return NextResponse.json(
            { error: { message: updTicketErr.message } },
            { status: 500 }
          )
        }

        // Obtener ticket actualizado
        const { data: updatedTicket, error: fetchError } = await getSupabaseAdmin()
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single()

        if (fetchError) {
          return NextResponse.json(
            { error: { message: fetchError.message } },
            { status: 500 }
          )
        }

        return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
      } catch (fallbackErr) {
        console.error('Error en fallback PUT /api/tickets:', fallbackErr)
        return NextResponse.json(
          { error: { message: (fallbackErr as any)?.message || 'Error al actualizar ticket (fallback)' } },
          { status: 500 }
        )
      }
    }

    // Obtener ticket actualizado
    const { data: updatedTicket, error: fetchError } = await getSupabaseAdmin()
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: { message: fetchError.message, details: (fetchError as any).details, hint: (fetchError as any).hint, code: (fetchError as any).code } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const url = new URL(req.url)
    const ticketId = body?.ticketId || url.searchParams.get('ticketId')
    const eventId = body?.eventId || url.searchParams.get('eventId')
    const vendorEmail = body?.vendorEmail || url.searchParams.get('vendorEmail')

    if (!ticketId || !eventId || !vendorEmail) {
      return NextResponse.json({ error: { message: "ticketId, eventId y vendorEmail son requeridos" } }, { status: 400 })
    }

    // 1) Obtener el ticket para validar y leer sus filas
    const { data: ticket, error: ticketErr } = await getSupabaseAdmin()
      .from('tickets')
      .select('id, event_id, vendor_email, rows')
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .single()

    if (ticketErr || !ticket) {
      return NextResponse.json(
        { error: { message: ticketErr?.message || 'Ticket no encontrado' } },
        { status: 404 }
      )
    }

    // Permisos: permitir "unknown" para compatibilidad
    if (ticket.vendor_email !== vendorEmail && ticket.vendor_email !== 'unknown') {
      return NextResponse.json(
        { error: { message: 'No autorizado: ticket pertenece a otro vendedor' } },
        { status: 403 }
      )
    }

    // 2) Cargar todos los límites del evento una sola vez
    const { data: limits, error: limitsErr } = await getSupabaseAdmin()
      .from('number_limits')
      .select('id, event_id, number_range, max_times, times_sold')
      .eq('event_id', eventId)

    if (limitsErr) {
      return NextResponse.json(
        { error: { message: limitsErr.message } },
        { status: 500 }
      )
    }

    const rows = Array.isArray(ticket.rows) ? ticket.rows : (() => {
      try { return JSON.parse((ticket.rows as any) || '[]') } catch { return [] }
    })()

    // Utilidad: elegir el límite que aplica a un número/rango
    const pickMatchingLimit = (action: string) => {
      const isNumeric = /^\d+$/.test(action)
      const candidates = (limits || []).filter(l => {
        if (l.number_range === action) return true // exacto
        const isLimitNumeric = /^\d+$/.test(l.number_range)
        const isLimitRange = l.number_range.includes('-')
        if (isNumeric && isLimitRange) {
          const [a, b] = l.number_range.split('-').map(n => parseInt(n, 10))
          const n = parseInt(action, 10)
          return Number.isFinite(a) && Number.isFinite(b) && n >= a && n <= b
        }
        if (isNumeric && isLimitNumeric) {
          const base = parseInt(l.number_range, 10)
          const n = parseInt(action, 10)
          return Number.isFinite(base) && n >= base && n <= base + 9 // decena
        }
        return false
      })
      // Priorizar exacto > rango > decena
      candidates.sort((x, y) => {
        const score = (s: string) => s === action ? 3 : (s.includes('-') ? 2 : 1)
        return score(y.number_range) - score(x.number_range)
      })
      return candidates[0] || null
    }

    // 3) Decrementar por cada fila con límite encontrado
    for (const row of rows || []) {
      const action = row?.actions
      const times = parseInt(row?.times, 10)
      if (!action || !Number.isFinite(times) || times <= 0) continue

      const match = pickMatchingLimit(String(action))
      if (!match) continue // sin límite aplicable

      const newTimesSold = Math.max(0, (match.times_sold || 0) - times)
      const { error: updErr } = await getSupabaseAdmin()
        .from('number_limits')
        .update({ times_sold: newTimesSold })
        .eq('id', match.id)

      if (updErr) {
        // Si falla el decremento, registrar pero continuar para intentar borrar el ticket
        console.error('Fallo decrementando límite', { limitId: match.id, action, times, error: updErr.message })
      }
    }

    // 4) Eliminar el ticket
    const { error: delErr } = await getSupabaseAdmin()
      .from('tickets')
      .delete()
      .eq('id', ticketId)

    if (delErr) {
      return NextResponse.json(
        { error: { message: delErr.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: { message: err.message, stack: err.stack } }, { status: 500 })
  }
}