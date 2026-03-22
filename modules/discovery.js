import { state } from './state.js';
import { computePeuterScore } from './scoring.js';
import bus from './bus.js';

const SEASONAL_TYPES = {
    0: ['museum', 'indoor'],      // jan - indoor focus
    1: ['museum', 'indoor'],      // feb
    2: ['farm', 'nature'],         // maart - lammetjes
    3: ['farm', 'nature', 'play'], // april
    4: ['play', 'nature', 'farm'], // mei - buiten
    5: ['play', 'swim', 'nature'], // juni
    6: ['swim', 'play', 'nature'], // juli
    7: ['swim', 'play', 'nature'], // aug
    8: ['farm', 'nature', 'play'], // sept
    9: ['museum', 'nature'],       // okt
    10: ['museum', 'indoor'],      // nov
    11: ['museum', 'indoor']       // dec
};

export function getThisWeekPicks(locations, region) {
    const month = new Date().getMonth();
    const seasonalTypes = SEASONAL_TYPES[month] || ['play', 'museum'];

    // Filter by region if available
    let candidates = region
        ? locations.filter(l => l.region === region)
        : locations;

    if (candidates.length < 10) candidates = locations; // fallback

    // Prefer locations with good photos for week picks
    candidates = candidates.filter(l =>
        (l.photo_url || l.owner_photo_url) && (l.photo_quality === undefined || l.photo_quality >= 3)
    );
    if (candidates.length < 10) candidates = locations.filter(l => l.photo_url || l.owner_photo_url);
    if (candidates.length < 5) candidates = locations; // ultimate fallback

    // Score candidates
    const scored = candidates.map(loc => {
        let score = computePeuterScore(loc) * 10;

        // Seasonal bonus
        if (seasonalTypes.includes(loc.type)) score += 15;

        // Weather fit bonus
        if (state.isRaining && ['indoor', 'hybrid', 'both'].includes(loc.weather)) score += 20;
        if (state.isSunny && ['outdoor', 'both'].includes(loc.weather)) score += 15;

        // Photo quality weighted bonus (was flat +5)
        if (loc.photo_url || loc.owner_photo_url) {
            const pq = loc.photo_quality || 3; // default 3 if not evaluated yet
            score += Math.round(pq * 1.5); // 1→1.5, 3→4.5, 5→7.5
        }

        return { loc, score };
    }).sort((a, b) => b.score - a.score);

    // Select diverse types (max 1 per type)
    const picks = [];
    const usedTypes = new Set();
    for (const { loc } of scored) {
        if (picks.length >= 5) break;
        if (!usedTypes.has(loc.type) || picks.length < 3) {
            picks.push(loc);
            usedTypes.add(loc.type);
        }
    }

    return picks;
}

export async function fetch5DayForecast(lat, lng) {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max&timezone=Europe/Amsterdam&forecast_days=5`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const days = ['Zo','Ma','Di','Wo','Do','Vr','Za'];

        return data.daily.time.map((date, i) => {
            const d = new Date(date + 'T12:00:00');
            const code = data.daily.weather_code[i];
            const temp = Math.round(data.daily.temperature_2m_max[i]);
            const RAIN = new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,83,84,85,86,95,96,99]);
            const icon = RAIN.has(code) ? '\uD83C\uDF27\uFE0F' : code <= 3 ? '\u2600\uFE0F' : '\uD83C\uDF25\uFE0F';
            return { day: days[d.getDay()], icon, temp, isRain: RAIN.has(code), isSun: code <= 3 };
        });
    } catch { return null; }
}

export function renderWeekPicks(picks, containerEl) {
    if (!picks.length || !containerEl) return;

    const region = picks[0]?.region || '';
    const html = `
        <div class="week-picks">
            <div class="week-picks-header">Deze week in ${region}</div>
            <div class="week-picks-scroll" tabindex="0" role="region" aria-label="Week picks">
                ${picks.map(loc => {
                    const photo = loc.photo_url || loc.owner_photo_url || '';
                    const photoStyle = photo ? `background-image:url('${photo}')` : 'background:#E8D5C4';
                    return `<div class="week-pick-card" data-id="${loc.id}">
                        <div class="week-pick-photo" style="${photoStyle}"></div>
                        <div class="week-pick-name">${loc.name}</div>
                    </div>`;
                }).join('')}
            </div>
            <a href="mailto:basmetten@gmail.com?subject=Peuterplannen%20updates&body=Ik%20wil%20graag%20wekelijks%20tips%20ontvangen!" class="week-picks-newsletter">
                Wekelijks tips ontvangen? <span class="newsletter-arrow">\u2192</span>
            </a>
        </div>`;

    containerEl.innerHTML = html;

    // Click handlers
    containerEl.querySelectorAll('.week-pick-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            bus.emit('sheet:showlocation',
                state.allLocations.find(l => l.id === id)
            );
        });
    });
}

export function renderForecastStrip(forecast, containerEl) {
    if (!forecast || !containerEl) return;

    containerEl.innerHTML = `
        <div class="forecast-strip">
            <div class="forecast-days">
                ${forecast.map(d => `<div class="forecast-day${d.isSun ? ' is-sun' : d.isRain ? ' is-rain' : ''}">
                    <span class="forecast-day-name">${d.day}</span>
                    <span class="forecast-day-icon">${d.icon}</span>
                    <span class="forecast-day-temp">${d.temp}\u00b0</span>
                </div>`).join('')}
            </div>
        </div>`;
}
