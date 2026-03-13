#!/usr/bin/env node
// Stap 3: Herbeordeel needs_review kandidaten voor specifieke runs definitief.
// Geen needs_review als uitkomst — alleen approved of rejected.
// Goedgekeurde kandidaten worden direct gepromoveerd naar de locations-tabel.
//
// Usage:
//   node resolve_needs_review.js --run=c2052431 --region=Amsterdam
//   node resolve_needs_review.js --run=a9b0a5b0 --region=Amersfoort
//   node resolve_needs_review.js --run=c2052431 --region=Amsterdam --dry-run

(function loadAnthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const fs = require('fs');
  const path = require('path');
  try {
    const envPath = path.resolve(__dirname, '..', '..', '.supabase_env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)/);
      if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim().replace(/^['"]|['"]$/g, ''); return; }
    }
  } catch (_) {}
})();

const path = require('path');
const {
  parseArgs,
  DEFAULT_MODEL,
  SCORING_PROMPT_VERSION,
  hasHardRejectSignal,
  normalizeName,
  haversineMeters,
  mapLimit,
} = require('./config');
const { createSupabaseClient } = require('./db');

const args = parseArgs(process.argv.slice(2));
const runId = args.run;
const regionRoot = args.region;
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const model = args.model || DEFAULT_MODEL;
const CONCURRENCY = Number(process.env.PIPELINE_SCORE_CONCURRENCY || '15');
const TIMEOUT_MS = 90000;

if (!runId || !regionRoot) {
  console.error('Usage: resolve_needs_review.js --run=<run_id> --region=<region> [--dry-run]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..', '..');

// ── Prompt ──────────────────────────────────────────────────────────────────

function buildFinalPrompt(candidate) {
  const evidence = candidate.enriched_signals || {};
  return [
    'Beoordeel deze Nederlandse locatie voor ouders met peuters/kleuters (1-4 jaar).',
    'Geef een DEFINITIEF oordeel — alleen "approved" of "rejected", GEEN "needs_review".',
    'Geef ALLEEN geldige JSON:',
    '{is_suitable:boolean,score_10:int(0-10),confidence:number(0-1),decision:"approved"|"rejected",reason_short:string,reasons:string[],risk_flags:string[],derived_fields:{has_kids_menu:boolean|null,has_play_area:boolean|null,has_high_chairs:boolean|null,has_diaper_changing:boolean|null,play_area_quality:"none|basic|significant"|null,weather:"indoor|outdoor|both|hybrid"|null,description:string|null,toddler_highlight:string|null,is_pancake_restaurant:boolean|null}}',
    '',
    `Naam: ${candidate.name || ''}`,
    `Amenity: ${candidate.amenity || ''}`,
    `Cuisine: ${candidate.cuisine || ''}`,
    `Adres: ${[candidate.address, candidate.city, regionRoot].filter(Boolean).join(', ')}`,
    `Website: ${candidate.website || ''}`,
    `Signalen: ${JSON.stringify(evidence)}`,
    '',
    'Regels:',
    '- Twijfel telt als "rejected" — alleen approved als er concreet bewijs is.',
    '- approved: is_suitable=true, score>=7, concreet bewijs van kindvriendelijkheid.',
    '- rejected: alles wat niet overduidelijk geschikt is voor peuters.',
    '- Max 5 reasons, kort en feitelijk.',
  ].join('\n');
}

// ── API call ─────────────────────────────────────────────────────────────────

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  try { return JSON.parse(trimmed); } catch { /* */ }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('Geen JSON gevonden');
}

function validateAndNormalize(raw) {
  if (typeof raw !== 'object' || !raw) throw new Error('Response moet object zijn');
  const score = Number(raw.score_10);
  const confidence = Number(raw.confidence);
  if (!Number.isInteger(score) || score < 0 || score > 10) throw new Error('Ongeldige score_10');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('Ongeldige confidence');
  // Forceer definitief besluit
  const decision = raw.decision === 'approved' ? 'approved' : 'rejected';
  const derived = raw.derived_fields && typeof raw.derived_fields === 'object' ? raw.derived_fields : {};
  return {
    is_suitable: Boolean(raw.is_suitable),
    score_10: score,
    confidence,
    decision,
    reason_short: String(raw.reason_short || '').slice(0, 280),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map((v) => String(v).slice(0, 220)).slice(0, 5) : [],
    risk_flags: Array.isArray(raw.risk_flags) ? raw.risk_flags.map((v) => String(v).slice(0, 80)).slice(0, 8) : [],
    derived_fields: {
      has_kids_menu: typeof derived.has_kids_menu === 'boolean' ? derived.has_kids_menu : null,
      has_play_area: typeof derived.has_play_area === 'boolean' ? derived.has_play_area : null,
      has_high_chairs: typeof derived.has_high_chairs === 'boolean' ? derived.has_high_chairs : null,
      has_diaper_changing: typeof derived.has_diaper_changing === 'boolean' ? derived.has_diaper_changing : null,
      play_area_quality: ['none', 'basic', 'significant'].includes(derived.play_area_quality) ? derived.play_area_quality : null,
      weather: ['indoor', 'outdoor', 'both', 'hybrid'].includes(derived.weather) ? derived.weather : null,
      description: derived.description ? String(derived.description).slice(0, 800) : null,
      toddler_highlight: derived.toddler_highlight ? String(derived.toddler_highlight).slice(0, 240) : null,
      is_pancake_restaurant: typeof derived.is_pancake_restaurant === 'boolean' ? derived.is_pancake_restaurant : null,
    },
  };
}

async function callAnthropic({ prompt }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet gevonden');

  const deadline = Date.now() + TIMEOUT_MS;
  let attempt = 0;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Timeout');

    const controller = new AbortController();
    const killTimer = setTimeout(() => controller.abort(), remaining);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        const retryAfter = Number(res.headers.get('retry-after') || '0');
        const waitMs = Math.max(retryAfter * 1000, Math.min(2000 * Math.pow(2, attempt), 30000));
        attempt++;
        if (Date.now() + waitMs > deadline) throw new Error('Rate limit, geen tijd meer');
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = await res.json();
      return extractJsonObject(data.content?.[0]?.text || '');
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Timeout (aborted)');
      throw err;
    } finally {
      clearTimeout(killTimer);
    }
  }
}

