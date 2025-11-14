/**
 * Utilidades para paginación y carga optimizada de datos
 */

// Configuración
const DEFAULT_PAGE_SIZE = 20

// Interfaz para resultados paginados
export interface PaginatedResult<T> {
  data: T[]
  metadata: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Pagina un array de elementos
 */
export function paginateArray<T>(items: T[], page = 1, pageSize: number = DEFAULT_PAGE_SIZE): PaginatedResult<T> {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  return {
    data: items.slice(startIndex, endIndex),
    metadata: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  }
}

/**
 * Filtra y pagina un array de elementos
 */
export function filterAndPaginate<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  page = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedResult<T> {
  const filteredItems = items.filter(filterFn)
  return paginateArray(filteredItems, page, pageSize)
}

/**
 * Ordena, filtra y pagina un array de elementos
 */
export function sortFilterAndPaginate<T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  filterFn: (item: T) => boolean,
  page = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginatedResult<T> {
  const filteredItems = items.filter(filterFn)
  const sortedItems = [...filteredItems].sort(sortFn)
  return paginateArray(sortedItems, page, pageSize)
}

/**
 * Crea un objeto de paginación vacío
 */
export function emptyPaginatedResult<T>(): PaginatedResult<T> {
  return {
    data: [],
    metadata: {
      currentPage: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  }
}

/**
 * Calcula el rango de elementos mostrados
 */
export function getDisplayedRange(metadata: PaginatedResult<any>["metadata"]): {
  start: number
  end: number
} {
  const { currentPage, pageSize, totalItems } = metadata
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return { start, end }
}

