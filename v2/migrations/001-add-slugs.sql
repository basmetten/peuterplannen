-- Migration 001: Add slug column to locations
-- Run date: 2026-03-28
-- Applied via Supabase SQL Editor + Node.js script (001-add-slugs.mjs)

-- Step 1: Add column
ALTER TABLE locations ADD COLUMN slug text;

-- Step 2: Populate slugs (done via 001-add-slugs.mjs Node.js script)
-- Algorithm: lowercase → NFD normalize → strip combining marks → replace non-alnum with hyphens
-- Duplicates within same region get -2, -3 suffix

-- Step 3: Add constraints
ALTER TABLE locations ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_locations_region_slug ON locations (region, slug);
