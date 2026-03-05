const {
  DEFAULT_MODEL,
  SCORING_PROMPT_VERSION,
  hasHardRejectSignal,
  mapLimit,
} = require('./config');

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_suitable: { type: 'boolean' },
    score_10: { type: 'integer', minimum: 0, maximum: 10 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    decision: { type: 'string', enum: ['approved', 'rejected', 'needs_review'] },
    reason_short: { type: 'string' },
    reasons: {
      type: 'array',
      maxItems: 5,
      items: { type: 'string' },
    },
    risk_flags: {
      type: 'array',
      items: { type: 'string' },
    },
    derived_fields: {
      type: 'object',
      additionalProperties: false,
      properties: {
        has_kids_menu: { type: ['boolean', 'null'] },
        has_play_area: { type: ['boolean', 'null'] },
        has_high_chairs: { type: ['boolean', 'null'] },
        has_diaper_changing: { type: ['boolean', 'null'] },
        play_area_quality: { type: ['string', 'null'], enum: ['none', 'basic', 'significant', null] },
        weather: { type: ['string', 'null'], enum: ['indoor', 'outdoor', 'both', 'hybrid', null] },
        description: { type: ['string', 'null'] },
        toddler_highlight: { type: ['string', 'null'] },
        is_pancake_restaurant: { type: ['boolean', 'null'] },
      },
      required: [
        'has_kids_menu',
        'has_play_area',
        'has_high_chairs',
        'has_diaper_changing',
        'play_area_quality',
        'weather',
        'description',
        'toddler_highlight',
        'is_pancake_restaurant',
      ],
    },
  },
  required: [
    'is_suitable',
    'score_10',
    'confidence',
    'decision',
    'reason_short',
    'reasons',
    'risk_flags',
    'derived_fields',
  ],
};

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
  const mentionsFamily = Boolean(signals.mentions_family || signals.tripadvisor_mentions_family);

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
    kidFeatures,
    playAreaStrong,
    keywordCount,
    mentionsFamily,
    reviewSignalStrong,
    googleStrong,
    tripStrong,
    pancakeLike,
    familyNameSignal,
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
  const confidenceRaised = confidenceAfter > confidenceBefore + 0.05;
  const withConfidence = {
    ...review,
    confidence: confidenceAfter,
    risk_flags: confidenceRaised
      ? [...new Set([...(review.risk_flags || []), 'confidence_adjusted_from_evidence'])]
      : review.risk_flags,
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
    'Gebruik ALLEEN deze data en geef strikt JSON volgens schema.',
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
    '- Gebruik ook proxi-signalen: familiefocus in naam/omschrijving, speelsignalen, reviews, ratings en volume.',
    '- Ontbreken van 1 faciliteit (zoals verschoonplek) is NIET automatisch afkeur als andere signalen sterk zijn.',
    '- Reviews tellen mee: positief familiesignaal of hoge rating met voldoende reviewvolume.',
    '- Bij onvoldoende bewijs: needs_review i.p.v. approved.',
    '- Houd reasons kort en feitelijk.',
  ].join('\n');
}

async function callOpenAI({ apiKey, model, prompt }) {
  const body = {
    model,
    input: [
      {
        role: 'system',
        content: 'Je bent een strenge data-annotator. Geef alleen valide JSON conform schema.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'location_suitability',
        schema: SCORE_SCHEMA,
        strict: true,
      },
    },
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI responses failed: ${response.status} ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  let outputText = data?.output_text || '';

  if (!outputText && Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
      for (const chunk of item.content) {
        if (chunk?.type === 'output_text' && chunk.text) {
          outputText += chunk.text;
        }
      }
    }
  }

  return extractJsonObject(outputText);
}

function heuristicFallback(candidate) {
  const signals = candidate.enriched_signals || {};
  const keywordCount = Number(signals.keyword_count || 0);
  const googleRating = toNumber(signals.google_rating);
  const googleReviewCount = toNumber(signals.google_review_count);
  const tripRating = toNumber(signals.tripadvisor_rating);
  const tripReviewCount = toNumber(signals.tripadvisor_review_count);
  const isPancake = /pannenkoek|pancake/i.test(candidate.name || '');

  const hasKidsSignals = [
    signals.has_play_area,
    signals.has_kids_menu,
    signals.has_high_chairs,
    signals.has_diaper_changing,
    signals.mentions_family,
  ].filter(Boolean).length;

  let score = 2;
  if (signals.has_play_area) score += 2;
  if (signals.has_kids_menu) score += 2;
  if (signals.has_high_chairs) score += 1;
  if (signals.has_diaper_changing) score += 1;
  if (signals.mentions_family) score += 1;
  if (keywordCount >= 4) score += 2;
  else if (keywordCount >= 2) score += 1;
  if (googleRating !== null && googleRating >= 4.2 && googleReviewCount !== null && googleReviewCount >= 50) score += 1;
  if (tripRating !== null && tripRating >= 4.0 && tripReviewCount !== null && tripReviewCount >= 20) score += 1;
  if (isPancake) score += 1;
  if (signals.hard_reject) score = Math.min(score, 3);
  score = clamp(Math.round(score), 0, 10);

  const confidence = clamp(0.35 + (score * 0.05) + (hasKidsSignals * 0.04), 0.35, 0.9);

  return {
    is_suitable: score >= 7,
    score_10: score,
    confidence,
    decision: 'needs_review',
    reason_short: 'Lokale worker-score op basis van verzamelde signalen.',
    reasons: ['Beoordeeld via lokale evidence-heuristiek'],
    risk_flags: ['local_worker_scoring'],
    derived_fields: {
      has_kids_menu: signals.has_kids_menu ?? null,
      has_play_area: signals.has_play_area ?? null,
      has_high_chairs: signals.has_high_chairs ?? null,
      has_diaper_changing: signals.has_diaper_changing ?? null,
      play_area_quality: signals.has_play_area ? 'basic' : null,
      weather: signals.weather || null,
      description: null,
      toddler_highlight: null,
      is_pancake_restaurant: /pannenkoek|pancake/i.test(candidate.name || ''),
    },
  };
}

async function scoreSingleCandidate({ db, candidate, apiKey, model, dryRun, localWorkers }) {
  let normalized;

  try {
    if (dryRun || localWorkers) {
      normalized = heuristicFallback(candidate);
    } else {
      const raw = await callOpenAI({ apiKey, model, prompt: buildPrompt(candidate) });
      normalized = validateAndNormalize(raw);
    }
  } catch (err) {
    normalized = {
      is_suitable: false,
      score_10: 0,
      confidence: 0,
      decision: 'needs_review',
      reason_short: `Model/parsing error: ${err.message}`.slice(0, 280),
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

async function scoreCandidates({ db, candidates, model, dryRun = false, localWorkers = false }) {
  const chosenModel = model || DEFAULT_MODEL;
  if (chosenModel !== DEFAULT_MODEL) {
    throw new Error(`Unsupported model: ${chosenModel}. Required: ${DEFAULT_MODEL}`);
  }

  if (!candidates.length) {
    return {
      reviews: [],
      summary: { total: 0, approved: 0, rejected: 0, needs_review: 0 },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!dryRun && !localWorkers && !apiKey) {
    throw new Error('OPENAI_API_KEY is required for scoring');
  }

  const scoreConcurrency = Number(process.env.PIPELINE_SCORE_CONCURRENCY || '20');
  const reviews = await mapLimit(candidates, scoreConcurrency, async (candidate) =>
    scoreSingleCandidate({ db, candidate, apiKey, model: chosenModel, dryRun, localWorkers })
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
  scoreCandidates,
};
