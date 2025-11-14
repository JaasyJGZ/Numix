"use client"

import { useEffect } from "react"

export function DynamicFavicon() {
  useEffect(() => {
    // Verificar si ya existe un favicon
    const existingFavicon = document.querySelector('link[rel="icon"]')

    if (!existingFavicon) {
      // Crear un favicon dinámicamente si no existe
      createDynamicFavicon()
    } else {
      // Verificar si el favicon existente carga correctamente
      const img = new Image()
      img.onerror = createDynamicFavicon
      img.src = existingFavicon.getAttribute("href") || "/favicon.ico"
    }

    function createDynamicFavicon() {
      // Crear un canvas para dibujar el favicon
      const canvas = document.createElement("canvas")
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Crear un gradiente con los colores de NUMIX
        const gradient = ctx.createLinearGradient(0, 0, 32, 32)
        gradient.addColorStop(0, "#FF6B6B")
        gradient.addColorStop(1, "#4ECDC4")

        // Dibujar un círculo con el gradiente
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, 32, 32)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(16, 16, 12, 0, Math.PI * 2)
        ctx.fill()

        // Añadir una "N" para NUMIX
        ctx.fillStyle = "white"
        ctx.font = "bold 18px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("N", 16, 16)

        // Convertir el canvas a una URL de datos
        const faviconUrl = canvas.toDataURL("image/png")

        // Crear o actualizar el elemento link para el favicon
        let link = document.querySelector('link[rel="icon"]')
        if (!link) {
          link = document.createElement("link")
          link.rel = "icon"
          document.head.appendChild(link)
        }
        link.href = faviconUrl
        link.type = "image/png"
      }
    }
  }, [])

  return null
}

