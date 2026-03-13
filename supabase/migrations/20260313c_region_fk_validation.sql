-- Trigger that prevents locations from referencing non-existent regions.
-- Uses a text-based FK check instead of a formal FK constraint to avoid
-- a heavy text→integer migration on the region column.

CREATE OR REPLACE FUNCTION public.validate_location_region()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE name = NEW.region) THEN
    RAISE EXCEPTION 'Region "%" does not exist in regions table', NEW.region;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_location_region ON public.locations;
CREATE TRIGGER validate_location_region
  BEFORE INSERT OR UPDATE OF region ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.validate_location_region();
