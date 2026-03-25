import { state } from './state.js';

/**
 * Quick-scan tags: max 3 per location, weather-reactive priorities.
 */
export function getTopTags(location) {
    const candidates = [];

    // Weer-gerelateerd (hoogste prioriteit bij relevant weer)
    if (location.rain_backup_quality === 'strong')
        candidates.push({ label: 'Regenproof', icon: '☔', priority: state.isRaining ? 10 : 3 });
    if (location.shade_or_shelter === 'good')
        candidates.push({ label: 'Veel schaduw', icon: '⛱️', priority: state.isSunny ? 8 : 2 });

    // Gemak
    if (location.parking_ease === 'easy')
        candidates.push({ label: 'Makkelijk parkeren', icon: '🅿️', priority: 5 });
    if (location.buggy_friendliness === 'easy')
        candidates.push({ label: 'Buggy-vriendelijk', icon: '👶', priority: 4 });
    if (location.toilet_confidence === 'high')
        candidates.push({ label: 'Goede toiletten', icon: '🚻', priority: 3 });

    // Eten & drinken
    if (location.food_fit === 'full')
        candidates.push({ label: 'Goed lunchen', icon: '🍽️', priority: 5 });
    else if (location.food_fit === 'snacks')
        candidates.push({ label: 'Snacks aanwezig', icon: '🍪', priority: 2 });
    if (location.coffee)
        candidates.push({ label: 'Koffie', icon: '☕', priority: 3 });

    // Speelwaarde
    if (location.play_corner_quality === 'strong')
        candidates.push({ label: 'Sterke speelprikkel', icon: '🎯', priority: 6 });
    if (location.noise_level === 'quiet')
        candidates.push({ label: 'Rustige plek', icon: '🤫', priority: 4 });

    // Timing
    if (location.time_of_day_fit === 'ochtend')
        candidates.push({ label: 'Ochtend is het mooist', icon: '🌅', priority: 3 });

    // Drukte
    if (location.crowd_pattern?.includes('rustig doordeweeks'))
        candidates.push({ label: 'Rustig doordeweeks', icon: '📅', priority: 3 });

    // Prijs
    if (location.price_band === 'free')
        candidates.push({ label: 'Gratis', icon: '🎉', priority: 5 });

    return candidates.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

/**
 * Weather-reactive badge for card overlay.
 */
export function getWeatherBadge(location) {
    if (state.isRaining && location.rain_backup_quality === 'strong')
        return { label: '☔ Regenproof', className: 'weather-badge--rain' };
    if (state.isSunny && location.shade_or_shelter === 'good')
        return { label: '⛱️ Schaduwrijk', className: 'weather-badge--sun' };
    return null;
}

/**
 * "Sterke punten" bullets for sheet/detail view.
 */
export function getSterkePunten(location) {
    const punten = [];
    if (location.diaper) punten.push('Verschoontafel aanwezig');
    if (location.coffee && location.food_fit === 'full')
        punten.push('Kindvriendelijk restaurant met koffie');
    else if (location.coffee)
        punten.push('Koffie voor ouders');
    else if (location.food_fit === 'full')
        punten.push('Goed kunnen lunchen met kids');
    if (location.food_fit === 'snacks' && !location.coffee)
        punten.push('Snacks en drankjes te koop');
    if (location.rain_backup_quality === 'strong')
        punten.push('Goed alternatief bij regen');
    if (location.shade_or_shelter === 'good')
        punten.push('Veel schaduw beschikbaar');
    if (location.parking_ease === 'easy')
        punten.push('Makkelijk parkeren');
    if (location.buggy_friendliness === 'easy')
        punten.push('Goed bereikbaar met buggy');
    if (location.toilet_confidence === 'high')
        punten.push('Schone toiletten');
    if (location.play_corner_quality === 'strong')
        punten.push('Uitdagend en gevarieerd spelen');
    if (location.noise_level === 'quiet')
        punten.push('Rustige, ontspannen sfeer');
    if (location.price_band === 'free')
        punten.push('Gratis toegankelijk');
    return punten;
}
