/**
 * PeuterPlannen — Insert approved candidates from Laren discovery
 * Generated: 2026-03-02
 *
 * Review Laren_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Laren.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // La Vespa — score: 8 (high) — Restaurant expliciet vermeld als kindvriendelijk ingericht in alle vestigingen.
  // {"name":"La Vespa","region":"Gooi en Vechtstreek","type":"horeca","description":"La Vespa pizzeria in Laren is expliciet kindvriendelijk ingericht met makkelijke toegang en parkeermogelijkheden voor de deur.","website":"https://www.lavespa.nl","lat":52.2583226,"lng":5.2235051,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindvriendelijk ingerichte pizzeria met houtoven en aanpasbare pizza's.","last_verified_at":"2026-03-02T17:00:44.158Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Speciaal kindermenu met kindvriendelijke gerechten expliciet vermeld voor kleine loetjes.
  // {"name":"Loetje","region":"Gooi en Vechtstreek","type":"horeca","description":"Loetje Laren heeft een speciaal kindermenu met lekkere, kindvriendelijke gerechten voor jonge gasten.","website":"https://www.loetje.nl/locaties/laren/","lat":52.2537651,"lng":5.2280802,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar voor kleine loetjes.","last_verified_at":"2026-03-02T17:00:44.158Z","verification_source":"osm_discovery"},

  // Nick Vollebregt — score: 7 (medium) — Klantrecensies vermelden dat kindermenu's goed in de smaak vielen.
  // {"name":"Nick Vollebregt","region":"Gooi en Vechtstreek","type":"horeca","description":"Nick Vollebregt biedt een kindermenu dat goed gewaardeerd wordt door gezinnen.","website":"https://nickvollebregt.nl","lat":52.2593566,"lng":5.2231579,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar en positief beoordeeld door gezinnen.","last_verified_at":"2026-03-02T17:00:44.158Z","verification_source":"osm_discovery"},

  // George LA — score: 7 (medium) — Amerikaanse pannenkoeken expliciet vermeld 'for the little ones' op het menu.
  // {"name":"George LA","region":"Gooi en Vechtstreek","type":"horeca","description":"George LA serveert Amerikaanse pannenkoeken met ahornsiroop speciaal voor de kleintjes.","website":"https://www.georgela.nl","lat":52.2597739,"lng":5.22295,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"American pancakes met maple syrup speciaal voor kinderen.","last_verified_at":"2026-03-02T17:00:44.158Z","verification_source":"osm_discovery"},

  // La Place — score: 7 (medium) — La Place heeft een kids-sectie op de website en is bekend als gezinsvriendelijke horecaketen.
  // {"name":"La Place","region":"Gooi en Vechtstreek","type":"horeca","description":"La Place Laren is een toegankelijke familievriendelijke restaurantketen met kids-opties en ruime openingstijden.","website":"https://www.laplace.com/locaties/la-place-laren","lat":52.2472635,"lng":5.2074626,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kids-menu beschikbaar bij deze grote horecaketen.","last_verified_at":"2026-03-02T17:00:44.158Z","verification_source":"osm_discovery"},

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
