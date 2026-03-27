import { state, SB_KEY, DESKTOP_WIDTH, TYPE_LABELS, WEATHER_LABELS, WEATHER_ICONS, SB_URL, FULL_LOCATION_SELECT } from './state.js';
import { escapeHtml, safeUrl, slugify, cleanToddlerHighlight, buildDetailUrl, trackEvent } from './utils.js';
import { getTrustBullets, getPracticalBullets, computePeuterScoreV2, getOpenStatus } from './scoring.js';
import { isFavorite } from './favorites.js';
import { fetchJsonWithRetry, normalizeLocationRow } from './data.js';
import { getSterkePunten } from './tags.js';
import { getDistanceLabel, getScoreTier, findNearbyByType } from './card-data.js';
import { markVisited } from './visited.js';
import { getPrefs, setPrefs, hasCompletedOnboarding } from './prefs.js';
import { getPhotoData, renderCompactCard } from './templates.js';
import bus from './bus.js';

// --- Constants ---
const ONBOARDING_VIEW_THRESHOLD = 2;
const ONBOARDING_DELAY_MS = 1500;
const ONBOARDING_REMOVE_MS = 300;
const DISTANCE_TO_MINUTES_FACTOR = 1.3;
const SWIPE_DOWN_THRESHOLD_PX = 80;

