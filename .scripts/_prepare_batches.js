/**
 * Prepare evaluation batches and build stage3 files
 * For candidates WITHOUT keywords: assign default score 4 (below threshold)
 * For candidates WITH keywords (or pancake/ice_cream): output to batches/*.json for haiku eval
 */
const fs = require('fs');
const path = require('path');

const regions = ['Den Haag','Delft','Westland','Rijswijk','Zoetermeer','Wassenaar','Leidschendam-Voorburg','Pijnacker-Nootdorp'];
const BATCH_SIZE = 25;
const OUTPUT_DIR = 'output';
const BATCH_DIR = 'output/batches';

fs.mkdirSync(BATCH_DIR, { recursive: true });

const DEFAULT_SKIP_EVAL = {
  score: 4,
  confidence: 'high',
  reasoning: 'Geen kindvriendelijke aanwijzingen op website of in OSM-data.',
  has_play_area: null,
  has_high_chairs: null,
  has_kids_menu: null,
  has_diaper_changing: null,
  weather: null,
  description: null,
  toddler_highlight: null,
  is_pancake_restaurant: false,
};

function needsEval(c) {
  if (c.scrape && c.scrape.keywords && c.scrape.keywords.length > 0) return true;
  const name = (c.name || '').toLowerCase();
  const cuisine = (c.cuisine || '').toLowerCase();
  if (name.includes('pannenkoek') || cuisine.includes('pancake')) return true;
  if (c.amenity === 'ice_cream') return true;
  return false;
}

// Read all stage2 data and split into eval/no-eval
const allForEval = []; // [{region, idx, candidate}]
const stage3Data = {}; // region -> array of candidates with evaluation

for (const region of regions) {
  const file = path.join(OUTPUT_DIR, 'stage2_' + region + '.json');
  if (!fs.existsSync(file)) { console.log('MISSING:', file); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  stage3Data[region] = [];
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (needsEval(c)) {
      allForEval.push({ region, stageIdx: i, candidate: c });
      // Placeholder — will be filled after haiku eval
      stage3Data[region].push({ ...c, evaluation: null });
    } else {
      stage3Data[region].push({ ...c, evaluation: DEFAULT_SKIP_EVAL });
    }
  }

  const evalCount = stage3Data[region].filter(c => c.evaluation === null).length;
  console.log(region + ': ' + data.length + ' candidates, ' + evalCount + ' need haiku eval');
}

// Save stage3 templates (with nulls for eval candidates) — will be merged later
fs.writeFileSync(path.join(OUTPUT_DIR, '_stage3_template.json'), JSON.stringify(stage3Data, null, 2));

// Create batches for haiku evaluation
const batches = [];
for (let i = 0; i < allForEval.length; i += BATCH_SIZE) {
  batches.push(allForEval.slice(i, i + BATCH_SIZE));
}

console.log('\nTotal to evaluate:', allForEval.length);
console.log('Batches of', BATCH_SIZE + ':', batches.length);

// Write each batch to file
for (let b = 0; b < batches.length; b++) {
  const batch = batches[b];
  const batchData = batch.map(({ region, stageIdx, candidate }) => ({
    region,
    stageIdx,
    name: candidate.name,
    amenity: candidate.amenity,
    cuisine: candidate.cuisine || null,
    address: [candidate.address, candidate.city].filter(Boolean).join(', ') || null,
    website: candidate.website || null,
    outdoor_seating: candidate.outdoor_seating || null,
    keywords: candidate.scrape?.keywords || [],
    snippet: (candidate.scrape?.snippet || '').slice(0, 1500),
  }));

  fs.writeFileSync(path.join(BATCH_DIR, 'batch_' + String(b).padStart(2,'0') + '.json'), JSON.stringify(batchData, null, 2));
}

console.log('\nBatch files written to', BATCH_DIR);
console.log('Run haiku evaluation on each batch, then run _merge_results.js');
