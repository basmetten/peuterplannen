#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const {
  PROJECT_ROOT,
  parseArgs,
  finishAuditRun,
} = require('./audit_alcohol_common');

function mapLimit(items, limit, mapper) {
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await mapper(item);
    }
  });
  return Promise.all(workers);
}

function sanitizeText(value) {
  if (value == null) return null;
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const runDir = path.resolve(args['run-dir'] || '');
  const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
  const concurrency = Math.max(1, Number(args.concurrency || 6));
  if (!runDir) throw new Error('Usage: node audit_alcohol_apply.js --run-dir=<dir> [--dry-run]');

  const db = createSupabaseClient(PROJECT_ROOT);
  const metadata = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata.json'), 'utf8'));
  const rows = fs.readFileSync(path.join(runDir, 'results.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const applyRows = rows.filter((row) => row.decision === 'true' || row.decision === 'false' || row.decision === 'needs_review');

  const applied = [];
  const failures = [];

  await mapLimit(applyRows, concurrency, async (row) => {
    try {
      if (dryRun) {
        applied.push({ location_id: row.location_id, updated: row.new_alcohol !== null && row.new_alcohol !== row.old_alcohol, dry_run: true, decision: row.decision });
        return;
      }
      const result = await db.rest('rpc/apply_location_alcohol_audit_result', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
          p_run_id: metadata.db_run_id,
          p_location_id: Number(row.location_id),
          p_decision: row.decision,
          p_confidence: row.confidence,
          p_evidence_source_type: sanitizeText(row.evidence_source_type),
          p_evidence_url: sanitizeText(row.evidence_url),
          p_evidence_snippet: sanitizeText(row.evidence_snippet),
          p_reason_short: sanitizeText(row.reason_short) || 'Alcohol audit result',
          p_reason_long: sanitizeText(row.reason_long),
          p_applied_by: 'codex-alcohol-audit',
        },
      });
      applied.push(Array.isArray(result) ? result[0] : result);
    } catch (error) {
      failures.push({ location_id: row.location_id, error: String(error.message || error) });
    }
  });

  const summary = {
    total_results: rows.length,
    attempted: applyRows.length,
    updated: applied.filter((row) => row && row.updated).length,
    unchanged: applied.filter((row) => row && row.updated === false).length,
    failed: failures.length,
    dry_run: dryRun,
  };

  fs.writeFileSync(path.join(runDir, 'applied.json'), JSON.stringify({ summary, applied, failures }, null, 2), 'utf8');

  if (!dryRun && metadata.db_run_id) {
    await finishAuditRun(db, metadata.db_run_id, {
      status: failures.length ? 'partial' : 'completed',
      summaryJson: summary,
    });
  }

  console.log(JSON.stringify({ ok: failures.length === 0, run_dir: runDir, summary }, null, 2));
  if (failures.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
