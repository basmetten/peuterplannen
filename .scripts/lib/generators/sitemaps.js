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

/**
 * Returns the most recent ISO date string from a list of locations,
 * looking at last_verified_at and updated_at fields.
 * Returns null if no valid date is found.
 */
function maxLastVerified(locations) {
  let best = null;
  for (const loc of locations) {
    for (const field of ['last_verified_at', 'updated_at']) {
      const val = loc[field];
      if (!val) continue;
      // Normalize to ISO date string (YYYY-MM-DD)
      const dateStr = typeof val === 'string' ? val.slice(0, 10) : null;
      if (!dateStr) continue;
      if (!best || dateStr > best) best = dateStr;
    }
  }
  return best;
}

function buildPageCatalog(data, blogPosts, clusterPages, sharedPages = [], cityTypeCombos = []) {
  const pages = [];
  const fallbackLastmod = todayISO();

  const pushPage = (page) => pages.push({
    inSitemap: false,
    robots: 'index,follow',
    hasGscSignal: false,
    lastmod: fallbackLastmod,
    ...page,
  });

  // --- Precompute per-region and per-type max dates from location data ---

  // regionName → max last_verified_at (or updated_at)
  const regionNameToMaxDate = {};
  // dbType → max last_verified_at (or updated_at)
  const dbTypeToMaxDate = {};
  // "regionSlug:typeSlug" → max last_verified_at (or updated_at)
  const regionTypeToMaxDate = {};

  for (const loc of data.locations) {
    // Determine best date for this location
    let locDate = null;
    for (const field of ['last_verified_at', 'updated_at']) {
      const val = loc[field];
      if (!val) continue;
      const dateStr = typeof val === 'string' ? val.slice(0, 10) : null;
      if (dateStr && (!locDate || dateStr > locDate)) locDate = dateStr;
    }
    if (!locDate) continue;

    // Update region map (keyed by region name, as used in city-pages)
    const regionName = loc.region;
    if (regionName) {
      if (!regionNameToMaxDate[regionName] || locDate > regionNameToMaxDate[regionName]) {
        regionNameToMaxDate[regionName] = locDate;
      }
    }

    // Update dbType map
    const dbType = loc.type;
    if (dbType) {
      if (!dbTypeToMaxDate[dbType] || locDate > dbTypeToMaxDate[dbType]) {
        dbTypeToMaxDate[dbType] = locDate;
      }
    }

    // Update regionSlug:typeSlug map (for city_type_combo)
    const regionSlug = loc.regionSlug;
    const typeSlug = TYPE_MAP[dbType]?.slug;
    if (regionSlug && typeSlug) {
      const key = `${regionSlug}:${typeSlug}`;
      if (!regionTypeToMaxDate[key] || locDate > regionTypeToMaxDate[key]) {
        regionTypeToMaxDate[key] = locDate;
      }
    }
  }

  // --- Core pages (no location-based lastmod, keep fallback) ---
  pushPage({ path: '/', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'index.html'), priority: '1.0', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/app.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'app.html'), priority: '0.9', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/about.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'about.html'), priority: '0.5', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/contact.html', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'contact.html'), priority: '0.4', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/voor-bedrijven/', pageType: 'core', tier: 'core', filePath: path.join(ROOT, 'voor-bedrijven', 'index.html'), priority: '0.6', changefreq: 'monthly', inSitemap: true });
  pushPage({ path: '/blog/', pageType: 'blog_index', tier: 'hub', filePath: path.join(ROOT, 'blog', 'index.html'), priority: '0.8', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/ontdekken/', pageType: 'discover_hub', tier: 'hub', filePath: path.join(ROOT, 'ontdekken', 'index.html'), priority: '0.82', changefreq: 'weekly', inSitemap: true });
  pushPage({ path: '/methode/', pageType: 'methodology_page', tier: 'hub', filePath: path.join(ROOT, 'methode', 'index.html'), priority: '0.55', changefreq: 'monthly', inSitemap: true });

  // --- Region hub pages: use max last_verified_at of their locations ---
  for (const region of data.regions) {
    const regionLastmod = regionNameToMaxDate[region.name] || fallbackLastmod;
    pushPage({
      path: `/${region.slug}.html`,
      pageType: 'region_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${region.slug}.html`),
      priority: region.tier === 'primary' ? '0.85' : '0.75',
      changefreq: 'weekly',
      inSitemap: true,
      lastmod: regionLastmod,
    });
  }

  // --- Type hub pages: use max last_verified_at of their locations by dbType ---
  for (const page of TYPE_PAGES) {
    const typeLastmod = dbTypeToMaxDate[page.dbType] || fallbackLastmod;
    pushPage({
      path: `/${page.slug}.html`,
      pageType: 'type_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${page.slug}.html`),
      priority: '0.8',
      changefreq: 'weekly',
      inSitemap: true,
      lastmod: typeLastmod,
    });
  }

  // --- Cluster hub pages: use max last_verified_at of their matched locations ---
  for (const cluster of clusterPages) {
    const clusterLastmod = (cluster.locations && cluster.locations.length > 0)
      ? (maxLastVerified(cluster.locations) || fallbackLastmod)
      : fallbackLastmod;
    pushPage({
      path: `/${cluster.slug}.html`,
      pageType: 'cluster_hub',
      tier: 'hub',
      filePath: path.join(ROOT, `${cluster.slug}.html`),
      priority: '0.78',
      changefreq: 'weekly',
      inSitemap: true,
      lastmod: clusterLastmod,
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

  // --- City+type combo pages: use max last_verified_at from matching region+type locations ---
  for (const combo of cityTypeCombos || []) {
    const key = `${combo.regionSlug}:${combo.typeSlug}`;
    const comboLastmod = regionTypeToMaxDate[key] || fallbackLastmod;
    pushPage({
      path: combo.path,
      pageType: 'city_type_combo',
      tier: 'hub',
      filePath: combo.filePath,
      priority: '0.82',
      changefreq: 'weekly',
      inSitemap: true,
      lastmod: comboLastmod,
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
      lastmod: loc.last_verified_at || fallbackLastmod,
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

  // Compute the most recent lastmod across all catalog pages for the sitemap index
  let catalogMaxLastmod = null;
  for (const page of catalog) {
    if (!page.lastmod) continue;
    if (!catalogMaxLastmod || page.lastmod > catalogMaxLastmod) {
      catalogMaxLastmod = page.lastmod;
    }
  }
  const indexLastmod = catalogMaxLastmod || todayISO();

  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapFiles.map((fileName) => `  <sitemap>\n    <loc>https://peuterplannen.nl/${fileName}</loc>\n    <lastmod>${indexLastmod}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indexXml);
  console.log(`Updated sitemap.xml index (${sitemapFiles.length} files, ${catalog.filter((page) => page.inSitemap).length} indexable URLs)`);
  return sitemapFiles;
}

module.exports = { sitePathToFile, buildPageCatalog, writeUrlSet, chunk, generateSitemapsFromCatalog };
