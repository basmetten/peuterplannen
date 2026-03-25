#!/usr/bin/env node
// Stap 2a: Herbeordeel horeca-locaties met score 7 via Anthropic API.
// Strikte criteria: alleen "keep" als er echt een reden is voor gezinnen met peuters.
// Uitvoer: JSON-bestand voor delete_locations.js
//
// Usage: node review_horeca_score7.js [--output=horeca_decisions.json] [--dry-run] [--limit=N]

(function loadAnthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  const fs = require('fs');
  const path = require('path');
  try {
    const envPath = path.resolve(__dirname, '..', '..', '.supabase_env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)/);
      if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim().replace(/^['"]|['"]$/g, ''); return; }
    }
  } catch (_) {}
})();

const fs = require('fs');
const path = require('path');
const { createSupabaseClient } = require('./db');
const { mapLimit } = require('./config');

const MODEL = 'claude-haiku-4-5-20251001';
const CONCURRENCY = Number(process.env.PIPELINE_SCORE_CONCURRENCY || '15');
const TIMEOUT_MS = 60000;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const outputFile = args.output || path.join(process.cwd(), 'horeca_decisions.json');
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const limit = args.limit ? Number(args.limit) : null;

const projectRoot = path.resolve(__dirname, '..', '..');

function buildStrictPrompt(loc) {
  const details = [
    `Naam: ${loc.name || ''}`,
    `Type: ${loc.type || ''}`,
    `Omschrijving: ${loc.description || ''}`,
    `Toddler highlight: ${loc.toddler_highlight || ''}`,
    `Website: ${loc.website || ''}`,
    `Regio: ${loc.region || ''}`,
  ].join('\n');

  return `Je beoordeelt of een horecalocatie een echte meerwaarde heeft als uitje voor ouders met peuters/kleuters (1-4 jaar).

STRIKTE "keep"-criteria — locatie moet aan minstens één voldoen:
- Speelhoek of binnenspeeltuin aanwezig
- Kindermenu PLUS iets bijzonders (thema, sfeer, bijzondere setting)
- Pannenkoeken- of poffertjesrestaurant
- Boerderijcafé, parkcafé of theehuis
- HEMA restaurant of La Place (breed familieplek)
- IJssalon met echte zitgelegenheid en gezinssfeer

Verwijder als:
- McDonald's, Burger King, KFC of vergelijkbare fastfood — te generiek, geen uitje
- Bagels & Beans, Anne & Max, Starbucks, Subway — koffietentjes, geen peuter-uitje
- Generieke pizzeria of burgerrestaurant zonder speciaal kinderaspect
- Standaard snackbar of cafetaria zonder bijzonder karakter
- Regulier sushi/Chinees/Turks restaurant zonder vermelding kindvriendelijkheid

Locatiegegevens:
${details}

Geef ALLEEN geldige JSON:
{"decision":"keep"|"delete","reason":"max 1 zin"}`;
}

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  try { return JSON.parse(trimmed); } catch { /* */ }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error('Geen JSON gevonden in: ' + trimmed.slice(0, 200));
}

async function reviewLocation(loc) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet gevonden');

  const prompt = buildStrictPrompt(loc);
  const deadline = Date.now() + TIMEOUT_MS;
  let attempt = 0;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Timeout');

    const controller = new AbortController();
    const killTimer = setTimeout(() => controller.abort(), remaining);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        const retryAfter = Number(res.headers.get('retry-after') || '0');
        const waitMs = Math.max(retryAfter * 1000, Math.min(2000 * Math.pow(2, attempt), 30000));
        attempt++;
        if (Date.now() + waitMs > deadline) throw new Error('Rate limit, geen tijd meer');
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = await res.json();
      const raw = extractJsonObject(data.content?.[0]?.text || '');
      const decision = ['keep', 'delete'].includes(raw.decision) ? raw.decision : 'keep';
      return { id: loc.id, name: loc.name, decision, reason: String(raw.reason || '').slice(0, 200) };
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Timeout (aborted)');
      throw err;
    } finally {
      clearTimeout(killTimer);
    }
  }
}

(async () => {
  const db = createSupabaseClient(projectRoot);

  console.log('Ophalen horeca-locaties met score 7...');
  // Haal alle horeca-locaties met score 7 op (paginated)
  const allLocs = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const rows = await db.rest(
      `locations?type=eq.horeca&ai_suitability_score_10=eq.7&select=id,name,type,description,toddler_highlight,website,region&order=id.asc&limit=${pageSize}&offset=${offset}`
    );
    if (!Array.isArray(rows) || rows.length === 0) break;
    allLocs.push(...rows);
    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  let locs = allLocs;
  if (limit && limit > 0) locs = locs.slice(0, limit);

  console.log(`Gevonden: ${allLocs.length} horeca-locaties met score 7${limit ? ` (limiet: ${limit})` : ''}`);

  if (dryRun) {
    console.log('[DRY RUN] Eerste 5 locaties:');
    locs.slice(0, 5).forEach((l) => console.log(`  id=${l.id} ${l.name}`));
    console.log('[DRY RUN] Geen API-calls gedaan.');
    return;
  }

  if (locs.length === 0) {
    console.log('Niets te beoordelen.');
    return;
  }

  console.log(`Beoordelen met ${MODEL} (concurrency=${CONCURRENCY})...`);

  let done = 0;
  const results = await mapLimit(locs, CONCURRENCY, async (loc) => {
    try {
      const result = await reviewLocation(loc);
      done++;
      if (done % 25 === 0 || done === locs.length) {
        console.log(`  ${done}/${locs.length} — keep=${results?.filter((r) => r?.decision === 'keep').length ?? '?'}`);
      }
      return result;
    } catch (err) {
      console.error(`  Fout bij id=${loc.id} ${loc.name}: ${err.message} — standaard keep`);
      return { id: loc.id, name: loc.name, decision: 'keep', reason: `error: ${err.message}` };
    }
  });

  const keeps = results.filter((r) => r.decision === 'keep').length;
  const deletes = results.filter((r) => r.decision === 'delete').length;

  console.log(`\nResultaat: ${keeps} keep, ${deletes} delete`);

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Beslissingen opgeslagen: ${outputFile}`);
  console.log(`\nVolgende stap:\n  node .scripts/pipeline/delete_locations.js ${outputFile}`);
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
