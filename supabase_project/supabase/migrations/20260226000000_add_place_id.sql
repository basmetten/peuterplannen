-- Migration: Add place_id and last_verified_at columns
-- Applied: 2026-02-26

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
