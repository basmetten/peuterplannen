/**
 * PeuterPlannen — Insert approved candidates from Amsterdam discovery
 * Generated: 2026-03-02
 *
 * Review Amsterdam_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_Amsterdam.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [
  // McDonald's — score: 9 (high) — McDonald's met babyruimte en speelgelegenheid expliciet vermeld.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's met speelgelegenheid en babyruimte, perfect voor gezinnen met peuters.","website":"https://mcdonaldsrestaurant.nl/amsterdam-osdorp-drive","lat":52.355713,"lng":4.7728742,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Speelgelegenheid en babyruimte aanwezig voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // McDonald's — score: 9 (high) — McDonald's met babyruimte expliciet vermeld in services.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's met babyruimte, centraal gelegen op Kalverstraat, geschikt voor gezinnen met peuters.","website":"https://mcdonaldsrestaurant.nl/amsterdam-kalverstraat","lat":52.3711733,"lng":4.8920084,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Babyruimte beschikbaar voor het comfort van peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // McDonald's — score: 9 (high) — McDonald's met speelgelegenheid, babyruimte, kinderfeestjes en kindermenu; zeer kindvriendelijk.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's biedt speelgelegenheid, babyruimte en kindermenu; perfect voor peuters en gezinnen.","website":"https://www.mcdonaldsrestaurant.nl/bijlmerplein-amsterdamse-poort","lat":52.3149986,"lng":4.9535104,"coffee":true,"diaper":true,"alcohol":false,"weather":"both","toddler_highlight":"Speelgelegenheid, babyruimte en kindermenu specifiek voor jonge kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // L'Osteria — score: 9 (high) — Speeltuin, kinderporties, kinderstoelen, kleurpotloden en veilig omheinde buitenspeelruimte.
  // {"name":"L'Osteria","region":"Amsterdam","type":"horeca","description":"L'Osteria is zeer kindvriendelijk met speeltuin, kinderporties, kinderstoelen en kleurpotloden.","website":"https://losteria.net/nl/restaurants/restaurant/amsterdam/","lat":52.3410059,"lng":4.9179626,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Prachtige omheinde speeltuin direct aan terras met kinderporties en -stoelen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Pannenkoekerij Gansi — score: 9 (high) — Pannenkoekerij met speeltuin, speelgoed en dieren; expliciet kindvriendelijk.
  // {"name":"Pannenkoekerij Gansi","region":"Amsterdam","type":"pancake","description":"Pannenkoekerij Gansi is een pannenkoekenzaak met speeltuin, speelgoed en dieren, perfect voor peuters met terras in de zomer.","website":"https://www.kinderboerderijgliphoeve.nl/s-projects-basic","lat":52.3232036,"lng":4.9713577,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speeltuin, speelgoed en dieren maken dit een topbestemming voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's biedt expliciet een babyruimte en is fast-casual dining met standaardmenu's geschikt voor peuters.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's Amsterdam Muntplein biedt een babyruimte en kindvriendelijke faciliteiten.","website":"https://mcdonaldsrestaurant.nl/amsterdam-muntplein","lat":52.3666856,"lng":4.8934827,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte aanwezig en eenvoudig eten geschikt voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Loetje biedt expliciet kindermenu en beschrijft zich als kindvriendelijk met speciale gerechten voor kleine gasten.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Loetje Amsterdam Centraal biedt een speciaal kindermenu met kindvriendelijke gerechten voor de kleine gasten.","website":"https://www.loetje.nl/locaties/amsterdam-centraal/","lat":52.377503,"lng":4.9004373,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu met lekker kindvriendelijke gerechten beschikbaar.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Café Loetje — score: 8 (high) — Café Loetje biedt expliciet kindermenu en beschrijft zich als kindvriendelijk met speciale gerechten voor kleine gasten.
  // {"name":"Café Loetje","region":"Amsterdam","type":"horeca","description":"Café Loetje Amsterdam biedt een speciaal kindermenu met kindvriendelijke gerechten voor de kleine gasten.","website":"https://www.loetje.nl/locaties/amsterdam-cafe/","lat":52.3543672,"lng":4.8842366,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu met lekker kindvriendelijke gerechten beschikbaar.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Blin Queen — score: 8 (high) — Blin Queen is een pannenkoekenzaak die expliciet kids en animals friendly noemt; pancakes zijn ideaal voor peuters.
  // {"name":"Blin Queen","region":"Amsterdam","type":"pancake","description":"Blin Queen is een gezellige pannenkoekenzaak die expliciet kids friendly is met artisanale pannenkoeken.","website":"https://www.blinqueen.com","lat":52.366956,"lng":4.8968557,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kids en animals friendly pancake restaurant met informeel, gastvrij karakter.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Moak Pancakes — score: 8 (high) — Gespecialiseerde pannenkoekenzaak met American style pancakes, ideaal voor kinderen.
  // {"name":"Moak Pancakes","region":"Amsterdam","type":"pancake","description":"Moak Pancakes serveert American style pannenkoeken in een mellow vibe, perfect voor families.","website":"https://www.moakpancakes.nl","lat":52.3565,"lng":4.8907494,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gespecialiseerd in American style pannenkoeken, kindervoeding-vriendelijk.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // SUMO — score: 8 (high) — Japans restaurant met expliciet family-gerichtheid, gratis kleurplaat en kleurpotloden voor kinderen, en verjaardagsfeestjes.
  // {"name":"SUMO","region":"Amsterdam","type":"horeca","description":"SUMO is family-vriendelijk met kleurplaten en kleurpotloden voor kleine gasten, ideaal voor families met peuters.","website":"https://restaurantsumo.com","lat":52.3773967,"lng":4.8950817,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gratis kleurplaat en kleurpotloden voor kleine SUMO-fans zorgen voor vermaak.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // De Natuurkamer — score: 8 (high) — Sociale onderneming met speeltuin 'de natureluur' en expliciet kindvriendelijk profiel.
  // {"name":"De Natuurkamer","region":"Amsterdam","type":"horeca","description":"De Natuurkamer is een café met aan speeltuin 'de natureluur', ideaal voor kinderen en gezinnen.","website":"https://de-natuurkamer.nl/","lat":52.370681,"lng":4.8128534,"coffee":true,"diaper":false,"alcohol":false,"weather":"outdoor","toddler_highlight":"Aangesloten speeltuin de natureluur maakt dit uiterst geschikt voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — McDonald's met expliciet babyruimte en kindvriendelijk concept, ideaal voor peuters.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's Amsterdam Kinkerstraat beschikt over een babyruimte en is volledig ingericht voor families met jonge kinderen.","website":"https://mcdonaldsrestaurant.nl/amsterdam-kinkerstraat","lat":52.3659516,"lng":4.866986,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Babyruimte aanwezig met kindvriendelijk eten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Hop 020 — score: 8 (high) — Pannenkoekenrestaurant in Amstelpark met speeltuin, minigolf en dierenweide direct aanwezig.
  // {"name":"Hop 020","region":"Amsterdam","type":"pancake","description":"Pannenkoekenrestaurant in Amstelpark met aangrenzende speeltuin, minigolf en stadsboerderij met loslopende dieren.","website":"https://www.amstelpark.info/pc-hop-2-0/","lat":52.3291087,"lng":4.8949779,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Perfecte combinatie van pannenkoeken en speelgelegenheid direct in het park.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Expliciet kindermenu met kindvriendelijke gerechten en steak house bekend om familie-vriendelijkheid.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Loetje steakhouse met speciaal kindermenu met lekkere, kindvriendelijke gerechten voor de kleine loetjes.","website":"https://www.loetje.nl/locaties/amsterdam-oost/","lat":52.3571616,"lng":4.9082709,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu speciaal ontworpen voor jonge gasten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Expliciet kindermenu beschikbaar met kindvriendelijke gerechten; duidelijk gericht op jonge gasten.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Loetje biedt een speciaal kindermenu met kindvriendelijke gerechten speciaal ontworpen voor kleine gasten.","website":"https://www.loetje.nl/locaties/amsterdam-aan-t-ij/","lat":52.4029151,"lng":4.8856352,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu met lekker kindvriendelijke gerechten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Roezemoes — score: 8 (high) — Pannenkoekenzaak met pannenkoekendag op zondag; pannenkoeken zijn perfect voor peuters.
  // {"name":"Roezemoes","region":"Amsterdam","type":"pancake","description":"Roezemoes is een pannenkoekenzaak met elke zondag speciale pannenkoekendag, ideaal voor gezinnen.","website":"https://roezemoesamsterdam.nl","lat":52.397864,"lng":4.9412923,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken op zondag, perfect voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Star BBQ — score: 8 (high) — Expliciet kinderzitjes, kindermenu en kindvriendelijk; gratis parkeren en rolstoelvriendelijk.
  // {"name":"Star BBQ","region":"Amsterdam","type":"horeca","description":"Star BBQ heeft kinderzitjes en kindermenu; gratis parkeren maakt het gemakkelijk voor gezinnen.","website":"https://starbbq.nl/","lat":52.2924095,"lng":4.9463129,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kinderzitjes en speciaal kindermenu voor jonge gasten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Steakhouse met expliciete kindvriendelijkheid: kindermenu, verzorgingsruimte en schone toiletten vermeld.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Steakhouse met kindermenu en ruimte om kinderen te verschonen, nette toiletten.","website":"https://www.loetje.nl/locaties/amsterdam-de-pijp/","lat":52.3503436,"lng":4.8912939,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Verzorgingsruimte en accommodatie voor jonge kinderen aanwezig.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // McDonald's — score: 8 (high) — Speelgelegenheid, babyruimte en kinderfeestjes aangeboden; klassiek kindvriendelijk.
  // {"name":"McDonald's","region":"Amsterdam","type":"horeca","description":"McDonald's is expliciet kindvriendelijk met speelgelegenheid, babyruimte en kinderfeestjes.","website":"https://mcdonaldsrestaurant.nl/amsterdam-buikslotermeerplein","lat":52.399101,"lng":4.9362141,"coffee":true,"diaper":true,"alcohol":false,"weather":"indoor","toddler_highlight":"Speelgelegenheid en babyruimte aanwezig.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Kaap Amsterdam — score: 8 (high) — Kindermenu, pannenkoeken, ruimte voor kinderen, creatieve activiteiten en onbeperkt limonade.
  // {"name":"Kaap Amsterdam","region":"Amsterdam","type":"pancake","description":"Kaap Amsterdam is zeer kindvriendelijk met pannenkoeken, ruimte voor kinderen en creatieve activiteiten.","website":"https://kaapamsterdam.nl","lat":52.3697918,"lng":4.9773284,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Pannenkoeken, speelruimte en oneindig limonade voor kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Loetje — score: 8 (high) — Expliciet kindermenu en kindvriendelijke gerechten genoemd, voldoende parkeergelegenheid.
  // {"name":"Loetje","region":"Amsterdam","type":"horeca","description":"Loetje biedt een speciaal kindermenu met kindvriendelijke gerechten voor de jonge gasten.","website":"https://www.loetje.nl/locaties/amsterdam-zuidas/","lat":52.3355616,"lng":4.8693094,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Dedicated kindermenu met gerechten speciaal voor kleine kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // De Beren — score: 8 (high) — Expliciet kindermenu, diner & film arrangement voor kinderen, family-friendly.
  // {"name":"De Beren","region":"Amsterdam","type":"horeca","description":"De Beren biedt een speciaal kindermenu en diner & film arrangement inclusief bioscoopvoucher voor kinderen.","website":"https://www.beren.nl/vestigingen/amsterdam-noord","lat":52.4006253,"lng":4.9346354,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Dedicated kindermenu en family entertainment arrangement.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Hemelsbreed Cafe — score: 8 (high) — Hemelsbreed Cafe is duidelijk gericht op baby's en kinderen met ondersteuningsprogramma's en counseling.
  // {"name":"Hemelsbreed Cafe","region":"Amsterdam","type":"horeca","description":"Hemelsbreed Cafe richt zich expliciet op ouders met baby's en kinderen tot 16 jaar met regelmatige begeleiding en adviesprogramma's.","website":"https://hemelsbreedcafe.nl","lat":52.3158724,"lng":4.977353,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciaal café voor ouders met baby's en jonge kinderen met professionele ondersteuning.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Café-Restaurant Amsterdam — score: 7 (high) — Café-Restaurant Amsterdam biedt expliciet een kindermenu, wat aangeeft dat het kindvriendelijk is.
  // {"name":"Café-Restaurant Amsterdam","region":"Amsterdam","type":"horeca","description":"Café-Restaurant Amsterdam beschikt over een kindermenu speciaal voor kinderen.","website":"https://cradam.nl","lat":52.3842205,"lng":4.8682145,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor familie-eten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Du Maroc — score: 7 (high) — Du Maroc biedt expliciet speciale kidsmenu's samengesteld voor kinderen.
  // {"name":"Du Maroc","region":"Amsterdam","type":"horeca","description":"Du Maroc beschikt over speciale kidsmenu's en een gevarieerd menu voor het hele gezin.","website":"https://www.restaurantdumaroc.nl","lat":52.3591448,"lng":4.8262917,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciale kidsmenu's samengesteld met kinderen in gedachten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Eetcafe Singel 404 — score: 7 (high) — Pannenkoekenzaak met uitgebreid ontbijtmenu inclusief Nederlandse pannenkoeken.
  // {"name":"Eetcafe Singel 404","region":"Amsterdam","type":"pancake","description":"Eetcafé met pannenkoeken en all-day breakfast, geschikt voor families met kleine kinderen.","website":"https://singel404.nl","lat":52.3689187,"lng":4.8874401,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Pannenkoeken en simpele ontbijtoptions voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Sumo — score: 7 (high) — Japans restaurant expliciet gericht op families met speciaal kleurplaatjes en kleurpotloden voor kinderen.
  // {"name":"Sumo","region":"Amsterdam","type":"horeca","description":"Sumo biedt kleurplaten en kleurpotloden voor jonge bezoekers, ideaal voor gezinnen.","website":"https://www.restaurantsumo.com/","lat":52.3647599,"lng":4.882715,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kleurplaten en kleurpotloden beschikbaar voor kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Eggs Benaddicted — score: 7 (high) — Breakfast restaurant met pannenkoeken en simpel voedsel, ideaal voor peuters.
  // {"name":"Eggs Benaddicted","region":"Amsterdam","type":"pancake","description":"Eggs Benaddicted serveert Amerikaanse pannenkoeken en eenvoudig ontbijt, geschikt voor families.","website":"https://benaddicted.com","lat":52.3551558,"lng":4.8931195,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken en simpele breakfast options zoals muesli ideaal voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Café Van Puffelen — score: 7 (high) — Restaurant met expliciet speciaal samengesteld kindermenu voor 'kleintjes'.
  // {"name":"Café Van Puffelen","region":"Amsterdam","type":"horeca","description":"Café Van Puffelen biedt een speciaal kindermenu en gezellige grachtzetting, ideaal voor families.","website":"https://www.restaurantvanpuffelen.com","lat":52.3716857,"lng":4.8832208,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Smakelijk kindermenu speciaal voor de kleintjes samengesteld.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Omelegg — score: 7 (high) — Familie bedrijf met nadruk op family-friendly concept; American pancakes en breakfast/lunch menu aantrekkelijk voor families.
  // {"name":"Omelegg","region":"Amsterdam","type":"pancake","description":"Omelegg is een family-run restaurant gespecialiseerd in ontbijt met Amerikaanse pannenkoeken, perfect voor jonge gezinnen.","website":"https://omelegg.com","lat":52.3789055,"lng":4.8853349,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gezinstradities met pannenkoeken en ontbijtgerechten in een familiesfeer.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Toos & Roos — score: 7 (high) — Pannenkoekenzaak met American pancakes en breakfast/lunch, klassiek peutergeschikt.
  // {"name":"Toos & Roos","region":"Amsterdam","type":"pancake","description":"Toos & Roos specialiseert zich in American pancakes en ontbijt, ideaal voor gezinnen met peuters.","website":"https://www.toosenroos.nl/","lat":52.3704586,"lng":4.8832856,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Heerlijke American pancakes en ontbijtmenu populair bij gezinnen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Omelegg — score: 7 (high) — Family-run restaurant met expliciet 'family' keyword, American pancakes en uitgebreid breakfast/lunch aanbod geschikt voor gezinnen.
  // {"name":"Omelegg","region":"Amsterdam","type":"pancake","description":"Omelegg is een family-run restaurant gespecialiseerd in American pancakes en eiergerechten, wat uitstekend aansluit bij de smaak van peuters.","website":"https://omelegg.com","lat":52.3760489,"lng":4.8997948,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"American pancakes en eenvoudige eiergerechten zijn ideale keuzes voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Eggs Benaddicted — score: 7 (high) — Breakfast restaurant met klassieke Amerikaanse pannenkoeken als speciaal gerecht.
  // {"name":"Eggs Benaddicted","region":"Amsterdam","type":"pancake","description":"Eggs Benaddicted biedt klassieke Amerikaanse pannenkoeken en een volledig breakfast menu.","website":"https://benaddicted.com","lat":52.364384,"lng":4.8849504,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Fluffy pannenkoeken met maple en boter zijn ideaal voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Tacos & Tequila — score: 7 (high) — Mexicaans restaurant met babytoestel, verschoontafel en aangepaste maaltijden voor kinderen.
  // {"name":"Tacos & Tequila","region":"Amsterdam","type":"horeca","description":"Tacos & Tequila heeft babytoestel en verschoontafel beschikbaar, maaltijden zijn aanpasbaar voor kinderen.","website":"https://tacosentequila.nl","lat":52.3634016,"lng":4.8855319,"coffee":true,"diaper":true,"alcohol":true,"weather":"indoor","toddler_highlight":"Babystoel en verschoontafel aanwezig, maaltijden kunnen naar kinderwensen worden aangepast.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // MOAK — score: 7 (high) — Pannenkoekenzaak gespecialiseerd in Amerikaanse pannenkoeken met mellow vibe.
  // {"name":"MOAK","region":"Amsterdam","type":"pancake","description":"MOAK is een pannenkoekenspecialist met Amerikaanse stijl pannenkoeken en verse juices.","website":"https://www.moakpancakes.nl/","lat":52.3687268,"lng":4.9027985,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gespecialiseerd in Amerikaanse pannenkoeken, perfect voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Belcampo — score: 7 (high) — Café in bibliotheek met expliciet 'Familie & Kids' sectie op website en activiteiten.
  // {"name":"Belcampo","region":"Amsterdam","type":"horeca","description":"Belcampo is een leescafé in bibliotheek de Hallen met expliciet familie- en kindsfocus.","website":"https://www.cafebelcampo.nl/","lat":52.366818,"lng":4.8688807,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Speciale aandacht voor families en kinderen met kindgerichte activiteiten en programmering.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Steiger 4 — score: 7 (high) — Italiaans restaurant bij boothuis waar kinderen kunnen spelen en zomer activiteiten.
  // {"name":"Steiger 4","region":"Amsterdam","type":"horeca","description":"Steiger 4 is een kindvriendelijk restaurant aan water waar kinderen kunnen spelen en waar zomeractiviteiten zoals zwemmen en kanoën beschikbaar zijn.","website":"https://www.boothuis.amsterdam","lat":52.360322,"lng":4.8158962,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Speelmogelijkheden voor kinderen en familiale sfeer aan het water.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // IJs-Break — score: 7 (high) — Ice cream zaak met expliciet kindvriendelijke toppings en dips zoals smarties en discodip, populair bij kinderen.
  // {"name":"IJs-Break","region":"Amsterdam","type":"horeca","description":"IJs-Break biedt diverse toppings en dips speciaal populair bij kinderen, waaronder discodip, smarties en marshmallows.","website":"https://ijs-break.nl/","lat":52.3501188,"lng":4.7885138,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Leuke traktatie met kindvriendelijke toppings zoals smarties en discodip.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Yalla Yalla — score: 7 (high) — Arabisch restaurant met expliciet kindermenu aanwezig, geschikt voor peuters.
  // {"name":"Yalla Yalla","region":"Amsterdam","type":"horeca","description":"Yalla Yalla biedt kindermenu's met kipnuggets en kipfiletspies geserveerd met friet.","website":"https://www.yalla-yalla-amsterdam.nl","lat":52.3510704,"lng":4.8546141,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar met kipnuggets en kipfiletspies.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Kwalitaria — score: 7 (high) — Friturezaak met expliciet kindermenu aanwezig, geschikt voor peuters.
  // {"name":"Kwalitaria","region":"Amsterdam","type":"horeca","description":"Kwalitaria biedt kindermenu's en is een kindvriendelijke snackbar.","website":"https://kwalitaria.nl/","lat":52.3741703,"lng":4.9381149,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar met kindvriendelijke gerechten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Bistro G.P. by George — score: 7 (high) — Expliciet genoemd dat families en kids ervan houden, Frans all-day menu met zonnig terras.
  // {"name":"Bistro G.P. by George","region":"Amsterdam","type":"horeca","description":"Bistro G.P. met grote zonnige terras expliciet gericht op families en kinderen met all-day menu.","website":"https://www.bistrogelderlandplein.nl/","lat":52.3306459,"lng":4.8788901,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Restaurant dat families en kids expliciet liefdevol ontvangt met flexibel all-day aanbod.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Grills Fastfood — score: 7 (high) — Fastfood met gezins buckets en expliciet kindermenu genoemd.
  // {"name":"Grills Fastfood","region":"Amsterdam","type":"horeca","description":"Grill's Fastfood met gezins buckets en kindermenu-opties.","website":"https://www.grills-fastfood-amsterdam.nl/","lat":52.3588292,"lng":4.9905025,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Gezins buckets en kindermenu beschikbaar voor gemakkelijk eten met kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Pof — score: 7 (high) — Expliciet vermeld dat kinderen veel te beleven en te spelen hebben op het terrein.
  // {"name":"Pof","region":"Amsterdam","type":"horeca","description":"Pof biedt een speelterrein waar kinderen kunnen spelen terwijl ouders eten en genieten van lokale bieren en gerechten.","website":"https://www.pofamsterdam.nl","lat":52.4193163,"lng":4.8741832,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Kinderen kunnen spelen op het terrein terwijl ouders eten.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Emos Grill en Döner — score: 7 (high) — Kindermenu expliciet vermeld met patat, snack naar keuze en drank; fastfood geschikt voor peuters.
  // {"name":"Emos Grill en Döner","region":"Amsterdam","type":"horeca","description":"Emos Grill biedt een kindermenu met patat, snack naar keuze en frisdrank, perfect voor jonge kinderen.","website":"https://www.emosdoner-amsterdam.nl/","lat":52.3927607,"lng":4.9543552,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Kindermenu met patat en snack naar keuze.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Arabiya — score: 7 (high) — Ruime locatie expliciet beschreven als ideaal voor gezinnen met warme ambiance.
  // {"name":"Arabiya","region":"Amsterdam","type":"horeca","description":"Arabiya is een sfeervolle en ruime locatie specifiek gericht op gezinnen die samen willen genieten van halal grill.","website":"https://www.arabya.nl/","lat":52.3930662,"lng":4.9542949,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Warm en ruim restaurant speciaal ingericht voor gezinnen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // CoCo — score: 7 (high) — Ontbijtbuffet expliciet omschreven als 'voor het hele gezin' met kindvriendelijk aanbod.
  // {"name":"CoCo","region":"Amsterdam","type":"horeca","description":"CoCo biedt een heerlijk uitgebreid ontbijtbuffet speciaal voor het hele gezin elke zondag.","website":"https://www.cocobyvh.nl","lat":52.3982681,"lng":4.9409857,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Uitgebreid ontbijtbuffet speciaal voor gezinnen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Rozenboom — score: 7 (high) — Pannenkoekenzaak met expliciet kindermenu (kipfilet met friet en kinderijsje).
  // {"name":"Rozenboom","region":"Amsterdam","type":"pancake","description":"Pannenkoekenzaak met kindermenu met kipfilet, friet en kinderijsje.","website":"http://www.derozenboom.com","lat":52.3692431,"lng":4.8907645,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kindermenu beschikbaar met friet en ijs.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Corner Bakery — score: 7 (high) — Bakkerij-café met pannenkoeken en kindvriendelijke brekfast/brunch cultuur, fluffy pancakes vermeld.
  // {"name":"Corner Bakery","region":"Amsterdam","type":"pancake","description":"Bakkerij-café gespecialiseerd in all-day breakfast met fluffy pancakes en huisgemaakte taarten.","website":"https://cornerbakeryamsterdam.com/","lat":52.3535376,"lng":4.8403383,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Fluffy pannenkoeken en kinderachtige gerechten zoals milkshakes.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Piqniq — score: 7 (high) — Café-pannenkoekenzaak met uitgebreid ontbijtmenu inclusief pannenkoeken en kindvriendelijke opzet.
  // {"name":"Piqniq","region":"Amsterdam","type":"pancake","description":"Café met diverse ontbijtmenu inclusief pannenkoeken, vers fruit en desserts.","website":"https://www.piqniq.nl","lat":52.3802674,"lng":4.8861378,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Pannenkoeken en diversiteit aan ontbijtopties geschikt voor kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Casa del Toro — score: 7 (high) — Argentijnse steakhouse met expliciete kindvriendelijkheidservaringen: maaltijden voor kinderen, burgers en pizza.
  // {"name":"Casa del Toro","region":"Amsterdam","type":"horeca","description":"Steakhouse waar gezinnen zich welkom voelen met kindermaaltijden zoals burgers, pizza en chicken wraps.","website":"https://casadeltoro.nl/","lat":52.3751984,"lng":4.8924534,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Vriendelijk en spontaan personeel, veel kindgerechte opties op menu.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Bakers & Roasters — score: 7 (high) — Breakfast/brunch restaurant met pannenkoeken en family-focus, ethische ingrediënten, gezinsvriendelijk concept.
  // {"name":"Bakers & Roasters","region":"Amsterdam","type":"pancake","description":"Breakfast/brunch restaurant met pannenkoeken, lokale bakkerijproducten en ethische ingrediënten.","website":"https://www.bakersandroasters.com","lat":52.3573232,"lng":4.8898583,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Gezinsvriendelijke breakfast cultuur met pannenkoeken en vers voedsel.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Florya — score: 7 (medium) — Speeltuin, pannenkoeken, kindermenu (€9-9.95), maar speeltuin beschrijving beperkt.
  // {"name":"Florya","region":"Amsterdam","type":"pancake","description":"Florya biedt pannenkoeken, kindermenu en een speeltuin voor kinderen.","website":"https://www.floryarestaurant.nl","lat":52.3753372,"lng":4.8459578,"coffee":true,"diaper":false,"alcohol":true,"weather":"outdoor","toddler_highlight":"Speeltuin en pannenkoeken beschikbaar voor kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Mojo — score: 7 (high) — Biedt expliciet kids menu (4-10y) en all-you-can-eat concept geschikt voor families.
  // {"name":"Mojo","region":"Amsterdam","type":"horeca","description":"Mojo biedt een kids menu (4-10 jaar) met onbeperkt dagverse sushi en warme Japanse gerechten.","website":"https://mo-jo.eu/location/amsterdam/","lat":52.3758617,"lng":4.9076499,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speciaal kids menu en family-friendly all-you-can-eat concept.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Bakers and Roasters — score: 7 (high) — Pannenkoekenzaak (score 6+) met family keyword en breakfast/pancake focus kindvriendelijk.
  // {"name":"Bakers and Roasters","region":"Amsterdam","type":"pancake","description":"Bakers and Roasters is een pannenkoekenzaak en café met focus op family-friendly breakfast en pancakes.","website":"https://bakersandroasters.com/","lat":52.3702029,"lng":4.9126142,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Pannenkoeken en breakfast items ideaal voor gezinnen met peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // De Jonge Admiraal — score: 7 (high) — Pannenkoekenzaak (score 6+) expliciet vermeld met menu onderdeel pannenkoeken.
  // {"name":"De Jonge Admiraal","region":"Amsterdam","type":"pancake","description":"De Jonge Admiraal is een pannenkoekencafé met breakfast en lunch opties inclusief pannenkoeken.","website":"https://dejongeadmiraal.nl","lat":52.3638979,"lng":4.9382926,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Pannenkoeken en lichte maaltijden ideaal voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Burger & Fries 56 — score: 7 (high) — Expliciet 'kid-friendly' en 'family-friendly' in features vermeld.
  // {"name":"Burger & Fries 56","region":"Amsterdam","type":"horeca","description":"Burger & Fries 56 is expliciet family-friendly en kid-friendly met casual ambiance.","website":"https://www.quandoo.nl/en/place/burger-fries-56-70139?aid=63","lat":52.363179,"lng":4.8847228,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Family-friendly burger restaurant met casual kindvriendelijke sfeer.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Miss Scarlett — score: 7 (high) — Expliciet kindermenu aanwezig en diverse openingstijden voor gezinnen.
  // {"name":"Miss Scarlett","region":"Amsterdam","type":"horeca","description":"Miss Scarlett biedt een kindermenu en is toegankelijk voor families met diverse openingstijden.","website":"https://miss-scarlett.nl/","lat":52.2977785,"lng":4.9580722,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu beschikbaar voor jonge eetsters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // HEMA restaurant — score: 7 (high) — HEMA restaurant met expliciet speelgoed en gezins-focus; bevat baby-gerelateerde producten en kindvriendelijke atmosfeer.
  // {"name":"HEMA restaurant","region":"Amsterdam","type":"horeca","description":"HEMA restaurant is een familiegerichte zaak met speelgoed en gezinsactiviteiten.","website":"https://hema.nl","lat":52.3990093,"lng":4.9377606,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Speelgoed aanwezig en kindvriendelijke winkelomgeving.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Locals Coffee — score: 7 (high) — Pannenkoekzaak met all-day brunch en pancakes; minimaal score 6 voor pannenkoeken, met brunch aanbod.
  // {"name":"Locals Coffee","region":"Amsterdam","type":"pancake","description":"Locals Coffee serveert signature pancakes en all-day brunch perfect voor gezinnen.","website":"https://www.localscoffee.nl/","lat":52.3560742,"lng":4.8906655,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Triple stacked pancakes en brunch-menukaart aantrekkelijk voor kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Spirit — score: 7 (high) — Pannenkoekzaak met bananen pannenkoekjes en diverse recepten; minimaal score 6 voor pannenkoeken.
  // {"name":"Spirit","region":"Amsterdam","type":"pancake","description":"Spirit serveert pannenkoeken inclusief bananen pannenkoekjes geschikte voor jonge kinderen.","website":"https://www.spiritrestaurants.nl/amsterdam/","lat":52.3675893,"lng":4.9258975,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Pannenkoeken in verschillende varianten aantrekkelijk voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Lumbini — score: 7 (high) — Expliciet kids food options en family-friendly aanbod met positieve reviews over kindvriendelijkheid.
  // {"name":"Lumbini","region":"Amsterdam","type":"horeca","description":"Lumbini biedt uitgebreide kids food opties en is expliciet family-friendly.","website":"https://lumbinirestaurant.nl/","lat":52.3668621,"lng":4.8952277,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Goed vegetarisch en kids food aanbod specifiek voor families.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // 30ml — score: 7 (high) — Café met pancakes deluxe en kindvriendelijk menu; pannenkoeken expliciet aangeboden.
  // {"name":"30ml","region":"Amsterdam","type":"pancake","description":"30ml café serveert pancakes deluxe en diverse kindvriendelijke opties.","website":"https://30ml.nl/vestigingen/30ml-arena-amsterdam/","lat":52.3139563,"lng":4.9522182,"coffee":true,"diaper":false,"alcohol":false,"weather":"indoor","toddler_highlight":"Pancakes deluxe met fruit en zoete toppings aantrekkelijk voor jonge kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // esra — score: 7 (high) — Restaurant expliciet welkom voor kids met voorbereiding op passende tafel.
  // {"name":"esra","region":"Amsterdam","type":"horeca","description":"Esra is een Mediterraans-Turks restaurant dat kinderen welkom heet, mits je van tevoren contact opneemt zodat zij een passende tafel kunnen organiseren.","website":"https://www.esra.amsterdam/","lat":52.3724543,"lng":4.938763,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Vriendelijk restaurant dat kinderen verwelkomt met vooraf gemaakte afspraken.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Kasap — score: 7 (high) — Turks restaurant expliciet als kindvriendelijk gemarkeerd met geopende faciliteiten.
  // {"name":"Kasap","region":"Amsterdam","type":"horeca","description":"Kasap is een Turks restaurant dat duidelijk kindvriendelijk is met buitenterras en lange openingstijden.","website":"https://www.kasap.nl","lat":52.3583134,"lng":4.8065453,"coffee":true,"diaper":false,"alcohol":true,"weather":"both","toddler_highlight":"Duidelijk kindvriendelijk Turks restaurant met terras.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // De Uitsmijter — score: 7 (high) — Breakfast restaurant met pannenkoeken en family focus.
  // {"name":"De Uitsmijter","region":"Amsterdam","type":"pancake","description":"De Uitsmijter is een breakfastrestaurant gespecialiseerd in pannenkoeken, ideaal voor gezinnen.","website":"https://www.deuitsmijter.com/","lat":52.3423857,"lng":4.8928587,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Breakfast restaurant bekend om pannenkoeken, perfect voor peuters.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Couscous Bar — score: 7 (high) — Couscousbar expliciet gericht op families met family portions en kindvriendelijk beleid.
  // {"name":"Couscous Bar","region":"Amsterdam","type":"horeca","description":"Couscous Bar biedt speciaal family portions en is expliciet gericht op gezinnen.","website":"https://couscousbar.nl","lat":52.3668736,"lng":4.8713221,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Family portions speciaal ontworpen voor grote gezinnen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Hello Couscous — score: 7 (high) — Couscousrestaurant met expliciet kindermenu op de website.
  // {"name":"Hello Couscous","region":"Amsterdam","type":"horeca","description":"Hello Couscous biedt een duidelijk kindermenu wat gezinnen tegemoet komt.","website":"https://www.hellocouscous.nl/","lat":52.3868158,"lng":4.9263249,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Kindermenu speciaal beschikbaar voor jonge kinderen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

  // Couscous Bar — score: 7 (high) — Couscousbar expliciet gericht op families met family portions.
  // {"name":"Couscous Bar","region":"Amsterdam","type":"horeca","description":"Couscous Bar biedt speciaal family portions en is expliciet gericht op gezinnen.","website":"https://couscousbar.nl","lat":52.363468,"lng":4.9329461,"coffee":true,"diaper":false,"alcohol":true,"weather":"indoor","toddler_highlight":"Family portions speciaal ontworpen voor grote gezinnen.","last_verified_at":"2026-03-02T17:21:01.904Z","verification_source":"osm_discovery"},

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
