const fs = require('fs');
const path = require('path');

const SB_PROJECT = 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SB_URL = process.env.SUPABASE_URL || SB_PROJECT;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || Buffer.from('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==', 'base64').toString('utf8');
const ROOT = path.resolve(__dirname, '..', '..');
const CRITICAL_EDITORIAL_GUIDE_CSS = `
  .guide-section{display:grid;gap:18px;margin:36px 0}
  .guide-card{padding:24px 22px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,248,242,.94));border:1px solid var(--pp-border);box-shadow:0 16px 36px rgba(45,41,38,.08)}
  .guide-card-compact{padding:20px 18px}
  .guide-kicker{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--pp-text-secondary)}
  .guide-card h2,.guide-card h3{margin:0 0 12px;color:var(--pp-text);line-height:.98;letter-spacing:-.04em}
  .guide-card h2{font-size:clamp(28px,5vw,40px)}
  .guide-card h3{font-size:clamp(22px,4.2vw,28px)}
  .guide-card p,.guide-card li{color:var(--pp-text-secondary);font-size:16px;line-height:1.72}
  .guide-card-intro{max-width:58ch}
  .guide-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .guide-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;font-size:12px;font-weight:700;color:var(--pp-primary-dark);background:rgba(212,119,90,.08);border:1px solid var(--pp-border)}
  .guide-links{display:grid;gap:12px;margin-top:16px}
  .guide-link{display:grid;gap:4px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.78);border:1px solid rgba(45,41,38,.08);text-decoration:none;color:var(--pp-text);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
  .guide-link:visited{color:var(--pp-text)}
  .guide-link strong{font-size:15px;line-height:1.3}
  .guide-link span{font-size:13px;line-height:1.5;color:var(--pp-text-muted)}
  .guide-link:hover{transform:translateY(-1px);border-color:var(--pp-border-strong);box-shadow:0 10px 20px rgba(45,41,38,.08)}
  .editorial-meta{max-width:840px;margin:0 auto 18px;display:flex;flex-wrap:wrap;gap:10px;color:var(--pp-text-muted);font-size:13px}
  .editorial-meta span,.editorial-meta a{display:inline-flex;align-items:center;min-height:34px;padding:7px 12px;border-radius:999px;background:rgba(212,119,90,.08);border:1px solid var(--pp-border)}
  .editorial-meta a,.editorial-meta a:visited{color:var(--pp-primary-dark);font-weight:700;text-decoration:none}
  .editorial-body{max-width:840px;margin:0 auto 32px;padding:28px 24px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,248,242,.95));border:1px solid var(--pp-border);box-shadow:0 16px 36px rgba(45,41,38,.08)}
  .editorial-body h2,.editorial-body h3{margin:0 0 14px;color:var(--pp-text);line-height:.98;letter-spacing:-.05em}
  .editorial-body h2{font-size:clamp(28px,5vw,38px)}
  .editorial-body h3{font-size:clamp(22px,4vw,28px);margin-top:28px}
  .editorial-body p,.editorial-body li{font-size:17px;line-height:1.82;color:var(--pp-text-secondary)}
  .editorial-body a{color:var(--pp-primary-dark);font-weight:700;text-decoration:none;border-bottom:1px solid rgba(212,119,90,.32)}
  .editorial-support{max-width:840px;margin:-8px auto 0;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:16px}
  .editorial-support-card{background:rgba(255,255,255,.92);border:1px solid var(--pp-border);border-radius:18px;padding:18px 20px;box-shadow:0 12px 26px rgba(45,41,38,.06)}
  .editorial-support-card h3{margin:0 0 8px;font-size:18px;line-height:1.05;color:var(--pp-text)}
  .editorial-support-card p{font-size:14px;line-height:1.72;color:var(--pp-text-secondary)}
  .editorial-support-links{display:grid;gap:10px;margin-top:14px}
  .editorial-support-links a{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:rgba(250,247,242,.92);border:1px solid rgba(45,41,38,.08);text-decoration:none;color:var(--pp-text)}
  .editorial-support-links a:visited{color:var(--pp-text)}
  .editorial-support-links a strong{font-size:14px}
  .editorial-support-links a span{font-size:12px;line-height:1.5;color:var(--pp-text-muted)}
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
  culture: { label: 'Cultuur', slug: 'cultuur', labelSingle: 'Cultuur' },
};

const TYPE_LABELS_CITY = {
  play: 'Speeltuinen & Speelparadijzen',
  farm: 'Kinderboerderijen & Dieren',
  nature: 'Natuur & Buiten',
  museum: 'Musea & Ontdekken',
  swim: 'Zwembaden & Waterplezier',
  pancake: 'Pannenkoekenrestaurants',
  horeca: 'Kindvriendelijke Horeca',
  culture: 'Cultuur & Theater',
};

const TYPE_ORDER = ['play', 'farm', 'nature', 'museum', 'culture', 'swim', 'pancake', 'horeca'];

const TYPE_IMAGES = {
  play: '/images/categories/speeltuinen.png',
  farm: '/images/categories/kinderboerderijen.png',
  nature: '/images/categories/natuur.png',
  museum: '/images/categories/musea.png',
  swim: '/images/categories/zwemmen.png',
  pancake: '/images/categories/pannenkoeken.png',
  horeca: '/images/categories/horeca.png',
  culture: '/images/categories/cultuur.png',
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
  {
    slug: 'cultuur', dbType: 'culture',
    title: 'Cultuur & theater voor peuters in Nederland',
    metaTitle: 'Kindertheater, poppentheater en cultuur voor peuters | PeuterPlannen',
    metaDesc: 'Theaters, poppentheaters, bioscopen en culturele uitjes voor peuters in heel Nederland. Met leeftijdsadvies en praktische info.',
    h1: 'Cultuur & theater voor peuters in Nederland',
    intro: `Theaters en culturele uitjes zijn verrassend leuk voor peuters. Poppentheaters houden de aandacht vast met korte voorstellingen (30-45 minuten), bioscopen draaien speciale peuterfilms, en kindertheaters maken interactieve shows waar meedoen mag.\n\nVan het **Amsterdams Marionetten Theater** tot **Theater Kikker** in Utrecht en **Poppentheater Koos Kneus** in Amsterdam — er is veel meer voor kleine kinderen dan je zou denken. Tip: kies voorstellingen van maximaal 45 minuten, en boek stoelen aan het gangpad voor een snelle vluchtroute.`,
    sectionLabel: 'Cultuur',
    faqItems: [
      { q: 'Vanaf welke leeftijd kan een peuter naar het theater?', a: 'Veel poppentheaters en kindertheaters hebben voorstellingen vanaf 2 jaar. Sommige baby-theaters zijn zelfs geschikt vanaf 0 jaar. Check altijd de leeftijdsaanduiding bij de voorstelling.' },
      { q: 'Hoe lang duurt een theatervoorstelling voor peuters?', a: 'Peutervoorstellingen duren meestal 30-45 minuten, precies de concentratiespanne van jonge kinderen. Vaak is er daarna een nabespreking of knutselactiviteit.' },
      { q: 'Welke bioscopen hebben peuterfilms?', a: 'Pathé en Vue draaien regelmatig peuterbioscoop met kortere films, gedimpt licht en zachter geluid. De Telekids Bioscoop in het Mediapark is speciaal ingericht voor jonge kinderen.' },
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

module.exports = {
  SB_PROJECT,
  SB_URL,
  SB_KEY,
  ROOT,
  CRITICAL_EDITORIAL_GUIDE_CSS,
  SEO_CONTENT_DIR,
  ASSET_VERSION,
  CF_ANALYTICS_TOKEN,
  analyticsHTML,
  TYPE_MAP,
  TYPE_LABELS_CITY,
  TYPE_ORDER,
  TYPE_IMAGES,
  TYPE_PAGES,
  CLUSTER_PAGES,
  SEO_INDEX_THRESHOLD,
  SEO_MAX_CLUSTER_LOCATIONS,
  SEO_DESCRIPTION_MIN_LENGTH,
  GENERIC_DESCRIPTION_PATTERNS,
  AI_SLOP_PATTERNS,
  NEARBY_CITIES,
  MUNICIPALITY_COVERAGE,
  CITY_FAQ,
  TIKKIE_URL,
  WEATHER_LABELS,
};
