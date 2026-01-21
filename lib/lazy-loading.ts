/**
 * Utilidades para implementar lazy loading de componentes y recursos
 * Implementación progresiva para optimizaciones de producción
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { LogLevel, log } from './error-logger';

/**
 * Opciones para el lazy loading de componentes
 */
interface LazyLoadOptions {
  /** Nombre del componente para registro y depuración */
  componentName: string;
  /** Función que se ejecuta cuando el componente comienza a cargarse */
  onLoadStart?: () => void;
  /** Función que se ejecuta cuando el componente termina de cargarse */
  onLoadComplete?: () => void;
  /** Función que se ejecuta si hay un error al cargar el componente */
  onLoadError?: (error: Error) => void;
  /** Tiempo máximo de carga en milisegundos antes de registrar una advertencia */
  loadTimeoutWarning?: number;
}

/**
 * Crea un componente con lazy loading y monitoreo de rendimiento
 * @param importFn - Función de importación dinámica del componente
 * @param options - Opciones de configuración
 * @returns Componente con lazy loading
 */
export function lazyWithMonitoring<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions
): LazyExoticComponent<T> {
  const {
    componentName,
    onLoadStart,
    onLoadComplete,
    onLoadError,
    loadTimeoutWarning = 3000 // 3 segundos por defecto
  } = options;

  return lazy(() => {
    // Registrar inicio de carga
    const startTime = performance.now();
    log(LogLevel.DEBUG, `Iniciando carga de componente: ${componentName}`);
    
    if (onLoadStart) {
      onLoadStart();
    }

    // Configurar timeout de advertencia
    const timeoutId = setTimeout(() => {
      log(
        LogLevel.WARN,
        `La carga del componente ${componentName} está tomando más de ${loadTimeoutWarning}ms`,
        { elapsedTime: performance.now() - startTime }
      );
    }, loadTimeoutWarning);

    // Realizar la importación con monitoreo
    return importFn()
      .then(module => {
        // Limpiar timeout y registrar finalización
        clearTimeout(timeoutId);
        const loadTime = performance.now() - startTime;
        
        log(
          LogLevel.DEBUG,
          `Componente ${componentName} cargado correctamente`,
          { loadTime: `${loadTime.toFixed(2)}ms` }
        );
        
        if (onLoadComplete) {
          onLoadComplete();
        }
        
        return module;
      })
      .catch(error => {
        // Limpiar timeout y registrar error
        clearTimeout(timeoutId);
        
        log(
          LogLevel.ERROR,
          `Error al cargar el componente ${componentName}`,
          { error: error instanceof Error ? error.message : "Error desconocido" }
        );
        
        if (onLoadError) {
          onLoadError(error instanceof Error ? error : new Error(String(error)));
        }
        
        throw error;
      });
  });
}

/**
 * Precarga un componente en segundo plano
 * @param importFn - Función de importación dinámica del componente
 * @param componentName - Nombre del componente para registro
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
): void {
  // Usar requestIdleCallback si está disponible, o setTimeout como fallback
  const schedulePreload = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (fn: Function) => setTimeout(fn, 1000);

  schedulePreload(() => {
    log(LogLevel.DEBUG, `Precargando componente: ${componentName}`);
    
    importFn().then(
      () => log(LogLevel.DEBUG, `Componente ${componentName} precargado correctamente`),
      error => log(LogLevel.WARN, `Error al precargar componente ${componentName}`, { error: String(error) })
    );
  });
}

/**
 * Crea un componente con lazy loading que se precarga automáticamente
 * @param importFn - Función de importación dinámica del componente
 * @param options - Opciones de configuración
 * @returns Componente con lazy loading
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions
): LazyExoticComponent<T> & { preload: () => void } {
  const lazyComponent = lazyWithMonitoring(importFn, options);
  
  // Añadir método de precarga al componente
  const preloadFn = () => preloadComponent(importFn, options.componentName);
  (lazyComponent as any).preload = preloadFn;
  
  return lazyComponent as LazyExoticComponent<T> & { preload: () => void };
}