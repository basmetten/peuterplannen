/**
 * PeuterPlannen — Insert approved candidates from Amstelveen discovery
 * Generated: 2026-03-02
 *
 * Review Amstelveen_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Amstelveen.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Geitenboerderij Ridammerhoeve — score: 8 (high) — Geitenboerderij met expliciet vermelde speeltuin waar kinderen zich kunnen vermaken terwijl ouders koffie drinken.
  // {"name":"Geitenboerderij Ridammerhoeve","region":"Amsterdam","type":"horeca","description":"Geitenboerderij-café met speeltuin waar peuters zich kunnen vermaken. Gezellige omgeving voor families met mogelijkheid voor dranken op het terras.","website":"https://www.geitenboerderij.nl","lat":52.3128478,"lng":4.8244491,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Speeltuin aanwezig waar kinderen zich kunnen vermaken terwijl ouders ontspannen.","last_verified_at":"2026-03-02T17:21:01.948Z","verification_source":"osm_discovery"},

  // Du Monde Bar&Kitchen — score: 8 (high) — Frans restaurant met expliciet kindermenu's, kleurplaten en potloden; gezellig terras met 50 zitplaatsen.
  // {"name":"Du Monde Bar&Kitchen","region":"Amsterdam","type":"horeca","description":"Du Monde Bar&Kitchen biedt speciale kindermenu's en kleurplaten voor kinderen. Gezellig terras voorzijde met veel zitplaatsen.","website":"https://www.grandcafeoudedorp.nl","lat":52.300852,"lng":4.846216,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Kindermenu's en kleurplaten beschikbaar voor entertainment van jonge gasten.","last_verified_at":"2026-03-02T17:21:01.948Z","verification_source":"osm_discovery"},

  // Stadscafé De Pannenkoek — score: 8 (high) — Gespecialiseerde pannenkoekenzaak die vers gebakken pannenkoeken serveert; pannenkoekenzaken krijgen minimaal score 6.
  // {"name":"Stadscafé De Pannenkoek","region":"Amsterdam","type":"pancake","description":"Stadscafé De Pannenkoek serveert vers gebakken pannenkoeken en huisgemaakte tosti's in het stadshart van Amstelveen.","website":"https://stadscafedepannenkoek.nl/","lat":52.3020099,"lng":4.8633823,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Gespecialiseerd in vers gebakken pannenkoeken, perfect voor peuters.","last_verified_at":"2026-03-02T17:21:01.948Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Steakhouse met expliciet kindermenu en beschrijving als kindvriendelijk; speciaal menu voor kleine gasten.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Loetje heeft een speciaal kindermenu met kindvriendelijke gerechten voor jonge gasten.","website":"https://www.loetje.nl/locaties/amstelveen/","lat":52.2969113,"lng":4.9001795,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speciaal kindermenu beschikbaar met lekkere, kindvriendelijke gerechten.","last_verified_at":"2026-03-02T17:21:01.948Z","verification_source":"osm_discovery"},

  // Zorgeloos — score: 7 (high) — Pancakehouse met American pancakes op het menu; pannenkoekenzaken krijgen minimaal score 6.
  // {"name":"Zorgeloos","region":"Amsterdam","type":"pancake","description":"Zorgeloos serveert Amerikaanse pannenkoeken met vers fruit, honing en yoghurt.","website":"https://zorgeloosetenendrinken.nl/","lat":52.303103,"lng":4.86,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"American pancakes met vers fruit en honing zijn ideaal voor peuters.","last_verified_at":"2026-03-02T17:21:01.948Z","verification_source":"osm_discovery"},

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
