-- Route partner updates through observation review instead of direct live writes.

DROP POLICY IF EXISTS "Owner can update own location" ON public.locations;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_partner_observation_per_field
  ON public.location_observations (location_id, field_name, source_type)
  WHERE status = 'pending' AND source_type = 'partner';
