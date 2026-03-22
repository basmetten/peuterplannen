const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Both modules/discovery.js and modules/state.js are ESM — use dynamic import().
// state is a shared mutable object, so mutating it here affects discovery.js reads.
const ROOT = path.resolve(__dirname, '..', '..', '..');

let getThisWeekPicks, state;

async function setup() {
    const stateModule = await import(path.join(ROOT, 'modules', 'state.js'));
    const discoveryModule = await import(path.join(ROOT, 'modules', 'discovery.js'));
    state = stateModule.state;
    getThisWeekPicks = discoveryModule.getThisWeekPicks;
}

// --- Helper: base mock location ---
function baseLoc(overrides = {}) {
    return {
        id: 1,
        name: 'Test Locatie',
        type: 'play',
        region: 'Amsterdam',
        min_age: null,
        max_age: null,
        diaper: false,
        coffee: false,
        weather: null,
        toddler_highlight: null,
        is_featured: false,
        featured_until: null,
        photo_url: 'https://example.com/photo.jpg',
        owner_photo_url: null,
        photo_quality: 4,
        rain_backup_quality: null,
        ...overrides,
    };
}

/** Create a set of diverse locations with different types */
function makeLocations(count, overrides = {}) {
    const types = ['play', 'farm', 'nature', 'museum', 'swim', 'horeca', 'pancake'];
    return Array.from({ length: count }, (_, i) => baseLoc({
        id: i + 1,
        name: `Locatie ${i + 1}`,
        type: types[i % types.length],
        ...overrides,
    }));
}

// ============================================================
// SEASONAL_TYPES table — correct month-mapping
// ============================================================
describe('SEASONAL_TYPES month mapping', () => {
    beforeEach(async () => { await setup(); });

    it('returns indoor-focused picks in January (month 0)', () => {
        // Mock Date to January
        const RealDate = globalThis.Date;
        globalThis.Date = class extends RealDate {
            constructor(...args) {
                if (args.length === 0) {
                    super(2026, 0, 15); // Jan 15, 2026
                } else {
                    super(...args);
                }
            }
            static now() { return new RealDate(2026, 0, 15).getTime(); }
        };
        globalThis.Date.prototype = RealDate.prototype;

        try {
            state.isRaining = false;
            state.isSunny = false;

            const locs = [
                baseLoc({ id: 1, type: 'museum', name: 'Museum A' }),
                baseLoc({ id: 2, type: 'indoor', name: 'Indoor B' }),
                baseLoc({ id: 3, type: 'play', name: 'Speeltuin C' }),
                baseLoc({ id: 4, type: 'swim', name: 'Zwembad D' }),
                baseLoc({ id: 5, type: 'nature', name: 'Natuur E' }),
                baseLoc({ id: 6, type: 'farm', name: 'Boerderij F' }),
            ];

            const picks = getThisWeekPicks(locs, null);
            // Museum and indoor should score higher due to seasonal bonus
            const topTypes = picks.slice(0, 2).map(p => p.type);
            assert.ok(
                topTypes.includes('museum') || topTypes.includes('indoor'),
                `Expected museum or indoor in top picks for January, got: ${topTypes.join(', ')}`
            );
        } finally {
            globalThis.Date = RealDate;
        }
    });

    it('returns outdoor-focused picks in July (month 6)', () => {
        const RealDate = globalThis.Date;
        globalThis.Date = class extends RealDate {
            constructor(...args) {
                if (args.length === 0) {
                    super(2026, 6, 15); // July 15, 2026
                } else {
                    super(...args);
                }
            }
            static now() { return new RealDate(2026, 6, 15).getTime(); }
        };
        globalThis.Date.prototype = RealDate.prototype;

        try {
            state.isRaining = false;
            state.isSunny = false;

            const locs = [
                baseLoc({ id: 1, type: 'swim', name: 'Zwembad A' }),
                baseLoc({ id: 2, type: 'play', name: 'Speeltuin B' }),
                baseLoc({ id: 3, type: 'nature', name: 'Natuur C' }),
                baseLoc({ id: 4, type: 'museum', name: 'Museum D' }),
                baseLoc({ id: 5, type: 'indoor', name: 'Indoor E' }),
                baseLoc({ id: 6, type: 'farm', name: 'Boerderij F' }),
            ];

            const picks = getThisWeekPicks(locs, null);
            // Swim, play, nature should score higher in July
            const topTypes = picks.slice(0, 3).map(p => p.type);
            assert.ok(
                topTypes.includes('swim') || topTypes.includes('play') || topTypes.includes('nature'),
                `Expected swim/play/nature in top picks for July, got: ${topTypes.join(', ')}`
            );
        } finally {
            globalThis.Date = RealDate;
        }
    });

    it('returns farm/nature picks in March (month 2 — lammetjes)', () => {
        const RealDate = globalThis.Date;
        globalThis.Date = class extends RealDate {
            constructor(...args) {
                if (args.length === 0) {
                    super(2026, 2, 15); // March 15, 2026
                } else {
                    super(...args);
                }
            }
            static now() { return new RealDate(2026, 2, 15).getTime(); }
        };
        globalThis.Date.prototype = RealDate.prototype;

        try {
            state.isRaining = false;
            state.isSunny = false;

            const locs = [
                baseLoc({ id: 1, type: 'farm', name: 'Boerderij A' }),
                baseLoc({ id: 2, type: 'nature', name: 'Natuur B' }),
                baseLoc({ id: 3, type: 'museum', name: 'Museum C' }),
                baseLoc({ id: 4, type: 'swim', name: 'Zwembad D' }),
                baseLoc({ id: 5, type: 'play', name: 'Speeltuin E' }),
            ];

            const picks = getThisWeekPicks(locs, null);
            const topTypes = picks.slice(0, 2).map(p => p.type);
            assert.ok(
                topTypes.includes('farm') || topTypes.includes('nature'),
                `Expected farm or nature in top picks for March, got: ${topTypes.join(', ')}`
            );
        } finally {
            globalThis.Date = RealDate;
        }
    });
});

