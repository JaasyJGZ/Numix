--- ==========================================
-- FUNCIONES RPC OPTIMIZADAS PARA NUMIXPRO
-- VERSIÓN FINAL - SOLUCIÓN DEFINITIVA
-- ==========================================

-- ==========================================
-- LIMPIEZA ESPECÍFICA CON FIRMAS EXACTAS
-- ==========================================

-- Eliminar funciones con firmas específicas para evitar ambigüedad
DO $cleanup$
BEGIN
    -- Eliminar check_number_availability con todas sus posibles firmas
    BEGIN
        DROP FUNCTION IF EXISTS check_number_availability(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'check_number_availability(uuid,text,integer) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS check_number_availability(uuid,text) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'check_number_availability(uuid,text) no existe o ya fue eliminada';
    END;
    
    -- Eliminar increment_number_sold_safely con todas sus posibles firmas
    BEGIN
        DROP FUNCTION IF EXISTS increment_number_sold_safely(uuid,integer,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'increment_number_sold_safely(uuid,integer,integer) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS increment_number_sold_safely(uuid,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'increment_number_sold_safely(uuid,integer) no existe o ya fue eliminada';
    END;
    
    -- Eliminar decrement_number_sold_safely con todas sus posibles firmas
    BEGIN
        DROP FUNCTION IF EXISTS decrement_number_sold_safely(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'decrement_number_sold_safely(uuid,text,integer) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS decrement_number_sold_safely(uuid,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'decrement_number_sold_safely(uuid,integer) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS decrement_number_sold_safely(uuid,integer,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'decrement_number_sold_safely(uuid,integer,integer) no existe o ya fue eliminada';
    END;
    
    -- Eliminar otras funciones que podrían causar conflictos
    BEGIN
        DROP FUNCTION IF EXISTS get_number_limits(uuid) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_number_limits(uuid) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS get_number_limit(uuid,text) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_number_limit(uuid,text) no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS update_number_limit(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'update_number_limit(uuid,text,integer) no existe o ya fue eliminada';
    END;
    
    -- Eliminar funciones de lote
    BEGIN
        DROP FUNCTION IF EXISTS create_ticket_with_batch_numbers CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'create_ticket_with_batch_numbers no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS decrement_numbers_batch CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'decrement_numbers_batch no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS increment_numbers_batch CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'increment_numbers_batch no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS check_batch_number_availability CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'check_batch_number_availability no existe o ya fue eliminada';
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS get_number_limits_stats CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_number_limits_stats no existe o ya fue eliminada';
    END;
    
    RAISE NOTICE 'Limpieza de funciones completada exitosamente';
END
$cleanup$;

-- ==========================================
-- FUNCIONES PRINCIPALES CON PREFIJO ÚNICO
-- ==========================================

-- Función para obtener límites de números
CREATE OR REPLACE FUNCTION numix_get_limits(
  p_event_id UUID
) RETURNS JSONB AS $$
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'event_id no puede ser NULL',
      'data', '[]'::jsonb
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'event_id', event_id,
          'number_range', number_range,
          'max_times', max_times,
          'times_sold', times_sold,
          'remaining', (max_times - times_sold),
          'created_at', created_at
        ) ORDER BY 
          CASE 
            WHEN number_range ~ '^[0-9]+$' THEN CAST(number_range AS INTEGER)
            ELSE 999999
          END,
          number_range ASC
      ), '[]'::jsonb)
      FROM public.number_limits
      WHERE event_id = p_event_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- Función para obtener límite específico
CREATE OR REPLACE FUNCTION numix_get_limit(
  p_event_id UUID,
  p_number_range TEXT
) RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Los parámetros no pueden ser NULL',
      'data', null
    );
  END IF;
  
  SELECT jsonb_build_object(
    'id', id,
    'event_id', event_id,
    'number_range', number_range,
    'max_times', max_times,
    'times_sold', times_sold,
    'remaining', (max_times - times_sold),
    'created_at', created_at
  ) INTO result_data
  FROM public.number_limits
  WHERE event_id = p_event_id
  AND number_range = p_number_range;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(result_data, 'null'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- Función para crear/actualizar límites
CREATE OR REPLACE FUNCTION numix_update_limit(
  p_event_id UUID,
  p_number_range TEXT,
  p_max_times INTEGER
) RETURNS JSONB AS $$
DECLARE
  result_record RECORD;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'event_id y number_range no pueden ser NULL'
    );
  END IF;
  
  IF p_max_times < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'max_times debe ser mayor o igual a cero'
    );
  END IF;
  
  INSERT INTO public.number_limits (
    event_id,
    number_range,
    max_times,
    times_sold
  ) VALUES (
    p_event_id,
    p_number_range,
    p_max_times,
    0
  )
  ON CONFLICT (event_id, number_range)
  DO UPDATE SET 
    max_times = EXCLUDED.max_times,
    updated_at = NOW()
  RETURNING 
    id,
    event_id,
    number_range,
    max_times,
    times_sold,
    (max_times - times_sold) as remaining,
    created_at
  INTO result_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', result_record.id,
      'event_id', result_record.event_id,
      'number_range', result_record.number_range,
      'max_times', result_record.max_times,
      'times_sold', result_record.times_sold,
      'remaining', result_record.remaining,
      'created_at', result_record.created_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para verificar disponibilidad
