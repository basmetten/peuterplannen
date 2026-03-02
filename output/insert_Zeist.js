/**
 * PeuterPlannen — Insert approved candidates from Zeist discovery
 * Generated: 2026-03-02
 *
 * Review Zeist_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Zeist.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Ouwekamp, ons eetcafé — score: 9 (high) — Ouwekamp biedt speelhoek, zandbak én speeltuin op 50m afstand, ideaal voor jonge kinderen en peuters.
  // {"name":"Ouwekamp, ons eetcafé","region":"Utrechtse Heuvelrug","type":"horeca","description":"Ouwekamp biedt een speelhoek met zandbak voor allerkleinsten en speeltuin op 50 meter afstand, ideaal voor peuters.","website":"https://ouwekamp.nl/","lat":52.0785791,"lng":5.3140228,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Zandbak en speelhoek specifiek voor allerkleinsten, plus speeltuin vlakbij.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Loetje is expliciet kindvriendelijk met speciaal kindermenu voor jonge gasten.
  // {"name":"Loetje","region":"Utrechtse Heuvelrug","type":"horeca","description":"Loetje is kindvriendelijk met een speciaal kindermenu met lekkere, kindvriendelijke gerechten voor kleine loetjes.","website":"https://www.loetje.nl/locaties/zeist/","lat":52.0894177,"lng":5.2471269,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu speciaal samengesteld voor jonge gasten.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

  // Bijzonder Leuk — score: 8 (high) — Café expliciet kindvriendelijk met speelhoek 'mini taartenfabriek' en kindvriendelijk menu aanbod.
  // {"name":"Bijzonder Leuk","region":"Utrechtse Heuvelrug","type":"horeca","description":"Bijzonder Leuk is kindvriendelijk met heerlijke speelhoek 'mini taartenfabriek' en ruim aanbod voor kids op het menu.","website":"https://www.bijzonderleuk-zeist.nl/","lat":52.0861381,"lng":5.2437376,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speelhoek speciaal als 'mini taartenfabriek' met kindvriendelijk menu.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

  // Blik en Burgers — score: 8 (high) — Blik en Burgers biedt grote binnen speelruimte voor kinderen met eten, drinken en spelen.
  // {"name":"Blik en Burgers","region":"Utrechtse Heuvelrug","type":"horeca","description":"Blik en Burgers verwelkomt gasten met eten, drinken en spelen met grote binnenspeel ruimte voor kinderen.","website":"https://blikenburgers.nl","lat":52.0761841,"lng":5.2345128,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Grote binnenspeel ruimte waar kinderen kunnen spelen terwijl ouders eten.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

  // Steakhouse Kepass — score: 7 (high) — Steakhouse expliciet gepositioneerd als geliefde ontmoetingsplek voor gezinnen met warme, ongedwongen sfeer.
  // {"name":"Steakhouse Kepass","region":"Utrechtse Heuvelrug","type":"horeca","description":"Steakhouse Kepass is decennialang een geliefde ontmoetingsplek voor gezinnen met warme inrichting en ongedwongen sfeer.","website":"https://www.kepass.nl","lat":52.099152,"lng":5.2488074,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Expliciet welkom voor gezinnen in een ontspannen omgeving.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

  // 't Jagershuys — score: 7 (high) — Pannenkoekenzaak; minimaal score 6, ideaal voor kinderen inclusief peuters.
  // {"name":"'t Jagershuys","region":"Utrechtse Heuvelrug","type":"pancake","description":"'t Jagershuys is een pannenkoekenzaak, ideaal voor gezinnen met kinderen.","website":"https://www.jagershuys.nl/","lat":52.0884947,"lng":5.2622114,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken zijn perfect voor peuters en jonge kinderen.","last_verified_at":"2026-03-02T14:11:11.054Z","verification_source":"osm_discovery"},

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
