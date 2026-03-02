/**
 * PeuterPlannen — Insert approved candidates from Nieuwegein discovery
 * Generated: 2026-03-02
 *
 * Review Nieuwegein_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Nieuwegein.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Happy Italy — score: 8 (high) — Binnenspeeltuin met ballenbak, kindvriendelijk, kindermenu, invalidentoilet, kinderfeestjes mogelijk.
  // {"name":"Happy Italy","region":"Utrecht","type":"horeca","description":"Italiaans restaurant met binnenspeeltuin en ballenbak, kindermenu en invalidentoilet aanwezig.","website":"https://www.happyitaly.nl/nl/locaties/nieuwegein/","lat":52.0134282,"lng":5.1158896,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Binnenspeeltuin met ballenbak biedt ideale speelruimte voor peuters.","last_verified_at":"2026-03-02T14:11:11.222Z","verification_source":"osm_discovery"},

  // Restaria Het Anker — score: 7 (high) — Speciale kidsbox met speeltje ontworpen voor kleine kinderen, ondersteunt goed doel.
  // {"name":"Restaria Het Anker","region":"Utrecht","type":"horeca","description":"Restaria met speciale kidsbox voor kinderen inclusief speeltje, plus steun voor KIKA.","website":"https://www.restariahetanker.nl/","lat":52.0076062,"lng":5.0922206,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal ontworpen kidsbox met speeltje voor kleintjes.","last_verified_at":"2026-03-02T14:11:11.222Z","verification_source":"osm_discovery"},

  // Smaak&Stijl — score: 7 (high) — Expliciet kindvriendelijk met speelruimte binnen en buiten, veel ruimte voor kinderen.
  // {"name":"Smaak&Stijl","region":"Utrecht","type":"horeca","description":"Kindvriendelijk restaurant met speelruimte zowel binnen als buiten, veel ruimte voor kinderen.","website":"https://www.smaakenstijl.com/","lat":52.0587706,"lng":5.0784046,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Voldoende speelruimte binnen en buiten voor kinderen om te spelen.","last_verified_at":"2026-03-02T14:11:11.222Z","verification_source":"osm_discovery"},

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
