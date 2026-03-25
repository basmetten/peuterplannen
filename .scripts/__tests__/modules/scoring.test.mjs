import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import the module under test and its dependency (state is mutable)
import { state } from '../../../modules/state.js';
import {
    computePeuterScore,
    computePeuterScoreV2,
    matchesPreset,
    matchesPresetDistance,
    getPrimaryFitReason,
    getLogisticsReason,
    getComfortReason,
    getDecisionHeadline,
    getCardReasons,
    getCardDecisionSentence,
    getCardQuickFacts,
    getVerificationModeLabel,
    getTrustChips,
    getCompactTrustChip,
    getTrustBullets,
    getPracticalBullets,
    getTopStrengths,
} from '../../../modules/scoring.js';

// --- Helper: base mock location ---
function baseLoc(overrides = {}) {
    return {
        min_age: null, max_age: null,
        diaper: false, coffee: false,
        weather: null, toddler_highlight: null,
        is_featured: false, featured_until: null,
        type: 'play',
        rain_backup_quality: null, buggy_friendliness: null,
        play_corner_quality: null, toilet_confidence: null,
        food_fit: null, price_band: null,
        noise_level: null, shade_or_shelter: null,
        crowd_pattern: null, time_of_day_fit: null,
        description: '', region: null,
        seo_primary_locality: null,
        verification_mode: null, verification_confidence: null,
        last_verified: null,
        ...overrides,
    };
}

// ============================================================
// computePeuterScore (v1) — 0-11 scale
// ============================================================
describe('computePeuterScore', () => {
    it('returns 0 for a bare-minimum location', () => {
        const loc = baseLoc({ min_age: 5 }); // min_age > 2 → no age bonus
        assert.equal(computePeuterScore(loc), 0);
    });

    it('gives 3 points when min_age <= 2', () => {
        assert.equal(computePeuterScore(baseLoc({ min_age: 2 })), 3);
    });

    it('gives 3 points when min_age is null', () => {
        assert.equal(computePeuterScore(baseLoc({ min_age: null })), 3);
    });

    it('gives 3 points for diaper', () => {
        const loc = baseLoc({ min_age: 5, diaper: true });
        assert.equal(computePeuterScore(loc), 3);
    });

    it('gives 1 point for coffee', () => {
        const loc = baseLoc({ min_age: 5, coffee: true });
        assert.equal(computePeuterScore(loc), 1);
    });

    it('gives 2 points for indoor weather', () => {
        const loc = baseLoc({ min_age: 5, weather: 'indoor' });
        assert.equal(computePeuterScore(loc), 2);
    });

    it('gives 2 points for hybrid weather', () => {
        const loc = baseLoc({ min_age: 5, weather: 'hybrid' });
        assert.equal(computePeuterScore(loc), 2);
    });

    it('gives 2 points for both weather', () => {
        const loc = baseLoc({ min_age: 5, weather: 'both' });
        assert.equal(computePeuterScore(loc), 2);
    });

    it('gives 0 for outdoor-only weather', () => {
        const loc = baseLoc({ min_age: 5, weather: 'outdoor' });
        assert.equal(computePeuterScore(loc), 0);
    });

    it('gives 1 point for toddler_highlight', () => {
        const loc = baseLoc({ min_age: 5, toddler_highlight: 'Leuk voor peuters' });
        assert.equal(computePeuterScore(loc), 1);
    });

    it('gives 1 point for active featured', () => {
        const future = new Date(Date.now() + 86400000).toISOString();
        const loc = baseLoc({ min_age: 5, is_featured: true, featured_until: future });
        assert.equal(computePeuterScore(loc), 1);
    });

    it('gives 0 for expired featured', () => {
        const past = new Date(Date.now() - 86400000).toISOString();
        const loc = baseLoc({ min_age: 5, is_featured: true, featured_until: past });
        assert.equal(computePeuterScore(loc), 0);
    });

    it('sums all bonuses to max 11', () => {
        const future = new Date(Date.now() + 86400000).toISOString();
        const loc = baseLoc({
            min_age: 1, diaper: true, coffee: true,
            weather: 'indoor', toddler_highlight: 'Leuk',
            is_featured: true, featured_until: future,
        });
        assert.equal(computePeuterScore(loc), 11); // 3+3+1+2+1+1
    });
});

