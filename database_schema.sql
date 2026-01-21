-- Funciones RPC para manejo seguro de límites de números en NumixPro
-- Este script contiene todas las funciones necesarias para el manejo de number_limits

-- ==========================================
-- FUNCIONES DE CONSULTA
-- ==========================================

-- Función para obtener todos los límites de números para un evento
CREATE OR REPLACE FUNCTION get_number_limits(
  p_event_id UUID
) RETURNS SETOF number_limits AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.number_limits
  WHERE event_id = p_event_id
  ORDER BY number_range ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para obtener un límite específico por evento y rango
CREATE OR REPLACE FUNCTION get_number_limit(
  p_event_id UUID,
  p_number_range TEXT
) RETURNS SETOF number_limits AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.number_limits
  WHERE event_id = p_event_id
  AND number_range = p_number_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- ==========================================
-- FUNCIONES DE GESTIÓN
-- ==========================================

-- Función para crear o actualizar un límite de número
CREATE OR REPLACE FUNCTION update_number_limit(
  p_event_id UUID,
  p_number_range TEXT,
  p_max_times INTEGER
) RETURNS SETOF number_limits AS $$
DECLARE
  existing_limit_id UUID;
  result_record number_limits;
BEGIN
  -- Validar parámetros
  IF p_max_times < 0 THEN
    RAISE EXCEPTION 'El número máximo debe ser mayor o igual a cero';
  END IF;
  
  -- Verificar si ya existe un límite para este número/rango
  SELECT id INTO existing_limit_id
  FROM public.number_limits
  WHERE event_id = p_event_id
  AND number_range = p_number_range;
  
  IF existing_limit_id IS NOT NULL THEN
    -- Actualizar el límite existente
    UPDATE public.number_limits
    SET max_times = p_max_times
    WHERE id = existing_limit_id
    RETURNING * INTO result_record;
  ELSE
    -- Crear un nuevo límite
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
    ) RETURNING * INTO result_record;
  END IF;
  
  RETURN NEXT result_record;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- ==========================================
-- FUNCIONES DE VERIFICACIÓN Y DISPONIBILIDAD
-- ==========================================

-- Función para verificar la disponibilidad de un número
CREATE OR REPLACE FUNCTION check_number_availability(
  p_event_id UUID,
  p_number_range TEXT,
  p_requested_amount INTEGER
) RETURNS JSON AS $$
DECLARE
  limit_record RECORD;
  is_available BOOLEAN;
  remaining INTEGER;
  limit_id UUID;
