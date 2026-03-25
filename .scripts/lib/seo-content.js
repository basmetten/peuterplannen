const fs = require('fs');
const path = require('path');
const { ROOT, SEO_CONTENT_DIR } = require('./config');
const { cleanPathLike, escapeHtml, readJsonIfExists, isoDateInTimeZone, todayISOAmsterdam } = require('./helpers');

// Blog dependencies (optional — blog build skipped if not installed)
let matter, marked;
try {
  matter = require('gray-matter');
  const m = require('marked');
  marked = m.marked || m;
} catch (e) {
  // optional dependencies
}

function loadGscSignals() {
  const auditPath = path.join(ROOT, 'output', 'gsc-audit.json');
  const payload = readJsonIfExists(auditPath);
  const pathSignals = new Map();
  if (!payload || typeof payload !== 'object') {
    return { pathSignals, source: 'none' };
  }

  const legacyRows = Array.isArray(payload.page_rows) ? payload.page_rows.map((row) => ({
    page: row?.keys?.[0],
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0,
  })) : [];

  const richRows = Array.isArray(payload.top_pages) ? payload.top_pages : [];
  const rows = richRows.length > 0 ? richRows : legacyRows;

  for (const row of rows) {
    const raw = row.page || row.url || row.path;
    if (!raw) continue;
    const cleanPath = cleanPathLike(raw);
    pathSignals.set(cleanPath, {
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    });
  }

  return { pathSignals, source: richRows.length > 0 ? 'telemetry' : 'legacy-audit' };
}

function fallbackMarkdownToHtml(markdown) {
  return (markdown || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^##\s+/.test(block)) return `<h2>${escapeHtml(block.replace(/^##\s+/, ''))}</h2>`;
      if (/^###\s+/.test(block)) return `<h3>${escapeHtml(block.replace(/^###\s+/, ''))}</h3>`;
      if (/^- /m.test(block)) {
        const items = block.split('\n').map((line) => line.replace(/^- /, '').trim()).filter(Boolean);
        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
      }
      return `<p>${escapeHtml(block).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

function parseMarkdownDoc(raw, filePath) {
  if (matter) {
    const parsed = matter(raw);
    return { data: parsed.data || {}, content: parsed.content || '' };
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  // Fallback parser is intentionally simple; real builds use gray-matter.
  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    data[key] = value;
  }
  return { data, content: match[2] };
}

function renderMarkdownDoc(markdown) {
  if (!markdown) return '';
  if (marked) {
    const rendered = marked.parse ? marked.parse(markdown) : marked(markdown);
    return typeof rendered === 'string' ? rendered : `${rendered || ''}`;
  }
  return fallbackMarkdownToHtml(markdown);
}

function readSeoDoc(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data: frontmatter, content } = parseMarkdownDoc(raw, filePath);
  return {
    filePath,
    slug: path.basename(filePath, path.extname(filePath)),
    ...frontmatter,
    bodyMarkdown: (content || '').trim(),
    bodyHtml: renderMarkdownDoc((content || '').trim()),
  };
}

function loadSeoDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return {};
  const entries = {};
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const doc = readSeoDoc(path.join(dirPath, entry.name));
    if (doc) entries[doc.slug] = doc;
  }
  return entries;
}

function loadSeoLocationDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return {};
  const out = {};
  for (const regionEntry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!regionEntry.isDirectory()) continue;
    out[regionEntry.name] = loadSeoDirectory(path.join(dirPath, regionEntry.name));
  }
  return out;
}

let BLOG_METADATA_CACHE = null;
function loadBlogMetadata() {
  if (BLOG_METADATA_CACHE) return BLOG_METADATA_CACHE;
  const postsDir = path.join(ROOT, 'content', 'posts');
  const metadata = new Map();
  if (!fs.existsSync(postsDir)) {
    BLOG_METADATA_CACHE = metadata;
    return metadata;
  }

  for (const file of fs.readdirSync(postsDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parsed = parseMarkdownDoc(raw, file);
    const publishedAt = parsed.data?.date ? isoDateInTimeZone(new Date(parsed.data.date), 'Europe/Amsterdam') : todayISOAmsterdam();
    metadata.set(slug, {
      slug,
      title: parsed.data?.title || slug,
      description: parsed.data?.description || '',
      date: publishedAt,
      published: publishedAt <= todayISOAmsterdam(),
    });
  }

  BLOG_METADATA_CACHE = metadata;
  return metadata;
}

function getBlogEntriesBySlug(slugs = []) {
  const metadata = loadBlogMetadata();
  return (slugs || [])
    .map((slug) => metadata.get(slug))
    .filter((entry) => entry && entry.published);
}

function loadSeoContentLibrary() {
  const shared = loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'shared'));
  return {
    shared,
    regions: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'regions')),
    types: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'types')),
    clusters: loadSeoDirectory(path.join(SEO_CONTENT_DIR, 'clusters')),
    locations: loadSeoLocationDirectory(path.join(SEO_CONTENT_DIR, 'locations')),
  };
}

function normalizeEditorialPageRecord(entry) {
  if (!entry) return null;
  const bodyMarkdown = `${entry.body_md || ''}`.trim();
  const heroBody = `${entry.hero_body_md || ''}`.trim();
  return {
    ...entry,
    slug: entry.slug,
    title: entry.title || entry.meta_title || entry.slug || '',
    meta_title: entry.meta_title || '',
    meta_description: entry.meta_description || '',
    hero_title: entry.title || entry.meta_title || entry.slug || '',
    hero_sub: heroBody || entry.meta_description || '',
    bodyMarkdown,
    bodyHtml: renderMarkdownDoc(bodyMarkdown),
    related_blog_slugs: Array.isArray(entry.related_blog_slugs) ? entry.related_blog_slugs : [],
    curated_location_ids: Array.isArray(entry.curated_location_ids) ? entry.curated_location_ids : [],
    editorial_label: entry.editorial_label || 'PeuterPlannen redactie',
  };
}

function mergeSeoContentLibrary(seedContent, editorialPages = []) {
  const merged = {
    shared: { ...(seedContent?.shared || {}) },
    regions: { ...(seedContent?.regions || {}) },
    types: { ...(seedContent?.types || {}) },
    clusters: { ...(seedContent?.clusters || {}) },
    locations: { ...(seedContent?.locations || {}) },
  };

  for (const page of editorialPages) {
    if (!page || page.status !== 'published') continue;
    const entry = normalizeEditorialPageRecord(page);
    if (!entry) continue;

    if (page.page_type === 'discover_hub') {
      merged.shared.ontdekken = entry;
      continue;
    }

    if (page.page_type === 'methodology_page') {
      merged.shared.methodologie = entry;
      continue;
    }

    if (page.page_type === 'region_hub') {
      const key = page.region_slug || page.slug;
      if (key) merged.regions[key] = entry;
      continue;
    }

    if (page.page_type === 'type_hub') {
      const key = page.type_slug || page.slug;
      if (key) merged.types[key] = entry;
      continue;
    }

    if (page.page_type === 'cluster_hub') {
      const key = page.cluster_slug || page.slug;
      if (key) merged.clusters[key] = entry;
    }
  }

  return merged;
}

module.exports = {
  loadGscSignals,
  fallbackMarkdownToHtml,
  parseMarkdownDoc,
  renderMarkdownDoc,
  readSeoDoc,
  loadSeoDirectory,
  loadSeoLocationDirectory,
  loadBlogMetadata,
  getBlogEntriesBySlug,
  loadSeoContentLibrary,
  normalizeEditorialPageRecord,
  mergeSeoContentLibrary,
};
