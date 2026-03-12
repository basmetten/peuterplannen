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
const CRITICAL_EDITORIAL_GUIDE_CSS = `
  .guide-section{display:grid;gap:18px;margin:36px 0}
  .guide-card{padding:24px 22px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,248,242,.94));border:1px solid rgba(212,119,90,.12);box-shadow:0 16px 36px rgba(45,41,38,.08)}
  .guide-card-compact{padding:20px 18px}
  .guide-kicker{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8d6f64}
  .guide-card h2,.guide-card h3{margin:0 0 12px;color:#2d2926;line-height:.98;letter-spacing:-.04em}
  .guide-card h2{font-size:clamp(28px,5vw,40px)}
  .guide-card h3{font-size:clamp(22px,4.2vw,28px)}
  .guide-card p,.guide-card li{color:#5f5149;font-size:16px;line-height:1.72}
  .guide-card-intro{max-width:58ch}
  .guide-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .guide-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;font-size:12px;font-weight:700;color:#9e5e4b;background:rgba(212,119,90,.08);border:1px solid rgba(212,119,90,.12)}
  .guide-links{display:grid;gap:12px;margin-top:16px}
  .guide-link{display:grid;gap:4px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.78);border:1px solid rgba(45,41,38,.08);text-decoration:none;color:#2d2926;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
  .guide-link:visited{color:#2d2926}
  .guide-link strong{font-size:15px;line-height:1.3}
  .guide-link span{font-size:13px;line-height:1.5;color:#7c6e66}
  .guide-link:hover{transform:translateY(-1px);border-color:rgba(212,119,90,.25);box-shadow:0 10px 20px rgba(45,41,38,.08)}
  .editorial-meta{max-width:840px;margin:0 auto 18px;display:flex;flex-wrap:wrap;gap:10px;color:#7c6e66;font-size:13px}
  .editorial-meta span,.editorial-meta a{display:inline-flex;align-items:center;min-height:34px;padding:7px 12px;border-radius:999px;background:rgba(212,119,90,.08);border:1px solid rgba(212,119,90,.12)}
  .editorial-meta a,.editorial-meta a:visited{color:#9e5e4b;font-weight:700;text-decoration:none}
  .editorial-body{max-width:840px;margin:0 auto 32px;padding:28px 24px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,248,242,.95));border:1px solid rgba(212,119,90,.12);box-shadow:0 16px 36px rgba(45,41,38,.08)}
  .editorial-body h2,.editorial-body h3{margin:0 0 14px;color:#2d2926;line-height:.98;letter-spacing:-.05em}
  .editorial-body h2{font-size:clamp(28px,5vw,38px)}
  .editorial-body h3{font-size:clamp(22px,4vw,28px);margin-top:28px}
  .editorial-body p,.editorial-body li{font-size:17px;line-height:1.82;color:#5f5149}
  .editorial-body a{color:#9e5e4b;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(212,119,90,.32)}
  .editorial-support{max-width:840px;margin:-8px auto 0;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:16px}
  .editorial-support-card{background:rgba(255,255,255,.92);border:1px solid rgba(212,119,90,.12);border-radius:18px;padding:18px 20px;box-shadow:0 12px 26px rgba(45,41,38,.06)}
  .editorial-support-card h3{margin:0 0 8px;font-size:18px;line-height:1.05;color:#2d2926}
  .editorial-support-card p{font-size:14px;line-height:1.72;color:#5f5149}
  .editorial-support-links{display:grid;gap:10px;margin-top:14px}
  .editorial-support-links a{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(250,247,242,.92);border:1px solid rgba(45,41,38,.08);text-decoration:none;color:#2d2926}
  .editorial-support-links a:visited{color:#2d2926}
  .editorial-support-links a strong{font-size:14px}
  .editorial-support-links a span{font-size:12px;line-height:1.5;color:#7c6e66}
  @media (max-width:768px){.guide-section,.editorial-support{grid-template-columns:1fr}.guide-card,.editorial-body{padding:22px 18px}.guide-link,.editorial-support-links a{padding:13px 14px}.editorial-body p,.editorial-body li{font-size:16px;line-height:1.72}.editorial-meta{gap:8px}}
`;
const SEO_CONTENT_DIR = path.join(ROOT, 'content', 'seo');
const ASSET_VERSION = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);

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
    metaDesc: 'Speeltuinen en speelparadijzen voor peuters in 18 regio\'s door heel Nederland. Indoor en outdoor, gecheckt en actueel.',
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
    metaDesc: 'De leukste kinderboerderijen en stadsboerderijen voor peuters in 18 regio\'s door heel Nederland. Gratis, met dieren aaien en speeltuinen.',
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
    metaDesc: 'Welke musea zijn echt leuk voor peuters? 60+ kindvriendelijke musea in 18 regio\'s door heel Nederland. Met leeftijdsadvies.',
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
    metaDesc: 'Pannenkoekenrestaurants voor gezinnen met jonge kinderen in 18 regio\'s door heel Nederland. Met info over kindvriendelijkheid, terras en luierruimte.',
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
    metaDesc: 'Stadsparken, duinen, bossen en natuurspeelplaatsen voor peuters in 18 regio\'s door heel Nederland. Gratis en betaald, altijd buiten.',
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
    metaDesc: 'Kindvriendelijke restaurants en cafes in 18 regio\'s door heel Nederland. Met speelhoek, kindermenu, terras en luierruimte. Gecheckt op kindvriendelijkheid.',
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

const CLUSTER_PAGES = [
  {
    slug: 'regenachtige-dag-met-peuter',
    title: 'Regenachtige dag met peuter: rustige binnenopties die echt werken',
    metaTitle: 'Regenachtige dag met peuter: slimme binnenopties | PeuterPlannen',
    metaDesc: 'Binnenopties voor regenachtige dagen met peuters: musea, speelplekken, horeca met speelhoek en andere locaties die ook bij slecht weer werken.',
    h1: 'Regenachtige dag met peuter',
    intro: 'Niet elk regenuitje hoeft een druk speelparadijs te zijn. Op deze pagina bundelen we binnenlocaties die praktisch zijn met jonge kinderen: overzichtelijk, met tempo dat bij een peuter past en liefst met koffie, wc en een plan B in de buurt.',
    kicker: 'Slecht weer',
  },
  {
    slug: 'binnenlocaties-peuters',
    title: 'Binnenlocaties voor peuters in Nederland',
    metaTitle: 'Binnenlocaties voor peuters in Nederland | PeuterPlannen',
    metaDesc: 'Overdekte locaties voor peuters en dreumesen in Nederland. Handig voor regen, kou of een snelle indoor-back-up dicht bij huis.',
    h1: 'Binnenlocaties voor peuters',
    intro: 'Binnenlocaties zijn niet alleen een regenback-up. Ze werken ook voor korte middagen, koude dagen en gezinnen die vooral overzicht zoeken. Deze selectie bundelt plekken waar jonge kinderen kunnen bewegen, ontdekken of even landen zonder dat de dag meteen chaotisch voelt.',
    kicker: 'Indoor',
  },
  {
    slug: 'horeca-met-speelhoek',
    title: 'Kindvriendelijke horeca met speelhoek',
    metaTitle: 'Kindvriendelijke horeca met speelhoek | PeuterPlannen',
    metaDesc: 'Restaurants, cafés en pannenkoekenplekken waar jonge kinderen kunnen spelen terwijl ouders iets drinken of eten. Gericht geselecteerd voor gezinnen met peuters.',
    h1: 'Horeca met speelhoek',
    intro: 'Dit zijn de plekken waar eten en spelen logisch samengaan. Niet omdat er ergens achterin één speelgoedbak staat, maar omdat de locatie ook echt werkt als gezinsstop: ruimte, tempo, kindvriendelijke voorzieningen en liefst iets waardoor je koffie warm blijft.',
    kicker: 'Eten & spelen',
  },
  {
    slug: 'koffie-en-spelen',
    title: 'Koffie en spelen: peuterplekken waar ouders óók iets aan hebben',
    metaTitle: 'Koffie en spelen: plekken voor ouders met peuters | PeuterPlannen',
    metaDesc: 'Uitjes waar jonge kinderen kunnen spelen en ouders even kunnen landen. Met koffie, ruimte, verschonen en vaak een logische combinatie van buiten, horeca of dieren.',
    h1: 'Koffie en spelen',
    intro: 'Sommige uitjes zijn vooral fijn omdat ze voor twee ritmes tegelijk werken: jonge kinderen kunnen bewegen, ouders kunnen even zitten. Op deze pagina vind je plekken waar koffie, speelruimte en praktische rust samenkomen.',
    kicker: 'Rust voor beide kanten',
  },
  {
    slug: 'dreumes-uitjes',
    title: 'Dreumes-uitjes: plekken die ook werken voor 0-2 jaar',
    metaTitle: 'Dreumes-uitjes voor 0-2 jaar | PeuterPlannen',
    metaDesc: 'Uitjes die ook werken voor de jongste kinderen: rustig, overzichtelijk en praktisch voor 0-2 jaar. Met verschonen, tempo en veilige eerste ontdekplekken.',
    h1: 'Dreumes-uitjes',
    intro: 'Voor 0-2 jaar zoek je geen “dagje uit” zoals voor een kleuter. Je zoekt tempo, overzicht en plekken waar een korte spanningsboog geen probleem is. Deze selectie focust daarom op zachte landing, verschonen, buggy-logica en korte loopafstanden.',
    kicker: '0-2 jaar',
  },
  {
    slug: 'peuteruitjes-2-5-jaar',
    title: 'Peuteruitjes voor 2-5 jaar: plekken met genoeg te doen',
    metaTitle: 'Peuteruitjes voor 2-5 jaar | PeuterPlannen',
    metaDesc: 'Uitjes voor kinderen van ongeveer 2 tot 5 jaar: meer actie, meer ontdekken en nog steeds praktisch voor ouders. Van natuur en speeltuinen tot horeca en musea.',
    h1: 'Peuteruitjes voor 2-5 jaar',
    intro: 'Vanaf ongeveer twee jaar kun je al iets meer opbouwen in een dag: een speeltuin, een museumhoek, dieren kijken of lunchen onderweg. Deze pagina verzamelt uitjes die inhoudelijk net iets meer bieden, zonder dat je meteen richting basisschooltempo hoeft te gaan.',
    kicker: '2-5 jaar',
  },
];

