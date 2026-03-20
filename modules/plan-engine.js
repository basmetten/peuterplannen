/**
 * Plan je dag 2.0 — Scoring & Selection Engine
 *
 * Pure algorithm module. No UI, no DOM.
 * Implements an 8-dimension MCDM scoring algorithm, greedy slot selection,
 * nap-time awareness, and swap logic for the day-planner feature.
 */

import { computePeuterScore } from './scoring.js';

// ─── Constants ───────────────────────────────────────────────────────────────

export const TODDLER_TRAVEL_FACTOR = 1.5;
export const TRANSITION_BUFFER_MIN = 10;

const SPEED_KMH = { fiets: 15, auto: 40, ov: 25, bakfiets: 12 };

// ─── Plan Templates ──────────────────────────────────────────────────────────

export const PLAN_TEMPLATES = {
  ochtend: {
    label: 'Ochtend',
    duration: 3,
    slots: [
      { time: '09:30', energy: 'high', duration: 90, label: 'Ochtend' },
      { time: '11:15', energy: 'moderate', duration: 60, label: 'Late ochtend' }
    ]
  },
  halve_dag: {
    label: 'Halve dag',
    duration: 4,
    slots: [
      { time: '09:30', energy: 'high', duration: 90, label: 'Ochtend' },
      { time: '11:30', energy: 'moderate', duration: 45, label: 'Lunch', type: 'lunch' },
      { time: '13:00', energy: 'moderate', duration: 90, label: 'Middag' }
    ]
  },
  hele_dag: {
    label: 'Hele dag',
    duration: 7,
    slots: [
      { time: '09:30', energy: 'high', duration: 90, label: 'Ochtend' },
      { time: '11:30', energy: 'moderate', duration: 45, label: 'Lunch', type: 'lunch' },
      { time: '14:30', energy: 'moderate', duration: 60, label: 'Middag' },
      { time: '16:00', energy: 'calm', duration: 60, label: 'Late middag' }
    ],
    napBlock: { start: '12:30', end: '14:30', ageMax: 3 }
  },
  een_locatie: {
    label: 'Eén locatie',
    duration: 2,
    slots: [
      { time: 'nu', energy: 'any', duration: 120, label: 'Nu' }
    ]
  }
};

// ─── Private Helpers ─────────────────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTravelMinutes(location, fromPoint, transport) {
  if (!location.lat || !location.lng || !fromPoint?.lat || !fromPoint?.lng) return 30;
  const distKm = haversineDistance(fromPoint.lat, fromPoint.lng, location.lat, location.lng);
  const speed = SPEED_KMH[transport] || 40;
  const mins = Math.round((distKm / speed) * 60);
  return transport === 'ov' ? mins + 10 : mins;
}

function estimateEnergy(location) {
  if (location.noise_level === 'loud' || location.play_corner_quality === 'strong') return 'active';
  if (location.noise_level === 'quiet') return 'calm';
  if (location.type === 'play' || location.type === 'swim' || location.type === 'nature') return 'active';
  if (location.type === 'museum') return 'calm';
  return 'moderate';
}

function energyToNum(level) {
  return { calm: 1, moderate: 2, active: 3 }[level] || 2;
}

// ─── Nap Block ───────────────────────────────────────────────────────────────

/**
 * Returns a nap/rest block based on the youngest child's age.
 * @param {number[]} childAges - Array of child ages in years
 * @returns {{ start: string, end: string, label: string } | null}
 */
export function getNapBlock(childAges) {
  const youngest = Math.min(...childAges);
  if (youngest <= 2) return { start: '12:30', end: '14:30', label: 'Dutjestijd' };
  if (youngest <= 3) return { start: '13:00', end: '15:00', label: 'Rustig moment' };
  return null;
}

// ─── 8-Dimension MCDM Scoring ────────────────────────────────────────────────

/**
 * Scores a single location against a planning context using 8 weighted dimensions.
 *
 * @param {object} location  - Location record from Supabase
 * @param {object} context   - Planning context
 * @param {number[]} context.childAges      - Ages of children (years)
 * @param {string}   context.transport      - 'fiets' | 'auto' | 'ov' | 'bakfiets'
 * @param {string}   context.weather        - 'rain' | 'sun' | 'cloudy'
 * @param {object[]} context.existingPlan   - Already-selected locations in the plan
 * @param {{ lat: number, lng: number }} context.userLocation - Starting point
 * @param {string}   context.targetEnergy   - 'calm' | 'moderate' | 'active'
 * @returns {number} Score between 0 and 100
 */
