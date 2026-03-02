#!/usr/bin/env node
/**
 * Voorbereiding voor Stage 3 via Claude Code Task agents.
 * Filtert keyword-positieve kandidaten uit stage2 bestanden en
 * schrijft compacte batch-prompt bestanden (max 25 per batch).
 */
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const OUTPUT_DIR = resolve(__dirname, '..', 'output');
const BATCH_SIZE = 25;

const REGIONS = process.argv[2] === 'all'
  ? ['Bunnik','De Bilt','Zeist','Houten','Nieuwegein','IJsselstein','Woerden',
     'Utrechtse Heuvelrug','Utrecht','Groningen',
     'Hilversum','Gooise Meren','Huizen','Blaricum','Laren',
     'Wijdemeren','Eemnes','Soest','Baarn','Wijk bij Duurstede','Leusden',
     'Amsterdam','Amstelveen','Zaanstad','Haarlemmermeer','Diemen','Purmerend']
  : process.argv.slice(2);

function isInteresting(c) {
  if (c.scrape?.keywords?.length > 0) return true;
  const name = (c.name || '').toLowerCase();
  return ['pannenkoek','pancake','speeltuin','kinderspeelboerderij','kinderboerderij']
    .some(kw => name.includes(kw));
}

function candidateText(c, idx) {
  const addr = [c.address, c.city].filter(Boolean).join(', ') || 'onbekend';
  const kws  = c.scrape?.keywords?.join(', ') || '(geen)';
  const snip = (c.scrape?.snippet || '').slice(0, 400).replace(/\s+/g, ' ');
  return `[${idx}] ${c.name} | ${c.amenity}${c.cuisine ? ' / '+c.cuisine : ''} | ${addr}
  Keywords: ${kws}
  Fragment: ${snip || '(geen)'}`;
}

function batchPrompt(candidates, globalIndices) {
  const items = candidates.map((c, i) => candidateText(c, globalIndices[i])).join('\n\n');
  return `Je beoordeelt of Nederlandse restaurants/cafés geschikt zijn voor gezinnen met peuters (0-4 jaar).

INSTRUCTIES:
- Score 0-10: 0=absoluut niet, 5=neutraal/onbekend, 10=expliciet kindvriendelijk
- Score 7+ ALLEEN bij concrete aanwijzingen (speelhoek, kindermenu, pannenkoeken, etc.)
- Pannenkoekenzaken: minimaal score 6
- Beoordeel op basis van de beschikbare info; bij twijfel: score 5 of lager

Retourneer UITSLUITEND een geldige JSON array, geen tekst ervoor of erna.
Één object per locatie (in dezelfde volgorde als hieronder):
[{"index":<origineel_index>,"score":<0-10>,"confidence":"high|medium|low","reasoning":"<1 zin NL>","has_play_area":<true|false|null>,"has_high_chairs":<true|false|null>,"has_kids_menu":<true|false|null>,"has_diaper_changing":<true|false|null>,"weather":"indoor|outdoor|both|null","description":"<1-2 zinnen als score>=7, anders null>","toddler_highlight":"<1 zin als score>=7, anders null>","is_pancake_restaurant":<true|false>},...]

=== LOCATIES ===

${items}

JSON array (${candidates.length} objecten):`;
}

const summary = [];

for (const region of REGIONS) {
  const p = resolve(OUTPUT_DIR, `stage2_${region}.json`);
  if (!existsSync(p)) { console.log(`SKIP ${region}: geen stage2`); continue; }

  const all = JSON.parse(readFileSync(p, 'utf8'));
  const interesting = all
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => isInteresting(c));

  console.log(`${region}: ${interesting.length} interessant van ${all.length}`);

  // Write meta
  const meta = {
    region,
    total: all.length,
    interesting: interesting.length,
    batches: Math.ceil(interesting.length / BATCH_SIZE),
    indices: interesting.map(({ i }) => i),
  };
  writeFileSync(resolve(OUTPUT_DIR, `batch_meta_${region}.json`), JSON.stringify(meta, null, 2));

  // Write batch prompts
  for (let b = 0; b * BATCH_SIZE < interesting.length; b++) {
    const slice = interesting.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const globalIndices = slice.map(({ i }) => i);
    const candidates = slice.map(({ c }) => c);
    const prompt = batchPrompt(candidates, globalIndices);
    writeFileSync(resolve(OUTPUT_DIR, `batch_prompt_${region}_${b}.txt`), prompt);
  }

  summary.push({ region, total: all.length, interesting: interesting.length, batches: meta.batches });
}

console.log('\n=== SAMENVATTING ===');
let totalBatches = 0;
for (const { region, total, interesting, batches } of summary) {
  console.log(`  ${region}: ${interesting}/${total} → ${batches} batch(es)`);
  totalBatches += batches;
}
console.log(`\nTotaal: ${totalBatches} batches`);
