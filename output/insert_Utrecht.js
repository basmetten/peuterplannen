/**
 * PeuterPlannen — Insert approved candidates from Utrecht discovery
 * Generated: 2026-03-02
 *
 * Review Utrecht_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Utrecht.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // Miyabi — score: 9 (high) — Gratis kindermenu voor kinderen 0-4 jaar, expliciet peuter-vriendelijk.
  // {"name":"Miyabi","region":"Utrecht","type":"horeca","description":"Aziatisch restaurant met gratis kindermenu voor peuters (0-4 jaar), zeer doelgericht.","website":"https://miyabi-asian-cuisine.eatbu.com","lat":52.0978024,"lng":5.0633946,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gratis kindermenu voor kinderen 0-4 jaar.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Molencafé — score: 9 (high) — Speeltuintje en dieren op erf maken dit erg peuter-vriendelijk.
  // {"name":"Molencafé","region":"Utrecht","type":"horeca","description":"Molencafé biedt een speeltuintje voor kleintjes en lieve dieren op het erf, ideaal voor peuters die willen spelen.","website":"https://www.molendester.nu/molencafe/","lat":52.0897095,"lng":5.1005359,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Speeltuintje en dieren maken het aantrekkelijk voor peuters.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's heeft babyruimte (diaper changing facility) en standaard kindvriendelijke voorzieningen.
  // {"name":"McDonald's","region":"Utrecht","type":"horeca","description":"McDonald's met babyruimte, kindermenu en voldoende voorzieningen voor gezinnen.","website":"https://mcdonaldsrestaurant.nl/utrecht","lat":52.1038508,"lng":5.0600818,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte beschikbaar voor verschoning.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Kwalitaria — score: 8 (high) — Kwalitaria benadrukt dat je er met het hele gezin terecht kunt en heeft kindermenu met friet, snack en verrassing.
  // {"name":"Kwalitaria","region":"Utrecht","type":"horeca","description":"Snackbar waar je met het hele gezin terecht kunt met kindermenu.","website":"https://kwalitaria.nl/de-meern/veldhof","lat":52.0844039,"lng":5.0124801,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu speciaal ontworpen voor kleine snackfanaten.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Humphrey's — score: 8 (high) — Expliciet kindermenu en gerichte aandacht voor kinderen.
  // {"name":"Humphrey's","region":"Utrecht","type":"horeca","description":"Humphrey's biedt een aangepast kindermenu zodat iedereen kan genieten van een gezellig avondje uit.","website":"https://humphreys.nl/onze-restaurants/humphreys-utrecht/","lat":52.0918278,"lng":5.1190352,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu speciaal ontworpen voor jonge diners.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — Expliciet babyruimte en gespecialiseerde services voor families.
  // {"name":"McDonald's","region":"Utrecht","type":"horeca","description":"McDonald's Lange Viestraat biedt babyruimte en speelvoorzieningen, perfect voor families met jonge kinderen.","website":"https://mcdonaldsrestaurant.nl/utrecht","lat":52.0934191,"lng":5.1160152,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte en speeltoestellen beschikbaar.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — Expliciet babyruimte en gespecialiseerde services voor families.
  // {"name":"McDonald's","region":"Utrecht","type":"horeca","description":"McDonald's Gildenkwartier biedt babyruimte en speelvoorzieningen, perfect voor families met jonge kinderen.","website":"https://mcdonaldsrestaurant.nl/utrecht/","lat":52.0915065,"lng":5.111383,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte en speeltoestellen beschikbaar.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Kebap Factory — score: 8 (high) — Speelhoek speciaal voor kinderen met speelgoed, expliciet kindvriendelijk.
  // {"name":"Kebap Factory","region":"Utrecht","type":"horeca","description":"Kebab restaurant met speciaal ingerichte speelcorner vol speelgoed waar kinderen veilig kunnen spelen.","website":"https://www.kebapfactory.nl/","lat":52.0918842,"lng":5.1044174,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Ruime kindercorner met allerlei speelgoed.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // De Hondekop — score: 8 (high) — Kinderstoelen en luierstation maken dit expliciet peuter-vriendelijk.
  // {"name":"De Hondekop","region":"Utrecht","type":"horeca","description":"De Hondekop heeft kinderstoelen en een luierstation, plus enkele spellen voor kinderen.","website":"https://dehondekop.nl","lat":52.1002732,"lng":5.0955097,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderstoelen en luierstation aanwezig.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Lunet IV — score: 8 (high) — Speelmateriaal en kabouterpad speciaal voor kleine kinderen beschikbaar.
  // {"name":"Lunet IV","region":"Utrecht","type":"horeca","description":"Lunet IV biedt speelmateriaal en een wandelspeurtocht met kabouterpad speciaal voor kleine kinderen.","website":"https://fortlunet4.nl/","lat":52.0687719,"lng":5.1336284,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Speelmateriaal en interactief kabouterpad.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Kwalitaria — score: 7 (high) — Kwalitaria heeft expliciet kindermenu met friet, snacks en verrassingen speciaal voor kinderen.
  // {"name":"Kwalitaria","region":"Utrecht","type":"horeca","description":"Snackbar met speciaal kindermenu met friet, snacks en verrassingen.","website":"https://www.kwalitaria.nl/vestiging/kwalitaria-parkwijk","lat":52.087901,"lng":5.05411,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu perfect voor kleine snackfanaten.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Loetje — score: 7 (high) — Loetje benadrukt expliciet dat ze nadenken aan jonge gasten met speciaal kindermenu.
  // {"name":"Loetje","region":"Utrecht","type":"horeca","description":"Steakhouse met speciaal kindermenu voor jonge gasten.","website":"https://www.loetje.nl/locaties/utrecht/","lat":52.091783,"lng":5.121441,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindvriendelijk kindermenu speciaal voor kleine loetjes.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // DomCafé — score: 7 (high) — DomCafé heeft babyruimte en kindertarief; expliciet kindervriendelijk.
  // {"name":"DomCafé","region":"Utrecht","type":"horeca","description":"Café bij de Domkerk met babyruimte en kindertarief.","website":"https://domkerk.nl/bezoek","lat":52.0906881,"lng":5.1226166,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte beschikbaar voor gezinnen met peuters.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Balije Park Restaurant — score: 7 (high) — Restaurant met expliciet positieve ervaring met kleine kinderen bij vieringen; medewerkers meegedacht.
  // {"name":"Balije Park Restaurant","region":"Utrecht","type":"horeca","description":"Restaurant waar medewerkers actief medenken voor kinderen bij feesten.","website":"https://balijepark.nl/","lat":52.0804986,"lng":5.0226256,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Medewerkers hebben positieve ervaring met kleine kinderen.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Fort aan de Klop — score: 7 (high) — Fort met restaurant waar kinderen paaseieren zoeken en gezinsbrunch; familieactiviteiten.
  // {"name":"Fort aan de Klop","region":"Utrecht","type":"horeca","description":"Restaurant met terraseiland waar kinderen paaseieren zoeken en gezinsbrunch.","website":"https://www.fortaandeklop.com/","lat":52.1194833,"lng":5.0889314,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Activiteiten voor kinderen zoals paaseieren zoeken.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // PizzArt — score: 7 (high) — PizzArt heeft speciale kinderpizza (bambino) met eenvoudige ingrediënten.
  // {"name":"PizzArt","region":"Utrecht","type":"horeca","description":"Pizzeria met speciale kinderpizza (bambino) voor kinderen.","website":"https://www.pizzartutrecht.nl/","lat":52.0650219,"lng":5.1369744,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciale kinderpizza perfect voor jonge eeterse.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Piero's — score: 7 (high) — Expliciet kindvriendelijk Italiaans restaurant met pizza's die kinderen graag eten.
  // {"name":"Piero's","region":"Utrecht","type":"horeca","description":"Piero's is een kindvriendelijk Italiaans restaurant waar pizza's perfect zijn voor kinderen.","website":"https://www.pierosutrecht.nl/","lat":52.0808861,"lng":5.1244917,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pizza's die peuters graag eten.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Creta — score: 7 (high) — Grieks fast food met aparte kindersectie en speciale griekse pita's voor kinderen.
  // {"name":"Creta","region":"Utrecht","type":"horeca","description":"Creta is een grieks fast food met speciale kinderpita's en dedicated kindersectie.","website":"https://www.creta-utrecht.nl/","lat":52.0975757,"lng":5.1051072,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciale griekse pita's speciaal voor kinderen.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Crazy Bun Burgers — score: 7 (high) — Burgerbar met speciaal kids menu inclusief mini smashburgers en verrassingsgeschenk.
  // {"name":"Crazy Bun Burgers","region":"Utrecht","type":"horeca","description":"Crazy Bun Burgers heeft een speciaal kids menu met mini smashburgers en een leuke verrassingsgeschenk.","website":"https://www.crazy-bun-burgers.nl/","lat":52.0988473,"lng":5.1029235,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Mini smashburgers met kinderlimonade en verrassingsgeschenk.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Chidóz — score: 7 (high) — Expliciet kindvriendelijk Mexicaans restaurant met focus op kinderen.
  // {"name":"Chidóz","region":"Utrecht","type":"horeca","description":"Chidóz is een expliciet kindvriendelijk Mexicaans restaurant.","website":"https://chidoz.mx/","lat":52.0949526,"lng":5.127115,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Restaurant specifiek ingericht voor kinderen.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Popo — score: 7 (high) — Mexicaans restaurant met aparte kindermenu, expliciet geschikt voor kinderen.
  // {"name":"Popo","region":"Utrecht","type":"horeca","description":"Popo is een authentiek Mexicaans restaurant met aparte kindermenu.","website":"https://popo-utrecht.nl/","lat":52.0929602,"lng":5.1248509,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Authentiek Mexicaans restaurant met kindermenu.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Moak — score: 7 (high) — Pannenkoekenzaak met Amerikaanse pannenkoeken, juices en relaxte sfeer.
  // {"name":"Moak","region":"Utrecht","type":"pancake","description":"Pannenkoekenzaak Moak biedt Amerikaanse pannenkoeken en sappen in een ontspannen sfeer.","website":"https://www.moakpancakes.nl/","lat":52.0923353,"lng":5.1179992,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken zijn ideaal voor peuters.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Eetwinkel Ikook — score: 7 (high) — Expliciet avondeten voor dreumes met zachte, gezonde recepten.
  // {"name":"Eetwinkel Ikook","region":"Utrecht","type":"horeca","description":"Eetwinkel Ikook biedt speciaal avondeten voor dreumes met zachte, gezonde recepten.","website":"https://www.eetwinkelikook.nl/","lat":52.0937233,"lng":5.0962642,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Menu specifiek ontworpen voor dreumes (0-4 jaar).","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Kasap — score: 7 (high) — Expliciet kindvriendelijk, buitenterras, Turks restaurant.
  // {"name":"Kasap","region":"Utrecht","type":"horeca","description":"Turks restaurant dat zichzelf expliciet als kindvriendelijk promoot met buitenterras.","website":"https://www.kasap.nl","lat":52.1154585,"lng":5.0338155,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Kindvriendelijk restaurant met buitenterras.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Hoeve Wielrevelt — score: 7 (high) — Café bij Kasteel de Haar met nabijgelegen speeltuin en wandelroutes, gezins-gericht.
  // {"name":"Hoeve Wielrevelt","region":"Utrecht","type":"horeca","description":"Café dicht bij speelnatuur en avontuurlijke wandelroutes, ideaal voor gezinnen met kinderen.","website":"https://www.hoevewielrevelt.nl/","lat":52.1183684,"lng":5.0036011,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Ligging bij speelnatuur en kasteel maakt het zeer gezinsvriendelijk.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // Indo Food House — score: 7 (high) — Kindermenu met poffertjes en frietjes-opties specifiek geschikt voor kinderen.
  // {"name":"Indo Food House","region":"Utrecht","type":"horeca","description":"Indo Food House heeft een kindermenu met kipsaté, frietjes en poffertjes met poedersuiker.","website":"https://indofoodhouse.nl/","lat":52.0959784,"lng":5.063471,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu met poffertjes en frietjes-opties.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

  // De Pieper — score: 7 (high) — Kindermenu en snackbar-concept maken dit geschikt voor peuters.
  // {"name":"De Pieper","region":"Utrecht","type":"horeca","description":"De Pieper is een snackbar met kindermenu, burgers en friet.","website":"https://www.depieperutrecht.nl/","lat":52.0951334,"lng":5.130217,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu met aanpassingen voor kinderen.","last_verified_at":"2026-03-02T14:21:50.248Z","verification_source":"osm_discovery"},

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