// ============================================================
// matchesPreset — preset filters
// ============================================================
describe('matchesPreset', () => {
    beforeEach(() => { state.activePreset = null; });

    it('returns true when no preset is active', () => {
        assert.equal(matchesPreset(baseLoc()), true);
    });

    describe('rain', () => {
        beforeEach(() => { state.activePreset = 'rain'; });

        it('matches indoor weather', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'indoor' })), true);
        });
        it('matches hybrid weather', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'hybrid' })), true);
        });
        it('matches both weather', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'both' })), true);
        });
        it('matches strong rain backup', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'outdoor', rain_backup_quality: 'strong' })), true);
        });
        it('rejects outdoor without rain backup', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'outdoor' })), false);
        });
    });

    describe('outdoor-coffee', () => {
        beforeEach(() => { state.activePreset = 'outdoor-coffee'; });

        it('matches outdoor + coffee', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'outdoor', coffee: true })), true);
        });
        it('matches hybrid + coffee', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'hybrid', coffee: true })), true);
        });
        it('rejects outdoor without coffee', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'outdoor', coffee: false })), false);
        });
        it('rejects indoor + coffee', () => {
            assert.equal(matchesPreset(baseLoc({ weather: 'indoor', coffee: true })), false);
        });
    });

    describe('dreumesproof', () => {
        beforeEach(() => { state.activePreset = 'dreumesproof'; });

        it('matches min_age null', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: null })), true);
        });
        it('matches min_age 0 with diaper', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 0, diaper: true })), true);
        });
        it('matches min_age 1 with buggy easy', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 1, buggy_friendliness: 'easy' })), true);
        });
        it('rejects min_age 2', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 2 })), false);
        });
    });

    describe('peuterproof', () => {
        beforeEach(() => { state.activePreset = 'peuterproof'; });

        it('matches wide age range', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 1, max_age: 6 })), true);
        });
        it('matches null ages', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: null, max_age: null })), true);
        });
        it('rejects min_age 5', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 5 })), false);
        });
        it('rejects max_age 1', () => {
            assert.equal(matchesPreset(baseLoc({ min_age: 0, max_age: 1 })), false);
        });
    });

    describe('lunch-play', () => {
        beforeEach(() => { state.activePreset = 'lunch-play'; });

        it('matches horeca with strong play corner', () => {
            assert.equal(matchesPreset(baseLoc({ type: 'horeca', play_corner_quality: 'strong' })), true);
        });
        it('matches pancake with toddler highlight', () => {
            assert.equal(matchesPreset(baseLoc({ type: 'pancake', toddler_highlight: 'Leuke speelplek' })), true);
        });
        it('matches coffee place with speelhoek description', () => {
            assert.equal(matchesPreset(baseLoc({ coffee: true, description: 'Leuke speelhoek aanwezig' })), true);
        });
        it('rejects horeca without play signals', () => {
            assert.equal(matchesPreset(baseLoc({ type: 'horeca', play_corner_quality: null, toddler_highlight: null, description: 'Lekker eten' })), false);
        });
    });

    describe('terras-kids', () => {
        beforeEach(() => { state.activePreset = 'terras-kids'; });

        it('matches full food + coffee + outdoor', () => {
            assert.equal(matchesPreset(baseLoc({ food_fit: 'full', coffee: true, weather: 'outdoor' })), true);
        });
        it('matches snacks + coffee + both', () => {
            assert.equal(matchesPreset(baseLoc({ food_fit: 'snacks', coffee: true, weather: 'both' })), true);
        });
        it('rejects without coffee', () => {
            assert.equal(matchesPreset(baseLoc({ food_fit: 'full', coffee: false, weather: 'outdoor' })), false);
        });
        it('rejects indoor', () => {
            assert.equal(matchesPreset(baseLoc({ food_fit: 'full', coffee: true, weather: 'indoor' })), false);
        });
    });

    describe('short-drive', () => {
        beforeEach(() => { state.activePreset = 'short-drive'; });

        it('always returns true (distance filtering is separate)', () => {
            assert.equal(matchesPreset(baseLoc()), true);
        });
    });

    describe('unknown preset', () => {
        beforeEach(() => { state.activePreset = 'nonexistent'; });

        it('returns true for unknown preset', () => {
            assert.equal(matchesPreset(baseLoc()), true);
        });
    });
});

// ============================================================
// matchesPresetDistance
// ============================================================
describe('matchesPresetDistance', () => {
    beforeEach(() => { state.activePreset = null; });

    it('returns true when preset is not short-drive', () => {
        state.activePreset = 'rain';
        assert.equal(matchesPresetDistance(baseLoc(), null), true);
    });

    it('returns true for short-drive within 10km', () => {
        state.activePreset = 'short-drive';
        assert.equal(matchesPresetDistance(baseLoc(), { distanceKm: 5 }), true);
    });

    it('returns true for short-drive at exactly 10km', () => {
        state.activePreset = 'short-drive';
        assert.equal(matchesPresetDistance(baseLoc(), { distanceKm: 10 }), true);
    });

    it('returns false for short-drive beyond 10km', () => {
        state.activePreset = 'short-drive';
        assert.equal(matchesPresetDistance(baseLoc(), { distanceKm: 15 }), false);
    });

    it('returns false for short-drive with no travel info', () => {
        state.activePreset = 'short-drive';
        assert.equal(matchesPresetDistance(baseLoc(), null), false);
    });
});

