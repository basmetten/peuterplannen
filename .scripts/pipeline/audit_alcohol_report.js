#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseArgs } = require('./audit_alcohol_common');

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const runDir = path.resolve(args['run-dir'] || '');
  if (!runDir) throw new Error('Usage: node audit_alcohol_report.js --run-dir=<dir>');

  const metadata = JSON.parse(fs.readFileSync(path.join(runDir, 'metadata.json'), 'utf8'));
  const mergeSummary = JSON.parse(fs.readFileSync(path.join(runDir, 'merge-summary.json'), 'utf8'));
  const applied = fs.existsSync(path.join(runDir, 'applied.json'))
    ? JSON.parse(fs.readFileSync(path.join(runDir, 'applied.json'), 'utf8'))
    : { summary: null, applied: [], failures: [] };
  const rows = fs.readFileSync(path.join(runDir, 'results.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));

  const byRegion = {};
  const byType = {};
  for (const row of rows) {
    byRegion[row.region] = byRegion[row.region] || { total: 0, changed: 0 };
    byType[row.type] = byType[row.type] || { total: 0, changed: 0 };
    byRegion[row.region].total += 1;
    byType[row.type].total += 1;
    if (row.new_alcohol !== null && row.new_alcohol !== row.old_alcohol) {
      byRegion[row.region].changed += 1;
      byType[row.type].changed += 1;
    }
  }

  const topRegions = Object.entries(byRegion).sort((a, b) => b[1].changed - a[1].changed).slice(0, 10);
  const topTypes = Object.entries(byType).sort((a, b) => b[1].changed - a[1].changed).slice(0, 10);
  const changedExamples = rows.filter((row) => row.new_alcohol !== null && row.new_alcohol !== row.old_alcohol).slice(0, 20);

  const lines = [
    '# Alcohol audit summary',
    '',
    `- Run: \0` // placeholder stripped below
  ];

  lines[2] = '- Run: `' + metadata.run_name + '`';
  lines.push(`- Scope: ${metadata.scope}`);
  lines.push(`- Candidates: ${metadata.candidate_count}`);
  lines.push(`- Tier counts: ${Object.entries(metadata.tier_counts).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  lines.push(`- Decisions: true=${mergeSummary.true}, false=${mergeSummary.false}, needs_review=${mergeSummary.needs_review}`);
  lines.push(`- Changed rows: ${mergeSummary.changed}`);
  if (applied.summary) {
    lines.push(`- Apply summary: updated=${applied.summary.updated}, unchanged=${applied.summary.unchanged}, failed=${applied.summary.failed}`);
  }
  lines.push('');
  lines.push('## Top regions by changed rows');
  topRegions.forEach(([name, stats]) => lines.push(`- ${name}: ${stats.changed}/${stats.total}`));
  lines.push('');
  lines.push('## Top types by changed rows');
  topTypes.forEach(([name, stats]) => lines.push(`- ${name}: ${stats.changed}/${stats.total}`));
  lines.push('');
  lines.push('## Example changed locations');
  changedExamples.forEach((row) => lines.push(`- ${row.name} (${row.region}, ${row.type}): ${row.old_alcohol} -> ${row.new_alcohol} — ${row.reason_short}`));

  fs.writeFileSync(path.join(runDir, 'summary.md'), `${lines.join('\n')}\n`, 'utf8');
  console.log(path.join(runDir, 'summary.md'));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
