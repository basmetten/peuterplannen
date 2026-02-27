/**
 * generate_city_pages.js
 * Genereert statische SEO-landingspagina's per stad vanuit Supabase
 * Gebruik: node generate_city_pages.js
 */
const fs = require('fs');
const env = fs.readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const CITIES = [
  { slug: 'amsterdam',  name: 'Amsterdam',  region: 'Amsterdam',  blurb: 'Amsterdam heeft een verrassend rijk aanbod voor ouders met jonge kinderen. Van het Vondelpark tot NEMO, van de Amsterdamse Bos tot een pannenkoekenbootje op het IJ — er is altijd iets te doen.' },
  { slug: 'utrecht',    name: 'Utrecht',    region: 'Utrecht',    blurb: 'Utrecht is een van de kindvriendelijkste steden van Nederland. Het Nijntje Museum, de Griftsteede, het Spoorwegmuseum en tientallen speeltuinen maken de stad ideaal voor een dagje uit met peuters.' },
  { slug: 'rotterdam',  name: 'Rotterdam',  region: 'Rotterdam',  blurb: 'Rotterdam verrast jonge gezinnen keer op keer. Diergaarde Blijdorp, Villa Zebra, de Pannenkoekenboot en Plaswijckpark zorgen voor een gevuld dagprogramma, binnen én buiten.' },
  { slug: 'den-haag',   name: 'Den Haag',   region: 'Den Haag',   blurb: 'Den Haag combineert strand, cultuur en natuur op loopafstand van elkaar. Madurodam, het Kunstmuseum, Scheveningen en Westduinpark zijn klassiekers voor een uitje met peuters.' },
  { slug: 'haarlem',    name: 'Haarlem',    region: 'Haarlem',    blurb: 'Haarlem is compact en groen — perfect voor een relaxt dagje uit met jonge kinderen. Het Teylers Museum, het Reinaldapark en de Kennemerduinen liggen op fietsafstand van het centrum.' },
  { slug: 'utrechtse-heuvelrug', name: 'Utrechtse Heuvelrug', region: 'Utrechtse Heuvelrug', blurb: 'De Utrechtse Heuvelrug is een schatkamer voor gezinnen met peuters. Kastelen, kinderboerderijen, pannenkoekenrestaurants in het bos en prachtige natuurspeelplaatsen — hier combineer je natuur met avontuur op loopafstand.' },
  { slug: 'leiden',     name: 'Leiden',     region: 'Leiden',     blurb: 'Leiden is een compacte universiteitsstad met verrassend veel te doen voor peuters. Van het Naturalis tot kinderboerderijen en een pannenkoekenrestaurant aan het water.' },
];

const TYPE_LABELS = {
  play:    'Speeltuinen & Speelparadijzen',
  nature:  'Natuur & Kinderboerderijen',
  museum:  'Musea',
  horeca:  'Kindvriendelijke Horeca',
  pancake: 'Pannenkoekenrestaurants',
};

const TYPE_ORDER = ['play','nature','museum','pancake','horeca'];

const NAV_LINKS = CITIES.map(c => `<a href="${c.slug}.html">${c.name}</a>`).join('\n        ');

function badge(loc) {
  const parts = [];
  if (loc.coffee) parts.push('Koffie');
  if (loc.alcohol) parts.push('Alcohol');
  if (loc.diaper) parts.push('Luierruimte');
  return parts.length ? `<span class="badges">${parts.join(' · ')}</span>` : '';
}

function locationHTML(loc) {
  const mapsUrl = loc.place_id ? `https://www.google.com/maps/place/?q=place_id:${loc.place_id}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ", " + (loc.region || ""))}`;
  const websiteLink = loc.website ? `<a href="${loc.website}" target="_blank" rel="noopener">Website</a> · ` : '';
  return `
      <article class="loc-item">
        <h3><a href="${mapsUrl}" target="_blank" rel="noopener">${loc.name}</a></h3>
        <p>${loc.description || ''}</p>
        <p class="loc-meta">${websiteLink}<a href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>${badge(loc) ? ' · ' + badge(loc) : ''}</p>
      </article>`;
}

