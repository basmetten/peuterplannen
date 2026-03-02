/**
 * PeuterPlannen — Insert approved candidates from Haarlem discovery
 * Generated: 2026-03-02
 *
 * Review Haarlem_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Haarlem.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // IKEA Restaurant — score: 9 (high) — IKEA Restaurant expliciet gericht op gezinnen met babyverzorgingsruimtes, speelruimtes, småland speelplek, kindermenu en kinderstoelen.
  // {"name":"IKEA Restaurant","region":"Haarlem","type":"horeca","description":"IKEA Restaurant is uitermate kindvriendelijk met babyverzorgingsruimtes, speelplekken (småland), kindermenu, kinderstoelen en alle nodige voorzieningen.","website":"https://www.ikea.com/nl/nl/stores/haarlem/","lat":52.3850772,"lng":4.6694936,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Småland speelplek, babyverzorgingsruimtes en kinderstoelen specifiek voor peuters.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's beschikt expliciet over babyruimte en is qua aanbod zeer geschikt voor peuters.
  // {"name":"McDonald's","region":"Haarlem","type":"horeca","description":"McDonald's biedt specifiek babyvoorzieningen en een kindvriendelijk assortiment met snelle bediening.","website":"https://mcdonaldsrestaurant.nl/haarlem-grote-houtstraat-haarlem-rivieraplein/restaurants/mcdonalds-haarlem-grote-houtstraat-centrum","lat":52.3792309,"lng":4.6334731,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte en aangepast menu voor kleine kinderen.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Loetje biedt expliciet een kindermenu met kindvriendelijke gerechten en noemt zichzelf kindvriendelijk.
  // {"name":"Loetje","region":"Haarlem","type":"horeca","description":"Loetje heeft een speciaal kindermenu met lekkere, kindvriendelijke gerechten voor jonge gasten.","website":"https://www.loetje.nl/locaties/haarlem/","lat":52.381417,"lng":4.6376121,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu afgestemd op kleine kinderen.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Parck — score: 7 (high) — Parck biedt expliciet een kidskaart en is gelegen in een parkachtige omgeving.
  // {"name":"Parck","region":"Haarlem","type":"horeca","description":"Parck heeft een aparte kidskaart en biedt gerechten voor iedereen, inclusief kinderen.","website":"https://www.restaurantparck.nl","lat":52.3739275,"lng":4.6308636,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Beschikbaarheid van speciaal kindermenu.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Il Fratelli — score: 7 (high) — Il Fratelli biedt expliciet kinderfeestjes en workshops pizzabakken voor kinderen.
  // {"name":"Il Fratelli","region":"Haarlem","type":"horeca","description":"Il Fratelli organiseert kinderfeestjes en workshops pizzabakken in de echte keuken.","website":"http://www.ifratellihaarlem.nl/","lat":52.385071,"lng":4.6245679,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindgerichtde activiteiten zoals pizzabakken workshops.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Rubens Burger — score: 7 (high) — Rubens Burger biedt expliciet kidspartijtjes en noemt kids op hun menu.
  // {"name":"Rubens Burger","region":"Haarlem","type":"horeca","description":"Rubens Burger organiseert kidspartijtjes en heeft een gericht kindmenu.","website":"https://rubensburger.nl","lat":52.381471,"lng":4.631555,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciaal aanbod voor kidspartijtjes.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Café Lief — score: 7 (high) — Expliciet kindervriendig met leuke zithoek speciaal voor kleine kinderen en gemoedelijke sfeer.
  // {"name":"Café Lief","region":"Haarlem","type":"horeca","description":"Café Lief biedt een gemoedelijke sfeer met verse lunch, goede koffie en een speciaal aangepaste zithoek voor gezinnen met kleine kinderen.","website":"https://cafelief.nl/","lat":52.39652,"lng":4.6427059,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Leuke zithoek speciaal inericht voor kleine kinderen.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // Roast Chicken Bar & The Egg Store — score: 7 (high) — BBQ bar met expliciet genoemde speeltuin en BBQ/vrienden-sfeer; gericht op ontspannen samenzijn.
  // {"name":"Roast Chicken Bar & The Egg Store","region":"Haarlem","type":"horeca","description":"Roast Chicken Bar biedt een speeltuin en informele sfeer in een oude garage, ideaal voor gezinnen die BBQ en gezelligheid zoeken.","website":"https://www.roastchickenbar.com","lat":52.3770412,"lng":4.638528,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speeltuin beschikbaar voor kinderen.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

  // De Beren — score: 7 (high) — Restaurant expliciet gericht op gezellige avonden met het gezin; dagmenu's en familiaire sfeer duidelijk.
  // {"name":"De Beren","region":"Haarlem","type":"horeca","description":"De Beren is een gezellig restaurant perfect voor gezinnen met kinderen, met dagmenu's en vriendelijke sfeer.","website":"https://www.beren.nl/vestigingen/haarlem","lat":52.3814708,"lng":4.6296222,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Expliciet genoemd als goede plek voor makkelijke, gezellige avonden met het gezin.","last_verified_at":"2026-03-02T17:41:55.033Z","verification_source":"osm_discovery"},

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
