"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onFilterClick?: () => void
}

export function SearchFilter({ searchQuery, onSearchChange, onFilterClick }: SearchFilterProps) {
  return (
    <div className="px-4 pb-4 pt-2 flex gap-2">
      <div className="relative flex-1">
        <label htmlFor="search-input" className="sr-only">
          Buscar
        </label>
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5"
          aria-hidden="true"
        />
        <Input
          id="search-input"
          type="text"
          placeholder="Buscar"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-12 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground w-full"
          aria-label="Buscar tickets"
        />
      </div>
      {onFilterClick && (
        <Button
          onClick={onFilterClick}
          variant="outline"
          className="h-12 w-12 rounded-xl border-border hover:bg-muted transition-colors"
          aria-label="Abrir filtros"
        >
          <Filter className="h-5 w-5 text-foreground" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

