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

function buildPrompt(candidate, { webSearch = false } = {}) {
  const evidence = candidate.enriched_signals || {};

  const lines = [
    'Beoordeel deze Nederlandse locatie voor ouders met peuters/kleuters.',
  ];

  if (webSearch) {
    lines.push(
      'BELANGRIJK: Zoek op het web naar reviews en informatie over deze locatie.',
      `Zoek naar: "${candidate.name} ${candidate.city || candidate.region_root || ''} reviews kinderen" en "${candidate.name} kindvriendelijk speelhoek".`,
      'Lees Google reviews, blogs, de website, en ouderforums. Baseer je beoordeling op echte bronnen.',
    );
  }

  lines.push(
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
  );

  return lines.join('\n');
}

async function callAnthropicAPI({ model, prompt, timeoutMs }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY niet gevonden in environment');

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Anthropic API timeout (deadline bereikt)');

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
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        const retryAfter = Number(res.headers.get('retry-after') || '0');
        const waitMs = Math.max(retryAfter * 1000, Math.min(2000 * Math.pow(2, attempt), 30000));
        attempt++;
        if (Date.now() + waitMs > deadline) throw new Error(`Anthropic rate limit, geen tijd meer om te wachten`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 400)}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      return extractJsonObject(text);
    } finally {
      clearTimeout(killTimer);
    }
  }
}

async function callXAI({ model, prompt, timeoutMs, webSearch = false }) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY niet gevonden in environment');

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('xAI API timeout (deadline bereikt)');

    const controller = new AbortController();
    const killTimer = setTimeout(() => controller.abort(), remaining);

    try {
      const body = {
        model,
        input: [
          { role: 'system', content: 'Je bent een strenge data-annotator voor kindvriendelijke locaties in Nederland. Geef alleen valide JSON conform de gevraagde structuur.' },
          { role: 'user', content: prompt },
        ],
      };

      // Enable web search tool — Grok zoekt dan zelf reviews, websites etc.
      if (webSearch) {
        body.tools = [{ type: 'web_search' }];
      }

      const res = await fetch('https://api.x.ai/v1/responses', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        attempt++;
        if (Date.now() + waitMs > deadline) throw new Error('xAI rate limit, geen tijd meer');
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`xAI API ${res.status}: ${text.slice(0, 400)}`);
      }

      const data = await res.json();

      // responses API: output_text of output[].content[].text
      let outputText = data?.output_text || '';
      if (!outputText && Array.isArray(data?.output)) {
        for (const item of data.output) {
          if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
          for (const chunk of item.content) {
            if (chunk?.type === 'output_text' && chunk.text) outputText += chunk.text;
          }
        }
      }

      return extractJsonObject(outputText);
    } finally {
      clearTimeout(killTimer);
    }
  }
}

async function callCodexCLI({ model, prompt, timeoutMs, webSearch = false }) {
  if (model.startsWith('claude-')) {
    return callAnthropicAPI({ model, prompt, timeoutMs });
  }
  if (model.startsWith('grok-')) {
    return callXAI({ model, prompt, timeoutMs, webSearch });
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

async function scoreSingleCandidate({ db, candidate, model, timeoutMs, webSearch = false }) {
  let normalized;

  try {
    const raw = await callCodexCLI({
      model,
      prompt: buildPrompt(candidate, { webSearch }),
      timeoutMs,
      webSearch,
    });
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

async function scoreCandidatesViaCodex({ db, candidates, model, webSearch = false }) {
  const chosenModel = model || DEFAULT_MODEL;
  if (!chosenModel.startsWith('claude-') && !chosenModel.startsWith('grok-') && chosenModel !== 'gpt-5.1-codex-mini') {
    throw new Error(`Unsupported model: ${chosenModel}. Supported: claude-*, grok-*, gpt-5.1-codex-mini`);
  }

  if (webSearch && !chosenModel.startsWith('grok-')) {
    console.warn(`Warning: --web-search is alleen beschikbaar voor grok-* modellen, wordt genegeerd voor ${chosenModel}`);
  }

  if (!candidates.length) {
    return {
      reviews: [],
      summary: { total: 0, approved: 0, rejected: 0, needs_review: 0 },
    };
  }

  const useWebSearch = webSearch && chosenModel.startsWith('grok-');
  // Lagere concurrency bij web search — elke call duurt langer
  const defaultConcurrency = useWebSearch ? '5' : '20';
  const scoreConcurrency = Number(process.env.PIPELINE_SCORE_CONCURRENCY || defaultConcurrency);
  const defaultTimeout = useWebSearch ? '180000' : '120000';
  const timeoutMs = Number(process.env.PIPELINE_SCORE_TIMEOUT_MS || defaultTimeout);

  if (useWebSearch) {
    console.log(`Web search enabled — Grok zoekt reviews, blogs en websites per kandidaat`);
  }

  const reviews = await mapLimit(candidates, scoreConcurrency, async (candidate) =>
    scoreSingleCandidate({ db, candidate, model: chosenModel, timeoutMs, webSearch: useWebSearch })
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
