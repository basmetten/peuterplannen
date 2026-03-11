#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/basmetten/peuterplannen';
const STRICT = process.argv.includes('--strict');
const registryPath = path.join(ROOT, 'output', 'seo-registry.json');
const reportPath = path.join(ROOT, 'output', 'seo-report.md');

function fail(message) {
  throw new Error(message);
}

function fmtList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

if (!fs.existsSync(registryPath)) fail('Missing output/seo-registry.json. Run the build first.');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const entries = Array.isArray(registry.entries) ? registry.entries : [];
const findings = [];
const warnings = [];

const homepage = entries.find((entry) => entry.path === '/');
if (!homepage) findings.push('Homepage ontbreekt in seo-registry.');
else {
  if ((homepage.internal_link_count || 0) < 35) {
    findings.push(`Homepage heeft te weinig strategische interne links (${homepage.internal_link_count}). Verwacht minimaal 35.`);
  }
  if (!homepage.methodology_link_present) {
    findings.push('Homepage linkt niet naar /methode/.');
  }
}

const requiredPaths = ['/ontdekken/', '/methode/', '/blog/'];
for (const requiredPath of requiredPaths) {
  if (!entries.find((entry) => entry.path === requiredPath)) {
    findings.push(`Verplichte SEO-pagina ontbreekt in registry: ${requiredPath}`);
  }
}

const hubEntries = entries.filter((entry) => ['hub'].includes(entry.tier) || ['discover_hub', 'methodology_page', 'region_hub', 'type_hub', 'cluster_hub', 'blog_index', 'blog_article'].includes(entry.page_type));
for (const entry of hubEntries) {
  if ((entry.wordcount || 0) < 180) findings.push(`Hubpagina te dun: ${entry.path} (${entry.wordcount} woorden)`);
  if (!entry.methodology_link_present && entry.path !== '/methode/') findings.push(`Hubpagina mist methodologielink: ${entry.path}`);
  if ((entry.slop_phrase_hits || 0) > 8) findings.push(`Hubpagina gebruikt te veel generieke patronen: ${entry.path} (${entry.slop_phrase_hits})`);
}

const indexDetails = entries.filter((entry) => entry.page_type === 'location_detail' && entry.tier === 'index');
for (const entry of indexDetails) {
  if (!entry.parent_hub_link_present) findings.push(`Index-detail mist parent hub link: ${entry.path}`);
  if (!entry.type_hub_link_present) findings.push(`Index-detail mist type hub link: ${entry.path}`);
  if ((entry.wordcount || 0) < 120) warnings.push(`Index-detail is nog vrij dun: ${entry.path} (${entry.wordcount} woorden)`);
}

const supportInSitemap = entries.filter((entry) => entry.tier === 'support' && entry.in_sitemap);
for (const entry of supportInSitemap) findings.push(`Support-pagina staat in sitemap: ${entry.path}`);

for (const dup of registry.duplicate_indexable_titles || []) {
  findings.push(`Duplicate indexeerbare title: ${dup.title} (${dup.count}x)`);
}
for (const err of registry.errors || []) findings.push(err);

const topThinHubs = [...hubEntries].sort((a, b) => (a.wordcount || 0) - (b.wordcount || 0)).slice(0, 12);
const topThinIndexDetails = [...indexDetails].sort((a, b) => (a.wordcount || 0) - (b.wordcount || 0)).slice(0, 12);

const report = [
  '# SEO Quality Audit',
  '',
  `- Generated: ${new Date().toISOString()}`,
  `- Total pages: ${registry.counts?.total || entries.length}`,
  `- Hub pages checked: ${hubEntries.length}`,
  `- Index detail pages checked: ${indexDetails.length}`,
  `- Findings: ${findings.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  '## Findings',
  findings.length ? fmtList(findings) : '- None',
  '',
  '## Warnings',
  warnings.length ? fmtList(warnings.slice(0, 30)) : '- None',
  '',
  '## Thin Hub Watchlist',
  topThinHubs.length ? fmtList(topThinHubs.map((entry) => `${entry.path} — ${entry.wordcount} woorden`)) : '- None',
  '',
  '## Thin Index Detail Watchlist',
  topThinIndexDetails.length ? fmtList(topThinIndexDetails.map((entry) => `${entry.path} — ${entry.wordcount} woorden`)) : '- None',
  '',
].join('\n');

fs.writeFileSync(reportPath, report);
console.log(reportPath);
console.log(`SEO audit findings=${findings.length} warnings=${warnings.length}`);

if (STRICT && findings.length) process.exit(1);
