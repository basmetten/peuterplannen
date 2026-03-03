/**
 * sync_all.js — Unified build script for PeuterPlannen
 *
 * Generates city pages, type pages, location pages, blog, and sitemap.
 * Single source of truth: Supabase regions + locations tables.
 *
 * Usage: node .scripts/sync_all.js
 *
 * Environment variables (optional, falls back to hardcoded anon key):
 *   SUPABASE_URL          — Supabase project URL
 *   SUPABASE_SERVICE_KEY  — Supabase service role key
 */
const fs = require('fs');
const path = require('path');

// Blog dependencies (optional — blog build skipped if not installed)
let matter, marked;
try {
  matter = require('gray-matter');
  const m = require('marked');
  marked = m.marked || m;
} catch (e) {
  console.log('Note: gray-matter/marked not installed — blog build will be skipped. Run npm install first.\n');
}

// === Configuration ===
const SB_PROJECT = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SB_URL = process.env.SUPABASE_URL || SB_PROJECT;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || Buffer.from('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==', 'base64').toString('utf8');
const ROOT = path.resolve(__dirname, '..');

const CF_ANALYTICS_TOKEN = '74c21d127cea482bb454b6c85071a46f';
function analyticsHTML() {
  return `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token":"${CF_ANALYTICS_TOKEN}"}'></script>`;
}

const TYPE_MAP = {
  play: { label: 'Speeltuinen', slug: 'speeltuinen', labelSingle: 'Speeltuinen' },
  farm: { label: 'Kinderboerderijen', slug: 'kinderboerderijen', labelSingle: 'Kinderboerderijen' },
  nature: { label: 'Natuur', slug: 'natuur', labelSingle: 'Natuur' },
  museum: { label: 'Musea', slug: 'musea', labelSingle: 'Musea' },
  swim: { label: 'Zwemmen', slug: 'zwemmen', labelSingle: 'Zwemmen' },
  pancake: { label: 'Pannenkoeken', slug: 'pannenkoeken', labelSingle: 'Pannenkoeken' },
  horeca: { label: 'Horeca', slug: 'horeca', labelSingle: 'Horeca' },
};

const TYPE_LABELS_CITY = {
  play: 'Speeltuinen & Speelparadijzen',
  farm: 'Kinderboerderijen & Dieren',
  nature: 'Natuur & Buiten',
  museum: 'Musea & Ontdekken',
  swim: 'Zwembaden & Waterplezier',
  pancake: 'Pannenkoekenrestaurants',
  horeca: 'Kindvriendelijke Horeca',
};

const TYPE_ORDER = ['play', 'farm', 'nature', 'museum', 'swim', 'pancake', 'horeca'];

const TYPE_IMAGES = {
  play: '/images/categories/speeltuinen.png',
  farm: '/images/categories/kinderboerderijen.png',
  nature: '/images/categories/natuur.png',
  museum: '/images/categories/musea.png',
  swim: '/images/categories/zwemmen.png',
  pancake: '/images/categories/pannenkoeken.png',
  horeca: '/images/categories/horeca.png',
};

const TYPE_PAGES = [
  {
    slug: 'speeltuinen', dbType: 'play',
    title: 'Speeltuinen voor peuters in Nederland',
    metaTitle: 'Speeltuinen voor peuters, indoor en outdoor | PeuterPlannen',
    metaDesc: 'Speeltuinen en speelparadijzen voor peuters in 17 regio\'s door heel Nederland. Indoor en outdoor, gecheckt en actueel.',
    h1: 'Speeltuinen voor peuters in Nederland',
    intro: `Niet elke speeltuin werkt voor peuters. Een klimrek van twee meter hoog en een schommel zonder beugel: leuk voor een zesjarige, niet voor je dreumes. De speeltuinen op deze pagina zijn allemaal gecheckt op geschiktheid voor kinderen van 1 tot 5 jaar.\n\nGrofweg twee smaken: **buitenspeeltuinen** (gratis, lekker in de zon) en **indoor speelparadijzen** (redding bij regen). Ketens als Monkey Town en Ballorig zitten door het hele land, wat handig is als je weet wat je kunt verwachten.`,
    sectionLabel: 'Speeltuinen',
    faqItems: [
      { q: 'Wat is een goede speeltuin voor peuters van 1–3 jaar?', a: 'Zoek naar speeltuinen met lage toestellen, zandbakken en waterpartijen. Monkey Town en Ballorig hebben in de meeste vestigingen aparte peuterhoeken voor kinderen vanaf 1 jaar.' },
      { q: 'Zijn indoor speelparadijzen ook geschikt bij slecht weer?', a: 'Dat is precies waarvoor ze bedoeld zijn. Monkey Town, Ballorig en CROOS zijn volledig overdekt.' },
      { q: 'Wat kosten speeltuinen voor peuters gemiddeld?', a: 'Openbare speeltuinen zijn gratis. Indoor speelparadijzen rekenen meestal 5 tot 12 euro per kind, soms inclusief koffie voor ouders.' },
    ]
  },
  {
    slug: 'kinderboerderijen', dbType: 'farm',
    title: 'Kinderboerderijen voor peuters in Nederland',
    metaTitle: 'Kinderboerderijen voor peuters, gratis en betaald | PeuterPlannen',
    metaDesc: 'De leukste kinderboerderijen en stadsboerderijen voor peuters in 17 regio\'s door heel Nederland. Gratis, met dieren aaien en speeltuinen.',
    h1: 'Kinderboerderijen voor peuters in Nederland',
    intro: `Kinderboerderijen zijn de ideale uitjes voor peuters. Dieren aaien, geiten voeren, kippen bekijken en ondertussen lekker buiten spelen. De meeste stadsboerderijen in Nederland zijn gratis toegankelijk en hebben ook een zandbak of speeltuintje.\n\nVan **Kinderboerderij Westerpark** in Amsterdam tot **Stadsboerderij De Veldhoeve** in Utrecht en **Kinderboerderij Vroesenpark** in Rotterdam — er is altijd een kinderboerderij in de buurt. Veel boerderijen hebben ook een terrasje waar ouders een kop koffie kunnen drinken.`,
    sectionLabel: 'Kinderboerderijen',
    faqItems: [
      { q: 'Zijn kinderboerderijen gratis?', a: 'De meeste stadsboerderijen zijn gratis toegankelijk. Sommige grotere dierenweides vragen een klein bedrag (1-3 euro). Dierenvoer koop je vaak los voor 50 cent tot 1 euro.' },
      { q: 'Vanaf welke leeftijd kunnen peuters naar een kinderboerderij?', a: 'Kinderboerderijen zijn geschikt vanaf ongeveer 1 jaar. De kleinste kinderen vinden het al leuk om de dieren te bekijken. Vanaf 2 jaar kunnen ze vaak zelf voeren onder begeleiding.' },
      { q: 'Welke kinderboerderijen hebben koffie voor ouders?', a: 'Veel stadsboerderijen hebben een klein cafe of terras. Boerderij Meerzicht en Speelboerderij Elsenhove in Amsterdam, Geertjes Hoeve bij Utrecht en De Veldhoeve in Utrecht zijn populaire opties.' },
    ]
  },
  {
    slug: 'musea', dbType: 'museum',
    title: 'Musea voor peuters in Nederland',
    metaTitle: 'Musea voor peuters, interactief en ontdekkend | PeuterPlannen',
    metaDesc: 'Welke musea zijn echt leuk voor peuters? 60+ kindvriendelijke musea in 17 regio\'s door heel Nederland. Met leeftijdsadvies.',
    h1: 'Musea voor peuters in Nederland',
    intro: `De meeste musea zijn niets voor peuters. "Niet aankomen" en "stil zijn" werkt niet met een tweejarige. Maar een handvol musea in Nederland snapt dat wel: lage vitrines, knoppen om op te drukken, en dingen die tegen een stootje kunnen.\n\nDe toppers: het **Nijntje Museum** in Utrecht (0–6 jaar, alles op kruiphoogte), **NEMO** in Amsterdam (water, licht, geluid) en **Villa Zebra** in Rotterdam (kunst waarbij je mag kliederen). Musea als het Anne Frank Huis of het Verzetsmuseum? Bewaar die voor als ze 10 zijn.`,
    sectionLabel: 'Musea',
    faqItems: [
      { q: 'Welk museum is het leukst voor peuters van 2–4 jaar?', a: 'Het Nijntje Museum in Utrecht is speciaal gemaakt voor 0–6 jaar. NEMO in Amsterdam en Villa Zebra in Rotterdam werken ook goed voor deze leeftijd.' },
      { q: 'Zijn musea gratis voor peuters?', a: 'Vaak wel. Veel musea laten kinderen tot 4 jaar gratis binnen. NEMO, Naturalis en het Nijntje Museum hebben aparte peuter-tarieven. Check de website, want dit verandert regelmatig.' },
      { q: 'Welke musea zijn NIET geschikt voor jonge kinderen?', a: 'Het Anne Frank Huis (aanbevolen 10+), het Verzetsmuseum (8+) en Foam zijn minder geschikt voor peuters.' },
    ]
  },
  {
    slug: 'pannenkoeken', dbType: 'pancake',
    title: 'Pannenkoekenrestaurants voor kinderen in Nederland',
    metaTitle: 'Pannenkoekenrestaurants voor kinderen, heel Nederland | PeuterPlannen',
    metaDesc: 'Pannenkoekenrestaurants voor gezinnen met jonge kinderen in 17 regio\'s door heel Nederland. Met info over kindvriendelijkheid, terras en luierruimte.',
    h1: 'Pannenkoekenrestaurants voor kinderen in Nederland',
    intro: `Pannenkoeken zijn de veiligste gok als je uit eten gaat met een peuter. Bijna elk kind lust ze, je hoeft niet lang te wachten, en het maakt niet uit als de helft op de grond belandt. Nederland zit vol met pannenkoekenrestaurants, van een hutje in het bos tot een boot op de rivier.\n\nWaar let je op? **Ruimte voor de kinderwagen**, een **kindermenu met kleine pannenkoeken** (scheelt knoeien), en het liefst een **speelhoek of terras**. Ketens als **Pannenkoe** zijn specifiek op gezinnen gericht. Klassiekers als **De Nachtegaal** in Rotterdam of **Oudt Leyden** bij Leiden bestaan al tientallen jaren.`,
    sectionLabel: 'Pannenkoeken',
    faqItems: [
      { q: 'Welk pannenkoekenrestaurant is het kindvriendelijkst?', a: 'De Pannenkoe-keten is ingericht op gezinnen: kleine pannenkoekjes op het kindermenu en speelhoeken. Pannekoekhuis De Nachtegaal in Rotterdam is ook een aanrader.' },
      { q: 'Moet je reserveren bij een pannenkoekenrestaurant met kinderen?', a: 'Op zaterdagen en in vakanties wel, vooral bij populaire locaties. Pannenkoekenhuis Upstairs in Amsterdam heeft maar 6 tafeltjes, dus daar zeker.' },
      { q: 'Hebben pannenkoekenrestaurants luierruimtes?', a: 'De meeste kindvriendelijke pannenkoekenrestaurants hebben een luierruimte of genoeg ruimte op het toilet. Check de badges op onze locatiekaarten.' },
    ]
  },
  {
    slug: 'natuur', dbType: 'nature',
    title: 'Natuur met peuters in Nederland',
    metaTitle: 'Natuur met peuters, parken, bossen en duinen | PeuterPlannen',
    metaDesc: 'Stadsparken, duinen, bossen en natuurspeelplaatsen voor peuters in 17 regio\'s door heel Nederland. Gratis en betaald, altijd buiten.',
    h1: 'Natuur met peuters in Nederland',
    intro: `Naar buiten met je peuter hoeft niet ingewikkeld te zijn. Een stadspark met een zandbak, een bos met een klauterparcours, of de duinen met een picknick — kinderen vermaken zich overal waar ze kunnen rennen, graven en ontdekken.\n\n**Stadsparken** voor een rustige ochtend met een picknick, **duinen** bij Den Haag of het **Nationaal Park Zuid-Kennemerland** bij Haarlem voor als je iets avontuurlijkers wilt, of **natuurspeelplaatsen** waar kinderen met water, zand en hout kunnen spelen. En het mooie is dat je hier nauwelijks geld aan kwijt bent.`,
    sectionLabel: 'Natuur',
    faqItems: [
      { q: 'Welk natuurgebied is het geschiktst voor peuters?', a: 'Vlakke parken met wandelpaden werken het best voor de allerkleinsten: Vondelpark (Amsterdam), Maximapark (Utrecht) of Vroesenpark (Rotterdam). Oudere peuters (3–5) kunnen ook de duinen aan.' },
      { q: 'Zijn er natuurspeelplaatsen voor peuters?', a: 'Ja, steeds meer! Natuurspeelplaatsen met water, zand en boomstammen zijn ideaal voor peuters. Het Amsterdamse Bos, de Utrechtse Heuvelrug en diverse stadsparken hebben natuurspeelplekken.' },
      { q: 'Wat neem je mee naar een dagje natuur met peuters?', a: 'Reservekleren (modder!), water, snacks, zonnebrand of regenkleding. Een buggy met grote wielen of een draagzak werkt beter dan een kinderwagen op onverharde paden.' },
    ]
  },
  {
    slug: 'zwemmen', dbType: 'swim',
    title: 'Zwemmen met peuters in Nederland',
    metaTitle: 'Zwemmen met peuters, zwembaden en waterplezier | PeuterPlannen',
    metaDesc: 'Zwembaden en waterplezier voor peuters in heel Nederland. Peuterbaden, subtropische zwemparadijzen en buitenzwembaden met peutergedeelte.',
    h1: 'Zwemmen met peuters in Nederland',
    intro: `Zwemmen is een van de leukste activiteiten voor peuters — en een van de vermoeiendste (voor de ouders). Veel zwembaden in Nederland hebben speciale peuterbaden met warm water, ondiepe gedeeltes en glijbaantjes op peuterhoogte.\n\n**Let op:** deze categorie is nieuw en wordt actief aangevuld met locaties. Ken je een goed zwembad voor peuters? Laat het ons weten via de app! Subtropische zwemparadijzen als **Center Parcs** en **De Tongelreep** in Eindhoven zijn populaire opties, maar ook veel gemeentelijke zwembaden hebben uitstekende peutervoorzieningen.`,
    sectionLabel: 'Zwemmen',
    faqItems: [
      { q: 'Vanaf welke leeftijd kunnen peuters zwemmen?', a: 'De meeste peuterbaden zijn geschikt vanaf 0 jaar met begeleiding. Babyzwemmen kan al vanaf 3 maanden. Voor zelfstandig spelen in het peuterbad is 1-2 jaar een goed startpunt.' },
      { q: 'Hebben zwembaden luierruimtes en verschoonplekken?', a: 'Vrijwel alle zwembaden met peutervoorzieningen hebben verschoonplekken in de kleedkamers. Veel hebben ook gezinskleedkamers met extra ruimte voor de kinderwagen.' },
      { q: 'Moet ik een zwemluier gebruiken voor mijn peuter?', a: 'Ja, de meeste zwembaden vereisen een zwemluier voor kinderen die nog niet zindelijk zijn. Je kunt herbruikbare zwemluiers kopen of wegwerpzwemluiers gebruiken.' },
    ]
  },
  {
    slug: 'horeca', dbType: 'horeca',
    title: 'Kindvriendelijke restaurants en cafes in Nederland',
    metaTitle: 'Kindvriendelijke horeca voor gezinnen, heel Nederland | PeuterPlannen',
    metaDesc: 'Kindvriendelijke restaurants en cafes in 17 regio\'s door heel Nederland. Met speelhoek, kindermenu, terras en luierruimte. Gecheckt op kindvriendelijkheid.',
    h1: 'Kindvriendelijke restaurants en cafes in Nederland',
    intro: `Uit eten met een peuter is een sport. De kinderwagen moet ergens staan, er moet iets op de kaart staan dat ze lusten, en het liefst is er een speelhoek zodat jij je koffie op kunt drinken. Niet elk restaurant kan dat. De plekken op deze pagina wel.\n\nVan **kindercafes** (speciaal voor ouders met baby's en peuters) tot een **grand cafe met groot terras**, van een **pannenkoekenboot** tot een **strandpaviljoen**. We checken op de dingen die ertoe doen: koffie, luierruimte, en of er ook een biertje kan.`,
    sectionLabel: 'Horeca',
    faqItems: [
      { q: 'Wat is een kindercafe en is dat anders dan een gewoon restaurant?', a: 'Een kindercafe is ingericht op ouders met baby\'s en peuters: zachte vloeren, laag meubilair, speelgoed en een speelhoek. Kindercafe Kikker in Den Haag en Wonderpark Cafe in Amsterdam zijn voorbeelden.' },
      { q: 'Moet ik reserveren bij kindvriendelijke restaurants?', a: 'Op drukke momenten (zaterdag lunch, schoolvakanties) is het slim om te reserveren. Veel restaurants hebben beperkte ruimte voor kinderwagens.' },
      { q: 'Welke restaurants hebben een buitenspeeltuin of terras?', a: 'Parkrestaurant Anafora in Utrecht, Boerderij Meerzicht in Amsterdam, en Strandpaviljoen Zuid in Den Haag hebben buitenruimte waar kinderen kunnen bewegen terwijl ouders eten.' },
    ]
  },
];

