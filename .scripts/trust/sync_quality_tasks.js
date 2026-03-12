#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_URL = process.env.SUPABASE_URL || 'https://piujsvgbfflrrvauzsxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRUST_GAPS_JSON = path.join(ROOT, 'output', 'trust-context-gaps.json');
const CONSISTENCY_JSON = path.join(ROOT, 'output', 'audit-consistency.json');
const GSC_TRENDS_JSON = path.join(ROOT, 'output', 'gsc-trends.json');
const DRAFT_REPORT_JSON = path.join(ROOT, 'output', 'priority-location-drafts.json');

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

function scoreToPriority(row) {
  if ((row.clicks || 0) > 1 || (row.impressions || 0) >= 250) return 5;
  if ((row.clicks || 0) > 0 || (row.impressions || 0) >= 100 || row.seo_tier === 'index') return 4;
  if ((row.impressions || 0) >= 30) return 3;
  return 2;
}

async function fetchLocations() {
  return api('locations?select=id,name,region,seo_tier&limit=3000');
}

async function fetchEditorialPageLocationIds() {
  const rows = await api('editorial_pages?select=location_id,status,page_type&page_type=eq.location_detail_override');
  return new Set((rows || []).filter((row) => row.location_id && row.status !== 'archived').map((row) => Number(row.location_id)));
}

async function resetManagedTasks() {
  await api('location_quality_tasks?source=in.(trust-gap-report,consistency-audit,gsc-telemetry,editorial-draft-audit)&status=in.(open,in_progress)', { method: 'DELETE' });
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
  const trustGaps = readJson(TRUST_GAPS_JSON, { top_priority: [] }) || { top_priority: [] };
  const consistency = readJson(CONSISTENCY_JSON, { details: { orphanLocationPages: [] } }) || { details: { orphanLocationPages: [] } };
  const gsc = readJson(GSC_TRENDS_JSON, { top_pages: [] }) || { top_pages: [] };
  const draftReport = readJson(DRAFT_REPORT_JSON, { created_targets: [], skipped_existing: [] }) || { created_targets: [], skipped_existing: [] };
  const [locations, editorialLocationIds] = await Promise.all([
    fetchLocations(),
    fetchEditorialPageLocationIds(),
  ]);
  const locationByPath = new Map(locations.map((loc) => [`/${slugify(loc.region)}/${slugify(loc.name)}/`, loc]));
  const topTrustRows = trustGaps.top_priority || [];
  const highSignalPaths = new Map((gsc.top_pages || []).filter((row) => row.path).map((row) => [row.path, row]));
  const draftKnownIds = new Set([
    ...Array.from(editorialLocationIds),
    ...(draftReport.created_targets || []).map((row) => Number(row.location_id)).filter(Boolean),
    ...(draftReport.skipped_existing || []).map((row) => Number(row.location_id)).filter(Boolean),
  ]);

  const tasks = [];

  for (const row of topTrustRows) {
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
        summary: `Ontbreekt: ${(row.missing_fields || []).join(', ')}`,
      },
      source: 'trust-gap-report',
    });

    if (!draftKnownIds.has(Number(row.location_id)) && ((row.clicks || 0) > 0 || (row.impressions || 0) >= 20)) {
      tasks.push({
        location_id: row.location_id,
        task_type: 'missing_editorial_draft',
        status: 'open',
        priority: Math.max(3, scoreToPriority(row)),
        details_json: {
          region: row.region,
          seo_tier: row.seo_tier,
          path: row.path || null,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          summary: 'High-signal detailpagina heeft nog geen editorial draft.',
        },
        source: 'editorial-draft-audit',
      });
    }

    if ((row.clicks || 0) > 0 || (row.impressions || 0) >= 50) {
      tasks.push({
        location_id: row.location_id,
        task_type: 'high_signal_missing_context',
        status: 'open',
        priority: 5,
        details_json: {
          region: row.region,
          path: row.path || null,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          missing_fields: row.missing_fields || [],
          summary: 'Locatie heeft GSC-signaal maar mist nog trust/context-velden.',
        },
        source: 'gsc-telemetry',
      });
    }
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
        summary: `Detailpagina heeft te weinig interne ondersteuning (${orphan.inbound_count || 0} links).`,
      },
      source: 'consistency-audit',
    });
  }

  for (const [pathName, signal] of highSignalPaths.entries()) {
    const loc = locationByPath.get(pathName);
    if (!loc) continue;
    if (loc.seo_tier === 'support' && (signal.impressions || 0) >= 25) {
      tasks.push({
        location_id: loc.id,
        task_type: 'support_page_rising_impressions',
        status: 'open',
        priority: 4,
        details_json: {
          path: pathName,
          clicks: signal.clicks || 0,
          impressions: signal.impressions || 0,
          position: signal.position ?? null,
          summary: 'Support detailpagina krijgt zichtbaarheid en verdient herbeoordeling.',
        },
        source: 'gsc-telemetry',
      });
    }

    if ((signal.position || 0) >= 8 && (signal.position || 0) <= 20 && (signal.impressions || 0) >= 25) {
      tasks.push({
        location_id: loc.id,
        task_type: 'near_win_detail_page',
        status: 'open',
        priority: 4,
        details_json: {
          path: pathName,
          clicks: signal.clicks || 0,
          impressions: signal.impressions || 0,
          position: signal.position ?? null,
          summary: 'Detailpagina zit dicht bij de eerste resultaten en verdient metadata/context-herziening.',
        },
        source: 'gsc-telemetry',
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const task of tasks) {
    const key = `${task.location_id || 'none'}::${task.task_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(task);
  }

  await resetManagedTasks();
  await insertTasks(deduped);
  console.log(`Synced ${deduped.length} location quality tasks.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
