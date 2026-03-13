const fs = require('fs');
const path = require('path');
const { ROOT, GENERIC_DESCRIPTION_PATTERNS, AI_SLOP_PATTERNS, SEO_DESCRIPTION_MIN_LENGTH } = require('../config');
const { fullSiteUrl, cleanPathLike } = require('../helpers');

function extractMetaContent(html, name) {
  const match = html.match(new RegExp(`<meta\\s+name="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

function extractPropertyContent(html, property) {
  const match = html.match(new RegExp(`<meta\\s+property="${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

function extractCanonicalHref(html) {
  const match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  return match ? match[1].trim() : '';
}

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlForSlopAudit(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<div class="guide-links"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="cities-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="blog-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="blog-tags"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<section class="blog-grid-section"[\s\S]*?<\/section>/gi, ' ')
    .replace(/<section class="regions-section"[\s\S]*?<\/section>/gi, ' ')
    .replace(/<div class="loc-list"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="loc-grid"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div class="related-links"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countInternalLinks(html) {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href.startsWith('/') || href.startsWith('https://peuterplannen.nl'))
    .length;
}

function hasInternalLinkTo(html, targetPath) {
  if (!targetPath) return false;
  const canonicalTarget = cleanPathLike(targetPath);
  const fullTarget = fullSiteUrl(canonicalTarget);
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1])
    .some((href) => cleanPathLike(href) === canonicalTarget || href === fullTarget);
}

function countPatternHits(text, patterns) {
  return patterns.reduce((total, pattern) => {
    const matches = `${text || ''}`.match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

function buildSeoRegistry(catalog) {
  const registry = [];
  for (const page of catalog) {
    if (!fs.existsSync(page.filePath)) {
      registry.push({
        url: fullSiteUrl(page.path),
        path: cleanPathLike(page.path),
        page_type: page.pageType,
        tier: page.tier,
        error: 'missing_file',
      });
      continue;
    }
    const html = fs.readFileSync(page.filePath, 'utf8');
    const text = stripHtml(html);
    const slopAuditText = stripHtmlForSlopAudit(html);
    registry.push({
      url: fullSiteUrl(page.path),
      path: cleanPathLike(page.path),
      page_type: page.pageType,
      tier: page.tier,
      canonical: extractCanonicalHref(html),
      title: extractTitle(html),
      description: extractMetaContent(html, 'description'),
      og_title: extractPropertyContent(html, 'og:title'),
      og_description: extractPropertyContent(html, 'og:description'),
      twitter_title: extractMetaContent(html, 'twitter:title'),
      twitter_description: extractMetaContent(html, 'twitter:description'),
      robots: extractMetaContent(html, 'robots') || page.robots || 'index,follow',
      in_sitemap: page.inSitemap,
      wordcount: text ? text.split(/\s+/).filter(Boolean).length : 0,
      internal_link_count: countInternalLinks(html),
      methodology_link_present: hasInternalLinkTo(html, '/methode/'),
      parent_hub_link_present: hasInternalLinkTo(html, page.parentHubPath),
      type_hub_expected: !!page.typeHubPath,
      type_hub_link_present: hasInternalLinkTo(html, page.typeHubPath),
      slop_phrase_hits: countPatternHits(slopAuditText, AI_SLOP_PATTERNS),
      has_gsc_signal: !!page.hasGscSignal,
      quality_score: page.qualityScore ?? null,
      lastmod: page.lastmod,
      file: path.relative(ROOT, page.filePath).replace(/\\/g, '/'),
    });
  }

  const indexable = registry.filter((entry) => ['core', 'hub', 'index'].includes(entry.tier));
  const titleCounts = new Map();
  for (const entry of indexable) {
    if (!entry.title) continue;
    titleCounts.set(entry.title, (titleCounts.get(entry.title) || 0) + 1);
  }
  for (const entry of registry) {
    entry.duplicate_status = titleCounts.get(entry.title) > 1 ? 'duplicate_indexable_title' : 'unique';
  }

  const errors = [];
  for (const entry of registry.filter((row) => row.error === 'missing_file' && ['core', 'hub', 'index'].includes(row.tier))) {
    errors.push(`Missing generated file: ${entry.path || entry.url}`);
  }
  for (const entry of indexable) {
    if (!entry.title) errors.push(`Missing <title>: ${entry.path}`);
    if (!entry.canonical) errors.push(`Missing canonical: ${entry.path}`);
    if (!entry.description || entry.description.length < SEO_DESCRIPTION_MIN_LENGTH) errors.push(`Weak description: ${entry.path}`);
    if (entry.og_title && entry.og_title !== entry.title) errors.push(`Title mismatch OG: ${entry.path}`);
    if (entry.twitter_title && entry.twitter_title !== entry.title && !entry.twitter_title.includes('PeuterPlannen')) errors.push(`Title mismatch Twitter: ${entry.path}`);
    if (entry.og_description && entry.og_description !== entry.description) errors.push(`Description mismatch OG: ${entry.path}`);
    if (entry.twitter_description && entry.twitter_description !== entry.description) errors.push(`Description mismatch Twitter: ${entry.path}`);
    if (['region_hub', 'type_hub', 'cluster_hub', 'blog_index', 'blog_article', 'location_detail'].includes(entry.page_type)
      && GENERIC_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(entry.description || ''))) {
      errors.push(`Generic description: ${entry.path}`);
    }
    if (entry.page_type === 'location_detail' && entry.tier === 'index' && !entry.parent_hub_link_present) {
      errors.push(`Missing parent hub link: ${entry.path}`);
    }
    if (entry.duplicate_status !== 'unique') errors.push(`Duplicate indexable title: ${entry.title}`);
  }
  for (const entry of registry.filter((row) => row.tier === 'support')) {
    if (entry.in_sitemap) errors.push(`Support page in sitemap: ${entry.path}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    counts: registry.reduce((acc, entry) => {
      acc.total += 1;
      acc.by_tier[entry.tier] = (acc.by_tier[entry.tier] || 0) + 1;
      acc.by_type[entry.page_type] = (acc.by_type[entry.page_type] || 0) + 1;
      return acc;
    }, { total: 0, by_tier: {}, by_type: {} }),
    duplicate_indexable_titles: [...titleCounts.entries()].filter(([, count]) => count > 1).map(([title, count]) => ({ title, count })),
    errors,
    entries: registry,
  };

  const outDir = path.join(ROOT, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'seo-registry.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'seo-registry.md'), [
    '# SEO Registry',
    '',
    `- Generated: ${summary.generated_at}`,
    `- Total pages: ${summary.counts.total}`,
    `- By tier: ${Object.entries(summary.counts.by_tier).map(([tier, count]) => `${tier}=${count}`).join(', ')}`,
    `- By type: ${Object.entries(summary.counts.by_type).map(([type, count]) => `${type}=${count}`).join(', ')}`,
    `- Duplicate indexable titles: ${summary.duplicate_indexable_titles.length}`,
    `- Errors: ${errors.length}`,
    '',
  ].join('\n'));

  if (errors.length) {
    throw new Error(`SEO registry validation failed:\n- ${errors.slice(0, 25).join('\n- ')}`);
  }

  console.log(`Updated output/seo-registry.json (${registry.length} pages)`);
  return summary;
}

module.exports = {
  extractMetaContent,
  extractPropertyContent,
  extractCanonicalHref,
  extractTitle,
  stripHtml,
  stripHtmlForSlopAudit,
  countInternalLinks,
  hasInternalLinkTo,
  countPatternHits,
  buildSeoRegistry,
};
