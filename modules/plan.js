import { state, SB_URL, TRANSPORT_RADIUS, SPEED_KMH, TRANSPORT_LABELS, TYPE_GROUPS, DESKTOP_WIDTH, CATEGORY_IMAGES, RAIN_CODES } from './state.js';
import { escapeHtml, calculateDistance } from './utils.js';
import { computePeuterScore } from './scoring.js';
import { fetchAllPages } from './data.js';
import { getPrefs, setPrefs } from './prefs.js';
import { requestLocation } from './geolocation.js';
import bus from './bus.js';

// --- Constants ---
const MAX_KIDS_COUNT = 4;
const LEGACY_DISTANCE_PENALTY = 0.1;
const NEAR_LUNCH_MAX_KM = 20;
const OV_EXTRA_MINUTES = 10;
const FALLBACK_LAT = 52.37;
const FALLBACK_LNG = 4.90;
const SHARE_COPY_FEEDBACK_MS = 2000;

// Plan engine (v2 algorithm) — graceful fallback if not yet available
let planEngine = null;
try {
    const mod = await import('./plan-engine.js');
    planEngine = { selectLocations: mod.selectLocations, PLAN_TEMPLATES: mod.PLAN_TEMPLATES, getNapBlock: mod.getNapBlock, swapPlanSlot: mod.swapPlanSlot };
} catch (e) {
    console.warn('plan-engine.js not available, using legacy planning', e);
}

let planLocationsCache = null;
let lastGeneratedPlan = null;
let lastPlanCandidates = null;
let lastPlanContext = null;
let lastPlanTemplateKey = null;

const planState = {
    date: 'today',
    kidsCount: 1,
    childAges: [2],
    transport: 'auto',
    duration: 'morning',
};

function getPlanPreviewDateLabel(key) {
    return { today: 'Vandaag', tomorrow: 'Morgen', saturday: 'Zaterdag', sunday: 'Zondag' }[key] || 'Vandaag';
}
function getPlanPreviewDurationLabel(key) {
    return { morning: 'Ochtend', half_day: 'Halve dag', whole_day: 'Hele dag' }[key] || 'Ochtend';
}
function getPlanPreviewTransportLabel(key) {
    return { auto: 'Auto · 50 km', fiets: 'Fiets · 5 km', ov: 'OV · 25 km', bakfiets: 'Bakfiets · 8 km' }[key] || 'Auto · 50 km';
}

export function updatePlanLocationChip() {
    const chip = document.getElementById('plan-location-chip');
    const label = document.getElementById('plan-location-label');
    if (!chip || !label) return;
    if (state.userLocation) {
        label.textContent = state.userLocation.name || 'Jouw locatie';
        chip.classList.add('has-location');
    } else {
        label.textContent = 'Locatie niet ingesteld';
        chip.classList.remove('has-location');
    }
    renderPlanPreview();
}

export function renderPlanPreview() {
    const title = document.getElementById('plan-preview-title');
    const copy = document.getElementById('plan-preview-copy');
    const list = document.getElementById('plan-preview-list');
    if (!title || !copy || !list) return;

    const kidsLabel = `${planState.kidsCount} ${planState.kidsCount === 1 ? 'kind' : 'kinderen'}`;
    const agesLabel = planState.childAges.map((age) => `${age} jr`).join(', ');
    const locationLabel = state.userLocation?.name || 'Nog geen locatie gekozen';

    title.textContent = `${getPlanPreviewDurationLabel(planState.duration)} voor ${kidsLabel}, zonder zoekchaos.`;
    copy.textContent = state.userLocation
        ? `We bouwen een voorstel vanuit ${locationLabel}, afgestemd op ${agesLabel} en ${TRANSPORT_LABELS[planState.transport]}.`
        : 'Voeg een stad of adres toe voor sterkere routes en afstandsfilters. Zonder locatie starten we slim vanuit een centrale plek.';

    list.innerHTML = [
        ['Wanneer', getPlanPreviewDateLabel(planState.date)],
        ['Kinderen', `${kidsLabel} · ${agesLabel}`],
        ['Vervoer', getPlanPreviewTransportLabel(planState.transport)],
        ['Startpunt', locationLabel],
    ].map(([label, value]) => `<div class="plan-preview-pill"><span class="plan-preview-label">${label}</span><span class="plan-preview-value">${escapeHtml(value)}</span></div>`).join('');
}

