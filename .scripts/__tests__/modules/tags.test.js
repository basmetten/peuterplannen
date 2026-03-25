const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Both modules/tags.js and modules/state.js are ESM — use dynamic import().
// state is a shared mutable object, so mutating it here affects tags.js reads.
const ROOT = path.resolve(__dirname, '..', '..', '..');
let getTopTags, getWeatherBadge, getSterkePunten, state;

async function setup() {
    const stateModule = await import(path.join(ROOT, 'modules', 'state.js'));
    const tagsModule = await import(path.join(ROOT, 'modules', 'tags.js'));
    state = stateModule.state;
    getTopTags = tagsModule.getTopTags;
    getWeatherBadge = tagsModule.getWeatherBadge;
    getSterkePunten = tagsModule.getSterkePunten;
}

// ─── getTopTags ──────────────────────────────────────────────

describe('getTopTags', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('returns empty array for location with no matching properties', () => {
        const result = getTopTags({});
        assert.deepStrictEqual(result, []);
    });

    it('returns max 3 tags even when many match', () => {
        const loc = {
            rain_backup_quality: 'strong',
            shade_or_shelter: 'good',
            parking_ease: 'easy',
            buggy_friendliness: 'easy',
            toilet_confidence: 'high',
            food_fit: 'full',
            coffee: true,
            play_corner_quality: 'strong',
            price_band: 'free',
        };
        const result = getTopTags(loc);
        assert.equal(result.length, 3);
    });

    it('sorts tags by priority descending', () => {
        const loc = {
            parking_ease: 'easy',      // priority 5
            toilet_confidence: 'high', // priority 3
            play_corner_quality: 'strong', // priority 6
        };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Sterke speelprikkel');
        assert.equal(result[1].label, 'Makkelijk parkeren');
        assert.equal(result[2].label, 'Goede toiletten');
    });

    it('boosts rain tag priority when state.isRaining is true', () => {
        state.isRaining = true;
        const loc = {
            rain_backup_quality: 'strong',
            play_corner_quality: 'strong', // priority 6
            price_band: 'free',            // priority 5
        };
        const result = getTopTags(loc);
        // Regenproof gets priority 10 when raining → should be first
        assert.equal(result[0].label, 'Regenproof');
        assert.equal(result[0].priority, 10);
    });

    it('gives rain tag lower priority when not raining', () => {
        state.isRaining = false;
        const loc = {
            rain_backup_quality: 'strong', // priority 3 when dry
            play_corner_quality: 'strong', // priority 6
        };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Sterke speelprikkel');
        assert.equal(result[1].label, 'Regenproof');
        assert.equal(result[1].priority, 3);
    });

    it('boosts shade tag priority when state.isSunny is true', () => {
        state.isSunny = true;
        const loc = {
            shade_or_shelter: 'good',
            play_corner_quality: 'strong', // priority 6
            price_band: 'free',            // priority 5
        };
        const result = getTopTags(loc);
        // Veel schaduw gets priority 8 when sunny → should be first
        assert.equal(result[0].label, 'Veel schaduw');
        assert.equal(result[0].priority, 8);
    });

    it('gives shade tag lower priority when not sunny', () => {
        state.isSunny = false;
        const loc = {
            shade_or_shelter: 'good',      // priority 2 when not sunny
            parking_ease: 'easy',          // priority 5
        };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Makkelijk parkeren');
        assert.equal(result[1].label, 'Veel schaduw');
        assert.equal(result[1].priority, 2);
    });

    it('includes food_fit "full" as "Goed lunchen"', () => {
        const loc = { food_fit: 'full' };
        const result = getTopTags(loc);
        assert.equal(result.length, 1);
        assert.equal(result[0].label, 'Goed lunchen');
        assert.equal(result[0].icon, '🍽️');
    });

    it('includes food_fit "snacks" as "Snacks aanwezig"', () => {
        const loc = { food_fit: 'snacks' };
        const result = getTopTags(loc);
        assert.equal(result.length, 1);
        assert.equal(result[0].label, 'Snacks aanwezig');
    });

    it('prefers "Goed lunchen" over "Snacks aanwezig" when food_fit is full', () => {
        // food_fit=full should produce "Goed lunchen", not "Snacks aanwezig"
        const loc = { food_fit: 'full' };
        const result = getTopTags(loc);
        const labels = result.map(t => t.label);
        assert.ok(labels.includes('Goed lunchen'));
        assert.ok(!labels.includes('Snacks aanwezig'));
    });

    it('includes coffee tag', () => {
        const loc = { coffee: true };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Koffie');
        assert.equal(result[0].icon, '☕');
    });

    it('includes noise_level quiet as "Rustige plek"', () => {
        const loc = { noise_level: 'quiet' };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Rustige plek');
    });

    it('includes time_of_day_fit ochtend tag', () => {
        const loc = { time_of_day_fit: 'ochtend' };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Ochtend is het mooist');
    });

    it('includes crowd_pattern "rustig doordeweeks" tag', () => {
        const loc = { crowd_pattern: 'rustig doordeweeks, druk in weekend' };
        const result = getTopTags(loc);
        const labels = result.map(t => t.label);
        assert.ok(labels.includes('Rustig doordeweeks'));
    });

    it('includes price_band free as "Gratis"', () => {
        const loc = { price_band: 'free' };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Gratis');
        assert.equal(result[0].icon, '🎉');
        assert.equal(result[0].priority, 5);
    });

    it('includes buggy_friendliness easy tag', () => {
        const loc = { buggy_friendliness: 'easy' };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Buggy-vriendelijk');
        assert.equal(result[0].icon, '👶');
    });

    it('handles combined rain+sun state (both true)', () => {
        state.isRaining = true;
        state.isSunny = true;
        const loc = {
            rain_backup_quality: 'strong', // priority 10
            shade_or_shelter: 'good',      // priority 8
            price_band: 'free',            // priority 5
        };
        const result = getTopTags(loc);
        assert.equal(result[0].label, 'Regenproof');
        assert.equal(result[1].label, 'Veel schaduw');
        assert.equal(result[2].label, 'Gratis');
    });

    it('does not include tags for non-matching property values', () => {
        const loc = {
            rain_backup_quality: 'weak',
            shade_or_shelter: 'poor',
            parking_ease: 'difficult',
            food_fit: 'none',
        };
        const result = getTopTags(loc);
        assert.deepStrictEqual(result, []);
    });

    it('handles null/undefined crowd_pattern gracefully', () => {
        const loc = { crowd_pattern: null };
        const result = getTopTags(loc);
        assert.deepStrictEqual(result, []);
    });
});

