const {
  KID_KEYWORDS,
  hasHardRejectSignal,
  jitterSleep,
  mapLimit,
} = require('./config');

function normalizeText(html) {
  return (html || '')
    .replace(/\u0000/g, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sanitizeString(value) {
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
}

function sanitizeJson(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = sanitizeJson(inner);
    }
    return out;
  }
  return value;
}

function boolFromTag(value) {
  const text = String(value || '').toLowerCase().trim();
  if (!text) return null;
  if (['yes', 'true', '1', 'designated', 'permissive'].includes(text)) return true;
  if (['no', 'false', '0'].includes(text)) return false;
  return null;
}

function extractOsmSignals(candidate) {
  const tags = candidate?.raw_payload?.raw_tags || {};
  const blob = [
    candidate?.name || '',
    candidate?.cuisine || '',
    tags.description || '',
    tags.note || '',
    tags['name:en'] || '',
    tags['name:nl'] || '',
    tags['name:suffix'] || '',
    tags.alt_name || '',
  ].join(' ').toLowerCase();
  const found = KID_KEYWORDS.filter((kw) => blob.includes(kw));

  const hasPlayAreaFromTags = [
    tags.kids_area,
    tags['kids_area:indoor'],
    tags['kids_area:outdoor'],
    tags.playground,
  ].map(boolFromTag).find((v) => v !== null);

  const hasDiaperFromTags = [
    tags.changing_table,
    tags['changing_table:adult'],
  ].map(boolFromTag).find((v) => v !== null);

  const hasHighChairFromTags = [
    tags.highchair,
    tags['baby:highchair'],
  ].map(boolFromTag).find((v) => v !== null);

  const familyTag = boolFromTag(tags.family_friendly);
  const kidsMenuTag = boolFromTag(tags['menu:children']) ?? boolFromTag(tags.kids_menu);

  return {
    keyword_count: found.length,
    keywords: found,
    has_play_area: hasPlayAreaFromTags,
    has_diaper_changing: hasDiaperFromTags,
    has_high_chairs: hasHighChairFromTags,
    has_kids_menu: kidsMenuTag,
    mentions_family: familyTag === true || /family|kids|kind|gezin/.test(blob),
    hard_reject: hasHardRejectSignal(`${candidate?.name || ''} ${tags.description || ''}`),
  };
}

function extractKidSignals(text) {
  const found = KID_KEYWORDS.filter((kw) => text.includes(kw));
  return {
    keyword_count: found.length,
    keywords: found,
    has_play_area: found.some((k) => ['speelhoek', 'speelruimte', 'speeltuin', 'speelparadijs', 'ballenbak'].includes(k)) || null,
    has_high_chairs: found.some((k) => ['kinderstoel', 'kinderstoelen', 'high chair', 'highchair'].includes(k)) || null,
    has_kids_menu: found.some((k) => ['kindermenu', 'kinderkaart', 'kinderportie', 'kindermaaltijd'].includes(k)) || null,
    has_diaper_changing: found.some((k) => ['luiertafel', 'verschoonplek', 'verschoontafel', 'verschoonruimte', 'commode'].includes(k)) || null,
    mentions_family: found.some((k) => ['kinderen', 'kindvriendelijk', 'kids', 'gezin', 'families', 'gezinnen', 'kid-friendly'].includes(k)) || null,
  };
}

