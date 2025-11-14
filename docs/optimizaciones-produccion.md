# Optimizaciones para Producción - NumixPro

Este documento detalla las mejoras recomendadas para preparar NumixPro para un entorno de producción robusto y eficiente.

## 1. Manejo de Errores

### Mejoras en funciones RPC

- **Problema actual**: Las funciones RPC como `increment_number_sold_safely` y `decrement_number_sold_safely` tienen un manejo de errores básico que puede generar errores en consola.
- **Solución**: Implementar un sistema de reintentos con backoff exponencial para las llamadas RPC:

```typescript
// En number-limits.ts
async function callRPCWithRetry(rpcName: string, params: any, maxRetries = 3): Promise<any> {
  let lastError;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const { data, error } = await supabaseAdmin.rpc(rpcName, params);
      
      if (error) throw error;
      return data;
    } catch (error) {
      lastError = error;
      retryCount++;
      
      // Esperar con backoff exponencial antes de reintentar
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 500; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw lastError;
}
```

### Centralización de errores

- Extender el sistema de logging actual para categorizar errores por severidad y origen.
- Implementar un mecanismo para enviar errores críticos a un servicio de monitoreo externo.

## 2. Optimización de Rendimiento

### Lazy Loading de Componentes

- **Problema actual**: Todos los componentes se cargan de forma anticipada, incluso los que no son inmediatamente necesarios.
- **Solución**: Implementar lazy loading para componentes pesados:

```typescript
// Antes
import HeavyComponent from '../components/HeavyComponent';

// Después
import dynamic from 'next/dynamic';
const HeavyComponent = dynamic(() => import('../components/HeavyComponent'), {
  loading: () => <p>Cargando...</p>,
  ssr: false // Si el componente no necesita renderizarse en el servidor
});
```

### Minimización de Re-renders

- Utilizar React.memo para componentes que no necesitan re-renderizarse frecuentemente.
- Implementar useMemo y useCallback para funciones y valores calculados.
- Revisar y optimizar los efectos secundarios (useEffect) para evitar ciclos innecesarios.

## 3. Sistema de Caché

### Caché de Datos de Supabase

- **Problema actual**: Cada consulta a Supabase genera una nueva solicitud HTTP.
- **Solución**: Implementar un sistema de caché con invalidación selectiva:

```typescript
// En un nuevo archivo lib/cache-manager.ts
interface CacheOptions {
  ttl?: number; // Tiempo de vida en ms
  key?: string; // Clave personalizada
}

const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const key = options.key || queryFn.toString();
  const ttl = options.ttl || 60000; // 1 minuto por defecto
  
  const cached = cache.get(key);
  const now = Date.now();
  
  // Si hay datos en caché y no han expirado, devolverlos
  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  
  // Si no hay datos en caché o han expirado, ejecutar la consulta
  const data = await queryFn();
  
  // Guardar en caché
  cache.set(key, { data, timestamp: now, ttl });
  
  return data;
}

export function invalidateCache(keyPattern?: string): void {
  if (!keyPattern) {
    cache.clear();
    return;
  }
  
  // Invalidar entradas específicas que coincidan con el patrón
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}
```

### Implementación en Funciones Existentes

```typescript
// En number-limits.ts
import { cachedQuery, invalidateCache } from './cache-manager';

export async function getNumberLimits(eventId: string): Promise<NumberLimit[]> {
  return cachedQuery(
    async () => {
      // Código existente para obtener límites
      const { data, error } = await supabase
        .from("number_limits")
        .select("*")
        .eq("event_id", eventId)
        .order("number_range", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    { key: `number_limits_${eventId}`, ttl: 30000 } // 30 segundos de caché
  );
}

// Invalidar caché cuando se actualiza un límite
export async function updateNumberLimit(...) {
  // Código existente
  
  // Al final, invalidar la caché relacionada
  invalidateCache(`number_limits_${eventId}`);
  
  return data;
}
```

## 4. Validación de Datos

