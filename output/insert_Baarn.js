/**
 * PeuterPlannen — Insert approved candidates from Baarn discovery
 * Generated: 2026-03-02
 *
 * Review Baarn_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Baarn.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // 't Jagershuis — score: 8 (high) — Pannenkoekenzaak expliciet kindvriendelijk met grote natuurspeeltuin en gezinsfocus.
  // {"name":"'t Jagershuis","region":"Utrechtse Heuvelrug","type":"pancake","description":"'t Jagershuis is een gezellig en kindvriendelijk pannenkoekrestaurant met een grote natuurspeeltuin, huiselijke sfeer en bosligging.","website":"https://www.jagershuislagevuursche.nl/","lat":52.1794589,"lng":5.2225922,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Grote natuurspeeltuin en kindvriendelijke sfeer in het bos.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // De Vuursche Boer — score: 8 (high) — Pannenkoekenzaak met expliciete baby-voorzieningen (verschoonplek), gezinsfocus en rolstoeltoegankelijkheid.
  // {"name":"De Vuursche Boer","region":"Utrechtse Heuvelrug","type":"pancake","description":"De Vuursche Boer is een gezinsvriendelijk pannenkoekrestaurant met speciale baby-verschoonplek en volledig rolstoeltoegankelijk.","website":"https://devuurscheboer.nl/","lat":52.1788121,"lng":5.2220962,"coffee":true,"diaper":true,"alcohol":true,"weather":"both","toddler_highlight":"Extra baby-verschoonplek speciaal voor peuters en baby's.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // Grand Café de Kerkbrink — score: 7 (high) — Expliciet gezinsvriendelijk met kindermenu en verrassing, zonnig terras in centrum.
  // {"name":"Grand Café de Kerkbrink","region":"Utrechtse Heuvelrug","type":"horeca","description":"Grand Café de Kerkbrink biedt een speciaal kindermenu met verrassing en een zonnig terras met uitzicht op de Brink.","website":"https://www.dekerkbrink.nl/","lat":52.2123205,"lng":5.2921734,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Kindermenu met verrassing waar kinderen graag voor terugkomen.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // de Bosrand — score: 7 (high) — Pannenkoekenzaak met expliciete kindermenú's en welkomende houding voor kinderen.
  // {"name":"de Bosrand","region":"Utrechtse Heuvelrug","type":"pancake","description":"De Bosrand biedt ambachtelijke pannenkoeken en speciale kindermenú's in een warme, huiselijke sfeer met ruim terras.","website":"https://bosrandlagevuursche.nl/","lat":52.1786603,"lng":5.2228424,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speciale kindermenú's en warme welkom voor kinderen.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // de Wildenburg — score: 7 (high) — Pannenkoekenzaak (crepes) met expliciete verschoonplek en rolstoelvriendelijke voorzieningen.
  // {"name":"de Wildenburg","region":"Utrechtse Heuvelrug","type":"pancake","description":"De Wildenburg is een rolstoelvriendelijk crêperestaurant met verschoonplek en ruime indeling.","website":"https://www.dewildenburg.nl/","lat":52.2185853,"lng":5.2433027,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Verschoonplek en gehandicapten-voorzieningen aanwezig.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // Paviljoen Buiten in de Kuil — score: 7 (high) — Restaurant met speeltuin (natuur) en expliciete welkom voor kinderen in groene omgeving.
  // {"name":"Paviljoen Buiten in de Kuil","region":"Utrechtse Heuvelrug","type":"horeca","description":"Paviljoen Buiten in de Kuil biedt eerlijk eten in een natuurlijke speeltuin-omgeving met ruime buitenruimte.","website":"https://www.buitenindekuil.nl/","lat":52.1861993,"lng":5.2333478,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Natuur als speeltuin met volop ruimte voor kinderen om vrij te spelen.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

  // Volkslust de Vuurse Steeg — score: 7 (high) — Expliciet kindvriendelijk restaurant met speelruimte, bos en veld voor vrijspel en gezinsfocus.
  // {"name":"Volkslust de Vuurse Steeg","region":"Utrechtse Heuvelrug","type":"horeca","description":"Volkslust de Vuurse Steeg is kindvriendelijk met speelplezier, bos achter het restaurant en ruim veld voor vrijspel.","website":"https://www.vuurse-steeg.nl/","lat":52.1670223,"lng":5.225334,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Ruim veld en bos voor speelplezier en avonturen met volop ontspanningsruimte.","last_verified_at":"2026-03-02T17:00:44.331Z","verification_source":"osm_discovery"},

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