CREATE OR REPLACE FUNCTION numix_check_available(
  p_event_id UUID,
  p_number_range TEXT,
  p_requested_amount INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  limit_record RECORD;
  remaining INTEGER;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'available', false,
      'remaining', 0,
      'limit_id', null,
      'error', 'Parámetros inválidos'
    );
  END IF;
  
  IF p_requested_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'available', false,
      'remaining', 0,
      'limit_id', null,
      'error', 'Cantidad solicitada inválida'
    );
  END IF;
  
  WITH number_check AS (
    SELECT 
      nl.id,
      nl.max_times,
      nl.times_sold,
      (nl.max_times - nl.times_sold) as available_slots
    FROM public.number_limits nl
    WHERE nl.event_id = p_event_id
    AND (
      nl.number_range = p_number_range
      OR (
        nl.number_range ~ '^[0-9]+-[0-9]+$'
        AND p_number_range ~ '^[0-9]+$'
        AND CAST(p_number_range AS INTEGER) BETWEEN 
          CAST(SPLIT_PART(nl.number_range, '-', 1) AS INTEGER) AND
          CAST(SPLIT_PART(nl.number_range, '-', 2) AS INTEGER)
      )
    )
    ORDER BY 
      CASE WHEN nl.number_range = p_number_range THEN 0 ELSE 1 END
    LIMIT 1
  )
  SELECT * INTO limit_record FROM number_check;
  
  IF limit_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'available', true,
      'remaining', null,
      'limit_id', null,
      'unlimited', true
    );
  END IF;
  
  remaining := GREATEST(0, limit_record.available_slots);
  
  RETURN jsonb_build_object(
    'success', true,
    'available', remaining >= p_requested_amount,
    'remaining', remaining,
    'limit_id', limit_record.id,
    'unlimited', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- Función para incrementar contadores
CREATE OR REPLACE FUNCTION numix_increment(
  p_limit_id UUID,
  p_increment INTEGER,
  p_max_times INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  updated_rows INTEGER;
  current_record RECORD;
BEGIN
  IF p_limit_id IS NULL OR p_increment IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'limit_id e increment son requeridos'
    );
  END IF;
  
  IF p_increment <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'increment debe ser mayor que cero'
    );
  END IF;
  
  UPDATE public.number_limits
  SET 
    times_sold = times_sold + p_increment,
    updated_at = NOW()
  WHERE id = p_limit_id
  AND (
    p_max_times IS NULL 
    OR times_sold + p_increment <= COALESCE(p_max_times, max_times)
  )
  AND times_sold + p_increment <= max_times
  RETURNING 
    id,
    times_sold,
    max_times,
    (max_times - times_sold) as remaining
  INTO current_record;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No se pudo incrementar: límite excedido o registro no encontrado'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'limit_id', current_record.id,
    'new_times_sold', current_record.times_sold,
    'remaining', current_record.remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para decrementar contadores
