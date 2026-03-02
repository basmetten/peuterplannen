/**
 * PeuterPlannen — Insert approved candidates from Bunnik discovery
 * Generated: 2026-03-02
 *
 * Review Bunnik_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Bunnik.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Rustpunt Boerderij Nieuw Slagmaat — score: 8 (high) — Speelweide, maisdoolhof en kindvriendelijke activiteiten; ideaal voor gezinnen met peuters.
  // {"name":"Rustpunt Boerderij Nieuw Slagmaat","region":"Utrechtse Heuvelrug","type":"horeca","description":"Rustpunt Boerderij Nieuw Slagmaat biedt een speelweide en maisdoolhof, perfect voor peuters om buiten te spelen en ontdekken.","website":"https://www.nieuwslagmaat.nl","lat":52.05455,"lng":5.15683,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Speelweide en maisdoolhof voor actieve peuters.","last_verified_at":"2026-03-02T14:11:10.888Z","verification_source":"osm_discovery"},

  // 't Wapen van Odijk — score: 7 (medium) — Expliciet kinderwelkom vermeld en kindermenu aanwezig.
  // {"name":"'t Wapen van Odijk","region":"Utrechtse Heuvelrug","type":"horeca","description":"'t Wapen van Odijk biedt een kindermenu en heet kinderen van harte welkom met aandacht voor gezinsbezoeken.","website":"https://www.wapenvanodijk.nl","lat":52.0495906,"lng":5.234571,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar.","last_verified_at":"2026-03-02T14:11:10.888Z","verification_source":"osm_discovery"},

  // Theehuis Rhijnauwen — score: 7 (high) — Pannenkoekenzaak met duidelijk assortiment; minimaal score 6 voor pannenkoekenhuis.
  // {"name":"Theehuis Rhijnauwen","region":"Utrechtse Heuvelrug","type":"pancake","description":"Theehuis Rhijnauwen serveert pannenkoeken; klassieke kindvriendelijke optie met groot assortiment.","website":"https://theehuisrhijnauwen.nl","lat":52.0698552,"lng":5.1779236,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken zijn ideaal voor peuters.","last_verified_at":"2026-03-02T14:11:10.888Z","verification_source":"osm_discovery"},

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
