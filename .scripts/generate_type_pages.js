/**
 * generate_type_pages.js
 * Genereert statische SEO type-landingspagina's (speeltuinen, musea, etc.)
 */
const fs = require('fs');
const env = fs.readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const PAGES = [
  {
    slug: 'speeltuinen',
    dbType: 'play',
    title: 'Speeltuinen voor peuters in de Randstad',
    metaTitle: 'Speeltuinen voor peuters — indoor & outdoor | PeuterPlannen',
    metaDesc: 'De beste speeltuinen en speelparadijzen voor peuters in Amsterdam, Utrecht, Rotterdam en Den Haag. Indoor én outdoor, geverifieerd en actueel.',
    h1: 'Speeltuinen voor peuters in de Randstad',
    intro: `Een goede speeltuin maakt een dagje uit simpel en onvergetelijk. Voor peuters (1–5 jaar) is het belangrijk dat de toestellen op maat zijn: laag genoeg, veilig, en bij voorkeur met zand of water. In de Randstad zijn tientallen speeltuinen en speelparadijzen speciaal geschikt voor de allerkleinsten.

We onderscheiden twee typen: **buitenspeeltuinen** (gratis, lekker in de zon) en **indoor speelparadijzen** (ideaal bij regen of kou). Bekende ketens als Monkey Town en Ballorig hebben meerdere vestigingen in de regio — handig als je op reis bent.`,
    keywords: 'speeltuin peuter amsterdam, indoor speelparadijs kinderen, speeltuin utrecht, monkey town, ballorig, speeltuin rotterdam, speelparadijs den haag',
    faqItems: [
      { q: 'Wat is een goede speeltuin voor peuters van 1–3 jaar?', a: 'Voor de allerkleinsten zijn speeltuinen met laag speelgoed, zandbakken en waterpartijen het geschiktst. Indoor speelparadijzen zoals Monkey Town en Ballorig hebben speciale peuterhoeken voor kinderen vanaf 1 jaar.' },
      { q: 'Zijn indoor speelparadijzen ook geschikt bij slecht weer?', a: 'Ja, dat is juist het voordeel. Indoor speelparadijzen zoals Monkey Town, Ballorig en CROOS zijn volledig overdekt en ideaal voor regenachtige dagen.' },
      { q: 'Wat kosten speeltuinen voor peuters gemiddeld?', a: 'Openbare speeltuinen zijn gratis. Indoor speelparadijzen kosten doorgaans €5–12 per kind. Sommige locaties bieden koffie of lunch voor ouders inbegrepen.' },
    ]
  },
  {
    slug: 'musea',
    dbType: 'museum',
    title: 'Musea voor peuters in de Randstad',
    metaTitle: 'Musea voor peuters — interactief en kindvriendelijk | PeuterPlannen',
    metaDesc: 'Welke musea zijn écht leuk voor peuters? Overzicht van 30+ kindvriendelijke musea in Amsterdam, Utrecht, Rotterdam en Den Haag. Met leeftijdsadvies.',
    h1: 'Musea voor peuters in de Randstad',
    intro: `Niet elk museum is geschikt voor kleine kinderen — maar er zijn in de Randstad tientallen musea die speciaal zijn ingericht voor peuters en kleuters. Het geheim: interactieve elementen, laag tentoongesteld materiaal, en ruimte om te bewegen.

Toppers voor de allerkleinsten zijn het **Nijntje Museum** in Utrecht (speciaal voor 0–6 jaar), **NEMO** in Amsterdam (hands-on experimenten) en **Villa Zebra** in Rotterdam (kunst voor 2–12 jaar). Let op: musea zoals het Verzetsmuseum en het Anne Frank Huis zijn inhoudelijk zwaar — aanbevolen leeftijd 8–10 jaar.`,
    keywords: 'museum peuter amsterdam, museum kleuter utrecht, nemo museum kinderen, nijntje museum, villa zebra rotterdam, kindvriendelijk museum den haag',
    faqItems: [
      { q: 'Welk museum is het leukst voor peuters van 2–4 jaar?', a: 'Het Nijntje Museum in Utrecht is speciaal ingericht voor 0–6 jaar en daarmee dé aanrader voor de allerkleinsten. NEMO in Amsterdam en Villa Zebra in Rotterdam zijn ook uitstekend voor deze leeftijdsgroep.' },
      { q: 'Zijn musea gratis voor peuters?', a: 'Veel musea laten kinderen tot 4 jaar gratis binnen. NEMO, Naturalis en het Nijntje Museum hebben speciale peuter-tarieven. Check altijd de website voor actuele prijzen.' },
      { q: 'Welke musea zijn NIET geschikt voor jonge kinderen?', a: 'Het Anne Frank Huis (aanbevolen 10+), het Verzetsmuseum (8+) en Foam (wisselende tentoonstellingen) zijn minder geschikt voor peuters.' },
    ]
  },
  {
    slug: 'pannenkoeken',
    dbType: 'pancake',
    title: 'Pannenkoekenrestaurants voor kinderen in de Randstad',
    metaTitle: 'Pannenkoekenrestaurants voor kinderen — Randstad overzicht | PeuterPlannen',
    metaDesc: 'De beste pannenkoekenrestaurants voor gezinnen met jonge kinderen in Amsterdam, Utrecht, Rotterdam en Den Haag. Met kindvriendelijkheid, terras en luierruimte.',
    h1: 'Pannenkoekenrestaurants voor kinderen in de Randstad',
    intro: `Pannenkoeken eten is voor veel peuters een feest — en gelukkig heeft de Randstad een rijk aanbod van kindvriendelijke pannenkoekenrestaurants. Van een historisch huisje aan het water tot een pannenkoekenboot op de rivier: er is voor elk gezin iets te vinden.

Wat maakt een goed pannenkoekenrestaurant voor peuters? **Ruimte voor kinderwagens**, een **kindermenu met kleine pannenkoeken**, en bij voorkeur een **speelhoek of terras**. Ketens als **Pannenkoe** (meerdere vestigingen) zijn specifiek op gezinnen gericht. Zelfstandige restaurants als **De Nachtegaal** in Rotterdam of **Oudt Leyden** bij Leiden zijn iconische klassiekers.`,
    keywords: 'pannenkoekenrestaurant kinderen amsterdam, pannenkoe utrecht, pannenkoeken peuter, kindvriendelijk pannenkoekenrestaurant randstad, pannenkoekenboot rotterdam',
    faqItems: [
      { q: 'Welk pannenkoekenrestaurant is het kindvriendelijkst?', a: 'De Pannenkoe-keten is speciaal ontworpen voor gezinnen met kinderen, met kleine pannenkoekjes op het kindermenu en speelhoeken. Pannekoekhuis De Nachtegaal in Rotterdam en het Nijntje-gerelateerde restaurant in Utrecht zijn ook aanraders.' },
      { q: 'Moet je reserveren bij een pannenkoekenrestaurant met kinderen?', a: 'Op zaterdagen en in vakanties: ja, zeker bij populaire locaties. Pannenkoekenhuis Upstairs in Amsterdam heeft bijvoorbeeld maar 6 tafeltjes — reserveren is essentieel.' },
      { q: 'Hebben pannenkoekenrestaurants luierruimtes?', a: 'De meeste kindvriendelijke pannenkoekenrestaurants hebben een luierruimte of voldoende ruimte op het toilet. Check de badges op onze locatiekaarten.' },
    ]
  },
  {
    slug: 'natuur',
    dbType: 'nature',
    title: 'Natuur met peuters in de Randstad',
    metaTitle: 'Natuur met peuters — parken, bossen en kinderboerderijen | PeuterPlannen',
    metaDesc: 'Kinderboerderijen, stadsparken, duinen en bossen voor peuters in Amsterdam, Utrecht, Rotterdam en Den Haag. Gratis en betaald, binnen en buiten.',
    h1: 'Natuur met peuters in de Randstad',
    intro: `Buiten zijn doet peuters goed. In de Randstad — een van de dichtstbevolkte regio's van Europa — zijn verrassend veel groene plekken te vinden die perfect zijn voor jonge kinderen. Van de Amsterdamse Bos tot de Kennemerduinen, van een stadsboerderij om de hoek tot een uitgestrekt duinlandschap.

**Kinderboerderijen** zijn de absolute favoriet voor 1–4 jaar: dieren voeren, kijken hoe een geit eet, en altijd een zandbak in de buurt. De meeste stadboerderijen zijn **gratis**. **Stadsparken** zijn ideaal voor een rustige ochtend met een picknick. En voor een groter avontuur zijn de **duinen bij Den Haag** of het **Nationaal Park Zuid-Kennemerland** bij Haarlem onverslaanbaar.`,
    keywords: 'kinderboerderij amsterdam, natuur peuter utrecht, stadspark kindvriendelijk, duinen kinderen den haag, bos peuter randstad, gratis uitje kinderen',
    faqItems: [
      { q: 'Welke kinderboerderijen zijn gratis in de Randstad?', a: 'De meeste stadsboerderijen zijn gratis toegankelijk: Stadsboerderij Griftsteede en Geertjes Hoeve in Utrecht, Kinderboerderij Westerpark in Amsterdam, Kinderboerderij Vroesenpark in Rotterdam en BuurtBoerderij De Nijkamphoeve in Den Haag.' },
      { q: 'Welk natuurgebied is het geschiktst voor peuters?', a: 'Voor de allerkleinsten zijn vlakke parken met wandelpaden het prettigst, zoals het Vondelpark (Amsterdam), Maximapark (Utrecht) of Vroesenpark (Rotterdam). Oudere peuters (3–5) kunnen ook de duinen aan, zoals Nationaal Park Zuid-Kennemerland of Westduinpark Den Haag.' },
      { q: 'Zijn er kinderboerderijen met koffie voor ouders?', a: 'Ja, veel kinderboerderijen hebben een theehuis of café. Boerderij Meerzicht en Speelboerderij Elsenhove in Amsterdam, en Geertjes Hoeve in Utrecht zijn bekende voorbeelden.' },
    ]
  },
  {
    slug: 'horeca',
    dbType: 'horeca',
    title: 'Kindvriendelijke restaurants en cafés in de Randstad',
    metaTitle: 'Kindvriendelijke horeca voor gezinnen — Randstad | PeuterPlannen',
    metaDesc: 'Kindvriendelijke restaurants en cafés in Amsterdam, Utrecht, Rotterdam en Den Haag. Met speelhoek, kindermenu, terras en luierruimte. Geverifieerd.',
    h1: 'Kindvriendelijke restaurants en cafés in de Randstad',
    intro: `Uit eten met een peuter stelt specifieke eisen: er moet ruimte zijn voor een kinderwagen, een kindermenu of kleine porties, en idealiter een speelhoek of terras waar de kinderen even kunnen rennen. In de Randstad zijn tientallen restaurants en cafés die echt kindvriendelijk zijn — niet alleen het vinkje, maar echt ingericht op jonge gezinnen.

Van een **kindercafé** (speciaal ingericht voor ouders met baby's en peuters) tot een **grand café met groot terras**, van een **pannenkoekenboot** tot een **strandpaviljoen**: de keuze is groot. Let op onze badge-iconen: koffie, luierruimte en alcohol — zodat je weet wat je kunt verwachten.`,
    keywords: 'kindvriendelijk restaurant amsterdam, kindercafé utrecht, eten met peuter rotterdam, kindvriendelijk café den haag, restaurant baby peuter randstad',
    faqItems: [
      { q: 'Wat is een kindercafé en is dat anders dan een gewoon restaurant?', a: 'Een kindercafé is specifiek ingericht voor ouders met baby\'s en peuters: zachte vloeren, laag meubilair, speelgoed en vaak een speelhoek. Voorbeelden zijn Kindercafé Kikker en de Kraanvogel in Den Haag en Wonderpark Café in Amsterdam.' },
      { q: 'Moet ik reserveren bij kindvriendelijke restaurants?', a: 'Op drukke momenten (zaterdag lunch, schoolvakanties) is reserveren sterk aangeraden. Veel restaurants hebben beperkte ruimte voor kinderwagens.' },
      { q: 'Welke restaurants hebben een buitenspeeltuin of terras?', a: 'Parkrestaurant Anafora in Utrecht, Boerderij Meerzicht in Amsterdam, en Strandpaviljoen Zuid in Den Haag hebben buitenruimte waar kinderen kunnen bewegen terwijl ouders eten.' },
    ]
  },
];

