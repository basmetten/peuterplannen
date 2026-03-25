-- Add photo columns to locations table for the imagery pipeline (Fase 14)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_source TEXT CHECK (photo_source IN ('owner', 'google', 'placeholder'));
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_fetched_at TIMESTAMPTZ;