CREATE OR REPLACE FUNCTION numix_decrement(
  p_event_id UUID,
  p_number_range TEXT,
  p_decrement INTEGER
) RETURNS JSONB AS $$
DECLARE
  updated_rows INTEGER;
  current_record RECORD;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL OR p_decrement IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todos los parámetros son requeridos'
    );
  END IF;
  
  IF p_decrement <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'decrement debe ser mayor que cero'
    );
  END IF;
  
  -- Buscar si existe límite para este número (con bloqueo)
  SELECT nl.id, nl.max_times, nl.times_sold INTO limit_record
  FROM public.number_limits nl
  WHERE nl.event_id = p_event_id
  AND (
  -- Coincidencia exacta
  nl.number_range = row_record.actions
  OR (
    -- Rango con guiones (ej: "90-99")
    nl.number_range LIKE '%--%'
    AND row_record.actions ~ '^[0-9]+$'
    AND CAST(row_record.actions AS INTEGER) BETWEEN 
      CAST(SPLIT_PART(nl.number_range, '-', 1) AS INTEGER) AND
      CAST(SPLIT_PART(nl.number_range, '-', 2) AS INTEGER)
  )
  )
  FOR UPDATE;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Límite no encontrado',
      'event_id', p_event_id,
      'number_range', p_number_range
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'limit_id', current_record.id,
    'new_times_sold', current_record.times_sold,
    'remaining', current_record.remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para crear tickets con números en lote
CREATE OR REPLACE FUNCTION numix_create_ticket(
  p_event_id UUID,
  p_ticket_data JSONB,
  p_numbers_data JSONB
) RETURNS JSONB AS $$
DECLARE
  ticket_result JSONB;
  affected_rows INTEGER;
  total_numbers INTEGER;
BEGIN
  IF p_event_id IS NULL OR p_ticket_data IS NULL OR p_numbers_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Todos los parámetros son requeridos'
    );
  END IF;
  
  SELECT COUNT(*) INTO total_numbers
  FROM jsonb_array_elements(p_numbers_data)
  WHERE (value->>'increment_amount')::INTEGER > 0;
  
  IF total_numbers = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Debe incluir al menos un número'
    );
  END IF;
  
  PERFORM 1
  FROM public.number_limits nl
  WHERE nl.event_id = p_event_id
  AND nl.number_range IN (
    SELECT (value->>'number_range')::TEXT
    FROM jsonb_array_elements(p_numbers_data)
  )
  FOR UPDATE;
  
  WITH number_updates AS (
    SELECT 
      (value->>'number_range')::TEXT as number_range,
      (value->>'increment_amount')::INTEGER as increment_amount
    FROM jsonb_array_elements(p_numbers_data)
    WHERE (value->>'increment_amount')::INTEGER > 0
  )
  UPDATE public.number_limits nl
  SET 
    times_sold = nl.times_sold + nu.increment_amount,
    updated_at = NOW()
  FROM number_updates nu
  WHERE nl.event_id = p_event_id 
  AND nl.number_range = nu.number_range
  AND nl.times_sold + nu.increment_amount <= nl.max_times;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows != total_numbers THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Límite excedido en uno o más números',
      'updated', affected_rows,
      'expected', total_numbers
    );
  END IF;
  
  INSERT INTO public.tickets (
    id, 
    event_id, 
    client_name, 
    amount, 
    numbers, 
    vendor_email, 
    rows,
    created_at
  ) VALUES (
    COALESCE((p_ticket_data->>'id')::UUID, gen_random_uuid()),
    p_event_id,
    p_ticket_data->>'client_name',
    (p_ticket_data->>'amount')::NUMERIC,
    p_ticket_data->>'numbers',
    p_ticket_data->>'vendor_email',
    p_ticket_data->'rows',
    NOW()
  ) 
  RETURNING to_jsonb(tickets.*) INTO ticket_result;
  
  RETURN jsonb_build_object(
    'success', true,
    'ticket', ticket_result,
    'numbers_processed', affected_rows
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para decrementar números en lote
CREATE OR REPLACE FUNCTION numix_decrement_batch(
  p_event_id UUID,
  p_numbers_data JSONB
) RETURNS JSONB AS $$
DECLARE
  affected_rows INTEGER;
  total_numbers INTEGER;
BEGIN
  IF p_event_id IS NULL OR p_numbers_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Parámetros requeridos'
    );
  END IF;
  
  SELECT COUNT(*) INTO total_numbers
  FROM jsonb_array_elements(p_numbers_data)
  WHERE (value->>'decrement_amount')::INTEGER > 0;
  
  IF total_numbers = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'numbers_processed', 0,
      'message', 'No hay números para procesar'
    );
  END IF;
  
  WITH number_updates AS (
    SELECT 
      (value->>'number_range')::TEXT as number_range,
      (value->>'decrement_amount')::INTEGER as decrement_amount
    FROM jsonb_array_elements(p_numbers_data)
    WHERE (value->>'decrement_amount')::INTEGER > 0
  )
  UPDATE public.number_limits nl
  SET 
    times_sold = GREATEST(0, nl.times_sold - nu.decrement_amount),
    updated_at = NOW()
  FROM number_updates nu
  WHERE nl.event_id = p_event_id 
  AND nl.number_range = nu.number_range;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'numbers_processed', affected_rows,
    'expected', total_numbers
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para obtener estadísticas
CREATE OR REPLACE FUNCTION numix_get_stats(
  p_event_id UUID
) RETURNS JSONB AS $$
DECLARE
  stats_result JSONB;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'event_id es requerido'
    );
  END IF;
  
  SELECT jsonb_build_object(
    'success', true,
    'total_limits', COUNT(*),
    'total_capacity', COALESCE(SUM(max_times), 0),
    'total_sold', COALESCE(SUM(times_sold), 0),
    'total_remaining', COALESCE(SUM(max_times - times_sold), 0),
    'limits_at_capacity', COUNT(*) FILTER (WHERE times_sold >= max_times),
    'limits_available', COUNT(*) FILTER (WHERE times_sold < max_times)
  ) INTO stats_result
  FROM public.number_limits
  WHERE event_id = p_event_id;
  
  RETURN stats_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- ==========================================
