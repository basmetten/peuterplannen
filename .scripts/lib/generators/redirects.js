const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function updateRedirects(data) {
  const redirectsPath = path.join(ROOT, '_redirects');
  const markerStart = '# BEGIN:SEO_ALIASES';
  const markerEnd = '# END:SEO_ALIASES';
  let content = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, 'utf8') : '';

  if (!content.includes(markerStart)) {
    content = `${content.trimEnd()}\n\n${markerStart}\n${markerEnd}\n`;
  }

  const byId = new Map(data.locations.map((loc) => [Number(loc.id), loc]));
  const lines = [];

  for (const row of data.locationAliases || []) {
    const source = row.old_region_slug && row.old_loc_slug ? `/${row.old_region_slug}/${row.old_loc_slug}/` : null;
    const target = row.target_url || null;
    if (source && target) lines.push(`${source} ${target} 301`);
  }

  for (const loc of data.locations) {
    if (loc.seoTierResolved !== 'alias' || !loc.seo_canonical_target) continue;
    const canonicalTarget = byId.get(Number(loc.seo_canonical_target));
    if (!canonicalTarget) continue;
    lines.push(`${loc.pageUrl} ${canonicalTarget.pageUrl} 301`);
  }

  const deduped = [...new Set(lines)].sort();
  content = content.replace(
    new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`),
    `${markerStart}\n${deduped.join('\n')}\n${markerEnd}`,
  );

  fs.writeFileSync(redirectsPath, `${content.trimEnd()}\n`);
  console.log(`Updated _redirects SEO alias block (${deduped.length} redirects)`);
}

module.exports = { updateRedirects };
