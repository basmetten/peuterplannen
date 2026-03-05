const crypto = require('crypto');

const DEFAULT_MODEL = 'gpt-5.1-codex-mini';
const SCORING_PROMPT_VERSION = 'v1';

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
  /alcohol\s*only/i,
  /cocktail\s*bar/i,
  /wine\s*bar|wijnbar/i,
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