function getPlanDate(key) {
    const d = new Date();
    if (key === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (key === 'saturday') { const dow = d.getDay(); d.setDate(d.getDate() + (6 - dow + 7) % 7 || 7); }
    else if (key === 'sunday') { const dow = d.getDay(); d.setDate(d.getDate() + (0 - dow + 7) % 7 || 7); }
    return d.toISOString().slice(0, 10);
}

export function selectPlanDate(btn, val) {
    document.querySelectorAll('#plan-date-options .plan-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    planState.date = val;
    renderPlanPreview();
}

export function selectPlanOption(btn, group) {
    const parent = btn.closest('.plan-step');
    parent.querySelectorAll('.plan-chip').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (group === 'transport') planState.transport = btn.dataset.transport;
    if (group === 'duration') planState.duration = btn.dataset.duration;
    renderPlanPreview();
}

export function changeKidsCount(delta) {
    const next = Math.max(1, Math.min(MAX_KIDS_COUNT, planState.kidsCount + delta));
    planState.kidsCount = next;
    document.getElementById('kids-count-val').textContent = next;
    while (planState.childAges.length < next) planState.childAges.push(2);
    planState.childAges = planState.childAges.slice(0, next);
    renderAgeSliders();
    renderPlanPreview();
}

export function renderAgeSliders() {
    const container = document.getElementById('age-sliders');
    container.innerHTML = planState.childAges.map((age, i) => `
        <div class="age-slider-row">
            <span class="age-slider-label">Kind ${i + 1}</span>
            <input type="range" class="age-slider" min="0" max="6" value="${age}" oninput="updateChildAge(${i}, this.value); document.getElementById('age-val-${i}').textContent=this.value">
            <span class="age-slider-val" id="age-val-${i}">${age}</span>
            <span style="font-size:var(--pp-text-xs);color:var(--pp-text-muted);">jaar</span>
        </div>
    `).join('');
}

export function updateChildAge(index, val) {
    planState.childAges[index] = parseInt(val);
    renderPlanPreview();
}

async function fetchDayForecast(dateStr, lat, lng) {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,precipitation_sum,wind_speed_10m_max&start_date=${dateStr}&end_date=${dateStr}&timezone=Europe/Amsterdam`);
        if (!res.ok) return { weatherCode: 2, maxTemp: 12, precipitation: 0, windSpeed: 10 };
        const data = await res.json();
        return { weatherCode: data.daily.weather_code[0] ?? 2, maxTemp: data.daily.temperature_2m_max[0] ?? 12, precipitation: data.daily.precipitation_sum[0] ?? 0, windSpeed: data.daily.wind_speed_10m_max[0] ?? 10 };
    } catch { return { weatherCode: 2, maxTemp: 12, precipitation: 0, windSpeed: 10 }; }
}

function isOutdoorSuitable(code, temp) {
    if (RAIN_CODES.has(code)) return false;
    if (code <= 3 && temp >= 10) return true;
    return 'marginal';
}

function estimateTravelTime(distKm, transport) {
    const speed = SPEED_KMH[transport] ?? 50;
    const mins = Math.round((distKm / speed) * 60);
    return transport === 'ov' ? mins + OV_EXTRA_MINUTES : mins;
}

function findNearLunch(candidates, anchor) {
    return candidates.filter(l =>
        l.id !== anchor.id && (l.type === 'horeca' || l.type === 'pancake') &&
        anchor.lat && anchor.lng && l.lat && l.lng && calculateDistance(anchor.lat, anchor.lng, l.lat, l.lng) < NEAR_LUNCH_MAX_KM
    ).sort((a, b) => calculateDistance(anchor.lat, anchor.lng, a.lat, a.lng) - calculateDistance(anchor.lat, anchor.lng, b.lat, b.lng))[0] ?? null;
}

async function fetchPlanLocations() {
    if (planLocationsCache && planLocationsCache.length > 0) return planLocationsCache;
    const url = SB_URL + "?select=id,name,type,region,lat,lng,weather,min_age,max_age,toddler_highlight,is_featured,coffee,diaper,photo_url,owner_photo_url,rain_backup_quality,shade_or_shelter,parking_ease,buggy_friendliness,toilet_confidence,food_fit,play_corner_quality,noise_level,crowd_pattern,price_band&order=created_at.desc";
    planLocationsCache = await fetchAllPages(url);
    return planLocationsCache;
}

const TRANSPORT_EMOJI = { fiets: '🚲', bakfiets: '🚲', auto: '🚗', ov: '🚌', lopen: '🚶' };
const DURATION_TO_TEMPLATE = { morning: 'ochtend', half_day: 'halve_dag', whole_day: 'hele_dag' };

function getLocationPhoto(loc) {
    return loc.photo_url || loc.owner_photo_url || CATEGORY_IMAGES[loc.type] || '';
}

function getTypeLabel(type) {
    return { play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', museum: 'Museum', swim: 'Zwembad', horeca: 'Horeca', pancake: 'Pannenkoekhuis', indoor: 'Binnenspeeltuin' }[type] || type || '';
}

function formatTravelInfo(minutes, transport) {
    const emoji = TRANSPORT_EMOJI[transport] || '🚗';
    const travelMin = Math.max(0, minutes - OV_EXTRA_MINUTES); // subtract buffer for display
    const bufferMin = OV_EXTRA_MINUTES;
    return `${emoji} ${travelMin} min ${transport === 'ov' ? 'reizen' : transport === 'auto' ? 'rijden' : 'fietsen'} + ${bufferMin} min buffer`;
}

function renderTimelineV2(planStops, napBlock, context) {
    let html = '';
    for (let i = 0; i < planStops.length; i++) {
        const stop = planStops[i];
        const loc = stop.location;
        if (!loc) continue;
        const photo = getLocationPhoto(loc);
        const distKm = loc.lat && context.userLocation?.lat
            ? calculateDistance(context.userLocation.lat, context.userLocation.lng, loc.lat, loc.lng)
            : null;
        const distLabel = distKm !== null ? `${distKm.toFixed(1)} km` : '';
        const typeLabel = getTypeLabel(loc.type);
        const metaParts = [typeLabel, distLabel].filter(Boolean).join(' · ');

        // Stop card
        html += `<div class="tl-stop" data-tone="${stop.matchTone}">
  <div class="tl-time">${stop.slotTime}</div>
  <div class="tl-line"><div class="tl-dot"></div></div>
  <div class="tl-card">
    ${photo ? `<img class="tl-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async">` : `<div class="tl-photo tl-photo-placeholder"></div>`}
    <div class="tl-info">
      <div class="tl-name">${escapeHtml(loc.name)}</div>
      <div class="tl-meta">${escapeHtml(metaParts)}</div>
      <span class="tl-badge tl-badge--${stop.matchTone}">${escapeHtml(stop.matchLabel)}</span>
    </div>
    <button class="tl-swap" onclick="swapPlanSlot(${i})" aria-label="Wissel locatie">↻</button>
  </div>
</div>`;

        // Nap block — insert after the stop whose time precedes the nap
        if (napBlock && i < planStops.length - 1) {
            const nextStop = planStops[i + 1];
            const napStartNum = parseInt(napBlock.start.replace(':', ''));
            const currentNum = parseInt(stop.slotTime.replace(':', ''));
            const nextNum = parseInt(nextStop.slotTime.replace(':', ''));
            if (currentNum <= napStartNum && nextNum >= napStartNum) {
                html += `<div class="tl-nap">
  <div class="tl-time" style="font-size:0.7rem;">${napBlock.start}</div>
  <div class="tl-line"><div class="tl-line-dash"></div></div>
  <div class="tl-nap-card">
    <div class="tl-nap-icon">😴</div>
    <div class="tl-nap-info">
      <div class="tl-nap-time">${napBlock.start} – ${napBlock.end}</div>
      <div class="tl-nap-label">${escapeHtml(napBlock.label)}</div>
      <div class="tl-nap-tip">Tip: ga naar huis of vind een rustig plekje</div>
    </div>
  </div>
</div>`;
            }
        }

        // Travel segment between stops
        if (i < planStops.length - 1 && planStops[i + 1].travelFromPrev) {
            html += `<div class="tl-travel">
  <div class="tl-time"></div>
  <div class="tl-line"><div class="tl-line-dash"></div></div>
  <div class="tl-travel-info">${formatTravelInfo(planStops[i + 1].travelFromPrev, context.transport)}</div>
</div>`;
        }
    }
    return html;
}

export async function generatePlan() {
    const btn = document.getElementById('plan-gen-btn');
    const resultContainer = document.getElementById('plan-result-container');
    btn.disabled = true;
    btn.textContent = 'Plan wordt gemaakt…';
    resultContainer.classList.add('hidden');
    resultContainer.innerHTML = '';

    let locationEstimated = false;
    if (!state.userLocation) {
        btn.textContent = 'Locatie ophalen\u2026';
        const loc = await requestLocation({ lowAccuracy: true, timeout: 6000, maxAge: 300000 });
        btn.textContent = 'Plan wordt gemaakt\u2026';
        if (loc) updatePlanLocationChip();
    }
    if (!state.userLocation) locationEstimated = true;

    try {
        setPrefs({ childAges: planState.childAges, transport: planState.transport });

        const lat = state.userLocation ? state.userLocation.lat : FALLBACK_LAT;
        const lng = state.userLocation ? state.userLocation.lng : FALLBACK_LNG;
        const dateStr = getPlanDate(planState.date);
        const radiusKm = TRANSPORT_RADIUS[planState.transport];
        const forecast = await fetchDayForecast(dateStr, lat, lng);
        const outdoorOk = isOutdoorSuitable(forecast.weatherCode, forecast.maxTemp);
        const minAge = Math.min(...planState.childAges);

        const planLocations = await fetchPlanLocations();
        const candidates = planLocations.filter(loc => {
            if (!loc.lat || !loc.lng) return false;
            const dist = calculateDistance(lat, lng, loc.lat, loc.lng);
            const ageOk = (loc.min_age === null || loc.min_age <= minAge);
            const inRange = dist <= radiusKm;
            if (!ageOk || !inRange) return false;
            if (outdoorOk === false) return ['indoor','hybrid','both'].includes(loc.weather);
            return true;
        });

        const wCode = forecast.weatherCode;
        const temp = Math.round(forecast.maxTemp);
        const wDesc = wCode <= 3 ? `${temp}° · zonnig` : wCode >= 51 ? `${temp}° · regen` : `${temp}° · bewolkt`;
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dayLabel = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
        const locName = locationEstimated ? 'Amsterdam (stel locatie in)' : (state.userLocation?.name || 'Jouw locatie');

        // ── V2 Timeline (plan-engine.js) ──
        if (planEngine) {
            const templateKey = DURATION_TO_TEMPLATE[planState.duration] || 'ochtend';
            const context = {
                childAges: planState.childAges,
                transport: planState.transport,
                weather: outdoorOk === false ? 'rain' : 'sun',
                userLocation: { lat, lng },
            };

            const planStops = planEngine.selectLocations(templateKey, candidates, context);
            const napBlock = planEngine.getNapBlock(planState.childAges);
            const showNap = napBlock && templateKey === 'hele_dag';

            // Store for swap functionality
            lastPlanCandidates = candidates;
            lastPlanContext = { ...context, templateKey };
            lastPlanTemplateKey = templateKey;

            if (!planStops.length) {
                resultContainer.innerHTML = `<div class="error-msg">Geen locaties gevonden binnen ${radiusKm}km die passen bij je zoekopdracht. Probeer een andere vervoersoptie.</div>`;
                resultContainer.classList.remove('hidden');
                return;
            }

            // Build share data from v2 plan
            const morning = planStops[0]?.location || null;
            const lunch = planStops.find(s => s.slotLabel === 'Lunch')?.location || null;
            const afternoon = planStops.find(s => s.slotLabel === 'Middag' || s.slotLabel === 'Late middag')?.location || null;
            lastGeneratedPlan = { morning, lunch, afternoon, dayLabel, wDesc, locName, locationEstimated, planStops };

            const timelineHtml = renderTimelineV2(planStops, showNap ? napBlock : null, context);

            resultContainer.innerHTML = `
                <div class="plan-result">
                    <div class="plan-result-header"><h3>${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</h3><p>${wDesc} · ${planState.childAges.length === 1 ? '1 kind' : planState.childAges.length + ' kinderen'} (${planState.childAges.join(', ')} jr) · ${TRANSPORT_LABELS[planState.transport]} · ${locationEstimated ? 'Amsterdam (stel locatie in)' : escapeHtml(state.userLocation.name)}</p></div>
                    <div class="plan-timeline-v2">${timelineHtml}</div>
                    <div class="plan-ai-quote" id="plan-ai-text" style="color:var(--pp-text-muted);">Beschrijving laden…</div>
                    <div class="plan-actions">
                        <button class="btn" onclick="sharePlan()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Delen</button>
                        <a href="#" class="btn btn-whatsapp" id="share-plan-whatsapp" onclick="sharePlanWhatsApp();return false;">Stuur naar partner</a>
                        <button class="btn btn-detail" onclick="generatePlan()"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Nieuw plan</button>
                    </div>
                </div>
            `;
            resultContainer.classList.remove('hidden');
            if (window.innerWidth < DESKTOP_WIDTH) resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

            generateAINarrative(planStops, wDesc, dayLabel, {
                dateStr, childAges: planState.childAges, transport: planState.transport, forecast,
            });

            return;
        }

        // ── Legacy fallback (no plan-engine.js) ──
        const scored = candidates.map(loc => {
            const dist = calculateDistance(lat, lng, loc.lat, loc.lng);
            return { ...loc, _planScore: computePeuterScore(loc) - (dist * LEGACY_DISTANCE_PENALTY), _distKm: dist };
        }).sort((a, b) => b._planScore - a._planScore);

        if (!scored.length) {
            resultContainer.innerHTML = `<div class="error-msg">Geen locaties gevonden binnen ${radiusKm}km die passen bij je zoekopdracht. Probeer een andere vervoersoptie.</div>`;
            resultContainer.classList.remove('hidden');
            return;
        }

        const topPool = scored.slice(0, Math.min(3, scored.length));
        const morning = topPool[Math.floor(Math.random() * topPool.length)];
        let lunch = null, afternoon = null;

        if (planState.duration === 'half_day' || planState.duration === 'whole_day') lunch = findNearLunch(scored, morning);
        if (planState.duration === 'whole_day') {
            const morningGroup = TYPE_GROUPS[morning.type] ?? morning.type;
            const lunchGroup = lunch ? (TYPE_GROUPS[lunch.type] ?? lunch.type) : null;
            afternoon = scored.find(l => l.id !== morning.id && (!lunch || l.id !== lunch.id) && (TYPE_GROUPS[l.type] ?? l.type) !== morningGroup && (!lunchGroup || (TYPE_GROUPS[l.type] ?? l.type) !== lunchGroup))
                ?? scored.find(l => l.id !== morning.id && (!lunch || l.id !== lunch.id) && (TYPE_GROUPS[l.type] ?? l.type) !== morningGroup)
                ?? scored.find(l => l.id !== morning.id && (!lunch || l.id !== lunch.id)) ?? null;
        }

        function travelLabel(from, to) {
            if (!from || !to || !from.lat || !to.lat) return '';
            const dist = calculateDistance(from.lat, from.lng, to.lat, to.lng);
            const mins = estimateTravelTime(dist, planState.transport);
            return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}u ${mins%60}m`;
        }

        const morningTravel = travelLabel({ lat, lng }, morning);
        const lunchTravel = lunch ? travelLabel(morning, lunch) : '';
        const afternoonTv = afternoon ? travelLabel(lunch || morning, afternoon) : '';
        lastGeneratedPlan = { morning, lunch, afternoon, dayLabel, wDesc, locName, locationEstimated };

        let stopsHtml = `<div class="plan-stop"><div class="plan-stop-dot"></div><div><div class="plan-stop-label">Ochtend</div><div class="plan-stop-name">${escapeHtml(morning.name)}</div><div class="plan-stop-meta">${escapeHtml(morning.region || '')}${morningTravel ? ' · ' + morningTravel + ' ' + TRANSPORT_LABELS[planState.transport] : ''}</div></div></div>`;
        if (lunch) {
            stopsHtml += `<div class="plan-stop"><div class="plan-stop-dot lunch-dot"></div><div><div class="plan-stop-label">Lunch · 12:00</div><div class="plan-stop-name">${escapeHtml(lunch.name)}</div><div class="plan-stop-meta">${escapeHtml(lunch.region || '')}${lunchTravel ? ' · ' + lunchTravel + ' verder' : ''}</div></div></div>`;
        } else if (planState.duration === 'half_day' || planState.duration === 'whole_day') {
            stopsHtml += `<div class="plan-stop"><div class="plan-stop-dot" style="background:var(--pp-bg-warm);border:1.5px solid rgba(var(--pp-text-rgb),0.15);"></div><div><div class="plan-stop-label">Lunch · 12:00</div><div class="plan-stop-name" style="font-weight:500;color:var(--pp-text-secondary);">Eigen lunch meenemen</div><div class="plan-stop-meta">Geen horecagelegenheid gevonden in de buurt</div></div></div>`;
        }
        if (afternoon) {
            stopsHtml += `<div class="plan-stop"><div class="plan-stop-dot afternoon-dot"></div><div><div class="plan-stop-label">Middag</div><div class="plan-stop-name">${escapeHtml(afternoon.name)}</div><div class="plan-stop-meta">${escapeHtml(afternoon.region || '')}${afternoonTv ? ' · ' + afternoonTv + ' verder' : ''}</div></div></div>`;
        }

        resultContainer.innerHTML = `
            <div class="plan-result">
                <div class="plan-result-header"><h3>${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</h3><p>${wDesc} · ${planState.childAges.length === 1 ? '1 kind' : planState.childAges.length + ' kinderen'} (${planState.childAges.join(', ')} jr) · ${TRANSPORT_LABELS[planState.transport]} · ${locationEstimated ? 'Amsterdam (stel locatie in)' : escapeHtml(state.userLocation.name)}</p></div>
                <div class="plan-timeline">${stopsHtml}</div>
                <div class="plan-ai-quote" id="plan-ai-text" style="color:var(--pp-text-muted);">Beschrijving laden…</div>
                <div class="plan-actions">
                    <button class="btn" onclick="sharePlan()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Delen</button>
                    <a href="#" class="btn btn-whatsapp" id="share-plan-whatsapp" onclick="sharePlanWhatsApp();return false;">Stuur naar partner</a>
                    <button class="btn btn-detail" onclick="generatePlan()"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Nieuw plan</button>
                </div>
            </div>
        `;
        resultContainer.classList.remove('hidden');
        if (window.innerWidth < DESKTOP_WIDTH) resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const legacyStops = [morning, lunch, afternoon].filter(Boolean);
        generateAINarrative(legacyStops, wDesc, dayLabel, {
            dateStr, childAges: planState.childAges, transport: planState.transport, forecast,
        });
    } catch (err) {
        console.error('generatePlan error:', err);
        resultContainer.innerHTML = `<div class="error-msg">Er ging iets mis bij het genereren van je plan. Probeer het opnieuw.</div>`;
        resultContainer.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Plan genereren →';
    }
}

async function generateAINarrative(plan, weather, dayLabel, narrativeContext) {
    const aiEl = document.getElementById('plan-ai-text');
    if (!aiEl) return;

    // Extract morning/lunch/afternoon locations for the Edge Function
    const extractLoc = (loc) => loc ? { name: loc.name, region: loc.region || null } : null;
    let morning = null, lunch = null, afternoon = null;

    if (plan[0]?.location) {
        // V2 plan stops
        morning = extractLoc(plan[0]?.location);
        lunch = extractLoc(plan.find(s => s.slotLabel === 'Lunch')?.location);
        afternoon = extractLoc(plan.find(s => s.slotLabel === 'Middag' || s.slotLabel === 'Late middag')?.location);
    } else {
        // Legacy plan (raw location objects)
        morning = extractLoc(plan[0]);
        lunch = extractLoc(plan[1]);
        afternoon = extractLoc(plan[2]);
    }

    try {
        const resp = await fetch(
            'https://piujsvgbfflrrvauzsxe.supabase.co/functions/v1/generate-plan',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: narrativeContext.dateStr,
                    childAges: narrativeContext.childAges,
                    transport: narrativeContext.transport,
                    morning,
                    lunch,
                    afternoon,
                    forecast: narrativeContext.forecast,
                })
            }
        );

        if (!resp.ok) {
            console.warn('AI narrative failed:', resp.status);
            aiEl.textContent = '';
            return;
        }
        const data = await resp.json();
        const text = data?.description;
        if (text) {
            aiEl.textContent = text.trim();
            aiEl.style.color = '';
        } else {
            aiEl.textContent = '';
        }
    } catch (e) {
        console.warn('AI narrative failed:', e);
        aiEl.textContent = '';
    }
}

