/**
 * PeuterPlannen — Insert approved candidates from Leusden discovery
 * Generated: 2026-03-02
 *
 * Review Leusden_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Leusden.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Pannenkoe — score: 9 (high) — Pannenkoekzaak met overdekte binnenspeeltuin met glijbaan en buiten speeltuin, expliciet kindvriendelijk met kindvriendelijke gerechten.
  // {"name":"Pannenkoe","region":"Utrechtse Heuvelrug","type":"pancake","description":"Pannenkoekzaak met overdekte binnenspeeltuin inclusief glijbaan en buiten speeltuin op het terras, speciaal ontworpen voor kinderen om zich uit te leven.","website":"https://www.pannenkoe.nl/leusden/","lat":52.1324931,"lng":5.4414521,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Overdekte binnenspeeltuin met glijbaan en buiten speeltuin waar peuters zich prima kunnen vermaken terwijl ouders ontspannen genieten.","last_verified_at":"2026-03-02T17:00:44.413Z","verification_source":"osm_discovery"},

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
