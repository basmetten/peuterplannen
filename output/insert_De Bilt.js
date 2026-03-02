/**
 * PeuterPlannen — Insert approved candidates from De Bilt discovery
 * Generated: 2026-03-02
 *
 * Review De Bilt_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_De Bilt.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Pancake in the Park — score: 10 (high) — Expliciet kindvriendelijk, speeltuin omheind, pannenkoeken, veilig en overzichtelijk design.
  // {"name":"Pancake in the Park","region":"Utrecht","type":"pancake","description":"Kindvriendelijke hotspot met ruime omheinde speeltuin met zandbakken, schommels, glijbaan, speelhuisje en springkussen plus pannenkoeken.","website":"https://www.pancakeinthepark.nl/","lat":52.1222029,"lng":5.1362348,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Omheinde speeltuin speciaal ontworpen voor kindveiligheid en pannenkoeken.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Restaurant De Paddestoel — score: 9 (high) — Expliciet kindvriendelijk met speelplein en pannenkoeken, bosrijke omgeving ideaal voor gezinnen.
  // {"name":"Restaurant De Paddestoel","region":"Utrecht","type":"pancake","description":"Bosrestaurant met speelplein waar kinderen zich kunnen vermaken en heerlijke pannenkoeken.","website":"https://www.de-paddestoel.com/","lat":52.1791905,"lng":5.2023523,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Speelplein en pannenkoeken in natuuromgeving.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Koetshuis Beerschoten — score: 9 (high) — Speeltuin is kernvoorziening met zandbakken, schommels, glijbaan; duidelijk op kleine kinderen gericht.
  // {"name":"Koetshuis Beerschoten","region":"Utrecht","type":"horeca","description":"Coffee shop met uitgebreide speeltuin met zandbakken, schommels en glijbaan voor kleine kinderen.","website":"https://koetshuisbeerschoten.nl/","lat":52.1063283,"lng":5.2007753,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Excellente speeltuin speciaal voor kleine kinderen.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Biltse Boer — score: 9 (high) — Ijssalon met speeltuin; concrete speelvoorzieningen voor kinderen; zeer kindvriendelijk.
  // {"name":"Biltse Boer","region":"Utrecht","type":"horeca","description":"IJssalon met aangrenzende speeltuin waar kinderen zich uitsluitend kunnen vermaken.","website":"https://www.biltseboer.nl/","lat":52.1018966,"lng":5.1998726,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Speeltuin bijzonderheidmiddel bij ijssalon.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // PK Bilthoven — score: 8 (high) — Expliciet gezinsplek met kinderkaart beschikbaar; duidelijk op families gericht.
  // {"name":"PK Bilthoven","region":"Utrecht","type":"horeca","description":"Restaurant positioneert zich als ideale plek om te dineren met het gezin, met kinderkaart beschikbaar.","website":"https://www.pkbilthoven.nl/","lat":52.1293546,"lng":5.2064252,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderkaart speciaal voor gezinnen.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Mauritshoeve — score: 7 (high) — Generaties brengen kinderen mee; rustige natuurlocatie; expliciet kindvriendelijk gepositioneerd.
  // {"name":"Mauritshoeve","region":"Utrecht","type":"horeca","description":"Restaurant waar families traditioneel hun kinderen meenemen, gelegen in rustige natuuromgeving.","website":"https://www.mauritshoeve.nl/","lat":52.1607072,"lng":5.2004188,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Generatie-overbrugging familieadres met rustige setting.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Proefwerk — score: 7 (high) — Expliciet kindermenu aanwezig; restaurant positioneert zich als welkomend voor kinderen.
  // {"name":"Proefwerk","region":"Utrecht","type":"horeca","description":"Restaurant met kindermenu beschikbaar op het aanbod.","website":"https://proefwerkdebilt.nl/","lat":52.1089008,"lng":5.1803135,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu voor aangepaste maaltijden.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Bubbles & Blessings — score: 7 (high) — Babyshowers en kinderfeestjes expliciet aangeboden; kidskwaliteiten beschikbaar.
  // {"name":"Bubbles & Blessings","region":"Utrecht","type":"horeca","description":"Restaurant met speciaal aanbod voor babyshowers en kinderfeestjes, cadeau- en kidswinkel.","website":"https://www.bubblesandblessings.nl/","lat":52.128546,"lng":5.2070969,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Babyshowers en kinderfeestjes expliciet ondersteund.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

  // Loft 88 — score: 7 (high) — Expliciet kids menu beschikbaar; informeel restaurant-setting kindvriendelijk.
  // {"name":"Loft 88","region":"Utrecht","type":"horeca","description":"Informele boho restaurant met kids menu voor gezin-vriendelijke eetervaring.","website":"https://www.loft88.nl","lat":52.1287063,"lng":5.2067797,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kids menu in ontspannen atmosfeer.","last_verified_at":"2026-03-02T14:11:10.970Z","verification_source":"osm_discovery"},

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
