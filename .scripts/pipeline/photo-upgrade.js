#!/usr/bin/env node
/**
 * photo-upgrade.js — Enhanced photo scraper for PeuterPlannen
 *
 * Improvements over scrape-website-photos.js:
 *   - Also re-scrapes locations with existing LOW quality photos (no photo_quality or ≤3)
 *   - Crawls subpages (/fotos, /gallerij, /gallery, /over-ons, /about) for more candidates
 *   - Heuristic-only selection (no Gemini) for parallel speed
 *   - BATCH/TOTAL_BATCHES env vars for easy parallel splitting
 *   - Progress logging to JSON file
 *
 * Usage:
 *   node .scripts/pipeline/photo-upgrade.js
 *   BATCH=1 TOTAL_BATCHES=6 node .scripts/pipeline/photo-upgrade.js
 *   DRY_RUN=1 node .scripts/pipeline/photo-upgrade.js
 *   CONCURRENCY=3 node .scripts/pipeline/photo-upgrade.js
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
const PROGRESS_DIR = path.join(ROOT, '.scripts', 'pipeline', 'progress');
const DRY_RUN = process.env.DRY_RUN === '1';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '2', 10);
const BATCH = parseInt(process.env.BATCH || '0', 10); // 0 = all, 1-6 = specific batch
const TOTAL_BATCHES = parseInt(process.env.TOTAL_BATCHES || '6', 10);
const PAGE_TIMEOUT = 15000;
const MIN_IMAGE_BYTES = 8000;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 250;
const PREFERRED_ASPECT_MIN = 1.2; // prefer landscape

// Subpages to try for additional image candidates
const SUBPAGE_PATHS = ['/fotos', '/foto', '/gallerij', '/gallery', '/galerij', '/photos', '/over-ons', '/about', '/about-us'];

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

// Paginated fetch — Supabase caps at 1000 per request
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

// === Heuristic image scoring (no Gemini needed) ===
async function scoreImageHeuristic(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return -1;
    if (meta.width < MIN_WIDTH || meta.height < MIN_HEIGHT) return -1;

    let score = 0;

    // Size bonus (bigger = better, up to 30 points)
    const pixels = meta.width * meta.height;
    score += Math.min(30, Math.floor(pixels / 20000));

    // Aspect ratio — prefer landscape
    const aspect = meta.width / meta.height;
    if (aspect >= PREFERRED_ASPECT_MIN && aspect <= 2.5) {
      score += 20; // nice landscape
    } else if (aspect >= 0.9 && aspect < PREFERRED_ASPECT_MIN) {
      score += 5; // slightly tall or square
    } else if (aspect > 2.5) {
      score += 10; // very wide banner
    } else {
      score -= 10; // portrait — likely not a sfeerbeeld
    }

    // Logo detection: suspiciously square + small
    if (aspect > 0.85 && aspect < 1.15 && meta.width < 500) {
      return -1; // likely a logo
    }

    // File size bonus (larger files = more detail, up to 15 points)
    score += Math.min(15, Math.floor(buffer.length / 30000));

    // Penalize very small images
    if (meta.width < 600) score -= 10;

    // Penalize images with alpha channel (often logos/icons)
    if (meta.hasAlpha) score -= 15;

    return score;
  } catch {
    return -1;
  }
}

// === Process image → thumb + hero ===
async function processImage(buffer, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch { return null; }

  if (!meta.width || meta.width < 200) return null;

  // Logo check
  if (meta.width && meta.height) {
    const ratio = meta.width / meta.height;
    if (ratio > 0.85 && ratio < 1.15 && meta.width < 500) return null;
  }

  const variants = [
    { name: 'hero', width: 800 },
    { name: 'thumb', width: 400 },
  ];

  let heroPath = null;
  for (const v of variants) {
    for (const fmt of ['webp', 'jpg']) {
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

// === Check if existing photo is worth keeping ===
function existingPhotoIsGood(outputDir) {
  const heroPath = path.join(outputDir, 'hero.webp');
  if (!fs.existsSync(heroPath)) return false;

  try {
    const stat = fs.statSync(heroPath);
    // Very small files are likely bad photos
    if (stat.size < 15000) return false; // < 15KB = probably logo or tiny
    return true; // assume OK for now, quality-check will catch bad ones later
  } catch {
    return false;
  }
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

    // 3. Hero/header images
    const heroSelectors = [
      '.hero img', '.header img', '.banner img', '.cover img',
      '[class*="hero"] img', '[class*="header"] img', '[class*="banner"] img',
      '[class*="slide"] img', '[class*="gallery"] img', '[class*="carousel"] img',
      '[class*="foto"] img', '[class*="photo"] img', '[class*="gallerij"] img',
      'main img', 'article img', '.content img'
    ];
    for (const sel of heroSelectors) {
      for (const img of document.querySelectorAll(sel)) {
        const src = img.src || img.dataset?.src || img.dataset?.lazySrc || img.dataset?.original;
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
      const src = img.src || img.dataset?.src || img.dataset?.lazySrc || img.dataset?.original;
      if (!src || seen.has(src)) continue;
      if (/\.(svg|ico|gif)$/i.test(src)) continue;
      if (/logo|icon|favicon|pixel|tracking|spinner|loader|avatar|profile|badge|stamp/i.test(src)) continue;
      const rect = img.getBoundingClientRect();
      if (rect.width >= 250 && rect.height >= 150) {
        candidates.push({ url: src, source: 'img', w: Math.round(rect.width), h: Math.round(rect.height) });
        seen.add(src);
      }
    }

    // 5. CSS background images
    for (const el of document.querySelectorAll('[style*="background"], .hero, .banner, .header, [class*="hero"], [class*="banner"], [class*="foto"], [class*="photo"]')) {
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

    // Sort: og/twitter first, then by area (largest first)
    candidates.sort((a, b) => {
      const sourceOrder = { og: 0, twitter: 1, hero: 2, bg: 3, img: 4 };
      const oa = sourceOrder[a.source] ?? 5;
      const ob = sourceOrder[b.source] ?? 5;
      if (oa !== ob) return oa - ob;
      return ((b.w || 0) * (b.h || 0)) - ((a.w || 0) * (a.h || 0));
    });

    return candidates.slice(0, 10);
  });
}

// === Try to find a subpage with photos ===
async function trySubpages(page, baseUrl) {
  const allCandidates = [];
  const baseOrigin = new URL(baseUrl).origin;

  for (const subpath of SUBPAGE_PATHS) {
    try {
      const subUrl = baseOrigin + subpath;
      const response = await page.goto(subUrl, { timeout: 8000, waitUntil: 'domcontentloaded' });
      if (!response || response.status() >= 400) continue;

      await sleep(1000);
      await page.evaluate(() => window.scrollTo(0, 500));
      await sleep(500);

      const candidates = await extractCandidateImages(page);
      if (candidates.length > 0) {
        allCandidates.push(...candidates.map(c => ({ ...c, fromSubpage: subpath })));
        // Found good candidates on a subpage, don't need to try more
        if (candidates.length >= 3) break;
      }
    } catch {
      // subpage doesn't exist or failed, continue
    }
  }

  return allCandidates;
}

// === Process one location ===
async function processLocation(loc, browser, stats) {
  const regionSlug = slugify(loc.region);
  const locSlug = slugify(loc.name);
  const outputDir = path.join(IMAGES_DIR, regionSlug, locSlug);

  // Check if existing photo is good enough to skip
  if (existingPhotoIsGood(outputDir)) {
    stats.keptExisting++;
    return;
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Block unnecessary resources
    await page.route('**/*.{mp4,webm,mp3,wav,woff2,woff,ttf,eot}', route => route.abort());
    await page.route('**/analytics*', route => route.abort());
    await page.route('**/tracking*', route => route.abort());
    await page.route('**/*google*analytics*', route => route.abort());
    await page.route('**/*facebook*', route => route.abort());

    // Navigate to main page
    await page.goto(loc.website, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.evaluate(() => window.scrollTo(0, 500));
    await sleep(1000);

    // Extract candidates from main page
    let candidates = await extractCandidateImages(page);

    // If not enough candidates, try subpages
    if (candidates.length < 3) {
      const subCandidates = await trySubpages(page, loc.website);
      candidates = [...candidates, ...subCandidates];
    }

    if (candidates.length === 0) {
      console.log(`  -- ${loc.name}: no candidate images`);
      stats.noImages++;
      return;
    }

    // Download and score candidates
    const scored = [];
    for (const c of candidates.slice(0, 8)) {
      let url = c.url;
      if (url.startsWith('/')) {
        try { url = new URL(url, loc.website).href; } catch { continue; }
      }
      if (!url.startsWith('http')) continue;

      const buf = await downloadImage(url);
      if (!buf) continue;

      const score = await scoreImageHeuristic(buf);
      if (score >= 0) {
        scored.push({ buf, score, url, source: c.source });
      }
    }

    if (scored.length === 0) {
      console.log(`  -- ${loc.name}: no usable images after download`);
      stats.downloadFail++;
      return;
    }

    // Pick the best scoring image
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (DRY_RUN) {
      console.log(`  [DRY] ${loc.name}: best=${best.source} score=${best.score} (${best.buf.length} bytes)`);
      stats.dryRun++;
      return;
    }

    // Process and save
    const heroPath = await processImage(best.buf, outputDir);
    if (!heroPath) {
      // Try next best
      for (let i = 1; i < scored.length; i++) {
        const alt = await processImage(scored[i].buf, outputDir);
        if (alt) break;
      }
      if (!fs.existsSync(path.join(outputDir, 'hero.webp'))) {
        console.log(`  -- ${loc.name}: processing failed for all candidates`);
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

    console.log(`  OK ${loc.name}: saved (score=${best.score}, ${best.source}, ${best.buf.length}b)`);
    stats.success++;

  } catch (err) {
    console.log(`  ERR ${loc.name}: ${err.message?.slice(0, 100)}`);
    stats.errors++;
  } finally {
    await context.close();
  }
}

// === Save progress ===
function saveProgress(batchNum, stats, phase) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
  const file = path.join(PROGRESS_DIR, `batch-${batchNum}.json`);
  fs.writeFileSync(file, JSON.stringify({ batch: batchNum, phase, stats, updatedAt: new Date().toISOString() }, null, 2));
}

