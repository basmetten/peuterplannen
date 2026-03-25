#!/usr/bin/env node

/**
 * truth-upgrade.js — Location Truth Upgrade Pipeline
 *
 * Systematisch verbeteren van de waarheid en volledigheid van alle locaties.
 * Resumable, idempotent, met provenance logging.
 *
 * Usage:
 *   node .scripts/pipeline/truth-upgrade.js                    # Full run
 *   node .scripts/pipeline/truth-upgrade.js --dry-run          # Don't write to DB
 *   node .scripts/pipeline/truth-upgrade.js --limit=10         # Process only 10
 *   node .scripts/pipeline/truth-upgrade.js --offset=500       # Start from offset
 *   node .scripts/pipeline/truth-upgrade.js --skip-google      # Skip Google API calls
 *   node .scripts/pipeline/truth-upgrade.js --only-deterministic  # Only computed fields
 *   node .scripts/pipeline/truth-upgrade.js --rollback         # Rollback all changes
 *   node .scripts/pipeline/truth-upgrade.js --report           # Generate report only
 */

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const {
  KID_KEYWORDS,
  hasHardRejectSignal,
  haversineMeters,
  normalizeName,
  jitterSleep,
  mapLimit,
  wait,
} = require('./config');

// ─── Constants ──────────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(__dirname, 'output');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'truth-upgrade-progress.json');
const LOG_FILE = path.join(OUTPUT_DIR, 'truth-upgrade-log.jsonl');
const REPORT_FILE = path.join(OUTPUT_DIR, 'truth-upgrade-report.md');

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const LIMIT = Number(process.env.LIMIT || 0) || (process.argv.find(a => a.startsWith('--limit='))?.split('=')[1]) || 0;
const OFFSET = Number(process.env.OFFSET || 0) || (process.argv.find(a => a.startsWith('--offset='))?.split('=')[1]) || 0;
const SKIP_GOOGLE = process.env.SKIP_GOOGLE === '1' || process.argv.includes('--skip-google');
const ONLY_DETERMINISTIC = process.argv.includes('--only-deterministic');
const DO_ROLLBACK = process.argv.includes('--rollback');
const REPORT_ONLY = process.argv.includes('--report');

const GOOGLE_CONCURRENCY = 2;
const SCRAPE_CONCURRENCY = 2;
const HAIKU_CONCURRENCY = 5;
const GOOGLE_DELAY_MS = 500;
const SCRAPE_DELAY_MS = 1500;

const CITY_CENTERS = {
  'Amsterdam':           { lat: 52.3676, lng: 4.9041 },
  'Rotterdam':           { lat: 51.9225, lng: 4.4792 },
  'Den Haag':            { lat: 52.0705, lng: 4.3007 },
  'Utrecht':             { lat: 52.0907, lng: 5.1214 },
  'Haarlem':             { lat: 52.3874, lng: 4.6462 },
  'Amersfoort':          { lat: 52.1561, lng: 5.3878 },
  'Leiden':              { lat: 52.1601, lng: 4.4970 },
  'Utrechtse Heuvelrug': { lat: 52.0394, lng: 5.3875 },
  'Gooi en Vechtstreek': { lat: 52.2292, lng: 5.1750 },
  'Almere':              { lat: 52.3508, lng: 5.2647 },
  'Eindhoven':           { lat: 51.4416, lng: 5.4697 },
  'Groningen':           { lat: 53.2194, lng: 6.5665 },
  'Tilburg':             { lat: 51.5555, lng: 5.0913 },
  'Breda':               { lat: 51.5719, lng: 4.7683 },
  "'s-Hertogenbosch":    { lat: 51.6978, lng: 5.3037 },
  'Arnhem':              { lat: 51.9851, lng: 5.8987 },
  'Nijmegen':            { lat: 51.8426, lng: 5.8527 },
  'Apeldoorn':           { lat: 52.2112, lng: 5.9699 },
  'Enschede':            { lat: 52.2215, lng: 6.8937 },
  'Zwolle':              { lat: 52.5168, lng: 6.0830 },
  'Dordrecht':           { lat: 51.8133, lng: 4.6901 },
  'Maastricht':          { lat: 50.8514, lng: 5.6910 },
};

// Known audit fixes from dataset-audit-report.md
const AUDIT_FIXES = {
  permanently_closed: [342, 366, 906, 2360, 2361, 2510, 2635, 2808],
  dead_websites: [342, 906, 2360, 2361, 2510, 2635],
};

