#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRUST_GAPS_PATH = path.join(ROOT, 'output', 'trust-context-gaps.json');
const GSC_TRENDS_PATH = path.join(ROOT, 'output', 'gsc-trends.json');
const OUT_DIR = path.join(ROOT, 'output');
const DEFAULT_LIMIT = Number(process.env.EDITORIAL_DRAFT_LIMIT || 100);

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function readJson(filePath, fallback = null) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[']/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function api(pathname, init = {}) {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchLocationsByIds(ids) {
  if (!ids.length) return [];
  const pageSize = 200;
  const rows = [];
  for (let i = 0; i < ids.length; i += pageSize) {
    const chunk = ids.slice(i, i + pageSize);
    const inClause = `(${chunk.join(',')})`;
    const data = await api(`locations?select=id,name,region,type,description,website,toddler_highlight,seo_primary_locality,seo_title_override,seo_description_override,seo_intro_override,seo_tier,last_verified,last_context_refresh_at,verification_mode,verification_confidence,price_band,time_of_day_fit,rain_backup_quality,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,crowd_pattern&order=name.asc&id=in.${inClause}`);
    rows.push(...(data || []));
  }
  return rows;
}

async function fetchExistingDrafts() {
  return api('editorial_pages?select=id,location_id,slug,status,page_type&eq=page_type.location_detail_override'.replace('eq=', ''));
}