const CITY_LINKS = [
  { slug: 'amsterdam', name: 'Amsterdam' },
  { slug: 'utrecht', name: 'Utrecht' },
  { slug: 'rotterdam', name: 'Rotterdam' },
  { slug: 'den-haag', name: 'Den Haag' },
  { slug: 'haarlem', name: 'Haarlem' },
  { slug: 'utrechtse-heuvelrug', name: 'Utrechtse Heuvelrug' },
  { slug: 'leiden', name: 'Leiden' },
];

const OTHER_TYPES = [
  { slug: 'speeltuinen', name: 'Speeltuinen' },
  { slug: 'musea', name: 'Musea' },
  { slug: 'pannenkoeken', name: 'Pannenkoeken' },
  { slug: 'natuur', name: 'Natuur' },
  { slug: 'horeca', name: 'Horeca' },
];

function regionLabel(region) {
  return region === 'Overig' ? 'Randstad' : region;
}

function locationHTML(loc) {
  const mapsUrl = loc.place_id ? `https://www.google.com/maps/place/?q=place_id:${loc.place_id}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`;
  const websiteLink = loc.website ? `<a href="${loc.website}" target="_blank" rel="noopener">Website</a> · ` : '';
  const badges = [];
  if (loc.coffee) badges.push('Koffie');
  if (loc.diaper) badges.push('Luierruimte');
  if (loc.alcohol) badges.push('Alcohol');
  const badgeStr = badges.length ? ` · <span class="badges">${badges.join(' · ')}</span>` : '';
  return `
      <article class="loc-item">
        <div class="loc-region">${regionLabel(loc.region)}</div>
        <h3><a href="${mapsUrl}" target="_blank" rel="noopener">${loc.name}</a></h3>
        <p>${loc.description || ''}</p>
        <p class="loc-meta">${websiteLink}<a href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>${badgeStr}</p>
      </article>`;
}

