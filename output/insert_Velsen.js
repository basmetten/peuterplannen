/**
 * PeuterPlannen — Insert approved candidates from Velsen discovery
 * Generated: 2026-03-02
 *
 * Review Velsen_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Velsen.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Pannenkoekenboerderij Onder De Platanen — score: 8 (high) — Pannenkoekenzaak met familie-vriendelijke uitstraling, minimaal score 6 voor pannenkoeken.
  // {"name":"Pannenkoekenboerderij Onder De Platanen","region":"Haarlem","type":"pancake","description":"Pannenkoekenboerderij Onder De Platanen is een gezellige familiezaak waar pannenkoeken centraal staan, perfect voor peuters.","website":"https://www.onderdeplatanen.nl/","lat":52.4297152,"lng":4.6849701,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken zijn ideaal voor jonge kinderen en deze boerderij specialiseert zich hierin.","last_verified_at":"2026-03-02T17:41:55.362Z","verification_source":"osm_discovery"},

  // Fontana — score: 7 (high) — Expliciet kindermenu genoemd in beschrijving, geschikt voor families.
  // {"name":"Fontana","region":"Haarlem","type":"horeca","description":"Fontana biedt een compleet kindermenu met diverse gerechten, inclusief mini menu's met witte rijst.","website":"https://www.restaurantfontana.nl/","lat":52.4350101,"lng":4.6590428,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu's met aangepaste porties en keuzes voor jonge kinderen.","last_verified_at":"2026-03-02T17:41:55.362Z","verification_source":"osm_discovery"},

  // Mr. Shi — score: 7 (high) — Expliciet kindermenu vermeld met kindvriendelijke opties zoals kippenboutjes en milkshakes.
  // {"name":"Mr. Shi","region":"Haarlem","type":"horeca","description":"Mr. Shi biedt een duidelijk kindermenu met eenvoudige opties zoals kippenboutjes, friet en milkshakes.","website":"https://www.mistershiijmuiden.nl/","lat":52.4493953,"lng":4.5963187,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu met toegankelijke gerechten en dranken speciaal voor jonge kinderen.","last_verified_at":"2026-03-02T17:41:55.362Z","verification_source":"osm_discovery"},

  // Rhodos — score: 7 (high) — Expliciet kindermenu en vegetarische opties vermeld, Griekse zaak geschikt voor families.
  // {"name":"Rhodos","region":"Haarlem","type":"horeca","description":"Rhodos is een Grieks restaurant met speciaal kindermenu en diverse menuopties voor het hele gezin.","website":"https://rhodosijmuiden.nl/","lat":52.4600885,"lng":4.6242969,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Uitgebreid kindermenu met traditionele Griekse gerechten aangepast voor jonge kinderen.","last_verified_at":"2026-03-02T17:41:55.362Z","verification_source":"osm_discovery"},

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
