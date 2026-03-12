const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_ROOT = path.join(PROJECT_ROOT, 'output', 'alcohol-audit');
const PAGE_SIZE = 1000;
const USER_AGENT = 'Mozilla/5.0 (compatible; PeuterPlannenAlcoholAudit/1.0; +https://peuterplannen.nl)';

const ALCOHOL_PATTERNS = [
  { label: 'bier', regex: /\bbier(?:en)?\b/i },
  { label: 'tapbier', regex: /\btapbier\b|\bvan de tap\b/i },
  { label: 'speciaalbier', regex: /\bspeciaalbier\b|\bcraft beer\b/i },
  { label: 'wijn', regex: /\bwijn(?:en|kaart)?\b|\bwine(?: list)?\b/i },
  { label: 'cocktails', regex: /\bcocktails?\b|\bmixdrinks?\b/i },
  { label: 'borrel', regex: /\bborrel(?:kaart|hap|moment)?\b/i },
  { label: 'aperitief', regex: /\baperitief\b|\baperol\b|\bspritz\b|\bprosecco\b|\bcava\b|\bchampagne\b/i },
  { label: 'gin-tonic', regex: /\bgin[ -]?tonic\b/i },
  { label: 'alcoholvrij en wijn/biercontext', regex: /alcoholvrij\s+(?:bier|wijn)|(?:bier|wijn)\s+en\s+alcoholvrij/i },
  { label: 'bar', regex: /\bcocktailbar\b|\bwijnbar\b|\bbierbar\b|\bbarkaart\b/i },
  { label: 'drankkaart', regex: /\bdrankkaart\b|\bdrankenkaart\b|\bdrinks menu\b/i },
];

const MENU_LINK_PATTERNS = [
  /menu/i,
  /kaart/i,
  /drank/i,
  /drink/i,
  /wijn/i,
  /bier/i,
  /cocktail/i,
  /bar/i,
  /borrel/i,
];

