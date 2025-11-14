"use client"

import { useState, useCallback } from "react"

interface UseSearchProps<T> {
  items: T[]
  searchFields: (keyof T)[]
  initialQuery?: string
}

export function useSearch<T>({ items, searchFields, initialQuery = "" }: UseSearchProps<T>) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isResetting, setIsResetting] = useState(false)

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true

    return searchFields.some((field) => {
      const value = item[field]
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return false
    })
  })

  const handleReset = useCallback(() => {
    setIsResetting(true)
    setSearchQuery("")
    setTimeout(() => {
      setIsResetting(false)
    }, 500)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    isResetting,
    handleReset,
  }
}

