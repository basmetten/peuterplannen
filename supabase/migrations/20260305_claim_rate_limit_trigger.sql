-- ================================================================
-- PeuterPlannen: Server-side claim request rate limit
-- Migration: 20260305_claim_rate_limit_trigger.sql
-- ================================================================

CREATE OR REPLACE FUNCTION public.enforce_claim_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Always use server time for consistent enforcement.
  NEW.created_at := now();

  SELECT COUNT(*)
    INTO recent_count
  FROM public.location_claim_requests
  WHERE user_id = NEW.user_id
    AND created_at >= (now() - INTERVAL '24 hours');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Je hebt vandaag al 3 claim-aanvragen ingediend. Probeer het morgen opnieuw.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_request_rate_limit ON public.location_claim_requests;
CREATE TRIGGER trg_claim_request_rate_limit
BEFORE INSERT ON public.location_claim_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_claim_request_rate_limit();
