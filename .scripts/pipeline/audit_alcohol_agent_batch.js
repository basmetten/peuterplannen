#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  parseArgs,
  scrapeOfficialAlcoholEvidence,
} = require('./audit_alcohol_common');

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input || '');
  const outputPath = path.resolve(args.output || '');
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node audit_alcohol_agent_batch.js --input=<batch.json> --output=<batch-evidence.json>');
  }
  const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const out = [];
  for (const row of rows) {
    const official = await scrapeOfficialAlcoholEvidence(row.website);
    out.push({
      location_id: row.location_id,
      name: row.name,
      region: row.region,
      type: row.type,
      current_alcohol: row.current_alcohol,
      website: row.website,
      official_evidence_explicit: official.explicit,
      official_evidence_url: official.source_url,
      official_evidence_type: official.source_type,
      official_evidence_snippet: official.snippet,
      official_checked_urls: official.checked_urls,
      official_error: official.error,
    });
  }
  fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, input: inputPath, output: outputPath, count: out.length }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