function parseArgs(argv) {
  return Object.fromEntries(
    argv.map((arg) => {
      const [rawKey, rawValue] = arg.replace(/^--/, '').split('=');
      return [rawKey, rawValue === undefined ? true : rawValue];
    }),
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runSlug(prefix = 'run') {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${prefix}-${iso}`;
}

function csvEscape(value) {
  const text = String(value ?? '').replace(/\r?\n+/g, ' ').trim();
  if (/[",]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const [header, ...dataRows] = rows;
  return dataRows.filter((cells) => cells.some((cell) => cell !== '')).map((cells) => {
    const out = {};
    header.forEach((key, index) => {
      out[key] = cells[index] ?? '';
    });
    return out;
  });
}

function normalizeBoolean(value) {
  if (value === true || value === 'true' || value === 'TRUE' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === 'FALSE' || value === '0' || value === 0) return false;
  return null;
}

function classifyTier(location) {
  if (location.alcohol === true) return 'A';
  if (['horeca', 'pancake'].includes(String(location.type || '').toLowerCase())) return 'B';
  return 'C';
}

function compareByPriorityThenName(a, b) {
  const order = { A: 0, B: 1, C: 2 };
  if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
  return String(a.name || '').localeCompare(String(b.name || ''), 'nl');
}

async function listAllLocations(db) {
  const out = [];
  let offset = 0;
  while (true) {
    const rows = await db.rest(`locations?select=id,name,region,type,website,description,alcohol,seo_primary_locality,claimed_by_user_id,last_owner_update,last_verified_at&order=id.asc&offset=${offset}&limit=${PAGE_SIZE}`);
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += rows.length;
  }
  return out;
}

function normalizeHtmlText(html) {
  return String(html || '')
    .replace(/\u0000/g, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAlcoholEvidence(text) {
  const raw = String(text || '').slice(0, 150000);
  const hits = [];
  for (const pattern of ALCOHOL_PATTERNS) {
    const match = raw.match(pattern.regex);
    if (!match) continue;
    const idx = match.index || 0;
    hits.push({
      label: pattern.label,
      snippet: raw.slice(Math.max(0, idx - 90), Math.min(raw.length, idx + 180)).trim(),
    });
  }
  return {
    explicit: hits.length > 0,
    hits: hits.slice(0, 6),
  };
}

function sameOriginMenuLinks(html, baseUrl) {
  const results = [];
  const seen = new Set();
  const hrefRegex = /href\s*=\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = hrefRegex.exec(html))) {
    const href = match[1];
    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.origin !== new URL(baseUrl).origin) continue;
      if (!MENU_LINK_PATTERNS.some((pattern) => pattern.test(absolute.href))) continue;
      if (seen.has(absolute.href)) continue;
      seen.add(absolute.href);
      results.push(absolute.href);
      if (results.length >= 3) break;
    } catch (_) {
      // ignore invalid URLs
    }
  }
  return results;
}

async function fetchWithRetries(url, { timeoutMs = 12000, retries = 2 } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
        if (attempt < retries && (res.status === 429 || res.status >= 500)) continue;
        return { ok: false, status: res.status, error: lastError.message };
      }
      return { ok: true, response: res };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
    }
  }
  return { ok: false, status: 0, error: String(lastError?.message || 'network_error') };
}

async function scrapeOfficialAlcoholEvidence(website) {
  if (!website) {
    return {
      checked_urls: [],
      explicit: false,
      source_url: '',
      source_type: 'official_site',
      snippet: '',
      error: 'no_website',
    };
  }

  const home = await fetchWithRetries(website);
  if (!home.ok) {
    return {
      checked_urls: [website],
      explicit: false,
      source_url: '',
      source_type: 'official_site',
      snippet: '',
      error: home.error || `website_fetch_failed:${home.status}`,
    };
  }

  const html = await home.response.text();
  const text = normalizeHtmlText(html);
  const homeEvidence = extractAlcoholEvidence(text);
  if (homeEvidence.explicit) {
    return {
      checked_urls: [website],
      explicit: true,
      source_url: website,
      source_type: 'official_site',
      snippet: homeEvidence.hits[0].snippet,
      error: null,
      hits: homeEvidence.hits,
    };
  }

  const linkedUrls = sameOriginMenuLinks(html, home.response.url || website);
  for (const candidateUrl of linkedUrls) {
    const linked = await fetchWithRetries(candidateUrl);
    if (!linked.ok) continue;
    const linkedHtml = await linked.response.text();
    const linkedText = normalizeHtmlText(linkedHtml);
    const linkedEvidence = extractAlcoholEvidence(linkedText);
    if (linkedEvidence.explicit) {
      return {
        checked_urls: [website, ...linkedUrls],
        explicit: true,
        source_url: candidateUrl,
        source_type: 'official_menu',
        snippet: linkedEvidence.hits[0].snippet,
        error: null,
        hits: linkedEvidence.hits,
      };
    }
  }

  return {
    checked_urls: [website, ...linkedUrls],
    explicit: false,
    source_url: website,
    source_type: 'official_site',
    snippet: '',
    error: null,
    hits: [],
  };
}

async function createAuditRun(db, { scope, agentCount, summaryJson = {} }) {
  const rows = await db.rest('location_alcohol_audit_runs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: [{ scope, agent_count: agentCount, status: 'running', summary_json: summaryJson }],
  });
  return rows?.[0] || null;
}

async function finishAuditRun(db, runId, { status, summaryJson = {} }) {
  await db.rest(`location_alcohol_audit_runs?id=eq.${encodeURIComponent(runId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status,
      finished_at: new Date().toISOString(),
      summary_json: summaryJson,
    },
  });
}

module.exports = {
  PROJECT_ROOT,
  OUTPUT_ROOT,
  parseArgs,
  ensureDir,
  runSlug,
  writeCsv,
  parseCsv,
  normalizeBoolean,
  classifyTier,
  compareByPriorityThenName,
  listAllLocations,
  scrapeOfficialAlcoholEvidence,
  createAuditRun,
  finishAuditRun,
};
