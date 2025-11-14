-- ==========================================
-- INSTALACIÓN COMPLETA DE BASE DE DATOS PARA NUMIXPRO
-- Tablas, índices, triggers, RLS y funciones RPC numix_*
-- Incluye price_per_time en events
-- ==========================================

BEGIN;

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- TABLA: vendors
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABLA: events (incluye price_per_time)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT true,
    repeat_daily BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('active', 'closed_awarded', 'closed_not_awarded')) DEFAULT 'active',
    first_prize TEXT,
    second_prize TEXT,
    third_prize TEXT,
    awarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columna price_per_time (idempotente)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_per_time numeric(4,2);

-- Normalizar valores y restricciones
UPDATE public.events SET price_per_time = 0.20 WHERE price_per_time IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_price_per_time_allowed_values'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_price_per_time_allowed_values
      CHECK (price_per_time IN (0.20, 0.25));
  END IF;
END
$$;
ALTER TABLE public.events ALTER COLUMN price_per_time SET DEFAULT 0.20;
ALTER TABLE public.events ALTER COLUMN price_per_time SET NOT NULL;
COMMENT ON COLUMN public.events.price_per_time IS 'Unit price per time for the event (allowed: 0.20, 0.25). Default: 0.20.';

-- ==========================================
-- TABLA: number_limits
-- ==========================================
CREATE TABLE IF NOT EXISTS public.number_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    number_range TEXT NOT NULL,
    max_times INTEGER NOT NULL DEFAULT 0,
    times_sold INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, number_range),
    CHECK (max_times >= 0),
    CHECK (times_sold >= 0),
    CHECK (times_sold <= max_times)
);

-- ==========================================
-- TABLAS: tickets y ticket_rows
-- ==========================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    numbers TEXT,
    vendor_email TEXT NOT NULL,
    rows JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    times TEXT NOT NULL,
    actions TEXT NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_vendors_email ON public.vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON public.vendors(active);

