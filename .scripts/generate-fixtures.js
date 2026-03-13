/**
 * generate-fixtures.js — Generate fixture data from production Supabase
 *
 * Fetches a subset of production data and saves it as JSON fixtures
 * for offline/local development. Strips sensitive fields.
 *
 * Usage: node .scripts/generate-fixtures.js
 *
 * ONLY run locally, NOT in CI.
 */
const fs = require('fs');
const path = require('path');
const { fetchData } = require('./lib/supabase');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TARGET_REGIONS = ['amsterdam', 'utrecht', 'haarlem'];
const LOCATIONS_PER_REGION = 10;

// Fields to strip from locations (sensitive or internal-only)
const STRIP_LOCATION_FIELDS = [
  'verification_confidence',
  'verification_notes',
  'pipeline_score',
  'pipeline_notes',
  'pipeline_run_id',
  'admin_notes',
];

async function main() {
  console.log('Generating fixture data from production Supabase...\n');

  const data = await fetchData();

  // 1. Regions: pick target regions
  const fixtureRegions = data.regions.filter(r => TARGET_REGIONS.includes(r.slug));
  console.log(`  Regions: ${fixtureRegions.length} (${fixtureRegions.map(r => r.name).join(', ')})`);

  // 2. Locations: pick ~LOCATIONS_PER_REGION per target region, spread across types
  const regionNames = new Set(fixtureRegions.map(r => r.name));
  const locationsByRegion = {};
  for (const loc of data.locations) {
    if (regionNames.has(loc.region)) {
      if (!locationsByRegion[loc.region]) locationsByRegion[loc.region] = [];
      locationsByRegion[loc.region].push(loc);
    }
  }

  const fixtureLocations = [];
  for (const [region, locs] of Object.entries(locationsByRegion)) {
    // Group by type, pick evenly
    const byType = {};
    for (const loc of locs) {
      if (!byType[loc.type]) byType[loc.type] = [];
      byType[loc.type].push(loc);
    }
    const types = Object.keys(byType);
    const perType = Math.max(1, Math.floor(LOCATIONS_PER_REGION / types.length));
    let picked = 0;
    for (const type of types) {
      const subset = byType[type].slice(0, perType);
      fixtureLocations.push(...subset);
      picked += subset.length;
    }
    // Fill remaining slots from any type
    if (picked < LOCATIONS_PER_REGION) {
      const pickedIds = new Set(fixtureLocations.map(l => l.id));
      for (const loc of locs) {
        if (picked >= LOCATIONS_PER_REGION) break;
        if (!pickedIds.has(loc.id)) {
          fixtureLocations.push(loc);
          picked++;
        }
      }
    }
    console.log(`  Locations [${region}]: ${picked} (${types.length} types)`);
  }

  // Strip sensitive fields
  for (const loc of fixtureLocations) {
    for (const field of STRIP_LOCATION_FIELDS) {
      delete loc[field];
    }
  }

  // 3. Editorial pages: first 3 published
  const fixtureEditorial = data.editorialPages.slice(0, 3);
  console.log(`  Editorial pages: ${fixtureEditorial.length}`);

  // 4. Location aliases: only those matching fixture locations
  const fixtureLocationIds = new Set(fixtureLocations.map(l => l.id));
  const fixtureAliases = (data.locationAliases || []).filter(a => fixtureLocationIds.has(a.location_id));
  console.log(`  Location aliases: ${fixtureAliases.length}`);

  // 5. GSC snapshots: first 3
  const fixtureGsc = (data.gscSnapshots || []).slice(0, 3);
  console.log(`  GSC snapshots: ${fixtureGsc.length}`);

  // Write fixture files
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const write = (name, data) => {
    const p = path.join(FIXTURES_DIR, name);
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    console.log(`  Written: ${name} (${data.length} records)`);
  };

  console.log('\nWriting fixture files...');
  write('regions.json', fixtureRegions);
  write('locations.json', fixtureLocations);
  write('editorial_pages.json', fixtureEditorial);
  write('location_aliases.json', fixtureAliases);
  write('gsc_snapshots.json', fixtureGsc);

  console.log('\nDone! Fixture data saved to .scripts/fixtures/');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
