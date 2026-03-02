#!/usr/bin/env node
/**
 * Merge Haiku-evaluaties terug in stage2 data → schrijf stage3 bestand.
 * Gebruik: node .scripts/merge_stage3.js <region>
 *
 * Leest output/eval_batch_<region>_*.json
 * Niet-geëvalueerde kandidaten krijgen score 4 (geen aanwijzingen).
 */
const { readFileSync, writeFileSync, existsSync, readdirSync } = require('fs');
const { resolve } = require('path');

const OUTPUT_DIR = resolve(__dirname, '..', 'output');
const region = process.argv[2];
if (!region) { console.error('Gebruik: node merge_stage3.js <region>'); process.exit(1); }

// Load stage2
const stage2Path = resolve(OUTPUT_DIR, `stage2_${region}.json`);
if (!existsSync(stage2Path)) { console.error(`stage2 niet gevonden: ${stage2Path}`); process.exit(1); }
const candidates = JSON.parse(readFileSync(stage2Path, 'utf8'));

// Load all eval batches
const evalMap = {};
const files = readdirSync(OUTPUT_DIR).filter(f => f.startsWith(`eval_batch_${region}_`) && f.endsWith('.json'));
let totalEvaluated = 0;
for (const file of files) {
  const evals = JSON.parse(readFileSync(resolve(OUTPUT_DIR, file), 'utf8'));
  for (const ev of evals) {
    const { index, ...evaluation } = ev;
    evalMap[index] = evaluation;
    totalEvaluated++;
  }
}
console.log(`  Loaded ${totalEvaluated} evaluations from ${files.length} batch file(s)`);

// Default for non-evaluated
const defaultEval = {
  score: 4,
  confidence: 'low',
  reasoning: 'Geen website-aanwijzingen gevonden voor kindvriendelijkheid.',
  has_play_area: null,
  has_high_chairs: null,
  has_kids_menu: null,
  has_diaper_changing: null,
  weather: null,
  description: null,
  toddler_highlight: null,
  is_pancake_restaurant: false,
};

// Apply
let applied = 0;
for (let i = 0; i < candidates.length; i++) {
  if (evalMap[i] !== undefined) {
    candidates[i].evaluation = evalMap[i];
    applied++;
  } else {
    candidates[i].evaluation = { ...defaultEval };
  }
}

// Write stage3
const stage3Path = resolve(OUTPUT_DIR, `stage3_${region}.json`);
writeFileSync(stage3Path, JSON.stringify(candidates, null, 2));

const score7plus = candidates.filter(c => c.evaluation.score >= 7).length;
const score8plus = candidates.filter(c => c.evaluation.score >= 8).length;
console.log(`  Stage3: ${stage3Path}`);
console.log(`  ${candidates.length} kandidaten | ${applied} geëvalueerd | score 7+: ${score7plus} | score 8+: ${score8plus}`);
