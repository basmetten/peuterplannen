/**
 * discover_utrecht_osm.js
 *
 * Discovers OSM candidates across Utrecht regio municipalities.
 * Covers all relevant categories (speeltuinen, natuur, musea, zwembaden, etc.)
 * unlike the generic discover_osm.js which only queries horeca.
 *
 * Output: output/utrecht_raw.json
 */

const { writeFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');
const { createSupabaseClient } = require('./db');
const { normalizeName, haversineMeters, wait } = require('./config');

const PROJECT_ROOT = resolve(__dirname, '..', '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');

const GEMEENTEN = [
  { osmName: 'Utrecht',     adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'Nieuwegein',  adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'Houten',      adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'IJsselstein', adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'De Bilt',     adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'Woerden',     adminLevel: 8, supabaseRegion: 'Utrecht' },
  { osmName: 'Zeist',       adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  { osmName: 'Bunnik',      adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
];

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

const FASTFOOD_REJECT = /\b(mc\s*donald|burger\s*king|kfc|subway|domino|kebab|d[oö]ner)\b/i;
const HARD_REJECT = /casino|coffeeshop|smartshop|nightclub|nachtclub|stripclub|shisha|hookah/i;

function buildOverpassQuery(osmName, adminLevel) {
  return `[out:json][timeout:120];
area["name"="${osmName}"]["admin_level"="${adminLevel}"]->.a;
(
  node["leisure"~"^(playground|miniature_golf|trampoline_park)$"](area.a);
  way["leisure"~"^(playground|miniature_golf|trampoline_park)$"](area.a);
  node["amenity"="playground"](area.a);
  node["tourism"~"^(zoo|farm)$"](area.a);
  way["tourism"~"^(zoo|farm|theme_park|attraction)$"](area.a);
  node["leisure"~"^(nature_reserve|park|garden)$"]["name"](area.a);
  way["leisure"~"^(nature_reserve|park|garden)$"]["name"](area.a);
  node["tourism"~"^(museum|attraction|aquarium)$"](area.a);
  way["tourism"="museum"](area.a);
  node["amenity"~"^(theatre|cinema|arts_centre)$"]["name"](area.a);
  node["leisure"~"^(swimming_pool|water_park)$"]["name"](area.a);
  way["leisure"~"^(swimming_pool|water_park)$"]["name"](area.a);
  node["amenity"~"^(restaurant|cafe|ice_cream)$"](area.a);
  way["amenity"~"^(restaurant|cafe|ice_cream)$"](area.a);
  node["shop"="garden_centre"](area.a);
  way["shop"="garden_centre"](area.a);
);
out center tags;`;
}

async function fetchOverpass(query, gemeente) {
  const timeoutMs = 30000;
  const retryDelay = 1500;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          return data.elements || [];
        }
        const text = await res.text();
        console.warn(`[OSM] ${gemeente} via ${endpoint}: ${res.status} ${text.slice(0, 120)}`);
        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
          await wait(retryDelay * 2);
          continue;
        }
        break;
      } catch (err) {
        clearTimeout(timer);
        console.warn(`[OSM] ${gemeente} via ${endpoint} attempt ${attempt + 1}: ${err.message}`);
        if (attempt === 0) await wait(retryDelay);
      }
    }
  }
  throw new Error(`Overpass failed for gemeente ${gemeente}`);
}

function inferType(tags) {
  const name = (tags.name || '').toLowerCase();
  if (tags.leisure === 'playground' || tags.leisure === 'trampoline_park' || tags.leisure === 'miniature_golf') return 'play';
  if (tags.amenity === 'playground') return 'play';
  if (tags.tourism === 'zoo' || tags.tourism === 'farm') return 'farm';
  if (tags.tourism === 'theme_park' || tags.tourism === 'attraction') return 'play';
  if (tags.leisure === 'nature_reserve' || tags.leisure === 'park' || tags.leisure === 'garden') return 'nature';
  if (tags.shop === 'garden_centre') return 'nature';
  if (tags.tourism === 'museum' || tags.tourism === 'aquarium') return 'museum';
  if (tags.amenity === 'theatre' || tags.amenity === 'cinema' || tags.amenity === 'arts_centre') return 'museum';
  if (tags.leisure === 'swimming_pool' || tags.leisure === 'water_park') return 'swim';
  if (/pannenkoe|pannenkoek|pancake/.test(name)) return 'pancake';
  return 'horeca';
}

