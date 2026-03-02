/**
 * PeuterPlannen — Insert approved candidates from Diemen discovery
 * Generated: 2026-03-02
 *
 * Review Diemen_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Diemen.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Otra más — score: 8 (high) — Otra más is expliciet barrièrevrij, welkom voor gezinnen met kinderwagens en heeft vegetarische opties.
  // {"name":"Otra más","region":"Amsterdam","type":"horeca","description":"Otra más is volledig barrièrevrij en expliciet welkom voor gezinnen met baby's en kinderwagens.","website":"https://otramas.metro.rest","lat":52.3384059,"lng":4.9599479,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Barrièrevrij toegankelijk en expliciet gastvrij voor gezinnen met jonge kinderen.","last_verified_at":"2026-03-02T17:21:02.079Z","verification_source":"osm_discovery"},

  // Drussius — score: 7 (high) — Drussius biedt expliciet babyshowers en family events aan met kinvriendelijke activiteiten.
  // {"name":"Drussius","region":"Amsterdam","type":"horeca","description":"Drussius organiseert babyshowers en familiële bijeenkomsten met speelse activiteiten en gezelligheid.","website":"https://www.brasseriedrusius.nl/","lat":52.3425139,"lng":4.9632486,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gespecialiseerd in babyshower-feestjes met leuke activiteiten en hapjes.","last_verified_at":"2026-03-02T17:21:02.079Z","verification_source":"osm_discovery"},

  // Hachi — score: 7 (high) — Hachi biedt expliciet kindermenu's voor kinderen van 4+ jaar aan met vaste prijsstelling.
  // {"name":"Hachi","region":"Amsterdam","type":"horeca","description":"Hachi heeft speciale kindermenu's met gestaffelde prijzen voor kinderen van 4 tot 11 jaar.","website":"https://hachi-diemen.nl/","lat":52.3381434,"lng":4.9626746,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Duidelijk kindermenu met leeftijdspecifieke opties vanaf 4 jaar.","last_verified_at":"2026-03-02T17:21:02.079Z","verification_source":"osm_discovery"},

  // Margherita Tutta La Vita — score: 7 (high) — Margherita Tutta La Vita biedt expliciet workshops voor kinderen en family-vriendelijke activiteiten aan.
  // {"name":"Margherita Tutta La Vita","region":"Amsterdam","type":"horeca","description":"Margherita Tutta La Vita organiseert workshops voor kinderen en biedt authentieke Italiaanse pizza.","website":"https://margheritapizza.nl/","lat":52.3290082,"lng":4.9558358,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Workshops voor kinderen maken dit restaurant educatief en speels.","last_verified_at":"2026-03-02T17:21:02.079Z","verification_source":"osm_discovery"},

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
