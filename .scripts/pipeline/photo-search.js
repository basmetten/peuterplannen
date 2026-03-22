#!/usr/bin/env node
/**
 * photo-search.js — Google Image Search scraper for PeuterPlannen
 *
 * For locations with bad/missing photos:
 *   1. Search Google Images for "[venue name] [city]"
 *   2. Extract full-res image URLs from page script data
 *   3. Download top candidates
 *   4. Score heuristically (no Gemini, for speed)
 *   5. Save best as hero + thumb in WebP + JPG
 *
 * Usage:
 *   node .scripts/pipeline/photo-search.js
 *   BATCH=1 TOTAL_BATCHES=8 node .scripts/pipeline/photo-search.js
 *   DRY_RUN=1 node .scripts/pipeline/photo-search.js
 *   CONCURRENCY=2 node .scripts/pipeline/photo-search.js
 *   MIN_SCORE=3 node .scripts/pipeline/photo-search.js  (default: targets ≤2)
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { SB_URL, SB_KEY: ANON_KEY } = require('../lib/config');

let SB_KEY = ANON_KEY;
const envPath = path.resolve(__dirname, '..', '..', '.supabase_env');
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
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '1', 10);
const BATCH = parseInt(process.env.BATCH || '0', 10);
const TOTAL_BATCHES = parseInt(process.env.TOTAL_BATCHES || '8', 10);
const MIN_SCORE = parseInt(process.env.MIN_SCORE || '3', 10); // target photos with quality < this
const MAX_CANDIDATES = 8;
const MIN_IMAGE_BYTES = 15000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// === Supabase helpers ===
async function sbFetch(endpoint, query = '') {
  const url = `${SB_URL}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
  return res.json();
}

async function sbFetchAll(endpoint, query = '') {
  const PAGE_SIZE = 1000;
  let all = [];
  let offset = 0;
  while (true) {
    const page = await sbFetch(endpoint, `${query}&offset=${offset}&limit=${PAGE_SIZE}`);
    all = all.concat(page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function sbUpdate(table, id, data) {
  const url = `${SB_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`DB update ${id}: ${res.status}`);
}

// === Image download ===
async function downloadImage(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*',
        Referer: 'https://www.google.com/'
      },
      redirect: 'follow'
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html') || ct.includes('svg')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return null;
    return buf;
  } catch { return null; }
}

// === Heuristic image scoring ===
async function scoreImage(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return -1;
    if (meta.width < 400 || meta.height < 250) return -1;

    let score = 0;
    const pixels = meta.width * meta.height;
    score += Math.min(30, Math.floor(pixels / 20000));

    const aspect = meta.width / meta.height;
    if (aspect >= 1.2 && aspect <= 2.5) score += 20;
    else if (aspect >= 0.9 && aspect < 1.2) score += 5;
    else if (aspect > 2.5) score += 10;
    else score -= 10;

    if (aspect > 0.85 && aspect < 1.15 && meta.width < 500) return -1;

    score += Math.min(15, Math.floor(buffer.length / 30000));
    if (meta.width < 600) score -= 10;
    if (meta.hasAlpha) score -= 15;

    return score;
  } catch { return -1; }
}

// === Process image → thumb + hero ===
async function processImage(buffer, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  let meta;
  try { meta = await sharp(buffer).metadata(); } catch { return null; }
  if (!meta.width || meta.width < 300) return null;

  const variants = [
    { name: 'hero', width: 800 },
    { name: 'thumb', width: 400 },
  ];

  let heroPath = null;
  for (const v of variants) {
    for (const fmt of ['webp', 'jpg']) {
      const outPath = path.join(outputDir, `${v.name}.${fmt}`);
      try {
        const pipeline = sharp(buffer).resize({ width: v.width, withoutEnlargement: true });
        if (fmt === 'webp') await pipeline.webp({ quality: 82 }).toFile(outPath);
        else await pipeline.jpeg({ quality: 80, progressive: true }).toFile(outPath);
        if (v.name === 'hero' && fmt === 'webp') heroPath = outPath;
      } catch { /* skip */ }
    }
  }
  return heroPath;
}

