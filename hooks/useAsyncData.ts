"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface AsyncDataState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  initialData: T | null = null,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Referencia para rastrear si el componente está montado
  const isMounted = useRef(true)
  
  // Referencia para la señal de cancelación
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    // Cancelar cualquier solicitud pendiente anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Crear un nuevo controlador para esta solicitud
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    // Solo actualizar el estado si el componente sigue montado
    if (isMounted.current) {
      setIsLoading(true)
      setError(null)
    }

    try {
      // Envolver la función fetchFn para manejar la señal de cancelación
      const wrappedFetchFn = async () => {
        // Verificar si la solicitud ya fue cancelada
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        
        return await fetchFn()
      }
      
      const result = await wrappedFetchFn()
      
      // Solo actualizar el estado si el componente sigue montado
      if (isMounted.current && !signal.aborted) {
        setData(result)
      }
    } catch (err) {
      // No actualizar el estado si la solicitud fue cancelada o el componente se desmontó
      if (isMounted.current && !signal.aborted && !(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      // Solo actualizar el estado si el componente sigue montado
      if (isMounted.current && !signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [fetchFn])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    // Marcar el componente como montado
    isMounted.current = true
    
    fetchData()
    
    // Función de limpieza que se ejecuta cuando el componente se desmonta
    return () => {
      // Marcar el componente como desmontado
      isMounted.current = false
      
      // Cancelar cualquier solicitud pendiente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [...dependencies, fetchData])

  return { data, isLoading, error, refetch }
}

