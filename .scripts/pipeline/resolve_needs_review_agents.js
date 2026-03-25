#!/usr/bin/env node
// Stap 3 (Agent SDK versie): Herbeordeel needs_review kandidaten definitief via subagents.
// Orchestrator spawnt parallelle reviewer-subagents per batch.
// Goedgekeurde kandidaten worden gepromoveerd naar de locations-tabel.
//
// Usage:
//   node resolve_needs_review_agents.js --run=c2052431 --region=Amsterdam
//   node resolve_needs_review_agents.js --run=a9b0a5b0 --region=Amersfoort [--dry-run] [--batch-size=30]

const fs = require('fs');
const path = require('path');
const os = require('os');
const { query } = require('@anthropic-ai/claude-agent-sdk');
const { parseArgs, DEFAULT_MODEL, SCORING_PROMPT_VERSION, hasHardRejectSignal, normalizeName, haversineMeters } = require('./config');
const { createSupabaseClient } = require('./db');

// ── Config ────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const runId = args.run;
const regionRoot = args.region;
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const model = args.model || DEFAULT_MODEL;
const batchSize = Number(args['batch-size'] || 30);
const projectRoot = path.resolve(__dirname, '..', '..');

if (!runId || !regionRoot) {
  console.error('Usage: resolve_needs_review_agents.js --run=<run_id> --region=<region> [--dry-run]');
  process.exit(1);
}

// ── Reviewer subagent prompt ───────────────────────────────────────────────────

const REVIEWER_SYSTEM_PROMPT = `Je bent een expert die Nederlandse locaties definitief beoordeelt voor ouders met peuters/kleuters (1-4 jaar).

Je geeft altijd een DEFINITIEF oordeel: "approved" of "rejected" — NOOIT "needs_review".
Twijfel telt als "rejected" — alleen approved als er concreet bewijs is van kindvriendelijkheid.

approved criteria (minstens één):
- Speelhoek, binnenspeeltuin, ballenbak of speelruimte
- Kindermenu én iets bijzonders (thema, sfeer, bijzondere locatie)
- Pannenkoeken- of poffertjesrestaurant
- Boerderijcafé, parkcafé, theehuis
- Dierentuin, kinderboerderij, museum voor kinderen, speelpark
- Sterk bewijs van kindvriendelijkheid (meerdere positieve signalen)

rejected (altijd verwijderen):
- Coffeeshop, bar, nachtclub, casino
- Generiek fastfood zonder speciaal kinderaspect
- Kantinea, bedrijfsrestaurant
- Volwassen wellness, spa, fitnessclub
- Onvoldoende bewijs van geschiktheid voor peuters

Output per locatie: { id, decision: "approved"|"rejected", score_10, confidence, reason_short, has_play_area, toddler_highlight }`;

// ── Orchestrator prompt ───────────────────────────────────────────────────────

function buildOrchestratorPrompt(batchDir, resultsDir, totalBatches) {
  return `Je bent een orchestrator die locaties laat beoordelen door reviewer-subagents.

Er zijn ${totalBatches} batch-bestanden in: ${batchDir}
De bestanden heten batch_0.json t/m batch_${totalBatches - 1}.json

Jouw taak:
1. Spawn voor elke batch één "needs-reviewer" subagent.
   Stuur dit verzoek:
   "Lees ${batchDir}/batch_N.json. Beoordeel elke locatie definitief (approved/rejected, geen needs_review). Schrijf resultaten naar ${resultsDir}/results_N.json als JSON-array van {id, decision, score_10, confidence, reason_short, has_play_area, toddler_highlight}."
   (N = batch-nummer)

2. Je KUNT meerdere subagents parallel spawnen — doe dit voor maximale snelheid.

3. Wacht tot alle subagents klaar zijn.

4. Lees alle result-bestanden (${resultsDir}/results_0.json t/m results_${totalBatches - 1}.json).

5. Combineer alle arrays tot één en schrijf naar: ${resultsDir}/all_results.json

6. Rapporteer: hoeveel approved, hoeveel rejected, totaal verwerkt.

Begin nu.`;
}

