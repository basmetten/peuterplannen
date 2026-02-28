/**
 * sync_all.js — Unified build script for PeuterPlannen
 *
 * Generates city pages, type pages, location pages, blog, affiliate redirects, and sitemap.
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

const TYPE_MAP = {
  play: { label: 'Speeltuinen', slug: 'speeltuinen', labelSingle: 'Speeltuinen' },
  nature: { label: 'Natuur', slug: 'natuur', labelSingle: 'Natuur' },
  museum: { label: 'Musea', slug: 'musea', labelSingle: 'Musea' },
  horeca: { label: 'Restaurants', slug: 'horeca', labelSingle: 'Horeca' },
  pancake: { label: 'Pannenkoeken', slug: 'pannenkoeken', labelSingle: 'Pannenkoeken' },
};

const TYPE_LABELS_CITY = {
  play: 'Speeltuinen & Speelparadijzen',
  nature: 'Natuur & Kinderboerderijen',
  museum: 'Musea',
  horeca: 'Kindvriendelijke Horeca',
  pancake: 'Pannenkoekenrestaurants',
};

const TYPE_ORDER = ['play', 'nature', 'museum', 'pancake', 'horeca'];

const TYPE_PAGES = [
  {
    slug: 'speeltuinen', dbType: 'play',
    title: 'Speeltuinen voor peuters in de Randstad',
    metaTitle: 'Speeltuinen voor peuters — indoor & outdoor | PeuterPlannen',
    metaDesc: 'De beste speeltuinen en speelparadijzen voor peuters in Amsterdam, Utrecht, Rotterdam en Den Haag. Indoor en outdoor, geverifieerd en actueel.',
    h1: 'Speeltuinen voor peuters in de Randstad',
    intro: `Een goede speeltuin maakt een dagje uit simpel en onvergetelijk. Voor peuters (1–5 jaar) is het belangrijk dat de toestellen op maat zijn: laag genoeg, veilig, en bij voorkeur met zand of water. In de Randstad zijn tientallen speeltuinen en speelparadijzen speciaal geschikt voor de allerkleinsten.\n\nWe onderscheiden twee typen: **buitenspeeltuinen** (gratis, lekker in de zon) en **indoor speelparadijzen** (ideaal bij regen of kou). Bekende ketens als Monkey Town en Ballorig hebben meerdere vestigingen in de regio — handig als je op reis bent.`,
    keywords: 'speeltuin peuter amsterdam, indoor speelparadijs kinderen, speeltuin utrecht, monkey town, ballorig, speeltuin rotterdam, speelparadijs den haag',
    sectionLabel: 'Speeltuinen',
    faqItems: [
      { q: 'Wat is een goede speeltuin voor peuters van 1–3 jaar?', a: 'Voor de allerkleinsten zijn speeltuinen met laag speelgoed, zandbakken en waterpartijen het geschiktst. Indoor speelparadijzen zoals Monkey Town en Ballorig hebben speciale peuterhoeken voor kinderen vanaf 1 jaar.' },
      { q: 'Zijn indoor speelparadijzen ook geschikt bij slecht weer?', a: 'Ja, dat is juist het voordeel. Indoor speelparadijzen zoals Monkey Town, Ballorig en CROOS zijn volledig overdekt en ideaal voor regenachtige dagen.' },
      { q: 'Wat kosten speeltuinen voor peuters gemiddeld?', a: 'Openbare speeltuinen zijn gratis. Indoor speelparadijzen kosten doorgaans 5-12 euro per kind. Sommige locaties bieden koffie of lunch voor ouders inbegrepen.' },
    ]
  },
  {
    slug: 'musea', dbType: 'museum',
    title: 'Musea voor peuters in de Randstad',
    metaTitle: 'Musea voor peuters — interactief en kindvriendelijk | PeuterPlannen',
    metaDesc: 'Welke musea zijn echt leuk voor peuters? Overzicht van 30+ kindvriendelijke musea in Amsterdam, Utrecht, Rotterdam en Den Haag. Met leeftijdsadvies.',
    h1: 'Musea voor peuters in de Randstad',
    intro: `Niet elk museum is geschikt voor kleine kinderen — maar er zijn in de Randstad tientallen musea die speciaal zijn ingericht voor peuters en kleuters. Het geheim: interactieve elementen, laag tentoongesteld materiaal, en ruimte om te bewegen.\n\nToppers voor de allerkleinsten zijn het **Nijntje Museum** in Utrecht (speciaal voor 0–6 jaar), **NEMO** in Amsterdam (hands-on experimenten) en **Villa Zebra** in Rotterdam (kunst voor 2–12 jaar). Let op: musea zoals het Verzetsmuseum en het Anne Frank Huis zijn inhoudelijk zwaar — aanbevolen leeftijd 8–10 jaar.`,
    keywords: 'museum peuter amsterdam, museum kleuter utrecht, nemo museum kinderen, nijntje museum, villa zebra rotterdam, kindvriendelijk museum den haag',
    sectionLabel: 'Musea',
    faqItems: [
      { q: 'Welk museum is het leukst voor peuters van 2–4 jaar?', a: 'Het Nijntje Museum in Utrecht is speciaal ingericht voor 0–6 jaar en daarmee de aanrader voor de allerkleinsten. NEMO in Amsterdam en Villa Zebra in Rotterdam zijn ook uitstekend voor deze leeftijdsgroep.' },
      { q: 'Zijn musea gratis voor peuters?', a: 'Veel musea laten kinderen tot 4 jaar gratis binnen. NEMO, Naturalis en het Nijntje Museum hebben speciale peuter-tarieven. Check altijd de website voor actuele prijzen.' },
      { q: 'Welke musea zijn NIET geschikt voor jonge kinderen?', a: 'Het Anne Frank Huis (aanbevolen 10+), het Verzetsmuseum (8+) en Foam (wisselende tentoonstellingen) zijn minder geschikt voor peuters.' },
    ]
  },
  {
    slug: 'pannenkoeken', dbType: 'pancake',
    title: 'Pannenkoekenrestaurants voor kinderen in de Randstad',
    metaTitle: 'Pannenkoekenrestaurants voor kinderen — Randstad overzicht | PeuterPlannen',
    metaDesc: 'De beste pannenkoekenrestaurants voor gezinnen met jonge kinderen in Amsterdam, Utrecht, Rotterdam en Den Haag. Met kindvriendelijkheid, terras en luierruimte.',
    h1: 'Pannenkoekenrestaurants voor kinderen in de Randstad',
    intro: `Pannenkoeken eten is voor veel peuters een feest — en gelukkig heeft de Randstad een rijk aanbod van kindvriendelijke pannenkoekenrestaurants. Van een historisch huisje aan het water tot een pannenkoekenboot op de rivier: er is voor elk gezin iets te vinden.\n\nWat maakt een goed pannenkoekenrestaurant voor peuters? **Ruimte voor kinderwagens**, een **kindermenu met kleine pannenkoeken**, en bij voorkeur een **speelhoek of terras**. Ketens als **Pannenkoe** (meerdere vestigingen) zijn specifiek op gezinnen gericht. Zelfstandige restaurants als **De Nachtegaal** in Rotterdam of **Oudt Leyden** bij Leiden zijn iconische klassiekers.`,
    keywords: 'pannenkoekenrestaurant kinderen amsterdam, pannenkoe utrecht, pannenkoeken peuter, kindvriendelijk pannenkoekenrestaurant randstad, pannenkoekenboot rotterdam',
    sectionLabel: 'Pannenkoeken',
    faqItems: [
      { q: 'Welk pannenkoekenrestaurant is het kindvriendelijkst?', a: 'De Pannenkoe-keten is speciaal ontworpen voor gezinnen met kinderen, met kleine pannenkoekjes op het kindermenu en speelhoeken. Pannekoekhuis De Nachtegaal in Rotterdam en het Nijntje-gerelateerde restaurant in Utrecht zijn ook aanraders.' },
      { q: 'Moet je reserveren bij een pannenkoekenrestaurant met kinderen?', a: 'Op zaterdagen en in vakanties: ja, zeker bij populaire locaties. Pannenkoekenhuis Upstairs in Amsterdam heeft bijvoorbeeld maar 6 tafeltjes — reserveren is essentieel.' },
      { q: 'Hebben pannenkoekenrestaurants luierruimtes?', a: 'De meeste kindvriendelijke pannenkoekenrestaurants hebben een luierruimte of voldoende ruimte op het toilet. Check de badges op onze locatiekaarten.' },
    ]
  },
  {
    slug: 'natuur', dbType: 'nature',
    title: 'Natuur met peuters in de Randstad',
    metaTitle: 'Natuur met peuters — parken, bossen en kinderboerderijen | PeuterPlannen',
    metaDesc: 'Kinderboerderijen, stadsparken, duinen en bossen voor peuters in Amsterdam, Utrecht, Rotterdam en Den Haag. Gratis en betaald, binnen en buiten.',
    h1: 'Natuur met peuters in de Randstad',
    intro: `Buiten zijn doet peuters goed. In de Randstad — een van de dichtstbevolkte regio's van Europa — zijn verrassend veel groene plekken te vinden die perfect zijn voor jonge kinderen. Van de Amsterdamse Bos tot de Kennemerduinen, van een stadsboerderij om de hoek tot een uitgestrekt duinlandschap.\n\n**Kinderboerderijen** zijn de absolute favoriet voor 1–4 jaar: dieren voeren, kijken hoe een geit eet, en altijd een zandbak in de buurt. De meeste stadboerderijen zijn **gratis**. **Stadsparken** zijn ideaal voor een rustige ochtend met een picknick. En voor een groter avontuur zijn de **duinen bij Den Haag** of het **Nationaal Park Zuid-Kennemerland** bij Haarlem onverslaanbaar.`,
    keywords: 'kinderboerderij amsterdam, natuur peuter utrecht, stadspark kindvriendelijk, duinen kinderen den haag, bos peuter randstad, gratis uitje kinderen',
    sectionLabel: 'Natuur',
    faqItems: [
      { q: 'Welke kinderboerderijen zijn gratis in de Randstad?', a: 'De meeste stadsboerderijen zijn gratis toegankelijk: Stadsboerderij Griftsteede en Geertjes Hoeve in Utrecht, Kinderboerderij Westerpark in Amsterdam, Kinderboerderij Vroesenpark in Rotterdam en BuurtBoerderij De Nijkamphoeve in Den Haag.' },
      { q: 'Welk natuurgebied is het geschiktst voor peuters?', a: 'Voor de allerkleinsten zijn vlakke parken met wandelpaden het prettigst, zoals het Vondelpark (Amsterdam), Maximapark (Utrecht) of Vroesenpark (Rotterdam). Oudere peuters (3–5) kunnen ook de duinen aan, zoals Nationaal Park Zuid-Kennemerland of Westduinpark Den Haag.' },
      { q: 'Zijn er kinderboerderijen met koffie voor ouders?', a: 'Ja, veel kinderboerderijen hebben een theehuis of cafe. Boerderij Meerzicht en Speelboerderij Elsenhove in Amsterdam, en Geertjes Hoeve in Utrecht zijn bekende voorbeelden.' },
    ]
  },
  {
    slug: 'horeca', dbType: 'horeca',
    title: 'Kindvriendelijke restaurants en cafes in de Randstad',
    metaTitle: 'Kindvriendelijke horeca voor gezinnen — Randstad | PeuterPlannen',
    metaDesc: 'Kindvriendelijke restaurants en cafes in Amsterdam, Utrecht, Rotterdam en Den Haag. Met speelhoek, kindermenu, terras en luierruimte. Geverifieerd.',
    h1: 'Kindvriendelijke restaurants en cafes in de Randstad',
    intro: `Uit eten met een peuter stelt specifieke eisen: er moet ruimte zijn voor een kinderwagen, een kindermenu of kleine porties, en idealiter een speelhoek of terras waar de kinderen even kunnen rennen. In de Randstad zijn tientallen restaurants en cafes die echt kindvriendelijk zijn — niet alleen het vinkje, maar echt ingericht op jonge gezinnen.\n\nVan een **kindercafe** (speciaal ingericht voor ouders met baby's en peuters) tot een **grand cafe met groot terras**, van een **pannenkoekenboot** tot een **strandpaviljoen**: de keuze is groot. Let op onze badge-iconen: koffie, luierruimte en alcohol — zodat je weet wat je kunt verwachten.`,
    keywords: 'kindvriendelijk restaurant amsterdam, kindercafe utrecht, eten met peuter rotterdam, kindvriendelijk cafe den haag, restaurant baby peuter randstad',
    sectionLabel: 'Horeca',
    faqItems: [
      { q: 'Wat is een kindercafe en is dat anders dan een gewoon restaurant?', a: 'Een kindercafe is specifiek ingericht voor ouders met baby\'s en peuters: zachte vloeren, laag meubilair, speelgoed en vaak een speelhoek. Voorbeelden zijn Kindercafe Kikker en de Kraanvogel in Den Haag en Wonderpark Cafe in Amsterdam.' },
      { q: 'Moet ik reserveren bij kindvriendelijke restaurants?', a: 'Op drukke momenten (zaterdag lunch, schoolvakanties) is reserveren sterk aangeraden. Veel restaurants hebben beperkte ruimte voor kinderwagens.' },
      { q: 'Welke restaurants hebben een buitenspeeltuin of terras?', a: 'Parkrestaurant Anafora in Utrecht, Boerderij Meerzicht in Amsterdam, en Strandpaviljoen Zuid in Den Haag hebben buitenruimte waar kinderen kunnen bewegen terwijl ouders eten.' },
    ]
  },
];

const NEARBY_CITIES = {
  'amsterdam': ['haarlem', 'utrecht', 'almere'],
  'rotterdam': ['den-haag', 'breda', 'leiden'],
  'den-haag': ['rotterdam', 'leiden', 'haarlem'],
  'utrecht': ['amsterdam', 'amersfoort', 'utrechtse-heuvelrug'],
  'haarlem': ['amsterdam', 'leiden', 'den-haag'],
  'amersfoort': ['utrecht', 'apeldoorn', 'arnhem'],
  'leiden': ['den-haag', 'haarlem', 'rotterdam'],
  'utrechtse-heuvelrug': ['utrecht', 'amersfoort', 'arnhem'],
  'eindhoven': ['tilburg', 's-hertogenbosch', 'breda'],
  'groningen': ['apeldoorn', 'arnhem', 'amersfoort'],
  'almere': ['amsterdam', 'utrecht', 'amersfoort'],
  'tilburg': ['eindhoven', 'breda', 's-hertogenbosch'],
  'breda': ['tilburg', 'eindhoven', 'rotterdam'],
  'nijmegen': ['arnhem', 's-hertogenbosch', 'apeldoorn'],
  'arnhem': ['nijmegen', 'apeldoorn', 'amersfoort'],
  'apeldoorn': ['arnhem', 'amersfoort', 'utrecht'],
  's-hertogenbosch': ['eindhoven', 'tilburg', 'nijmegen'],
};

const AFFILIATE_TYPE_MAP = {
  play: { key: 'bol-buitenspeelgoed', label: 'Handig voor de speeltuin' },
  nature: { key: 'bol-peuterboeken', label: 'Leuk voor onderweg' },
};

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

const NAV_LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

function navHTML(ctaText = 'Open App', ctaHref = '/app.html') {
  return `<a href="#main-content" class="skip-link">Naar hoofdinhoud</a>
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <div class="nav-logo-icon">${NAV_LOGO_SVG}</div>
      Peuter<span>Plannen</span>
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
  <p>&copy; 2026 PeuterPlannen &middot; <a href="/">Home</a> &middot; <a href="/app.html">App</a> &middot; <a href="/blog/">Blog</a> &middot; <a href="/contact.html">Contact</a> &middot; <a href="/about.html">Over ons</a> &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/disclaimer/">Disclaimer</a></p>
</footer>`;
}

function newsletterHTML() {
  return `<section class="newsletter-signup">
  <h3>Wekelijks de leukste peuteruitjes in je mail?</h3>
  <form id="newsletter-form" action="#" method="post">
    <input type="email" name="email" placeholder="je@email.nl" required>
    <label><input type="checkbox" required> Ik ga akkoord met het <a href="/privacy/">privacybeleid</a></label>
    <button type="submit">Aanmelden</button>
  </form>
</section>`;
}

function headCommon(extra = '') {
  return `  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#2A9D8F">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">${extra}`;
}

// Fallback regions when the DB table doesn't exist yet
const FALLBACK_REGIONS = [
  { name: 'Amsterdam', slug: 'amsterdam', blurb: 'Amsterdam heeft een verrassend rijk aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ — er is altijd iets te doen.', display_order: 1, population: 942000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Rotterdam', slug: 'rotterdam', blurb: 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen en buiten.', display_order: 2, population: 675000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Den Haag', slug: 'den-haag', blurb: 'Den Haag combineert strand, cultuur en natuur op loopafstand van elkaar. Madurodam, het Kunstmuseum, Scheveningen en Westduinpark zijn klassiekers voor een uitje met peuters.', display_order: 3, population: 569000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Utrecht', slug: 'utrecht', blurb: 'Utrecht is een van de kindvriendelijkste steden van Nederland. Het Nijntje Museum, de Griftsteede, het Spoorwegmuseum en tientallen speeltuinen maken de stad ideaal voor een dagje uit met peuters.', display_order: 4, population: 378000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Haarlem', slug: 'haarlem', blurb: 'Haarlem is compact en groen — perfect voor een relaxt dagje uit met jonge kinderen. Het Teylers Museum, het Reinaldapark en de Kennemerduinen liggen op fietsafstand van het centrum.', display_order: 5, population: 169000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Amersfoort', slug: 'amersfoort', blurb: 'Amersfoort is een gezellige middeleeuwse stad met verrassend veel te doen voor peuters. Dierenpark Amersfoort, kinderboerderijen en het buitengebied van de Utrechtse Heuvelrug liggen om de hoek.', display_order: 6, population: 164000, tier: 'standard', schema_type: 'City', is_active: true },
  { name: 'Leiden', slug: 'leiden', blurb: 'Leiden is een compacte universiteitsstad met verrassend veel te doen voor peuters. Van het Naturalis tot kinderboerderijen en een pannenkoekenrestaurant aan het water.', display_order: 7, population: 130000, tier: 'standard', schema_type: 'City', is_active: true },
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
                <div class="stat-label">Geverifieerd</div>
            </div>
        </div>
    </section>`;
  content = replaceMarker(content, 'STATS', statsHTML);

  // TYPE_GRID
  const typeCards = Object.entries(TYPE_MAP).map(([type, info]) => {
    const count = typeCounts[type] || 0;
    return `                <a href="${info.slug}.html" class="city-card">
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
            <h2 class="section-title">Uitjes per stad</h2>
            <p class="section-sub">Bekijk alle kindvriendelijke locaties per regio — geverifieerd en actueel.</p>
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
      "description": "Vind kindvriendelijke uitjes voor kinderen van 0-7 jaar in de Randstad. ${total} locaties in ${regions.length} regio's.",
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
  content = replaceMarker(content, 'JSONLD_INDEX', jsonldHTML);

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
    <p>${total} geverifieerde uitjes voor gezinnen met jonge kinderen.</p>
    <h2>Per stad</h2>
    <ul>
${noscriptCities}
    </ul>
    <h2>Per type</h2>
    <ul>
      <li><a href="speeltuinen.html">Speeltuinen</a></li>
      <li><a href="musea.html">Musea</a></li>
      <li><a href="natuur.html">Natuur</a></li>
      <li><a href="horeca.html">Restaurants</a></li>
      <li><a href="pannenkoeken.html">Pannenkoeken</a></li>
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
  const metaHTML = `    <meta name="description" content="PeuterPlannen helpt ouders met peuters de leukste uitjes te vinden in de Randstad. ${total}+ geverifieerde locaties in ${regions.length} regio's.">`;
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
                <strong>5</strong>
                <span>Categorieën</span>
            </div>
        </div>`;
  content = replaceMarker(content, 'STATS_ABOUT', statsHTML);

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
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener">Website</a> &middot; ` : '';
  const badges = [];
  if (loc.coffee) badges.push('Koffie');
  if (loc.alcohol) badges.push('Alcohol');
  if (loc.diaper) badges.push('Luierruimte');
  const badgeStr = badges.length ? ` &middot; <span class="badges">${badges.join(' &middot; ')}</span>` : '';
  return `
      <article class="loc-item">
        <h3><a href="${locationUrl}">${escapeHtml(loc.name)}</a></h3>
        <p>${escapeHtml(loc.description || '')}</p>
        <p class="loc-meta">${websiteLink}<a href="${locationUrl}">Bekijk details</a>${badgeStr}</p>
      </article>`;
}

function generateCityPage(region, locs, allRegions) {
  const byType = {};
  TYPE_ORDER.forEach(t => { byType[t] = locs.filter(l => l.type === t); });

  // Insert ad container after 2nd type section
  const typesWithLocs = TYPE_ORDER.filter(t => byType[t].length > 0);
  const sectionsHTML = typesWithLocs
    .map((t, i) => {
      let section = `
    <section class="type-section">
      <h2>${TYPE_LABELS_CITY[t]}</h2>
      <div class="loc-list">
        ${byType[t].map(locationHTML_city).join('')}
      </div>
    </section>`;
      // Ad container after 2nd category
      if (i === 1 && typesWithLocs.length > 2) {
        section += '\n    <div class="ad-container"></div>';
      }
      return section;
    }).join('');

  // Nearby cities instead of all cities
  const nearbySlugs = NEARBY_CITIES[region.slug] || [];
  const nearbyRegions = nearbySlugs.map(s => allRegions.find(r => r.slug === s)).filter(Boolean);
  const nearbyLinks = nearbyRegions.map(r => `<a href="/${r.slug}.html">${r.name}</a>`).join(' &middot; ');

  const weatherNote = (region.slug === 'amsterdam' || region.slug === 'rotterdam')
    ? 'Bij slecht weer raden we speelparadijzen zoals Monkey Town of Ballorig aan. '
    : '';

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
  <meta name="keywords" content="uitjes peuters ${region.name}, wat te doen met peuter ${region.name}, dagje weg ${region.name} kinderen, kindvriendelijk ${region.name}, peuter activiteiten ${region.name}">
  <link rel="canonical" href="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:title" content="${region.name} met peuters | PeuterPlannen">
  <meta property="og:description" content="${locs.length} geverifieerde uitjes voor peuters in ${region.name}: speeltuinen, musea, natuur en kindvriendelijke horeca.">
  <meta property="og:url" content="https://peuterplannen.nl/${region.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>

${navHTML(`Zoek in ${region.name}`, `/app.html?regio=${encodeURIComponent(region.name)}`)}

<div class="hero">
  <h1>Uitjes met peuters in <span>${region.name}</span></h1>
  <p>${region.blurb}</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${locs.length}</strong><span>locaties</span></div>
    <div class="hero-stat"><strong>${byType.play?.length || 0}</strong><span>speeltuinen</span></div>
    <div class="hero-stat"><strong>${byType.museum?.length || 0}</strong><span>musea</span></div>
    <div class="hero-stat"><strong>${(byType.pancake?.length || 0) + (byType.horeca?.length || 0)}</strong><span>eten & drinken</span></div>
  </div>
</div>

<div class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${region.name}
</div>

<main id="main-content">
  <div class="intro-box">
    <p>${region.blurb} ${weatherNote}Op deze pagina vind je <strong>${locs.length} geverifieerde locaties</strong> in ${region.name} — allemaal gecontroleerd op adres, openingstijden en kindvriendelijkheid.</p>
  </div>

  ${sectionsHTML}

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>De app toont locaties gesorteerd op afstand van jouw positie — handig als je niet precies weet waar je bent.</p>
    <a href="/app.html?regio=${encodeURIComponent(region.name)}">Open de app voor ${region.name}</a>
  </div>

  <div class="other-cities">
    <h3>Peuteruitjes in de buurt</h3>
    ${nearbyLinks || '<a href="/">Bekijk alle steden</a>'}
  </div>
</main>

${footerHTML()}

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
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener">Website</a> &middot; ` : '';
  const badges = [];
  if (loc.coffee) badges.push('Koffie');
  if (loc.diaper) badges.push('Luierruimte');
  if (loc.alcohol) badges.push('Alcohol');
  const badgeStr = badges.length ? ` &middot; <span class="badges">${badges.join(' &middot; ')}</span>` : '';
  const regionLabel = loc.region === 'Overig' ? 'Randstad' : loc.region;
  return `
      <article class="loc-item">
        <div class="loc-region">${regionLabel}</div>
        <h3><a href="${locationUrl}">${escapeHtml(loc.name)}</a></h3>
        <p>${escapeHtml(loc.description || '')}</p>
        <p class="loc-meta">${websiteLink}<a href="${locationUrl}">Bekijk details</a>${badgeStr}</p>
      </article>`;
}

function generateTypePage(page, locs, regions) {
  // Group by region, use DB order
  const byRegion = {};
  locs.forEach(loc => {
    const r = loc.region === 'Overig' ? 'Overige Randstad' : loc.region;
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(loc);
  });

  // Region order from DB + fallback for "Overige Randstad"
  const regionOrder = regions.map(r => r.name);
  regionOrder.push('Overige Randstad');

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
      <p>${item.a}</p>
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
  <meta name="keywords" content="${page.keywords}">
  <link rel="canonical" href="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:title" content="${page.metaTitle}">
  <meta property="og:description" content="${page.metaDesc}">
  <meta property="og:url" content="https://peuterplannen.nl/${page.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
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
  <h1>${page.h1.replace('Randstad', '<span>Randstad</span>')}</h1>
  <p>${locs.length} geverifieerde locaties — ${regionNamesStr}</p>
</div>

<div class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${page.title}
</div>

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

function locationPageHTML(loc, region, similarLocs, affiliates) {
  const fullUrl = `https://peuterplannen.nl${loc.pageUrl}`;
  const typeLabel = TYPE_MAP[loc.type]?.label || loc.type;
  const metaDesc = (loc.description || '').slice(0, 155);

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

  // Affiliate block
  const affInfo = AFFILIATE_TYPE_MAP[loc.type];
  let affiliateHTML = '';
  if (affInfo && affiliates[affInfo.key]) {
    affiliateHTML = `
  <div class="affiliate-block">
    <h4>${affInfo.label}</h4>
    <a href="/go/${affInfo.key}/" target="_blank" rel="noopener">${affiliates[affInfo.key].label} &rarr;</a>
    <p class="affiliate-disclaimer">* Affiliate link — <a href="/disclaimer/">meer info</a></p>
  </div>`;
  }
  // Extra affiliate for outdoor locations
  if (loc.weather === 'outdoor' && affiliates['bol-regenkleding-kind']) {
    affiliateHTML += `
  <div class="affiliate-block">
    <h4>Voorbereid op regen?</h4>
    <a href="/go/bol-regenkleding-kind/" target="_blank" rel="noopener">${affiliates['bol-regenkleding-kind'].label} &rarr;</a>
    <p class="affiliate-disclaimer">* Affiliate link — <a href="/disclaimer/">meer info</a></p>
  </div>`;
  }

  // Similar locations
  const similarHTML = similarLocs.length > 0
    ? `<div class="similar-locations">
    <h2>Vergelijkbare locaties in ${region.name}</h2>
    <div class="loc-list">
      ${similarLocs.map(s => `
      <article class="loc-item">
        <h3><a href="${s.pageUrl}">${escapeHtml(s.name)}</a></h3>
        <p>${escapeHtml((s.description || '').slice(0, 120))}${(s.description || '').length > 120 ? '...' : ''}</p>
      </article>`).join('')}
    </div>
  </div>` : '';

  // Info items
  const infoItems = [];
  if (weatherLabel) infoItems.push(`<div class="info-item"><div><div class="info-label">Weer</div><div class="info-value">${weatherLabel}</div></div></div>`);
  if (ageLabel) infoItems.push(`<div class="info-item"><div><div class="info-label">Leeftijd</div><div class="info-value">${ageLabel}</div></div></div>`);
  facilities.forEach(f => infoItems.push(`<div class="info-item"><div><div class="info-label">Faciliteit</div><div class="info-value">${f}</div></div></div>`));
  if (loc.website) infoItems.push(`<div class="info-item"><div><div class="info-label">Website</div><div class="info-value"><a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener">${escapeHtml(loc.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></div></div></div>`);

  // JSON-LD
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": loc.name,
    "description": loc.description || '',
    "url": fullUrl,
    ...(loc.website && { "sameAs": loc.website }),
    ...(loc.lat && loc.lng && {
      "geo": { "@type": "GeoCoordinates", "latitude": loc.lat, "longitude": loc.lng }
    }),
    "address": { "@type": "PostalAddress", "addressLocality": region.name, "addressCountry": "NL" }
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
        new maplibregl.Marker({ color: '#2A9D8F' }).setLngLat([${loc.lng}, ${loc.lat}]).addTo(map);
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
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
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
</head>
<body>

${navHTML(`Zoek in ${region.name}`, `/app.html?regio=${encodeURIComponent(region.name)}`)}

<div class="hero" style="padding: 100px 24px 40px;">
  <h1>${escapeHtml(loc.name)}</h1>
  <p>${typeLabel} in ${region.name}</p>
</div>

<div class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/${region.slug}.html">${region.name}</a> &rsaquo; ${escapeHtml(loc.name)}
</div>

<main id="main-content">
  <div class="location-header">
    <h1>${escapeHtml(loc.name)}</h1>
    <p class="location-subtitle">${typeLabel} in ${region.name}</p>
  </div>

  <p class="location-description">${escapeHtml(loc.description || '')}</p>

  ${loc.toddler_highlight ? `<div class="location-highlight"><strong>Peutertip:</strong> ${escapeHtml(loc.toddler_highlight)}</div>` : ''}

  ${infoItems.length > 0 ? `<div class="location-info">\n    ${infoItems.join('\n    ')}\n  </div>` : ''}

  <div class="ad-container"></div>

  <div class="location-actions">
    ${routeUrl ? `<a href="${routeUrl}" target="_blank" rel="noopener" class="btn-route">Route plannen</a>` : ''}
  </div>

  <div class="share-buttons">
    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener" class="share-wa">Deel via WhatsApp</a>
    <button class="share-native" onclick="shareNative()">Delen</button>
  </div>

  ${affiliateHTML}

  ${(loc.lat && loc.lng) ? `<div class="location-map" id="map-container"><div id="map"></div></div>` : ''}

  ${similarHTML}

  <div class="other-cities" style="margin-top: 32px;">
    <h3>Meer peuteruitjes in ${region.name}</h3>
    <a href="/${region.slug}.html">Bekijk alle ${region.name} locaties &rarr;</a>
  </div>

  ${newsletterHTML()}
</main>

${footerHTML()}
${mapScript}
${shareScript}

</body>
</html>`;
}

function generateLocationPages(data, affiliates) {
  const { regions, locations } = data;
  const regionMap = {};
  regions.forEach(r => { regionMap[r.slug] = r; });

  let count = 0;
  const regionGroups = {};
  locations.forEach(loc => {
    if (!regionGroups[loc.regionSlug]) regionGroups[loc.regionSlug] = [];
    regionGroups[loc.regionSlug].push(loc);
  });

  for (const [rSlug, locs] of Object.entries(regionGroups)) {
    const region = regionMap[rSlug] || { name: locs[0]?.region || rSlug, slug: rSlug, blurb: '' };

    // Create region directory
    const regionDir = path.join(ROOT, rSlug);
    if (!fs.existsSync(regionDir)) fs.mkdirSync(regionDir, { recursive: true });

    for (const loc of locs) {
      // Find similar locations (same region, same type first, then others)
      const sameType = locs.filter(l => l !== loc && l.type === loc.type).slice(0, 3);
      const otherType = locs.filter(l => l !== loc && l.type !== loc.type).slice(0, 6 - sameType.length);
      const similar = [...sameType, ...otherType].slice(0, 6);

      const html = locationPageHTML(loc, region, similar, affiliates);

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
      content: htmlContent,
    });

    // Generate individual post page
    const postDir = path.join(blogDir, slug);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

    // Insert ad container after 2nd h2
    let processedContent = htmlContent;
    let h2Count = 0;
    processedContent = processedContent.replace(/<\/h2>/g, (match) => {
      h2Count++;
      if (h2Count === 2) {
        return `${match}\n<div class="ad-container"></div>`;
      }
      return match;
    });

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
  <meta property="og:image" content="https://peuterplannen.nl/homepage_hero_ai.jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(fm.title)}">
  <meta name="twitter:description" content="${escapeHtml(fm.description || '')}">
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

<div class="hero" style="padding: 100px 24px 40px;">
  <h1>${escapeHtml(fm.title)}</h1>
</div>

<div class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/blog/">Blog</a> &rsaquo; ${escapeHtml(fm.title)}
</div>

<main id="main-content">
  <p class="blog-meta">${dateDisplay}${fm.tags?.length ? ' &middot; ' + fm.tags.join(', ') : ''}</p>

  <div class="blog-content">
    ${processedContent}
  </div>

  <div class="ad-container"></div>

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Op zoek naar meer uitjes?</h3>
    <p>Ontdek ${data.total}+ geverifieerde locaties op PeuterPlannen.</p>
    <a href="/app.html">Open de app</a>
  </div>
</main>

${footerHTML()}

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

<div class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; Blog
</div>

<main id="main-content">
  <div class="blog-grid">
    ${postCards}
  </div>

  ${newsletterHTML()}
</main>

${footerHTML()}

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

// === 9. Affiliate redirect pages ===

function buildAffiliateRedirects() {
  const affiliatesPath = path.join(ROOT, 'data', 'affiliates.json');
  if (!fs.existsSync(affiliatesPath)) {
    console.log('  No data/affiliates.json found, skipping');
    return {};
  }

  const affiliates = JSON.parse(fs.readFileSync(affiliatesPath, 'utf8'));
  const goDir = path.join(ROOT, 'go');
  if (!fs.existsSync(goDir)) fs.mkdirSync(goDir, { recursive: true });

  let count = 0;
  for (const [key, info] of Object.entries(affiliates)) {
    const redirectDir = path.join(goDir, key);
    if (!fs.existsSync(redirectDir)) fs.mkdirSync(redirectDir, { recursive: true });

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(info.url)}">
  <title>Doorverwijzing naar ${escapeHtml(info.label)}</title>
</head>
<body>
  <p>Je wordt doorgestuurd naar <a href="${escapeHtml(info.url)}">${escapeHtml(info.label)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(info.url)});</script>
</body>
</html>`;

    fs.writeFileSync(path.join(redirectDir, 'index.html'), html);
    count++;
  }

  console.log(`Generated ${count} affiliate redirect pages`);
  return affiliates;
}

// === 10. Generate sitemap.xml ===

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
    lastmod: loc.last_verified || lastmod,
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

  console.log('\nBuilding affiliate redirects...');
  const affiliates = buildAffiliateRedirects();

  console.log('\nGenerating location pages...');
  generateLocationPages(data, affiliates);

  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nGenerating sitemap...');
  generateSitemap(data, blogPosts);

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
