const { CLUSTER_PAGES, SEO_INDEX_THRESHOLD, GENERIC_DESCRIPTION_PATTERNS, AI_SLOP_PATTERNS } = require('./config');
const { slugify, cleanPathLike, fullSiteUrl, daysSince, normalizeExternalUrl, normalizeExternalHost } = require('./helpers');
const { loadGscSignals, normalizeEditorialPageRecord } = require('./seo-content');

function applyRepoSeoOverrides(data) {
  const content = data.seoContent || {};
  const locationEditorialById = new Map(
    (data.editorialPages || [])
      .filter((page) => page?.status === 'published' && page.page_type === 'location_detail_override' && page.location_id)
      .map((page) => [Number(page.location_id), normalizeEditorialPageRecord(page)])
  );

  for (const loc of data.locations) {
    const regionOverrides = content.locations?.[loc.regionSlug];
    const override = regionOverrides?.[loc.locSlug];
    if (!override) continue;
    if (override.title_override) loc.seo_title_override = override.title_override;
    if (override.description_override) loc.seo_description_override = override.description_override;
    if (override.intro_override) loc.seo_intro_override = override.intro_override;
    if (override.bodyHtml) loc.seo_repo_body_html = override.bodyHtml;
    if (override.bodyMarkdown) loc.seo_repo_body_markdown = override.bodyMarkdown;
    if (override.updated_at) loc.seo_repo_updated_at = override.updated_at;
    if (Array.isArray(override.related_blog_slugs)) loc.seo_related_blog_slugs = override.related_blog_slugs;
  }

  for (const loc of data.locations) {
    const override = locationEditorialById.get(Number(loc.id));
    if (!override) continue;
    if (override.meta_title || override.title) loc.seo_title_override = override.meta_title || override.title;
    if (override.meta_description) loc.seo_description_override = override.meta_description;
    if (override.hero_sub) loc.seo_intro_override = override.hero_sub;
    if (override.bodyHtml) loc.seo_repo_body_html = override.bodyHtml;
    if (override.bodyMarkdown) loc.seo_repo_body_markdown = override.bodyMarkdown;
    if (override.updated_at) loc.seo_repo_updated_at = override.updated_at;
    if (Array.isArray(override.related_blog_slugs) && override.related_blog_slugs.length) {
      loc.seo_related_blog_slugs = override.related_blog_slugs;
    }
  }
}

function normalizeManualSeoTier(rawTier) {
  const tier = `${rawTier || ''}`.trim().toLowerCase();
  if (!tier || tier === 'standard') return 'auto';
  if (tier === 'priority') return 'index';
  if (tier === 'supporting') return 'support';
  if (['auto', 'index', 'support', 'alias'].includes(tier)) return tier;
  return 'auto';
}

function seoTextSignals(loc) {
  const combined = [
    loc.description || '',
    loc.toddler_highlight || '',
    loc.seo_intro_override || '',
  ].join(' ').toLowerCase();
  return {
    combined,
    playHint: /(speelhoek|speeltuin|speelruimte|spelen|klimmen|zandbak|glijbaan)/.test(combined),
    indoorHint: /(binnen|overdekt|indoor|regen|slecht weer)/.test(combined),
    calmHint: /(rustig|overzichtelijk|klein|zacht|veilig)/.test(combined),
  };
}

