import { state, DESKTOP_WIDTH } from './state.js';
import { closeLocSheet, closeInfoPanel, openInfoPanel } from './sheet.js';
import { setDisplayMode, fitMapToMarkers } from './map.js';
import { updateFilterCount, updateMapPillBadge } from './filters.js';
import { trackEvent } from './utils.js';
import bus from './bus.js';

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

// === GPS button ===

export function initMapListToggle() {
    const gpsBtn = document.getElementById('map-gps-btn');
    if (gpsBtn) gpsBtn.addEventListener('click', () => {
        if (typeof getCurrentLocation === 'function') getCurrentLocation();
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
    const topbarCount = document.getElementById('app-topbar-count');
    if (topbarCount && state.allLocations.length) {
        topbarCount.textContent = state.allLocations.length + ' locaties';
    }
});
