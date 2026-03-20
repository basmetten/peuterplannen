#!/usr/bin/env node
/**
 * scrape-website-photos.js — Browser-based photo scraping with AI evaluation
 *
 * For each location without a photo that has a website URL:
 *   1. Navigate Playwright to the website
 *   2. Extract all candidate images (large, non-logo, non-icon)
 *   3. Download top candidates
 *   4. Gemini Flash evaluates which is the best "sfeer foto" (atmosphere photo)
 *   5. Winner is resized with Sharp → thumb (400w) + hero (800w) in WebP + JPEG
 *   6. Update Supabase with photo_url
 *
 * Usage:
 *   node .scripts/pipeline/scrape-website-photos.js
 *   BATCH_LIMIT=50 node .scripts/pipeline/scrape-website-photos.js
 *   OFFSET=100 BATCH_LIMIT=50 node .scripts/pipeline/scrape-website-photos.js
 *   DRY_RUN=1 node .scripts/pipeline/scrape-website-photos.js
 *   CONCURRENCY=3 node .scripts/pipeline/scrape-website-photos.js
 *
 * Environment:
 *   GEMINI_API_KEY — Required for image quality evaluation
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { SB_URL, SB_KEY: ANON_KEY } = require('../lib/config');

// Prefer service key for write access
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
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '500', 10);
const OFFSET = parseInt(process.env.OFFSET || '0', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'; // latest Gemini Flash — pro-level vision at flash speed
const PAGE_TIMEOUT = 15000;

// Rate limiting for Gemini API (Tier 1 conservative: 10 RPM, 500 RPD)
const GEMINI_MIN_INTERVAL_MS = 7000; // 7s between calls = ~8.5 RPM (safe under 10 RPM)
const GEMINI_MAX_RPD = parseInt(process.env.GEMINI_MAX_RPD || '450', 10); // conservative daily cap
let geminiLastCall = 0;
let geminiCallCount = 0;
const MAX_CANDIDATES = 5;
const MIN_IMAGE_BYTES = 8000; // 8KB minimum

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
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', Accept: 'image/*' },
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

// === Gemini Flash image evaluation ===
async function evaluateImages(candidates, locationName, locationType) {
  if (!GEMINI_API_KEY || candidates.length === 0) return 0;
  if (candidates.length === 1) return 0; // only one candidate, use it

  // Rate limiting: check daily cap
  if (geminiCallCount >= GEMINI_MAX_RPD) {
    console.log(`  ⏸ Gemini daily limit reached (${GEMINI_MAX_RPD}), using first candidate`);
    return 0;
  }

  // Rate limiting: enforce minimum interval between calls
  const now = Date.now();
  const elapsed = now - geminiLastCall;
  if (elapsed < GEMINI_MIN_INTERVAL_MS) {
    await sleep(GEMINI_MIN_INTERVAL_MS - elapsed);
  }
  geminiLastCall = Date.now();
  geminiCallCount++;

  // Send all candidates to Gemini for evaluation
  const parts = [
    {
      text: `Je bent een foto-expert voor PeuterPlannen, een website voor ouders met jonge kinderen.

Hieronder zie je ${candidates.length} foto's die gevonden zijn op de website van "${locationName}" (type: ${locationType}).

Kies de BESTE sfeerfoto — een foto die:
- De locatie toont (gebouw, tuin, speeltuin, interieur, dieren, etc.)
- Aantrekkelijk is voor ouders met jonge kinderen
- Sfeer uitstraalt (gezellig, uitnodigend, kleurrijk)
- GEEN logo, stockfoto, menu, kaart, of generiek patroon is
- GEEN close-up van alleen tekst of een interface is

Antwoord ALLEEN met het nummer (1-${candidates.length}) van de beste foto.
Als GEEN van de foto's geschikt is, antwoord dan "0".`
    }
  ];

  for (let i = 0; i < candidates.length; i++) {
    const base64 = candidates[i].toString('base64');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64 }
    });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '0';
    const num = parseInt(text.match(/\d+/)?.[0] || '0', 10);
    if (num >= 1 && num <= candidates.length) return num - 1;
    return 0; // default to first
  } catch {
    return 0;
  }
}

// === Process image → thumb + hero ===
async function processImage(buffer, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Validate image
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch { return null; }

  if (!meta.width || meta.width < 200) return null;

  // Check if it looks like a logo (very square + low color variance)
  if (meta.width && meta.height) {
    const ratio = meta.width / meta.height;
    if (ratio > 0.85 && ratio < 1.15 && meta.width < 500) {
      // Suspiciously square and small — likely a logo
      return null;
    }
  }

  const variants = [
    { name: 'hero', width: 800 },
    { name: 'thumb', width: 400 },
  ];

  let heroPath = null;
  for (const v of variants) {
    for (const fmt of ['webp', 'jpeg']) {
      const filename = `${v.name}.${fmt}`;
      const outPath = path.join(outputDir, filename);
      try {
        const pipeline = sharp(buffer).resize({ width: v.width, withoutEnlargement: true });
        if (fmt === 'webp') await pipeline.webp({ quality: 82 }).toFile(outPath);
        else await pipeline.jpeg({ quality: 80, progressive: true }).toFile(outPath);
        if (v.name === 'hero' && fmt === 'webp') heroPath = outPath;
      } catch { /* skip variant */ }
    }
  }

  return heroPath;
}

