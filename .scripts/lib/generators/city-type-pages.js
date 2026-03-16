const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, TYPE_ORDER, TYPE_LABELS_CITY, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, normalizeExternalUrl, slugify } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, badgeHTML, revealScript, newsletterHTML } = require('../html-shared');
const { isFillerDescription, selectHubLocations, relatedClustersForLocations } = require('../seo-policy');

const DEFAULT_OG = 'https://peuterplannen.nl/images/og/default.jpg';

const MIN_LOCATIONS = 3;
const MAX_ITEMLIST = 20;

function locationHTML_cityType(loc) {
  const locationUrl = loc.pageUrl || '#';
  const normalizedWebsite = normalizeExternalUrl(loc.website);
  const websiteLink = normalizedWebsite
    ? `<a href="${escapeHtml(normalizedWebsite)}" target="_blank" rel="noopener" class="loc-website-btn" aria-label="Website van ${escapeHtml(loc.name)}">Website</a>`
    : '';
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

function generateCityTypePage(region, typeKey, locs, allRegions, total) {
  const typeInfo = TYPE_MAP[typeKey];
  const typeLabel = TYPE_LABELS_CITY[typeKey] || typeInfo?.label || typeKey;
  const typeLabelShort = typeInfo?.label || typeKey;
  const typeSlug = typeInfo?.slug || slugify(typeLabel);
  const cityName = region.name;
  const citySlug = region.slug;
  const count = locs.length;

  const coffeeCount = locs.filter(l => l.coffee).length;
  const diaperCount = locs.filter(l => l.diaper).length;

  const pageTitle = `${typeLabel} in ${cityName} voor peuters | PeuterPlannen`;
  const pageDescription = `De ${count} beste ${typeLabelShort.toLowerCase()} in ${cityName} voor peuters en kleuters. Geverifieerd op kindvriendelijkheid, koffie, verschonen en praktisch gebruik.`;
  const canonicalUrl = `https://peuterplannen.nl/${citySlug}/${typeSlug}/`;

  const faqItems = [
    {
      q: `Hoeveel ${typeLabelShort.toLowerCase()} voor peuters zijn er in ${cityName}?`,
      a: `Op PeuterPlannen staan ${count} ${typeLabelShort.toLowerCase()} in ${cityName} die zijn geverifieerd op peutervriendelijkheid. We checken onder andere op kindvriendelijkheid, toegankelijkheid en praktische voorzieningen.`,
    },
    {
      q: `Welke ${typeLabelShort.toLowerCase()} in ${cityName} hebben koffie voor ouders?`,
      a: coffeeCount > 0
        ? `${coffeeCount} van de ${count} ${typeLabelShort.toLowerCase()} in ${cityName} hebben koffie voor ouders beschikbaar. Handig als je een ochtend of middag wil doorbrengen.`
        : `Niet alle ${typeLabelShort.toLowerCase()} in ${cityName} hebben koffie voor ouders. Check de detailpagina's voor de meest actuele informatie.`,
    },
    {
      q: `Hoe kies ik de beste ${typeLabelShort.toLowerCase()} in ${cityName} voor mijn peuter?`,
      a: `Kijk naar de badges op de locatiekaarten: koffie, luierruimte en kindvriendelijkheid zijn goede indicatoren. ${diaperCount > 0 ? `${diaperCount} van de ${count} locaties in ${cityName} hebben een luierruimte.` : ''} Via de PeuterPlannen app kun je ook filteren op afstand en faciliteiten.`,
    },
  ];

  const relatedClusters = relatedClustersForLocations(locs);

  // Related city+type links: other types in this city
  const otherTypesInCity = TYPE_ORDER
    .filter(t => t !== typeKey && TYPE_MAP[t])
    .slice(0, 4)
    .map(t => {
      const ti = TYPE_MAP[t];
      return `<a href="/${citySlug}/${ti.slug}/">${TYPE_LABELS_CITY[t] || ti.label} in ${cityName}</a>`;
    })
    .join(' &middot; ');

  // Related regions with same type
  const otherRegionsLinks = allRegions
    .filter(r => r.slug !== citySlug)
    .slice(0, 5)
    .map(r => `<a href="/${r.slug}/${typeSlug}/">${typeLabelShort} in ${r.name}</a>`)
    .join(' &middot; ');

  const itemListItems = locs.slice(0, MAX_ITEMLIST).map((loc, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: loc.name,
    description: loc.description || '',
    url: `https://peuterplannen.nl${loc.pageUrl}`,
    item: {
      '@type': 'TouristAttraction',
      name: loc.name,
      description: loc.description || '',
      geo: { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lng },
      address: { '@type': 'PostalAddress', addressLocality: cityName, addressCountry: 'NL' },
    },
  }));

  const jsonLdItemList = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${typeLabel} in ${cityName} voor peuters`,
    description: pageDescription,
    numberOfItems: Math.min(count, MAX_ITEMLIST),
    itemListElement: itemListItems,
  }, null, 2);

  const jsonLdFaq = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }, null, 2);

  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'PeuterPlannen', item: 'https://peuterplannen.nl/' },
      { '@type': 'ListItem', position: 2, name: `${cityName} met peuters`, item: `https://peuterplannen.nl/${citySlug}.html` },
      { '@type': 'ListItem', position: 3, name: typeLabel, item: canonicalUrl },
    ],
  }, null, 2);

  const faqHTML = faqItems.map(item => `
    <details class="faq-item">
      <summary>${escapeHtml(item.q)}</summary>
      <div class="faq-answer"><p>${escapeHtml(item.a)}</p></div>
    </details>`).join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(typeLabel)} in ${escapeHtml(cityName)} — PeuterPlannen">
  <script type="application/ld+json">