// ============================================================
// getPrimaryFitReason
// ============================================================
describe('getPrimaryFitReason', () => {
    it('returns cleaned toddler_highlight when present', () => {
        const loc = baseLoc({ toddler_highlight: 'Leuke speelplek | peuterhoek' });
        const reason = getPrimaryFitReason(loc);
        assert.ok(reason.includes('Leuke speelplek'));
        assert.ok(!reason.includes('|')); // cleaned by cleanToddlerHighlight
    });

    it('returns play corner text for strong play_corner_quality', () => {
        const loc = baseLoc({ play_corner_quality: 'strong' });
        assert.ok(getPrimaryFitReason(loc).includes('speelprikkel'));
    });

    it('returns play type reason', () => {
        const loc = baseLoc({ type: 'play' });
        const reason = getPrimaryFitReason(loc);
        assert.ok(reason.includes('zelf aan de slag'));
    });

    it('returns farm type reason', () => {
        const loc = baseLoc({ type: 'farm' });
        assert.ok(getPrimaryFitReason(loc).includes('Dieren'));
    });

    it('returns museum type reason', () => {
        const loc = baseLoc({ type: 'museum' });
        assert.ok(getPrimaryFitReason(loc).includes('prikkelrijk'));
    });

    it('returns horeca type reason', () => {
        const loc = baseLoc({ type: 'horeca' });
        assert.ok(getPrimaryFitReason(loc).includes('combineren'));
    });

    it('returns pancake type reason (same as horeca)', () => {
        const loc = baseLoc({ type: 'pancake' });
        assert.ok(getPrimaryFitReason(loc).includes('combineren'));
    });

    it('returns generic fallback for unknown type', () => {
        const loc = baseLoc({ type: 'swim' });
        const reason = getPrimaryFitReason(loc);
        assert.ok(reason.includes('Praktische plek'));
    });
});

// ============================================================
// getLogisticsReason
// ============================================================
describe('getLogisticsReason', () => {
    it('returns nearby distance text for <= 5km', () => {
        const result = getLogisticsReason(baseLoc(), { distanceKm: 3 });
        assert.ok(result.includes('3 km'));
    });

    it('returns formatted distance for > 5km', () => {
        const result = getLogisticsReason(baseLoc(), { distanceKm: 12, distance: '12 km' });
        assert.ok(result.includes('12 km'));
    });

    it('returns locality text when no travel info', () => {
        const loc = baseLoc({ seo_primary_locality: 'Amsterdam-Zuid' });
        assert.ok(getLogisticsReason(loc).includes('Amsterdam-Zuid'));
    });

    it('returns region text when no locality', () => {
        const loc = baseLoc({ region: 'Noord-Holland' });
        assert.ok(getLogisticsReason(loc).includes('Noord-Holland'));
    });

    it('returns generic fallback', () => {
        assert.ok(getLogisticsReason(baseLoc()).includes('lokaal'));
    });
});

// ============================================================
// getComfortReason
// ============================================================
describe('getComfortReason', () => {
    it('returns diaper+coffee combo', () => {
        const loc = baseLoc({ diaper: true, coffee: true });
        assert.ok(getComfortReason(loc).includes('Verschonen'));
        assert.ok(getComfortReason(loc).includes('koffie'));
    });

    it('returns rain backup text', () => {
        const loc = baseLoc({ rain_backup_quality: 'strong' });
        assert.ok(getComfortReason(loc).includes('weer omslaat'));
    });

    it('returns buggy text', () => {
        const loc = baseLoc({ buggy_friendliness: 'easy' });
        assert.ok(getComfortReason(loc).includes('buggy'));
    });

    it('returns toilet text', () => {
        const loc = baseLoc({ toilet_confidence: 'high' });
        assert.ok(getComfortReason(loc).includes('Sanitair'));
    });

    it('returns coffee-only text', () => {
        const loc = baseLoc({ coffee: true });
        assert.ok(getComfortReason(loc).includes('ontspannen'));
    });

    it('returns diaper-only text', () => {
        const loc = baseLoc({ diaper: true });
        assert.ok(getComfortReason(loc).includes('verschonen'));
    });

    it('returns generic fallback', () => {
        assert.ok(getComfortReason(baseLoc()).includes('peuterroute'));
    });
});