const SEO_INDEX_THRESHOLD = 8;
const SEO_MAX_CLUSTER_LOCATIONS = 42;
const SEO_DESCRIPTION_MIN_LENGTH = 90;
const GENERIC_DESCRIPTION_PATTERNS = [
  /^Tips, inspiratie en praktische gidsen/i,
  /^Ontdek de beste uitjes/i,
  /^PeuterPlannen helpt ouders/i,
  /^De beste uitjes voor peuters/i,
];
const AI_SLOP_PATTERNS = [
  /\bcomplete gids\b/gi,
  /\bkindvriendelijke hotspot\b/gi,
  /\bperfect voor\b/gi,
  /\bideaal voor gezinnen\b/gi,
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

function isoDateInTimeZone(date, timeZone = 'Europe/Amsterdam') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function todayISOAmsterdam() {
  return isoDateInTimeZone(new Date(), 'Europe/Amsterdam');
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

function cleanPathLike(value) {
  if (!value) return '/';
  let pathname = '/';
  try {
    const url = new URL(value, 'https://peuterplannen.nl');
    pathname = url.pathname || '/';
  } catch (_) {
    pathname = value.split('?')[0].split('#')[0] || '/';
  }

  if (pathname === '/app') return '/app.html';
  if (pathname === '/blog') return '/blog/';
  if (pathname === '/index.html') return '/';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (!path.extname(pathname) && !pathname.endsWith('/')) pathname += '/';
  return pathname;
}

function fullSiteUrl(pathname) {
  const clean = cleanPathLike(pathname);
  return `https://peuterplannen.nl${clean === '/' ? '/' : clean}`;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadGscSignals() {
  const auditPath = path.join(ROOT, 'output', 'gsc-audit.json');
  const payload = readJsonIfExists(auditPath);
  const pathSignals = new Map();
  if (!payload || typeof payload !== 'object') {
    return { pathSignals, source: 'none' };
  }

  const legacyRows = Array.isArray(payload.page_rows) ? payload.page_rows.map((row) => ({
    page: row?.keys?.[0],
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0,
  })) : [];

  const richRows = Array.isArray(payload.top_pages) ? payload.top_pages : [];
  const rows = richRows.length > 0 ? richRows : legacyRows;

  for (const row of rows) {
    const raw = row.page || row.url || row.path;
    if (!raw) continue;
    const cleanPath = cleanPathLike(raw);
    pathSignals.set(cleanPath, {
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    });
  }

  return { pathSignals, source: richRows.length > 0 ? 'telemetry' : 'legacy-audit' };
}

function fallbackMarkdownToHtml(markdown) {
  return (markdown || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^##\s+/.test(block)) return `<h2>${escapeHtml(block.replace(/^##\s+/, ''))}</h2>`;
      if (/^###\s+/.test(block)) return `<h3>${escapeHtml(block.replace(/^###\s+/, ''))}</h3>`;
      if (/^- /m.test(block)) {
        const items = block.split('\n').map((line) => line.replace(/^- /, '').trim()).filter(Boolean);
        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      }
      return `<p>${escapeHtml(block).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

function parseMarkdownDoc(raw, filePath) {
  if (matter) {
    const parsed = matter(raw);
    return { data: parsed.data || {}, content: parsed.content || '' };
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  // Fallback parser is intentionally simple; real builds use gray-matter.
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    data[key] = value;
  }
  return { data, content: match[2] };
}

function renderMarkdownDoc(markdown) {
  if (!markdown) return '';
  if (marked) {
    const rendered = marked.parse ? marked.parse(markdown) : marked(markdown);
    return typeof rendered === 'string' ? rendered : `${rendered || ''}`;
  }
  return fallbackMarkdownToHtml(markdown);
}

function readSeoDoc(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = parseMarkdownDoc(raw, filePath);
  return {
    filePath,
    slug: path.basename(filePath, path.extname(filePath)),
    ...frontmatter,
    bodyMarkdown: (content || '').trim(),
    bodyHtml: renderMarkdownDoc((content || '').trim()),
  };
}

function loadSeoDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return {};
  const entries = {};
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const doc = readSeoDoc(path.join(dirPath, entry.name));
    if (doc) entries[doc.slug] = doc;
  }
  return entries;
}

function loadSeoLocationDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return {};
  const out = {};
  for (const regionEntry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!regionEntry.isDirectory()) continue;
    out[regionEntry.name] = loadSeoDirectory(path.join(dirPath, regionEntry.name));
  }
  return out;
}

let BLOG_METADATA_CACHE = null;
function loadBlogMetadata() {
  if (BLOG_METADATA_CACHE) return BLOG_METADATA_CACHE;
  const postsDir = path.join(ROOT, 'content', 'posts');
  const metadata = new Map();
  if (!fs.existsSync(postsDir)) {
    BLOG_METADATA_CACHE = metadata;
    return metadata;
  }

  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parsed = parseMarkdownDoc(raw, file);
    const publishedAt = parsed.data?.date ? isoDateInTimeZone(new Date(parsed.data.date), 'Europe/Amsterdam') : todayISOAmsterdam();
    metadata.set(slug, {
      slug,
      title: parsed.data?.title || slug,
      description: parsed.data?.description || '',
      date: publishedAt,
      published: publishedAt <= todayISOAmsterdam(),
    });
  }

  BLOG_METADATA_CACHE = metadata;
  return metadata;
}

function getBlogEntriesBySlug(slugs = []) {
  const metadata = loadBlogMetadata();
  return (slugs || [])
    .map((slug) => metadata.get(slug))
    .filter((entry) => entry && entry.published);
}

function loadSeoContentLibrary() {
  const shared = loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'shared'));
  return {
    shared,
    regions: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'regions')),
    types: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'types')),
    clusters: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'clusters')),
    locations: loadSeoLocationDirectory(path.join(SEO_CONTENT_DIR, 'locations')),
  };
}

function normalizeEditorialPageRecord(entry) {
  if (!entry) return null;
  const bodyMarkdown = `${entry.body_md || ''}`.trim();
  const heroBody = `${entry.hero_body_md || ''}`.trim();
  return {
    ...entry,
    slug: entry.slug,
    title: entry.title || entry.meta_title || entry.slug || '',
    meta_title: entry.meta_title || '',
    meta_description: entry.meta_description || '',
    hero_title: entry.title || entry.meta_title || entry.slug || '',
    hero_sub: heroBody || entry.meta_description || '',
    bodyMarkdown,
    bodyHtml: renderMarkdownDoc(bodyMarkdown),
    related_blog_slugs: Array.isArray(entry.related_blog_slugs) ? entry.related_blog_slugs : [],
    curated_location_ids: Array.isArray(entry.curated_location_ids) ? entry.curated_location_ids : [],
    editorial_label: entry.editorial_label || 'PeuterPlannen redactie',
  };
}

function mergeSeoContentLibrary(seedContent, editorialPages = []) {
  const merged = {
    shared: { ...(seedContent?.shared || {}) },
    regions: { ...(seedContent?.regions || {}) },
    types: { ...(seedContent?.types || {}) },
    clusters: { ...(seedContent?.clusters || {}) },
    locations: { ...(seedContent?.locations || {}) },
  };

  for (const page of editorialPages) {
    if (!page || page.status !== 'published') continue;
    const entry = normalizeEditorialPageRecord(page);
    if (!entry) continue;

    if (page.page_type === 'discover_hub') {
      merged.shared.ontdekken = entry;
      continue;
    }

    if (page.page_type === 'methodology_page') {
      merged.shared.methodologie = entry;
      continue;
    }

    if (page.page_type === 'region_hub') {
      const key = page.region_slug || page.slug;
      if (key) merged.regions[key] = entry;
      continue;
    }

    if (page.page_type === 'type_hub') {
      const key = page.type_slug || page.slug;
      if (key) merged.types[key] = entry;
      continue;
    }

    if (page.page_type === 'cluster_hub') {
      const key = page.cluster_slug || page.slug;
      if (key) merged.clusters[key] = entry;
    }
  }

  return merged;
}

function formatEditorialDate(value) {
  const d = parseDateSafe(value);
  if (!d) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function editorialMetaHTML(entry) {
  if (!entry) return '';
  const label = entry.editorial_label || 'PeuterPlannen redactie';
  const updated = formatEditorialDate(entry.updated_at);
  const bits = [`<span>${escapeHtml(label)}</span>`];
  if (updated) bits.push(`<span>Laatst bijgewerkt ${escapeHtml(updated)}</span>`);
  bits.push('<a href="/methode/">Hoe we selecteren</a>');
  return `<div class="editorial-meta">${bits.join('')}</div>`;
}

function editorialBodyHTML(entry, extraClass = '') {
  if (!entry?.bodyHtml) return '';
  const className = ['editorial-body', extraClass].filter(Boolean).join(' ');
  return `<div class="${className}">${entry.bodyHtml}</div>`;
}

function relatedBlogLinksHTML(slugs = [], heading = 'Meer inspiratie') {
  const entries = getBlogEntriesBySlug(slugs);
  if (!entries.length) return '';
  return `<div class="related-blogs">
      <h3>${escapeHtml(heading)}</h3>
      <ul>${entries.map((entry) => `<li><a href="/blog/${entry.slug}/">${escapeHtml(entry.title)}</a></li>`).join('')}</ul>
    </div>`;
}

function applyRepoSeoOverrides(data) {
  const content = data.seoContent || {};
  const locationEditorialById = new Map(
    (data.editorialPages || [])
      .filter((page) => page?.status === 'published' && page.page_type === 'location_detail_override' && page.location_id)
      .map((page) => [Number(page.location_id), normalizeEditorialPageRecord(page)])
  );

  for (const loc of data.locations) {
    const regionOverrides = content.locations?.[loc.regionSlug];
    const override = regionOverrides?.[loc.locSlug];
    if (!override) continue;
    if (override.title_override) loc.seo_title_override = override.title_override;
    if (override.description_override) loc.seo_description_override = override.description_override;
    if (override.intro_override) loc.seo_intro_override = override.intro_override;
    if (override.bodyHtml) loc.seo_repo_body_html = override.bodyHtml;
    if (override.bodyMarkdown) loc.seo_repo_body_markdown = override.bodyMarkdown;
    if (override.updated_at) loc.seo_repo_updated_at = override.updated_at;
    if (Array.isArray(override.related_blog_slugs)) loc.seo_related_blog_slugs = override.related_blog_slugs;
  }

  for (const loc of data.locations) {
    const override = locationEditorialById.get(Number(loc.id));
    if (!override) continue;
    if (override.meta_title || override.title) loc.seo_title_override = override.meta_title || override.title;
    if (override.meta_description) loc.seo_description_override = override.meta_description;
    if (override.hero_sub) loc.seo_intro_override = override.hero_sub;
    if (override.bodyHtml) loc.seo_repo_body_html = override.bodyHtml;
    if (override.bodyMarkdown) loc.seo_repo_body_markdown = override.bodyMarkdown;
    if (override.updated_at) loc.seo_repo_updated_at = override.updated_at;
    if (Array.isArray(override.related_blog_slugs) && override.related_blog_slugs.length) {
      loc.seo_related_blog_slugs = override.related_blog_slugs;
    }
  }
}

function normalizeManualSeoTier(rawTier) {
  const tier = `${rawTier || ''}`.trim().toLowerCase();
  if (!tier || tier === 'standard') return 'auto';
  if (tier === 'priority') return 'index';
  if (tier === 'supporting') return 'support';
  if (['auto', 'index', 'support', 'alias'].includes(tier)) return tier;
  return 'auto';
}

function parseDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(value) {
  const d = parseDateSafe(value);
  if (!d) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function seoTextSignals(loc) {
  const combined = [
    loc.description || '',
    loc.toddler_highlight || '',
    loc.seo_intro_override || '',
  ].join(' ').toLowerCase();
  return {
    combined,
    playHint: /(speelhoek|speeltuin|speelruimte|spelen|klimmen|zandbak|glijbaan)/.test(combined),
    indoorHint: /(binnen|overdekt|indoor|regen|slecht weer)/.test(combined),
    calmHint: /(rustig|overzichtelijk|klein|zacht|veilig)/.test(combined),
  };
}

function normalizeExternalUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeExternalHost(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return '';
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function locationGeoFingerprint(loc) {
  if (loc.lat == null || loc.lng == null) return '';
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function duplicateGroupKey(loc) {
  const locality = slugify(loc.seo_primary_locality || '');
  const host = normalizeExternalHost(loc.website);
  const geo = locationGeoFingerprint(loc);
  const fingerprint = host || locality || geo || `id-${loc.id}`;
  return `${loc.regionSlug}::${slugify(loc.name || '')}::${fingerprint}`;
}

function selectHubLocations(locs, fallbackLimit = 24) {
  const ranked = sortLocationsForSeo(locs.filter((loc) => loc.seoTierResolved !== 'alias'));
  const indexable = ranked.filter((loc) => loc.seoTierResolved === 'index');
  if (indexable.length > 0) return indexable;
  return ranked.slice(0, Math.min(fallbackLimit, ranked.length));
}

function displayExternalUrl(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return '';
  return normalized.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
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

async function fetchAllJSON(endpoint, query = '', pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const pageQuery = `${query}${query ? '&' : ''}limit=${pageSize}&offset=${offset}`;
    const page = await fetchJSON(endpoint, pageQuery);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  return rows;
}

// === Reusable HTML Snippets ===

const NAV_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" class="nav-logo-svg" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#D4775A"/><path d="M20 6c-5.5 0-10 4.5-10 10 0 7 10 20 10 20s10-13 10-20c0-5.5-4.5-10-10-10z" fill="white"/><circle cx="20" cy="16" r="4" fill="#D4775A"/></svg>';

function navHTML(ctaText = 'Open App', ctaHref = '/app.html') {
  return `<a href="#main-content" class="skip-link">Naar hoofdinhoud</a>
<nav aria-label="Hoofdnavigatie" class="floating-nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      ${NAV_LOGO_SVG}
      <span class="logo-text"><span class="logo-top">Peuter</span><span class="logo-bottom">Plannen</span></span>
    </a>
    <div class="nav-links">
      <a href="/" class="nav-link">Home</a>
      <a href="/ontdekken/" class="nav-link">Ontdekken</a>
      <a href="/about.html" class="nav-link">Over</a>
      <a href="/blog/" class="nav-link">Inspiratie</a>
      <a href="/contact.html" class="nav-link">Contact</a>
      <a href="${ctaHref}" class="nav-cta">${ctaText}</a>
    </div>
    <button class="nav-burger" aria-label="Menu openen" aria-expanded="false" aria-controls="nav-mobile-menu">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>
  <div class="nav-mobile" id="nav-mobile-menu" aria-hidden="true">
    <a href="/" class="nav-mobile-link">Home</a>
    <a href="/ontdekken/" class="nav-mobile-link">Ontdekken</a>
    <a href="/about.html" class="nav-mobile-link">Over</a>
    <a href="/blog/" class="nav-mobile-link">Inspiratie</a>
    <a href="/contact.html" class="nav-mobile-link">Contact</a>
    <a href="${ctaHref}" class="nav-mobile-link nav-mobile-cta nav-cta">${ctaText}</a>
  </div>
</nav>`;
}

function footerHTML() {
  return `<footer>
  <nav aria-label="Footernavigatie">
  <p>&copy; 2026 PeuterPlannen &middot; <a href="/">Home</a> &middot; <a href="/ontdekken/">Ontdekken</a> &middot; <a href="/app.html">App</a> &middot; <a href="/blog/">Inspiratie</a> &middot; <a href="/methode/">Methode</a> &middot; <a href="/contact.html">Contact</a> &middot; <a href="/about.html">Over</a> &middot; <a href="${TIKKIE_URL}" target="_blank" rel="noopener">Steun ons</a> &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/disclaimer/">Disclaimer</a></p>
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
(function(){var o=new IntersectionObserver(function(e){e.forEach(function(i){if(i.isIntersecting){i.target.classList.add('visible');o.unobserve(i.target);}});},{threshold:0,rootMargin:'0px 0px 300px 0px'});document.querySelectorAll('.loc-item,.type-section,.region-section,.blog-card,.cta-block,.support-section,.faq-section').forEach(function(el,i){el.classList.add('reveal');el.style.animationDelay=Math.min(i*0.04,0.24)+'s';o.observe(el);});})();
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
  const styleHref = `/style.min.css?v=${ASSET_VERSION}`;
  const navCssHref = `/nav-floating.css?v=${ASSET_VERSION}`;
  const navJsHref = `/nav-floating.js?v=${ASSET_VERSION}`;
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
  <meta name="view-transition" content="same-origin">
  <meta name="theme-color" content="#D4775A">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${styleHref}">
  <style>${CRITICAL_EDITORIAL_GUIDE_CSS}</style>
  <link rel="stylesheet" href="${navCssHref}">
  <script src="${navJsHref}" defer></script>${extra}`;
}

function rewriteAssetVersions(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const replacements = [
    [/\/style\.min\.css(?:\?v=[^"]*)?/g, `/style.min.css?v=${ASSET_VERSION}`],
    [/\/nav-floating\.css(?:\?v=[^"]*)?/g, `/nav-floating.css?v=${ASSET_VERSION}`],
    [/\/nav-floating\.js(?:\?v=[^"]*)?/g, `/nav-floating.js?v=${ASSET_VERSION}`],
    [/\/admin\/portal-shell\.css(?:\?v=[^"]*)?/g, `/admin/portal-shell.css?v=${ASSET_VERSION}`],
    [/\/partner\/portal-shell\.css(?:\?v=[^"]*)?/g, `/partner/portal-shell.css?v=${ASSET_VERSION}`],
    [/\/admin\/admin\.js(?:\?v=[^"]*)?/g, `/admin/admin.js?v=${ASSET_VERSION}`],
    [/\/partner\/partner\.js(?:\?v=[^"]*)?/g, `/partner/partner.js?v=${ASSET_VERSION}`],
  ];
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const next = html.replace(pattern, replacement);
    if (next !== html) {
      changed = true;
      html = next;
    }
  }
  if (changed) fs.writeFileSync(filePath, html);
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
  let locationAliases = [];
  let editorialPages = [];
  let gscSnapshots = [];
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

  const locations = await fetchAllJSON('locations', 'select=*&order=name');
  console.log(`  ${locations.length} locations\n`);

  try {
    locationAliases = await fetchAllJSON('location_aliases', 'select=*');
    console.log(`  ${locationAliases.length} SEO aliases`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  location_aliases table not found, skipping alias redirects');
    } else {
      throw err;
    }
  }

  try {
    editorialPages = await fetchAllJSON('editorial_pages', 'select=*&status=eq.published&order=updated_at.desc');
    console.log(`  ${editorialPages.length} published editorial pages`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  editorial_pages table not found, using repo seed content only');
    } else {
      throw err;
    }
  }

  try {
    gscSnapshots = await fetchJSON('gsc_snapshots', 'select=*&order=created_at.desc&limit=12');
    console.log(`  ${gscSnapshots.length} GSC snapshots`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  gsc_snapshots table not found, skipping DB telemetry overlay');
    } else {
      throw err;
    }
  }

  // Counts
  const regionCounts = {};
  const typeCounts = {};
  for (const loc of locations) {
    regionCounts[loc.region] = (regionCounts[loc.region] || 0) + 1;
    typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
  }

  return { regions, locations, locationAliases, editorialPages, gscSnapshots, regionCounts, typeCounts, total: locations.length };
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

function calculateLocationSeoScore(loc) {
  const desc = isFillerDescription(loc.description) ? '' : (loc.description || '').trim();
  const textSignals = seoTextSignals(loc);
  const facilitiesCount = [loc.coffee, loc.diaper, loc.alcohol].filter(Boolean).length;
  let score = 0;

  if (loc.seo_intro_override) score += 2;
  if (loc.seo_title_override) score += 1;
  if (desc.length >= 180) score += 2;
  else if (desc.length >= 100) score += 1;
  if (loc.toddler_highlight) score += 2;
  if (loc.seo_primary_locality) score += 1;
  if (normalizeExternalUrl(loc.website)) score += 1;
  if (loc.min_age != null && loc.max_age != null) score += 1;
  if (['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`)) score += 1;
  if (facilitiesCount >= 2) score += 1;
  if (daysSince(loc.last_verified_at) <= 540) score += 1;
  if (textSignals.playHint || textSignals.calmHint) score += 1;

  return score;
}

function pickDuplicateWinner(group) {
  return [...group].sort((a, b) => {
    const aManual = normalizeManualSeoTier(a.seo_tier);
    const bManual = normalizeManualSeoTier(b.seo_tier);
    const aPinned = aManual === 'index' ? 1 : 0;
    const bPinned = bManual === 'index' ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    if ((a.seoHasGscSignal ? 1 : 0) !== (b.seoHasGscSignal ? 1 : 0)) return (b.seoHasGscSignal ? 1 : 0) - (a.seoHasGscSignal ? 1 : 0);
    if ((b.seoQualityScore || 0) !== (a.seoQualityScore || 0)) return (b.seoQualityScore || 0) - (a.seoQualityScore || 0);
    if ((normalizeExternalUrl(b.website) ? 1 : 0) !== (normalizeExternalUrl(a.website) ? 1 : 0)) return (normalizeExternalUrl(b.website) ? 1 : 0) - (normalizeExternalUrl(a.website) ? 1 : 0);
    if (daysSince(a.last_verified_at) !== daysSince(b.last_verified_at)) return daysSince(a.last_verified_at) - daysSince(b.last_verified_at);
    return Number(a.id || 0) - Number(b.id || 0);
  })[0];
}

function applySeoPolicy(data) {
  const { locations } = data;
  const gscSignals = loadGscSignals();
  const duplicateGroups = new Map();

  for (const loc of locations) {
    loc.seoPath = cleanPathLike(loc.pageUrl);
    loc.seoHasGscSignal = gscSignals.pathSignals.has(loc.seoPath);
    loc.seoQualityScore = calculateLocationSeoScore(loc) + (loc.seoHasGscSignal ? 2 : 0);
    const groupKey = duplicateGroupKey(loc);
    if (!duplicateGroups.has(groupKey)) duplicateGroups.set(groupKey, []);
    duplicateGroups.get(groupKey).push(loc);
  }

  const duplicateWinners = new Map();
  for (const [groupKey, group] of duplicateGroups.entries()) {
    const winner = pickDuplicateWinner(group);
    duplicateWinners.set(groupKey, winner.id);
    for (const loc of group) {
      loc.seoDuplicateGroupSize = group.length;
      loc.seoDuplicateWinnerId = winner.id;
    }
  }

  const summary = { core: 0, hub: 0, index: 0, support: 0, alias: 0, duplicateGroups: 0 };

  for (const loc of locations) {
    const manualTier = normalizeManualSeoTier(loc.seo_tier);
    const explicitAlias = loc.seo_canonical_target && Number(loc.seo_canonical_target) !== Number(loc.id);
    const duplicateLoser = loc.seoDuplicateGroupSize > 1 && loc.seoDuplicateWinnerId !== loc.id;
    const desc = isFillerDescription(loc.description) ? '' : (loc.description || '').trim();
    const structuredSignals = [
      !!loc.toddler_highlight,
      !!normalizeExternalUrl(loc.website),
      loc.min_age != null && loc.max_age != null,
      [loc.coffee, loc.diaper, loc.alcohol].filter(Boolean).length >= 1,
      ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`),
      daysSince(loc.last_verified_at) <= 540,
    ].filter(Boolean).length;
    const strongContent = !!loc.seo_intro_override || desc.length >= 120;
    let seoTier = 'support';

    if (explicitAlias || manualTier === 'alias') {
      seoTier = 'alias';
    } else if (manualTier === 'index') {
      seoTier = 'index';
    } else if (manualTier === 'support') {
      seoTier = 'support';
    } else if (!loc.seo_exclude_from_sitemap && !duplicateLoser && (loc.seoHasGscSignal || (strongContent && structuredSignals >= 4 && loc.seoQualityScore >= SEO_INDEX_THRESHOLD))) {
      seoTier = 'index';
    }

    if (duplicateLoser && manualTier === 'auto') seoTier = 'support';

    loc.seoTierResolved = seoTier;
    loc.seoIndexable = seoTier === 'index';
    loc.seoRobots = ['support', 'alias'].includes(seoTier) ? 'noindex,follow' : 'index,follow';
    loc.seoCanonicalUrl = fullSiteUrl(loc.pageUrl);
    summary[seoTier] = (summary[seoTier] || 0) + 1;
  }

  summary.duplicateGroups = [...duplicateGroups.values()].filter((group) => group.length > 1).length;
  data.gscSignals = gscSignals;
  data.seoSummary = summary;
  console.log(`SEO policy applied (${summary.index} index, ${summary.support} support, ${summary.alias} alias, ${summary.duplicateGroups} duplicate groups)`);
}

function sortLocationsForSeo(locs) {
  return [...locs].sort((a, b) => {
    if ((a.seoHasGscSignal ? 1 : 0) !== (b.seoHasGscSignal ? 1 : 0)) return (b.seoHasGscSignal ? 1 : 0) - (a.seoHasGscSignal ? 1 : 0);
    if ((b.seoQualityScore || 0) !== (a.seoQualityScore || 0)) return (b.seoQualityScore || 0) - (a.seoQualityScore || 0);
    if (daysSince(a.last_verified_at) !== daysSince(b.last_verified_at)) return daysSince(a.last_verified_at) - daysSince(b.last_verified_at);
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'nl');
  });
}

function matchesClusterPage(cluster, loc) {
  const textSignals = seoTextSignals(loc);
  switch (cluster.slug) {
    case 'regenachtige-dag-met-peuter':
      return ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`) || textSignals.indoorHint;
    case 'binnenlocaties-peuters':
      return ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`) || ['museum', 'swim'].includes(loc.type);
    case 'horeca-met-speelhoek':
      return ['horeca', 'pancake'].includes(loc.type) && textSignals.playHint;
    case 'koffie-en-spelen':
      return !!loc.coffee && (textSignals.playHint || ['play', 'farm', 'nature'].includes(loc.type));
    case 'dreumes-uitjes':
      return (loc.min_age == null || Number(loc.min_age) <= 2)
        && (loc.max_age == null || Number(loc.max_age) <= 5)
        && (loc.diaper || textSignals.calmHint || !!loc.coffee || ['farm', 'museum', 'horeca', 'nature'].includes(loc.type));
    case 'peuteruitjes-2-5-jaar':
      return (loc.min_age == null || Number(loc.min_age) <= 2) && (loc.max_age == null || Number(loc.max_age) >= 4);
    default:
      return false;
  }
}

function getClusterPagesForLocation(loc) {
  return CLUSTER_PAGES.filter((cluster) => matchesClusterPage(cluster, loc)).slice(0, 3);
}

function relatedClustersForLocations(locs, limit = 4) {
  const hits = CLUSTER_PAGES
    .map((cluster) => ({
      cluster,
      count: locs.filter((loc) => matchesClusterPage(cluster, loc)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return hits.map((entry) => entry.cluster);
}

function updateRedirects(data) {
  const redirectsPath = path.join(ROOT, '_redirects');
  const markerStart = '# BEGIN:SEO_ALIASES';
  const markerEnd = '# END:SEO_ALIASES';
  let content = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, 'utf8') : '';

  if (!content.includes(markerStart)) {
    content = `${content.trimEnd()}\n\n${markerStart}\n${markerEnd}\n`;
  }

  const byId = new Map(data.locations.map((loc) => [Number(loc.id), loc]));
  const lines = [];

  for (const row of data.locationAliases || []) {
    const source = row.old_region_slug && row.old_loc_slug ? `/${row.old_region_slug}/${row.old_loc_slug}/` : null;
    const target = row.target_url || null;
    if (source && target) lines.push(`${source} ${target} 301`);
  }

  for (const loc of data.locations) {
    if (loc.seoTierResolved !== 'alias' || !loc.seo_canonical_target) continue;
    const canonicalTarget = byId.get(Number(loc.seo_canonical_target));
    if (!canonicalTarget) continue;
    lines.push(`${loc.pageUrl} ${canonicalTarget.pageUrl} 301`);
  }

  const deduped = [...new Set(lines)].sort();
  content = content.replace(
    new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`),
    `${markerStart}\n${deduped.join('\n')}\n${markerEnd}`,
  );

  fs.writeFileSync(redirectsPath, `${content.trimEnd()}\n`);
  console.log(`Updated _redirects SEO alias block (${deduped.length} redirects)`);
}

// === 1. Update index.html ===

function updateIndex(data) {
  const { regions, regionCounts, typeCounts, total, seoSummary, seoContent } = data;
  let content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const discoverEntry = seoContent?.shared?.ontdekken;
  const featuredBlogEntries = [...loadBlogMetadata().values()]
    .filter((entry) => entry.published)
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
    .slice(0, 6);

  // STATS
  const statsHTML = `    <section class="stats">
        <div class="stats-container">
            <div>
                <div class="stat-number" data-target="${total}" data-suffix="">${total}</div>
                <div class="stat-label">Locaties</div>
            </div>
            <div>
                <div class="stat-number" data-target="${regions.length}" data-suffix="">${regions.length}</div>
                <div class="stat-label">Regio's</div>
            </div>
            <div>
                <div class="stat-number" data-target="100" data-suffix="%">100%</div>
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

  const clusterCards = CLUSTER_PAGES.map((page) => `              <a href="${page.slug}.html" class="guide-link">
                <strong>${page.h1}</strong>
                <span>${page.metaDesc}</span>
              </a>`).join('\n');

  const typeGridHTML = `    <section class="cities-section" style="background: var(--bg-warm);">
        <div class="container">
            <h2 class="section-title">Uitjes per type</h2>
            <p class="section-sub">Weet je al wat voor dag het wordt? Zoek direct op type uitje.</p>
            <div class="cities-grid">
${typeCards}
            </div>
            <div class="guide-section guide-section-featured" style="margin-top:32px;">
                <div class="guide-card guide-card-lead">
                    <p class="guide-kicker">Start bij situatie</p>
                    <h3>Niet zoeken op locatie, maar op de dag die je hebt</h3>
                    <p class="guide-card-intro">Deze routes helpen ouders sneller naar de juiste keuze en geven de site een heldere structuur: regen, dreumes, horeca met speelhoek of een plek waar koffie en spelen logisch samengaan.</p>
                    <div class="guide-pills">
                      <span class="guide-pill">Regenproof</span>
                      <span class="guide-pill">Dreumes</span>
                      <span class="guide-pill">Koffie + spelen</span>
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <div class="guide-links">
${clusterCards}
                    </div>
                </div>
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

  const crawlHubHTML = `          <div class="guide-section guide-section-hub" style="margin-top:32px;">
                <div class="guide-card guide-card-lead">
                    <p class="guide-kicker">Zoek niet te breed</p>
                    <h3>${escapeHtml(discoverEntry?.hero_title || 'Begin bij een route die bij je dag past')}</h3>
                    <p class="guide-card-intro">${escapeHtml(discoverEntry?.hero_sub || 'Gebruik regio’s, typen en themapagina’s als ingang. Dat werkt sneller voor ouders en geeft Google ook een duidelijker beeld van wat de belangrijkste pagina’s zijn.')}</p>
                    ${editorialMetaHTML(discoverEntry)}
                    <div class="guide-pills">
                      <span class="guide-pill">Regio</span>
                      <span class="guide-pill">Type uitje</span>
                      <span class="guide-pill">Situatie</span>
                    </div>
                    <div class="guide-links">
                      <a href="/ontdekken/" class="guide-link"><strong>Alles geordend bekijken</strong><span>Regio’s, typen, situaties en blogroutes op één crawlbare pagina.</span></a>
                      <a href="/methode/" class="guide-link"><strong>Hoe PeuterPlannen selecteert</strong><span>Waarom sommige pagina’s zwaarder wegen dan andere, en hoe we kindpraktijk meewegen.</span></a>
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <p class="guide-kicker">Belangrijkste ingangen</p>
                    <h3>Snelle routes door de site</h3>
                    <div class="guide-links">
                      ${regions.slice(0, 9).map((region) => `<a href="/${region.slug}.html" class="guide-link"><strong>${region.name}</strong><span>${regionCounts[region.name] || 0} locaties in deze regio</span></a>`).join('')}
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <p class="guide-kicker">Verder lezen</p>
                    <h3>Gebruik blog en clusterpagina’s als keuzehulp</h3>
                    <div class="guide-links">
                      ${featuredBlogEntries.map((entry) => `<a href="/blog/${entry.slug}/" class="guide-link"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
                    </div>
                </div>
            </div>`;

  const cityGridHTML = `    <section class="cities-section">
        <div class="container">
            <h2 class="section-title">Uitjes per regio</h2>
            <p class="section-sub">Elke regio omvat de stad én omliggende gemeenten. Gecheckt en actueel.</p>
            <div class="cities-grid">
${cityCards}
            </div>
${crawlHubHTML}
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
  // Also update meta name="description" (different phrasing, not matched by above)
  content = content.replace(
    /(<meta name="description" content=")\d+ kindvriendelijke locaties in Nederland/,
    `$1${total} kindvriendelijke locaties in Nederland`
  );
  const homeTitle = 'PeuterPlannen | Uitjes voor peuters in heel Nederland';
  const homeDescription = `${total} kindvriendelijke locaties in Nederland, handmatig geverifieerd. Vind het perfecte uitje voor je peuter op type, leeftijd, weer en afstand.`;
  content = content.replace(/<title>.*?<\/title>/, `<title>${homeTitle}</title>`);
  content = content.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(homeDescription)}">`);
  content = content.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(homeTitle)}">`);
  content = content.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(homeDescription)}">`);
  content = content.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(homeTitle)}">`);
  content = content.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(homeDescription)}">`);
  // Hero badge — scoped to the exact span to avoid false positives
  content = content.replace(
    /(style="color:var\(--ink-muted\);"[^>]*>)\d+\+ locaties/,
    `$1${total}+ locaties`
  );

  fs.writeFileSync(path.join(ROOT, 'index.html'), content);
  console.log(`Updated index.html (${total} locaties, ${regions.length} regio's)`);
}

