/**
 * PeuterPlannen — Insert approved candidates from IJsselstein discovery
 * Generated: 2026-03-02
 *
 * Review IJsselstein_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_IJsselstein.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // De Roozeboom — score: 9 (high) — Pannenkoekenrestaurant met speeltuin, speelhoek en expliciet gezinsgeoriënteerd aanbod.
  // {"name":"De Roozeboom","region":"Utrecht","type":"pancake","description":"Pannenkoekenrestaurant met speeltuin en speelhoek waar kinderen zich kunnen vermaken terwijl het gezin eet.","website":"https://www.pannenkoeken.org/","lat":52.0388904,"lng":5.0352831,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speeltuin en speelhoek speciaal voor kinderen beschikbaar.","last_verified_at":"2026-03-02T14:11:11.303Z","verification_source":"osm_discovery"},

  // Loft88 — score: 7 (high) — Restaurant met kindermenu en beschrijving van gezellige gezinsvriendelijke sfeer.
  // {"name":"Loft88","region":"Utrecht","type":"horeca","description":"Urban restaurant met boho vibe waar families gezellig kunnen eten; kindermenu beschikbaar.","website":"https://loft88.nl/","lat":52.0180271,"lng":5.0420113,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor kleine gasten.","last_verified_at":"2026-03-02T14:11:11.303Z","verification_source":"osm_discovery"},

];

async function main() {
  console.log('Inserting ' + approved.length + ' approved candidates...');
  for (const loc of approved) {
    const res = await fetch(SB_URL, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify([loc])
    });
    console.log(res.ok ? '  + ' + loc.name : '  ! FAILED: ' + loc.name);
  }
  console.log('Done!');
}

main().catch(console.error);
