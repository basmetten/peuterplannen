#!/usr/bin/env node
/**
 * PeuterPlannen — Horeca Discovery Pipeline
 *
 * Systematisch kindvriendelijke horeca vinden via:
 *   Stage 1: Overpass API (gratis) — alle horeca uit OpenStreetMap
 *   Stage 2: Website scraping (gratis) — zoekwoorden detecteren
 *   Stage 3: Haiku evaluatie (~$1/regio) — AI beoordeling
 *   Stage 4: Rapportage — review.md + evaluated.json
 *
 * Gebruik:
 *   node .scripts/discover_horeca.js --region=Utrecht
 *   node .scripts/discover_horeca.js --region=Utrecht --stage=3
 *   node .scripts/discover_horeca.js --region=Utrecht --dry-run
 *   node .scripts/discover_horeca.js --region=all
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve } = require('path');

// ─── Config ────────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');
const ENV_PATH = resolve(PROJECT_ROOT, '.supabase_env');

const env = readFileSync(ENV_PATH, 'utf8');
const SB_SERVICE_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

// Anon key for read-only dedup queries
const SB_ANON_KEY = Buffer.from(
  'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5CcGRXcHpkbWRpWm1ac2NuSjJZWFY2YzNobElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnpJd05ETXhOekFzSW1WNGNDSTZNakE0TnpZeE9URTNNSDAuNXkzZ3FpUGZWdnB2ZmFEWUFfUGdxRS1LVHZ1ZjZ6Z042dkd6cWZVcGVTbw==',
  'base64'
).toString('utf8');

// Anthropic API key from env var
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── Regio mapping ─────────────────────────────────────────────────────────

const REGIONS = {
  'Utrecht':             { osmName: 'Utrecht', adminLevel: 8 },
  'Amsterdam':           { osmName: 'Amsterdam', adminLevel: 8 },
  'Rotterdam':           { osmName: 'Rotterdam', adminLevel: 8 },
  'Den Haag':            { osmName: 'Den Haag', adminLevel: 8 },
  'Haarlem':             { osmName: 'Haarlem', adminLevel: 8 },
  'Leiden':              { osmName: 'Leiden', adminLevel: 8 },
  'Amersfoort':          { osmName: 'Amersfoort', adminLevel: 8 },
  'Utrechtse Heuvelrug': { osmName: 'Utrechtse Heuvelrug', adminLevel: 8 },
  'Almere':              { osmName: 'Almere', adminLevel: 8 },
  'Eindhoven':           { osmName: 'Eindhoven', adminLevel: 8 },
  'Groningen':           { osmName: 'Groningen', adminLevel: 8 },
  'Tilburg':             { osmName: 'Tilburg', adminLevel: 8 },
  'Breda':               { osmName: 'Breda', adminLevel: 8 },
  "'s-Hertogenbosch":    { osmName: "'s-Hertogenbosch", adminLevel: 8 },
  'Arnhem':              { osmName: 'Arnhem', adminLevel: 8 },
  'Nijmegen':            { osmName: 'Nijmegen', adminLevel: 8 },
  'Apeldoorn':           { osmName: 'Apeldoorn', adminLevel: 8 },
  // Utrecht-omringende gemeenten
  'Bunnik':              { osmName: 'Bunnik',       adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'De Bilt':             { osmName: 'De Bilt',      adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Zeist':               { osmName: 'Zeist',        adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Houten':              { osmName: 'Houten',       adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Nieuwegein':          { osmName: 'Nieuwegein',   adminLevel: 8, supabaseRegion: 'Utrecht' },
  'IJsselstein':         { osmName: 'IJsselstein',  adminLevel: 8, supabaseRegion: 'Utrecht' },
  'Woerden':             { osmName: 'Woerden',      adminLevel: 8, supabaseRegion: 'Utrecht' },
  // Gooi en Vechtstreek (officiële 7 gemeenten; Weesp is per 2022 onderdeel van Amsterdam)
  'Hilversum':          { osmName: 'Hilversum',          adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Gooise Meren':       { osmName: 'Gooise Meren',       adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Huizen':             { osmName: 'Huizen',             adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Blaricum':           { osmName: 'Blaricum',           adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Laren':              { osmName: 'Laren',              adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Wijdemeren':         { osmName: 'Wijdemeren',         adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  'Eemnes':             { osmName: 'Eemnes',             adminLevel: 8, supabaseRegion: 'Gooi en Vechtstreek' },
  // Utrechtse Heuvelrug aanvullende gemeenten
  'Soest':              { osmName: 'Soest',              adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Baarn':              { osmName: 'Baarn',              adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Wijk bij Duurstede': { osmName: 'Wijk bij Duurstede', adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  'Leusden':            { osmName: 'Leusden',            adminLevel: 8, supabaseRegion: 'Utrechtse Heuvelrug' },
  // Amsterdam omliggende gemeenten
  'Amstelveen':         { osmName: 'Amstelveen',         adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Zaanstad':           { osmName: 'Zaanstad',           adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Haarlemmermeer':     { osmName: 'Haarlemmermeer',     adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Diemen':             { osmName: 'Diemen',             adminLevel: 8, supabaseRegion: 'Amsterdam' },
  'Purmerend':          { osmName: 'Purmerend',          adminLevel: 8, supabaseRegion: 'Amsterdam' },
  // Haarlem omliggende gemeenten
  'Heemstede':          { osmName: 'Heemstede',          adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Bloemendaal':        { osmName: 'Bloemendaal',        adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Zandvoort':          { osmName: 'Zandvoort',          adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Velsen':             { osmName: 'Velsen',             adminLevel: 8, supabaseRegion: 'Haarlem' },
  'Beverwijk':          { osmName: 'Beverwijk',          adminLevel: 8, supabaseRegion: 'Haarlem' },
  // Den Haag omliggende gemeenten
  'Delft':                    { osmName: 'Delft',                    adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Westland':                 { osmName: 'Westland',                 adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Rijswijk':                 { osmName: 'Rijswijk',                 adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Zoetermeer':               { osmName: 'Zoetermeer',               adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Wassenaar':                { osmName: 'Wassenaar',                adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Leidschendam-Voorburg':    { osmName: 'Leidschendam-Voorburg',    adminLevel: 8, supabaseRegion: 'Den Haag' },
  'Pijnacker-Nootdorp':       { osmName: 'Pijnacker-Nootdorp',       adminLevel: 8, supabaseRegion: 'Den Haag' },
  // 's-Hertogenbosch omliggende gemeenten
  'Vught':               { osmName: 'Vught',               adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Sint-Michielsgestel': { osmName: 'Sint-Michielsgestel', adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Heusden':             { osmName: 'Heusden',             adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Bernheze':            { osmName: 'Bernheze',            adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Boxtel':              { osmName: 'Boxtel',              adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Oss':                 { osmName: 'Oss',                 adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
  'Maasdriel':           { osmName: 'Maasdriel',           adminLevel: 8, supabaseRegion: "'s-Hertogenbosch" },
};

// ─── CLI args ──────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const regionArg = args.region;
const startStage = parseInt(args.stage) || 1;
const dryRun = args['dry-run'] === true;

if (!regionArg) {
  console.error('Gebruik: node .scripts/discover_horeca.js --region=Utrecht [--stage=N] [--dry-run]');
  process.exit(1);
}

// ─── Bar/nightlife filter ──────────────────────────────────────────────────

const BAR_KEYWORDS = [
  'cocktail', 'lounge', 'night', 'nacht', 'club', 'disco', 'shisha',
  'hookah', 'casino', 'stripclub', 'coffeshop', 'coffeeshop', 'smartshop',
  'irish pub', 'sports bar', 'whisky', 'wine bar', 'wijnbar', 'biercafe',
  'biertuin', 'taproom', 'brouwerij', 'brewery', 'shot', 'sushi bar'
];

function isBarOrNightlife(candidate) {
  const name = (candidate.name || '').toLowerCase();
  const cuisine = (candidate.cuisine || '').toLowerCase();
  const combined = `${name} ${cuisine}`;
  return BAR_KEYWORDS.some(kw => combined.includes(kw));
}

// ─── Kid-friendly keywords for scraping ────────────────────────────────────

const KID_KEYWORDS = [
  // Speelgelegenheid
  'speelhoek', 'speelruimte', 'speeltuin', 'speelplek', 'speelkamer',
  'speelparadijs', 'ballenbak', 'speelgoed',
  // Kinderen algemeen
  'kinderen', 'kindvriendelijk', 'kids', 'gezin', 'family', 'families',
  'gezinnen', 'kid-friendly', 'kinderen welkom',
  // Kindermenu
  'kindermenu', 'kinderkaart', 'kinderportie', 'kindermaaltijd',
  // Kinderstoel
  'kinderstoel', 'kinderstoelen', 'high chair', 'highchair',
  // Verschonen
  'luiertafel', 'verschoonplek', 'verschoontafel', 'baby',
  'verschoonruimte', 'commode',
  // Leeftijd
  'peuter', 'dreumes', 'kleuter', 'toddler',
  // Pannenkoeken
  'pannenkoek', 'pannenkoekenrestaurant', 'pancake',
];

// ─── Name matching (from audit_and_fix.js:64-99) ──────────────────────────

function nameMatch(nameA, nameB) {
  const normalize = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  const aNorm = normalize(nameA);
  const bNorm = normalize(nameB);

  if (aNorm === bNorm) return { match: true, confidence: 'exact' };

  // Contains match — but require the shorter string to be at least 6 chars
  // to avoid "Anan" matching "Speeltuin Anansi"
  const shorter = aNorm.length < bNorm.length ? aNorm : bNorm;
  if (shorter.length >= 6 && (bNorm.includes(aNorm) || aNorm.includes(bNorm))) {
    return { match: true, confidence: 'contains' };
  }

  // Skip articles, prepositions AND generic establishment type words
  const skipWords = new Set([
    'de', 'het', 'een', 'van', 'in', 'op', 'bij', 'en', 'the', 'a', 'an',
    'restaurant', 'cafe', 'eetcafe', 'grand', 'brasserie', 'bistro',
    'bar', 'fort', 'stads', 'park', 'nieuw', 'oud', 'oude',
    'lunchroom', 'eetwinkel', 'theehuis', 'pannenkoekenrestaurant',
  ]);
  const aWords = aNorm.split(/\s+/).filter(w => !skipWords.has(w) && w.length > 2);
  const bWords = bNorm.split(/\s+/).filter(w => !skipWords.has(w) && w.length > 2);

  if (aWords.length > 0 && bWords.length > 0) {
    // First significant word must match AND be at least 5 chars
    if (aWords[0] === bWords[0] && aWords[0].length >= 5) {
      return { match: true, confidence: 'first-word' };
    }
    // Multi-word overlap needs at least 2 significant (5+ char) words in common
    const overlap = aWords.filter(w => w.length >= 5 && bWords.includes(w));
    if (overlap.length >= 2) return { match: true, confidence: 'multi-word' };
  }

  return { match: false, confidence: 'none' };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadStageFile(region, stage) {
  const p = resolve(OUTPUT_DIR, `stage${stage}_${region}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function saveStageFile(region, stage, data) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const p = resolve(OUTPUT_DIR, `stage${stage}_${region}.json`);
  writeFileSync(p, JSON.stringify(data, null, 2));
  console.log(`  Saved: ${p} (${data.length} items)`);
}

// ─── Stage 1: Overpass Discovery ───────────────────────────────────────────

async function overpassDiscovery(region) {
  const config = REGIONS[region];
  if (!config) throw new Error(`Unknown region: ${region}`);

  console.log(`\n=== STAGE 1: Overpass Discovery — ${region} ===\n`);

  const query = `[out:json][timeout:60];
area["name"="${config.osmName}"]["admin_level"="${config.adminLevel}"]->.a;
(node["amenity"~"restaurant|cafe|ice_cream|fast_food"](area.a);
 way["amenity"~"restaurant|cafe|ice_cream|fast_food"](area.a););
out center;`;

  console.log('  Querying Overpass API...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const elements = data.elements || [];
  console.log(`  Raw results: ${elements.length}`);

  // Parse into candidates
  let candidates = elements.map(el => {
    const tags = el.tags || {};
    // For ways, compute centroid from bounds (Overpass gives center for out body)
    const lat = el.lat || el.center?.lat || null;
    const lng = el.lon || el.center?.lon || null;

    return {
      osm_id: el.id,
      osm_type: el.type,
      name: tags.name || null,
      amenity: tags.amenity,
      lat,
      lng,
      address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || null,
      city: tags['addr:city'] || tags['addr:postcode'] || null,
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      cuisine: tags.cuisine || null,
      outdoor_seating: tags.outdoor_seating || null,
      wheelchair: tags.wheelchair || null,
      opening_hours: tags.opening_hours || null,
    };
  });

  // Filter: must have a name
  const beforeFilter = candidates.length;
  candidates = candidates.filter(c => c.name);
  console.log(`  With name: ${candidates.length} (removed ${beforeFilter - candidates.length} unnamed)`);

  // Filter: remove bars/nightlife
  const beforeBar = candidates.length;
  candidates = candidates.filter(c => !isBarOrNightlife(c));
  console.log(`  After bar filter: ${candidates.length} (removed ${beforeBar - candidates.length} bars/nightlife)`);

  // Dedup against Supabase
  console.log('  Fetching existing locations from Supabase for dedup...');
  const existingRes = await fetch(
    `${SB_URL}?region=eq.${encodeURIComponent(region)}&select=id,name,type`,
    { headers: { 'apikey': SB_ANON_KEY, 'Authorization': 'Bearer ' + SB_ANON_KEY } }
  );
  const existing = await existingRes.json();
  console.log(`  Existing in Supabase: ${existing.length}`);

  const deduped = [];
  const duplicates = [];
  for (const candidate of candidates) {
    const match = existing.find(e => nameMatch(candidate.name, e.name).match);
    if (match) {
      duplicates.push({ candidate: candidate.name, existing: match.name, type: match.type });
    } else {
      deduped.push(candidate);
    }
  }
  console.log(`  After dedup: ${deduped.length} new candidates (${duplicates.length} already in DB)`);
  if (duplicates.length > 0) {
    console.log('  Duplicates found:');
    duplicates.forEach(d => console.log(`    - "${d.candidate}" ≈ "${d.existing}" (${d.type})`));
  }

  saveStageFile(region, 1, deduped);
  return deduped;
}

// ─── Stage 2: Website Scraping ─────────────────────────────────────────────

async function scrapeWebsite(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PeuterPlannen/1.0; +https://peuterplannen.nl)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();
    // Strip HTML tags, collapse whitespace
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .slice(0, 50000); // Max 50KB of text to scan

    // Find kid-friendly keywords
    const found = [];
    for (const kw of KID_KEYWORDS) {
      if (text.includes(kw)) found.push(kw);
    }

    // Extract a snippet around the first keyword match
    let snippet = null;
    if (found.length > 0) {
      const idx = text.indexOf(found[0]);
      const start = Math.max(0, idx - 200);
      const end = Math.min(text.length, idx + 300);
      snippet = text.slice(start, end).trim();
    }

    return { success: true, keywords: found, snippet, textLength: text.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function scrapeWebsites(candidates, region) {
  console.log(`\n=== STAGE 2: Website Scraping — ${region} ===\n`);

  const withWebsite = candidates.filter(c => c.website);
  const withoutWebsite = candidates.filter(c => !c.website);
  console.log(`  With website: ${withWebsite.length} | Without: ${withoutWebsite.length}`);

  const CONCURRENCY = 20;
  let processed = 0;

  // Process in batches
  for (let i = 0; i < withWebsite.length; i += CONCURRENCY) {
    const batch = withWebsite.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (candidate) => {
        const result = await scrapeWebsite(candidate.website);
        candidate.scrape = result;
        processed++;
        if (result.success && result.keywords.length > 0) {
          process.stdout.write(`  [${processed}/${withWebsite.length}] ${candidate.name} — ${result.keywords.join(', ')}\n`);
        }
        return result;
      })
    );
  }

  // Mark candidates without website
  withoutWebsite.forEach(c => {
    c.scrape = { success: false, error: 'no_website', keywords: [], snippet: null };
  });

  const allCandidates = [...withWebsite, ...withoutWebsite];
  const withKeywords = allCandidates.filter(c => c.scrape?.keywords?.length > 0);
  const scraped = allCandidates.filter(c => c.scrape?.success);
  const failed = withWebsite.filter(c => !c.scrape?.success);

  console.log(`\n  Scraped: ${scraped.length} | Failed: ${failed.length} | Keywords found: ${withKeywords.length}`);

  saveStageFile(region, 2, allCandidates);
  return allCandidates;
}

// ─── Stage 3: Haiku Evaluation ─────────────────────────────────────────────

function buildPrompt(candidate) {
  const address = [candidate.address, candidate.city].filter(Boolean).join(', ');
  const snippet = candidate.scrape?.snippet || '(geen website tekst beschikbaar)';
  const keywords = candidate.scrape?.keywords?.join(', ') || '(geen)';

  return `Je beoordeelt of een Nederlands restaurant/café geschikt is voor gezinnen met peuters (0-4 jaar). Geef je beoordeling als JSON.

=== LOCATIE ===
Naam: ${candidate.name}
Type: ${candidate.amenity} | Keuken: ${candidate.cuisine || 'onbekend'}
Adres: ${address || 'onbekend'}
Website: ${candidate.website || 'geen'}
Buiten-zitplaatsen: ${candidate.outdoor_seating || 'onbekend'}

=== WEBSITE TEKST (fragment) ===
${snippet.slice(0, 2000)}

=== GEVONDEN ZOEKWOORDEN ===
${keywords}

=== INSTRUCTIES ===
Beoordeel ALLEEN op basis van de beschikbare informatie.
Score 0-10 (0=absoluut niet voor kinderen, 5=neutraal/onbekend, 10=expliciet kindvriendelijk).
Een hoge score (7+) alleen als er CONCRETE aanwijzingen zijn (speelhoek, kindermenu, etc.).
Pannenkoekenzaken krijgen automatisch minimaal score 6 (kindvriendelijke keuken).
Antwoord ALLEEN met valid JSON, geen andere tekst:

{"score":<0-10>,"confidence":"high|medium|low","reasoning":"<1 zin NL>","has_play_area":<bool|null>,"has_high_chairs":<bool|null>,"has_kids_menu":<bool|null>,"has_diaper_changing":<bool|null>,"weather":"indoor|outdoor|both|null","description":"<1-2 zinnen voor PeuterPlannen als score>=7, anders null>","toddler_highlight":"<1 zin als score>=7, anders null>","is_pancake_restaurant":<bool>}`;
}

async function callHaiku(prompt, retries = 2) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.text || '';
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (err.status === 429 && attempt < retries) {
        const wait = (attempt + 1) * 5000;
        console.log(`    Rate limited, waiting ${wait/1000}s...`);
        await sleep(wait);
        continue;
      }
      if (attempt < retries) {
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }
}

async function haikuEvaluate(candidates, region) {
  console.log(`\n=== STAGE 3: Haiku Evaluation — ${region} ===\n`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would evaluate ${candidates.length} candidates with Haiku`);
    console.log(`  Estimated cost: ~$${(candidates.length * 0.0015).toFixed(2)}`);
    return candidates;
  }

  if (!ANTHROPIC_API_KEY) {
    console.error('  ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.error('  Run: ANTHROPIC_API_KEY=sk-ant-... node .scripts/discover_horeca.js --region=...');
    process.exit(1);
  }

  const CONCURRENCY = 15;
  let processed = 0;
  let errors = 0;
  const total = candidates.length;

  // Estimate cost
  const estCost = (total * 1200 * 0.80 / 1_000_000) + (total * 150 * 4.00 / 1_000_000);
  console.log(`  Candidates: ${total} | Est. cost: ~$${estCost.toFixed(2)} | Concurrency: ${CONCURRENCY}`);
  console.log('');

  // Process in batches
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (candidate) => {
        try {
          const prompt = buildPrompt(candidate);
          const evaluation = await callHaiku(prompt);
          candidate.evaluation = evaluation;
          processed++;

          const score = evaluation.score ?? '?';
          const conf = evaluation.confidence ?? '?';
          const icon = score >= 7 ? '++' : score >= 5 ? '~~' : '--';
          process.stdout.write(`  [${processed}/${total}] ${icon} ${candidate.name} — score:${score} (${conf})\n`);
        } catch (err) {
          errors++;
          processed++;
          candidate.evaluation = { score: 5, confidence: 'low', reasoning: `Error: ${err.message}`, error: true };
          process.stdout.write(`  [${processed}/${total}] !! ${candidate.name} — ERROR: ${err.message}\n`);
        }
      })
    );
    // Small delay between batches
    if (i + CONCURRENCY < candidates.length) await sleep(200);
  }

  console.log(`\n  Done: ${processed} evaluated, ${errors} errors`);

  saveStageFile(region, 3, candidates);
  return candidates;
}

// ─── Stage 4: Generate Reports ─────────────────────────────────────────────

function generateReports(candidates, region) {
  console.log(`\n=== STAGE 4: Generate Reports — ${region} ===\n`);

  const now = new Date().toISOString().split('T')[0];

  // Sort by score descending
  const evaluated = candidates
    .filter(c => c.evaluation)
    .sort((a, b) => (b.evaluation.score ?? 0) - (a.evaluation.score ?? 0));

  const score8plus = evaluated.filter(c => c.evaluation.score >= 8);
  const score7 = evaluated.filter(c => c.evaluation.score === 7);
  const score5_6 = evaluated.filter(c => c.evaluation.score >= 5 && c.evaluation.score < 7);
  const scoreLow = evaluated.filter(c => c.evaluation.score < 5);
  const pancake = evaluated.filter(c => c.evaluation.is_pancake_restaurant);

  // Generate review.md
  let md = `# Horeca Discovery: ${region} (${now})\n\n`;
  md += `Totaal gescand: ${evaluated.length} | Score 8+: ${score8plus.length} | Score 7: ${score7.length} | Score 5-6: ${score5_6.length} | Score <5: ${scoreLow.length}\n`;
  md += `Pannenkoekenzaken gedetecteerd: ${pancake.length}\n\n`;

  function formatCandidate(c, idx) {
    const ev = c.evaluation;
    const addr = [c.address, c.city].filter(Boolean).join(', ') || 'adres onbekend';
    let line = `${idx}. **${c.name}** (score: ${ev.score}, ${ev.confidence}) — ${addr}\n`;
    line += `   ${ev.reasoning}\n`;
    if (c.website) line += `   Website: ${c.website}\n`;
    if (c.scrape?.keywords?.length > 0) line += `   Keywords: ${c.scrape.keywords.join(', ')}\n`;
    if (ev.description) line += `   Beschrijving: ${ev.description}\n`;
    if (ev.toddler_highlight) line += `   Highlight: ${ev.toddler_highlight}\n`;
    const features = [];
    if (ev.has_play_area) features.push('speelhoek');
    if (ev.has_kids_menu) features.push('kindermenu');
    if (ev.has_high_chairs) features.push('kinderstoel');
    if (ev.has_diaper_changing) features.push('verschoontafel');
    if (ev.is_pancake_restaurant) features.push('pannenkoeken');
    if (features.length > 0) line += `   Faciliteiten: ${features.join(', ')}\n`;
    line += '\n';
    return line;
  }

  if (score8plus.length > 0) {
    md += `## Score 8-10 — STERK AANBEVOLEN (${score8plus.length})\n\n`;
    score8plus.forEach((c, i) => { md += formatCandidate(c, i + 1); });
  }

  if (score7.length > 0) {
    md += `## Score 7 — WAARSCHIJNLIJK GESCHIKT (${score7.length})\n\n`;
    score7.forEach((c, i) => { md += formatCandidate(c, i + 1); });
  }

  if (pancake.length > 0) {
    md += `## Pannenkoekenzaken (${pancake.length})\n\n`;
    pancake.forEach((c, i) => { md += formatCandidate(c, i + 1); });
  }

  if (score5_6.length > 0) {
    md += `## Score 5-6 — NEUTRAAL/ONBEKEND (${score5_6.length})\n\n`;
    score5_6.forEach((c, i) => { md += formatCandidate(c, i + 1); });
  }

  const reviewPath = resolve(OUTPUT_DIR, `${region}_review.md`);
  writeFileSync(reviewPath, md);
  console.log(`  Review: ${reviewPath}`);

  // Generate evaluated.json with Supabase-ready records for score >= 7
  const supabaseRegion = REGIONS[region]?.supabaseRegion || region;

  const supabaseReady = evaluated
    .filter(c => c.evaluation.score >= 7)
    .map(c => {
      const ev = c.evaluation;
      const isPancake = ev.is_pancake_restaurant === true;
      return {
        name: c.name,
        address: [c.address, c.city].filter(Boolean).join(', '),
        lat: c.lat,
        lng: c.lng,
        website: c.website,
        score: ev.score,
        confidence: ev.confidence,
        reasoning: ev.reasoning,
        has_play_area: ev.has_play_area,
        has_kids_menu: ev.has_kids_menu,
        has_high_chairs: ev.has_high_chairs,
        has_diaper_changing: ev.has_diaper_changing,
        weather: ev.weather,
        description: ev.description,
        toddler_highlight: ev.toddler_highlight,
        is_pancake_restaurant: isPancake,
        supabase_ready: {
          name: c.name,
          region: supabaseRegion,
          type: isPancake ? 'pancake' : 'horeca',
          description: ev.description,
          website: c.website,
          lat: c.lat,
          lng: c.lng,
          coffee: true,
          diaper: ev.has_diaper_changing === true,
          alcohol: c.amenity === 'restaurant',
          weather: ev.weather || 'indoor',
          toddler_highlight: ev.toddler_highlight,
          last_verified_at: new Date().toISOString(),
          verification_source: 'osm_discovery',
        },
      };
    });

  const evalPath = resolve(OUTPUT_DIR, `${region}_evaluated.json`);
  writeFileSync(evalPath, JSON.stringify(supabaseReady, null, 2));
  console.log(`  Evaluated (score 7+): ${evalPath} (${supabaseReady.length} candidates)`);

  // Generate insert script
  if (supabaseReady.length > 0) {
    let insertScript = `/**
 * PeuterPlannen — Insert approved candidates from ${region} discovery
 * Generated: ${now}
 *
 * Review ${region}_review.md first, then uncomment the candidates you approve.
 * Run: node output/insert_${region}.js
 */