// === 2. Update app.html ===

function updateApp(data) {
  const { regions, regionCounts, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const clusterNoscriptLinks = CLUSTER_PAGES.map((page) => `      <li><a href="${page.slug}.html">${page.h1}</a></li>`).join('\n');

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
    <h2>Start bij situatie</h2>
    <ul>
${clusterNoscriptLinks}
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
  // Donation carousel hardcoded counts
  content = content.replace(/\d+\+ uitjes/g, `${total}+ uitjes`);
  content = content.replace(/\d+\+ locaties, gratis/g, `${total}+ locaties, gratis`);
  // Info panel
  content = content.replace(/Alle \d+ locaties zijn handmatig geverifieerd/g, `Alle ${total} locaties zijn handmatig geverifieerd`);
  const appTitle = 'PeuterPlannen app — vind peuteruitjes op afstand, type en weer';
  const appDescription = `Gebruik de PeuterPlannen app om ${total} kindvriendelijke uitjes te vinden op afstand, type, leeftijd en weer. Met regiogidsen, planning en gecheckte locaties in Nederland.`;
  content = content.replace(/<title>.*?<\/title>/, `<title>${appTitle}</title>`);
  content = content.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(appDescription)}">`);
  content = content.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(appTitle)}">`);
  content = content.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(appDescription)}">`);
  content = content.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(appTitle)}">`);
  content = content.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(appDescription)}">`);

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
  content = content.replace(/\d+ locaties waarover je kunt vertrouwen/g, `${total} locaties waarover je kunt vertrouwen`);

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

