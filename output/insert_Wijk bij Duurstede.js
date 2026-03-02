/**
 * PeuterPlannen — Insert approved candidates from Wijk bij Duurstede discovery
 * Generated: 2026-03-02
 *
 * Review Wijk bij Duurstede_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Wijk bij Duurstede.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Dorestad — score: 7 (high) — Expliciet kinderkaart aanwezig en warme, gezellige sfeer die geschikt is voor families.
  // {"name":"Dorestad","region":"Utrechtse Heuvelrug","type":"horeca","description":"Dorestad is een gezellige brasserie met een kinderkaart en een mooi terras op de markt. De warme en ongedwongen sfeer maakt het aantrekkelijk voor gezinnen.","website":"https://eethuisdorestad.nl","lat":51.9724387,"lng":5.3448811,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speciale kinderkaart beschikbaar voor de kleine gasten.","last_verified_at":"2026-03-02T17:00:44.372Z","verification_source":"osm_discovery"},

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
