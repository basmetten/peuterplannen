/**
 * Editorial content for region and type hub pages.
 * Bundled at build time — no filesystem access needed at runtime.
 * Source of truth: /content/seo/regions/*.md and /content/seo/types/*.md
 */

export interface EditorialContent {
  meta_title: string;
  meta_description: string;
  sections: Array<{ heading: string; body: string }>;
}

// ---------------------------------------------------------------------------
// Region editorial content (keyed by region slug)
// ---------------------------------------------------------------------------

export const REGION_EDITORIAL: Record<string, EditorialContent> = {
  amsterdam: {
    meta_title: 'Amsterdam met peuters | rustige buurten, regenopties en kindvriendelijke stops',
    meta_description: 'Amsterdam met peuters vraagt om slimme keuzes: korte routes, rustige buurten, binnenopties en horeca waar je niet na tien minuten weg wilt.',
    sections: [
      { heading: 'Waarom Amsterdam anders zoekt', body: 'Amsterdam heeft veel aanbod, maar ook veel frictie: drukte, smalle stoepen, fietsverkeer en locaties die op papier leuk klinken maar met jonge kinderen onhandig voelen. Daarom werkt deze pagina het best als filter op tempo. Niet alles hoeft in het centrum te gebeuren.' },
      { heading: 'Wat vaak beter werkt dan je denkt', body: 'Voor peuters zijn een rustige speeltuin, een kindvriendelijke lunchplek of een compacte binnenstop vaak sterker dan drie bekende highlights achter elkaar. Amsterdam is vooral goed als je een paar slimme keuzes combineert en ruimte laat voor een korte dag.' },
    ],
  },
  rotterdam: {
    meta_title: 'Rotterdam met peuters | ruime routes, binnenopties en plekken die tempo aankunnen',
    meta_description: 'Rotterdam met peuters: kies uit ruime buitenplekken, sterke binnenopties en gezinsvriendelijke stops zonder centrumgedoe.',
    sections: [
      { heading: 'Waarom Rotterdam vaak makkelijker voelt', body: 'Rotterdam werkt met jonge kinderen vaak beter dan mensen verwachten. De stad is ruim, heeft veel moderne plekken en je kunt sneller schakelen tussen park, museum, horeca en een korte autorit dan in oudere binnensteden.' },
      { heading: 'Waar deze pagina op stuurt', body: 'Niet op het "meeste te doen", maar op wat met jonge kinderen vol te houden is: logische afstanden, goede regenbackups, lunchstops en plekken waar een ouder niet continu hoeft bij te sturen.' },
    ],
  },
  'den-haag': {
    meta_title: 'Den Haag met peuters | strand, stad en regenroutes die bij elkaar passen',
    meta_description: 'Den Haag met peuters: strand, parken, musea en kindvriendelijke horeca in een stad waar buiten en binnen goed te combineren zijn.',
    sections: [
      { heading: 'Wat Den Haag sterk maakt', body: 'Den Haag werkt goed omdat je hier strand, park, stad en binnenlocaties relatief makkelijk in één daglogica kunt combineren. Dat maakt de regio sterk voor dagen waarop je vooraf nog niet precies weet wat het weer of het humeur gaat doen.' },
      { heading: 'Handig voor jonge kinderen', body: 'De beste keuzes in deze regio zijn meestal niet de grootste highlights, maar de combinaties: eerst buitenlucht, dan lunch, daarna een compacte binnenstop of juist andersom.' },
    ],
  },
  utrecht: {
    meta_title: 'Utrecht met peuters | compacte routes, musea en kindvriendelijke stops',
    meta_description: 'Utrecht met peuters: compacte routes, sterke regenopties en kindvriendelijke plekken die werken voor een korte of halve dag.',
    sections: [
      { heading: 'Waarom Utrecht vaak zo bruikbaar is', body: 'Utrecht is compact genoeg om overzichtelijk te voelen en groot genoeg om keuze te bieden. Dat maakt de regio sterk voor ouders die niet een hele dag willen plannen, maar wel meerdere goede opties achter de hand willen hebben.' },
      { heading: 'Wat hier het vaakst werkt', body: 'Musea met jonge-kinderenlogica, stadsboerderijen, horeca met speelhoek en korte buitenrondjes liggen hier opvallend dicht op elkaar. Daardoor is Utrecht vooral goed voor dagen met een duidelijke ochtend- of middagroute.' },
    ],
  },
  haarlem: {
    meta_title: 'Haarlem met peuters | stad, duinen en rustige gezinsroutes',
    meta_description: 'Haarlem met peuters: rustige stad, duinen dichtbij en kindvriendelijke plekken die goed combineren tot een korte of halve dag.',
    sections: [
      { heading: 'Waarom Haarlem vaak prettiger voelt dan Amsterdam', body: 'Haarlem heeft genoeg stad voor een dagje uit, maar zonder de constante drukte van Amsterdam. Daardoor werkt het goed voor gezinnen die wel sfeer willen, maar minder overprikkeling en minder logistiek gedoe.' },
      { heading: 'Waar deze regio echt sterk in is', body: 'De combinatie van stad, duinen, pannenkoeken en kleinschalige binnenopties maakt Haarlem vooral geschikt voor dagen waarop je buiten wilt beginnen en later rustig wilt landen.' },
    ],
  },
  amersfoort: {
    meta_title: 'Amersfoort met peuters | overzichtelijke binnenstad en korte uitjes',
    meta_description: 'Amersfoort met peuters: overzichtelijke routes, natuur dichtbij en praktische plekken voor een korte of halve dag met jonge kinderen.',
    sections: [
      { heading: 'Waarom Amersfoort goed werkt met jonge kinderen', body: 'Amersfoort voelt overzichtelijk. De binnenstad is compact, er zijn genoeg groene randen en je kunt relatief makkelijk kiezen tussen een buitenplek, een lunchstop en een tweede korte activiteit.' },
      { heading: 'Waar je hier op wilt sturen', body: 'Niet te veel centrum in één keer. Voor peuters werkt Amersfoort het best als je de dag klein houdt: één hoofdplek, iets te eten en ruimte om op tijd af te ronden.' },
    ],
  },
  leiden: {
    meta_title: 'Leiden met peuters | museumstad met korte routes en groene rustpunten',
    meta_description: 'Leiden met peuters: compacte museumstad met korte routes, groene rustpunten en plekken die ook met jonge kinderen werkbaar blijven.',
    sections: [
      { heading: 'Wat Leiden sterk maakt', body: 'Leiden is klein genoeg om niet te versnipperen en rijk genoeg om meerdere typen uitjes te bieden. Dat maakt de regio geschikt voor ouders die een culturele stad willen, maar zonder een te zware planning.' },
      { heading: 'Praktische winst', body: 'Juist de combinatie van compacte binnenstad, musea en rustige lunchopties maakt Leiden handig voor jonge kinderen. Het draait hier minder om massa en meer om goed kiezen.' },
    ],
  },
  'utrechtse-heuvelrug': {
    meta_title: 'Utrechtse Heuvelrug met peuters | bos, pannenkoeken en ademruimte',
    meta_description: 'Utrechtse Heuvelrug met peuters: bos, buitenlucht, pannenkoeken en plekken die goed werken voor rustige gezinsdagen.',
    sections: [
      { heading: 'Waarom deze regio anders is dan een stadsdag', body: 'De Heuvelrug draait minder om losse highlights en meer om ritme: buiten zijn, even spelen, eten, weer naar buiten. Dat maakt de regio sterk voor gezinnen die ruimte zoeken in plaats van een strak programma.' },
      { heading: 'Wat hier vaak de beste keuze is', body: 'Bos, speelboerderijen en pannenkoeken werken hier beter dan een lange lijst bezienswaardigheden. Vooral voor peuters is dat precies de kracht.' },
    ],
  },
  eindhoven: {
    meta_title: 'Eindhoven met peuters | slimme binnen-buitencombinaties voor jonge kinderen',
    meta_description: 'Eindhoven met peuters: praktische binnen-buitenroutes, kindvriendelijke horeca en genoeg ruimte om de dag flexibel te houden.',
    sections: [
      { heading: 'Wat Eindhoven prettig maakt', body: 'Eindhoven heeft genoeg stedelijke voorzieningen, maar voelt minder gejaagd dan de Randstad. Daardoor is het een sterke regio voor gezinnen die een degelijke mix zoeken van buitenruimte, lunch en binnenbackup.' },
      { heading: 'Waar je hier op wilt letten', body: 'Niet alles ligt op loopafstand. De beste routes in Eindhoven zijn vaak combinaties van één hoofdplek en een tweede logische stop, niet een hele stadswandeling.' },
    ],
  },
  groningen: {
    meta_title: 'Groningen met peuters | rustige keuzes per dagdeel',
    meta_description: 'Groningen met peuters: rustige keuzes per dagdeel, met parken, kinderboerderijen, musea en slimme regenopties voor jonge kinderen.',
    sections: [
      { heading: 'Waarom Groningen vaak op dagdelen werkt', body: 'Groningen is geen regio waar je per se één groot hoogtepunt nodig hebt. Juist de rustige mix van park, stadsboerderij, lunch en een compacte binnenstop maakt deze regio geschikt voor jonge kinderen.' },
      { heading: 'Beste gebruik van deze pagina', body: 'Zie Groningen niet als een checklist, maar als een keuzepagina per dagdeel: eerst rustig buiten, dan iets eten, daarna eventueel een tweede korte stop.' },
    ],
  },
  almere: {
    meta_title: 'Almere met peuters | ruimte, water en wijken met speelrust',
    meta_description: 'Almere met peuters: ruimte, water en groene wijken met praktische speel- en stopplekken voor gezinnen met jonge kinderen.',
    sections: [
      { heading: 'Wat Almere vooral goed maakt', body: 'Almere is minder een klassieke uitjesstad en meer een regio waar ruimte en gemak tellen. Dat is juist sterk voor jonge kinderen: minder drukte, meer lucht, vaak makkelijk parkeren en veel groene woonwijken met praktische plekken.' },
      { heading: 'Voor wie dit goed werkt', body: 'Voor gezinnen die iets dicht bij huis of vlak buiten Amsterdam zoeken, zonder meteen in een drukke stadsdag te belanden.' },
    ],
  },
  tilburg: {
    meta_title: 'Tilburg met peuters | buitenruimte, speelplekken en praktische uitwijkopties',
    meta_description: 'Tilburg met peuters: buitenruimte, speelplekken en logische binnen- en buitenroutes voor gezinnen met jonge kinderen.',
    sections: [
      { heading: 'Waarom Tilburg functioneel sterk is', body: 'Tilburg heeft niet één dominant peutericoon, maar juist veel bruikbare combinaties. Dat maakt de regio handig voor gezinnen die een werkbare dag willen, niet per se een toeristische highlight.' },
      { heading: 'Hoe je Tilburg het best gebruikt', body: 'Kies hier eerst op energie: buiten in bos of park, of juist een duidelijk indoorplan. De regio is sterk in dat soort praktische schakelingen.' },
    ],
  },
  breda: {
    meta_title: 'Breda met peuters | stad, bos en rustige gezinskeuzes',
    meta_description: 'Breda met peuters: combineer stad, bos en kindvriendelijke stops tot een rustige dag die ook in de praktijk prettig blijft.',
    sections: [
      { heading: 'Waarom Breda goed werkt als gezinsdag', body: 'Breda is sterk als je een stad wilt zonder dat alles op het centrum hoeft te leunen. Met natuur aan de rand en voldoende gezinsplekken in en rond de stad kun je hier makkelijk een korte of halve dag bouwen.' },
      { heading: 'Waar je hier het meeste aan hebt', body: 'Aan een simpele opzet: eerst buiten, dan eten of drinken, daarna eventueel nog één extra plek. Voor peuters werkt Breda vooral als rustige combinatie, niet als volle planning.' },
    ],
  },
  nijmegen: {
    meta_title: 'Nijmegen met peuters | heuvels, parken en sterke uitwijkopties',
    meta_description: 'Nijmegen met peuters: parken, bossen, dieren en sterke uitwijkopties in en rond de stad voor gezinnen met jonge kinderen.',
    sections: [
      { heading: 'Wat Nijmegen anders maakt', body: 'Nijmegen heeft hoogteverschil, groen en een regio eromheen die snel mee gaat tellen. Daardoor werkt deze pagina niet alleen als stadsgids, maar ook als routekaart voor omliggende gezinsplekken.' },
      { heading: 'Beste gebruik', body: 'Voor jonge kinderen werkt Nijmegen meestal het best als combinatie van één duidelijke hoofdplek en een rustige tweede optie, niet als zware stadsroute.' },
    ],
  },
  arnhem: {
    meta_title: 'Arnhem met peuters | dieren, ruimte en dagvullende topplekken',
    meta_description: 'Arnhem met peuters: dieren, ruimte, buitenplekken en sterke dagvullende opties voor gezinnen met jonge kinderen.',
    sections: [
      { heading: 'Waarom Arnhem meer draagt dan alleen de stad', body: 'Arnhem is sterk omdat de regio meerdere echt onderscheidende gezinsplekken heeft. Daardoor is het een van de weinige regio\'s waar een peuterdag makkelijk groter mag zijn, zolang je niet te veel probeert te combineren.' },
      { heading: 'Waar deze pagina op stuurt', body: 'Op keuzes die inhoudelijk echt iets toevoegen: dieren, ruimte, buitenlucht en plekken waar jonge kinderen vrijer kunnen bewegen dan in een klassieke binnenstad.' },
    ],
  },
  apeldoorn: {
    meta_title: 'Apeldoorn met peuters | bos, dieren en ruime gezinsuitjes',
    meta_description: 'Apeldoorn met peuters: bos, dieren en ruime uitjes voor gezinnen die graag buiten beginnen en overzicht houden.',
    sections: [
      { heading: 'Wat Apeldoorn sterk maakt', body: 'Apeldoorn combineert natuur, dieren en ruimte op een manier die voor jonge kinderen heel logisch voelt. Deze regio werkt vooral goed voor gezinnen die buitenlucht willen zonder een ingewikkelde planning.' },
      { heading: 'Handige verwachting', body: 'Niet alles hoeft op één dag. De sterkste uitjes in Apeldoorn zijn vaak al dagvullend genoeg. Deze pagina helpt daarom vooral bij kiezen, niet bij stapelen.' },
    ],
  },
  's-hertogenbosch': {
    meta_title: 'Den Bosch met peuters | bourgondisch, groen en praktisch voor gezinnen',
    meta_description: 'Den Bosch met peuters: combineer groen, eten en kindvriendelijke stops tot een gezinsdag die niet te vol of te druk wordt.',
    sections: [
      { heading: 'Waarom Den Bosch als gezinsregio werkt', body: 'Den Bosch is sterk als combinatie van stad, horeca en uitwijkopties in de omgeving. Daardoor kun je hier makkelijk kiezen tussen een compacte stadsdag of juist een route net buiten de drukte.' },
      { heading: 'Waar de winst zit', body: 'In de balans: niet alles in het centrum willen doen, maar slim combineren met groen, pannenkoeken of een kindvriendelijke stop aan de rand.' },
    ],
  },
  'gooi-en-vechtstreek': {
    meta_title: 'Gooi en Vechtstreek met peuters | groen, water en rustige gezinsroutes',
    meta_description: 'Gooi en Vechtstreek met peuters: groen, water en rustige routes voor gezinnen die natuur, speelruimte en ademruimte zoeken.',
    sections: [
      { heading: 'Waarom deze regio anders aanvoelt', body: 'Gooi en Vechtstreek draait minder om één stad en meer om een verzameling rustige plekken. Dat maakt de regio sterk voor gezinnen die groen, water en ruimte zoeken in plaats van een klassieke binnenstad.' },
      { heading: 'Hoe je hier het best zoekt', body: 'Niet op iconen, maar op sfeer en situatie: een rustig restaurant, een buitenplek, een pannenkoekenstop of een route waar je niet voortdurend hoeft te schakelen tussen verkeer en drukte.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Type editorial content (keyed by URL slug, e.g. "speeltuinen")
// ---------------------------------------------------------------------------

export const TYPE_EDITORIAL: Record<string, EditorialContent> = {
  speeltuinen: {
    meta_title: 'Speeltuinen voor peuters | buiten spelen zonder omweg',
    meta_description: 'Speeltuinen voor peuters met genoeg overzicht, veilige toestellen en logische combinaties met koffie, dieren of een lunchstop.',
    sections: [
      { heading: 'Waar deze categorie voor bedoeld is', body: 'Een goede speeltuin voor een peuter is niet automatisch de grootste speeltuin. Belangrijker zijn overzicht, lage toestellen, een logische plek om even te zitten en liefst een plan B in de buurt. Daarom staan hier vooral plekken waar jonge kinderen iets zelfstandig kunnen doen zonder dat een ouder continu hoeft te corrigeren.' },
      { heading: 'Wanneer dit type het best werkt', body: 'Speeltuinen werken vooral voor ochtenden, korte middagen en dagen waarop je energie wilt kwijt raken zonder een compleet dagprogramma te bouwen. Ze combineren goed met een kinderboerderij, koffieplek of park.' },
    ],
  },
  boerderijen: {
    meta_title: 'Kinderboerderijen voor peuters | dieren, rust en korte uitjes',
    meta_description: 'Kinderboerderijen voor peuters en dreumesen, geselecteerd op dierencontact, overzicht, speelruimte en praktische rust voor ouders.',
    sections: [
      { heading: 'Waarom kinderboerderijen zo vaak werken', body: 'Kinderboerderijen zijn zelden spectaculair, maar juist daarom sterk. Je hoeft weinig uit te leggen, er is vaak genoeg te zien voor een uur of twee, en je kunt makkelijk schakelen tussen kijken, lopen, eten en naar huis gaan.' },
      { heading: 'Waar wij op letten', body: 'Niet alleen op dieren, maar ook op ruimte, speelprikkels, toegankelijkheid en de vraag of een locatie prettig blijft als je met een buggy, reservekleren en een kind met korte spanningsboog komt.' },
    ],
  },
  musea: {
    meta_title: 'Musea voor peuters | interactieve plekken die echt werken',
    meta_description: 'Musea voor peuters en kleuters die meer zijn dan een stil gebouw: interactief, overzichtelijk en geschikt voor jonge kinderen.',
    sections: [
      { heading: 'Niet elk museum is een peutermuseum', body: 'Deze categorie is bedoeld voor musea waar jonge kinderen echt iets kunnen doen of ervaren. Een prachtig museum is nog geen goede peuterplek. We kiezen daarom liever minder musea met echte kinderlogica dan veel gebouwen waar je vooral "niet aankomen" moet zeggen.' },
      { heading: 'Handig als het regent', body: 'Musea zijn vaak de beste regenbackup, maar alleen als ze niet te statisch voelen. Daarom combineren veel museumtips op PeuterPlannen met horeca, korte routes of een tweede stop in de buurt.' },
    ],
  },
  pannenkoeken: {
    meta_title: 'Pannenkoekenrestaurants voor jonge kinderen | eten zonder strijd',
    meta_description: 'Pannenkoekenrestaurants voor gezinnen met jonge kinderen, met aandacht voor speelhoek, tempo, terras en praktische voorzieningen.',
    sections: [
      { heading: 'Waarom pannenkoeken vaak de veiligste keuze zijn', body: 'Als je met jonge kinderen uit eten gaat, wint voorspelbaarheid. Een pannenkoekenplek werkt vaak omdat het tempo laag ligt, het menu geen strijd oplevert en een beetje knoeien niet meteen de toon zet voor de rest van de dag.' },
      { heading: 'Waar het verschil echt zit', body: 'Het verschil zit niet in de pannenkoek zelf, maar in alles eromheen: ruimte voor buggy\'s, een speelhoek, een terras, luierruimte en de vraag of je hier tien minuten of een vol uur prettig kunt zitten.' },
    ],
  },
  natuur: {
    meta_title: 'Natuur met peuters | buitenplekken waar het dagritme mee kan',
    meta_description: 'Natuurplekken, parken en bosroutes voor peuters en kleuters. Geselecteerd op loopafstand, rust, speelprikkels en praktische haalbaarheid.',
    sections: [
      { heading: 'Buiten werkt vaak beter dan je denkt', body: 'Een goede natuurplek hoeft niet groots te zijn. Voor jonge kinderen werken juist korte rondjes, water, zand, dieren of iets om te klimmen vaak beter dan een lang wandelplan. Daarom selecteren we natuurplekken die niet alleen mooi zijn, maar ook praktisch in gebruik.' },
      { heading: 'Wanneer natuur minder handig is', body: 'Bij wind, regen, modder of te lange looplijnen kan een natuurplek snel omslaan van ontspannen naar gedoe. Daarom linken deze pagina\'s bewust door naar binnen- en regenroutes.' },
    ],
  },
  zwemmen: {
    meta_title: 'Zwemmen met peuters | warme baden, peuterzones en logische stops',
    meta_description: 'Zwembaden en waterplekken voor jonge kinderen, geselecteerd op peuterbad, temperatuur, kleedruimte en praktische gezinslogica.',
    sections: [
      { heading: 'Zwemmen is alleen fijn als de randvoorwaarden kloppen', body: 'Een zwembad kan geweldig zijn met jonge kinderen, maar ook uitputtend. Daarom draait deze categorie niet alleen om waterpret, maar ook om peuterbad, warmte, kleedruimte, rust en de vraag of een bezoek logisch voelt voor je kind én voor jou.' },
      { heading: 'Voor wie deze pagina het meest helpt', body: 'Voor gezinnen die gericht zoeken naar een binnenoptie, een dreumesproof uitstapje of een plek waar een peuter veilig kan wennen aan water zonder meteen in een groot subtropisch complex te belanden.' },
    ],
  },
  horeca: {
    meta_title: 'Kindvriendelijke horeca | koffie, lunch en speelruimte die samen werken',
    meta_description: 'Kindvriendelijke horeca voor ouders met jonge kinderen: cafés, restaurants en lunchplekken waar eten, spelen en praktische rust samenkomen.',
    sections: [
      { heading: 'Niet elk kindvriendelijk restaurant is echt prettig', body: 'Veel horecaplekken noemen zichzelf kindvriendelijk, maar dat zegt weinig. Op deze pagina gaat het om plekken waar je als ouder niet na tien minuten weer naar buiten wilt: ruimte, tempo, iets om te doen, en voorzieningen die een tussenstop of lunch ook echt haalbaar maken.' },
      { heading: 'Wanneer horeca op zichzelf een uitje kan zijn', body: 'Vooral bij dreumesen en jonge peuters hoeft horeca geen sluitstuk van de dag te zijn. Een goede plek met speelhoek, terras, dieren of speelruimte kan het uitje zelf zijn.' },
    ],
  },
};