// === 5. Update 404.html ===

function update404(data) {
  const { total } = data;
  let content = fs.readFileSync(path.join(ROOT, '404.html'), 'utf8');
  content = content.replace(/\d+\+ geverifieerde uitjes/g, `${total}+ geverifieerde uitjes`);
  fs.writeFileSync(path.join(ROOT, '404.html'), content);
  console.log(`Updated 404.html (${total}+ uitjes)`);
}

function generateSharedSeoPage(slug, entry, options = {}) {
  if (!entry) return null;
  const title = entry.meta_title || entry.title || options.title || 'PeuterPlannen';
  const description = entry.meta_description || options.description || '';
  const heroTitle = entry.hero_title || entry.title || options.heroTitle || title;
  const heroSub = entry.hero_sub || options.heroSub || description;
  const relatedBlogSlugs = Array.isArray(entry.related_blog_slugs) ? entry.related_blog_slugs : [];
  const relatedBlogs = getBlogEntriesBySlug(relatedBlogSlugs);
  const extraSections = options.extraSections || '';

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/${slug}/">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="https://peuterplannen.nl/${slug}/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
</head>
<body>
${navHTML()}
<div class="hero hero-blog">
  <p class="hero-kicker">${escapeHtml(entry.editorial_label || 'PeuterPlannen redactie')}</p>
  <h1 class="hero-blog-title">${escapeHtml(heroTitle)}</h1>
  <p class="hero-blog-sub">${escapeHtml(heroSub)}</p>
  <div class="hero-blog-meta">
    ${formatEditorialDate(entry.updated_at) ? `<span>Laatst bijgewerkt ${escapeHtml(formatEditorialDate(entry.updated_at))}</span>` : '<span>Redactioneel bijgehouden</span>'}
    <span>Nederland breed</span>
    <span>Peuter- en kleuterpraktijk</span>
  </div>
</div>
<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${escapeHtml(entry.title || heroTitle)}
</nav>
<main id="main-content">
  <section class="editorial-shell">
    ${editorialMetaHTML(entry)}
    ${editorialBodyHTML(entry)}
    <div class="editorial-support">
      <div class="editorial-support-card">
        <h3>Zo werk je het snelst</h3>
        <p>Begin met een route die past bij je dag, niet met eindeloze losse pins. Dat scheelt ouders tijd en houdt de site voor Google logisch en navigeerbaar.</p>
      </div>
      <div class="editorial-support-card">
        <h3>Handige ingangen</h3>
        <div class="editorial-support-links">
          <a href="/methode/"><strong>Hoe we selecteren</strong><span>Wat gecheckt betekent en hoe kindpraktijk zwaarder weegt dan losse listingdata.</span></a>
          <a href="/app.html"><strong>Open de app</strong><span>Gebruik afstand, type en situatie om snel een shortlist voor vandaag te maken.</span></a>
        </div>
      </div>
    </div>
  </section>
  ${extraSections}
  ${relatedBlogs.length ? `<section class="guide-section">
    <div class="guide-card">
      <p class="guide-kicker">Verder lezen</p>
      <h2>Relevante gidsen</h2>
      <div class="guide-links">
        ${relatedBlogs.map((blog) => `<a href="/blog/${blog.slug}/" class="guide-link"><strong>${escapeHtml(blog.title)}</strong><span>${escapeHtml(blog.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
      </div>
    </div>
  </section>` : ''}
  ${supportHTML()}
</main>
${footerHTML()}
${revealScript()}
${analyticsHTML()}
</body>
</html>`;

  const targetDir = path.join(ROOT, slug);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html);
  console.log(`  ${slug}/index.html`);
  return { slug, title, description, path: `/${slug}/` };
}

function generateDiscoverPage(data) {
  const entry = data.seoContent?.shared?.ontdekken;
  if (!entry) return null;
  const regionLinks = data.regions.map((region) => `<a href="/${region.slug}.html" class="guide-link"><strong>${region.name}</strong><span>${data.regionCounts[region.name] || 0} locaties in deze regio</span></a>`).join('');
  const typeLinks = TYPE_PAGES.map((page) => `<a href="/${page.slug}.html" class="guide-link"><strong>${page.sectionLabel}</strong><span>${page.metaDesc}</span></a>`).join('');
  const clusterLinks = CLUSTER_PAGES.map((cluster) => `<a href="/${cluster.slug}.html" class="guide-link"><strong>${cluster.h1}</strong><span>${cluster.metaDesc}</span></a>`).join('');
  const extraSections = `
  <section class="guide-section">
    <div class="guide-card">
      <p class="guide-kicker">Regio’s</p>
      <h2>Kies eerst waar je ongeveer wilt zijn</h2>
      <div class="guide-links">${regionLinks}</div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Typen uitjes</p>
      <h2>Of start met het soort plek dat past bij de dag</h2>
      <div class="guide-links">${typeLinks}</div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Situaties</p>
      <h2>Gebruik een themapagina als het ritme belangrijker is dan de exacte plek</h2>
      <div class="guide-links">${clusterLinks}</div>
    </div>
  </section>`;
  return generateSharedSeoPage('ontdekken', entry, { extraSections });
}

function generateMethodologyPage(data) {
  const entry = data.seoContent?.shared?.methodologie;
  if (!entry) return null;
  return generateSharedSeoPage('methode', entry);
}

// === 6. Generate city pages ===

function locationHTML_city(loc) {
  const locationUrl = loc.pageUrl || '#';
  const normalizedWebsite = normalizeExternalUrl(loc.website);
  const websiteLink = normalizedWebsite ? `<a href="${escapeHtml(normalizedWebsite)}" target="_blank" rel="noopener" class="loc-website-btn" aria-label="Website van ${escapeHtml(loc.name)}">Website</a>` : '';
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

function generateCityPage(region, locs, allRegions, seoContent) {
  const byType = {};
  TYPE_ORDER.forEach(t => { byType[t] = locs.filter(l => l.type === t); });
  const relatedClusters = relatedClustersForLocations(locs);
  const editorial = seoContent?.regions?.[region.slug];
  const relatedEditorialBlogs = Array.isArray(editorial?.related_blog_slugs) ? getBlogEntriesBySlug(editorial.related_blog_slugs) : [];

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
  const strongestTypes = TYPE_ORDER
    .map((type) => ({ type, count: byType[type]?.length || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const strongestTypeLabel = strongestTypes.map((entry) => TYPE_MAP[entry.type]?.labelSingle?.toLowerCase() || entry.type).join(', ');
  const pageTitle = editorial?.meta_title || `${region.name} met peuters — speeltuinen, musea & restaurants | PeuterPlannen`;
  const pageDescription = editorial?.meta_description || `${region.name} met peuters: ${locs.length} werkbare uitjes, met focus op ${strongestTypeLabel}. Inclusief regenopties, eten & spelen en locaties die ook in de praktijk prettig zijn.`;
  const topPicks = sortLocationsForSeo(locs).slice(0, 3);
  const municipalityChips = coverage?.length
    ? coverage.map((name) => `<span class="coverage-chip">${escapeHtml(name)}</span>`).join('')
    : '';
  const cityGuideHTML = `<section class="guide-section city-guide">
    ${editorial ? `<div class="guide-card">
      <p class="guide-kicker">${escapeHtml(editorial.editorial_label || 'PeuterPlannen redactie')}</p>
      <h2>Waarom ${region.name} niet om volume maar om slimme keuzes vraagt</h2>
      ${editorialMetaHTML(editorial)}
      ${editorialBodyHTML(editorial)}
    </div>` : ''}
    <div class="guide-card">
      <p class="guide-kicker">Sneller kiezen in ${region.name}</p>
      <h2>Begin niet met alle kaarten tegelijk</h2>
      <p>Deze regiopagina werkt het best als je eerst kiest op soort dag. In ${region.name} zijn vooral ${strongestTypes.map((entry) => (TYPE_MAP[entry.type]?.labelSingle || entry.type).toLowerCase()).join(', ')} sterk vertegenwoordigd. Daardoor kun je sneller van “wat zullen we doen?” naar een shortlist die echt past bij jonge kinderen.</p>
      <ul class="guide-list">
        <li><strong>Ochtend:</strong> buiten, dieren of een rustige speeltuin werkt meestal beter dan direct horeca.</li>
        <li><strong>Regenbackup:</strong> kies daarna pas een museum, binnenspeelplek of horeca met speelhoek.</li>
        <li><strong>Minder centrumstress:</strong> veel goede peuterplekken liggen net buiten de drukste winkelstraten.</li>
      </ul>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Regiodekking</p>
      <h2>${coverage?.length ? 'Niet alleen de stad zelf' : `Wat je hier vindt in ${region.name}`}</h2>
      <p>${coverage?.length ? `Deze pagina bundelt ook omliggende gemeenten, zodat je niet onnodig hoeft te wisselen tussen losse stadspagina’s. Dat past beter bij hoe ouders echt zoeken: binnen een redelijke fiets- of rijafstand.` : `Deze overzichtspagina verzamelt de plekken die in ${region.name} het vaakst bruikbaar zijn voor een peuterdag, met directe links naar detailpagina’s en de app.`}</p>
      ${municipalityChips ? `<div class="coverage-chip-row">${municipalityChips}</div>` : ''}
    </div>
    ${topPicks.length ? `<div class="guide-card">
      <p class="guide-kicker">Snelste shortlist</p>
      <h2>Drie plekken om mee te beginnen</h2>
      <div class="guide-links">
        ${topPicks.map((loc) => `<a href="${loc.pageUrl}" class="guide-link"><strong>${escapeHtml(loc.name)}</strong><span>${escapeHtml(TYPE_MAP[loc.type]?.labelSingle || loc.type)}${loc.toddler_highlight ? ` · ${escapeHtml(cleanToddlerHighlight(loc.toddler_highlight).split(/[.!?]/)[0])}` : ''}</span></a>`).join('')}
      </div>
    </div>` : ''}
    ${relatedClusters.length ? `<div class="guide-card">
      <p class="guide-kicker">Slimme routes</p>
      <h2>Begin liever met een situatie dan met 100 losse pins</h2>
      <div class="guide-links">
        ${relatedClusters.map((cluster) => `<a href="/${cluster.slug}.html" class="guide-link"><strong>${cluster.h1}</strong><span>${cluster.metaDesc}</span></a>`).join('')}
      </div>
    </div>` : ''}
    ${relatedEditorialBlogs.length ? `<div class="guide-card">
      <p class="guide-kicker">Verder lezen</p>
      <h2>Redactionele gidsen voor ${region.name}</h2>
      <div class="guide-links">
        ${relatedEditorialBlogs.map((blog) => `<a href="/blog/${blog.slug}/" class="guide-link"><strong>${escapeHtml(blog.title)}</strong><span>${escapeHtml(blog.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
      </div>
    </div>` : ''}
  </section>`;
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

  const breadcrumbCityLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "PeuterPlannen", "item": "https://peuterplannen.nl/" },
      { "@type": "ListItem", "position": 2, "name": `${region.name} met peuters`, "item": `https://peuterplannen.nl/${region.slug}.html` }
    ]
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Peuteruitjes in ${region.name} — PeuterPlannen">
  <script type="application/ld+json">
${jsonLd}
  </script>
  ${cityFaqLd ? `<script type="application/ld+json">\n${cityFaqLd}\n  </script>` : ''}
  <script type="application/ld+json">
${breadcrumbCityLd}
  </script>
</head>
<body>

${navHTML(`Zoek in ${region.name}`, `/app.html?regio=${encodeURIComponent(region.name)}`)}

<div class="hero">
  <h1>Uitjes met peuters in <span>${region.name}${omgevingLabel}</span></h1>
  <p>${escapeHtml(region.blurb)}</p>
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

  ${cityGuideHTML}

  <div class="city-app-cta">
    <span>Zoek op jouw locatie en ontdek wat dichtbij is</span>
    <a href="/app.html?regio=${encodeURIComponent(region.name)}" class="btn-app-cta">Open de app</a>
  </div>

  ${sectionsHTML}

  ${cityFaqItems.length > 0 ? `<div class="faq-section">
    <h2>Veelgestelde vragen over uitjes in ${region.name}</h2>
    ${cityFaqItems.map(item => `
    <details class="faq-item">
      <summary>${escapeHtml(item.q)}</summary>
      <div class="faq-answer"><p>${escapeHtml(item.a)}</p></div>
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
  const { regions, locations, seoContent } = data;

  for (const region of regions) {
    const locs = selectHubLocations(locations.filter(l => l.region === region.name));
    const html = generateCityPage(region, locs, regions, seoContent);
    const outPath = path.join(ROOT, `${region.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${region.slug}.html — ${locs.length} locaties`);
  }
}

// === 6. Generate type pages ===

function locationHTML_type(loc) {
  const locationUrl = loc.pageUrl || '#';
  const normalizedWebsite = normalizeExternalUrl(loc.website);
  const websiteLink = normalizedWebsite ? `<a href="${escapeHtml(normalizedWebsite)}" target="_blank" rel="noopener" class="loc-website-btn" aria-label="Website van ${escapeHtml(loc.name)}">Website</a>` : '';
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

function generateTypePage(page, locs, regions, seoContent) {
  const editorial = seoContent?.types?.[page.slug];
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
      <summary>${escapeHtml(item.q)}</summary>
      <div class="faq-answer"><p>${escapeHtml(item.a)}</p></div>
    </details>`).join('');

  const otherTypeLinks = TYPE_PAGES
    .filter(t => t.slug !== page.slug)
    .map(t => `<a href="/${t.slug}.html">${t.sectionLabel}</a>`)
    .join(' &middot; ');

  const cityLinks = regions.map(r => `<a href="/${r.slug}.html">${r.name}</a>`).join(' &middot; ');
  const strongestRegions = regionOrder.filter((r) => byRegion[r]?.length > 0).slice(0, 6);
  const relatedClusters = relatedClustersForLocations(locs);
  const relatedEditorialBlogs = Array.isArray(editorial?.related_blog_slugs) ? getBlogEntriesBySlug(editorial.related_blog_slugs) : [];
  const pageTitle = editorial?.meta_title || page.metaTitle;
  const pageDescription = editorial?.meta_description || page.metaDesc;
  const typeGuideHTML = `<section class="guide-section type-guide">
    ${editorial ? `<div class="guide-card">
      <p class="guide-kicker">${escapeHtml(editorial.editorial_label || 'PeuterPlannen redactie')}</p>
      <h2>Waarom deze categorie een keuzehulp is, geen export</h2>
      ${editorialMetaHTML(editorial)}
      ${editorialBodyHTML(editorial)}
    </div>` : ''}
    <div class="guide-card">
      <p class="guide-kicker">Hoe we selecteren</p>
      <h2>Niet elke plek met dit label haalt de site</h2>
      <p>Deze pagina is geen kale categorie-export. We kiezen locaties op bruikbaarheid voor ouders met peuters: tempo, overzicht, praktische voorzieningen en de vraag of een plek ook op een rommelige dag nog werkt.</p>
      <ul class="guide-list">
        <li><strong>Praktisch eerst:</strong> werkt het met kinderwagen, korte spanningsboog en wisselend weer?</li>
        <li><strong>Niet alleen populair:</strong> een drukke hotspot is niet automatisch prettig met jonge kinderen.</li>
        <li><strong>Doorzoeken per regio:</strong> gebruik deze pagina om eerst op type te kiezen en daarna pas op stad of detailpagina.</li>
      </ul>
    </div>
    ${strongestRegions.map((regionName) => {
      const picks = byRegion[regionName].slice(0, 2);
      return `<article class="guide-card">
        <p class="guide-kicker">${escapeHtml(regionName)}</p>
        <h3>${page.sectionLabel} in ${escapeHtml(regionName)}</h3>
        <p>${byRegion[regionName].length} locaties in deze regio. Handig als je meteen vanuit het type wilt inzoomen naar een concrete stadsgids.</p>
        <div class="guide-links">
          ${picks.map((loc) => `<a href="${loc.pageUrl}" class="guide-link"><strong>${escapeHtml(loc.name)}</strong><span>${loc.toddler_highlight ? escapeHtml(cleanToddlerHighlight(loc.toddler_highlight).split(/[.!?]/)[0]) : `Bekijk de detailpagina van ${escapeHtml(loc.name)}`}</span></a>`).join('')}
        </div>
        <a href="/methode/" class="guide-inline-link">Lees hoe we selecteren</a>
        <a href="/${slugify(regionName)}.html" class="guide-inline-link">Bekijk heel ${escapeHtml(regionName)}</a>
      </article>`;
    }).join('')}
    ${relatedClusters.length ? `<div class="guide-card">
      <p class="guide-kicker">Zo zoekt een ouder écht</p>
      <h3>Gebruik deze categorie samen met een situatiepagina</h3>
      <div class="guide-links">
        ${relatedClusters.map((cluster) => `<a href="/${cluster.slug}.html" class="guide-link"><strong>${cluster.h1}</strong><span>${cluster.metaDesc}</span></a>`).join('')}
      </div>
    </div>` : ''}
    ${relatedEditorialBlogs.length ? `<div class="guide-card">
      <p class="guide-kicker">Verder lezen</p>
      <h3>Redactionele gidsen die hierbij passen</h3>
      <div class="guide-links">
        ${relatedEditorialBlogs.map((blog) => `<a href="/blog/${blog.slug}/" class="guide-link"><strong>${escapeHtml(blog.title)}</strong><span>${escapeHtml(blog.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
      </div>
    </div>` : ''}
  </section>`;

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

  const breadcrumbTypeLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "PeuterPlannen", "item": "https://peuterplannen.nl/" },
      { "@type": "ListItem", "position": 2, "name": page.title, "item": `https://peuterplannen.nl/${page.slug}.html` }
    ]
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${TYPE_OG_IMAGE[page.dbType] || DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(pageTitle)}">
  <script type="application/ld+json">
${jsonLdItemList}
  </script>
  <script type="application/ld+json">
${jsonLdFaq}
  </script>
  <script type="application/ld+json">
${breadcrumbTypeLd}
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
    ${(editorial?.bodyMarkdown || page.intro).split('\n\n').map(p => `<p>${p.replace(/^##\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join('\n    ')}
  </div>

  ${typeGuideHTML}

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
  const { regions, locations, seoContent } = data;

  for (const page of TYPE_PAGES) {
    const locs = selectHubLocations(locations.filter(l => l.type === page.dbType));
    const html = generateTypePage(page, locs, regions, seoContent);
    const outPath = path.join(ROOT, `${page.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${page.slug}.html — ${locs.length} locaties, ${page.faqItems.length} FAQ-items`);
  }
}

// === 7. Generate cluster pages ===

function buildClusterLocationSet(cluster, data) {
  const matched = data.locations.filter((loc) => matchesClusterPage(cluster, loc));
  const curated = selectHubLocations(matched, SEO_MAX_CLUSTER_LOCATIONS);
  return curated.slice(0, SEO_MAX_CLUSTER_LOCATIONS);
}

function generateClusterPage(cluster, data, locs) {
  const { regions, seoContent } = data;
  const editorial = seoContent?.clusters?.[cluster.slug];
  const byRegion = {};
  for (const loc of locs) {
    if (!byRegion[loc.region]) byRegion[loc.region] = [];
    byRegion[loc.region].push(loc);
  }
  const topRegions = regions
    .filter((region) => byRegion[region.name]?.length)
    .sort((a, b) => byRegion[b.name].length - byRegion[a.name].length)
    .slice(0, 6);
  const topPicks = locs.slice(0, 6);
  const supportingTypes = Array.from(new Set(locs.map((loc) => TYPE_MAP[loc.type]?.labelSingle || loc.type))).slice(0, 5);
  const relatedEditorialBlogs = Array.isArray(editorial?.related_blog_slugs) ? getBlogEntriesBySlug(editorial.related_blog_slugs) : [];
  const clusterTitle = editorial?.meta_title || cluster.metaTitle;
  const clusterDescription = editorial?.meta_description || cluster.metaDesc;
  const clusterIntro = editorial?.hero_sub || cluster.intro;
  const regionSections = topRegions.map((region) => `
    <section class="region-section">
      <h2>${cluster.h1} in ${region.name}</h2>
      <div class="loc-list">
        ${byRegion[region.name].slice(0, 8).map(locationHTML_type).join('')}
      </div>
    </section>`).join('');

  const relatedRegionLinks = topRegions.map((region) => `<a href="/${region.slug}.html">${region.name}</a>`).join(' &middot; ');
  const relatedTypeLinks = TYPE_PAGES
    .filter((page) => locs.some((loc) => loc.type === page.dbType))
    .slice(0, 5)
    .map((page) => `<a href="/${page.slug}.html">${page.sectionLabel}</a>`)
    .join(' &middot; ');

  const faqItems = [
    {
      q: `Wanneer werkt ${cluster.h1.toLowerCase()} het best?`,
      a: `${cluster.h1} werkt het best als je niet alleen op één type uitje wilt leunen, maar op het ritme van de dag. Daarom combineren we hier plekken die praktisch zijn voor jonge kinderen en logisch voelen voor ouders.`,
    },
    {
      q: `Hoe kiezen jullie locaties voor ${cluster.h1.toLowerCase()}?`,
      a: `We selecteren niet alleen op categorie, maar ook op praktische signalen zoals binnen/buiten, leeftijdsfit, koffie, verschonen, recente verificatie en de vraag of een plek met jonge kinderen echt prettig werkt.`,
    },
  ];

  const faqLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    })),
  }, null, 2);

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "PeuterPlannen", "item": "https://peuterplannen.nl/" },
      { "@type": "ListItem", "position": 2, "name": cluster.h1, "item": `https://peuterplannen.nl/${cluster.slug}.html` },
    ],
  }, null, 2);

  const itemListLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": cluster.h1,
    "description": clusterDescription,
    "numberOfItems": locs.length,
    "itemListElement": locs.map((loc, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": loc.name,
      "url": fullSiteUrl(loc.pageUrl),
      "description": loc.description || '',
    })),
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(clusterTitle)}</title>
  <meta name="description" content="${escapeHtml(clusterDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/${cluster.slug}.html">
  <meta property="og:title" content="${escapeHtml(clusterTitle)}">
  <meta property="og:description" content="${escapeHtml(clusterDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/${cluster.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
  <script type="application/ld+json">
${itemListLd}
  </script>
  <script type="application/ld+json">
${faqLd}
  </script>
  <script type="application/ld+json">
${breadcrumbLd}
  </script>
</head>
<body>

${navHTML()}

<div class="hero">
  <p class="hero-kicker">${cluster.kicker}</p>
  <h1>${cluster.h1.replace('peuter', '<span>peuter</span>')}</h1>
  <p>${escapeHtml(clusterIntro)}</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${locs.length}</strong><span>sterke matches</span></div>
    <div class="hero-stat"><strong>${topRegions.length}</strong><span>regio's</span></div>
    <div class="hero-stat"><strong>${supportingTypes.length}</strong><span>typen</span></div>
  </div>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${cluster.h1}
</nav>

<main id="main-content">
  <section class="guide-section">
    ${editorial ? `<div class="guide-card">
      <p class="guide-kicker">${escapeHtml(editorial.editorial_label || 'PeuterPlannen redactie')}</p>
      <h2>Waarom deze route menselijker werkt dan eindeloos scrollen</h2>
      ${editorialMetaHTML(editorial)}
      ${editorialBodyHTML(editorial)}
    </div>` : ''}
    <div class="guide-card">
      <p class="guide-kicker">Waarom deze pagina bestaat</p>
      <h2>Van zoekintentie naar een shortlist die wel klopt</h2>
      <p>${escapeHtml(clusterIntro)}</p>
      <ul class="guide-list">
        <li><strong>Niet alles tegelijk:</strong> eerst de situatie, daarna pas de exacte plek.</li>
        <li><strong>Praktisch geselecteerd:</strong> voorzieningen, leeftijdsfit en dagritme wegen mee.</li>
        <li><strong>Minder AI-slop:</strong> liever een kleinere, bruikbare shortlist dan een kale directorydump.</li>
      </ul>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Begin hier</p>
      <h2>${topPicks.length} locaties die meteen richting geven</h2>
      <div class="guide-links">
        ${topPicks.map((loc) => `<a href="${loc.pageUrl}" class="guide-link"><strong>${escapeHtml(loc.name)}</strong><span>${escapeHtml(TYPE_MAP[loc.type]?.labelSingle || loc.type)}${loc.toddler_highlight ? ` · ${escapeHtml(cleanToddlerHighlight(loc.toddler_highlight).split(/[.!?]/)[0])}` : ''}</span></a>`).join('')}
      </div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Sneller verder</p>
      <h2>Combineer deze shortlist met regio- en typehubs</h2>
      <div class="guide-links">
        ${topRegions.map((region) => `<a href="/${region.slug}.html" class="guide-link"><strong>${region.name}</strong><span>${byRegion[region.name].length} locaties in deze situatie</span></a>`).join('')}
        ${TYPE_PAGES.filter((page) => locs.some((loc) => loc.type === page.dbType)).slice(0, 4).map((page) => `<a href="/${page.slug}.html" class="guide-link"><strong>${page.sectionLabel}</strong><span>${page.metaDesc}</span></a>`).join('')}
      </div>
    </div>
    ${relatedEditorialBlogs.length ? `<div class="guide-card">
      <p class="guide-kicker">Verder lezen</p>
      <h2>Gidsen die deze route versterken</h2>
      <div class="guide-links">
        ${relatedEditorialBlogs.map((blog) => `<a href="/blog/${blog.slug}/" class="guide-link"><strong>${escapeHtml(blog.title)}</strong><span>${escapeHtml(blog.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
      </div>
    </div>` : ''}
  </section>

  ${regionSections}

  <div class="faq-section">
    <h2>Veelgestelde vragen over ${cluster.h1.toLowerCase()}</h2>
    ${faqItems.map((item) => `
    <details class="faq-item">
      <summary>${escapeHtml(item.q)}</summary>
      <div class="faq-answer"><p>${escapeHtml(item.a)}</p></div>
    </details>`).join('')}
  </div>

  <div class="nav-links-box">
    <h3>Verder zoeken</h3>
    ${relatedRegionLinks}
    <div class="divider">
      <h3 style="margin-bottom:10px;">Per type</h3>
      ${relatedTypeLinks}
    </div>
  </div>

  ${newsletterHTML()}
  ${supportHTML('category')}
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;
}

function generateClusterPages(data) {
  const generated = [];
  for (const cluster of CLUSTER_PAGES) {
    const locs = buildClusterLocationSet(cluster, data);
    if (locs.length === 0) continue;
    const html = generateClusterPage(cluster, data, locs);
    fs.writeFileSync(path.join(ROOT, `${cluster.slug}.html`), html);
    generated.push({ ...cluster, locations: locs, url: `/${cluster.slug}.html` });
    console.log(`  ${cluster.slug}.html — ${locs.length} locaties`);
  }
  return generated;
}

// === 8. Generate location pages ===

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
    { slug: 'amsterdam-met-peuters-en-kleuters', title: 'Amsterdam met peuters en kleuters: complete gids' },
    { slug: 'gratis-peuteruitjes-amsterdam', title: '10 Gratis peuteruitjes in Amsterdam' },
    { slug: 'kindvriendelijke-horeca-met-speelhoek', title: 'Kindvriendelijke horeca met speelhoek' },
    { slug: 'dagje-uit-met-dreumes',         title: 'Dagje uit met een dreumes: 20 activiteiten' },
  ],
  'rotterdam':            [
    { slug: 'rotterdam-met-peuters',         title: 'Rotterdam met peuters: praktische stadsgids' },
    { slug: 'beste-speeltuinen-rotterdam-peuters', title: 'De beste speeltuinen in Rotterdam' },
    { slug: 'dagje-uit-met-kleuter-4-6-jaar', title: 'Dagje uit met kleuter (4-6): 25 ideeën' },
  ],
  'utrecht':              [
    { slug: 'kinderboerderijen-utrecht',     title: 'Beste kinderboerderijen in Utrecht' },
    { slug: 'utrecht-met-peuters',           title: 'Utrecht met peuters: complete gids' },
    { slug: 'dagje-uit-met-kleuter-4-6-jaar', title: 'Dagje uit met kleuter (4-6): 25 ideeën' },
  ],
  'den-haag':             [
    { slug: 'den-haag-met-peuters',          title: 'Den Haag met peuters: de beste plekken' },
    { slug: 'dagje-uit-met-kleuter-4-6-jaar', title: 'Dagje uit met kleuter (4-6): 25 ideeën' },
  ],
  'haarlem':              [
    { slug: 'haarlem-met-peuters',           title: 'Haarlem met peuters' },
  ],
  'eindhoven':            [
    { slug: 'eindhoven-met-peuters',         title: 'Eindhoven met peuters en kleuters: dagplanning' },
    { slug: 'dagje-uit-met-kleuter-4-6-jaar', title: 'Dagje uit met kleuter (4-6): 25 ideeën' },
  ],
  'groningen':            [
    { slug: 'groningen-met-peuters',         title: 'Groningen met peuters en kleuters: keuzes per dagdeel' },
  ],
  'breda':                [
    { slug: 'breda-met-peuters',             title: 'Breda met peuters en kleuters: complete gids' },
  ],
  'nijmegen':             [
    { slug: 'nijmegen-met-peuters',          title: 'Nijmegen met peuters en kleuters: ontspannen dag' },
  ],
  'amersfoort':           [
    { slug: 'amersfoort-met-peuters',        title: 'Amersfoort met peuters en kleuters: praktische gids' },
  ],
  'utrechtse-heuvelrug':  [
    { slug: 'pannenkoekenboerderijen-utrecht-heuvelrug', title: 'Pannenkoeken op de Heuvelrug' },
  ],
};

let publishedBlogSlugCache = null;
function getPublishedBlogSlugSet() {
  if (publishedBlogSlugCache) return publishedBlogSlugCache;
  const postsDir = path.join(ROOT, 'content', 'posts');
  const result = new Set();

  if (!fs.existsSync(postsDir)) {
    publishedBlogSlugCache = result;
    return result;
  }

  const todayAmsterdam = todayISOAmsterdam();
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    if (!matter) {
      result.add(slug);
      continue;
    }

    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const { data: fm } = matter(raw);
    const parsedDate = fm.date ? new Date(fm.date) : new Date();
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const dateStr = isoDateInTimeZone(safeDate, 'Europe/Amsterdam');
    if (dateStr <= todayAmsterdam) result.add(slug);
  }

  publishedBlogSlugCache = result;
  return result;
}

function buildMetaDesc(loc, region) {
  const typeNoun = TYPE_SINGULAR[loc.type] || 'uitje';
  const parts = [];
  const locality = loc.seo_primary_locality ? ` bij ${loc.seo_primary_locality}` : '';
  if (loc.toddler_highlight) {
    const firstSentence = cleanToddlerHighlight(loc.toddler_highlight).split(/[.!?]/)[0].trim();
    if (firstSentence.length > 20) parts.push(firstSentence);
  }
  const facilities = [];
  if (loc.diaper) facilities.push('luierruimte');
  if (loc.coffee) facilities.push('koffie voor ouders');
  if (['indoor', 'hybrid', 'both'].includes(loc.weather)) facilities.push('ook bij slecht weer');
  const facilityStr = facilities.length > 0 ? ` Met ${facilities.join(' en ')}.` : '';

  const practicalTail = 'Bekijk waarom deze plek werkt, welke voorzieningen er zijn en welke alternatieven in de buurt liggen via PeuterPlannen.';
  if (parts.length > 0) {
    return `${loc.name}${locality} in ${region.name}: ${parts[0].charAt(0).toLowerCase() + parts[0].slice(1)}. ${typeNoun.charAt(0).toUpperCase() + typeNoun.slice(1)} voor peuters en kleuters${facilityStr} ${practicalTail}`;
  }
  return `${loc.name}${locality} in ${region.name} is een ${typeNoun} voor peuters en dreumesen.${facilityStr} ${practicalTail}`;
}

function truncateDesc(text, max = 155) {
  if (!text || text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return (cut > 80 ? text.slice(0, cut) : text.slice(0, max)) + '…';
}

function buildLocationPracticalBullets(loc) {
  const bullets = [];
  if (loc.time_of_day_fit) {
    const labels = { morning: 'Werkt vooral goed in de ochtend.', midday: 'Past het best als lunch- of middagstop.', fullday: 'Kan de hoofdmoot van de dag dragen.' };
    bullets.push(labels[loc.time_of_day_fit] || '');
  }
  if (loc.rain_backup_quality === 'strong') bullets.push('Ook bruikbaar als het weer omslaat of nat blijft.');
  if (loc.buggy_friendliness === 'easy') bullets.push('Logistiek relatief prettig met buggy of jongere broertjes en zusjes.');
  if (loc.toilet_confidence === 'high') bullets.push('Sanitaire basis voelt hier voorspelbaar en praktisch.');
  if (loc.play_corner_quality === 'strong') bullets.push('Er is genoeg te doen om een korte stop niet meteen te laten vastlopen.');
  if (loc.parking_ease === 'easy') bullets.push('Aankomen en uitstappen is hier meestal minder gedoe dan gemiddeld.');
  if (loc.food_fit === 'strong') bullets.push('Handig als je spelen en iets eten in één stop wilt combineren.');
  return bullets.filter(Boolean).slice(0, 4);
}

function buildLocationTrustBits(loc) {
  const bits = [];
  const verificationLabels = {
    editorial: 'redactioneel beoordeeld',
    partner: 'door locatie-eigenaar aangevuld',
    parent_signal: 'aangevuld met oudersignalen',
    web_verified: 'gecontroleerd op de eigen website',
    phone_verified: 'telefonisch gecheckt',
    visit_verified: 'op locatie geverifieerd',
  };
  if (loc.verification_mode && verificationLabels[loc.verification_mode]) {
    bits.push(`Status: ${verificationLabels[loc.verification_mode]}.`);
  } else if (loc.last_verified_at) {
    bits.push('Status: recent opnieuw gecontroleerd.');
  }
  if (typeof loc.verification_confidence === 'number' && Number.isFinite(loc.verification_confidence)) {
    const pct = Math.round(Math.max(0, Math.min(1, loc.verification_confidence)) * 100);
    bits.push(`Vertrouwensniveau ${pct}%.`);
  }
  if (loc.last_context_refresh_at) {
    const refreshed = formatEditorialDate(loc.last_context_refresh_at);
    if (refreshed) bits.push(`Context bijgewerkt op ${refreshed}.`);
  }
  return bits.slice(0, 3);
}

function buildLocationDecisionHTML(loc, region) {
  const bullets = buildLocationPracticalBullets(loc);
  const trustBits = buildLocationTrustBits(loc);
  const bestFor = [];
  if (loc.min_age != null || loc.max_age != null) {
    if (loc.min_age == null) bestFor.push(`werkt vooral vanaf ongeveer ${loc.max_age} jaar of jonger`);
    else if (loc.max_age == null) bestFor.push(`past vooral vanaf ${loc.min_age} jaar`);
    else bestFor.push(`sluit het best aan bij ongeveer ${loc.min_age}–${loc.max_age} jaar`);
  }
  if (loc.weather === 'indoor') bestFor.push('is sterk als slechtweer-optie');
  if (loc.weather === 'outdoor') bestFor.push('werkt vooral op droge dagen');
  if (loc.weather === 'hybrid' || loc.weather === 'both') bestFor.push('blijft bruikbaar bij wisselvallig weer');
  if (loc.coffee && loc.diaper) bestFor.push('is praktisch als je spelen, koffie en verschonen wilt combineren');
  else if (loc.coffee) bestFor.push('werkt goed als rustige koffie- of lunchstop');
  else if (loc.diaper) bestFor.push('is handig op dagen met weinig logistieke marge');

  const bestForSentence = bestFor.length
    ? `<p class="location-highlight"><strong>Beste keuze als je iets zoekt dat</strong> ${escapeHtml(bestFor.join(', '))}.</p>`
    : '';
  const practicalHTML = bullets.length
    ? `<div class="related-blogs">
      <h3>Handig om vooraf te weten</h3>
      <ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>`
    : '';
  const trustHTML = trustBits.length
    ? `<div class="related-blogs">
      <h3>Waarom deze info te vertrouwen is</h3>
      <ul>${trustBits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <p style="margin-top:12px;"><a href="/methode/">Lees hoe PeuterPlannen locaties selecteert en controleert</a>.</p>
    </div>`
    : '';

  return `${bestForSentence}${practicalHTML}${trustHTML}`;
}

function locationPageHTML(loc, region, similarLocs) {
  const fullUrl = `https://peuterplannen.nl${loc.pageUrl}`;
  const typeLabel = TYPE_MAP[loc.type]?.label || loc.type;
  const regionDisplayName = region.subtitleLabel || region.name;
  const rawDesc = isFillerDescription(loc.description) ? '' : (loc.description || '');
  const metaDesc = (loc.seo_description_override || '').trim()
    || (rawDesc.length >= SEO_DESCRIPTION_MIN_LENGTH ? truncateDesc(rawDesc) : '')
    || buildMetaDesc(loc, region);
  const visibleDescription = rawDesc || metaDesc.replace(/\s*Bekijk waarom deze plek werkt[\s\S]*$/i, '').trim();
  const localityLabel = (loc.seo_primary_locality || '').trim();
  const titleBase = loc.seo_title_override
    ? loc.seo_title_override.trim()
    : (localityLabel && loc.seoDuplicateGroupSize > 1 ? `${loc.name} ${localityLabel}` : loc.name);
  const introOverride = (loc.seo_intro_override || '').trim();
  const editorialBody = loc.seo_repo_body_html || '';
  const clusterLinks = getClusterPagesForLocation(loc);

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
  const normalizedWebsite = normalizeExternalUrl(loc.website);
  if (normalizedWebsite) infoItems.push(`<div class="info-item"><div><div class="info-label">Website</div><div class="info-value"><a href="${escapeHtml(normalizedWebsite)}" target="_blank" rel="noopener" aria-label="Website van ${escapeHtml(loc.name)}">${escapeHtml(displayExternalUrl(normalizedWebsite))}</a></div></div></div>`);

  const regionSlug = (region.slug || '').toLowerCase();
  const publishedBlogSlugs = getPublishedBlogSlugSet();
  const editorialBlogEntries = getBlogEntriesBySlug(loc.seo_related_blog_slugs || []);
  const relatedBlogs = [
    ...editorialBlogEntries.map((entry) => ({ slug: entry.slug, title: entry.title })),
    ...(REGION_BLOG_MAP[regionSlug] || []).filter((b) => publishedBlogSlugs.has(b.slug)),
  ].filter((entry, index, arr) => arr.findIndex((candidate) => candidate.slug === entry.slug) === index);
  const blogLinksHTML = relatedBlogs.length > 0
    ? `<div class="related-blogs">
      <h3>Meer inspiratie</h3>
      <ul>${relatedBlogs.map(b =>
        `<li><a href="/blog/${b.slug}/">${b.title}</a></li>`
      ).join('')}</ul>
    </div>`
    : '';
  const clusterLinksHTML = clusterLinks.length > 0
    ? `<div class="related-blogs">
      <h3>Past ook binnen deze routes</h3>
      <ul>${clusterLinks.map((cluster) => `<li><a href="/${cluster.slug}.html">${cluster.h1}</a></li>`).join('')}</ul>
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
  const decisionContextHTML = buildLocationDecisionHTML(loc, region);

  // JSON-LD
  const schemaType = (loc.type === 'horeca' || loc.type === 'pancake')
    ? ['FoodEstablishment', 'TouristAttraction']
    : 'TouristAttraction';
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": schemaType,
    "name": loc.name,
    "description": metaDesc,
    "url": fullUrl,
    ...(normalizedWebsite && { "sameAs": normalizedWebsite }),
    ...(loc.lat && loc.lng && {
      "geo": { "@type": "GeoCoordinates", "latitude": loc.lat, "longitude": loc.lng }
    }),
    "address": { "@type": "PostalAddress", "addressLocality": localityLabel || region.name, "addressCountry": "NL" },
    ...(facilities.length > 0 && {
      "amenityFeature": facilities.map(f => ({ "@type": "LocationFeatureSpecification", "name": f, "value": true }))
    }),
    "audience": { "@type": "Audience", "audienceType": "Gezinnen met jonge kinderen (0-7 jaar)" },
    "touristType": "Gezinnen met peuters",
    ...(loc.type === 'pancake' && { "servesCuisine": "Pannenkoeken" }),
    ...(loc.type === 'horeca'  && { "servesCuisine": "Kindvriendelijk" })
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
      link.href = 'https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.css';
      document.head.appendChild(link);
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.js';
      s.onload = function() {
        var map = new maplibregl.Map({
          container: 'map',
          style: 'https://tiles.openfreemap.org/styles/positron',
          center: [${loc.lng}, ${loc.lat}],
          zoom: 14,
          attributionControl: false
        });
        new maplibregl.Marker({ color: '#D4775A' }).setLngLat([${loc.lng}, ${loc.lat}]).addTo(map);
      };
      document.head.appendChild(s);
    }
  }, { rootMargin: '200px' });
  var mapContainer = document.getElementById('map-container');
  if (mapContainer) observer.observe(mapContainer);
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
  const detailTitle = `${titleBase} — peuteruitje in ${region.name} | PeuterPlannen`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon(`\n  <link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin>`)}
  <title>${escapeHtml(detailTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="robots" content="${loc.seoRobots || 'index,follow'}">
  <link rel="canonical" href="${fullUrl}">
  <meta property="og:title" content="${escapeHtml(detailTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${TYPE_OG_IMAGE[loc.type] || DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(titleBase)} — peuteruitje in ${escapeHtml(region.name)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(detailTitle)}">
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

<div class="hero hero-location">
  <span class="hero-location-badge">${typeLabel}</span>
  <p class="hero-location-title">${escapeHtml(loc.name)}</p>
  <p class="hero-location-sub">in <a href="/${region.slug}.html">${regionDisplayName}</a></p>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/${region.slug}.html">${region.name}</a> &rsaquo; ${escapeHtml(loc.name)}
</nav>

<main id="main-content">
  <div class="location-header">
    <h1>${escapeHtml(titleBase)}</h1>
    <p class="location-subtitle">${typeLabel} in ${regionDisplayName}${localityLabel && !titleBase.includes(localityLabel) ? ` · ${escapeHtml(localityLabel)}` : ''}</p>
  </div>

  ${introOverride ? `<div class="location-highlight"><strong>Waarom dit werkt:</strong> ${escapeHtml(introOverride)}</div>` : ''}
  ${visibleDescription ? `<p class="location-description">${escapeHtml(visibleDescription)}</p>` : ''}
  ${editorialBody ? `${editorialMetaHTML({ editorial_label: 'PeuterPlannen redactie', updated_at: loc.seo_repo_updated_at })}${editorialBodyHTML({ bodyHtml: editorialBody }, 'location-editorial')}` : ''}

  ${loc.toddler_highlight ? `<div class="location-highlight"><strong>Peutertip:</strong> ${escapeHtml(cleanToddlerHighlight(loc.toddler_highlight))}</div>` : ''}
  ${decisionContextHTML}

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
  <p class="map-attribution">Kaart: &copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>` : ''}

  ${similarHTML}

  ${blogLinksHTML}
  ${clusterLinksHTML}
  <div class="related-blogs">
    <h3>Praktische context</h3>
    <ul>
      <li><a href="/methode/">Lees hoe PeuterPlannen locaties selecteert</a></li>
      <li><a href="/${region.slug}.html">Terug naar de regiogids van ${escapeHtml(region.name)}</a></li>
      ${TYPE_MAP[loc.type]?.slug ? `<li><a href="/${TYPE_MAP[loc.type].slug}.html">Bekijk alle ${escapeHtml(TYPE_MAP[loc.type].label)} in Nederland</a></li>` : ''}
    </ul>
  </div>

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

function aliasLocationPageHTML(loc, canonicalLoc) {
  const canonicalUrl = fullSiteUrl(canonicalLoc.pageUrl);
  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(loc.name)} is verhuisd | PeuterPlannen</title>
  <meta name="robots" content="noindex,follow">
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}">
  <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
  <main id="main-content" style="padding:120px 24px;max-width:720px;margin:0 auto;">
    <h1>Deze locatiepagina is verhuisd</h1>
    <p>Je wordt doorgestuurd naar de actuele pagina van ${escapeHtml(canonicalLoc.name)}.</p>
    <p><a href="${canonicalUrl}">Ga naar de actuele pagina</a></p>
  </main>
  ${analyticsHTML()}
</body>
</html>`;
}

function generateLocationPages(data) {
  const { regions, locations } = data;
  const regionMap = {};
  const byId = new Map();
  regions.forEach(r => { regionMap[r.slug] = r; });
  locations.forEach((loc) => byId.set(Number(loc.id), loc));

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
    const expectedSlugs = new Set(locs.map((loc) => loc.locSlug));

    // Create region directory
    const regionDir = path.join(ROOT, rSlug);
    if (!fs.existsSync(regionDir)) fs.mkdirSync(regionDir, { recursive: true });

    for (const loc of locs) {
      // Find similar locations (same region, same type first, then others)
      const rankedPool = sortLocationsForSeo(locs.filter((candidate) => candidate !== loc && candidate.seoTierResolved !== 'alias'));
      const sameType = rankedPool.filter(l => l.type === loc.type).slice(0, 3);
      const otherType = rankedPool.filter(l => l.type !== loc.type).slice(0, 6 - sameType.length);
      const similar = [...sameType, ...otherType].slice(0, 6);
      const canonicalTarget = loc.seoTierResolved === 'alias' ? byId.get(Number(loc.seo_canonical_target)) : null;
      const html = canonicalTarget ? aliasLocationPageHTML(loc, canonicalTarget) : locationPageHTML(loc, region, similar);

      const locDir = path.join(regionDir, loc.locSlug);
      if (!fs.existsSync(locDir)) fs.mkdirSync(locDir, { recursive: true });

      fs.writeFileSync(path.join(locDir, 'index.html'), html);
      count++;
    }

    for (const entry of fs.readdirSync(regionDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (expectedSlugs.has(entry.name)) continue;
      const staleDir = path.join(regionDir, entry.name);
      const staleIndex = path.join(staleDir, 'index.html');
      if (fs.existsSync(staleIndex)) {
        fs.rmSync(staleDir, { recursive: true, force: true });
      }
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
    const parsedDate = fm.date ? new Date(fm.date) : new Date();
    const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const dateStr = isoDateInTimeZone(safeDate, 'Europe/Amsterdam');
    const dateDisplay = formatDateNL(safeDate);

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
  }

  // Sort posts by date descending
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const todayAmsterdam = todayISOAmsterdam();
  const publishedPosts = posts.filter((p) => p.date <= todayAmsterdam);
  const unpublishedPosts = posts.filter((p) => p.date > todayAmsterdam);

  if (unpublishedPosts.length > 0) {
    console.log(`  Scheduled posts hidden (${unpublishedPosts.length}) — publish after local date in Europe/Amsterdam`);
  }

  // Remove stale generated blog pages that should not be live.
  const publishedSet = new Set(publishedPosts.map((p) => p.slug));
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!publishedSet.has(entry.name)) {
      fs.rmSync(path.join(blogDir, entry.name), { recursive: true, force: true });
    }
  }

  // Generate individual post pages for published posts only.
  for (const p of publishedPosts) {
    const postDir = path.join(blogDir, p.slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });
    const postTitle = `${p.title} | PeuterPlannen Blog`;
    const postDescription = p.description || '';

    const postHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(postTitle)}</title>
  <meta name="description" content="${escapeHtml(postDescription)}">
  <link rel="canonical" href="https://peuterplannen.nl/blog/${p.slug}/">
  <meta property="og:title" content="${escapeHtml(postTitle)}">
  <meta property="og:description" content="${escapeHtml(postDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/blog/${p.slug}/">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/${p.featured_image ? p.featured_image.replace(/^\//, '') : 'homepage_hero_ai.jpeg'}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(p.title)} | PeuterPlannen">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(postTitle)}">
  <meta name="twitter:description" content="${escapeHtml(postDescription)}">
  <meta name="twitter:image" content="https://peuterplannen.nl/${p.featured_image ? p.featured_image.replace(/^\//, '') : 'homepage_hero_ai.jpeg'}">
  <script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": p.title,
  "description": postDescription,
  "datePublished": p.date,
  "author": { "@type": "Person", "name": "Bas Metten" },
  "publisher": { "@type": "Organization", "name": "PeuterPlannen" },
  "url": `https://peuterplannen.nl/blog/${p.slug}/`,
  "mainEntityOfPage": `https://peuterplannen.nl/blog/${p.slug}/`
}, null, 2)}
  </script>
</head>
<body>

${navHTML()}

${p.featured_image ? `<div class="blog-hero-img" style="max-width:1100px;margin:80px auto 0;padding:0 24px;"><picture><source type="image/webp" srcset="${p.featured_image.replace(/\.jpe?g$/, '.webp')}"><img src="${p.featured_image}" alt="${escapeHtml(p.title)}" style="width:100%;height:auto;border-radius:16px;max-height:400px;object-fit:cover;" loading="eager"></picture></div>` : ''}
<div class="hero" style="padding: ${p.featured_image ? '24px' : '100px'} 24px 40px;">
  <h1>${escapeHtml(p.title)}</h1>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/blog/">Inspiratie</a> &rsaquo; ${escapeHtml(p.title)}
</nav>

<main id="main-content">
  <p class="blog-meta">${p.dateDisplay}${p.tags?.length ? ' &middot; ' + p.tags.join(', ') : ''}</p>

  <div class="blog-content">
    ${p.content}
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

<script>
(function(){
  var bar=document.createElement('div');
  bar.style.cssText='position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--primary),var(--accent));z-index:9999;transition:width 0.1s linear;border-radius:0 2px 2px 0;pointer-events:none;';
  document.body.prepend(bar);
  window.addEventListener('scroll',function(){var h=document.documentElement;var pct=h.scrollTop/(h.scrollHeight-h.clientHeight)*100;bar.style.width=Math.min(pct,100)+'%';},{passive:true});
})();
</script>
${analyticsHTML()}
</body>
</html>`;

    fs.writeFileSync(path.join(postDir, 'index.html'), postHTML);
    console.log(`  blog/${p.slug}/index.html`);
  }

  // Generate blog index
  const postCards = publishedPosts.map(p => `
    <article class="blog-card">
      ${p.featured_image ? `<a href="/blog/${p.slug}/"><picture><source type="image/webp" srcset="${p.featured_image.replace(/\.jpe?g$/, '-400w.webp')} 400w, ${p.featured_image.replace(/\.jpe?g$/, '.webp')}" sizes="(max-width: 768px) 100vw, 400px"><img src="${p.featured_image}" alt="${escapeHtml(p.title)}" class="blog-card-thumb" loading="lazy"></picture></a>` : ''}
      <p class="blog-card-kicker">${escapeHtml((p.tags[0] || 'Gezinsgids')).toUpperCase()}</p>
      <h2><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
      <p class="blog-date">${p.dateDisplay}</p>
      <p class="blog-excerpt">${escapeHtml(p.description)}</p>
      ${p.tags.length > 0 ? `<div class="blog-tags">${p.tags.map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </article>`).join('\n');

  const blogIndexLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "PeuterPlannen Blog",
    "description": "Tips, inspiratie en praktische gidsen voor uitjes met peuters en kleuters in Nederland.",
    "url": "https://peuterplannen.nl/blog/",
    "publisher": {
      "@type": "Organization",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl/"
    }
  }, null, 2);
  const featuredBlogTags = Array.from(new Set(publishedPosts.flatMap((p) => p.tags || []))).slice(0, 8);
  const cityGuidePosts = publishedPosts.filter((p) => /(met-peuters|met-peuters-en-kleuters)/.test(p.slug)).slice(0, 6);
  const practicalGuidePosts = publishedPosts.filter((p) => !cityGuidePosts.includes(p)).slice(0, 6);
  const blogIndexTitle = 'Blog — Tips voor uitjes met peuters | PeuterPlannen';
  const blogIndexDescription = 'Redactionele gidsen voor ouders met peuters en kleuters: regiokeuzes, regenroutes, horeca-tips en werkbare dagindelingen voor Nederland.';

  const indexHTML = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(blogIndexTitle)}</title>
  <meta name="description" content="${escapeHtml(blogIndexDescription)}">
  <link rel="canonical" href="https://peuterplannen.nl/blog/">
  <link rel="alternate" type="application/rss+xml" title="PeuterPlannen Blog" href="https://peuterplannen.nl/blog/feed.xml">
  <meta property="og:title" content="${escapeHtml(blogIndexTitle)}">
  <meta property="og:description" content="${escapeHtml(blogIndexDescription)}">
  <meta property="og:url" content="https://peuterplannen.nl/blog/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <meta property="og:image:width" content="1408">
  <meta property="og:image:height" content="768">
  <meta property="og:image:alt" content="PeuterPlannen Blog — uitjes voor peuters in Nederland">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(blogIndexTitle)}">
  <meta name="twitter:description" content="${escapeHtml(blogIndexDescription)}">
  <meta name="twitter:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <script type="application/ld+json">
${blogIndexLd}
  </script>
</head>
<body>

${navHTML()}

<div class="hero hero-blog">
  <p class="hero-kicker">PeuterPlannen redactie</p>
  <h1 class="hero-blog-title">Inspiratie voor dagen die echt werken</h1>
  <p class="hero-blog-sub">Praktische gidsen, rustige tips en slimme routes voor ouders met peuters en kleuters. Minder generiek zoeken, sneller een dag die klopt.</p>
  <div class="hero-blog-meta">
    <span>${publishedPosts.length} gidsen</span>
    <span>Nederland breed</span>
    <span>Voor peuters en kleuters</span>
  </div>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; Inspiratie
</nav>

<main id="main-content">
  <section class="guide-section blog-guide">
    <div class="guide-card">
      <p class="guide-kicker">Wat je hier krijgt</p>
      <h2>Geen generieke lijstjes, wel gidsen waar je direct iets aan hebt</h2>
      <p>Deze blog is geschreven voor ouders die sneller een werkbare dag willen plannen. Daarom combineren we regiogidsen, regenopties, horeca-keuzes en leeftijdsspecifieke tips tot artikelen die logisch op elkaar aansluiten.</p>
      <div class="coverage-chip-row">
        ${featuredBlogTags.map((tag) => `<span class="coverage-chip">${escapeHtml(tag)}</span>`).join('')}
      </div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Stadsgidsen</p>
      <h2>Begin met een regio die op jouw dag lijkt</h2>
      <div class="guide-links">
        ${cityGuidePosts.map((p) => `<a href="/blog/${p.slug}/" class="guide-link"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.description)}</span></a>`).join('')}
      </div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Praktische thema's</p>
      <h2>Of kies eerst op leeftijd, regen of budget</h2>
      <div class="guide-links">
        ${practicalGuidePosts.map((p) => `<a href="/blog/${p.slug}/" class="guide-link"><strong>${escapeHtml(p.title)}</strong><span>${escapeHtml(p.description)}</span></a>`).join('')}
      </div>
    </div>
  </section>

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
  console.log(`  blog/index.html (${publishedPosts.length} posts)`);

  // Generate RSS feed
  const rssItems = publishedPosts.map(p => `    <item>
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

  return publishedPosts;
}

function formatDateNL(date) {
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// === 9. Build SEO registry + split sitemaps ===

function sitePathToFile(sitePath) {
  const clean = cleanPathLike(sitePath);
  if (clean === '/') return path.join(ROOT, 'index.html');
  if (clean.endsWith('/')) return path.join(ROOT, clean.slice(1), 'index.html');
  return path.join(ROOT, clean.slice(1));
}

function buildPageCatalog(data, blogPosts, clusterPages, sharedPages = []) {
  const pages = [];
  const lastmod = todayISO();

  const pushPage = (page) => pages.push({
    inSitemap: false,
    robots: 'index,follow',
    hasGscSignal: false,
    lastmod,
    ...page,
  });

  pushPage({ path: '/', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'index.html'), priority: '1.0', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/app.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'app.html'), priority: '0.9', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/about.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'about.html'), priority: '0.5', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/contact.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'contact.html'), priority: '0.4', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/blog/', pageType: 'blog_index', tier: 'hub', filePath: path.join(ROOT, 'blog', 'index.html'), priority: '0.8', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/ontdekken/', pageType: 'discover_hub', tier: 'hub', filePath: path.join(ROOT, 'ontdekken', 'index.html'), priority: '0.82', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/methode/', pageType: 'methodology_page', tier: 'hub', filePath: path.join(ROOT, 'methode', 'index.html'), priority: '0.55', changefreq: 'monthly', inSitemap: true });

  for (const region of data.regions) {
    pushPage({
      path: `/${region.slug}.html`,
      pageType: 'region_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${region.slug}.html`),
      priority: region.tier === 'primary' ? '0.85' : '0.75',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const page of TYPE_PAGES) {
    pushPage({
      path: `/${page.slug}.html`,
      pageType: 'type_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${page.slug}.html`),
      priority: '0.8',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const cluster of clusterPages) {
    pushPage({
      path: `/${cluster.slug}.html`,
      pageType: 'cluster_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${cluster.slug}.html`),
      priority: '0.78',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const post of blogPosts || []) {
    pushPage({
      path: `/blog/${post.slug}/`,
      pageType: 'blog_article',
      tier: 'hub',
      filePath: path.join(ROOT, 'blog', post.slug, 'index.html'),
      priority: '0.65',
      changefreq: 'monthly',
      lastmod: post.date,
      inSitemap: true,
    });
  }

  for (const page of sharedPages || []) {
    if (!page?.path || page.path === '/ontdekken/' || page.path === '/methode/') continue;
    pushPage({
      path: page.path,
      pageType: 'shared_editorial',
      tier: 'hub',
      filePath: sitePathToFile(page.path),
      priority: '0.6',
      changefreq: 'monthly',
      inSitemap: true,
    });
  }

  for (const loc of data.locations) {
    pushPage({
      path: loc.pageUrl,
      pageType: 'location_detail',
      tier: loc.seoTierResolved,
      filePath: sitePathToFile(loc.pageUrl),
      priority: loc.seoTierResolved === 'index' ? '0.64' : '0.3',
      changefreq: 'monthly',
      lastmod: loc.last_verified_at || lastmod,
      inSitemap: loc.seoTierResolved === 'index' && !loc.seo_exclude_from_sitemap,
      robots: loc.seoRobots,
      hasGscSignal: !!loc.seoHasGscSignal,
      qualityScore: loc.seoQualityScore,
      parentHubPath: `/${loc.regionSlug}.html`,
      typeHubPath: TYPE_MAP[loc.type]?.slug ? `/${TYPE_MAP[loc.type].slug}.html` : null,
    });
  }

  return pages;
}

function writeUrlSet(fileName, pages) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url>\n    <loc>${fullSiteUrl(page.path)}</loc>\n    <lastmod>${page.lastmod || todayISO()}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, fileName), xml);
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function generateSitemapsFromCatalog(catalog) {
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^sitemap-locations-\d+\.xml$/.test(entry.name)) continue;
    fs.rmSync(path.join(ROOT, entry.name), { force: true });
  }

  const corePages = catalog.filter((page) => page.inSitemap && page.tier === 'core');
  const hubPages = catalog.filter((page) => page.inSitemap && page.tier === 'hub' && !['blog_index', 'blog_article'].includes(page.pageType));
  const blogPages = catalog.filter((page) => page.inSitemap && ['blog_index', 'blog_article'].includes(page.pageType));
  const locationPages = catalog.filter((page) => page.inSitemap && page.pageType === 'location_detail');

  const sitemapFiles = [];
  if (corePages.length) {
    writeUrlSet('sitemap-core.xml', corePages);
    sitemapFiles.push('sitemap-core.xml');
  }
  if (hubPages.length) {
    writeUrlSet('sitemap-hubs.xml', hubPages);
    sitemapFiles.push('sitemap-hubs.xml');
  }
  if (blogPages.length) {
    writeUrlSet('sitemap-blog.xml', blogPages);
    sitemapFiles.push('sitemap-blog.xml');
  }
  chunk(locationPages, 500).forEach((group, idx) => {
    const fileName = `sitemap-locations-${String(idx + 1).padStart(2, '0')}.xml`;
    writeUrlSet(fileName, group);
    sitemapFiles.push(fileName);
  });

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapFiles.map((fileName) => `  <sitemap>\n    <loc>https://peuterplannen.nl/${fileName}</loc>\n    <lastmod>${todayISO()}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indexXml);
  console.log(`Updated sitemap.xml index (${sitemapFiles.length} files, ${catalog.filter((page) => page.inSitemap).length} indexable URLs)`);
  return sitemapFiles;
}

function extractMetaContent(html, name) {
  const match = html.match(new RegExp(`<meta\\s+name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

function extractPropertyContent(html, property) {
  const match = html.match(new RegExp(`<meta\\s+property="${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

function extractCanonicalHref(html) {
  const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return match ? match[1].trim() : '';
}

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlForSlopAudit(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<div class="guide-links"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="cities-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="blog-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="blog-tags"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<section class="blog-grid-section"[\s\S]*?<\/section>/gi, ' ')
    .replace(/<section class="regions-section"[\s\S]*?<\/section>/gi, ' ')
    .replace(/<div class="loc-list"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="loc-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="related-links"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countInternalLinks(html) {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith('/') || href.startsWith('https://peuterplannen.nl'))
    .length;
}

function hasInternalLinkTo(html, targetPath) {
  if (!targetPath) return false;
  const canonicalTarget = cleanPathLike(targetPath);
  const fullTarget = fullSiteUrl(canonicalTarget);
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .some((href) => cleanPathLike(href) === canonicalTarget || href === fullTarget);
}

function countPatternHits(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const matches = `${text || ''}`.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function buildSeoRegistry(catalog) {
  const registry = [];
  for (const page of catalog) {
    if (!fs.existsSync(page.filePath)) {
      registry.push({
        url: fullSiteUrl(page.path),
        path: cleanPathLike(page.path),
        page_type: page.pageType,
        tier: page.tier,
        error: 'missing_file',
      });
      continue;
    }
    const html = fs.readFileSync(page.filePath, 'utf8');
    const text = stripHtml(html);
    const slopAuditText = stripHtmlForSlopAudit(html);
    registry.push({
      url: fullSiteUrl(page.path),
      path: cleanPathLike(page.path),
      page_type: page.pageType,
      tier: page.tier,
      canonical: extractCanonicalHref(html),
      title: extractTitle(html),
      description: extractMetaContent(html, 'description'),
      og_title: extractPropertyContent(html, 'og:title'),
      og_description: extractPropertyContent(html, 'og:description'),
      twitter_title: extractMetaContent(html, 'twitter:title'),
      twitter_description: extractMetaContent(html, 'twitter:description'),
      robots: extractMetaContent(html, 'robots') || page.robots || 'index,follow',
      in_sitemap: page.inSitemap,
      wordcount: text ? text.split(/\s+/).filter(Boolean).length : 0,
      internal_link_count: countInternalLinks(html),
      methodology_link_present: hasInternalLinkTo(html, '/methode/'),
      parent_hub_link_present: hasInternalLinkTo(html, page.parentHubPath),
      type_hub_link_present: hasInternalLinkTo(html, page.typeHubPath),
      slop_phrase_hits: countPatternHits(slopAuditText, AI_SLOP_PATTERNS),
      has_gsc_signal: !!page.hasGscSignal,
      quality_score: page.qualityScore ?? null,
      lastmod: page.lastmod,
      file: path.relative(ROOT, page.filePath).replace(/\\/g, '/'),
    });
  }

  const indexable = registry.filter((entry) => ['core', 'hub', 'index'].includes(entry.tier));
  const titleCounts = new Map();
  for (const entry of indexable) {
    if (!entry.title) continue;
    titleCounts.set(entry.title, (titleCounts.get(entry.title) || 0) + 1);
  }
  for (const entry of registry) {
    entry.duplicate_status = titleCounts.get(entry.title) > 1 ? 'duplicate_indexable_title' : 'unique';
  }

  const errors = [];
  for (const entry of registry.filter((row) => row.error === 'missing_file' && ['core', 'hub', 'index'].includes(row.tier))) {
    errors.push(`Missing generated file: ${entry.path || entry.url}`);
  }
  for (const entry of indexable) {
    if (!entry.title) errors.push(`Missing <title>: ${entry.path}`);
    if (!entry.canonical) errors.push(`Missing canonical: ${entry.path}`);
    if (!entry.description || entry.description.length < SEO_DESCRIPTION_MIN_LENGTH) errors.push(`Weak description: ${entry.path}`);
    if (entry.og_title && entry.og_title !== entry.title) errors.push(`Title mismatch OG: ${entry.path}`);
    if (entry.twitter_title && entry.twitter_title !== entry.title && !entry.twitter_title.includes('PeuterPlannen')) errors.push(`Title mismatch Twitter: ${entry.path}`);
    if (entry.og_description && entry.og_description !== entry.description) errors.push(`Description mismatch OG: ${entry.path}`);
    if (entry.twitter_description && entry.twitter_description !== entry.description) errors.push(`Description mismatch Twitter: ${entry.path}`);
    if (['region_hub', 'type_hub', 'cluster_hub', 'blog_index', 'blog_article', 'location_detail'].includes(entry.page_type)
      && GENERIC_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(entry.description || ''))) {
      errors.push(`Generic description: ${entry.path}`);
    }
    if (entry.page_type === 'location_detail' && entry.tier === 'index' && !entry.parent_hub_link_present) {
      errors.push(`Missing parent hub link: ${entry.path}`);
    }
    if (entry.duplicate_status !== 'unique') errors.push(`Duplicate indexable title: ${entry.title}`);
  }
  for (const entry of registry.filter((row) => row.tier === 'support')) {
    if (entry.in_sitemap) errors.push(`Support page in sitemap: ${entry.path}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    counts: registry.reduce((acc, entry) => {
      acc.total += 1;
      acc.by_tier[entry.tier] = (acc.by_tier[entry.tier] || 0) + 1;
      acc.by_type[entry.page_type] = (acc.by_type[entry.page_type] || 0) + 1;
      return acc;
    }, { total: 0, by_tier: {}, by_type: {} }),
    duplicate_indexable_titles: [...titleCounts.entries()].filter(([, count]) => count > 1).map(([title, count]) => ({ title, count })),
    errors,
    entries: registry,
  };

  const outDir = path.join(ROOT, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'seo-registry.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'seo-registry.md'), [
    '# SEO Registry',
    '',
    `- Generated: ${summary.generated_at}`,
    `- Total pages: ${summary.counts.total}`,
    `- By tier: ${Object.entries(summary.counts.by_tier).map(([tier, count]) => `${tier}=${count}`).join(', ')}`,
    `- By type: ${Object.entries(summary.counts.by_type).map(([type, count]) => `${type}=${count}`).join(', ')}`,
    `- Duplicate indexable titles: ${summary.duplicate_indexable_titles.length}`,
    `- Errors: ${errors.length}`,
    '',
  ].join('\n'));

  if (errors.length) {
    throw new Error(`SEO registry validation failed:\n- ${errors.slice(0, 25).join('\n- ')}`);
  }

  console.log(`Updated output/seo-registry.json (${registry.length} pages)`);
  return summary;
}

// === Main ===

async function main() {
  console.log('=== PeuterPlannen sync_all.js ===\n');

  const data = await fetchData();
  data.seoContent = mergeSeoContentLibrary(loadSeoContentLibrary(), data.editorialPages);
  LOCATION_COUNT = data.locations.length;

  console.log('Computing slugs...');
  computeSlugs(data);
  applyRepoSeoOverrides(data);
  applySeoPolicy(data);

  console.log('\nUpdating static pages...');
  updateIndex(data);
  updateApp(data);
  updateAbout(data);
  updateManifest(data);
  update404(data);

  console.log('\nGenerating city pages...');
  generateCityPages(data);

  console.log('\nGenerating type pages...');
  generateTypePages(data);

  console.log('\nGenerating cluster pages...');
  const clusterPages = generateClusterPages(data);

  console.log('\nGenerating shared editorial pages...');
  const sharedPages = [generateDiscoverPage(data), generateMethodologyPage(data)].filter(Boolean);

  console.log('\nGenerating location pages...');
  generateLocationPages(data);

  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nUpdating redirects...');
  updateRedirects(data);

  console.log('\nGenerating split sitemaps...');
  const catalog = buildPageCatalog(data, blogPosts, clusterPages, sharedPages);
  generateSitemapsFromCatalog(catalog);

  console.log('\nBuilding SEO registry...');
  buildSeoRegistry(catalog);

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

  console.log('\nRefreshing asset versions on hand-written pages...');
  [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'about.html'),
    path.join(ROOT, 'contact.html'),
    path.join(ROOT, 'app.html'),
    path.join(ROOT, '404.html'),
    path.join(ROOT, 'privacy', 'index.html'),
    path.join(ROOT, 'disclaimer', 'index.html'),
    path.join(ROOT, 'admin', 'index.html'),
    path.join(ROOT, 'partner', 'index.html'),
  ].forEach(rewriteAssetVersions);

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
