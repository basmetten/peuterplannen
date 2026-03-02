/**
 * PeuterPlannen — Insert approved candidates from Woerden discovery
 * Generated: 2026-03-02
 *
 * Review Woerden_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Woerden.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Spies & Spijs — score: 9 (high) — Kinderspeelhoek, kinderstoelen en rôtisserie-concept ideaal voor gezinnen met peuters.
  // {"name":"Spies & Spijs","region":"Utrecht","type":"horeca","description":"Rodizio grill restaurant met kinderspeelhoek en kinderstoelen; perfect voor families met jonge kinderen.","website":"https://www.spiesenspijs.nl","lat":52.1159444,"lng":4.8365267,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderspeelhoek en kinderstoelen aanwezig; ideaal voor gezinnen met peuters.","last_verified_at":"2026-03-02T14:11:11.383Z","verification_source":"osm_discovery"},

  // Bistro de Bock — score: 7 (high) — Expliciet 'kindvriendelijke sfeer' met 'gevarieerd menu voor jong en oud' en ideaal voor kinderen.
  // {"name":"Bistro de Bock","region":"Utrecht","type":"horeca","description":"Gezellig restaurant met kindvriendelijke sfeer en gevarieerd menu voor families met jonge kinderen.","website":"https://bistrodebock.nl/","lat":52.0850995,"lng":4.8829022,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Bistro biedt uitdrukkelijk kindvriendelijke atmosfeer en gevarieerd aanbod.","last_verified_at":"2026-03-02T14:11:11.383Z","verification_source":"osm_discovery"},

  // Lieke's IJs — score: 7 (high) — Expliciet kindvriendelijk ijs met unieke smaken, dieren ter plekke en kinderen zijn enthousiast.
  // {"name":"Lieke's IJs","region":"Utrecht","type":"horeca","description":"Kindvriendelijk ijssalon met originele smaken zoals popcornijs, dieren op locatie voor interactie.","website":"https://liekesijs.nl","lat":52.0826466,"lng":4.8360813,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Popcornijs is een topper voor kinderen en er zijn koeien die ze kunnen bekijken.","last_verified_at":"2026-03-02T14:11:11.383Z","verification_source":"osm_discovery"},

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
