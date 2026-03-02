/**
 * PeuterPlannen — Insert approved candidates from Soest discovery
 * Generated: 2026-03-02
 *
 * Review Soest_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Soest.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Pannenkoekenboerderij De Smickel — score: 10 (high) — Pannenkoekrestaurant met speelhoek, videokelder, speurtocht en diverse beslag voor kinderen.
  // {"name":"Pannenkoekenboerderij De Smickel","region":"Utrechtse Heuvelrug","type":"pancake","description":"Pannenkoekenboerderij De Smickel is ideaal voor gezinnen met peuters met meerdere speelmogelijkheden binnen en buiten, inclusief videokelder, speurtocht en dagverse pannenkoeken met aangepaste beslag.","website":"https://www.smickel.nl","lat":52.1834297,"lng":5.3044973,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speelhoek, videokelder en speurtocht maken dit een topkeuze voor peuters.","last_verified_at":"2026-03-02T17:00:44.288Z","verification_source":"osm_discovery"},

  // Kwalitaria Délifrance — score: 7 (high) — Fast food met expliciet kindermenu, geschikt voor snelle gezinsmaaltijden.
  // {"name":"Kwalitaria Délifrance","region":"Utrechtse Heuvelrug","type":"horeca","description":"Kwalitaria Délifrance biedt een kindermenu en is een snelle optie voor gezinnen.","website":"https://www.kwalitaria.nl/vestiging/kwalitaria-delifrance-zuid-promenade","lat":52.1644626,"lng":5.3085208,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor peuters.","last_verified_at":"2026-03-02T17:00:44.288Z","verification_source":"osm_discovery"},

  // Kwalitaria De Tamboerijn — score: 7 (high) — Fast food met expliciet kindermenu, geschikt voor gezinnen met peuters.
  // {"name":"Kwalitaria De Tamboerijn","region":"Utrechtse Heuvelrug","type":"horeca","description":"Kwalitaria De Tamboerijn biedt kindermenu en is toegankelijk voor gezinnen.","website":"https://www.kwalitaria.nl/vestiging/kwalitaria-de-tamboerijn","lat":52.1690261,"lng":5.2813921,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar.","last_verified_at":"2026-03-02T17:00:44.288Z","verification_source":"osm_discovery"},

  // Restaurant De Eetvilla — score: 7 (high) — Restaurant met expliciet kinderkaart vermeld op de website.
  // {"name":"Restaurant De Eetvilla","region":"Utrechtse Heuvelrug","type":"horeca","description":"Restaurant De Eetvilla biedt een kinderkaart en is geschikt voor gezinsdiner.","website":"https://eetvilla.nl/","lat":52.1587068,"lng":5.3065466,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderkaart beschikbaar.","last_verified_at":"2026-03-02T17:00:44.288Z","verification_source":"osm_discovery"},

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
