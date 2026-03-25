#!/usr/bin/env node

/**
 * deep-enrich-playwright.js — Playwright-based deep enrichment
 *
 * Uses headless browsers to scrape Google Maps reviews, Foursquare,
 * and location websites for richer data than simple HTTP can provide.
 *
 * Targets: locations missing opening_hours, play_corner_quality,
 * or with sparse facility data.
 *
 * Usage:
 *   node .scripts/pipeline/deep-enrich-playwright.js                # Full run
 *   node .scripts/pipeline/deep-enrich-playwright.js --limit=20     # Test subset
 *   node .scripts/pipeline/deep-enrich-playwright.js --dry-run      # Don't write
 *   node .scripts/pipeline/deep-enrich-playwright.js --concurrency=4
 */

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const { haversineMeters, jitterSleep, wait } = require('./config');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(__dirname, 'output');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'deep-enrich-progress.json');
const LOG_FILE = path.join(OUTPUT_DIR, 'deep-enrich-log.jsonl');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const LIMIT = Number(process.env.LIMIT || process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 0);
const CONCURRENCY = Number(process.env.CONCURRENCY || process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] || 3);

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { info: 'ℹ', warn: '⚠', error: '✗', ok: '✓' }[level] || '·';
  console.log(`${ts} ${prefix} ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return { processed: {}, started_at: new Date().toISOString() }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }
function appendLog(e) { fs.appendFileSync(LOG_FILE, JSON.stringify(e) + '\n'); }

// ─── Google Maps review scraping ────────────────────────────────────

async function scrapeGoogleMapsReviews(page, loc) {
  const searchQuery = encodeURIComponent(`${loc.name} ${loc.region} Nederland`);
  const url = `https://www.google.com/maps/search/${searchQuery}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Accept cookies if prompted
    try {
      const acceptBtn = page.locator('button:has-text("Alles accepteren"), button:has-text("Accept all")');
      if (await acceptBtn.isVisible({ timeout: 3000 })) {
        await acceptBtn.click();
        await wait(1000);
      }
    } catch { /* no cookie banner */ }

    // Wait for results
    await wait(2000);

    // Click on the first result that matches our location name
    try {
      const firstResult = page.locator(`[role="feed"] > div`).first();
      if (await firstResult.isVisible({ timeout: 5000 })) {
        await firstResult.click();
        await wait(2000);
      }
    } catch { /* direct match, no feed */ }

    // Extract basic info from the place panel
    const info = await page.evaluate(() => {
      const result = {};

      // Opening hours
      const hoursEl = document.querySelector('[data-item-id="oh"] .fontBodyMedium');
      if (hoursEl) result.opening_hours = hoursEl.textContent.trim();

      // Try alternative hours selector
      if (!result.opening_hours) {
        const ariaHours = document.querySelector('[aria-label*="uur"], [aria-label*="hour"], [aria-label*="Openingstijden"]');
        if (ariaHours) result.opening_hours = ariaHours.getAttribute('aria-label');
      }

      // Rating
      const ratingEl = document.querySelector('[role="img"][aria-label*="ster"], [role="img"][aria-label*="star"]');
      if (ratingEl) {
        const m = ratingEl.getAttribute('aria-label')?.match(/([\d,\.]+)/);
        if (m) result.rating = parseFloat(m[1].replace(',', '.'));
      }

      // Review count
      const reviewEl = document.querySelector('button[jsaction*="review"] span, [aria-label*="review"]');
      if (reviewEl) {
        const m = reviewEl.textContent.match(/([\d.]+)/);
        if (m) result.review_count = parseInt(m[1].replace('.', ''));
      }

      // Price level
      const priceEl = document.querySelector('[aria-label*="Prijs"], [aria-label*="Price"]');
      if (priceEl) {
        const euros = (priceEl.textContent.match(/€/g) || []).length;
        if (euros) result.price_level = euros;
      }

      // Address
      const addressEl = document.querySelector('[data-item-id="address"] .fontBodyMedium');
      if (addressEl) result.address = addressEl.textContent.trim();

      // Website
      const websiteEl = document.querySelector('[data-item-id="authority"] a');
      if (websiteEl) result.website = websiteEl.href;

      // Phone
      const phoneEl = document.querySelector('[data-item-id^="phone"] .fontBodyMedium');
      if (phoneEl) result.phone = phoneEl.textContent.trim();

      return result;
    });

    // Try to get reviews
    let reviews = [];
    try {
      // Click on reviews tab
      const reviewsTab = page.locator('button[aria-label*="Review"], button[aria-label*="review"], button:has-text("Reviews")');
      if (await reviewsTab.isVisible({ timeout: 3000 })) {
        await reviewsTab.click();
        await wait(2000);

        // Scroll to load reviews
        const reviewContainer = page.locator('[role="feed"], .review-dialog-list');
        if (await reviewContainer.isVisible({ timeout: 3000 })) {
          // Scroll down to load more reviews
          for (let i = 0; i < 3; i++) {
            await reviewContainer.evaluate(el => el.scrollTop += 500);
            await wait(500);
          }
        }

        // Extract review text
        reviews = await page.evaluate(() => {
          const reviewEls = document.querySelectorAll('.MyEned span.wiI7pd, [data-review-id] .review-full-text, .rsqaWe');
          return Array.from(reviewEls).slice(0, 15).map(el => el.textContent.trim().slice(0, 500));
        });
      }
    } catch { /* reviews not accessible */ }

    // Analyze reviews for kid signals
    const kidSignals = analyzeReviews(reviews);

    return { ...info, reviews: reviews.length, kid_signals: kidSignals };
  } catch (err) {
    return { error: err.message?.slice(0, 100) };
  }
}

