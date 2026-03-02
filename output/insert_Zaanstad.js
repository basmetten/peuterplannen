/**
 * PeuterPlannen — Insert approved candidates from Zaanstad discovery
 * Generated: 2026-03-02
 *
 * Review Zaanstad_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Zaanstad.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Family village — score: 10 (high) — Expliciet kindgericht met speeltuin, baby-/peuterhoek, luiers, voedingskussens en gezinsactiviteiten.
  // {"name":"Family village","region":"Amsterdam","type":"horeca","description":"Family Village is een gespecialiseerde gezinscafé met natuurspeeltuin, baby- en peuterhoek, voedingskussens, luiers en volledige voorzieningen voor gezinnen.","website":"https://familyvillage.nl/","lat":52.4404939,"lng":4.8442202,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Dedicated baby- en peuterhoek met alle noodzakelijke voorzieningen zoals luiers, voedingskussens en vers fruit.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

  // Dutch Pancake Co — score: 8 (high) — Pannenkoekenzaak met expliciet 'free surprise for kids' en families welkom; traditionele Nederlandse pannenkoeken.
  // {"name":"Dutch Pancake Co","region":"Amsterdam","type":"pancake","description":"Dutch Pancake Co is een authentieke pannenkoekenzaak waar kinderen gratis verrassing krijgen en traditionele Nederlandse pannenkoeken worden geserveerd.","website":"https://www.dutchpancakeco.nl","lat":52.4718137,"lng":4.8120218,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gratis verrassingscadeau voor kinderen en traditionele Nederlandse pannenkoeken perfect voor peuters.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

  // Zaanse Pannenkoekenpaleis — score: 8 (high) — Pannenkoekrestaurant met expliciet kindermenu en kinderfeestjes; traditionele Nederlandse pannenkoeken.
  // {"name":"Zaanse Pannenkoekenpaleis","region":"Amsterdam","type":"pancake","description":"Zaanse Pannenkoekenpaleis biedt kindermenu met berenpanenkoeken, poffertjes en kinderijs, plus speciale kinderfeestpakketten.","website":"http://www.zaansepannenkoekenpaleis.nl","lat":52.4392096,"lng":4.8264506,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Berenpanenkoeken en poffertjes speciaal voor kinderen met limonade en kinderijs.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

  // Lab-44 — score: 7 (high) — Expliciet genoemd dat kinderen leuke activiteiten kunnen doen en gezellige familiedagen.
  // {"name":"Lab-44","region":"Amsterdam","type":"horeca","description":"Lab-44 organiseert regelmatig leuke kinderactiviteiten naast eten en drinken, met pizza- en kookworkshops voor kinderen.","website":"https://www.lab-44.nl/","lat":52.4217487,"lng":4.8383248,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Vaak iets leuks te doen voor kinderen naast het reguliere aanbod.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

  // Lagom Grand Café — score: 7 (high) — Kids plate expliciet aangeboden met gezonde opties speciaal voor kinderen.
  // {"name":"Lagom Grand Café","region":"Amsterdam","type":"horeca","description":"Lagom Grand Café biedt een speciaal kids plate met gezonde opties zoals mini soepkommetjes en yoghurt bowls.","website":"https://www.lagom.cafe/","lat":52.4383029,"lng":4.8154227,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Mini Lagom's zijn uitdrukkelijk welkom met een aangepast kindermenu.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

  // Rustpunt Bezoekboerderij White Ranch — score: 7 (high) — Bezoekboerderij met dieren en gezinsgerichte aanpak specifiek gericht op kinderen.
  // {"name":"Rustpunt Bezoekboerderij White Ranch","region":"Amsterdam","type":"horeca","description":"Rustpunt Bezoekboerderij White Ranch is een biologische boerderij met dieren waar gezinnen kunnen genieten en kinderen veel kunnen zien.","website":"https://www.whiteranch.nl","lat":52.4848,"lng":4.7091,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Dieren en natuurlijke omgeving bieden veel interessants voor peuters.","last_verified_at":"2026-03-02T17:21:01.991Z","verification_source":"osm_discovery"},

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
