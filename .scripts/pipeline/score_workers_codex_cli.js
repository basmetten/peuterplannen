const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  DEFAULT_MODEL,
  SCORING_PROMPT_VERSION,
  hasHardRejectSignal,
  mapLimit,
} = require('./config');

const execFileAsync = promisify(execFile);

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Empty model response');

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('No JSON object found');
  }
}

function validateAndNormalize(raw) {
  if (typeof raw !== 'object' || !raw) throw new Error('Response must be object');

  const score = Number(raw.score_10);
  const confidence = Number(raw.confidence);

  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new Error('Invalid score_10');
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('Invalid confidence');
  }

  const decision = ['approved', 'rejected', 'needs_review'].includes(raw.decision)
    ? raw.decision
    : 'needs_review';

  const derived = raw.derived_fields && typeof raw.derived_fields === 'object'
    ? raw.derived_fields
    : {};

  return {
    is_suitable: Boolean(raw.is_suitable),
    score_10: score,
    confidence,
    decision,
    reason_short: String(raw.reason_short || '').slice(0, 280),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map((v) => String(v).slice(0, 220)).slice(0, 5) : [],
    risk_flags: Array.isArray(raw.risk_flags) ? raw.risk_flags.map((v) => String(v).slice(0, 80)).slice(0, 8) : [],
    derived_fields: {
      has_kids_menu: typeof derived.has_kids_menu === 'boolean' ? derived.has_kids_menu : null,
      has_play_area: typeof derived.has_play_area === 'boolean' ? derived.has_play_area : null,
      has_high_chairs: typeof derived.has_high_chairs === 'boolean' ? derived.has_high_chairs : null,
      has_diaper_changing: typeof derived.has_diaper_changing === 'boolean' ? derived.has_diaper_changing : null,
      play_area_quality: ['none', 'basic', 'significant'].includes(derived.play_area_quality) ? derived.play_area_quality : null,
      weather: ['indoor', 'outdoor', 'both', 'hybrid'].includes(derived.weather) ? derived.weather : null,
      description: derived.description ? String(derived.description).slice(0, 800) : null,
      toddler_highlight: derived.toddler_highlight ? String(derived.toddler_highlight).slice(0, 240) : null,
      is_pancake_restaurant: typeof derived.is_pancake_restaurant === 'boolean' ? derived.is_pancake_restaurant : null,
    },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function boolCount(values) {
  return values.filter(Boolean).length;
}

function evidenceMetrics(review, candidate) {
  const signals = candidate.enriched_signals || {};
  const derived = review.derived_fields || {};

  const kidFeatures = boolCount([
    derived.has_play_area,
    derived.has_kids_menu,
    derived.has_high_chairs,
    derived.has_diaper_changing,
  ]);

  const playAreaStrong = derived.play_area_quality === 'significant';
  const keywordCount = Number(signals.keyword_count || 0);
  const keywordStrong = keywordCount >= 4;
  const mentionsFamily = Boolean(signals.mentions_family || signals.tripadvisor_mentions_family || signals.google_mentions_family);

  const googleRating = toNumber(signals.google_rating);
  const googleReviews = toNumber(signals.google_review_count);
  const tripRating = toNumber(signals.tripadvisor_rating);
  const tripReviews = toNumber(signals.tripadvisor_review_count);
  const googleStrong = (googleRating !== null && googleRating >= 4.2 && googleReviews !== null && googleReviews >= 50);
  const tripStrong = (tripRating !== null && tripRating >= 4.0 && tripReviews !== null && tripReviews >= 20);
  const reviewSignalStrong = googleStrong || tripStrong;

  const pancakeLike = derived.is_pancake_restaurant === true
    || /pannenkoek|pancake/i.test(candidate.name || '');
  const familyNameSignal = /family|kids|kidscafe|kinder|speel/i.test(candidate.name || '');

  let evidencePoints = 0;
  if (playAreaStrong) evidencePoints += 2;
  else if (derived.has_play_area) evidencePoints += 1;
  if (kidFeatures >= 2) evidencePoints += 2;
  else if (kidFeatures === 1) evidencePoints += 1;
  if (keywordStrong) evidencePoints += 1;
  if (mentionsFamily) evidencePoints += 1;
  if (reviewSignalStrong) evidencePoints += 1;
  if (pancakeLike) evidencePoints += 1;
  if (familyNameSignal) evidencePoints += 1;

  const evidenceConfidence = clamp(0.35 + evidencePoints * 0.06, 0.35, 0.9);

  return {
    playAreaStrong,
    keywordCount,
    mentionsFamily,
    reviewSignalStrong,
    pancakeLike,
    evidencePoints,
    evidenceConfidence,
  };
}

function decide(review, candidate) {
  const signals = candidate.enriched_signals || {};
  const hardReject = hasHardRejectSignal(`${candidate.name || ''} ${candidate.amenity || ''}`)
    || Boolean(signals.hard_reject);
  const googleStatus = String(signals.google_business_status || '').toUpperCase();
  const closedPermanently = googleStatus === 'CLOSED_PERMANENTLY';

  if (hardReject || closedPermanently) {
    return {
      ...review,
      decision: 'rejected',
      is_suitable: false,
      risk_flags: [...new Set([
        ...(review.risk_flags || []),
        hardReject ? 'hard_reject_signal' : null,
        closedPermanently ? 'closed_permanently' : null,
      ].filter(Boolean))],
    };
  }

  const metrics = evidenceMetrics(review, candidate);
  const confidenceBefore = Number(review.confidence || 0);
  const confidenceAfter = Math.max(confidenceBefore, metrics.evidenceConfidence);
  const withConfidence = {
    ...review,
    confidence: confidenceAfter,
  };

  if (
    withConfidence.is_suitable &&
    withConfidence.score_10 >= 8 &&
    withConfidence.confidence >= 0.7 &&
    metrics.evidencePoints >= 4 &&
    (metrics.playAreaStrong || metrics.keywordCount >= 4 || metrics.reviewSignalStrong)
  ) {
    return { ...withConfidence, decision: 'approved' };
  }

  if (
    withConfidence.is_suitable &&
    withConfidence.score_10 >= 7 &&
    withConfidence.confidence >= 0.7 &&
    metrics.playAreaStrong &&
    (metrics.reviewSignalStrong || metrics.keywordCount >= 4 || metrics.mentionsFamily)
  ) {
    return { ...withConfidence, decision: 'approved' };
  }

  if (
    withConfidence.is_suitable &&
    withConfidence.score_10 >= 7 &&
    withConfidence.confidence >= 0.7 &&
    metrics.pancakeLike &&
    metrics.reviewSignalStrong &&
    (metrics.keywordCount >= 3 || metrics.mentionsFamily)
  ) {
    return { ...withConfidence, decision: 'approved' };
  }

  if (!withConfidence.is_suitable || withConfidence.score_10 <= 4) {
    return { ...withConfidence, decision: 'rejected' };
  }

  return { ...withConfidence, decision: 'needs_review' };
}

function buildPrompt(candidate) {
  const evidence = candidate.enriched_signals || {};

  return [
    'Beoordeel deze Nederlandse horecalocatie voor ouders met peuters/kleuters.',
    'Geef ALLEEN geldige JSON met exact deze velden:',
    '{is_suitable:boolean,score_10:int(0-10),confidence:number(0-1),decision:"approved|rejected|needs_review",reason_short:string,reasons:string[],risk_flags:string[],derived_fields:{has_kids_menu:boolean|null,has_play_area:boolean|null,has_high_chairs:boolean|null,has_diaper_changing:boolean|null,play_area_quality:"none|basic|significant"|null,weather:"indoor|outdoor|both|hybrid"|null,description:string|null,toddler_highlight:string|null,is_pancake_restaurant:boolean|null}}',
    '',
    `Naam: ${candidate.name || ''}`,
    `Amenity: ${candidate.amenity || ''}`,
    `Cuisine: ${candidate.cuisine || ''}`,
    `Adres: ${[candidate.address, candidate.city, candidate.region_root].filter(Boolean).join(', ')}`,
    `Website: ${candidate.website || ''}`,
    `Signalen: ${JSON.stringify(evidence)}`,
    '',
    'Regels:',
    '- Score 0-10.',
    '- Confidence 0-1.',
    '- approved alleen als bewijs sterk is voor peuters/kleuters.',
    '- Ontbreken van 1 faciliteit is niet automatisch afkeur.',
    '- Bij onvoldoende bewijs: needs_review.',
    '- Max 5 reasons, kort en feitelijk.',
  ].join('\n');
}

async function callClaudeCLI({ model, prompt, timeoutMs }) {
  // Verwijder CLAUDECODE uit child env — anders blokkeert Claude Code nested spawns
  const childEnv = { ...process.env };
  delete childEnv.CLAUDECODE;

  return await new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '--model', model,
      '--output-format', 'text',
      '-p', prompt,
    ], { env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    const killTimer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(killTimer);
      if (code === 0) return resolve(extractJsonObject(stdout));
      reject(new Error(`claude exited ${code}: ${stderr.slice(0, 600)} stdout: ${stdout.slice(0, 300)}`));
    });
  });
}