// ─── getWeatherBadge ─────────────────────────────────────────

describe('getWeatherBadge', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('returns null when no weather state active', () => {
        const result = getWeatherBadge({ rain_backup_quality: 'strong', shade_or_shelter: 'good' });
        assert.equal(result, null);
    });

    it('returns rain badge when raining and location is regenproof', () => {
        state.isRaining = true;
        const result = getWeatherBadge({ rain_backup_quality: 'strong' });
        assert.deepStrictEqual(result, {
            label: '☔ Regenproof',
            className: 'weather-badge--rain',
        });
    });

    it('returns null when raining but location is not regenproof', () => {
        state.isRaining = true;
        const result = getWeatherBadge({ rain_backup_quality: 'weak' });
        assert.equal(result, null);
    });

    it('returns sun badge when sunny and location has good shade', () => {
        state.isSunny = true;
        const result = getWeatherBadge({ shade_or_shelter: 'good' });
        assert.deepStrictEqual(result, {
            label: '⛱️ Schaduwrijk',
            className: 'weather-badge--sun',
        });
    });

    it('returns null when sunny but location has no good shade', () => {
        state.isSunny = true;
        const result = getWeatherBadge({ shade_or_shelter: 'poor' });
        assert.equal(result, null);
    });

    it('prefers rain badge over sun badge when both states are true', () => {
        state.isRaining = true;
        state.isSunny = true;
        const loc = { rain_backup_quality: 'strong', shade_or_shelter: 'good' };
        const result = getWeatherBadge(loc);
        // Rain check comes first in the code, so rain badge wins
        assert.equal(result.className, 'weather-badge--rain');
    });

    it('falls back to sun badge when raining but no rain quality', () => {
        state.isRaining = true;
        state.isSunny = true;
        const loc = { rain_backup_quality: 'weak', shade_or_shelter: 'good' };
        const result = getWeatherBadge(loc);
        assert.equal(result.className, 'weather-badge--sun');
    });

    it('returns null for empty location object regardless of weather', () => {
        state.isRaining = true;
        state.isSunny = true;
        const result = getWeatherBadge({});
        assert.equal(result, null);
    });
});

// ─── getSterkePunten ─────────────────────────────────────────

