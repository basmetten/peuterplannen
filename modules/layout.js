import { state, DESKTOP_WIDTH, TYPE_LABELS, CATEGORY_IMAGES } from './state.js';
import { closeLocSheet, closeInfoPanel, openInfoPanel } from './sheet.js';
import { setDisplayMode, fitMapToMarkers } from './map.js';
import { updateFilterCount, updateMapPillBadge } from './filters.js';
import { loadLocations } from './data.js';
import { trackEvent, escapeHtml } from './utils.js';
import { computePeuterScore } from './scoring.js';

let isListMode = false;

export function applyLayout() {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    document.documentElement.classList.toggle('pp-desktop', isDesktop);
    document.documentElement.classList.toggle('pp-mobile-map', !isDesktop);
    const mc = document.getElementById('map-container');
    if (mc) mc.classList.remove('hidden');
    // On mobile: ensure map fills viewport after layout change
    if (!isDesktop && state.mapInstance) {
        setTimeout(() => state.mapInstance.resize(), 50);
    }
    moveNavIndicator(true);
}

export function moveNavIndicator(instant = false) {
    const active = document.querySelector('.bnav-item.active');
    const indicator = document.getElementById('nav-indicator');
    const nav = document.getElementById('bottom-nav');
    if (!active || !indicator || !nav) return;
    const nr = nav.getBoundingClientRect();
    const br = active.getBoundingClientRect();
    if (instant) indicator.classList.add('no-transition');
    indicator.style.left = (br.left - nr.left) + 'px';
    indicator.style.width = br.width + 'px';
    if (instant) requestAnimationFrame(() => indicator.classList.remove('no-transition'));
}

export function syncDesktopModeSwitch(mode = 'home') {
    document.querySelectorAll('.app-mode-chip').forEach((button) => {
        button.classList.toggle('active', button.dataset.modeTarget === mode);
    });
    document.querySelectorAll('.app-mode-switch').forEach((el) => {
        el.classList.toggle('is-plan', mode === 'plan');
    });
}

// Core switch logic (without plan integration)
function switchViewCore(view) {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    closeLocSheet();
    if (view !== 'info') closeInfoPanel();
    if (view !== 'map') document.body.classList.remove('map-view-active');

    document.querySelectorAll('.bnav-item').forEach(item => item.classList.remove('active'));
    const tab = document.getElementById('tab-' + view);
    if (tab) tab.classList.add('active');
    moveNavIndicator();

    if (isDesktop) {
        if (view === 'favorites') { state.activeTag = 'favorites'; loadLocations(); }
        else if (view === 'info') { openInfoPanel(); }
        else if (view === 'home') {
            state.activeTag = 'all'; state.activeWeather = null;
            state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
            state.activeAgeGroup = null; state.activeRadius = null;
            document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
            document.querySelector('.chip').classList.add('active');
            updateFilterCount(); loadLocations();
        }
        syncDesktopModeSwitch('home');
        return;
    }

    state.currentView = view;

    // Mobile: use sheet states instead of DOM manipulation
    const isMobileMap = document.documentElement.classList.contains('pp-mobile-map');
    if (isMobileMap) {
        switch(view) {
            case 'home':
                state.activeTag = 'all'; state.activeWeather = null;
                state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
                state.activeAgeGroup = null; state.activeRadius = null;
                updateFilterCount();
                loadLocations();
                window._pp_modules?.setSheetState?.('peek');
                if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), 50);
                break;
            case 'map':
                trackEvent('map_view');
                document.body.classList.add('map-view-active');
                if (!state.mapInstance) {
                    setDisplayMode('map');
                } else {
                    setTimeout(() => state.mapInstance.resize(), 50);
                    fitMapToMarkers();
                }
                window._pp_modules?.setSheetState?.('peek');
                updateMapPillBadge();
                break;
            case 'favorites':
                state.activeTag = 'favorites'; state.activeWeather = null;
                loadLocations();
                window._pp_modules?.setSheetState?.('half');
                break;
            case 'info':
                openInfoPanel();
                break;
        }
        return;
    }

    // Desktop/legacy mobile: original DOM-based switching
    if (view !== 'map' && state.currentDisplayMode === 'map') setDisplayMode('list');

    switch(view) {
        case 'home':
            state.activeTag = 'all'; state.activeWeather = null;
            state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
            document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
            document.querySelector('.chip')?.classList.add('active');
            updateFilterCount();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const results = document.getElementById('results-container');
            if (results) {
                results.classList.add('view-enter');
                setTimeout(() => results.classList.remove('view-enter'), 200);
            }
            loadLocations();
            break;
        case 'map':
            trackEvent('map_view');
            setDisplayMode('map');
            document.body.classList.add('map-view-active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), 50);
            updateMapPillBadge();
            break;
        case 'favorites':
            state.activeTag = 'favorites'; state.activeWeather = null;
            document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
            const favChip = Array.from(document.querySelectorAll('.chip')).find(ch => ch.textContent === 'Favorieten');
            if (favChip) favChip.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const resultsF = document.getElementById('results-container');
            if (resultsF) {
                resultsF.classList.add('view-enter');
                setTimeout(() => resultsF.classList.remove('view-enter'), 200);
            }
            loadLocations();
            break;
        case 'info':
            openInfoPanel();
            break;
    }
}