// ── Promote helpers ───────────────────────────────────────────────────────────

function normalizeWeather(value) {
  if (!value) return 'indoor';
  if (value === 'hybrid') return 'both';
  if (['indoor', 'outdoor', 'both'].includes(value)) return value;
  return 'indoor';
}

function inferType(candidate) {
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

async function promoteCandidate(db, candidate, reviewResult, existingRows) {
  const today = new Date().toISOString().slice(0, 10);
  const aiPatch = {
    ai_suitability_score_10: reviewResult.score_10 || 7,
    ai_suitability_confidence: reviewResult.confidence || 0.7,
    ai_reviewed_at: new Date().toISOString(),
    ai_review_model: model,
    ai_review_version: SCORING_PROMPT_VERSION,
    ai_review_status: 'approved',
  };

  // Deduplicatie
  let existing = null;
  const placeId = candidate.enriched_signals?.google_place_id;
  if (placeId) existing = await db.findLocationByPlaceId(placeId);
  if (!existing) existing = findNameGeoDuplicate(existingRows, candidate);

  if (existing) {
    await db.patchLocation(existing.id, { ...aiPatch, verification_source: 'osm_ai_pipeline', last_verified: today, last_verified_at: new Date().toISOString() });
    await db.patchCandidate(candidate.id, { status: 'promoted', existing_location_id: existing.id, last_error: null });
    return { action: 'updated', locationId: existing.id };
  }

  const row = {
    name: candidate.name,
    region: regionRoot,
    type: inferType(candidate),
    description: candidate.description || `${candidate.name} is beoordeeld als geschikte locatie voor ouders met peuters en kleuters.`,
    website: candidate.website || null,
    lat: candidate.lat || null,
    lng: candidate.lng || null,
    coffee: true,
    diaper: reviewResult.has_play_area === true,
    alcohol: candidate.amenity === 'restaurant',
    weather: normalizeWeather((candidate.enriched_signals || {}).weather),
    toddler_highlight: reviewResult.toddler_highlight || reviewResult.reason_short || null,
    place_id: (candidate.enriched_signals || {}).google_place_id || null,
    verification_source: 'osm_ai_pipeline',
    last_verified: today,
    last_verified_at: new Date().toISOString(),
    ...aiPatch,
  };

  const inserted = await db.insertLocation(row);
  if (inserted) existingRows.push(inserted);
  await db.patchCandidate(candidate.id, { status: 'promoted', existing_location_id: inserted?.id || null, last_error: null });
  return { action: 'inserted', locationId: inserted?.id };
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const db = createSupabaseClient(projectRoot);

  console.log('=== resolve_needs_review_agents (Agent SDK) ===');
  console.log(`Run: ${runId} | Regio: ${regionRoot} | Dry run: ${dryRun}`);

  // Ophalen needs_review kandidaten
  const candidates = await db.getCandidatesByRun(runId, ['needs_review']);
  console.log(`Gevonden: ${candidates.length} needs_review kandidaten`);

  if (candidates.length === 0) {
    console.log('Niets te doen.');
    return;
  }

  // Hard-reject filter direct afhandelen
  const hardRejected = [];
  const toReview = [];
  for (const c of candidates) {
    if (hasHardRejectSignal(`${c.name || ''} ${c.amenity || ''}`)) {
      hardRejected.push(c);
    } else {
      toReview.push(c);
    }
  }

  if (!dryRun && hardRejected.length > 0) {
    console.log(`Hard-reject filter: ${hardRejected.length} kandidaten direct rejected`);
    for (const c of hardRejected) {
      await db.patchCandidate(c.id, { status: 'rejected', last_error: 'hard_reject_filter' });
    }
  }

  if (dryRun) {
    console.log('[DRY RUN] Te beoordelen via agents:', toReview.length);
    console.log('[DRY RUN] Eerste 5:');
    toReview.slice(0, 5).forEach((c) => console.log(`  id=${c.id} ${c.name}`));
    console.log('[DRY RUN] Geen agents gestart.');
    return;
  }

  if (toReview.length === 0) {
    console.log('Niets te beoordelen (alle gefilterd door hard-reject).');
    return;
  }

  // Ophalen bestaande locaties voor deduplicatie
  const existingRows = await db.getLocationsByRegion(regionRoot);
  console.log(`Bestaande locaties in regio: ${existingRows.length}`);

  // Schrijf batches naar temp dir
  const sessionId = `${Date.now()}`;
  const batchDir = path.join(os.tmpdir(), `needs_review_batches_${sessionId}`);
  const resultsDir = path.join(os.tmpdir(), `needs_review_results_${sessionId}`);
  fs.mkdirSync(batchDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });

  // Schrijf kandidaten als batch (alleen de info die de reviewer nodig heeft)
  const batches = [];
  for (let i = 0; i < toReview.length; i += batchSize) {
    const batch = toReview.slice(i, i + batchSize).map((c) => ({
      id: c.id,
      name: c.name,
      amenity: c.amenity,
      cuisine: c.cuisine,
      address: c.address,
      city: c.city,
      website: c.website,
      description: c.description,
      enriched_signals: c.enriched_signals || {},
    }));
    const batchFile = path.join(batchDir, `batch_${batches.length}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2), 'utf8');
    batches.push(batchFile);
  }

  console.log(`${batches.length} batches aangemaakt in ${batchDir}`);
  console.log('Agent SDK orchestrator starten...\n');

  const orchestratorPrompt = buildOrchestratorPrompt(batchDir, resultsDir, batches.length);

  for await (const message of query({
    prompt: orchestratorPrompt,
    options: {
      cwd: projectRoot,
      allowedTools: ['Read', 'Write', 'Agent'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 60,
      agents: {
        'needs-reviewer': {
          description: 'Beoordeelt definitief een batch needs_review kandidaten (approved/rejected, GEEN needs_review). Leest een batch JSON-bestand en schrijft beslissingen naar een output-bestand.',
          prompt: REVIEWER_SYSTEM_PROMPT,
          tools: ['Read', 'Write'],
        },
      },
    },
  })) {
    if ('result' in message) {
      console.log('\n--- Orchestrator klaar ---');
      console.log(message.result);
    }
  }

  // Lees gecombineerde resultaten
  const allResultsFile = path.join(resultsDir, 'all_results.json');
  if (!fs.existsSync(allResultsFile)) {
    console.error('all_results.json niet gevonden — orchestrator heeft mogelijk niet alle batches gecombineerd.');
    console.log(`Controleer bestanden in: ${resultsDir}`);
    return;
  }

  const allResults = JSON.parse(fs.readFileSync(allResultsFile, 'utf8'));
  const resultById = new Map(allResults.map((r) => [r.id, r]));

  console.log(`\nResultaten verwerken: ${allResults.length} beoordeeld`);

  // Promoveer goedgekeurde kandidaten
  const stats = { approved: 0, rejected: 0, promoted: 0, inserted: 0, updated: 0, errors: 0 };

  for (const candidate of toReview) {
    const result = resultById.get(candidate.id);
    if (!result) {
      console.warn(`  Geen resultaat voor candidate ${candidate.id} — needs_review laten staan`);
      continue;
    }

    try {
      if (result.decision !== 'approved') {
        await db.patchCandidate(candidate.id, { status: 'rejected', last_error: null });
        stats.rejected++;
        continue;
      }

      stats.approved++;
      const { action } = await promoteCandidate(db, candidate, result, existingRows);
      stats.promoted++;
      if (action === 'inserted') stats.inserted++;
      else stats.updated++;
    } catch (err) {
      console.error(`  Fout bij candidate ${candidate.id}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log('\n=== Klaar ===');
  console.log(JSON.stringify(stats, null, 2));

  // Opruimen
  try {
    fs.rmSync(batchDir, { recursive: true, force: true });
    fs.rmSync(resultsDir, { recursive: true, force: true });
  } catch (_) {}
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
