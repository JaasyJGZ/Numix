/**
 * Este archivo proporciona inicialización para asm.js
 * Se debe importar en cualquier componente que utilice bibliotecas que dependan de asm.js
 */

// Función para inicializar el entorno para asm.js
export function initAsmJsEnvironment() {
  if (typeof window === "undefined") return

  // Definir variables globales necesarias para asm.js
  const globalVars = {
    // Funciones matemáticas
    Math: Math,

    // Tipos de arrays
    Int8Array: Int8Array,
    Uint8Array: Uint8Array,
    Int16Array: Int16Array,
    Uint16Array: Uint16Array,
    Int32Array: Int32Array,
    Uint32Array: Uint32Array,
    Float32Array: Float32Array,
    Float64Array: Float64Array,

    // Constantes matemáticas
    NaN: Number.NaN,
    Infinity: Number.POSITIVE_INFINITY,

    // Funciones matemáticas específicas para asm.js
    fround: Math.fround || ((x: number) => new Float32Array([x])[0]),
    imul:
      Math.imul ||
      ((a: number, b: number) =>
        (((a & 0xffff) * (b & 0xffff) +
          ((((a >>> 16) & 0xffff) * (b & 0xffff) + (a & 0xffff) * ((b >>> 16) & 0xffff)) << 16)) >>>
          0) |
        0),
    clz32:
      Math.clz32 ||
      ((x: number) => {
        if (x === 0) return 32
        return 31 - Math.floor(Math.log(x >>> 0) / Math.LN2)
      }),
  }

  // Asignar variables globales al objeto window
  Object.entries(globalVars).forEach(([key, value]) => {
    if (typeof (window as any)[key] === "undefined") {
      ;(window as any)[key] = value
    }
  })

  // Asegurarse de que 'global' esté definido (para compatibilidad con algunos scripts)
  if (typeof (window as any).global === "undefined") {
    ;(window as any).global = window
  }

  // Asegurarse de que 'process' esté definido (para compatibilidad con algunos scripts)
  if (typeof (window as any).process === "undefined") {
    ;(window as any).process = { env: { NODE_ENV: process.env.NODE_ENV } }
  }

  // Asegurarse de que 'Buffer' esté definido (para compatibilidad con algunos scripts)
  if (typeof (window as any).Buffer === "undefined") {
    ;(window as any).Buffer = {
      isBuffer: () => false,
      from: (data: any) => new Uint8Array(data),
    }
  }

  // Verificar si hay alguna biblioteca que esté intentando usar asm.js
  console.log("Entorno asm.js inicializado correctamente")
}

// Inicializar automáticamente si estamos en el navegador
if (typeof window !== "undefined") {
  initAsmJsEnvironment()
}

export default initAsmJsEnvironment

