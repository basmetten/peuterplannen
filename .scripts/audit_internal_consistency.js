#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const JSON_OUT = path.join(OUTPUT_DIR, 'audit-consistency.json');
const MD_OUT = path.join(OUTPUT_DIR, 'audit-consistency.md');
const OLD_BLOG_SLUG = '/blog/pannenkoeken-boerderijen-utrecht-heuvelrug/';
const STRICT = process.argv.includes('--strict');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', '.next'].includes(entry.name)) continue;
      walk(full, out);
      continue;
    }
    out.push(full);
  }
  return out;
}

function getTrackedFiles() {
  try {
    return execFileSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.join(ROOT, rel));
  } catch {
    return walk(ROOT);
  }
}

function toRel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function existsLinkTarget(fromFile, href) {
  let clean = href.split('#')[0].split('?')[0].trim();
  if (!clean || clean.includes('${')) return true;
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(clean)) return true;
  if (clean.startsWith('#')) return true;

  let target = clean.startsWith('/')
    ? path.join(ROOT, clean)
    : path.join(path.dirname(fromFile), clean);

  if (target.endsWith(path.sep)) target = path.join(target, 'index.html');

  if (path.extname(target)) {
    return fs.existsSync(target);
  }

  if (fs.existsSync(path.join(target, 'index.html'))) return true;
  if (fs.existsSync(`${target}.html`)) return true;
  return fs.existsSync(target);
}

function scanBrokenHtmlLinks(htmlFiles) {
  const hrefRegex = /href\s*=\s*"([^"]+)"/gi;
  const issues = [];
  for (const file of htmlFiles) {
    const rel = toRel(file);
    if (rel.startsWith('portal/')) continue;
    if (rel.startsWith('supabase/auth/')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = hrefRegex.exec(content))) {
      const href = match[1];
      if (!existsLinkTarget(file, href)) {
        issues.push({ file: rel, href });
      }
    }
  }
  return issues;
}

function scanBrokenMarkdownLinks(mdFiles) {
  const linkRegex = /\[[^\]]+\]\((\/[^)]+)\)/g;
  const issues = [];
  for (const file of mdFiles) {
    const rel = toRel(file);
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = linkRegex.exec(content))) {
      const href = match[1];
      if (!existsLinkTarget(file, href)) {
        issues.push({ file: rel, href });
      }
    }
  }
  return issues;
}

function normalizeSitemapPath(rawPath) {
  if (!rawPath || rawPath === '/') return '/';
  if (rawPath === '/blog') return '/blog/';
  if (rawPath === '/app') return '/app.html';
  return rawPath.endsWith('/') || rawPath.endsWith('.html') ? rawPath : `${rawPath}/`;
}

function getSitemapPathsFromFile(filePath, visited = new Set()) {
  if (!fs.existsSync(filePath)) return new Set();
  if (visited.has(filePath)) return new Set();
  visited.add(filePath);

  const xml = fs.readFileSync(filePath, 'utf8');
  const results = new Set();

  if (/<sitemapindex/i.test(xml)) {
    const sitemapRefs = [...xml.matchAll(/<loc>https:\/\/peuterplannen\.nl\/([^<]+\.xml)<\/loc>/g)].map((match) => match[1]);
    for (const ref of sitemapRefs) {
      const nested = getSitemapPathsFromFile(path.join(ROOT, ref), visited);
      for (const item of nested) results.add(item);
    }
    return results;
  }

  const matches = [...xml.matchAll(/<loc>https:\/\/peuterplannen\.nl([^<]*)<\/loc>/g)];
  for (const match of matches) {
    results.add(normalizeSitemapPath(match[1] || '/'));
  }
  return results;
}

function getSitemapPaths() {
  return getSitemapPathsFromFile(path.join(ROOT, 'sitemap.xml'));
}

function getRedirectSources() {
  const redirectsPath = path.join(ROOT, '_redirects');
  if (!fs.existsSync(redirectsPath)) return new Set();
  const lines = fs.readFileSync(redirectsPath, 'utf8').split('\n');
  const sources = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    const src = parts[0].endsWith('/') ? parts[0] : `${parts[0]}/`;
    sources.add(src);
  }
  return sources;
}

function findOrphanLocationPages() {
  const sitemapPaths = getSitemapPaths();
  const redirectSources = getRedirectSources();
  const regionDirs = [];
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (['.git', 'node_modules', 'blog', 'content', 'admin', 'partner', 'portal', 'privacy', 'disclaimer', '.scripts', '.github', 'images', 'icons', 'output', 'supabase'].includes(name)) continue;
    if (!fs.existsSync(path.join(ROOT, `${name}.html`))) continue;
    regionDirs.push(name);
  }

  const orphans = [];
  for (const region of regionDirs) {
    const regionPath = path.join(ROOT, region);
    for (const entry of fs.readdirSync(regionPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = `/${region}/${entry.name}/`;
      const indexPath = path.join(regionPath, entry.name, 'index.html');
      if (!fs.existsSync(indexPath)) continue;
      if (redirectSources.has(p)) continue;
      const html = fs.readFileSync(indexPath, 'utf8');
      if (/<meta\s+name="robots"\s+content="noindex,follow"/i.test(html)) continue;
      if (!sitemapPaths.has(p)) {
        orphans.push(p);
      }
    }
  }
  return orphans.sort();
}

