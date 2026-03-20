import { state, LUNCH_PLAY_PATTERN } from './state.js';
import { cleanToddlerHighlight } from './utils.js';

export function computePeuterScore(loc) {
    let score = 0;
    if (loc.min_age === null || loc.min_age <= 2) score += 3;
    if (loc.diaper) score += 3;
    if (loc.coffee) score += 1;
    if (loc.weather && ['indoor','hybrid','both'].includes(loc.weather)) score += 2;
    if (loc.toddler_highlight) score += 1;
    if (loc.is_featured && loc.featured_until && new Date(loc.featured_until) > new Date()) score += 1;
    return score;
}

export function matchesPreset(loc) {
    if (!state.activePreset) return true;
    switch (state.activePreset) {
        case 'rain':
            return ['indoor', 'hybrid', 'both'].includes(loc.weather) || loc.rain_backup_quality === 'strong';
        case 'outdoor-coffee':
            return ['outdoor', 'hybrid', 'both'].includes(loc.weather) && !!loc.coffee;
        case 'dreumesproof':
            return (loc.min_age === null || loc.min_age <= 1)
                && ((loc.max_age === null || loc.max_age >= 1) || !!loc.diaper || loc.buggy_friendliness === 'easy');
        case 'peuterproof':
            return (loc.min_age === null || loc.min_age <= 4) && (loc.max_age === null || loc.max_age >= 2);
        case 'lunch-play':
            return (loc.type === 'horeca' || loc.type === 'pancake' || !!loc.coffee)
                && (loc.play_corner_quality === 'strong' || !!loc.toddler_highlight || /speel|speelhoek|spelen/i.test(`${loc.description || ''} ${loc.toddler_highlight || ''}`));
        case 'terras-kids':
            return ['snacks', 'full'].includes(loc.food_fit)
                && !!loc.coffee
                && ['outdoor', 'both', 'hybrid'].includes(loc.weather);
        case 'short-drive':
            return true;
        default:
            return true;
    }
}

export function matchesPresetDistance(loc, travelInfo) {
    if (state.activePreset !== 'short-drive') return true;
    return !!travelInfo && travelInfo.distanceKm <= 10;
}

export function getPrimaryFitReason(item) {
    if (item.toddler_highlight) return cleanToddlerHighlight(item.toddler_highlight);
    if (item.play_corner_quality === 'strong') return 'Duidelijke speelprikkel of speelhoek voor jonge kinderen.';
    if (item.type === 'play') return 'Kinderen kunnen hier meteen zelf aan de slag zonder lange opstart.';
    if (item.type === 'farm') return 'Dieren en buitenruimte maken dit vaak laagdrempelig voor peuters.';
    if (item.type === 'museum') return 'Geschikt als kort en prikkelrijk uitje met duidelijke focus.';
    if (item.type === 'horeca' || item.type === 'pancake') return 'Handig als je spelen en iets eten slim wilt combineren.';
    return 'Praktische plek voor een peuteruitje met duidelijke oudercomfortsignalen.';
}

export function getLogisticsReason(item, travelInfo) {
    if (travelInfo?.distanceKm != null) {
        if (travelInfo.distanceKm <= 5) return `Binnen ${Math.round(travelInfo.distanceKm)} km rijden.`;
        return `${travelInfo.distance} vanaf jouw locatie.`;
    }
    if (item.seo_primary_locality) return `Ligt bij ${item.seo_primary_locality}.`;
    if (item.region) return `Ligt in ${item.region}.`;
    return 'Handig als lokaal uitje.';
}

export function getComfortReason(item) {
    if (item.diaper && item.coffee) return 'Verschonen en koffie voor ouders zijn geregeld.';
    if (item.rain_backup_quality === 'strong') return 'Blijft bruikbaar als het weer omslaat.';
    if (item.buggy_friendliness === 'easy') return 'Logistiek prettig met buggy of jongere kinderen.';
    if (item.toilet_confidence === 'high') return 'Sanitair voelt hier voorspelbaar en praktisch.';
    if (item.coffee) return 'Ook voor ouders een ontspannen stop.';
    if (item.diaper) return 'Handig als je onderweg nog wilt verschonen.';
    return 'Praktisch in te passen in een korte peuterroute.';
}

