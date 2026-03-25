INSERT INTO regions (name, slug, blurb, display_order, population, tier, schema_type, is_active)
VALUES
  ('Eindhoven',
   'eindhoven',
   'Eindhoven is een energieke studentenstad met genoeg te doen voor peuters. Genneper Parken, De Tongelreep en de vele parken in de regio maken het een fijne bestemming voor gezinnen.',
   9, 240000, 'standard', 'City', false),

  ('Groningen',
   'groningen',
   'Groningen heeft een levendig centrum en prachtig omringend landschap. Het Noorderplantsoen, het Groninger Museum en kinderboerderijen rondom de stad zijn favoriet bij ouders met peuters.',
   10, 235000, 'standard', 'City', false),

  ('Tilburg',
   'tilburg',
   'Tilburg heeft een groen buitengebied en veel activiteiten voor jonge kinderen. Beekse Bergen, het Wandelbos en de Loonse en Drunense Duinen liggen dichtbij.',
   11, 220000, 'standard', 'City', false),

  ('Almere',
   'almere',
   'Almere is een jonge, groene stad met ruim opgezette parken en speeltuinen. Het Weerwater, het Oostvaardersbos en de vele speelplekken maken het aantrekkelijk voor gezinnen.',
   12, 215000, 'standard', 'City', false),

  ('Breda',
   'breda',
   'Breda heeft een sfeervol centrum en prachtig groen aan de rand. Het Mastbos, het Ulvenhoutse Bos en kinderboerderijen in de regio zijn echte uitjes voor peuters.',
   13, 185000, 'standard', 'City', false),

  ('Nijmegen',
   'nijmegen',
   'Nijmegen is de oudste stad van Nederland en heeft veel te bieden voor gezinnen. Burgers'' Zoo, het Goffertpark en de natuur van het Rijk van Nijmegen zijn populair bij ouders met peuters.',
   14, 180000, 'standard', 'City', false),

  ('Arnhem',
   'arnhem',
   'Arnhem ligt aan de rand van de Veluwe en biedt een geweldige mix van natuur en cultuur. Het Openluchtmuseum, Burgers'' Zoo en de bossen van de Posbank liggen op korte afstand.',
   15, 165000, 'standard', 'City', false),

  ('Apeldoorn',
   'apeldoorn',
   'Apeldoorn is de poort naar de Veluwe. Apenheul, het Paleis Het Loo en de uitgestrekte bossen rondom de stad maken het een onmisbare bestemming voor gezinnen met peuters.',
   16, 165000, 'standard', 'City', false),

  ('''s-Hertogenbosch',
   's-hertogenbosch',
   '''-s-Hertogenbosch combineert een bruisend centrum met groene uitlopers. De Bossche Broek, kinderboerderijen in de omgeving en de nabijheid van de Efteling maken de regio bijzonder aantrekkelijk.',
   17, 155000, 'standard', 'City', false)

ON CONFLICT (name) DO NOTHING;
