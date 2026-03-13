const fs = require('fs');
const path = require('path');
const { ROOT, TYPE_PAGES, CLUSTER_PAGES, TYPE_MAP } = require('../config');
const { fullSiteUrl, cleanPathLike, todayISO } = require('../helpers');
const { computeLocationBonusPriority } = require('../seo-policy');

function sitePathToFile(sitePath) {
  const clean = cleanPathLike(sitePath);
  if (clean === '/') return path.join(ROOT, 'index.html');
  if (clean.endsWith('/')) return path.join(ROOT, clean.slice(1), 'index.html');
  return path.join(ROOT, clean.slice(1));
}

function buildPageCatalog(data, blogPosts, clusterPages, sharedPages = []) {
  const pages = [];
  const lastmod = todayISO();

  const pushPage = (page) => pages.push({
    inSitemap: false,
    robots: 'index,follow',
    hasGscSignal: false,
    lastmod,
    ...page,
  });

  pushPage({ path: '/', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'index.html'), priority: '1.0', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/app.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'app.html'), priority: '0.9', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/about.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'about.html'), priority: '0.5', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/contact.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'contact.html'), priority: '0.4', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/voor-bedrijven/', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'voor-bedrijven', 'index.html'), priority: '0.6', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/blog/', pageType: 'blog_index', tier: 'hub', filePath: path.join(ROOT, 'blog', 'index.html'), priority: '0.8', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/ontdekken/', pageType: 'discover_hub', tier: 'hub', filePath: path.join(ROOT, 'ontdekken', 'index.html'), priority: '0.82', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/methode/', pageType: 'methodology_page', tier: 'hub', filePath: path.join(ROOT, 'methode', 'index.html'), priority: '0.55', changefreq: 'monthly', inSitemap: true });

  for (const region of data.regions) {
    pushPage({
      path: `/${region.slug}.html`,
      pageType: 'region_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${region.slug}.html`),
      priority: region.tier === 'primary' ? '0.85' : '0.75',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const page of TYPE_PAGES) {
    pushPage({
      path: `/${page.slug}.html`,
      pageType: 'type_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${page.slug}.html`),
      priority: '0.8',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const cluster of clusterPages) {
    pushPage({
      path: `/${cluster.slug}.html`,
      pageType: 'cluster_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${cluster.slug}.html`),
      priority: '0.78',
      changefreq: 'weekly',
      inSitemap: true,
    });
  }

  for (const post of blogPosts || []) {
    pushPage({
      path: `/blog/${post.slug}/`,
      pageType: 'blog_article',
      tier: 'hub',
      filePath: path.join(ROOT, 'blog', post.slug, 'index.html'),
      priority: '0.65',
      changefreq: 'monthly',
      lastmod: post.date,
      inSitemap: true,
    });
  }

  for (const page of sharedPages || []) {
    if (!page?.path || page.path === '/ontdekken/' || page.path === '/methode/') continue;
    pushPage({
      path: page.path,
      pageType: 'shared_editorial',
      tier: 'hub',
      filePath: sitePathToFile(page.path),
      priority: '0.6',
      changefreq: 'monthly',
      inSitemap: true,
    });
  }

  for (const loc of data.locations) {
    pushPage({
      path: loc.pageUrl,
      pageType: 'location_detail',
      tier: loc.seoTierResolved,
      filePath: sitePathToFile(loc.pageUrl),
      priority: loc.seoTierResolved === 'index' ? (0.64 + computeLocationBonusPriority(loc)).toFixed(2) : '0.3',
      changefreq: 'monthly',
      lastmod: loc.last_verified_at || lastmod,
      inSitemap: loc.seoTierResolved === 'index' && !loc.seo_exclude_from_sitemap,
      robots: loc.seoRobots,
      hasGscSignal: !!loc.seoHasGscSignal,
      qualityScore: loc.seoQualityScore,
      parentHubPath: `/${loc.regionSlug}.html`,
      typeHubPath: TYPE_MAP[loc.type]?.slug ? `/${TYPE_MAP[loc.type].slug}.html` : null,
    });
  }

  return pages;
}

function writeUrlSet(fileName, pages) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url>\n    <loc>${fullSiteUrl(page.path)}</loc>\n    <lastmod>${page.lastmod || todayISO()}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, fileName), xml);
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function generateSitemapsFromCatalog(catalog) {
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/^sitemap-locations-\d+\.xml$/.test(entry.name)) continue;
    fs.rmSync(path.join(ROOT, entry.name), { force: true });
  }

  const corePages = catalog.filter((page) => page.inSitemap && page.tier === 'core');
  const hubPages = catalog.filter((page) => page.inSitemap && page.tier === 'hub' && !['blog_index', 'blog_article'].includes(page.pageType));
  const blogPages = catalog.filter((page) => page.inSitemap && ['blog_index', 'blog_article'].includes(page.pageType));
  const locationPages = catalog.filter((page) => page.inSitemap && page.pageType === 'location_detail');

  const sitemapFiles = [];
  if (corePages.length) {
    writeUrlSet('sitemap-core.xml', corePages);
    sitemapFiles.push('sitemap-core.xml');
  }
  if (hubPages.length) {
    writeUrlSet('sitemap-hubs.xml', hubPages);
    sitemapFiles.push('sitemap-hubs.xml');
  }
  if (blogPages.length) {
    writeUrlSet('sitemap-blog.xml', blogPages);
    sitemapFiles.push('sitemap-blog.xml');
  }
  chunk(locationPages, 500).forEach((group, idx) => {
    const fileName = `sitemap-locations-${String(idx + 1).padStart(2, '0')}.xml`;
    writeUrlSet(fileName, group);
    sitemapFiles.push(fileName);
  });

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapFiles.map((fileName) => `  <sitemap>\n    <loc>https://peuterplannen.nl/${fileName}</loc>\n    <lastmod>${todayISO()}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indexXml);
  console.log(`Updated sitemap.xml index (${sitemapFiles.length} files, ${catalog.filter((page) => page.inSitemap).length} indexable URLs)`);
  return sitemapFiles;
}

module.exports = { sitePathToFile, buildPageCatalog, writeUrlSet, chunk, generateSitemapsFromCatalog };
