// PeuterPlannen App — ES Module Entry Point
import { state, DESKTOP_WIDTH } from './modules/state.js';
import { escapeHtml, trackEvent, buildDetailUrl } from './modules/utils.js';
import { toggleFavorite, toggleFavoriteFromSheet, shareLocation, updateShortlistBar, updateFavBadge, shareShortlist, showShortlist, clearShortlist, clearSharedShortlist } from './modules/favorites.js';
import { loadLocations, checkWeather, initAutocomplete, getCurrentLocation, updateLocation, setCity, updateLocationFromMap, applySort, showGpsStatus } from './modules/data.js';
import { toggleTag, toggleWeather, toggleFacility, toggleAge, toggleRadius, togglePreset, toggleFilterPanel, resetAllFilters, updateFilterCount, syncFilterPanelForViewport, syncPresetAria, syncChipAria, openMapFilters, closeMapFilters, toggleMapMoreFilters, updateMapPillBadge } from './modules/filters.js';
import { renderCards } from './modules/cards.js';
import { loadMapLibre, initMap, updateMapMarkers, fitMapToMarkers, updateUserLocationOnMap, highlightMarker, setDisplayMode } from './modules/map.js';
import { openLocSheet, closeLocSheet, openInfoPanel, closeInfoPanel, showLocationDetail, initSheetGestures } from './modules/sheet.js';
import { switchView, applyLayout, syncDesktopModeSwitch, initMapListToggle, initPanelCollapse } from './modules/layout.js';
import { generatePlan, selectPlanDate, selectPlanOption, changeKidsCount, updateChildAge, sharePlan, sharePlanWhatsApp, updatePlanLocationChip, renderAgeSliders, renderPlanPreview, initPlan, initPlanFromPrefs, handleSwapPlanSlot } from './modules/plan.js';
import { initSheet, initSheetTabs, renderSheetList, updateSheetMeta, setSheetState, showLocationInSheet, hideLocationPreview } from './modules/sheet-engine.js';
import { getPrefs, clearPrefs } from './modules/prefs.js';
import { getThisWeekPicks, fetch5DayForecast, renderWeekPicks, renderForecastStrip } from './modules/discovery.js';
import bus from './modules/bus.js';

// ── Browser History Management ──
let _navGuard = false; // prevents pushNavState during popstate handling

function pushNavState(type, data = {}) {
    if (_navGuard) return;
    history.pushState({ type, ...data }, '');
}

window.addEventListener('popstate', (e) => {
    const s = e.state;
    if (!s) return;

    _navGuard = true;
    try {
        switch (s.type) {
            case 'loc-sheet':
                closeLocSheet();
                break;
            case 'search': {
                const input = document.getElementById('sheet-search-input');
                if (input) { input.value = ''; input.blur(); }
                document.getElementById('bottom-sheet')?.classList.remove('search-active');
                // Hide suggestions
                const sug = document.getElementById('search-suggestions');
                if (sug) sug.innerHTML = '';
                break;
            }
            case 'filter-modal':
                document.getElementById('filter-modal')?.classList.remove('open');
                document.getElementById('filter-modal-overlay')?.classList.remove('open');
                break;
            case 'plan':
                switchView('home');
                break;
            case 'info':
                closeInfoPanel();
                break;
        }
    } finally {
        _navGuard = false;
    }
});

window.pushNavState = pushNavState;

// Mark initial state so popstate knows when we're at the base
history.replaceState({ type: 'base' }, '');

// === Deep Linking: hash helper ===
function updateHash(hash) {
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
}

// === Bus listeners for app-level functions ===
bus.on('hash:update', updateHash);
bus.on('discovery:render', async () => {
    const region = state.userLocation?.name || state.allLocations[0]?.region || 'jouw buurt';
    const picks = getThisWeekPicks(state.allLocations, region);
    renderWeekPicks(picks, document.getElementById('sheet-week-picks'));

    const lat = state.userLocation?.lat || 52.37;
    const lng = state.userLocation?.lng || 4.90;
    const forecast = await fetch5DayForecast(lat, lng);
    renderForecastStrip(forecast, document.getElementById('sheet-forecast'));
});

