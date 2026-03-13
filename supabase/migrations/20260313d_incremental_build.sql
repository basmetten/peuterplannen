-- ================================================================
-- PeuterPlannen: Incremental build change tracking
-- Migration: 20260313d_incremental_build.sql
--
-- Adds arrays to site_publish_state that track which entities
-- changed since the last successful build, enabling incremental
-- rebuilds that only regenerate affected pages.
-- ================================================================

-- Add change-tracking columns
ALTER TABLE public.site_publish_state
  ADD COLUMN IF NOT EXISTS changed_location_ids BIGINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS changed_region_slugs TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS changed_editorial_slugs TEXT[] NOT NULL DEFAULT '{}';

-- Update the locations trigger to also track changed IDs
CREATE OR REPLACE FUNCTION public.trg_mark_publish_dirty_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  loc_id_text TEXT;
  loc_id BIGINT;
  old_region TEXT;
  new_region TEXT;
BEGIN
  loc_id_text := COALESCE(NEW.id::text, OLD.id::text, 'unknown');
  loc_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.mark_site_publish_dirty('locations', 'insert:' || loc_id_text);
    -- Track the changed location ID
    UPDATE public.site_publish_state
    SET changed_location_ids = array_append(
      COALESCE(changed_location_ids, '{}'),
      loc_id
    )
    WHERE id = 1 AND loc_id IS NOT NULL
      AND NOT (loc_id = ANY(COALESCE(changed_location_ids, '{}')));
    -- Track affected region
    IF NEW.region IS NOT NULL THEN
      UPDATE public.site_publish_state
      SET changed_region_slugs = array_append(
        COALESCE(changed_region_slugs, '{}'),
        NEW.region
      )
      WHERE id = 1
        AND NOT (NEW.region = ANY(COALESCE(changed_region_slugs, '{}')));
    END IF;
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.mark_site_publish_dirty('locations', 'delete:' || loc_id_text);
    UPDATE public.site_publish_state
    SET changed_location_ids = array_append(
      COALESCE(changed_location_ids, '{}'),
      loc_id
    )
    WHERE id = 1 AND loc_id IS NOT NULL
      AND NOT (loc_id = ANY(COALESCE(changed_location_ids, '{}')));
    IF OLD.region IS NOT NULL THEN
      UPDATE public.site_publish_state
      SET changed_region_slugs = array_append(
        COALESCE(changed_region_slugs, '{}'),
        OLD.region
      )
      WHERE id = 1
        AND NOT (OLD.region = ANY(COALESCE(changed_region_slugs, '{}')));
    END IF;
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
      UPDATE public.site_publish_state
      SET changed_location_ids = array_append(
        COALESCE(changed_location_ids, '{}'),
        loc_id
      )
      WHERE id = 1 AND loc_id IS NOT NULL
        AND NOT (loc_id = ANY(COALESCE(changed_location_ids, '{}')));
      -- Track both old and new region if region changed
      old_region := OLD.region;
      new_region := NEW.region;
      IF new_region IS NOT NULL THEN
        UPDATE public.site_publish_state
        SET changed_region_slugs = array_append(
          COALESCE(changed_region_slugs, '{}'),
          new_region
        )
        WHERE id = 1
          AND NOT (new_region = ANY(COALESCE(changed_region_slugs, '{}')));
      END IF;
      IF old_region IS DISTINCT FROM new_region AND old_region IS NOT NULL THEN
        UPDATE public.site_publish_state
        SET changed_region_slugs = array_append(
          COALESCE(changed_region_slugs, '{}'),
          old_region
        )
        WHERE id = 1
          AND NOT (old_region = ANY(COALESCE(changed_region_slugs, '{}')));
      END IF;
    END IF;

    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$;

-- Recreate the trigger (function was replaced)
DROP TRIGGER IF EXISTS trg_publish_dirty_locations ON public.locations;
CREATE TRIGGER trg_publish_dirty_locations
AFTER INSERT OR UPDATE OR DELETE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_publish_dirty_locations();
