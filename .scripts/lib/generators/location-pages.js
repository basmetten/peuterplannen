const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, WEATHER_LABELS, SEO_DESCRIPTION_MIN_LENGTH, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, slugify, fullSiteUrl, normalizeExternalUrl, displayExternalUrl, isoDateInTimeZone, todayISOAmsterdam, parseDateSafe } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, badgeHTML, revealScript, newsletterHTML, formatEditorialDate, editorialMetaHTML, editorialBodyHTML, relatedBlogLinksHTML } = require('../html-shared');
const { isFillerDescription, sortLocationsForSeo, getClusterPagesForLocation, matchesClusterPage } = require('../seo-policy');
const { loadBlogMetadata, getBlogEntriesBySlug, renderMarkdownDoc } = require('../seo-content');
const { FALLBACK_REGIONS } = require('../supabase');

// Blog dependencies (optional)
let matter;
try {
  matter = require('gray-matter');
} catch (e) {}

// --- Local constants (stay in this file) ---

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

function locationPageHTML(loc, region, similarLocs, total) {
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
  if (loc.opening_hours) infoItems.push(`<div class="info-item"><div><div class="info-label">Openingstijden</div><div class="info-value">${escapeHtml(loc.opening_hours)}</div></div></div>`);
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

  ${supportHTML('default', total)}

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
  const { regions, locations, total } = data;
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
      const html = canonicalTarget ? aliasLocationPageHTML(loc, canonicalTarget) : locationPageHTML(loc, region, similar, total);

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

module.exports = {
  cleanToddlerHighlight,
  locationPageHTML,
  aliasLocationPageHTML,
  generateLocationPages,
};
