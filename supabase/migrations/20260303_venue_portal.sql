-- ================================================================
-- PeuterPlannen: Venue Owner Portal + Featured Listings
-- Migration: 20260303_venue_portal.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Extend locations table
-- ----------------------------------------------------------------
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS claimed_by_user_id  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS owner_verified       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_tier        TEXT,      -- 'basis' | 'featured'
  ADD COLUMN IF NOT EXISTS last_owner_update    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_photo_url      TEXT;

-- ----------------------------------------------------------------
-- 2. venue_owners table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venue_owners (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id         BIGINT      REFERENCES public.locations(id) ON DELETE SET NULL,
  full_name           TEXT,
  business_name       TEXT,
  phone               TEXT,
  stripe_customer_id  TEXT        UNIQUE,
  subscription_status TEXT        DEFAULT 'none',
    -- 'none' | 'trial' | 'basis' | 'featured' | 'past_due' | 'canceled'
  subscription_id     TEXT,
  plan_tier           TEXT        DEFAULT 'none',  -- 'none' | 'basis' | 'featured'
  plan_expires_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------
-- 3. location_claim_requests table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_claim_requests (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL REFERENCES auth.users(id),
  location_id  BIGINT  NOT NULL REFERENCES public.locations(id),
  message      TEXT,
  status       TEXT    DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  reviewed_by  UUID    REFERENCES auth.users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Rate limiting index: supports claim limit checks (enforcement moved to DB trigger)
CREATE INDEX IF NOT EXISTS idx_claim_requests_user_created
  ON public.location_claim_requests(user_id, created_at);

-- ----------------------------------------------------------------
-- 4. location_edit_log table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_edit_log (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  BIGINT  NOT NULL REFERENCES public.locations(id),
  user_id      UUID    NOT NULL REFERENCES auth.users(id),
  field_name   TEXT    NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edit_log_location
  ON public.location_edit_log(location_id, created_at DESC);

-- ----------------------------------------------------------------
-- 5. RLS: locations
-- ----------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Public read (already existing, recreate safely)
DROP POLICY IF EXISTS "Public read" ON public.locations;
CREATE POLICY "Public read"
  ON public.locations FOR SELECT USING (true);

-- Owner can update their own claimed location (only with active subscription)
DROP POLICY IF EXISTS "Owner can update own location" ON public.locations;
CREATE POLICY "Owner can update own location"
  ON public.locations FOR UPDATE
  USING (
    claimed_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venue_owners vo
      WHERE vo.user_id = auth.uid()
        AND vo.location_id = locations.id
        AND vo.subscription_status IN ('basis', 'featured', 'trial')
    )
  )
  WITH CHECK (
    claimed_by_user_id = auth.uid()
  );

-- ----------------------------------------------------------------
-- 6. RLS: venue_owners
-- ----------------------------------------------------------------
ALTER TABLE public.venue_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own record" ON public.venue_owners;
CREATE POLICY "Read own record"
  ON public.venue_owners FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own record" ON public.venue_owners;
CREATE POLICY "Update own record"
  ON public.venue_owners FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Insert own record" ON public.venue_owners;
CREATE POLICY "Insert own record"
  ON public.venue_owners FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- 7. RLS: location_claim_requests
-- ----------------------------------------------------------------
ALTER TABLE public.location_claim_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "See own requests" ON public.location_claim_requests;
CREATE POLICY "See own requests"
  ON public.location_claim_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Submit request" ON public.location_claim_requests;
CREATE POLICY "Submit request"
  ON public.location_claim_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- 8. RLS: location_edit_log
-- ----------------------------------------------------------------
ALTER TABLE public.location_edit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own edits" ON public.location_edit_log;
CREATE POLICY "Read own edits"
  ON public.location_edit_log FOR SELECT USING (user_id = auth.uid());

-- Service role can insert (called from Edge Functions only)
DROP POLICY IF EXISTS "Service insert edits" ON public.location_edit_log;
CREATE POLICY "Service insert edits"
  ON public.location_edit_log FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------
-- 9. Updated_at trigger for venue_owners
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venue_owners_updated_at ON public.venue_owners;
CREATE TRIGGER venue_owners_updated_at
  BEFORE UPDATE ON public.venue_owners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