function analyzeReviews(reviews) {
  if (!reviews.length) return {};

  const allText = reviews.join(' ').toLowerCase();
  const signals = {
    mentions_kids: /kind|kinderen|peuter|dreumes|kleuter|baby|kids|toddler/i.test(allText),
    mentions_play_area: /speelhoek|speeltuin|speelruimte|speelplek|ballenbak|glijbaan|klimrek|speelkamer|play area/i.test(allText),
    mentions_high_chair: /kinderstoel|kinderstoelen|highchair/i.test(allText),
    mentions_diaper: /verschoon|luiertafel|changing/i.test(allText),
    mentions_stroller: /buggy|kinderwagen|wandelwagen|stroller/i.test(allText),
    mentions_coffee: /koffie|cappuccino|espresso|latte/i.test(allText),
    positive_family: /fijn.*kind|leuk.*kind|top.*gezin|aanrader.*kind|kindvriendelijk/i.test(allText),
    negative_family: /niet.*geschikt.*kind|niet.*kindvriendelijk|te druk/i.test(allText),
    total_reviews_checked: reviews.length,
  };

  // Extract relevant review snippets
  signals.kid_snippets = reviews
    .filter(r => /kind|peuter|kleuter|baby|kids|speelhoek|speeltuin/i.test(r))
    .slice(0, 3)
    .map(r => r.slice(0, 200));

  return signals;
}

// ─── Website deep scrape (with JS rendering) ───────────────────────

async function deepScrapeWebsite(page, website) {
  if (!website) return { error: 'no_website' };

  try {
    await page.goto(website, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(1500); // let JS render

    const data = await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() || '';

      // Opening hours (more patterns with JS-rendered content)
      let hours = null;
      // Try multiple selectors
      const hoursSelectors = [
        '[class*="openingstijden"]', '[class*="opening-hours"]',
        '[id*="openingstijden"]', '[id*="opening"]',
        '.opening-times', '.business-hours', '.hours',
      ];
      for (const sel of hoursSelectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 10) {
            hours = el.innerText.trim().slice(0, 300);
            break;
          }
        } catch { /* skip invalid selectors */ }
      }
      // Fallback: search for opening hours in text
      if (!hours) {
        const allText = document.body?.innerText || '';
        const match = allText.match(/(?:openingstijden|geopend|opening hours)[:\s]*\n?((?:.*\n){1,7})/i);
        if (match) hours = match[0].trim().slice(0, 300);
      }

      // Facilities
      const hasCoffee = /koffie|coffee|cappuccino|espresso|latte|barista/i.test(text);
      const hasDiaper = /verschoon|luiertafel|changing|verschoontafel/i.test(text);
      const hasPlayArea = /speelhoek|speelruimte|speeltuin|speelplek|ballenbak|kinderhoek|play area|play corner/i.test(text);
      const hasAlcohol = /bier|wijn|wine|beer|cocktail|prosecco|borrel/i.test(text);
      const hasMenu = /kindermenu|kinderkaart|kinderportie|kids menu/i.test(text);
      const hasHighChair = /kinderstoel|kinderstoelen|highchair/i.test(text);

      // Price signals
      const hasFreeEntry = /gratis.*(?:toegang|entree)|free.*(?:entry|admission)/i.test(text);
      const hasPaidEntry = /entree|toegang.*€|€.*per.*(?:persoon|kind|volwassene)|kaartjes.*kopen/i.test(text);

      // Extract price if found
      let priceRange = null;
      const priceMatch = text.match(/€\s*(\d+(?:[.,]\d+)?)/g);
      if (priceMatch) {
        const prices = priceMatch.map(p => parseFloat(p.replace('€', '').replace(',', '.').trim()));
        if (prices.length) priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
      }

      return {
        hours,
        has_coffee: hasCoffee,
        has_diaper: hasDiaper,
        has_play_area: hasPlayArea,
        has_alcohol: hasAlcohol,
        has_kids_menu: hasMenu,
        has_high_chair: hasHighChair,
        has_free_entry: hasFreeEntry,
        has_paid_entry: hasPaidEntry,
        price_range: priceRange,
        text_length: text.length,
      };
    });

    return data;
  } catch (err) {
    return { error: err.message?.slice(0, 100) };
  }
}