// === Main ===
async function main() {
  console.log('=== PeuterPlannen Photo Upgrade ===\n');

  // Fetch ALL locations with a website (paginated to handle Supabase 1000-row cap)
  const locations = await sbFetchAll('locations',
    `select=id,name,website,type,region,photo_url,photo_quality&website=not.is.null&order=id.asc`
  );

  // Filter: only locations that need work
  const targets = locations.filter(loc => {
    // No photo at all
    if (!loc.photo_url) return true;
    // Has photo but scored low
    if (loc.photo_quality !== null && loc.photo_quality <= 2) return true;
    // Has photo but very small on disk
    const regionSlug = slugify(loc.region);
    const locSlug = slugify(loc.name);
    const heroPath = path.join(IMAGES_DIR, regionSlug, locSlug, 'hero.webp');
    if (fs.existsSync(heroPath)) {
      const stat = fs.statSync(heroPath);
      if (stat.size < 15000) return true; // < 15KB, probably bad
    } else {
      return true; // photo_url set but file missing
    }
    return false;
  });

  console.log(`Total locations with website: ${locations.length}`);
  console.log(`Locations needing photo work: ${targets.length}`);

  // Apply batch splitting
  let batch = targets;
  let batchLabel = 'all';
  if (BATCH >= 1 && BATCH <= TOTAL_BATCHES) {
    const batchSize = Math.ceil(targets.length / TOTAL_BATCHES);
    const start = (BATCH - 1) * batchSize;
    const end = Math.min(start + batchSize, targets.length);
    batch = targets.slice(start, end);
    batchLabel = `${BATCH}/${TOTAL_BATCHES}`;
    console.log(`Batch ${batchLabel}: locations ${start + 1}-${end} (${batch.length} items)`);
  }

  console.log(`Processing ${batch.length} locations (concurrency=${CONCURRENCY})`);
  if (DRY_RUN) console.log('DRY RUN mode — no files will be saved');
  console.log('');

  const stats = { success: 0, keptExisting: 0, noImages: 0, downloadFail: 0, processFail: 0, errors: 0, dryRun: 0 };

  const browser = await chromium.launch({ headless: true });

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const progress = `[${i + 1}-${Math.min(i + CONCURRENCY, batch.length)}/${batch.length}]`;
    console.log(`${progress} Processing...`);

    await Promise.all(
      chunk.map(loc => processLocation(loc, browser, stats))
    );

    // Save progress periodically
    if ((i % 20 === 0) || (i + CONCURRENCY >= batch.length)) {
      saveProgress(BATCH || 0, stats, `${i + CONCURRENCY}/${batch.length}`);
    }

    if (i + CONCURRENCY < batch.length) await sleep(500);
  }

  await browser.close();

  // Final progress save
  saveProgress(BATCH || 0, stats, 'done');

  console.log('\n=== Results ===');
  console.log(`  OK:     ${stats.success} new photos saved`);
  console.log(`  KEPT:   ${stats.keptExisting} existing photos kept`);
  console.log(`  EMPTY:  ${stats.noImages} no candidates found`);
  console.log(`  DLFAIL: ${stats.downloadFail} download failures`);
  console.log(`  PROC:   ${stats.processFail} processing failures`);
  console.log(`  ERR:    ${stats.errors} errors`);
  if (DRY_RUN) console.log(`  DRY:    ${stats.dryRun} dry run`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
