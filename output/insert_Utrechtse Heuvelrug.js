/**
 * PeuterPlannen — Insert approved candidates from Utrechtse Heuvelrug discovery
 * Generated: 2026-03-02
 *
 * Review Utrechtse Heuvelrug_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Utrechtse Heuvelrug.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Het Grote Bos — score: 9 (high) — Indoor speelruimte, kindvriendelijk, kindermenu en activiteiten expliciet vermeld.
  // {"name":"Het Grote Bos","region":"Utrechtse Heuvelrug","type":"horeca","description":"Het Grote Bos is een kindvriendelijk restaurant met indoor speelruimte en activiteiten.","website":"https://www.rcn.nl/nl/vakantieparken/nederland/utrecht/rcn-het-grote-bos/brasserie","lat":52.0558175,"lng":5.3145545,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Indoor speelruimte en activiteiten voor peuters.","last_verified_at":"2026-03-02T14:11:11.467Z","verification_source":"osm_discovery"},

  // Reyck — score: 8 (high) — Expliciet speelhoek en aandacht voor kleine kinderen met dessertkarretje.
  // {"name":"Reyck","region":"Utrechtse Heuvelrug","type":"horeca","description":"Restaurant Reyck biedt een speelhoek voor kleine kinderen en traditioneel Italiaans ijs.","website":"https://www.reyck-doorn.nl/","lat":52.0368978,"lng":5.3197984,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speelhoek waar peuters vrij kunnen spelen.","last_verified_at":"2026-03-02T14:11:11.467Z","verification_source":"osm_discovery"},

  // Bistro LOF — score: 8 (high) — Uitgebreide kinderkaart met poffertjes en diverse gerechten speciaal voor kinderen.
  // {"name":"Bistro LOF","region":"Utrechtse Heuvelrug","type":"horeca","description":"Bistro LOF biedt een uitgebreide kinderkaart met gerechten zoals poffertjes en pasta.","website":"https://parcbroekhuizen.nl/eten-drinken/bistro-lof/","lat":52.0079919,"lng":5.401932,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderkaart met poffertjes en beperkte porties.","last_verified_at":"2026-03-02T14:11:11.467Z","verification_source":"osm_discovery"},

  // Kasteelwinkel Annebetje — score: 7 (medium) — Café bij kasteel met expliciet vermelde activiteiten voor kinderen.
  // {"name":"Kasteelwinkel Annebetje","region":"Utrechtse Heuvelrug","type":"horeca","description":"Café bij Kasteel Amerongen met activiteiten speciaal voor kinderen.","website":"https://www.kasteelamerongen.nl/","lat":51.9971765,"lng":5.4588579,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Activiteiten gericht op kindvriendelijkheid.","last_verified_at":"2026-03-02T14:11:11.467Z","verification_source":"osm_discovery"},

  // 't Vosje — score: 7 (high) — Expliciet kindermenu op de kaart aangeboden.
  // {"name":"'t Vosje","region":"Utrechtse Heuvelrug","type":"horeca","description":"Restaurant 't Vosje biedt een kindermenu voor gezinnen.","website":"https://restaurantvosje.nl/","lat":52.0608882,"lng":5.3865907,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar.","last_verified_at":"2026-03-02T14:11:11.467Z","verification_source":"osm_discovery"},

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