const NEARBY_CITIES = {
  'amsterdam': ['haarlem', 'utrecht', 'almere', 'gooi-en-vechtstreek'],
  'rotterdam': ['den-haag', 'breda', 'leiden'],
  'den-haag': ['rotterdam', 'leiden', 'haarlem'],
  'utrecht': ['amsterdam', 'amersfoort', 'utrechtse-heuvelrug', 'gooi-en-vechtstreek'],
  'haarlem': ['amsterdam', 'leiden', 'den-haag'],
  'amersfoort': ['utrecht', 'apeldoorn', 'arnhem', 'gooi-en-vechtstreek'],
  'leiden': ['den-haag', 'haarlem', 'rotterdam'],
  'utrechtse-heuvelrug': ['utrecht', 'amersfoort', 'arnhem', 'gooi-en-vechtstreek'],
  'eindhoven': ['tilburg', 's-hertogenbosch', 'breda'],
  'groningen': ['apeldoorn', 'arnhem', 'amersfoort'],
  'almere': ['amsterdam', 'utrecht', 'amersfoort'],
  'tilburg': ['eindhoven', 'breda', 's-hertogenbosch'],
  'breda': ['tilburg', 'eindhoven', 'rotterdam'],
  'nijmegen': ['arnhem', 's-hertogenbosch', 'apeldoorn'],
  'arnhem': ['nijmegen', 'apeldoorn', 'amersfoort'],
  'apeldoorn': ['arnhem', 'amersfoort', 'utrecht'],
  's-hertogenbosch': ['eindhoven', 'tilburg', 'nijmegen'],
  'gooi-en-vechtstreek': ['amsterdam', 'utrecht', 'amersfoort', 'utrechtse-heuvelrug'],
};

const MUNICIPALITY_COVERAGE = {
  'amsterdam':           ['Amstelveen', 'Zaandam', 'Haarlemmermeer', 'Diemen', 'Purmerend'],
  'den-haag':            ['Delft', 'Westland', 'Rijswijk', 'Zoetermeer', 'Wassenaar', 'Leidschendam-Voorburg', 'Pijnacker-Nootdorp'],
  'utrecht':             ['De Bilt', 'Houten', 'Nieuwegein', 'IJsselstein', 'Woerden'],
  'haarlem':             ['Heemstede', 'Bloemendaal', 'Zandvoort', 'Velsen', 'Beverwijk'],
  'utrechtse-heuvelrug': ['Soest', 'Baarn', 'Wijk bij Duurstede', 'Leusden', 'Zeist', 'Bunnik'],
  'gooi-en-vechtstreek': ['Hilversum', 'Gooise Meren', 'Huizen', 'Blaricum', 'Laren', 'Wijdemeren', 'Eemnes'],
  's-hertogenbosch':     ['Vught', 'Heusden', 'Bernheze', 'Boxtel', 'Oss', 'Maasdriel', 'Sint-Michielsgestel'],
};