function preFilter(el, tags) {
  if (!tags.name) return false;
  if (tags.access === 'private') return false;
  const name = tags.name;
  if (HARD_REJECT.test(name)) return false;
  const type = inferType(tags);
  if (type === 'horeca' || type === 'pancake') {
    if (FASTFOOD_REJECT.test(name)) return false;
  }
  return true;
}

function parseElement(el, supabaseRegion) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;

  return {
    id: `osm_${el.type}_${el.id}`,
    name: tags.name,
    type_hint: inferType(tags),
    supabaseRegion,
    lat,
    lng,
    website: tags.website || tags['contact:website'] || null,
    tags,
  };
}

async function fetchExistingLocations(db) {
  const rows = await db.rest(
    `locations?region=in.(Utrecht,Utrechtse%20Heuvelrug)&select=id,name,lat,lng&limit=5000`
  );
  return Array.isArray(rows) ? rows : [];
}

function isDuplicate(candidate, existing) {
  const cName = normalizeName(candidate.name);
  if (!cName) return true;

  for (const row of existing) {
    const rName = normalizeName(row.name);
    if (rName !== cName) continue;
    const dist = haversineMeters(
      candidate.lat, candidate.lng,
      Number(row.lat), Number(row.lng)
    );
    if (dist <= 120) return true;
  }
  return false;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const db = createSupabaseClient(PROJECT_ROOT);

  console.log('[discover] Fetching existing Utrecht locations from Supabase...');
  const existing = await fetchExistingLocations(db);
  console.log(`[discover] ${existing.length} existing locations loaded`);

  const allCandidates = [];
  const seenIds = new Set();
  const seenNameGeo = new Set();

  for (const gemeente of GEMEENTEN) {
    console.log(`[discover] Querying OSM: ${gemeente.osmName}...`);
    const query = buildOverpassQuery(gemeente.osmName, gemeente.adminLevel);

    let elements;
    try {
      elements = await fetchOverpass(query, gemeente.osmName);
    } catch (err) {
      console.warn(`[discover] Skipping ${gemeente.osmName}: ${err.message}`);
      await wait(1500);
      continue;
    }

    console.log(`[discover]   ${elements.length} raw elements from ${gemeente.osmName}`);

    let kept = 0;
    for (const el of elements) {
      const tags = el.tags || {};
      if (!preFilter(el, tags)) continue;

      const candidate = parseElement(el, gemeente.supabaseRegion);
      if (!candidate.lat || !candidate.lng) continue;

      // dedup by OSM id
      if (seenIds.has(candidate.id)) continue;
      seenIds.add(candidate.id);

      // dedup against already-seen in this run (name+geo key)
      const nameKey = normalizeName(candidate.name);
      const geoKey = `${Math.round(candidate.lat * 1000)},${Math.round(candidate.lng * 1000)}`;
      const runKey = `${nameKey}|${geoKey}`;
      if (seenNameGeo.has(runKey)) continue;
      seenNameGeo.add(runKey);

      // dedup against existing Supabase locations
      if (isDuplicate(candidate, existing)) {
        continue;
      }

      allCandidates.push(candidate);
      kept++;
    }

    console.log(`[discover]   ${kept} new candidates from ${gemeente.osmName}`);
    await wait(1500); // rate-limit between municipalities
  }

  const outputPath = resolve(OUTPUT_DIR, 'utrecht_raw.json');
  writeFileSync(outputPath, JSON.stringify(allCandidates, null, 2), 'utf8');

  console.log(`\n[discover] Done. ${allCandidates.length} candidates written to output/utrecht_raw.json`);

  const byType = {};
  for (const c of allCandidates) {
    byType[c.type_hint] = (byType[c.type_hint] || 0) + 1;
  }
  console.log('[discover] By type:', byType);
}

main().catch((err) => {
  console.error('[discover] Fatal:', err.message || String(err));
  process.exit(1);
});
