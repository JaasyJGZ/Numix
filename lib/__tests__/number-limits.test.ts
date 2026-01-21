/**
 * Pruebas automatizadas para las funciones de límites de números
 * Implementación progresiva para optimizaciones de producción
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNumberLimits, updateNumberLimit, checkNumberAvailability, incrementNumberSold, decrementNumberSold } from '../number-limits';
import { supabase, supabaseAdmin } from '../supabase';

// Mock de los módulos
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  },
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

vi.mock('../cache-manager', () => ({
  cachedQuery: vi.fn((fn) => fn()),
  invalidateCache: vi.fn()
}));

vi.mock('../rpc-retry', () => ({
  callRPCWithRetry: vi.fn(),
  withRetry: vi.fn()
}));

vi.mock('../error-logger', () => ({
  LogLevel: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
  },
  log: vi.fn()
}));

vi.mock('../validation-schemas', () => ({
  validateWithSchema: vi.fn((schema, data) => data),
  numberLimitSchema: {},
  numberSoldSchema: {},
  numberRangeSchema: {}
}));

describe('Funciones de límites de números', () => {
  // Configuración común para las pruebas
  const mockEventId = '123e4567-e89b-12d3-a456-426614174000';
  const mockNumberRange = '1-10';
  const mockSingleNumber = '5';
  
  // Restablecer todos los mocks antes de cada prueba
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Configuración por defecto para supabase.from
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis()
    };
    
    // Configurar mocks para supabase
    supabase.from.mockReturnValue(mockFrom);
    supabaseAdmin.from.mockReturnValue(mockFrom);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNumberLimits', () => {
    it('debería devolver un array vacío si no hay límites', async () => {
      // Configurar el mock para devolver datos vacíos
      supabase.from().select().eq().order().mockResolvedValue({
        data: [],
        error: null
      });
      
      const result = await getNumberLimits(mockEventId);
      
      expect(result).toEqual([]);
      expect(supabase.from).toHaveBeenCalledWith('number_limits');
      expect(supabase.from().select).toHaveBeenCalledWith('*');
      expect(supabase.from().select().eq).toHaveBeenCalledWith('event_id', mockEventId);
    });
    
    it('debería manejar errores correctamente', async () => {
      // Configurar el mock para simular un error
      supabase.from().select().eq().order().mockResolvedValue({
        data: null,
        error: { message: 'Error de prueba' }
      });
      
      const result = await getNumberLimits(mockEventId);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('updateNumberLimit', () => {
    it('debería actualizar un límite existente', async () => {
      // Configurar mocks para simular un límite existente
      supabase.from().select().eq().eq().single().mockResolvedValue({
        data: { id: '1', event_id: mockEventId, number_range: mockNumberRange, max_times: 5, times_sold: 2 },
        error: null
      });
      
      supabaseAdmin.from().update().eq().select().single().mockResolvedValue({
        data: { id: '1', event_id: mockEventId, number_range: mockNumberRange, max_times: 10, times_sold: 2 },
        error: null
      });
      
      const result = await updateNumberLimit(mockEventId, mockNumberRange, 10);
      
      expect(result).toEqual({
        id: '1',
        event_id: mockEventId,
        number_range: mockNumberRange,
        max_times: 10,
        times_sold: 2
      });
    });
    
    it('debería crear un nuevo límite si no existe', async () => {
      // Configurar mocks para simular que no existe el límite
      supabase.from().select().eq().eq().single().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No se encontraron resultados' }
      });
      
      supabaseAdmin.from().insert().select().single().mockResolvedValue({
        data: { id: '2', event_id: mockEventId, number_range: mockNumberRange, max_times: 10, times_sold: 0 },
        error: null
      });
      
      const result = await updateNumberLimit(mockEventId, mockNumberRange, 10);
      
      expect(result).toEqual({
        id: '2',
        event_id: mockEventId,
        number_range: mockNumberRange,
        max_times: 10,
        times_sold: 0
      });
    });
  });
  
  describe('checkNumberAvailability', () => {
    it('debería devolver disponible=true si no hay límites configurados', async () => {
      // Configurar mock para simular que no hay límites
      supabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null
      });
      
      const result = await checkNumberAvailability(mockEventId, mockSingleNumber, 1);
      
      expect(result).toEqual({
        available: true,
        remaining: Infinity
      });
    });
    
    it('debería verificar correctamente si un número está dentro de un rango', async () => {
      // Configurar mocks para simular un límite existente
      supabase.from().select().eq().mockResolvedValue({
        data: [{ id: '1', event_id: mockEventId, number_range: mockNumberRange, max_times: 10, times_sold: 5 }],
        error: null
      });
      
      // Mock para la consulta individual del límite
      supabase.from().select().eq().single().mockResolvedValue({
        data: { id: '1', event_id: mockEventId, number_range: mockNumberRange, max_times: 10, times_sold: 5 },
        error: null
      });
      
      const result = await checkNumberAvailability(mockEventId, mockSingleNumber, 2);
      
      expect(result).toEqual({
        available: true,
        remaining: 5,
        limitId: '1'
      });
    });
  });
  
  describe('incrementNumberSold', () => {
    it('debería incrementar correctamente el contador de veces vendidas', async () => {
      // Importación dinámica mock
      const mockRpcRetry = { callRPCWithRetry: vi.fn().mockResolvedValue(true) };
      vi.mock('../rpc-retry', () => mockRpcRetry);
      
      // Configurar mocks para checkNumberAvailability
      vi.mock('../number-limits', async () => {
        const actual = await vi.importActual('../number-limits');
        return {
          ...actual,
          checkNumberAvailability: vi.fn().mockResolvedValue({
            available: true,
            remaining: 5,
            limitId: '1'
          })
        };
      });
      
      const result = await incrementNumberSold(mockEventId, mockSingleNumber, 1);
      
      expect(result).toBe(true);
    });
  });
});