// ============================================================
// getThisWeekPicks — core behavior
// ============================================================
describe('getThisWeekPicks', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('returns at most 5 picks (WEEK_PICKS_COUNT)', () => {
        const locs = makeLocations(20);
        const picks = getThisWeekPicks(locs, null);
        assert.ok(picks.length <= 5, `Expected <= 5 picks, got ${picks.length}`);
    });

    it('returns fewer picks when fewer locations available', () => {
        const locs = makeLocations(3);
        const picks = getThisWeekPicks(locs, null);
        assert.equal(picks.length, 3);
    });

    it('returns empty array when no locations provided', () => {
        const picks = getThisWeekPicks([], null);
        assert.deepStrictEqual(picks, []);
    });

    it('filters by region when region provided and enough candidates', () => {
        const locs = [
            ...makeLocations(12, { region: 'Amsterdam' }),
            ...makeLocations(5, { region: 'Rotterdam' }),
        ];
        const picks = getThisWeekPicks(locs, 'Amsterdam');
        // All picks should be Amsterdam since there are 12 (>10 min fallback)
        for (const p of picks) {
            assert.equal(p.region, 'Amsterdam', `Expected Amsterdam, got ${p.region}`);
        }
    });

    it('falls back to all locations when region has fewer than 10 candidates', () => {
        const locs = [
            ...makeLocations(3, { region: 'Zeeland' }),
            ...makeLocations(15, { region: 'Amsterdam' }),
        ];
        const picks = getThisWeekPicks(locs, 'Zeeland');
        // Should include locations from all regions since Zeeland only has 3
        assert.ok(picks.length > 0, 'Should return some picks');
    });

    it('enforces type diversity — prefers different types in picks', () => {
        // Create many locations of the same type
        const locs = [
            ...Array.from({ length: 10 }, (_, i) => baseLoc({
                id: i + 1, type: 'play', name: `Speeltuin ${i}`,
            })),
            baseLoc({ id: 11, type: 'museum', name: 'Museum A' }),
            baseLoc({ id: 12, type: 'farm', name: 'Boerderij A' }),
            baseLoc({ id: 13, type: 'nature', name: 'Natuur A' }),
        ];

        const picks = getThisWeekPicks(locs, null);
        const types = picks.map(p => p.type);
        const uniqueTypes = new Set(types);
        // Should have at least 3 unique types (DIVERSITY_MIN_PICKS)
        // if enough different types exist in candidates
        assert.ok(uniqueTypes.size >= 3 || picks.length < 3,
            `Expected type diversity, got types: ${types.join(', ')}`);
    });

    it('returns location objects, not score wrappers', () => {
        const locs = makeLocations(5);
        const picks = getThisWeekPicks(locs, null);
        for (const p of picks) {
            assert.ok(p.id !== undefined, 'Pick should have an id');
            assert.ok(p.name !== undefined, 'Pick should have a name');
            assert.ok(p.type !== undefined, 'Pick should have a type');
            assert.equal(p.score, undefined, 'Pick should not expose score');
        }
    });
});

