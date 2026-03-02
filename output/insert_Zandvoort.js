/**
 * PeuterPlannen — Insert approved candidates from Zandvoort discovery
 * Generated: 2026-03-02
 *
 * Review Zandvoort_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Zandvoort.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Ons Paviljoen 11 — score: 9 (high) — Expliciet echt familiepaviljoen en zeer kindvriendelijk met speeltuin, speeltoestellen en springkussen direct bij terras.
  // {"name":"Ons Paviljoen 11","region":"Haarlem","type":"horeca","description":"Ons Paviljoen 11 is een gespecialiseerd familiepaviljoen met speeltuin inclusief speeltoestellen en springkussen direct naast het terras.","website":"https://www.onspaviljoen.nl/","lat":52.3741271,"lng":4.5252659,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Speeltuin met springkussen en speeltoestellen met zicht vanaf het terras.","last_verified_at":"2026-03-02T17:41:55.280Z","verification_source":"osm_discovery"},

  // T Tasty Corner — score: 7 (high) — Expliciet kindermenu aangeboden, fast-food formaat geschikt voor peuters.
  // {"name":"T Tasty Corner","region":"Haarlem","type":"horeca","description":"T Tasty Corner biedt een kindermenu aan met snacks en friet, ideaal voor snelle gezinsmaaltijden.","website":"https://www.ttastycorner-zandvoort.nl/","lat":52.3791225,"lng":4.5487032,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor eenvoudige, vertrouwde gerechten.","last_verified_at":"2026-03-02T17:41:55.280Z","verification_source":"osm_discovery"},

  // Tel Aviv — score: 7 (high) — Expliciet kindermenu en mix grill family optie voor gezinnen aangeboden.
  // {"name":"Tel Aviv","region":"Haarlem","type":"horeca","description":"Tel Aviv biedt een kindermenu en familiale porties aan, wat gezinnen met peuters goed van pas komt.","website":"https://www.telaviv-zandvoort.nl/","lat":52.3732127,"lng":4.530084,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor gemakkelijke gezinsmaaltijden.","last_verified_at":"2026-03-02T17:41:55.280Z","verification_source":"osm_discovery"},

  // Vulcano — score: 7 (high) — Expliciet kindermenu op de menukaart vermeld, pizzeria geschikt voor families.
  // {"name":"Vulcano","region":"Haarlem","type":"horeca","description":"Vulcano pizzeria biedt kindermenu aan, ideaal voor gezinnen met peuters.","website":"https://www.vulcanozandvoort.nl/","lat":52.3749836,"lng":4.5293288,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor eenvoudige pizzamaaltijden.","last_verified_at":"2026-03-02T17:41:55.280Z","verification_source":"osm_discovery"},

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
