/**
 * PeuterPlannen — Insert approved candidates from Gooise Meren discovery
 * Generated: 2026-03-02
 *
 * Review Gooise Meren_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Gooise Meren.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // LEUK — score: 9 (high) — Uitgebreid speelhoek, gaming, airhockeytafel, oppas aanwezig en pannenkoeken beschikbaar.
  // {"name":"LEUK","region":"Gooi en Vechtstreek","type":"pancake","description":"LEUK is een zeer kindvriendelijk pannenkoeken- en speelrestaurant met Wii's, PlayStations, airhockeytafel, speelhoek en altijd een oppas aanwezig.","website":"https://restaurantleuk.nl/","lat":52.2739541,"lng":5.1648436,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Grote speelhoek met puzzels, duplotafel, keukentje, winkeltje en altijd een oppas aanwezig.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // De Leeuwenkuil — score: 8 (high) — Speeltuin aanwezig naast pannenkoeken en terras waar ouders kunnen toezien.
  // {"name":"De Leeuwenkuil","region":"Gooi en Vechtstreek","type":"pancake","description":"De Leeuwenkuil biedt een speeltuin voor de allerkleinsten en pannenkoeken op een zonneterras met uitzicht op meer en strand.","website":"https://midgetgolfbaan.nl","lat":52.328446,"lng":5.1223808,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Speeltuin waar peuters fijn kunnen spelen terwijl ouders op het terras toezicht houden.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Paviljoen Heidezicht — score: 8 (high) — Grote speeltuin aanwezig, familiegericht met klimmen en klauteren voor kinderen.
  // {"name":"Paviljoen Heidezicht","region":"Gooi en Vechtstreek","type":"horeca","description":"Paviljoen Heidezicht heeft een grote speeltuin met klimtoestellen en is ideaal voor gezinnen die willen fietsen of wandelen.","website":"https://heidezicht.com","lat":52.2646135,"lng":5.1825529,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Grote speeltuin aanwezig waar peuters kunnen spelen en klimmen.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Grande Selene — score: 8 (high) — Speelkamer expliciet voor kinderen aanwezig, gezinsvriendelijk restaurant.
  // {"name":"Grande Selene","region":"Gooi en Vechtstreek","type":"horeca","description":"Grande Selene is een Italiaans familierestaurant met een speelkamer waar kinderen naar hartenlust kunnen spelen.","website":"http://grandeselene.nl","lat":52.2795772,"lng":5.1579875,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speelkamer waar kinderen naar hartenlust kunnen spelen terwijl ouders eten.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Dekselz — score: 8 (high) — Expliciet kindvriendelijk met speelgoed, spelletjes en vermaakinrichtingen voor kinderen.
  // {"name":"Dekselz","region":"Gooi en Vechtstreek","type":"horeca","description":"Dekselz is kindvriendelijk ingericht met diverse speelgoed, spelletjes en een zonnig terras.","website":"https://dekselz.nl/","lat":52.2743067,"lng":5.1641292,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Diverse speelgoed en spelletjes beschikbaar om kinderen bezig te houden.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's met speelgelegenheid en babyruimte expliciet vermeld.
  // {"name":"McDonald's","region":"Gooi en Vechtstreek","type":"horeca","description":"McDonald's Muiden beschikt over speelgelegenheid en babyruimte.","website":"https://mcdonaldsrestaurant.nl/muiden/","lat":52.3227924,"lng":5.0819454,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Speelgelegenheid en babyruimte aanwezig voor peuters.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Bregje — score: 7 (high) — Expliciet kindermenu aanwezig, wat aanduidt dat het restaurant kindvriendelijk is ingericht.
  // {"name":"Bregje","region":"Gooi en Vechtstreek","type":"horeca","description":"Bregje beschikt over een kindermenu en biedt een gastvrije sfeer voor gezinnen.","website":"https://proeflokaalbregje.nl/uit-eten/bussum/","lat":52.2756433,"lng":5.1639228,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor peuters en jonge kinderen.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Het Hert — score: 7 (high) — Familiegericht restaurant met halve porties voor kinderen tegen halve prijs.
  // {"name":"Het Hert","region":"Gooi en Vechtstreek","type":"horeca","description":"Het Hert biedt halve porties voor kinderen tegen gereduceerde prijs en is gespecialiseerd in gezinsetentjes.","website":"https://www.hethert.com/","lat":52.296371,"lng":5.161379,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Alle gerechten beschikbaar in halve porties voor kinderen tegen half tarief.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Archibald — score: 7 (high) — Kinderkaart expliciet vermeld, aanduiding van kindvriendelijk restaurant.
  // {"name":"Archibald","region":"Gooi en Vechtstreek","type":"horeca","description":"Archibald biedt een kinderkaart en is geschikt voor gezinnen.","website":"https://www.archibald.nl","lat":52.2801759,"lng":5.1627284,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Aparte kinderkaart beschikbaar.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // La Vespa — score: 7 (high) — Kindvriendelijk ingerichte restaurants met goed parkeren en toegankelijkheid.
  // {"name":"La Vespa","region":"Gooi en Vechtstreek","type":"horeca","description":"La Vespa restaurants zijn kindvriendelijk ingericht en goed bereikbaar.","website":"https://www.lavespa.nl","lat":52.2797593,"lng":5.1579997,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindvriendelijk ingerichte restaurants met gemakkelijke parkeerplaatsen.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

  // Plaza Zuid — score: 7 (high) — Kindermenu en kindvriendelijk familierestaurant met speciale kindereisjes.
  // {"name":"Plaza Zuid","region":"Gooi en Vechtstreek","type":"horeca","description":"Plaza Zuid biedt kindermenu opties inclusief speciaal kleuterijsje.","website":"http://plazazuid.nl","lat":52.2660114,"lng":5.1778074,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciaal kleuterijsje beschikbaar met kindvriendelijke smaken.","last_verified_at":"2026-03-02T17:00:44.035Z","verification_source":"osm_discovery"},

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