// ============================================================
// Score weighting with photo quality
// ============================================================
describe('photo quality scoring', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('prefers locations with photos over those without', () => {
        const withPhoto = baseLoc({
            id: 1, type: 'play', name: 'With Photo',
            photo_url: 'https://example.com/photo.jpg', photo_quality: 5,
        });
        const withoutPhoto = baseLoc({
            id: 2, type: 'play', name: 'No Photo',
            photo_url: null, owner_photo_url: null, photo_quality: undefined,
        });
        // Need enough locs to avoid fallback
        const filler = makeLocations(10, { photo_url: null, owner_photo_url: null });
        const locs = [withoutPhoto, withPhoto, ...filler];
        const picks = getThisWeekPicks(locs, null);
        // withPhoto should appear in picks (it has a photo and high quality)
        const hasWithPhoto = picks.some(p => p.id === 1);
        assert.ok(hasWithPhoto, 'Location with photo should be in picks');
    });

    it('prefers high photo_quality over low photo_quality', () => {
        const highQ = baseLoc({
            id: 1, type: 'play', name: 'High Quality',
            photo_quality: 8,
            // Give same base stats so photo quality is the differentiator
            min_age: 2, diaper: true, coffee: true, weather: 'indoor',
            toddler_highlight: 'Great!',
        });
        const lowQ = baseLoc({
            id: 2, type: 'play', name: 'Low Quality',
            photo_quality: 3,
            min_age: 2, diaper: true, coffee: true, weather: 'indoor',
            toddler_highlight: 'Great!',
        });
        // Put lowQ first to ensure sorting, not insertion order, matters
        const locs = [lowQ, highQ, ...makeLocations(8)];
        const picks = getThisWeekPicks(locs, null);

        const highIdx = picks.findIndex(p => p.id === 1);
        const lowIdx = picks.findIndex(p => p.id === 2);
        // Both might appear since diversity rules allow same type up to DIVERSITY_MIN_PICKS
        if (highIdx >= 0 && lowIdx >= 0) {
            assert.ok(highIdx < lowIdx, 'High quality photo should rank higher');
        }
    });

    it('filters out locations with photo_quality below threshold', () => {
        // Create mix: some with quality >= 3, some below
        const goodQuality = Array.from({ length: 12 }, (_, i) => baseLoc({
            id: i + 1, type: ['play', 'farm', 'museum', 'nature', 'swim'][i % 5],
            name: `Good ${i}`, photo_quality: 4,
        }));
        const badQuality = Array.from({ length: 5 }, (_, i) => baseLoc({
            id: 100 + i, type: 'horeca', name: `Bad ${i}`,
            photo_quality: 1, // Below PHOTO_QUALITY_THRESHOLD (3)
        }));

        const locs = [...badQuality, ...goodQuality];
        const picks = getThisWeekPicks(locs, null);
        // Bad quality locations should be filtered out (enough good ones exist)
        for (const p of picks) {
            assert.ok(p.photo_quality >= 3 || p.id < 100,
                `Expected quality >= 3 or good loc, got id=${p.id} quality=${p.photo_quality}`);
        }
    });

    it('falls back to any photo when too few high-quality candidates', () => {
        // Only 3 locations with good quality (below MIN_CANDIDATES_FALLBACK of 10)
        const fewGood = Array.from({ length: 3 }, (_, i) => baseLoc({
            id: i + 1, name: `Good ${i}`, photo_quality: 5,
        }));
        // Many with low quality but with photos
        const manyLow = Array.from({ length: 15 }, (_, i) => baseLoc({
            id: 10 + i, name: `Low ${i}`, photo_quality: 1,
            type: ['play', 'farm', 'museum', 'nature', 'swim'][i % 5],
        }));

        const locs = [...fewGood, ...manyLow];
        const picks = getThisWeekPicks(locs, null);
        assert.ok(picks.length > 0, 'Should return picks even with low quality photos');
    });

    it('uses default photo_quality of 3 when undefined', () => {
        const undefinedQuality = baseLoc({
            id: 1, type: 'play', name: 'Undefined Quality',
            photo_quality: undefined,
            // Strong base stats
            min_age: 2, diaper: true, coffee: true,
        });

        const locs = [undefinedQuality, ...makeLocations(10)];
        const picks = getThisWeekPicks(locs, null);
        // Should not crash and should include the location
        assert.ok(picks.length > 0, 'Should handle undefined photo_quality');
    });
});