-- FUNCIONES DE COMPATIBILIDAD
-- ==========================================

-- Alias para mantener compatibilidad con código existente
CREATE OR REPLACE FUNCTION get_number_limits(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN numix_get_limits(p_event_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION check_number_availability(
  p_event_id UUID,
  p_number_range TEXT,
  p_requested_amount INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
BEGIN
  RETURN numix_check_available(p_event_id, p_number_range, p_requested_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- ==========================================
-- PERMISOS Y VERIFICACIÓN FINAL
-- ==========================================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Verificación final
DO $verification$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname LIKE 'numix_%';
  
  RAISE NOTICE '✅ Funciones NumixPro instaladas correctamente: %', func_count;
  
  IF func_count >= 8 THEN
    RAISE NOTICE '🎉 INSTALACIÓN EXITOSA - Todas las funciones están disponibles';
  ELSE
    RAISE WARNING '⚠️ Algunas funciones pueden no haberse instalado correctamente';
  END IF;
END
$verification$;


-- ==========================================
-- FUNCIÓN TRANSACCIONAL PARA ELIMINAR TICKETS
-- ==========================================

-- Eliminar todas las versiones posibles de la función
DROP FUNCTION IF EXISTS delete_ticket_with_decrements(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS delete_ticket_with_decrements CASCADE;

-- Crear la función con parámetros claramente definidos
CREATE OR REPLACE FUNCTION delete_ticket_with_decrements(
  p_ticket_id UUID,
  p_event_id UUID,
  p_vendor_email TEXT
) RETURNS JSON AS $$
DECLARE
  ticket_record RECORD;
  row_record RECORD;
  ticket_rows JSONB;
  number_range TEXT;
  times_value INTEGER;
  limit_record RECORD;
  updated_rows INTEGER;
  total_decremented INTEGER := 0;
  number_as_int INTEGER;
  decade_number TEXT;
BEGIN
  -- 1. Obtener y bloquear el ticket
  SELECT id, vendor_email, rows INTO ticket_record
  FROM public.tickets
  WHERE id = p_ticket_id
  AND event_id = p_event_id
  FOR UPDATE;
  
  -- Verificar que el ticket existe
  IF ticket_record IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Ticket no encontrado',
      'decremented_count', 0
    );
  END IF;
  
  -- Verificar permisos (permitir "unknown" para compatibilidad)
  IF ticket_record.vendor_email != p_vendor_email AND ticket_record.vendor_email != 'unknown' THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'No autorizado: ticket pertenece a otro vendedor',
      'decremented_count', 0
    );
  END IF;
  
  -- 2. Procesar decrementos de números limitados
  ticket_rows := CASE 
    WHEN jsonb_typeof(ticket_record.rows) = 'array' THEN ticket_record.rows
    ELSE ticket_record.rows::TEXT::JSONB
  END;
  
  -- Iterar sobre cada fila del ticket
  FOR row_record IN 
    SELECT 
      (value->>'actions')::TEXT as actions,
      (value->>'times')::INTEGER as times
    FROM jsonb_array_elements(ticket_rows)
    WHERE (value->>'actions') IS NOT NULL 
    AND (value->>'times') IS NOT NULL
    AND (value->>'times')::INTEGER > 0
  LOOP
    number_range := row_record.actions;
    times_value := row_record.times;
    
    -- Buscar si existe límite para este número (con bloqueo)
    SELECT nl.id, nl.max_times, nl.times_sold INTO limit_record
    FROM public.number_limits nl
    WHERE nl.event_id = p_event_id
    AND (
      -- Coincidencia exacta
      nl.number_range = row_record.actions
      OR (
        -- Rango con guiones (ej: "90-99")
        nl.number_range LIKE '%--%'
        AND row_record.actions ~ '^[0-9]+$'
        AND CAST(row_record.actions AS INTEGER) BETWEEN 
          CAST(SPLIT_PART(nl.number_range, '-', 1) AS INTEGER) AND
          CAST(SPLIT_PART(nl.number_range, '-', 2) AS INTEGER)
      )
      OR (
        -- NUEVA LÓGICA: Número individual que pertenece a una decena limitada
        row_record.actions ~ '^[0-9]+$'
        AND (
          SELECT COUNT(*) > 0
          FROM public.number_limits nl2
          WHERE nl2.event_id = p_event_id
          AND nl2.number_range = (FLOOR(CAST(row_record.actions AS INTEGER) / 10) * 10)::TEXT
          AND nl2.id = nl.id
        )
      )
    )
    FOR UPDATE;
    
    -- Si existe límite, decrementar atómicamente
    IF limit_record IS NOT NULL THEN
      UPDATE public.number_limits
      SET times_sold = GREATEST(0, times_sold - times_value)
      WHERE id = limit_record.id;
      
      GET DIAGNOSTICS updated_rows = ROW_COUNT;
      
      IF updated_rows > 0 THEN
        total_decremented := total_decremented + times_value;
      END IF;
    END IF;
  END LOOP;
  
  -- 3. Eliminar el ticket
  DELETE FROM public.tickets
  WHERE id = p_ticket_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RAISE EXCEPTION 'Error eliminando ticket';
  END IF;
  
  -- 4. Retornar resultado exitoso
  RETURN json_build_object(
    'success', TRUE,
    'decremented_count', total_decremented,
    'ticket_id', p_ticket_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'decremented_count', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;


-- ==========================================
-- FUNCIÓN PARA ACTUALIZAR TICKETS CON DECREMENTOS
-- ==========================================

-- Eliminar versiones anteriores
DROP FUNCTION IF EXISTS update_ticket_with_decrements(UUID, UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_ticket_with_decrements CASCADE;

-- Crear la función para actualizar tickets con manejo de decrementos
CREATE OR REPLACE FUNCTION update_ticket_with_decrements(
  p_ticket_id UUID,
  p_event_id UUID,
  p_vendor_email TEXT,
  p_new_ticket_data JSONB
) RETURNS JSON AS $$
DECLARE
  original_ticket_record RECORD;
  original_rows JSONB;
  new_rows JSONB;
  original_row RECORD;
  new_row RECORD;
  row_found BOOLEAN;
  number_range TEXT;
  times_difference INTEGER;
  limit_record RECORD;
  updated_rows INTEGER;
  total_decremented INTEGER := 0;
BEGIN
  -- 1. Obtener y bloquear el ticket original
  SELECT id, vendor_email, rows INTO original_ticket_record
  FROM public.tickets
  WHERE id = p_ticket_id
  AND event_id = p_event_id
  FOR UPDATE;
  
  -- Verificar que el ticket existe
  IF original_ticket_record IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Ticket no encontrado',
      'decremented_count', 0
    );
  END IF;
  
  -- Verificar permisos
  IF original_ticket_record.vendor_email != p_vendor_email AND original_ticket_record.vendor_email != 'unknown' THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'No autorizado: ticket pertenece a otro vendedor',
      'decremented_count', 0
    );
  END IF;
  
  -- 2. Procesar diferencias entre filas originales y nuevas
  original_rows := CASE 
    WHEN jsonb_typeof(original_ticket_record.rows) = 'array' THEN original_ticket_record.rows
    ELSE original_ticket_record.rows::TEXT::JSONB
  END;
  
  new_rows := CASE 
    WHEN jsonb_typeof(p_new_ticket_data->'rows') = 'array' THEN p_new_ticket_data->'rows'
    ELSE (p_new_ticket_data->'rows')::TEXT::JSONB
  END;
  
  -- Iterar sobre las filas originales para encontrar las eliminadas o reducidas
  FOR original_row IN 
    SELECT 
      (value->>'actions')::TEXT as actions,
      (value->>'times')::INTEGER as times
    FROM jsonb_array_elements(original_rows)
    WHERE (value->>'actions') IS NOT NULL 
    AND (value->>'times') IS NOT NULL
    AND (value->>'times')::INTEGER > 0
  LOOP
    -- Buscar si esta fila original existe en las nuevas filas
    row_found := FALSE;
    times_difference := original_row.times; -- Por defecto, toda la cantidad se elimina
    
    FOR new_row IN 
      SELECT 
        (value->>'actions')::TEXT as actions,
        (value->>'times')::INTEGER as times
      FROM jsonb_array_elements(new_rows)
      WHERE (value->>'actions') IS NOT NULL 
      AND (value->>'times') IS NOT NULL
      AND (value->>'times')::INTEGER > 0
      AND (value->>'actions')::TEXT = original_row.actions
    LOOP
      row_found := TRUE;
      times_difference := original_row.times - new_row.times;
      EXIT; -- Solo debería haber una coincidencia
    END LOOP;
    
    -- Si hay una diferencia positiva (se eliminaron tiempos), decrementar
    IF times_difference > 0 THEN
      number_range := original_row.actions;
      
      -- Buscar si existe límite para este número (con bloqueo)
      SELECT nl.id, nl.max_times, nl.times_sold INTO limit_record
      FROM public.number_limits nl
      WHERE nl.event_id = p_event_id
      AND (
        -- Coincidencia exacta
        nl.number_range = original_row.actions
        OR (
          -- Rango con guiones (ej: "90-99")
          nl.number_range LIKE '%--%'
          AND original_row.actions ~ '^[0-9]+$'
          AND CAST(original_row.actions AS INTEGER) BETWEEN 
            CAST(SPLIT_PART(nl.number_range, '-', 1) AS INTEGER) AND
            CAST(SPLIT_PART(nl.number_range, '-', 2) AS INTEGER)
        )
        OR (
          -- Número individual que pertenece a una decena limitada
          original_row.actions ~ '^[0-9]+$'
          AND (
            SELECT COUNT(*) > 0
            FROM public.number_limits nl2
            WHERE nl2.event_id = p_event_id
            AND nl2.number_range = (FLOOR(CAST(original_row.actions AS INTEGER) / 10) * 10)::TEXT
            AND nl2.id = nl.id
          )
        )
      )
      FOR UPDATE;
      
      -- Si existe límite, decrementar atómicamente
      IF limit_record IS NOT NULL THEN
        UPDATE public.number_limits
        SET times_sold = GREATEST(0, times_sold - times_difference)
        WHERE id = limit_record.id;
        
        GET DIAGNOSTICS updated_rows = ROW_COUNT;
        
        IF updated_rows > 0 THEN
          total_decremented := total_decremented + times_difference;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- 3. Actualizar el ticket con los nuevos datos
  UPDATE public.tickets
  SET 
    client_name = (p_new_ticket_data->>'client_name')::TEXT,
    amount = (p_new_ticket_data->>'amount')::NUMERIC,
    numbers = (p_new_ticket_data->>'numbers')::TEXT,
    rows = new_rows,
    updated_at = NOW()
  WHERE id = p_ticket_id;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RAISE EXCEPTION 'Error actualizando ticket';
  END IF;
  
  -- 4. Retornar resultado exitoso
  RETURN json_build_object(
    'success', TRUE,
    'decremented_count', total_decremented,
    'ticket_id', p_ticket_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'decremented_count', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;