function checkAdminPartnerBaseline() {
  const files = [
    { path: path.join(ROOT, 'admin', 'index.html'), canonical: 'https://admin.peuterplannen.nl/' },
    { path: path.join(ROOT, 'partner', 'index.html'), canonical: 'https://partner.peuterplannen.nl/' },
  ];
  const issues = [];

  for (const file of files) {
    const rel = toRel(file.path);
    if (!fs.existsSync(file.path)) {
      issues.push({ file: rel, issue: 'missing_file' });
      continue;
    }
    const html = fs.readFileSync(file.path, 'utf8');
    if (!/<meta\s+name="description"/i.test(html)) issues.push({ file: rel, issue: 'missing_meta_description' });
    if (!new RegExp(`<link\\s+rel="canonical"\\s+href="${file.canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i').test(html)) {
      issues.push({ file: rel, issue: 'missing_or_wrong_canonical' });
    }
    if (!/class="skip-link"/i.test(html)) issues.push({ file: rel, issue: 'missing_skip_link' });
    if (!/<main[^>]*id="main-content"/i.test(html)) issues.push({ file: rel, issue: 'missing_main_landmark' });
    if (!/<nav[^>]*aria-label="Hoofdnavigatie"/i.test(html)) issues.push({ file: rel, issue: 'missing_nav_aria_label' });
  }

  return issues;
}

function checkBlogSlugConsistency(allFiles) {
  const issues = [];
  for (const file of allFiles) {
    const rel = toRel(file);
    if (rel === '_redirects') continue;
    if (rel === '.scripts/audit_internal_consistency.js') continue;
    if (!/\.(html|md|js|json|xml|yml)$/i.test(rel)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(OLD_BLOG_SLUG)) {
      issues.push(rel);
    }
  }
  return issues;
}

function buildMarkdownSummary(report) {
  return [
    '# Consistency Audit',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `- Broken internal HTML links: ${report.counts.broken_html_links}`,
    `- Broken internal markdown links: ${report.counts.broken_markdown_links}`,
    `- Orphan location pages: ${report.counts.orphan_location_pages}`,
    `- Blog slug consistency issues: ${report.counts.blog_slug_issues}`,
    `- Admin/partner baseline issues: ${report.counts.admin_partner_issues}`,
    '',
    '## Samples',
    '',
    `- Broken HTML links sample: ${report.samples.broken_html_links.map((x) => `${x.file} -> ${x.href}`).join(' | ') || 'none'}`,
    `- Broken markdown links sample: ${report.samples.broken_markdown_links.map((x) => `${x.file} -> ${x.href}`).join(' | ') || 'none'}`,
    `- Orphan pages sample: ${report.samples.orphan_location_pages.join(' | ') || 'none'}`,
    `- Blog slug issues sample: ${report.samples.blog_slug_issues.join(' | ') || 'none'}`,
    `- Admin/partner issues sample: ${report.samples.admin_partner_issues.map((x) => `${x.file}:${x.issue}`).join(' | ') || 'none'}`,
    '',
  ].join('\n');
}

function main() {
  const allFiles = getTrackedFiles().filter((file) => fs.existsSync(file));
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
  const mdFiles = allFiles.filter((f) => f.endsWith('.md') && toRel(f).startsWith('content/posts/'));

  const brokenHtmlLinks = scanBrokenHtmlLinks(htmlFiles);
  const brokenMarkdownLinks = scanBrokenMarkdownLinks(mdFiles);
  const orphanLocationPages = findOrphanLocationPages();
  const blogSlugIssues = checkBlogSlugConsistency(allFiles);
  const adminPartnerIssues = checkAdminPartnerBaseline();

  const report = {
    generated_at: new Date().toISOString(),
    strict_mode: STRICT,
    counts: {
      broken_html_links: brokenHtmlLinks.length,
      broken_markdown_links: brokenMarkdownLinks.length,
      orphan_location_pages: orphanLocationPages.length,
      blog_slug_issues: blogSlugIssues.length,
      admin_partner_issues: adminPartnerIssues.length,
    },
    samples: {
      broken_html_links: brokenHtmlLinks.slice(0, 25),
      broken_markdown_links: brokenMarkdownLinks.slice(0, 25),
      orphan_location_pages: orphanLocationPages.slice(0, 25),
      blog_slug_issues: blogSlugIssues.slice(0, 25),
      admin_partner_issues: adminPartnerIssues.slice(0, 25),
    },
    details: {
      broken_html_links: brokenHtmlLinks,
      broken_markdown_links: brokenMarkdownLinks,
      orphan_location_pages: orphanLocationPages,
      blog_slug_issues: blogSlugIssues,
      admin_partner_issues: adminPartnerIssues,
    },
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_OUT, buildMarkdownSummary(report));

  console.log(`Audit report written: ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`Audit summary written: ${path.relative(ROOT, MD_OUT)}`);
  console.log(`Counts: ${JSON.stringify(report.counts)}`);

  const hasBlockingIssues =
    brokenHtmlLinks.length > 0 ||
    brokenMarkdownLinks.length > 0 ||
    orphanLocationPages.length > 0 ||
    blogSlugIssues.length > 0 ||
    adminPartnerIssues.length > 0;

  if (STRICT && hasBlockingIssues) {
    process.exit(1);
  }
}

main();
