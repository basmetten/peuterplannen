-- ================================================================
-- PeuterPlannen: site publish dirty-state + auto rebuild triggers
-- Migration: 20260305_site_publish_state.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS public.site_publish_state (
  id                 SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dirty              BOOLEAN NOT NULL DEFAULT false,
  last_change_at     TIMESTAMPTZ,
  last_change_source TEXT,
  last_change_reason TEXT,
  pending_count      INTEGER NOT NULL DEFAULT 0 CHECK (pending_count >= 0),
  last_published_at  TIMESTAMPTZ,
  last_publish_ref   TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_publish_state (id, dirty, pending_count)
VALUES (1, false, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mark_site_publish_dirty(change_source TEXT, change_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.site_publish_state (
    id,
    dirty,
    last_change_at,
    last_change_source,
    last_change_reason,
    pending_count,
    updated_at
  )
  VALUES (
    1,
    true,
    now(),
    COALESCE(NULLIF(change_source, ''), 'unknown'),
    change_reason,
    1,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    dirty = true,
    last_change_at = now(),
    last_change_source = EXCLUDED.last_change_source,
    last_change_reason = EXCLUDED.last_change_reason,
    pending_count = public.site_publish_state.pending_count + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_mark_publish_dirty_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  loc_id_text TEXT;
BEGIN
  loc_id_text := COALESCE(NEW.id::text, OLD.id::text, 'unknown');

  IF TG_OP = 'INSERT' THEN
    PERFORM public.mark_site_publish_dirty('locations', 'insert:' || loc_id_text);
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.mark_site_publish_dirty('locations', 'delete:' || loc_id_text);
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name
      OR OLD.region IS DISTINCT FROM NEW.region
      OR OLD.type IS DISTINCT FROM NEW.type
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.website IS DISTINCT FROM NEW.website
      OR OLD.lat IS DISTINCT FROM NEW.lat
      OR OLD.lng IS DISTINCT FROM NEW.lng
      OR OLD.coffee IS DISTINCT FROM NEW.coffee
      OR OLD.diaper IS DISTINCT FROM NEW.diaper
      OR OLD.alcohol IS DISTINCT FROM NEW.alcohol
      OR OLD.weather IS DISTINCT FROM NEW.weather
      OR OLD.toddler_highlight IS DISTINCT FROM NEW.toddler_highlight
      OR OLD.place_id IS DISTINCT FROM NEW.place_id
      OR OLD.last_verified IS DISTINCT FROM NEW.last_verified
      OR OLD.last_verified_at IS DISTINCT FROM NEW.last_verified_at
      OR OLD.owner_photo_url IS DISTINCT FROM NEW.owner_photo_url
    THEN
      PERFORM public.mark_site_publish_dirty('locations', 'update:' || loc_id_text);
    END IF;

    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_dirty_locations ON public.locations;
CREATE TRIGGER trg_publish_dirty_locations
AFTER INSERT OR UPDATE OR DELETE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_publish_dirty_locations();

CREATE OR REPLACE FUNCTION public.trg_mark_publish_dirty_regions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  region_id_text TEXT;
BEGIN
  region_id_text := COALESCE(NEW.id::text, OLD.id::text, 'unknown');
  PERFORM public.mark_site_publish_dirty('regions', lower(TG_OP) || ':' || region_id_text);
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.regions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_publish_dirty_regions ON public.regions';
    EXECUTE 'CREATE TRIGGER trg_publish_dirty_regions
             AFTER INSERT OR UPDATE OR DELETE ON public.regions
             FOR EACH ROW EXECUTE FUNCTION public.trg_mark_publish_dirty_regions()';
  END IF;
END;
$$;
