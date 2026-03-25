#!/usr/bin/env node
/**
 * PeuterPlannen — OSM intake + AI scoring pipeline
 *
 * Usage:
 *   node .scripts/discover_horeca.js --region="Amsterdam" --with-surroundings --model="gpt-5.1-codex-mini"
 *   node .scripts/discover_horeca.js --region="Amsterdam" --with-surroundings --reaudit
 */

const { mkdirSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const {
  DEFAULT_MODEL,
  parseArgs,
  resolveRegionSet,
  normalizeName,
  haversineMeters,
} = require('./pipeline/config');
const { createSupabaseClient } = require('./pipeline/db');
const { discoverOSMCandidates } = require('./pipeline/discover_osm');
const { enrichCandidates } = require('./pipeline/enrich_sources');
const { scoreCandidates } = require('./pipeline/score_workers_openai');
const { promoteCandidates } = require('./pipeline/promote_locations');
const { runReauditExisting } = require('./pipeline/reaudit_existing');
const { dispatchDataChanged } = require('./pipeline/dispatch_data_changed');

const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'run';
}

function candidatePriority(candidate) {
  const name = String(candidate?.name || '').toLowerCase();
  const cuisine = String(candidate?.cuisine || '').toLowerCase();
  let score = 0;
  if (candidate.website) score += 2;
  if (/pannenkoek|pancake|speel|play|kids|kinder|family|gezin|boerderij|park/.test(name)) score += 6;
  if (/dessert|ice_cream|italian|french|dutch|brunch/.test(cuisine)) score += 1;
  if (candidate.amenity === 'ice_cream') score += 2;
  if (candidate.amenity === 'restaurant') score += 1;
  return score;
}

function buildExistingNameIndex(rows) {
  const index = new Map();
  for (const row of rows || []) {
    const key = normalizeName(row?.name || '');
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }
  return index;
}

function isLikelyExisting(candidate, existingByName, radiusMeters = 120) {
  const key = normalizeName(candidate?.name || '');
  if (!key) return false;
  const options = existingByName.get(key);
  if (!options || !options.length) return false;

  for (const row of options) {
    const dist = haversineMeters(
      Number(candidate.lat),
      Number(candidate.lng),
      Number(row.lat),
      Number(row.lng)
    );
    if (dist <= radiusMeters) return true;
  }
  return false;
}

function writeRunReport({ runType, regionRoot, payload }) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = nowStamp();
  const base = `${stamp}_${slugify(regionRoot)}_${runType}`;
  const jsonPath = resolve(OUTPUT_DIR, `pipeline_${base}.json`);
  const mdPath = resolve(OUTPUT_DIR, `pipeline_${base}.md`);

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const lines = [
    `# Pipeline report — ${runType}`,
    '',
    `- Region root: ${regionRoot}`,
    `- Timestamp: ${new Date().toISOString()}`,
    `- Status: ${payload.status || 'done'}`,
    '',
    '## Summary',
    '',
    '```json',
    JSON.stringify(payload.summary || payload, null, 2),
    '```',
  ];
  writeFileSync(mdPath, `${lines.join('\n')}\n`);

  return { jsonPath, mdPath };
}

async function dispatchWhenPublished({ ingestResult, regionRoot, dryRun, source }) {
  if (dryRun) return;
  const promotion = ingestResult?.summary?.promotion || {};
  const inserted = Number(promotion.inserted || 0);
  const updated = Number(promotion.updated || 0);
  const changed = inserted + updated;
  if (changed <= 0) return;

  try {
    const result = await dispatchDataChanged({
      source,
      summary: {
        region: regionRoot,
        promoted: Number(promotion.promoted || 0),
        inserted,
        updated,
      },
    });
    if (result.skipped) {
      console.warn(`Repository dispatch skipped (${result.reason}).`);
    } else {
      console.log('Repository dispatch sent (data-changed).');
    }
  } catch (err) {
    console.warn(`Repository dispatch failed: ${err.message}`);
  }
}

