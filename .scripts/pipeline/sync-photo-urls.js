#!/usr/bin/env node
/**
 * sync-photo-urls.js — Sync photo_url in Supabase from files on disk
 *
 * Scans /images/locations/ for hero.webp files and updates the DB.
 * Designed to run in CI with SUPABASE_SERVICE_KEY.
 *
 * Usage: SUPABASE_SERVICE_KEY=... node .scripts/pipeline/sync-photo-urls.js
 */

const fs = require('fs');
const path = require('path');
const { SB_URL, SB_KEY } = require('../lib/config');

const ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT, 'images', 'locations');
const DRY_RUN = process.env.DRY_RUN === '1';

function slugify(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function sbFetchAll(endpoint, query) {
  const BATCH = 1000;
  let all = [], offset = 0;
  while (true) {
    const url = `${SB_URL}/rest/v1/${endpoint}?${query}&limit=${BATCH}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < BATCH) break;
    offset += BATCH;
  }
  return all;
}

async function sbUpdate(table, id, data) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`DB update ${id}: ${res.status}`);
  const rows = await res.json();
  return rows.length > 0;
}

async function main() {
  console.log(`\nSync Photo URLs${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Fetch all locations without photo_url
  const locations = await sbFetchAll('locations',
    'select=id,name,region,photo_url&photo_url=is.null&owner_photo_url=is.null&order=name'
  );
  console.log(`Found ${locations.length} locations without photo_url\n`);

  // Fetch region slugs
  const regions = await sbFetchAll('regions', 'select=name,slug&is_active=eq.true');
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  let updated = 0, notFound = 0;

  for (const loc of locations) {
    const regionSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
    const locSlug = slugify(loc.name);
    const heroPath = path.join(IMAGES_DIR, regionSlug, locSlug, 'hero.webp');

    if (fs.existsSync(heroPath)) {
      const relativeUrl = `/images/locations/${regionSlug}/${locSlug}/thumb.webp`;
      if (!DRY_RUN) {
        const ok = await sbUpdate('locations', loc.id, {
          photo_url: relativeUrl,
          photo_source: 'scraped',
          photo_fetched_at: new Date().toISOString()
        });
        if (ok) updated++;
      } else {
        updated++;
      }
    } else {
      notFound++;
    }
  }

  console.log(`Updated: ${updated}, No photo on disk: ${notFound}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
