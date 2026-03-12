#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  parseArgs,
  parseCsv,
  normalizeBoolean,
  writeCsv,
} = require('./audit_alcohol_common');

function normalizeDecision(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['true', 'set_true', 'yes', 'alcohol_true'].includes(text)) return 'true';
  if (['false', 'set_false', 'no', 'alcohol_false'].includes(text)) return 'false';
  if (['needs_review', 'review', 'unclear', 'unknown', 'maybe'].includes(text)) return 'needs_review';
  return 'needs_review';
}

function toConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hasExplicitNegativeEvidence(sourceType, snippet, reasonShort, reasonLong) {
  const text = `${snippet || ''}`.toLowerCase();
  const source = String(sourceType || '').toLowerCase();
  const negativePatterns = [
    /no alcohol/,
    /alcohol only in /,
    /niet beschikbaar in /,
    /only available in /,
    /alcoholvrij/,
    /only soft drinks/,
    /alleen fris/,
    /aparte brasserie|separate brasserie|naastgelegen brasserie/,
    /achter brasserie/,
  ];
  return source.startsWith('official') && negativePatterns.some((pattern) => pattern.test(text));
}

function parseResultRow(raw) {
  if (raw && (raw.decision || raw.confidence || raw.evidence_url || raw.reason_short)) {
    return raw;
  }
  const payload = String(raw && raw.result_json ? raw.result_json : '').trim();
  if (!payload) return raw || {};
  try {
    const parsed = JSON.parse(payload);
    return {
      ...raw,
      ...parsed,
    };
  } catch {
    return raw || {};
  }
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const runDir = path.resolve(args['run-dir'] || '');
  const resultCsv = path.resolve(args.results || path.join(runDir, 'agent-results.csv'));
  const threshold = Number(args['confidence-threshold'] || 0.8);
  if (!runDir) throw new Error('Usage: node audit_alcohol_merge.js --run-dir=<dir> [--results=<agent-results.csv>]');

  const candidates = parseCsv(fs.readFileSync(path.join(runDir, 'candidates.csv'), 'utf8'));
  const results = parseCsv(fs.readFileSync(resultCsv, 'utf8'));
  const resultMap = new Map(results.map((row) => [String(row.location_id || row.id || row.locationId || '').trim(), row]));

  const merged = candidates.map((candidate) => {
    const raw = parseResultRow(resultMap.get(String(candidate.location_id)) || {});
    let decision = normalizeDecision(raw.decision);
    const confidence = toConfidence(raw.confidence);
    const evidenceSourceType = String(raw.evidence_source_type || '').trim();
    const evidenceUrl = String(raw.evidence_url || '').trim();
    const evidenceSnippet = String(raw.evidence_snippet || '').trim();
    const reasonShort = String(raw.reason_short || '').trim() || 'Geen agentresultaat beschikbaar';
    const reasonLong = String(raw.reason_long || '').trim();

    if (!resultMap.has(String(candidate.location_id))) {
      decision = 'needs_review';
    }
    if (decision === 'true' && (!evidenceUrl || !evidenceSnippet)) {
      decision = 'needs_review';
    }
    if ((decision === 'true' || decision === 'false') && confidence < threshold) {
      decision = 'needs_review';
    }
    if (decision === 'false' && (!evidenceSourceType || !evidenceUrl || !evidenceSnippet)) {
      decision = 'needs_review';
    }
    if (decision === 'false' && !hasExplicitNegativeEvidence(evidenceSourceType, evidenceSnippet, reasonShort, reasonLong)) {
      decision = 'needs_review';
    }

    const currentAlcohol = normalizeBoolean(candidate.current_alcohol);
    const newAlcohol = decision === 'true' ? true : decision === 'false' ? false : null;

    return {
      location_id: String(candidate.location_id),
      name: candidate.name,
      region: candidate.region,
      type: candidate.type,
      priority: candidate.priority,
      old_alcohol: currentAlcohol,
      decision,
      confidence,
      new_alcohol: newAlcohol,
      evidence_source_type: evidenceSourceType,
      evidence_url: evidenceUrl,
      evidence_snippet: evidenceSnippet,
      reason_short: reasonShort,
      reason_long: reasonLong,
      apply_recommended: newAlcohol !== null,
    };
  });

  const resultsJsonl = path.join(runDir, 'results.jsonl');
  fs.writeFileSync(resultsJsonl, `${merged.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');

  const needsReview = merged.filter((row) => row.decision === 'needs_review');
  writeCsv(path.join(runDir, 'needs-review.csv'), needsReview.map((row) => ({
    location_id: row.location_id,
    name: row.name,
    region: row.region,
    type: row.type,
    priority: row.priority,
    old_alcohol: row.old_alcohol,
    confidence: row.confidence,
    reason_short: row.reason_short,
    evidence_url: row.evidence_url,
  })), ['location_id', 'name', 'region', 'type', 'priority', 'old_alcohol', 'confidence', 'reason_short', 'evidence_url']);

  const summary = merged.reduce((acc, row) => {
    acc.total += 1;
    acc[row.decision] += 1;
    if (row.apply_recommended && row.new_alcohol !== row.old_alcohol) acc.changed += 1;
    return acc;
  }, { total: 0, true: 0, false: 0, needs_review: 0, changed: 0 });

  fs.writeFileSync(path.join(runDir, 'merge-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, run_dir: runDir, summary }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