function jsonLdFaq(items) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
  }, null, 2);
}

function jsonLdItemList(page, locs) {
  return JSON.stringify({
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
}

function generatePage(page, locs) {
  // Groepeer per regio
  const byRegion = {};
  locs.forEach(loc => {
    const r = loc.region === 'Overig' ? 'Overige Randstad' : loc.region;
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(loc);
  });
  const regionOrder = ['Amsterdam', 'Utrecht', 'Rotterdam', 'Den Haag', 'Haarlem', 'Leiden', 'Overige Randstad'];
  const sectionsHTML = regionOrder
    .filter(r => byRegion[r]?.length > 0)
    .map(r => `
    <section class="region-section">
      <h2>${page.slug === 'speeltuinen' ? 'Speeltuinen' : page.slug === 'musea' ? 'Musea' : page.slug === 'pannenkoeken' ? 'Pannenkoeken' : page.slug === 'natuur' ? 'Natuur' : 'Horeca'} in ${r}</h2>
      <div class="loc-list">
        ${byRegion[r].map(locationHTML).join('')}
      </div>
    </section>`).join('');

  const faqHTML = page.faqItems.map(item => `
    <details class="faq-item">
      <summary>${item.q}</summary>
      <p>${item.a}</p>
    </details>`).join('');

  const otherTypeLinks = OTHER_TYPES
    .filter(t => t.slug !== page.slug)
    .map(t => `<a href="${t.slug}.html">${t.name}</a>`)
    .join(' · ');

  const cityLinks = CITY_LINKS.map(c => `<a href="${c.slug}.html">${c.name}</a>`).join(' · ');

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
${jsonLdItemList(page, locs)}
  </script>
  <script type="application/ld+json">
${jsonLdFaq(page.faqItems)}
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

    /* Premium polish */
    html { scroll-behavior: smooth; scroll-padding-top: 70px; }
    ::selection { background: rgba(42, 157, 143, 0.2); color: var(--text); }
    body { -webkit-font-smoothing: antialiased; }
    h1, h2, h3, h4 { font-family: var(--font-heading); }
    .hero h1 { letter-spacing: -0.02em; }
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
  <p>${locs.length} geverifieerde locaties — Amsterdam, Utrecht, Rotterdam, Den Haag en omgeving</p>
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

async function main() {
  console.log('📄 Type-landingspagina\'s genereren...\n');
  const r = await fetch(`${SB_URL}?select=*&order=region,name`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  const all = await r.json();
  console.log(`${all.length} locaties geladen\n`);

  for (const page of PAGES) {
    const locs = all.filter(l => l.type === page.dbType);
    const html = generatePage(page, locs);
    fs.writeFileSync(`${page.slug}.html`, html);
    console.log(`✅ ${page.slug}.html — ${locs.length} locaties, ${page.faqItems.length} FAQ-items`);
  }
  console.log('\nKlaar.');
}
main().catch(console.error);
