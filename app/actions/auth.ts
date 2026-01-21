"use server"

import { verifyVendorCredentials } from "@/lib/vendors"

export async function handleLogin(email: string, password: string) {
  try {
    const vendor = await verifyVendorCredentials(email, password)

    if (vendor) {
      // Guardar el email del vendedor en localStorage
      // Nota: Esto se ejecuta en el servidor, así que necesitamos asegurarnos
      // de que el cliente también lo guarde
      return {
        success: true,
        email: email, // Devolver el email para que el cliente lo guarde
      }
    } else {
      // Credenciales inválidas o usuario inactivo
      return { success: false, error: "Credenciales inválidas o usuario inactivo" }
    }
  } catch (error) {
    console.error("Error during login:", error)
    return {
      success: false,
      error: "Error al iniciar sesión. Por favor, inténtelo de nuevo más tarde.",
    }
  }
}