export function openLocSheet(locationId) {
    const loc = state.allLocations.find(l => l.id === locationId);
    if (!loc) return;
    markVisited(locationId);

    // Track location views for onboarding trigger
    const viewCount = parseInt(localStorage.getItem('pp_loc_views') || '0', 10) + 1;
    localStorage.setItem('pp_loc_views', String(viewCount));

    // Show onboarding prompt after Nth location view (if not already completed)
    if (viewCount === ONBOARDING_VIEW_THRESHOLD && !hasCompletedOnboarding()) {
        setTimeout(() => showAgeOnboarding(), ONBOARDING_DELAY_MS); // delay so user sees location first
    }
    state.activeLocSheet = locationId;

    // Mobile: use in-sheet detail instead of overlay
    if (window.innerWidth < DESKTOP_WIDTH) {
        bus.emit('sheet:opendetail', locationId);
        return;
    }

    const isFav = isFavorite(loc.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : 'fill: none; stroke: #9B8688;';
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const weatherLabel = WEATHER_LABELS[loc.weather] || '';
    const weatherIcon = WEATHER_ICONS[loc.weather] || '';

    const travelInfo = state.lastTravelTimes?.[loc.id];
    const distLabel = getDistanceLabel(loc, travelInfo);
    let distancePill = '';
    if (distLabel) {
        distancePill = `<span class="pill pill-distance">${distLabel}</span>`;
    } else if (loc.region) {
        distancePill = `<span class="pill pill-region">${loc.region}</span>`;
    }

    const ageInfo = (loc.min_age !== null && loc.max_age !== null) ? `<span class="age-range">${loc.min_age}-${loc.max_age} jaar</span>` : '';
    const trustBullets = getTrustBullets(loc);
    const practicalBullets = getPracticalBullets(loc);
    const sterkePunten = getSterkePunten(loc);

    const { photoSrc, categoryImg, imgSrc, photoColor, fallbackSrc } = getPhotoData(loc);

    // Score breakdown + total score (single v2 call)
    let scoreBreakdownHtml = '';
    let totalScore = null;
    try {
        if (typeof computePeuterScoreV2 === 'function') {
            const weather = state.isRaining ? 'rain' : state.isSunny ? 'sun' : null;
            const v2 = computePeuterScoreV2(loc, { weather, dayOfWeek: new Date().getDay() });
            totalScore = v2.total;
            const dims = Object.values(v2.dimensions);
            const barsHtml = dims.map(d => {
                const pct = d.score * 10;
                const tone = d.score >= 8 ? 'strong' : d.score >= 5 ? 'good' : 'basic';
                return `<div class="score-bar-row">
                    <span class="score-bar-label">${d.label}</span>
                    <div class="score-bar-track"><div class="score-bar-fill score-bar-fill--${tone}" style="width:${pct}%"></div></div>
                    <span class="score-bar-value">${d.score}/10</span>
                </div>`;
            }).join('');

            scoreBreakdownHtml = `<div class="score-breakdown" id="score-breakdown">
                <button class="score-breakdown-toggle" onclick="this.closest('.score-breakdown').classList.toggle('open')">
                    <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    Waarom deze score?
                </button>
                <div class="score-breakdown-bars">${barsHtml}</div>
            </div>`;
        }
    } catch(e) { /* v2 not available yet */ }

    // Price pill
    const priceLabels = { free: 'Gratis', low: '€', mid: '€€', high: '€€€' };
    const pricePill = loc.price_band && priceLabels[loc.price_band] ? `<span class="pill pill-price">${priceLabels[loc.price_band]}</span>` : '';

    // Deduplicate description vs highlight: show only the longer one
    const descText = loc.description || '';
    const hlText = loc.toddler_highlight || '';
    let longerDescription = '';
    if (descText && hlText) {
        const descNorm = descText.toLowerCase().replace(/[^a-z0-9]/g, '');
        const hlNorm = hlText.toLowerCase().replace(/[^a-z0-9]/g, '');
        // If one contains the other, keep the longer; otherwise keep both but only show longer in Tier 3
        if (descNorm.includes(hlNorm) || hlNorm.includes(descNorm)) {
            longerDescription = descText.length >= hlText.length ? descText : hlText;
        } else {
            longerDescription = descText.length >= hlText.length ? descText : hlText;
        }
    } else {
        longerDescription = descText || hlText;
    }

    // Google Maps route URL
    const googleMapsUrl = (loc.lat && loc.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}` : '';
    const detailUrl = buildDetailUrl(loc);

    // Practical bullets as info grid cells
    const practicalCells = practicalBullets.map(b => {
        const colonIdx = b.indexOf(':');
        if (colonIdx > 0 && colonIdx < 30) {
            const label = b.substring(0, colonIdx).trim();
            const value = b.substring(colonIdx + 1).trim().replace(/\.$/, '');
            return { label, value };
        }
        return { label: 'Info', value: b.replace(/\.$/, '') };
    });

    // Open status + score verbal (matching mobile)
    const openStatus = getOpenStatus(loc);
    const scoreTier = totalScore != null ? getScoreTier(totalScore) : 'mid';
    const scoreVerbalMap = { high: 'Heel goed voor peuters', mid: 'Goed voor peuters', low: 'Redelijk voor peuters' };
    if (totalScore >= 8.5) scoreVerbalMap.high = 'Uitstekend voor peuters';
    const scoreVerbal = totalScore != null ? (totalScore >= 8.5 ? 'Uitstekend voor peuters' : scoreVerbalMap[scoreTier]) : '';

    const content = document.getElementById('loc-sheet-content');
    content.innerHTML = `
        <!-- Hero with floating back + fav -->
        <div class="detail-hero-wrap">
            <div class="sheet-hero-photo${!photoSrc ? ' sheet-hero--category' : ''}" style="--photo-color: ${photoColor}">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" decoding="async" width="600" height="263"
                     onload="this.classList.add('loaded')"
                     onerror="if(this.dataset.retried){this.parentElement.classList.add('sheet-hero--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(fallbackSrc || categoryImg)}'}">
            </div>
            <button class="detail-float-btn detail-back-btn" id="loc-sheet-back" aria-label="Terug naar overzicht">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="detail-float-btn detail-fav-btn${isFav ? ' active' : ''}" onclick="toggleFavoriteFromSheet(${loc.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}"${isFav ? ' aria-pressed="true"' : ' aria-pressed="false"'}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>

        <!-- Title + score + meta (matching mobile hierarchy) -->
        <div class="detail-above-fold">
            <div class="detail-title-row">
                <h2 class="detail-name">${escapeHtml(loc.name)}</h2>
                ${totalScore != null ? `<span class="detail-score-badge detail-score--${scoreTier}" aria-label="PeuterScore ${totalScore} uit 10, ${scoreVerbal}">${totalScore}</span>` : ''}
            </div>
            ${scoreVerbal ? `<p class="detail-score-verbal">${escapeHtml(scoreVerbal)}</p>` : ''}
            <div class="detail-meta-line">
                <span>${escapeHtml(typeLabel)}</span>
                ${distLabel ? `<span class="detail-meta-dot">\u00b7</span><span>${escapeHtml(distLabel)}</span>` : ''}
                ${openStatus ? `<span class="detail-meta-dot">\u00b7</span><span class="detail-open-pill detail-open--${openStatus.color}">${escapeHtml(openStatus.label)}</span>` : ''}
            </div>
        </div>

        <!-- Action buttons -->
        <div class="detail-action-bar" style="position: relative; border-top: none;">
            ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="detail-action-btn detail-action-primary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Route
            </a>` : ''}
            ${safeUrl(loc.website) ? `<a href="${safeUrl(loc.website)}" target="_blank" rel="noopener" class="detail-action-btn detail-action-secondary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Website
            </a>` : ''}
            <button class="detail-action-btn detail-action-icon btn-share" aria-label="Deel ${escapeHtml(loc.name)}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            ${detailUrl ? `<a href="${detailUrl}" class="detail-action-btn detail-action-secondary">Meer info</a>` : ''}
        </div>

        <!-- Tier 2: Highlight + Bento Grid + Hours -->
        ${loc.toddler_highlight || sterkePunten.length ? `<div class="detail-section" style="padding: 10px 18px;">
            <div class="detail-section-label">Waarom goed voor peuters</div>
            ${loc.toddler_highlight ? `<blockquote class="detail-pullquote">\u201C${escapeHtml(loc.toddler_highlight)}\u201D</blockquote>` : ''}
            ${sterkePunten.length ? `<ul class="sterke-punten-list">${sterkePunten.map(p => `<li>\u2713 ${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
        </div>` : ''}

        <!-- Bento Grid — Facilities -->
        <div class="detail-section" style="padding: 10px 18px;">
            <div class="detail-section-label">Faciliteiten</div>
            <div class="dt-bento">
                ${loc.weather ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">${loc.weather === 'indoor' ? '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'}</svg></span>
                    <span class="dt-bento-label">Weer</span>
                    <span class="dt-bento-value">${escapeHtml(loc.weather === 'indoor' ? 'Binnen' : loc.weather === 'outdoor' ? 'Buiten' : 'Beide')}</span>
                </div>` : ''}
                ${loc.parking_ease ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                    <span class="dt-bento-label">Parkeren</span>
                    <span class="dt-bento-value">${escapeHtml(loc.parking_ease === 'easy' ? 'Makkelijk' : 'Lastig')}</span>
                </div>` : ''}
                ${loc.coffee != null ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></span>
                    <span class="dt-bento-label">Koffie</span>
                    <span class="dt-bento-value">${loc.coffee ? 'Ja' : 'Nee'}</span>
                </div>` : ''}
                ${loc.diaper != null ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><circle cx="12" cy="12" r="10"/></svg></span>
                    <span class="dt-bento-label">Verschonen</span>
                    <span class="dt-bento-value">${loc.diaper ? 'Ja' : 'Nee'}</span>
                </div>` : ''}
                ${loc.crowd_pattern ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                    <span class="dt-bento-label">Drukte</span>
                    <span class="dt-bento-value">${escapeHtml(loc.crowd_pattern.includes('rustig') ? 'Rustig' : loc.crowd_pattern.includes('druk') ? 'Druk' : 'Gemiddeld')}</span>
                </div>` : ''}
                ${loc.buggy_friendliness ? `<div class="dt-bento-cell">
                    <span class="dt-bento-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></span>
                    <span class="dt-bento-label">Buggy</span>
                    <span class="dt-bento-value">${escapeHtml(loc.buggy_friendliness === 'easy' ? 'Makkelijk' : 'Lastig')}</span>
                </div>` : ''}
            </div>
        </div>

        <!-- Opening hours -->
        ${loc.opening_hours || loc.always_open ? `<div class="detail-section" style="padding: 10px 18px;">
            <div class="detail-section-label">Openingstijden</div>
            <div class="detail-hours-block">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span>${escapeHtml(loc.always_open ? 'Altijd open' : loc.opening_hours)}</span>
            </div>
        </div>` : ''}

        <!-- Tier 3: Progressive disclosure -->
        <details class="dt-more-details" aria-label="Meer details over ${escapeHtml(loc.name)}" style="padding: 0 18px;">
            <summary class="dt-more-toggle">Meer details</summary>
            <div class="dt-more-content">
                ${scoreBreakdownHtml ? `<div class="sheet-score-breakdown-wrap">${scoreBreakdownHtml}</div>` : ''}
                ${longerDescription ? `<p class="sheet-detail-description">${escapeHtml(longerDescription)}</p>` : ''}
                ${trustBullets.length ? `<ul class="sheet-trust-list">${trustBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
            </div>
        </details>

        <!-- Retention tail: Vergelijkbaar in de buurt -->
        ${(() => { const nearby = findNearbyByType(loc, 3); return nearby.length ? `<div class="dt-nearby" style="margin: 0 18px;">
            <div class="dt-label" style="font-size: var(--pp-text-base); font-weight: 600; color: var(--pp-text); margin-bottom: var(--pp-space-sm2);">Vergelijkbaar in de buurt</div>
            <div class="dt-nearby-scroll">${nearby.map(n => renderCompactCard(n, {})).join('')}</div>
        </div>` : ''; })()}

        <!-- Claim placeholder -->
        <div class="dt-future-cta" style="padding: 0 18px 18px;">
            <button class="dt-claim-btn" disabled>
                <span>Beheer deze locatie</span>
                <span class="dt-claim-soon">Binnenkort beschikbaar</span>
            </button>
        </div>
    `;
    const shareButton = content.querySelector('.btn-share');
    if (shareButton) {
        shareButton.addEventListener('click', () => bus.emit('location:share', loc));
    }
    const backButton = content.querySelector('#loc-sheet-back');
    if (backButton) {
        backButton.addEventListener('click', () => closeLocSheet());
    }

    const overlay = document.getElementById('loc-overlay');
    const sheet = document.getElementById('loc-sheet');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hide scroll host (contains bottom sheet) to prevent overlap
    const scrollHost = document.getElementById('sheet-scroll-host');
    if (scrollHost) scrollHost.style.display = 'none';

    if (typeof window.pushNavState === 'function') window.pushNavState('loc-sheet', { locationId });
}

export function closeLocSheet() {
    state.activeLocSheet = null;
    const overlay = document.getElementById('loc-overlay');
    const sheet = document.getElementById('loc-sheet');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Restore scroll host (contains bottom sheet)
    const scrollHost = document.getElementById('sheet-scroll-host');
    if (scrollHost) scrollHost.style.display = '';
}

export function openInfoPanel() {
    const overlay = document.getElementById('info-overlay');
    const panel = document.getElementById('info-panel');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (typeof window.pushNavState === 'function') window.pushNavState('info');
}

export function closeInfoPanel() {
    const overlay = document.getElementById('info-overlay');
    const panel = document.getElementById('info-panel');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (state.currentView === 'info') {
        state.currentView = 'home';
    }
}

// === Detail View ===
export async function showLocationDetail(regionSlug, locSlug) {
    const detailView = document.getElementById('detail-view');
    const appWrapper = document.querySelector('.app-wrapper');
    const planView = document.getElementById('plan-view');
    if (appWrapper) appWrapper.classList.add('hidden');
    if (planView) planView.classList.add('hidden');
    detailView.classList.remove('hidden');
    detailView.innerHTML = '<div class="detail-loading"><div class="spinner"></div><p>Locatie laden...</p></div>';

    try {
        const mapResp = await fetch('/output/runtime-location-map.json');
        if (!mapResp.ok) throw new Error('Kon locatiekaart niet laden');
        const locationMap = await mapResp.json();
        const key = regionSlug + '/' + locSlug;
        const locationId = locationMap[key];
        if (!locationId) throw new Error('Locatie niet gevonden');

        const headers = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };
        const url = `https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations?id=eq.${locationId}&select=${FULL_LOCATION_SELECT}`;
        const data = await fetchJsonWithRetry(url, { method: 'GET', headers });
        if (!Array.isArray(data) || data.length === 0) throw new Error('Locatie niet gevonden');

        const loc = normalizeLocationRow(data[0]);
        trackEvent('detail_view', { location_id: locationId });
        renderDetailView(loc, regionSlug);
    } catch (err) {
        console.error('Detail view error:', err);
        detailView.innerHTML = '<div class="detail-error"><p>' + escapeHtml(err.message || 'Er ging iets mis bij het laden van deze locatie.') + '</p><a href="/app.html">Terug naar de app</a></div>';
    }
}

function renderDetailView(loc, regionSlug) {
    const detailView = document.getElementById('detail-view');
    const sterkePuntenDetail = getSterkePunten(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type || 'Locatie';
    const weatherLabel = WEATHER_LABELS[loc.weather] || loc.weather || '';
    const safeWebsite = safeUrl(loc.website);
    const highlight = cleanToddlerHighlight(loc.toddler_highlight || '');
    const regionName = loc.region || '';
    const { imgSrc, categoryImg, photoColor, photoSrc } = getPhotoData(loc);
    const isFav = isFavorite(loc.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : '';
    const v2 = computePeuterScoreV2(loc, {});
    const psScore = Math.round(v2.total * 10) / 10;

    let ageText = '';
    if (loc.min_age != null && loc.max_age != null) ageText = loc.min_age + '–' + loc.max_age + ' jaar';
    else if (loc.min_age != null) ageText = 'Vanaf ' + loc.min_age + ' jaar';
    else if (loc.max_age != null) ageText = 'Tot ' + loc.max_age + ' jaar';

    let verifiedText = '';
    if (loc.last_verified) {
        const d = new Date(loc.last_verified);
        const months = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
        verifiedText = months[d.getMonth()] + ' ' + d.getFullYear();
    }

    const facilities = [];
    if (loc.coffee) facilities.push('Koffie voor ouders');
    if (loc.diaper) facilities.push('Luierruimte');
    if (loc.alcohol) facilities.push('Alcohol beschikbaar');

    const shareUrl = 'https://peuterplannen.nl/app.html?locatie=' + encodeURIComponent(regionSlug + '/' + slugify(loc.name));
    const shareTitle = escapeHtml(loc.name) + ' — PeuterPlannen';
    const waText = encodeURIComponent(loc.name + ' — Peuteruitje in ' + regionName + ' ' + shareUrl);

    let html = '';
    // Hero photo
    html += '<div class="detail-hero" style="--photo-color: ' + photoColor + '">';
    html += '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(loc.name) + '" loading="eager" width="600" height="263"';
    if (!photoSrc) html += ' class="detail-hero-fallback"';
    html += ' onerror="this.src=\'' + escapeHtml(categoryImg) + '\'">';
    html += '<a href="/app.html" class="detail-back" onclick="event.preventDefault(); if (history.length > 1) { history.back(); } else { location.href=\'/app.html\'; }"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></a>';
    html += '<button class="detail-fav" onclick="toggleFavorite(' + loc.id + ', this)" aria-label="' + (isFav ? 'Verwijder favoriet' : 'Opslaan') + '"><svg viewBox="0 0 24 24" style="' + favStyle + '"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';
    html += '</div>';
    // Header with name, type, score
    html += '<div class="detail-header">';
    html += '<div class="detail-header-top"><span class="detail-type-badge">' + escapeHtml(typeLabel) + '</span><span class="detail-score">' + psScore + '/10</span></div>';
    html += '<h1>' + escapeHtml(loc.name) + '</h1>';
    if (regionName) html += '<a href="/app.html?regio=' + encodeURIComponent(regionName) + '" class="detail-region-link">in ' + escapeHtml(regionName) + '</a>';
    html += '</div>';
    if (loc.description) html += '<p class="detail-description">' + escapeHtml(loc.description) + '</p>';
    if (highlight) html += '<div class="detail-highlight"><strong>Peutertip:</strong> ' + escapeHtml(highlight) + '</div>';
    if (sterkePuntenDetail.length) html += '<div class="sterke-punten"><h3>Waarom goed voor peuters</h3><ul>' + sterkePuntenDetail.map(p => '<li>✓ ' + escapeHtml(p) + '</li>').join('') + '</ul></div>';

    html += '<div class="detail-info-grid">';
    if (weatherLabel) html += '<div class="detail-info-item"><div><div class="detail-info-label">Weer</div><div class="detail-info-value">' + escapeHtml(weatherLabel) + '</div></div></div>';
    if (ageText) html += '<div class="detail-info-item"><div><div class="detail-info-label">Leeftijd</div><div class="detail-info-value">' + escapeHtml(ageText) + '</div></div></div>';
    facilities.forEach(f => { html += '<div class="detail-info-item"><div><div class="detail-info-label">Faciliteit</div><div class="detail-info-value">' + escapeHtml(f) + '</div></div></div>'; });
    if (loc.crowd_pattern) html += '<div class="detail-info-item"><div><div class="detail-info-label">Drukte</div><div class="detail-info-value">' + escapeHtml(loc.crowd_pattern) + '</div></div></div>';
    if (verifiedText) html += '<div class="detail-info-item"><div><div class="detail-info-label">Status</div><div class="detail-info-value detail-info-verified">' + escapeHtml('Geverifieerd ' + verifiedText) + '</div></div></div>';
    if (safeWebsite) { const displayUrl = safeWebsite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); html += '<div class="detail-info-item"><div><div class="detail-info-label">Website</div><div class="detail-info-value"><a class="detail-website-link" target="_blank" rel="noopener">' + escapeHtml(displayUrl) + '</a></div></div></div>'; }
    html += '</div>';

    html += '<div class="detail-actions">';
    if (loc.lat && loc.lng) html += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + loc.lat + ',' + loc.lng + '" target="_blank" rel="noopener" class="detail-btn-route"><svg viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> Route plannen</a>';
    html += '<div class="detail-share"><a href="https://wa.me/?text=' + waText + '" target="_blank" rel="noopener" class="detail-share-wa">WhatsApp</a>';
    if (typeof navigator !== 'undefined' && navigator.share) html += '<button class="detail-share-native" onclick="navigator.share({title:\'' + shareTitle.replace(/'/g, "\\'") + '\',url:\'' + shareUrl + '\'}).catch(function(e){console.warn(\x27[sheet:share] Share failed:\x27,e.message)})">Delen</button>';
    html += '</div></div>';

    if (loc.lat && loc.lng) {
        html += '<div class="detail-map-wrap"><div id="detail-map"></div></div>';
        html += '<p class="detail-map-attribution">Kaart: &copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></p>';
    }

    html += '<div class="detail-explore-cta"><a href="/app.html?type=' + encodeURIComponent(loc.type || '') + '&regio=' + encodeURIComponent(regionName) + '">Bekijk alle ' + escapeHtml(typeLabel) + ' in ' + escapeHtml(regionName) + ' &rarr;</a></div>';

    detailView.innerHTML = html;
    if (safeWebsite) { const websiteLink = detailView.querySelector('.detail-website-link'); if (websiteLink) websiteLink.href = safeWebsite; }
    document.title = loc.name + ' — PeuterPlannen';

    if (loc.lat && loc.lng) {
        const mapEl = document.getElementById('detail-map');
        if (mapEl && typeof maplibregl !== 'undefined') {
            const map = new maplibregl.Map({ container: 'detail-map', style: 'https://tiles.openfreemap.org/styles/positron', center: [loc.lng, loc.lat], zoom: 14, attributionControl: false });
            new maplibregl.Marker({ color: '#D4775A' }).setLngLat([loc.lng, loc.lat]).addTo(map);
        } else if (mapEl) {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/maplibre-gl@5.19.0/dist/maplibre-gl.js';
            s.onload = function() {
                const map = new maplibregl.Map({ container: 'detail-map', style: 'https://tiles.openfreemap.org/styles/positron', center: [loc.lng, loc.lat], zoom: 14, attributionControl: false });
                new maplibregl.Marker({ color: '#D4775A' }).setLngLat([loc.lng, loc.lat]).addTo(map);
            };
            document.head.appendChild(s);
        }
    }
}

export function initSheetGestures() {
    // Swipe-down to close info panel
    const infoPanel = document.getElementById('info-panel');
    let infoStartY = 0;
    infoPanel.addEventListener('touchstart', (e) => { infoStartY = e.touches[0].clientY; }, { passive: true });
    infoPanel.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - infoStartY;
        if (deltaY > SWIPE_DOWN_THRESHOLD_PX && infoPanel.scrollTop === 0) closeInfoPanel();
    }, { passive: true });

    // Swipe-down to close loc sheet
    const locSheet = document.getElementById('loc-sheet');
    let locStartY = 0;
    locSheet.addEventListener('touchstart', (e) => { locStartY = e.touches[0].clientY; }, { passive: true });
    locSheet.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - locStartY;
        if (deltaY > SWIPE_DOWN_THRESHOLD_PX && locSheet.scrollTop === 0) closeLocSheet();
    }, { passive: true });

    // ESC to close panels
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (state.activeLocSheet !== null) closeLocSheet();
            else closeInfoPanel();
        }
    });

    // Close map filters on click outside
    document.addEventListener('click', function(e) {
        const overlay = document.getElementById('map-filters-overlay');
        if (!overlay || !overlay.classList.contains('open')) return;
        if (!overlay.contains(e.target) && !e.target.closest('.map-search-cluster') && !e.target.closest('.map-search-bar')) {
            bus.emit('filters:closemap');
        }
    });
}

