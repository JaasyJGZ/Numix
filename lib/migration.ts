import { supabase } from "./supabase"
import type { Vendor, Event } from "@/types"
import { hashPassword } from "./auth"
import { generateUUID } from "./utils" // Assuming generateUUID is imported from utils

// Migrar vendedores de localStorage a Supabase
export async function migrateVendors(): Promise<boolean> {
  try {
    // Obtener vendedores de localStorage
    const localVendors = JSON.parse(localStorage.getItem("vendors") || "[]")

    if (localVendors.length === 0) {
      console.log("No vendors to migrate")
      return true
    }

    // Preparar datos para Supabase con contraseñas hasheadas
    const supabaseVendors = await Promise.all(
      localVendors.map(async (vendor: Vendor) => {
        // Hash la contraseña antes de migrarla
        const hashedPassword = await hashPassword(vendor.password)

        return {
          id: generateUUID(), // Reemplazado con generateUUID()
          name: vendor.name,
          email: vendor.email,
          password: hashedPassword, // Usar la contraseña hasheada
          active: vendor.active,
        }
      }),
    )

    // Insertar en Supabase (upsert para evitar duplicados)
    const { error } = await supabase.from("vendors").upsert(supabaseVendors, { onConflict: "id" })

    if (error) {
      console.error("Error migrating vendors:", error)
      return false
    }

    console.log("Vendors migrated successfully")
    return true
  } catch (error) {
    console.error("Error in migrateVendors:", error)
    return false
  }
}

// Migrar eventos de localStorage a Supabase
export async function migrateEvents(): Promise<boolean> {
  try {
    // Obtener eventos de localStorage
    const localEvents = JSON.parse(localStorage.getItem("events") || "[]")

    if (localEvents.length === 0) {
      console.log("No events to migrate")
      return true
    }

    // Preparar datos para Supabase
    const supabaseEvents = localEvents.map((event: Event) => ({
      id: event.id,
      name: event.name,
      start_date: event.startDate,
      end_date: event.endDate,
      start_time: event.startTime,
      end_time: event.endTime,
      active: event.active,
      repeat_daily: event.repeatDaily || false,
      status: event.status || "active",
      first_prize: event.awardedNumbers?.firstPrize,
      second_prize: event.awardedNumbers?.secondPrize,
      third_prize: event.awardedNumbers?.thirdPrize,
      awarded_at: event.awardedNumbers?.awardedAt,
    }))

    // Insertar en Supabase (upsert para evitar duplicados)
    const { error } = await supabase.from("events").upsert(supabaseEvents, { onConflict: "id" })

    if (error) {
      console.error("Error migrating events:", error)
      return false
    }

    console.log("Events migrated successfully")
    return true
  } catch (error) {
    console.error("Error in migrateEvents:", error)
    return false
  }
}

// Actualizar la función migrateTickets para usar el formato correcto
export async function migrateTickets(): Promise<boolean> {
  try {
    // Obtener todos los eventos
    const events = JSON.parse(localStorage.getItem("events") || "[]")
    const currentVendorEmail = localStorage.getItem("currentVendorEmail")

    if (!currentVendorEmail) {
      console.log("No se encontró email de vendedor actual para migrar tickets")
      return false
    }

    for (const event of events) {
      // Verificar si existe el formato antiguo
      const oldTicketsKey = `tickets_${event.id}`
      const oldTickets = localStorage.getItem(oldTicketsKey)

      if (oldTickets) {
        console.log(`Migrando tickets del evento ${event.id} al nuevo formato`)

        // Obtener tickets en formato antiguo
        const tickets = JSON.parse(oldTickets)

        // Añadir el campo vendorEmail a los tickets que no lo tienen
        const migratedTickets = tickets.map((ticket) => {
          if (!ticket.vendorEmail) {
            return {
              ...ticket,
              vendorEmail: currentVendorEmail,
            }
          }
          return ticket
        })

        // Guardar en el nuevo formato
        const newTicketsKey = `tickets_${event.id}_${currentVendorEmail}`
        localStorage.setItem(newTicketsKey, JSON.stringify(migratedTickets))

        // Eliminar el formato antiguo
        localStorage.removeItem(oldTicketsKey)

        console.log(`Migración completada para el evento ${event.id}`)
      }
    }

    return true
  } catch (error) {
    console.error("Error migrando tickets:", error)
    return false
  }
}

// Añadir función para migrar tickets a Supabase
export async function migrateTicketsToSupabase(): Promise<boolean> {
  try {
    // Obtener todos los eventos
    const events = JSON.parse(localStorage.getItem("events") || "[]")

    for (const event of events) {
      // Obtener tickets del evento
      const currentVendorEmail = localStorage.getItem("currentVendorEmail")
      const tickets = JSON.parse(localStorage.getItem(`tickets_${event.id}_${currentVendorEmail}`) || "[]")

      if (tickets.length === 0) continue

      console.log(`Migrando ${tickets.length} tickets del evento ${event.id}`)

      // Preparar datos para Supabase
      const supabaseTickets = tickets.map((ticket: any) => ({
        id: ticket.id,
        event_id: event.id,
        client_name: ticket.clientName,
        amount: ticket.amount,
        numbers: ticket.numbers || "",
        vendor_email: ticket.vendorEmail || "unknown",
        rows: ticket.rows || [],
        created_at: new Date().toISOString(),
      }))

      // Insertar en Supabase (upsert para evitar duplicados)
      const { error } = await supabase.from("tickets").upsert(supabaseTickets, { onConflict: "id" })

      if (error) {
        console.error(`Error migrando tickets del evento ${event.id}:`, error)
        return false
      }

      console.log(`Tickets del evento ${event.id} migrados correctamente`)
    }

    return true
  } catch (error) {
    console.error("Error en migrateTicketsToSupabase:", error)
    return false
  }
}

// Actualizar migrateAllData para incluir la migración de tickets a Supabase
export async function migrateAllData(): Promise<boolean> {
  const vendorsMigrated = await migrateVendors()
  const eventsMigrated = await migrateEvents()
  const ticketsMigrated = await migrateTickets()
  const ticketsToSupabaseMigrated = await migrateTicketsToSupabase()

  return vendorsMigrated && eventsMigrated && ticketsMigrated && ticketsToSupabaseMigrated
}

