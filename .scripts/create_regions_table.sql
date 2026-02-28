-- Create regions table
CREATE TABLE regions (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  blurb         TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL,
  population    INTEGER,
  tier          TEXT DEFAULT 'standard',
  schema_type   TEXT DEFAULT 'City',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed with current 8 regions, ordered by population
INSERT INTO regions (name, slug, blurb, display_order, population, tier, schema_type) VALUES
  ('Amsterdam', 'amsterdam', 'Amsterdam heeft een verrassend rijk aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ — er is altijd iets te doen.', 1, 942000, 'primary', 'City'),
  ('Rotterdam', 'rotterdam', 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen én buiten.', 2, 675000, 'primary', 'City'),
  ('Den Haag', 'den-haag', 'Den Haag combineert strand, cultuur en natuur op loopafstand van elkaar. Madurodam, het Kunstmuseum, Scheveningen en Westduinpark zijn klassiekers voor een uitje met peuters.', 3, 569000, 'primary', 'City'),
  ('Utrecht', 'utrecht', 'Utrecht is een van de kindvriendelijkste steden van Nederland. Het Nijntje Museum, de Griftsteede, het Spoorwegmuseum en tientallen speeltuinen maken de stad ideaal voor een dagje uit met peuters.', 4, 378000, 'primary', 'City'),
  ('Haarlem', 'haarlem', 'Haarlem is compact en groen — perfect voor een relaxt dagje uit met jonge kinderen. Het Teylers Museum, het Reinaldapark en de Kennemerduinen liggen op fietsafstand van het centrum.', 5, 169000, 'standard', 'City'),
  ('Amersfoort', 'amersfoort', 'Amersfoort is een gezellige middeleeuwse stad met verrassend veel te doen voor peuters. Dierenpark Amersfoort, kinderboerderijen en het buitengebied van de Utrechtse Heuvelrug liggen om de hoek.', 6, 164000, 'standard', 'City'),
  ('Leiden', 'leiden', 'Leiden is een compacte universiteitsstad met verrassend veel te doen voor peuters. Van het Naturalis tot kinderboerderijen en een pannenkoekenrestaurant aan het water.', 7, 130000, 'standard', 'City'),
  ('Utrechtse Heuvelrug', 'utrechtse-heuvelrug', 'De Utrechtse Heuvelrug is een schatkamer voor gezinnen met peuters. Kastelen, kinderboerderijen, pannenkoekenrestaurants in het bos en prachtige natuurspeelplaatsen — hier combineer je natuur met avontuur op loopafstand.', 8, 50000, 'region', 'AdministrativeArea');

-- Add foreign key constraint on locations.region
ALTER TABLE locations
  ADD CONSTRAINT fk_region FOREIGN KEY (region) REFERENCES regions(name);
