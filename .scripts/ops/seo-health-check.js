#!/usr/bin/env node
/**
 * seo-health-check.js
 *
 * Runs an SEO health check across all PeuterPlannen locations.
 * 1. Fetches all locations from Supabase
 * 2. Computes SEO tiers and graduation metrics via seo-policy functions
 * 3. Counts indexed vs noindex pages
 * 4. Checks cluster page location coverage (WARNING if <10 matches)
 * 5. Reports top 25 near-promotion locations
 * 6. Outputs a markdown report to output/seo-report.md
 *
 * Usage: node .scripts/ops/seo-health-check.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'output');

const { fetchData } = require('../lib/supabase');
const { CLUSTER_PAGES } = require('../lib/config');
const {
  computeSlugs,
  computeLocationSeoTier,
  computeGraduationMetrics,
  matchesClusterPage,
} = require('../lib/seo-policy');

// Human-readable labels for criteria keys
const CRITERIA_LABELS = {
  hasDescription: 'description (≥90 chars)',
  hasHighlight: 'toddler_highlight',
  hasWeather: 'weather field',
  hasCoords: 'lat/lng coordinates',
  hasAgeRange: 'age range (min_age + max_age)',
  hasFacility: 'facility (coffee/diaper/alcohol)',
  noSlop: 'no AI-slop patterns',
  noGeneric: 'no generic description',
};

function clusterHealth(locations) {
  return CLUSTER_PAGES.map((cluster) => {
    const count = locations.filter((loc) => matchesClusterPage(cluster, loc)).length;
    const status = count >= 10 ? 'OK' : 'WARNING';
    return { slug: cluster.slug, name: cluster.h1, count, status };
  });
}

function generateReport(data, metrics, clusterStats) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const lines = [];

  lines.push(`# SEO Health Report`);
  lines.push(`\n_Generated: ${now}_\n`);

  // ── Overview ────────────────────────────────────────────────────────────
  lines.push(`## Overview\n`);
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total locations | ${metrics.total} |`);
  lines.push(`| Indexed (index,follow) | ${metrics.indexed} |`);
  lines.push(`| Support (noindex,follow) | ${metrics.support} |`);
  lines.push(`| Index rate | ${metrics.indexRate}% |`);
  lines.push(``);

  // ── Cluster page health ──────────────────────────────────────────────────
  lines.push(`## Cluster Page Health\n`);
  lines.push(`> Cluster pages need at least 10 matching locations to be viable.\n`);
  lines.push(`| Cluster | Matching locations | Status |`);
  lines.push(`| --- | --- | --- |`);
  for (const c of clusterStats) {
    const icon = c.status === 'OK' ? '' : ' ⚠';
    lines.push(`| ${c.name} | ${c.count} | ${c.status}${icon} |`);
  }
  lines.push(``);

  const warnings = clusterStats.filter((c) => c.status === 'WARNING');
  if (warnings.length > 0) {
    lines.push(`**${warnings.length} cluster page(s) below threshold:**`);
    for (const w of warnings) {
      lines.push(`- \`${w.slug}\` — ${w.count} locations (needs 10)`);
    }
    lines.push(``);
  }

  // ── Near-promotion locations ─────────────────────────────────────────────
  lines.push(`## Top ${metrics.nearPromotion.length} Near-Promotion Locations\n`);
  lines.push(
    `These locations pass all but one or two criteria — fixing the listed fields would promote them to \`index\`.\n`
  );

  if (metrics.nearPromotion.length === 0) {
    lines.push(`_No near-promotion locations found._\n`);
  } else {
    lines.push(`| # | Name | Region | Missing criteria |`);
    lines.push(`| --- | --- | --- | --- |`);
    metrics.nearPromotion.forEach((loc, i) => {
      const missingLabels = loc.missing
        .map((k) => CRITERIA_LABELS[k] || k)
        .join(', ');
      lines.push(`| ${i + 1} | ${loc.name} | ${loc.region} | ${missingLabels} |`);
    });
    lines.push(``);
  }

  // ── Missing criteria summary ──────────────────────────────────────────────
  lines.push(`## Missing Criteria Summary (support-tier locations only)\n`);
  lines.push(`| Criterion | Locations missing it |`);
  lines.push(`| --- | --- |`);

  const sorted = Object.entries(metrics.missingCriteria).sort(([, a], [, b]) => b - a);
  for (const [key, count] of sorted) {
    const label = CRITERIA_LABELS[key] || key;
    const pct = metrics.support > 0 ? Math.round((count / metrics.support) * 100) : 0;
    lines.push(`| ${label} | ${count} (${pct}% of support-tier) |`);
  }
  lines.push(``);

  return lines.join('\n');
}

async function main() {
  console.log('Running SEO health check...\n');

  // 1. Fetch data
  const data = await fetchData();

  // 2. Compute slugs (needed for seo-policy helpers)
  computeSlugs(data);

  const { locations } = data;

  // 3. Compute graduation metrics (uses computeLocationSeoTier internally)
  const metrics = computeGraduationMetrics(locations);

  console.log(`\nSEO summary:`);
  console.log(`  Total:   ${metrics.total}`);
  console.log(`  Indexed: ${metrics.indexed} (${metrics.indexRate}%)`);
  console.log(`  Support: ${metrics.support}`);
  console.log(`  Near-promotion: ${metrics.nearPromotion.length}`);

  // 4. Cluster page health
  const clusterStats = clusterHealth(locations);
  console.log(`\nCluster page coverage:`);
  for (const c of clusterStats) {
    const flag = c.status === 'WARNING' ? ' [WARNING]' : '';
    console.log(`  ${c.name}: ${c.count} locations${flag}`);
  }

  // 5. Generate markdown report
  const report = generateReport(data, metrics, clusterStats);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'seo-report.md');
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`\nReport saved to ${outPath}`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('SEO health check failed:', err.message);
  process.exit(1);
});
