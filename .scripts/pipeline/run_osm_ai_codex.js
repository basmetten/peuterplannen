#!/usr/bin/env node

const path = require('path');
const {
  parseArgs,
  resolveRegionSet,
  mapToRootRegion,
  DEFAULT_MODEL,
} = require('./config');
const { createSupabaseClient } = require('./db');
const { discoverOSMCandidates } = require('./discover_osm');
const { enrichCandidates } = require('./enrich_sources');
const { scoreCandidatesViaCodex } = require('./score_workers_codex_cli');
const { promoteCandidates } = require('./promote_locations');
const { dispatchDataChanged } = require('./dispatch_data_changed');

function parseBool(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true) return true;
  const v = String(value).toLowerCase();
  return ['1', 'true', 'yes', 'y'].includes(v);
}

function parseIntArg(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');

  const regionRoot = args.region || 'Utrecht';
  const withSurroundings = parseBool(args['with-surroundings'], true);
  const dryRun = parseBool(args['dry-run'], false);
  const model = args.model || DEFAULT_MODEL;
  const maxCandidates = parseIntArg(args.limit, null);

  const scoreThreshold = parseIntArg(args['score-threshold'], 8);
  const confidenceThreshold = Number(args['confidence-threshold'] ?? 0.7);

  const sourceRegions = resolveRegionSet(regionRoot, withSurroundings);
  const normalizedRoot = mapToRootRegion(regionRoot);

  const db = createSupabaseClient(projectRoot);

  console.log('=== OSM AI Pipeline (Codex CLI) ===');
  console.log(`Region root: ${normalizedRoot}`);
  console.log(`Source regions: ${sourceRegions.join(', ')}`);
  console.log(`Model: ${model}`);
  console.log(`Dry run: ${dryRun}`);

  await db.markStaleRunningRunsFailed(normalizedRoot);

  const run = await db.createIngestionRun({
    runType: 'ingest',
    regionRoot: normalizedRoot,
    withSurroundings,
  });

  const runId = run.id;
  const stats = {
    discovered: 0,
    upserted: 0,
    scored: 0,
    promoted: 0,
    inserted: 0,
    updated: 0,
    approved: 0,
    rejected: 0,
    needs_review: 0,
  };

  try {
    console.log('\n[1/4] Discovering OSM candidates...');
    const discovered = await discoverOSMCandidates({
      regionRoot: normalizedRoot,
      sourceRegions,
      runId,
    });

    stats.discovered = discovered.length;
    console.log(`Discovered: ${stats.discovered}`);

    console.log('\n[2/4] Upserting candidates...');
    const upserted = await db.upsertCandidates(discovered);
    let candidates = upserted.filter((c) => c.status === 'new');

    if (maxCandidates && maxCandidates > 0) {
      candidates = candidates.slice(0, maxCandidates);
    }

    stats.upserted = upserted.length;
    console.log(`Upserted: ${stats.upserted}, queued for scoring: ${candidates.length}`);

    if (candidates.length === 0) {
      await db.finishIngestionRun(runId, {
        status: 'done',
        stats,
        errorText: null,
      });
      console.log('No candidates to score. Done.');
      return;
    }

    console.log('\n[3/4] Enriching sources...');
    await enrichCandidates({
      db,
      candidates,
      googleKey: null,
    });

    const freshCandidates = await db.getCandidatesByRun(runId, ['new']);
    const scoringPool = maxCandidates && maxCandidates > 0
      ? freshCandidates.slice(0, maxCandidates)
      : freshCandidates;

    console.log(`[3b/4] Scoring via Codex CLI (${scoringPool.length} candidates, concurrency=${process.env.PIPELINE_SCORE_CONCURRENCY || '20'})...`);
    const { summary } = await scoreCandidatesViaCodex({
      db,
      candidates: scoringPool,
      model,
    });

    stats.scored = summary.total;
    stats.approved = summary.approved;
    stats.rejected = summary.rejected;
    stats.needs_review = summary.needs_review;

    console.log(`Scored: ${summary.total} (approved=${summary.approved}, rejected=${summary.rejected}, needs_review=${summary.needs_review})`);

    console.log('\n[4/4] Promoting approved candidates...');
    const promo = await promoteCandidates({
      db,
      runId,
      regionRoot: normalizedRoot,
      model,
      scoreThreshold,
      confidenceThreshold,
      dryRun,
    });

    stats.promoted = promo.promoted;
    stats.inserted = promo.inserted;
    stats.updated = promo.updated;

    console.log(`Promoted: ${promo.promoted} (inserted=${promo.inserted}, updated=${promo.updated})`);

    await db.finishIngestionRun(runId, {
      status: 'done',
      stats,
      errorText: null,
    });

    if (!dryRun && Number(promo.inserted || 0) + Number(promo.updated || 0) > 0) {
      try {
        const result = await dispatchDataChanged({
          source: 'run_osm_ai_codex',
          summary: {
            region: normalizedRoot,
            promoted: Number(promo.promoted || 0),
            inserted: Number(promo.inserted || 0),
            updated: Number(promo.updated || 0),
          },
        });
        if (result.skipped) {
          console.warn(`Repository dispatch skipped (${result.reason}).`);
        } else {
          console.log('Repository dispatch sent (data-changed).');
        }
      } catch (dispatchErr) {
        console.warn(`Repository dispatch failed: ${dispatchErr.message}`);
      }
    }

    console.log('\nRun complete.');
    console.log(JSON.stringify({ run_id: runId, stats }, null, 2));
  } catch (err) {
    await db.finishIngestionRun(runId, {
      status: 'failed',
      stats,
      errorText: err.message || String(err),
    });
    throw err;
  }
}

main().catch((err) => {
  console.error('Pipeline failed:', err.message || err);
  process.exit(1);
});
