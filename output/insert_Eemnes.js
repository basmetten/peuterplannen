/**
 * PeuterPlannen — Insert approved candidates from Eemnes discovery
 * Generated: 2026-03-02
 *
 * Review Eemnes_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Eemnes.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Theetuin Eemnes / Brave Hendrik — score: 8 (high) — Explicit vermelding van 'avontuurlijke speelplaats voor kinderen' en geschikt voor alle leeftijden inclusief jong kinderen.
  // {"name":"Theetuin Eemnes / Brave Hendrik","region":"Gooi en Vechtstreek","type":"horeca","description":"Sprookjesachtige tuin met speelplaats en theehuis, zeer geschikt voor gezinnen met peuters.","website":"https://www.theetuineemnes.nl/","lat":52.2801402,"lng":5.2752216,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Avontuurlijke speelplaats speciaal voor kinderen in een sfeervol tuinomgeving.","last_verified_at":"2026-03-02T17:00:44.242Z","verification_source":"osm_discovery"},

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