// === Extract candidate image URLs from page ===
async function extractCandidateImages(page) {
  return page.evaluate(() => {
    const candidates = [];
    const seen = new Set();

    // 1. og:image
    const ogImg = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImg && !seen.has(ogImg)) { candidates.push({ url: ogImg, source: 'og' }); seen.add(ogImg); }

    // 2. twitter:image
    const twImg = document.querySelector('meta[name="twitter:image"]')?.content;
    if (twImg && !seen.has(twImg)) { candidates.push({ url: twImg, source: 'twitter' }); seen.add(twImg); }

    // 3. Hero/header images (large images in header, hero, banner sections)
    const heroSelectors = [
      '.hero img', '.header img', '.banner img', '.cover img',
      '[class*="hero"] img', '[class*="header"] img', '[class*="banner"] img',
      '[class*="slide"] img', '[class*="gallery"] img', '[class*="carousel"] img',
      'main img', 'article img', '.content img'
    ];
    for (const sel of heroSelectors) {
      for (const img of document.querySelectorAll(sel)) {
        const src = img.src || img.dataset?.src || img.dataset?.lazySrc;
        if (!src || seen.has(src)) continue;
        if (/\.(svg|ico|gif)$/i.test(src)) continue;
        if (/logo|icon|favicon|pixel|tracking|spinner|loader/i.test(src)) continue;
        const rect = img.getBoundingClientRect();
        if (rect.width >= 200 && rect.height >= 100) {
          candidates.push({ url: src, source: 'hero', w: Math.round(rect.width), h: Math.round(rect.height) });
          seen.add(src);
        }
      }
    }

    // 4. All visible images sorted by size
    for (const img of document.querySelectorAll('img')) {
      const src = img.src || img.dataset?.src || img.dataset?.lazySrc;
      if (!src || seen.has(src)) continue;
      if (/\.(svg|ico|gif)$/i.test(src)) continue;
      if (/logo|icon|favicon|pixel|tracking|spinner|loader|avatar|profile/i.test(src)) continue;
      const rect = img.getBoundingClientRect();
      if (rect.width >= 250 && rect.height >= 150) {
        candidates.push({ url: src, source: 'img', w: Math.round(rect.width), h: Math.round(rect.height) });
        seen.add(src);
      }
    }

    // 5. CSS background images on large elements
    for (const el of document.querySelectorAll('[style*="background"], .hero, .banner, .header, [class*="hero"], [class*="banner"]')) {
      const style = getComputedStyle(el);
      const bg = style.backgroundImage;
      if (!bg || bg === 'none') continue;
      const urlMatch = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (!urlMatch) continue;
      const url = urlMatch[1];
      if (seen.has(url) || /\.(svg|ico|gif)$/i.test(url)) continue;
      if (/logo|icon|favicon|gradient|pattern/i.test(url)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width >= 250 && rect.height >= 150) {
        candidates.push({ url, source: 'bg', w: Math.round(rect.width), h: Math.round(rect.height) });
        seen.add(url);
      }
    }

    // Sort: og/twitter first, then by size (largest first)
    candidates.sort((a, b) => {
      const sourceOrder = { og: 0, twitter: 1, hero: 2, bg: 3, img: 4 };
      const oa = sourceOrder[a.source] ?? 5;
      const ob = sourceOrder[b.source] ?? 5;
      if (oa !== ob) return oa - ob;
      return ((b.w || 0) * (b.h || 0)) - ((a.w || 0) * (a.h || 0));
    });

    return candidates.slice(0, 8); // max 8 candidates
  });
}

