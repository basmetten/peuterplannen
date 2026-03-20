#!/usr/bin/env node
/**
 * quality-check-photos.js — Evaluate location photos with Gemini Vision (Fase 0)
 *
 * For each location with a photo_url:
 *   1. Load hero.webp from disk
 *   2. Send to Gemini Flash Vision for quality scoring (1-5)
 *   3. Store score in photo_quality field
 *   4. For score 1-2: set photo_url=null, photo_source='rejected'
 *
 * Rate limiting: 7s between calls (safe under Tier 1 / 10 RPM)
 * Daily cap: GEMINI_MAX_RPD env var (default 450)
 *
 * Usage:
 *   node .scripts/pipeline/quality-check-photos.js
 *   DRY_RUN=1 node .scripts/pipeline/quality-check-photos.js
 *   BATCH_LIMIT=50 node .scripts/pipeline/quality-check-photos.js
 *   OFFSET=200 BATCH_LIMIT=100 node .scripts/pipeline/quality-check-photos.js
 *   GEMINI_MAX_RPD=200 node .scripts/pipeline/quality-check-photos.js
 */

const fs = require('fs');
const path = require('path');
const { SB_URL, SB_KEY: ANON_KEY } = require('../lib/config');

// Prefer service key from .supabase_env for write access (RLS bypass)
let SB_KEY = ANON_KEY;
const envPath = path.resolve(__dirname, '..', '..', '.supabase_env');
if (fs.existsSync(envPath)) {
  const match = fs.readFileSync(envPath, 'utf8').match(/SUPABASE_SERVICE_KEY=(.+)/);
  if (match) SB_KEY = match[1].trim();
}
if (process.env.SUPABASE_SERVICE_KEY) SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY environment variable');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || '2000', 10);
const OFFSET = parseInt(process.env.OFFSET || '0', 10);
const GEMINI_MAX_RPD = parseInt(process.env.GEMINI_MAX_RPD || '450', 10);
const GEMINI_MODEL = 'gemini-3-flash-preview';
const RATE_LIMIT_MS = 7000; // 7s between calls → safe under 10 RPM (Tier 1)

let geminiCallCount = 0;

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
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`DB update ${id}: ${res.status} ${await res.text()}`);
}

/**
 * Call Gemini Flash Vision API with a base64-encoded image.
 * Returns { score, reason } or throws on error.
 */
async function evaluatePhoto(imageBase64) {
  if (geminiCallCount >= GEMINI_MAX_RPD) {
    throw new Error('DAILY_LIMIT_REACHED');
  }

  const prompt = `Je bent een foto-expert voor PeuterPlannen.nl, een website voor ouders met peuters.

Beoordeel deze foto op een schaal van 1-5:
1 = Logo, stockfoto, screenshot, of onbruikbaar
2 = Lage kwaliteit, wazig, slecht bijgesneden, of irrelevant
3 = Acceptabel — toont de locatie maar niet bijzonder
4 = Goed — duidelijke sfeerfoto die ouders aanspreekt
5 = Uitstekend — professionele kwaliteit, uitnodigend, toont de locatie op zijn best

Antwoord ALLEEN met: {score} {korte reden}
Voorbeeld: 4 Mooie tuin met speeltoestellen, uitnodigend licht`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/webp', data: imageBase64 } }
      ]
    }]
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  geminiCallCount++;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty Gemini response');

  // Parse "4 Mooie tuin met speeltoestellen"
  const match = text.match(/^([1-5])\s+(.+)$/s);
  if (!match) {
    // Try to extract a score digit at least
    const scoreOnly = text.match(/^([1-5])/);
    if (scoreOnly) return { score: parseInt(scoreOnly[1], 10), reason: text.slice(1).trim() || 'geen reden' };
    throw new Error(`Unexpected Gemini response: ${text}`);
  }

  return { score: parseInt(match[1], 10), reason: match[2].trim() };
}

/**
 * Process a single location photo.
 */