// === Expose all HTML onclick-referenced functions on window ===
Object.assign(window, {
    switchView, getCurrentLocation, updateLocation, setCity,
    togglePreset, toggleFilterPanel, toggleTag, toggleWeather,
    toggleFacility, toggleAge, toggleRadius, resetAllFilters,
    clearSharedShortlist, showShortlist, shareShortlist, clearShortlist,
    fitMapToMarkers, openMapFilters, closeMapFilters, updateLocationFromMap,
    toggleMapMoreFilters, closeInfoPanel, closeLocSheet, setSheetState,
    selectPlanDate, selectPlanOption, changeKidsCount, updateChildAge,
    generatePlan, sharePlan, sharePlanWhatsApp,
    swapPlanSlot: handleSwapPlanSlot,
    toggleFavorite, toggleFavoriteFromSheet, applySort, loadLocations,
    syncPresetAria, syncChipAria,
});

// === URL Parameter Parsing ===
(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('locatie')) state.locatieParam = params.get('locatie');
    if (params.get('weather')) {
        state.activeWeather = params.get('weather');
        setTimeout(() => {
            document.querySelectorAll('.chip').forEach(c => {
                if (c.textContent.trim() === 'Binnen' && state.activeWeather === 'indoor') c.classList.add('active');
                if (c.textContent.trim() === 'Buiten' && state.activeWeather === 'outdoor') c.classList.add('active');
            });
            syncChipAria();
        }, 0);
    }
    if (params.get('type') && params.get('type') !== 'all') {
        state.activeTag = params.get('type');
        setTimeout(() => {
            document.querySelector('.chip.active')?.classList.remove('active');
            document.querySelectorAll('.chip').forEach(c => {
                const map = { play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', horeca: 'Horeca', museum: 'Museum', swim: 'Zwemmen', pancake: 'Pannenkoeken' };
                if (c.textContent.trim() === map[state.activeTag]) c.classList.add('active');
            });
            syncChipAria();
        }, 0);
    }
    if (params.get('regio')) state.activeRegion = params.get('regio');
    if (params.get('age')) state.activeAgeGroup = params.get('age');
    if (params.get('ids')) {
        state.sharedShortlistIds = params.get('ids').split(',').map((v) => Number.parseInt(v, 10)).filter((v) => Number.isInteger(v) && v > 0);
    }
    const presetParam = params.get('preset');
    const queryParam = params.get('q');
    const gpsParam = params.get('gps');
    if (queryParam) {
        setTimeout(() => {
            const input = document.getElementById('location-input');
            if (input) { input.value = queryParam; updateLocation(); }
        }, 0);
    }
    if (gpsParam === '1') setTimeout(() => getCurrentLocation(), 0);
    if (presetParam) setTimeout(() => togglePreset(presetParam), 100);
    if (presetParam || queryParam || gpsParam) {
        setTimeout(() => { const header = document.querySelector('.decision-stage-header'); if (header) header.hidden = true; }, 0);
    }
    if (!presetParam && !queryParam && !gpsParam && !localStorage.getItem('gpsLat') && !localStorage.getItem('lastCity')) {
        setTimeout(() => { const onboarding = document.getElementById('gps-onboarding'); if (onboarding) onboarding.hidden = false; }, 0);
    }
})();

// === Init ===
// Setup gesture handlers for sheets
initSheetGestures();
// Initialize mobile bottom sheet (4-state)
initSheet();
// Initialize sheet navigation tabs
initSheetTabs();
// Initialize map/list toggle button
initMapListToggle();
initPanelCollapse();

// Search input handlers
document.getElementById('location-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') updateLocation(); });
document.getElementById('location-input').addEventListener('focus', () => { if (!state.autocomplete) initAutocomplete(); }, { once: true });

