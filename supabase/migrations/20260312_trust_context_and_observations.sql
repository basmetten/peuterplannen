-- ================================================================
-- PeuterPlannen: Trust context + moderated observations
-- Migration: 20260312_trust_context_and_observations.sql
-- ================================================================

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS price_band TEXT,
  ADD COLUMN IF NOT EXISTS time_of_day_fit TEXT,
  ADD COLUMN IF NOT EXISTS rain_backup_quality TEXT,
  ADD COLUMN IF NOT EXISTS shade_or_shelter TEXT,
  ADD COLUMN IF NOT EXISTS parking_ease TEXT,
  ADD COLUMN IF NOT EXISTS buggy_friendliness TEXT,
  ADD COLUMN IF NOT EXISTS toilet_confidence TEXT,
  ADD COLUMN IF NOT EXISTS noise_level TEXT,
  ADD COLUMN IF NOT EXISTS food_fit TEXT,
  ADD COLUMN IF NOT EXISTS play_corner_quality TEXT,
  ADD COLUMN IF NOT EXISTS crowd_pattern TEXT,
  ADD COLUMN IF NOT EXISTS verification_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS verification_mode TEXT,
  ADD COLUMN IF NOT EXISTS last_context_refresh_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'locations_price_band_check'
      AND conrelid = 'public.locations'::regclass
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_price_band_check
      CHECK (price_band IS NULL OR price_band IN ('free', 'low', 'mid', 'high')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'locations_time_of_day_fit_check'
      AND conrelid = 'public.locations'::regclass
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_time_of_day_fit_check
      CHECK (time_of_day_fit IS NULL OR time_of_day_fit IN ('ochtend', 'middag', 'hele dag', 'flexibel')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'locations_verification_mode_check'
      AND conrelid = 'public.locations'::regclass
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_verification_mode_check
      CHECK (
        verification_mode IS NULL
        OR verification_mode IN ('editorial', 'partner', 'parent_signal', 'web_verified', 'phone_verified', 'visit_verified')
      ) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.location_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id BIGINT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value_json JSONB NOT NULL,
  confidence NUMERIC(3,2),
  evidence_url TEXT,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'location_observations_source_type_check'
      AND conrelid = 'public.location_observations'::regclass
  ) THEN
    ALTER TABLE public.location_observations
      ADD CONSTRAINT location_observations_source_type_check
      CHECK (source_type IN ('editor', 'partner', 'parent')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_location_observations_location_created
  ON public.location_observations(location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_observations_field
  ON public.location_observations(field_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_observations_source
  ON public.location_observations(source_type, created_at DESC);

ALTER TABLE public.location_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own observations" ON public.location_observations;
CREATE POLICY "Read own observations"
  ON public.location_observations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.venue_owners vo
      WHERE vo.location_id = location_observations.location_id
        AND vo.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert own observations" ON public.location_observations;
CREATE POLICY "Insert own observations"
  ON public.location_observations
  FOR INSERT
  WITH CHECK (
    source_type IN ('partner', 'parent')
    AND (
      EXISTS (
        SELECT 1
        FROM public.venue_owners vo
        WHERE vo.location_id = location_observations.location_id
          AND vo.user_id = auth.uid()
      )
      OR source_type = 'parent'
    )
  );

DROP POLICY IF EXISTS "Update own pending observations" ON public.location_observations;
CREATE POLICY "Update own pending observations"
  ON public.location_observations
  FOR UPDATE
  USING (
    approved_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.venue_owners vo
      WHERE vo.location_id = location_observations.location_id
        AND vo.user_id = auth.uid()
    )
  )
  WITH CHECK (
    approved_at IS NULL
  );

DROP TRIGGER IF EXISTS location_observations_updated_at ON public.location_observations;
CREATE TRIGGER location_observations_updated_at
  BEFORE UPDATE ON public.location_observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