// ============================================================
// getDecisionHeadline
// ============================================================
describe('getDecisionHeadline', () => {
    beforeEach(() => { state.activePreset = null; });

    it('returns rain headline', () => {
        state.activePreset = 'rain';
        assert.ok(getDecisionHeadline(baseLoc()).includes('weer'));
    });

    it('returns outdoor-coffee headline', () => {
        state.activePreset = 'outdoor-coffee';
        assert.ok(getDecisionHeadline(baseLoc()).includes('Buitenlucht'));
    });

    it('returns short-drive headline with distance', () => {
        state.activePreset = 'short-drive';
        const result = getDecisionHeadline(baseLoc(), { distanceKm: 7 });
        assert.ok(result.includes('7 km'));
    });

    it('returns rain_backup headline when no preset', () => {
        const loc = baseLoc({ rain_backup_quality: 'strong' });
        assert.ok(getDecisionHeadline(loc).includes('plan B'));
    });

    it('returns nearby headline when close', () => {
        const result = getDecisionHeadline(baseLoc(), { distanceKm: 3 });
        assert.ok(result.includes('Snel geregeld'));
    });

    it('returns play headline for strong play', () => {
        const loc = baseLoc({ play_corner_quality: 'strong' });
        assert.ok(getDecisionHeadline(loc).includes('speelruimte'));
    });

    it('returns comfort headline for coffee+diaper', () => {
        const loc = baseLoc({ coffee: true, diaper: true });
        assert.ok(getDecisionHeadline(loc).includes('oudercomfort'));
    });

    it('returns generic fallback', () => {
        assert.ok(getDecisionHeadline(baseLoc()).includes('peuteruitje'));
    });
});

// ============================================================
// getCardReasons
// ============================================================
describe('getCardReasons', () => {
    beforeEach(() => { state.activePreset = null; });

    it('returns object with headline, primary, secondary', () => {
        const result = getCardReasons(baseLoc());
        assert.ok(typeof result.headline === 'string');
        assert.ok(typeof result.primary === 'string');
        assert.ok(Array.isArray(result.secondary));
        assert.equal(result.secondary.length, 2);
        assert.equal(result.secondary[0].label, 'Logistiek');
        assert.equal(result.secondary[1].label, 'Voor ouders');
    });
});

// ============================================================
// getCardDecisionSentence
// ============================================================
describe('getCardDecisionSentence', () => {
    beforeEach(() => { state.activePreset = null; });

    it('uses distance for short-drive preset', () => {
        state.activePreset = 'short-drive';
        const result = getCardDecisionSentence(baseLoc(), { distanceKm: 4 });
        assert.ok(result.includes('4 km'));
    });

    it('includes rain backup info for rain preset', () => {
        state.activePreset = 'rain';
        const loc = baseLoc({ rain_backup_quality: 'strong' });
        const result = getCardDecisionSentence(loc);
        assert.ok(result.includes('weer omslaat'));
    });

    it('includes comfort for locations with diaper', () => {
        const loc = baseLoc({ type: 'play', diaper: true });
        const result = getCardDecisionSentence(loc);
        assert.ok(result.length > 10);
    });

    it('includes logistics fallback otherwise', () => {
        const loc = baseLoc({ type: 'swim' });
        const result = getCardDecisionSentence(loc);
        assert.ok(result.includes('lokaal'));
    });
});

// ============================================================
// getCardQuickFacts
// ============================================================
describe('getCardQuickFacts', () => {
    it('returns diaper+coffee combo fact', () => {
        const facts = getCardQuickFacts(baseLoc({ diaper: true, coffee: true }));
        assert.equal(facts.length, 1);
        assert.ok(facts[0].includes('Koffie'));
    });

    it('returns diaper-only fact', () => {
        const facts = getCardQuickFacts(baseLoc({ diaper: true }));
        assert.ok(facts[0].includes('Verschonen'));
    });

    it('returns coffee-only fact', () => {
        const facts = getCardQuickFacts(baseLoc({ coffee: true }));
        assert.ok(facts[0].includes('Koffie'));
    });

    it('returns rain backup fact', () => {
        const facts = getCardQuickFacts(baseLoc({ rain_backup_quality: 'strong' }));
        assert.ok(facts[0].includes('regen'));
    });

    it('returns play corner fact', () => {
        const facts = getCardQuickFacts(baseLoc({ play_corner_quality: 'strong' }));
        assert.ok(facts[0].includes('speelprikkel'));
    });

    it('returns time-of-day fact', () => {
        const facts = getCardQuickFacts(baseLoc({ time_of_day_fit: 'ochtend' }));
        assert.ok(facts[0].includes('ochtend'));
    });

    it('falls back to distance', () => {
        const facts = getCardQuickFacts(baseLoc(), { distanceKm: 8, distance: '8 km' });
        assert.ok(facts[0].includes('8 km'));
    });

    it('falls back to nearby distance', () => {
        const facts = getCardQuickFacts(baseLoc(), { distanceKm: 3 });
        assert.ok(facts[0].includes('3 km'));
    });

    it('falls back to locality', () => {
        const facts = getCardQuickFacts(baseLoc({ seo_primary_locality: 'Leiden' }));
        assert.ok(facts[0].includes('Leiden'));
    });

    it('falls back to region', () => {
        const facts = getCardQuickFacts(baseLoc({ region: 'Utrecht' }));
        assert.ok(facts[0].includes('Utrecht'));
    });

    it('returns at most 1 item', () => {
        const facts = getCardQuickFacts(baseLoc({ diaper: true, coffee: true }), { distanceKm: 2 });
        assert.equal(facts.length, 1);
    });
});

