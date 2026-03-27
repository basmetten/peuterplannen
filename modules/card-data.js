/**
 * card-data.js — Shared data layer for all location card variants.
 *
 * Single source of truth for computing display fields from a location object.
 * Every card variant (scan card, sheet scan card, compact card, preview card)
 * should use getCardFields() and the individual helpers here instead of
 * computing their own data inline.
 */

import { state, TYPE_LABELS, WEATHER_LABELS } from './state.js';
import { getPhotoData } from './templates.js';
import {
    computePeuterScoreV2,
    getCardDecisionSentence,
    getPrimaryFitReason,
    getTrustBullets,
    getPracticalBullets
} from './scoring.js';
import { getSterkePunten } from './tags.js';
import { cleanToddlerHighlight } from './utils.js';

// Re-export getPhotoData so consumers can import from card-data
export { getPhotoData };

/**
 * Unified distance label: prefer travel time info, fall back to region.
 *
 * @param {Object} loc - Location object
 * @param {Object} [travelInfo] - Travel time info from calculateTravelTimes (e.g. { duration, distanceKm })
 * @returns {string} Human-readable distance label
 */
export function getDistanceLabel(loc, travelInfo) {
    if (travelInfo && travelInfo.duration) {
        return travelInfo.duration;
    }
    return loc.region || '';
}

/**
 * Unified weather label from the location's weather field.
 *
 * @param {Object} loc - Location object
 * @returns {string|null} Weather label or null
 */
export function getWeatherLabel(loc) {
    return (loc.weather && WEATHER_LABELS[loc.weather]) ? WEATHER_LABELS[loc.weather] : null;
}

/**
 * Unified kenmerken (feature) tags for a location.
 * Combines logic previously scattered across cards.js, templates.js, and sheet-engine.js.
 *
 * @param {Object} loc - Location object
 * @param {number} [max=3] - Maximum number of tags to return
 * @returns {Array<{label: string, icon: string}>}
 */
export function getKenmerkenTags(loc, max = 3) {
    const tags = [];

    // Core facilities
    if (loc.coffee) tags.push({ label: 'Koffie', icon: '\u2615' });
    if (loc.diaper) tags.push({ label: 'Verschonen', icon: '\uD83D\uDEBC' });

    // Weather label from weather field
    const weatherLabel = getWeatherLabel(loc);
    if (weatherLabel) {
        const icon = (loc.weather === 'indoor') ? '\uD83C\uDFE0' : '\uD83C\uDF3F';
        tags.push({ label: weatherLabel, icon });
    }

    // Play quality
    if (loc.play_corner_quality === 'strong') tags.push({ label: 'Speelprikkel', icon: '\uD83C\uDFAF' });

    // Rain backup
    if (loc.rain_backup_quality === 'strong') tags.push({ label: 'Regenproof', icon: '\u2614' });

    // Parking
    if (loc.parking_ease === 'easy') tags.push({ label: 'Makkelijk parkeren', icon: '\uD83C\uDD7F\uFE0F' });

    return tags.slice(0, max);
}

/**
 * Unified one-liner: 3-step fallback chain.
 * 1. Decision sentence (context-aware)
 * 2. Toddler highlight (editorial)
 * 3. Primary fit reason (computed)
 *
 * @param {Object} loc - Location object
 * @param {Object} [travelInfo] - Travel time info
 * @returns {string}
 */
export function getUnifiedOneLiner(loc, travelInfo) {
    return getCardDecisionSentence(loc, travelInfo)
        || (loc.toddler_highlight ? cleanToddlerHighlight(loc.toddler_highlight) : '')
        || getPrimaryFitReason(loc)
        || '';
}

/**
 * Full 8-item facility grid data for detail views.
 *
 * @param {Object} loc - Location object
 * @returns {Array<{icon: string, label: string, available: boolean}>}
 */
export function getFacilitiesGrid(loc) {
    return [
        { icon: '\u2615', label: 'Koffie', available: !!loc.coffee },
        { icon: '\uD83D\uDEBC', label: 'Verschonen', available: !!loc.diaper },
        { icon: '\uD83C\uDD7F\uFE0F', label: 'Parkeren', available: loc.parking_ease === 'easy' },
        { icon: '\uD83D\uDED2', label: 'Buggy OK', available: loc.buggy_friendliness === 'easy' },
        { icon: '\uD83D\uDEBB', label: 'Toilet', available: loc.toilet_confidence === 'high' || loc.toilet_confidence === 'confident' },
        { icon: '\uD83C\uDFE0', label: 'Binnen', available: loc.weather === 'indoor' || loc.weather === 'both' || loc.weather === 'hybrid' },
        { icon: '\uD83C\uDF3F', label: 'Buiten', available: loc.weather === 'outdoor' || loc.weather === 'both' || loc.weather === 'hybrid' },
        { icon: '\uD83C\uDF77', label: 'Alcohol', available: !!loc.alcohol },
    ];
}

/**
 * Score tier classification.
 *
 * @param {number} total - Score total (0-10)
 * @returns {'high'|'mid'|'low'}
 */
export function getScoreTier(total) {
    if (total >= 7) return 'high';
    if (total >= 5) return 'mid';
    return 'low';
}

/**
 * Find nearby locations of the same type, sorted by distance.
 * Used for "Vergelijkbaar in de buurt" retention tail in detail view.
 */
export function findNearbyByType(loc, count = 3) {
    if (!loc.lat || !loc.lng) return [];
    return state.allLocations
        .filter(l => l.id !== loc.id && l.type === loc.type && l.lat && l.lng)
        .map(l => ({
            ...l,
            _dist: Math.sqrt(
                Math.pow(l.lat - loc.lat, 2) + Math.pow(l.lng - loc.lng, 2)
            )
        }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, count);
}

/**
 * Returns ALL computed fields for a location, so any card variant can pick what it needs.
 *
 * @param {Object} loc - Location object
 * @param {Object} [opts] - Options
 * @param {Object} [opts.travelInfo] - Travel time info for this location
 * @returns {Object} All computed card fields
 */
export function getCardFields(loc, opts = {}) {
    const { travelInfo } = opts;
    const photo = getPhotoData(loc);
    const score = computePeuterScoreV2(loc);
    const scoreTier = getScoreTier(score.total);

    return {
        // Photo
        photo,

        // Core
        name: loc.name,
        type: loc.type,
        typeLabel: TYPE_LABELS[loc.type] || loc.type,

        // Distance
        distanceLabel: getDistanceLabel(loc, travelInfo),

        // One-liner (unified 3-step chain)
        oneLiner: getUnifiedOneLiner(loc, travelInfo),

        // Kenmerken tags (unified)
        tags: getKenmerkenTags(loc, 6),

        // Score (always V2)
        score,
        scoreTier,

        // Extended
        ageRange: loc.min_age != null && loc.max_age != null ? `${loc.min_age}\u2013${loc.max_age} jr` : null,
        priceBand: loc.price_band || null,
        weatherFit: loc.weather || null,
        highlight: loc.toddler_highlight || null,
        description: loc.description || null,

        // Trust & practical
        sterkePunten: getSterkePunten(loc),
        trustBullets: getTrustBullets(loc),
        practicalBullets: getPracticalBullets(loc),

        // Facilities
        facilities: getFacilitiesGrid(loc),

        // Actions
        routeUrl: loc.lat && loc.lng
            ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.lat + ',' + loc.lng)}`
            : null,
        websiteUrl: loc.website || null,
    };
}