function mergeSignals(base, update) {
  const merged = { ...(base || {}) };

  const booleanKeys = new Set([
    'has_play_area',
    'has_high_chairs',
    'has_kids_menu',
    'has_diaper_changing',
    'mentions_family',
    'tripadvisor_mentions_family',
    'google_mentions_family',
    'hard_reject',
  ]);

  for (const [key, value] of Object.entries(update || {})) {
    if (value === null || value === undefined) continue;
    if (key === 'keyword_count') {
      const prev = Number(merged[key] || 0);
      const next = Number(value || 0);
      merged[key] = Math.max(prev, next);
      continue;
    }
    if (Array.isArray(value)) {
      const prev = Array.isArray(merged[key]) ? merged[key] : [];
      merged[key] = [...new Set([...prev, ...value])];
      continue;
    }
    if (booleanKeys.has(key) && typeof value === 'boolean') {
      const prev = merged[key];
      if (prev === true || value === true) merged[key] = true;
      else if (prev === false || value === false) merged[key] = false;
      else merged[key] = value;
      continue;
    }
    merged[key] = value;
  }
  if (Array.isArray(merged.keywords)) {
    merged.keyword_count = Math.max(Number(merged.keyword_count || 0), merged.keywords.length);
  }
  return merged;
}

async function fetchWithRetries(url, options, retries = 3, timeoutMs = Number(process.env.PIPELINE_FETCH_TIMEOUT_MS || '12000')) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...(options || {}), signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        const body = await response.text();
        if (attempt < retries && (response.status === 429 || response.status >= 500)) {
          attempt += 1;
          continue;
        }
        return { ok: false, status: response.status, body };
      }
      return { ok: true, response };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt >= retries) break;
    }
    attempt += 1;
  }
  return { ok: false, status: 0, body: String(lastError?.message || 'network_error') };
}

async function scrapeWebsite(candidate) {
  if (!candidate.website) {
    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'website',
        payload_json: {},
        signals_json: {},
        ok: false,
        error: 'no_website',
      },
      signals: {},
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const result = await fetchWithRetries(candidate.website, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0; +https://peuterplannen.nl)',
      Accept: 'text/html',
    },
  }, 3);
  clearTimeout(timeout);

  if (!result.ok) {
    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'website',
        payload_json: { website: candidate.website, status: result.status },
        signals_json: {},
        ok: false,
        error: `website_fetch_failed:${result.status}`,
      },
      signals: {},
    };
  }

  const html = await result.response.text();
  const text = normalizeText(html).slice(0, 100000);
  const keywordSignals = extractKidSignals(text);
  const hardReject = hasHardRejectSignal(`${candidate.name || ''} ${text.slice(0, 6000)}`);

  const signals = {
    ...keywordSignals,
    hard_reject: hardReject,
    website_excerpt: text.slice(0, 1200),
  };

  return {
    evidence: {
      candidate_id: candidate.id,
      source: 'website',
      payload_json: { website: candidate.website, text_length: text.length },
      signals_json: signals,
      ok: true,
      error: null,
    },
    signals,
  };
}