${jsonLdItemList}
  </script>
  <script type="application/ld+json">
${jsonLdFaq}
  </script>
  <script type="application/ld+json">
${breadcrumbLd}
  </script>
</head>
<body>

${navHTML(`Zoek in ${cityName}`, `/app.html?regio=${encodeURIComponent(cityName)}`)}

<div class="hero">
  <h1><span class="accent">${escapeHtml(typeLabel)}</span> in ${escapeHtml(cityName)}</h1>
  <p>${count} peutervriendelijke locaties in ${cityName}, gecheckt op kindvriendelijkheid en praktische voorzieningen.</p>
</div>

<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; <a href="/${citySlug}.html">${escapeHtml(cityName)}</a> &rsaquo; ${escapeHtml(typeLabel)}
</nav>

<main id="main-content">
  <div class="intro-box">
    <p>Op deze pagina vind je <strong>${count} ${typeLabelShort.toLowerCase()}</strong> in ${cityName} die zijn geverifieerd op peutervriendelijkheid. We beoordelen elke locatie op toegankelijkheid voor kinderen van 1 tot 5 jaar, aanwezigheid van koffie voor ouders, luierruimte en hoe prettig het er in de praktijk is op een gewone dag met een peuter. ${coffeeCount > 0 ? `Van de ${count} locaties hebben er ${coffeeCount} koffie voor ouders.` : ''}</p>
    <p>Gebruik de <a href="/app.html?regio=${encodeURIComponent(cityName)}">PeuterPlannen app</a> om te filteren op afstand, type en faciliteiten. Lees ook <a href="/methode/">hoe we selecteren</a> voor meer achtergrond over onze werkwijze.</p>
  </div>

  <section class="guide-section city-type-guide">
    <div class="guide-card">
      <p class="guide-kicker">Overzicht</p>
      <h2>${escapeHtml(typeLabel)} in ${escapeHtml(cityName)}</h2>
      <p>We hebben ${count} ${typeLabelShort.toLowerCase()} in ${cityName} beoordeeld op bruikbaarheid voor gezinnen met peuters. Niet elke plek die populair is, werkt goed met een kind van twee. We kijken naar tempo, overzicht, praktische voorzieningen en de vraag of een plek ook op een rommelige dag nog prettig is.</p>
      <ul class="guide-list">
        <li><strong>Koffie:</strong> ${coffeeCount} van de ${count} locaties hebben koffie voor ouders beschikbaar.</li>
        <li><strong>Luierruimte:</strong> ${diaperCount} van de ${count} locaties hebben een verschoonplek.</li>
        <li><strong>Leeftijd:</strong> alle locaties zijn geschikt voor kinderen van 1 tot 5 jaar, tenzij anders vermeld.</li>
      </ul>
      <a href="/methode/" class="guide-inline-link">Lees hoe we selecteren</a>
    </div>
    ${relatedClusters.length ? `<div class="guide-card">
      <p class="guide-kicker">Gerelateerde situaties</p>
      <h2>Zoek je iets specifieks?</h2>
      <p>Naast dit overzicht zijn er ook situatiepagina's die beter passen bij een specifieke dag of wens.</p>
      <div class="guide-links">
        ${relatedClusters.map(cluster => `<a href="/${cluster.slug}.html" class="guide-link"><strong>${escapeHtml(cluster.h1)}</strong><span>${escapeHtml(cluster.metaDesc)}</span></a>`).join('')}
      </div>
    </div>` : ''}
  </section>

  <section class="type-section">
    <h2>${escapeHtml(typeLabel)} in ${escapeHtml(cityName)}</h2>
    <div class="loc-list">
      ${locs.map(locationHTML_cityType).join('')}
    </div>
  </section>

  <div class="faq-section">
    <h2>Veelgestelde vragen over ${typeLabelShort.toLowerCase()} in ${cityName}</h2>
    ${faqHTML}
  </div>

  ${newsletterHTML()}

  <div class="cta-block">
    <h3>Zoek op jouw locatie in ${escapeHtml(cityName)}</h3>
    <p>De app toont ${typeLabelShort.toLowerCase()} en andere uitjes gesorteerd op afstand van jouw positie.</p>
    <a href="/app.html?regio=${encodeURIComponent(cityName)}">Open de app voor ${escapeHtml(cityName)}</a>
  </div>

  ${supportHTML('default', total)}

  <div class="nav-links-box">
    <h3>Andere uitjes in ${escapeHtml(cityName)}</h3>
    <p><a href="/${citySlug}.html">Alle uitjes in ${escapeHtml(cityName)}</a></p>
    ${otherTypesInCity ? `<p>${otherTypesInCity}</p>` : ''}
    <div class="divider">
      <h3 style="margin-bottom:10px;">${escapeHtml(typeLabelShort)} in andere steden</h3>
      <p><a href="/${typeSlug}.html">Alle ${typeLabelShort.toLowerCase()} in Nederland</a></p>
      ${otherRegionsLinks ? `<p>${otherRegionsLinks}</p>` : ''}
    </div>
  </div>
