/**
 * sync_all.js — Unified build script for PeuterPlannen
 *
 * Replaces sync_counts.js, generate_city_pages.js, generate_type_pages.js.
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
    metaDesc: 'De beste speeltuinen en speelparadijzen voor peuters in Amsterdam, Utrecht, Rotterdam en Den Haag. Indoor én outdoor, geverifieerd en actueel.',
    h1: 'Speeltuinen voor peuters in de Randstad',
    intro: `Een goede speeltuin maakt een dagje uit simpel en onvergetelijk. Voor peuters (1–5 jaar) is het belangrijk dat de toestellen op maat zijn: laag genoeg, veilig, en bij voorkeur met zand of water. In de Randstad zijn tientallen speeltuinen en speelparadijzen speciaal geschikt voor de allerkleinsten.\n\nWe onderscheiden twee typen: **buitenspeeltuinen** (gratis, lekker in de zon) en **indoor speelparadijzen** (ideaal bij regen of kou). Bekende ketens als Monkey Town en Ballorig hebben meerdere vestigingen in de regio — handig als je op reis bent.`,
    keywords: 'speeltuin peuter amsterdam, indoor speelparadijs kinderen, speeltuin utrecht, monkey town, ballorig, speeltuin rotterdam, speelparadijs den haag',
    sectionLabel: 'Speeltuinen',
    faqItems: [
      { q: 'Wat is een goede speeltuin voor peuters van 1–3 jaar?', a: 'Voor de allerkleinsten zijn speeltuinen met laag speelgoed, zandbakken en waterpartijen het geschiktst. Indoor speelparadijzen zoals Monkey Town en Ballorig hebben speciale peuterhoeken voor kinderen vanaf 1 jaar.' },
      { q: 'Zijn indoor speelparadijzen ook geschikt bij slecht weer?', a: 'Ja, dat is juist het voordeel. Indoor speelparadijzen zoals Monkey Town, Ballorig en CROOS zijn volledig overdekt en ideaal voor regenachtige dagen.' },
      { q: 'Wat kosten speeltuinen voor peuters gemiddeld?', a: 'Openbare speeltuinen zijn gratis. Indoor speelparadijzen kosten doorgaans €5–12 per kind. Sommige locaties bieden koffie of lunch voor ouders inbegrepen.' },
    ]
  },
  {
    slug: 'musea', dbType: 'museum',
    title: 'Musea voor peuters in de Randstad',
    metaTitle: 'Musea voor peuters — interactief en kindvriendelijk | PeuterPlannen',
    metaDesc: 'Welke musea zijn écht leuk voor peuters? Overzicht van 30+ kindvriendelijke musea in Amsterdam, Utrecht, Rotterdam en Den Haag. Met leeftijdsadvies.',
    h1: 'Musea voor peuters in de Randstad',
    intro: `Niet elk museum is geschikt voor kleine kinderen — maar er zijn in de Randstad tientallen musea die speciaal zijn ingericht voor peuters en kleuters. Het geheim: interactieve elementen, laag tentoongesteld materiaal, en ruimte om te bewegen.\n\nToppers voor de allerkleinsten zijn het **Nijntje Museum** in Utrecht (speciaal voor 0–6 jaar), **NEMO** in Amsterdam (hands-on experimenten) en **Villa Zebra** in Rotterdam (kunst voor 2–12 jaar). Let op: musea zoals het Verzetsmuseum en het Anne Frank Huis zijn inhoudelijk zwaar — aanbevolen leeftijd 8–10 jaar.`,
    keywords: 'museum peuter amsterdam, museum kleuter utrecht, nemo museum kinderen, nijntje museum, villa zebra rotterdam, kindvriendelijk museum den haag',
    sectionLabel: 'Musea',
    faqItems: [
      { q: 'Welk museum is het leukst voor peuters van 2–4 jaar?', a: 'Het Nijntje Museum in Utrecht is speciaal ingericht voor 0–6 jaar en daarmee dé aanrader voor de allerkleinsten. NEMO in Amsterdam en Villa Zebra in Rotterdam zijn ook uitstekend voor deze leeftijdsgroep.' },
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
      { q: 'Zijn er kinderboerderijen met koffie voor ouders?', a: 'Ja, veel kinderboerderijen hebben een theehuis of café. Boerderij Meerzicht en Speelboerderij Elsenhove in Amsterdam, en Geertjes Hoeve in Utrecht zijn bekende voorbeelden.' },
    ]
  },
  {
    slug: 'horeca', dbType: 'horeca',
    title: 'Kindvriendelijke restaurants en cafés in de Randstad',
    metaTitle: 'Kindvriendelijke horeca voor gezinnen — Randstad | PeuterPlannen',
    metaDesc: 'Kindvriendelijke restaurants en cafés in Amsterdam, Utrecht, Rotterdam en Den Haag. Met speelhoek, kindermenu, terras en luierruimte. Geverifieerd.',
    h1: 'Kindvriendelijke restaurants en cafés in de Randstad',
    intro: `Uit eten met een peuter stelt specifieke eisen: er moet ruimte zijn voor een kinderwagen, een kindermenu of kleine porties, en idealiter een speelhoek of terras waar de kinderen even kunnen rennen. In de Randstad zijn tientallen restaurants en cafés die echt kindvriendelijk zijn — niet alleen het vinkje, maar echt ingericht op jonge gezinnen.\n\nVan een **kindercafé** (speciaal ingericht voor ouders met baby's en peuters) tot een **grand café met groot terras**, van een **pannenkoekenboot** tot een **strandpaviljoen**: de keuze is groot. Let op onze badge-iconen: koffie, luierruimte en alcohol — zodat je weet wat je kunt verwachten.`,
    keywords: 'kindvriendelijk restaurant amsterdam, kindercafé utrecht, eten met peuter rotterdam, kindvriendelijk café den haag, restaurant baby peuter randstad',
    sectionLabel: 'Horeca',
    faqItems: [
      { q: 'Wat is een kindercafé en is dat anders dan een gewoon restaurant?', a: 'Een kindercafé is specifiek ingericht voor ouders met baby\'s en peuters: zachte vloeren, laag meubilair, speelgoed en vaak een speelhoek. Voorbeelden zijn Kindercafé Kikker en de Kraanvogel in Den Haag en Wonderpark Café in Amsterdam.' },
      { q: 'Moet ik reserveren bij kindvriendelijke restaurants?', a: 'Op drukke momenten (zaterdag lunch, schoolvakanties) is reserveren sterk aangeraden. Veel restaurants hebben beperkte ruimte voor kinderwagens.' },
      { q: 'Welke restaurants hebben een buitenspeeltuin of terras?', a: 'Parkrestaurant Anafora in Utrecht, Boerderij Meerzicht in Amsterdam, en Strandpaviljoen Zuid in Den Haag hebben buitenruimte waar kinderen kunnen bewegen terwijl ouders eten.' },
    ]
  },
];

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

// Fallback regions when the DB table doesn't exist yet
const FALLBACK_REGIONS = [
  { name: 'Amsterdam', slug: 'amsterdam', blurb: 'Amsterdam heeft een verrassend rijk aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ — er is altijd iets te doen.', display_order: 1, population: 942000, tier: 'primary', schema_type: 'City', is_active: true },
  { name: 'Rotterdam', slug: 'rotterdam', blurb: 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen én buiten.', display_order: 2, population: 675000, tier: 'primary', schema_type: 'City', is_active: true },
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
  const mapsUrl = loc.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${loc.place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`;
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener">Website</a> · ` : '';
  const badges = [];
  if (loc.coffee) badges.push('Koffie');
  if (loc.alcohol) badges.push('Alcohol');
  if (loc.diaper) badges.push('Luierruimte');
  const badgeStr = badges.length ? ` · <span class="badges">${badges.join(' · ')}</span>` : '';
  return `
      <article class="loc-item">
        <h3><a href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(loc.name)}</a></h3>
        <p>${escapeHtml(loc.description || '')}</p>
        <p class="loc-meta">${websiteLink}<a href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>${badgeStr}</p>
      </article>`;
}

function generateCityPage(region, locs, allRegions) {
  const byType = {};
  TYPE_ORDER.forEach(t => { byType[t] = locs.filter(l => l.type === t); });

  const sectionsHTML = TYPE_ORDER
    .filter(t => byType[t].length > 0)
    .map(t => `
    <section class="type-section">
      <h2>${TYPE_LABELS_CITY[t]}</h2>
      <div class="loc-list">
        ${byType[t].map(locationHTML_city).join('')}
      </div>
    </section>`).join('');

  const otherCities = allRegions.filter(r => r.slug !== region.slug)
    .map(r => `<a href="${r.slug}.html">${r.name}</a>`).join(' · ');

  const weatherNote = (region.slug === 'amsterdam' || region.slug === 'rotterdam')
    ? 'Bij slecht weer raden we speelparadijzen zoals Monkey Town of Ballorig aan. '
    : '';

  const jsonLdItems = locs.map((loc, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": loc.name,
    "description": loc.description || '',
    "url": loc.website || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`,
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  <meta name="theme-color" content="#2A9D8F">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
${jsonLd}
  </script>
  <style>
    :root {
      --primary: #2A9D8F;
      --primary-light: #E6F5F3;
      --primary-dark: #1E7A6E;
      --accent: #E76F51;
      --navy: #264653;
      --navy-light: #2C3E6B;
      --gold: #E9C46A;
      --bg: #FEFBF6;
      --bg-cream: #FFF8F0;
      --text: #264653;
      --text-muted: #5A7A84;
      --card-shadow: 0 4px 12px rgba(38,70,83,0.10);
      --font-heading: 'Nunito', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    h1, h2, h3, h4 { font-family: var(--font-heading); }

    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(250,250,248,0.96); backdrop-filter: blur(12px); z-index: 100; border-bottom: 1px solid rgba(42,157,143,0.15); }
    .nav-inner { max-width: 1100px; margin: 0 auto; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .nav-logo { font-weight: 700; font-size: 18px; color: var(--navy); text-decoration: none; }
    .nav-logo span { color: var(--gold); }
    .nav-cta { background: var(--primary); color: white; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }

    .hero { background: var(--primary); color: white; padding: 100px 24px 60px; text-align: center; }
    .hero h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 700; margin-bottom: 16px; line-height: 1.2; }
    .hero h1 span { color: var(--gold); }
    .hero p { font-size: 18px; opacity: 0.85; max-width: 640px; margin: 0 auto 28px; }
    .hero-stats { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; }
    .hero-stat { text-align: center; }
    .hero-stat strong { display: block; font-size: 32px; font-weight: 700; color: var(--gold); }
    .hero-stat span { font-size: 14px; opacity: 0.7; }

    .breadcrumb { max-width: 1100px; margin: 24px auto 0; padding: 0 24px; font-size: 14px; color: var(--text-muted); }
    .breadcrumb a { color: var(--navy); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }

    main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }

    .intro-box { background: var(--bg-cream); border-radius: 12px; padding: 28px 32px; margin-bottom: 40px; border-left: 4px solid var(--primary); }
    .intro-box p { font-size: 17px; color: var(--text); line-height: 1.8; }

    .type-section { margin-bottom: 48px; }
    .type-section h2 { font-size: 22px; font-weight: 700; color: var(--navy); margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--primary-light); }

    .loc-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .loc-item { background: white; border-radius: 12px; padding: 20px 22px; box-shadow: var(--card-shadow); border: 1px solid rgba(42,157,143,0.12); transition: transform 0.2s, box-shadow 0.2s; }
    .loc-item:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(38,70,83,0.12); }
    .loc-item h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .loc-item h3 a { color: var(--navy); text-decoration: none; }
    .loc-item h3 a:hover { text-decoration: underline; }
    .loc-item p { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.6; }
    .loc-meta { font-size: 13px !important; }
    .loc-meta a { color: var(--navy); font-weight: 500; text-decoration: none; }
    .loc-meta a:hover { text-decoration: underline; }
    .badges { color: var(--text-muted); font-style: italic; }

    .other-cities { background: var(--bg-cream); border-radius: 12px; padding: 24px 28px; margin-top: 48px; }
    .other-cities h3 { font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 12px; }
    .other-cities a { color: var(--navy); text-decoration: none; font-weight: 500; margin-right: 4px; }
    .other-cities a:hover { text-decoration: underline; }

    .cta-block { background: var(--primary); color: white; border-radius: 16px; padding: 36px 32px; text-align: center; margin-top: 48px; }
    .cta-block h3 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    .cta-block p { opacity: 0.8; margin-bottom: 24px; }
    .cta-block a { background: white; color: var(--primary); padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; }
    .cta-block a:hover { background: #f0f0f0; }

    footer { background: var(--navy); color: rgba(255,255,255,0.6); padding: 32px 24px; text-align: center; font-size: 14px; }
    footer a { color: var(--primary); text-decoration: none; }

    html { scroll-behavior: smooth; scroll-padding-top: 70px; }
    ::selection { background: rgba(42, 157, 143, 0.2); color: var(--text); }
    body { -webkit-font-smoothing: antialiased; }
    .loc-item { position: relative; overflow: hidden; }
    .loc-item::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--primary), #E76F51); transform: scaleX(0); transform-origin: left; transition: transform 0.35s ease; border-radius: 12px 12px 0 0; }
    .loc-item:hover::before { transform: scaleX(1); }
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
    @media (max-width: 600px) { .loc-list { grid-template-columns: 1fr; } .hero { padding: 90px 16px 40px; } }
  </style>
</head>
<body>

<a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:0;padding:8px;background:var(--primary);color:white;z-index:200;font-size:14px;">Naar hoofdinhoud</a>
<nav>
  <div class="nav-inner">
    <a href="index.html" class="nav-logo" style="display:flex;align-items:center;gap:8px;">
      <div style="width:28px;height:28px;background:var(--primary);border-radius:7px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      Peuter<span>Plannen</span>
    </a>
    <a href="app.html?regio=${encodeURIComponent(region.name)}" class="nav-cta">Zoek in ${region.name}</a>
  </div>
</nav>

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
  <a href="index.html">PeuterPlannen</a> › ${region.name}
</div>

<main id="main-content">
  <div class="intro-box">
    <p>${region.blurb} ${weatherNote}Op deze pagina vind je <strong>${locs.length} geverifieerde locaties</strong> in ${region.name} — allemaal gecontroleerd op adres, openingstijden en kindvriendelijkheid.</p>
  </div>

  ${sectionsHTML}

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>De app toont locaties gesorteerd op afstand van jouw positie — handig als je niet precies weet waar je bent.</p>
    <a href="app.html?regio=${encodeURIComponent(region.name)}">Open de app voor ${region.name}</a>
  </div>

  <div class="other-cities">
    <h3>Andere steden</h3>
    ${otherCities}
  </div>
</main>

<footer>
  <p>© 2026 PeuterPlannen · <a href="index.html">Home</a> · <a href="app.html">App</a> · <a href="contact.html">Contact</a> · <a href="about.html">Over ons</a></p>
</footer>

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
  const mapsUrl = loc.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${loc.place_id}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`;
  const websiteLink = loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener">Website</a> · ` : '';
  const badges = [];
  if (loc.coffee) badges.push('Koffie');
  if (loc.diaper) badges.push('Luierruimte');
  if (loc.alcohol) badges.push('Alcohol');
  const badgeStr = badges.length ? ` · <span class="badges">${badges.join(' · ')}</span>` : '';
  const regionLabel = loc.region === 'Overig' ? 'Randstad' : loc.region;
  return `
      <article class="loc-item">
        <div class="loc-region">${regionLabel}</div>
        <h3><a href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(loc.name)}</a></h3>
        <p>${escapeHtml(loc.description || '')}</p>
        <p class="loc-meta">${websiteLink}<a href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>${badgeStr}</p>
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
    .map(t => `<a href="${t.slug}.html">${t.sectionLabel}</a>`)
    .join(' · ');

  const cityLinks = regions.map(r => `<a href="${r.slug}.html">${r.name}</a>`).join(' · ');

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
      "url": loc.website || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  <meta name="theme-color" content="#2A9D8F">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
${jsonLdItemList}
  </script>
  <script type="application/ld+json">
${jsonLdFaq}
  </script>
  <style>
    :root {
      --primary: #2A9D8F; --primary-light: #E6F5F3; --primary-dark: #1E7A6E;
      --accent: #E76F51; --navy: #264653; --navy-light: #2C3E6B;
      --gold: #E9C46A; --bg: #FEFBF6; --bg-cream: #FFF8F0;
      --text: #264653; --text-muted: #5A7A84;
      --card-shadow: 0 4px 12px rgba(38,70,83,0.10);
      --font-heading: 'Nunito', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    h1, h2, h3, h4 { font-family: var(--font-heading); }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(250,250,248,0.96); backdrop-filter: blur(12px); z-index: 100; border-bottom: 1px solid rgba(42,157,143,0.15); }
    .nav-inner { max-width: 1100px; margin: 0 auto; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
    .nav-logo { font-weight: 700; font-size: 18px; color: var(--navy); text-decoration: none; }
    .nav-logo span { color: var(--gold); }
    .nav-cta { background: var(--primary); color: white; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .hero { background: var(--primary); color: white; padding: 100px 24px 56px; text-align: center; }
    .hero h1 { font-size: clamp(26px, 4.5vw, 44px); font-weight: 700; margin-bottom: 16px; line-height: 1.2; }
    .hero h1 span { color: var(--gold); }
    .hero p { font-size: 17px; opacity: 0.82; max-width: 620px; margin: 0 auto; }
    .breadcrumb { max-width: 1100px; margin: 24px auto 0; padding: 0 24px; font-size: 14px; color: var(--text-muted); }
    .breadcrumb a { color: var(--navy); text-decoration: none; }
    main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
    .intro-box { background: var(--bg-cream); border-radius: 12px; padding: 28px 32px; margin-bottom: 40px; border-left: 4px solid var(--primary); font-size: 16px; line-height: 1.85; }
    .intro-box strong { color: var(--navy); }
    .region-section { margin-bottom: 48px; }
    .region-section h2 { font-size: 21px; font-weight: 700; color: var(--navy); margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid var(--primary-light); }
    .loc-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .loc-item { background: white; border-radius: 12px; padding: 20px 22px; box-shadow: var(--card-shadow); border: 1px solid rgba(42,157,143,0.12); transition: transform 0.2s, box-shadow 0.2s; position: relative; }
    .loc-item:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(38,70,83,0.12); }
    .loc-region { font-size: 11px; font-weight: 600; color: var(--gold); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .loc-item h3 { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
    .loc-item h3 a { color: var(--navy); text-decoration: none; }
    .loc-item h3 a:hover { text-decoration: underline; }
    .loc-item p { font-size: 13.5px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.6; }
    .loc-meta { font-size: 13px !important; }
    .loc-meta a { color: var(--navy); font-weight: 500; text-decoration: none; }
    .loc-meta a:hover { text-decoration: underline; }
    .badges { color: var(--text-muted); font-size: 12px; }
    .faq-section { margin-top: 56px; }
    .faq-section h2 { font-size: 22px; font-weight: 700; color: var(--navy); margin-bottom: 24px; }
    .faq-item { background: white; border-radius: 10px; padding: 20px 24px; margin-bottom: 12px; box-shadow: var(--card-shadow); border: 1px solid rgba(42,157,143,0.10); cursor: pointer; }
    .faq-item summary { font-weight: 600; font-size: 15px; color: var(--navy); list-style: none; padding-right: 24px; position: relative; }
    .faq-item summary::after { content: '+'; position: absolute; right: 0; top: 0; font-size: 18px; color: var(--gold); }
    .faq-item[open] summary::after { content: '−'; }
    .faq-item p { margin-top: 14px; font-size: 14px; color: var(--text-muted); line-height: 1.7; }
    .nav-links-box { background: var(--bg-cream); border-radius: 12px; padding: 24px 28px; margin-top: 48px; }
    .nav-links-box h3 { font-size: 14px; font-weight: 600; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .nav-links-box a { color: var(--navy); text-decoration: none; font-weight: 500; margin-right: 8px; font-size: 14px; }
    .nav-links-box a:hover { text-decoration: underline; }
    .nav-links-box .divider { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(42,157,143,0.15); }
    .cta-block { background: var(--primary); color: white; border-radius: 16px; padding: 36px 32px; text-align: center; margin-top: 48px; }
    .cta-block h3 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    .cta-block p { opacity: 0.8; margin-bottom: 24px; font-size: 15px; }
    .cta-block a { background: white; color: var(--primary); padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; }
    footer { background: var(--navy); color: rgba(255,255,255,0.6); padding: 32px 24px; text-align: center; font-size: 14px; margin-top: 0; }
    footer a { color: var(--primary); text-decoration: none; }

    html { scroll-behavior: smooth; scroll-padding-top: 70px; }
    ::selection { background: rgba(42, 157, 143, 0.2); color: var(--text); }
    body { -webkit-font-smoothing: antialiased; }
    .loc-item { position: relative; overflow: hidden; }
    .loc-item::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--primary), #E76F51); transform: scaleX(0); transform-origin: left; transition: transform 0.35s ease; border-radius: 12px 12px 0 0; }
    .loc-item:hover::before { transform: scaleX(1); }
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
    @media (max-width: 600px) { .loc-list { grid-template-columns: 1fr; } .hero { padding: 88px 16px 36px; } .intro-box { padding: 20px; } }
  </style>
</head>
<body>

<a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:0;padding:8px;background:var(--primary);color:white;z-index:200;font-size:14px;">Naar hoofdinhoud</a>
<nav>
  <div class="nav-inner">
    <a href="index.html" class="nav-logo" style="display:flex;align-items:center;gap:8px;">
      <div style="width:28px;height:28px;background:var(--primary);border-radius:7px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      Peuter<span>Plannen</span>
    </a>
    <a href="app.html" class="nav-cta">Open App</a>
  </div>
</nav>

<div class="hero">
  <h1>${page.h1.replace('Randstad', '<span>Randstad</span>')}</h1>
  <p>${locs.length} geverifieerde locaties — ${regionNamesStr}</p>
</div>

<div class="breadcrumb">
  <a href="index.html">PeuterPlannen</a> › ${page.title}
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

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>Filter op type, regio of faciliteiten — en laat de app de dichtstbijzijnde locaties tonen.</p>
    <a href="app.html">Open PeuterPlannen</a>
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

<footer>
  <p>© 2026 PeuterPlannen · <a href="index.html">Home</a> · <a href="app.html">App</a> · <a href="contact.html">Contact</a> · <a href="about.html">Over ons</a></p>
</footer>

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

// === 7. Generate sitemap.xml ===

function generateSitemap(data) {
  const { regions } = data;
  const lastmod = todayISO();

  const staticPages = [
    { loc: 'https://peuterplannen.nl/', priority: '1.0', changefreq: 'weekly' },
    { loc: 'https://peuterplannen.nl/app.html', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://peuterplannen.nl/about.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://peuterplannen.nl/contact.html', priority: '0.4', changefreq: 'monthly' },
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

  const allPages = [...staticPages, ...cityPages, ...typePages];

  const urls = allPages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
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

  console.log('Updating static pages...');
  updateIndex(data);
  updateApp(data);
  updateAbout(data);
  updateManifest(data);

  console.log('\nGenerating city pages...');
  generateCityPages(data);

  console.log('\nGenerating type pages...');
  generateTypePages(data);

  console.log('\nGenerating sitemap...');
  generateSitemap(data);

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
