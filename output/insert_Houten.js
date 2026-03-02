/**
 * PeuterPlannen — Insert approved candidates from Houten discovery
 * Generated: 2026-03-02
 *
 * Review Houten_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Houten.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Tante Truus Pannenkoeken — score: 9 (high) — Pannenkoekenzaak met speciële kinderhoek en breed aanbod pannenkoeken voor gezinnen.
  // {"name":"Tante Truus Pannenkoeken","region":"Utrecht","type":"pancake","description":"Tante Truus Pannenkoeken heeft een speciële kinderhoek en een breed assortiment pannenkoeken voor alle leeftijden.","website":"https://tantetruuskitchen.nl","lat":52.0164989,"lng":5.1786523,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderhoek waar peuters zich kunnen vermaken, perfect voor gezinsuitjes.","last_verified_at":"2026-03-02T14:11:11.137Z","verification_source":"osm_discovery"},

  // De Beren — score: 8 (high) — Restaurant met indoor springkussen waar kinderen kunnen spelen terwijl ouders ontspannen.
  // {"name":"De Beren","region":"Utrecht","type":"horeca","description":"De Beren biedt een unieke indoor springkussen waar jonge kinderen veilig kunnen spelen.","website":"https://www.beren.nl/vestigingen/houten","lat":52.0239698,"lng":5.1458417,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal springkussen voor kinderen terwijl ouders kunnen genieten.","last_verified_at":"2026-03-02T14:11:11.137Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Steakhouse met speciaal kindermenu en kindvriendelijke gerechten.
  // {"name":"Loetje","region":"Utrecht","type":"horeca","description":"Loetje biedt een speciaal kindermenu met kindvriendelijke gerechten voor jonge gasten.","website":"https://www.loetje.nl/locaties/houten/","lat":52.0317012,"lng":5.1388326,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kleine Loetjes hebben een aantrekkelijk kindermenu.","last_verified_at":"2026-03-02T14:11:11.137Z","verification_source":"osm_discovery"},

  // Wereld van Weelde — score: 7 (medium) — Restaurant met activiteiten voor kinderen (wonderstenen zoeken, kampvuur, film) op het terrein.
  // {"name":"Wereld van Weelde","region":"Utrecht","type":"horeca","description":"Wereld van Weelde organiseert leuke activiteiten voor kinderen buiten, inclusief wondersteinen zoeken en kampvuuravonden.","website":"https://wereldvanweelde.nl/","lat":52.0454513,"lng":5.1756294,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Terrein met allerlei activiteiten waar kinderen kunnen spelen en ontdekken.","last_verified_at":"2026-03-02T14:11:11.137Z","verification_source":"osm_discovery"},

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
