"use client"

import { useEffect } from "react"

/**
 * Este componente proporciona polyfills y definiciones para variables globales
 * que pueden ser requeridas por código asm.js en la aplicación.
 */
export function AsmJsPolyfill() {
  useEffect(() => {
    // Detectar el entorno
    const isClient = typeof window !== "undefined"
    if (!isClient) return

    // Función para verificar si una variable global está definida
    const isGlobalDefined = (name: string) => {
      return typeof (window as any)[name] !== "undefined"
    }

    // Lista de variables globales comúnmente requeridas por asm.js
    const requiredGlobals = [
      "Math",
      "Int8Array",
      "Uint8Array",
      "Int16Array",
      "Uint16Array",
      "Int32Array",
      "Uint32Array",
      "Float32Array",
      "Float64Array",
      "NaN",
      "Infinity",
    ]

    // Verificar y definir variables globales faltantes
    requiredGlobals.forEach((name) => {
      if (!isGlobalDefined(name)) {
        console.warn(`Definiendo variable global faltante para asm.js: ${name}`)

        // Definir la variable global según su tipo
        switch (name) {
          case "NaN":
            ;(window as any).NaN = Number.NaN
            break
          case "Infinity":
            ;(window as any).Infinity = Number.POSITIVE_INFINITY
            break
          // Para los tipos de array, usar los constructores nativos si están disponibles
          default:
            if (typeof global !== "undefined" && (global as any)[name]) {
              ;(window as any)[name] = (global as any)[name]
            }
            break
        }
      }
    })

    // Definir funciones matemáticas específicas que asm.js podría necesitar
    const mathFunctions = ["fround", "imul", "clz32", "abs", "ceil", "floor", "exp", "log", "sqrt", "min", "max"]

    mathFunctions.forEach((fn) => {
      if (typeof Math[fn as keyof typeof Math] === "undefined") {
        console.warn(`Definiendo función matemática faltante para asm.js: Math.${fn}`)

        // Implementar polyfills para funciones matemáticas faltantes
        switch (fn) {
          case "fround":
            Math.fround =
              Math.fround ||
              ((x: number) => {
                return new Float32Array([x])[0]
              })
            break
          case "imul":
            Math.imul =
              Math.imul ||
              ((a: number, b: number) => {
                const ah = (a >>> 16) & 0xffff
                const al = a & 0xffff
                const bh = (b >>> 16) & 0xffff
                const bl = b & 0xffff
                return (al * bl + (((ah * bl + al * bh) << 16) >>> 0)) | 0
              })
            break
          case "clz32":
            Math.clz32 =
              Math.clz32 ||
              ((x: number) => {
                if (x === 0) return 32
                return 31 - Math.floor(Math.log(x >>> 0) / Math.LN2)
              })
            break
        }
      }
    })

    // Definir el objeto global 'global' si no existe (para compatibilidad con algunos scripts)
    if (typeof (window as any).global === "undefined") {
      ;(window as any).global = window
    }
  }, [])

  return null // Este componente no renderiza nada
}

