-- Client-side error tracking table
-- Receives errors from error-reporter.js via sendBeacon (anon key, insert-only)
CREATE TABLE IF NOT EXISTS public.client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  source TEXT,
  line INTEGER,
  col INTEGER,
  stack TEXT,
  url TEXT,
  ua TEXT,
  ts TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Anon can insert (error reporting), only service role can read
CREATE POLICY "Anon can insert errors"
  ON public.client_errors FOR INSERT WITH CHECK (true);
