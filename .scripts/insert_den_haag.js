/**
 * PeuterPlannen — Insert Den Haag regio kandidaten
 * Region "Regio Den Haag", dedup vs bestaande Supabase data
 */
const fs = require('fs');
const path = require('path');
const { resolve } = require('path');

const envFile = resolve(__dirname, '..', '.supabase_env');
const env = fs.readFileSync(envFile, 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_ANON_KEY = Buffer.from(
  'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==',
  'base64'
).toString('utf8');
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const DEN_HAAG_REGIONS = new Set([
  'Den Haag', 'Delft', 'Westland', 'Rijswijk', 'Zoetermeer',
  'Wassenaar', 'Leidschendam-Voorburg', 'Pijnacker-Nootdorp'
]);
const SUPABASE_REGION = 'Den Haag';

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function main() {
  // 1. Load all_approved.json and filter to Den Haag regio
  const allApproved = JSON.parse(fs.readFileSync('output/all_approved.json', 'utf8'));
  const denHaagCandidates = allApproved
    .filter(c => DEN_HAAG_REGIONS.has(c.region))
    .map(c => ({
      ...c,
      data: { ...c.data, region: SUPABASE_REGION }
    }));

  console.log('Den Haag regio kandidaten:', denHaagCandidates.length);

  // 2. Fetch existing locations from Supabase for dedup
  // Check both "Den Haag" and "Regio Den Haag" to catch all existing
  const existingRes = await fetch(
    `${SB_URL}?or=(region.eq.Den Haag,region.eq.Regio Den Haag)&select=id,name,region`,
    { headers: { 'apikey': SB_ANON_KEY, 'Authorization': 'Bearer ' + SB_ANON_KEY } }
  );
  const existing = await existingRes.json();
  console.log('Bestaand in Supabase (Den Haag + Regio Den Haag):', existing.length);

  // 3. Dedup by name
  const toInsert = [];
  const skipped = [];
  for (const candidate of denHaagCandidates) {
    const nameNorm = normalize(candidate.data.name);
    const dupe = existing.find(e => normalize(e.name) === nameNorm);
    if (dupe) {
      skipped.push({ name: candidate.data.name, existingRegion: dupe.region });
    } else {
      toInsert.push(candidate);
    }
  }

  console.log('\nNa dedup:');
  console.log('  Te inserten:', toInsert.length);
  console.log('  Overgeslagen (al bestaat):', skipped.length);
  if (skipped.length > 0) {
    skipped.forEach(s => console.log('    SKIP:', s.name, '(region=' + s.existingRegion + ')'));
  }

  console.log('\nInserting...\n');
  let ok = 0, fail = 0;
  for (const candidate of toInsert) {
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
      console.log('  + ' + loc.name + ' (' + candidate.region + ', score ' + candidate.score + ')');
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
