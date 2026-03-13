#!/usr/bin/env node

/**
 * discover_web.js — Ontdek nieuwe locaties via Grok + web search
 *
 * In plaats van OSM als bron, zoekt Grok zelf op het web naar
 * kindvriendelijke locaties: blogs, Google reviews, ouderforums, etc.
 *
 * Usage:
 *   node .scripts/pipeline/discover_web.js --region=Haarlem
 *   node .scripts/pipeline/discover_web.js --region=Utrecht --type=horeca --limit=15
 *   node .scripts/pipeline/discover_web.js --region=Zwolle --all-types
 *
 * Output: JSON array met gevonden locaties (stdout)
 * De resultaten worden NIET automatisch in de database gezet.
 * Review de output en gebruik write_review.js of voeg handmatig toe.
 */

const path = require('path');
const { parseArgs, mapToRootRegion } = require('./config');
const { createSupabaseClient } = require('./db');

function parseBool(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true) return true;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

const TYPE_LABELS = {
  play: 'speeltuinen en speelparadijzen',
  farm: 'kinderboerderijen',
  nature: 'natuur en parken',
  museum: 'musea en belevingscentra',
  horeca: 'kindvriendelijke restaurants en cafés met speelhoek',
  pancake: 'pannenkoekenrestaurants',
  swim: 'zwembaden en waterparken',
  culture: 'culturele activiteiten voor kinderen',
};

function buildDiscoveryPrompt(region, types, existingNames) {
  const typeList = types.map(t => TYPE_LABELS[t] || t).join(', ');
  const existingSection = existingNames.length > 0
    ? `\nDeze locaties hebben we AL, noem ze NIET opnieuw:\n${existingNames.map(n => `- ${n}`).join('\n')}\n`
    : '';

  return [
    `Zoek op het web naar kindvriendelijke uitjes voor peuters en kleuters (0-7 jaar) in de regio ${region}, Nederland.`,
    `Zoek specifiek naar: ${typeList}.`,
    '',
    'INSTRUCTIES:',
    '- Zoek op Google naar "kindvriendelijke uitjes ${region}", "met peuters naar ${region}", "speelhoek restaurant ${region}"',
    '- Zoek op blogs van ouders, review-sites, Google Maps reviews',
    '- Zoek naar locaties die specifiek kindvriendelijk zijn: speelhoek, kindermenu, ballenbak, etc.',
    '- Zoek ook naar minder bekende plekken die op blogs of forums worden aanbevolen',
    '- Controleer of de locatie nog bestaat (niet permanent gesloten)',
    existingSection,
    'Geef ALLEEN valide JSON terug: een array van objecten met deze velden:',
    '[{',
    '  "name": "Naam van de locatie",',
    '  "type": "play|farm|nature|museum|horeca|pancake|swim|culture",',
    '  "address": "Straat en nummer",',
    '  "city": "Stad",',
    '  "description": "Beschrijving in 1-3 zinnen, gericht op ouders met peuters",',
    '  "toddler_highlight": "Wat maakt het leuk voor peuters? Max 1 zin",',
    '  "weather": "indoor|outdoor|both",',
    '  "website": "URL of null",',
    '  "has_play_area": true/false/null,',
    '  "has_kids_menu": true/false/null,',
    '  "has_diaper_changing": true/false/null,',
    '  "confidence": 0.0-1.0,',
    '  "sources": ["URL waar je dit gevonden hebt", "..."],',
    '  "why": "Korte uitleg waarom deze locatie kindvriendelijk is"',
    '}]',
    '',
    `Vind minimaal 5 en maximaal 20 locaties. Kwaliteit boven kwantiteit.`,
    'Neem ALLEEN locaties op waar je echt bewijs voor hebt gevonden op het web.',
  ].join('\n');
}

async function callGrokDiscovery(prompt, timeoutMs) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY niet gevonden. Set XAI_API_KEY in environment of .supabase_env');

  const controller = new AbortController();
  const killTimer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.1-fast',
        input: [
          { role: 'system', content: 'Je bent een expert in kindvriendelijke locaties in Nederland. Je zoekt grondig het web af naar plekken die geschikt zijn voor ouders met peuters en kleuters. Geef alleen valide JSON terug.' },
          { role: 'user', content: prompt },
        ],
        tools: [{ type: 'web_search' }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`xAI API ${res.status}: ${text.slice(0, 400)}`);
    }

    const data = await res.json();
    let outputText = data?.output_text || '';
    if (!outputText && Array.isArray(data?.output)) {
      for (const item of data.output) {
        if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const chunk of item.content) {
          if (chunk?.type === 'output_text' && chunk.text) outputText += chunk.text;
        }
      }
    }

    // Parse JSON array uit de response
    const trimmed = outputText.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('[');
      const end = trimmed.lastIndexOf(']');
      if (start >= 0 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1));
      }
      throw new Error('Geen JSON array gevonden in Grok response');
    }
  } finally {
    clearTimeout(killTimer);
  }
}

// Laad XAI_API_KEY uit .supabase_env als het niet in env staat
function loadApiKey(projectRoot) {
  if (process.env.XAI_API_KEY) return;
  try {
    const fs = require('fs');
    const envPath = path.resolve(projectRoot, '.supabase_env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^XAI_API_KEY\s*=\s*(.+)/);
      if (m) { process.env.XAI_API_KEY = m[1].trim().replace(/^['"]|['"]$/g, ''); return; }
    }
  } catch (_) {}
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');
  loadApiKey(projectRoot);

  const region = args.region;
  if (!region) {
    console.error('--region is verplicht. Bijv: --region=Haarlem');
    process.exit(1);
  }

  const normalizedRegion = mapToRootRegion(region);
  const limit = Number(args.limit) || 15;
  const allTypes = parseBool(args['all-types'], false);

  let types;
  if (args.type) {
    types = [args.type];
  } else if (allTypes) {
    types = Object.keys(TYPE_LABELS);
  } else {
    types = ['play', 'horeca', 'pancake', 'museum', 'nature', 'farm'];
  }

  // Haal bestaande locaties op om duplicaten te voorkomen
  const db = createSupabaseClient(projectRoot);
  const existing = await db.getLocationsByRegion(normalizedRegion);
  const existingNames = (existing || []).map(l => l.name);

  console.error(`Regio: ${normalizedRegion}`);
  console.error(`Types: ${types.join(', ')}`);
  console.error(`Bestaande locaties: ${existingNames.length}`);
  console.error(`Grok + web search zoekt naar nieuwe locaties...\n`);

  const prompt = buildDiscoveryPrompt(normalizedRegion, types, existingNames);
  const timeoutMs = Number(args.timeout) || 300000; // 5 min default

  const results = await callGrokDiscovery(prompt, timeoutMs);

  if (!Array.isArray(results) || results.length === 0) {
    console.error('Geen locaties gevonden.');
    process.exit(0);
  }

  // Filter duplicaten
  const lowerExisting = new Set(existingNames.map(n => n.toLowerCase().trim()));
  const filtered = results.filter(r => {
    const name = (r.name || '').toLowerCase().trim();
    return name && !lowerExisting.has(name);
  });

  console.error(`Gevonden: ${results.length}, na dedup: ${filtered.length}\n`);
  console.log(JSON.stringify(filtered.slice(0, limit), null, 2));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
