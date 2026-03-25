const crypto = require('crypto');

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const SCORING_PROMPT_VERSION = 'v1';

// Gemini models — single source of truth. Override via env vars if needed.
const GEMINI_MODELS = {
  vision: process.env.GEMINI_MODEL_VISION || 'gemini-3-flash-preview',
  image: process.env.GEMINI_MODEL_IMAGE || 'gemini-3.1-flash-image-preview',
};

const REGIONS = {
  'Utrecht':             { osmName: 'Utrecht', adminLevel: 8 },
  'Amsterdam':           { osmName: 'Amsterdam', adminLevel: 8 },
  'Rotterdam':           { osmName: 'Rotterdam', adminLevel: 8 },
  'Den Haag':            { osmName: 'Den Haag', adminLevel: 8 },
  'Haarlem':             { osmName: 'Haarlem', adminLevel: 8 },
  'Leiden':              { osmName: 'Leiden', adminLevel: 8 },
  'Amersfoort':          { osmName: 'Amersfoort', adminLevel: 8 },
  'Utrechtse Heuvelrug': { osmName: 'Utrechtse Heuvelrug', adminLevel: 8 },
  'Gooi en Vechtstreek': { osmName: 'Gooi en Vechtstreek', adminLevel: 7, skipOsm: true },
  'Almere':              { osmName: 'Almere', adminLevel: 8 },
  'Eindhoven':           { osmName: 'Eindhoven', adminLevel: 8 },
  'Groningen':           { osmName: 'Groningen', adminLevel: 8 },
  'Tilburg':             { osmName: 'Tilburg', adminLevel: 8 },
  'Breda':               { osmName: 'Breda', adminLevel: 8 },
  "'s-Hertogenbosch":   { osmName: "'s-Hertogenbosch", adminLevel: 8 },
  'Arnhem':              { osmName: 'Arnhem', adminLevel: 8 },
  'Nijmegen':            { osmName: 'Nijmegen', adminLevel: 8 },
  'Apeldoorn':           { osmName: 'Apeldoorn', adminLevel: 8 },
  'Bunnik':              { osmName: 'Bunnik', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'De Bilt':             { osmName: 'De Bilt', adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Zeist':               { osmName: 'Zeist', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Houten':              { osmName: 'Houten', adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Nieuwegein':          { osmName: 'Nieuwegein', adminLevel: 8, supabaseRegion: 'Utrecht' },
  'IJsselstein':         { osmName: 'IJsselstein', adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Woerden':             { osmName: 'Woerden', adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Hilversum':           { osmName: 'Hilversum', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Gooise Meren':        { osmName: 'Gooise Meren', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Huizen':              { osmName: 'Huizen', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Blaricum':            { osmName: 'Blaricum', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Laren':               { osmName: 'Laren', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Wijdemeren':          { osmName: 'Wijdemeren', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Eemnes':              { osmName: 'Eemnes', adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Soest':               { osmName: 'Soest', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Baarn':               { osmName: 'Baarn', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Wijk bij Duurstede':  { osmName: 'Wijk bij Duurstede', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Leusden':             { osmName: 'Leusden', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Amstelveen':          { osmName: 'Amstelveen', adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Zaanstad':            { osmName: 'Zaanstad', adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Haarlemmermeer':      { osmName: 'Haarlemmermeer', adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Diemen':              { osmName: 'Diemen', adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Purmerend':           { osmName: 'Purmerend', adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Heemstede':           { osmName: 'Heemstede', adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Bloemendaal':         { osmName: 'Bloemendaal', adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Zandvoort':           { osmName: 'Zandvoort', adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Velsen':              { osmName: 'Velsen', adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Beverwijk':           { osmName: 'Beverwijk', adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Delft':               { osmName: 'Delft', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Westland':            { osmName: 'Westland', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Rijswijk':            { osmName: 'Rijswijk', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Zoetermeer':          { osmName: 'Zoetermeer', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Wassenaar':           { osmName: 'Wassenaar', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Leidschendam-Voorburg': { osmName: 'Leidschendam-Voorburg', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Pijnacker-Nootdorp':  { osmName: 'Pijnacker-Nootdorp', adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Vught':               { osmName: 'Vught', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Sint-Michielsgestel': { osmName: 'Sint-Michielsgestel', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Heusden':             { osmName: 'Heusden', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Bernheze':            { osmName: 'Bernheze', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Boxtel':              { osmName: 'Boxtel', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Oss':                 { osmName: 'Oss', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Maasdriel':           { osmName: 'Maasdriel', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },

  // Rotterdam
  'Capelle aan den IJssel': { osmName: 'Capelle aan den IJssel', adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Schiedam':               { osmName: 'Schiedam',               adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Vlaardingen':            { osmName: 'Vlaardingen',            adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Maassluis':              { osmName: 'Maassluis',              adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Barendrecht':            { osmName: 'Barendrecht',            adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Ridderkerk':             { osmName: 'Ridderkerk',             adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Nissewaard':             { osmName: 'Nissewaard',             adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Lansingerland':          { osmName: 'Lansingerland',          adminLevel: 8, supabaseRegion: 'Rotterdam' },
  'Krimpen aan den IJssel': { osmName: 'Krimpen aan den IJssel', adminLevel: 8, supabaseRegion: 'Rotterdam' },

  // Amersfoort
  'Nijkerk':                { osmName: 'Nijkerk',                adminLevel: 8, supabaseRegion: 'Amersfoort' },
  'Bunschoten':             { osmName: 'Bunschoten',             adminLevel: 8, supabaseRegion: 'Amersfoort' },
  'Barneveld':              { osmName: 'Barneveld',              adminLevel: 8, supabaseRegion: 'Amersfoort' },

  // Leiden
  'Oegstgeest':             { osmName: 'Oegstgeest',             adminLevel: 8, supabaseRegion: 'Leiden' },
  'Voorschoten':            { osmName: 'Voorschoten',            adminLevel: 8, supabaseRegion: 'Leiden' },
  'Leiderdorp':             { osmName: 'Leiderdorp',             adminLevel: 8, supabaseRegion: 'Leiden' },
  'Katwijk':                { osmName: 'Katwijk',                adminLevel: 8, supabaseRegion: 'Leiden' },
  'Kaag en Braassem':       { osmName: 'Kaag en Braassem',       adminLevel: 8, supabaseRegion: 'Leiden' },

  // Eindhoven (Stedelijk Gebied Eindhoven)
  'Veldhoven':              { osmName: 'Veldhoven',              adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Waalre':                 { osmName: 'Waalre',                 adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Son en Breugel':         { osmName: 'Son en Breugel',         adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Nuenen c.a.':            { osmName: 'Nuenen c.a.',            adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Geldrop-Mierlo':         { osmName: 'Geldrop-Mierlo',         adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Best':                   { osmName: 'Best',                   adminLevel: 8, supabaseRegion: 'Eindhoven' },
  'Heeze-Leende':           { osmName: 'Heeze-Leende',           adminLevel: 8, supabaseRegion: 'Eindhoven' },

  // Groningen (regio Noord)
  'Tynaarlo':               { osmName: 'Tynaarlo',               adminLevel: 8, supabaseRegion: 'Groningen' },
  'Noordenveld':            { osmName: 'Noordenveld',            adminLevel: 8, supabaseRegion: 'Groningen' },
  'Westerkwartier':         { osmName: 'Westerkwartier',         adminLevel: 8, supabaseRegion: 'Groningen' },
  'Midden-Groningen':       { osmName: 'Midden-Groningen',       adminLevel: 8, supabaseRegion: 'Groningen' },

  // Tilburg (Regio Hart van Brabant)
  'Goirle':                 { osmName: 'Goirle',                 adminLevel: 8, supabaseRegion: 'Tilburg' },
  'Dongen':                 { osmName: 'Dongen',                 adminLevel: 8, supabaseRegion: 'Tilburg' },
  'Hilvarenbeek':           { osmName: 'Hilvarenbeek',           adminLevel: 8, supabaseRegion: 'Tilburg' },
  'Oisterwijk':             { osmName: 'Oisterwijk',             adminLevel: 8, supabaseRegion: 'Tilburg' },
  'Loon op Zand':           { osmName: 'Loon op Zand',           adminLevel: 8, supabaseRegion: 'Tilburg' },
  'Waalwijk':               { osmName: 'Waalwijk',               adminLevel: 8, supabaseRegion: 'Tilburg' },

  // Almere (Flevoland)
  'Zeewolde':               { osmName: 'Zeewolde',               adminLevel: 8, supabaseRegion: 'Almere' },

  // Breda (Regio West-Brabant)
  'Etten-Leur':             { osmName: 'Etten-Leur',             adminLevel: 8, supabaseRegion: 'Breda' },
  'Oosterhout':             { osmName: 'Oosterhout',             adminLevel: 8, supabaseRegion: 'Breda' },
  'Halderberge':            { osmName: 'Halderberge',            adminLevel: 8, supabaseRegion: 'Breda' },
  'Zundert':                { osmName: 'Zundert',                adminLevel: 8, supabaseRegion: 'Breda' },
  'Drimmelen':              { osmName: 'Drimmelen',              adminLevel: 8, supabaseRegion: 'Breda' },

  // Nijmegen (Regio Arnhem-Nijmegen, Nijmegen deel)
  'Berg en Dal':            { osmName: 'Berg en Dal',            adminLevel: 8, supabaseRegion: 'Nijmegen' },
  'Beuningen':              { osmName: 'Beuningen',              adminLevel: 8, supabaseRegion: 'Nijmegen' },
  'Wijchen':                { osmName: 'Wijchen',                adminLevel: 8, supabaseRegion: 'Nijmegen' },
  'Druten':                 { osmName: 'Druten',                 adminLevel: 8, supabaseRegion: 'Nijmegen' },
  'Heumen':                 { osmName: 'Heumen',                 adminLevel: 8, supabaseRegion: 'Nijmegen' },

  // Arnhem (Regio Arnhem-Nijmegen, Arnhem deel)
  'Duiven':                 { osmName: 'Duiven',                 adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Westervoort':            { osmName: 'Westervoort',            adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Zevenaar':               { osmName: 'Zevenaar',               adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Rheden':                 { osmName: 'Rheden',                 adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Rozendaal':              { osmName: 'Rozendaal',              adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Overbetuwe':             { osmName: 'Overbetuwe',             adminLevel: 8, supabaseRegion: 'Arnhem' },
  'Lingewaard':             { osmName: 'Lingewaard',             adminLevel: 8, supabaseRegion: 'Arnhem' },

  // Apeldoorn (Stedendriehoek)
  'Epe':                    { osmName: 'Epe',                    adminLevel: 8, supabaseRegion: 'Apeldoorn' },
  'Voorst':                 { osmName: 'Voorst',                 adminLevel: 8, supabaseRegion: 'Apeldoorn' },
  'Brummen':                { osmName: 'Brummen',                adminLevel: 8, supabaseRegion: 'Apeldoorn' },
  'Heerde':                 { osmName: 'Heerde',                 adminLevel: 8, supabaseRegion: 'Apeldoorn' },

  // Enschede (Regio Twente)
  'Enschede':               { osmName: 'Enschede',               adminLevel: 8 },
  'Hengelo':                { osmName: 'Hengelo',                adminLevel: 8, supabaseRegion: 'Enschede' },
  'Oldenzaal':              { osmName: 'Oldenzaal',              adminLevel: 8, supabaseRegion: 'Enschede' },
  'Losser':                 { osmName: 'Losser',                 adminLevel: 8, supabaseRegion: 'Enschede' },
  'Haaksbergen':            { osmName: 'Haaksbergen',            adminLevel: 8, supabaseRegion: 'Enschede' },

  // Zwolle (IJssel-Vechtstreek)
  'Zwolle':                 { osmName: 'Zwolle',                 adminLevel: 8 },
  'Kampen':                 { osmName: 'Kampen',                 adminLevel: 8, supabaseRegion: 'Zwolle' },
  'Dalfsen':                { osmName: 'Dalfsen',                adminLevel: 8, supabaseRegion: 'Zwolle' },
  'Zwartewaterland':        { osmName: 'Zwartewaterland',        adminLevel: 8, supabaseRegion: 'Zwolle' },
  'Hattem':                 { osmName: 'Hattem',                 adminLevel: 8, supabaseRegion: 'Zwolle' },

  // Maastricht (Zuid-Limburg)
  'Maastricht':             { osmName: 'Maastricht',             adminLevel: 8 },
  'Meerssen':               { osmName: 'Meerssen',               adminLevel: 8, supabaseRegion: 'Maastricht' },
  'Valkenburg aan de Geul': { osmName: 'Valkenburg aan de Geul', adminLevel: 8, supabaseRegion: 'Maastricht' },
  'Eijsden-Margraten':      { osmName: 'Eijsden-Margraten',      adminLevel: 8, supabaseRegion: 'Maastricht' },

  // Dordrecht (Drechtsteden)
  'Dordrecht':              { osmName: 'Dordrecht',              adminLevel: 8 },
  'Zwijndrecht':            { osmName: 'Zwijndrecht',            adminLevel: 8, supabaseRegion: 'Dordrecht' },
  'Sliedrecht':             { osmName: 'Sliedrecht',             adminLevel: 8, supabaseRegion: 'Dordrecht' },
  'Hendrik-Ido-Ambacht':    { osmName: 'Hendrik-Ido-Ambacht',    adminLevel: 8, supabaseRegion: 'Dordrecht' },
  'Papendrecht':            { osmName: 'Papendrecht',            adminLevel: 8, supabaseRegion: 'Dordrecht' },
  'Alblasserdam':           { osmName: 'Alblasserdam',           adminLevel: 8, supabaseRegion: 'Dordrecht' },

  // Leeuwarden (Friesland)
  'Leeuwarden':             { osmName: 'Leeuwarden',             adminLevel: 8 },
  'Smallingerland':         { osmName: 'Smallingerland',         adminLevel: 8, supabaseRegion: 'Leeuwarden' },
  'Súdwest-Fryslân':        { osmName: 'Súdwest-Fryslân',        adminLevel: 8, supabaseRegion: 'Leeuwarden' },
  'Tytsjerksteradiel':      { osmName: 'Tytsjerksteradiel',      adminLevel: 8, supabaseRegion: 'Leeuwarden' },
  'Noardeast-Fryslân':      { osmName: 'Noardeast-Fryslân',      adminLevel: 8, supabaseRegion: 'Leeuwarden' },

  // Alkmaar (Noord-Holland)
  'Alkmaar':                { osmName: 'Alkmaar',                adminLevel: 8 },
  'Dijk en Waard':           { osmName: 'Dijk en Waard',           adminLevel: 8, supabaseRegion: 'Alkmaar' },
  'Castricum':              { osmName: 'Castricum',              adminLevel: 8, supabaseRegion: 'Alkmaar' },
  'Heiloo':                 { osmName: 'Heiloo',                 adminLevel: 8, supabaseRegion: 'Alkmaar' },
  'Schagen':                { osmName: 'Schagen',                adminLevel: 8, supabaseRegion: 'Alkmaar' },

  // Emmen (Drenthe)
  'Emmen':                  { osmName: 'Emmen',                  adminLevel: 8 },
  'Coevorden':              { osmName: 'Coevorden',              adminLevel: 8, supabaseRegion: 'Emmen' },
  'Borger-Odoorn':          { osmName: 'Borger-Odoorn',          adminLevel: 8, supabaseRegion: 'Emmen' },
  'Hoogeveen':              { osmName: 'Hoogeveen',              adminLevel: 8, supabaseRegion: 'Emmen' },

  // Venlo (Noord-Limburg)
  'Venlo':                  { osmName: 'Venlo',                  adminLevel: 8 },
  'Peel en Maas':           { osmName: 'Peel en Maas',           adminLevel: 8, supabaseRegion: 'Venlo' },
  'Horst aan de Maas':      { osmName: 'Horst aan de Maas',      adminLevel: 8, supabaseRegion: 'Venlo' },
  'Venray':                 { osmName: 'Venray',                 adminLevel: 8, supabaseRegion: 'Venlo' },

  // Heerlen (Parkstad Limburg)
  'Heerlen':                { osmName: 'Heerlen',                adminLevel: 8 },
  'Kerkrade':               { osmName: 'Kerkrade',               adminLevel: 8, supabaseRegion: 'Heerlen' },
  'Landgraaf':              { osmName: 'Landgraaf',              adminLevel: 8, supabaseRegion: 'Heerlen' },
  'Brunssum':               { osmName: 'Brunssum',               adminLevel: 8, supabaseRegion: 'Heerlen' },
  'Voerendaal':             { osmName: 'Voerendaal',             adminLevel: 8, supabaseRegion: 'Heerlen' },
  'Beekdaelen':             { osmName: 'Beekdaelen',             adminLevel: 8, supabaseRegion: 'Heerlen' },

  // Deventer (IJsselvallei)
  'Deventer':               { osmName: 'Deventer',               adminLevel: 8 },
  'Olst-Wijhe':             { osmName: 'Olst-Wijhe',             adminLevel: 8, supabaseRegion: 'Deventer' },
  'Lochem':                 { osmName: 'Lochem',                 adminLevel: 8, supabaseRegion: 'Deventer' },
  'Zutphen':                { osmName: 'Zutphen',                adminLevel: 8, supabaseRegion: 'Deventer' },
  'Rijssen-Holten':         { osmName: 'Rijssen-Holten',         adminLevel: 8, supabaseRegion: 'Deventer' },
};

const BAR_KEYWORDS = [
  'cocktail', 'lounge', 'night', 'nacht', 'club', 'disco', 'shisha',
  'hookah', 'casino', 'stripclub', 'coffeeshop', 'smartshop',
  'irish pub', 'sports bar', 'whisky', 'wine bar', 'wijnbar', 'biercafe',
  'biertuin', 'taproom', 'brouwerij', 'brewery', 'shot', 'sushi bar',
  'nachtclub', 'nachtcafe', 'karaoke bar', 'poolbar'
];

const HARD_REJECT_PATTERNS = [
  /casino/i,
  /coffeeshop/i,
  /smartshop/i,
  /night\s*club/i,
  /nachtclub/i,
  /stripclub/i,
  /hookah|shisha/i,
];

const KID_KEYWORDS = [
  'speelhoek', 'speelruimte', 'speeltuin', 'speelplek', 'speelkamer',
  'speelparadijs', 'ballenbak', 'speelgoed',
  'kinderen', 'kindvriendelijk', 'kids', 'gezin', 'family', 'families',
  'gezinnen', 'kid-friendly', 'kinderen welkom',
  'kindermenu', 'kinderkaart', 'kinderportie', 'kindermaaltijd',
  'kinderstoel', 'kinderstoelen', 'high chair', 'highchair',
  'luiertafel', 'verschoonplek', 'verschoontafel', 'baby',
  'verschoonruimte', 'commode',
  'peuter', 'dreumes', 'kleuter', 'toddler',
  'pannenkoek', 'pannenkoekenrestaurant', 'pancake'
];

function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((arg) => {
      const [rawKey, rawValue] = arg.replace(/^--/, '').split('=');
      return [rawKey, rawValue === undefined ? true : rawValue];
    })
  );
}

function resolveRegionSet(regionRoot, withSurroundings) {
  if (!REGIONS[regionRoot]) {
    throw new Error(`Unknown region: ${regionRoot}`);
  }
  if (!withSurroundings) {
    if (REGIONS[regionRoot].skipOsm) {
      throw new Error(`Region ${regionRoot} requires --with-surroundings (no direct OSM area configured).`);
    }
    return [regionRoot];
  }

  const related = Object.entries(REGIONS)
    .filter(([, cfg]) => cfg.supabaseRegion === regionRoot)
    .map(([name]) => name);

  const rootConfig = REGIONS[regionRoot];
  const includeRoot = !rootConfig.skipOsm;

  if (includeRoot) {
    return [regionRoot, ...related.filter((r) => r !== regionRoot)];
  }

  return [...related.filter((r) => r !== regionRoot)];
}

function mapToRootRegion(regionName) {
  const cfg = REGIONS[regionName];
  return cfg?.supabaseRegion || regionName;
}

function isBarOrNightlife(candidate) {
  const name = (candidate.name || '').toLowerCase();
  const cuisine = (candidate.cuisine || '').toLowerCase();
  const combined = `${name} ${cuisine}`;
  return BAR_KEYWORDS.some((kw) => combined.includes(kw));
}

function hasHardRejectSignal(nameOrText) {
  const input = nameOrText || '';
  return HARD_REJECT_PATTERNS.some((rx) => rx.test(input));
}

function buildSourceFingerprint(parts) {
  const payload = Array.isArray(parts) ? parts.join('|') : String(parts);
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function normalizeName(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversineMeters(aLat, aLng, bLat, bLng) {
  if ([aLat, aLng, bLat, bLng].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371e3;
  const p1 = toRad(aLat);
  const p2 = toRad(bLat);
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jitterSleep(minMs, maxMs) {
  const value = minMs + Math.floor(Math.random() * Math.max(1, maxMs - minMs + 1));
  await wait(value);
}

async function mapLimit(items, limit, task) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      out[idx] = await task(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, () => worker());
  await Promise.all(workers);
  return out;
}

module.exports = {
  DEFAULT_MODEL,
  GEMINI_MODELS,
  SCORING_PROMPT_VERSION,
  REGIONS,
  KID_KEYWORDS,
  HARD_REJECT_PATTERNS,
  parseArgs,
  resolveRegionSet,
  mapToRootRegion,
  isBarOrNightlife,
  hasHardRejectSignal,
  buildSourceFingerprint,
  normalizeName,
  haversineMeters,
  wait,
  jitterSleep,
  mapLimit,
};