const { readFileSync } = require('fs');
const { resolve } = require('path');
const env = readFileSync(resolve(__dirname, '..', '.supabase_env'), 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations';

const approved = [\n`;

    supabaseReady.forEach(c => {
      insertScript += `  // ${c.name} — score: ${c.score} (${c.confidence}) — ${c.reasoning}\n`;
      insertScript += `  // ${JSON.stringify(c.supabase_ready)},\n\n`;
    });

    insertScript += `];

async function main() {
  console.log('Inserting ' + approved.length + ' approved candidates...');
  for (const loc of approved) {
    const res = await fetch(SB_URL, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify([loc])
    });
    console.log(res.ok ? '  + ' + loc.name : '  ! FAILED: ' + loc.name);
  }
  console.log('Done!');
}

main().catch(console.error);
`;

    const insertPath = resolve(OUTPUT_DIR, `insert_${region}.js`);
    writeFileSync(insertPath, insertScript);
    console.log(`  Insert script: ${insertPath}`);
  }

  return supabaseReady;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function processRegion(region) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  HORECA DISCOVERY: ${region}`);
  console.log(`${'='.repeat(60)}`);

  let candidates;

  // Stage 1
  if (startStage <= 1) {
    candidates = await overpassDiscovery(region);
  } else {
    candidates = loadStageFile(region, 1);
    if (!candidates) throw new Error(`No stage 1 data for ${region}. Run without --stage first.`);
    console.log(`\n  [Loaded stage 1: ${candidates.length} candidates]`);
  }

  // Stage 2
  if (startStage <= 2) {
    candidates = await scrapeWebsites(candidates, region);
  } else {
    candidates = loadStageFile(region, 2) || candidates;
    console.log(`  [Loaded stage 2: ${candidates.length} candidates]`);
  }

  // --no-llm: stop na Stage 2
  if (args['no-llm']) {
    console.log(`\n  [--no-llm] Stage 1+2 klaar. ${candidates.length} kandidaten in stage2 bestand.`);
    return [];
  }

  // Stage 3
  if (startStage <= 3) {
    candidates = await haikuEvaluate(candidates, region);
  } else {
    candidates = loadStageFile(region, 3) || candidates;
    console.log(`  [Loaded stage 3: ${candidates.length} candidates]`);
  }

  // Stage 4: Generate reports (skip in dry-run — candidates have no evaluation data)
  if (dryRun) {
    console.log('\n  [DRY RUN] Skipping report generation — no evaluations performed.');
    return [];
  }
  const results = generateReports(candidates, region);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  DONE: ${region} — ${results.length} candidates with score 7+`);
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (regionArg === 'all') {
    const allResults = {};
    for (const region of Object.keys(REGIONS)) {
      try {
        allResults[region] = await processRegion(region);
        // Be nice to Overpass API between regions
        await sleep(2000);
      } catch (err) {
        console.error(`\n  ERROR for ${region}: ${err.message}`);
        allResults[region] = { error: err.message };
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  TOTAALOVERZICHT');
    console.log('='.repeat(60));
    let total = 0;
    for (const [region, results] of Object.entries(allResults)) {
      if (Array.isArray(results)) {
        console.log(`  ${region}: ${results.length} candidates (score 7+)`);
        total += results.length;
      } else {
        console.log(`  ${region}: ERROR — ${results.error}`);
      }
    }
    console.log(`\n  TOTAAL: ${total} candidates across all regions\n`);
  } else {
    if (!REGIONS[regionArg]) {
      console.error(`Unknown region: "${regionArg}"`);
      console.error(`Available: ${Object.keys(REGIONS).join(', ')}`);
      process.exit(1);
    }
    await processRegion(regionArg);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
