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

  // BROWSE_SECTION — unified type + region tabs
  const typeCards = Object.entries(TYPE_MAP).map(([type, info]) => {
    const count = typeCounts[type] || 0;
    const imgSrc = TYPE_IMAGES[type];
    const imgFileExists = imgSrc && fs.existsSync(path.join(ROOT, imgSrc));
    const img = imgFileExists ? `\n                        <picture><source type="image/webp" srcset="${imgSrc.replace(‘.png’, ‘.webp’)}"><img src="${imgSrc}" alt="" width="48" height="48" style="border-radius:var(--pp-radius-sm);margin-bottom:8px;" loading="lazy"></picture>` : ‘’;
    return `                    <a href="${info.slug}.html" class="city-card">${img}
                        <strong>${info.label}</strong>
                        <span>${count} locaties</span>
                    </a>`;
  }).join(‘\n’);

  const situatieChips = CLUSTER_PAGES.map((page) => {
    const label = page.kicker || page.h1;
    return `                    <a href="${page.slug}.html" class="situatie-chip">${escapeHtml(label)}</a>`;
  }).join(‘\n’);

  const cityCards = regions.map(r => {
    const count = regionCounts[r.name] || 0;
    return `                    <a href="${r.slug}.html" class="city-card"><strong>${r.name}</strong><span>${count} locaties</span></a>`;
  }).join(‘\n’);

  const browseHTML = `    <section class="browse-section pp-reveal" id="browse" style="background: var(--pp-bg-warm);">
        <div class="container">
            <h2 class="section-title">Ontdek uitjes</h2>
            <div class="browse-tabs" role="tablist" aria-label="Zoek op type of regio">
                <button class="browse-tab" role="tab" id="tab-type" aria-controls="panel-type" aria-selected="true" tabindex="0">Per type</button>
                <button class="browse-tab" role="tab" id="tab-regio" aria-controls="panel-regio" aria-selected="false" tabindex="-1">Per regio</button>
            </div>
            <div class="browse-panel is-active" role="tabpanel" id="panel-type" aria-labelledby="tab-type">
                <div class="cities-grid">
${typeCards}
                </div>
                <div class="situatie-chips" style="margin-top:20px;">
                    <span class="situatie-label">Op situatie:</span>
${situatieChips}
                </div>
            </div>
            <div class="browse-panel" role="tabpanel" id="panel-regio" aria-labelledby="tab-regio" hidden>
                <div class="cities-grid">
${cityCards}
                </div>
            </div>
            <p class="browse-meta">
                <a href="/ontdekken/">Alles geordend bekijken</a>
                <span>·</span>
                <a href="/methode/">Hoe we selecteren</a>
            </p>
        </div>
    </section>`;
  content = replaceMarker(content, ‘BROWSE_SECTION’, browseHTML);

  // BLOG_PREVIEW
  const blogPreviewCards = featuredBlogEntries.slice(0, 5).map((entry) => {
    return `            <a href="/blog/${entry.slug}/" class="blog-preview-card">
                <strong>${escapeHtml(entry.title)}</strong>
                <span>${escapeHtml(entry.description || 'Praktische gids voor ouders met jonge kinderen.')}</span>
            </a>`;
  }).join('\n');

  const blogPreviewHTML = `    <section class="blog-preview-section pp-reveal">
        <div class="container">
            <h2 class="section-title">Uit de blog</h2>
            <div class="blog-preview-scroll">
${blogPreviewCards}
            </div>
            <a href="/blog/" class="blog-preview-more">Alle artikelen bekijken</a>
        </div>
    </section>`;
  content = replaceMarker(content, 'BLOG_PREVIEW', blogPreviewHTML);

  // QUICK_RESULTS — static skeleton placeholder; JS fills in live data
  const quickResultsHTML = `    <section id="quick-results" class="quick-results-section pp-reveal" style="max-width:1200px;margin:0 auto;padding:32px 24px 0;">
        <h2 class="section-title">Locaties bij jou in de buurt</h2>
        <div class="pp-skeleton-row" style="display:flex;gap:16px;">
            <div class="pp-skeleton" style="flex:1;height:80px;border-radius:12px;"></div>
            <div class="pp-skeleton" style="flex:1;height:80px;border-radius:12px;"></div>
            <div class="pp-skeleton" style="flex:1;height:80px;border-radius:12px;"></div>
        </div>
        <div class="quick-results-grid"></div>
        <a href="/app.html" class="blog-preview-more">Bekijk alle locaties</a>
    </section>`;
  content = replaceMarker(content, 'QUICK_RESULTS', quickResultsHTML);

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
