#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let matter;
try {
  matter = require('gray-matter');
} catch {
  matter = null;
}

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEO_DIR = path.join(ROOT, 'content', 'seo');
const OUTPUT_DIR = path.join(ROOT, 'output');

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseDoc(raw) {
  if (matter) {
    const parsed = matter(raw);
    return { data: parsed.data || {}, content: (parsed.content || '').trim() };
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw.trim() };
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  return { data, content: (match[2] || '').trim() };
}

function readDoc(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = parseDoc(raw);
  return { slug: path.basename(filePath, '.md'), data, content };
}

async function fetchAllLocations() {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  const rows = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const response = await fetch(`${PROJECT_URL}/rest/v1/locations?select=id,name,region,type&order=id.asc&limit=${pageSize}&offset=${offset}`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.status} ${await response.text()}`);
    }
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

function writeUnresolvedReport(items) {
  const jsonPath = path.join(OUTPUT_DIR, 'editorial-seed-unresolved.json');
  const mdPath = path.join(OUTPUT_DIR, 'editorial-seed-unresolved.md');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    count: items.length,
    items,
  }, null, 2));
  const lines = [
    '# Editorial Seed Unresolved',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Count: ${items.length}`,
    '',
  ];
  if (!items.length) {
    lines.push('- OK');
  } else {
    for (const item of items) {
      lines.push(`- ${item.key}: ${item.reason}`);
      if (item.file) lines.push(`  - file: ${item.file}`);
      if (item.candidates?.length) lines.push(`  - candidates: ${item.candidates.map((c) => `${c.id}:${c.name} [${c.type}]`).join(', ')}`);
    }
  }
  fs.writeFileSync(mdPath, lines.join('\n'));
}

