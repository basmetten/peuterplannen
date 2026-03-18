const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_MAP, TYPE_IMAGES, CLUSTER_PAGES } = require('../config');
const { replaceMarker, escapeHtml } = require('../helpers');
const { editorialMetaHTML } = require('../html-shared');
const { loadBlogMetadata } = require('../seo-content');

function updateIndex(data) {
  const { regions, regionCounts, typeCounts, total, seoSummary, seoContent } = data;
  let content = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const discoverEntry = seoContent?.shared?.ontdekken;
  const featuredBlogEntries = [...loadBlogMetadata().values()]
    .filter((entry) => entry.published)
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
    .slice(0, 6);

  // HERO_KICKER
  const kickerHTML = `            <p class="hero-kicker">${total} locaties · ${regions.length} regio's · 100% geverifieerd</p>`;
  content = replaceMarker(content, 'HERO_KICKER', kickerHTML);

  // TYPE_GRID
  const typeCards = Object.entries(TYPE_MAP).map(([type, info]) => {
    const count = typeCounts[type] || 0;
    const imgSrc = TYPE_IMAGES[type];
    const imgFileExists = imgSrc && fs.existsSync(path.join(ROOT, imgSrc));
    const img = imgFileExists ? `\n                    <picture><source type="image/webp" srcset="${imgSrc.replace('.png', '.webp')}"><img src="${imgSrc}" alt="" width="48" height="48" style="border-radius:var(--pp-radius-sm);margin-bottom:8px;" loading="lazy"></picture>` : '';
    return `                <a href="${info.slug}.html" class="city-card">${img}
                    <strong>${info.label}</strong>
                    <span>${count} locaties</span>
                </a>`;
  }).join('\n');

  const clusterCards = CLUSTER_PAGES.map((page) => `              <a href="${page.slug}.html" class="guide-link">
                <strong>${page.h1}</strong>
                <span>${page.metaDesc}</span>
              </a>`).join('\n');

  const typeGridHTML = `    <section class="cities-section pp-reveal" style="background: var(--pp-bg-warm);">
        <div class="container">
            <h2 class="section-title">Uitjes per type</h2>
            <p class="section-sub">Weet je al wat voor dag het wordt? Zoek direct op type uitje.</p>
            <div class="cities-grid">
${typeCards}
            </div>
            <div class="guide-section guide-section-featured" style="margin-top:32px;">
                <div class="guide-card guide-card-lead">
                    <p class="guide-kicker">Start bij situatie</p>
                    <h3>Niet zoeken op locatie, maar op de dag die je hebt</h3>
                    <p class="guide-card-intro">Deze routes helpen ouders sneller naar de juiste keuze en geven de site een heldere structuur: regen, dreumes, horeca met speelhoek of een plek waar koffie en spelen logisch samengaan.</p>
                    <div class="guide-pills">
                      <span class="guide-pill">Regenproof</span>
                      <span class="guide-pill">Dreumes</span>
                      <span class="guide-pill">Koffie + spelen</span>
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <div class="guide-links">
${clusterCards}
                    </div>
                </div>
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

  const crawlHubHTML = `          <div class="guide-section guide-section-hub" style="margin-top:32px;">
                <div class="guide-card guide-card-lead">
                    <p class="guide-kicker">Zoek niet te breed</p>
                    <h3>${escapeHtml(discoverEntry?.hero_title || 'Begin bij een route die bij je dag past')}</h3>
                    <p class="guide-card-intro">${escapeHtml(discoverEntry?.hero_sub || 'Gebruik regio’s, typen en themapagina’s als ingang. Dat werkt sneller voor ouders en geeft Google ook een duidelijker beeld van wat de belangrijkste pagina’s zijn.')}</p>
                    ${editorialMetaHTML(discoverEntry)}
                    <div class="guide-pills">
                      <span class="guide-pill">Regio</span>
                      <span class="guide-pill">Type uitje</span>
                      <span class="guide-pill">Situatie</span>
                    </div>
                    <div class="guide-links">
                      <a href="/ontdekken/" class="guide-link"><strong>Alles geordend bekijken</strong><span>Regio’s, typen, situaties en blogroutes op één crawlbare pagina.</span></a>
                      <a href="/methode/" class="guide-link"><strong>Hoe PeuterPlannen selecteert</strong><span>Waarom sommige pagina’s zwaarder wegen dan andere, en hoe we kindpraktijk meewegen.</span></a>
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <p class="guide-kicker">Belangrijkste ingangen</p>
                    <h3>Snelle routes door de site</h3>
                    <div class="guide-links">
                      ${regions.slice(0, 9).map((region) => `<a href="/${region.slug}.html" class="guide-link"><strong>${region.name}</strong><span>${regionCounts[region.name] || 0} locaties in deze regio</span></a>`).join('')}
                    </div>
                </div>
                <div class="guide-card guide-card-compact">
                    <p class="guide-kicker">Verder lezen</p>
                    <h3>Gebruik blog en clusterpagina’s als keuzehulp</h3>
                    <div class="guide-links">
                      ${featuredBlogEntries.map((entry) => `<a href="/blog/${entry.slug}/" class="guide-link"><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
                    </div>
                </div>
            </div>`;

  const cityGridHTML = `    <section class="cities-section pp-reveal">
        <div class="container">
            <h2 class="section-title">Uitjes per regio</h2>
            <p class="section-sub">Elke regio omvat de stad én omliggende gemeenten. Gecheckt en actueel.</p>
            <div class="cities-grid">
${cityCards}
            </div>
${crawlHubHTML}
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
      "description": "Vind kindvriendelijke uitjes voor kinderen van 0-7 jaar in heel Nederland. ${total} locaties in ${regions.length} regio's.",
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
  const brandSchemaHTML = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PeuterPlannen",
    "url": "https://peuterplannen.nl/",
    "description": "De beste uitjes voor peuters in heel Nederland. ${total} geverifieerde locaties in ${regions.length} regio's.",
    "inLanguage": "nl-NL",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://peuterplannen.nl/app.html?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PeuterPlannen",
    "url": "https://peuterplannen.nl/",
    "logo": {
      "@type": "ImageObject",
      "url": "https://peuterplannen.nl/icons/apple-touch-icon.png",
      "width": 180,
      "height": 180
    },
    "description": "PeuterPlannen helpt ouders met peuters de leukste uitjes te vinden in Nederland. Geverifieerde speeltuinen, kinderboerderijen, musea en restaurants.",
    "foundingDate": "2025",
    "areaServed": {"@type": "Country", "name": "Nederland"},
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hoi@peuterplannen.nl",
      "contactType": "customer support",
      "availableLanguage": "Dutch"
    }
  }
  </script>`;
  content = replaceMarker(content, 'JSONLD_INDEX', jsonldHTML + brandSchemaHTML);

  // Also update OG/Twitter descriptions with correct count
  content = content.replace(/\d+ geverifieerde kindvriendelijke locaties/g, `${total} geverifieerde kindvriendelijke locaties`);
  // Also update meta name="description" (different phrasing, not matched by above)
  content = content.replace(
    /(<meta name="description" content=")\d+ kindvriendelijke locaties in Nederland/,
    `$1${total} kindvriendelijke locaties in Nederland`
  );
  const homeTitle = 'PeuterPlannen | Uitjes voor peuters in heel Nederland';
  const homeDescription = `${total} kindvriendelijke locaties in Nederland, handmatig geverifieerd. Vind het perfecte uitje voor je peuter op type, leeftijd, weer en afstand.`;
  content = content.replace(/<title>.*?<\/title>/, `<title>${homeTitle}</title>`);
  content = content.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(homeDescription)}">`);
  content = content.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(homeTitle)}">`);
  content = content.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(homeDescription)}">`);
  content = content.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(homeTitle)}">`);
  content = content.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(homeDescription)}">`);
  fs.writeFileSync(path.join(ROOT, 'index.html'), content);
  console.log(`Updated index.html (${total} locaties, ${regions.length} regio's)`);
}

module.exports = { updateIndex };