// Load data
if (state.locatieParam) {
    const locParts = state.locatieParam.split('/');
    if (locParts.length === 2) {
        showLocationDetail(locParts[0], locParts[1]);
    } else {
        state.locatieParam = null;
        updateShortlistBar(); updateFavBadge(); updateFilterCount(); syncFilterPanelForViewport();
        loadLocations(); checkWeather();
    }
} else {
    try {
        const savedCity = localStorage.getItem('pp-last-city');
        const prefs = getPrefs();
        const cityToUse = savedCity || prefs.city;
        if (cityToUse) {
            const input = document.getElementById('location-input');
            if (input) input.value = cityToUse;
            const popularEl = document.getElementById('popular-cities');
            if (popularEl) popularEl.classList.add('hidden');
            updateLocation();
        }
    } catch(e) {}
    updateShortlistBar(); updateFavBadge(); updateFilterCount(); syncFilterPanelForViewport();
    loadLocations(); checkWeather();
}

// Layout
applyLayout();
syncDesktopModeSwitch(state.locatieParam ? null : 'home');
window.addEventListener('resize', () => { applyLayout(); syncFilterPanelForViewport(); });

// Offline detection
const offlineBanner = document.getElementById('offline-banner');
function updateOfflineStatus() { offlineBanner.classList.toggle('hidden', navigator.onLine); }
window.addEventListener('online', () => { updateOfflineStatus(); loadLocations(); });
window.addEventListener('offline', updateOfflineStatus);
updateOfflineStatus();

// Load MapLibre — on mobile: init immediately (map is always visible background)
// On desktop: also init immediately (side-by-side layout)
loadMapLibre().then(() => initMap()).catch(() => {});

// View transitions
document.getElementById('results-container').addEventListener('click', (e) => {
    const link = e.target.closest('a.btn-detail');
    if (!link || !link.href) return;
    if (!document.startViewTransition) return;
    e.preventDefault();
    const href = link.href;
    document.startViewTransition(() => { location.href = href; });
});

// Scroll-reveal observer
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px 100px 0px' });

const resultsContainer = document.getElementById('results-container');
if (resultsContainer) {
    new MutationObserver(() => {
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
    }).observe(resultsContainer, { childList: true });
}

// === Deep Linking via Hash ===
function parseHash() {
    const hash = location.hash.slice(1); // remove #
    if (!hash) return;

    if (hash === 'plan') {
        switchView('plan');
        return;
    }

    if (hash.startsWith('list')) {
        // #list or #list/amsterdam
        const parts = hash.split('/');
        if (parts[1]) {
            setTimeout(() => setCity(parts[1]), 500);
        }
        return;
    }

    // #@lat,lng,zoom or #@lat,lng,zoom/loc/slug
    const mapMatch = hash.match(/^@([\d.-]+),([\d.-]+),(\d+)z(?:\/loc\/(.+))?$/);
    if (mapMatch) {
        const [, lat, lng, zoom, locSlug] = mapMatch;
        setTimeout(() => {
            if (state.mapInstance) {
                state.mapInstance.jumpTo({
                    center: [parseFloat(lng), parseFloat(lat)],
                    zoom: parseInt(zoom)
                });
            }
            if (locSlug) {
                const loc = state.allLocations.find(l => {
                    const slug = (l.name || '').toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return slug === locSlug;
                });
                if (loc) {
                    bus.emit('sheet:showlocation', loc);
                    bus.emit('map:highlight', loc.id);
                }
            }
        }, 1500); // wait for map + data load
        return;
    }
}

// Parse on load
parseHash();

// Listen for hash changes (back/forward navigation)
window.addEventListener('hashchange', parseHash);

// Service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW:', e));
}

// Init plan view + restore saved preferences
initPlan();
initPlanFromPrefs();

// Restore age filter from prefs
try {
    const prefs = getPrefs();
    if (prefs.childAges?.length && prefs.onboardingComplete) {
        const ageMap = { dreumes: 'dreumesproof', peuter: 'peuterproof' };
        const preset = ageMap[prefs.childAges[0]];
        if (preset && !state.activePreset) {
            // Delay to let initial load complete
            setTimeout(() => togglePreset(preset), 500);
        }
    }
} catch(e) {}

// Clear all saved preferences
function clearAllPrefs() {
    clearPrefs();
    try { localStorage.removeItem('pp-last-city'); } catch(e) {}
    location.reload();
}
window.clearAllPrefs = clearAllPrefs;
