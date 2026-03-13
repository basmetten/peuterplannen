#!/usr/bin/env node
// Usage: node save_agent_results.js <results_file.json>
// Saves agent-scored results to Supabase

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const { DEFAULT_MODEL, SCORING_PROMPT_VERSION } = require('./config');

const resultsFile = process.argv[2];
if (!resultsFile) { console.error('Usage: save_agent_results.js <results_file>'); process.exit(1); }

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const projectRoot = path.resolve(__dirname, '..', '..');
const db = createSupabaseClient(projectRoot);

(async () => {
  let saved = 0, errors = 0;
  for (const r of results) {
    try {
      await db.insertReview({
        candidate_id: r.candidate_id,
        existing_location_id: r.existing_location_id || null,
        model: 'claude-agent',
        prompt_version: SCORING_PROMPT_VERSION,
        score_10: r.score_10,
        confidence: r.confidence,
        is_suitable: r.is_suitable,
        decision: r.decision,
        reason_short: r.reason_short || '',
        reasons_json: r.reasons || [],
        risk_flags: r.risk_flags || [],
        derived_fields: r.derived_fields || {},
        raw_json: r,
      });
      await db.patchCandidate(r.candidate_id, { status: r.decision });
      saved++;
    } catch (err) {
      console.error(`Error saving candidate ${r.candidate_id}:`, err.message);
      errors++;
    }
  }
  console.log(`Saved ${saved} reviews, ${errors} errors`);
  fs.unlinkSync(resultsFile);
})().catch(err => { console.error(err.message); process.exit(1); });
