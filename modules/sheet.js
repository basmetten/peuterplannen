import { state, SB_KEY, TYPE_LABELS, WEATHER_LABELS, WEATHER_ICONS, SB_URL, FULL_LOCATION_SELECT } from './state.js';
import { escapeHtml, safeUrl, cleanToddlerHighlight, calculateDistance, buildDetailUrl, trackEvent } from './utils.js';
import { getTrustBullets, getPracticalBullets, computePeuterScoreV2 } from './scoring.js';
import { isFavorite } from './favorites.js';
import { fetchJsonWithRetry, normalizeLocationRow } from './data.js';
import { getSterkePunten } from './tags.js';
import { markVisited } from './visited.js';
import { getPrefs, setPrefs, hasCompletedOnboarding } from './prefs.js';
import { getPhotoData } from './templates.js';
import bus from './bus.js';

export function openLocSheet(locationId) {
    const loc = state.allLocations.find(l => l.id === locationId);
    if (!loc) return;
    markVisited(locationId);

    // Track location views for onboarding trigger
    const viewCount = parseInt(localStorage.getItem('pp_loc_views') || '0', 10) + 1;
    localStorage.setItem('pp_loc_views', String(viewCount));

    // Show onboarding prompt after 2nd location view (if not already completed)
    if (viewCount === 2 && !hasCompletedOnboarding()) {
        setTimeout(() => showAgeOnboarding(), 1500); // delay so user sees location first
    }
    state.activeLocSheet = locationId;

    const isFav = isFavorite(loc.id);
    const favStyle = isFav ? 'fill: #D4775A; stroke: #D4775A;' : 'fill: none; stroke: #9B8688;';
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const weatherLabel = WEATHER_LABELS[loc.weather] || '';
    const weatherIcon = WEATHER_ICONS[loc.weather] || '';

    let distancePill = '';
    if (state.userLocation && loc.lat && loc.lng) {
        const dist = calculateDistance(state.userLocation.lat, state.userLocation.lng, loc.lat, loc.lng);
        const mins = Math.round(dist * 1.3);
        distancePill = `<span class="pill pill-distance">${mins < 60 ? mins + ' min' : Math.floor(mins/60) + 'u ' + (mins%60) + 'm'}</span>`;
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

    const content = document.getElementById('loc-sheet-content');
    content.innerHTML = `
        <!-- TIER 1: Hero + essentials + actions -->
        <div class="sheet-hero-photo${!photoSrc ? ' sheet-hero--category' : ''}" style="--photo-color: ${photoColor}">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" decoding="async"
                 onload="this.classList.add('loaded')"
                 onerror="if(this.dataset.retried){this.parentElement.classList.add('sheet-hero--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(fallbackSrc || categoryImg)}'}">
        </div>

        <div class="sheet-detail-header">
            <div class="card-pills">
                <span class="pill pill-type">${typeLabel}</span>
                ${weatherLabel ? `<span class="pill pill-weather">${weatherIcon}${weatherLabel}</span>` : ''}
                ${distancePill}
                ${pricePill}
            </div>
            <button class="card-fav" onclick="toggleFavoriteFromSheet(${loc.id}, this)" data-tooltip="${isFav ? 'Verwijder favoriet' : 'Opslaan'}" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}">
                <svg viewBox="0 0 24 24" style="${favStyle}" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>

        ${ageInfo}
        <h2 class="card-name">${escapeHtml(loc.name)}</h2>

        <div class="detail-quick-facts">
            ${totalScore !== null ? `<span class="detail-fact"><strong>${totalScore}</strong>★</span>` : ''}
            ${loc.coffee ? '<span class="detail-fact">☕ Koffie</span>' : ''}
            ${loc.diaper ? '<span class="detail-fact">🚻 Verschonen</span>' : ''}
            ${loc.alcohol ? '<span class="detail-fact">🍷 Alcohol</span>' : ''}
        </div>

        <div class="sheet-detail-actions">
            ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="sheet-detail-btn sheet-detail-btn-primary">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> Route
            </a>` : ''}
            ${safeUrl(loc.website) ? `<a href="${safeUrl(loc.website)}" target="_blank" rel="noopener" class="sheet-detail-btn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Website
            </a>` : ''}
            <button class="sheet-detail-btn sheet-detail-btn-icon btn-share" data-tooltip="Delen" aria-label="Deel ${escapeHtml(loc.name)}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            ${detailUrl ? `<a href="${detailUrl}" class="sheet-detail-btn">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Meer info
            </a>` : ''}
        </div>

        <!-- TIER 2: Why it's good + practical info -->
        ${sterkePunten.length ? `<div class="sterke-punten"><h3>Waarom goed voor peuters</h3><ul>${sterkePunten.map(p => `<li>✓ ${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}

        ${(weatherLabel || loc.crowd_pattern || practicalCells.length) ? `<div class="sheet-info-grid">
            ${weatherLabel ? `<div class="sheet-info-cell">
                <span class="sheet-info-label">Weer</span>
                <span class="sheet-info-value">${weatherIcon} ${escapeHtml(weatherLabel)}</span>
            </div>` : ''}
            ${loc.crowd_pattern ? `<div class="sheet-info-cell">
                <span class="sheet-info-label">Drukte</span>
                <span class="sheet-info-value">${escapeHtml(loc.crowd_pattern)}</span>
            </div>` : ''}
            ${practicalCells.map(c => `<div class="sheet-info-cell">
                <span class="sheet-info-label">${escapeHtml(c.label)}</span>
                <span class="sheet-info-value">${escapeHtml(c.value)}</span>
            </div>`).join('')}
        </div>` : ''}

        <!-- TIER 3: Behind toggle -->
        <details class="sheet-detail-more">
            <summary class="sheet-detail-more-toggle">Meer details</summary>

            ${scoreBreakdownHtml ? `<div class="sheet-score-breakdown-wrap">${scoreBreakdownHtml}</div>` : ''}

            ${longerDescription ? `<p class="sheet-detail-description">${escapeHtml(longerDescription)}</p>` : ''}

            ${trustBullets.length ? `<ul class="sheet-trust-list">${trustBullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
        </details>
    `;
    const shareButton = content.querySelector('.btn-share');
    if (shareButton) {
        shareButton.addEventListener('click', () => bus.emit('location:share', loc));
    }

    const overlay = document.getElementById('loc-overlay');
    const sheet = document.getElementById('loc-sheet');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hide bottom sheet and toggle to prevent overlap
    const bottomSheet = document.getElementById('bottom-sheet');
    if (bottomSheet) bottomSheet.style.display = 'none';
    const toggleBtn = document.getElementById('map-list-toggle');
    if (toggleBtn) toggleBtn.style.display = 'none';
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

    // Restore bottom sheet and toggle
    const bottomSheet = document.getElementById('bottom-sheet');
    if (bottomSheet) bottomSheet.style.display = '';
    const toggleBtn = document.getElementById('map-list-toggle');
    if (toggleBtn) toggleBtn.style.display = '';
}

export function openInfoPanel() {
    const overlay = document.getElementById('info-overlay');
    const panel = document.getElementById('info-panel');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
    const psScore = Math.round(v2.total / 10);

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

    const shareUrl = 'https://peuterplannen.nl/app.html?locatie=' + encodeURIComponent(regionSlug + '/' + (loc.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const shareTitle = escapeHtml(loc.name) + ' — PeuterPlannen';
    const waText = encodeURIComponent(loc.name + ' — Peuteruitje in ' + regionName + ' ' + shareUrl);

    let html = '';
    // Hero photo
    html += '<div class="detail-hero" style="--photo-color: ' + photoColor + '">';
    html += '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(loc.name) + '" loading="eager"';
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
    if (typeof navigator !== 'undefined' && navigator.share) html += '<button class="detail-share-native" onclick="navigator.share({title:\'' + shareTitle.replace(/'/g, "\\'") + '\',url:\'' + shareUrl + '\'}).catch(function(){})">Delen</button>';
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
        if (deltaY > 80 && infoPanel.scrollTop === 0) closeInfoPanel();
    }, { passive: true });

    // Swipe-down to close loc sheet
    const locSheet = document.getElementById('loc-sheet');
    let locStartY = 0;
    locSheet.addEventListener('touchstart', (e) => { locStartY = e.touches[0].clientY; }, { passive: true });
    locSheet.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - locStartY;
        if (deltaY > 80 && locSheet.scrollTop === 0) closeLocSheet();
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
        if (!overlay.contains(e.target) && e.target.id !== 'map-search-pill' && !e.target.closest('.map-search-pill')) {
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
            setTimeout(() => overlay.remove(), 300);

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