// === Process one location ===
async function processLocation(loc, browser, stats) {
  const regionSlug = slugify(loc.region);
  const locSlug = slugify(loc.name);
  const outputDir = path.join(IMAGES_DIR, regionSlug, locSlug);

  // Skip if already has images on disk
  if (fs.existsSync(path.join(outputDir, 'hero.webp'))) {
    stats.skipped++;
    return;
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Block unnecessary resources for speed
    await page.route('**/*.{mp4,webm,mp3,wav,woff2,woff,ttf}', route => route.abort());
    await page.route('**/analytics*', route => route.abort());
    await page.route('**/tracking*', route => route.abort());

    await page.goto(loc.website, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
    // Extra wait for lazy images
    await sleep(2000);
    // Scroll down to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(1000);

    // Extract candidate image URLs
    const candidates = await extractCandidateImages(page);

    if (candidates.length === 0) {
      console.log(`  ⚠ ${loc.name}: no candidate images found`);
      stats.noImages++;
      return;
    }

    // Download top candidates
    const downloaded = [];
    for (const c of candidates.slice(0, MAX_CANDIDATES)) {
      let url = c.url;
      // Resolve relative URLs
      if (url.startsWith('/')) {
        try { url = new URL(url, loc.website).href; } catch { continue; }
      }
      if (!url.startsWith('http')) continue;

      const buf = await downloadImage(url);
      if (buf) downloaded.push(buf);
    }

    if (downloaded.length === 0) {
      console.log(`  ⚠ ${loc.name}: could not download any candidates`);
      stats.downloadFail++;
      return;
    }

    // Use Gemini to pick the best sfeer foto
    let bestIdx = 0;
    if (GEMINI_API_KEY && downloaded.length > 1) {
      bestIdx = await evaluateImages(downloaded, loc.name, loc.type);
      console.log(`  🤖 ${loc.name}: Gemini picked image ${bestIdx + 1}/${downloaded.length}`);
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${loc.name}: would save image ${bestIdx + 1}/${downloaded.length} (${downloaded[bestIdx].length} bytes)`);
      stats.dryRun++;
      return;
    }

    // Process and save the winner
    const heroPath = await processImage(downloaded[bestIdx], outputDir);
    if (!heroPath) {
      // Try next best
      for (let i = 0; i < downloaded.length; i++) {
        if (i === bestIdx) continue;
        const alt = await processImage(downloaded[i], outputDir);
        if (alt) { break; }
      }
      if (!fs.existsSync(path.join(outputDir, 'hero.webp'))) {
        console.log(`  ⚠ ${loc.name}: all candidates failed image processing`);
        stats.processFail++;
        return;
      }
    }

    // Build relative photo URL
    const photoUrl = `/images/locations/${regionSlug}/${locSlug}/hero.webp`;

    // Update Supabase
    await sbUpdate('locations', loc.id, {
      photo_url: photoUrl,
      photo_source: 'scraped',
      photo_fetched_at: new Date().toISOString()
    });

    console.log(`  ✅ ${loc.name}: saved (${downloaded[bestIdx].length} bytes)`);
    stats.success++;

  } catch (err) {
    console.log(`  ❌ ${loc.name}: ${err.message?.slice(0, 80)}`);
    stats.errors++;
  } finally {
    await context.close();
  }
}

// === Main ===
async function main() {
  console.log('🔍 Fetching locations without photos...\n');

  const locations = await sbFetch('locations',
    `select=id,name,website,type,region&photo_url=is.null&owner_photo_url=is.null&website=not.is.null&order=id.asc&offset=${OFFSET}&limit=${BATCH_LIMIT}`
  );

  console.log(`📋 ${locations.length} locations to process (offset=${OFFSET}, limit=${BATCH_LIMIT}, concurrency=${CONCURRENCY})`);
  if (GEMINI_API_KEY) {
    console.log(`🤖 Gemini ${GEMINI_MODEL} enabled for image evaluation`);
    console.log(`⏱ Rate limit: ${GEMINI_MIN_INTERVAL_MS}ms between calls, max ${GEMINI_MAX_RPD}/day`);
  } else {
    console.log('⚠ No GEMINI_API_KEY — using first candidate without AI evaluation');
  }
  if (DRY_RUN) console.log('🏃 DRY RUN — no files will be saved');
  console.log('');

  const stats = { success: 0, skipped: 0, noImages: 0, downloadFail: 0, processFail: 0, errors: 0, dryRun: 0 };

  const browser = await chromium.launch({ headless: true });

  // Process in batches with concurrency
  for (let i = 0; i < locations.length; i += CONCURRENCY) {
    const batch = locations.slice(i, i + CONCURRENCY);
    const progress = `[${i + 1}-${Math.min(i + CONCURRENCY, locations.length)}/${locations.length}]`;
    console.log(`${progress} Processing batch...`);

    await Promise.all(
      batch.map(loc => processLocation(loc, browser, stats))
    );

    // Rate limit between batches
    if (i + CONCURRENCY < locations.length) await sleep(500);
  }

  await browser.close();

  console.log('\n📊 Results:');
  console.log(`  ✅ Success: ${stats.success}`);
  console.log(`  ⏭ Skipped (already had): ${stats.skipped}`);
  console.log(`  ⚠ No images found: ${stats.noImages}`);
  console.log(`  ⬇ Download failed: ${stats.downloadFail}`);
  console.log(`  🔧 Process failed: ${stats.processFail}`);
  console.log(`  ❌ Errors: ${stats.errors}`);
  if (DRY_RUN) console.log(`  🏃 Dry run: ${stats.dryRun}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