const CITY_FAQ = {
  'amsterdam': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Amsterdam?', a: 'Het Vondelpark heeft meerdere speeltuinen en je kunt er de hele ochtend zoet zijn. Voor een binnendag: NEMO (kinderen tot 3 jaar gratis) of een van de tientallen kinderboerderijen verspreid over de stad. Het Amsterdamse Bos heeft ook een geitenboerderij (Ridammerhoeve) die gratis te bezoeken is.' },
    { q: 'Zijn er gratis uitjes voor peuters in Amsterdam?', a: 'Veel. De kinderboerderijen zijn gratis (er zijn er ruim tien in de stad), net als het Vondelpark, Westerpark en Noorderpark. Het dakterras van NEMO is in de zomer gratis. En de OBA — de centrale bibliotheek — heeft een gratis kinderafdeling met voorleeshoekjes.' },
    { q: 'Hoe bereik ik peuteruitjes in Amsterdam zonder auto?', a: 'Amsterdam is goed te bereiken met de fiets of het OV. Kinderen reizen gratis op de tram en metro tot en met 3 jaar. Met een bakfiets of Babboe komen de meeste parken en kinderboerderijen makkelijk in bereik.' },
    { q: 'Wat doen we in Amsterdam als het regent?', a: 'NEMO heeft een speciale ruimte voor de allerkleinsten op de begane grond. Monkey Town in Amsterdam-Zuidoost heeft een goede peuterhoek. De centrale bibliotheek (OBA) is altijd een optie: rustig, gratis en een fijne plek om te wachten tot het opdroogt.' },
  ],
  'rotterdam': [
    { q: 'Wat zijn de leukste peuteruitjes in Rotterdam?', a: 'Plaswijckpark in Rotterdam-Noord combineert een kinderboerderij, speeltuinen en waterpartijen op een groene locatie — voor een halve dag kom je er ver mee. Speeldernis in het Zuiderpark heeft een bijzondere natuurspeeltuin die peuters vrij laat bewegen. Voor een regendag is Jimmy\'s Speelparadijs een vaste waarde.' },
    { q: 'Zijn er gratis speeltuinen voor peuters in Rotterdam?', a: 'Vroesenpark heeft een goede omheinde speeltuin die gratis is. Speeldernis in het Zuiderpark is ook gratis en heeft een aparte dreumeshoek. In het Kralingse Bos vind je verspreid speelplekken. Voor Plaswijckpark betaal je entree.' },
    { q: 'Hoe kinderwagenvriendelijk is Rotterdam?', a: 'Het centrum is overwegend goed te navigeren. De metro en waterbussen zijn goed toegankelijk. Sommige kades hebben smalle doorgangen, maar de meeste grote locaties zijn rolstoel- en kinderwagenvriendelijk.' },
    { q: 'Wat doen we in Rotterdam bij slecht weer?', a: 'Jimmy\'s Speelparadijs en Ballorig zijn de voor de hand liggende keuzes. Villa Zebra — het kinderkunstmuseum — is ook de moeite waard: peuters mogen hier echt kliederen. Het Maritiem Museum heeft een interactieve hal die ook bij regen goed werkt.' },
  ],
  'den-haag': [
    { q: 'Wat kunnen we doen met een peuter in Den Haag?', a: 'Scheveningen is het meest voor de hand liggend in de zomer: strand, haven en de pier. Madurodam is geschikt maar het meest indrukwekkend voor iets oudere kinderen. Westduinpark bij Kijkduin is een mooier alternatief dan het drukke Scheveningen-centrum. Indoor: Museon heeft een fijne afdeling voor jonge kinderen.' },
    { q: 'Is Madurodam geschikt voor peuters?', a: 'Peuters kunnen er prima een rondje lopen en vinden de miniatuurtjes grappig, maar de abstractie van schaalmodellen begrijpen ze meestal pas vanaf 4-5 jaar. Als je gaat, reken dan op een halve dag. Kinderen onder 3 jaar zijn gratis.' },
    { q: 'Welk strand is het meest geschikt voor peuters bij Den Haag?', a: 'Kijkduin is rustiger dan Scheveningen en heeft ondiepe waterpartijen die ook zonder zwemkleding fijn zijn voor peuters. Scheveningen is groter en heeft meer faciliteiten, maar in het hoogseizoen ook veel drukte. Beide stranden hebben strandtenten met verschoonruimtes.' },
    { q: 'Zijn er indoor uitjes voor peuters in Den Haag?', a: 'Museon is de beste optie voor een regendag: interactief, goed op peuters afgestemd en kinderen tot 4 jaar zijn gratis. Kindercafe Kikker in Den Haag is een klassieker voor jonge kinderen met een speelhoek en koffie voor ouders.' },
  ],
  'utrecht': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Utrecht?', a: 'Het Nijntje Museum is de absolute topper voor 1-5 jaar: alles op kruiphoogte, interactief, speciaal gebouwd voor kleine kinderen. Reserveer wel vooraf. Kinderboerderij Griftsteede in het Griftpark is gratis en altijd de moeite. Voor een groter dagje uit is het Spoorwegmuseum een hit.' },
    { q: 'Is het Nijntje Museum de moeite waard?', a: 'Ja, zeker voor kinderen van 1 tot 5 jaar. Het museum is speciaal ontworpen voor die leeftijdsgroep: laag, interactief en overzichtelijk. Het enige nadeel is dat het snel vol zit — reserveer altijd vooraf via de website. Een bezoek duurt doorgaans 1,5 tot 2 uur.' },
    { q: 'Zijn er gratis uitjes voor peuters in Utrecht?', a: 'Kinderboerderij Griftsteede (Griftpark), de Eilandsteede (Kanaleneiland) en Kinderboerderij Koppeldijk (Lunetten) zijn alle drie gratis. Maximapark heeft een grote speeltuin en grasvlaktes. De Utrechtse grachten zijn ook gewoon leuk om langs te slenteren met een dreumes.' },
    { q: 'Hoe ver is de Utrechtse Heuvelrug van Utrecht?', a: 'De Heuvelrug begint vrijwel direct na de stad. Met de auto ben je in 15-25 minuten bij Bilthoven, Baarn of Zeist. Met de trein of bus gaat het ook — maar voor activiteiten dieper in het bos is een auto handig.' },
  ],
  'haarlem': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Haarlem?', a: 'Haarlem is compact en op de fiets goed te doen. Het Reinaldapark heeft een fijne speeltuin. De Kennemerduinen zijn op 10 minuten fietsen bereikbaar en geweldig voor een ochtend in de buitenlucht. Teylers Museum heeft een kinderafdeling, maar is het meest geschikt voor kinderen vanaf 5 jaar.' },
    { q: 'Zijn de Kennemerduinen geschikt voor peuters?', a: 'Ja, zolang je een stevige buggy hebt of je peuter graag loopt. De paden zijn gevarieerd — sommige vlakker, sommige wat steiler. Ga niet op warme zomerdagen: dan is het druk en heet in het zand. Het najaar en vroege lente zijn ideaal.' },
    { q: 'Is er een indoor speeltuin in Haarlem?', a: 'In Haarlem zelf zijn de indoor opties beperkt. In de regio (Heemstede, Beverwijk) vind je iets meer. Voor een grote binnenspeeltuin is Amsterdam of Hoofddorp realistischer. Haarlem is meer een stad voor buiten-uitjes.' },
    { q: 'Hoe ver is Haarlem van Amsterdam voor een dagje uit?', a: 'Met de trein 15-20 minuten, met de auto circa 25 minuten afhankelijk van de file. Handig voor Amsterdammers die een keer iets anders willen: kleiner, minder druk en direct bereikbaar via de duinen.' },
  ],
  'amersfoort': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Amersfoort?', a: 'Dierenpark Amersfoort is de grootste trekker: groot genoeg voor een dagje uit, maar niet zo overweldigend als een grote dierentuin. De kinderboerderij binnen het park is goed ingericht voor jonge kinderen. In de stad zelf zijn er meerdere buurtspeeltuinen.' },
    { q: 'Is Dierenpark Amersfoort geschikt voor kleine kinderen?', a: 'Ja. De paden zijn buggy-vriendelijk, er is een grote speeltuin, en de boerderijzone is rustig genoeg voor de allerkleinsten. Ga op een doordeweekse dag buiten de vakanties voor de meeste ruimte.' },
    { q: 'Zijn er gratis uitjes voor peuters in Amersfoort?', a: 'Stadspark Randenbroek heeft speeltuinen en looppaden. Heiligenbergerbeek is een mooie waterrijke plek voor een ochtend buiten. De meeste kinderboerderijen in de wijken zijn gratis.' },
    { q: 'Is Amersfoort een goed dagje uit voor gezinnen?', a: 'Een goed alternatief als Utrecht te druk is. De binnenstad is compact en minder toeristisch, met goede horeca en groene parken dicht bij het centrum. De ligging midden in Nederland maakt het ook bereikbaar vanuit veel richtingen.' },
  ],
  'leiden': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Leiden?', a: 'Naturalis is de duidelijke favoriet: de dinosauriërs zijn een hit voor alle leeftijden en kinderen tot 4 jaar zijn gratis. Het Leidse Hout is een groot stadspark met speeltuinen en ruimte om te rennen. Boerderij Rhijnauwen net buiten de stad combineert pannenkoeken met dieren.' },
    { q: 'Is Naturalis geschikt voor kleine kinderen?', a: 'De T-rex is indrukwekkend maar kan ook spannend zijn voor de allerkleinsten. Het museumgedeelte op de begane grond is toegankelijker voor peuters. Kinderen tot en met 3 jaar zijn gratis. Een bezoek duurt 1,5 tot 2,5 uur.' },
    { q: 'Zijn er gratis uitjes voor peuters in Leiden?', a: 'Het Leidse Hout met speeltuinen is gratis. De kinderboerderijen in de stad ook. De Hortus botanicus vraagt toegang maar biedt een rustige, groene omgeving voor een middagje.' },
    { q: 'Is er een pretpark bij Leiden?', a: 'Archeon in Alphen aan den Rijn (20 min rijden) is het dichtste. Het is een historisch themapark met een kinderzone. Voor peuters is het leuk maar niet spectaculair — denk aan een leuke wandeling in historisch decor, niet aan attracties.' },
  ],
  'utrechtse-heuvelrug': [
    { q: 'Wat zijn de beste uitjes voor peuters op de Utrechtse Heuvelrug?', a: 'Ouwehands Dierenpark in Rhenen is een dagje uit op zichzelf. Geertjes Hoeve bij Haarzuilens (boerderij met dieren en speeltuin) is een favoriet voor jonge kinderen. De bossen en pannenkoekenboerderijen in het gebied zijn ook altijd goed voor een ochtend.' },
    { q: 'Is Ouwehands Dierenpark geschikt voor peuters?', a: 'Ja, maar plan het goed. De Berenbos-attractie kan overweldigend zijn. Begin bij de kinderboerderij, dan de rest van het park. Het park is groot — neem de buggy mee. Doordeweeks buiten vakanties is het rustigst.' },
    { q: 'Welke wandelroutes zijn geschikt voor peuters?', a: 'Kies routes van maximaal 2-3 kilometer op vlak terrein. De paden rondom Austerlitz en het Soesterbos zijn relatief vlak. Neem altijd een draagzak als backup: peuters van 2-3 jaar haken na een half uur lopen snel af.' },
    { q: 'Zijn er pannenkoekenboerderijen op de Heuvelrug?', a: 'Meerdere. Boerderij Rhijnauwen, Hoeve Boschoord bij Driebergen en diverse andere pannenkoekenrestaurants in het bos zijn populair. Ze combineren eten met buiten zijn, wat goed werkt met peuters. Reserveer in het weekend.' },
  ],
  'eindhoven': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Eindhoven?', a: 'Genneper Parken is een groot recreatiegebied met kinderboerderijen, speeltuinen en zwemmogelijkheden in de zomer — grotendeels gratis. De Tongelreep heeft een uitstekend peuterbad. Voor een museum: het Evoluon heeft een jonge-kinderenafdeling.' },
    { q: 'Zijn er indoor speeltuinen voor peuters in Eindhoven?', a: 'Ballorig heeft een vestiging in de regio met een aparte peuterzone. Er zijn ook meerdere kleinere binnenspeeltuinen in de stad. In het weekend is het druk — ga liever doordeweeks in de ochtend.' },
    { q: 'Zijn er gratis uitjes voor peuters in Eindhoven?', a: 'Genneper Parken is grotendeels gratis: kinderboerderij en speeltuinen kosten niets. Het Stadswandelpark heeft ook speeltuinen. In de warmere maanden zijn er waterplekken in de parken.' },
    { q: 'Hoe kinderwagenvriendelijk is Eindhoven?', a: 'Genneper Parken en de meeste grote parken hebben verharde paden. Het stadscentrum is redelijk te navigeren, al zijn sommige straten met kinderkopjes minder prettig met een buggy. De grote attracties zijn over het algemeen buggy-toegankelijk.' },
  ],
  'groningen': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Groningen?', a: 'Het Noorderplantsoen is een mooi stadspark met speeltuinen en vijvers. Het Groninger Museum heeft een kinderafdeling. Kinderboerderij De Wijert is gratis en gezellig. Voor een uitgebreider dagje: Familiepark Nienoord in Leek (35 km).' },
    { q: 'Is het Groninger Museum geschikt voor peuters?', a: 'Deels. De vaste collectie (moderne kunst) is minder interessant voor jonge kinderen. Maar het gebouw is spectaculair en er zijn geregeld interactievere tentoonstellingen. Check vooraf wat er te zien is.' },
    { q: 'Welke kinderboerderijen zijn er in Groningen?', a: 'Kinderboerderij De Wijert in de gelijknamige wijk is een van de bekendste. In diverse stadsdelen zijn kleinere stadsboerderijen. De meeste zijn gratis en goed bereikbaar met de fiets.' },
    { q: 'Zijn er indoor speeltuinen voor peuters in Groningen?', a: 'Ja, er zijn meerdere binnenspeeltuinen in de stad. Zwembad Kardinge heeft een peuterbad. Er zijn ook zwembaden met speciale peutermomenten.' },
  ],
  'almere': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Almere?', a: 'Almere heeft veel groen en ruimte. Het Weerwater met de omliggende parken is goed voor een dagje buiten. De Oostvaardersplassen net buiten de stad zijn bijzonder voor een wandeling. In de stad zijn veel speeltuinen verspreid over de wijken.' },
    { q: 'Is Almere een goed dagje uit voor peuters?', a: 'Voor mensen van buiten is Almere minder een "uitje" dan een stad voor buurtbewoners. Maar de combinatie van parken, water en speeltuinen werkt goed. Het is rustiger dan Amsterdam en goed bereikbaar met de trein.' },
    { q: 'Zijn er kinderboerderijen in Almere?', a: 'Ja, Almere heeft meerdere kinderboerderijen verspreid over de wijken. De meeste zijn gratis en een vaste bestemming voor gezinnen in de omgeving.' },
    { q: 'Hoe ver is Amsterdam van Almere?', a: 'Met de trein circa 20 minuten naar Amsterdam Centraal. Met de auto iets langer afhankelijk van de file. Handig als je de drukte van Amsterdam wil vermijden maar toch de attracties wil bezoeken.' },
  ],
  'tilburg': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Tilburg?', a: 'Beekse Bergen (Safaripark en Waterpark) ligt direct bij Tilburg en is een dagvullend uitje. Het Wandelbos in Tilburg-Noord is gratis en goed voor een rustige ochtend met een peuter. In de stad zijn er speeltuinen en kinderboerderijen.' },
    { q: 'Is Beekse Bergen geschikt voor peuters?', a: 'Het Safaripark is goed voor alle leeftijden — de dieren rijden langs je auto. Het Waterpark (Speelland) is meer geschikt voor kinderen vanaf 3-4 jaar. Jonge peuters vinden het leuk maar minder geweldig dan oudere kinderen. Combineer met een picknick voor een ontspannen dag.' },
    { q: 'Zijn er gratis speeltuinen voor peuters in Tilburg?', a: 'Ja, in vrijwel alle wijken zijn gratis buurtspeeltuinen. Het Wandelbos heeft speelplekken verspreid door het bos. Stadspark de Oude Warande is ook een mooie optie met speeltoestellen en ruimte om te rennen.' },
    { q: 'Zijn er indoor uitjes voor peuters in Tilburg?', a: 'Er zijn meerdere binnenspeeltuinen in Tilburg en omgeving. Zwembad Stappegoor heeft een peuterbad. Op regenachtige dagen is een binnenspeeltuin of het zwembad de beste optie.' },
  ],
  'breda': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Breda?', a: 'Het Mastbos is een van de grootste aaneengesloten loofbossen van Nederland en begint direct achter de stad — ideaal voor een ochtend buiten. Het Chassepark heeft een speeltuin. Voor een uitgebreider dagje is Beekse Bergen in Tilburg (30 min) een optie.' },
    { q: 'Is het Mastbos geschikt voor peuters?', a: 'Ja, er zijn verharde paden door het bos die ook met een buggy goed te doen zijn. Het bos is groot maar overzichtelijk. In het najaar zijn de kleuren prachtig. Combineer met een pannenkoek in een van de boerderijen aan de rand van het bos.' },
    { q: 'Zijn er kindvriendelijke restaurants in Breda?', a: 'Breda heeft een levendige horecascène. Meerdere restaurants in het centrum hebben een kindermenu en ruimte voor kinderwagens. Pannenkoekenrestaurants zijn er in en rondom de stad.' },
    { q: 'Wat is er te doen in Breda bij slecht weer met peuters?', a: 'Er zijn binnenspeeltuinen in de regio Breda. Op regenachtige dagen zijn deze de meest logische keuze. Check of ze een aparte peuterzone hebben — bij de grotere speelparadijzen is dat er doorgaans bij.' },
  ],
  'nijmegen': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Nijmegen?', a: 'Burgers\' Zoo in Arnhem is op 15 minuten rijden en een van de beste dierentuinen van Nederland voor alle leeftijden. In Nijmegen zelf: het Goffertpark heeft een ruime speeltuin. Berg en Dal net buiten de stad is goed voor een wandeling in de bossen.' },
    { q: 'Zijn er kinderboerderijen in Nijmegen?', a: 'Ja, in de wijken zijn kinderboerderijen te vinden. Ze zijn gratis en goed voor een uur of twee met jonge kinderen. Stadsboerderij Heilig Landstichting net buiten de stad heeft ook dieren in een groene omgeving.' },
    { q: 'Hoe ver is Burgers\' Zoo van Nijmegen?', a: 'Arnhem ligt op circa 15 kilometer — met de auto 15-20 minuten. Burgers\' Zoo is een van de beste dierentuinen van Nederland en zeker een dagje uit waard. Kinderen tot 3 jaar zijn gratis. Combineer eventueel met de binnenstad van Arnhem.' },
    { q: 'Is het Valkhof park geschikt voor peuters?', a: 'Het Valkhof is een mooi stadspark op een heuvel met indrukwekkende ruïnes. Er zijn speelplekken. Het pad omhoog kan steil zijn met een buggy; neem een draagzak als alternatief.' },
  ],
  'arnhem': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Arnhem?', a: 'Burgers\' Zoo is de nummer één — een van de beste dierentuinen van Europa, en de oceaanhal en savanne zijn voor alle leeftijden geweldig. Het Openluchtmuseum vlakbij is ook een aanrader: peuters kunnen vrij rondlopen op het grote terrein. Sonsbeekpark in de stad heeft mooie speeltuinen.' },
    { q: 'Is Burgers\' Zoo geschikt voor kleine kinderen?', a: 'Uitstekend. Het park is groot maar buggy-vriendelijk. De "Mangrove" (tropische kas met vrije vlinders) is geweldig voor kleine kinderen. Reken op een volledige dag. Kinderen tot 3 jaar zijn gratis.' },
    { q: 'Is het Nederlands Openluchtmuseum geschikt voor peuters?', a: 'Ja — het museum heeft een groot terrein met historische boerderijen, ambachten en een speelboerderij. Peuters vinden het er leuk: veel ruimte, dieren en dingen om te bekijken. Er rijdt ook een elektrische tram door het park.' },
    { q: 'Zijn er gratis speeltuinen in Arnhem?', a: 'Sonsbeekpark heeft meerdere speeltuinen die gratis zijn. Kinderboerderijen in de wijken zijn gratis en een vaste ochtendbestemming voor veel gezinnen in Arnhem.' },
  ],
  'apeldoorn': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Apeldoorn?', a: 'Apenheul is het paradepaartje: apen lopen vrij rond en voor peuters is dat magisch (en soms een beetje spannend). Paleis het Loo heeft mooie tuinen om doorheen te wandelen. En Apeldoorn ligt midden op de Veluwe — een wandeling in het bos is altijd de moeite.' },
    { q: 'Is Apenheul geschikt voor kleine kinderen?', a: 'Ja, maar met kanttekeningen. De apen lopen vrij rond en pakken soms spullen af. Peuters van 2-3 vinden dat geweldig of eng — je weet maar nooit van tevoren. De peutertuin is rustiger. Sluit tassen en houd eten verborgen.' },
    { q: 'Zijn er gratis uitjes voor peuters in Apeldoorn?', a: 'De Veluwe om de hoek is grotendeels gratis — parkeer aan de rand en loop het bos in. Het Oranjepark in de stad heeft speeltuinen. Kinderboerderijen in de wijken zijn ook gratis.' },
    { q: 'Hoe dicht bij is de Veluwe voor dagjes uit?', a: 'Apeldoorn ligt er middenin. Natuur is overal om de stad. Schaarsbergen, het Nationaal Park Veluwezoom en het Hoge Veluwe Park zijn allemaal op 20-30 minuten. Het Hoge Veluwe is betaald maar heeft gratis witte fietsen en uitstekende kinderfaciliteiten.' },
  ],
  's-hertogenbosch': [
    { q: 'Wat zijn de leukste uitjes voor peuters in Den Bosch?', a: 'De Efteling in Kaatsheuvel ligt op 25 kilometer — een klassieke dagbestemming. Autotron Rosmalen vlak bij de stad is goed voor kinderen die gek zijn op auto\'s. In de stad zelf: Kinderboerderij de Haverleij en de Bossche Broek zijn goede lokale opties.' },
    { q: 'Is de Efteling geschikt voor kleine kinderen?', a: 'Ja, de Efteling heeft een heel Sprookjesbos en attracties voor de allerkleinsten. Kinderen tot 3 jaar zijn gratis. Het park is groot dus neem de kinderwagen mee. Op warme zomerdagen en in vakanties is het erg druk — overweeg vroeg te gaan of een doordeweekse dag.' },
    { q: 'Zijn er kinderboerderijen in Den Bosch?', a: 'Ja, er zijn meerdere kinderboerderijen in en rondom de stad. Bossche Broek heeft een mooie groene omgeving direct bij de stad. De meeste zijn gratis.' },
    { q: 'Zijn er indoor uitjes voor peuters in Den Bosch?', a: 'Er zijn binnenspeeltuinen in de regio. Op regenachtige dagen is de Efteling ook een optie: de overdekte gedeeltes zijn ruim en ook bij regen goed te doen.' },
  ],
  'gooi-en-vechtstreek': [
    { q: 'Wat zijn de leukste uitjes voor peuters in het Gooi?', a: 'Het Gooi is een groene regio met veel ruimte. Speelpark De Oosterenk in Hilversum is goed voor een dagje buiten. De Gooimeer-oever bij Huizen is mooi voor een wandeling. De Loosdrechtse Plassen zijn in de zomer een leuke waterbestemming voor gezinnen.' },
    { q: 'Is het Gooi kinderwagenvriendelijk?', a: 'De grotere parken en recreatiegebieden zijn goed toegankelijk. Sommige bospaadjes zijn minder geschikt voor een zware kinderwagen — neem een stevige buggy of draagzak mee.' },
    { q: 'Zijn er pannenkoekenboerderijen in het Gooi?', a: 'Ja, in en rondom Hilversum en het Gooi zijn meerdere pannenkoekenboerderijen en -restaurants te vinden. Ze combineren goed met een wandeling in de natuur.' },
    { q: 'Hoe bereik ik het Gooi vanuit Amsterdam?', a: 'Met de trein ben je vanuit Amsterdam CS in 30-40 minuten in Hilversum. Met de auto is het vergelijkbaar. Het Gooi is een van de groenere uitwijkmogelijkheden voor Amsterdammers die de stad even willen ontvluchten.' },
  ],
};

