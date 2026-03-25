#!/usr/bin/env node

/**
 * discover-new-locations.js — Discover new candidate locations via OSM
 *
 * Searches OpenStreetMap for locations that might be suitable for PeuterPlannen
 * but aren't yet in the database. Deduplicates against existing locations.
 * New candidates go into location_candidates for review.
 *
 * Usage:
 *   node .scripts/pipeline/discover-new-locations.js                    # All regions
 *   node .scripts/pipeline/discover-new-locations.js --region=Amsterdam  # One region
 *   node .scripts/pipeline/discover-new-locations.js --dry-run           # Don't insert
 *   node .scripts/pipeline/discover-new-locations.js --type=playground   # One type
 */

const fs = require('fs');
const path = require('path');
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
} = require('./config');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_FILE = path.join(OUTPUT_DIR, 'discovery-log.jsonl');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const REGION_FILTER = process.argv.find(a => a.startsWith('--region='))?.split('=')[1] || null;
const TYPE_FILTER = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || null;

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { info: 'ℹ', warn: '⚠', error: '✗', ok: '✓' }[level] || '·';
  console.log(`${ts} ${prefix} ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

// OSM query types for PeuterPlannen-relevant locations
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

// Overpass API endpoints with round-robin
let _rrIdx = 0;
const OVERPASS_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

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
    } catch {
      continue;
    }
  }
  return [];
}

function elementToCandidate(el, regionRoot, ppType, runId) {
  const tags = el.tags || {};
  const lat = el.lat || el.center?.lat;
  const lng = el.lon || el.center?.lon;
  if (!lat || !lng) return null;

  const name = tags.name || tags['name:nl'] || '';
  if (!name || name.length < 3) return null;

  // Skip bars and nightlife
  if (isBarOrNightlife({ name, cuisine: tags.cuisine })) return null;
  if (hasHardRejectSignal(name)) return null;

  // ─── QUALITY GATE: only significant, noteworthy locations ───

  // Playgrounds: skip unnamed/generic neighborhood playgrounds.
  // Only include named, notable playgrounds (with website, operator, or clear destination quality)
  if (ppType === 'play') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    const hasOperator = !!tags.operator;
    const isIndoor = tags.indoor === 'yes' || /indoor|binnenspeeltuin|speelparadijs/i.test(name);
    const isNotable = /speelparadijs|speelpark|speelbos|avonturen|adventure|klimpark|speelland|speelstad/i.test(name);
    // Must have website OR be clearly notable (indoor, speelparadijs, etc.)
    // Operator alone is not enough — many neighborhood playgrounds have operator tags
    if (!hasWebsite && !isIndoor && !isNotable) return null;
  }

  // Horeca: only include if there are kid-friendliness signals in OSM tags
  if (ppType === 'horeca') {
    const kidSignals = [
      tags.kids_area, tags['kids_area:indoor'], tags['kids_area:outdoor'],
      tags.highchair, tags.changing_table, tags.playground,
      tags.family_friendly, tags['menu:children'], tags.kids_menu,
    ].some(v => v && v !== 'no');
    const nameSignals = /kindvriendelijk|kids|kinderen|gezin|family|speelhoek|pannenkoek|pancake/i.test(
      `${name} ${tags.description || ''} ${tags.cuisine || ''}`
    );
    if (!kidSignals && !nameSignals) return null;
  }

  // Nature: skip generic parks. Only include notable nature destinations.
  if (ppType === 'nature') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    const isNotable = /nationaal|landgoed|duinen|heide|bos|forest|duin|kasteel|watervallen/i.test(name);
    const isLarge = tags.area ? Number(tags.area) > 50000 : false; // >5 hectare
    if (!hasWebsite && !isNotable && !isLarge) return null;
  }

  // Museums: most are worth including, but skip very small/obscure ones
  if (ppType === 'museum') {
    const hasWebsite = !!(tags.website || tags['contact:website']);
    if (!hasWebsite) return null; // museums without website are likely not worth visiting
  }

  // Swimming: skip private pools, only public/commercial
  if (ppType === 'swim') {
    if (tags.access === 'private') return null;
    const hasName = name.length > 5;
    if (!hasName) return null;
  }

  // Farms: most are worth including
  // (petting zoos and children's farms are inherently kid-friendly)

  const fp = buildSourceFingerprint([
    'osm', el.type, el.id, name.toLowerCase().trim(),
  ]);

  return {
    run_id: runId,
    source_fingerprint: fp,
    name: name.trim(),
    lat, lng,
    region_root: regionRoot,
    address: tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`.trim() : null,
    city: tags['addr:city'] || null,
    website: tags.website || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    amenity: tags.amenity || tags.leisure || tags.tourism || null,
    cuisine: tags.cuisine || null,
    osm_type: el.type,
    osm_id: String(el.id),
    source: 'osm',
    status: 'new',
    raw_payload: { raw_tags: tags, pp_type_hint: ppType, postcode: tags['addr:postcode'] || null },
    enriched_signals: {},
  };
}