### Frontend

- Implementar validación exhaustiva con Zod para todos los formularios.
- Crear esquemas de validación reutilizables para tipos de datos comunes.

```typescript
// En lib/validation-schemas.ts
import { z } from 'zod';

export const numberRangeSchema = z.string().refine(
  (val) => {
    // Validar formato "X" o "X-Y"
    if (/^\d+$/.test(val)) return true;
    if (/^\d+-\d+$/.test(val)) {
      const [start, end] = val.split('-').map(Number);
      return start <= end;
    }
    return false;
  },
  { message: "Formato inválido. Use un número o un rango (ej: 1-10)" }
);

export const ticketSchema = z.object({
  clientName: z.string().min(3, "Nombre demasiado corto"),
  amount: z.number().positive("El monto debe ser positivo"),
  numbers: z.string(),
  // Añadir más campos según sea necesario
});
```

### Backend

- Implementar validación en el servidor para todas las operaciones de escritura.
- Crear middlewares de validación para rutas de API.

## 5. Pruebas Automatizadas

### Configuración Inicial

- Instalar Jest y configurarlo para TypeScript:

```bash
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom
```

- Crear archivo de configuración `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

### Pruebas Unitarias

- Priorizar pruebas para funciones críticas como la gestión de límites de números:

```typescript
// En __tests__/number-limits.test.ts
import { isNumberInRange, checkNumberAvailability } from '../lib/number-limits';

describe('isNumberInRange', () => {
  test('debería identificar correctamente números en rangos simples', () => {
    expect(isNumberInRange('5', '5')).toBe(true);
    expect(isNumberInRange('5', '6')).toBe(false);
  });
  
  test('debería identificar correctamente números en rangos compuestos', () => {
    expect(isNumberInRange('5', '1-10')).toBe(true);
    expect(isNumberInRange('15', '1-10')).toBe(false);
  });
  
  test('debería manejar entradas inválidas', () => {
    expect(isNumberInRange('', '1-10')).toBe(false);
    expect(isNumberInRange('5', '')).toBe(false);
    expect(isNumberInRange('abc', '1-10')).toBe(false);
  });
});

// Añadir más pruebas para otras funciones
```

### Pruebas de Integración

- Implementar pruebas que verifiquen la interacción entre componentes y servicios.
- Utilizar mocks para simular respuestas de Supabase.

## 6. Optimización de Imágenes y Recursos

- Configurar Next.js para optimizar imágenes automáticamente:

```javascript
// En next.config.mjs
const nextConfig = {
  // Otras configuraciones...
  images: {
    domains: ['ngzyyhebrphetphtlesu.supabase.co'], // Añadir dominios permitidos
    formats: ['image/avif', 'image/webp'],
    // Cambiar de unoptimized: true a:
    unoptimized: process.env.NODE_ENV === 'development',
  },
}
```

- Implementar estrategias de carga diferida para imágenes no críticas.

## 7. Seguridad

- Implementar Content Security Policy (CSP) para prevenir ataques XSS.
- Configurar encabezados HTTP de seguridad adicionales.
- Revisar y actualizar las reglas de seguridad de Supabase.

## 8. Monitoreo y Análisis

- Integrar una herramienta de monitoreo de errores como Sentry.
- Implementar análisis de rendimiento con herramientas como Lighthouse o Web Vitals.
- Configurar alertas para errores críticos y degradación del rendimiento.

## Plan de Implementación

1. **Fase 1**: Implementar mejoras de manejo de errores y validación de datos.
2. **Fase 2**: Optimizar rendimiento con lazy loading y minimización de re-renders.
3. **Fase 3**: Implementar sistema de caché y optimización de recursos.
4. **Fase 4**: Añadir pruebas automatizadas para funcionalidades críticas.
5. **Fase 5**: Configurar monitoreo y análisis para producción.

Cada fase debe incluir pruebas exhaustivas antes de pasar a la siguiente para garantizar que las mejoras no introduzcan nuevos problemas.