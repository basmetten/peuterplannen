/**
 * insert_utrecht.js
 *
 * Reads output/utrecht_approved.json and inserts each location into Supabase.
 * Performs final deduplication (name+geo) before inserting.
 *
 * Usage: node .scripts/pipeline/insert_utrecht.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const { createSupabaseClient } = require('./db');
const { normalizeName, haversineMeters } = require('./config');

const PROJECT_ROOT = resolve(__dirname, '..', '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');

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
    if (normalizeName(row.name) !== cName) continue;
    const dist = haversineMeters(
      Number(candidate.lat), Number(candidate.lng),
      Number(row.lat), Number(row.lng)
    );
    if (dist <= 120) return true;
  }
  return false;
}

function normalizeWeather(value) {
  if (!value) return 'outdoor';
  if (value === 'hybrid') return 'both';
  if (['indoor', 'outdoor', 'both'].includes(value)) return value;
  return 'outdoor';
}

function buildInsertRow(candidate) {
  return {
    name: candidate.name,
    region: candidate.supabaseRegion,
    type: candidate.type,
    lat: candidate.lat,
    lng: candidate.lng,
    website: candidate.website || null,
    description: candidate.description || null,
    toddler_highlight: candidate.toddler_highlight || null,
    weather: normalizeWeather(candidate.weather),
    coffee: candidate.coffee === true,
    diaper: candidate.diaper === true,
    verification_source: 'osm_haiku_pipeline_v2',
    last_verified_at: new Date().toISOString(),
    last_verified: new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const approvedPath = resolve(OUTPUT_DIR, 'utrecht_approved.json');
  let approved;
  try {
    approved = JSON.parse(readFileSync(approvedPath, 'utf8'));
  } catch (err) {
    console.error(`[insert] Cannot read ${approvedPath}: ${err.message}`);
    process.exit(1);
  }

  if (!approved.length) {
    console.log('[insert] No approved candidates. Nothing to insert.');
    return;
  }

  const db = createSupabaseClient(PROJECT_ROOT);

  console.log('[insert] Fetching current Utrecht locations for dedup check...');
  const existing = await fetchExistingLocations(db);
  console.log(`[insert] ${existing.length} existing locations loaded`);
  console.log(`[insert] Processing ${approved.length} approved candidates...\n`);

  let inserted = 0;
  let skipped = 0;

  for (const candidate of approved) {
    if (!candidate.name || !candidate.lat || !candidate.lng) {
      console.log(`  SKIP (missing fields): ${candidate.name || '(no name)'}`);
      skipped++;
      continue;
    }

    if (isDuplicate(candidate, existing)) {
      console.log(`  SKIP (duplicate): ${candidate.name}`);
      skipped++;
      continue;
    }

    try {
      const row = buildInsertRow(candidate);
      const result = await db.insertLocation(row);
      if (result) {
        existing.push({ id: result.id, name: result.name, lat: result.lat, lng: result.lng });
        console.log(`  OK inserted: ${candidate.name} (${candidate.supabaseRegion})`);
        inserted++;
      } else {
        console.log(`  WARN no result for: ${candidate.name}`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ERROR inserting ${candidate.name}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n[insert] Done.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
}

main().catch((err) => {
  console.error('[insert] Fatal:', err.message || String(err));
  process.exit(1);
});
