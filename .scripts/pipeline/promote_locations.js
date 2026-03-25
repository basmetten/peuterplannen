const {
  hasHardRejectSignal,
  normalizeName,
  haversineMeters,
} = require('./config');

function latestReviewMap(reviews) {
  const out = new Map();
  for (const row of reviews) {
    if (!row?.candidate_id) continue;
    if (!out.has(row.candidate_id)) out.set(row.candidate_id, row);
  }
  return out;
}

function normalizeWeather(value) {
  if (!value) return 'indoor';
  if (value === 'hybrid') return 'both';
  if (['indoor', 'outdoor', 'both'].includes(value)) return value;
  return 'indoor';
}

function inferType(candidate, review) {
  if (review?.derived_fields?.is_pancake_restaurant === true) return 'pancake';
  if (/pannenkoek|pancake/i.test(candidate.name || '')) return 'pancake';
  return 'horeca';
}

function findNameGeoDuplicate(existingRows, candidate) {
  if (!candidate.name) return null;
  const cName = normalizeName(candidate.name);
  if (!cName) return null;

  for (const row of existingRows) {
    if (normalizeName(row.name) !== cName) continue;
    const dist = haversineMeters(candidate.lat, candidate.lng, Number(row.lat), Number(row.lng));
    if (dist <= 120) return row;
  }

  return null;
}

function buildAiPatch(review, model) {
  return {
    ai_suitability_score_10: review.score_10,
    ai_suitability_confidence: review.confidence,
    ai_reviewed_at: new Date().toISOString(),
    ai_review_model: model,
    ai_review_version: review.prompt_version || 'v1',
    ai_review_status: review.decision,
  };
}

function buildInsertRow({ candidate, review, regionRoot, model }) {
  const signals = candidate.enriched_signals || {};
  const derived = review.derived_fields || {};
  const today = new Date().toISOString().slice(0, 10);

  const description = derived.description
    || candidate.description
    || `${candidate.name} is beoordeeld als geschikte locatie voor ouders met peuters en kleuters.`;

  return {
    name: candidate.name,
    region: regionRoot,
    type: inferType(candidate, review),
    description,
    website: candidate.website || null,
    lat: candidate.lat || null,
    lng: candidate.lng || null,
    coffee: true,
    diaper: derived.has_diaper_changing === true,
    alcohol: candidate.amenity === 'restaurant',
    weather: normalizeWeather(derived.weather || signals.weather),
    toddler_highlight: derived.toddler_highlight || review.reason_short || null,
    place_id: signals.google_place_id || null,
    verification_source: 'osm_ai_pipeline',
    last_verified: today,
    last_verified_at: new Date().toISOString(),
    ...buildAiPatch(review, model),
  };
}

function buildUpdatePatch(existing, candidate, review, model) {
  const derived = review.derived_fields || {};
  const signals = candidate.enriched_signals || {};
  const patch = {
    ...buildAiPatch(review, model),
    verification_source: 'osm_ai_pipeline',
    last_verified: new Date().toISOString().slice(0, 10),
    last_verified_at: new Date().toISOString(),
  };

  if (!existing.place_id && signals.google_place_id) patch.place_id = signals.google_place_id;
  if ((!existing.website || existing.website === '') && candidate.website) patch.website = candidate.website;
  if ((!existing.description || existing.description === '') && derived.description) patch.description = derived.description;
  if ((!existing.toddler_highlight || existing.toddler_highlight === '') && derived.toddler_highlight) {
    patch.toddler_highlight = derived.toddler_highlight;
  }
  if ((existing.lat === null || existing.lat === undefined) && candidate.lat) patch.lat = candidate.lat;
  if ((existing.lng === null || existing.lng === undefined) && candidate.lng) patch.lng = candidate.lng;
  if ((!existing.weather || existing.weather === '') && derived.weather) patch.weather = normalizeWeather(derived.weather);

  return patch;
}

async function promoteCandidates({
  db,
  runId,
  regionRoot,
  model,
  scoreThreshold = 8,
  confidenceThreshold = 0.7,
  dryRun = false,
}) {
  const candidates = await db.getCandidatesByRun(runId, ['approved', 'needs_review', 'rejected']);
  const reviewRows = await db.getReviewsByCandidateIds(candidates.map((c) => c.id));
  const reviewByCandidate = latestReviewMap(reviewRows);

  const existingRows = await db.getLocationsByRegion(regionRoot);
  const existingById = new Map(existingRows.map((row) => [row.id, row]));

  const stats = {
    evaluated: candidates.length,
    promoted: 0,
    inserted: 0,
    updated: 0,
    rejected_gate: 0,
    rejected_hard_filter: 0,
    needs_review: 0,
  };

  for (const candidate of candidates) {
    const review = reviewByCandidate.get(candidate.id);
    if (!review) {
      stats.needs_review += 1;
      if (!dryRun) await db.patchCandidate(candidate.id, { status: 'needs_review', last_error: 'missing_review' });
      continue;
    }

    const hardReject = hasHardRejectSignal(`${candidate.name || ''} ${candidate.amenity || ''}`)
      || Boolean(candidate.enriched_signals?.hard_reject);

    if (hardReject) {
      stats.rejected_hard_filter += 1;
      if (!dryRun) await db.patchCandidate(candidate.id, { status: 'rejected', last_error: 'hard_reject_filter' });
      continue;
    }

    if (review.score_10 < scoreThreshold || Number(review.confidence) < confidenceThreshold || review.decision !== 'approved') {
      stats.rejected_gate += 1;
      if (!dryRun) {
        await db.patchCandidate(candidate.id, {
          status: 'needs_review',
          last_error: `gate_failed(score=${review.score_10},confidence=${review.confidence})`,
        });
      }
      continue;
    }

    let existing = null;
    const placeId = candidate.enriched_signals?.google_place_id;
    if (placeId) {
      existing = await db.findLocationByPlaceId(placeId);
    }
    if (!existing) {
      existing = findNameGeoDuplicate(existingRows, candidate);
    }

    if (dryRun) {
      stats.promoted += 1;
      if (existing) stats.updated += 1;
      else stats.inserted += 1;
      continue;
    }

    if (existing) {
      const patch = buildUpdatePatch(existing, candidate, review, model);
      const updated = await db.patchLocation(existing.id, patch);
      if (updated) existingById.set(updated.id, updated);
      await db.patchCandidate(candidate.id, {
        status: 'promoted',
        existing_location_id: existing.id,
        last_error: null,
      });
      stats.promoted += 1;
      stats.updated += 1;
    } else {
      const row = buildInsertRow({ candidate, review, regionRoot, model });
      const inserted = await db.insertLocation(row);
      if (inserted) {
        existingRows.push(inserted);
        existingById.set(inserted.id, inserted);
      }
      await db.patchCandidate(candidate.id, {
        status: 'promoted',
        existing_location_id: inserted?.id || null,
        last_error: null,
      });
      stats.promoted += 1;
      stats.inserted += 1;
    }
  }

  return stats;
}

module.exports = {
  promoteCandidates,
};
