"use client"

import { useEffect, useRef, useCallback } from "react"

export function useFocusTrap(active = true) {
  const elRef = useRef<HTMLDivElement>(null)

  // Función para obtener elementos focusables de manera segura
  const getFocusableElements = useCallback((element: HTMLElement | null) => {
    if (!element) return []

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      "area[href]",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
    ].join(",")

    return Array.from(element.querySelectorAll(focusableSelector)).filter((el) => {
      // Verificar que el elemento es visible
      const style = window.getComputedStyle(el as HTMLElement)
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        (el as HTMLElement).offsetWidth > 0 &&
        (el as HTMLElement).offsetHeight > 0
      )
    }) as HTMLElement[]
  }, [])

  useEffect(() => {
    if (!active) return

    const el = elRef.current
    if (!el) return

    // Guardar el elemento que tenía el foco antes de abrir el modal
    const previousActiveElement = document.activeElement as HTMLElement

    // Función para manejar el evento keydown
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      // Obtener elementos focusables en tiempo real
      const focusableElements = getFocusableElements(el)
      if (focusableElements.length === 0) return

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements[focusableElements.length - 1]

      // Si se presiona Shift + Tab y el foco está en el primer elemento, mover al último
      if (e.shiftKey && document.activeElement === firstFocusableElement) {
        e.preventDefault()
        lastFocusableElement.focus()
      }
      // Si se presiona Tab y el foco está en el último elemento, mover al primero
      else if (!e.shiftKey && document.activeElement === lastFocusableElement) {
        e.preventDefault()
        firstFocusableElement.focus()
      }
    }

    // Establecer el foco en el primer elemento con un pequeño retraso
    const focusTimeout = setTimeout(() => {
      const focusableElements = getFocusableElements(el)
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      } else {
        // Si no hay elementos focusables, enfocar el contenedor
        el.setAttribute("tabindex", "-1")
        el.focus()
      }
    }, 100)

    // Agregar event listener
    el.addEventListener("keydown", handleKeyDown)

    return () => {
      // Limpiar timeout
      clearTimeout(focusTimeout)

      // Eliminar event listener
      if (el) {
        el.removeEventListener("keydown", handleKeyDown)
      }

      // Restaurar el foco al elemento anterior si todavía existe en el DOM
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        try {
          previousActiveElement.focus()
        } catch (e) {
          console.warn("Error al restaurar el foco:", e)
        }
      }
    }
  }, [active, getFocusableElements])

  return elRef
}