async function fetchGoogleEvidence(candidate, googleKey) {
  const jitterMin = Number(process.env.PIPELINE_SOURCE_JITTER_MIN_MS || '300');
  const jitterMax = Number(process.env.PIPELINE_SOURCE_JITTER_MAX_MS || '700');
  await jitterSleep(jitterMin, jitterMax);

  const searchText = [candidate.name, candidate.address, candidate.city, candidate.region_root, 'Nederland']
    .filter(Boolean)
    .join(' ');

  if (googleKey) {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchText)}&inputtype=textquery&fields=place_id,name,formatted_address,business_status&key=${googleKey}`;
    const findRes = await fetchWithRetries(findUrl, { headers: { Accept: 'application/json' } }, 3);

    if (!findRes.ok) {
      return {
        evidence: {
          candidate_id: candidate.id,
          source: 'google',
          payload_json: { mode: 'places_api', status: findRes.status },
          signals_json: {},
          ok: false,
          error: `google_find_failed:${findRes.status}`,
        },
        signals: {},
      };
    }

    const findData = await findRes.response.json();
    const place = findData?.candidates?.[0];
    if (!place?.place_id) {
      return {
        evidence: {
          candidate_id: candidate.id,
          source: 'google',
          payload_json: { mode: 'places_api', candidates: 0 },
          signals_json: {},
          ok: false,
          error: 'google_no_candidate',
        },
        signals: {},
      };
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place.place_id)}&fields=place_id,name,rating,user_ratings_total,business_status,types,editorial_summary,reviews&key=${googleKey}`;
    const detailsRes = await fetchWithRetries(detailsUrl, { headers: { Accept: 'application/json' } }, 3);
    if (!detailsRes.ok) {
      return {
        evidence: {
          candidate_id: candidate.id,
          source: 'google',
          payload_json: { mode: 'places_api', place_id: place.place_id, status: detailsRes.status },
          signals_json: { google_place_id: place.place_id },
          ok: false,
          error: `google_details_failed:${detailsRes.status}`,
        },
        signals: { google_place_id: place.place_id },
      };
    }

    const detailsData = await detailsRes.response.json();
    const result = detailsData?.result || {};
    const summary = `${result?.name || ''} ${(result?.editorial_summary?.overview || '')}`;
    const reviewBlob = Array.isArray(result?.reviews)
      ? result.reviews.map((r) => String(r?.text || '')).join(' ').toLowerCase()
      : '';
    const reviewKeywordHits = KID_KEYWORDS.filter((kw) => reviewBlob.includes(kw));
    const signals = {
      google_place_id: result.place_id || place.place_id,
      google_rating: typeof result.rating === 'number' ? result.rating : null,
      google_review_count: Number.isFinite(result.user_ratings_total) ? result.user_ratings_total : null,
      google_business_status: result.business_status || null,
      google_types: Array.isArray(result.types) ? result.types : [],
      google_mentions_family: /family|kids|children|kind|gezin|peuter|kleuter|speelhoek|kinderstoel|high chair|verschoon/.test(reviewBlob),
      keyword_count: reviewKeywordHits.length,
      keywords: reviewKeywordHits,
      hard_reject: hasHardRejectSignal(summary),
    };

    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'google',
        payload_json: {
          mode: 'places_api',
          place_id: signals.google_place_id,
          raw: result,
        },
        signals_json: signals,
        ok: true,
        error: null,
      },
      signals,
    };
  }

  const scrapeUrl = `https://www.google.com/search?q=${encodeURIComponent(`${searchText} reviews`)}`;
  const scrapeRes = await fetchWithRetries(scrapeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0)',
      Accept: 'text/html',
    },
  }, 3);

  if (!scrapeRes.ok) {
    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'google',
        payload_json: { mode: 'scrape', status: scrapeRes.status },
        signals_json: {},
        ok: false,
        error: `google_scrape_failed:${scrapeRes.status}`,
      },
      signals: {},
    };
  }

  const html = await scrapeRes.response.text();
  const text = normalizeText(html);
  const ratingMatch = text.match(/([0-5][\.,][0-9])\s*\(/);
  const reviewCountMatch = text.match(/\((\d[\d\.,\s]*)\)/);

  const signals = {
    google_rating: ratingMatch ? Number(ratingMatch[1].replace(',', '.')) : null,
    google_review_count: reviewCountMatch ? Number(reviewCountMatch[1].replace(/[^\d]/g, '')) : null,
    hard_reject: hasHardRejectSignal(text.slice(0, 5000)),
  };

  return {
    evidence: {
      candidate_id: candidate.id,
      source: 'google',
      payload_json: { mode: 'scrape' },
      signals_json: signals,
      ok: true,
      error: null,
    },
    signals,
  };
}