// ─── Build patch from deep scrape data ──────────────────────────────

function buildDeepPatch(loc, gmaps, webDeep) {
  const patch = {};
  const reasons = {};

  // Opening hours (prefer Google Maps over website)
  if (!loc.opening_hours) {
    if (gmaps?.opening_hours && gmaps.opening_hours.length > 10) {
      patch.opening_hours = gmaps.opening_hours.slice(0, 500);
      reasons.opening_hours = 'google_maps_scrape';
    } else if (webDeep?.hours && webDeep.hours.length > 10) {
      // Validate: must contain time patterns
      const hasTime = /\d{1,2}[:.]\d{2}/.test(webDeep.hours);
      const hasDays = /(ma|di|wo|do|vr|za|zo|maandag|dinsdag)/i.test(webDeep.hours);
      if (hasTime || hasDays) {
        patch.opening_hours = webDeep.hours.slice(0, 500);
        reasons.opening_hours = 'website_deep_scrape';
      }
    }
  }

  // Play corner quality from reviews
  if (!loc.play_corner_quality && ['horeca', 'pancake'].includes(loc.type)) {
    if (gmaps?.kid_signals?.mentions_play_area || webDeep?.has_play_area) {
      patch.play_corner_quality = 'strong';
      reasons.play_corner_quality = gmaps?.kid_signals?.mentions_play_area ? 'google_reviews' : 'website_deep_scrape';
    }
  }

  // Coffee from deep scrape (only fill nulls)
  if (loc.coffee === null) {
    if (webDeep?.has_coffee || gmaps?.kid_signals?.mentions_coffee) {
      patch.coffee = true;
      reasons.coffee = 'deep_scrape';
    }
  }

  // Diaper from deep scrape
  if (loc.diaper === null) {
    if (webDeep?.has_diaper || gmaps?.kid_signals?.mentions_diaper) {
      patch.diaper = true;
      reasons.diaper = 'deep_scrape';
    }
  }

  // Website from Google Maps (if missing)
  if (!loc.website && gmaps?.website) {
    patch.website = gmaps.website;
    reasons.website = 'google_maps_scrape';
  }

  // Update verification
  if (Object.keys(patch).length > 0) {
    patch.last_context_refresh_at = new Date().toISOString();
  }

  return { patch, reasons };
}

// ─── Main pipeline ──────────────────────────────────────────────────

