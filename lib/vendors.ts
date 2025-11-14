import { supabase, getSupabaseAdmin } from "./supabase"
import type { Vendor } from "@/types"
import { hashPassword, verifyPassword } from "./auth"

// Convertir de formato Supabase a formato de la aplicación
const mapVendorFromSupabase = (vendor: any): Vendor => ({
  id: vendor.id,
  name: vendor.name,
  email: vendor.email,
  password: vendor.password,
  active: vendor.active,
})

// Obtener todos los vendedores
export async function getVendors(): Promise<Vendor[]> {
  try {
    console.log("Iniciando carga de vendedores desde Supabase...") // Debug
    
    // En servidor: usar cliente admin; en navegador: usar endpoint API
    const isServer = typeof window === "undefined"
    let vendors: Vendor[] = []

    if (isServer) {
      const client = getSupabaseAdmin()
      const { data, error } = await client
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching vendors (server):", {
          message: error.message,
          details: (error as any).details,
          code: (error as any).code,
          hint: (error as any).hint,
        })
        return []
      }

      console.log("Vendedores cargados desde Supabase (server):", data?.length || 0)
      vendors = (data ?? []).map(mapVendorFromSupabase)
    } else {
      try {
        const res = await fetch("/api/vendors", { method: "GET" })
        const json = await res.json()
        if (!res.ok) {
          console.error("Error fetching vendors via API (client):", json.error || json)
          // Fallback a localStorage
          const localVendors = localStorage.getItem("vendors")
          if (localVendors) {
            console.log("Usando vendedores desde localStorage (client)")
            return JSON.parse(localVendors)
          }
          return []
        }
        const data = json.vendors as any[]
        console.log("Vendedores cargados via API (client):", data?.length || 0)
        vendors = (data ?? []).map(mapVendorFromSupabase)
      } catch (err) {
        console.error("Excepción cargando vendedores via API (client):", err)
        // Fallback a localStorage
        const localVendors = localStorage.getItem("vendors")
        if (localVendors) {
          console.log("Usando vendedores desde localStorage (client)")
          return JSON.parse(localVendors)
        }
        return []
      }
    }
    
    // Actualizar localStorage con los datos de Supabase
    if (typeof window !== "undefined") {
      localStorage.setItem("vendors", JSON.stringify(vendors))
    }
    
    return vendors
  } catch (error) {
    console.error("Error in getVendors:", error)
    
    // Fallback a localStorage en caso de error
    if (typeof window !== "undefined") {
      const localVendors = localStorage.getItem("vendors")
      if (localVendors) {
        console.log("Usando vendedores desde localStorage debido a error")
        return JSON.parse(localVendors)
      }
    }
    return []
  }
}

// Crear un nuevo vendedor
export async function createVendor(vendor: Omit<Vendor, "id">): Promise<Vendor | null> {
  try {
    // Hash de la contraseña antes de almacenarla
    const hashedPassword = await hashPassword(vendor.password)
    
    // En servidor usar admin; en navegador llamar al endpoint
    if (typeof window === "undefined") {
      const { data, error } = await getSupabaseAdmin()
        .from("vendors")
        .insert([
          {
            name: vendor.name,
            email: vendor.email,
            password: hashedPassword,
            active: vendor.active,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating vendor:", error)
        return null
      }

      const newVendor = mapVendorFromSupabase(data)
      return newVendor
    }

    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: vendor.name,
        email: vendor.email,
        password: hashedPassword,
        active: vendor.active,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("Error creando vendedor via API:", json.error || json)
      return null
    }
    const newVendor = mapVendorFromSupabase(json.vendor)

    // Actualizar localStorage
    if (typeof window !== "undefined") {
      const localVendors = JSON.parse(localStorage.getItem("vendors") || "[]")
      localStorage.setItem("vendors", JSON.stringify([...localVendors, newVendor]))
    }

    return newVendor
  } catch (error) {
    console.error("Error in createVendor:", error)
    return null
  }
}

// Actualizar un vendedor existente
export async function updateVendor(vendor: Vendor): Promise<Vendor | null> {
  try {
    // Determinar si necesitamos hacer hash de la contraseña sin consulta previa
    const isHashed = typeof vendor.password === "string" && (vendor.password.startsWith("$2a$") || vendor.password.startsWith("$2b$"))
    const passwordToUpdate = isHashed ? vendor.password : await hashPassword(vendor.password)

    if (typeof window === "undefined") {
      const { data, error } = await getSupabaseAdmin()
        .from("vendors")
        .update({
          name: vendor.name,
          email: vendor.email,
          password: passwordToUpdate,
          active: vendor.active,
        })
        .eq("id", vendor.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating vendor:", error)
        return null
      }

      const updatedVendor = mapVendorFromSupabase(data)
      return updatedVendor
    }

    const res = await fetch("/api/vendors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        password: passwordToUpdate,
        active: vendor.active,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("Error actualizando vendedor via API:", json.error || json)
      return null
    }
    const updatedVendor = mapVendorFromSupabase(json.vendor)

    // Actualizar localStorage
    if (typeof window !== "undefined") {
      const localVendors = JSON.parse(localStorage.getItem("vendors") || "[]")
      const updatedLocalVendors = localVendors.map((v: Vendor) => (v.id === vendor.id ? updatedVendor : v))
      localStorage.setItem("vendors", JSON.stringify(updatedLocalVendors))
    }

    return updatedVendor
  } catch (error) {
    console.error("Error in updateVendor:", error)
    return null
  }
}

// Eliminar un vendedor
export async function deleteVendor(id: string): Promise<boolean> {
  try {
    if (typeof window === "undefined") {
      const { error } = await getSupabaseAdmin().from("vendors").delete().eq("id", id)
      if (error) {
        console.error("Error deleting vendor:", error)
        return false
      }
    } else {
      const res = await fetch(`/api/vendors?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        console.error("Error eliminando vendedor via API:", json.error || json)
        return false
      }
    }

    // Actualizar localStorage
    if (typeof window !== "undefined") {
      const localVendors = JSON.parse(localStorage.getItem("vendors") || "[]")
      const filteredVendors = localVendors.filter((v: Vendor) => v.id !== id)
      localStorage.setItem("vendors", JSON.stringify(filteredVendors))
    }

    return true
  } catch (error) {
    console.error("Error in deleteVendor:", error)
    return false
  }
}

// Verificar credenciales de vendedor (para login)
export async function verifyVendorCredentials(email: string, password: string): Promise<Vendor | null> {
  try {
    if (typeof window === "undefined") {
      const { data, error } = await getSupabaseAdmin()
        .from("vendors")
        .select("*")
        .eq("email", email)
        .eq("active", true)
        .limit(1)

      if (error || !data || data.length === 0) {
        console.log("No se encontró vendedor con ese email o está inactivo")
        return null
      }
      const isPasswordValid = await verifyPassword(password, data[0].password)
      if (!isPasswordValid) {
        console.log("Contraseña incorrecta")
        return null
      }
      return mapVendorFromSupabase(data[0])
    }

    const res = await fetch("/api/vendors/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.log("Credenciales inválidas o vendedor inactivo")
      return null
    }
    return mapVendorFromSupabase(json.vendor)
  } catch (error) {
    console.error("Error in verifyVendorCredentials:", error)
    return null
  }
}