export function getDecisionHeadline(item, travelInfo) {
    if (state.activePreset === 'rain') return 'Sterke keuze als het weer kan omslaan';
    if (state.activePreset === 'outdoor-coffee') return 'Buitenlucht voor kinderen, landingsplek voor ouders';
    if (state.activePreset === 'dreumesproof') return 'Rustiger en overzichtelijk voor de jongste kinderen';
    if (state.activePreset === 'peuterproof') return 'Genoeg speelenergie kwijt zonder veel uitleg';
    if (state.activePreset === 'short-drive' && travelInfo?.distanceKm != null) return `Dichtbij voor een korte rit van ${Math.round(travelInfo.distanceKm)} km`;
    if (state.activePreset === 'lunch-play') return 'Eten en spelen vallen hier logisch samen';
    if (state.activePreset === 'terras-kids') return 'Terras voor jou, speelruimte voor de kids';
    if (item.rain_backup_quality === 'strong') return 'Zekerder als je een plan B voor het weer wilt';
    if (travelInfo?.distanceKm != null && travelInfo.distanceKm <= 5) return 'Snel geregeld zonder lange rit';
    if (item.play_corner_quality === 'strong') return 'Makkelijk kiezen als je vooral speelruimte zoekt';
    if (item.coffee && item.diaper) return 'Praktisch voor oudercomfort onderweg';
    return 'Goede kanshebber voor een soepel peuteruitje';
}

export function getCardReasons(item, travelInfo) {
    return {
        headline: getDecisionHeadline(item, travelInfo),
        primary: getPrimaryFitReason(item),
        secondary: [
            { label: 'Logistiek', value: getLogisticsReason(item, travelInfo) },
            { label: 'Voor ouders', value: getComfortReason(item) }
        ]
    };
}

export function getCardDecisionSentence(item, travelInfo) {
    const primary = getPrimaryFitReason(item);
    const comfort = getComfortReason(item);
    const logistics = getLogisticsReason(item, travelInfo);
    if (state.activePreset === 'short-drive' && travelInfo?.distanceKm != null) return `${primary} ${logistics}`;
    if (state.activePreset === 'rain') return `${primary} ${item.rain_backup_quality === 'strong' ? 'Blijft bruikbaar als het weer omslaat.' : comfort}`;
    if (item.diaper || item.coffee || item.play_corner_quality === 'strong' || item.rain_backup_quality === 'strong') return `${primary} ${comfort}`;
    return `${primary} ${logistics}`;
}

export function getCardQuickFacts(item, travelInfo) {
    const facts = [];
    if (item.diaper && item.coffee) facts.push('Koffie + verschonen');
    else if (item.diaper) facts.push('Verschonen geregeld');
    else if (item.coffee) facts.push('Koffie voor ouders');
    else if (item.rain_backup_quality === 'strong') facts.push('Sterk bij regen');
    else if (item.play_corner_quality === 'strong') facts.push('Sterke speelprikkel');
    else if (item.time_of_day_fit === 'ochtend') facts.push('Fijn in de ochtend');
    else if (item.time_of_day_fit === 'middag') facts.push('Sterker in de middag');
    if (!facts.length) {
        if (travelInfo?.distanceKm != null) facts.push(travelInfo.distanceKm <= 5 ? `${Math.round(travelInfo.distanceKm)} km rijden` : travelInfo.distance);
        else if (item.seo_primary_locality) facts.push(`Bij ${item.seo_primary_locality}`);
        else if (item.region) facts.push(item.region);
    }
    return facts.slice(0, 1);
}

export function getVerificationModeLabel(mode) {
    const labels = {
        editorial: 'Redactioneel gecontroleerd',
        partner: 'Aangevuld door locatie',
        parent_signal: 'Aangescherpt met oudersignaal',
        web_verified: 'Website gecontroleerd',
        phone_verified: 'Telefonisch gecheckt',
        visit_verified: 'Op locatie gecheckt'
    };
    return labels[mode] || null;
}

export function getTrustChips(item) {
    const chips = [];
    const verificationLabel = getVerificationModeLabel(item.verification_mode);
    if (verificationLabel) chips.push({ tone: 'positive', label: verificationLabel });
    if (typeof item.verification_confidence === 'number' && Number.isFinite(item.verification_confidence)) {
        const pct = Math.round(Math.max(0, Math.min(1, item.verification_confidence)) * 100);
        if (pct >= 70) chips.push({ tone: 'neutral', label: `Betrouwbaarheid ${pct}%` });
    }
    if (item.seo_primary_locality) chips.push({ tone: 'neutral', label: `Buurt: ${item.seo_primary_locality}` });
    if (item.price_band) {
        const priceLabels = { free: 'Gratis of bijna gratis', low: 'Laag budget', mid: 'Middenklasse', high: 'Duurdere stop' };
        chips.push({ tone: 'neutral', label: priceLabels[item.price_band] || item.price_band });
    }
    return chips.slice(0, 3);
}