// ============================================================
// getVerificationModeLabel
// ============================================================
describe('getVerificationModeLabel', () => {
    it('returns label for editorial', () => {
        assert.equal(getVerificationModeLabel('editorial'), 'Redactioneel gecontroleerd');
    });
    it('returns label for partner', () => {
        assert.equal(getVerificationModeLabel('partner'), 'Aangevuld door locatie');
    });
    it('returns label for web_verified', () => {
        assert.equal(getVerificationModeLabel('web_verified'), 'Website gecontroleerd');
    });
    it('returns null for unknown mode', () => {
        assert.equal(getVerificationModeLabel('unknown'), null);
    });
    it('returns null for undefined', () => {
        assert.equal(getVerificationModeLabel(undefined), null);
    });
});

// ============================================================
// getTrustChips
// ============================================================
describe('getTrustChips', () => {
    it('includes verification chip when mode is set', () => {
        const chips = getTrustChips(baseLoc({ verification_mode: 'editorial' }));
        assert.ok(chips.some(c => c.label.includes('Redactioneel')));
        assert.equal(chips[0].tone, 'positive');
    });

    it('includes confidence chip when >= 70%', () => {
        const chips = getTrustChips(baseLoc({ verification_confidence: 0.85 }));
        assert.ok(chips.some(c => c.label.includes('85%')));
    });

    it('excludes confidence chip when < 70%', () => {
        const chips = getTrustChips(baseLoc({ verification_confidence: 0.5 }));
        assert.ok(!chips.some(c => c.label.includes('50%')));
    });

    it('includes locality chip', () => {
        const chips = getTrustChips(baseLoc({ seo_primary_locality: 'Jordaan' }));
        assert.ok(chips.some(c => c.label.includes('Jordaan')));
    });

    it('includes price band chip', () => {
        const chips = getTrustChips(baseLoc({ price_band: 'free' }));
        assert.ok(chips.some(c => c.label.includes('Gratis')));
    });

    it('returns at most 3 chips', () => {
        const loc = baseLoc({
            verification_mode: 'editorial',
            verification_confidence: 0.9,
            seo_primary_locality: 'Centrum',
            price_band: 'low',
        });
        assert.ok(getTrustChips(loc).length <= 3);
    });
});

// ============================================================
// getCompactTrustChip
// ============================================================
describe('getCompactTrustChip', () => {
    it('returns shortened label for editorial', () => {
        const chip = getCompactTrustChip(baseLoc({ verification_mode: 'editorial' }));
        assert.equal(chip.label, 'Redactie gecheckt');
        assert.equal(chip.tone, 'positive');
    });

    it('returns shortened label for web_verified', () => {
        const chip = getCompactTrustChip(baseLoc({ verification_mode: 'web_verified' }));
        assert.equal(chip.label, 'Website gecheckt');
    });

    it('returns shortened label for visit_verified', () => {
        const chip = getCompactTrustChip(baseLoc({ verification_mode: 'visit_verified' }));
        assert.equal(chip.label, 'Ter plekke gecheckt');
    });

    it('falls back to confidence when >= 75%', () => {
        const chip = getCompactTrustChip(baseLoc({ verification_confidence: 0.8 }));
        assert.ok(chip.label.includes('80%'));
    });

    it('returns null when no verification info', () => {
        assert.equal(getCompactTrustChip(baseLoc()), null);
    });

    it('returns null when confidence < 75%', () => {
        assert.equal(getCompactTrustChip(baseLoc({ verification_confidence: 0.6 })), null);
    });
});

// ============================================================
// getTrustBullets
// ============================================================
describe('getTrustBullets', () => {
    it('returns empty for bare location', () => {
        assert.deepEqual(getTrustBullets(baseLoc()), []);
    });

    it('includes verification label', () => {
        const bullets = getTrustBullets(baseLoc({ verification_mode: 'phone_verified' }));
        assert.ok(bullets.some(b => b.includes('Telefonisch')));
    });

    it('includes confidence percentage', () => {
        const bullets = getTrustBullets(baseLoc({ verification_confidence: 0.72 }));
        assert.ok(bullets.some(b => b.includes('72%')));
    });

    it('includes last_verified date', () => {
        const bullets = getTrustBullets(baseLoc({ last_verified: '2025-01-15' }));
        assert.ok(bullets.some(b => b.includes('2025-01-15')));
    });

    it('returns at most 3 bullets', () => {
        const loc = baseLoc({
            verification_mode: 'editorial',
            verification_confidence: 0.9,
            last_verified: '2025-06-01',
        });
        assert.ok(getTrustBullets(loc).length <= 3);
    });

    it('clamps confidence to 0-100 range', () => {
        const bullets = getTrustBullets(baseLoc({ verification_confidence: 1.5 }));
        assert.ok(bullets.some(b => b.includes('100%')));
    });

    it('handles negative confidence', () => {
        const bullets = getTrustBullets(baseLoc({ verification_confidence: -0.5 }));
        assert.ok(bullets.some(b => b.includes('0%')));
    });
});