const TIKKIE_URL = 'https://betaalverzoek.knab.nl/yfgrM-Z4gH54j9JO';
let LOCATION_COUNT = 0; // wordt gezet in main() na Supabase-fetch

const WEATHER_LABELS = {
  indoor: 'Overdekt (indoor)',
  outdoor: 'Buiten (outdoor)',
  both: 'Overdekt & buiten',
};

// === Helpers ===

function today() {
  const d = new Date();
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function replaceMarker(content, marker, replacement) {
  const regex = new RegExp(`(<!-- BEGIN:${marker} -->)[\\s\\S]*?(<!-- END:${marker} -->)`, 'g');
  return content.replace(regex, `$1\n${replacement}\n$2`);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchJSON(endpoint, query = '') {
  const base = SB_URL.includes('supabase.co') ? SB_URL : SB_PROJECT;
  const url = `${base}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = new Error(`Supabase fetch ${endpoint} failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// === Reusable HTML Snippets ===

const NAV_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" class="nav-logo-svg" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#D4775A"/><path d="M20 6c-5.5 0-10 4.5-10 10 0 7 10 20 10 20s10-13 10-20c0-5.5-4.5-10-10-10z" fill="white"/><circle cx="20" cy="16" r="4" fill="#D4775A"/></svg>';

function navHTML(ctaText = 'Open App', ctaHref = '/app.html') {
  return `<a href="#main-content" class="skip-link">Naar hoofdinhoud</a>
<nav aria-label="Hoofdnavigatie">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      ${NAV_LOGO_SVG}
      <span class="logo-text"><span class="logo-top">Peuter</span><span class="logo-bottom">Plannen</span></span>
    </a>
    <div class="nav-links">
      <a href="/blog/" class="nav-link">Blog</a>
      <a href="${ctaHref}" class="nav-cta">${ctaText}</a>
    </div>
  </div>
</nav>`;
}

function footerHTML() {
  return `<footer>
  <nav aria-label="Footernavigatie">
  <p>&copy; 2026 PeuterPlannen &middot; <a href="/">Home</a> &middot; <a href="/app.html">App</a> &middot; <a href="/blog/">Blog</a> &middot; <a href="/contact.html">Contact</a> &middot; <a href="/about.html">Over ons</a> &middot; <a href="${TIKKIE_URL}" target="_blank" rel="noopener">Steun ons</a> &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/disclaimer/">Disclaimer</a></p>
  </nav>
</footer>`;
}

function newsletterHTML() {
  return '';
}

function badgeHTML(loc) {
  const badges = [];
  if (loc.coffee) badges.push(`<span class="badge-pill badge-coffee"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>Koffie</span>`);
  if (loc.alcohol) badges.push(`<span class="badge-pill badge-alcohol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/></svg>Alcohol</span>`);
  if (loc.diaper) badges.push(`<span class="badge-pill badge-diaper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19.5 10c.3 0 .5.1.7.3.2.2.3.4.3.7 0 2.8-2 8-7.5 8S5.5 13.8 5.5 11c0-.3.1-.5.3-.7.2-.2.4-.3.7-.3"/><path d="M6 10V6c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v4"/></svg>Luierruimte</span>`);
  return badges.length ? `<span class="badges">${badges.join('')}</span>` : '';
}

function revealScript() {
  return `<script>
(function(){var o=new IntersectionObserver(function(e){e.forEach(function(i){if(i.isIntersecting){i.target.classList.add('visible');o.unobserve(i.target);}});},{threshold:0,rootMargin:'0px 0px 300px 0px'});document.querySelectorAll('.loc-item,.type-section,.region-section,.blog-card,.cta-block,.support-section,.faq-section').forEach(function(el,i){el.classList.add('reveal');el.style.animationDelay=Math.min(i*0.03,0.15)+'s';o.observe(el);});})();
</script>`;
}

function supportHTML(variant = 'default') {
  const count = LOCATION_COUNT > 0 ? LOCATION_COUNT : 660;
  if (variant === 'category') {
    return `<section class="support-section">
  <div class="support-inner">
    <h3>Gratis voor jou, niet voor mij</h3>
    <p>Dit is een hobbyproject uit Utrecht — geen team, geen advertenties, wel ${count}+ uitjes in Nederland. Als jij dit handig vindt, is een bijdrage welkom.</p>
    <div class="support-amounts">
      <span class="support-pill">€2</span>
      <span class="support-pill support-pill-mid">€5</span>
      <span class="support-pill">€10</span>
    </div>
    <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="btn-support">
      Steun PeuterPlannen
    </a>
  </div>
</section>`;
  }
  return `<section class="support-section">
  <div class="support-inner">
    <h3>Iets nuttigs gevonden?</h3>
    <p>PeuterPlannen is gratis — de serverkosten zijn dat niet. Als je hier iets aan gehad hebt, helpt een kleine bijdrage om het zo te houden voor anderen.</p>
    <p class="support-count">${count}+ locaties beschikbaar in heel Nederland.</p>
    <div class="support-amounts">
      <span class="support-pill">€2</span>
      <span class="support-pill support-pill-mid">€5</span>
      <span class="support-pill">€10</span>
    </div>
    <p class="support-impact">De server kost ~€10 per maand. Elk beetje telt.</p>
    <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="btn-support">
      Stuur een bijdrage
    </a>
  </div>
</section>`;
}

function headCommon(extra = '') {
  return `  <!-- Google tag (gtag.js) — Consent Mode v2 -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
      wait_for_update: 500
    });
    try { var _s = localStorage.getItem('pp_consent'); if (_s) gtag('consent', 'update', JSON.parse(_s)); } catch(e) {}
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-46RW178B97"></script>
  <script>gtag('js', new Date()); gtag('config', 'G-46RW178B97');</script>
  <script src="/consent.js" defer></script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4964283748507156" crossorigin="anonymous"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#D4775A">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.min.css">${extra}`;
}

// Fallback regions when the DB table doesn't exist yet
const FALLBACK_REGIONS = [
  { name: 'Amsterdam', slug: 'amsterdam', blurb: 'Amsterdam heeft een groot aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ.', display_order: 1, population: 942000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Rotterdam', slug: 'rotterdam', blurb: 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen en buiten.', display_order: 2, population: 675000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Den Haag', slug: 'den-haag', blurb: 'Den Haag combineert strand, cultuur en natuur op loopafstand van elkaar. Madurodam, het Kunstmuseum, Scheveningen en Westduinpark zijn klassiekers voor een uitje met peuters.', display_order: 3, population: 569000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Utrecht', slug: 'utrecht', blurb: 'Utrecht is een van de kindvriendelijkste steden van Nederland. Het Nijntje Museum, de Griftsteede, het Spoorwegmuseum en tientallen speeltuinen maken de stad ideaal voor een dagje uit met peuters.', display_order: 4, population: 378000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Haarlem', slug: 'haarlem', subtitleLabel: 'Regio Haarlem', blurb: 'Haarlem is compact en groen, fijn voor een relaxt dagje uit met jonge kinderen. Het Teylers Museum, het Reinaldapark en de Kennemerduinen liggen op fietsafstand van het centrum.', display_order: 5, population: 169000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Amersfoort', slug: 'amersfoort', blurb: 'Amersfoort is een gezellige middeleeuwse stad met genoeg te doen voor peuters. Dierenpark Amersfoort, kinderboerderijen en het buitengebied van de Utrechtse Heuvelrug liggen om de hoek.', display_order: 6, population: 164000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Leiden', slug: 'leiden', blurb: 'Leiden is een compacte universiteitsstad met meer te doen voor peuters dan je zou denken. Van Naturalis tot kinderboerderijen en een pannenkoekenrestaurant aan het water.', display_order: 7, population: 130000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Utrechtse Heuvelrug', slug: 'utrechtse-heuvelrug', blurb: 'De Utrechtse Heuvelrug is een schatkamer voor gezinnen met peuters. Kastelen, kinderboerderijen, pannenkoekenrestaurants in het bos en prachtige natuurspeelplaatsen — hier combineer je natuur met avontuur op loopafstand.', display_order: 8, population: 50000, tier: 'region', schema_type: 'AdministrativeArea', is_active: true },
];

// === Data Fetching ===

async function fetchData() {
  console.log('Fetching data from Supabase...\n');

  let regions;
  try {
    regions = await fetchJSON('regions', 'select=*&is_active=eq.true&order=display_order');
    console.log(`  ${regions.length} active regions (from DB)`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  regions table not found, using fallback data');
      regions = FALLBACK_REGIONS;
    } else {
      throw err;
    }
  }

  const locations = await fetchJSON('locations', 'select=*&order=name');
  console.log(`  ${locations.length} locations\n`);

  // Counts
  const regionCounts = {};
  const typeCounts = {};
  for (const loc of locations) {
    regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
    typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
  }

  return { regions, locations, regionCounts, typeCounts, total: locations.length };
}

// === Compute Slugs ===

function computeSlugs(data) {
  const { regions, locations } = data;

  // Build region name -> slug map
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  // Group locations by region slug
  const byRegion = {};
  locations.forEach(loc => {
    const rSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
    loc.regionSlug = rSlug;
    if (!byRegion[rSlug]) byRegion[rSlug] = [];
    byRegion[rSlug].push(loc);
  });

  // Generate slugs with conflict resolution
  for (const [rSlug, locs] of Object.entries(byRegion)) {
    const usedSlugs = {};
    for (const loc of locs) {
      let slug = slugify(loc.name);
      if (!slug) slug = 'locatie';
      if (usedSlugs[slug]) {
        usedSlugs[slug]++;
        slug = `${slug}-${usedSlugs[slug]}`;
      } else {
        usedSlugs[slug] = 1;
      }
      loc.locSlug = slug;
      loc.pageUrl = `/${rSlug}/${slug}/`;
    }
  }

  console.log('Computed slugs for all locations');
}

// === 1. Update index.html ===

function updateIndex(data) {
  const { regions, regionCounts, typeCounts, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // STATS
  const statsHTML = `    <section class="stats">
        <div class="stats-container">
            <div>
                <div class="stat-number">${total}</div>
                <div class="stat-label">Locaties</div>
            </div>
            <div>
                <div class="stat-number">${regions.length}</div>
                <div class="stat-label">Regio's</div>
            </div>
            <div>
                <div class="stat-number">100%</div>
                <div class="stat-label">Gecheckt</div>
            </div>
        </div>
    </section>`;
  content = replaceMarker(content, 'STATS', statsHTML);

  // TYPE_GRID
  const typeCards = Object.entries(TYPE_MAP).map(([type, info]) => {
    const count = typeCounts[type] || 0;
    const imgSrc = TYPE_IMAGES[type];
    const img = imgSrc ? `\n                    <picture><source type="image/webp" srcset="${imgSrc.replace('.png', '.webp')}"><img src="${imgSrc}" alt="" width="48" height="48" style="border-radius:10px;margin-bottom:8px;" loading="lazy"></picture>` : '';
    return `                <a href="${info.slug}.html" class="city-card">${img}
                    <strong>${info.label}</strong>
                    <span>${count} locaties</span>
                </a>`;
  }).join('\n');

  const typeGridHTML = `    <section class="cities-section" style="background: var(--bg-warm);">
        <div class="container">
            <h2 class="section-title">Uitjes per type</h2>
            <p class="section-sub">Weet je al wat voor dag het wordt? Zoek direct op type uitje.</p>
            <div class="cities-grid">
${typeCards}
            </div>
        </div>
    </section>`;
  content = replaceMarker(content, 'TYPE_GRID', typeGridHTML);

  // CITY_GRID
  const cityCards = regions.map(r => {
    const count = regionCounts[r.name] || 0;
    return `                <a href="${r.slug}.html" class="city-card">
                    <strong>${r.name}</strong>
                    <span>${count} locaties</span>
                </a>`;
  }).join('\n');

  const cityGridHTML = `    <section class="cities-section">
        <div class="container">
            <h2 class="section-title">Uitjes per regio</h2>
            <p class="section-sub">Elke regio omvat de stad én omliggende gemeenten. Gecheckt en actueel.</p>
            <div class="cities-grid">
${cityCards}
            </div>
        </div>
    </section>`;
  content = replaceMarker(content, 'CITY_GRID', cityGridHTML);

  // JSONLD_INDEX — areaServed from DB
  const areaServed = regions.map(r => {
    return `        {"@type": "${r.schema_type || 'City'}", "name": "${r.name}"}`;
  }).join(',\n');

  const jsonldHTML = `    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl/",
      "description": "Vind kindvriendelijke uitjes voor kinderen van 0-7 jaar in heel Nederland. ${total} locaties in ${regions.length} regio's.",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR"
      },
      "areaServed": [
${areaServed}
      ],
      "audience": {
        "@type": "Audience",
        "audienceType": "Ouders met jonge kinderen"
      }
    }
    </script>`;
  const brandSchemaHTML = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PeuterPlannen",
    "url": "https://peuterplannen.nl/",
    "description": "De beste uitjes voor peuters in heel Nederland. ${total} geverifieerde locaties in ${regions.length} regio's.",
    "inLanguage": "nl-NL",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://peuterplannen.nl/app.html?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PeuterPlannen",
    "url": "https://peuterplannen.nl/",
    "logo": {
      "@type": "ImageObject",
      "url": "https://peuterplannen.nl/icons/apple-touch-icon.png",
      "width": 180,
      "height": 180
    },
    "description": "PeuterPlannen helpt ouders met peuters de leukste uitjes te vinden in Nederland. Geverifieerde speeltuinen, kinderboerderijen, musea en restaurants.",
    "foundingDate": "2025",
    "areaServed": {"@type": "Country", "name": "Nederland"},
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hoi@peuterplannen.nl",
      "contactType": "customer support",
      "availableLanguage": "Dutch"
    }
  }
  </script>`;
  content = replaceMarker(content, 'JSONLD_INDEX', jsonldHTML + brandSchemaHTML);

  // Also update OG/Twitter descriptions with correct count
  content = content.replace(/\d+ geverifieerde kindvriendelijke locaties/g, `${total} geverifieerde kindvriendelijke locaties`);

  fs.writeFileSync(path.join(ROOT, 'index.html'), content);
  console.log(`Updated index.html (${total} locaties, ${regions.length} regio's)`);
}

// === 2. Update app.html ===

function updateApp(data) {
  const { regions, regionCounts, typeCounts, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');

  // NOSCRIPT
  const noscriptCities = regions.map(r => {
    const count = regionCounts[r.name] || 0;
    return `      <li><a href="${r.slug}.html">${r.name} (${count} locaties)</a></li>`;
  }).join('\n');

  const noscriptHTML = `<noscript>
  <div>
    <h1>PeuterPlannen</h1>
    <p>${total} uitjes voor gezinnen met jonge kinderen.</p>
    <h2>Per stad</h2>
    <ul>
${noscriptCities}
    </ul>
    <h2>Per type</h2>
    <ul>
      <li><a href="speeltuinen.html">Speeltuinen</a></li>
      <li><a href="kinderboerderijen.html">Kinderboerderijen</a></li>
      <li><a href="natuur.html">Natuur</a></li>
      <li><a href="musea.html">Musea</a></li>
      <li><a href="zwemmen.html">Zwemmen</a></li>
      <li><a href="pannenkoeken.html">Pannenkoeken</a></li>
      <li><a href="horeca.html">Horeca</a></li>
    </ul>
  </div>
</noscript>`;
  content = replaceMarker(content, 'NOSCRIPT', noscriptHTML);

  // JSONLD_APP — areaServed from DB
  const areaServed = regions.map(r => {
    return `        {"@type": "${r.schema_type || 'City'}", "name": "${r.name}"}`;
  }).join(',\n');

  const jsonldHTML = `    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl/app.html",
      "description": "Interactieve kaart met ${total} kindvriendelijke locaties. Filter op type: speeltuin, restaurant, museum, natuur.",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Any",
      "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
      "author": {"@type": "Person", "name": "Bas Metten"},
      "areaServed": [
${areaServed}
      ]
    }
    </script>`;
  content = replaceMarker(content, 'JSONLD_APP', jsonldHTML);

  // INFO_STATS
  const infoStatsHTML = `            <div class="info-stats">
                <div class="info-stat">
                    <strong>${total}+</strong>
                    <span>Locaties</span>
                </div>
                <div class="info-stat">
                    <strong>${regions.length}</strong>
                    <span>Regio's</span>
                </div>
                <div class="info-stat">
                    <strong>5</strong>
                    <span>Categorieën</span>
                </div>
            </div>`;
  content = replaceMarker(content, 'INFO_STATS', infoStatsHTML);

  // Meta/OG descriptions with correct counts
  content = content.replace(/\d+ geverifieerde plekken/g, `${total} geverifieerde plekken`);
  content = content.replace(/\d+ kindvriendelijke locaties/g, `${total} kindvriendelijke locaties`);
  content = content.replace(/\d+ geverifieerde locaties/g, `${total} geverifieerde locaties`);
  content = content.replace(/\d+ geverifieerde uitjes voor gezinnen/g, `${total} geverifieerde uitjes voor gezinnen`);

  fs.writeFileSync(path.join(ROOT, 'app.html'), content);
  console.log(`Updated app.html (${total} locaties, ${regions.length} regio's)`);
}

// === 3. Update about.html ===

function updateAbout(data) {
  const { regions, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');

  // META_ABOUT
  const metaHTML = `    <meta name="description" content="PeuterPlannen helpt ouders met peuters de leukste uitjes te vinden in heel Nederland. ${total}+ geverifieerde locaties in ${regions.length} regio's.">`;
  content = replaceMarker(content, 'META_ABOUT', metaHTML);

  // STATS_ABOUT
  const statsHTML = `        <div class="stats-row">
            <div class="stat-card">
                <strong>${total}+</strong>
                <span>Locaties</span>
            </div>
            <div class="stat-card">
                <strong>${regions.length}</strong>
                <span>Regio's</span>
            </div>
            <div class="stat-card">
                <strong>7</strong>
                <span>Categorieën</span>
            </div>
        </div>`;
  content = replaceMarker(content, 'STATS_ABOUT', statsHTML);

  // SUPPORT_ABOUT
  const count = LOCATION_COUNT > 0 ? LOCATION_COUNT : total;
  const supportAboutHTML = `        <div class="support-about-section">
            <div class="support-about-inner">
                <h2>Steun PeuterPlannen</h2>
                <p>Dit bouw ik in mijn vrije tijd, vanuit Utrecht. Geen team, geen investors, geen advertenties. Wat er binnenkomt gaat naar serverkosten (~€10/maand) en nieuwe functies. De rest doe ik erbij. ${count}+ locaties beschikbaar, voor iedereen gratis.</p>
                <div class="support-about-amounts">
                    <span class="support-about-pill">€2</span>
                    <span class="support-about-pill support-about-pill-mid">€5</span>
                    <span class="support-about-pill">€10</span>
                </div>
                <a href="${TIKKIE_URL}" target="_blank" rel="noopener" class="support-about-cta">Stuur een bijdrage via betaalverzoek</a>
                <p class="support-about-subline">Elk bedrag is welkom.</p>
            </div>
        </div>`;
  content = replaceMarker(content, 'SUPPORT_ABOUT', supportAboutHTML);

  fs.writeFileSync(path.join(ROOT, 'about.html'), content);
  console.log(`Updated about.html (${total}+ locaties, ${regions.length} regio's)`);
}

// === 4. Update manifest.json ===

function updateManifest(data) {
  const { total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8');
  content = content.replace(/\d+ geverifieerde locaties/g, `${total} geverifieerde locaties`);
  fs.writeFileSync(path.join(ROOT, 'manifest.json'), content);
  console.log(`Updated manifest.json (${total} locaties)`);
}

// === 5. Generate city pages ===

function locationHTML_city(loc) {
  const locationUrl = loc.pageUrl || '#';
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" class="loc-website-btn" aria-label="Website van ${escapeHtml(loc.name)}">Website</a>` : '';
  const desc = isFillerDescription(loc.description) ? '' : (loc.description || '');
  return `
      <article class="loc-item">
        <h3><a href="${locationUrl}">${escapeHtml(loc.name)}</a></h3>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
        ${badgeHTML(loc)}
        <div class="loc-actions">
          <a href="${locationUrl}" class="loc-detail-btn">Bekijk details</a>
          ${websiteLink}
        </div>
      </article>`;
}

function generateCityPage(region, locs, allRegions) {
  const byType = {};
  TYPE_ORDER.forEach(t => { byType[t] = locs.filter(l => l.type === t); });

  // Insert ad container after 2nd type section
  const typesWithLocs = TYPE_ORDER.filter(t => byType[t].length > 0);
  const sectionsHTML = typesWithLocs
    .map((t, i) => {
      const typeImgSrc = TYPE_IMAGES[t];
      const typeImg = typeImgSrc ? `<picture><source type="image/webp" srcset="${typeImgSrc.replace('.png', '.webp')}"><img src="${typeImgSrc}" alt="" class="category-icon" width="36" height="36" loading="lazy"></picture>` : '';
      let section = `
    <section class="type-section">
      <h2>${typeImg}${TYPE_LABELS_CITY[t]}</h2>
      <div class="loc-list">
        ${byType[t].map(locationHTML_city).join('')}
      </div>
    </section>`;
      return section;
    }).join('');

  // Nearby cities instead of all cities
  const nearbySlugs = NEARBY_CITIES[region.slug] || [];
  const nearbyRegions = nearbySlugs.map(s => allRegions.find(r => r.slug === s)).filter(Boolean);
  const nearbyLinks = nearbyRegions.map(r => `<a href="/${r.slug}.html">${r.name}</a>`).join(' &middot; ');

  const weatherNote = (region.slug === 'amsterdam' || region.slug === 'rotterdam')
    ? 'Bij slecht weer raden we speelparadijzen zoals Monkey Town of Ballorig aan. '
    : '';

  const coverage = MUNICIPALITY_COVERAGE[region.slug];
  const CITY_SLUGS = new Set(['amsterdam','den-haag','utrecht','haarlem','rotterdam','leiden',
    'amersfoort','groningen','almere','eindhoven','tilburg','breda','nijmegen','arnhem',
    'apeldoorn','s-hertogenbosch']);
  const omgevingLabel = (coverage && CITY_SLUGS.has(region.slug)) ? ' en omgeving' : '';
  const coverageNote = coverage
    ? ` Inclusief locaties in ${coverage.slice(0, 4).join(', ')}${coverage.length > 4 ? ' en meer' : ''}.`
    : '';

  const cityFaqItems = CITY_FAQ[region.slug] || [];
  const cityFaqLd = cityFaqItems.length > 0 ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": cityFaqItems.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
  }, null, 2) : null;

  const jsonLdItems = locs.map((loc, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": loc.name,
    "description": loc.description || '',
    "url": `https://peuterplannen.nl${loc.pageUrl}`,
    "item": {
      "@type": "TouristAttraction",
      "name": loc.name,
      "description": loc.description || '',
      "geo": { "@type": "GeoCoordinates", "latitude": loc.lat, "longitude": loc.lng },
      "address": { "@type": "PostalAddress", "addressLocality": region.name, "addressCountry": "NL" }
    }
  }));

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Uitjes met peuters in ${region.name}`,
    "description": `De beste kinderactiviteiten en uitjes voor peuters in ${region.name}`,
    "numberOfItems": locs.length,
    "itemListElement": jsonLdItems
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${region.name} met peuters — speeltuinen, musea & restaurants | PeuterPlannen</title>
  <meta name="description" content="Ontdek de beste uitjes voor peuters in ${region.name}. ${locs.length} kindvriendelijke locaties: speeltuinen, musea, pannenkoeken en natuur. Geverifieerd en actueel.">
  <link rel="canonical" href="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:title" content="${region.name} met peuters | PeuterPlannen">
  <meta property="og:description" content="${locs.length} geverifieerde uitjes voor peuters in ${region.name}: speeltuinen, musea, natuur en kindvriendelijke horeca.">
  <meta property="og:url" content="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <script type="application/ld+json">
${jsonLd}
  </script>
  ${cityFaqLd ? `<script type="application/ld+json">\n${cityFaqLd}\n  </script>` : ''}
</head>
<body>

${navHTML(`Zoek in ${region.name}`, `/app.html?regio=${encodeURIComponent(region.name)}`)}

<div class="hero">
  <h1>Uitjes met peuters in <span>${region.name}${omgevingLabel}</span></h1>
  <p>${region.blurb}</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${locs.length}</strong><span>locaties</span></div>
    <div class="hero-stat"><strong>${byType.play?.length || 0}</strong><span>speeltuinen</span></div>
    <div class="hero-stat"><strong>${byType.museum?.length || 0}</strong><span>musea</span></div>
    <div class="hero-stat"><strong>${(byType.pancake?.length || 0) + (byType.horeca?.length || 0)}</strong><span>eten & drinken</span></div>
  </div>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${region.name}
</nav>

<main id="main-content">
  <div class="intro-box">
    <p>${region.blurb} ${weatherNote}Op deze pagina vind je <strong>${locs.length} locaties</strong> in de regio ${region.name}.${coverageNote} Gecheckt op kindvriendelijkheid en of het echt werkt met een peuter.</p>
  </div>

  <div class="city-app-cta">
    <span>Zoek op jouw locatie en ontdek wat dichtbij is</span>
    <a href="/app.html?regio=${encodeURIComponent(region.name)}" class="btn-app-cta">Open de app</a>
  </div>

  ${sectionsHTML}

  ${cityFaqItems.length > 0 ? `<div class="faq-section">
    <h2>Veelgestelde vragen over uitjes in ${region.name}</h2>
    ${cityFaqItems.map(item => `
    <details class="faq-item">
      <summary>${item.q}</summary>
      <div class="faq-answer"><p>${item.a}</p></div>
    </details>`).join('')}
  </div>` : ''}

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>De app toont locaties gesorteerd op afstand van jouw positie — handig als je niet precies weet waar je bent.</p>
    <a href="/app.html?regio=${encodeURIComponent(region.name)}">Open de app voor ${region.name}</a>
  </div>

  ${supportHTML()}

  <div class="other-cities">
    <h3>Peuteruitjes in de buurt</h3>
    ${nearbyLinks || '<a href="/">Bekijk alle steden</a>'}
  </div>
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;
}

function generateCityPages(data) {
  const { regions, locations } = data;

  for (const region of regions) {
    const locs = locations.filter(l => l.region === region.name);
    const html = generateCityPage(region, locs, regions);
    const outPath = path.join(ROOT, `${region.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${region.slug}.html — ${locs.length} locaties`);
  }
}

// === 6. Generate type pages ===

function locationHTML_type(loc) {
  const locationUrl = loc.pageUrl || '#';
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" class="loc-website-btn" aria-label="Website van ${escapeHtml(loc.name)}">Website</a>` : '';
  const regionLabel = loc.region === 'Overig' ? 'Overig Nederland' : loc.region;
  const desc = isFillerDescription(loc.description) ? '' : (loc.description || '');
  return `
      <article class="loc-item">
        <div class="loc-region">${regionLabel}</div>
        <h3><a href="${locationUrl}">${escapeHtml(loc.name)}</a></h3>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
        ${badgeHTML(loc)}
        <div class="loc-actions">
          <a href="${locationUrl}" class="loc-detail-btn">Bekijk details</a>
          ${websiteLink}
        </div>
      </article>`;
}

function generateTypePage(page, locs, regions) {
  // Group by region, use DB order
  const byRegion = {};
  locs.forEach(loc => {
    const r = loc.region === 'Overig' ? 'Overig Nederland' : loc.region;
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(loc);
  });

  // Region order from DB + fallback for "Overig Nederland"
  const regionOrder = regions.map(r => r.name);
  regionOrder.push('Overig Nederland');

  const sectionsHTML = regionOrder
    .filter(r => byRegion[r]?.length > 0)
    .map(r => `
    <section class="region-section">
      <h2>${page.sectionLabel} in ${r}</h2>
      <div class="loc-list">
        ${byRegion[r].map(locationHTML_type).join('')}
      </div>
    </section>`).join('');

  const faqHTML = page.faqItems.map(item => `
    <details class="faq-item">
      <summary>${item.q}</summary>
      <div class="faq-answer"><p>${item.a}</p></div>
    </details>`).join('');

  const otherTypeLinks = TYPE_PAGES
    .filter(t => t.slug !== page.slug)
    .map(t => `<a href="/${t.slug}.html">${t.sectionLabel}</a>`)
    .join(' &middot; ');

  const cityLinks = regions.map(r => `<a href="/${r.slug}.html">${r.name}</a>`).join(' &middot; ');

  const regionNamesStr = regions.slice(0, 4).map(r => r.name).join(', ') + ' en omgeving';

  const jsonLdItemList = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": page.title,
    "description": page.metaDesc,
    "numberOfItems": locs.length,
    "itemListElement": locs.map((loc, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": loc.name,
      "description": loc.description || '',
      "url": `https://peuterplannen.nl${loc.pageUrl}`
    }))
  }, null, 2);

  const jsonLdFaq = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": page.faqItems.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${page.metaTitle}</title>
  <meta name="description" content="${page.metaDesc}">
  <link rel="canonical" href="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:title" content="${page.metaTitle}">
  <meta property="og:description" content="${page.metaDesc}">
  <meta property="og:url" content="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${TYPE_OG_IMAGE[page.dbType] || DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <script type="application/ld+json">
${jsonLdItemList}
  </script>
  <script type="application/ld+json">
${jsonLdFaq}
  </script>
</head>
<body>

${navHTML()}

<div class="hero">
  <h1>${page.h1.replace('Nederland', '<span>Nederland</span>')}</h1>
  <p>${locs.length} locaties in ${regionNamesStr}</p>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${page.title}
</nav>

<main id="main-content">
  <div class="intro-box">
    ${page.intro.split('\n\n').map(p => `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join('\n    ')}
  </div>

  ${sectionsHTML}

  <div class="faq-section">
    <h2>Veelgestelde vragen</h2>
    ${faqHTML}
  </div>

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>Filter op type, regio of faciliteiten — en laat de app de dichtstbijzijnde locaties tonen.</p>
    <a href="/app.html">Open PeuterPlannen</a>
  </div>

  ${supportHTML('category')}

  <div class="nav-links-box">
    <h3>Andere typen uitjes</h3>
    ${otherTypeLinks}
    <div class="divider">
      <h3 style="margin-bottom:10px;">Per stad</h3>
      ${cityLinks}
    </div>
  </div>
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;
}

function generateTypePages(data) {
  const { regions, locations } = data;

  for (const page of TYPE_PAGES) {
    const locs = locations.filter(l => l.type === page.dbType);
    const html = generateTypePage(page, locs, regions);
    const outPath = path.join(ROOT, `${page.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${page.slug}.html — ${locs.length} locaties, ${page.faqItems.length} FAQ-items`);
  }
}

// === 7. Generate location pages ===

// Helper: fix truncated toddler highlights (missing final punctuation)
function cleanToddlerHighlight(text) {
  if (!text) return '';
  text = text.trim();
  // If it already ends with proper punctuation, return as-is
  if (/[.!?]$/.test(text)) return text;
  // Try to truncate to last complete sentence
  const lastSentenceEnd = Math.max(text.lastIndexOf('. '), text.lastIndexOf('! '), text.lastIndexOf('? '));
  if (lastSentenceEnd > text.length * 0.5) {
    return text.slice(0, lastSentenceEnd + 1);
  }
  // Otherwise just add a period
  return text + '.';
}

// Helper: detect filler descriptions
function isFillerDescription(desc) {
  if (!desc || !desc.trim()) return true;
  if (/^Geverifieerde vestiging van .+\. Altijd een veilige keuze voor peuters\.?$/.test(desc.trim())) return true;
  return false;
}

const TYPE_SINGULAR = {
  play:    'speeltuin',
  farm:    'kinderboerderij',
  nature:  'natuurgebied',
  museum:  'museum',
  swim:    'zwem- of waterlocatie',
  pancake: 'pannenkoekenrestaurant',
  horeca:  'kindvriendelijk café of restaurant'
};

const TYPE_OG_IMAGE = {
  play:    'https://peuterplannen.nl/images/og/play.jpg',
  farm:    'https://peuterplannen.nl/images/og/farm.jpg',
  nature:  'https://peuterplannen.nl/images/og/nature.jpg',
  museum:  'https://peuterplannen.nl/images/og/museum.jpg',
  swim:    'https://peuterplannen.nl/images/og/swim.jpg',
  pancake: 'https://peuterplannen.nl/images/og/pancake.jpg',
  horeca:  'https://peuterplannen.nl/images/og/horeca.jpg',
};
const DEFAULT_OG = 'https://peuterplannen.nl/images/og/default.jpg';

const REGION_BLOG_MAP = {
  'amsterdam':            [
    { slug: 'gratis-peuteruitjes-amsterdam', title: '10 Gratis peuteruitjes in Amsterdam' },
    { slug: 'dagje-uit-met-dreumes',         title: 'Dagje uit met een dreumes: 8 tips' },
  ],
  'utrecht':              [
    { slug: 'kinderboerderijen-utrecht',     title: 'Beste kinderboerderijen in Utrecht' },
  ],
  'den-haag':             [
    { slug: 'den-haag-met-peuters',          title: 'Den Haag met peuters: de beste plekken' },
  ],
  'haarlem':              [
    { slug: 'haarlem-met-peuters',           title: 'Haarlem met peuters' },
  ],
  'utrechtse-heuvelrug':  [
    { slug: 'pannenkoeken-boerderijen-utrecht-heuvelrug', title: 'Pannenkoeken op de Heuvelrug' },
  ],
};

function truncateDesc(text, max = 155) {
  if (!text || text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return (cut > 80 ? text.slice(0, cut) : text.slice(0, max)) + '…';
}

function locationPageHTML(loc, region, similarLocs) {
  const fullUrl = `https://peuterplannen.nl${loc.pageUrl}`;
  const typeLabel = TYPE_MAP[loc.type]?.label || loc.type;
  const typeLabel_meta = TYPE_MAP[loc.type]?.label || loc.type;
  const regionDisplayName = region.subtitleLabel || region.name;
  const rawDesc = isFillerDescription(loc.description) ? '' : (loc.description || '');
  const metaDesc = truncateDesc(rawDesc)
    || `${loc.name} in ${region.name} is een ${TYPE_SINGULAR[loc.type] || 'uitje'} voor gezinnen met jonge kinderen. Bekijk faciliteiten en plan je route via PeuterPlannen.`;

  // Weather
  const weatherLabel = WEATHER_LABELS[loc.weather] || '';

  // Age range
  const ageLabel = (loc.min_age != null && loc.max_age != null)
    ? `${loc.min_age}–${loc.max_age} jaar`
    : '';

  // Facilities
  const facilities = [];
  if (loc.coffee) facilities.push('Koffie voor ouders');
  if (loc.diaper) facilities.push('Luierruimte');
  if (loc.alcohol) facilities.push('Alcohol beschikbaar');

  // Route URL
  const routeUrl = (loc.lat && loc.lng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
    : null;

  // Share
  const shareText = encodeURIComponent(`${loc.name} — Peuteruitje in ${loc.region}`);
  const shareUrl = encodeURIComponent(fullUrl);

  // Similar locations
  const similarHTML = similarLocs.length > 0
    ? `<div class="similar-locations">
    <h2>Vergelijkbare locaties in ${region.name}</h2>
    <div class="loc-list">
      ${similarLocs.map(s => {
        const sDesc = isFillerDescription(s.description) ? '' : (s.description || '');
        return `
      <article class="loc-item">
        <h3><a href="${s.pageUrl}">${escapeHtml(s.name)}</a></h3>
        ${sDesc ? `<p>${escapeHtml(sDesc.slice(0, 120))}${sDesc.length > 120 ? '...' : ''}</p>` : ''}
      </article>`;
      }).join('')}
    </div>
  </div>` : '';

  // Info items
  const infoItems = [];
  if (weatherLabel) infoItems.push(`<div class="info-item"><div><div class="info-label">Weer</div><div class="info-value">${weatherLabel}</div></div></div>`);
  if (ageLabel) infoItems.push(`<div class="info-item"><div><div class="info-label">Leeftijd</div><div class="info-value">${ageLabel}</div></div></div>`);
  facilities.forEach(f => infoItems.push(`<div class="info-item"><div><div class="info-label">Faciliteit</div><div class="info-value">${f}</div></div></div>`));
  if (loc.last_verified_at) {
    const d = new Date(loc.last_verified_at);
    const label = `Geverifieerd ${d.toLocaleString('nl-NL', { month: 'long', year: 'numeric' })}`;
    infoItems.push(`<div class="info-item verified-badge"><div><div class="info-label">Status</div><div class="info-value">✓ ${label}</div></div></div>`);
  }
  if (loc.website) infoItems.push(`<div class="info-item"><div><div class="info-label">Website</div><div class="info-value"><a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" aria-label="Website van ${escapeHtml(loc.name)}">${escapeHtml(loc.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></div></div></div>`);

  const regionSlug = (region.slug || '').toLowerCase();
  const relatedBlogs = (REGION_BLOG_MAP[regionSlug] || []);
  const blogLinksHTML = relatedBlogs.length > 0
    ? `<div class="related-blogs">
      <h3>Meer inspiratie</h3>
      <ul>${relatedBlogs.map(b =>
        `<li><a href="/blog/${b.slug}/">${b.title}</a></li>`
      ).join('')}</ul>
    </div>`
    : '';

  const appUrl = `/app.html?type=${encodeURIComponent(loc.type)}&regio=${encodeURIComponent(loc.region)}`;
  const typeLabel_explore = TYPE_MAP[loc.type]?.label || loc.type;
  const exploreCTAHTML = `
<div class="explore-cta">
  <a href="${appUrl}" class="btn-explore">
    Bekijk alle ${typeLabel_explore} in ${loc.region} →
  </a>
</div>`;

  // JSON-LD
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": loc.name,
    "description": metaDesc,
    "url": fullUrl,
    ...(loc.website && { "sameAs": loc.website }),
    ...(loc.lat && loc.lng && {
      "geo": { "@type": "GeoCoordinates", "latitude": loc.lat, "longitude": loc.lng }
    }),
    "address": { "@type": "PostalAddress", "addressLocality": region.name, "addressCountry": "NL" },
    ...(facilities.length > 0 && {
      "amenityFeature": facilities.map(f => ({ "@type": "LocationFeatureSpecification", "name": f, "value": true }))
    }),
    "audience": { "@type": "Audience", "audienceType": "Gezinnen met jonge kinderen (0-7 jaar)" },
    "touristType": "Gezinnen met peuters"
  }, null, 2);

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "PeuterPlannen", "item": "https://peuterplannen.nl/" },
      { "@type": "ListItem", "position": 2, "name": region.name, "item": `https://peuterplannen.nl/${region.slug}.html` },
      { "@type": "ListItem", "position": 3, "name": loc.name, "item": fullUrl }
    ]
  }, null, 2);

  // Map script (lazy loaded)
  const mapScript = (loc.lat && loc.lng) ? `
<script>
(function() {
  var loaded = false;
  var observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !loaded) {
      loaded = true;
      observer.disconnect();
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      s.onload = function() {
        var map = new maplibregl.Map({
          container: 'map',
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [${loc.lng}, ${loc.lat}],
          zoom: 14,
          attributionControl: false
        });
        new maplibregl.Marker({ color: '#D4775A' }).setLngLat([${loc.lng}, ${loc.lat}]).addTo(map);
      };
      document.head.appendChild(s);
    }
  }, { rootMargin: '200px' });
  observer.observe(document.getElementById('map-container'));
})();
</script>` : '';

  // Share native script
  const shareScript = `
<script>
if (navigator.share) { document.querySelector('.share-native').style.display = 'inline-flex'; }
function shareNative() {
  navigator.share({ title: ${JSON.stringify(loc.name + ' — PeuterPlannen')}, url: ${JSON.stringify(fullUrl)} }).catch(function(){});
}
</script>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon(`\n  <link rel="preconnect" href="https://basemaps.cartocdn.com" crossorigin>`)}
  <title>${escapeHtml(loc.name)} — Peuteruitje in ${region.name} | PeuterPlannen</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${fullUrl}">
  <meta property="og:title" content="${escapeHtml(loc.name)} — ${region.name} | PeuterPlannen">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${TYPE_OG_IMAGE[loc.type] || DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(loc.name)} | PeuterPlannen">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
  <script type="application/ld+json">
${jsonLd}
  </script>
  <script type="application/ld+json">
${breadcrumbLd}
  </script>
  <style>
    .explore-cta { margin: 28px 0; text-align: center; }
    .btn-explore { display: inline-block; padding: 12px 24px; background: var(--primary-light); color: var(--primary-dark); border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.2s; }
    .btn-explore:hover { background: var(--primary); color: white; }
    .related-blogs { margin: 24px 0; padding: 20px 24px; background: var(--bg-warm, #FAF7F2); border-radius: 12px; border-left: 4px solid var(--primary, #D4775A); }
    .related-blogs h3 { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: var(--primary-dark, #B35D42); }
    .related-blogs ul { list-style: none; padding: 0; margin: 0; }
    .related-blogs li { margin-bottom: 8px; }
    .related-blogs a { color: var(--primary-dark, #B35D42); text-decoration: none; font-weight: 500; }
    .related-blogs a:hover { text-decoration: underline; }
    .verified-badge .info-value { color: #2D8B5E; font-weight: 600; }
  </style>
</head>
<body>

${navHTML(`Zoek in ${region.name}`, `/app.html?regio=${encodeURIComponent(region.name)}`)}

<div class="hero" style="padding: 100px 24px 40px;">
  <p class="hero-location-title">${escapeHtml(loc.name)}</p>
  <p>${typeLabel} in ${regionDisplayName}</p>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/${region.slug}.html">${region.name}</a> &rsaquo; ${escapeHtml(loc.name)}
</nav>

<main id="main-content">
  <div class="location-header">
    <h1>${escapeHtml(loc.name)}</h1>
    <p class="location-subtitle">${typeLabel} in ${regionDisplayName}</p>
  </div>

  ${!isFillerDescription(loc.description) ? `<p class="location-description">${escapeHtml(loc.description)}</p>` : ''}

  ${loc.toddler_highlight ? `<div class="location-highlight"><strong>Peutertip:</strong> ${escapeHtml(cleanToddlerHighlight(loc.toddler_highlight))}</div>` : ''}

  ${infoItems.length > 0 ? `<div class="location-info">\n    ${infoItems.join('\n    ')}\n  </div>` : ''}

  ${exploreCTAHTML}

  <div class="location-actions">
    ${routeUrl ? `<a href="${routeUrl}" target="_blank" rel="noopener" class="btn-route">Route plannen</a>` : ''}
  </div>

  <div class="share-buttons">
    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" class="share-wa">Deel via WhatsApp</a>
    <button class="share-native" onclick="shareNative()">Delen</button>
  </div>

  ${(loc.lat && loc.lng) ? `<div class="location-map" id="map-container"><div id="map"></div></div>
  <p class="map-attribution">Kaart: &copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>` : ''}

  ${similarHTML}

  ${blogLinksHTML}

  ${supportHTML()}

  <div class="other-cities" style="margin-top: 32px;">
    <h3>Meer peuteruitjes in ${region.name}</h3>
    <a href="/${region.slug}.html">Bekijk alle ${region.name} locaties &rarr;</a>
  </div>

  ${TYPE_MAP[loc.type]?.slug ? `<div class="other-cities" style="margin-top: 16px;">
    <h3>Alle ${TYPE_MAP[loc.type].label} in Nederland</h3>
    <a href="/${TYPE_MAP[loc.type].slug}.html">Bekijk overzicht ${TYPE_MAP[loc.type].label} &rarr;</a>
  </div>` : ''}

  ${newsletterHTML()}
</main>

${footerHTML()}
${mapScript}
${shareScript}

${analyticsHTML()}
</body>
</html>`;
}

