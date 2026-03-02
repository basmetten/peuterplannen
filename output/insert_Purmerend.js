/**
 * PeuterPlannen — Insert approved candidates from Purmerend discovery
 * Generated: 2026-03-02
 *
 * Review Purmerend_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Purmerend.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Brasserie 1434 — score: 8 (high) — Expliciet kindvriendelijk met kindermenu, kinderstoelen en kleurplaten; geen speelhoek vermeld.
  // {"name":"Brasserie 1434","region":"Amsterdam","type":"horeca","description":"Brasserie met speciaal kindermenu, kinderstoelen en kleurplaten in kindvriendelijke sfeer waar gezinnen altijd welkom zijn.","website":"https://brasserie1434.nl/","lat":52.508614,"lng":4.9501975,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kinderstoelen en kleurplaten beschikbaar voor peuters.","last_verified_at":"2026-03-02T17:21:02.122Z","verification_source":"osm_discovery"},

  // Barista Cafe — score: 7 (high) — Cafe met aparte kids kaart en expliciete welkomstboodschap voor kinderen.
  // {"name":"Barista Cafe","region":"Amsterdam","type":"horeca","description":"Barista cafe met ontbijt-, lunch- en snackaanbod en aparte kids kaart waar kinderen van harte welkom zijn.","website":"https://www.baristacafe.nl/vestiging/purmerend/","lat":52.509496,"lng":4.9457733,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Aparte kids kaart met lekkere keuzes speciaal voor kinderen.","last_verified_at":"2026-03-02T17:21:02.122Z","verification_source":"osm_discovery"},

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
