-- ================================================================
-- PeuterPlannen: admin control plane + editorial CMS primitives
-- Migration: 20260312b_admin_control_plane.sql
-- ================================================================

ALTER TABLE public.location_observations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'location_observations_status_check'
      AND conrelid = 'public.location_observations'::regclass
  ) THEN
    ALTER TABLE public.location_observations
      ADD CONSTRAINT location_observations_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'applied')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_location_observations_status_created
  ON public.location_observations(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.editorial_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  region_slug TEXT,
  type_slug TEXT,
  cluster_slug TEXT,
  location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  hero_kicker TEXT,
  hero_body_md TEXT,
  body_md TEXT,
  faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  curated_location_ids BIGINT[] NOT NULL DEFAULT '{}'::BIGINT[],
  related_blog_slugs TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  editorial_label TEXT NOT NULL DEFAULT 'PeuterPlannen redactie',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'editorial_pages_page_type_check'
      AND conrelid = 'public.editorial_pages'::regclass
  ) THEN
    ALTER TABLE public.editorial_pages
      ADD CONSTRAINT editorial_pages_page_type_check
      CHECK (page_type IN (
        'discover_hub',
        'methodology_page',
        'region_hub',
        'type_hub',
        'cluster_hub',
        'blog_index',
        'blog_article',
        'location_detail_override'
      )) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'editorial_pages_status_check'
      AND conrelid = 'public.editorial_pages'::regclass
  ) THEN
    ALTER TABLE public.editorial_pages
      ADD CONSTRAINT editorial_pages_status_check
      CHECK (status IN ('draft', 'published', 'archived')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'editorial_pages_faq_json_check'
      AND conrelid = 'public.editorial_pages'::regclass
  ) THEN
    ALTER TABLE public.editorial_pages
      ADD CONSTRAINT editorial_pages_faq_json_check
      CHECK (jsonb_typeof(faq_json) = 'array') NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_editorial_pages_type_slug_unique
  ON public.editorial_pages(page_type, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_editorial_pages_location_unique
  ON public.editorial_pages(location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_editorial_pages_status_type_updated
  ON public.editorial_pages(status, page_type, updated_at DESC);

ALTER TABLE public.editorial_pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.location_quality_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority SMALLINT NOT NULL DEFAULT 2,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'location_quality_tasks_status_check'
      AND conrelid = 'public.location_quality_tasks'::regclass
  ) THEN
    ALTER TABLE public.location_quality_tasks
      ADD CONSTRAINT location_quality_tasks_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'location_quality_tasks_priority_check'
      AND conrelid = 'public.location_quality_tasks'::regclass
  ) THEN
    ALTER TABLE public.location_quality_tasks
      ADD CONSTRAINT location_quality_tasks_priority_check
      CHECK (priority BETWEEN 1 AND 5) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_location_quality_tasks_status_priority
  ON public.location_quality_tasks(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_quality_tasks_location
  ON public.location_quality_tasks(location_id, status, created_at DESC);

ALTER TABLE public.location_quality_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.gsc_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_type_created
  ON public.gsc_snapshots(snapshot_type, created_at DESC);

ALTER TABLE public.gsc_snapshots ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS editorial_pages_updated_at ON public.editorial_pages;
CREATE TRIGGER editorial_pages_updated_at
  BEFORE UPDATE ON public.editorial_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS location_quality_tasks_updated_at ON public.location_quality_tasks;
CREATE TRIGGER location_quality_tasks_updated_at
  BEFORE UPDATE ON public.location_quality_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.trg_mark_publish_dirty_editorial_pages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ref_slug TEXT;
BEGIN
  ref_slug := COALESCE(NEW.slug, OLD.slug, 'unknown');
  IF TG_OP = 'DELETE' THEN
    PERFORM public.mark_site_publish_dirty('editorial_pages', 'delete:' || ref_slug);
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      PERFORM public.mark_site_publish_dirty('editorial_pages', 'insert:' || ref_slug);
    END IF;
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status
      OR OLD.title IS DISTINCT FROM NEW.title
      OR OLD.meta_title IS DISTINCT FROM NEW.meta_title
      OR OLD.meta_description IS DISTINCT FROM NEW.meta_description
      OR OLD.hero_kicker IS DISTINCT FROM NEW.hero_kicker
      OR OLD.hero_body_md IS DISTINCT FROM NEW.hero_body_md
      OR OLD.body_md IS DISTINCT FROM NEW.body_md
      OR OLD.faq_json IS DISTINCT FROM NEW.faq_json
      OR OLD.curated_location_ids IS DISTINCT FROM NEW.curated_location_ids
      OR OLD.related_blog_slugs IS DISTINCT FROM NEW.related_blog_slugs
      OR OLD.editorial_label IS DISTINCT FROM NEW.editorial_label
    THEN
      IF NEW.status = 'published' OR OLD.status = 'published' THEN
        PERFORM public.mark_site_publish_dirty('editorial_pages', 'update:' || ref_slug);
      END IF;
    END IF;
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_dirty_editorial_pages ON public.editorial_pages;
CREATE TRIGGER trg_publish_dirty_editorial_pages
AFTER INSERT OR UPDATE OR DELETE ON public.editorial_pages
FOR EACH ROW
EXECUTE FUNCTION public.trg_mark_publish_dirty_editorial_pages();