function generateLocationPages(data) {
  const { regions, locations } = data;
  const regionMap = {};
  regions.forEach(r => { regionMap[r.slug] = r; });

  let count = 0;
  const regionGroups = {};
  locations.forEach(loc => {
    if (!regionGroups[loc.regionSlug]) regionGroups[loc.regionSlug] = [];
    regionGroups[loc.regionSlug].push(loc);
  });

  const subtitleLabelMap = {};
  FALLBACK_REGIONS.forEach(r => { if (r.subtitleLabel) subtitleLabelMap[r.slug] = r.subtitleLabel; });

  for (const [rSlug, locs] of Object.entries(regionGroups)) {
    const regionBase = regionMap[rSlug] || { name: locs[0]?.region || rSlug, slug: rSlug, blurb: '' };
    const region = { ...regionBase, subtitleLabel: subtitleLabelMap[rSlug] };

    // Create region directory
    const regionDir = path.join(ROOT, rSlug);
    if (!fs.existsSync(regionDir)) fs.mkdirSync(regionDir, { recursive: true });

    for (const loc of locs) {
      // Find similar locations (same region, same type first, then others)
      const sameType = locs.filter(l => l !== loc && l.type === loc.type).slice(0, 3);
      const otherType = locs.filter(l => l !== loc && l.type !== loc.type).slice(0, 6 - sameType.length);
      const similar = [...sameType, ...otherType].slice(0, 6);

      const html = locationPageHTML(loc, region, similar);

      const locDir = path.join(regionDir, loc.locSlug);
      if (!fs.existsSync(locDir)) fs.mkdirSync(locDir, { recursive: true });

      fs.writeFileSync(path.join(locDir, 'index.html'), html);
      count++;
    }
  }

  console.log(`Generated ${count} location pages`);
  return count;
}