function truthyFlag(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

async function upsertRows(rows) {
  if (!rows.length) return;
  const normalizedRows = rows.map((row) => ({
    page_type: row.page_type,
    slug: row.slug,
    region_slug: row.region_slug ?? null,
    type_slug: row.type_slug ?? null,
    cluster_slug: row.cluster_slug ?? null,
    location_id: row.location_id ?? null,
    status: row.status ?? 'published',
    title: row.title ?? null,
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    hero_kicker: row.hero_kicker ?? null,
    hero_body_md: row.hero_body_md ?? null,
    body_md: row.body_md ?? null,
    faq_json: Array.isArray(row.faq_json) ? row.faq_json : [],
    curated_location_ids: Array.isArray(row.curated_location_ids) ? row.curated_location_ids : [],
    related_blog_slugs: Array.isArray(row.related_blog_slugs) ? row.related_blog_slugs : [],
    editorial_label: row.editorial_label ?? 'PeuterPlannen redactie',
    published_at: row.published_at ?? null,
  }));
  const response = await fetch(`${PROJECT_URL}/rest/v1/editorial_pages?on_conflict=page_type,slug`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(normalizedRows),
  });
  if (!response.ok) {
    throw new Error(`Upsert failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function normalizeSharedDoc(slug, doc) {
  const pageType = slug === 'ontdekken' ? 'discover_hub' : 'methodology_page';
  return {
    page_type: pageType,
    slug,
    region_slug: null,
    type_slug: null,
    cluster_slug: null,
    location_id: null,
    status: 'published',
    title: doc.data.title || slug,
    meta_title: doc.data.meta_title || doc.data.title || slug,
    meta_description: doc.data.meta_description || '',
    hero_kicker: doc.data.editorial_label || 'PeuterPlannen redactie',
    hero_body_md: doc.data.hero_sub || doc.data.hero_body || '',
    body_md: doc.content,
    faq_json: Array.isArray(doc.data.faqItems) ? doc.data.faqItems : [],
    curated_location_ids: Array.isArray(doc.data.curated_location_ids) ? doc.data.curated_location_ids : [],
    related_blog_slugs: Array.isArray(doc.data.related_blog_slugs) ? doc.data.related_blog_slugs : [],
    editorial_label: doc.data.editorial_label || 'PeuterPlannen redactie',
    published_at: new Date().toISOString(),
  };
}

function normalizeHubDoc(pageType, slug, doc, extra = {}) {
  return {
    page_type: pageType,
    slug,
    region_slug: null,
    type_slug: null,
    cluster_slug: null,
    location_id: null,
    status: 'published',
    title: doc.data.title || slug,
    meta_title: doc.data.meta_title || doc.data.title || slug,
    meta_description: doc.data.meta_description || '',
    hero_kicker: doc.data.editorial_label || 'PeuterPlannen redactie',
    hero_body_md: doc.data.hero_sub || doc.data.hero_body || '',
    body_md: doc.content,
    faq_json: Array.isArray(doc.data.faqItems) ? doc.data.faqItems : [],
    curated_location_ids: Array.isArray(doc.data.curated_location_ids) ? doc.data.curated_location_ids : [],
    related_blog_slugs: Array.isArray(doc.data.related_blog_slugs) ? doc.data.related_blog_slugs : [],
    editorial_label: doc.data.editorial_label || 'PeuterPlannen redactie',
    published_at: new Date().toISOString(),
    ...extra,
  };
}

function normalizeLocationOverride(regionSlug, slug, doc, locationId) {
  return {
    page_type: 'location_detail_override',
    slug,
    region_slug: regionSlug,
    type_slug: null,
    cluster_slug: null,
    location_id: locationId,
    status: 'published',
    title: doc.data.title || doc.data.title_override || slug,
    meta_title: doc.data.meta_title || doc.data.title_override || '',
    meta_description: doc.data.meta_description || doc.data.description_override || '',
    hero_kicker: doc.data.editorial_label || 'PeuterPlannen redactie',
    hero_body_md: doc.data.hero_sub || doc.data.intro_override || '',
    body_md: doc.content,
    faq_json: Array.isArray(doc.data.faqItems) ? doc.data.faqItems : [],
    curated_location_ids: Array.isArray(doc.data.curated_location_ids) ? doc.data.curated_location_ids : [],
    related_blog_slugs: Array.isArray(doc.data.related_blog_slugs) ? doc.data.related_blog_slugs : [],
    editorial_label: doc.data.editorial_label || 'PeuterPlannen redactie',
    published_at: new Date().toISOString(),
  };
}

async function main() {
  const rows = [];
  const unresolved = [];
  const locations = await fetchAllLocations();
  const locationMap = new Map();
  for (const loc of locations) {
    const key = `${slugify(loc.region)}/${slugify(loc.name)}`;
    const bucket = locationMap.get(key) || [];
    bucket.push(loc);
    locationMap.set(key, bucket);
  }

  for (const slug of ['ontdekken', 'methodologie']) {
    const filePath = path.join(SEO_DIR, 'shared', `${slug}.md`);
    if (!fs.existsSync(filePath)) continue;
    rows.push(normalizeSharedDoc(slug, readDoc(filePath)));
  }

  for (const entry of fs.readdirSync(path.join(SEO_DIR, 'regions'))) {
    if (!entry.endsWith('.md')) continue;
    const slug = path.basename(entry, '.md');
    rows.push(normalizeHubDoc('region_hub', slug, readDoc(path.join(SEO_DIR, 'regions', entry)), { region_slug: slug }));
  }

  for (const entry of fs.readdirSync(path.join(SEO_DIR, 'types'))) {
    if (!entry.endsWith('.md')) continue;
    const slug = path.basename(entry, '.md');
    rows.push(normalizeHubDoc('type_hub', slug, readDoc(path.join(SEO_DIR, 'types', entry)), { type_slug: slug }));
  }

  for (const entry of fs.readdirSync(path.join(SEO_DIR, 'clusters'))) {
    if (!entry.endsWith('.md')) continue;
    const slug = path.basename(entry, '.md');
    rows.push(normalizeHubDoc('cluster_hub', slug, readDoc(path.join(SEO_DIR, 'clusters', entry)), { cluster_slug: slug }));
  }

  const locationsDir = path.join(SEO_DIR, 'locations');
  if (fs.existsSync(locationsDir)) {
    for (const regionEntry of fs.readdirSync(locationsDir, { withFileTypes: true })) {
      if (!regionEntry.isDirectory()) continue;
      const regionSlug = regionEntry.name;
      const regionPath = path.join(locationsDir, regionSlug);
      for (const file of fs.readdirSync(regionPath)) {
        if (!file.endsWith('.md')) continue;
        const slug = path.basename(file, '.md');
        const doc = readDoc(path.join(regionPath, file));
        if (truthyFlag(doc.data.seed_skip)) continue;
        const key = `${regionSlug}/${slug}`;
        const explicitId = Number(doc.data.location_match_id || 0);
        const matchRegion = slugify(doc.data.location_match_region || regionSlug);
        const matchName = slugify(doc.data.location_match_name || slug);
        const matchType = slugify(doc.data.location_match_type || '');
        const candidates = (locationMap.get(`${matchRegion}/${matchName}`) || []);
        let candidate = explicitId
          ? candidates.find((item) => Number(item.id) === explicitId)
          : null;
        if (!candidate) {
          candidate = matchType
            ? candidates.find((item) => slugify(item.type) === matchType)
            : (candidates.length === 1 ? candidates[0] : null);
        }
        if (!candidate) {
          unresolved.push({
            key,
            file: path.join('content', 'seo', 'locations', regionSlug, file),
            reason: candidates.length > 1 ? 'multiple_candidates_require_hint' : 'no_matching_location',
            candidates: candidates.map((item) => ({ id: item.id, name: item.name, type: item.type })),
          });
          console.warn(`Skipping ${key}: ${candidates.length > 1 ? 'multiple candidates require hint' : 'no matching location_id found'}`);
          continue;
        }
        rows.push(normalizeLocationOverride(regionSlug, slug, doc, Number(candidate.id)));
      }
    }
  }

  await upsertRows(rows);
  writeUnresolvedReport(unresolved);
  console.log(`Upserted ${rows.length} editorial page rows.`);
  console.log(`Unresolved editorial overrides: ${unresolved.length}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
