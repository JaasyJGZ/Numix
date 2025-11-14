/**
 * Sistema de monitoreo de rendimiento para entornos de producción
 */

// Configuración
const PERFORMANCE_METRICS_KEY = "numix_performance_metrics"
const MAX_METRICS_STORED = 50

// Interfaz para métricas de rendimiento
interface PerformanceMetric {
  timestamp: string
  type: "navigation" | "resource" | "paint" | "custom"
  name: string
  duration: number
  details?: any
}

// Interfaz para métricas de navegación
interface NavigationMetrics {
  dnsLookup: number
  tcpConnect: number
  tlsNegotiation: number
  serverResponse: number
  domLoad: number
  resourceLoad: number
  totalPageLoad: number
}

/**
 * Inicializa el monitoreo de rendimiento
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === "undefined" || !window.performance) return

  // Monitorear carga de página
  if (window.performance.timing) {
    window.addEventListener("load", () => {
      // Dar tiempo para que se complete la carga
      setTimeout(() => {
        captureNavigationTiming()
      }, 0)
    })
  }

  // Monitorear recursos
  if (window.performance.getEntriesByType) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        captureResourceTiming()
      }, 0)
    })
  }

  // Monitorear métricas de pintura
  if (window.performance.getEntriesByType) {
    const paintMetrics = window.performance.getEntriesByType("paint")
    for (const metric of paintMetrics) {
      recordPerformanceMetric("paint", metric.name, metric.startTime)
    }
  }

  // Observar métricas de experiencia de usuario
  if ("PerformanceObserver" in window) {
    try {
      // Observar métricas de pintura
      const paintObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          recordPerformanceMetric("paint", entry.name, entry.startTime)
        }
      })
      paintObserver.observe({ type: "paint", buffered: true })

      // Observar métricas de layout
      const layoutObserver = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          recordPerformanceMetric("layout", entry.name, entry.startTime)
        }
      })
      layoutObserver.observe({ type: "layout-shift", buffered: true })

      // Observar métricas de interacción
      if (PerformanceObserver.supportedEntryTypes.includes("first-input")) {
        const fiObserver = new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            recordPerformanceMetric("interaction", "first-input-delay", entry.processingStart - entry.startTime)
          }
        })
        fiObserver.observe({ type: "first-input", buffered: true })
      }
    } catch (e) {
      console.error("Error setting up PerformanceObserver:", e)
    }
  }
}

/**
 * Captura métricas de tiempo de navegación
 */
function captureNavigationTiming(): void {
  if (typeof window === "undefined" || !window.performance || !window.performance.timing) return

  const timing = window.performance.timing

  const metrics: NavigationMetrics = {
    dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
    tcpConnect: timing.connectEnd - timing.connectStart,
    tlsNegotiation: timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
    serverResponse: timing.responseStart - timing.requestStart,
    domLoad: timing.domComplete - timing.responseEnd,
    resourceLoad: timing.loadEventStart - timing.domContentLoadedEventEnd,
    totalPageLoad: timing.loadEventComplete - timing.navigationStart,
  }

  recordPerformanceMetric("navigation", "page-load", metrics.totalPageLoad, metrics)
}

/**
 * Captura métricas de tiempo de carga de recursos
 */
function captureResourceTiming(): void {
  if (typeof window === "undefined" || !window.performance || !window.performance.getEntriesByType) return

  const resources = window.performance.getEntriesByType("resource")

  // Agrupar recursos por tipo
  const resourcesByType: Record<string, { count: number; totalDuration: number }> = {}

  for (const resource of resources) {
    const entry = resource as PerformanceResourceTiming

    // Determinar el tipo de recurso
    let type = "other"
    const url = entry.name

    if (url.endsWith(".js")) type = "script"
    else if (url.endsWith(".css")) type = "style"
    else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) type = "image"
    else if (url.match(/\.(woff|woff2|ttf|otf)/)) type = "font"
    else if (url.includes("api") || url.includes("supabase")) type = "api"

    // Acumular duración por tipo
    if (!resourcesByType[type]) {
      resourcesByType[type] = { count: 0, totalDuration: 0 }
    }

    resourcesByType[type].count++
    resourcesByType[type].totalDuration += entry.duration
  }

  // Registrar métricas por tipo de recurso
  for (const [type, data] of Object.entries(resourcesByType)) {
    recordPerformanceMetric("resource", `${type}-resources`, data.totalDuration / data.count, {
      count: data.count,
      totalDuration: data.totalDuration,
    })
  }
}

/**
 * Registra una métrica de rendimiento
 */
function recordPerformanceMetric(type: PerformanceMetric["type"], name: string, duration: number, details?: any): void {
  if (typeof window === "undefined") return

  try {
    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      type,
      name,
      duration,
      details,
    }

    // Almacenar métrica
    const metrics = JSON.parse(localStorage.getItem(PERFORMANCE_METRICS_KEY) || "[]") as PerformanceMetric[]

    metrics.push(metric)

    // Mantener solo las últimas N métricas
    if (metrics.length > MAX_METRICS_STORED) {
      metrics.splice(0, metrics.length - MAX_METRICS_STORED)
    }

    localStorage.setItem(PERFORMANCE_METRICS_KEY, JSON.stringify(metrics))

    // En producción, podríamos enviar métricas a un servicio de análisis
    if (process.env.NODE_ENV === "production" && type !== "resource") {
      // sendMetricToAnalyticsService(metric);
      console.log(`[Performance] ${type}: ${name} - ${duration.toFixed(2)}ms`)
    }
  } catch (error) {
    console.error("Error recording performance metric:", error)
  }
}

/**
 * Mide el tiempo de ejecución de una función
 */
export function measureExecutionTime<T>(fn: () => T, metricName: string): T {
  const startTime = performance.now()
  const result = fn()
  const duration = performance.now() - startTime

  recordPerformanceMetric("custom", metricName, duration)

  return result
}

/**
 * Mide el tiempo de ejecución de una función asíncrona
 */
export async function measureAsyncExecutionTime<T>(fn: () => Promise<T>, metricName: string): Promise<T> {
  const startTime = performance.now()
  const result = await fn()
  const duration = performance.now() - startTime

  recordPerformanceMetric("custom", metricName, duration)

  return result
}

/**
 * Obtiene todas las métricas de rendimiento almacenadas
 */
export function getPerformanceMetrics(): PerformanceMetric[] {
  if (typeof window === "undefined") return []

  try {
    return JSON.parse(localStorage.getItem(PERFORMANCE_METRICS_KEY) || "[]") as PerformanceMetric[]
  } catch (error) {
    console.error("Error getting performance metrics:", error)
    return []
  }
}

/**
 * Limpia las métricas de rendimiento almacenadas
 */
export function clearPerformanceMetrics(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem(PERFORMANCE_METRICS_KEY)
}