function jsonLdItemList(city, locs) {
  const items = locs.map((loc, i) => ({
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
      "address": { "@type": "PostalAddress", "addressLocality": city.name, "addressCountry": "NL" }
    }
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Uitjes met peuters in ${city.name}`,
    "description": `De beste kinderactiviteiten en uitjes voor peuters in ${city.name}`,
    "numberOfItems": locs.length,
    "itemListElement": items
  }, null, 2);
}

function generatePage(city, locs) {
  const byType = {};
  TYPE_ORDER.forEach(t => { byType[t] = locs.filter(l => l.type === t); });

  const sectionsHTML = TYPE_ORDER
    .filter(t => byType[t].length > 0)
    .map(t => `
    <section class="type-section">
      <h2>${TYPE_LABELS[t]}</h2>
      <div class="loc-list">
        ${byType[t].map(locationHTML).join('')}
      </div>
    </section>`).join('');

  const otherCities = CITIES.filter(c => c.slug !== city.slug)
    .map(c => `<a href="${c.slug}.html">${c.name}</a>`).join(' · ');

  const weatherNote = city.slug === 'amsterdam' || city.slug === 'rotterdam'
    ? 'Bij slecht weer raden we speelparadijzen zoals Monkey Town of Ballorig aan. '
    : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${city.name} met peuters — speeltuinen, musea & restaurants | PeuterPlannen</title>
  <meta name="description" content="Ontdek de beste uitjes voor peuters in ${city.name}. ${locs.length} kindvriendelijke locaties: speeltuinen, musea, pannenkoeken en natuur. Geverifieerd en actueel.">
  <meta name="keywords" content="uitjes peuters ${city.name}, wat te doen met peuter ${city.name}, dagje weg ${city.name} kinderen, kindvriendelijk ${city.name}, peuter activiteiten ${city.name}">
  <link rel="canonical" href="https://peuterplannen.nl/${city.slug}.html">
  <meta property="og:title" content="${city.name} met peuters | PeuterPlannen">
  <meta property="og:description" content="${locs.length} geverifieerde uitjes voor peuters in ${city.name}: speeltuinen, musea, natuur en kindvriendelijke horeca.">
  <meta property="og:url" content="https://peuterplannen.nl/${city.slug}.html">
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
${jsonLdItemList(city, locs)}
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
    <a href="app.html?regio=${encodeURIComponent(city.name)}" class="nav-cta">Zoek in ${city.name}</a>
  </div>
</nav>

<div class="hero">
  <h1>Uitjes met peuters in <span>${city.name}</span></h1>
  <p>${city.blurb}</p>
  <div class="hero-stats">
    <div class="hero-stat"><strong>${locs.length}</strong><span>locaties</span></div>
    <div class="hero-stat"><strong>${byType.play?.length || 0}</strong><span>speeltuinen</span></div>
    <div class="hero-stat"><strong>${byType.museum?.length || 0}</strong><span>musea</span></div>
    <div class="hero-stat"><strong>${(byType.pancake?.length || 0) + (byType.horeca?.length || 0)}</strong><span>eten & drinken</span></div>
  </div>
</div>

<div class="breadcrumb">
  <a href="index.html">PeuterPlannen</a> › ${city.name}
</div>

<main id="main-content">
  <div class="intro-box">
    <p>${city.blurb} ${weatherNote}Op deze pagina vind je <strong>${locs.length} geverifieerde locaties</strong> in ${city.name} — allemaal gecontroleerd op adres, openingstijden en kindvriendelijkheid.</p>
  </div>

  ${sectionsHTML}

  <div class="cta-block">
    <h3>Zoek op jouw locatie</h3>
    <p>De app toont locaties gesorteerd op afstand van jouw positie — handig als je niet precies weet waar je bent.</p>
    <a href="app.html?regio=${encodeURIComponent(city.name)}">Open de app voor ${city.name}</a>
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

async function main() {
  console.log('📄 Stad-landingspagina\'s genereren...\n');

  const r = await fetch(`${SB_URL}?select=*&order=name`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  const all = await r.json();
  console.log(`${all.length} locaties geladen uit Supabase\n`);

  for (const city of CITIES) {
    const locs = all.filter(l => l.region === city.region);
    const html = generatePage(city, locs);
    const outPath = `${city.slug}.html`;
    fs.writeFileSync(outPath, html);
    console.log(`✅ ${outPath} — ${locs.length} locaties`);
  }

  console.log('\nKlaar! Commit met: git add *.html && git commit -m "SEO stad-landingspaginas"');
}

main().catch(console.error);
