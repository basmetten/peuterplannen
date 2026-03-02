#!/usr/bin/env node
/**
 * Evaluates batch prompt files for 3 municipalities using Claude Haiku.
 */

const { readFileSync, writeFileSync } = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }

const client = new Anthropic({ apiKey: API_KEY });

const JOBS = [
  {
    input: '/Users/basmetten/peuterplannen/output/batch_prompt_Baarn_0.txt',
    output: '/Users/basmetten/peuterplannen/output/eval_batch_Baarn_0.json',
    label: 'Baarn',
  },
  {
    input: '/Users/basmetten/peuterplannen/output/batch_prompt_Wijk bij Duurstede_0.txt',
    output: '/Users/basmetten/peuterplannen/output/eval_batch_Wijk bij Duurstede_0.json',
    label: 'Wijk bij Duurstede',
  },
  {
    input: '/Users/basmetten/peuterplannen/output/batch_prompt_Leusden_0.txt',
    output: '/Users/basmetten/peuterplannen/output/eval_batch_Leusden_0.json',
    label: 'Leusden',
  },
];

function extractJsonArray(text) {
  // Find the first '[' and the matching last ']'
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in response text.');
  }
  const jsonStr = text.slice(start, end + 1);
  // Validate by parsing
  JSON.parse(jsonStr);
  return jsonStr;
}

async function processJob(job) {
  console.log(`\n--- Processing: ${job.label} ---`);
  const promptText = readFileSync(job.input, 'utf8');
  console.log(`  Read prompt (${promptText.length} chars)`);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [
      { role: 'user', content: promptText },
    ],
  });

  const rawText = response.content[0].text;
  console.log(`  Got response (${rawText.length} chars), stop_reason=${response.stop_reason}`);

  const jsonArray = extractJsonArray(rawText);
  writeFileSync(job.output, jsonArray, 'utf8');

  const parsed = JSON.parse(jsonArray);
  console.log(`  Wrote ${parsed.length} entries → ${job.output}`);
}

(async () => {
  for (const job of JOBS) {
    await processJob(job);
  }
  console.log('\nAll done.');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
