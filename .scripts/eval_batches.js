#!/usr/bin/env node
/**
 * Evaluates batch prompt files via Claude Haiku and writes JSON array output.
 * Usage: ANTHROPIC_API_KEY=sk-ant-... node .scripts/eval_batches.js
 */
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable not set');
  process.exit(1);
}

const client = new Anthropic.default({ apiKey: API_KEY });
const OUTPUT_DIR = resolve(__dirname, '..', 'output');

const JOBS = [
  { input: 'batch_prompt_Wijdemeren_0.txt', output: 'eval_batch_Wijdemeren_0.json' },
  { input: 'batch_prompt_Eemnes_0.txt',     output: 'eval_batch_Eemnes_0.json' },
  { input: 'batch_prompt_Soest_0.txt',      output: 'eval_batch_Soest_0.json' },
];

function extractJsonArray(text) {
  // Try to find a JSON array in the response text
  const trimmed = text.trim();
  // Direct parse if it starts with [
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  // Find the first [ and last ] and parse that slice
  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('No JSON array found in response');
}

async function processJob(job) {
  const inputPath = resolve(OUTPUT_DIR, job.input);
  const outputPath = resolve(OUTPUT_DIR, job.output);

  console.log(`\nProcessing: ${job.input}`);
  const prompt = readFileSync(inputPath, 'utf8');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  console.log(`  Response received (${text.length} chars)`);

  const arr = extractJsonArray(text);
  console.log(`  Parsed ${arr.length} items`);

  writeFileSync(outputPath, JSON.stringify(arr));
  console.log(`  Written to: ${job.output}`);
}

(async () => {
  for (const job of JOBS) {
    try {
      await processJob(job);
    } catch (err) {
      console.error(`  ERROR processing ${job.input}:`, err.message);
      process.exit(1);
    }
  }
  console.log('\nAll done.');
})();