// ── Promote helpers (inline, gebaseerd op promote_locations.js) ──────────────

function normalizeWeather(value) {
  if (!value) return 'indoor';
  if (value === 'hybrid') return 'both';
  if (['indoor', 'outdoor', 'both'].includes(value)) return value;
  return 'indoor';
}

function inferType(candidate, review) {
  if (review?.derived_fields?.is_pancake_restaurant === true) return 'pancake';
  if (/pannenkoek|pancake/i.test(candidate.name || '')) return 'pancake';
  return 'horeca';
}

function findNameGeoDuplicate(existingRows, candidate) {
  if (!candidate.name) return null;
  const cName = normalizeName(candidate.name);
  if (!cName) return null;
  for (const row of existingRows) {
    if (normalizeName(row.name) !== cName) continue;
    const dist = haversineMeters(candidate.lat, candidate.lng, Number(row.lat), Number(row.lng));
    if (dist <= 120) return row;
  }
  return null;
}

function buildInsertRow({ candidate, review }) {
  const signals = candidate.enriched_signals || {};
  const derived = review.derived_fields || {};
  const today = new Date().toISOString().slice(0, 10);

  return {
    name: candidate.name,
    region: regionRoot,
    type: inferType(candidate, review),
    description: derived.description || candidate.description
      || `${candidate.name} is beoordeeld als geschikte locatie voor ouders met peuters en kleuters.`,
    website: candidate.website || null,
    lat: candidate.lat || null,
    lng: candidate.lng || null,
    coffee: true,
    diaper: derived.has_diaper_changing === true,
    alcohol: candidate.amenity === 'restaurant',
    weather: normalizeWeather(derived.weather || (candidate.enriched_signals || {}).weather),
    toddler_highlight: derived.toddler_highlight || review.reason_short || null,
    place_id: signals.google_place_id || null,
    verification_source: 'osm_ai_pipeline',
    last_verified: today,
    last_verified_at: new Date().toISOString(),
    ai_suitability_score_10: review.score_10,
    ai_suitability_confidence: review.confidence,
    ai_reviewed_at: new Date().toISOString(),
    ai_review_model: model,
    ai_review_version: SCORING_PROMPT_VERSION,
    ai_review_status: review.decision,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const db = createSupabaseClient(projectRoot);

  console.log(`=== resolve_needs_review ===`);
  console.log(`Run: ${runId} | Regio: ${regionRoot} | Model: ${model} | Dry run: ${dryRun}`);

  // Ophalen needs_review kandidaten
  const candidates = await db.getCandidatesByRun(runId, ['needs_review']);
  console.log(`Gevonden: ${candidates.length} needs_review kandidaten`);

  if (candidates.length === 0) {
    console.log('Niets te doen.');
    return;
  }

  if (dryRun) {
    console.log('[DRY RUN] Eerste 10:');
    candidates.slice(0, 10).forEach((c) => console.log(`  id=${c.id} ${c.name}`));
    console.log('[DRY RUN] Geen wijzigingen gemaakt.');
    return;
  }

  // Ophalen bestaande locaties voor deduplicatie
  const existingRows = await db.getLocationsByRegion(regionRoot);
  console.log(`Bestaande locaties in regio: ${existingRows.length}`);

  const stats = { approved: 0, rejected: 0, promoted: 0, inserted: 0, updated: 0, errors: 0 };
  let done = 0;

  await mapLimit(candidates, CONCURRENCY, async (candidate) => {
    try {
      // Hard-reject check
      const hardReject = hasHardRejectSignal(`${candidate.name || ''} ${candidate.amenity || ''}`);
      if (hardReject) {
        await db.patchCandidate(candidate.id, { status: 'rejected', last_error: 'hard_reject_filter' });
        stats.rejected++;
        done++;
        return;
      }

      // API-call
      let review;
      try {
        const raw = await callAnthropic({ prompt: buildFinalPrompt(candidate) });
        review = validateAndNormalize(raw);
      } catch (err) {
        // Bij parse-fout: definitief rejected
        review = {
          is_suitable: false, score_10: 0, confidence: 0, decision: 'rejected',
          reason_short: `parse_error: ${err.message}`.slice(0, 280),
          reasons: [], risk_flags: ['parse_or_model_error'],
          derived_fields: { has_kids_menu: null, has_play_area: null, has_high_chairs: null,
            has_diaper_changing: null, play_area_quality: null, weather: null,
            description: null, toddler_highlight: null, is_pancake_restaurant: null },
        };
      }

      // Review opslaan
      await db.insertReview({
        candidate_id: candidate.id,
        existing_location_id: candidate.existing_location_id || null,
        model,
        prompt_version: SCORING_PROMPT_VERSION,
        score_10: review.score_10,
        confidence: review.confidence,
        is_suitable: review.is_suitable,
        decision: review.decision,
        reason_short: review.reason_short,
        reasons_json: review.reasons,
        risk_flags: review.risk_flags,
        derived_fields: review.derived_fields,
        raw_json: review,
      });

      if (review.decision === 'rejected' || !review.is_suitable || review.score_10 < 7 || review.confidence < 0.6) {
        await db.patchCandidate(candidate.id, { status: 'rejected', last_error: null });
        stats.rejected++;
        done++;
        return;
      }

      // Approved — promoveer
      stats.approved++;

      // Deduplicatie
      let existing = null;
      const placeId = candidate.enriched_signals?.google_place_id;
      if (placeId) existing = await db.findLocationByPlaceId(placeId);
      if (!existing) existing = findNameGeoDuplicate(existingRows, candidate);

      if (existing) {
        // Update bestaande locatie
        const patch = {
          ai_suitability_score_10: review.score_10,
          ai_suitability_confidence: review.confidence,
          ai_reviewed_at: new Date().toISOString(),
          ai_review_model: model,
          ai_review_version: SCORING_PROMPT_VERSION,
          ai_review_status: review.decision,
          verification_source: 'osm_ai_pipeline',
          last_verified: new Date().toISOString().slice(0, 10),
          last_verified_at: new Date().toISOString(),
        };
        await db.patchLocation(existing.id, patch);
        await db.patchCandidate(candidate.id, { status: 'promoted', existing_location_id: existing.id, last_error: null });
        stats.promoted++;
        stats.updated++;
      } else {
        // Insert nieuwe locatie
        const row = buildInsertRow({ candidate, review });
        const inserted = await db.insertLocation(row);
        if (inserted) existingRows.push(inserted);
        await db.patchCandidate(candidate.id, {
          status: 'promoted',
          existing_location_id: inserted?.id || null,
          last_error: null,
        });
        stats.promoted++;
        stats.inserted++;
      }

      done++;
      if (done % 25 === 0 || done === candidates.length) {
        console.log(`  ${done}/${candidates.length} — approved=${stats.approved}, rejected=${stats.rejected}, promoted=${stats.promoted}`);
      }
    } catch (err) {
      console.error(`  Fout bij candidate id=${candidate.id}: ${err.message}`);
      stats.errors++;
      done++;
      try {
        await db.patchCandidate(candidate.id, { status: 'needs_review', last_error: err.message.slice(0, 200) });
      } catch (_) {}
    }
  });

  console.log('\n=== Klaar ===');
  console.log(JSON.stringify(stats, null, 2));
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