function locationGeoFingerprint(loc) {
  if (loc.lat == null || loc.lng == null) return '';
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function duplicateGroupKey(loc) {
  const locality = slugify(loc.seo_primary_locality || '');
  const host = normalizeExternalHost(loc.website);
  const geo = locationGeoFingerprint(loc);
  const fingerprint = host || locality || geo || `id-${loc.id}`;
  return `${loc.regionSlug}::${slugify(loc.name || '')}::${fingerprint}`;
}

function selectHubLocations(locs, fallbackLimit = 24) {
  const ranked = sortLocationsForSeo(locs.filter((loc) => loc.seoTierResolved !== 'alias'));
  const indexable = ranked.filter((loc) => loc.seoTierResolved === 'index');
  if (indexable.length > 0) return indexable;
  return ranked.slice(0, Math.min(fallbackLimit, ranked.length));
}

function computeSlugs(data) {
  const { regions, locations } = data;

  // Build region name -> slug map
  const regionSlugMap = {};
  regions.forEach(r => { regionSlugMap[r.name] = r.slug; });

  // Group locations by region slug
  const byRegion = {};
  locations.forEach(loc => {
    const rSlug = regionSlugMap[loc.region] || slugify(loc.region || 'overig');
    loc.regionSlug = rSlug;
    if (!byRegion[rSlug]) byRegion[rSlug] = [];
    byRegion[rSlug].push(loc);
  });

  // Generate slugs with conflict resolution
  for (const [rSlug, locs] of Object.entries(byRegion)) {
    const usedSlugs = {};
    for (const loc of locs) {
      let slug = slugify(loc.name);
      if (!slug) slug = 'locatie';
      if (usedSlugs[slug]) {
        usedSlugs[slug]++;
        slug = `${slug}-${usedSlugs[slug]}`;
      } else {
        usedSlugs[slug] = 1;
      }
      loc.locSlug = slug;
      loc.pageUrl = `/${rSlug}/${slug}/`;
    }
  }

  console.log('Computed slugs for all locations');
}

function calculateLocationSeoScore(loc) {
  const desc = isFillerDescription(loc.description) ? '' : (loc.description || '').trim();
  const textSignals = seoTextSignals(loc);
  const facilitiesCount = [loc.coffee, loc.diaper, loc.alcohol].filter(Boolean).length;
  let score = 0;

  if (loc.seo_intro_override) score += 2;
  if (loc.seo_title_override) score += 1;
  if (desc.length >= 180) score += 2;
  else if (desc.length >= 100) score += 1;
  if (loc.toddler_highlight) score += 2;
  if (loc.seo_primary_locality) score += 1;
  if (normalizeExternalUrl(loc.website)) score += 1;
  if (loc.min_age != null && loc.max_age != null) score += 1;
  if (['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`)) score += 1;
  if (facilitiesCount >= 2) score += 1;
  if (daysSince(loc.last_verified_at) <= 540) score += 1;
  if (textSignals.playHint || textSignals.calmHint) score += 1;

  return score;
}

function pickDuplicateWinner(group) {
  return [...group].sort((a, b) => {
    const aManual = normalizeManualSeoTier(a.seo_tier);
    const bManual = normalizeManualSeoTier(b.seo_tier);
    const aPinned = aManual === 'index' ? 1 : 0;
    const bPinned = bManual === 'index' ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    if ((a.seoHasGscSignal ? 1 : 0) !== (b.seoHasGscSignal ? 1 : 0)) return (b.seoHasGscSignal ? 1 : 0) - (a.seoHasGscSignal ? 1 : 0);
    if ((b.seoQualityScore || 0) !== (a.seoQualityScore || 0)) return (b.seoQualityScore || 0) - (a.seoQualityScore || 0);
    if ((normalizeExternalUrl(b.website) ? 1 : 0) !== (normalizeExternalUrl(a.website) ? 1 : 0)) return (normalizeExternalUrl(b.website) ? 1 : 0) - (normalizeExternalUrl(a.website) ? 1 : 0);
    if (daysSince(a.last_verified_at) !== daysSince(b.last_verified_at)) return daysSince(a.last_verified_at) - daysSince(b.last_verified_at);
    return Number(a.id || 0) - Number(b.id || 0);
  })[0];
}

function applySeoPolicy(data) {
  const { locations } = data;
  const gscSignals = loadGscSignals();
  const duplicateGroups = new Map();

  for (const loc of locations) {
    loc.seoPath = cleanPathLike(loc.pageUrl);
    loc.seoHasGscSignal = gscSignals.pathSignals.has(loc.seoPath);
    loc.seoQualityScore = calculateLocationSeoScore(loc) + (loc.seoHasGscSignal ? 2 : 0);
    const groupKey = duplicateGroupKey(loc);
    if (!duplicateGroups.has(groupKey)) duplicateGroups.set(groupKey, []);
    duplicateGroups.get(groupKey).push(loc);
  }

  const duplicateWinners = new Map();
  for (const [groupKey, group] of duplicateGroups.entries()) {
    const winner = pickDuplicateWinner(group);
    duplicateWinners.set(groupKey, winner.id);
    for (const loc of group) {
      loc.seoDuplicateGroupSize = group.length;
      loc.seoDuplicateWinnerId = winner.id;
    }
  }

  const summary = { core: 0, hub: 0, index: 0, support: 0, alias: 0, duplicateGroups: 0 };

  for (const loc of locations) {
    const manualTier = normalizeManualSeoTier(loc.seo_tier);
    const explicitAlias = loc.seo_canonical_target && Number(loc.seo_canonical_target) !== Number(loc.id);
    const duplicateLoser = loc.seoDuplicateGroupSize > 1 && loc.seoDuplicateWinnerId !== loc.id;
    const desc = isFillerDescription(loc.description) ? '' : (loc.description || '').trim();
    const structuredSignals = [
      !!loc.toddler_highlight,
      !!normalizeExternalUrl(loc.website),
      loc.min_age != null && loc.max_age != null,
      [loc.coffee, loc.diaper, loc.alcohol].filter(Boolean).length >= 1,
      ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`),
      daysSince(loc.last_verified_at) <= 540,
    ].filter(Boolean).length;
    const strongContent = !!loc.seo_intro_override || desc.length >= 120;
    let seoTier = 'support';

    if (explicitAlias || manualTier === 'alias') {
      seoTier = 'alias';
    } else if (manualTier === 'index') {
      seoTier = 'index';
    } else if (manualTier === 'support') {
      seoTier = 'support';
    } else if (!loc.seo_exclude_from_sitemap && !duplicateLoser && (loc.seoHasGscSignal || computeLocationSeoTier(loc).tier === 'index' || (strongContent && structuredSignals >= 4 && loc.seoQualityScore >= SEO_INDEX_THRESHOLD))) {
      seoTier = 'index';
    }

    if (duplicateLoser && manualTier === 'auto') seoTier = 'support';

    loc.seoTierResolved = seoTier;
    loc.seoIndexable = seoTier === 'index';
    loc.seoRobots = ['support', 'alias'].includes(seoTier) ? 'noindex,follow' : 'index,follow';
    loc.seoCanonicalUrl = fullSiteUrl(loc.pageUrl);
    summary[seoTier] = (summary[seoTier] || 0) + 1;
  }

  summary.duplicateGroups = [...duplicateGroups.values()].filter((group) => group.length > 1).length;
  data.gscSignals = gscSignals;
  data.seoSummary = summary;
  console.log(`SEO policy applied (${summary.index} index, ${summary.support} support, ${summary.alias} alias, ${summary.duplicateGroups} duplicate groups)`);
}

function sortLocationsForSeo(locs) {
  return [...locs].sort((a, b) => {
    if ((a.seoHasGscSignal ? 1 : 0) !== (b.seoHasGscSignal ? 1 : 0)) return (b.seoHasGscSignal ? 1 : 0) - (a.seoHasGscSignal ? 1 : 0);
    if ((b.seoQualityScore || 0) !== (a.seoQualityScore || 0)) return (b.seoQualityScore || 0) - (a.seoQualityScore || 0);
    if (daysSince(a.last_verified_at) !== daysSince(b.last_verified_at)) return daysSince(a.last_verified_at) - daysSince(b.last_verified_at);
    return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'nl');
  });
}

function matchesClusterPage(cluster, loc) {
  const textSignals = seoTextSignals(loc);
  switch (cluster.slug) {
    case 'regenachtige-dag-met-peuter':
      return ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`) || textSignals.indoorHint;
    case 'binnenlocaties-peuters':
      return ['indoor', 'hybrid', 'both'].includes(`${loc.weather || ''}`) || ['museum', 'swim'].includes(loc.type);
    case 'horeca-met-speelhoek':
      return ['horeca', 'pancake'].includes(loc.type) && textSignals.playHint;
    case 'koffie-en-spelen':
      return !!loc.coffee && (textSignals.playHint || ['play', 'farm', 'nature'].includes(loc.type));
    case 'dreumes-uitjes':
      return (loc.min_age == null || Number(loc.min_age) <= 2)
        && (loc.max_age == null || Number(loc.max_age) <= 5)
        && (loc.diaper || textSignals.calmHint || !!loc.coffee || ['farm', 'museum', 'horeca', 'nature'].includes(loc.type));
    case 'peuteruitjes-2-5-jaar':
      return (loc.min_age == null || Number(loc.min_age) <= 2) && (loc.max_age == null || Number(loc.max_age) >= 4);
    default:
      return false;
  }
}

function getClusterPagesForLocation(loc) {
  return CLUSTER_PAGES.filter((cluster) => matchesClusterPage(cluster, loc)).slice(0, 3);
}

function relatedClustersForLocations(locs, limit = 4) {
  const hits = CLUSTER_PAGES
    .map((cluster) => ({
      cluster,
      count: locs.filter((loc) => matchesClusterPage(cluster, loc)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return hits.map((entry) => entry.cluster);
}

// Helper: detect filler descriptions
function isFillerDescription(desc) {
  if (!desc || !desc.trim()) return true;
  if (/^Geverifieerde vestiging van .+\. Altijd een veilige keuze voor peuters\.?$/.test(desc.trim())) return true;
  return false;
}

// SEO graduation: clear, explicit criteria for index eligibility
function computeLocationSeoTier(loc) {
  const desc = isFillerDescription(loc.description) ? '' : (loc.description || '').trim();
  const hasDescription = desc.length >= 90;
  const hasHighlight = !!loc.toddler_highlight;
  const hasWeather = !!loc.weather;
  const hasCoords = loc.lat != null && loc.lng != null;
  const hasAgeRange = loc.min_age != null && loc.max_age != null;
  const hasFacility = !!(loc.coffee || loc.diaper || loc.alcohol);
  const noSlop = !AI_SLOP_PATTERNS.some(p => p.test(loc.description || ''));
  const noGeneric = !GENERIC_DESCRIPTION_PATTERNS.some(p => p.test(loc.description || ''));

  const criteria = { hasDescription, hasHighlight, hasWeather, hasCoords, hasAgeRange, hasFacility, noSlop, noGeneric };
  const passed = Object.values(criteria).filter(Boolean).length;
  const total = Object.keys(criteria).length;
  // Coords and non-filler/non-slop description are ALWAYS required (non-negotiable)
  const mandatory = hasCoords && hasDescription && noSlop && noGeneric;
  // At least 2 of 4 optional criteria must pass
  const optionalPassed = [hasHighlight, hasWeather, hasAgeRange, hasFacility].filter(Boolean).length;
  const eligible = mandatory && optionalPassed >= 2;

  return { tier: eligible ? 'index' : 'support', criteria, passed, total };
}

// Bonus priority for sitemap (additive on base 0.64)
function computeLocationBonusPriority(loc) {
  let bonus = 0;
  if (normalizeExternalUrl(loc.website)) bonus += 0.05;
  if (loc.place_id) bonus += 0.05;
  if (Number(loc.verification_confidence) >= 0.7) bonus += 0.05;
  if (Number(loc.approved_observation_count) >= 1) bonus += 0.05;
  return Math.min(bonus, 0.2); // cap at +0.2
}

// Summarize graduation metrics across all locations
function computeGraduationMetrics(locations) {
  const total = locations.length;
  let indexed = 0;
  const missingCriteria = {
    hasDescription: 0,
    hasHighlight: 0,
    hasWeather: 0,
    hasCoords: 0,
    hasAgeRange: 0,
    hasFacility: 0,
    noSlop: 0,
    noGeneric: 0,
  };
  const nearPromotion = [];

  for (const loc of locations) {
    const result = computeLocationSeoTier(loc);
    if (result.tier === 'index') {
      indexed++;
    } else {
      for (const [key, passed] of Object.entries(result.criteria)) {
        if (!passed) missingCriteria[key]++;
      }
      if (result.passed >= result.total - 1) {
        const missing = Object.entries(result.criteria)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        nearPromotion.push({
          id: loc.id,
          name: loc.name,
          region: loc.region || loc.regionSlug,
          missing,
        });
      }
    }
  }

  nearPromotion.sort((a, b) => a.missing.length - b.missing.length || `${a.name}`.localeCompare(`${b.name}`, 'nl'));

  return {
    total,
    indexed,
    support: total - indexed,
    indexRate: total > 0 ? Math.round((indexed / total) * 1000) / 10 : 0,
    missingCriteria,
    nearPromotion: nearPromotion.slice(0, 25),
  };
}

module.exports = {
  applyRepoSeoOverrides,
  normalizeManualSeoTier,
  seoTextSignals,
  locationGeoFingerprint,
  duplicateGroupKey,
  selectHubLocations,
  computeSlugs,
  calculateLocationSeoScore,
  pickDuplicateWinner,
  applySeoPolicy,
  sortLocationsForSeo,
  matchesClusterPage,
  getClusterPagesForLocation,
  relatedClustersForLocations,
  isFillerDescription,
  computeLocationSeoTier,
  computeLocationBonusPriority,
  computeGraduationMetrics,
};