// Full switchView with plan tab support
export function switchView(view) {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    const planView = document.getElementById('plan-view');
    const appWrapper = document.querySelector('.app-wrapper');

    if (view === 'plan') {
        document.body.classList.add('plan-mode');
        if (appWrapper) appWrapper.classList.add('hidden');
        if (planView) planView.classList.remove('hidden');
        document.querySelectorAll('.bnav-item').forEach(i => i.classList.remove('active'));
        document.getElementById('tab-plan')?.classList.add('active');
        state.currentView = 'plan';
        window._pp_modules?.updatePlanLocationChip?.();
        syncDesktopModeSwitch('plan');
        moveNavIndicator();
        window._pp_modules?.updateHash?.('plan');

        // Mode transition animation
        if (isDesktop && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('plan-mode')) {
            document.body.dataset.modeDirection = 'to-plan';
            document.body.classList.add('app-mode-animating');
            window.setTimeout(() => { document.body.classList.remove('app-mode-animating'); delete document.body.dataset.modeDirection; }, 440);
        }
        return;
    }

    // Leaving plan mode
    const wasInPlan = document.body.classList.contains('plan-mode');
    document.body.classList.remove('plan-mode');
    if (planView) planView.classList.add('hidden');
    if (appWrapper) appWrapper.classList.remove('hidden');

    if (wasInPlan && isDesktop && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.dataset.modeDirection = 'to-home';
        document.body.classList.add('app-mode-animating');
        window.setTimeout(() => { document.body.classList.remove('app-mode-animating'); delete document.body.dataset.modeDirection; }, 440);
    }

    switchViewCore(view);
    syncDesktopModeSwitch('home');
    window._pp_modules?.updateHash?.('');
}

// === Map/List toggle ===

export function initMapListToggle() {
    const btn = document.getElementById('map-list-toggle');
    if (!btn) return;
    btn.addEventListener('click', toggleMapList);
}

export function toggleMapList() {
    isListMode = !isListMode;
    const btn = document.getElementById('map-list-toggle');
    const label = btn?.querySelector('.toggle-label');
    const listView = document.getElementById('mobile-list-view');
    const sheet = document.getElementById('bottom-sheet');

    btn?.classList.toggle('is-list', isListMode);
    if (label) label.textContent = isListMode ? 'Kaart' : 'Lijst';

    if (isListMode) {
        // Show list, hide sheet
        listView?.classList.add('active');
        if (sheet) sheet.style.display = 'none';
        renderMobileList();
        window._pp_modules?.updateHash?.('list');
    } else {
        // Show map + sheet, hide list
        listView?.classList.remove('active');
        if (sheet) sheet.style.display = '';
        // Resize map in case it needs updating
        if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), 50);
        window._pp_modules?.updateHash?.('');
    }
}

function renderMobileList() {
    const content = document.getElementById('mobile-list-content');
    const countEl = document.getElementById('list-view-count');
    if (!content) return;

    const locations = state.allLocations;
    if (countEl) countEl.textContent = locations.length + ' locaties';

    const html = locations.slice(0, 50).map(loc => {
        const ps = computePeuterScore(loc) || '';
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        const photoSrc = loc.photo_url || loc.owner_photo_url;
        const categoryImg = CATEGORY_IMAGES[loc.type] || CATEGORY_IMAGES.play;
        const imgSrc = photoSrc || categoryImg;

        return `<div class="compact-card" style="padding: 12px 16px;" data-id="${loc.id}">
            <img class="compact-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name || '')}" loading="lazy" decoding="async" style="width:72px;height:72px"
                 onerror="this.src='${escapeHtml(categoryImg)}'">
            <div class="compact-card-body">
                <div class="compact-card-name">${escapeHtml(loc.name || '')}</div>
                <div class="compact-card-meta">${escapeHtml(typeLabel)}${loc.region ? ' \u00b7 ' + escapeHtml(loc.region) : ''}</div>
            </div>
            <div class="compact-card-score">${ps}\u2605</div>
        </div>`;
    }).join('');

    content.innerHTML = html;

    // Click handlers
    content.querySelectorAll('.compact-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            window._pp_modules?.openLocSheet?.(id);
        });
    });
}