async function processLocation(loc, regionSlugMap) {
  const regionSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
  const locSlug = slugify(loc.name);
  const heroPath = path.join(ROOT, 'images', 'locations', regionSlug, locSlug, 'hero.webp');

  if (!fs.existsSync(heroPath)) {
    return { status: 'no-file', name: loc.name, heroPath };
  }

  let imageBase64;
  try {
    imageBase64 = fs.readFileSync(heroPath).toString('base64');
  } catch (err) {
    return { status: 'read-error', name: loc.name, error: err.message };
  }

  let score, reason;
  try {
    ({ score, reason } = await evaluatePhoto(imageBase64));
  } catch (err) {
    if (err.message === 'DAILY_LIMIT_REACHED') throw err; // Bubble up to stop loop
    return { status: 'gemini-error', name: loc.name, error: err.message };
  }

  const isRejected = score <= 2;

  if (DRY_RUN) {
    return { status: 'dry-run', name: loc.name, score, reason, wouldReject: isRejected };
  }

  // Build update payload
  const updateData = { photo_quality: score };
  if (isRejected) {
    updateData.photo_url = null;
    updateData.photo_source = 'rejected';
  }

  try {
    await sbUpdate('locations', loc.id, updateData);
  } catch (err) {
    return { status: 'db-error', name: loc.name, score, reason, error: err.message };
  }

  return { status: 'ok', name: loc.name, score, reason, rejected: isRejected };
}

async function main() {
  console.log(`\nPhoto Quality Check${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log(`Batch: ${BATCH_LIMIT}, Offset: ${OFFSET}, Max RPD: ${GEMINI_MAX_RPD}`);
  console.log(`Rate limit: ${RATE_LIMIT_MS / 1000}s between calls\n`);

  // Fetch locations with photos
  const locations = await sbFetch('locations',
    `select=id,name,region,photo_url&photo_url=not.is.null&order=name&limit=${BATCH_LIMIT}&offset=${OFFSET}`
  );
  console.log(`Found ${locations.length} locations with photos\n`);
  if (locations.length === 0) return;

  // Fetch region slug map
  const regions = await sbFetch('regions', 'select=name,slug&is_active=eq.true');
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  // Score distribution counters
  const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const stats = { ok: 0, rejected: 0, 'no-file': 0, 'gemini-error': 0, 'db-error': 0, 'read-error': 0, 'dry-run': 0 };
  let done = 0;
  let dailyLimitHit = false;

  for (const loc of locations) {
    let result;
    try {
      result = await processLocation(loc, regionSlugMap);
    } catch (err) {
      if (err.message === 'DAILY_LIMIT_REACHED') {
        dailyLimitHit = true;
        console.log(`\n\nDaily Gemini limit (${GEMINI_MAX_RPD}) reached after ${done} evaluations. Stopping.`);
        break;
      }
      result = { status: 'gemini-error', name: loc.name, error: err.message };
    }

    done++;
    stats[result.status] = (stats[result.status] || 0) + 1;

    if (result.score) {
      scoreCounts[result.score] = (scoreCounts[result.score] || 0) + 1;
    }
    if (result.rejected) stats.rejected++;

    // Log every evaluation
    const scoreLabel = result.score ? `[${result.score}]` : '[-]';
    const prefix = result.status === 'ok' && result.rejected ? 'REJECT' :
                   result.status === 'ok' ? '    ok' :
                   result.status === 'dry-run' ? '   dry' :
                   '  FAIL';
    const namePad = (result.name || '').slice(0, 42).padEnd(42);
    const reasonStr = result.reason ? ` — ${result.reason}` : result.error ? ` — ${result.error}` : '';
    console.log(`  ${prefix} ${scoreLabel} ${namePad}${reasonStr}`);

    // Rate limiting: wait between Gemini calls (skip for non-evaluated statuses)
    const usedGemini = ['ok', 'dry-run', 'db-error'].includes(result.status);
    if (usedGemini && done < locations.length && !dailyLimitHit) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Summary
  console.log('\n─────────────────────────────────────');
  console.log('Score distribution:');
  for (let s = 5; s >= 1; s--) {
    const count = scoreCounts[s] || 0;
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`  ${s}: ${String(count).padStart(4)}  ${bar}`);
  }
  console.log('\nStatus summary:');
  for (const [status, count] of Object.entries(stats)) {
    if (count > 0) console.log(`  ${status}: ${count}`);
  }
  const evaluated = done - (stats['no-file'] || 0) - (stats['read-error'] || 0) - (stats['gemini-error'] || 0);
  console.log(`\nTotal locations processed: ${done}/${locations.length}`);
  console.log(`Photos evaluated by Gemini: ${geminiCallCount}`);
  if (!DRY_RUN) {
    console.log(`Photos rejected (score 1-2): ${stats.rejected || 0}`);
  }
  if (dailyLimitHit) {
    console.log(`\nNote: stopped early due to daily API limit. Re-run with OFFSET=${OFFSET + done} to continue.`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