// === 8. Blog system ===

function buildBlog(data) {
  if (!matter || !marked) {
    console.log('  Skipped (install gray-matter & marked first)');
    return [];
  }

  const postsDir = path.join(ROOT, 'content', 'posts');
  if (!fs.existsSync(postsDir)) {
    console.log('  No content/posts/ directory found, skipping blog build');
    return [];
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('  No blog posts found');
    return [];
  }

  const blogDir = path.join(ROOT, 'blog');
  if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });

  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data: fm, content } = matter(raw);
    const slug = file.replace(/\.md$/, '');
    const htmlContent = marked(content);
    const dateStr = fm.date ? new Date(fm.date).toISOString().slice(0, 10) : todayISO();
    const dateDisplay = fm.date ? formatDateNL(new Date(fm.date)) : today();

    posts.push({
      slug,
      title: fm.title || slug,
      description: fm.description || '',
      date: dateStr,
      dateDisplay,
      tags: fm.tags || [],
      related_regions: fm.related_regions || [],
      featured_image: fm.featured_image || '',
      content: htmlContent,
    });

    // Generate individual post page
    const postDir = path.join(blogDir, slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

    let processedContent = htmlContent;

    const postHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(fm.title)} | PeuterPlannen Blog</title>
  <meta name="description" content="${escapeHtml(fm.description || '')}">
  <link rel="canonical" href="https://peuterplannen.nl/blog/${slug}/">
  <meta property="og:title" content="${escapeHtml(fm.title)} | PeuterPlannen">
  <meta property="og:description" content="${escapeHtml(fm.description || '')}">
  <meta property="og:url" content="https://peuterplannen.nl/blog/${slug}/">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/${fm.featured_image ? fm.featured_image.replace(/^\//, '') : 'homepage_hero_ai.jpeg'}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fm.title)}">
  <meta name="twitter:description" content="${escapeHtml(fm.description || '')}">
  <meta name="twitter:image" content="https://peuterplannen.nl/${fm.featured_image ? fm.featured_image.replace(/^\//, '') : 'homepage_hero_ai.jpeg'}">
  <script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": fm.title,
  "description": fm.description || '',
  "datePublished": dateStr,
  "author": { "@type": "Person", "name": "Bas Metten" },
  "publisher": { "@type": "Organization", "name": "PeuterPlannen" },
  "url": `https://peuterplannen.nl/blog/${slug}/`,
  "mainEntityOfPage": `https://peuterplannen.nl/blog/${slug}/`
}, null, 2)}
  </script>
