const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, TYPE_PAGES, CLUSTER_PAGES, SEO_MAX_CLUSTER_LOCATIONS, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, fullSiteUrl } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, revealScript, newsletterHTML, editorialMetaHTML, editorialBodyHTML } = require('../html-shared');
const { matchesClusterPage, selectHubLocations } = require('../seo-policy');
const { getBlogEntriesBySlug } = require('../seo-content');
const { locationHTML_type } = require('./type-pages');
const { cleanToddlerHighlight } = require('./location-pages');

const DEFAULT_OG = 'https://peuterplannen.nl/images/og/default.jpg';
const MAX_ITEMLIST = 20;

function buildClusterLocationSet(cluster, data) {
  const matched = data.locations.filter((loc) => matchesClusterPage(cluster, loc));
  const curated = selectHubLocations(matched, SEO_MAX_CLUSTER_LOCATIONS);
  return curated.slice(0, SEO_MAX_CLUSTER_LOCATIONS);
}

function generateClusterPage(cluster, data, locs) {
  const { regions, seoContent, total } = data;
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
      <h2>${cluster.h1} in <span class="accent">${region.name}</span></h2>
      <div class="loc-list pp-reveal-stagger">
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
    "numberOfItems": Math.min(locs.length, MAX_ITEMLIST),
    "itemListElement": locs.slice(0, MAX_ITEMLIST).map((loc, idx) => ({
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
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(clusterTitle)} — PeuterPlannen">
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
  <h1>${cluster.h1.replace('peuter', '<span class="accent">peuter</span>')}</h1>
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
  <section class="guide-section pp-reveal">
    ${editorial ? `<div class="guide-card">
      <p class="guide-kicker">${escapeHtml(editorial.editorial_label || 'PeuterPlannen redactie')}</p>
      <h2>Waarom deze route menselijker werkt dan eindeloos scrollen</h2>
      ${editorialMetaHTML(editorial)}
      ${editorialBodyHTML(editorial)}
    </div>` : ''}
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
  ${supportHTML('category', total, 'cluster')}
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

module.exports = { buildClusterLocationSet, generateClusterPage, generateClusterPages };
