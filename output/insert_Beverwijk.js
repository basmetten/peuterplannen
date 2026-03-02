/**
 * PeuterPlannen — Insert approved candidates from Beverwijk discovery
 * Generated: 2026-03-02
 *
 * Review Beverwijk_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Beverwijk.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Brasserie Grand-Café De Smaeckkamer — score: 8 (high) — Expliciet kindvriendelijk met speeltuin, kinderkamer en kinderkaart genoemd.
  // {"name":"Brasserie Grand-Café De Smaeckkamer","region":"Haarlem","type":"horeca","description":"Brasserie Grand-Café De Smaeckkamer biedt een speeltuin en kinderkamer waar peuters zich kunnen vermaken terwijl ouders genieten van eten en drinken.","website":"https://www.desmaeckkamer.nl/","lat":52.4838314,"lng":4.6436225,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speeltuin en kinderkamer beschikbaar, ideaal voor peuters.","last_verified_at":"2026-03-02T17:41:55.445Z","verification_source":"osm_discovery"},

  // Wereldrestaurant Beverhof — score: 8 (high) — Expliciet kindvriendelijk buffet en gezellige speelhoek voor jonge gasten.
  // {"name":"Wereldrestaurant Beverhof","region":"Haarlem","type":"horeca","description":"Wereldrestaurant Beverhof is ontworpen als kindvriendelijke plek met speelhoek en kindvriendelijk buffet waar peuters welkom zijn.","website":"https://wereldrestaurantbeverhof.nl/","lat":52.4829898,"lng":4.6601276,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gezellige speelhoek en kindvriendelijk buffet voor peuters.","last_verified_at":"2026-03-02T17:41:55.445Z","verification_source":"osm_discovery"},

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
