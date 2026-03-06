-- ================================================================
-- PeuterPlannen: Admin/Partner hardening and consistency
-- Migration: 20260306_admin_partner_hardening.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 1) Claims schema hardening
-- ----------------------------------------------------------------
ALTER TABLE public.location_claim_requests
  ADD COLUMN IF NOT EXISTS review_reason TEXT;

ALTER TABLE public.location_claim_requests
  DROP CONSTRAINT IF EXISTS location_claim_requests_status_check;

ALTER TABLE public.location_claim_requests
  ADD CONSTRAINT location_claim_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'auto_rejected_duplicate'));

CREATE INDEX IF NOT EXISTS idx_claim_requests_status_created_at
  ON public.location_claim_requests (status, created_at DESC);

-- ----------------------------------------------------------------
-- 2) Venue owner constraints and dedupe safety
-- ----------------------------------------------------------------
-- Keep the most recently updated owner-location pair and clear duplicates.
WITH ranked AS (
  SELECT
    id,
    location_id,
    ROW_NUMBER() OVER (
      PARTITION BY location_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.venue_owners
  WHERE location_id IS NOT NULL
)
UPDATE public.venue_owners vo
SET location_id = NULL,
    updated_at = now()
FROM ranked r
WHERE vo.id = r.id
  AND r.rn > 1;

ALTER TABLE public.venue_owners
  DROP CONSTRAINT IF EXISTS venue_owners_subscription_status_check;

ALTER TABLE public.venue_owners
  ADD CONSTRAINT venue_owners_subscription_status_check
  CHECK (subscription_status IN ('none', 'trial', 'featured', 'past_due', 'canceled'));

ALTER TABLE public.venue_owners
  DROP CONSTRAINT IF EXISTS venue_owners_plan_tier_check;

ALTER TABLE public.venue_owners
  ADD CONSTRAINT venue_owners_plan_tier_check
  CHECK (plan_tier IN ('none', 'featured'));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_venue_owners_location_non_null
  ON public.venue_owners (location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_venue_owners_subscription_status
  ON public.venue_owners (subscription_status);

CREATE INDEX IF NOT EXISTS idx_venue_owners_location_id
  ON public.venue_owners (location_id);

-- ----------------------------------------------------------------
-- 3) Transactional claim approval function for admin-api
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_claim(
  p_claim_id UUID,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim RECORD;
  v_owner_id UUID;
  v_auto_rejected_ids UUID[] := '{}';
BEGIN
  SELECT id, user_id, location_id, status
    INTO v_claim
  FROM public.location_claim_requests
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Claim niet gevonden';
  END IF;

  IF v_claim.status <> 'pending' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Claim is niet meer openstaand';
  END IF;

  UPDATE public.location_claim_requests
  SET status = 'approved',
      review_reason = 'Goedgekeurd door admin',
      reviewed_by = p_admin_user_id,
      reviewed_at = now()
  WHERE id = p_claim_id;

  -- Ensure only one owner remains linked to this location.
  UPDATE public.venue_owners
  SET location_id = NULL,
      updated_at = now()
  WHERE location_id = v_claim.location_id
    AND user_id <> v_claim.user_id;

  INSERT INTO public.venue_owners (user_id, location_id, updated_at)
  VALUES (v_claim.user_id, v_claim.location_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    location_id = EXCLUDED.location_id,
    updated_at = now()
  RETURNING id INTO v_owner_id;

  UPDATE public.locations
  SET claimed_by_user_id = v_claim.user_id
  WHERE id = v_claim.location_id;

  WITH auto_rejected AS (
    UPDATE public.location_claim_requests
    SET status = 'auto_rejected_duplicate',
        review_reason = 'Auto-afgewezen: andere claim op deze locatie is goedgekeurd.',
        reviewed_by = p_admin_user_id,
        reviewed_at = now()
    WHERE location_id = v_claim.location_id
      AND id <> p_claim_id
      AND status = 'pending'
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}'::UUID[])
    INTO v_auto_rejected_ids
  FROM auto_rejected;

  RETURN jsonb_build_object(
    'ok', true,
    'approved_claim_id', p_claim_id,
    'auto_rejected_claim_ids', v_auto_rejected_ids,
    'owner_id', v_owner_id,
    'location_id', v_claim.location_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_claim(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_claim(UUID, UUID) TO service_role;

-- ----------------------------------------------------------------
-- 4) Owner edit log trigger on partner-editable fields
-- ----------------------------------------------------------------
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS opening_hours TEXT;

CREATE OR REPLACE FUNCTION public.trg_log_owner_location_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Only log edits made by the currently claimed owner in user context.
  IF v_user_id IS NULL OR OLD.claimed_by_user_id IS NULL OR v_user_id <> OLD.claimed_by_user_id THEN
    RETURN NEW;
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'description', OLD.description, NEW.description);
  END IF;

  IF NEW.website IS DISTINCT FROM OLD.website THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'website', OLD.website, NEW.website);
  END IF;

  IF NEW.opening_hours IS DISTINCT FROM OLD.opening_hours THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'opening_hours', OLD.opening_hours, NEW.opening_hours);
  END IF;

  IF NEW.coffee IS DISTINCT FROM OLD.coffee THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'coffee', OLD.coffee::TEXT, NEW.coffee::TEXT);
  END IF;

  IF NEW.diaper IS DISTINCT FROM OLD.diaper THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'diaper', OLD.diaper::TEXT, NEW.diaper::TEXT);
  END IF;

  IF NEW.alcohol IS DISTINCT FROM OLD.alcohol THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'alcohol', OLD.alcohol::TEXT, NEW.alcohol::TEXT);
  END IF;

  IF NEW.min_age IS DISTINCT FROM OLD.min_age THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'min_age', OLD.min_age::TEXT, NEW.min_age::TEXT);
  END IF;

  IF NEW.max_age IS DISTINCT FROM OLD.max_age THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'max_age', OLD.max_age::TEXT, NEW.max_age::TEXT);
  END IF;

  IF NEW.weather IS DISTINCT FROM OLD.weather THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'weather', OLD.weather, NEW.weather);
  END IF;

  IF NEW.owner_photo_url IS DISTINCT FROM OLD.owner_photo_url THEN
    INSERT INTO public.location_edit_log (location_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, v_user_id, 'owner_photo_url', OLD.owner_photo_url, NEW.owner_photo_url);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_owner_location_edit_log ON public.locations;
CREATE TRIGGER trg_owner_location_edit_log
AFTER UPDATE OF description, website, opening_hours, coffee, diaper, alcohol, min_age, max_age, weather, owner_photo_url
ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.trg_log_owner_location_edits();

-- ----------------------------------------------------------------
-- 5) Tighten location_edit_log insert policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Service insert edits" ON public.location_edit_log;
DROP POLICY IF EXISTS "Insert own edits" ON public.location_edit_log;

CREATE POLICY "Insert own edits"
  ON public.location_edit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