export function scorePlanLocation(location, context) {
  let score = 0;
  const minAge = Math.min(...context.childAges);

  // DIMENSION 1: Age match (0-20 points)
  const ageCenter = ((location.min_age || 0) + (location.max_age || 6)) / 2;
  const ageRange = ((location.max_age || 6) - (location.min_age || 0));
  const ageDiff = Math.abs(minAge - ageCenter);
  if (ageDiff <= ageRange / 2) score += 20;
  else if (ageDiff <= ageRange) score += 12;
  else if (ageDiff <= ageRange + 1) score += 5;

  // DIMENSION 2: Travel time (0 to -40 points)
  const travelMinutes = estimateTravelMinutes(location, context.userLocation, context.transport);
  if (travelMinutes <= 15) score += 15;
  else score += Math.max(-40, 15 - ((travelMinutes - 15) / 5) * 10);

  // DIMENSION 3: Convenience (0-20 points)
  if (location.buggy_friendliness === 'easy') score += 5;
  if (location.toilet_confidence === 'high') score += 4;
  if (location.shade_or_shelter === 'good') score += 3;
  if (location.parking_ease === 'easy' && context.transport === 'auto') score += 4;
  if (location.food_fit === 'full') score += 4;
  else if (location.food_fit === 'snacks') score += 2;

  // DIMENSION 4: Peuterscore (0-20 points)
  score += (computePeuterScore(location) || 5) * 2;

  // DIMENSION 5: Weather fit (0-15 points)
  if (context.weather === 'rain') {
    if (location.rain_backup_quality === 'strong') score += 15;
    else if (location.rain_backup_quality === 'weak') score += 5;
    else if (['indoor', 'hybrid', 'both'].includes(location.weather)) score += 12;
  } else {
    if (['outdoor', 'both'].includes(location.weather)) score += 10;
    if (location.shade_or_shelter === 'good') score += 5;
  }

  // DIMENSION 6: Category variety (-20 to +10 points)
  const typesInPlan = (context.existingPlan || []).map(p => p.type);
  if (!typesInPlan.includes(location.type)) score += 10;
  else score -= 20;

  // DIMENSION 7: Energy level fit (0-10 points)
  const locEnergy = estimateEnergy(location);
  const targetEnergy = context.targetEnergy || 'moderate';
  if (targetEnergy === locEnergy) score += 10;
  else if (Math.abs(energyToNum(targetEnergy) - energyToNum(locEnergy)) === 1) score += 5;

  // DIMENSION 8: Serendipity (0-5 points)
  score += Math.random() * 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Greedy Selection ────────────────────────────────────────────────────────

/**
 * Fills a plan template by greedily assigning the best-scoring location to each slot.
 *
 * @param {string}   templateKey - Key into PLAN_TEMPLATES
 * @param {object[]} candidates  - Array of location records
 * @param {object}   context     - Planning context (see scorePlanLocation)
 * @returns {object[]} Array of plan stops, each with location, slot info, score
 */
export function selectLocations(templateKey, candidates, context) {
  const template = PLAN_TEMPLATES[templateKey];
  if (!template) return [];

  const plan = [];
  let remaining = [...candidates];
  const napBlock = getNapBlock(context.childAges);

  for (const slot of template.slots) {
    // For lunch slots, prefer horeca/pancake types
    let slotCandidates = remaining;
    if (slot.type === 'lunch') {
      const horecaCandidates = remaining.filter(l => l.type === 'horeca' || l.type === 'pancake');
      if (horecaCandidates.length > 0) slotCandidates = horecaCandidates;
    }

    // Score all candidates for this slot
    const scored = slotCandidates.map(loc => ({
      location: loc,
      score: scorePlanLocation(loc, {
        ...context,
        existingPlan: plan.map(p => p.location),
        targetEnergy: slot.energy
      })
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored.find(s => s.score >= 30);
    if (best) {
      plan.push({
        location: best.location,
        slotTime: slot.time,
        slotDuration: slot.duration,
        slotLabel: slot.label,
        matchScore: best.score,
        matchLabel: best.score >= 75 ? 'Top keuze' : best.score >= 50 ? 'Goede optie' : 'Leuk alternatief',
        matchTone: best.score >= 75 ? 'top' : best.score >= 50 ? 'good' : 'alt'
      });

      // Remove from candidates (no repeats)
      remaining = remaining.filter(c => c.id !== best.location.id);
    }
  }

  // Add nap block if applicable
  if (napBlock && templateKey === 'hele_dag') {
    plan.napBlock = napBlock;
  }

  // Calculate travel times between stops
  for (let i = 0; i < plan.length; i++) {
    if (i === 0 && context.userLocation) {
      plan[i].travelFromPrev = estimateTravelMinutes(plan[i].location, context.userLocation, context.transport);
    } else if (i > 0) {
      plan[i].travelFromPrev = estimateTravelMinutes(plan[i].location, plan[i - 1].location, context.transport);
    }
    // Add toddler buffer
    if (plan[i].travelFromPrev) {
      plan[i].travelFromPrev = Math.round(plan[i].travelFromPrev * TODDLER_TRAVEL_FACTOR) + TRANSITION_BUFFER_MIN;
    }
  }

  return plan;
}

// ─── Slot Swap ───────────────────────────────────────────────────────────────

/**
 * Replaces one slot in an existing plan with the next-best alternative.
 *
 * @param {object[]} plan        - Current plan array from selectLocations
 * @param {number}   slotIndex   - Index of the slot to swap
 * @param {object[]} candidates  - Full candidate pool
 * @param {object}   context     - Planning context (must include templateKey)
 * @returns {object[]} New plan array with the swapped slot
 */
export function swapPlanSlot(plan, slotIndex, candidates, context) {
  const usedIds = plan.map(p => p.location.id);
  const available = candidates.filter(c => !usedIds.includes(c.id));

  const slot = PLAN_TEMPLATES[context.templateKey]?.slots[slotIndex];
  if (!slot) return plan;

  const scored = available.map(loc => ({
    location: loc,
    score: scorePlanLocation(loc, {
      ...context,
      existingPlan: plan.filter((_, i) => i !== slotIndex).map(p => p.location),
      targetEnergy: slot.energy
    })
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return plan;

  const newPlan = [...plan];
  newPlan[slotIndex] = {
    ...newPlan[slotIndex],
    location: best.location,
    matchScore: best.score,
    matchLabel: best.score >= 75 ? 'Top keuze' : best.score >= 50 ? 'Goede optie' : 'Leuk alternatief',
    matchTone: best.score >= 75 ? 'top' : best.score >= 50 ? 'good' : 'alt'
  };

  return newPlan;
}