async function fetchTripadvisorEvidence(candidate) {
  const jitterMin = Number(process.env.PIPELINE_SOURCE_JITTER_MIN_MS || '300');
  const jitterMax = Number(process.env.PIPELINE_SOURCE_JITTER_MAX_MS || '700');
  await jitterSleep(jitterMin, jitterMax);

  const query = `${candidate.name || ''} ${candidate.city || ''} ${candidate.region_root || ''}`.trim();
  const url = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(query)}`;

  const res = await fetchWithRetries(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0)',
      Accept: 'text/html',
    },
  }, 3);

  if (!res.ok) {
    return {
      evidence: {
        candidate_id: candidate.id,
        source: 'tripadvisor',
        payload_json: { status: res.status },
        signals_json: {},
        ok: false,
        error: `tripadvisor_fetch_failed:${res.status}`,
      },
      signals: {},
    };
  }

  const html = await res.response.text();
  const text = normalizeText(html);

  const ratingMatch = text.match(/([0-5](?:[\.,][0-9])?)\s*(?:of\s*5\s*bubbles|\/5)/i);
  const reviewsMatch = text.match(/([\d\.,]+)\s+reviews/i);

  const signals = {
    tripadvisor_rating: ratingMatch ? Number(ratingMatch[1].replace(',', '.')) : null,
    tripadvisor_review_count: reviewsMatch ? Number(reviewsMatch[1].replace(/[^\d]/g, '')) : null,
    tripadvisor_mentions_family: /family|kids|children|kind|gezin/.test(text),
    hard_reject: hasHardRejectSignal(text.slice(0, 4000)),
  };

  return {
    evidence: {
      candidate_id: candidate.id,
      source: 'tripadvisor',
      payload_json: { query },
      signals_json: signals,
      ok: true,
      error: null,
    },
    signals,
  };
}

async function enrichCandidates({ db, candidates, googleKey }) {
  const websiteConcurrency = Number(process.env.PIPELINE_WEBSITE_CONCURRENCY || '12');
  const googleConcurrency = Number(process.env.PIPELINE_GOOGLE_CONCURRENCY || '6');
  const tripadvisorConcurrency = Number(process.env.PIPELINE_TRIPADVISOR_CONCURRENCY || '6');
  const enableWebsite = process.env.PIPELINE_ENABLE_WEBSITE !== 'false';
  const enableGoogle = process.env.PIPELINE_ENABLE_GOOGLE !== 'false';
  const enableTripadvisor = process.env.PIPELINE_ENABLE_TRIPADVISOR !== 'false';
  const evidenceRows = [];
  const signalsByCandidate = new Map();

  for (const c of candidates) {
    const base = mergeSignals(c.enriched_signals, extractOsmSignals(c));
    signalsByCandidate.set(c.id, base);
  }

  if (enableWebsite) {
    const websiteResults = await mapLimit(candidates, websiteConcurrency, async (candidate) => scrapeWebsite(candidate));
    for (const row of websiteResults) {
      evidenceRows.push(sanitizeJson(row.evidence));
      const merged = mergeSignals(signalsByCandidate.get(row.evidence.candidate_id), row.signals);
      signalsByCandidate.set(row.evidence.candidate_id, merged);
    }
  }

  if (enableGoogle) {
    const googleResults = await mapLimit(candidates, googleConcurrency, async (candidate) => fetchGoogleEvidence(candidate, googleKey));
    for (const row of googleResults) {
      evidenceRows.push(sanitizeJson(row.evidence));
      const merged = mergeSignals(signalsByCandidate.get(row.evidence.candidate_id), row.signals);
      signalsByCandidate.set(row.evidence.candidate_id, merged);
    }
  }

  if (enableTripadvisor) {
    const tripadvisorResults = await mapLimit(candidates, tripadvisorConcurrency, async (candidate) => fetchTripadvisorEvidence(candidate));
    for (const row of tripadvisorResults) {
      evidenceRows.push(sanitizeJson(row.evidence));
      const merged = mergeSignals(signalsByCandidate.get(row.evidence.candidate_id), row.signals);
      signalsByCandidate.set(row.evidence.candidate_id, merged);
    }
  }

  if (evidenceRows.length) {
    await db.insertEvidence(evidenceRows);
  }

  await mapLimit(candidates, 12, async (candidate) => {
    const signals = sanitizeJson(signalsByCandidate.get(candidate.id) || {});
    await db.patchCandidate(candidate.id, {
      status: 'enriched',
      enriched_signals: signals,
      last_error: null,
    });
  });

  return {
    evidenceRows,
    signalsByCandidate,
  };
}

module.exports = {
  enrichCandidates,
};
