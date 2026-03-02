/**
 * PeuterPlannen — Insert approved candidates from Wijdemeren discovery
 * Generated: 2026-03-02
 *
 * Review Wijdemeren_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Wijdemeren.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Spiegelhuys — score: 8 (high) — Pannenkoekenhuis met expliciete indoorspeeltuin voor kinderen genoemd.
  // {"name":"Spiegelhuys","region":"Gooi en Vechtstreek","type":"pancake","description":"Spiegelhuys is een pannenkoekenhuis met een aangesloten indoorspeeltuin waar kinderen volop plezier hebben terwijl ouders kunnen genieten.","website":"https://www.spieghelhuys.nl","lat":52.264166,"lng":5.0456725,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Indoorspeeltuin direct naast het pannenkoekenhuys voor peuters.","last_verified_at":"2026-03-02T17:00:44.200Z","verification_source":"osm_discovery"},

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