async function main() {
  log('info', '═══ New Location Discovery Pipeline ═══');
  log('info', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  const db = createSupabaseClient(PROJECT_ROOT);

  // Create ingestion run
  let runId = null;
  if (!DRY_RUN) {
    const run = await db.createIngestionRun({
      runType: 'ingest',
      regionRoot: REGION_FILTER || 'all-discovery',
      withSurroundings: true,
    });
    runId = run?.id;
    log('info', `Created ingestion run: ${runId}`);
  }

  // Fetch existing locations for dedup
  log('info', 'Loading existing locations for dedup...');
  const existing = [];
  let offset = 0;
  while (true) {
    const batch = await db.rest(`locations?select=id,name,lat,lng,region,place_id,website&order=id.asc&offset=${offset}&limit=1000`);
    if (!batch?.length) break;
    existing.push(...batch);
    if (batch.length < 1000) break;
    offset += batch.length;
  }
  log('info', `Loaded ${existing.length} existing locations`);

  // Also load existing candidates to avoid re-inserting
  const existingCandidates = await db.rest('location_candidates?select=source_fingerprint&limit=50000');
  const existingFPs = new Set((existingCandidates || []).map(c => c.source_fingerprint));
  log('info', `Loaded ${existingFPs.size} existing candidate fingerprints`);

  // Determine which regions to scan
  const primaryRegions = Object.entries(REGIONS)
    .filter(([, cfg]) => !cfg.supabaseRegion) // only primary regions
    .filter(([name]) => !REGION_FILTER || name === REGION_FILTER)
    .filter(([, cfg]) => !cfg.skipOsm);

  // Determine which types to scan
  const typeKeys = TYPE_FILTER ? [TYPE_FILTER] : Object.keys(OSM_QUERIES);

  const stats = { scanned: 0, new_candidates: 0, duplicates: 0, rejected: 0 };

  for (const [regionName, regionCfg] of primaryRegions) {
    const rootRegion = mapToRootRegion(regionName);
    log('info', `Scanning ${regionName}...`);

    for (const typeKey of typeKeys) {
      const typeDef = OSM_QUERIES[typeKey];
      if (!typeDef) continue;

      const query = typeDef.query(regionCfg.osmName, regionCfg.adminLevel);

      // Rate limit: wait between Overpass queries
      await wait(2000);

      const elements = await fetchOverpass(query);
      stats.scanned += elements.length;

      if (!elements.length) continue;
      log('info', `  ${typeKey}: ${elements.length} OSM elements found`);

      // Convert to candidates and dedup
      const candidates = [];
      for (const el of elements) {
        const candidate = elementToCandidate(el, rootRegion, typeDef.ppType, runId);
        if (!candidate) { stats.rejected++; continue; }

        // Dedup: check fingerprint
        if (existingFPs.has(candidate.source_fingerprint)) {
          stats.duplicates++;
          continue;
        }

        // Dedup: check name + distance against existing locations
        const normalizedName = normalizeName(candidate.name);
        const isDup = existing.some(loc => {
          const locNorm = normalizeName(loc.name);
          if (locNorm !== normalizedName) return false;
          const dist = haversineMeters(candidate.lat, candidate.lng, loc.lat, loc.lng);
          return dist < 500; // same name within 500m = duplicate
        });

        if (isDup) { stats.duplicates++; continue; }

        // Dedup: check just distance (different name but same coords)
        const tooClose = existing.some(loc => {
          const dist = haversineMeters(candidate.lat, candidate.lng, loc.lat, loc.lng);
          return dist < 50; // within 50m of existing = likely duplicate
        });

        if (tooClose) { stats.duplicates++; continue; }

        candidates.push(candidate);
        existingFPs.add(candidate.source_fingerprint); // prevent self-dupes
      }

      if (candidates.length > 0 && !DRY_RUN) {
        await db.upsertCandidates(candidates);
        log('ok', `  ${typeKey}: ${candidates.length} new candidates inserted`);
      } else if (candidates.length > 0) {
        log('info', `  ${typeKey}: ${candidates.length} new candidates (dry run)`);
      }

      stats.new_candidates += candidates.length;

      // Log some examples
      candidates.slice(0, 2).forEach(c => {
        fs.appendFileSync(LOG_FILE, JSON.stringify({
          ts: new Date().toISOString(),
          region: rootRegion, type: typeKey,
          name: c.name, lat: c.lat, lng: c.lng,
          website: c.website,
        }) + '\n');
      });
    }
  }

  // Finish ingestion run
  if (runId && !DRY_RUN) {
    await db.finishIngestionRun(runId, {
      status: 'done',
      stats: stats,
    });
  }

  log('info', '═══ Discovery Complete ═══');
  log('info', `Scanned: ${stats.scanned} | New: ${stats.new_candidates} | Dupes: ${stats.duplicates} | Rejected: ${stats.rejected}`);
}

main().catch(err => {
  log('error', `Discovery crashed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
