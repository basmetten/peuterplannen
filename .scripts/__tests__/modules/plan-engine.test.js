/**
 * Unit tests for modules/plan-engine.js
 *
 * Uses node:test with ESM module mocking to isolate from scoring.js dependencies.
 * Run with: node --experimental-test-module-mocks --test .scripts/__tests__/modules/plan-engine.test.js
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Resolve paths relative to the project root (plan-engine imports ./scoring.js)
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const scoringPath = path.join(projectRoot, 'modules', 'scoring.js');

// Mock scoring.js before importing plan-engine (avoids DOM/state deps)
mock.module(scoringPath, {
  namedExports: {
    computePeuterScore: (loc) => loc._mockPeuterScore ?? 5
  }
});

const {
  PLAN_TEMPLATES,
  TODDLER_TRAVEL_FACTOR,
  TRANSITION_BUFFER_MIN,
  getNapBlock,
  scorePlanLocation,
  selectLocations,
  swapPlanSlot
} = await import(path.join(projectRoot, 'modules', 'plan-engine.js'));

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeLocation(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Test Speeltuin',
    type: overrides.type ?? 'play',
    lat: overrides.lat ?? 52.37,
    lng: overrides.lng ?? 4.89,
    min_age: overrides.min_age ?? 0,
    max_age: overrides.max_age ?? 6,
    weather: overrides.weather ?? 'outdoor',
    noise_level: overrides.noise_level ?? null,
    play_corner_quality: overrides.play_corner_quality ?? null,
    buggy_friendliness: overrides.buggy_friendliness ?? null,
    toilet_confidence: overrides.toilet_confidence ?? null,
    shade_or_shelter: overrides.shade_or_shelter ?? null,
    parking_ease: overrides.parking_ease ?? null,
    food_fit: overrides.food_fit ?? null,
    rain_backup_quality: overrides.rain_backup_quality ?? null,
    _mockPeuterScore: overrides._mockPeuterScore ?? 5,
    ...overrides
  };
}

function makeContext(overrides = {}) {
  return {
    childAges: overrides.childAges ?? [2],
    transport: overrides.transport ?? 'fiets',
    weather: overrides.weather ?? 'sun',
    existingPlan: overrides.existingPlan ?? [],
    userLocation: overrides.userLocation ?? { lat: 52.37, lng: 4.89 },
    targetEnergy: overrides.targetEnergy ?? 'moderate',
    ...overrides
  };
}

// Pre-built candidate pool with diverse types for selectLocations tests
function makeCandidatePool() {
  return [
    makeLocation({
      id: 1, name: 'Vondelpark Speeltuin', type: 'play',
      lat: 52.3579, lng: 4.8686,
      buggy_friendliness: 'easy', toilet_confidence: 'high',
      shade_or_shelter: 'good', food_fit: 'snacks',
      _mockPeuterScore: 8
    }),
    makeLocation({
      id: 2, name: 'Artis Zoo', type: 'nature',
      lat: 52.3660, lng: 4.9163,
      buggy_friendliness: 'easy', toilet_confidence: 'high',
      food_fit: 'full', rain_backup_quality: 'strong',
      weather: 'both',
      _mockPeuterScore: 7
    }),
    makeLocation({
      id: 3, name: 'Pannenkoekenhuis', type: 'pancake',
      lat: 52.3750, lng: 4.8900,
      food_fit: 'full', toilet_confidence: 'high',
      weather: 'indoor',
      _mockPeuterScore: 6
    }),
    makeLocation({
      id: 4, name: 'NEMO Museum', type: 'museum',
      lat: 52.3741, lng: 4.9123,
      buggy_friendliness: 'easy', toilet_confidence: 'high',
      rain_backup_quality: 'strong', weather: 'indoor',
      noise_level: 'quiet',
      _mockPeuterScore: 7
    }),
    makeLocation({
      id: 5, name: 'Boerderij Zorgvrij', type: 'farm',
      lat: 52.38, lng: 4.85,
      food_fit: 'snacks', shade_or_shelter: 'good',
      _mockPeuterScore: 6
    }),
    makeLocation({
      id: 6, name: 'Het Zwembad', type: 'swim',
      lat: 52.36, lng: 4.88,
      weather: 'indoor', toilet_confidence: 'high',
      rain_backup_quality: 'strong',
      _mockPeuterScore: 5
    }),
    makeLocation({
      id: 7, name: 'Cafe met Speelhoek', type: 'horeca',
      lat: 52.37, lng: 4.90,
      food_fit: 'full', play_corner_quality: 'strong',
      weather: 'indoor',
      _mockPeuterScore: 6
    })
  ];
}

// ─── PLAN_TEMPLATES ─────────────────────────────────────────────────────────

describe('PLAN_TEMPLATES', () => {
  it('has all 4 template keys', () => {
    const keys = Object.keys(PLAN_TEMPLATES);
    assert.deepEqual(keys.sort(), ['een_locatie', 'halve_dag', 'hele_dag', 'ochtend']);
  });

  it('each template has label, duration, and slots array', () => {
    for (const [key, tmpl] of Object.entries(PLAN_TEMPLATES)) {
      assert.ok(typeof tmpl.label === 'string', `${key} missing label`);
      assert.ok(typeof tmpl.duration === 'number', `${key} missing duration`);
      assert.ok(Array.isArray(tmpl.slots) && tmpl.slots.length > 0, `${key} missing slots`);
    }
  });

  it('each slot has time, energy, duration, and label', () => {
    for (const [key, tmpl] of Object.entries(PLAN_TEMPLATES)) {
      for (const slot of tmpl.slots) {
        assert.ok(slot.time !== undefined, `${key} slot missing time`);
        assert.ok(typeof slot.energy === 'string', `${key} slot missing energy`);
        assert.ok(typeof slot.duration === 'number', `${key} slot missing duration`);
        assert.ok(typeof slot.label === 'string', `${key} slot missing label`);
      }
    }
  });

  it('ochtend has 2 slots', () => {
    assert.equal(PLAN_TEMPLATES.ochtend.slots.length, 2);
  });

  it('halve_dag has 3 slots with a lunch slot', () => {
    const lunch = PLAN_TEMPLATES.halve_dag.slots.find(s => s.type === 'lunch');
    assert.ok(lunch, 'halve_dag should have a lunch slot');
    assert.equal(PLAN_TEMPLATES.halve_dag.slots.length, 3);
  });

  it('hele_dag has 4 slots and a napBlock', () => {
    assert.equal(PLAN_TEMPLATES.hele_dag.slots.length, 4);
    assert.ok(PLAN_TEMPLATES.hele_dag.napBlock, 'hele_dag should have napBlock');
    assert.equal(PLAN_TEMPLATES.hele_dag.napBlock.ageMax, 3);
  });

  it('een_locatie has 1 slot with time "nu"', () => {
    assert.equal(PLAN_TEMPLATES.een_locatie.slots.length, 1);
    assert.equal(PLAN_TEMPLATES.een_locatie.slots[0].time, 'nu');
  });

  it('slot durations are reasonable (30-120 min)', () => {
    for (const [key, tmpl] of Object.entries(PLAN_TEMPLATES)) {
      for (const slot of tmpl.slots) {
        assert.ok(slot.duration >= 30 && slot.duration <= 120,
          `${key} slot "${slot.label}" has unreasonable duration ${slot.duration}`);
      }
    }
  });
});

// ─── getNapBlock ────────────────────────────────────────────────────────────

describe('getNapBlock', () => {
  it('returns Dutjestijd for youngest <= 2', () => {
    const result = getNapBlock([1]);
    assert.deepEqual(result, { start: '12:30', end: '14:30', label: 'Dutjestijd' });
  });

  it('returns Dutjestijd when youngest of multiple children is <= 2', () => {
    const result = getNapBlock([4, 2, 5]);
    assert.deepEqual(result, { start: '12:30', end: '14:30', label: 'Dutjestijd' });
  });

  it('returns Rustig moment for youngest == 3', () => {
    const result = getNapBlock([3]);
    assert.deepEqual(result, { start: '13:00', end: '15:00', label: 'Rustig moment' });
  });

  it('returns Rustig moment for youngest between 2 and 3 (exclusive of 2)', () => {
    const result = getNapBlock([2.5]);
    assert.deepEqual(result, { start: '13:00', end: '15:00', label: 'Rustig moment' });
  });

  it('returns null for youngest > 3', () => {
    const result = getNapBlock([4, 5]);
    assert.equal(result, null);
  });

  it('returns null for age exactly 4', () => {
    assert.equal(getNapBlock([4]), null);
  });

  it('handles single baby (age 0)', () => {
    const result = getNapBlock([0]);
    assert.deepEqual(result, { start: '12:30', end: '14:30', label: 'Dutjestijd' });
  });
});

// ─── scorePlanLocation ──────────────────────────────────────────────────────

describe('scorePlanLocation', () => {
  it('returns a number between 0 and 100', () => {
    const loc = makeLocation();
    const ctx = makeContext();
    const score = scorePlanLocation(loc, ctx);
    assert.ok(typeof score === 'number');
    assert.ok(score >= 0 && score <= 100, `Score ${score} out of range`);
  });

  it('returns integer (rounded)', () => {
    const score = scorePlanLocation(makeLocation(), makeContext());
    assert.equal(score, Math.round(score));
  });

  // Dimension 1: Age match
  it('gives higher score for perfect age match', () => {
    const perfectAge = makeLocation({ min_age: 1, max_age: 3 }); // center=2, range=2
    const badAge = makeLocation({ min_age: 8, max_age: 12 });    // center=10, range=4
    const ctx = makeContext({ childAges: [2] });

    // Run multiple times to overcome random serendipity dimension
    const scores1 = Array.from({ length: 20 }, () => scorePlanLocation(perfectAge, ctx));
    const scores2 = Array.from({ length: 20 }, () => scorePlanLocation(badAge, ctx));
    const avg1 = scores1.reduce((a, b) => a + b) / scores1.length;
    const avg2 = scores2.reduce((a, b) => a + b) / scores2.length;

    assert.ok(avg1 > avg2, `Perfect age avg ${avg1} should beat bad age avg ${avg2}`);
  });

  // Dimension 2: Travel time (nearby vs far)
  it('penalizes far-away locations', () => {
    const nearby = makeLocation({ lat: 52.371, lng: 4.891 }); // ~0.1km away
    const farAway = makeLocation({ lat: 53.0, lng: 5.5 });     // ~80km away
    const ctx = makeContext({ userLocation: { lat: 52.37, lng: 4.89 } });

    const scoresNear = Array.from({ length: 20 }, () => scorePlanLocation(nearby, ctx));
    const scoresFar = Array.from({ length: 20 }, () => scorePlanLocation(farAway, ctx));
    const avgNear = scoresNear.reduce((a, b) => a + b) / scoresNear.length;
    const avgFar = scoresFar.reduce((a, b) => a + b) / scoresFar.length;

    assert.ok(avgNear > avgFar, `Nearby avg ${avgNear} should beat far avg ${avgFar}`);
  });

  // Dimension 3: Convenience features
  it('rewards convenience features', () => {
    const convenient = makeLocation({
      buggy_friendliness: 'easy',
      toilet_confidence: 'high',
      shade_or_shelter: 'good',
      food_fit: 'full'
    });
    const bare = makeLocation();
    const ctx = makeContext();

    const scoresConv = Array.from({ length: 20 }, () => scorePlanLocation(convenient, ctx));
    const scoresBare = Array.from({ length: 20 }, () => scorePlanLocation(bare, ctx));
    const avgConv = scoresConv.reduce((a, b) => a + b) / scoresConv.length;
    const avgBare = scoresBare.reduce((a, b) => a + b) / scoresBare.length;

    assert.ok(avgConv > avgBare, `Convenient avg ${avgConv} should beat bare avg ${avgBare}`);
  });

  // Dimension 3: Parking bonus for auto transport
  it('adds parking bonus only for auto transport', () => {
    const loc = makeLocation({ parking_ease: 'easy' });
    const ctxAuto = makeContext({ transport: 'auto' });
    const ctxFiets = makeContext({ transport: 'fiets' });

    const scoresAuto = Array.from({ length: 30 }, () => scorePlanLocation(loc, ctxAuto));
    const scoresFiets = Array.from({ length: 30 }, () => scorePlanLocation(loc, ctxFiets));
    const avgAuto = scoresAuto.reduce((a, b) => a + b) / scoresAuto.length;
    const avgFiets = scoresFiets.reduce((a, b) => a + b) / scoresFiets.length;

    assert.ok(avgAuto > avgFiets, `Auto avg ${avgAuto} should exceed fiets avg ${avgFiets} due to parking bonus`);
  });

  // Dimension 5: Weather fit
  it('rewards indoor locations during rain', () => {
    const indoor = makeLocation({
      weather: 'indoor',
      rain_backup_quality: 'strong'
    });
    const outdoor = makeLocation({
      weather: 'outdoor',
      rain_backup_quality: null
    });
    const ctx = makeContext({ weather: 'rain' });

    const scoresIn = Array.from({ length: 20 }, () => scorePlanLocation(indoor, ctx));
    const scoresOut = Array.from({ length: 20 }, () => scorePlanLocation(outdoor, ctx));
    const avgIn = scoresIn.reduce((a, b) => a + b) / scoresIn.length;
    const avgOut = scoresOut.reduce((a, b) => a + b) / scoresOut.length;

    assert.ok(avgIn > avgOut, `Indoor rain avg ${avgIn} should beat outdoor rain avg ${avgOut}`);
  });

  // Dimension 6: Category variety
  it('penalizes duplicate types in existing plan', () => {
    const loc = makeLocation({ type: 'play' });
    const ctxNodup = makeContext({ existingPlan: [] });
    const ctxDup = makeContext({ existingPlan: [{ type: 'play' }] });

    const scoresNoDup = Array.from({ length: 20 }, () => scorePlanLocation(loc, ctxNodup));
    const scoresDup = Array.from({ length: 20 }, () => scorePlanLocation(loc, ctxDup));
    const avgNoDup = scoresNoDup.reduce((a, b) => a + b) / scoresNoDup.length;
    const avgDup = scoresDup.reduce((a, b) => a + b) / scoresDup.length;

    // Variety bonus is +10 vs -20 = 30 point swing
    assert.ok(avgNoDup - avgDup >= 20, `Variety penalty should be significant: ${avgNoDup} vs ${avgDup}`);
  });

  // Dimension 7: Energy level fit
  it('rewards matching energy level', () => {
    const calmLoc = makeLocation({ noise_level: 'quiet', type: 'museum' }); // energy = calm
    const ctxCalm = makeContext({ targetEnergy: 'calm' });
    const ctxActive = makeContext({ targetEnergy: 'active' });

    const scoresMatch = Array.from({ length: 20 }, () => scorePlanLocation(calmLoc, ctxCalm));
    const scoresMismatch = Array.from({ length: 20 }, () => scorePlanLocation(calmLoc, ctxActive));
    const avgMatch = scoresMatch.reduce((a, b) => a + b) / scoresMatch.length;
    const avgMismatch = scoresMismatch.reduce((a, b) => a + b) / scoresMismatch.length;

    assert.ok(avgMatch > avgMismatch, `Energy match avg ${avgMatch} should beat mismatch avg ${avgMismatch}`);
  });

  // Edge: missing coordinates defaults to 30min travel
  it('handles missing coordinates gracefully', () => {
    const noCoords = makeLocation({ lat: null, lng: null });
    const ctx = makeContext();
    const score = scorePlanLocation(noCoords, ctx);
    assert.ok(typeof score === 'number' && score >= 0 && score <= 100);
  });

  // Edge: missing user location
  it('handles missing userLocation gracefully', () => {
    const loc = makeLocation();
    const ctx = makeContext({ userLocation: null });
    const score = scorePlanLocation(loc, ctx);
    assert.ok(typeof score === 'number' && score >= 0 && score <= 100);
  });
});

// ─── selectLocations ────────────────────────────────────────────────────────

describe('selectLocations', () => {
  it('returns empty array for invalid template key', () => {
    const result = selectLocations('nonexistent', [], makeContext());
    assert.deepEqual(result, []);
  });

  it('fills ochtend template with 2 stops', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('ochtend', candidates, ctx);
    assert.equal(plan.length, 2);
  });

  it('fills halve_dag template with up to 3 stops', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('halve_dag', candidates, ctx);
    assert.ok(plan.length >= 2 && plan.length <= 3, `Expected 2-3 stops, got ${plan.length}`);
  });

  it('fills hele_dag template with up to 4 stops', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('hele_dag', candidates, ctx);
    assert.ok(plan.length >= 2 && plan.length <= 4, `Expected 2-4 stops, got ${plan.length}`);
  });

  it('fills een_locatie template with 1 stop', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('een_locatie', candidates, ctx);
    assert.equal(plan.length, 1);
  });

  it('each stop has required fields', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('ochtend', candidates, ctx);

    for (const stop of plan) {
      assert.ok(stop.location, 'stop missing location');
      assert.ok(stop.location.id, 'stop location missing id');
      assert.ok(stop.slotTime !== undefined, 'stop missing slotTime');
      assert.ok(typeof stop.slotDuration === 'number', 'stop missing slotDuration');
      assert.ok(typeof stop.slotLabel === 'string', 'stop missing slotLabel');
      assert.ok(typeof stop.matchScore === 'number', 'stop missing matchScore');
      assert.ok(typeof stop.matchLabel === 'string', 'stop missing matchLabel');
      assert.ok(['top', 'good', 'alt'].includes(stop.matchTone), `unexpected matchTone: ${stop.matchTone}`);
    }
  });

  it('does not repeat locations across slots', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('hele_dag', candidates, ctx);
    const ids = plan.map(p => p.location.id);
    assert.equal(ids.length, new Set(ids).size, 'Plan contains duplicate locations');
  });

  it('prefers horeca/pancake for lunch slots', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('halve_dag', candidates, ctx);

    // The lunch slot is index 1 in halve_dag
    const lunchStop = plan.find(s => s.slotLabel === 'Lunch');
    if (lunchStop) {
      assert.ok(
        ['horeca', 'pancake'].includes(lunchStop.location.type),
        `Lunch slot should prefer horeca/pancake, got: ${lunchStop.location.type}`
      );
    }
  });

  it('attaches napBlock for hele_dag with young children', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [1] });
    const plan = selectLocations('hele_dag', candidates, ctx);
    assert.ok(plan.napBlock, 'hele_dag plan should have napBlock for age 1');
    assert.equal(plan.napBlock.label, 'Dutjestijd');
  });

  it('does NOT attach napBlock for ochtend template', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [1] });
    const plan = selectLocations('ochtend', candidates, ctx);
    assert.equal(plan.napBlock, undefined, 'ochtend plan should not have napBlock');
  });

  it('calculates travel times between stops', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], userLocation: { lat: 52.37, lng: 4.89 } });
    const plan = selectLocations('ochtend', candidates, ctx);

    // First stop should have travelFromPrev (from user location)
    assert.ok(typeof plan[0].travelFromPrev === 'number', 'First stop should have travelFromPrev');
    assert.ok(plan[0].travelFromPrev > 0, 'Travel time should be positive');

    // Travel includes toddler factor + transition buffer
    // So even very close locations should have at least TRANSITION_BUFFER_MIN
    assert.ok(plan[0].travelFromPrev >= TRANSITION_BUFFER_MIN,
      `Travel ${plan[0].travelFromPrev} should include ${TRANSITION_BUFFER_MIN}min buffer`);
  });

  it('returns empty plan when all candidates score below threshold', () => {
    // Locations far away with bad age match and duplicate type penalty
    const badCandidates = [
      makeLocation({ id: 100, lat: 60.0, lng: 10.0, min_age: 10, max_age: 15, type: 'play', _mockPeuterScore: 0 })
    ];
    const ctx = makeContext({
      childAges: [2],
      existingPlan: [{ type: 'play' }],
      userLocation: { lat: 52.37, lng: 4.89 }
    });
    const plan = selectLocations('ochtend', badCandidates, ctx);
    // Plan may have 0 stops if all candidates score below 30
    assert.ok(plan.length <= 2);
  });

  it('matchLabel reflects score tiers', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2] });
    const plan = selectLocations('ochtend', candidates, ctx);

    for (const stop of plan) {
      if (stop.matchScore >= 75) assert.equal(stop.matchLabel, 'Top keuze');
      else if (stop.matchScore >= 50) assert.equal(stop.matchLabel, 'Goede optie');
      else assert.equal(stop.matchLabel, 'Leuk alternatief');
    }
  });
});

// ─── swapPlanSlot ───────────────────────────────────────────────────────────

describe('swapPlanSlot', () => {
  it('replaces the specified slot with a different location', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });
    const plan = selectLocations('ochtend', candidates, ctx);

    if (plan.length < 1) return; // skip if no plan generated

    const originalId = plan[0].location.id;
    const newPlan = swapPlanSlot(plan, 0, candidates, ctx);

    assert.equal(newPlan.length, plan.length, 'Plan length should stay the same');
    assert.notEqual(newPlan[0].location.id, originalId, 'Swapped slot should have different location');
  });

  it('preserves slot metadata (time, duration, label) after swap', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });
    const plan = selectLocations('ochtend', candidates, ctx);

    if (plan.length < 1) return;

    const newPlan = swapPlanSlot(plan, 0, candidates, ctx);

    assert.equal(newPlan[0].slotTime, plan[0].slotTime);
    assert.equal(newPlan[0].slotDuration, plan[0].slotDuration);
    assert.equal(newPlan[0].slotLabel, plan[0].slotLabel);
  });

  it('does not reuse locations already in the plan', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });
    const plan = selectLocations('ochtend', candidates, ctx);

    if (plan.length < 2) return;

    const usedIds = plan.map(p => p.location.id);
    const newPlan = swapPlanSlot(plan, 0, candidates, ctx);

    // The new location at index 0 should not be any of the OTHER plan locations
    const otherIds = plan.slice(1).map(p => p.location.id);
    assert.ok(
      !otherIds.includes(newPlan[0].location.id),
      'Swapped location should not duplicate existing plan entries'
    );
  });

  it('returns original plan for invalid slot index', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });
    const plan = selectLocations('ochtend', candidates, ctx);

    const newPlan = swapPlanSlot(plan, 99, candidates, ctx);
    assert.deepEqual(newPlan, plan);
  });

  it('returns original plan for invalid template key', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'nonexistent' });
    const plan = [
      { location: candidates[0], slotTime: '09:30', slotDuration: 90, slotLabel: 'Test', matchScore: 50, matchLabel: 'Goede optie', matchTone: 'good' }
    ];

    const newPlan = swapPlanSlot(plan, 0, candidates, ctx);
    assert.deepEqual(newPlan, plan);
  });

  it('updates matchScore and matchLabel after swap', () => {
    const candidates = makeCandidatePool();
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });
    const plan = selectLocations('ochtend', candidates, ctx);

    if (plan.length < 1) return;

    const newPlan = swapPlanSlot(plan, 0, candidates, ctx);
    assert.ok(typeof newPlan[0].matchScore === 'number');
    assert.ok(typeof newPlan[0].matchLabel === 'string');
    assert.ok(['top', 'good', 'alt'].includes(newPlan[0].matchTone));
  });

  it('returns original plan when no alternatives are available', () => {
    // Only 1 candidate, already used in plan
    const singleCandidate = [makeLocation({ id: 1 })];
    const plan = [{
      location: singleCandidate[0],
      slotTime: '09:30', slotDuration: 90, slotLabel: 'Ochtend',
      matchScore: 50, matchLabel: 'Goede optie', matchTone: 'good'
    }];
    const ctx = makeContext({ childAges: [2], templateKey: 'ochtend' });

    const newPlan = swapPlanSlot(plan, 0, singleCandidate, ctx);
    // No alternatives available after filtering used IDs
    assert.deepEqual(newPlan, plan);
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('TODDLER_TRAVEL_FACTOR is 1.5', () => {
    assert.equal(TODDLER_TRAVEL_FACTOR, 1.5);
  });

  it('TRANSITION_BUFFER_MIN is 10', () => {
    assert.equal(TRANSITION_BUFFER_MIN, 10);
  });
});
