#!/usr/bin/env node
/**
 * Migration 001: Add slug column to locations table
 *
 * Generates URL-safe slugs from location names using the same algorithm
 * as the old app (.scripts/lib/helpers.js + .scripts/lib/seo-policy.js):
 *   1. Lowercase
 *   2. NFD normalize → strip combining marks (ë→e, ö→o, etc.)
 *   3. Replace non-alphanumeric runs with hyphens
 *   4. Strip leading/trailing hyphens
 *   5. Duplicates within same region get -2, -3 suffix
 *
 * Usage: node migrations/001-add-slugs.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 */

const SUPABASE_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

// --- Slug generation (matches old app exactly) ---

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Supabase helpers ---

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseRpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`RPC ${fnName}: ${res.status} ${await res.text()}`);
  return res;
}

async function supabasePatch(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${table} id=${id}: ${res.status} ${await res.text()}`);
  return res;
}

// --- Step 1: Verify slug column exists ---

async function verifySlugColumn() {
  console.log('Step 1: Verifying slug column exists...');
  try {
    await supabaseGet('locations?select=slug&limit=1');
    console.log('  → slug column exists');
  } catch {
    console.error('  ✗ slug column does not exist. Run this SQL in Supabase SQL Editor first:');
    console.error('    ALTER TABLE locations ADD COLUMN slug text;');
    process.exit(1);
  }
}

// --- Step 2: Fetch all locations and generate slugs ---

async function generateSlugs() {
  console.log('Step 2: Fetching all locations...');

  // Fetch in batches (Supabase default limit is 1000)
  let allLocations = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const batch = await supabaseGet(
      `locations?select=id,name,region&order=id.asc&offset=${offset}&limit=${batchSize}`
    );
    allLocations = allLocations.concat(batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`  → Fetched ${allLocations.length} locations`);

  // Group by region (matches old app's computeSlugs logic)
  const byRegion = {};
  for (const loc of allLocations) {
    const region = loc.region || 'overig';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(loc);
  }

  console.log(`  → ${Object.keys(byRegion).length} regions`);

  // Generate slugs with duplicate resolution per region
  const updates = [];
  for (const [region, locs] of Object.entries(byRegion)) {
    const usedSlugs = {};

    for (const loc of locs) {
      let slug = slugify(loc.name);
      if (!slug) slug = 'locatie';

      if (usedSlugs[slug]) {
        usedSlugs[slug]++;
        slug = `${slug}-${usedSlugs[slug]}`;
      } else {
        usedSlugs[slug] = 1;
      }

      updates.push({ id: loc.id, slug });
    }
  }

  return updates;
}

// --- Step 3: Apply updates in batches ---

async function applyUpdates(updates) {
  console.log(`Step 3: Updating ${updates.length} locations...`);

  let done = 0;
  const batchSize = 50;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ id, slug }) => supabasePatch('locations', id, { slug }))
    );
    done += batch.length;
    if (done % 500 === 0 || done === updates.length) {
      console.log(`  → ${done}/${updates.length}`);
    }
  }
}

// --- Step 4: Verify ---

async function verify() {
  console.log('Step 4: Verifying...');

  // Check for null slugs
  const nullSlugs = await supabaseGet('locations?slug=is.null&select=id,name&limit=5');
  if (nullSlugs.length > 0) {
    console.error(`  ✗ ${nullSlugs.length}+ locations still have null slug:`, nullSlugs);
    return false;
  }
  console.log('  ✓ No null slugs');

  // Check for empty slugs
  const emptySlugs = await supabaseGet('locations?slug=eq.&select=id,name&limit=5');
  if (emptySlugs.length > 0) {
    console.error(`  ✗ ${emptySlugs.length}+ locations have empty slug:`, emptySlugs);
    return false;
  }
  console.log('  ✓ No empty slugs');

  // Check total count
  const all = await supabaseGet('locations?select=id&limit=1');
  // Use head request to get count
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/locations?select=id`, {
    method: 'HEAD',
    headers: { ...headers, Prefer: 'count=exact' },
  });
  const total = countRes.headers.get('content-range')?.split('/')[1];
  console.log(`  ✓ Total locations: ${total}`);

  // Sample some slugs
  const samples = await supabaseGet('locations?select=id,name,region,slug&limit=10&order=id.asc');
  console.log('  Sample slugs:');
  for (const s of samples) {
    console.log(`    ${s.id}: "${s.name}" → ${s.region}/${s.slug}`);
  }

  return true;
}

// --- Main ---

async function main() {
  console.log('=== Migration 001: Add slugs to locations ===\n');

  await verifySlugColumn();

  const updates = await generateSlugs();
  await applyUpdates(updates);
  const ok = await verify();

  if (ok) {
    console.log('\n=== Migration complete ===');
    console.log('\nNext: Add unique constraint with this SQL:');
    console.log('  ALTER TABLE locations ALTER COLUMN slug SET NOT NULL;');
    console.log('  CREATE UNIQUE INDEX idx_locations_region_slug ON locations (region, slug);');
  } else {
    console.log('\n=== Migration had issues — check above ===');
    process.exit(1);
  }
}

main();