</head>
<body>

${navHTML()}

${fm.featured_image ? `<div class="blog-hero-img" style="max-width:1100px;margin:80px auto 0;padding:0 24px;"><picture><source type="image/webp" srcset="${fm.featured_image.replace(/\.jpe?g$/, '.webp')}"><img src="${fm.featured_image}" alt="${escapeHtml(fm.title)}" style="width:100%;height:auto;border-radius:16px;max-height:400px;object-fit:cover;" loading="eager"></picture></div>` : ''}
<div class="hero" style="padding: ${fm.featured_image ? '24px' : '100px'} 24px 40px;">
  <h1>${escapeHtml(fm.title)}</h1>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/blog/">Blog</a> &rsaquo; ${escapeHtml(fm.title)}
</nav>

<main id="main-content">
  <p class="blog-meta">${dateDisplay}${fm.tags?.length ? ' &middot; ' + fm.tags.join(', ') : ''}</p>

  <div class="blog-content">
    ${processedContent}
  </div>

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Op zoek naar meer uitjes?</h3>
    <p>Ontdek ${data.total}+ uitjes op PeuterPlannen.</p>
    <a href="/app.html">Open de app</a>
  </div>

  ${supportHTML()}
</main>

${footerHTML()}

${analyticsHTML()}
</body>
</html>`;

    fs.writeFileSync(path.join(postDir, 'index.html'), postHTML);
    console.log(`  blog/${slug}/index.html`);
  }

  // Sort posts by date descending
  posts.sort((a, b) => b.date.localeCompare(a.date));

  // Generate blog index
  const postCards = posts.map(p => `
    <article class="blog-card">
      ${p.featured_image ? `<a href="/blog/${p.slug}/"><picture><source type="image/webp" srcset="${p.featured_image.replace(/\.jpe?g$/, '-400w.webp')} 400w, ${p.featured_image.replace(/\.jpe?g$/, '.webp')}" sizes="(max-width: 768px) 100vw, 400px"><img src="${p.featured_image}" alt="${escapeHtml(p.title)}" class="blog-card-thumb" loading="lazy"></picture></a>` : ''}
      <h2><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
      <p class="blog-date">${p.dateDisplay}</p>
      <p class="blog-excerpt">${escapeHtml(p.description)}</p>
      ${p.tags.length > 0 ? `<div class="blog-tags">${p.tags.map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </article>`).join('\n');

  const indexHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>Blog — Tips voor uitjes met peuters | PeuterPlannen</title>
  <meta name="description" content="Tips, inspiratie en praktische gidsen voor leuke uitjes met peuters en kleuters in Nederland.">
  <link rel="canonical" href="https://peuterplannen.nl/blog/">
  <link rel="alternate" type="application/rss+xml" title="PeuterPlannen Blog" href="https://peuterplannen.nl/blog/feed.xml">
  <meta property="og:title" content="PeuterPlannen Blog">
  <meta property="og:description" content="Tips en inspiratie voor uitjes met peuters">
  <meta property="og:url" content="https://peuterplannen.nl/blog/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
