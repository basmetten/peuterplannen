#!/usr/bin/env node
/*
 * Report high-impact context gaps across locations, prioritized by GSC signal.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=... node .scripts/trust/report_context_gaps.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_JSON = path.join(ROOT, 'output', 'trust-context-gaps.json');
const OUT_MD = path.join(ROOT, 'output', 'trust-context-gaps.md');

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const REQUIRED_FIELDS = [
  'seo_primary_locality',
  'verification_mode',
  'verification_confidence',
  'time_of_day_fit',
  'rain_backup_quality',
  'buggy_friendliness',
  'toilet_confidence',
  'food_fit',
  'play_corner_quality',
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildDetailPath(loc) {
  if (!loc.region || !loc.name) return null;
  return `/${slugify(loc.region)}/${slugify(loc.name)}/`;
}

async function fetchAllLocations() {
  const requested = [
    'id', 'name', 'region', 'type', 'website', 'description', 'seo_tier',
    'seo_primary_locality', 'verification_mode', 'verification_confidence',
    'time_of_day_fit', 'rain_backup_quality', 'shade_or_shelter',
    'parking_ease', 'buggy_friendliness', 'toilet_confidence', 'noise_level',
    'food_fit', 'play_corner_quality', 'crowd_pattern', 'last_verified', 'last_context_refresh_at'
  ];

  async function fetchWithSelect(selectFields) {
    const all = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      const response = await fetch(`${PROJECT_URL}/rest/v1/locations?select=${encodeURIComponent(selectFields.join(','))}&order=id.asc`, {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${from}-${to}`,
          Prefer: 'count=exact',
        },
      });
      if (!response.ok) {
        const text = await response.text();
        return { ok: false, status: response.status, text };
      }
      const rows = await response.json();
      all.push(...rows);
      if (rows.length < pageSize) return { ok: true, rows: all, selectFields };
      from += pageSize;
    }
  }

  let currentFields = [...requested];
  while (true) {
    const result = await fetchWithSelect(currentFields);
    if (result.ok) return result;
    if (result.status !== 400) {
      throw new Error(`Failed to fetch locations (${result.status}): ${result.text}`);
    }
    const missingMatch = result.text.match(/column locations\.([a-zA-Z0-9_]+) does not exist/i);
    if (!missingMatch) {
      throw new Error(`Failed to fetch locations (${result.status}): ${result.text}`);
    }
    const missingColumn = missingMatch[1];
    const nextFields = currentFields.filter((field) => field !== missingColumn);
    if (nextFields.length === currentFields.length) {
      throw new Error(`Could not recover from missing column ${missingColumn}: ${result.text}`);
    }
    currentFields = nextFields;
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function mainSummary(reportRows) {
  const byField = {};
  const byTier = {};
  for (const row of reportRows) {
    byTier[row.seo_tier] = (byTier[row.seo_tier] || 0) + 1;
    for (const field of row.missing_fields) {
      byField[field] = (byField[field] || 0) + 1;
    }
  }
  return { by_field: byField, by_tier: byTier };
}

async function main() {
  const [{ rows: locations, selectFields }, trends] = await Promise.all([
    fetchAllLocations(),
    Promise.resolve(readJson('output/gsc-trends.json')),
  ]);

  const pageSignals = new Map();
  for (const page of trends.top_pages || []) {
    if (!page.path) continue;
    pageSignals.set(page.path, {
      clicks: page.clicks || 0,
      impressions: page.impressions || 0,
      position: page.position ?? null,
    });
  }

  const rows = locations.map((loc) => {
    const pathName = buildDetailPath(loc);
    const signal = pathName ? pageSignals.get(pathName) : null;
    const missingFields = REQUIRED_FIELDS.filter((field) => {
      const value = loc[field];
      return value == null || value === '';
    });
    const score = (signal?.clicks || 0) * 10 + (signal?.impressions || 0) + (loc.seo_tier === 'index' ? 25 : loc.seo_tier === 'support' ? 5 : 0);
    return {
      location_id: loc.id,
      name: loc.name,
      region: loc.region,
      type: loc.type,
      seo_tier: loc.seo_tier || 'unknown',
      path: pathName,
      clicks: signal?.clicks || 0,
      impressions: signal?.impressions || 0,
      position: signal?.position ?? null,
      missing_fields: missingFields,
      missing_count: missingFields.length,
      score,
      last_verified: loc.last_verified || null,
      last_context_refresh_at: loc.last_context_refresh_at || null,
    };
  }).filter((row) => row.missing_count > 0)
    .sort((a, b) => b.score - a.score || b.missing_count - a.missing_count || a.name.localeCompare(b.name, 'nl'));

  const summary = mainSummary(rows);
  const payload = {
    generated_at: new Date().toISOString(),
    available_fields: selectFields,
    rows: rows.length,
    summary,
    top_priority: rows.slice(0, 100),
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));

  const md = [
    '# Trust context gaps',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    `Rows with missing trust/context data: ${rows.length}`,
    '',
    '## Missing fields',
    ...Object.entries(summary.by_field)
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => `- \`${field}\`: ${count}`),
    '',
    '## Priority locations',
    ...rows.slice(0, 25).map((row) =>
      `- ${row.name} (${row.region}) — tier \`${row.seo_tier}\`, clicks ${row.clicks}, impressions ${row.impressions}, missing: ${row.missing_fields.join(', ')}`
    ),
    '',
  ].join('\n');

  fs.writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
