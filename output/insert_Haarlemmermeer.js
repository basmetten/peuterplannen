/**
 * PeuterPlannen — Insert approved candidates from Haarlemmermeer discovery
 * Generated: 2026-03-02
 *
 * Review Haarlemmermeer_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Haarlemmermeer.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Bliss Kidscafé — score: 9 (high) — Expliciet kidscafé met speelhoek, kolfruimte, kindertoilet, babyhangmat en volledig op peuters gericht.
  // {"name":"Bliss Kidscafé","region":"Amsterdam","type":"horeca","description":"Bliss Kidscafé is speciaal ontworpen voor gezinnen met peuters met veilige speelhoek, kolfruimte, kindertoilet en babyhangmat.","website":"https://blisskidscafe.nl/","lat":52.3020001,"lng":4.6924955,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Volledig ingerichte speelhoek, babyhangmat en kindertoilet aanwezig.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's met speelgelegenheid, babyruimte en kinderfeestjes expliciet vermeld.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's Hoofddorp biedt speelgelegenheid, babyruimte en is geschikt voor kinderfeestjes.","website":"https://mcdonaldsrestaurant.nl/hoofddorp","lat":52.2894586,"lng":4.7233249,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Speelgelegenheid en babyruimte aanwezig.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // Pannenkoeken Paviljoen — score: 8 (high) — Pannenkoekenzaak expliciet voor kinderen met arrangementen en verjaardagen.
  // {"name":"Pannenkoeken Paviljoen","region":"Amsterdam","type":"pancake","description":"Pannenkoeken Paviljoen specialiseert zich in pannenkoeken voor kinderen met mogelijkheden voor verjaardagen.","website":"https://pannenkoekenpaviljoen.nl/","lat":52.3299814,"lng":4.6517013,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoekenzaak met speciale aandacht voor kinderen.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // Venneper Lodge — score: 8 (high) — Expliciet kindvriendelijk met zowel binnenste als buitenspeelparadijs en pannenkoeken op menu.
  // {"name":"Venneper Lodge","region":"Amsterdam","type":"pancake","description":"Venneper Lodge is een hippe plek voor alle leeftijden met een speelparadijs zowel binnen als buiten, en biedt pannenkoeken en diverse gerechten.","website":"https://venneperlodge.nl/","lat":52.2652926,"lng":4.596094,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Binnenste en buitenspeelparadijs maken dit een uitstekende keuze voor peuters.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // Olmenhorst — score: 7 (high) — Expliciet kindvriendelijk met speeltuin naast horecagelegenheid genoemd.
  // {"name":"Olmenhorst","region":"Amsterdam","type":"horeca","description":"Olmenhorst biedt een oase voor gezinnen met peuters met een speeltuin naast de horecagelegenheid.","website":"https://www.olmenhorst.nl/","lat":52.2548729,"lng":4.5921712,"coffee":true,"diaper":false,"alcohol":false,"weather":"both","toddler_highlight":"Speeltuin aanwezig naast restaurant.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // Joseph — score: 7 (high) — Kids corner, overdekt terrein en afgesloten terrein specifiek genoemd voor veiligheid.
  // {"name":"Joseph","region":"Amsterdam","type":"horeca","description":"Joseph beschikt over een kids corner, overdekt en afgesloten terrein, ideaal voor veilig genieten met peuters.","website":"https://www.barbistrojoseph.nl/","lat":52.3037948,"lng":4.6907267,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kids corner en veilig afgesloten terrein aanwezig.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // Orries — score: 7 (high) — Expliciet kindvriendelijk genoemd met positieve ervaringen van gezinnen met kleinkinderen.
  // {"name":"Orries","region":"Amsterdam","type":"horeca","description":"Orries staat bekend als kindvriendelijk met flexibele reserveringen en warme bediening voor gezinnen.","website":"https://orries.nl/","lat":52.2651177,"lng":4.6339338,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Flexibel en gastvrij voor gezinnen met kleine kinderen.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // McDonald's — score: 7 (high) — McDonald's met babyruimte expliciet vermeld.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's Schiphol beschikt over babyruimte en kindgerichte menu's.","website":"https://mcdonaldsrestaurant.nl/schiphol-noord-spottersplaats","lat":52.3211824,"lng":4.7922831,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Babyruimte aanwezig.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

  // 3D Diner Hoofddorp — score: 7 (high) — Expliciet families en kindermenu vermeld, private dining concept met entertainment.
  // {"name":"3D Diner Hoofddorp","region":"Amsterdam","type":"horeca","description":"3D Diner biedt een uniek private dining concept waar kinderen worden geëntertaind met kindermenu beschikbaar.","website":"https://3d-diner-hoofddorp.nl/","lat":52.2916733,"lng":4.7020508,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Private dining ruimte met kinderentertainment.","last_verified_at":"2026-03-02T17:21:02.036Z","verification_source":"osm_discovery"},

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