// ============================================================
// getPracticalBullets
// ============================================================
describe('getPracticalBullets', () => {
    it('returns empty for bare location', () => {
        assert.deepEqual(getPracticalBullets(baseLoc()), []);
    });

    it('includes time-of-day bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ time_of_day_fit: 'ochtend' }));
        assert.ok(bullets.some(b => b.includes('ochtendstop')));
    });

    it('includes middag bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ time_of_day_fit: 'middag' }));
        assert.ok(bullets.some(b => b.includes('middaguitje')));
    });

    it('includes hele dag bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ time_of_day_fit: 'hele dag' }));
        assert.ok(bullets.some(b => b.includes('halve of hele dag')));
    });

    it('includes rain backup bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ rain_backup_quality: 'strong' }));
        assert.ok(bullets.some(b => b.includes('Slechtweeroptie')));
        assert.ok(bullets.some(b => b.includes('sterk')));
    });

    it('includes buggy bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ buggy_friendliness: 'easy' }));
        assert.ok(bullets.some(b => b.includes('Buggyvriendelijkheid')));
        assert.ok(bullets.some(b => b.includes('makkelijk')));
    });

    it('includes parking bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ parking_ease: 'easy' }));
        assert.ok(bullets.some(b => b.includes('Parkeren')));
    });

    it('includes food bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ food_fit: 'full' }));
        assert.ok(bullets.some(b => b.includes('Eten combineren')));
    });

    it('includes play corner bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ play_corner_quality: 'strong' }));
        assert.ok(bullets.some(b => b.includes('Speelwaarde')));
    });

    it('includes toilet bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ toilet_confidence: 'high' }));
        assert.ok(bullets.some(b => b.includes('Sanitairvertrouwen')));
    });

    it('includes noise bullet', () => {
        const bullets = getPracticalBullets(baseLoc({ noise_level: 'calm' }));
        assert.ok(bullets.some(b => b.includes('geluidsniveau')));
        assert.ok(bullets.some(b => b.includes('rustiger')));
    });

    it('returns at most 4 bullets', () => {
        const loc = baseLoc({
            time_of_day_fit: 'ochtend',
            rain_backup_quality: 'strong',
            buggy_friendliness: 'easy',
            parking_ease: 'easy',
            food_fit: 'full',
            play_corner_quality: 'strong',
        });
        assert.ok(getPracticalBullets(loc).length <= 4);
    });

    it('uses raw value for unknown simple labels', () => {
        const bullets = getPracticalBullets(baseLoc({ rain_backup_quality: 'custom_val' }));
        assert.ok(bullets.some(b => b.includes('custom_val')));
    });
});

