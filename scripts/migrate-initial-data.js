// Este script se puede ejecutar con Node.js para migrar los datos iniciales a Supabase
// Ejecutar con: node scripts/migrate-initial-data.js

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import bcrypt from "bcryptjs"

// Cargar variables de entorno desde .env.local
require("dotenv").config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Variables de entorno de Supabase no encontradas")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateVendors() {
  try {
    // Leer vendedores del archivo local (si existe)
    let vendors = []
    const vendorsPath = path.join(process.cwd(), "data", "vendors.json")

    if (fs.existsSync(vendorsPath)) {
      const data = fs.readFileSync(vendorsPath, "utf8")
      vendors = JSON.parse(data)
    } else {
      // Usar datos de ejemplo si no hay archivo
      vendors = [
        {
          id: "1",
          name: "Oxslin",
          email: "oxsportshop@gmail.com",
          password: "password123",
          active: true,
        },
        {
          id: "2",
          name: "Vendor 2",
          email: "vendor2@example.com",
          password: "password2",
          active: false,
        },
      ]
    }

    // Hashear contraseñas antes de insertar
    const vendorsWithHashedPasswords = await Promise.all(
      vendors.map(async (vendor) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        password: await bcrypt.hash(vendor.password, 12), // Hash la contraseña
        active: vendor.active,
      }))
    )

    // Insertar vendedores en Supabase
    const { data, error } = await supabase
      .from("vendors")
      .upsert(vendorsWithHashedPasswords)
      .select()

    if (error) {
      throw error
    }

    console.log(`Migrados ${vendors.length} vendedores a Supabase`)
    return data
  } catch (error) {
    console.error("Error migrando vendedores:", error)
    return null
  }
}

async function migrateEvents() {
  try {
    // Leer eventos del archivo local (si existe)
    let events = []
    const eventsPath = path.join(process.cwd(), "data", "events.json")

    if (fs.existsSync(eventsPath)) {
      const data = fs.readFileSync(eventsPath, "utf8")
      events = JSON.parse(data)
    } else {
      // Usar datos de ejemplo si no hay archivo
      events = []
    }

    // Insertar eventos en Supabase
    const { data, error } = await supabase
      .from("events")
      .upsert(
        events.map((event) => ({
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
        })),
      )
      .select()

    if (error) {
      throw error
    }

    console.log(`Migrados ${events.length} eventos a Supabase`)
    return data
  } catch (error) {
    console.error("Error migrando eventos:", error)
    return null
  }
}

async function main() {
  console.log("Iniciando migración de datos a Supabase...")

  // Ejecutar script SQL para crear tablas y políticas
  const sqlScript = fs.readFileSync(path.join(process.cwd(), "schema.sql"), "utf8")
  const { error: sqlError } = await supabase.rpc("exec_sql", { sql: sqlScript })

  if (sqlError) {
    console.error("Error ejecutando script SQL:", sqlError)
    return
  }

  // Migrar datos
  await migrateVendors()
  await migrateEvents()

  console.log("Migración completada con éxito")
}

main().catch(console.error)

