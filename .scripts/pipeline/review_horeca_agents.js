#!/usr/bin/env node
// Stap 2a (Agent SDK versie): Herbeordeel horeca score-7 locaties via Claude subagents.
// Orchestrator spawnt parallelle reviewer-subagents per batch van ~50 locaties.
//
// Usage:
//   node review_horeca_agents.js [--output=horeca_decisions.json] [--dry-run] [--limit=N] [--batch-size=50]

const fs = require('fs');
const path = require('path');
const os = require('os');
const { query } = require('@anthropic-ai/claude-agent-sdk');
const { createSupabaseClient } = require('./db');

// ── Config ────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const outputFile = path.resolve(args.output || 'horeca_decisions.json');
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const limit = args.limit ? Number(args.limit) : null;
const batchSize = Number(args['batch-size'] || 50);
const projectRoot = path.resolve(__dirname, '..', '..');

// ── Reviewer subagent prompt ───────────────────────────────────────────────────

const REVIEWER_SYSTEM_PROMPT = `Je bent een expert die Nederlandse horecalocaties beoordeelt als uitje voor ouders met peuters/kleuters (1-4 jaar).

STRIKTE "keep"-criteria — locatie moet aan minstens één voldoen:
- Speelhoek of binnenspeeltuin aanwezig (ook kleine speelhoek telt)
- Kindermenu + iets bijzonders (thema, sfeer, bijzondere setting/locatie)
- Pannenkoeken- of poffertjesrestaurant
- Boerderijcafé, parkcafé, theehuis of tuincafé
- HEMA restaurant of La Place (breed familieplek, altijd welkom)
- IJssalon met echte zitgelegenheid en gezinssfeer

Verwijder als het een van deze is:
- McDonald's, Burger King, KFC, Subway, Domino's — te generiek fastfood, geen uitje
- Bagels & Beans, Anne & Max, Starbucks, Coffee Company — koffietentjes, geen peuter-uitje
- Generieke pizzeria of burgerrestaurant zonder speciaal kinderaspect
- Standaard snackbar of cafetaria zonder bijzonder karakter
- Regulier sushi/Chinees/Turks/Grieks restaurant zonder vermelding kindvriendelijkheid

Twijfelgevallen: gooi het zekere voor het onzekere — "delete" als er geen concreet kinderaspect is.`;

// ── Orchestrator agent prompt ─────────────────────────────────────────────────

function buildOrchestratorPrompt(batchDir, outputFile, totalBatches) {
  return `Je bent een orchestrator die horeca-locaties laat beoordelen door reviewer-subagents.

Er zijn ${totalBatches} batch-bestanden in: ${batchDir}
De bestanden heten batch_0.json, batch_1.json, ..., batch_${totalBatches - 1}.json

Jouw taak:
1. Voor elke batch (0 t/m ${totalBatches - 1}), spawn één "horeca-reviewer" subagent.
   Stuur de subagent dit verzoek:
   "Lees het bestand ${batchDir}/batch_N.json, beoordeel elke locatie, en schrijf het resultaat naar ${batchDir}/results_N.json als JSON-array van {id, name, decision: \\"keep\\"|\\"delete\\", reason}."
   (vervang N door het batch-nummer)

2. Je KUNT meerdere subagents parallel spawnen via de Agent-tool. Doe dit om snelheid te maximaliseren — spawn meerdere tegelijk als dat mogelijk is.

3. Wacht tot alle subagents klaar zijn.

4. Lees alle result-bestanden (results_0.json t/m results_${totalBatches - 1}.json) uit ${batchDir}.

5. Combineer alle resultaten tot één array en schrijf naar: ${outputFile}
   Formaat: JSON-array van {id, name, decision, reason}

6. Rapporteer het totaal: hoeveel keep, hoeveel delete.

Begin nu met het spawnen van de reviewer-subagents.`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const db = createSupabaseClient(projectRoot);

  console.log('=== review_horeca_agents (Agent SDK) ===');
  console.log('Ophalen horeca-locaties met score 7...');

  // Fetch locaties direct via db.js (buiten de agent)
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

  console.log(`Gevonden: ${allLocs.length} horeca-locaties (te beoordelen: ${locs.length})`);

  if (dryRun) {
    console.log('[DRY RUN] Eerste 5:');
    locs.slice(0, 5).forEach((l) => console.log(`  id=${l.id} ${l.name}`));
    console.log('[DRY RUN] Geen agents gestart.');
    return;
  }

  if (locs.length === 0) {
    console.log('Niets te beoordelen.');
    return;
  }

  // Schrijf batches naar temp dir
  const batchDir = path.join(os.tmpdir(), `horeca_batches_${Date.now()}`);
  fs.mkdirSync(batchDir, { recursive: true });

  const batches = [];
  for (let i = 0; i < locs.length; i += batchSize) {
    const batch = locs.slice(i, i + batchSize);
    const batchFile = path.join(batchDir, `batch_${batches.length}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2), 'utf8');
    batches.push(batchFile);
  }

  console.log(`Batches aangemaakt: ${batches.length} × ~${batchSize} locaties in ${batchDir}`);
  console.log('Agent SDK orchestrator starten...\n');

  const orchestratorPrompt = buildOrchestratorPrompt(batchDir, outputFile, batches.length);

  let finalResult = null;

  for await (const message of query({
    prompt: orchestratorPrompt,
    options: {
      cwd: projectRoot,
      allowedTools: ['Read', 'Write', 'Agent'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 50,
      agents: {
        'horeca-reviewer': {
          description: 'Beoordeelt een batch horeca-locaties op geschiktheid voor peuters/kleuters. Leest een JSON-bestand met locaties, beoordeelt elke locatie en schrijft beslissingen naar een output-bestand.',
          prompt: REVIEWER_SYSTEM_PROMPT,
          tools: ['Read', 'Write'],
        },
      },
    },
  })) {
    if ('result' in message) {
      finalResult = message.result;
    }
  }

  console.log('\n--- Orchestrator klaar ---');
  if (finalResult) console.log(finalResult);

  // Controleer output
  if (fs.existsSync(outputFile)) {
    const decisions = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const keeps = decisions.filter((d) => d.decision === 'keep').length;
    const deletes = decisions.filter((d) => d.decision === 'delete').length;
    console.log(`\nResultaat: ${decisions.length} totaal — ${keeps} keep, ${deletes} delete`);
    console.log(`Output: ${outputFile}`);
    console.log(`\nVolgende stap:\n  node .scripts/pipeline/delete_locations.js ${outputFile} --dry-run`);
  } else {
    console.warn(`Output-bestand niet gevonden: ${outputFile}`);
    console.log('Controleer of de orchestrator alle result-bestanden heeft gecombineerd.');
  }

  // Opruimen temp dir
  try {
    fs.rmSync(batchDir, { recursive: true, force: true });
  } catch (_) {}
})().catch((err) => {
  console.error('Fout:', err.message || err);
  process.exit(1);
});
