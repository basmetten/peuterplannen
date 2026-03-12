#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRUST_GAPS_JSON = path.join(ROOT, 'output', 'trust-context-gaps.json');
const CONSISTENCY_JSON = path.join(ROOT, 'output', 'audit-consistency.json');

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function readJson(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
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

function scoreToPriority(row) {
  if ((row.clicks || 0) > 0 || (row.impressions || 0) >= 250) return 5;
  if ((row.impressions || 0) >= 100 || row.seo_tier === 'index') return 4;
  if ((row.impressions || 0) >= 30) return 3;
  return 2;
}

async function fetchLocations() {
  return api('locations?select=id,name,region&limit=2500');
}

async function resetManagedTasks() {
  await api('location_quality_tasks?source=in.(trust-gap-report,consistency-audit)&status=in.(open,in_progress)', { method: 'DELETE' });
}

async function insertTasks(tasks) {
  if (!tasks.length) return;
  await api('location_quality_tasks', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(tasks),
  });
}

async function main() {
  const trustGaps = readJson(TRUST_GAPS_JSON) || { top_priority: [] };
  const consistency = readJson(CONSISTENCY_JSON) || { details: { orphanLocationPages: [] } };
  const locations = await fetchLocations();
  const locationByPath = new Map(
    locations.map((loc) => [`/${slugify(loc.region)}/${slugify(loc.name)}/`, loc])
  );

  const tasks = [];

  for (const row of trustGaps.top_priority || []) {
    tasks.push({
      location_id: row.location_id,
      task_type: 'missing_trust_fields',
      status: 'open',
      priority: scoreToPriority(row),
      details_json: {
        region: row.region,
        seo_tier: row.seo_tier,
        missing_fields: row.missing_fields || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        position: row.position ?? null,
        path: row.path || null,
      },
      source: 'trust-gap-report',
    });
  }

  for (const orphan of consistency.details?.orphanLocationPages || []) {
    const loc = locationByPath.get(orphan.path);
    if (!loc) continue;
    tasks.push({
      location_id: loc.id,
      task_type: 'orphan_detail_page',
      status: 'open',
      priority: 5,
      details_json: {
        path: orphan.path,
        inbound_count: orphan.inbound_count || 0,
      },
      source: 'consistency-audit',
    });
  }

  await resetManagedTasks();
  await insertTasks(tasks);
  console.log(`Synced ${tasks.length} location quality tasks.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
