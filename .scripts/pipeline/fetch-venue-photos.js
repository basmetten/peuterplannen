#!/usr/bin/env node
/**
 * fetch-venue-photos.js — Scrape venue website og:image photos (Fase 0)
 *
 * For each location with a website URL:
 *   1. Fetch the HTML, extract og:image (server-side rendered, works for social crawlers)
 *   2. Fallback: find first large <img> in the page
 *   3. Download image, resize with sharp → thumb (400w) + hero (800w) in WebP + JPEG
 *   4. Save to /images/locations/{regionSlug}/{locSlug}/
 *   5. Update Supabase: photo_url, photo_source, photo_fetched_at
 *
 * Usage:
 *   node .scripts/pipeline/fetch-venue-photos.js
 *   DRY_RUN=1 node .scripts/pipeline/fetch-venue-photos.js
 *   BATCH_LIMIT=50 node .scripts/pipeline/fetch-venue-photos.js
 *   OFFSET=200 BATCH_LIMIT=100 node .scripts/pipeline/fetch-venue-photos.js
 *   CONCURRENCY=10 node .scripts/pipeline/fetch-venue-photos.js
 */

const fs = require('fs');
const path = require('path');
const { SB_URL, SB_KEY: ANON_KEY } = require('../lib/config');

// Prefer service key from .supabase_env for write access (RLS bypass)
let SB_KEY = ANON_KEY;
const envPath = require('path').resolve(__dirname, '..', '..', '.supabase_env');
if (fs.existsSync(envPath)) {
  const match = fs.readFileSync(envPath, 'utf8').match(/SUPABASE_SERVICE_KEY=(.+)/);
  if (match) SB_KEY = match[1].trim();
}
if (process.env.SUPABASE_SERVICE_KEY) SB_KEY = process.env.SUPABASE_SERVICE_KEY;

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('sharp is required. Run: npm install sharp');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT, 'images', 'locations');
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '2000', 10);
const OFFSET = parseInt(process.env.OFFSET || '0', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '5', 10);
const FETCH_TIMEOUT = 10000; // 10s per request
const MIN_IMAGE_SIZE = 5000; // 5KB minimum — skip tiny images/icons

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function sbFetch(endpoint, query = '') {
  const url = `${SB_URL}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
  return res.json();
}

async function sbUpdate(table, id, data) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`DB update ${id}: ${res.status}`);
}

/**
 * Fetch HTML from a URL with timeout and redirect following
 */
async function fetchHTML(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannen/1.0; +https://peuterplannen.nl)',
        Accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('xhtml')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract best image URL from HTML
 * Priority: og:image > twitter:image > first large img
 */
function extractImageUrl(html, baseUrl) {
  // og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return resolveUrl(ogMatch[1], baseUrl);

  // twitter:image
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twMatch?.[1]) return resolveUrl(twMatch[1], baseUrl);

  // First img with src that looks like a real photo (not icon/logo/svg)
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (/\.(svg|ico|gif)$/i.test(src)) continue;
    if (/logo|icon|favicon|banner-ad|pixel|tracking/i.test(src)) continue;
    // Check for width/height hints in the tag
    const tag = match[0];
    const w = tag.match(/width=["']?(\d+)/i);
    if (w && parseInt(w[1]) < 200) continue;
    return resolveUrl(src, baseUrl);
  }

  return null;
}

function resolveUrl(url, base) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

/**
 * Download image buffer from URL
 */
async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannen/1.0; +https://peuterplannen.nl)',
        Accept: 'image/*'
      },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') || ct.includes('svg')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_IMAGE_SIZE) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Process image: resize to thumb + hero, save WebP + JPEG
 */
async function processImage(buffer, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Validate image with sharp
  const meta = await sharp(buffer).metadata();
  if (!meta.width || meta.width < 200) return false;

  // Thumb 400w — for cards
  await sharp(buffer).resize(400, null, { withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(path.join(outputDir, 'thumb.webp'));
  await sharp(buffer).resize(400, null, { withoutEnlargement: true })
    .jpeg({ quality: 75 }).toFile(path.join(outputDir, 'thumb.jpg'));

  // Hero 800w — for detail pages
  await sharp(buffer).resize(800, null, { withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(path.join(outputDir, 'hero.webp'));
  await sharp(buffer).resize(800, null, { withoutEnlargement: true })
    .jpeg({ quality: 75 }).toFile(path.join(outputDir, 'hero.jpg'));

  return true;
}

/**
 * Process a single location
 */
async function processLocation(loc, regionSlugMap) {
  const regionSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
  const locSlug = slugify(loc.name);
  const outputDir = path.join(IMAGES_DIR, regionSlug, locSlug);

  // Skip if already has photos on disk
  if (fs.existsSync(path.join(outputDir, 'thumb.webp'))) {
    return { status: 'skip-exists', name: loc.name };
  }

  if (DRY_RUN) {
    return { status: 'dry-run', name: loc.name, website: loc.website };
  }

  // Normalize website URL
  let website = loc.website.trim();
  if (!website.startsWith('http')) website = 'https://' + website;

  // Fetch HTML
  const html = await fetchHTML(website);
  if (!html) {
    return { status: 'no-html', name: loc.name };
  }

  // Extract image URL
  const imgUrl = extractImageUrl(html, website);
  if (!imgUrl) {
    return { status: 'no-image', name: loc.name };
  }

  // Download image
  const buffer = await downloadImage(imgUrl);
  if (!buffer) {
    return { status: 'download-fail', name: loc.name, imgUrl };
  }

  // Process and save
  try {
    const ok = await processImage(buffer, outputDir);
    if (!ok) return { status: 'too-small', name: loc.name };
  } catch (err) {
    return { status: 'process-fail', name: loc.name, error: err.message };
  }

  // Update Supabase
  const relativeUrl = `/images/locations/${regionSlug}/${locSlug}/thumb.webp`;
  await sbUpdate('locations', loc.id, {
    photo_url: relativeUrl,
    photo_source: 'scraped',
    photo_fetched_at: new Date().toISOString()
  });

  return { status: 'ok', name: loc.name };
}

/**
 * Run tasks with limited concurrency
 */
async function runConcurrent(items, fn, concurrency) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log(`\nVenue Photo Scraper${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`Batch: ${BATCH_LIMIT}, Offset: ${OFFSET}, Concurrency: ${CONCURRENCY}\n`);

  // Fetch locations needing photos (have website, no photo yet)
  const locations = await sbFetch('locations',
    `select=id,name,type,region,website&website=not.is.null&website=neq.&photo_url=is.null&owner_photo_url=is.null&order=name&limit=${BATCH_LIMIT}&offset=${OFFSET}`
  );
  console.log(`Found ${locations.length} locations to process\n`);
  if (locations.length === 0) return;

  // Fetch region slug map
  const regions = await sbFetch('regions', 'select=name,slug&is_active=eq.true');
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  // Process with concurrency
  const stats = { ok: 0, 'skip-exists': 0, 'no-html': 0, 'no-image': 0, 'download-fail': 0, 'process-fail': 0, 'too-small': 0, 'dry-run': 0 };
  let done = 0;

  const results = await runConcurrent(locations, async (loc) => {
    const result = await processLocation(loc, regionSlugMap);
    done++;
    stats[result.status] = (stats[result.status] || 0) + 1;

    const icon = result.status === 'ok' ? '+' : result.status === 'skip-exists' ? '~' : '-';
    if (done % 25 === 0 || result.status === 'ok') {
      process.stdout.write(`\r  [${done}/${locations.length}] ${icon} ${result.name.slice(0, 40).padEnd(40)}`);
    }
    return result;
  }, CONCURRENCY);

  console.log('\n\nResults:');
  for (const [status, count] of Object.entries(stats)) {
    if (count > 0) console.log(`  ${status}: ${count}`);
  }
  console.log(`\nTotal: ${locations.length}`);

  // Log failures for debugging
  const failures = results.filter(r => !['ok', 'skip-exists', 'dry-run'].includes(r.status));
  if (failures.length > 0) {
    const logPath = path.join(ROOT, 'photo-scrape-log.json');
    fs.writeFileSync(logPath, JSON.stringify(failures, null, 2));
    console.log(`\nFailure details saved to ${logPath}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
