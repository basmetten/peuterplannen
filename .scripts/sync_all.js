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
 */
const path = require('path');
const { ROOT } = require('./lib/config');
const { today } = require('./lib/helpers');
const { fetchData } = require('./lib/supabase');
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

async function main() {
  console.log('=== PeuterPlannen sync_all.js ===\n');

  const data = await fetchData();
  data.seoContent = mergeSeoContentLibrary(loadSeoContentLibrary(), data.editorialPages);

  console.log('Computing slugs...');
  computeSlugs(data);
  applyRepoSeoOverrides(data);
  applySeoPolicy(data);

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
  const partnerLanding = generatePartnerLanding(data);

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

  // CSS minification
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

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
  console.log('Review changes with: git diff');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
