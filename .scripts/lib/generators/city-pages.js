const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, TYPE_ORDER, TYPE_IMAGES, TYPE_LABELS_CITY, CLUSTER_PAGES, NEARBY_CITIES, MUNICIPALITY_COVERAGE, CITY_FAQ, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, normalizeExternalUrl, slugify } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, badgeHTML, revealScript, newsletterHTML, editorialMetaHTML, editorialBodyHTML } = require('../html-shared');
const { isFillerDescription, sortLocationsForSeo, selectHubLocations, relatedClustersForLocations } = require('../seo-policy');
const { getBlogEntriesBySlug } = require('../seo-content');

const DEFAULT_OG = 'https://peuterplannen.nl/images/og/default.jpg';

// Import from location-pages for cleanToddlerHighlight
const { cleanToddlerHighlight } = require('./location-pages');

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

function generateCityPage(region, locs, allRegions, seoContent, total) {
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

  ${supportHTML('default', total)}

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

function generateCityPages(data, onlyRegionSlugs) {
  const { regions, locations, seoContent } = data;

  for (const region of regions) {
    if (onlyRegionSlugs && !onlyRegionSlugs.has(region.slug)) continue;
    const locs = selectHubLocations(locations.filter(l => l.region === region.name));
    const html = generateCityPage(region, locs, regions, seoContent, data.total);
    const outPath = path.join(ROOT, `${region.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${region.slug}.html — ${locs.length} locaties`);
  }
}

module.exports = { locationHTML_city, generateCityPage, generateCityPages };
