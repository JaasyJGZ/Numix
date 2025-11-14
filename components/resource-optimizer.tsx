"use client"

import { useEffect } from "react"

export function ResourceOptimizer() {
  useEffect(() => {
    // Función para limpiar precargas no utilizadas
    const cleanupUnusedPreloads = () => {
      // Esperar a que la página esté completamente cargada
      if (document.readyState !== "complete") return

      // Buscar todos los elementos link[rel="preload"]
      const preloads = document.querySelectorAll('link[rel="preload"]')

      preloads.forEach((preload) => {
        const href = preload.getAttribute("href")
        const as = preload.getAttribute("as")

        if (!href) return

        // Verificar si es una fuente
        if (as === "font" || href.match(/\.(woff2?|ttf|otf|eot)$/i)) {
          // Verificar si la fuente se está utilizando en la página
          const isUsed = isFontUsed(href)

          // Si no se está utilizando, eliminar la precarga
          if (!isUsed) {
            console.log(`Removing unused font preload: ${href}`)
            preload.remove()
          }
        }
      })
    }

    // Función para verificar si una fuente está siendo utilizada
    const isFontUsed = (fontUrl: string) => {
      // Extraer el nombre de la fuente del URL
      const fontName = fontUrl.split("/").pop()?.split(".")[0]
      if (!fontName) return false

      // Verificar si alguna regla CSS hace referencia a esta fuente
      const styleSheets = Array.from(document.styleSheets)

      try {
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || [])
            for (const rule of rules) {
              if (rule instanceof CSSFontFaceRule) {
                const fontSrc = rule.style.getPropertyValue("src")
                if (fontSrc.includes(fontName)) {
                  return true
                }
              }
            }
          } catch (e) {
            // Ignorar errores de CORS al acceder a hojas de estilo externas
            continue
          }
        }
      } catch (e) {
        console.warn("Error checking font usage:", e)
      }

      return false
    }

    // Función para corregir atributos de precarga
    const fixPreloadAttributes = () => {
      const preloads = document.querySelectorAll('link[rel="preload"]')

      preloads.forEach((preload) => {
        const href = preload.getAttribute("href")
        if (!href) return

        // Verificar y corregir el atributo 'as'
        if (href.match(/\.(woff2?)$/i) && preload.getAttribute("as") !== "font") {
          preload.setAttribute("as", "font")
        } else if (href.match(/\.(jpe?g|png|gif|webp|avif|svg)$/i) && preload.getAttribute("as") !== "image") {
          preload.setAttribute("as", "image")
        } else if (href.match(/\.(js)$/i) && preload.getAttribute("as") !== "script") {
          preload.setAttribute("as", "script")
        } else if (href.match(/\.(css)$/i) && preload.getAttribute("as") !== "style") {
          preload.setAttribute("as", "style")
        }

        // Añadir crossorigin para fuentes
        if (preload.getAttribute("as") === "font" && !preload.hasAttribute("crossorigin")) {
          preload.setAttribute("crossorigin", "anonymous")
        }
      })
    }

    // Ejecutar la corrección de atributos inmediatamente
    fixPreloadAttributes()

    // Ejecutar la limpieza después de que la página se haya cargado completamente
    if (document.readyState === "complete") {
      cleanupUnusedPreloads()
    } else {
      window.addEventListener("load", () => {
        // Esperar un poco para asegurarse de que las fuentes se hayan cargado
        setTimeout(cleanupUnusedPreloads, 2000)
      })
    }

    // Limpiar el event listener cuando el componente se desmonte
    return () => {
      window.removeEventListener("load", cleanupUnusedPreloads)
    }
  }, [])

  return null
}