function showAgeOnboarding() {
    // Don't show if already completed or if the element already exists
    if (hasCompletedOnboarding() || document.getElementById('age-onboarding')) return;

    const overlay = document.createElement('div');
    overlay.id = 'age-onboarding';
    overlay.className = 'age-onboarding';
    overlay.innerHTML = `
        <div class="age-onboarding-card">
            <p class="age-onboarding-title">Hoe oud is je kind?</p>
            <p class="age-onboarding-subtitle">Dan filteren we op leeftijd</p>
            <div class="age-onboarding-options">
                <button class="age-onboarding-btn" data-age="dreumes">0-2 jaar<br><span>Dreumes</span></button>
                <button class="age-onboarding-btn" data-age="peuter">2-4 jaar<br><span>Peuter</span></button>
                <button class="age-onboarding-btn" data-age="kleuter">4-6 jaar<br><span>Kleuter</span></button>
            </div>
            <button class="age-onboarding-skip">Overslaan</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Handle age selection
    overlay.querySelectorAll('.age-onboarding-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const age = btn.dataset.age;
            setPrefs({ childAges: [age], onboardingComplete: true });
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), ONBOARDING_REMOVE_MS);

            // Pre-select the matching age filter chip
            const ageMap = { dreumes: 'dreumesproof', peuter: 'peuterproof' };
            if (ageMap[age]) {
                window.togglePreset?.(ageMap[age]);
            }
        });
    });

    // Skip button
    overlay.querySelector('.age-onboarding-skip').addEventListener('click', () => {
        setPrefs({ onboardingComplete: true });
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 300);
    });
}

// Bus listeners
bus.on('sheet:open', openLocSheet);
bus.on('sheet:close', closeLocSheet);
