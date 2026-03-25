/**
 * enrich_utrecht.js
 *
 * Reads output/utrecht_raw.json, scrapes each candidate's website for
 * kid-friendly keywords, and writes output/utrecht_enriched.json.
 *
 * Concurrency: 10 parallel fetches, 8s timeout per request.
 */

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { mapLimit } = require('./config');

const PROJECT_ROOT = resolve(__dirname, '..', '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');

const KID_KEYWORDS_NL = [
  'speelhoek', 'speelruimte', 'speeltuin', 'kindermenu', 'verschoon',
  'peuter', 'kleuter', 'kinderstoel', 'ballenbak', 'speelkamer',
  'speelparadijs', 'speelgoed', 'kindvriendelijk', 'kinderen',
  'kinderkaart', 'luiertafel', 'verschoontafel', 'verschoonruimte',
  'baby', 'dreumes', 'gezin', 'gezinnen',
];

const FETCH_TIMEOUT_MS = 8000;
const CONCURRENCY = 10;

const UA = 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0; +https://peuterplannen.nl)';

function normalizeHtml(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countKeywords(text) {
  const matches = KID_KEYWORDS_NL.filter((kw) => text.includes(kw));
  return { keyword_count: matches.length, keyword_matches: matches };
}

async function scrapeWebsite(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return { website_scraped: false, keyword_count: 0, keyword_matches: [] };
    const html = await res.text();
    const text = normalizeHtml(html).slice(0, 80000);
    return { website_scraped: true, ...countKeywords(text) };
  } catch {
    clearTimeout(timer);
    return { website_scraped: false, keyword_count: 0, keyword_matches: [] };
  }
}

async function enrichCandidate(candidate) {
  if (!candidate.website) {
    return { ...candidate, website_scraped: false, keyword_count: 0, keyword_matches: [] };
  }
  const result = await scrapeWebsite(candidate.website);
  return { ...candidate, ...result };
}

async function main() {
  const rawPath = resolve(OUTPUT_DIR, 'utrecht_raw.json');
  let candidates;
  try {
    candidates = JSON.parse(readFileSync(rawPath, 'utf8'));
  } catch (err) {
    console.error(`[enrich] Cannot read ${rawPath}: ${err.message}`);
    process.exit(1);
  }

  console.log(`[enrich] Enriching ${candidates.length} candidates (concurrency=${CONCURRENCY})...`);

  let done = 0;
  const enriched = await mapLimit(candidates, CONCURRENCY, async (candidate) => {
    const result = await enrichCandidate(candidate);
    done++;
    if (done % 50 === 0) console.log(`[enrich] ${done}/${candidates.length}`);
    return result;
  });

  const outputPath = resolve(OUTPUT_DIR, 'utrecht_enriched.json');
  writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf8');

  const withKeywords = enriched.filter((c) => c.keyword_count > 0).length;
  const withWebsite = enriched.filter((c) => c.website_scraped).length;
  console.log(`\n[enrich] Done.`);
  console.log(`  Total:        ${enriched.length}`);
  console.log(`  Scraped:      ${withWebsite}`);
  console.log(`  With keywords: ${withKeywords}`);
  console.log(`  Written to:   output/utrecht_enriched.json`);
}

main().catch((err) => {
  console.error('[enrich] Fatal:', err.message || String(err));
  process.exit(1);
});