describe('getSterkePunten', () => {
    beforeEach(async () => {
        await setup();
    });

    it('returns empty array for location with no matching properties', () => {
        const result = getSterkePunten({});
        assert.deepStrictEqual(result, []);
    });

    it('includes diaper as "Verschoontafel aanwezig"', () => {
        const result = getSterkePunten({ diaper: true });
        assert.ok(result.includes('Verschoontafel aanwezig'));
    });

    it('includes combined coffee + full food as restaurant text', () => {
        const result = getSterkePunten({ coffee: true, food_fit: 'full' });
        assert.ok(result.includes('Kindvriendelijk restaurant met koffie'));
        // Should NOT include separate coffee or food lines
        assert.ok(!result.includes('Koffie voor ouders'));
        assert.ok(!result.includes('Goed kunnen lunchen met kids'));
    });

    it('includes coffee-only text when no full food', () => {
        const result = getSterkePunten({ coffee: true, food_fit: 'snacks' });
        assert.ok(result.includes('Koffie voor ouders'));
        assert.ok(!result.includes('Kindvriendelijk restaurant met koffie'));
    });

    it('includes food-only text when full food but no coffee', () => {
        const result = getSterkePunten({ coffee: false, food_fit: 'full' });
        assert.ok(result.includes('Goed kunnen lunchen met kids'));
        assert.ok(!result.includes('Kindvriendelijk restaurant met koffie'));
    });

    it('includes snacks text when snacks and no coffee', () => {
        const result = getSterkePunten({ food_fit: 'snacks', coffee: false });
        assert.ok(result.includes('Snacks en drankjes te koop'));
    });

    it('does NOT include snacks text when snacks AND coffee', () => {
        const result = getSterkePunten({ food_fit: 'snacks', coffee: true });
        assert.ok(!result.includes('Snacks en drankjes te koop'));
        // Should have the coffee-only line instead
        assert.ok(result.includes('Koffie voor ouders'));
    });

    it('includes rain backup text', () => {
        const result = getSterkePunten({ rain_backup_quality: 'strong' });
        assert.ok(result.includes('Goed alternatief bij regen'));
    });

    it('includes shade text', () => {
        const result = getSterkePunten({ shade_or_shelter: 'good' });
        assert.ok(result.includes('Veel schaduw beschikbaar'));
    });

    it('includes parking text', () => {
        const result = getSterkePunten({ parking_ease: 'easy' });
        assert.ok(result.includes('Makkelijk parkeren'));
    });

    it('includes buggy text', () => {
        const result = getSterkePunten({ buggy_friendliness: 'easy' });
        assert.ok(result.includes('Goed bereikbaar met buggy'));
    });

    it('includes toilet text', () => {
        const result = getSterkePunten({ toilet_confidence: 'high' });
        assert.ok(result.includes('Schone toiletten'));
    });

    it('includes play corner text', () => {
        const result = getSterkePunten({ play_corner_quality: 'strong' });
        assert.ok(result.includes('Uitdagend en gevarieerd spelen'));
    });

    it('includes quiet noise level text', () => {
        const result = getSterkePunten({ noise_level: 'quiet' });
        assert.ok(result.includes('Rustige, ontspannen sfeer'));
    });

    it('includes free price text', () => {
        const result = getSterkePunten({ price_band: 'free' });
        assert.ok(result.includes('Gratis toegankelijk'));
    });

    it('returns all punten for a fully-loaded location', () => {
        const loc = {
            diaper: true,
            coffee: true,
            food_fit: 'full',
            rain_backup_quality: 'strong',
            shade_or_shelter: 'good',
            parking_ease: 'easy',
            buggy_friendliness: 'easy',
            toilet_confidence: 'high',
            play_corner_quality: 'strong',
            noise_level: 'quiet',
            price_band: 'free',
        };
        const result = getSterkePunten(loc);
        assert.equal(result.length, 10);
        // First should be diaper (comes first in code)
        assert.equal(result[0], 'Verschoontafel aanwezig');
        // Combined coffee+food should be present
        assert.ok(result.includes('Kindvriendelijk restaurant met koffie'));
    });

    it('preserves ordering: diaper first, then food, then facilities', () => {
        const loc = {
            diaper: true,
            coffee: true,
            food_fit: 'full',
            parking_ease: 'easy',
            price_band: 'free',
        };
        const result = getSterkePunten(loc);
        assert.equal(result[0], 'Verschoontafel aanwezig');
        assert.equal(result[1], 'Kindvriendelijk restaurant met koffie');
        assert.equal(result[2], 'Makkelijk parkeren');
        assert.equal(result[3], 'Gratis toegankelijk');
    });

    it('does not include non-matching values', () => {
        const loc = {
            rain_backup_quality: 'weak',
            shade_or_shelter: 'poor',
            parking_ease: 'difficult',
            buggy_friendliness: 'hard',
            toilet_confidence: 'low',
            play_corner_quality: 'weak',
            noise_level: 'loud',
            price_band: 'paid',
        };
        const result = getSterkePunten(loc);
        assert.deepStrictEqual(result, []);
    });
});
