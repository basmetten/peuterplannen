#!/usr/bin/env node

/**
 * expand-regions.js — Discover and fully enrich locations in new regions
 *
 * End-to-end pipeline:
 * 1. OSM Overpass discovery (playgrounds, farms, museums, swimming, nature, horeca)
 * 2. Google Places validation (place_id, opening_hours, business_status)
 * 3. Website scraping for amenity signals
 * 4. Photo finding from websites (og:image, hero images)
 * 5. Gemini photo quality scoring
 * 6. Direct insert into locations table
 *
 * Usage:
 *   node .scripts/pipeline/expand-regions.js                              # All new regions
 *   node .scripts/pipeline/expand-regions.js --region=Leeuwarden          # One region
 *   node .scripts/pipeline/expand-regions.js --dry-run                    # Don't insert
 *   node .scripts/pipeline/expand-regions.js --skip-photos                # Skip photo step
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createSupabaseClient } = require('./db');
const {
  REGIONS,
  buildSourceFingerprint,
  haversineMeters,
  normalizeName,
  wait,
  mapLimit,
  isBarOrNightlife,
  hasHardRejectSignal,
  mapToRootRegion,
  KID_KEYWORDS,
} = require('./config');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_FILE = path.join(OUTPUT_DIR, 'expand-regions-log.jsonl');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'expand-regions-progress.json');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images', 'locations');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const SKIP_PHOTOS = process.argv.includes('--skip-photos');
const REGION_FILTER = process.argv.find(a => a.startsWith('--region='))?.split('=')[1] || null;

// Load API keys
const envPath = path.resolve(PROJECT_ROOT, '.supabase_env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const GOOGLE_KEY = envRaw.match(/GOOGLE_MAPS_KEY=(.+)/)?.[1]?.trim() || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// New regions to expand into (primary regions only)
const NEW_REGIONS = ['Leeuwarden', 'Alkmaar', 'Emmen', 'Venlo', 'Heerlen', 'Deventer'];

// City center coordinates for distance calculations
const CITY_CENTERS = {
  'Leeuwarden': { lat: 53.2012, lng: 5.7999 },
  'Alkmaar':    { lat: 52.6324, lng: 4.7534 },
  'Emmen':      { lat: 52.7792, lng: 6.9069 },
  'Venlo':      { lat: 51.3704, lng: 6.1724 },
  'Heerlen':    { lat: 50.8882, lng: 5.9814 },
  'Deventer':   { lat: 52.2551, lng: 6.1639 },
};

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { info: 'i', warn: '!', error: 'X', ok: '+' }[level] || '.';
  const line = `${ts} ${prefix} ${msg}`;
  console.log(line, data ? JSON.stringify(data).slice(0, 200) : '');
  fs.appendFileSync(LOG_FILE, JSON.stringify({ ts, level, msg, ...(data || {}) }) + '\n');
}

// ═══ OSM OVERPASS ═══

const OVERPASS_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];
let _rrIdx = 0;

const OSM_QUERIES = {
  playground: {
    ppType: 'play',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["leisure"="playground"](area.a);
  way["leisure"="playground"](area.a);
  node["amenity"="playground"](area.a);
  way["amenity"="playground"](area.a);
);
out center;`,
  },
  farm: {
    ppType: 'farm',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["tourism"="zoo"]["zoo"~"petting_zoo|children"](area.a);
  way["tourism"="zoo"]["zoo"~"petting_zoo|children"](area.a);
  node["leisure"="animal_keeping"](area.a);
  way["leisure"="animal_keeping"](area.a);
  node["landuse"="farmyard"]["name"](area.a);
  way["landuse"="farmyard"]["name"](area.a);
);
out center;`,
  },
  museum: {
    ppType: 'museum',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["tourism"="museum"](area.a);
  way["tourism"="museum"](area.a);
);
out center;`,
  },
  swimming: {
    ppType: 'swim',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["leisure"="swimming_pool"](area.a);
  way["leisure"="swimming_pool"](area.a);
  node["sport"="swimming"](area.a);
  way["sport"="swimming"](area.a);
  node["leisure"="water_park"](area.a);
  way["leisure"="water_park"](area.a);
);
out center;`,
  },
  nature: {
    ppType: 'nature',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["leisure"="nature_reserve"]["name"](area.a);
  way["leisure"="nature_reserve"]["name"](area.a);
  node["leisure"="park"]["name"](area.a);
  way["leisure"="park"]["name"](area.a);
);
out center;`,
  },
  zoo: {
    ppType: 'play',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["tourism"="zoo"](area.a);
  way["tourism"="zoo"](area.a);
  node["tourism"="theme_park"](area.a);
  way["tourism"="theme_park"](area.a);
  node["tourism"="attraction"]["name"](area.a);
  way["tourism"="attraction"]["name"](area.a);
);
out center;`,
  },
  horeca: {
    ppType: 'horeca',
    query: (name, level) => `[out:json][timeout:90];
area["name"="${name}"]["admin_level"="${level}"]->.a;
(
  node["amenity"~"restaurant|cafe"]["name"](area.a);
  way["amenity"~"restaurant|cafe"]["name"](area.a);
);
out center;`,
  },
};

async function fetchOverpass(query) {
  const startIdx = _rrIdx++ % OVERPASS_ENDPOINTS.length;
  const endpoints = [...OVERPASS_ENDPOINTS.slice(startIdx), ...OVERPASS_ENDPOINTS.slice(0, startIdx)];
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      return data.elements || [];
    } catch { continue; }
  }
  return [];
}

function passesQualityGate(tags, name, ppType) {
  // Strict quality gates — only significant, destination-worthy locations

  // Universal rejects: nudist/adult-only, generic names, horse riding schools
  if (/naaktstrand|naturist|nudist|swingers|naakt/i.test(name)) return false;
  if (/manege|ruiters|paardrijschool|hippisch/i.test(name) && !tags.tourism) return false;
  if (/^(markt|plein|park|bos|veld|weide|tuin)$/i.test(name.trim())) return false;

  if (ppType === 'play') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    const isIndoor = tags.indoor === 'yes' || /indoor|binnenspeeltuin|speelparadijs/i.test(name);
    const isNotable = /speelparadijs|speelpark|speelbos|avonturen|adventure|klimpark|speelland|speelstad|dierenpark|dierentuin|pretpark|attractiepark/i.test(name);
    const isZoo = tags.tourism === 'zoo' || tags.tourism === 'theme_park' || tags.tourism === 'attraction';
    if (!hasWebsite && !isIndoor && !isNotable && !isZoo) return false;
  }
  if (ppType === 'horeca') {
    const kidSignals = [
      tags.kids_area, tags['kids_area:indoor'], tags['kids_area:outdoor'],
      tags.highchair, tags.changing_table, tags.playground,
      tags.family_friendly, tags['menu:children'], tags.kids_menu,
    ].some(v => v && v !== 'no');
    const nameSignals = /kindvriendelijk|kids|kinderen|gezin|family|speelhoek|pannenkoek|pancake/i.test(
      `${name} ${tags.description || ''} ${tags.cuisine || ''}`
    );
    if (!kidSignals && !nameSignals) return false;
  }
  if (ppType === 'nature') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    const isNotable = /nationaal|landgoed|duinen|heide|bos|forest|duin|kasteel|watervallen|staatsbosbeheer/i.test(name);
    const isLarge = tags.area ? Number(tags.area) > 50000 : false;
    if (!hasWebsite && !isNotable && !isLarge) return false;
  }
  if (ppType === 'museum') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    if (!hasWebsite) return false;
  }
  if (ppType === 'swim') {
    if (tags.access === 'private') return false;
    if (/naaktstrand|naturist|nudist/i.test(name)) return false;
    if (name.length <= 5) return false;
  }
  if (ppType === 'farm') {
    // Working farms without visitor facilities should be skipped
    const hasWebsite = !!(tags.website || tags['contact:website']);
    const isKidFriendly = /kinderboerderij|stadsboerderij|petting|dierenweide|hertenkamp|kinderen|bezoek/i.test(
      `${name} ${tags.description || ''}`
    );
    // landuse=farmyard without kid signals and no website = working farm
    if (tags.landuse === 'farmyard' && !isKidFriendly && !hasWebsite) return false;
  }
  return true;
}

function elementToLocation(el, regionRoot, ppType) {
  const tags = el.tags || {};
  const lat = el.lat || el.center?.lat;
  const lng = el.lon || el.center?.lon;
  if (!lat || !lng) return null;

  const name = tags.name || tags['name:nl'] || '';
  if (!name || name.length < 3) return null;
  if (isBarOrNightlife({ name, cuisine: tags.cuisine })) return null;
  if (hasHardRejectSignal(name)) return null;
  if (!passesQualityGate(tags, name, ppType)) return null;

  // Determine PeuterPlannen type
  let type = ppType;
  if (tags.tourism === 'zoo') type = tags.zoo === 'petting_zoo' ? 'farm' : 'play';
  if (tags.tourism === 'theme_park') type = 'play';
  if (/pannenkoek|pancake/i.test(name) || tags.cuisine === 'pancake') type = 'pancake';
  if (/kinderboerderij|stadsboerderij|petting/i.test(name)) type = 'farm';

  const center = CITY_CENTERS[regionRoot];
  const distKm = center ? haversineMeters(lat, lng, center.lat, center.lng) / 1000 : null;

  return {
    name: name.trim(),
    lat, lng,
    type,
    region: regionRoot,
    website: tags.website || tags['contact:website'] || null,
    description: null, // will be filled by Gemini
    opening_hours: tags.opening_hours || null,
    distance_from_city_center_km: distKm ? Math.round(distKm * 10) / 10 : null,
    osm_id: `${el.type}/${el.id}`,
    osm_tags: tags,
  };
}

// ═══ GOOGLE PLACES VALIDATION ═══

async function validateWithGoogle(location) {
  if (!GOOGLE_KEY) return location;

  const searchText = [location.name, location.region, 'Nederland'].filter(Boolean).join(' ');
  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchText)}&inputtype=textquery&fields=place_id,name,formatted_address,business_status,geometry&key=${GOOGLE_KEY}`;
    const findRes = await fetch(findUrl);
    if (!findRes.ok) return location;

    const findData = await findRes.json();
    const place = findData?.candidates?.[0];
    if (!place?.place_id) return location;

    // Skip permanently closed
    if (place.business_status === 'CLOSED_PERMANENTLY') {
      log('warn', `Skipping permanently closed: ${location.name}`);
      return null;
    }

    location.place_id = place.place_id;

    // Get details
    await wait(200);
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=opening_hours,formatted_phone_number,website,price_level,rating,user_ratings_total&key=${GOOGLE_KEY}`;
    const detailRes = await fetch(detailUrl);
    if (detailRes.ok) {
      const detail = await detailRes.json();
      const r = detail?.result;
      if (r) {
        if (r.opening_hours?.weekday_text && !location.opening_hours) {
          location.opening_hours = r.opening_hours.weekday_text.join('; ');
        }
        if (r.website && !location.website) {
          location.website = r.website;
        }
        location._google_rating = r.rating;
        location._google_reviews = r.user_ratings_total;
        location._google_price = r.price_level;
      }
    }

    return location;
  } catch (err) {
    log('warn', `Google validation failed for ${location.name}: ${err.message}`);
    return location;
  }
}

// ═══ WEBSITE SCRAPING FOR AMENITIES ═══

function normalizeText(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function scrapeWebsiteSignals(location) {
  if (!location.website) return location;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(location.website, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0; +https://peuterplannen.nl)',
        Accept: 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return location;

    const html = await res.text();
    const text = normalizeText(html).slice(0, 100000);

    // Extract amenity signals from website text
    const hasCoffee = /koffie|coffee|espresso|cappuccino|latte|barista/i.test(text);
    const hasDiaper = /verschoon|luier|diaper|changing|commode|babykamer/i.test(text);
    const hasPlayCorner = /speelhoek|speelruimte|speeltuin|speelplek|speelkamer|ballenbak|speelparadijs|binnenspeeltuin/i.test(text);
    const hasAlcohol = /bier|wijn|wine|beer|cocktail|borrel|tap|prosecco/i.test(text);
    const hasToilet = /toilet|wc|sanitair/i.test(text);
    const hasParking = /parkeren|parking|parkeerplaats|p\+r/i.test(text);
    const hasShelter = /overdekt|binnen|indoor|overkapping/i.test(text);
    const hasPancake = /pannenkoek|pancake/i.test(text);

    if (hasCoffee) location.coffee = true;
    if (hasDiaper) location.diaper = true;
    if (hasPlayCorner && !location.play_corner_quality) location.play_corner_quality = 'standard';
    if (hasAlcohol) location.alcohol = true;
    if (hasToilet) location.toilet_confidence = 'likely';
    if (hasParking) location.parking_ease = 'available';
    if (hasShelter) location.rain_backup_quality = 'partial';
    if (hasPancake && location.type === 'horeca') location.type = 'pancake';

    // Extract og:image for photo
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch?.[1] && !location.photo_url) {
      location._og_image = ogMatch[1];
    }

    return location;
  } catch {
    return location;
  }
}

// ═══ PHOTO FINDING ═══

async function findPhoto(location) {
  if (SKIP_PHOTOS) return location;

  // Try og:image first
  if (location._og_image) {
    try {
      const res = await fetch(location._og_image, { method: 'HEAD' });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const contentLength = parseInt(res.headers.get('content-length') || '0');
        if (contentType.startsWith('image/') && contentLength > 5000) {
          location.photo_url = location._og_image;
          location.photo_source = 'website_og';
          return location;
        }
      }
    } catch {}
  }

  // Try Google Places photo
  if (location.place_id && GOOGLE_KEY) {
    try {
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${location.place_id}&fields=photos&key=${GOOGLE_KEY}`;
      const res = await fetch(detailUrl);
      if (res.ok) {
        const data = await res.json();
        const photo = data?.result?.photos?.[0];
        if (photo?.photo_reference) {
          location.photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${GOOGLE_KEY}`;
          location.photo_source = 'google_places';
          return location;
        }
      }
    } catch {}
  }

  return location;
}

// ═══ GEMINI PHOTO SCORING ═══

async function scorePhotoWithGemini(location) {
  if (!location.photo_url || !GEMINI_KEY || SKIP_PHOTOS) return location;

  try {
    // Download photo
    const imgRes = await fetch(location.photo_url);
    if (!imgRes.ok) return location;
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const base64 = imgBuf.toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    const prompt = `Score this photo for a toddler activity website (peuterplannen.nl).
Score 1-5:
1 = Logo, icon, map, or irrelevant image
2 = Low quality, blurry, or not representative
3 = Acceptable but generic stock-like photo
4 = Good atmospheric photo showing the location
5 = Excellent, inviting photo showing kids/families enjoying the place

Reply with ONLY the number (1-5), nothing else.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
        }),
      }
    );

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const score = parseInt(text.trim());
      if (score >= 1 && score <= 5) {
        location.photo_quality = score;
        // Reject logos/bad photos
        if (score <= 1) {
          location.photo_url = null;
          location.photo_source = null;
          location.photo_quality = null;
        }
      }
    }

    await wait(7000); // Gemini rate limit
    return location;
  } catch (err) {
    log('warn', `Gemini scoring failed for ${location.name}: ${err.message}`);
    return location;
  }
}

// ═══ GEMINI DESCRIPTION GENERATION ═══

async function generateDescription(location) {
  if (!GEMINI_KEY) return location;

  const typeNames = {
    play: 'speeltuin/pretpark', farm: 'kinderboerderij', museum: 'museum',
    swim: 'zwembad', nature: 'natuur', horeca: 'restaurant/cafe',
    pancake: 'pannenkoekenrestaurant', culture: 'cultureel',
  };

  const prompt = `Schrijf een korte Nederlandse beschrijving (2-3 zinnen, max 200 tekens) voor deze locatie op een website voor ouders met peuters/kleuters:

Naam: ${location.name}
Type: ${typeNames[location.type] || location.type}
Regio: ${location.region}
${location.website ? `Website: ${location.website}` : ''}
${location.opening_hours ? `Openingstijden: ${location.opening_hours}` : ''}

Schrijf warm en informatief. Focus op wat het leuk maakt voor jonge kinderen. Geen opsommingen, gewone lopende tekst. Alleen de beschrijving, geen titel of extra tekst.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 20 && text.length < 500) {
        location.description = text;
      }
    }

    await wait(3000); // Rate limit
    return location;
  } catch {
    return location;
  }
}

// ═══ DERIVE CONTEXT FIELDS ═══

function deriveContextFields(location) {
  const type = location.type;

  // Time of day fit
  if (['museum', 'play', 'culture', 'swim'].includes(type)) {
    location.time_of_day_fit = 'any';
  } else if (type === 'nature') {
    location.time_of_day_fit = 'daytime';
  } else {
    location.time_of_day_fit = 'any';
  }

  // Rain backup
  if (!location.rain_backup_quality) {
    if (['museum', 'swim', 'culture'].includes(type)) {
      location.rain_backup_quality = 'full';
    } else if (type === 'play' && /indoor|binnen/i.test(location.name || '')) {
      location.rain_backup_quality = 'full';
    } else if (['nature', 'farm'].includes(type)) {
      location.rain_backup_quality = 'none';
    }
  }

  // Weather
  if (['museum', 'swim', 'culture'].includes(type)) {
    location.weather = 'indoor';
  } else if (type === 'nature') {
    location.weather = 'outdoor';
  } else if (type === 'play' && /indoor|binnen/i.test(location.name || '')) {
    location.weather = 'indoor';
  } else if (type === 'play') {
    location.weather = 'outdoor';
  }

  // Noise level
  if (['play', 'swim'].includes(type)) {
    location.noise_level = 'lively';
  } else if (['museum', 'culture'].includes(type)) {
    location.noise_level = 'moderate';
  } else if (type === 'nature') {
    location.noise_level = 'quiet';
  }

  // Food fit
  if (['horeca', 'pancake'].includes(type)) {
    location.food_fit = 'full_meal';
  } else if (['museum', 'play', 'swim'].includes(type)) {
    location.food_fit = 'snacks_available';
  }

  // Buggy friendliness
  if (['museum', 'swim', 'horeca', 'pancake'].includes(type)) {
    location.buggy_friendliness = 'easy';
  } else if (type === 'nature') {
    location.buggy_friendliness = 'difficult';
  }

  // Price band
  if (['nature', 'farm'].includes(type)) {
    location.price_band = 'free';
  } else if (['museum', 'swim', 'play'].includes(type)) {
    location.price_band = 'budget';
  } else if (['horeca', 'pancake'].includes(type)) {
    location.price_band = 'moderate';
  }

  // Age range
  location.min_age = 0;
  location.max_age = 12;

  return location;
}

// ═══ PROGRESS TRACKING ═══

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { inserted: [], phase: 'discovery', stats: {} };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ═══ MAIN PIPELINE ═══

async function main() {
  log('info', '═══ REGION EXPANSION PIPELINE ═══');
  log('info', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log('info', `Google API: ${GOOGLE_KEY ? 'available' : 'MISSING'}`);
  log('info', `Gemini API: ${GEMINI_KEY ? 'available' : 'MISSING'}`);
  log('info', `Photos: ${SKIP_PHOTOS ? 'SKIPPED' : 'enabled'}`);

  const db = createSupabaseClient(PROJECT_ROOT);
  const progress = loadProgress();

  // Determine which regions to process
  const targetRegions = REGION_FILTER
    ? [REGION_FILTER].filter(r => NEW_REGIONS.includes(r) || REGIONS[r])
    : NEW_REGIONS;

  log('info', `Target regions: ${targetRegions.join(', ')}`);

  // Load existing locations for dedup
  log('info', 'Loading existing locations for dedup...');
  const existing = [];
  let offset = 0;
  while (true) {
    const batch = await db.rest(`locations?select=id,name,lat,lng,region,place_id&order=id.asc&offset=${offset}&limit=1000`);
    if (!batch?.length) break;
    existing.push(...batch);
    if (batch.length < 1000) break;
    offset += batch.length;
  }
  log('info', `Loaded ${existing.length} existing locations`);

  const existingNames = new Set(existing.map(l => normalizeName(l.name)));
  const existingPlaceIds = new Set(existing.filter(l => l.place_id).map(l => l.place_id));

  const stats = {
    osm_scanned: 0,
    quality_rejected: 0,
    duplicate_rejected: 0,
    google_validated: 0,
    google_closed: 0,
    websites_scraped: 0,
    photos_found: 0,
    photos_scored: 0,
    descriptions_generated: 0,
    locations_inserted: 0,
    errors: 0,
  };

  const allNewLocations = [];

  // ─── PHASE 1: OSM DISCOVERY ───
  log('info', '─── Phase 1: OSM Discovery ───');

  for (const regionName of targetRegions) {
    log('info', `Scanning region: ${regionName}`);

    // Get all municipalities in this region
    const municipalities = Object.entries(REGIONS)
      .filter(([name, cfg]) => name === regionName || cfg.supabaseRegion === regionName)
      .filter(([, cfg]) => !cfg.skipOsm);

    for (const [munName, munCfg] of municipalities) {
      log('info', `  Municipality: ${munName}`);

      for (const [typeKey, typeDef] of Object.entries(OSM_QUERIES)) {
        await wait(2500); // Rate limit Overpass

        const query = typeDef.query(munCfg.osmName, munCfg.adminLevel);
        const elements = await fetchOverpass(query);
        stats.osm_scanned += elements.length;

        if (!elements.length) continue;

        for (const el of elements) {
          const location = elementToLocation(el, regionName, typeDef.ppType);
          if (!location) { stats.quality_rejected++; continue; }

          // Dedup: name + distance
          const normalizedName = normalizeName(location.name);
          const isDupName = existing.some(loc => {
            if (normalizeName(loc.name) !== normalizedName) return false;
            return haversineMeters(location.lat, location.lng, loc.lat, loc.lng) < 500;
          });
          if (isDupName) { stats.duplicate_rejected++; continue; }

          // Dedup: too close to existing
          const tooClose = existing.some(loc =>
            haversineMeters(location.lat, location.lng, loc.lat, loc.lng) < 50
          );
          if (tooClose) { stats.duplicate_rejected++; continue; }

          // Dedup: already in this run
          const alreadyInRun = allNewLocations.some(l =>
            normalizeName(l.name) === normalizedName &&
            haversineMeters(l.lat, l.lng, location.lat, location.lng) < 500
          );
          if (alreadyInRun) { stats.duplicate_rejected++; continue; }

          allNewLocations.push(location);
        }

        if (elements.length > 0) {
          log('info', `    ${typeKey}: ${elements.length} found`);
        }
      }
    }
  }

  log('info', `OSM Discovery complete: ${allNewLocations.length} candidates from ${stats.osm_scanned} elements`);
  log('info', `Quality rejected: ${stats.quality_rejected}, Duplicate rejected: ${stats.duplicate_rejected}`);

  // ─── PHASE 2: GOOGLE PLACES VALIDATION ───
  log('info', `─── Phase 2: Google Places Validation (${allNewLocations.length} locations) ───`);

  const validatedLocations = [];
  for (let i = 0; i < allNewLocations.length; i++) {
    const loc = allNewLocations[i];
    if (i > 0 && i % 20 === 0) {
      log('info', `  Google validated: ${i}/${allNewLocations.length}`);
    }

    await wait(300); // Rate limit
    const validated = await validateWithGoogle(loc);

    if (!validated) { stats.google_closed++; continue; }

    // Skip if place_id already exists in our DB
    if (validated.place_id && existingPlaceIds.has(validated.place_id)) {
      stats.duplicate_rejected++;
      continue;
    }

    stats.google_validated++;
    validatedLocations.push(validated);
  }

  log('info', `Google validation: ${validatedLocations.length} valid, ${stats.google_closed} closed`);

  // ─── PHASE 3: WEBSITE SCRAPING ───
  log('info', `─── Phase 3: Website Scraping (${validatedLocations.filter(l => l.website).length} with websites) ───`);

  for (let i = 0; i < validatedLocations.length; i++) {
    if (!validatedLocations[i].website) continue;
    await wait(500);
    validatedLocations[i] = await scrapeWebsiteSignals(validatedLocations[i]);
    stats.websites_scraped++;

    if (i > 0 && i % 20 === 0) {
      log('info', `  Websites scraped: ${stats.websites_scraped}`);
    }
  }

  // ─── PHASE 4: PHOTO FINDING ───
  if (!SKIP_PHOTOS) {
    log('info', `─── Phase 4: Photo Finding ───`);
    for (let i = 0; i < validatedLocations.length; i++) {
      await wait(300);
      validatedLocations[i] = await findPhoto(validatedLocations[i]);
      if (validatedLocations[i].photo_url) stats.photos_found++;
    }
    log('info', `Photos found: ${stats.photos_found}/${validatedLocations.length}`);

    // ─── PHASE 5: GEMINI PHOTO SCORING ───
    const withPhotos = validatedLocations.filter(l => l.photo_url);
    log('info', `─── Phase 5: Gemini Photo Scoring (${withPhotos.length} photos) ───`);
    for (let i = 0; i < validatedLocations.length; i++) {
      if (!validatedLocations[i].photo_url) continue;
      validatedLocations[i] = await scorePhotoWithGemini(validatedLocations[i]);
      stats.photos_scored++;
      if (stats.photos_scored % 10 === 0) {
        log('info', `  Photos scored: ${stats.photos_scored}`);
      }
    }
  }

  // ─── PHASE 6: DESCRIPTION GENERATION ───
  log('info', `─── Phase 6: Description Generation ───`);
  for (let i = 0; i < validatedLocations.length; i++) {
    if (validatedLocations[i].description) continue;
    validatedLocations[i] = await generateDescription(validatedLocations[i]);
    if (validatedLocations[i].description) stats.descriptions_generated++;
    if (stats.descriptions_generated % 10 === 0 && stats.descriptions_generated > 0) {
      log('info', `  Descriptions: ${stats.descriptions_generated}`);
    }
  }

  // ─── PHASE 7: DERIVE CONTEXT FIELDS ───
  log('info', '─── Phase 7: Deriving Context Fields ───');
  for (let i = 0; i < validatedLocations.length; i++) {
    validatedLocations[i] = deriveContextFields(validatedLocations[i]);
  }

  // ─── PHASE 8: INSERT INTO DATABASE ───
  log('info', `─── Phase 8: Database Insert (${validatedLocations.length} locations) ───`);

  for (const loc of validatedLocations) {
    // Clean up internal fields
    const osm_id = loc.osm_id;
    delete loc.osm_id;
    delete loc.osm_tags;
    delete loc._og_image;
    delete loc._google_rating;
    delete loc._google_reviews;
    delete loc._google_price;

    // Build the row for Supabase
    const row = {
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      type: loc.type,
      region: loc.region,
      website: loc.website || null,
      description: loc.description || null,
      opening_hours: loc.opening_hours || null,
      place_id: loc.place_id || null,
      photo_url: loc.photo_url || null,
      photo_source: loc.photo_source || null,
      photo_quality: loc.photo_quality || null,
      distance_from_city_center_km: loc.distance_from_city_center_km || null,
      coffee: loc.coffee || null,
      diaper: loc.diaper || null,
      alcohol: loc.alcohol || null,
      play_corner_quality: loc.play_corner_quality || null,
      toilet_confidence: loc.toilet_confidence || null,
      parking_ease: loc.parking_ease || null,
      rain_backup_quality: loc.rain_backup_quality || null,
      weather: loc.weather || null,
      time_of_day_fit: loc.time_of_day_fit || null,
      noise_level: loc.noise_level || null,
      food_fit: loc.food_fit || null,
      buggy_friendliness: loc.buggy_friendliness || null,
      price_band: loc.price_band || null,
      min_age: loc.min_age ?? 0,
      max_age: loc.max_age ?? 12,
      verification_source: 'osm+google',
      verification_confidence: loc.place_id ? 0.85 : 0.50,
      verification_mode: 'auto_pipeline',
    };

    if (DRY_RUN) {
      log('ok', `[DRY] Would insert: ${row.name} (${row.type}) in ${row.region}`);
      stats.locations_inserted++;
      continue;
    }

    try {
      const inserted = await db.insertLocation(row);
      if (inserted?.id) {
        stats.locations_inserted++;
        progress.inserted.push({ id: inserted.id, name: row.name, region: row.region, type: row.type, osm_id });
        saveProgress(progress);

        if (stats.locations_inserted % 10 === 0) {
          log('info', `  Inserted: ${stats.locations_inserted}`);
        }
      }
    } catch (err) {
      stats.errors++;
      log('error', `Insert failed for ${row.name}: ${err.message}`);
    }
  }

  // ─── SUMMARY ───
  log('info', '═══ REGION EXPANSION COMPLETE ═══');
  log('info', `Stats: ${JSON.stringify(stats)}`);

  // Save final progress
  progress.stats = stats;
  progress.phase = 'complete';
  progress.finished_at = new Date().toISOString();
  saveProgress(progress);

  // Per-region summary
  for (const region of targetRegions) {
    const count = validatedLocations.filter(l => l.region === region).length;
    log('info', `  ${region}: ${count} locations`);
  }

  return stats;
}

main().catch(err => {
  log('error', `Pipeline crashed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