</head>
<body>

${navHTML()}

<div class="hero">
  <h1>Blog</h1>
  <p>Tips, inspiratie en praktische gidsen voor uitjes met peuters</p>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; Blog
</nav>

<main id="main-content">
  <div class="blog-grid">
    ${postCards}
  </div>

  ${newsletterHTML()}
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;

  fs.writeFileSync(path.join(blogDir, 'index.html'), indexHTML);
  console.log(`  blog/index.html (${posts.length} posts)`);

  // Generate RSS feed
  const rssItems = posts.map(p => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>https://peuterplannen.nl/blog/${p.slug}/</link>
      <description>${escapeHtml(p.description)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <guid>https://peuterplannen.nl/blog/${p.slug}/</guid>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PeuterPlannen Blog</title>
    <link>https://peuterplannen.nl/blog/</link>
    <description>Tips en inspiratie voor uitjes met peuters in Nederland</description>
    <language>nl</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://peuterplannen.nl/blog/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(blogDir, 'feed.xml'), rss);
  console.log(`  blog/feed.xml`);

  return posts;
}

function formatDateNL(date) {
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// === 9. Generate sitemap.xml ===

function generateSitemap(data, blogPosts) {
  const { regions, locations } = data;
  const lastmod = todayISO();

  const staticPages = [
    { loc: 'https://peuterplannen.nl/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://peuterplannen.nl/app.html', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://peuterplannen.nl/about.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://peuterplannen.nl/contact.html', priority: '0.4', changefreq: 'monthly' },
    { loc: 'https://peuterplannen.nl/blog/', priority: '0.7', changefreq: 'weekly' },
    { loc: 'https://peuterplannen.nl/privacy/', priority: '0.3', changefreq: 'yearly' },
    { loc: 'https://peuterplannen.nl/disclaimer/', priority: '0.3', changefreq: 'yearly' },
  ];

  const cityPages = regions.map(r => ({
    loc: `https://peuterplannen.nl/${r.slug}.html`,
    priority: r.tier === 'primary' ? '0.85' : '0.75',
    changefreq: 'weekly',
  }));

  const typePages = TYPE_PAGES.map(p => ({
    loc: `https://peuterplannen.nl/${p.slug}.html`,
    priority: '0.80',
    changefreq: 'weekly',
  }));

  // Location pages
  const locationPages = locations.map(loc => ({
    loc: `https://peuterplannen.nl${loc.pageUrl}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: loc.last_verified_at || lastmod,
  }));

  // Blog posts
  const blogPages = (blogPosts || []).map(p => ({
    loc: `https://peuterplannen.nl/blog/${p.slug}/`,
    priority: '0.65',
    changefreq: 'monthly',
    lastmod: p.date,
  }));

  const allPages = [...staticPages, ...cityPages, ...typePages, ...locationPages, ...blogPages];

  const urls = allPages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod || lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>
`;

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log(`Updated sitemap.xml (${allPages.length} URLs)`);
}

// === Main ===

async function main() {
  console.log('=== PeuterPlannen sync_all.js ===\n');

  const data = await fetchData();
  LOCATION_COUNT = data.locations.length;

  console.log('Computing slugs...');
  computeSlugs(data);

  console.log('\nUpdating static pages...');
  updateIndex(data);
  updateApp(data);
  updateAbout(data);
  updateManifest(data);

  console.log('\nGenerating city pages...');
  generateCityPages(data);

  console.log('\nGenerating type pages...');
  generateTypePages(data);

  console.log('\nGenerating location pages...');
  generateLocationPages(data);

  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nGenerating sitemap...');
  generateSitemap(data, blogPosts);

  // CSS minification
  console.log('\nMinifying CSS...');
  try {
    const CleanCSS = require('clean-css');
    const cssSource = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    const minified = new CleanCSS({ level: 2 }).minify(cssSource);
    if (minified.errors.length > 0) {
      console.error('  CSS minification errors:', minified.errors);
    } else {
      fs.writeFileSync(path.join(ROOT, 'style.min.css'), minified.styles);
      const savings = ((1 - minified.styles.length / cssSource.length) * 100).toFixed(1);
      console.log(`  style.css (${cssSource.length}B) → style.min.css (${minified.styles.length}B) — ${savings}% smaller`);
    }
  } catch (e) {
    console.log('  Skipped CSS minification (install clean-css first). Copying style.css as fallback.');
    const cssPath = path.join(ROOT, 'style.css');
    if (fs.existsSync(cssPath)) {
      fs.copyFileSync(cssPath, path.join(ROOT, 'style.min.css'));
    }
  }

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