// ============================================================
// computePeuterScoreV2 — weighted 6-dimension scoring
// ============================================================
describe('computePeuterScoreV2', () => {
    it('returns object with total and dimensions', () => {
        const result = computePeuterScoreV2(baseLoc());
        assert.ok(typeof result.total === 'number');
        assert.ok(typeof result.dimensions === 'object');
        assert.ok('ageFit' in result.dimensions);
        assert.ok('facilities' in result.dimensions);
        assert.ok('playValue' in result.dimensions);
        assert.ok('weatherFit' in result.dimensions);
        assert.ok('practical' in result.dimensions);
        assert.ok('reliability' in result.dimensions);
    });

    it('total is between 0 and 10', () => {
        const result = computePeuterScoreV2(baseLoc());
        assert.ok(result.total >= 0 && result.total <= 10);
    });

    it('dimension scores are between 0 and 10', () => {
        const result = computePeuterScoreV2(baseLoc());
        for (const dim of Object.values(result.dimensions)) {
            assert.ok(dim.score >= 0 && dim.score <= 10, `${dim.label} score ${dim.score} out of range`);
        }
    });

    it('dimensions have correct labels', () => {
        const result = computePeuterScoreV2(baseLoc());
        assert.equal(result.dimensions.ageFit.label, 'Leeftijdsmatch');
        assert.equal(result.dimensions.facilities.label, 'Faciliteiten');
        assert.equal(result.dimensions.playValue.label, 'Speelwaarde');
        assert.equal(result.dimensions.weatherFit.label, 'Weerbestendigheid');
        assert.equal(result.dimensions.practical.label, 'Praktisch');
        assert.equal(result.dimensions.reliability.label, 'Betrouwbaarheid');
    });

    describe('facilities dimension', () => {
        it('scores higher with diaper+coffee+buggy+parking+toilet', () => {
            const full = computePeuterScoreV2(baseLoc({
                diaper: true, coffee: true,
                buggy_friendliness: 'easy',
                parking_ease: 'easy',
                toilet_confidence: 'high',
            }));
            const bare = computePeuterScoreV2(baseLoc());
            assert.ok(full.dimensions.facilities.score > bare.dimensions.facilities.score);
        });

        it('caps facilities at 10', () => {
            const full = computePeuterScoreV2(baseLoc({
                diaper: true, coffee: true,
                buggy_friendliness: 'easy',
                parking_ease: 'easy',
                toilet_confidence: 'high',
            }));
            assert.equal(full.dimensions.facilities.score, 10);
        });
    });

    describe('play value dimension', () => {
        it('scores higher with strong play corner + highlight', () => {
            const full = computePeuterScoreV2(baseLoc({
                play_corner_quality: 'strong',
                toddler_highlight: 'Leuk',
                noise_level: 'moderate',
            }));
            const bare = computePeuterScoreV2(baseLoc());
            assert.ok(full.dimensions.playValue.score > bare.dimensions.playValue.score);
        });
    });

    describe('age fit dimension', () => {
        it('defaults to 5 without context', () => {
            const result = computePeuterScoreV2(baseLoc({ min_age: 1, max_age: 5 }));
            assert.equal(result.dimensions.ageFit.score, 5);
        });

        it('scores 10 for perfect age match', () => {
            const result = computePeuterScoreV2(
                baseLoc({ min_age: 1, max_age: 5 }),
                { childAge: 3 } // optimal = 3, diff = 0
            );
            assert.equal(result.dimensions.ageFit.score, 10);
        });

        it('scores lower for age far from range', () => {
            const result = computePeuterScoreV2(
                baseLoc({ min_age: 6, max_age: 12 }),
                { childAge: 2 } // optimal = 9, diff = 7, range = 3
            );
            assert.ok(result.dimensions.ageFit.score < 5);
        });
    });

    describe('weather fit dimension', () => {
        it('defaults to 5 without weather context', () => {
            const result = computePeuterScoreV2(baseLoc());
            assert.equal(result.dimensions.weatherFit.score, 5);
        });

        it('scores 10 for strong rain backup in rain', () => {
            const result = computePeuterScoreV2(
                baseLoc({ rain_backup_quality: 'strong' }),
                { weather: 'rain' }
            );
            assert.equal(result.dimensions.weatherFit.score, 10);
        });

        it('scores 9 for indoor weather in rain', () => {
            const result = computePeuterScoreV2(
                baseLoc({ weather: 'indoor' }),
                { weather: 'rain' }
            );
            assert.equal(result.dimensions.weatherFit.score, 9);
        });

        it('scores 1 for outdoor-only in rain', () => {
            const result = computePeuterScoreV2(
                baseLoc({ weather: 'outdoor' }),
                { weather: 'rain' }
            );
            assert.equal(result.dimensions.weatherFit.score, 1);
        });

        it('scores 8 for outdoor in sun', () => {
            const result = computePeuterScoreV2(
                baseLoc({ weather: 'outdoor' }),
                { weather: 'sun' }
            );
            assert.equal(result.dimensions.weatherFit.score, 8);
        });

        it('adds shelter bonus in sun', () => {
            const result = computePeuterScoreV2(
                baseLoc({ weather: 'outdoor', shade_or_shelter: 'good' }),
                { weather: 'sun' }
            );
            assert.equal(result.dimensions.weatherFit.score, 10);
        });
    });

    describe('practical dimension', () => {
        it('scores higher with full food + free + time_of_day_fit', () => {
            const full = computePeuterScoreV2(baseLoc({
                food_fit: 'full', price_band: 'free',
                time_of_day_fit: 'ochtend',
            }));
            const bare = computePeuterScoreV2(baseLoc());
            assert.ok(full.dimensions.practical.score > bare.dimensions.practical.score);
        });

        it('includes crowd pattern bonus for rustig', () => {
            const withCrowd = computePeuterScoreV2(baseLoc({
                crowd_pattern: 'Meestal rustig doordeweeks',
            }));
            const bare = computePeuterScoreV2(baseLoc());
            assert.ok(withCrowd.dimensions.practical.score > bare.dimensions.practical.score);
        });
    });

    describe('reliability dimension', () => {
        it('defaults to 5', () => {
            const result = computePeuterScoreV2(baseLoc());
            assert.equal(result.dimensions.reliability.score, 5);
        });

        it('scores 9 for high verification confidence', () => {
            const result = computePeuterScoreV2(baseLoc({ verification_confidence: 'high' }));
            assert.equal(result.dimensions.reliability.score, 9);
        });

        it('scores 6 for medium verification confidence', () => {
            const result = computePeuterScoreV2(baseLoc({ verification_confidence: 'medium' }));
            assert.equal(result.dimensions.reliability.score, 6);
        });
    });

    describe('featured bonus', () => {
        it('adds 0.3 for featured location', () => {
            const featured = computePeuterScoreV2(baseLoc({ is_featured: true }));
            const normal = computePeuterScoreV2(baseLoc({ is_featured: false }));
            const diff = featured.total - normal.total;
            assert.ok(diff > 0 && diff <= 0.4, `Featured bonus diff: ${diff}`);
        });
    });

    describe('context weight adjustments', () => {
        it('rain context increases weatherFit weight', () => {
            const result = computePeuterScoreV2(baseLoc(), { weather: 'rain' });
            assert.equal(result.dimensions.weatherFit.weight, 0.25); // 0.15 + 0.10
        });

        it('childAge context increases ageFit weight', () => {
            const result = computePeuterScoreV2(baseLoc(), { childAge: 3 });
            assert.equal(result.dimensions.ageFit.weight, 0.35); // 0.25 + 0.10
        });

        it('weekend context increases practical weight', () => {
            const result = computePeuterScoreV2(baseLoc(), { dayOfWeek: 6 });
            const w = result.dimensions.practical.weight;
            assert.ok(Math.abs(w - 0.15) < 1e-10, `Expected ~0.15 got ${w}`); // 0.10 + 0.05 (float)
        });
    });

    it('total is capped at 10', () => {
        const loc = baseLoc({
            min_age: 2, max_age: 4,
            diaper: true, coffee: true,
            buggy_friendliness: 'easy', parking_ease: 'easy', toilet_confidence: 'high',
            play_corner_quality: 'strong', toddler_highlight: 'Superleuk',
            noise_level: 'moderate',
            rain_backup_quality: 'strong', weather: 'indoor',
            food_fit: 'full', price_band: 'free',
            crowd_pattern: 'rustig', time_of_day_fit: 'flexibel',
            verification_confidence: 'high',
            is_featured: true,
        });
        const result = computePeuterScoreV2(loc, { childAge: 3, weather: 'rain', dayOfWeek: 6 });
        assert.ok(result.total <= 10);
    });
});

