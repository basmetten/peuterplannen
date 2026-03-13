#!/usr/bin/env node

/**
 * write_review.js — Schrijf een review-resultaat terug naar de database
 *
 * Bedoeld voor gebruik vanuit Claude Code: na web research schrijft
 * een agent het resultaat terug via dit script.
 *
 * Usage:
 *   node .scripts/pipeline/write_review.js --candidate-id=123 --score=8 \
 *     --confidence=0.85 --decision=approved \
 *     --reason="Grote binnenspeeltuin, kindermenu, verschoontafel aanwezig" \
 *     --description="Familierestaurant met grote speelhoek..." \
 *     --toddler-highlight="Binnenspeeltuin met ballenbak" \
 *     --weather=indoor --has-play-area --has-kids-menu \
 *     --model=claude-code-agent --web-sources="https://example.com/review"
 *
 *   # Of via JSON op stdin:
 *   echo '{"candidate_id":123,"score_10":8,...}' | node .scripts/pipeline/write_review.js --stdin
 */

const path = require('path');
const { parseArgs, SCORING_PROMPT_VERSION } = require('./config');
const { createSupabaseClient } = require('./db');

function parseBool(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');
  const db = createSupabaseClient(projectRoot);

  let review;

  if (args.stdin) {
    review = await readStdin();
  } else {
    const candidateId = Number(args['candidate-id']);
    if (!candidateId) {
      console.error('--candidate-id is verplicht');
      process.exit(1);
    }

    const score = Number(args.score ?? args.score_10 ?? 0);
    const confidence = Number(args.confidence ?? 0);
    const decision = args.decision || 'needs_review';
    const model = args.model || 'claude-code-agent';

    review = {
      candidate_id: candidateId,
      score_10: Math.min(10, Math.max(0, Math.round(score))),
      confidence: Math.min(1, Math.max(0, confidence)),
      is_suitable: score >= 7,
      decision,
      reason_short: (args.reason || '').slice(0, 280),
      reasons: (args.reasons || args.reason || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 5),
      risk_flags: (args['risk-flags'] || '').split('|').filter(Boolean),
      model,
      derived_fields: {
        has_kids_menu: parseBool(args['has-kids-menu']),
        has_play_area: parseBool(args['has-play-area']),
        has_high_chairs: parseBool(args['has-high-chairs']),
        has_diaper_changing: parseBool(args['has-diaper-changing']),
        play_area_quality: args['play-area-quality'] || null,
        weather: args.weather || null,
        description: args.description || null,
        toddler_highlight: args['toddler-highlight'] || null,
        is_pancake_restaurant: parseBool(args['is-pancake']),
      },
      web_sources: (args['web-sources'] || '').split(',').filter(Boolean),
    };
  }

  // Validate
  if (!review.candidate_id) {
    console.error('candidate_id is verplicht');
    process.exit(1);
  }

  if (!['approved', 'rejected', 'needs_review'].includes(review.decision)) {
    console.error(`Ongeldige decision: ${review.decision}`);
    process.exit(1);
  }

  // Write review to database
  const dbRow = {
    candidate_id: review.candidate_id,
    existing_location_id: review.existing_location_id || null,
    model: review.model || 'claude-code-agent',
    prompt_version: `${SCORING_PROMPT_VERSION}-webresearch`,
    score_10: review.score_10,
    confidence: review.confidence,
    is_suitable: review.is_suitable,
    decision: review.decision,
    reason_short: review.reason_short,
    reasons_json: review.reasons || [],
    risk_flags: review.risk_flags || [],
    derived_fields: review.derived_fields || {},
    raw_json: {
      ...review,
      source: 'claude-code-web-research',
    },
  };

  const result = await db.insertReview(dbRow);

  // Update candidate status
  await db.patchCandidate(review.candidate_id, {
    status: review.decision,
  });

  console.log(JSON.stringify({
    ok: true,
    candidate_id: review.candidate_id,
    decision: review.decision,
    score: review.score_10,
    review_id: result?.id,
  }));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
