-- Allow 'scraped' as photo_source value (Fase 0: venue website scraping)
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_photo_source_check;
ALTER TABLE locations ADD CONSTRAINT locations_photo_source_check
  CHECK (photo_source IN ('owner', 'google', 'scraped', 'placeholder'));
