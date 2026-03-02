/**
 * PeuterPlannen — Insert approved candidates from Hilversum discovery
 * Generated: 2026-03-02
 *
 * Review Hilversum_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Hilversum.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // 't Bospandje — score: 9 (high) — Pannenkoekzaak met ruime speelruimte, speelgoed voor alle leeftijden, verschoontafel en expliciet gezinsvriendelijk.
  // {"name":"'t Bospandje","region":"Gooi en Vechtstreek","type":"pancake","description":"'t Bospandje is een pannenkoekenzaak met ruime speelruimte, speelgoed voor alle leeftijden en een verschoontafel.","website":"https://bospandje.nl/","lat":52.2483881,"lng":5.1609571,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Ruime speelruimte en speelgoed voor urenlang vermaak van peuters.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

  // McDonald's — score: 7 (high) — McDonald's biedt babyruimte en is expliciet kindvriendelijk met kinderfeestjes en standaard voorzieningen.
  // {"name":"McDonald's","region":"Gooi en Vechtstreek","type":"horeca","description":"McDonald's op Kerkstraat in Hilversum beschikt over een babyruimte en biedt kinderfeestjes en kindvriendelijke opties.","website":"https://mcdonaldsrestaurant.nl/hilversum/restaurants/mcdonalds-hilversum","lat":52.2256167,"lng":5.1765406,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Babyruimte aanwezig voor verzorging en rust.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

  // Restaurant Su — score: 7 (high) — Restaurant Su heeft expliciet een gezellige speelhoek voor kinderen waar de kleintjes zich kunnen vermaken.
  // {"name":"Restaurant Su","region":"Gooi en Vechtstreek","type":"horeca","description":"Restaurant Su beschikt over een gezellige speelhoek waar kinderen urenlang kunnen spelen terwijl ouders genieten.","website":"https://www.restaurantsu.nl/","lat":52.2268785,"lng":5.1781316,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speelhoek voor kinderen aanwezig.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

  // 't Pandje — score: 7 (high) — 't Pandje biedt een speciaal kindermenu en is expliciet gericht op kinderen.
  // {"name":"'t Pandje","region":"Gooi en Vechtstreek","type":"horeca","description":"'t Pandje biedt smakelijke gerechten met een speciaal kindermenu en aandacht voor jonge gasten.","website":"https://eetcafepandje.nl/","lat":52.2440018,"lng":5.168799,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

  // Sumo — score: 7 (high) — Sumo is expliciet kindvriendelijk met gratis kleurplaten en potloden voor kinderen en verjaardag-aanbiedingen.
  // {"name":"Sumo","region":"Gooi en Vechtstreek","type":"horeca","description":"Sumo is kindvriendelijk met gratis kleurplaten en potloden voor jonge gasten en speciale verjaardagspakketten.","website":"https://www.restaurantsumo.com/sumo-sushi-hilversum/","lat":52.2248731,"lng":5.1777457,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kleurplaten en potloden beschikbaar voor kinderen.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

  // Loetje — score: 7 (high) — Loetje biedt expliciet een kindvriendelijk kindermenu met speciale gerechten voor jonge gasten.
  // {"name":"Loetje","region":"Gooi en Vechtstreek","type":"horeca","description":"Loetje denkt aan jonge gasten met een speciaal kindermenu vol kindvriendelijke gerechten.","website":"https://www.loetje.nl/locaties/hilversum/","lat":52.2243397,"lng":5.172285,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar voor kleine gasten.","last_verified_at":"2026-03-02T17:00:43.984Z","verification_source":"osm_discovery"},

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
