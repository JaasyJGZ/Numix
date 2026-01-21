"use client"

import type React from "react"
import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { initAsmJsEnvironment } from "@/lib/asm-js-initializer"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import { ResourceOptimizer } from "@/components/resource-optimizer"
import PageTransition from "@/components/page-transition"
import { enhancedSyncManager } from "@/lib/enhanced-sync-manager"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isHiddenRef = useRef(false)
  const lastActiveTimeRef = useRef(Date.now())
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Función para manejar cuando la página se vuelve visible
  const handleVisibilityChange = useCallback(() => {
    const isHidden = document.hidden
    const currentTime = Date.now()
    const timeDifference = currentTime - lastActiveTimeRef.current

    if (isHidden) {
      // La página se oculta
      isHiddenRef.current = true
      lastActiveTimeRef.current = currentTime
      
      // Pausar sincronización para ahorrar recursos
      if (enhancedSyncManager) {
        enhancedSyncManager.pauseSync()
      }
      
      console.log('App moved to background')
    } else {
      // La página se vuelve visible
      if (isHiddenRef.current) {
        console.log('App returned to foreground after', timeDifference, 'ms')
        
        // Si la app estuvo en background por más de 30 segundos, recargar
        if (timeDifference > 30000) {
          console.log('App was in background for too long, reloading...')
          
          // Limpiar timeout previo si existe
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current)
          }
          
          // Recargar después de un pequeño delay para evitar problemas de timing
          reloadTimeoutRef.current = setTimeout(() => {
            window.location.reload()
          }, 100)
          
          return
        }
        
        // Reanudar sincronización
        if (enhancedSyncManager) {
          enhancedSyncManager.resumeSync()
        }
        
        isHiddenRef.current = false
      }
      
      lastActiveTimeRef.current = currentTime
    }
  }, [router])

  // Función para manejar cuando la ventana pierde/gana foco
  const handleFocusChange = useCallback(() => {
    const currentTime = Date.now()
    const timeDifference = currentTime - lastActiveTimeRef.current
    
    // Si la app perdió foco por más de 60 segundos, forzar recarga
    if (timeDifference > 60000) {
      console.log('App lost focus for too long, reloading...')
      
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
      
      reloadTimeoutRef.current = setTimeout(() => {
        window.location.reload()
      }, 100)
    }
    
    lastActiveTimeRef.current = currentTime
  }, [])

  // Función para manejar errores de memoria
  const handleMemoryWarning = useCallback(() => {
    console.warn('Memory warning detected, clearing caches and reloading...')
    
    // Limpiar localStorage si es necesario
    try {
      const keysToKeep = ['auth-token', 'user-data', 'app-settings']
      const allKeys = Object.keys(localStorage)
      
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
    
    // Recargar la página
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }, [])

  // Inicializar el entorno y configurar event listeners
  useEffect(() => {
    // Inicializar el entorno asm.js
    initAsmJsEnvironment()

    // Configurar event listeners para manejo de ciclo de vida
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocusChange)
    window.addEventListener('blur', handleFocusChange)
    
    // Event listener para advertencias de memoria (principalmente en móviles)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as any).memory
        if (memInfo && memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
          handleMemoryWarning()
        }
      }
      
      const memoryCheckInterval = setInterval(checkMemory, 30000) // Cada 30 segundos
      
      // Limpiar interval al desmontar
      return () => {
        clearInterval(memoryCheckInterval)
      }
    }

    // Manejar errores de asm.js y otros errores comunes
    const originalConsoleError = console.error
    console.error = (...args) => {
      // Convertir argumentos a string para facilitar la detección
      const errorString = args.join(" ")
      
      // Verificar si es un error de asm.js
      if (errorString.includes("Invalid asm.js") || errorString.includes("Undefined global variable")) {
        console.warn("Detectado error de asm.js:", errorString)
        initAsmJsEnvironment()
        return
      }
      
      // Manejar error de portapapeles
      if (errorString.includes("Copy to clipboard is not supported") || 
          errorString.includes("Document is not focused") ||
          errorString.includes("clipboard")) {
        console.warn("Operación de portapapeles no soportada en este navegador o contexto")
        return
      }

      // Para otros errores, usar el comportamiento normal
      originalConsoleError.apply(console, args)
    }

    // Cleanup function
    return () => {
      console.error = originalConsoleError
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocusChange)
      window.removeEventListener('blur', handleFocusChange)
      
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
    }
  }, [handleVisibilityChange, handleFocusChange, handleMemoryWarning])

  return (
    <>
      {/* Script inline para inicializar asm.js lo antes posible */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          // Definir variables globales necesarias para asm.js
          if (typeof window.Math === 'undefined') window.Math = Math;
          if (typeof window.NaN === 'undefined') window.NaN = Number.NaN;
          if (typeof window.Infinity === 'undefined') window.Infinity = Number.POSITIVE_INFINITY;
          
          // Asegurarse de que las funciones matemáticas específicas estén definidas
          if (typeof Math.fround === 'undefined') {
            Math.fround = function(x) { return new Float32Array([x])[0]; };
          }
          if (typeof Math.imul === 'undefined') {
            Math.imul = function(a, b) {
              return ((a & 0xffff) * (b & 0xffff) + ((((a >>> 16) & 0xffff) * (b & 0xffff) + (a & 0xffff) * ((b >>> 16) & 0xffff)) << 16) >>> 0) | 0;
            };
          }
          if (typeof Math.clz32 === 'undefined') {
            Math.clz32 = function(x) {
              if (x === 0) return 32;
              return 31 - Math.floor(Math.log(x >>> 0) / Math.LN2);
            };
          }
          
          // Definir tipos de arrays si no existen
          if (typeof window.Int8Array === 'undefined') window.Int8Array = Int8Array;
          if (typeof window.Uint8Array === 'undefined') window.Uint8Array = Uint8Array;
          if (typeof window.Int16Array === 'undefined') window.Int16Array = Int16Array;
          if (typeof window.Uint16Array === 'undefined') window.Uint16Array = Uint16Array;
          if (typeof window.Int32Array === 'undefined') window.Int32Array = Int32Array;
          if (typeof window.Uint32Array === 'undefined') window.Uint32Array = Uint32Array;
          if (typeof window.Float32Array === 'undefined') window.Float32Array = Float32Array;
          if (typeof window.Float64Array === 'undefined') window.Float64Array = Float64Array;
          
          // Definir global si no existe
          if (typeof window.global === 'undefined') window.global = window;
        `,
        }}
      />

      {/* Incluir ResourceOptimizer y DynamicFavicon */}
      <ResourceOptimizer />
      <DynamicFavicon />

      <PageTransition>{children}</PageTransition>
    </>
  )
}