// === Extract image URLs from Google Images page ===
async function extractGoogleImageUrls(page) {
  return page.evaluate(() => {
    const urls = [];
    const seen = new Set();
    const skipDomains = /google\.com|gstatic\.com|googleusercontent|schema\.org|googleapis\.com|youtube\.com|ytimg/i;
    const imageExt = /\.(jpg|jpeg|png|webp)/i;

    for (const script of document.querySelectorAll('script')) {
      const text = script.textContent;
      if (text.length < 1000) continue;

      // Match URLs in JSON string arrays
      const matches = text.matchAll(/\["(https?:\/\/[^"]{20,})"/g);
      for (const m of matches) {
        const url = m[1];
        if (seen.has(url)) continue;
        if (skipDomains.test(url)) continue;
        if (!imageExt.test(url)) continue;
        seen.add(url);
        urls.push(url);
      }
    }

    return urls.slice(0, 20);
  });
}

// === Accept Google consent ===
async function acceptConsent(page) {
  try {
    await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await sleep(1500);

    // Try Dutch then English consent buttons
    for (const text of ['Alles accepteren', 'Accept all', 'Alle akzeptieren']) {
      const btn = await page.$(`button:has-text("${text}")`);
      if (btn) {
        await btn.click();
        await sleep(2000);
        return true;
      }
    }
    // Also try the form-based consent
    const form = await page.$('form[action*="consent"]');
    if (form) {
      const submitBtn = await form.$('button');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(2000);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// === Type to Dutch label for search ===
function typeToLabel(type) {
  const map = {
    play: 'speeltuin', farm: 'kinderboerderij', nature: 'natuur',
    museum: 'museum', swim: 'zwembad', pancake: 'pannenkoekenrestaurant',
    horeca: 'restaurant', culture: 'theater',
  };
  return map[type] || '';
}

// === Get city name from region ===
function regionToCity(region) {
  const map = {
    'amsterdam': 'Amsterdam', 'rotterdam': 'Rotterdam', 'den-haag': 'Den Haag',
    'utrecht': 'Utrecht', 'eindhoven': 'Eindhoven', 'groningen': 'Groningen',
    'haarlem': 'Haarlem', 'leiden': 'Leiden', 'arnhem': 'Arnhem',
    'nijmegen': 'Nijmegen', 'breda': 'Breda', 'tilburg': 'Tilburg',
    'maastricht': 'Maastricht', 'almere': 'Almere', 'amersfoort': 'Amersfoort',
    'apeldoorn': 'Apeldoorn', 'dordrecht': 'Dordrecht', 'enschede': 'Enschede',
    'zwolle': 'Zwolle', 's-hertogenbosch': "'s-Hertogenbosch",
    'gooi-en-vechtstreek': 'Gooi', 'utrechtse-heuvelrug': 'Utrecht',
  };
  return map[region] || region;
}

// === Process one location ===
async function processLocation(loc, context, stats) {
  const regionSlug = slugify(loc.region);
  const locSlug = slugify(loc.name);
  const outputDir = path.join(IMAGES_DIR, regionSlug, locSlug);
  const city = regionToCity(regionSlug);

  const page = await context.newPage();

  try {
    // Search Google Images — include type for more relevant results
    const typeLabel = typeToLabel(loc.type);
    const searchTerms = typeLabel ? `${typeLabel} ${loc.name} ${city}` : `${loc.name} ${city}`;
    const query = encodeURIComponent(searchTerms);
    await page.goto(`https://www.google.com/search?q=${query}&tbm=isch`, {
      waitUntil: 'domcontentloaded', timeout: 15000
    });
    await sleep(2000);

    // Check for CAPTCHA/sorry page
    if (page.url().includes('/sorry/') || page.url().includes('consent')) {
      console.log(`  BLOCKED ${loc.name}: Google bot detection`);
      stats.blocked++;
      return;
    }

    // Extract image URLs
    const imageUrls = await extractGoogleImageUrls(page);

    if (imageUrls.length === 0) {
      console.log(`  -- ${loc.name}: no Google Image results`);
      stats.noResults++;
      return;
    }

    // Download and score candidates
    const scored = [];
    for (const url of imageUrls.slice(0, MAX_CANDIDATES)) {
      const buf = await downloadImage(url);
      if (!buf) continue;

      const score = await scoreImage(buf);
      if (score >= 0) {
        scored.push({ buf, score, url: url.slice(0, 80) });
      }
    }

    if (scored.length === 0) {
      console.log(`  -- ${loc.name}: no downloadable images`);
      stats.downloadFail++;
      return;
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (DRY_RUN) {
      console.log(`  [DRY] ${loc.name}: score=${best.score} (${best.buf.length}b) ${best.url}`);
      stats.dryRun++;
      return;
    }

    const heroPath = await processImage(best.buf, outputDir);
    if (!heroPath) {
      for (let i = 1; i < scored.length; i++) {
        const alt = await processImage(scored[i].buf, outputDir);
        if (alt) break;
      }
      if (!fs.existsSync(path.join(outputDir, 'hero.webp'))) {
        console.log(`  -- ${loc.name}: processing failed`);
        stats.processFail++;
        return;
      }
    }

    const photoUrl = `/images/locations/${regionSlug}/${locSlug}/hero.webp`;

    await sbUpdate('locations', loc.id, {
      photo_url: photoUrl,
      photo_source: 'scraped',
      photo_fetched_at: new Date().toISOString(),
      photo_quality: null // reset quality for re-evaluation
    });

    console.log(`  OK ${loc.name}: score=${best.score} (${best.buf.length}b)`);
    stats.success++;

  } catch (err) {
    console.log(`  ERR ${loc.name}: ${err.message?.slice(0, 100)}`);
    stats.errors++;
  } finally {
    await page.close();
  }
}

// === Main ===
async function main() {
  console.log('=== PeuterPlannen Photo Search (Google Images) ===\n');

  // Fetch locations needing better photos
  const allLocs = await sbFetchAll('locations',
    `select=id,name,region,type,photo_url,photo_quality&order=id.asc`
  );

  // Target: no photo OR photo_quality < MIN_SCORE
  const targets = allLocs.filter(loc => {
    if (!loc.photo_url) return true;
    if (loc.photo_quality !== null && loc.photo_quality < MIN_SCORE) return true;
    return false;
  });

  console.log(`Total locations: ${allLocs.length}`);
  console.log(`Targets (no photo or quality < ${MIN_SCORE}): ${targets.length}`);

  // Apply batch splitting
  let batch = targets;
  let batchLabel = 'all';
  if (BATCH >= 1 && BATCH <= TOTAL_BATCHES) {
    const batchSize = Math.ceil(targets.length / TOTAL_BATCHES);
    const start = (BATCH - 1) * batchSize;
    const end = Math.min(start + batchSize, targets.length);
    batch = targets.slice(start, end);
    batchLabel = `${BATCH}/${TOTAL_BATCHES}`;
    console.log(`Batch ${batchLabel}: items ${start + 1}-${end} (${batch.length})`);
  }

  console.log(`Processing ${batch.length} locations (concurrency=${CONCURRENCY})`);
  if (DRY_RUN) console.log('DRY RUN mode');
  console.log('');

  const stats = { success: 0, noResults: 0, downloadFail: 0, processFail: 0, blocked: 0, errors: 0, dryRun: 0 };

  // Launch browser with anti-detection
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam'
  });

  // Override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL', 'nl', 'en-US', 'en'] });
  });

  // Accept Google consent first
  const consentPage = await context.newPage();
  console.log('Accepting Google consent...');
  await acceptConsent(consentPage);
  await consentPage.close();
  console.log('Consent handled.\n');

  // Process locations sequentially (Google rate limits aggressively)
  // Use concurrency=1 per browser to avoid blocks
  for (let i = 0; i < batch.length; i++) {
    const loc = batch[i];
    const progress = `[${i + 1}/${batch.length}]`;
    process.stdout.write(`${progress} `);

    await processLocation(loc, context, stats);

    // Rate limit: 3-5 seconds between searches to avoid CAPTCHA
    if (i + 1 < batch.length) {
      const delay = 3000 + Math.random() * 2000;
      await sleep(delay);
    }

    // If getting blocked, slow down more
    if (stats.blocked > 3) {
      console.log('\nToo many blocks, increasing delay...');
      await sleep(30000);
      stats.blocked = 0; // reset counter
    }
  }

  await browser.close();

  console.log('\n=== Results ===');
  console.log(`  OK:      ${stats.success} new photos`);
  console.log(`  EMPTY:   ${stats.noResults} no results`);
  console.log(`  DLFAIL:  ${stats.downloadFail} download failures`);
  console.log(`  PROC:    ${stats.processFail} processing failures`);
  console.log(`  BLOCKED: ${stats.blocked} blocked by Google`);
  console.log(`  ERR:     ${stats.errors} errors`);
  if (DRY_RUN) console.log(`  DRY:     ${stats.dryRun}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
