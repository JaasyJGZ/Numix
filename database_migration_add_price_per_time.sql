-- Migration: Add price_per_time to public.events with default and constraint
-- Purpose: Support per-event pricing (0.20 or 0.25) with a default of 0.20.
-- Safety: Idempotent; only adds column/constraint if missing and normalizes NULLs.

BEGIN;

-- 1) Add column if it doesn't exist
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_per_time numeric(4,2);

-- 2) Normalize NULLs before NOT NULL (existing rows get default 0.20)
UPDATE public.events
SET price_per_time = 0.20
WHERE price_per_time IS NULL;

-- 3) Add allowed-values CHECK constraint (only 0.20 or 0.25), if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_price_per_time_allowed_values'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_price_per_time_allowed_values
      CHECK (price_per_time IN (0.20, 0.25));
  END IF;
END
$$;

-- 4) Set default and NOT NULL
ALTER TABLE public.events ALTER COLUMN price_per_time SET DEFAULT 0.20;
ALTER TABLE public.events ALTER COLUMN price_per_time SET NOT NULL;

-- Optional: Column comment for clarity
COMMENT ON COLUMN public.events.price_per_time IS 'Unit price per time for the event (allowed: 0.20, 0.25). Default: 0.20.';

COMMIT;