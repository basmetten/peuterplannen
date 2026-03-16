const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, TYPE_ORDER, TYPE_IMAGES, TYPE_PAGES, CLUSTER_PAGES, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, normalizeExternalUrl, slugify } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, badgeHTML, revealScript, newsletterHTML, editorialMetaHTML, editorialBodyHTML } = require('../html-shared');
const { isFillerDescription, sortLocationsForSeo, selectHubLocations, relatedClustersForLocations } = require('../seo-policy');
const { getBlogEntriesBySlug } = require('../seo-content');
const { cleanToddlerHighlight } = require('./location-pages');

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

function generateTypePage(page, locs, regions, seoContent, total) {
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
  <h1>${page.h1.replace('Nederland', '<span class="accent">Nederland</span>')}</h1>
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

  ${supportHTML('category', total)}

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
    const html = generateTypePage(page, locs, regions, seoContent, data.total);
    const outPath = path.join(ROOT, `${page.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`  ${page.slug}.html — ${locs.length} locaties, ${page.faqItems.length} FAQ-items`);
  }
}

module.exports = { locationHTML_type, generateTypePage, generateTypePages };