CREATE INDEX IF NOT EXISTS idx_events_active ON public.events(active);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_number_limits_event_range ON public.number_limits(event_id, number_range);
CREATE INDEX IF NOT EXISTS idx_number_limits_availability ON public.number_limits(event_id, times_sold, max_times) WHERE times_sold < max_times;
CREATE INDEX IF NOT EXISTS idx_number_limits_updated ON public.number_limits(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON public.tickets(vendor_email);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_rows_ticket ON public.ticket_rows(ticket_id);

-- ==========================================
-- TRIGGERS updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS update_number_limits_updated_at ON public.number_limits;
CREATE TRIGGER update_number_limits_updated_at
    BEFORE UPDATE ON public.number_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RLS y Políticas
-- ==========================================
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_rows ENABLE ROW LEVEL SECURITY;

-- Nota: el proyecto usa sesiones locales y operaciones en servidor con service role.
-- Estas políticas permiten acceso de lectura para usuarios autenticados de Supabase.
-- Las operaciones sensibles deben realizarse desde el servidor con service role, que bypass RLS.

-- Policies must be created without "IF NOT EXISTS"; make idempotent by
-- dropping any existing policy first, then creating.
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vendors;
CREATE POLICY "Enable read access for authenticated users" ON public.vendors
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.events;
CREATE POLICY "Enable read access for authenticated users" ON public.events
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tickets;
CREATE POLICY "Enable all access for authenticated users" ON public.tickets
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.number_limits;
CREATE POLICY "Enable all access for authenticated users" ON public.number_limits
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ticket_rows;
CREATE POLICY "Enable all access for authenticated users" ON public.ticket_rows
    FOR ALL USING (auth.role() = 'authenticated');

-- Permisos
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ==========================================
-- RPC numix_* (con cleanup y funciones principales)
-- ==========================================

-- Cleanup de posibles firmas antiguas para evitar conflictos
DO $cleanup$
BEGIN
    BEGIN
        DROP FUNCTION IF EXISTS check_number_availability(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS check_number_availability(uuid,text) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS increment_number_sold_safely(uuid,integer,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS decrement_number_sold_safely(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS get_number_limits(uuid) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS get_number_limit(uuid,text) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    BEGIN
        DROP FUNCTION IF EXISTS update_number_limit(uuid,text,integer) CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END
$cleanup$;

-- numix_get_limits
CREATE OR REPLACE FUNCTION numix_get_limits(
  p_event_id UUID
) RETURNS JSONB AS $$
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_id no puede ser NULL', 'data', '[]'::jsonb);
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
          CASE WHEN number_range ~ '^[0-9]+$' THEN CAST(number_range AS INTEGER) ELSE 999999 END,
          number_range ASC
      ), '[]'::jsonb)
      FROM public.number_limits
      WHERE event_id = p_event_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- numix_get_limit
CREATE OR REPLACE FUNCTION numix_get_limit(
  p_event_id UUID,
  p_number_range TEXT
) RETURNS JSONB AS $$
DECLARE
  result_data JSONB;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Los parámetros no pueden ser NULL', 'data', null);
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
  WHERE event_id = p_event_id AND number_range = p_number_range;
  RETURN jsonb_build_object('success', true, 'data', COALESCE(result_data, 'null'::jsonb));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = pg_catalog, public;

-- numix_update_limit
CREATE OR REPLACE FUNCTION numix_update_limit(
  p_event_id UUID,
  p_number_range TEXT,
  p_max_times INTEGER
) RETURNS JSONB AS $$
DECLARE
  result_record RECORD;
BEGIN
  IF p_event_id IS NULL OR p_number_range IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_id y number_range no pueden ser NULL');
  END IF;
  IF p_max_times < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_times debe ser mayor o igual a cero');
  END IF;
  INSERT INTO public.number_limits (event_id, number_range, max_times, times_sold)
  VALUES (p_event_id, p_number_range, p_max_times, 0)
  ON CONFLICT (event_id, number_range)
  DO UPDATE SET max_times = EXCLUDED.max_times
  RETURNING * INTO result_record;
  RETURN jsonb_build_object('success', true, 'data', to_jsonb(result_record));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- numix_check_available
CREATE OR REPLACE FUNCTION numix_check_available(
  p_event_id UUID,
  p_number_range TEXT,
  p_requested_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
  limit_record RECORD;
  is_available BOOLEAN;
  remaining INTEGER;
BEGIN
  IF p_requested_amount <= 0 THEN
    RETURN jsonb_build_object('available', FALSE, 'remaining', 0, 'limit_id', NULL);
  END IF;
  SELECT nl.id, nl.max_times, nl.times_sold INTO limit_record
  FROM public.number_limits nl
  WHERE nl.event_id = p_event_id AND nl.number_range = p_number_range
  LIMIT 1;
  IF limit_record IS NULL THEN
    RETURN jsonb_build_object('available', TRUE, 'remaining', NULL, 'limit_id', NULL);
  END IF;
  remaining := GREATEST(0, limit_record.max_times - limit_record.times_sold);
  is_available := remaining >= p_requested_amount;
  RETURN jsonb_build_object('available', is_available, 'remaining', remaining, 'limit_id', limit_record.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- numix_increment
CREATE OR REPLACE FUNCTION numix_increment(
  p_limit_id UUID,
  p_increment INTEGER,
  p_max_times INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_times_sold INTEGER;
  updated_rows INTEGER;
BEGIN
  SELECT times_sold INTO current_times_sold FROM public.number_limits WHERE id = p_limit_id FOR UPDATE;
  IF current_times_sold IS NULL THEN RETURN FALSE; END IF;
  IF current_times_sold + p_increment > p_max_times THEN RETURN FALSE; END IF;
  UPDATE public.number_limits SET times_sold = times_sold + p_increment
  WHERE id = p_limit_id AND times_sold + p_increment <= p_max_times;
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- numix_decrement
CREATE OR REPLACE FUNCTION numix_decrement(
  p_event_id UUID,
  p_number_range TEXT,
  p_decrement INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  limit_id UUID;
  current_times_sold INTEGER;
  updated_rows INTEGER;
BEGIN
  SELECT id, times_sold INTO limit_id, current_times_sold
  FROM public.number_limits WHERE event_id = p_event_id AND number_range = p_number_range FOR UPDATE;
  IF limit_id IS NULL THEN RETURN FALSE; END IF;
  IF current_times_sold - p_decrement < 0 THEN RETURN FALSE; END IF;
  UPDATE public.number_limits SET times_sold = times_sold - p_decrement
  WHERE id = limit_id AND times_sold - p_decrement >= 0;
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- numix_create_ticket (simplificado; ajustar si se requiere más lógica)
CREATE OR REPLACE FUNCTION numix_create_ticket(
  p_id UUID,
  p_event_id UUID,
  p_client_name TEXT,
  p_amount NUMERIC(10,2),
  p_numbers TEXT,
  p_vendor_email TEXT,
  p_rows JSONB
) RETURNS JSONB AS $$
DECLARE
  inserted RECORD;
BEGIN
  INSERT INTO public.tickets (id, event_id, client_name, amount, numbers, vendor_email, rows)
  VALUES (p_id, p_event_id, p_client_name, p_amount, p_numbers, p_vendor_email, p_rows)
  RETURNING * INTO inserted;
  RETURN to_jsonb(inserted);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

COMMIT;