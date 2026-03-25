#!/usr/bin/env node

/**
 * discover-from-web.js — Discover new locations from parent blogs and web sources
 *
 * Uses Playwright to search Google for parent-oriented content about each region,
 * then extracts location mentions from blogs, city guides, and recommendation pages.
 *
 * Sources:
 * - Google search: "leuk met peuters [stad]", "uitje met kinderen [stad]", etc.
 * - Known parent blogs: uitmetkinderen.nl, dagjeuit.nl, kidsproof.nl, etc.
 * - City "wat te doen" pages
 *
 * New candidates go into location_candidates for review.
 *
 * Usage:
 *   node .scripts/pipeline/discover-from-web.js                      # All regions
 *   node .scripts/pipeline/discover-from-web.js --region=Amsterdam    # One region
 *   node .scripts/pipeline/discover-from-web.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const {
  REGIONS,
  buildSourceFingerprint,
  haversineMeters,
  normalizeName,
  wait,
  mapToRootRegion,
  hasHardRejectSignal,
} = require('./config');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(__dirname, 'output');
const LOG_FILE = path.join(OUTPUT_DIR, 'web-discovery-log.jsonl');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'web-discovery-results.json');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const REGION_FILTER = process.argv.find(a => a.startsWith('--region='))?.split('=')[1] || null;

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { info: 'ℹ', warn: '⚠', error: '✗', ok: '✓' }[level] || '·';
  console.log(`${ts} ${prefix} ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

// Search queries per region
function getSearchQueries(region) {
  return [
    `leuk met peuters ${region}`,
    `uitjes met kinderen ${region}`,
    `kindvriendelijk restaurant ${region} speelhoek`,
    `binnenspeeltuin ${region}`,
    `kinderboerderij ${region}`,
    `wat te doen met kleuters ${region}`,
    `leukste uitjes peuters ${region} blog`,
  ];
}

// Known parent blog domains to prioritize
const PARENT_BLOGS = [
  'uitmetkinderen.nl', 'dagjeuit.nl', 'kidsproof.nl', 'uitjeskrant.nl',
  'fijnuit.nl', 'allesvan.nl', 'pretwerk.nl', 'dagjeuitpagina.nl',
  'watdoenwevandag.nl', 'doedingenmetkinderen.nl', 'travelkidsmultimedial.com',
  'thuisblijfvader.nl', 'mamaliefde.nl', 'bloglieveingrid.nl',
];

async function searchGoogleForLocations(page, query) {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=nl&gl=nl&num=10`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(1500);

    // Accept cookies if prompted
    try {
      const btn = page.locator('button:has-text("Alles accepteren"), button:has-text("Accept all")');
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await wait(1000);
      }
    } catch {}

    // Extract search result URLs
    const results = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href^="http"]');
      return Array.from(links)
        .map(a => ({ url: a.href, title: a.textContent.trim().slice(0, 200) }))
        .filter(r => !r.url.includes('google.com') && !r.url.includes('youtube.com'))
        .slice(0, 10);
    });

    return results;
  } catch (err) {
    return [];
  }
}

async function scrapeBlogForLocations(page, url, region) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(2000);

    const pageText = await page.evaluate(() => {
      return document.body?.innerText?.slice(0, 50000) || '';
    });

    if (pageText.length < 200) return [];

    // Use Gemini to extract location mentions
    if (!GEMINI_KEY) return [];

    const prompt = `Analyseer deze tekst van een blog/website over uitjes met kinderen in de regio ${region}.

Extract ALLEEN specifieke, benoemde locaties die geschikt zijn voor ouders met peuters/kleuters (0-6 jaar).

STRENGE REGELS:
- Alleen locaties die als BESTEMMING dienen (niet gewoon een restaurant waar je toevallig kunt eten)
- De locatie moet iets BIJZONDERS bieden voor kinderen: speelhoek, dierentuin, speeltuin, kindermuseum, binnenspeeltuin, etc.
- GEEN gewone restaurants tenzij ze een echte speelhoek/kinderfaciliteit hebben
- GEEN generieke parken of buurt-speeltuintjes
- GEEN winkels of supermarkten
- Elke locatie moet een echte, bestaande plek zijn met een naam

Tekst (eerste 3000 tekens):
${pageText.slice(0, 3000)}

Antwoord in JSON array: [{"name": "exacte naam", "type": "playground|farm|museum|swim|restaurant|nature|indoor_play|other", "why": "korte reden waarom het interessant is voor peuters"}]
Als je niets vindt: []`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
        }),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    try {
      const locations = JSON.parse(jsonMatch[0]);
      return locations.filter(l => l.name && l.name.length > 3 && !hasHardRejectSignal(l.name));
    } catch {
      return [];
    }
  } catch (err) {
    return [];
  }
}

async function main() {
  log('info', '═══ Web Discovery Pipeline ═══');
  log('info', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  if (!GEMINI_KEY) {
    log('error', 'GEMINI_API_KEY not set — needed for blog text analysis');
    process.exit(1);
  }

  const db = createSupabaseClient(PROJECT_ROOT);

  // Load existing locations for dedup
  log('info', 'Loading existing locations...');
  const existing = [];
  let offset = 0;
  while (true) {
    const batch = await db.rest(`locations?select=id,name,lat,lng,region&order=id.asc&offset=${offset}&limit=1000`);
    if (!batch?.length) break;
    existing.push(...batch);
    if (batch.length < 1000) break;
    offset += batch.length;
  }
  const existingNames = new Set(existing.map(l => normalizeName(l.name)));
  log('info', `Loaded ${existing.length} existing locations`);

  // Determine regions
  const primaryRegions = Object.entries(REGIONS)
    .filter(([, cfg]) => !cfg.supabaseRegion)
    .filter(([name]) => !REGION_FILTER || name === REGION_FILTER)
    .filter(([, cfg]) => !cfg.skipOsm);

  // Launch Playwright
  const playwright = require('playwright');
  const browser = await playwright.chromium.launch({ headless: true });

  const allDiscoveries = [];
  const stats = { blogs_scraped: 0, locations_found: 0, new_unique: 0, known: 0 };

  for (const [regionName] of primaryRegions) {
    const rootRegion = mapToRootRegion(regionName);
    log('info', `Searching for ${rootRegion}...`);

    const queries = getSearchQueries(rootRegion);
    const context = await browser.newContext({ locale: 'nl-NL' });
    const page = await context.newPage();

    const allUrls = new Set();

    // Search Google for each query
    for (const query of queries) {
      await wait(3000); // Rate limit Google
      const results = await searchGoogleForLocations(page, query);

      for (const r of results) {
        // Prioritize parent blog domains
        const isPriorityBlog = PARENT_BLOGS.some(d => r.url.includes(d));
        if (isPriorityBlog || r.title.match(/peuter|kleuter|kinderen|gezin|uitje|speelhoek/i)) {
          allUrls.add(r.url);
        }
      }
    }

    log('info', `  Found ${allUrls.size} relevant blog/article URLs for ${rootRegion}`);

    // Scrape each blog page for location mentions
    for (const blogUrl of allUrls) {
      await wait(2000); // Rate limit
      stats.blogs_scraped++;

      const locations = await scrapeBlogForLocations(page, blogUrl, rootRegion);
      if (!locations.length) continue;

      log('ok', `  ${blogUrl.slice(0, 60)}... → ${locations.length} locations found`);
      stats.locations_found += locations.length;

      for (const loc of locations) {
        const normalized = normalizeName(loc.name);

        // Check if already known
        if (existingNames.has(normalized)) {
          stats.known++;
          continue;
        }

        // New discovery!
        stats.new_unique++;
        existingNames.add(normalized); // prevent self-dupes

        const discovery = {
          name: loc.name,
          type_hint: loc.type,
          region: rootRegion,
          source_url: blogUrl,
          why: loc.why,
          ts: new Date().toISOString(),
        };
        allDiscoveries.push(discovery);

        fs.appendFileSync(LOG_FILE, JSON.stringify(discovery) + '\n');
        log('ok', `    NEW: ${loc.name} (${loc.type}) — ${loc.why}`);
      }
    }

    await context.close();
  }

  await browser.close();

  // Save all discoveries
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    ts: new Date().toISOString(),
    stats,
    discoveries: allDiscoveries,
  }, null, 2));

  // Insert into candidates if not dry run
  if (!DRY_RUN && allDiscoveries.length > 0) {
    log('info', `Inserting ${allDiscoveries.length} new candidates into location_candidates...`);

    const run = await db.createIngestionRun({
      runType: 'ingest',
      regionRoot: REGION_FILTER || 'web-discovery',
      withSurroundings: false,
    });

    const candidates = allDiscoveries.map(d => ({
      run_id: run?.id,
      source_fingerprint: buildSourceFingerprint(['web', d.name, d.region, d.source_url]),
      name: d.name,
      region_root: d.region,
      type_hint: d.type_hint,
      website: null, // to be enriched later
      status: 'new',
      raw_payload: { source_url: d.source_url, why: d.why },
      enriched_signals: {},
    }));

    await db.upsertCandidates(candidates);
    log('ok', `Inserted ${candidates.length} candidates`);

    if (run?.id) {
      await db.finishIngestionRun(run.id, { status: 'done', stats });
    }
  }

  log('info', '═══ Web Discovery Complete ═══');
  log('info', `Blogs: ${stats.blogs_scraped} | Locations found: ${stats.locations_found} | New unique: ${stats.new_unique} | Already known: ${stats.known}`);
}

main().catch(err => {
  log('error', `Discovery crashed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
