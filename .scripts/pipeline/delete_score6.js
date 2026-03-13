#!/usr/bin/env node
// Stap 1: Verwijder alle locaties met ai_suitability_score_10 = 6 uit de DB.
// Usage: node delete_score6.js [--dry-run]

const path = require('path');
const { createSupabaseClient } = require('./db');

const projectRoot = path.resolve(__dirname, '..', '..');
const dryRun = process.argv.includes('--dry-run');

(async () => {
  const db = createSupabaseClient(projectRoot);

  // Tel eerst hoeveel locaties er zijn
  const toDelete = await db.rest('locations?ai_suitability_score_10=eq.6&select=id,name,region');
  if (!Array.isArray(toDelete)) {
    console.error('Onverwacht antwoord van Supabase:', toDelete);
    process.exit(1);
  }

  console.log(`Gevonden: ${toDelete.length} locaties met score 6`);
  if (toDelete.length > 0) {
    console.log('Eerste 10:', toDelete.slice(0, 10).map((r) => `${r.id} ${r.name} (${r.region})`).join('\n'));
  }

  if (dryRun) {
    console.log('[DRY RUN] Geen wijzigingen gemaakt.');
    return;
  }

  if (toDelete.length === 0) {
    console.log('Niets te verwijderen.');
    return;
  }

  // Verwijder in batches van 200 via id=in.(...)
  const batchSize = 200;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const ids = batch.map((r) => r.id).join(',');
    await db.rest(`locations?id=in.(${ids})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    deleted += batch.length;
    console.log(`Verwijderd: ${deleted}/${toDelete.length}`);
  }

  console.log(`Klaar. ${deleted} locaties met score 6 verwijderd.`);
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
