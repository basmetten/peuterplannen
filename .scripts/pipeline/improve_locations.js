#!/usr/bin/env node

/**
 * improve_locations.js — Verbeter bestaande locaties via Grok + web search
 *
 * Grok zoekt op het web naar reviews, blogs en websites om:
 * - Betere beschrijvingen te schrijven
 * - Ontbrekende info aan te vullen (speelhoek, kindermenu, verschoontafel)
 * - Toddler highlights toe te voegen
 * - Te checken of locaties nog bestaan
 *
 * Usage:
 *   node .scripts/pipeline/improve_locations.js --region=Utrecht
 *   node .scripts/pipeline/improve_locations.js --region=Amsterdam --type=horeca
 *   node .scripts/pipeline/improve_locations.js --region=Haarlem --weak-only --limit=10
 *
 * Output: JSON met verbetervoorstellen (stdout)
 * Wijzigingen worden NIET automatisch doorgevoerd.
 */

const path = require('path');
const { parseArgs, mapToRootRegion } = require('./config');
const { createSupabaseClient } = require('./db');

function parseBool(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true) return true;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

function buildImprovementPrompt(locations) {
  const items = locations.map((loc, i) => {
    const desc = loc.description || '(geen beschrijving)';
    const highlight = loc.toddler_highlight || '(geen)';
    return [
      `--- Locatie ${i + 1} (ID: ${loc.id}) ---`,
      `Naam: ${loc.name}`,
      `Type: ${loc.type}`,
      `Regio: ${loc.region}`,
      `Website: ${loc.website || '(geen)'}`,
      `Huidige beschrijving: ${desc}`,
      `Huidige toddler_highlight: ${highlight}`,
      `Weer: ${loc.weather || '(onbekend)'}`,
      `Koffie: ${loc.coffee}, Verschoontafel: ${loc.diaper}, Kindermenu: ${loc.has_kids_menu ?? '(onbekend)'}`,
    ].join('\n');
  });

  return [
    'Onderzoek de volgende locaties op het web. Zoek naar Google reviews, blogs van ouders,',
    'de website van de locatie, en andere bronnen. Verbeter de beschrijvingen en vul ontbrekende informatie aan.',
    '',
    'INSTRUCTIES:',
    '- Zoek voor elke locatie naar reviews die specifiek over kinderen/peuters gaan',
    '- Check de website op info over kindvriendelijkheid (speelhoek, kindermenu, verschoontafel)',
    '- Schrijf een beschrijving van 2-3 zinnen gericht op ouders met peuters',
    '- Schrijf een toddler_highlight van max 1 zin: wat maakt het leuk voor peuters?',
    '- Geef aan of de locatie nog open is (niet permanent gesloten)',
    '- Als je niets kunt vinden, geef dan "no_changes": true',
    '',
    ...items,
    '',
    'Geef ALLEEN valide JSON terug: een array van objecten:',
    '[{',
    '  "id": 123,',
    '  "name": "Naam",',
    '  "no_changes": false,',
    '  "description": "Verbeterde beschrijving of null als het goed is",',
    '  "toddler_highlight": "Verbeterd highlight of null",',
    '  "weather": "indoor|outdoor|both of null als ongewijzigd",',
    '  "has_play_area": true/false/null,',
    '  "has_kids_menu": true/false/null,',
    '  "has_diaper_changing": true/false/null,',
    '  "possibly_closed": false,',
    '  "sources": ["URL van gebruikte bronnen"],',
    '  "review_summary": "Korte samenvatting van wat ouders zeggen in reviews"',
    '}]',
  ].join('\n');
}

async function callGrokImprove(prompt, timeoutMs) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY niet gevonden');

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
          { role: 'system', content: 'Je bent een expert in kindvriendelijke locaties in Nederland. Je zoekt grondig het web af naar reviews en informatie. Geef alleen valide JSON terug.' },
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
    console.error('--region is verplicht. Bijv: --region=Utrecht');
    process.exit(1);
  }

  const normalizedRegion = mapToRootRegion(region);
  const limit = Number(args.limit) || 10;
  const weakOnly = parseBool(args['weak-only'], false);
  const typeFilter = args.type || null;

  const db = createSupabaseClient(projectRoot);
  let locations = await db.getLocationsByRegion(normalizedRegion, typeFilter ? [typeFilter] : null);

  if (!locations || locations.length === 0) {
    console.error(`Geen locaties gevonden in ${normalizedRegion}`);
    process.exit(0);
  }

  // Filter op "zwakke" locaties als --weak-only
  if (weakOnly) {
    locations = locations.filter(l => {
      const desc = l.description || '';
      const highlight = l.toddler_highlight || '';
      return desc.length < 80 || !highlight;
    });
  }

  // Beperk tot --limit
  locations = locations.slice(0, limit);

  console.error(`Regio: ${normalizedRegion}`);
  console.error(`Locaties te verbeteren: ${locations.length}`);
  console.error(`Grok + web search zoekt reviews en info...\n`);

  // Verwerk in batches van 5 (Grok web search is trager)
  const BATCH_SIZE = 5;
  const allResults = [];

  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);
    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(locations.length / BATCH_SIZE)} (${batch.length} locaties)...`);

    const prompt = buildImprovementPrompt(batch);
    const timeoutMs = Number(args.timeout) || 300000;

    try {
      const results = await callGrokImprove(prompt, timeoutMs);
      if (Array.isArray(results)) {
        allResults.push(...results);
      }
    } catch (err) {
      console.error(`Batch fout: ${err.message}`);
    }
  }

  // Filter: alleen locaties met daadwerkelijke verbeteringen
  const improvements = allResults.filter(r => !r.no_changes);

  console.error(`\nVerbeteringen gevonden: ${improvements.length} van ${locations.length} locaties\n`);
  console.log(JSON.stringify(improvements, null, 2));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
