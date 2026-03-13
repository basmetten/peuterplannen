#!/usr/bin/env node
// Usage: node score_batch.js <batch_file.json>
// Scores all candidates in the batch file using Haiku via direct Anthropic API

const fs = require('fs');
const path = require('path');

// Load ANTHROPIC_API_KEY from .supabase_env if not set
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.resolve(__dirname, '..', '..', '.supabase_env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)/);
      if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim().replace(/^['"]|['"]$/g, ''); break; }
    }
  } catch (_) {}
}

const { createSupabaseClient } = require('./db');
const { scoreCandidatesViaCodex } = require('./score_workers_codex_cli');
const { DEFAULT_MODEL } = require('./config');

const batchFile = process.argv[2];
if (!batchFile) { console.error('Usage: score_batch.js <batch_file>'); process.exit(1); }

const candidates = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
const projectRoot = path.resolve(__dirname, '..', '..');
const db = createSupabaseClient(projectRoot);

console.log(`[${batchFile}] Scoring ${candidates.length} candidates with ${DEFAULT_MODEL}...`);

scoreCandidatesViaCodex({ db, candidates, model: DEFAULT_MODEL })
  .then(({ summary }) => {
    console.log(`[${batchFile}] Done: approved=${summary.approved} rejected=${summary.rejected} needs_review=${summary.needs_review}`);
    fs.unlinkSync(batchFile);
  })
  .catch((err) => {
    console.error(`[${batchFile}] Error:`, err.message);
    process.exit(1);
  });
