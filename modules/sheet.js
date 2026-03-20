import { state, SB_KEY, TYPE_LABELS, WEATHER_LABELS, WEATHER_ICONS, SB_URL, FULL_LOCATION_SELECT, CATEGORY_IMAGES, TYPE_PHOTO_COLORS } from './state.js';
import { escapeHtml, safeUrl, cleanToddlerHighlight, calculateDistance, buildDetailUrl, buildMapsUrl, loadGoogleMaps } from './utils.js';
import { computePeuterScore, getCardReasons, getTrustChips, getTrustBullets, getPracticalBullets, computePeuterScoreV2 } from './scoring.js';
import { isFavorite } from './favorites.js';
import { fetchJsonWithRetry, normalizeLocationRow } from './data.js';
import { getSterkePunten } from './tags.js';
import { markVisited } from './visited.js';

export function openLocSheet(locationId) {
    const loc = state.allLocations.find(l => l.id === locationId);
    if (!loc) return;
    markVisited(locationId);
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
    const highlight = loc.toddler_highlight ? `<p class="card-highlight">${escapeHtml(loc.toddler_highlight)}</p>` : '';
    const trustChips = getTrustChips(loc);
    const trustBullets = getTrustBullets(loc);
    const practicalBullets = getPracticalBullets(loc);
    const sterkePunten = getSterkePunten(loc);

    const facilities = [];
    if (loc.coffee) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>Koffie</span>');
    if (loc.diaper) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5z"/><path d="M6 9.01V9"/></svg>Verschonen</span>');
    if (loc.alcohol) facilities.push('<span class="facility"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 3h10v9a5 5 0 0 1-10 0V3z"/></svg>Alcohol</span>');
    const reasons = getCardReasons(loc, state.userLocation && loc.lat && loc.lng ? { distanceKm: calculateDistance(state.userLocation.lat, state.userLocation.lng, loc.lat, loc.lng), distance: distancePill.replace(/<[^>]+>/g, '') } : null);

    const photoSrc = loc.photo_url || loc.owner_photo_url;
    const categoryImg = CATEGORY_IMAGES[loc.type] || CATEGORY_IMAGES.play;
    const imgSrc = photoSrc || categoryImg;
    const photoColor = TYPE_PHOTO_COLORS[loc.type] || '#E8D5C4';
    const fallbackSrc = photoSrc ? categoryImg : '';

    // Score breakdown
    let scoreBreakdownHtml = '';
    try {
        if (typeof computePeuterScoreV2 === 'function') {
            const weather = state.isRaining ? 'rain' : state.isSunny ? 'sun' : null;
            const v2 = computePeuterScoreV2(loc, { weather, dayOfWeek: new Date().getDay() });
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

    const content = document.getElementById('loc-sheet-content');
    content.innerHTML = `
        <div class="sheet-hero-photo${!photoSrc ? ' sheet-hero--category' : ''}" style="--photo-color: ${photoColor}">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}"
                 onload="this.classList.add('loaded')"
                 onerror="if(this.dataset.retried){this.parentElement.classList.add('sheet-hero--fallback')}else{this.dataset.retried='1';this.src='${escapeHtml(fallbackSrc || categoryImg)}'}">
        </div>
        <div class="card-top">
            <div class="card-pills">
                <span class="pill pill-type">${typeLabel}</span>
                ${weatherLabel ? `<span class="pill pill-weather">${weatherIcon}${weatherLabel}</span>` : ''}
                ${distancePill}
            </div>
            <button class="card-fav" onclick="toggleFavoriteFromSheet(${loc.id}, this)" data-tooltip="${isFav ? 'Verwijder favoriet' : 'Opslaan'}" aria-label="${isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet'}">
                <svg viewBox="0 0 24 24" style="${favStyle}" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        </div>
        ${ageInfo}
        <h2 class="card-name">${escapeHtml(loc.name)}</h2>
        ${sterkePunten.length ? `<div class="sterke-punten"><h3>Waarom goed voor peuters</h3><ul>${sterkePunten.map(p => `<li>✓ ${escapeHtml(p)}</li>`).join('')}</ul></div>` : ''}
        ${scoreBreakdownHtml}
        <p class="card-desc">${escapeHtml(loc.description || '')}</p>
        ${highlight}
        ${trustChips.length ? `<div class="card-trust">${trustChips.map((chip) => `<span class="trust-chip ${chip.tone === 'positive' ? 'is-positive' : 'is-neutral'}">${escapeHtml(chip.label)}</span>`).join('')}</div>` : ''}
        <div class="card-decision">
            <span class="card-decision-label">Waarom dit nu logisch voelt</span>
            <strong class="card-decision-title">${escapeHtml(reasons.headline)}</strong>
            <p class="card-decision-copy">${escapeHtml(reasons.primary)}</p>
        </div>
        <div class="card-subreasons">
            ${reasons.secondary.map((reason) => `<div class="card-subreason"><span class="card-subreason-label">${escapeHtml(reason.label)}</span><span class="card-subreason-value">${escapeHtml(reason.value)}</span></div>`).join('')}
        </div>
        ${(trustBullets.length || practicalBullets.length) ? `<div class="sheet-trust">
            ${trustBullets.length ? `<section class="sheet-trust-card"><h3>Waarom we dit vertrouwen</h3><ul>${trustBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></section>` : ''}
            ${practicalBullets.length ? `<section class="sheet-trust-card"><h3>Handig om vooraf te weten</h3><ul>${practicalBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul></section>` : ''}
        </div>` : ''}
        ${loc.crowd_pattern ? `<div class="drukte-indicator"><span class="drukte-icon">📊</span> <span class="drukte-text">${escapeHtml(loc.crowd_pattern)}</span></div>` : ''}
        ${facilities.length ? `<div class="card-facilities">${facilities.join('')}</div>` : ''}
        <div class="card-actions">
            ${buildDetailUrl(loc) ? `<a href="${buildDetailUrl(loc)}" class="btn btn-detail"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Meer info</a>` : ''}
            <a href="${buildMapsUrl(loc)}" target="_blank" rel="noopener" class="btn btn-maps"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Route</a>
            ${safeUrl(loc.website) ? `<a href="${safeUrl(loc.website)}" target="_blank" rel="noopener" class="btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Website</a>` : ''}
            <button class="btn btn-share" data-tooltip="Delen" aria-label="Deel ${escapeHtml(loc.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
        </div>
    `;
    const shareButton = content.querySelector('.btn-share');
    if (shareButton) {
        shareButton.addEventListener('click', () => window._pp_modules?.shareLocation?.(loc));
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
        document.querySelectorAll('.bnav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('tab-home').classList.add('active');
        window._pp_modules?.moveNavIndicator?.();
    }
}

// === Detail View ===
export async function showLocationDetail(regionSlug, locSlug) {
    const detailView = document.getElementById('detail-view');
    const appWrapper = document.querySelector('.app-wrapper');
    const planView = document.getElementById('plan-view');
    const bottomNav = document.getElementById('bottom-nav');

    if (appWrapper) appWrapper.classList.add('hidden');
    if (planView) planView.classList.add('hidden');
    if (bottomNav) bottomNav.classList.add('hidden');
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
        window._pp_modules?.trackEvent?.('detail_view', { location_id: locationId });
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
    html += '<a href="/app.html" class="detail-back" onclick="event.preventDefault(); if (history.length > 1) { history.back(); } else { location.href=\'/app.html\'; }"><svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Terug</a>';
    html += '<div class="detail-header"><span class="detail-type-badge">' + escapeHtml(typeLabel) + '</span><h1>' + escapeHtml(loc.name) + '</h1>';
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
            window._pp_modules?.closeMapFilters?.();
        }
    });
}
