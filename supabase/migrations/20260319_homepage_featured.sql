-- Add homepage_featured column for Quick Results component on homepage
ALTER TABLE locations ADD COLUMN IF NOT EXISTS homepage_featured boolean DEFAULT false;

-- Set initial featured locations: top-rated diverse selection across regions and types
UPDATE locations SET homepage_featured = true
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY ai_suitability_score_10 DESC NULLS LAST) as rn
    FROM locations
    WHERE ai_suitability_score_10 >= 7 AND region IS NOT NULL
  ) ranked
  WHERE rn <= 1
  LIMIT 8
);
