-- ==========================================
-- ESQUEMA COMPLETO PARA NUMIXPRO
-- Ejecutar ANTES de database_functions.sql
-- ==========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- TABLA DE VENDEDORES
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
-- TABLA DE EVENTOS/SORTEOS
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

-- ==========================================
-- TABLA DE LÍMITES DE NÚMEROS
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
-- TABLA DE TICKETS
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

-- ==========================================
-- TABLA DE FILAS DE TICKETS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ticket_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    times TEXT NOT NULL,
    actions TEXT NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES OPTIMIZADOS
-- ==========================================

-- Índices para vendors
CREATE INDEX IF NOT EXISTS idx_vendors_email ON public.vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON public.vendors(active);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_active ON public.events(active);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(start_date, end_date);

-- Índices para number_limits
CREATE INDEX IF NOT EXISTS idx_number_limits_event_range ON public.number_limits(event_id, number_range);
CREATE INDEX IF NOT EXISTS idx_number_limits_availability ON public.number_limits(event_id, times_sold, max_times) WHERE times_sold < max_times;
CREATE INDEX IF NOT EXISTS idx_number_limits_updated ON public.number_limits(updated_at DESC);

-- Índices para tickets
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_vendor ON public.tickets(vendor_email);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at DESC);

-- Índices para ticket_rows
CREATE INDEX IF NOT EXISTS idx_ticket_rows_ticket ON public.ticket_rows(ticket_id);

-- ==========================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public;

-- Triggers
CREATE TRIGGER update_number_limits_updated_at
    BEFORE UPDATE ON public.number_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_rows ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según tus necesidades de seguridad)
CREATE POLICY "Enable read access for authenticated users" ON public.vendors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.tickets
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.number_limits
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.ticket_rows
    FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- PERMISOS
-- ==========================================

-- Otorgar permisos a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;