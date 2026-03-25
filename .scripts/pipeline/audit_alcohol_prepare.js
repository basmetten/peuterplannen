#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const {
  PROJECT_ROOT,
  OUTPUT_ROOT,
  parseArgs,
  ensureDir,
  runSlug,
  writeCsv,
  classifyTier,
  compareByPriorityThenName,
  listAllLocations,
  createAuditRun,
} = require('./audit_alcohol_common');

function coerceInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const db = createSupabaseClient(PROJECT_ROOT);
  const pilotTierA = coerceInt(args['pilot-tier-a'], 0);
  const limit = coerceInt(args.limit, 0);
  const batchSize = Math.max(10, coerceInt(args['batch-size'], 50));
  const agentCount = Math.max(1, coerceInt(args['agent-count'], 16));
  const explicitScope = String(args.scope || 'all');
  const runName = args.run || runSlug('alcohol-audit');
  const runDir = path.join(OUTPUT_ROOT, runName);
  const batchesDir = path.join(runDir, 'batches');

  ensureDir(runDir);
  ensureDir(batchesDir);

  const locations = await listAllLocations(db);
  const candidates = locations.map((location) => ({
    location_id: String(location.id),
    name: location.name || '',
    region: location.region || '',
    type: location.type || '',
    website: location.website || '',
    description: location.description || '',
    current_alcohol: location.alcohol === true ? 'true' : 'false',
    seo_primary_locality: location.seo_primary_locality || '',
    priority: classifyTier(location),
    claimed_by_user_id: location.claimed_by_user_id || '',
    last_owner_update: location.last_owner_update || '',
    last_verified_at: location.last_verified_at || '',
  }));

  let selected = candidates;
  let scope = explicitScope;
  if (pilotTierA > 0) {
    selected = candidates.filter((row) => row.priority === 'A').slice(0, pilotTierA);
    scope = `pilot-tier-a-${pilotTierA}`;
  } else if (explicitScope !== 'all') {
    const wanted = new Set(explicitScope.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean));
    selected = candidates.filter((row) => wanted.has(row.priority));
  }
  if (limit > 0) {
    selected = selected.slice(0, limit);
    scope = `${scope}-limit-${limit}`;
  }
  selected.sort(compareByPriorityThenName);

  const counts = selected.reduce((acc, row) => {
    acc[row.priority] = (acc[row.priority] || 0) + 1;
    return acc;
  }, {});

  const dbRun = await createAuditRun(db, {
    scope,
    agentCount,
    summaryJson: {
      candidate_count: selected.length,
      tier_counts: counts,
      batch_size: batchSize,
      prepared_at: new Date().toISOString(),
    },
  });

  const metadata = {
    run_name: runName,
    run_dir: runDir,
    db_run_id: dbRun?.id || null,
    scope,
    candidate_count: selected.length,
    tier_counts: counts,
    batch_size: batchSize,
    agent_count: agentCount,
    prepared_at: new Date().toISOString(),
  };

  writeCsv(path.join(runDir, 'candidates.csv'), selected, [
    'location_id',
    'name',
    'region',
    'type',
    'website',
    'description',
    'current_alcohol',
    'seo_primary_locality',
    'priority',
    'claimed_by_user_id',
    'last_owner_update',
    'last_verified_at',
  ]);
  fs.writeFileSync(path.join(runDir, 'candidates.json'), JSON.stringify(selected, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  for (let i = 0; i < selected.length; i += batchSize) {
    const batchRows = selected.slice(i, i + batchSize);
    const batchFile = path.join(batchesDir, `batch-${String(i / batchSize).padStart(3, '0')}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batchRows, null, 2), 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    run_dir: runDir,
    db_run_id: metadata.db_run_id,
    candidate_count: selected.length,
    tier_counts: counts,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
