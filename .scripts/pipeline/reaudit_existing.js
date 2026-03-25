const { buildSourceFingerprint } = require('./config');
const { enrichCandidates } = require('./enrich_sources');
const { scoreCandidates } = require('./score_workers_openai');

function aiPatchFromReview(review, model) {
  return {
    ai_suitability_score_10: review.score_10,
    ai_suitability_confidence: review.confidence,
    ai_reviewed_at: new Date().toISOString(),
    ai_review_model: model,
    ai_review_version: review.prompt_version || 'v1',
    ai_review_status: review.decision,
  };
}

function latestByCandidate(rows) {
  const out = new Map();
  for (const row of rows) {
    if (!row?.candidate_id) continue;
    if (!out.has(row.candidate_id)) out.set(row.candidate_id, row);
  }
  return out;
}

async function seedReauditCandidates({ db, runId, regionRoot }) {
  const existing = await db.getLocationsByRegion(regionRoot, ['horeca', 'pancake']);

  const rows = existing.map((loc) => ({
    run_id: runId,
    existing_location_id: loc.id,
    region_root: regionRoot,
    region_source: regionRoot,
    source: 'osm',
    source_id: `location:${loc.id}`,
    source_fingerprint: buildSourceFingerprint(['reaudit', runId, loc.id]),
    status: 'new',
    name: loc.name,
    amenity: loc.type === 'pancake' ? 'restaurant' : 'horeca',
    cuisine: null,
    address: null,
    city: null,
    website: loc.website,
    phone: null,
    lat: loc.lat,
    lng: loc.lng,
    osm_id: null,
    osm_type: null,
    raw_payload: {
      from_location: true,
      location_id: loc.id,
      location_type: loc.type,
      existing_ai: {
        score: loc.ai_suitability_score_10,
        confidence: loc.ai_suitability_confidence,
        status: loc.ai_review_status,
      },
    },
  }));

  const inserted = await db.upsertCandidates(rows);
  return { existing, candidates: inserted };
}

async function applyReauditToLocations({ db, candidates, model }) {
  const reviewRows = await db.getReviewsByCandidateIds(candidates.map((c) => c.id));
  const reviewByCandidate = latestByCandidate(reviewRows);

  const summary = {
    reviewed: candidates.length,
    approved: 0,
    rejected: 0,
    needs_review: 0,
    updated_locations: 0,
    suggestions: [],
  };

  for (const candidate of candidates) {
    const review = reviewByCandidate.get(candidate.id);
    if (!review) continue;

    if (review.decision === 'approved') summary.approved += 1;
    else if (review.decision === 'rejected') summary.rejected += 1;
    else summary.needs_review += 1;

    if (review.decision === 'needs_review') {
      summary.suggestions.push({
        location_id: candidate.existing_location_id,
        name: candidate.name,
        reason: review.reason_short,
      });
    }

    if (candidate.existing_location_id) {
      await db.updateLocationAi(candidate.existing_location_id, aiPatchFromReview(review, model));
      summary.updated_locations += 1;
    }
  }

  return summary;
}

async function runReauditExisting({ db, runId, regionRoot, model, dryRun = false, localWorkers = false }) {
  const { candidates } = await seedReauditCandidates({ db, runId, regionRoot });

  if (!candidates.length) {
    return {
      reviewed: 0,
      approved: 0,
      rejected: 0,
      needs_review: 0,
      updated_locations: 0,
      suggestions: [],
    };
  }

  await enrichCandidates({ db, candidates, googleKey: db.env.GOOGLE_MAPS_KEY || null });
  await scoreCandidates({ db, candidates, model, dryRun, localWorkers });

  if (dryRun) {
    return {
      reviewed: candidates.length,
      approved: 0,
      rejected: 0,
      needs_review: candidates.length,
      updated_locations: 0,
      suggestions: [],
    };
  }

  return applyReauditToLocations({ db, candidates, model });
}

module.exports = {
  runReauditExisting,
};