export function getCompactTrustChip(item) {
    const verificationLabel = getVerificationModeLabel(item.verification_mode);
    if (verificationLabel) {
        return {
            tone: 'positive',
            label: verificationLabel
                .replace('Redactioneel gecontroleerd', 'Redactie gecheckt')
                .replace('Website gecontroleerd', 'Website gecheckt')
                .replace('Telefonisch gecheckt', 'Telefonisch gecheckt')
                .replace('Op locatie gecheckt', 'Ter plekke gecheckt')
                .replace('Aangevuld door locatie', 'Locatie aangevuld')
                .replace('Aangescherpt met oudersignaal', 'Oudersignaal meegewogen')
        };
    }
    if (typeof item.verification_confidence === 'number' && Number.isFinite(item.verification_confidence)) {
        const pct = Math.round(Math.max(0, Math.min(1, item.verification_confidence)) * 100);
        if (pct >= 75) return { tone: 'neutral', label: `Betrouwbaarheid ${pct}%` };
    }
    return null;
}

export function getTrustBullets(item) {
    const bullets = [];
    const verificationLabel = getVerificationModeLabel(item.verification_mode);
    if (verificationLabel) bullets.push(verificationLabel);
    if (typeof item.verification_confidence === 'number' && Number.isFinite(item.verification_confidence)) {
        bullets.push(`Interne betrouwbaarheidsscore ${Math.round(Math.max(0, Math.min(1, item.verification_confidence)) * 100)}%.`);
    }
    if (item.last_verified) bullets.push(`Laatste check: ${item.last_verified}.`);
    return bullets.slice(0, 3);
}

export function getPracticalBullets(item) {
    const bullets = [];
    const timeLabels = {
        ochtend: 'Vooral handig als ochtendstop.',
        middag: 'Sterker als middaguitje.',
        'hele dag': 'Kan een langere halve of hele dag dragen.',
        flexibel: 'Werkt zowel kort als langer, afhankelijk van je route.'
    };
    const simpleLabels = {
        strong: 'sterk', medium: 'redelijk', low: 'beperkt', easy: 'makkelijk',
        mixed: 'wisselend', calm: 'rustiger', lively: 'levendiger', high: 'hoog'
    };
    if (item.time_of_day_fit && timeLabels[item.time_of_day_fit]) bullets.push(timeLabels[item.time_of_day_fit]);
    if (item.rain_backup_quality) bullets.push(`Slechtweeroptie: ${simpleLabels[item.rain_backup_quality] || item.rain_backup_quality}.`);
    if (item.buggy_friendliness) bullets.push(`Buggyvriendelijkheid: ${simpleLabels[item.buggy_friendliness] || item.buggy_friendliness}.`);
    if (item.parking_ease) bullets.push(`Parkeren: ${simpleLabels[item.parking_ease] || item.parking_ease}.`);
    if (item.food_fit) bullets.push(`Eten combineren: ${simpleLabels[item.food_fit] || item.food_fit}.`);
    if (item.play_corner_quality) bullets.push(`Speelwaarde: ${simpleLabels[item.play_corner_quality] || item.play_corner_quality}.`);
    if (item.toilet_confidence) bullets.push(`Sanitairvertrouwen: ${simpleLabels[item.toilet_confidence] || item.toilet_confidence}.`);
    if (item.noise_level) bullets.push(`Prikkel-/geluidsniveau: ${simpleLabels[item.noise_level] || item.noise_level}.`);
    return bullets.slice(0, 4);
}

