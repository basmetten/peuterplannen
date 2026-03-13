const fs = require('fs');
const path = require('path');
const { ROOT, CLUSTER_PAGES } = require('../config');
const { replaceMarker, escapeHtml } = require('../helpers');

function updateApp(data) {
  const { regions, regionCounts, total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const clusterNoscriptLinks = CLUSTER_PAGES.map((page) => `      <li><a href="${page.slug}.html">${page.h1}</a></li>`).join('\n');

  // NOSCRIPT
  const noscriptCities = regions.map(r => {
    const count = regionCounts[r.name] || 0;
    return `      <li><a href="${r.slug}.html">${r.name} (${count} locaties)</a></li>`;
  }).join('\n');

  const noscriptHTML = `<noscript>
  <div>
    <h1>PeuterPlannen</h1>
    <p>${total} uitjes voor gezinnen met jonge kinderen.</p>
    <h2>Per stad</h2>
    <ul>
${noscriptCities}
    </ul>
    <h2>Per type</h2>
    <ul>
      <li><a href="speeltuinen.html">Speeltuinen</a></li>
      <li><a href="kinderboerderijen.html">Kinderboerderijen</a></li>
      <li><a href="natuur.html">Natuur</a></li>
      <li><a href="musea.html">Musea</a></li>
      <li><a href="zwemmen.html">Zwemmen</a></li>
      <li><a href="pannenkoeken.html">Pannenkoeken</a></li>
      <li><a href="horeca.html">Horeca</a></li>
    </ul>
    <h2>Start bij situatie</h2>
    <ul>
${clusterNoscriptLinks}
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
  // Donation carousel hardcoded counts
  content = content.replace(/\d+\+ uitjes/g, `${total}+ uitjes`);
  content = content.replace(/\d+\+ locaties, gratis/g, `${total}+ locaties, gratis`);
  // Info panel
  content = content.replace(/Alle \d+ locaties zijn handmatig geverifieerd/g, `Alle ${total} locaties zijn handmatig geverifieerd`);
  const appTitle = 'PeuterPlannen app — vind peuteruitjes op afstand, type en weer';
  const appDescription = `Gebruik de PeuterPlannen app om ${total} kindvriendelijke uitjes te vinden op afstand, type, leeftijd en weer. Met regiogidsen, planning en gecheckte locaties in Nederland.`;
  content = content.replace(/<title>.*?<\/title>/, `<title>${appTitle}</title>`);
  content = content.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(appDescription)}">`);
  content = content.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(appTitle)}">`);
  content = content.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(appDescription)}">`);
  content = content.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(appTitle)}">`);
  content = content.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(appDescription)}">`);

  fs.writeFileSync(path.join(ROOT, 'app.html'), content);
  console.log(`Updated app.html (${total} locaties, ${regions.length} regio's)`);
}

module.exports = { updateApp };