async function runIngest({ db, regionRoot, withSurroundings, model, dryRun, localWorkers }) {
  await db.markStaleRunningRunsFailed(regionRoot);
  const sourceRegions = resolveRegionSet(regionRoot, withSurroundings);
  const run = await db.createIngestionRun({
    runType: 'ingest',
    regionRoot,
    withSurroundings,
  });

  const summary = {
    run_id: run.id,
    region_root: regionRoot,
    source_regions: sourceRegions,
    discovered: 0,
    upserted_candidates: 0,
    skipped_likely_existing: 0,
    scored: { total: 0, approved: 0, rejected: 0, needs_review: 0 },
    promotion: {},
  };

  try {
    console.log(`Discovering OSM candidates for ${sourceRegions.length} region(s)...`);
    const discovered = await discoverOSMCandidates({
      regionRoot,
      sourceRegions,
      runId: run.id,
    });
    summary.discovered = discovered.length;
    console.log(`Discovered: ${summary.discovered}`);

    const upserted = await db.upsertCandidates(discovered);
    summary.upserted_candidates = upserted.length;
    console.log(`Candidates upserted: ${summary.upserted_candidates}`);

    const maxCandidates = Number(process.env.PIPELINE_MAX_CANDIDATES || '300');
    const freshPool = await db.getCandidatesByRun(run.id, ['new'], { limit: 6000 });
    const existingRows = await db.getLocationsByRegion(regionRoot, ['horeca', 'pancake']);
    const existingByName = buildExistingNameIndex(existingRows);

    const sortedPool = freshPool.sort((a, b) => candidatePriority(b) - candidatePriority(a));
    const nonExistingPool = sortedPool.filter((candidate) => !isLikelyExisting(candidate, existingByName));
    summary.skipped_likely_existing = Math.max(0, sortedPool.length - nonExistingPool.length);

    const sourcePool = nonExistingPool.length >= Math.ceil(maxCandidates * 0.5)
      ? nonExistingPool
      : sortedPool;

    const freshCandidates = sourcePool.slice(0, maxCandidates);
    console.log(`Candidates to enrich: ${freshCandidates.length}`);

    await enrichCandidates({
      db,
      candidates: freshCandidates,
      googleKey: db.env.GOOGLE_MAPS_KEY || null,
    });
    console.log('Enrichment complete.');

    const enrichedCandidates = await db.getCandidatesByRun(run.id, ['enriched'], { limit: maxCandidates });
    console.log(`Candidates to score: ${enrichedCandidates.length}`);
    const scoring = await scoreCandidates({
      db,
      candidates: enrichedCandidates,
      model,
      dryRun,
      localWorkers,
    });
    summary.scored = scoring.summary;
    console.log(`Scored: ${JSON.stringify(summary.scored)}`);

    summary.promotion = await promoteCandidates({
      db,
      runId: run.id,
      regionRoot,
      model,
      scoreThreshold: 8,
      confidenceThreshold: 0.7,
      dryRun,
    });
    console.log(`Promotion: ${JSON.stringify(summary.promotion)}`);

    await db.finishIngestionRun(run.id, {
      status: 'done',
      stats: summary,
    });

    return {
      status: 'done',
      summary,
    };
  } catch (err) {
    await db.finishIngestionRun(run.id, {
      status: 'failed',
      stats: summary,
      errorText: err.message,
    });
    throw err;
  }
}

async function runReaudit({ db, regionRoot, withSurroundings, model, dryRun, localWorkers }) {
  const run = await db.createIngestionRun({
    runType: 'reaudit',
    regionRoot,
    withSurroundings,
  });

  try {
    const summary = await runReauditExisting({
      db,
      runId: run.id,
      regionRoot,
      model,
      dryRun,
      localWorkers,
    });

    await db.finishIngestionRun(run.id, {
      status: 'done',
      stats: summary,
    });

    return {
      status: 'done',
      summary: { run_id: run.id, ...summary },
    };
  } catch (err) {
    await db.finishIngestionRun(run.id, {
      status: 'failed',
      errorText: err.message,
      stats: {},
    });
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const regionRoot = args.region;
  if (!regionRoot || regionRoot === 'all') {
    throw new Error('Gebruik een expliciete hoofdregio via --region="Amsterdam" (regio-voor-regio)');
  }

  const withSurroundings = args['with-surroundings'] === true;
  const reauditOnly = args.reaudit === true;
  const dryRun = args['dry-run'] === true;
  const skipAutoReaudit = args['skip-auto-reaudit'] === true;
  const localWorkers = args['local-workers'] === true;

  const model = args.model || DEFAULT_MODEL;
  if (model !== DEFAULT_MODEL) {
    throw new Error(`Alleen model ${DEFAULT_MODEL} is toegestaan`);
  }

  const db = createSupabaseClient(PROJECT_ROOT);

  console.log(`\n=== PeuterPlannen AI pipeline ===`);
  console.log(`Region root: ${regionRoot}`);
  console.log(`With surroundings: ${withSurroundings}`);
  console.log(`Mode: ${reauditOnly ? 'reaudit-only' : 'ingest+promote'}`);
  console.log(`Model: ${model}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Local workers: ${localWorkers}`);

  if (reauditOnly) {
    const reauditResult = await runReaudit({ db, regionRoot, withSurroundings, model, dryRun, localWorkers });
    const reportPaths = writeRunReport({ runType: 'reaudit', regionRoot, payload: reauditResult });
    console.log(`Reaudit complete. Report: ${reportPaths.jsonPath}`);
    return;
  }

  const ingestResult = await runIngest({ db, regionRoot, withSurroundings, model, dryRun, localWorkers });
  const ingestReport = writeRunReport({ runType: 'ingest', regionRoot, payload: ingestResult });
  console.log(`Ingest complete. Report: ${ingestReport.jsonPath}`);
  await dispatchWhenPublished({
    ingestResult,
    regionRoot,
    dryRun,
    source: 'discover_horeca',
  });

  if (!skipAutoReaudit) {
    const reauditResult = await runReaudit({ db, regionRoot, withSurroundings, model, dryRun, localWorkers });
    const reauditReport = writeRunReport({ runType: 'reaudit', regionRoot, payload: reauditResult });
    console.log(`Auto-reaudit complete. Report: ${reauditReport.jsonPath}`);
  }
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}`);
  process.exit(1);
});
