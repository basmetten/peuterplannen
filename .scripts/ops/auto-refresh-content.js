#!/usr/bin/env node
/**
 * auto-refresh-content.js
 *
 * Generates a content freshness report for PeuterPlannen locations.
 * 1. Connects to Supabase and fetches all locations
 * 2. Checks which locations have last_verified_at older than 6 months (180 days)
 * 3. Generates a freshness report for re-verification
 * 4. Outputs results to output/content-freshness-report.md
 *
 * Usage: node .scripts/ops/auto-refresh-content.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'output');
const { SB_URL, SB_KEY, SB_PROJECT } = require('../lib/config');

const STALE_DAYS = 180;

async function fetchSupabase(endpoint, query) {
  const base = SB_URL.includes('supabase.co') ? SB_URL : SB_PROJECT;
  const url = `${base}/rest/v1/${endpoint}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${endpoint}: ${res.status}`);
  return res.json();
}

async function fetchAllSupabase(endpoint, query, pageSize = 1000) {
  const rows = [];
  let offset = 0;

  while (true) {
    const pageQuery = `${query}${query ? '&' : ''}limit=${pageSize}&offset=${offset}`;
    const page = await fetchSupabase(endpoint, pageQuery);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  return rows;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return 'nooit';
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function priorityLabel(days) {
  if (days === Infinity) return 'URGENT — nooit geverifieerd';
  if (days >= 365) return 'HOOG — meer dan een jaar oud';
  if (days >= 270) return 'MIDDEL — meer dan 9 maanden oud';
  return 'LAAG — 6–9 maanden oud';
}

function generateMarkdown(stale, fresh, total, runDate) {
  const pct = total > 0 ? Math.round((stale.length / total) * 100) : 0;

  let md = `# Content Freshness Report\n\n`;
  md += `*Gegenereerd op: ${runDate}*\n\n`;
  md += `---\n\n`;
  md += `## Samenvatting\n\n`;
  md += `| | Aantal |\n`;
  md += `|---|---|\n`;
  md += `| Totaal locaties | ${total} |\n`;
  md += `| Vers (< ${STALE_DAYS} dagen) | ${fresh.length} |\n`;
  md += `| Verouderd (≥ ${STALE_DAYS} dagen) | ${stale.length} (${pct}%) |\n`;
  md += `| Nooit geverifieerd | ${stale.filter((l) => !l.last_verified_at).length} |\n\n`;

  if (stale.length === 0) {
    md += `Alle locaties zijn recent geverifieerd. Geen actie vereist.\n`;
    return md;
  }

  md += `---\n\n`;
  md += `## Locaties voor re-verificatie (${stale.length})\n\n`;

  // Group by region
  const byRegion = {};
  for (const loc of stale) {
    const region = loc.region || 'onbekend';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(loc);
  }

  const sortedRegions = Object.keys(byRegion).sort();

  for (const region of sortedRegions) {
    const locs = byRegion[region];
    // Sort within region: never-verified first, then by days descending
    locs.sort((a, b) => {
      const dA = daysSince(a.last_verified_at);
      const dB = daysSince(b.last_verified_at);
      return dB - dA;
    });

    md += `### ${region} (${locs.length})\n\n`;
    md += `| Naam | Type | Laatste verificatie | Dagen oud | Prioriteit |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const loc of locs) {
      const days = daysSince(loc.last_verified_at);
      const daysLabel = days === Infinity ? '—' : String(days);
      const name = loc.name || String(loc.id) || '(onbekend)';
      const type = loc.type || '—';
      const lastVerified = formatDate(loc.last_verified_at);
      const priority = priorityLabel(days);
      md += `| ${name} | ${type} | ${lastVerified} | ${daysLabel} | ${priority} |\n`;
    }

    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Verificatie-instructies\n\n`;
  md += `Voor elke locatie hierboven:\n\n`;
  md += `1. Controleer of het adres, de openingstijden en het telefoonnummer nog kloppen\n`;
  md += `2. Bezoek de website van de locatie en noteer eventuele wijzigingen\n`;
  md += `3. Pas \`last_verified_at\` bij in Supabase na verificatie\n`;
  md += `4. Update \`description\` en \`toddler_highlight\` indien nodig\n\n`;
  md += `*Gebruik \`ops:content-freshness\` om dit rapport opnieuw te genereren.*\n`;

  return md;
}

async function main() {
  console.log('Generating content freshness report...\n');

  // Fetch all locations
  const locations = await fetchAllSupabase(
    'locations',
    'select=id,name,region,type,last_verified_at&order=name'
  );
  console.log(`  ${locations.length} locations loaded`);

  // Split into stale and fresh
  const cutoffMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  const now = new Date();

  const stale = [];
  const fresh = [];

  for (const loc of locations) {
    if (!loc.last_verified_at) {
      stale.push(loc);
    } else {
      const age = now - new Date(loc.last_verified_at);
      if (age >= cutoffMs) {
        stale.push(loc);
      } else {
        fresh.push(loc);
      }
    }
  }

  console.log(`  ${fresh.length} fresh (< ${STALE_DAYS} days)`);
  console.log(`  ${stale.length} stale (>= ${STALE_DAYS} days)\n`);

  // Generate markdown
  const runDate = now.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const md = generateMarkdown(stale, fresh, locations.length, runDate);

  // Save to file
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'content-freshness-report.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`  Saved to ${outPath}`);

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Content freshness report failed:', err.message);
  process.exit(1);
});
