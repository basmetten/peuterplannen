/**
 * Google Maps enrichment via Puppeteer + stealth plugin.
 * Eén browser-instantie, page-pool voor concurrency.
 *
 * Signalen per kandidaat:
 *   google_rating, google_review_count, google_business_status,
 *   google_types, google_mentions_family, keyword_count, keywords, hard_reject
 *
 * Env vars:
 *   PIPELINE_GOOGLE_PUPPETEER_CONCURRENCY   default 4
 *   PIPELINE_GOOGLE_PUPPETEER_TIMEOUT_MS    default 18000
 *   PIPELINE_GOOGLE_PUPPETEER_HEADLESS      default true
 */

const { mapLimit, KID_KEYWORDS, hasHardRejectSignal } = require('./config');

const FAMILY_RE = /family|kids|children|kind|gezin|peuter|kleuter|speelhoek|kinderstoel|high chair|verschoon/i;
const CLOSED_RE = /permanently closed|dauerhaft geschlossen|definitief gesloten/i;

// CONSENT-cookie preset — vermijdt het consent-scherm helemaal
const CONSENT_COOKIE = {
  name: 'CONSENT',
  value: `YES+cb.${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-p0.nl+FX+${Math.floor(Math.random() * 900 + 100)}`,
  domain: '.google.com',
  path: '/',
};

async function buildBrowser(headless) {
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  return puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
      '--lang=nl-NL',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
}

async function dismissConsent(page) {
  // Klik "Alles afwijzen" als het consent-scherm verschijnt (NL/EN)
  try {
    await page.waitForSelector('[aria-label="Alles afwijzen"], [aria-label="Reject all"]', { timeout: 5000 });
    await page.click('[aria-label="Alles afwijzen"], [aria-label="Reject all"]');
    await new Promise((r) => setTimeout(r, 2000));
  } catch {
    // Geen consent-scherm
  }
}

async function preparePage(browser) {
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8' });

  // Block alleen media (geen JS/CSS — nodig voor Maps rendering)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'media') req.abort();
    else req.continue();
  });

  // Navigeer éénmalig naar google.com om consent af te handelen
  // zodat alle volgende Maps-navigaties direct werken
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await dismissConsent(page);

  return page;
}

async function scrapeGoogleMaps(page, candidate, timeoutMs) {
  const query = [candidate.name, candidate.city, 'Nederland'].filter(Boolean).join(' ');
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Wacht tot ratings zichtbaar zijn (aria-label op star span) of timeout
    await Promise.race([
      page.waitForSelector('span[role="img"][aria-label]', { timeout: 8000 }).catch(() => {}),
      new Promise((r) => setTimeout(r, 6000)),
    ]);

    const data = await page.evaluate((familyPattern, keywords) => {
      const text = document.body.innerText || '';

      // Rating via aria-label: "4,3 sterren" / "4.3 stars"
      let rating = null;
      let reviewCount = null;
      const starEl = document.querySelector('span[role="img"][aria-label]');
      if (starEl) {
        const label = starEl.getAttribute('aria-label') || '';
        const ratingMatch = label.match(/([1-5][,\.][0-9])/);
        if (ratingMatch) rating = Number(ratingMatch[1].replace(',', '.'));
      }

      // Review count via aria-label of tekstpatroon "(7.072)" / "7.072 recensies"
      const reviewElByLabel = document.querySelector('span[aria-label*="recensies"], span[aria-label*="reviews"], button[aria-label*="reviews"]');
      if (reviewElByLabel) {
        const label = reviewElByLabel.getAttribute('aria-label') || '';
        const m = label.match(/([\d\.,]+)/);
        if (m) reviewCount = Number(m[1].replace(/[^\d]/g, ''));
      }
      if (!reviewCount) {
        // Fallback: patroon in tekst "4.3(7,072)"
        const m = text.match(/[1-5][,\.][0-9]\(([\d,\.]+)\)/);
        if (m) reviewCount = Number(m[1].replace(/[^\d]/g, ''));
      }

      // Categorie via button met jsaction category
      const catEl = document.querySelector('button[jsaction*="category"]');
      const category = catEl ? catEl.innerText.trim() : null;

      // Permanently closed
      const isClosed = /permanently closed|definitief gesloten/i.test(text);

      return {
        text: text.slice(0, 6000),
        rating,
        reviewCount,
        categories: category ? [category] : [],
        isClosed,
      };
    }, FAMILY_RE.source, KID_KEYWORDS);

    const mentionsFamily = FAMILY_RE.test(data.text);
    const keywordHits = KID_KEYWORDS.filter((kw) => data.text.toLowerCase().includes(kw));
    const hardReject = hasHardRejectSignal(data.text.slice(0, 3000));

    // Kleine jitter tussen requests
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

    return {
      ok: true,
      signals: {
        google_rating: data.rating,
        google_review_count: data.reviewCount,
        google_business_status: data.isClosed ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL',
        google_types: data.categories,
        google_mentions_family: mentionsFamily,
        keyword_count: keywordHits.length,
        keywords: keywordHits,
        hard_reject: hardReject,
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function enrichWithGooglePuppeteer({ candidates, db }) {
  const concurrency = Number(process.env.PIPELINE_GOOGLE_PUPPETEER_CONCURRENCY || '4');
  const timeoutMs = Number(process.env.PIPELINE_GOOGLE_PUPPETEER_TIMEOUT_MS || '18000');
  const headless = process.env.PIPELINE_GOOGLE_PUPPETEER_HEADLESS !== 'false';

  const browser = await buildBrowser(headless);
  const pagePool = await Promise.all(Array.from({ length: concurrency }, () => preparePage(browser)));

  let poolIdx = 0;
  const results = await mapLimit(candidates, concurrency, async (candidate) => {
    const page = pagePool[poolIdx % concurrency];
    poolIdx += 1;

    const result = await scrapeGoogleMaps(page, candidate, timeoutMs);

    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'google',
        payload_json: { mode: 'puppeteer', name: candidate.name, city: candidate.city },
        signals_json: result.ok ? result.signals : {},
        ok: result.ok,
        error: result.ok ? null : `puppeteer:${(result.error || '').slice(0, 200)}`,
      },
      signals: result.ok ? result.signals : {},
    };
  });

  await browser.close();

  const evidenceRows = results.map((r) => r.evidence);
  if (evidenceRows.length) await db.insertEvidence(evidenceRows);

  return results;
}

module.exports = { enrichWithGooglePuppeteer };
