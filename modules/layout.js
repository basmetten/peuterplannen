import { state, DESKTOP_WIDTH } from './state.js';
import { closeLocSheet, closeInfoPanel, openInfoPanel } from './sheet.js';
import { setDisplayMode, fitMapToMarkers, updateUserLocationOnMap } from './map.js';
import { updateFilterCount, updateMapPillBadge } from './filters.js';
import { trackEvent } from './utils.js';
import { requestLocation, getLocationState } from './geolocation.js';
import bus from './bus.js';

// --- Constants ---
const MAP_RESIZE_DELAY_MS = 50;
const MODE_ANIMATION_DURATION_MS = 440;
const PANEL_COLLAPSE_RESIZE_MS = 350;

export function applyLayout() {
    const isDesktop = window.innerWidth >= DESKTOP_WIDTH;
    document.documentElement.classList.toggle('pp-desktop', isDesktop);
    document.documentElement.classList.toggle('pp-mobile-map', !isDesktop);
    const mc = document.getElementById('map-container');
    if (mc) mc.classList.remove('hidden');
    // On mobile: ensure map fills viewport after layout change
    if (!isDesktop && state.mapInstance) {
        setTimeout(() => state.mapInstance.resize(), MAP_RESIZE_DELAY_MS);
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

/** Sync the sheet tabs active state to match the current view (no-op if tabs removed) */
function syncSheetTabs(view) {
    const tabs = document.querySelectorAll('.sheet-tab');
    if (!tabs.length) return;
    const tabMap = { home: 'ontdek', favorites: 'bewaard' };
    const tabName = tabMap[view] || 'ontdek';
    tabs.forEach(t => {
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
            if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), MAP_RESIZE_DELAY_MS);
            break;
        case 'map':
            trackEvent('map_view');
            document.body.classList.add('map-view-active');
            if (!state.mapInstance) {
                setDisplayMode('map');
            } else {
                setTimeout(() => state.mapInstance.resize(), MAP_RESIZE_DELAY_MS);
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
        window.location.href = '/plan.html';
        return;
    }

    switchViewCore(view);
    syncDesktopModeSwitch('home');
    bus.emit('hash:update', '');
}

// === GPS button — Apple Maps style fly-to + location tracking ===

const GPS_FLY_ZOOM = 14;
const GPS_FLY_DURATION = 1500;
const GPS_ERROR_TOAST_MS = 3000;

export function initMapListToggle() {
    const gpsBtn = document.getElementById('map-gps-btn');
    if (!gpsBtn) return;

    gpsBtn.addEventListener('click', async () => {
        // If already have location, just fly there
        if (state.userLocation && getLocationState() === 'active') {
            flyToUserLocation();
            gpsBtn.style.transform = 'scale(0.85)';
            setTimeout(() => { gpsBtn.style.transform = ''; }, 150);
            return;
        }

        // Request location via centralized module (handles UI states + retries)
        const loc = await requestLocation();

        if (loc) {
            // Show blue user dot on map
            updateUserLocationOnMap();
            // Fly to location
            flyToUserLocation();
            // Trigger data reload
            bus.emit('data:reload');
            trackEvent('search', { query_type: 'gps_map_btn' });
        } else {
            // Show toast with current error state
            const s = getLocationState();
            const msgs = { denied: 'Toestemming geweigerd', timeout: 'Timeout', error: 'Locatie niet beschikbaar' };
            showGpsToast(msgs[s] || 'Locatie niet beschikbaar');
        }
    });
}

function flyToUserLocation() {
    if (!state.mapInstance || !state.userLocation) return;
    state.mapInstance.flyTo({
        center: [state.userLocation.lng, state.userLocation.lat],
        zoom: GPS_FLY_ZOOM,
        duration: GPS_FLY_DURATION,
        essential: true
    });
}

function showGpsToast(message) {
    // Reuse existing toast if available, otherwise create one
    let toast = document.getElementById('gps-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gps-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.cssText = 'position:fixed;top:calc(60px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%) translateY(-10px);background:rgba(0,0,0,0.78);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:10000;backdrop-filter:blur(12px);opacity:0;transition:opacity 250ms ease,transform 250ms ease;pointer-events:none;white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, GPS_ERROR_TOAST_MS);
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
        if (state.mapInstance) setTimeout(() => state.mapInstance.resize(), PANEL_COLLAPSE_RESIZE_MS);
    });
}

// Sync map GPS button when user location changes from any source
bus.on('map:userlocation', () => {
    const mapGpsBtn = document.getElementById('map-gps-btn');
    if (!mapGpsBtn) return;
    mapGpsBtn.classList.remove('gps-loading');
    if (state.userLocation) {
        mapGpsBtn.classList.add('gps-active');
    } else {
        mapGpsBtn.classList.remove('gps-active');
    }
});

// Bus listeners
bus.on('view:switch', switchView);
bus.on('nav:syncdesktop', syncDesktopModeSwitch);
bus.on('sheet:renderlist', () => {
    const topbarCount = document.getElementById('app-topbar-count');
    if (topbarCount && state.allLocations.length) {
        topbarCount.textContent = state.allLocations.length + ' locaties';
    }
});
