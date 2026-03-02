/**
 * PeuterPlannen — Insert approved candidates from Bloemendaal discovery
 * Generated: 2026-03-02
 *
 * Review Bloemendaal_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Bloemendaal.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Paviljoen Het Witte Huis — score: 8 (high) — Paviljoen Het Witte Huis is een pannenkoekenzaak met expliciete vermelding van kindvriendelijkheid en positieve reviews over bezoeken met kleinkinderen.
  // {"name":"Paviljoen Het Witte Huis","region":"Haarlem","type":"pancake","description":"Pannenkoekrestaurant met gezellige sfeer, vriendelijke bediening en specifiek genoemd als geschikt voor kleinkinderen.","website":"https://www.paviljoenhetwittehuis.nl","lat":52.3928356,"lng":4.6001443,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Snel serveerde pannenkoeken in een gezellige, kindvriendelijke omgeving.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Duincafé de Kennemerduinen — score: 8 (high) — Duincafé de Kennemerduinen heeft expliciet een zandspeeltuin voor de deur en uitnodigend buitenterras.
  // {"name":"Duincafé de Kennemerduinen","region":"Haarlem","type":"horeca","description":"Café met zandspeeltuin direct voor de deur en sfeervolle buitenterras voor gezinsbezoek.","website":"https://www.duincafedekennemerduinen.nl/","lat":52.396172,"lng":4.5923119,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Zandspeeltuin en gemakkelijk bereikbare speelruimte voor peuters.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Brasserie Cheers — score: 8 (high) — Brasserie Cheers heeft expliciet speeltuin en diversiteit aan speeltoestellen voor kinderen.
  // {"name":"Brasserie Cheers","region":"Haarlem","type":"horeca","description":"Brasserie met groot park en speeltuin met diverse speeltoestellen waar kinderen niet vervelen.","website":"https://www.marinaparken.nl/residentie-bloemendaal/faciliteiten/brasserie-cheers","lat":52.3211874,"lng":4.5630688,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Diverse speeltoestellen en groot park met speelterreinen.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Kraantje Lek — score: 8 (high) — Kraantje Lek is pannenkoekenzaak met expliciete speeltuin, zeer kindvriendelijk gepositioneerd.
  // {"name":"Kraantje Lek","region":"Haarlem","type":"pancake","description":"Pannenkoekrestaurant midden in de natuur met eigen speeltuin, ideaal voor gezinnen met kinderen.","website":"https://www.kraantjelek.nl","lat":52.3827993,"lng":4.591455,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Pannenkoeken met speeltuin in natural setting tussen strand en stad.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Gestrand — score: 8 (high) — Gestrand heeft expliciet speeltuin, kinderactiviteiten en kinderfeestjes met groot terras.
  // {"name":"Gestrand","region":"Haarlem","type":"horeca","description":"Restaurant op camping met gave speeltuin en kinderactiviteiten, groot terras en prachtige locatie.","website":"https://restaurantgestrand.nl","lat":52.4079772,"lng":4.5535739,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Gave speeltuin en kinderactiviteiten in open restaurant.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Monte Pelmo — score: 7 (high) — Monte Pelmo biedt speciaal kinderporties ijs met kindvriendelijke formaten en bekers.
  // {"name":"Monte Pelmo","region":"Haarlem","type":"horeca","description":"IJscrèmerie met speciaal ontworpen kinderhoorntjes en bekertjes voor peuters.","website":"https://www.monte-pelmo-bloemendaal.nl/","lat":52.4039474,"lng":4.6197413,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Kleine hoorntjes en handige bekertjes speciaal voor kinderen.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Loetje — score: 7 (high) — Loetje heeft expliciete vermelding van kindermenu, kinderstoel en is expliciet kindvriendelijk genoemd.
  // {"name":"Loetje","region":"Haarlem","type":"horeca","description":"Steakhouse met speciaal kindermenu en kindertoelen, specifiek ontworpen voor jonge gasten.","website":"https://www.loetje.nl/locaties/overveen/","lat":52.3884439,"lng":4.6074288,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindvriendelijk kindermenu en beschikbare kindertoelen.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

  // Orangerie Elswout — score: 7 (high) — Orangerie Elswout heeft expliciet kindermenu en wordt gewaardeerd door gasten met kinderen.
  // {"name":"Orangerie Elswout","region":"Haarlem","type":"horeca","description":"Fine dining restaurant met speciaal kindermenu dat door gasten zeer gewaardeerd wordt.","website":"https://www.orangerie-elswout.nl/","lat":52.3783529,"lng":4.5970789,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu dat zeer positief ontvangen wordt.","last_verified_at":"2026-03-02T17:41:55.199Z","verification_source":"osm_discovery"},

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
