/**
 * PeuterPlannen — Insert approved candidates from Groningen discovery
 * Generated: 2026-03-02
 *
 * Review Groningen_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Groningen.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Bodega y Tapas — score: 8 (high) — Tapas-restaurant met gratis entree voor kinderen onder 4 jaar.
  // {"name":"Bodega y Tapas","region":"Groningen","type":"horeca","description":"Bodega y Tapas aan Nieuwe Ebbingestraat biedt gratis maaltijden voor peuters onder 4 jaar.","website":"https://www.bodega-y-tapas.nl/vestigingen/noorderplantsoen/","lat":53.2274602,"lng":6.560655,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderen jonger dan 4 jaar eten volledig gratis.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's met expliciete babyruimte genoemd.
  // {"name":"McDonald's","region":"Groningen","type":"horeca","description":"McDonald's biedt babyruimte, kindermenu en volledige faciliteiten voor families.","website":"https://mcdonaldsrestaurant.nl/herestraat-hoendiep-ter-borch","lat":53.2136636,"lng":6.5405484,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte aanwezig; speciale kinderopties en speelgelegenheid.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Bodega y Tapas — score: 8 (high) — Tapas-restaurant met gratis entree voor kinderen onder 4 jaar.
  // {"name":"Bodega y Tapas","region":"Groningen","type":"horeca","description":"Bodega y Tapas aan Damsterdiep biedt gratis maaltijden voor peuters onder 4 jaar.","website":"https://www.bodega-y-tapas.nl/vestigingen/damsterdiep/","lat":53.2174756,"lng":6.5752688,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderen jonger dan 4 jaar eten volledig gratis.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Artsy Avenue — score: 8 (high) — Café expliciet welkom voor kinderen; creatieve activiteiten.
  // {"name":"Artsy Avenue","region":"Groningen","type":"horeca","description":"Artsy Avenue is expliciet kindvriendelijk en biedt creatieve bezigheden voor kinderen.","website":"https://artsy-avenue.nl/","lat":53.218841,"lng":6.5651288,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kinderen zijn van harte welkom; perfect voor samen creatief bezig zijn.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Bodega y Tapas — score: 8 (high) — Tapas-restaurant met gratis entree voor kinderen onder 4 jaar.
  // {"name":"Bodega y Tapas","region":"Groningen","type":"horeca","description":"Bodega y Tapas in Haren biedt gratis maaltijden voor peuters onder 4 jaar.","website":"https://www.bodega-y-tapas.nl/vestigingen/haren/","lat":53.1737746,"lng":6.6018499,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderen jonger dan 4 jaar eten volledig gratis.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Eethuys Stadspark — score: 8 (high) — Restaurant met kinderboerderij; expliciet gericht op kinderentertainment.
  // {"name":"Eethuys Stadspark","region":"Groningen","type":"horeca","description":"Eethuys Stadspark biedt kinderboerderij; combinatie van restaurant en dierenactiviteiten.","website":"https://campingstadspark.nl/horeca-op-camping-stadspark","lat":53.2013064,"lng":6.5361434,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Kinderboerderij aanwezig; ideaal voor jonge kinderen die dieren willen zien.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Cafetaria Friet van Piet — score: 7 (high) — Cafetaria met expliciet kindermenu en kinderportie aanbod.
  // {"name":"Cafetaria Friet van Piet","region":"Groningen","type":"horeca","description":"Friet van Piet biedt kindermenus en portie-opties speciaal voor jonge kinderen.","website":"https://www.cafetariafrietvanpiet.nl","lat":53.2108377,"lng":6.5794116,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu schnitzel biedt aangepaste porties voor kleine eters.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // 't Feithhuis — score: 7 (high) — Regionaal restaurant met kids diner optie en kindvriendelijk aanbod.
  // {"name":"'t Feithhuis","region":"Groningen","type":"horeca","description":"'t Feithhuis biedt 2-gangen kids diner en is duidelijk gericht op families.","website":"https://www.restaurant-feithhuis.nl/","lat":53.2191895,"lng":6.5692807,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciale kids menu-opties met aangepaste grootte en prijs.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Cafetaria Kerklaan — score: 7 (high) — Cafetaria met expliciete kids-producten en softijs speciaal voor kinderen.
  // {"name":"Cafetaria Kerklaan","region":"Groningen","type":"horeca","description":"Kerklaan biedt kids cone en kids beker; duidelijk kindvriendelijk.","website":"https://www.cafetaria-kerklaan.nl","lat":53.223928,"lng":6.5533983,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciale kids ijsporties en drankjes tegen lage prijs.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Bistro Beiroet — score: 7 (high) — Fast food met kindermenu; Libanese specialiteiten ook voor kinderen.
  // {"name":"Bistro Beiroet","region":"Groningen","type":"horeca","description":"Bistro Beiroet biedt kindermenu met desserters en aangepaste dranken.","website":"https://www.bistrobeiroet.nl/","lat":53.2491361,"lng":6.601803,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar met kindvriendelijke opties.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Jantje's Steakcafé — score: 7 (high) — Steakrestaurant met kindermenu.
  // {"name":"Jantje's Steakcafé","region":"Groningen","type":"horeca","description":"Jantje's Steakcafé biedt kindermenu optie naast regulier aanbod.","website":"https://www.jantjessteakcafe.nl/rijksweg","lat":53.2259727,"lng":6.5976578,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor jonge eters.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Tapasco — score: 7 (high) — Tapas-restaurant met expliciet kinderaanbod voor kinderen tot 11 jaar.
  // {"name":"Tapasco","region":"Groningen","type":"horeca","description":"Tapasco biedt onbeperkt tapas voor kinderen; duidelijk gezinsvriendelijk.","website":"https://www.tapasco.nl/","lat":53.2164849,"lng":6.5649124,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciale kinderaanbod met onbeperkt tapas tegen vaste prijs.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // Kattencafé OP Z'N KOP — score: 7 (high) — Kattencafé waar kids welkom zijn; combinatie van dieren en creatief plezier.
  // {"name":"Kattencafé OP Z'N KOP","region":"Groningen","type":"horeca","description":"Kattencafé OP Z'N KOP is expliciet welkom voor kinderen; unieke ervaring met katten.","website":"https://opznkop.nl/","lat":53.2207894,"lng":6.5662596,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kinderen mogen katten observeren in gezellige café-omgeving.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // La Casa — score: 7 (high) — Pizza & grill restaurant met kindermenu.
  // {"name":"La Casa","region":"Groningen","type":"horeca","description":"La Casa biedt kindermenu met beef burgers; duidelijk gezinsvriendelijk.","website":"https://www.lacasa-tenboer.nl/","lat":53.2738918,"lng":6.6985911,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor jonge eters.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // NOK — score: 7 (medium) — Kindermenu expliciet vermeld, restaurant met diverse eetgelegenheden.
  // {"name":"NOK","region":"Groningen","type":"horeca","description":"Restaurant met terras en kindermenu aanwezig, geschikt voor families.","website":"https://www.nokgroningen.nl/","lat":53.2190313,"lng":6.5702469,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Kindermenu beschikbaar voor jongere bezoekers.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

  // La Place — score: 7 (medium) — Family restaurant chain met kindermenu in informatie vermeld.
  // {"name":"La Place","region":"Groningen","type":"horeca","description":"Family restaurant chain met aandacht voor kinderen en kindermenu.","website":"https://www.laplace.com","lat":53.2191527,"lng":6.5665278,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Family restaurant met kindervoorzieningen.","last_verified_at":"2026-03-02T14:21:50.294Z","verification_source":"osm_discovery"},

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