// ============================================================
// Weather bonuses
// ============================================================
describe('weather bonuses', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('gives rain bonus to indoor locations when raining', () => {
        state.isRaining = true;

        const indoor = baseLoc({
            id: 1, type: 'museum', name: 'Indoor Museum',
            weather: 'indoor',
        });
        const outdoor = baseLoc({
            id: 2, type: 'nature', name: 'Outdoor Nature',
            weather: 'outdoor',
        });

        // Add filler to avoid fallback issues
        const filler = makeLocations(10);
        const locs = [outdoor, indoor, ...filler];
        const picks = getThisWeekPicks(locs, null);

        // Indoor should be ranked higher when raining
        const indoorIdx = picks.findIndex(p => p.id === 1);
        const outdoorIdx = picks.findIndex(p => p.id === 2);
        if (indoorIdx >= 0 && outdoorIdx >= 0) {
            assert.ok(indoorIdx < outdoorIdx,
                'Indoor location should rank higher when raining');
        } else {
            assert.ok(indoorIdx >= 0, 'Indoor location should be in picks when raining');
        }
    });

    it('gives sunny bonus to outdoor locations when sunny', () => {
        state.isSunny = true;

        const outdoor = baseLoc({
            id: 1, type: 'play', name: 'Outdoor Speeltuin',
            weather: 'outdoor',
        });
        const indoor = baseLoc({
            id: 2, type: 'museum', name: 'Indoor Museum',
            weather: 'indoor',
        });

        const filler = makeLocations(10);
        const locs = [indoor, outdoor, ...filler];
        const picks = getThisWeekPicks(locs, null);

        const outdoorIdx = picks.findIndex(p => p.id === 1);
        assert.ok(outdoorIdx >= 0, 'Outdoor location should be in picks when sunny');
    });

    it('gives rain bonus to "both" and "hybrid" weather types', () => {
        state.isRaining = true;

        const both = baseLoc({
            id: 1, type: 'play', name: 'Both Weather',
            weather: 'both',
            // Give strong base stats
            min_age: 2, diaper: true, coffee: true, toddler_highlight: 'Yes',
        });
        const hybrid = baseLoc({
            id: 2, type: 'farm', name: 'Hybrid Weather',
            weather: 'hybrid',
            min_age: 2, diaper: true, coffee: true, toddler_highlight: 'Yes',
        });
        const outdoor = baseLoc({
            id: 3, type: 'nature', name: 'Outdoor Only',
            weather: 'outdoor',
        });

        const filler = makeLocations(10);
        const locs = [outdoor, both, hybrid, ...filler];
        const picks = getThisWeekPicks(locs, null);

        const bothInPicks = picks.some(p => p.id === 1);
        const hybridInPicks = picks.some(p => p.id === 2);
        assert.ok(bothInPicks || hybridInPicks,
            'Locations with "both" or "hybrid" weather should benefit from rain bonus');
    });

    it('gives sunny bonus to "both" weather type', () => {
        state.isSunny = true;

        const both = baseLoc({
            id: 1, type: 'play', name: 'Both Weather',
            weather: 'both',
            min_age: 2, diaper: true, coffee: true, toddler_highlight: 'Yes',
        });
        const indoor = baseLoc({
            id: 2, type: 'museum', name: 'Indoor Only',
            weather: 'indoor',
        });

        const filler = makeLocations(10);
        const locs = [indoor, both, ...filler];
        const picks = getThisWeekPicks(locs, null);

        const bothInPicks = picks.some(p => p.id === 1);
        assert.ok(bothInPicks, '"both" weather should benefit from sunny bonus');
    });
});

