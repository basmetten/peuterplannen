/**
 * PeuterPlannen — Insert approved candidates from Huizen discovery
 * Generated: 2026-03-02
 *
 * Review Huizen_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Huizen.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Aan de Kade — score: 9 (high) — Expliciet gezinsrestaurant met kindermenu's en pannenkoeken; ideaal voor gezinnen met peuters.
  // {"name":"Aan de Kade","region":"Gooi en Vechtstreek","type":"pancake","description":"Aan de Kade is het ideale restaurant voor gezinnen, met brede kindermenu's en zoete en hartige pannenkoeken aan het Gooimeer.","website":"https://www.aan-de-kade.nl/","lat":52.3056282,"lng":5.2584625,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Uitgebreide kindermenu's en pannenkoeken aan het strand van het Gooimeer.","last_verified_at":"2026-03-02T17:00:44.076Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Expliciet kindmenu vermeld voor 'kleine loetjes' met kindvriendelijke gerechten.
  // {"name":"Loetje","region":"Gooi en Vechtstreek","type":"horeca","description":"Loetje Huizen heeft een speciaal kindermenu met lekkere, kindvriendelijke gerechten speciaal voor jonge gasten.","website":"https://www.loetje.nl/locaties/huizen/","lat":52.3065906,"lng":5.2412912,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar voor kleine loetjes.","last_verified_at":"2026-03-02T17:00:44.076Z","verification_source":"osm_discovery"},

  // Mazzel — score: 7 (high) — Kindermenu expliciet aanwezig op de menukaart.
  // {"name":"Mazzel","region":"Gooi en Vechtstreek","type":"horeca","description":"Mazzel Huizen biedt een speciaal kindermenu met kindvriendelijke gerechten.","website":"https://www.mazzel-huizen.nl/","lat":52.3055736,"lng":5.2586553,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Eigen kindermenu beschikbaar.","last_verified_at":"2026-03-02T17:00:44.076Z","verification_source":"osm_discovery"},

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
