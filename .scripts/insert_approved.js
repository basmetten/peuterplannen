/**
 * PeuterPlannen — Insert all approved candidates (score 8+, no snackbars/fast food)
 * Generated: 2026-03-02
 */
const fs = require('fs');
const path = require('path');
const { resolve } = require('path');

const envFile = resolve(__dirname, '..', '.supabase_env');
const env = fs.readFileSync(envFile, 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = JSON.parse(fs.readFileSync(resolve(__dirname, '..', 'output', 'all_approved.json'), 'utf8'));

async function main() {
  console.log('Inserting ' + approved.length + ' approved candidates...\n');
  let ok = 0, fail = 0;
  for (const candidate of approved) {
    const loc = candidate.data;
    const res = await fetch(SB_URL, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([loc])
    });
    if (res.ok) {
      console.log('  + ' + loc.name + ' (' + loc.region + ', score ' + candidate.score + ')');
      ok++;
    } else {
      const body = await res.text();
      console.log('  ! FAILED: ' + loc.name + ' — ' + res.status + ' ' + body);
      fail++;
    }
  }
  console.log('\nDone! ' + ok + ' inserted, ' + fail + ' failed.');
}

main().catch(console.error);
