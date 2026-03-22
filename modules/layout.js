import { state, DESKTOP_WIDTH } from './state.js';
import { closeLocSheet, closeInfoPanel, openInfoPanel } from './sheet.js';
import { setDisplayMode, fitMapToMarkers } from './map.js';
import { updateFilterCount, updateMapPillBadge } from './filters.js';
import { loadLocations } from './data.js';
import { trackEvent } from './utils.js';
import { renderCompactCard, getPhotoData } from './templates.js';
import { computePeuterScore } from './scoring.js';
import { isFavorite } from './favorites.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';

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
}

export function syncDesktopModeSwitch(mode = 'home') {
    document.querySelectorAll('.app-mode-chip').forEach((button) => {
        button.classList.toggle('active', button.dataset.modeTarget === mode);
    });
    document.querySelectorAll('.app-mode-switch').forEach((el) => {
        el.classList.toggle('is-plan', mode === 'plan');
    });
}

// --- Shared helpers ---

/** Sync the sheet tabs active state to match the current view */
function syncSheetTabs(view) {
    const tabMap = { home: 'ontdek', favorites: 'bewaard', plan: 'plan' };
    const tabName = tabMap[view] || 'ontdek';
    document.querySelectorAll('.sheet-tab').forEach(t => {
        const isActive = t.dataset.tab === tabName;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

/** Reset all filters to defaults */
function resetFilters() {
    state.activeTag = 'all';
    state.activeWeather = null;
    state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
    state.activeAgeGroup = null;
    state.activeRadius = null;
}

// --- View switching per viewport ---
//
// View effects by viewport:
//
//   Desktop (>= DESKTOP_WIDTH):
//     home      → reset filters, reload cards in sidebar
//     favorites → set tag to 'favorites', reload cards
//     info      → open info panel overlay
//     map       → (no-op, map is always visible on desktop)
//
//   Mobile (< DESKTOP_WIDTH, sheet-based):
//     home      → reset filters, reload cards, sheet → peek, resize map
//     map       → full-screen map, sheet → peek, show pill badge
//     favorites → set tag, reload cards, sheet → half
//     info      → open info panel overlay

/** Desktop view switching — sidebar + always-visible map */
function switchViewDesktop(view) {
    if (view === 'favorites') {
        state.activeTag = 'favorites';
        loadLocations();
    } else if (view === 'info') {
        openInfoPanel();
    } else if (view === 'home') {
        resetFilters();
        document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
        document.querySelector('.chip').classList.add('active');
        updateFilterCount();
        loadLocations();
    }
}

/** Mobile view switching — map + bottom sheet states */
function switchViewMobile(view) {
    state.currentView = view;

    switch (view) {
        case 'home':
            resetFilters();
            updateFilterCount();
            loadLocations();
            bus.emit('sheet:setstate', 'peek');
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
            bus.emit('sheet:setstate', 'peek');
            updateMapPillBadge();
            break;
        case 'favorites':
            state.activeTag = 'favorites';
            state.activeWeather = null;
            loadLocations();
            bus.emit('sheet:setstate', 'half');
            break;
        case 'info':
            openInfoPanel();
            break;
    }
}

/** Core dispatcher: cleanup shared state, then delegate to viewport-specific handler */
function switchViewCore(view) {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    closeLocSheet();
    if (view !== 'info') closeInfoPanel();
    if (view !== 'map') document.body.classList.remove('map-view-active');
    syncSheetTabs(view);

    if (isDesktop) {
        switchViewDesktop(view);
    } else {
        switchViewMobile(view);
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
        state.currentView = 'plan';
        syncSheetTabs('plan');
        bus.emit('plan:chipupdate');
        syncDesktopModeSwitch('plan');
        bus.emit('hash:update', 'plan');

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
    bus.emit('hash:update', '');
}

// === Map/List toggle ===

export function initMapListToggle() {
    const oldBtn = document.getElementById('map-list-toggle');
    const newBtn = document.getElementById('map-view-toggle');
    const gpsBtn = document.getElementById('map-gps-btn');
    if (oldBtn) oldBtn.addEventListener('click', toggleMapList);
    if (newBtn) newBtn.addEventListener('click', toggleMapList);
    // GPS button — use JS listener (onclick can fail in stacking contexts)
    if (gpsBtn) gpsBtn.addEventListener('click', () => {
        if (typeof getCurrentLocation === 'function') getCurrentLocation();
    });
}

export function toggleMapList() {
    isListMode = !isListMode;
    const btn = document.getElementById('map-list-toggle');
    const newBtn = document.getElementById('map-view-toggle');
    const label = btn?.querySelector('.toggle-label');
    const listView = document.getElementById('mobile-list-view');
    const sheet = document.getElementById('bottom-sheet');

    btn?.classList.toggle('is-list', isListMode);
    newBtn?.classList.toggle('is-list', isListMode);
    if (label) label.textContent = isListMode ? 'Kaart' : 'Lijst';

    const controls = document.getElementById('map-controls');

    if (isListMode) {
        // Show list, hide sheet, keep controls above list view
        listView?.classList.add('active');
        if (sheet) sheet.style.display = 'none';
        if (controls) controls.style.zIndex = '1001';
        // If data hasn't loaded yet, trigger fetch; bus listener will render when ready
        if (state.allLocations.length === 0) {
            loadLocations();
        } else {
            renderMobileList();
        }
        bus.emit('hash:update', 'list');
    } else {
        // Show map + sheet, hide list, restore controls z-index
        listView?.classList.remove('active');
        if (sheet) sheet.style.display = '';
        if (controls) controls.style.zIndex = '';
        // Resize map in case it needs updating
        if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), 50);
        bus.emit('hash:update', '');
    }
}

function renderMobileList() {
    const content = document.getElementById('mobile-list-content');
    const countEl = document.getElementById('list-view-count');
    const chipContainer = document.getElementById('list-filter-chips');
    if (!content) return;

    const locations = state.allLocations;
    if (countEl) countEl.textContent = locations.length + ' locaties';
    const topbarCount = document.getElementById('app-topbar-count');
    if (topbarCount) topbarCount.textContent = locations.length + ' locaties';

    // Render filter chips (Funda-style)
    if (chipContainer) {
        const types = [
            { key: 'all', label: 'Alles' },
            { key: 'play', label: 'Speeltuin' },
            { key: 'farm', label: 'Boerderij' },
            { key: 'nature', label: 'Natuur' },
            { key: 'museum', label: 'Museum' },
            { key: 'horeca', label: 'Horeca' },
            { key: 'swim', label: 'Zwemmen' }
        ];
        chipContainer.innerHTML = types.map(t =>
            `<button class="list-chip${state.activeTag === t.key || (t.key === 'all' && state.activeTag === 'all') ? ' active' : ''}" data-filter="${t.key}">${t.label}</button>`
        ).join('');
        chipContainer.querySelectorAll('.list-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                state.activeTag = chip.dataset.filter;
                state.activeWeather = null;
                bus.emit('data:reload');
            });
        });
    }

    // Empty state
    if (locations.length === 0) {
        content.innerHTML = `<div class="list-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(140,110,100,0.35)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div class="list-empty-title">Geen locaties gevonden</div>
            <div class="list-empty-sub">Probeer een ander filter of bekijk alle locaties</div>
            <button class="list-empty-btn" onclick="document.querySelector('.list-chip[data-filter=all]')?.click()">Toon alles</button>
        </div>`;
        return;
    }

    const TYPE_LABELS = { play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', horeca: 'Horeca', museum: 'Museum', swim: 'Zwemmen', pancake: 'Pannenkoeken' };
    const WEATHER_LABELS = { indoor: 'Binnen', outdoor: 'Buiten', both: 'Binnen & buiten', hybrid: 'Binnen & buiten' };

    const html = locations.slice(0, 60).map(loc => {
        const { imgSrc, categoryImg, photoColor } = getPhotoData(loc);
        const score = computePeuterScore(loc);
        const scoreClass = score >= 8 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low';
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        const weatherLabel = WEATHER_LABELS[loc.weather] || '';
        const isFav = isFavorite(loc.id);
        const favStyle = isFav ? 'fill:#D4775A;stroke:#D4775A;' : '';

        // Quick info pills
        const pills = [];
        if (weatherLabel) pills.push(weatherLabel);
        if (loc.coffee) pills.push('Koffie');
        if (loc.diaper) pills.push('Verschonen');
        const pillsHtml = pills.map(p => `<span class="list-card-pill">${escapeHtml(p)}</span>`).join('');

        const highlight = loc.toddler_highlight ? `<div class="list-card-highlight">${escapeHtml(loc.toddler_highlight)}</div>` : '';

        return `<div class="list-card" data-id="${loc.id}">
            <img class="list-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" decoding="async"
                 style="background:${photoColor}" onerror="this.src='${escapeHtml(categoryImg)}'">
            <div class="list-card-body">
                <div class="list-card-top">
                    <span class="list-card-type">${escapeHtml(typeLabel)}</span>
                    ${loc.region ? `<span class="list-card-region">${escapeHtml(loc.region)}</span>` : ''}
                </div>
                <div class="list-card-name">${escapeHtml(loc.name)}</div>
                ${highlight}
                <div class="list-card-pills">${pillsHtml}</div>
            </div>
            <div class="list-card-side">
                <div class="list-card-score ${scoreClass}">${score}</div>
                <button class="list-card-fav" onclick="event.stopPropagation();toggleFavorite(${loc.id},this)" aria-label="${isFav ? 'Verwijder' : 'Bewaar'}">
                    <svg viewBox="0 0 24 24" style="${favStyle}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    content.innerHTML = html;

    // Click handlers — exit list mode, then open location
    content.querySelectorAll('.list-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            if (isListMode) toggleMapList();
            bus.emit('sheet:open', id);
        });
    });
}

// === Panel collapse (desktop) ===

export function initPanelCollapse() {
    const btn = document.getElementById('panel-collapse-btn');
    const panel = document.getElementById('list-view');
    if (!btn || !panel) return;

    // Restore state
    if (localStorage.getItem('pp-panel-collapsed') === '1') {
        panel.classList.add('collapsed');
    }

    btn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        const collapsed = panel.classList.contains('collapsed');
        localStorage.setItem('pp-panel-collapsed', collapsed ? '1' : '0');
        // Resize map after transition
        if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), 350);
    });
}

// Bus listeners
bus.on('view:switch', switchView);
bus.on('nav:syncdesktop', syncDesktopModeSwitch);
bus.on('sheet:renderlist', () => {
    if (isListMode) renderMobileList();
    const topbarCount = document.getElementById('app-topbar-count');
    if (topbarCount && state.allLocations.length) {
        topbarCount.textContent = state.allLocations.length + ' locaties';
    }
});
