const fs = require('fs');
const path = require('path');
const { ROOT, CLUSTER_PAGES, TYPE_PAGES, ASSET_VERSION, CF_ANALYTICS_TOKEN, analyticsHTML } = require('../config');
const { escapeHtml, fullSiteUrl } = require('../helpers');
const { navHTML, footerHTML, headCommon, supportHTML, revealScript, editorialMetaHTML, editorialBodyHTML, relatedBlogLinksHTML, formatEditorialDate } = require('../html-shared');
const { getBlogEntriesBySlug } = require('../seo-content');

const DEFAULT_OG = 'https://peuterplannen.nl/images/og/default.jpg';

function generateSharedSeoPage(slug, entry, options = {}) {
  if (!entry) return null;
  const total = options.total || 0;
  const pageType = options.pageType || slug;
  const title = entry.meta_title || entry.title || options.title || 'PeuterPlannen';
  const description = entry.meta_description || options.description || '';
  const heroTitle = entry.hero_title || entry.title || options.heroTitle || title;
  const heroSub = entry.hero_sub || options.heroSub || description;
  const relatedBlogSlugs = Array.isArray(entry.related_blog_slugs) ? entry.related_blog_slugs : [];
  const relatedBlogs = getBlogEntriesBySlug(relatedBlogSlugs);
  const extraSections = options.extraSections || '';

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
${headCommon()}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://peuterplannen.nl/${slug}/">
  <meta property="og:site_name" content="PeuterPlannen">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="https://peuterplannen.nl/${slug}/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:image" content="${DEFAULT_OG}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(title)} — PeuterPlannen">
  <script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": title,
  "description": description,
  "url": `https://peuterplannen.nl/${slug}/`,
  "publisher": { "@type": "Organization", "name": "PeuterPlannen", "url": "https://peuterplannen.nl/" }
}, null, 2)}
  </script>
</head>
<body>
${navHTML()}
<div class="hero hero-blog">
  <p class="hero-kicker">${escapeHtml(entry.editorial_label || 'PeuterPlannen redactie')}</p>
  <h1 class="hero-blog-title">${escapeHtml(heroTitle)}</h1>
  <p class="hero-blog-sub">${escapeHtml(heroSub)}</p>
  <div class="hero-blog-meta">
    ${formatEditorialDate(entry.updated_at) ? `<span>Laatst bijgewerkt ${escapeHtml(formatEditorialDate(entry.updated_at))}</span>` : '<span>Redactioneel bijgehouden</span>'}
    <span>Nederland breed</span>
    <span>Peuter- en kleuterpraktijk</span>
  </div>
</div>
<nav aria-label="Kruimelpad" class="breadcrumb">
  <a href="/">PeuterPlannen</a> &rsaquo; ${escapeHtml(entry.title || heroTitle)}
</nav>
<main id="main-content">
  <section class="editorial-shell">
    ${editorialMetaHTML(entry)}
    ${editorialBodyHTML(entry)}
    <div class="editorial-support">
      <div class="editorial-support-card">
        <h3>Zo werk je het snelst</h3>
        <p>Begin met een route die past bij je dag, niet met eindeloze losse pins. Dat scheelt ouders tijd en houdt de site voor Google logisch en navigeerbaar.</p>
      </div>
      <div class="editorial-support-card">
        <h3>Handige ingangen</h3>
        <div class="editorial-support-links">
          <a href="/methode/"><strong>Hoe we selecteren</strong><span>Wat gecheckt betekent en hoe kindpraktijk zwaarder weegt dan losse listingdata.</span></a>
          <a href="/app.html"><strong>Open de app</strong><span>Gebruik afstand, type en situatie om snel een shortlist voor vandaag te maken.</span></a>
        </div>
      </div>
    </div>
  </section>
  ${extraSections}
  ${relatedBlogs.length ? `<section class="guide-section pp-reveal">
    <div class="guide-card">
      <p class="guide-kicker">Verder lezen</p>
      <h2>Relevante gidsen</h2>
      <div class="guide-links">
        ${relatedBlogs.map((blog) => `<a href="/blog/${blog.slug}/" class="guide-link"><strong>${escapeHtml(blog.title)}</strong><span>${escapeHtml(blog.description || 'Praktische gids voor ouders met jonge kinderen.')}</span></a>`).join('')}
      </div>
    </div>
  </section>` : ''}
  ${supportHTML('default', total, pageType)}
</main>
${footerHTML()}
${revealScript()}
${analyticsHTML()}
</body>
</html>`;

  const targetDir = path.join(ROOT, slug);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html);
  console.log(`  ${slug}/index.html`);
  return { slug, title, description, path: `/${slug}/` };
}

function generateDiscoverPage(data) {
  const entry = data.seoContent?.shared?.ontdekken;
  if (!entry) return null;
  const regionLinks = data.regions.map((region) => {
    const count = data.regionCounts[region.name] || 0;
    return `<a href="/${region.slug}.html" class="guide-link"><strong>${region.name}</strong><span>${count > 0 ? count + ' locaties' : 'Locaties'} in deze regio</span></a>`;
  }).join('');
  const typeLinks = TYPE_PAGES.map((page) => `<a href="/${page.slug}.html" class="guide-link"><strong>${page.sectionLabel}</strong><span>${page.metaDesc}</span></a>`).join('');
  const clusterLinks = CLUSTER_PAGES.map((cluster) => `<a href="/${cluster.slug}.html" class="guide-link"><strong>${cluster.h1}</strong><span>${cluster.metaDesc}</span></a>`).join('');
  const extraSections = `
  <section class="guide-section pp-reveal">
    <div class="guide-card">
      <p class="guide-kicker">Regio’s</p>
      <h2>Kies eerst waar je ongeveer wilt zijn</h2>
      <div class="guide-links">${regionLinks}</div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Typen uitjes</p>
      <h2>Of start met het soort plek dat past bij de dag</h2>
      <div class="guide-links">${typeLinks}</div>
    </div>
    <div class="guide-card">
      <p class="guide-kicker">Situaties</p>
      <h2>Gebruik een themapagina als het ritme belangrijker is dan de exacte plek</h2>
      <div class="guide-links">${clusterLinks}</div>
    </div>
  </section>`;
  return generateSharedSeoPage('ontdekken', entry, { extraSections, total: data.total });
}

function generateMethodologyPage(data) {
  const entry = data.seoContent?.shared?.methodologie;
  if (!entry) return null;
  return generateSharedSeoPage('methode', entry, { total: data.total });
}

module.exports = { generateSharedSeoPage, generateDiscoverPage, generateMethodologyPage };