BEGIN
  -- Validar parámetros
  IF p_requested_amount <= 0 THEN
    RAISE WARNING 'Cantidad solicitada inválida: %', p_requested_amount;
    RETURN json_build_object(
      'available', FALSE,
      'remaining', 0,
      'limit_id', NULL
    );
  END IF;
  
  -- Buscar si existe un límite para este número o rango
  SELECT nl.id, nl.max_times, nl.times_sold
  INTO limit_record
  FROM public.number_limits nl
  WHERE nl.event_id = p_event_id
  AND (
    nl.number_range = p_number_range
    OR (
      -- Verificar si el número está en un rango con formato 'XX-YY'
      nl.number_range LIKE '%--%'
      AND (
        CASE 
          WHEN p_number_range ~ '^[0-9]+$' THEN
            CAST(p_number_range AS INTEGER) BETWEEN 
              CAST(SPLIT_PART(nl.number_range, '-', 1) AS INTEGER) AND
              CAST(SPLIT_PART(nl.number_range, '-', 2) AS INTEGER)
          ELSE FALSE
        END
      )
    )
  )
  LIMIT 1;
  
  -- Si no hay límite, el número está disponible sin restricciones
  IF limit_record IS NULL THEN
    RETURN json_build_object(
      'available', TRUE,
      'remaining', NULL,
      'limit_id', NULL
    );
  END IF;
  
  -- Calcular disponibilidad
  remaining := GREATEST(0, limit_record.max_times - limit_record.times_sold);
  is_available := remaining >= p_requested_amount;
  
  -- Retornar resultado como JSON
  RETURN json_build_object(
    'available', is_available,
    'remaining', remaining,
    'limit_id', limit_record.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- ==========================================
-- FUNCIONES DE ACTUALIZACIÓN SEGURA
-- ==========================================

-- Función para incrementar de forma segura el contador de veces vendidas de un número
CREATE OR REPLACE FUNCTION increment_number_sold_safely(
  p_limit_id UUID,
  p_increment INTEGER,
  p_max_times INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_times_sold INTEGER;
  updated_rows INTEGER;
BEGIN
  -- Obtener el valor actual de times_sold con FOR UPDATE para bloquear la fila
  SELECT times_sold INTO current_times_sold
  FROM public.number_limits
  WHERE id = p_limit_id
  FOR UPDATE;
  
  -- Si no se encuentra el registro, retornar falso
  IF current_times_sold IS NULL THEN
    RAISE WARNING 'No se encontró el límite con ID %', p_limit_id;
    RETURN FALSE;
  END IF;
  
  -- Verificar estrictamente si excedería el límite
  IF current_times_sold + p_increment > p_max_times THEN
    RAISE WARNING 'Incremento excedería el límite: % + % > %', 
      current_times_sold, p_increment, p_max_times;
    RETURN FALSE;
  END IF;
  
  -- Actualizar con una condición para garantizar que no se exceda el límite
  UPDATE public.number_limits
  SET times_sold = times_sold + p_increment
  WHERE id = p_limit_id
  AND times_sold + p_increment <= p_max_times;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  -- Verificar si se actualizó correctamente
  IF updated_rows = 0 THEN
    RAISE WARNING 'No se pudo actualizar el contador. Posible condición de carrera detectada.';
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para decrementar de forma segura el contador de veces vendidas de un número
CREATE OR REPLACE FUNCTION decrement_number_sold_safely(
  p_event_id UUID,
  p_number_range TEXT,
  p_decrement INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  limit_id UUID;
  current_times_sold INTEGER;
  updated_rows INTEGER;
BEGIN
  -- Obtener el ID del límite y el valor actual de times_sold con FOR UPDATE para bloquear la fila
  SELECT id, times_sold INTO limit_id, current_times_sold
  FROM public.number_limits
  WHERE event_id = p_event_id AND number_range = p_number_range
  FOR UPDATE;
  
  -- Si no se encuentra el límite, retornar falso
  IF limit_id IS NULL THEN
    RAISE WARNING 'No se encontró límite para el rango % en el evento %', 
      p_number_range, p_event_id;
    RETURN FALSE;
  END IF;
  
  -- Calcular el nuevo valor (nunca menor que 0)
  DECLARE
    new_times_sold INTEGER := GREATEST(0, current_times_sold - p_decrement);
  BEGIN
    -- Actualizar el contador
    UPDATE public.number_limits
    SET times_sold = new_times_sold
    WHERE id = limit_id;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    -- Verificar si se actualizó correctamente
    IF updated_rows = 0 THEN
      RAISE WARNING 'No se pudo actualizar el contador para el rango %', p_number_range;
      RETURN FALSE;
    END IF;
    
    RETURN TRUE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- ==========================================
-- FUNCIONES DE PROCESAMIENTO EN LOTES
-- ==========================================

-- Función para verificar disponibilidad de múltiples números en lotes
CREATE OR REPLACE FUNCTION check_batch_number_availability(
  p_event_id UUID,
  p_numbers_data TEXT
) RETURNS JSON AS $$
DECLARE
  numbers_json JSONB;
  number_record RECORD;
  limit_record RECORD;
  result_array JSONB := '[]'::JSONB;
  availability_result JSONB;
BEGIN
  -- Convertir texto a JSONB
  numbers_json := p_numbers_data::JSONB;
  
  -- Verificar cada número en el lote
  FOR number_record IN 
    SELECT 
      (value->>'number_range')::TEXT as number_range,
      (value->>'requested_amount')::INTEGER as requested_amount
    FROM jsonb_array_elements(numbers_json)
  LOOP
    -- Buscar límite para este número
    SELECT nl.id, nl.max_times, nl.times_sold
    INTO limit_record
    FROM public.number_limits nl
    WHERE nl.event_id = p_event_id
    AND nl.number_range = number_record.number_range
    LIMIT 1;
    
    -- Construir resultado para este número
    IF limit_record IS NULL THEN
      availability_result := json_build_object(
        'number_range', number_record.number_range,
        'available', TRUE,
        'remaining', NULL,
        'limit_id', NULL
      );
    ELSE
      DECLARE
        remaining INTEGER := GREATEST(0, limit_record.max_times - limit_record.times_sold);
        is_available BOOLEAN := remaining >= number_record.requested_amount;
      BEGIN
        availability_result := json_build_object(
          'number_range', number_record.number_range,
          'available', is_available,
          'remaining', remaining,
          'limit_id', limit_record.id
        );
      END;
    END IF;
    
    -- Agregar al array de resultados
    result_array := result_array || availability_result::JSONB;
  END LOOP;
  
  RETURN json_build_object('results', result_array);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para incrementar múltiples números en una sola transacción
CREATE OR REPLACE FUNCTION increment_numbers_batch(
  p_event_id UUID,
  p_numbers_data TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  number_record RECORD;
  numbers_json JSONB;
BEGIN
  -- Convertir texto a JSONB
  numbers_json := p_numbers_data::JSONB;
  
  -- Procesar todos los números en una sola transacción
  FOR number_record IN 
    SELECT 
      (value->>'number_range')::TEXT as number_range,
      (value->>'increment_amount')::INTEGER as increment_amount
    FROM jsonb_array_elements(numbers_json)
  LOOP
    -- Verificar y actualizar en una sola operación
    UPDATE public.number_limits
    SET times_sold = times_sold + number_record.increment_amount
    WHERE event_id = p_event_id 
    AND number_range = number_record.number_range
    AND times_sold + number_record.increment_amount <= max_times;
    
    -- Si no se actualizó, significa que excedería el límite
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Límite excedido para número %', number_record.number_range;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Función para decrementar múltiples números en una sola transacción
CREATE OR REPLACE FUNCTION decrement_numbers_batch(
  p_event_id UUID,
  p_numbers_data TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  number_record RECORD;
  numbers_json JSONB;
BEGIN
  -- Convertir texto a JSONB
  numbers_json := p_numbers_data::JSONB;
  
  -- Actualizar todos los números en una sola operación
  FOR number_record IN 
    SELECT 
      (value->>'number_range')::TEXT as number_range,
      (value->>'decrement_amount')::INTEGER as decrement_amount
    FROM jsonb_array_elements(numbers_json)
  LOOP
    UPDATE public.number_limits
    SET times_sold = GREATEST(0, times_sold - number_record.decrement_amount)
    WHERE event_id = p_event_id 
    AND number_range = number_record.number_range;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;