export function handleSwapPlanSlot(slotIndex) {
    if (!planEngine || !lastGeneratedPlan?.planStops || !lastPlanCandidates || !lastPlanContext) return;
    const currentPlan = lastGeneratedPlan.planStops;
    const newPlan = planEngine.swapPlanSlot(currentPlan, slotIndex, lastPlanCandidates, lastPlanContext);
    if (newPlan && newPlan[slotIndex]?.location?.id !== currentPlan[slotIndex]?.location?.id) {
        lastGeneratedPlan.planStops = newPlan;
        // Update share data
        lastGeneratedPlan.morning = newPlan[0]?.location || null;
        lastGeneratedPlan.lunch = newPlan.find(s => s.slotLabel === 'Lunch')?.location || null;
        lastGeneratedPlan.afternoon = newPlan.find(s => s.slotLabel === 'Middag' || s.slotLabel === 'Late middag')?.location || null;

        const napBlock = planEngine.getNapBlock(lastPlanContext.childAges);
        const showNap = napBlock && lastPlanTemplateKey === 'hele_dag';
        const timelineEl = document.querySelector('.plan-timeline-v2');
        if (timelineEl) {
            timelineEl.innerHTML = renderTimelineV2(newPlan, showNap ? napBlock : null, lastPlanContext);
        }
    }
}