async function fetchExistingLocationDrafts() {
  return api('editorial_pages?select=id,location_id,slug,status,page_type&page_type=eq.location_detail_override');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildDraft(location, gapRow, signalRow) {
  const regionSlug = slugify(location.region);
  const slug = slugify(location.name);
  const missing = safeArray(gapRow?.missing_fields);
  const locality = location.seo_primary_locality || '';
  const signalBits = [];
  if (gapRow?.clicks) signalBits.push(`${gapRow.clicks} kliks`);
  if (gapRow?.impressions) signalBits.push(`${gapRow.impressions} vertoningen`);
  if (gapRow?.position) signalBits.push(`positie ${gapRow.position}`);
  const factualIntro = location.description || location.toddler_highlight || '';
  const body = [
    '## Redactionele opdracht',
    '',
    `Werk deze detailpagina uit tot een menselijk, lokaal en praktisch profiel voor ouders met peuters. Vermijd generieke superlatieven. Benoem alleen concrete dingen die op of rond deze locatie echt relevant zijn.`,
    '',
    '## Huidige facts',
    '',
    `- Regio: ${location.region}`,
    `- Type: ${location.type || 'onbekend'}`,
    `- Locality/wijk: ${locality || 'nog invullen'}`,
    `- Website: ${location.website || 'geen website opgeslagen'}`,
    `- Laatst geverifieerd: ${location.last_verified || 'onbekend'}`,
    `- Verification mode: ${location.verification_mode || 'nog invullen'}`,
    signalBits.length ? `- GSC signaal: ${signalBits.join(' · ')}` : '- GSC signaal: nog geen publiek signaal',
    missing.length ? `- Ontbrekende trustvelden: ${missing.join(', ')}` : '- Ontbrekende trustvelden: geen',
    '',
    '## Bestaande omschrijving',
    '',
    factualIntro ? factualIntro : '_Nog geen bruikbare omschrijving aanwezig._',
    '',
    '## Wat deze pagina nog nodig heeft',
    '',
    '- Wat doet een kind hier concreet?',
    '- Waarom werkt dit met peuters of dreumesen?',
    '- Wat moet een ouder vooraf weten?',
    '- Wat is slim qua dagdeel, drukte en logistiek?',
    '- Welke alternatieven in de buurt zijn relevant?',
    '',
    '## Werkcopy',
    '',
    '### Waarom dit werkt met peuters',
    '',
    '_Schrijf hier een korte, concrete alinea._',
    '',
    '### Handig om vooraf te weten',
    '',
    '- _Vul in_ ',
    '- _Vul in_ ',
    '- _Vul in_ ',
    '',
    '### Combineer met',
    '',
    '- _Gerelateerde plek of hub_ ',
  ].join('\n');

  return {
    page_type: 'location_detail_override',
    slug,
    region_slug: regionSlug,
    type_slug: null,
    cluster_slug: null,
    location_id: location.id,
    status: 'draft',
    title: location.seo_title_override || `${location.name} — redactioneel detaildraft`,
    meta_title: location.seo_title_override || '',
    meta_description: location.seo_description_override || '',
    hero_kicker: 'Concept · detailpagina',
    hero_body_md: location.seo_intro_override || factualIntro || '',
    body_md: body,
    faq_json: [],
    curated_location_ids: [],
    related_blog_slugs: [],
    editorial_label: 'Concept · PeuterPlannen redactie',
    published_at: null,
  };
}

async function upsertDrafts(rows) {
  if (!rows.length) return [];
  const response = await fetch(`${PROJECT_URL}/rest/v1/editorial_pages?on_conflict=location_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`editorial_pages upsert failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function main() {
  const trust = readJson(TRUST_GAPS_PATH, { top_priority: [] });
  const gsc = readJson(GSC_TRENDS_PATH, { top_pages: [] });
  const pageSignals = new Map((gsc.top_pages || []).map((row) => [row.path, row]));
  const priorityRows = (trust.top_priority || []).slice(0, DEFAULT_LIMIT);
  const ids = priorityRows.map((row) => Number(row.location_id)).filter(Boolean);
  const [locations, existingDrafts] = await Promise.all([
    fetchLocationsByIds(ids),
    fetchExistingLocationDrafts(),
  ]);
  const locationMap = new Map(locations.map((row) => [Number(row.id), row]));
  const existingByLocationId = new Map((existingDrafts || []).filter((row) => row.location_id).map((row) => [Number(row.location_id), row]));

  const draftRows = [];
  const createdTargets = [];
  const skippedExisting = [];
  const missingLocations = [];

  for (const gapRow of priorityRows) {
    const locationId = Number(gapRow.location_id);
    const location = locationMap.get(locationId);
    if (!location) {
      missingLocations.push(gapRow);
      continue;
    }
    if (existingByLocationId.has(locationId)) {
      skippedExisting.push({ location_id: locationId, name: location.name, editorial_id: existingByLocationId.get(locationId).id });
      continue;
    }
    const signal = pageSignals.get(gapRow.path);
    draftRows.push(buildDraft(location, gapRow, signal));
    createdTargets.push({ location_id: locationId, name: location.name, region: location.region, path: gapRow.path || null });
  }

  const inserted = await upsertDrafts(draftRows);
  const payload = {
    generated_at: new Date().toISOString(),
    requested_limit: DEFAULT_LIMIT,
    considered: priorityRows.length,
    created: inserted?.length || 0,
    existing: skippedExisting.length,
    missing_locations: missingLocations.length,
    created_targets: createdTargets,
    skipped_existing: skippedExisting,
    missing_location_rows: missingLocations,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'priority-location-drafts.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'priority-location-drafts.md'), [
    '# Priority location drafts',
    '',
    `Generated: ${payload.generated_at}`,
    `Requested limit: ${payload.requested_limit}`,
    `Considered: ${payload.considered}`,
    `Created: ${payload.created}`,
    `Already existed: ${payload.existing}`,
    `Missing in DB lookup: ${payload.missing_locations}`,
    '',
    '## Created',
    ...(createdTargets.map((row) => `- ${row.name} (${row.region})${row.path ? ` · ${row.path}` : ''}`) || ['- Geen']),
    '',
    '## Existing drafts',
    ...(skippedExisting.map((row) => `- ${row.name} · ${row.editorial_id}`) || ['- Geen']),
  ].join('\n'));

  console.log(`Created ${payload.created} editorial drafts, skipped ${payload.existing}, missing ${payload.missing_locations}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
