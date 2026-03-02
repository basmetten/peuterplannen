/**
 * Merge haiku evaluation results into stage3 files, then run stage 4 via discover_horeca.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = 'output';
const BATCH_DIR = 'output/batches';
const RESULTS_DIR = 'output/results';

// Load stage3 template
const template = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, '_stage3_template.json'), 'utf8'));

// Load all result files
const resultFiles = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json')).sort();
console.log('Loading', resultFiles.length, 'result files...');

let merged = 0;
for (const rf of resultFiles) {
  const results = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, rf), 'utf8'));
  for (const r of results) {
    const { region, stageIdx, evaluation } = r;
    if (!template[region]) { console.log('WARN: unknown region', region); continue; }
    const candidate = template[region][stageIdx];
    if (!candidate) { console.log('WARN: no candidate at', region, stageIdx); continue; }
    if (candidate.evaluation !== null && candidate.evaluation !== undefined) {
      // Already has non-null evaluation — might be default skip
      if (candidate.evaluation.score === 4 && candidate.evaluation.confidence === 'high') {
        // It's a placeholder — it shouldn't be, but overwrite
      } else {
        console.log('WARN: candidate already evaluated:', region, candidate.name);
      }
    }
    candidate.evaluation = evaluation;
    merged++;
  }
}

console.log('Merged', merged, 'evaluations');

// Check for missing evaluations
let missing = 0;
for (const [region, candidates] of Object.entries(template)) {
  for (const c of candidates) {
    if (c.evaluation === null) {
      console.log('MISSING eval:', region, c.name);
      // Assign default score
      c.evaluation = {
        score: 4, confidence: 'low',
        reasoning: 'Evaluatie niet ontvangen.',
        has_play_area: null, has_high_chairs: null, has_kids_menu: null, has_diaper_changing: null,
        weather: null, description: null, toddler_highlight: null, is_pancake_restaurant: false,
      };
      missing++;
    }
  }
}
if (missing > 0) console.log('WARNING:', missing, 'candidates missing evaluation — assigned default score 4');

// Write stage3 files per region
const regions = Object.keys(template);
for (const region of regions) {
  const stage3Path = path.join(OUTPUT_DIR, 'stage3_' + region + '.json');
  fs.writeFileSync(stage3Path, JSON.stringify(template[region], null, 2));
  const evalCount = template[region].filter(c => c.evaluation && c.evaluation.score >= 7).length;
  console.log('Wrote', stage3Path, '— score 7+:', evalCount);
}

console.log('\nStage3 files written. Running stage 4 for each region...\n');

// Run stage 4 for each region
for (const region of regions) {
  try {
    console.log('=== Stage 4:', region, '===');
    const out = execSync('node .scripts/discover_horeca.js --region="' + region + '" --stage=4 2>&1', { encoding: 'utf8' });
    console.log(out);
  } catch (err) {
    console.error('ERROR for', region + ':', err.stdout || err.message);
  }
}

console.log('\nDone! Check output/<region>_review.md and output/<region>_evaluated.json');
