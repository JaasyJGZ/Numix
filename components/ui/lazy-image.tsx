"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholderSrc?: string
  className?: string
  loadingClassName?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({
  src,
  alt,
  placeholderSrc,
  className,
  loadingClassName,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Resetear estados cuando cambia la fuente
    setIsLoaded(false)
    setIsError(false)

    // Crear un nuevo IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Cuando la imagen es visible en el viewport
          if (entry.isIntersecting) {
            // Cargar la imagen real
            const img = imgRef.current
            if (img) {
              img.src = src
              // Dejar de observar una vez que se inicia la carga
              observer.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: "200px 0px", // Comenzar a cargar cuando está a 200px de ser visible
        threshold: 0.01,
      },
    )

    // Comenzar a observar la imagen
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      // Limpiar el observer cuando el componente se desmonta
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [src])

  const handleLoad = () => {
    setIsLoaded(true)
    if (onLoad) onLoad()
  }

  const handleError = () => {
    setIsError(true)
    if (onError) onError()
  }

  return (
    <img
      ref={imgRef}
      src={placeholderSrc || "/placeholder.svg?height=100&width=100"}
      alt={alt}
      className={cn(
        className,
        !isLoaded && loadingClassName,
        !isLoaded && "animate-pulse bg-muted",
      )}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  )
}

