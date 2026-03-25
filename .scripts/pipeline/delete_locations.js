#!/usr/bin/env node
// Stap 2b: Verwijder locaties op basis van agent-beslissingen uit een JSON-bestand.
// Usage: node delete_locations.js <decisions_file.json> [--dry-run]
//
// Verwacht JSON-formaat:
// [{ "id": 123, "decision": "keep"|"delete", "reason": "..." }, ...]

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');

const decisionsFile = process.argv[2];
if (!decisionsFile) {
  console.error('Usage: delete_locations.js <decisions_file.json> [--dry-run]');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const projectRoot = path.resolve(__dirname, '..', '..');

(async () => {
  const db = createSupabaseClient(projectRoot);

  const decisions = JSON.parse(fs.readFileSync(decisionsFile, 'utf8'));
  if (!Array.isArray(decisions)) {
    console.error('decisions_file moet een JSON-array zijn');
    process.exit(1);
  }

  const toDelete = decisions.filter((d) => d.decision === 'delete');
  const toKeep = decisions.filter((d) => d.decision === 'keep');

  console.log(`Totaal beslissingen: ${decisions.length}`);
  console.log(`Keep: ${toKeep.length}, Delete: ${toDelete.length}`);

  if (toDelete.length > 0) {
    console.log('\nTe verwijderen:');
    toDelete.forEach((d) => console.log(`  id=${d.id} — ${d.reason || ''}`));
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Geen wijzigingen gemaakt.');
    return;
  }

  if (toDelete.length === 0) {
    console.log('Niets te verwijderen.');
    return;
  }

  // Verwijder in batches van 200
  const batchSize = 200;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const ids = batch.map((d) => Number(d.id)).filter(Number.isFinite).join(',');
    if (!ids) continue;
    await db.rest(`locations?id=in.(${ids})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    deleted += batch.length;
    console.log(`Verwijderd: ${deleted}/${toDelete.length}`);
  }

  console.log(`\nKlaar. ${deleted} locaties verwijderd.`);
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