// ============================================================
// Edge cases
// ============================================================
describe('edge cases', () => {
    beforeEach(async () => {
        await setup();
        state.isRaining = false;
        state.isSunny = false;
    });

    it('handles empty locations array', () => {
        const picks = getThisWeekPicks([], null);
        assert.deepStrictEqual(picks, []);
    });

    it('handles single location', () => {
        const locs = [baseLoc({ id: 1 })];
        const picks = getThisWeekPicks(locs, null);
        assert.equal(picks.length, 1);
        assert.equal(picks[0].id, 1);
    });

    it('handles all locations with same type', () => {
        const locs = Array.from({ length: 10 }, (_, i) => baseLoc({
            id: i + 1,
            type: 'play',
            name: `Speeltuin ${i}`,
        }));

        const picks = getThisWeekPicks(locs, null);
        // Should still return picks even though all same type
        assert.ok(picks.length > 0, 'Should return picks with uniform types');
        assert.ok(picks.length <= 5, 'Should not exceed 5 picks');
    });

    it('handles locations with no photos at all', () => {
        const locs = Array.from({ length: 8 }, (_, i) => baseLoc({
            id: i + 1,
            type: ['play', 'farm', 'museum', 'nature'][i % 4],
            name: `No Photo ${i}`,
            photo_url: null,
            owner_photo_url: null,
            photo_quality: undefined,
        }));

        const picks = getThisWeekPicks(locs, null);
        // Ultimate fallback: should still return something
        assert.ok(picks.length > 0, 'Should return picks even without any photos (ultimate fallback)');
    });

    it('handles locations with owner_photo_url but no photo_url', () => {
        const locs = Array.from({ length: 12 }, (_, i) => baseLoc({
            id: i + 1,
            type: ['play', 'farm', 'museum', 'nature', 'swim'][i % 5],
            name: `Owner Photo ${i}`,
            photo_url: null,
            owner_photo_url: 'https://example.com/owner.jpg',
            photo_quality: 4,
        }));

        const picks = getThisWeekPicks(locs, null);
        assert.ok(picks.length > 0, 'Should accept owner_photo_url as valid photo');
    });

    it('handles region with no matching locations gracefully', () => {
        const locs = makeLocations(15, { region: 'Amsterdam' });
        const picks = getThisWeekPicks(locs, 'NonExistentRegion');
        // Should fall back to all locations since 0 < MIN_CANDIDATES_FALLBACK
        assert.ok(picks.length > 0, 'Should fall back when region has no matches');
    });

    it('handles null region gracefully', () => {
        const locs = makeLocations(10);
        const picks = getThisWeekPicks(locs, null);
        assert.ok(picks.length > 0, 'Should handle null region');
    });

    it('handles undefined region gracefully', () => {
        const locs = makeLocations(10);
        const picks = getThisWeekPicks(locs, undefined);
        assert.ok(picks.length > 0, 'Should handle undefined region');
    });

    it('does not crash when location properties are null', () => {
        const locs = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Null Props ${i}`,
            type: null,
            region: null,
            min_age: null,
            max_age: null,
            diaper: null,
            coffee: null,
            weather: null,
            toddler_highlight: null,
            is_featured: null,
            featured_until: null,
            photo_url: 'https://example.com/p.jpg',
            owner_photo_url: null,
            photo_quality: null,
        }));

        // Should not throw
        const picks = getThisWeekPicks(locs, null);
        assert.ok(Array.isArray(picks), 'Should return an array even with null properties');
    });
});