async function main() {
  log('info', '═══ Deep Enrichment Pipeline (Playwright) ═══');
  log('info', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Concurrency: ${CONCURRENCY}`);

  const db = createSupabaseClient(PROJECT_ROOT);
  const progress = loadProgress();

  // Fetch locations needing deep enrichment
  log('info', 'Fetching locations...');
  const all = [];
  let offset = 0;
  const fields = 'id,name,type,region,website,place_id,opening_hours,play_corner_quality,coffee,diaper,alcohol,weather';
  while (true) {
    const batch = await db.rest(`locations?select=${fields}&order=id.asc&offset=${offset}&limit=1000`);
    if (!batch?.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    offset += batch.length;
  }

  // Target: locations WITH a website that are missing important data
  // Prioritize types where website data is most valuable (horeca, pancake, museum, swim, culture)
  const valuableTypes = ['horeca', 'pancake', 'museum', 'swim', 'culture', 'farm'];
  const needsWork = all.filter(loc => {
    if (progress.processed[String(loc.id)]) return false;
    if (!loc.website) return false; // no point without website
    const missing = [
      !loc.opening_hours,
      !loc.play_corner_quality && ['horeca', 'pancake'].includes(loc.type),
      loc.coffee === null,
      loc.diaper === null,
    ].filter(Boolean).length;
    return missing > 0;
  });

  // Sort: valuable types first, then by missing field count
  needsWork.sort((a, b) => {
    const typeA = valuableTypes.includes(a.type) ? 1 : 0;
    const typeB = valuableTypes.includes(b.type) ? 1 : 0;
    if (typeA !== typeB) return typeB - typeA;
    const scoreA = (!a.opening_hours ? 3 : 0) + (a.coffee === null ? 1 : 0) + (a.diaper === null ? 1 : 0);
    const scoreB = (!b.opening_hours ? 3 : 0) + (b.coffee === null ? 1 : 0) + (b.diaper === null ? 1 : 0);
    return scoreB - scoreA;
  });

  let locations = needsWork;
  if (LIMIT) locations = locations.slice(0, LIMIT);
  log('info', `${locations.length} locations need deep enrichment (of ${all.length} total)`);

  // Launch Playwright
  let playwright, browser;
  try {
    playwright = require('playwright');
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (err) {
    log('error', `Failed to launch browser: ${err.message}`);
    process.exit(1);
  }

  const stats = { updated: 0, no_changes: 0, errors: 0, skipped: 0 };

  // Process in batches with concurrency
  for (let i = 0; i < locations.length; i += CONCURRENCY) {
    const batch = locations.slice(i, i + CONCURRENCY);

    const promises = batch.map(async (loc) => {
      const locId = String(loc.id);
      if (progress.processed[locId]) { stats.skipped++; return; }

      const context = await browser.newContext({
        locale: 'nl-NL',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      try {
        // Step 1: Deep website scrape (with JS rendering + subpages)
        let webDeep = null;
        if (loc.website) {
          webDeep = await deepScrapeWebsite(page, loc.website);

          // Step 1b: Try subpages if main page didn't yield opening hours
          if (!webDeep?.hours && loc.website) {
            const subpages = ['/openingstijden', '/contact', '/bezoeken', '/bezoek', '/praktisch', '/visit', '/info', '/over-ons'];
            for (const sub of subpages) {
              try {
                const base = new URL(loc.website);
                const subUrl = new URL(sub, base).href;
                const subData = await deepScrapeWebsite(page, subUrl);
                if (subData?.hours) {
                  webDeep = { ...webDeep, hours: subData.hours, hours_source: subUrl };
                  break;
                }
              } catch { /* skip broken subpages */ }
            }
          }
        }

        // Step 2: Build patch (no Google Maps scrape — API handles that)
        const gmaps = null;
        const { patch, reasons } = buildDeepPatch(loc, gmaps, webDeep);

        // Step 4: Write to DB
        const fieldCount = Object.keys(patch).length;
        if (fieldCount > 0 && !DRY_RUN) {
          await db.patchLocation(loc.id, patch);
        }

        // Log
        appendLog({
          id: loc.id, name: loc.name,
          ts: new Date().toISOString(),
          fields_updated: fieldCount,
          patch, reasons,
          gmaps_reviews: gmaps?.reviews || 0,
          kid_signals: gmaps?.kid_signals || {},
          errors: [gmaps?.error, webDeep?.error].filter(Boolean),
        });

        progress.processed[locId] = { ts: new Date().toISOString(), fields: fieldCount, result: 'ok' };
        saveProgress(progress);

        if (fieldCount > 0) {
          log('ok', `[${loc.id}] ${loc.name} — ${fieldCount} fields ${DRY_RUN ? '(dry)' : 'patched'}`, { fields: Object.keys(patch) });
          stats.updated++;
        } else {
          stats.no_changes++;
        }
      } catch (err) {
        log('error', `[${loc.id}] ${loc.name}: ${err.message}`);
        stats.errors++;
        progress.processed[locId] = { ts: new Date().toISOString(), result: 'error', error: err.message?.slice(0, 100) };
        saveProgress(progress);
      } finally {
        await context.close();
      }
    });

    await Promise.all(promises);

    if (i > 0 && i % 30 === 0) {
      const pct = ((i / locations.length) * 100).toFixed(1);
      log('info', `Progress: ${i}/${locations.length} (${pct}%) — updated: ${stats.updated}, errors: ${stats.errors}`);
    }

    // Small delay between batches to be respectful
    await wait(1000);
  }

  await browser.close();

  log('info', '═══ Deep Enrichment Complete ═══');
  log('info', `Updated: ${stats.updated} | No changes: ${stats.no_changes} | Errors: ${stats.errors}`);
}

main().catch(err => {
  log('error', `Pipeline crashed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