function buildShareText() {
    if (!lastGeneratedPlan) return '';
    const { morning, lunch, afternoon, dayLabel, wDesc, locName, locationEstimated } = lastGeneratedPlan;
    const lines = [];
    lines.push(`Mijn dag met de peuters — ${dayLabel}`);
    lines.push(`📍 ${locName}${locationEstimated ? ' (geschatte locatie)' : ''} · ${wDesc}`);
    lines.push('');
    if (morning) lines.push(`🌅 Ochtend: ${morning.name}${morning.region ? ' (' + morning.region + ')' : ''}`);
    if (lunch) lines.push(`🍽 Lunch: ${lunch.name}${lunch.region ? ' (' + lunch.region + ')' : ''}`);
    if (afternoon) lines.push(`☀️ Middag: ${afternoon.name}${afternoon.region ? ' (' + afternoon.region + ')' : ''}`);
    const aiText = document.getElementById('plan-ai-text')?.textContent ?? '';
    if (aiText && !aiText.includes('laden') && !aiText.includes('ging iets mis')) { lines.push(''); lines.push(aiText); }
    lines.push(''); lines.push('Gemaakt via PeuterPlannen — peuterplannen.nl');
    return lines.join('\n');
}

export function sharePlan() {
    const text = buildShareText();
    if (!text) return;
    if (navigator.share) { navigator.share({ title: 'Mijn dag met de peuters', text }).catch(e => { console.warn('[plan:sharePlan] Share failed:', e.message); }); }
    else {
        const shareBtn = document.querySelector('.plan-actions .btn');
        navigator.clipboard?.writeText(text).then(() => {
            if (!shareBtn) return;
            const orig = shareBtn.innerHTML;
            shareBtn.textContent = '✓ Gekopieerd';
            setTimeout(() => { shareBtn.innerHTML = orig; }, SHARE_COPY_FEEDBACK_MS);
        }).catch(() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'));
    }
}

export function sharePlanWhatsApp() {
    const text = buildShareText();
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

export function initPlanFromPrefs() {
    const prefs = getPrefs();
    if (prefs.childAges?.length) {
        planState.childAges = prefs.childAges;
        planState.kidsCount = prefs.childAges.length;
    }
    if (prefs.transport) {
        planState.transport = prefs.transport;
    }
    const kidsVal = document.getElementById('kids-count-val');
    if (kidsVal) kidsVal.textContent = planState.kidsCount;
    renderAgeSliders();

    document.querySelectorAll('[data-transport]').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.transport === planState.transport);
    });

    renderPlanPreview();
}

export function initPlan() {
    renderAgeSliders();
    renderPlanPreview();
}

// Bus listeners
bus.on('plan:chipupdate', updatePlanLocationChip);