// ============================================================
// getTopStrengths
// ============================================================
describe('getTopStrengths', () => {
    it('returns top 3 strengths sorted by weighted score', () => {
        const scoreResult = computePeuterScoreV2(baseLoc({
            diaper: true, coffee: true,
            play_corner_quality: 'strong', toddler_highlight: 'Fun',
        }));
        const strengths = getTopStrengths(scoreResult);
        assert.equal(strengths.length, 3);
        for (const s of strengths) {
            assert.ok(typeof s.label === 'string');
            assert.ok(typeof s.dimension === 'string');
            assert.ok(typeof s.score === 'number');
        }
    });

    it('uses "strong" label for score >= 7', () => {
        const scoreResult = computePeuterScoreV2(baseLoc({
            diaper: true, coffee: true,
            buggy_friendliness: 'easy', parking_ease: 'easy', toilet_confidence: 'high',
        }));
        const strengths = getTopStrengths(scoreResult);
        const facilitiesStrength = strengths.find(s => s.dimension === 'facilities');
        if (facilitiesStrength) {
            assert.ok(facilitiesStrength.label.includes('Uitstekende'));
        }
    });

    it('uses sun-specific weather labels', () => {
        const scoreResult = computePeuterScoreV2(
            baseLoc({ weather: 'outdoor' }),
            { weather: 'sun' }
        );
        const strengths = getTopStrengths(scoreResult, { weather: 'sun' });
        const weatherStrength = strengths.find(s => s.dimension === 'weatherFit');
        if (weatherStrength && weatherStrength.score >= 7) {
            assert.ok(weatherStrength.label.includes('buitenweer'));
        }
    });

    it('returns strengths sorted descending by weighted score', () => {
        const scoreResult = computePeuterScoreV2(baseLoc({
            diaper: true, coffee: true,
            play_corner_quality: 'strong',
        }));
        const strengths = getTopStrengths(scoreResult);
        for (let i = 1; i < strengths.length; i++) {
            const prevDim = scoreResult.dimensions[strengths[i - 1].dimension];
            const currDim = scoreResult.dimensions[strengths[i].dimension];
            assert.ok(
                prevDim.score * prevDim.weight >= currDim.score * currDim.weight,
                'Strengths should be sorted by weighted score descending'
            );
        }
    });
});