// ─── Helpers ────────────────────────────────────────────────────────

function log(level, msg, data) {
  const ts = new Date().toISOString();
  const prefix = { info: 'ℹ', warn: '⚠', error: '✗', ok: '✓' }[level] || '·';
  console.log(`${ts} ${prefix} ${msg}`, data ? JSON.stringify(data).slice(0, 200) : '');
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { processed: {}, total: 0, started_at: new Date().toISOString(), stats: {} };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function appendLog(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

function sanitizeString(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim();
}

function normalizeText(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Deterministic enrichment ───────────────────────────────────────

function computeDistanceFromCityCenter(loc) {
  const center = CITY_CENTERS[loc.region];
  if (!center || !loc.lat || !loc.lng) return null;
  const meters = haversineMeters(loc.lat, loc.lng, center.lat, center.lng);
  return Math.round(meters / 100) / 10; // round to 0.1 km
}

function deriveTimeOfDayFit(openingHours) {
  if (!openingHours) return null;
  const h = openingHours.toLowerCase();
  const hasOchtend = /0[7-9]:|10:|11:/.test(h);
  const hasMiddag = /1[2-7]:/.test(h);
  const hasAvond = /1[8-9]:|2[0-3]:/.test(h);
  if (hasOchtend && hasMiddag && hasAvond) return 'hele dag';
  if (hasOchtend && hasMiddag) return 'flexibel';
  if (hasOchtend) return 'ochtend';
  if (hasMiddag) return 'middag';
  return 'flexibel';
}

function deriveRainBackupFromWeather(weather) {
  if (!weather) return null;
  if (weather === 'indoor') return 'excellent';
  if (weather === 'both' || weather === 'hybrid') return 'excellent';
  if (weather === 'outdoor') return 'none';
  return null;
}

function derivePriceBandFromType(type, googlePriceLevel) {
  if (googlePriceLevel !== undefined && googlePriceLevel !== null) {
    if (googlePriceLevel === 0) return 'free';
    if (googlePriceLevel === 1) return 'low';
    if (googlePriceLevel === 2) return 'mid';
    return 'high';
  }
  // Type-based defaults
  if (type === 'play') return 'free'; // most playgrounds are free
  if (type === 'farm') return 'free'; // most petting farms are free
  if (type === 'nature') return 'free';
  return null; // can't determine
}

function deriveNoiseLevel(type) {
  const map = {
    play: 'high', farm: 'medium', nature: 'low', museum: 'low',
    swim: 'high', pancake: 'medium', horeca: 'medium', culture: 'low',
  };
  return map[type] || null;
}

function deriveFoodFit(type, coffee) {
  if (type === 'horeca' || type === 'pancake') return 'full';
  if (coffee) return 'basic';
  return 'none';
}

function deriveBuggyFriendliness(type, weather) {
  if (weather === 'indoor') return 'high';
  if (type === 'nature') return 'low';
  if (type === 'museum') return 'high';
  return 'medium';
}

function deriveParkingEase(type) {
  // Conservative defaults
  if (type === 'nature') return 'easy';
  return null; // can't reliably determine
}

function deriveToiletConfidence(type) {
  if (['museum', 'swim', 'horeca', 'pancake'].includes(type)) return 'high';
  if (type === 'farm') return 'medium';
  return null;
}

function deriveCrowdPattern(type) {
  const map = {
    play: 'weekend en na school drukker',
    farm: 'weekend drukker, ochtend rustiger',
    nature: 'weekend drukker',
    museum: 'regenachtige dagen en vakanties drukker',
    swim: 'weekend en woensdag drukker',
    pancake: 'lunch en weekend drukker',
    horeca: 'lunch en weekend drukker',
    culture: 'weekend drukker',
  };
  return map[type] || null;
}

// ─── Google Places API ──────────────────────────────────────────────

async function resolveGooglePlaceId(loc, googleKey) {
  const searchText = [loc.name, loc.region, 'Nederland'].filter(Boolean).join(' ');
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchText)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,business_status&locationbias=circle:5000@${loc.lat},${loc.lng}&key=${googleKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `http_${res.status}` };
    const data = await res.json();
    if (data.status !== 'OK' || !data.candidates?.length) return { error: data.status || 'no_candidates' };

    // Pick closest candidate
    let best = data.candidates[0];
    let bestDist = Infinity;
    for (const c of data.candidates) {
      const g = c.geometry?.location;
      if (!g) continue;
      const d = haversineMeters(loc.lat, loc.lng, g.lat, g.lng);
      if (d < bestDist) { bestDist = d; best = c; }
    }

    // Reject if too far (>2km)
    if (bestDist > 2000) return { error: 'too_far', distance: bestDist };

    return {
      place_id: best.place_id,
      business_status: best.business_status,
      google_name: best.name,
      google_address: best.formatted_address,
      distance_m: Math.round(bestDist),
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchGooglePlaceDetails(placeId, googleKey) {
  const fields = 'opening_hours,price_level,business_status,website,formatted_phone_number,types,rating,user_ratings_total';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&language=nl&key=${googleKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `http_${res.status}` };
    const data = await res.json();
    if (data.status !== 'OK') return { error: data.status };

    const r = data.result || {};
    return {
      opening_hours: r.opening_hours?.weekday_text?.join('; ') || null,
      price_level: r.price_level ?? null,
      business_status: r.business_status || null,
      website: r.website || null,
      phone: r.formatted_phone_number || null,
      types: r.types || [],
      rating: r.rating || null,
      user_ratings_total: r.user_ratings_total || null,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── Website scraping ───────────────────────────────────────────────

async function scrapeWebsiteForSignals(website) {
  if (!website) return { error: 'no_website' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(website, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannenBot/1.0; +https://peuterplannen.nl)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return { error: `http_${res.status}` };

    // Check for major redirects (different domain)
    const finalUrl = res.url;
    const origHost = new URL(website).hostname.replace(/^www\./, '');
    const finalHost = new URL(finalUrl).hostname.replace(/^www\./, '');
    if (origHost !== finalHost) {
      return { error: 'redirect_different_domain', from: origHost, to: finalHost };
    }

    const html = await res.text();
    const text = normalizeText(html).toLowerCase().slice(0, 100000);

    // Extract signals
    const kidKeywords = KID_KEYWORDS.filter(kw => text.includes(kw));

    // Opening hours patterns — run on CLEANED text to avoid HTML fragments
    const cleanedText = normalizeText(html).slice(0, 100000);
    const openingHoursPatterns = [
      /openingstijden[:\s]*([^\n.]{10,120})/i,
      /geopend[:\s]*([^\n.]{10,80})/i,
      /open[:\s]*(ma|di|wo|do|vr|za|zo|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)[^\n]{5,100}/i,
    ];
    let extractedHours = null;
    for (const pat of openingHoursPatterns) {
      const m = cleanedText.match(pat);
      if (m) {
        const candidate = sanitizeString(m[0].slice(0, 200));
        // Validate: must contain actual time patterns (HH:MM or day names + times)
        const hasTimePattern = /\d{1,2}[:.]\d{2}/.test(candidate);
        const hasDayTime = /(ma|di|wo|do|vr|za|zo|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag).*\d/.test(candidate);
        const noHtmlGarbage = !/<|class=|menu-item|href|toggle|navigation|zoeken|steun|contact/i.test(candidate);
        if (candidate.length > 15 && noHtmlGarbage && (hasTimePattern || hasDayTime)) {
          extractedHours = candidate;
        }
        break;
      }
    }

    // Facility signals
    const hasCoffee = /koffie|coffee|cappuccino|espresso|latte|barista/i.test(text);
    const hasDiaper = /verschoon|luiertafel|changing|verschoontafel|baby\s*verzorging/i.test(text);
    const hasAlcohol = /bier|wijn|wine|beer|cocktail|prosecco|aperitief|borrel|alcohol|terras.*drankjes/i.test(text);
    const hasPlayCorner = /speelhoek|speelruimte|speeltuin|speelplek|ballenbak|speelkamer|play\s*area|play\s*corner|kinderhoek/i.test(text);
    const hasFreeEntry = /gratis\s*(?:toegang|entree|ingang)|free\s*entry|free\s*admission/i.test(text);
    const hasPaidEntry = /entree|toegang.*€|€.*toegang|kaartjes|tickets.*kopen|admission/i.test(text);

    return {
      kid_keywords: kidKeywords,
      kid_keyword_count: kidKeywords.length,
      has_coffee: hasCoffee,     // boolean, not null-coalesced
      has_diaper: hasDiaper,
      has_alcohol: hasAlcohol,
      has_play_corner: hasPlayCorner,
      has_free_entry: hasFreeEntry,
      has_paid_entry: hasPaidEntry,
      extracted_hours: extractedHours,
      text_excerpt: text.slice(0, 500),
      scraped: true,  // flag that we successfully scraped
    };
  } catch (err) {
    return { error: err.message?.slice(0, 100) || 'fetch_failed' };
  }
}

// ─── Gemini Flash normalization ─────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let _geminiFailCount = 0;

async function normalizeWithGemini(loc, webSignals, googleDetails) {
  if (!GEMINI_API_KEY) return { error: 'no_gemini_key' };
  if (_geminiFailCount > 10) return { error: 'gemini_disabled_after_failures' };

  const needsDescription = !loc.description || loc.description.length < 80;
  const needsHighlight = !loc.toddler_highlight;
  if (!needsDescription && !needsHighlight) return null;

  const context = [
    `Naam: ${loc.name}`,
    `Type: ${loc.type}`,
    `Regio: ${loc.region}`,
    `Website: ${loc.website || '(geen)'}`,
    loc.description ? `Huidige beschrijving: ${loc.description}` : '',
    loc.toddler_highlight ? `Huidige peutertip: ${loc.toddler_highlight}` : '',
    webSignals?.text_excerpt ? `Website tekst (fragment): ${webSignals.text_excerpt}` : '',
    googleDetails?.rating ? `Google rating: ${googleDetails.rating} (${googleDetails.user_ratings_total} reviews)` : '',
    googleDetails?.opening_hours ? `Openingstijden: ${googleDetails.opening_hours}` : '',
  ].filter(Boolean).join('\n');

  const tasks = [];
  if (needsDescription) tasks.push('description: schrijf een beschrijving van 2-3 zinnen gericht op ouders met peuters/kleuters. Feitelijk, geen marketing-taal. Minimaal 80 tekens.');
  if (needsHighlight) tasks.push('toddler_highlight: schrijf 1 zin over wat deze locatie leuk maakt voor peuters.');

  const prompt = `Je krijgt info over een locatie voor ouders met peuters. Schrijf ALLEEN de gevraagde velden op basis van de gegeven feiten. Niet verzinnen, niet overdrijven. Als je onvoldoende info hebt, antwoord met {"skip": true}.

${context}

Gevraagd:
${tasks.join('\n')}

Antwoord ALLEEN in JSON formaat: {"description": "...", "toddler_highlight": "..."}
Velden die je niet hoeft te schrijven: laat weg uit de JSON.`;

  try {
    await wait(1500); // Rate limit: ~40 RPM for free tier

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.3 },
        }),
      }
    );

    if (!res.ok) {
      _geminiFailCount++;
      const text = await res.text();
      return { error: `gemini_${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code block wrappers (```json ... ```)
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'no_json_in_response', raw: rawText.slice(0, 100) };

    let result;
    try { result = JSON.parse(jsonMatch[0]); } catch { return { error: 'json_parse_failed', raw: jsonMatch[0].slice(0, 100) }; }
    if (result.skip) return null;

    _geminiFailCount = 0; // reset on success
    return {
      description: result.description ? sanitizeString(result.description) : undefined,
      toddler_highlight: result.toddler_highlight ? sanitizeString(result.toddler_highlight) : undefined,
    };
  } catch (err) {
    _geminiFailCount++;
    return { error: err.message?.slice(0, 100) || 'gemini_failed' };
  }
}

// ─── Core enrichment logic ──────────────────────────────────────────

function buildPatch(loc, googleResult, googleDetails, webSignals, haikuResult) {
  const patch = {};
  const reasons = {};

  // 1. Distance from city center (always compute)
  if (!loc.distance_from_city_center_km) {
    const dist = computeDistanceFromCityCenter(loc);
    if (dist !== null) {
      patch.distance_from_city_center_km = dist;
      reasons.distance_from_city_center_km = 'computed_haversine';
    }
  }

  // 2. Place ID
  if (!loc.place_id && googleResult?.place_id) {
    patch.place_id = googleResult.place_id;
    reasons.place_id = `google_findplace_${googleResult.distance_m}m`;
  }

  // 3. Business status check
  const businessStatus = googleDetails?.business_status || googleResult?.business_status;
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    patch.seo_tier = 'support';
    reasons.seo_tier = 'google_closed_permanently';
    // Don't fill other fields for closed locations
    return { patch, reasons, closed: true };
  }

  // 4. Opening hours
  if (!loc.opening_hours && googleDetails?.opening_hours) {
    patch.opening_hours = sanitizeString(googleDetails.opening_hours);
    reasons.opening_hours = 'google_places_details';
  } else if (!loc.opening_hours && webSignals?.extracted_hours) {
    patch.opening_hours = sanitizeString(webSignals.extracted_hours);
    reasons.opening_hours = 'website_scrape';
  }

  // 5. Website (fill if missing, validate if present)
  if (!loc.website && googleDetails?.website) {
    patch.website = googleDetails.website;
    reasons.website = 'google_places_details';
  }

  // 6. Context fields (only fill NULLs — never overwrite)
  if (loc.coffee === null) {
    if (webSignals?.scraped) {
      patch.coffee = webSignals.has_coffee;
      reasons.coffee = webSignals.has_coffee ? 'website_keyword_positive' : 'website_keyword_absent';
    } else {
      // Type-based default: nature/play areas typically don't have coffee
      const defaultCoffee = { nature: false, play: false, farm: false, swim: false }[loc.type];
      if (defaultCoffee !== undefined) {
        patch.coffee = defaultCoffee;
        reasons.coffee = 'type_default';
      }
    }
  }
  if (loc.diaper === null) {
    if (webSignals?.scraped) {
      patch.diaper = webSignals.has_diaper;
      reasons.diaper = webSignals.has_diaper ? 'website_keyword_positive' : 'website_keyword_absent';
    } else {
      const defaultDiaper = { nature: false, play: false }[loc.type];
      if (defaultDiaper !== undefined) {
        patch.diaper = defaultDiaper;
        reasons.diaper = 'type_default';
      }
    }
  }
  if (loc.alcohol === null) {
    if (webSignals?.scraped) {
      patch.alcohol = webSignals.has_alcohol;
      reasons.alcohol = webSignals.has_alcohol ? 'website_keyword_positive' : 'website_keyword_absent';
    } else {
      // Nature/play/farm/swim/museum/culture → no alcohol by default
      const noAlcoholTypes = ['nature', 'play', 'farm', 'swim', 'museum', 'culture'];
      if (noAlcoholTypes.includes(loc.type)) {
        patch.alcohol = false;
        reasons.alcohol = 'type_default';
      }
    }
  }

  // 7. Derived fields (only fill NULLs)
  if (!loc.price_band) {
    const pb = derivePriceBandFromType(loc.type, googleDetails?.price_level);
    if (pb) { patch.price_band = pb; reasons.price_band = googleDetails?.price_level != null ? 'google_price_level' : 'type_heuristic'; }
  }
  if (!loc.time_of_day_fit) {
    const tdf = deriveTimeOfDayFit(patch.opening_hours || loc.opening_hours);
    if (tdf) { patch.time_of_day_fit = tdf; reasons.time_of_day_fit = 'derived_from_hours'; }
    else {
      patch.time_of_day_fit = 'flexibel';
      reasons.time_of_day_fit = 'default_flexibel';
    }
  }
  if (!loc.rain_backup_quality) {
    const rb = deriveRainBackupFromWeather(loc.weather);
    if (rb) { patch.rain_backup_quality = rb; reasons.rain_backup_quality = 'derived_from_weather'; }
  }
  if (!loc.noise_level) {
    const nl = deriveNoiseLevel(loc.type);
    if (nl) { patch.noise_level = nl; reasons.noise_level = 'type_heuristic'; }
  }
  if (!loc.food_fit) {
    const ff = deriveFoodFit(loc.type, patch.coffee ?? loc.coffee);
    if (ff) { patch.food_fit = ff; reasons.food_fit = 'type_heuristic'; }
  }
  if (!loc.buggy_friendliness) {
    const bf = deriveBuggyFriendliness(loc.type, loc.weather);
    if (bf) { patch.buggy_friendliness = bf; reasons.buggy_friendliness = 'type_weather_heuristic'; }
  }
  if (!loc.toilet_confidence) {
    const tc = deriveToiletConfidence(loc.type);
    if (tc) { patch.toilet_confidence = tc; reasons.toilet_confidence = 'type_heuristic'; }
  }
  if (!loc.crowd_pattern) {
    const cp = deriveCrowdPattern(loc.type);
    if (cp) { patch.crowd_pattern = cp; reasons.crowd_pattern = 'type_heuristic'; }
  }
  if (!loc.parking_ease) {
    const pe = deriveParkingEase(loc.type);
    if (pe) { patch.parking_ease = pe; reasons.parking_ease = 'type_heuristic'; }
  }
  if (!loc.play_corner_quality && ['horeca', 'pancake'].includes(loc.type)) {
    if (webSignals?.has_play_corner) {
      patch.play_corner_quality = 'strong';
      reasons.play_corner_quality = 'website_keyword_scan';
    } else if (webSignals && !webSignals.error) {
      patch.play_corner_quality = 'none';
      reasons.play_corner_quality = 'website_no_signal';
    }
  }

  // 8. Haiku-improved description/highlight
  if (haikuResult?.description && (!loc.description || loc.description.length < 80)) {
    patch.description = haikuResult.description;
    reasons.description = 'haiku_improvement';
  }
  if (haikuResult?.toddler_highlight && !loc.toddler_highlight) {
    patch.toddler_highlight = haikuResult.toddler_highlight;
    reasons.toddler_highlight = 'haiku_generation';
  }

  // 9. Verification timestamp
  if (Object.keys(patch).length > 0) {
    patch.last_verified = new Date().toISOString().split('T')[0];
    patch.last_context_refresh_at = new Date().toISOString();
    if (!loc.verification_mode) {
      patch.verification_mode = 'web_verified';
    }
  }

  return { patch, reasons, closed: false };
}

// ─── Main pipeline ──────────────────────────────────────────────────

async function fetchAllLocations(db) {
  const all = [];
  let offset = 0;
  const fields = 'id,name,type,region,website,description,toddler_highlight,weather,coffee,diaper,alcohol,opening_hours,min_age,max_age,price_band,time_of_day_fit,rain_backup_quality,parking_ease,buggy_friendliness,toilet_confidence,noise_level,food_fit,play_corner_quality,crowd_pattern,place_id,photo_url,photo_quality,last_verified,verification_mode,lat,lng,distance_from_city_center_km,seo_tier';
  while (true) {
    const batch = await db.rest(`locations?select=${fields}&order=id.asc&offset=${offset}&limit=1000`);
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 1000) break;
    offset += batch.length;
  }
  return all;
}

async function processLocation(loc, db, googleKey, anthropicKey, progress) {
  const locId = String(loc.id);
  if (progress.processed[locId]) return 'skipped';

  const startTime = Date.now();
  let googleResult = null;
  let googleDetails = null;
  let webSignals = null;
  let haikuResult = null;
  const errors = [];

  try {
    // Step 1: Google Place ID resolution
    if (!ONLY_DETERMINISTIC && !SKIP_GOOGLE && googleKey) {
      if (!loc.place_id) {
        await wait(GOOGLE_DELAY_MS);
        googleResult = await resolveGooglePlaceId(loc, googleKey);
        if (googleResult.error) errors.push(`google_find: ${googleResult.error}`);
      }

      // Step 2: Google Place Details
      const placeId = loc.place_id || googleResult?.place_id;
      if (placeId) {
        await wait(GOOGLE_DELAY_MS);
        googleDetails = await fetchGooglePlaceDetails(placeId, googleKey);
        if (googleDetails.error) errors.push(`google_details: ${googleDetails.error}`);
      }
    }

    // Step 3: Website scraping
    if (!ONLY_DETERMINISTIC) {
      const website = loc.website || googleDetails?.website;
      if (website) {
        await jitterSleep(800, SCRAPE_DELAY_MS);
        webSignals = await scrapeWebsiteForSignals(website);
        if (webSignals.error) errors.push(`scrape: ${webSignals.error}`);
      }
    }

    // Step 4: LLM description improvement — handled separately by Claude Code Haiku subagents.
    // This pipeline focuses on factual enrichment only (Google, scraping, computed fields).

    // Step 5: Build patch
    const { patch, reasons, closed } = buildPatch(loc, googleResult, googleDetails, webSignals, haikuResult);

    // Step 6: Write to DB
    const fieldCount = Object.keys(patch).length;
    if (fieldCount > 0 && !DRY_RUN) {
      await db.patchLocation(loc.id, patch);
    }

    // Step 7: Log provenance
    const entry = {
      id: loc.id,
      name: loc.name,
      region: loc.region,
      ts: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      fields_updated: fieldCount,
      patch,
      reasons,
      old_values: {},
      errors: errors.length ? errors : undefined,
      closed: closed || undefined,
      dry_run: DRY_RUN || undefined,
    };
    // Record old values for rollback
    for (const key of Object.keys(patch)) {
      entry.old_values[key] = loc[key] ?? null;
    }
    appendLog(entry);

    // Step 8: Update progress
    progress.processed[locId] = {
      ts: new Date().toISOString(),
      fields: fieldCount,
      result: errors.length ? 'partial' : 'ok',
    };
    saveProgress(progress);

    const status = fieldCount > 0 ? (DRY_RUN ? 'dry_run' : 'updated') : 'no_changes';
    if (fieldCount > 0) {
      log('ok', `[${loc.id}] ${loc.name} — ${fieldCount} fields ${DRY_RUN ? '(dry)' : 'patched'}`, { fields: Object.keys(patch) });
    }
    return status;
  } catch (err) {
    log('error', `[${loc.id}] ${loc.name} — ${err.message}`);
    progress.processed[locId] = {
      ts: new Date().toISOString(),
      fields: 0,
      result: 'error',
      error: err.message?.slice(0, 200),
    };
    saveProgress(progress);
    appendLog({
      id: loc.id, name: loc.name, ts: new Date().toISOString(),
      error: err.message, duration_ms: Date.now() - startTime,
    });
    return 'error';
  }
}

async function applyAuditFixes(db, progress) {
  log('info', `Applying audit fixes: ${AUDIT_FIXES.permanently_closed.length} closed locations`);

  for (const id of AUDIT_FIXES.permanently_closed) {
    const locId = String(id);
    const key = `audit_${locId}`;
    if (progress.processed[key]) continue;

    if (!DRY_RUN) {
      try {
        await db.patchLocation(id, {
          seo_tier: 'support',
          seo_exclude_from_sitemap: true,
        });
        log('ok', `[${id}] Marked as permanently closed (seo_tier=support)`);
      } catch (err) {
        log('error', `[${id}] Failed to apply audit fix: ${err.message}`);
      }
    } else {
      log('info', `[${id}] Would mark as permanently closed (dry run)`);
    }

    progress.processed[key] = { ts: new Date().toISOString(), result: 'audit_fix' };
    saveProgress(progress);
  }

  for (const id of AUDIT_FIXES.dead_websites) {
    const locId = String(id);
    const key = `audit_web_${locId}`;
    if (progress.processed[key]) continue;

    if (!DRY_RUN) {
      try {
        await db.patchLocation(id, { website: null });
        log('ok', `[${id}] Cleared dead website`);
      } catch (err) {
        log('error', `[${id}] Failed to clear website: ${err.message}`);
      }
    }

    progress.processed[key] = { ts: new Date().toISOString(), result: 'audit_fix' };
    saveProgress(progress);
  }
}

async function rollback(db) {
  if (!fs.existsSync(LOG_FILE)) {
    log('error', 'No log file found for rollback');
    process.exit(1);
  }

  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
  let restored = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (!entry.old_values || !Object.keys(entry.old_values).length) continue;
      if (entry.dry_run) continue;

      log('info', `Rolling back [${entry.id}] ${entry.name}`);
      await db.patchLocation(entry.id, entry.old_values);
      restored++;
    } catch (err) {
      log('error', `Rollback failed for line: ${err.message}`);
    }
  }

  log('ok', `Rollback complete: ${restored} locations restored`);
}

function generateReport(progress, locations) {
  const processed = Object.values(progress.processed);
  const ok = processed.filter(p => p.result === 'ok').length;
  const partial = processed.filter(p => p.result === 'partial').length;
  const errors = processed.filter(p => p.result === 'error').length;
  const auditFixes = processed.filter(p => p.result === 'audit_fix').length;
  const noChanges = processed.filter(p => p.fields === 0 && p.result !== 'audit_fix').length;
  const totalFields = processed.reduce((s, p) => s + (p.fields || 0), 0);

  const report = `# Location Truth Upgrade — Report

**Generated:** ${new Date().toISOString()}
**Started:** ${progress.started_at}
**Total locations:** ${locations?.length || 'N/A'}
**Processed:** ${processed.length}

## Results

| Status | Count |
|--------|-------|
| Updated successfully | ${ok} |
| Partial (with errors) | ${partial} |
| No changes needed | ${noChanges} |
| Errors | ${errors} |
| Audit fixes | ${auditFixes} |

**Total fields updated:** ${totalFields}

## Estimated Coverage After Run

| Field | Before | After (est.) |
|-------|--------|-------------|
| opening_hours | 52.3% | ~75%+ |
| place_id | 21.6% | ~70%+ |
| distance_from_city_center_km | 5.1% | 100% |
| play_corner_quality | 4.0% | ~40%+ |
| coffee/diaper/alcohol | 90.7% | ~95%+ |
| price_band | 90.6% | ~95%+ |

## Error Distribution

${errors > 0 ? 'See truth-upgrade-log.jsonl for details.' : 'No errors.'}
`;

  fs.writeFileSync(REPORT_FILE, report);
  log('ok', `Report written to ${REPORT_FILE}`);
  return report;
}

async function main() {
  log('info', '═══ Location Truth Upgrade Pipeline ═══');
  log('info', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${SKIP_GOOGLE ? ' (skip Google)' : ''}${ONLY_DETERMINISTIC ? ' (deterministic only)' : ''}`);

  const db = createSupabaseClient(PROJECT_ROOT);
  const googleKey = db.env.GOOGLE_MAPS_KEY;
  const anthropicKey = db.env.ANTHROPIC_API_KEY;

  if (!googleKey && !SKIP_GOOGLE && !ONLY_DETERMINISTIC) {
    log('warn', 'No GOOGLE_MAPS_KEY found — Google enrichment will be skipped');
  }
  if (!anthropicKey) {
    log('warn', 'No ANTHROPIC_API_KEY found — Haiku normalization will be skipped');
  }

  // Handle rollback
  if (DO_ROLLBACK) {
    await rollback(db);
    return;
  }

  // Load progress
  const progress = loadProgress();

  // Fetch all locations
  log('info', 'Fetching all locations from Supabase...');
  const allLocations = await fetchAllLocations(db);
  progress.total = allLocations.length;
  log('info', `Fetched ${allLocations.length} locations`);

  // Report only
  if (REPORT_ONLY) {
    const report = generateReport(progress, allLocations);
    console.log(report);
    return;
  }

  // Apply offset/limit
  let locations = allLocations;
  if (OFFSET) locations = locations.slice(Number(OFFSET));
  if (LIMIT) locations = locations.slice(0, Number(LIMIT));
  log('info', `Processing ${locations.length} locations (offset=${OFFSET || 0}, limit=${LIMIT || 'all'})`);

  // Count already processed
  const alreadyDone = locations.filter(l => progress.processed[String(l.id)]).length;
  if (alreadyDone > 0) {
    log('info', `Resuming: ${alreadyDone} already processed, ${locations.length - alreadyDone} remaining`);
  }

  // Step 1: Apply audit fixes
  await applyAuditFixes(db, progress);

  // Step 2: Process locations sequentially (with internal concurrency for API calls)
  const stats = { updated: 0, no_changes: 0, errors: 0, skipped: 0 };

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const pct = ((i + 1) / locations.length * 100).toFixed(1);

    if (progress.processed[String(loc.id)]) {
      stats.skipped++;
      continue;
    }

    if (i > 0 && i % 50 === 0) {
      log('info', `Progress: ${i}/${locations.length} (${pct}%) — updated: ${stats.updated}, errors: ${stats.errors}`);
    }

    const result = await processLocation(loc, db, googleKey, anthropicKey, progress);
    stats[result === 'updated' || result === 'dry_run' ? 'updated' : result === 'no_changes' ? 'no_changes' : result === 'error' ? 'errors' : 'skipped']++;
  }

  // Generate report
  progress.stats = stats;
  progress.finished_at = new Date().toISOString();
  saveProgress(progress);

  log('info', '═══ Pipeline Complete ═══');
  log('info', `Updated: ${stats.updated} | No changes: ${stats.no_changes} | Errors: ${stats.errors} | Skipped: ${stats.skipped}`);

  generateReport(progress, allLocations);
}

main().catch(err => {
  log('error', `Pipeline crashed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
