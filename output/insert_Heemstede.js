/**
 * PeuterPlannen — Insert approved candidates from Heemstede discovery
 * Generated: 2026-03-02
 *
 * Review Heemstede_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Heemstede.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Pannenkoekenrestaurant De Konijnenberg — score: 9 (high) — Pannenkoekenzaak expliciet gericht op families met kinderen, gratis parkeren, dicht bij Linnaeushof speeltuin.
  // {"name":"Pannenkoekenrestaurant De Konijnenberg","region":"Haarlem","type":"pancake","description":"Pannenkoekenrestaurant De Konijnenberg is speciaal gericht op families, heeft gratis parkeren en ligt op 500m van speeltuin Linnaeushof.","website":"https://www.dekonijnenberg.nl","lat":52.3400923,"lng":4.6052617,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Familierestaurant met pannenkoeken en dicht bij Linnaeushof speeltuin voor extra activiteiten.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

  // China Palace — score: 8 (high) — Gratis kinderen 0-3 jaar, gereduceerde prijzen 4-8 jaar, all-you-can-eat zonder tijdslimiet ideaal voor families.
  // {"name":"China Palace","region":"Haarlem","type":"horeca","description":"China Palace biedt gratis eten voor peuters (0-3 jaar) en all-you-can-eat zonder tijdslimiet, perfect voor ontspannen familiedines.","website":"https://www.chinapalace-heemstede.nl","lat":52.35296,"lng":4.6333099,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gratis toegang voor kinderen 0-3 jaar bij all-you-can-eat.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

  // Brasserie Boudewijn — score: 7 (medium) — Kindermenu beschikbaar, warme gastvrije sfeer geschikt voor families.
  // {"name":"Brasserie Boudewijn","region":"Haarlem","type":"horeca","description":"Brasserie Boudewijn biedt een kindermenu en warme, gastvrije sfeer waar gezinnen welkom zijn.","website":"https://www.brasserieboudewijn.nl/","lat":52.3603343,"lng":4.6289226,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor kleinere eters.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

  // Bistro Deux — score: 7 (high) — Pannenkoekenzaak met kindermenu, concrete gerechten aangepast voor kinderen beschikbaar.
  // {"name":"Bistro Deux","region":"Haarlem","type":"pancake","description":"Bistro Deux is een pannenkoekenzaak met speciaal kindermenu inclusief kipnuggets, frikandel en andere kindvriendelijke gerechten.","website":"https://www.bistrodeux.nl","lat":52.3509256,"lng":4.6213629,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu met gerechten speciaal geschikt voor peuters.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

  // Asian Delight — score: 7 (medium) — Kindermenu en family dim sum aangeboden, expliciet familiegeoriënteerd concept.
  // {"name":"Asian Delight","region":"Haarlem","type":"horeca","description":"Asian Delight biedt kindermenu en family dim sum pakketten, wat aangeeft dat het restaurant family-vriendelijk is.","website":"https://www.asiandelights-heemstede.nl/","lat":52.3596022,"lng":4.6054062,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu en family dim sum beschikbaar.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

  // La Rosario — score: 7 (high) — Kindermenu tot 12 jaar beschikbaar met complete maaltijd inclusief ijsje.
  // {"name":"La Rosario","region":"Haarlem","type":"horeca","description":"La Rosario biedt een kindermenu tot 12 jaar met keuze uit biefsteak, spareribs of kip, inclusief salade, frites en ijsje.","website":"https://www.larosario.nl/heemstede/","lat":52.3490357,"lng":4.6213444,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar met complete maaltijd en dessert.","last_verified_at":"2026-03-02T17:41:55.114Z","verification_source":"osm_discovery"},

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