async function callCodexCLI({ model, prompt, timeoutMs }) {
  if (model.startsWith('claude-')) {
    return callClaudeCLI({ model, prompt, timeoutMs });
  }

  const outFile = path.join(os.tmpdir(), `codex_last_message_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  const args = [
    'exec',
    '-c',
    'model_reasoning_effort="low"',
    '--model',
    model,
    '--output-last-message',
    outFile,
    '-',
  ];
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('codex', args, {
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';
      let stdout = '';
      const killTimer = setTimeout(() => {
        child.kill('SIGTERM');
      }, timeoutMs);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(killTimer);
        if (code === 0) return resolve();
        const err = new Error(`codex exec exited with code ${code}: ${stderr.slice(0, 600)} ${stdout.slice(0, 300)}`);
        reject(err);
      });

      child.stdin.write(prompt);
      child.stdin.end();
    });
    const content = fs.readFileSync(outFile, 'utf8');
    return extractJsonObject(content);
  } finally {
    try { fs.unlinkSync(outFile); } catch (_) {}
  }
}

async function scoreSingleCandidate({ db, candidate, model, timeoutMs }) {
  let normalized;

  try {
    const raw = await callCodexCLI({ model, prompt: buildPrompt(candidate), timeoutMs });
    normalized = validateAndNormalize(raw);
  } catch (err) {
    normalized = {
      is_suitable: false,
      score_10: 0,
      confidence: 0,
      decision: 'needs_review',
      reason_short: `Codex scoring error: ${err.message}`.slice(0, 280),
      reasons: ['Model output kon niet betrouwbaar verwerkt worden'],
      risk_flags: ['parse_or_model_error'],
      derived_fields: {
        has_kids_menu: null,
        has_play_area: null,
        has_high_chairs: null,
        has_diaper_changing: null,
        play_area_quality: null,
        weather: null,
        description: null,
        toddler_highlight: null,
        is_pancake_restaurant: null,
      },
    };
  }

  const finalReview = decide(normalized, candidate);

  await db.insertReview({
    candidate_id: candidate.id,
    existing_location_id: candidate.existing_location_id || null,
    model,
    prompt_version: SCORING_PROMPT_VERSION,
    score_10: finalReview.score_10,
    confidence: finalReview.confidence,
    is_suitable: finalReview.is_suitable,
    decision: finalReview.decision,
    reason_short: finalReview.reason_short,
    reasons_json: finalReview.reasons,
    risk_flags: finalReview.risk_flags,
    derived_fields: finalReview.derived_fields,
    raw_json: finalReview,
  });

  await db.patchCandidate(candidate.id, {
    status: finalReview.decision,
    last_error: finalReview.decision === 'needs_review' && finalReview.risk_flags.includes('parse_or_model_error')
      ? finalReview.reason_short
      : null,
  });

  return finalReview;
}

async function scoreCandidatesViaCodex({ db, candidates, model }) {
  const chosenModel = model || DEFAULT_MODEL;
  if (!chosenModel.startsWith('claude-') && chosenModel !== 'gpt-5.1-codex-mini') {
    throw new Error(`Unsupported model: ${chosenModel}`);
  }

  if (!candidates.length) {
    return {
      reviews: [],
      summary: { total: 0, approved: 0, rejected: 0, needs_review: 0 },
    };
  }

  const scoreConcurrency = Number(process.env.PIPELINE_SCORE_CONCURRENCY || '20');
  const timeoutMs = Number(process.env.PIPELINE_SCORE_TIMEOUT_MS || '120000');

  const reviews = await mapLimit(candidates, scoreConcurrency, async (candidate) =>
    scoreSingleCandidate({ db, candidate, model: chosenModel, timeoutMs })
  );

  const summary = {
    total: reviews.length,
    approved: reviews.filter((r) => r.decision === 'approved').length,
    rejected: reviews.filter((r) => r.decision === 'rejected').length,
    needs_review: reviews.filter((r) => r.decision === 'needs_review').length,
  };

  return { reviews, summary };
}

module.exports = {
  scoreCandidatesViaCodex,
};
