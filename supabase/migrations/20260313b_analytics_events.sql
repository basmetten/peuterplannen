-- Anonymous product event tracking (zero PII, no consent required)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events(event_type, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anon can insert events, only service role can read
DROP POLICY IF EXISTS "Anon can insert events" ON public.analytics_events;
CREATE POLICY "Anon can insert events"
  ON public.analytics_events FOR INSERT WITH CHECK (true);
