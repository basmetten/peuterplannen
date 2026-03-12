-- ================================================================
-- PeuterPlannen: ops briefs and cadence artifacts
-- Migration: 20260312e_ops_briefs.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS public.ops_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ops-generator',
  status TEXT NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_briefs_type_check'
      AND conrelid = 'public.ops_briefs'::regclass
  ) THEN
    ALTER TABLE public.ops_briefs
      ADD CONSTRAINT ops_briefs_type_check
      CHECK (brief_type IN ('seo_ops', 'newsletter', 'distribution')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ops_briefs_status_check'
      AND conrelid = 'public.ops_briefs'::regclass
  ) THEN
    ALTER TABLE public.ops_briefs
      ADD CONSTRAINT ops_briefs_status_check
      CHECK (status IN ('draft', 'active', 'archived')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_briefs_type_source_unique
  ON public.ops_briefs(brief_type, source);

CREATE INDEX IF NOT EXISTS idx_ops_briefs_status_updated
  ON public.ops_briefs(status, updated_at DESC);

ALTER TABLE public.ops_briefs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS ops_briefs_updated_at ON public.ops_briefs;
CREATE TRIGGER ops_briefs_updated_at
  BEFORE UPDATE ON public.ops_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
