const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const {
  REGIONS,
  isBarOrNightlife,
  buildSourceFingerprint,
  wait,
  mapLimit,
} = require('./config');

const STAGE3_DIR = resolve(__dirname, '..', '..', 'output');

function buildOverpassQuery(osmName, adminLevel) {
  return `[out:json][timeout:90];
area["name"="${osmName}"]["admin_level"="${adminLevel}"]->.a;
(
  node["amenity"~"restaurant|cafe|ice_cream|fast_food|food_court"](area.a);
  way["amenity"~"restaurant|cafe|ice_cream|fast_food|food_court"](area.a);
);
out center;`;
}

async function fetchOverpassElements(regionName) {
  const cfg = REGIONS[regionName];
  if (!cfg) throw new Error(`Unknown OSM region: ${regionName}`);

  const query = buildOverpassQuery(cfg.osmName, cfg.adminLevel);
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ];
  const timeoutMs = Number(process.env.OVERPASS_TIMEOUT_MS || '20000');
  const maxAttempts = Number(process.env.OVERPASS_MAX_ATTEMPTS || '2');
  const retryDelayMs = Number(process.env.OVERPASS_RETRY_DELAY_MS || '1500');

  let lastErr = null;
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeout);
        lastErr = new Error(`Overpass ${regionName} via ${endpoint} failed: ${err.message}`);
        if (attempt < maxAttempts - 1) {
          await wait((attempt + 1) * retryDelayMs);
          continue;
        }
        break;
      }
      clearTimeout(timeout);

      if (res.ok) {
        const raw = await res.text();
        try {
          const data = JSON.parse(raw);
          return data.elements || [];
        } catch {
          lastErr = new Error(`Overpass ${regionName} via ${endpoint} returned non-JSON body`);
          if (attempt < maxAttempts - 1) {
            await wait((attempt + 1) * retryDelayMs);
            continue;
          }
          break;
        }
      }

      const text = await res.text();
      lastErr = new Error(`Overpass ${regionName} via ${endpoint} failed: ${res.status} ${text.slice(0, 240)}`);
      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts - 1) {
        await wait((attempt + 1) * retryDelayMs);
        continue;
      }
      break;
    }
  }

  throw lastErr || new Error(`Overpass ${regionName} failed without response`);
}

function parseElement(el) {
  const tags = el.tags || {};
  const lat = el.lat || el.center?.lat || null;
  const lng = el.lon || el.center?.lon || null;

  return {
    osm_id: el.id,
    osm_type: el.type,
    name: tags.name || null,
    amenity: tags.amenity || null,
    cuisine: tags.cuisine || null,
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || null,
    city: tags['addr:city'] || tags['addr:postcode'] || null,
    website: tags.website || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    outdoor_seating: tags.outdoor_seating || null,
    wheelchair: tags.wheelchair || null,
    opening_hours: tags.opening_hours || null,
    lat,
    lng,
    raw_tags: tags,
  };
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    if (!c.name) continue;
    if (isBarOrNightlife(c)) continue;
    const fingerprint = buildSourceFingerprint([
      c.source || 'osm',
      c.source_id || '',
      c.name || '',
      c.lat || '',
      c.lng || '',
      c.website || '',
      c.region_root || '',
    ]);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    out.push({ ...c, source_fingerprint: fingerprint });
  }
  return out;
}

function loadStage3Fallback(sourceRegion) {
  const filePath = resolve(STAGE3_DIR, `stage3_${sourceRegion}.json`);
  if (!existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((row) => row && row.name && row.lat && row.lng)
      .map((row) => ({
        osm_id: row.osm_id || null,
        osm_type: row.osm_type || 'node',
        name: row.name || null,
        amenity: row.amenity || null,
        cuisine: row.cuisine || null,
        address: row.address || null,
        city: row.city || null,
        website: row.website || null,
        phone: row.phone || null,
        outdoor_seating: row.outdoor_seating || null,
        wheelchair: row.wheelchair || null,
        opening_hours: row.opening_hours || null,
        lat: Number(row.lat),
        lng: Number(row.lng),
        raw_tags: {},
      }));
  } catch {
    return [];
  }
}

async function discoverOSMCandidates({ regionRoot, sourceRegions, runId }) {
  const allowStage3Fallback = process.env.PIPELINE_ALLOW_STAGE3_FALLBACK === 'true';
  const discoveredByRegion = await mapLimit(sourceRegions, 2, async (sourceRegion) => {
    try {
      const elements = await fetchOverpassElements(sourceRegion);
      return elements.map(parseElement)
        .filter((item) => item.name)
        .map((item) => ({
          run_id: runId,
          existing_location_id: null,
          region_root: regionRoot,
          region_source: sourceRegion,
          source: 'osm',
          source_id: `${item.osm_type}:${item.osm_id}`,
          status: 'new',
          name: item.name,
          amenity: item.amenity,
          cuisine: item.cuisine,
          address: item.address,
          city: item.city,
          website: item.website,
          phone: item.phone,
          lat: item.lat,
          lng: item.lng,
          osm_id: item.osm_id,
          osm_type: item.osm_type,
          raw_payload: {
            outdoor_seating: item.outdoor_seating,
            wheelchair: item.wheelchair,
            opening_hours: item.opening_hours,
            raw_tags: item.raw_tags,
          },
        }));
    } catch (err) {
      if (allowStage3Fallback) {
        const fallback = loadStage3Fallback(sourceRegion);
        if (fallback.length) {
          console.warn(`[OSM] Using stage3 fallback for "${sourceRegion}" (${fallback.length} records): ${err.message}`);
          return fallback.map((item) => ({
            run_id: runId,
            existing_location_id: null,
            region_root: regionRoot,
            region_source: sourceRegion,
            source: 'stage3',
            source_id: `${item.osm_type || 'node'}:${item.osm_id || `${sourceRegion}:${item.name}`}`,
            status: 'new',
            name: item.name,
            amenity: item.amenity,
            cuisine: item.cuisine,
            address: item.address,
            city: item.city,
            website: item.website,
            phone: item.phone,
            lat: item.lat,
            lng: item.lng,
            osm_id: item.osm_id,
            osm_type: item.osm_type,
            raw_payload: {
              outdoor_seating: item.outdoor_seating,
              wheelchair: item.wheelchair,
              opening_hours: item.opening_hours,
              raw_tags: item.raw_tags,
              fallback_source: 'stage3',
            },
          }));
        }
      }
      console.warn(`[OSM] Skipping source region "${sourceRegion}": ${err.message}`);
      return [];
    }
  });

  const all = discoveredByRegion.flat();
  if (!all.length) {
    throw new Error(`OSM discovery failed for all source regions of ${regionRoot}`);
  }

  return dedupeCandidates(all);
}

module.exports = {
  discoverOSMCandidates,
};
