#!/usr/bin/env node
/**
 * fetch-photos.js — Location Imagery Pipeline (Fase 14.2)
 *
 * Fetches photos for locations via Google Places Photo API.
 * Fallback hierarchy:
 *   1. owner_photo_url (skip — already set by partner)
 *   2. Google Places Photo (via place_id)
 *   3. Type-specific placeholder (always available)
 *
 * Usage: node .scripts/pipeline/fetch-photos.js
 *
 * Environment variables:
 *   GOOGLE_MAPS_API_KEY  — Required for Places Photo API
 *   SUPABASE_URL         — Supabase project URL (optional, has default)
 *   SUPABASE_SERVICE_KEY — Supabase service role key (optional, has default)
 *   DRY_RUN=1            — Preview without downloading or updating DB
 *   BATCH_LIMIT=N        — Max locations per run (default: 500)
 */

const fs = require('fs');
const path = require('path');
const { SB_URL, SB_KEY } = require('../lib/config');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp is required for image processing. Run: npm install');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT, 'images', 'locations');
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '500', 10);
const RATE_LIMIT_MS = 100; // 10 requests/second

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sbFetch(endpoint, query = '') {
  const url = `${SB_URL}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function sbUpdate(table, id, data) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase update ${table}/${id}: ${res.status}`);
}

async function fetchPlacePhoto(placeId) {
  // Step 1: Get photo reference from Place Details
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) return null;
  const details = await detailsRes.json();

  const photos = details.result?.photos;
  if (!photos || photos.length === 0) return null;

  const photoRef = photos[0].photo_reference;

  // Step 2: Download photo at 800px width
  const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
  const photoRes = await fetch(photoUrl);
  if (!photoRes.ok) return null;

  return Buffer.from(await photoRes.arrayBuffer());
}

async function processImage(buffer, outputDir, slug) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Thumbnail (400w) — for city page cards
  const thumbWebp = path.join(outputDir, 'thumb.webp');
  const thumbJpg = path.join(outputDir, 'thumb.jpg');
  await sharp(buffer).resize(400).webp({ quality: 80 }).toFile(thumbWebp);
  await sharp(buffer).resize(400).jpeg({ quality: 75 }).toFile(thumbJpg);

  // Hero (800w) — for location detail pages
  const heroWebp = path.join(outputDir, 'hero.webp');
  const heroJpg = path.join(outputDir, 'hero.jpg');
  await sharp(buffer).resize(800).webp({ quality: 80 }).toFile(heroWebp);
  await sharp(buffer).resize(800).jpeg({ quality: 75 }).toFile(heroJpg);

  // Strip EXIF from all outputs (sharp does this by default)
  return { thumbWebp, thumbJpg, heroWebp, heroJpg };
}

function slugify(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY environment variable is required.');
    console.log('Set it in your environment or .env file.');
    process.exit(1);
  }

  console.log(`\nFetch Photos Pipeline${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`Batch limit: ${BATCH_LIMIT}\n`);

  // Fetch locations that need photos
  const locations = await sbFetch('locations',
    'select=id,name,type,region,place_id,owner_photo_url,photo_url&photo_url=is.null&place_id=neq.null&owner_photo_url=is.null&order=name&limit=' + BATCH_LIMIT
  );

  console.log(`Found ${locations.length} locations needing photos\n`);

  if (locations.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // We need region slugs — fetch regions
  const regions = await sbFetch('regions', 'select=name,slug&is_active=eq.true');
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  let processed = 0, failed = 0, skipped = 0;

  for (const loc of locations) {
    const regionSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
    const locSlug = slugify(loc.name);
    const outputDir = path.join(IMAGES_DIR, regionSlug, locSlug);

    process.stdout.write(`  ${loc.name} (${regionSlug})... `);

    if (DRY_RUN) {
      console.log('would fetch');
      skipped++;
      continue;
    }

    try {
      const buffer = await fetchPlacePhoto(loc.place_id);
      if (!buffer) {
        console.log('no photo available');
        skipped++;
        continue;
      }

      await processImage(buffer, outputDir);

      // Update DB
      const relativeUrl = `/images/locations/${regionSlug}/${locSlug}/thumb.webp`;
      await sbUpdate('locations', loc.id, {
        photo_url: relativeUrl,
        photo_source: 'google',
        photo_fetched_at: new Date().toISOString()
      });

      console.log('OK');
      processed++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nDone: ${processed} processed, ${skipped} skipped, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
