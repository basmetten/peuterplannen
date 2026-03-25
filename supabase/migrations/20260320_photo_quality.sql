-- Add photo_quality column for AI-evaluated image quality scores (1-5)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_quality smallint;

-- Index for filtering on photo quality (week picks, discovery)
CREATE INDEX IF NOT EXISTS idx_locations_photo_quality ON locations (photo_quality) WHERE photo_quality IS NOT NULL;