</main>

${footerHTML()}

${revealScript()}
${analyticsHTML()}
</body>
</html>`;
}

/**
 * Generate city+type combination pages.
 * Returns an array of combo objects { regionSlug, typeSlug, path, filePath }
 * so the sitemap builder can register them.
 */
function generateCityTypePages(data) {
  const { regions, locations } = data;
  const generatedCombos = [];

  for (const region of regions) {
    for (const typeKey of TYPE_ORDER) {
      const typeInfo = TYPE_MAP[typeKey];
      if (!typeInfo) continue;

      const regionLocs = locations.filter(l => l.region === region.name && l.type === typeKey);
      const hubLocs = selectHubLocations(regionLocs);

      if (hubLocs.length < MIN_LOCATIONS) continue;

      const typeSlug = typeInfo.slug;
      const dirPath = path.join(ROOT, region.slug, typeSlug);
      fs.mkdirSync(dirPath, { recursive: true });

      const html = generateCityTypePage(region, typeKey, hubLocs, regions, data.total);
      const outPath = path.join(dirPath, 'index.html');
      fs.writeFileSync(outPath, html);

      const pagePath = `/${region.slug}/${typeSlug}/`;
      generatedCombos.push({
        regionSlug: region.slug,
        typeSlug,
        path: pagePath,
        filePath: outPath,
      });

      console.log(`  ${region.slug}/${typeSlug}/ — ${hubLocs.length} locaties`);
    }
  }

  console.log(`  Total city+type pages: ${generatedCombos.length}`);
  return generatedCombos;
}

module.exports = { generateCityTypePages, locationHTML_cityType };