export function computePeuterScoreV2(location, context = {}) {
    // context = { childAge, weather, dayOfWeek }
    // weather: 'rain' | 'sun' | null
    // Returns { total: number, dimensions: {...} }

    let weights = {
        ageFit: 0.25, facilities: 0.20, playValue: 0.20,
        weatherFit: 0.15, practical: 0.10, reliability: 0.10
    };

    // Context adjustments
    if (context.weather === 'rain') {
        weights.weatherFit += 0.10;
        weights.playValue -= 0.05;
        weights.practical -= 0.05;
    }
    if (context.childAge) {
        weights.ageFit += 0.10;
        weights.reliability -= 0.05;
        weights.practical -= 0.05;
    }
    if (context.dayOfWeek >= 6) { // weekend
        weights.practical += 0.05;
        weights.reliability -= 0.05;
    }

    // 1. Age match (0-10)
    let ageFitScore = 5;
    if (context.childAge && location.min_age != null && location.max_age != null) {
        const optimalAge = (location.min_age + location.max_age) / 2;
        const diff = Math.abs(context.childAge - optimalAge);
        const range = (location.max_age - location.min_age) / 2;
        if (diff <= range * 0.5) ageFitScore = 10;
        else if (diff <= range) ageFitScore = 7;
        else if (diff <= range + 1) ageFitScore = 4;
        else ageFitScore = 1;
    }

    // 2. Facilities (0-10)
    let facilitiesScore = 0;
    if (location.diaper) facilitiesScore += 3;
    if (location.coffee) facilitiesScore += 2;
    if (location.buggy_friendliness === 'easy') facilitiesScore += 2;
    else if (location.buggy_friendliness === 'okay') facilitiesScore += 1;
    if (location.parking_ease === 'easy') facilitiesScore += 1.5;
    if (location.toilet_confidence === 'high') facilitiesScore += 1.5;
    facilitiesScore = Math.min(10, facilitiesScore);

    // 3. Play value (0-10)
    let playScore = 0;
    if (location.play_corner_quality === 'strong') playScore += 4;
    else if (location.play_corner_quality === 'basic') playScore += 2;
    if (location.toddler_highlight) playScore += 3;
    if (location.noise_level === 'moderate') playScore += 2;
    else if (location.noise_level === 'quiet') playScore += 1;
    playScore = Math.min(10, playScore);

    // 4. Weather fit (0-10)
    let weatherScore = 5;
    if (context.weather === 'rain') {
        if (location.rain_backup_quality === 'strong') weatherScore = 10;
        else if (location.rain_backup_quality === 'weak') weatherScore = 5;
        else if (['indoor', 'hybrid', 'both'].includes(location.weather)) weatherScore = 9;
        else weatherScore = 1;
    } else if (context.weather === 'sun') {
        weatherScore = ['outdoor', 'both'].includes(location.weather) ? 8 : 5;
        if (location.shade_or_shelter === 'good') weatherScore = Math.min(10, weatherScore + 2);
    }

    // 5. Practical (0-10)
    let practicalScore = 0;
    if (location.food_fit === 'full') practicalScore += 3;
    else if (location.food_fit === 'snacks') practicalScore += 1.5;
    if (location.price_band === 'free') practicalScore += 3;
    else if (location.price_band === 'low') practicalScore += 2;
    if (location.crowd_pattern && location.crowd_pattern.includes('rustig')) practicalScore += 2;
    if (location.time_of_day_fit) practicalScore += 2;
    practicalScore = Math.min(10, practicalScore);

    // 6. Reliability (0-10)
    let reliabilityScore = 5;
    if (location.verification_confidence === 'high') reliabilityScore = 9;
    else if (location.verification_confidence === 'medium') reliabilityScore = 6;
    reliabilityScore = Math.min(10, reliabilityScore);

    // Weighted total
    const raw = (ageFitScore * weights.ageFit) +
                (facilitiesScore * weights.facilities) +
                (playScore * weights.playValue) +
                (weatherScore * weights.weatherFit) +
                (practicalScore * weights.practical) +
                (reliabilityScore * weights.reliability);

    const featured = location.is_featured ? 0.3 : 0;

    return {
        total: Math.min(10, Math.round((raw + featured) * 10) / 10),
        dimensions: {
            ageFit: { score: Math.round(ageFitScore * 10) / 10, weight: weights.ageFit, label: 'Leeftijdsmatch' },
            facilities: { score: Math.round(facilitiesScore * 10) / 10, weight: weights.facilities, label: 'Faciliteiten' },
            playValue: { score: Math.round(playScore * 10) / 10, weight: weights.playValue, label: 'Speelwaarde' },
            weatherFit: { score: Math.round(weatherScore * 10) / 10, weight: weights.weatherFit, label: 'Weerbestendigheid' },
            practical: { score: Math.round(practicalScore * 10) / 10, weight: weights.practical, label: 'Praktisch' },
            reliability: { score: Math.round(reliabilityScore * 10) / 10, weight: weights.reliability, label: 'Betrouwbaarheid' }
        }
    };
}

export function getTopStrengths(scoreResult, context = {}) {
    const labels = {
        ageFit: { strong: 'Ideaal voor peuters', good: 'Geschikt voor peuters' },
        facilities: { strong: 'Uitstekende faciliteiten', good: 'Goede faciliteiten' },
        playValue: { strong: 'Sterke speelprikkel', good: 'Leuke speelmogelijkheden' },
        weatherFit: { strong: 'Regenproof', good: 'Goed bij wisselend weer' },
        practical: { strong: 'Zeer praktisch', good: 'Praktisch ingericht' },
        reliability: { strong: 'Recent geverifieerd', good: 'Betrouwbare info' }
    };

    // Override weather label when sunny
    if (context.weather === 'sun') {
        labels.weatherFit.strong = 'Perfect buitenweer';
        labels.weatherFit.good = 'Lekker buiten';
    }

    return Object.entries(scoreResult.dimensions)
        .sort(([, a], [, b]) => (b.score * b.weight) - (a.score * a.weight))
        .slice(0, 3)
        .map(([key, dim]) => ({
            label: dim.score >= 7 ? labels[key].strong : labels[key].good,
            dimension: key,
            score: dim.score
        }));
}
