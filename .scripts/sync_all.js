/**
 * sync_all.js — Unified build script for PeuterPlannen
 *
 * Generates city pages, type pages, location pages, blog, and sitemap.
 * Single source of truth: Supabase regions + locations tables.
 *
 * Usage: node .scripts/sync_all.js
 *
 * Environment variables (optional, falls back to hardcoded anon key):
 *   SUPABASE_URL          — Supabase project URL
 *   SUPABASE_SERVICE_KEY  — Supabase service role key
 *   FORCE_FULL_BUILD      — Set to "1" to skip incremental mode
 */
const path = require('path');
const { ROOT } = require('./lib/config');
const { today } = require('./lib/helpers');
const { fetchData, fetchPublishState } = require('./lib/supabase');
const { loadSeoContentLibrary, mergeSeoContentLibrary } = require('./lib/seo-content');
const { computeSlugs, applyRepoSeoOverrides, applySeoPolicy } = require('./lib/seo-policy');
const { rewriteAssetVersions } = require('./lib/html-shared');
const { updateIndex } = require('./lib/generators/index-page');
const { updateApp } = require('./lib/generators/app-page');
const { updateAbout } = require('./lib/generators/about-page');
const { updateManifest } = require('./lib/generators/manifest');
const { update404 } = require('./lib/generators/four-oh-four');
const { generateCityPages } = require('./lib/generators/city-pages');
const { generateTypePages } = require('./lib/generators/type-pages');
const { generateClusterPages } = require('./lib/generators/cluster-pages');
const { generateDiscoverPage, generateMethodologyPage } = require('./lib/generators/editorial-pages');
const { generateLocationPages } = require('./lib/generators/location-pages');
const { buildBlog } = require('./lib/generators/blog');
const { updateRedirects } = require('./lib/generators/redirects');
const { buildPageCatalog, generateSitemapsFromCatalog } = require('./lib/generators/sitemaps');
const { buildSeoRegistry } = require('./lib/generators/seo-registry');
const { generatePartnerLanding } = require('./lib/generators/partner-landing');
const { minifyCSS } = require('./lib/css-minify');

const INCREMENTAL_THRESHOLD = 50;

async function fullBuild(data) {
  console.log('\nUpdating static pages...');
  updateIndex(data);
  updateApp(data);
  updateAbout(data);
  updateManifest(data);
  update404(data);

  console.log('\nGenerating city pages...');
  generateCityPages(data);

  console.log('\nGenerating type pages...');
  generateTypePages(data);

  console.log('\nGenerating cluster pages...');
  const clusterPages = generateClusterPages(data);

  console.log('\nGenerating shared editorial pages...');
  const sharedPages = [generateDiscoverPage(data), generateMethodologyPage(data)].filter(Boolean);

  console.log('\nGenerating partner landing page...');
  generatePartnerLanding(data);

  console.log('\nGenerating location pages...');
  generateLocationPages(data);

  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nUpdating redirects...');
  updateRedirects(data);

  console.log('\nGenerating split sitemaps...');
  const catalog = buildPageCatalog(data, blogPosts, clusterPages, sharedPages);
  generateSitemapsFromCatalog(catalog);

  console.log('\nBuilding SEO registry...');
  buildSeoRegistry(catalog);

  console.log('\nMinifying CSS...');
  minifyCSS(ROOT);

  console.log('\nRefreshing asset versions on hand-written pages...');
  [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'about.html'),
    path.join(ROOT, 'contact.html'),
    path.join(ROOT, 'app.html'),
    path.join(ROOT, '404.html'),
    path.join(ROOT, 'privacy', 'index.html'),
    path.join(ROOT, 'disclaimer', 'index.html'),
    path.join(ROOT, 'admin', 'index.html'),
    path.join(ROOT, 'partner', 'index.html'),
  ].forEach(rewriteAssetVersions);
}

async function incrementalBuild(data, publishState) {
  const changedIds = new Set((publishState.changed_location_ids || []).map(Number));
  const changedRegions = new Set(publishState.changed_region_slugs || []);
  const changedEditorial = new Set(publishState.changed_editorial_slugs || []);

  // Determine affected regions from changed locations
  for (const loc of data.locations) {
    if (changedIds.has(Number(loc.id))) {
      changedRegions.add(loc.regionSlug || loc.region);
    }
  }

  console.log(`  Changed locations: ${changedIds.size}`);
  console.log(`  Affected regions: ${[...changedRegions].join(', ') || 'none'}`);
  console.log(`  Changed editorial: ${changedEditorial.size}`);

  // 1. Index page (stats might have changed)
  console.log('\nUpdating index page...');
  updateIndex(data);

  // 2. City pages for affected regions only
  if (changedRegions.size > 0) {
    console.log(`\nGenerating city pages for ${changedRegions.size} affected region(s)...`);
    generateCityPages(data, changedRegions);
  }

  // 3. Type pages (type distribution may have changed)
  console.log('\nGenerating type pages...');
  generateTypePages(data);

  // 4. Cluster pages (affected locations may be in clusters)
  console.log('\nGenerating cluster pages...');
  const clusterPages = generateClusterPages(data);

  // 5. Location pages — only changed locations
  console.log(`\nGenerating ${changedIds.size} location page(s)...`);
  generateLocationPages(data, changedIds);

  // 6. Editorial pages if editorial content changed
  if (changedEditorial.size > 0) {
    console.log('\nGenerating shared editorial pages...');
    generateDiscoverPage(data);
    generateMethodologyPage(data);
  }

  // 7. Sitemaps and SEO registry always need updating
  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nUpdating redirects...');
  updateRedirects(data);

  console.log('\nGenerating split sitemaps...');
  const sharedPages = changedEditorial.size > 0
    ? [generateDiscoverPage(data), generateMethodologyPage(data)].filter(Boolean)
    : [];
  const catalog = buildPageCatalog(data, blogPosts, clusterPages, sharedPages);
  generateSitemapsFromCatalog(catalog);

  console.log('\nBuilding SEO registry...');
  buildSeoRegistry(catalog);
}

async function main() {
  console.log('=== PeuterPlannen sync_all.js ===\n');

  const publishState = await fetchPublishState();
  const data = await fetchData();
  data.seoContent = mergeSeoContentLibrary(loadSeoContentLibrary(), data.editorialPages);

  console.log('Computing slugs...');
  computeSlugs(data);
  applyRepoSeoOverrides(data);
  applySeoPolicy(data);

  // Determine build mode
  const forceFullBuild = process.env.FORCE_FULL_BUILD === '1';
  const changedCount = publishState
    ? (publishState.changed_location_ids || []).length
    : 0;
  const isIncremental = !forceFullBuild
    && publishState
    && changedCount > 0
    && changedCount < INCREMENTAL_THRESHOLD;

  if (isIncremental) {
    console.log(`\n--- INCREMENTAL BUILD (${changedCount} location change(s)) ---`);
    await incrementalBuild(data, publishState);
  } else {
    const reason = forceFullBuild ? 'FORCE_FULL_BUILD=1'
      : !publishState ? 'no publish state available'
      : changedCount === 0 ? 'no tracked changes'
      : `${changedCount} changes >= threshold ${INCREMENTAL_THRESHOLD}`;
    console.log(`\n--- FULL BUILD (${reason}) ---`);
    await fullBuild(data);
  }

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
