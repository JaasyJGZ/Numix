"use client"

import { useEffect, useState } from "react"

interface PreloadResource {
  href: string
  as: "script" | "style" | "image" | "font" | "fetch" | "audio" | "video" | "document"
  type?: string
  crossOrigin?: string
  media?: string
}

export function usePreloadResources(resources: PreloadResource[]) {
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Función para crear y añadir un preload
    const addPreload = (resource: PreloadResource) => {
      // Verificar si ya existe este preload
      const existingPreload = document.querySelector(`link[rel="preload"][href="${resource.href}"]`)
      if (existingPreload) return

      // Verificar si el recurso ya está cargado
      if (loadedResources.has(resource.href)) return

      // Crear el elemento preload
      const link = document.createElement("link")
      link.rel = "preload"
      link.href = resource.href
      link.as = resource.as

      if (resource.type) link.type = resource.type
      if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin
      if (resource.media) link.media = resource.media

      // Añadir evento para saber cuándo se ha cargado
      link.onload = () => {
        setLoadedResources((prev) => new Set(prev).add(resource.href))

        // Eliminar el preload después de un tiempo si no se usa
        setTimeout(() => {
          // Verificar si el recurso se ha utilizado
          const isUsed = checkIfResourceIsUsed(resource)
          if (!isUsed) {
            link.remove()
            console.log(`Removed unused preload: ${resource.href}`)
          }
        }, 5000) // 5 segundos después de cargar
      }

      // Añadir al head
      document.head.appendChild(link)
    }

    // Función para verificar si un recurso se está utilizando
    const checkIfResourceIsUsed = (resource: PreloadResource): boolean => {
      switch (resource.as) {
        case "script":
          return !!document.querySelector(`script[src="${resource.href}"]`)
        case "style":
          return !!document.querySelector(`link[rel="stylesheet"][href="${resource.href}"]`)
        case "image":
          return !!Array.from(document.querySelectorAll("img")).some((img) => img.src.includes(resource.href))
        case "font":
          // Es difícil verificar si una fuente se usa, asumimos que sí
          return true
        default:
          return false
      }
    }

    // Añadir todos los preloads
    resources.forEach(addPreload)

    // Limpieza al desmontar
    return () => {
      resources.forEach((resource) => {
        const link = document.querySelector(`link[rel="preload"][href="${resource.href}"]`)
        if (link) link.remove()
      })
    }
  }, [resources, loadedResources])
}

export function PreloadManager({ resources }: { resources: PreloadResource[] }) {
  usePreloadResources(resources)
  return null // Este componente no renderiza nada
}

