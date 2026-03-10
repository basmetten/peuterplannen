const { readFileSync } = require('fs');
const { resolve } = require('path');

const DEFAULT_SUPABASE_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co';

function parseEnvFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

function createSupabaseClient(projectRoot) {
  const envPath = resolve(projectRoot, '.supabase_env');
  const env = parseEnvFile(envPath);
  const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY in .supabase_env');
  }

  const supabaseUrl = env.SUPABASE_URL
    || (env.SUPABASE_PROJECT_REF ? `https://${env.SUPABASE_PROJECT_REF}.supabase.co` : DEFAULT_SUPABASE_URL);

  async function rest(path, { method = 'GET', body, headers = {} } = {}) {
    const url = `${supabaseUrl}/rest/v1/${path}`;
    const reqHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...headers,
    };

    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${method} ${path} failed: ${res.status} ${text.slice(0, 700)}`);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function createIngestionRun({ runType, regionRoot, withSurroundings }) {
    const rows = await rest('ingestion_runs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: [{ run_type: runType, region_root: regionRoot, with_surroundings: withSurroundings, status: 'running' }],
    });
    return rows?.[0];
  }

  async function finishIngestionRun(runId, { status, stats, errorText }) {
    await rest(`ingestion_runs?id=eq.${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status,
        finished_at: new Date().toISOString(),
        stats_json: stats || {},
        error_text: errorText || null,
      },
    });
  }

  async function upsertCandidates(rows) {
    if (!rows.length) return [];
    return rest('location_candidates?on_conflict=source_fingerprint', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: rows,
    });
  }

  async function getCandidatesByRun(runId, statuses = null, { limit = 20000 } = {}) {
    const out = [];
    const pageSize = 1000;
    let offset = 0;

    while (offset < limit) {
      let path = `location_candidates?run_id=eq.${encodeURIComponent(runId)}&select=*&order=id.asc&offset=${offset}&limit=${Math.min(pageSize, limit - offset)}`;
      if (statuses?.length) {
        const values = statuses.map((s) => s.replace(/[^a-z_]/gi, '')).join(',');
        path += `&status=in.(${values})`;
      }
      const rows = await rest(path);
      if (!Array.isArray(rows) || rows.length === 0) break;
      out.push(...rows);
      if (rows.length < pageSize) break;
      offset += rows.length;
    }

    return out;
  }

  async function patchCandidate(candidateId, patch) {
    await rest(`location_candidates?id=eq.${candidateId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: patch,
    });
  }

  async function patchCandidatesByRun(runId, fromStatus, patch) {
    await rest(`location_candidates?run_id=eq.${encodeURIComponent(runId)}&status=eq.${fromStatus}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: patch,
    });
  }

  async function insertEvidence(rows) {
    if (!rows.length) return;
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await rest('location_source_evidence', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: rows.slice(i, i + chunkSize),
      });
    }
  }

  async function insertReview(row) {
    const rows = await rest('location_ai_reviews', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: [row],
    });
    return rows?.[0] || null;
  }

  async function getReviewsByCandidateIds(candidateIds) {
    if (!candidateIds.length) return [];
    const clean = candidateIds.map((id) => Number(id)).filter(Number.isFinite);
    if (!clean.length) return [];
    const inList = clean.join(',');
    return rest(`location_ai_reviews?candidate_id=in.(${inList})&select=*&order=created_at.desc`);
  }

  async function getLocationsByRegion(regionRoot, types = null) {
    let path = `locations?region=eq.${encodeURIComponent(regionRoot)}&select=*&order=id.asc`;
    if (types?.length) {
      path += `&type=in.(${types.map((v) => encodeURIComponent(v)).join(',')})`;
    }
    return rest(path);
  }

  async function findLocationByPlaceId(placeId) {
    if (!placeId) return null;
    const rows = await rest(`locations?place_id=eq.${encodeURIComponent(placeId)}&select=*&limit=1`);
    return rows?.[0] || null;
  }

  async function insertLocation(row) {
    const rows = await rest('locations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: [row],
    });
    return rows?.[0] || null;
  }

  async function patchLocation(locationId, patch) {
    const rows = await rest(`locations?id=eq.${locationId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: patch,
    });
    return rows?.[0] || null;
  }

  async function updateLocationAi(locationId, aiPatch) {
    return patchLocation(locationId, aiPatch);
  }

  async function markStaleRunningRunsFailed(regionRoot) {
    const running = await rest(`ingestion_runs?region_root=eq.${encodeURIComponent(regionRoot)}&status=eq.running&select=id`);
    if (!Array.isArray(running) || running.length === 0) return 0;
    for (const row of running) {
      await rest(`ingestion_runs?id=eq.${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_text: 'stale_run_replaced_by_new_execution',
        },
      });
    }
    return running.length;
  }

  return {
    env,
    supabaseUrl,
    serviceKey,
    rest,
    createIngestionRun,
    finishIngestionRun,
    upsertCandidates,
    getCandidatesByRun,
    patchCandidate,
    patchCandidatesByRun,
    insertEvidence,
    insertReview,
    getReviewsByCandidateIds,
    getLocationsByRegion,
    findLocationByPlaceId,
    insertLocation,
    patchLocation,
    updateLocationAi,
    markStaleRunningRunsFailed,
  };
}

module.exports = {
  createSupabaseClient,
};
