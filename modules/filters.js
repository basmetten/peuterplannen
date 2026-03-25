import { state, DESKTOP_WIDTH, TYPE_LABELS, PRESET_LABELS } from './state.js';
import { trackEvent } from './utils.js';
import { loadLocations, showGpsStatus } from './data.js';
import bus from './bus.js';

/* Re-trigger a CSS animation by removing and re-adding it via reflow */
function popAnimate(el) {
    el.style.animation = 'none';
    el.offsetHeight; // force reflow
    el.style.animation = '';
}

/**
 * Sync aria-selected attributes on all filter chips to match their active CSS class.
 * @returns {void}
 */
export function syncChipAria() {
    document.querySelectorAll('.chip').forEach((chip) => {
        chip.setAttribute('aria-selected', chip.classList.contains('active') ? 'true' : 'false');
    });
}

/**
 * Sync aria-pressed and active class on all preset chips to match the active preset in state.
 * @returns {void}
 */
export function syncPresetAria() {
    document.querySelectorAll('.preset-chip, .sheet-preset').forEach((chip) => {
        const active = chip.dataset.preset === state.activePreset;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

/**
 * Count the number of active advanced filters (type, weather, facilities, age, radius).
 * @returns {number} Number of active advanced filters
 */
export function getAdvancedFilterCount() {
    let count = 0;
    if (state.activeTag !== 'all' && state.activeTag !== 'favorites') count++;
    if (state.activeWeather) count++;
    if (state.activeFacilities.coffee) count++;
    if (state.activeFacilities.diaper) count++;
    if (state.activeFacilities.alcohol) count++;
    if (state.activeAgeGroup) count++;
    if (state.activeRadius) count++;
    return count;
}

function updateFilterPanelSummary(labels = [], count = 0) {
    const title = document.getElementById('filter-panel-summary');
    const meta = document.getElementById('filter-panel-meta');
    if (!title || !meta) return;
    if (count === 0) {
        title.textContent = 'Type, weer en extra filters';
        meta.textContent = 'Toon of verberg de uitgebreide filters';
        return;
    }
    title.textContent = count === 1 ? '1 filter actief' : `${count} filters actief`;
    meta.textContent = labels.join(' · ');
}

/**
 * Expand or collapse the filter panel based on viewport width and active filter count.
 * @returns {void}
 */
export function syncFilterPanelForViewport() {
    const panel = document.getElementById('filter-panel');
    const toggle = document.getElementById('filter-panel-toggle');
    if (!panel || !toggle) return;
    const desktop = window.innerWidth >= DESKTOP_WIDTH || document.documentElement.classList.contains('pp-desktop');
    if (desktop) {
        const shouldOpen = state.filterPanelUserExpanded || getAdvancedFilterCount() > 0;
        panel.classList.toggle('collapsed', !shouldOpen);
        toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        return;
    }
    if (!panel.dataset.initialized) {
        panel.classList.add('collapsed');
        toggle.setAttribute('aria-expanded', 'false');
        panel.dataset.initialized = 'true';
    }
}

/**
 * Update the filter badge on the map filter button to show the count of active advanced filters.
 * Only counts non-type filters (type is visible via preset chips).
 * @returns {void}
 */
export function updateMapFilterBadge() {
    const badge = document.getElementById('sheet-filter-badge');
    const btn = document.getElementById('sheet-filter-btn');
    if (!badge || !btn) return;
    let count = 0;
    if (state.activeWeather) count++;
    if (state.activeFacilities.coffee) count++;
    if (state.activeFacilities.diaper) count++;
    if (state.activeFacilities.alcohol) count++;
    if (state.activeAgeGroup) count++;
    if (state.activeRadius) count++;
    if (state.activePreset) count++;
    if (count > 0) {
        const prev = badge.textContent;
        badge.textContent = String(count);
        badge.classList.add('visible');
        btn.classList.add('has-filters');
        if (prev !== badge.textContent) popAnimate(badge);
    } else {
        badge.textContent = '';
        badge.classList.remove('visible');
        btn.classList.remove('has-filters');
    }
}

/** Backward-compat alias */
export const updateMapPillBadge = updateMapFilterBadge;

/**
 * Recalculate all active filters, update the filter bar label/summary, and sync panel state.
 * @returns {void}
 */
export function updateFilterCount() {
    let count = 0;
    const labels = [];
    if (state.activeTag !== 'all') count++;
    if (state.activeTag === 'favorites') labels.push('shortlist');
    else if (state.activeTag !== 'all') labels.push(TYPE_LABELS[state.activeTag] || state.activeTag);
    if (state.activeWeather) { count++; labels.push(state.activeWeather === 'indoor' ? 'binnen' : 'buiten'); }
    if (state.activeFacilities.coffee) { count++; labels.push('koffie'); }
    if (state.activeFacilities.diaper) { count++; labels.push('verschonen'); }
    if (state.activeFacilities.alcohol) { count++; labels.push('alcohol'); }
    if (state.activeAgeGroup) { count++; labels.push(state.activeAgeGroup === 'dreumes' ? '0–2 jaar' : '2–5 jaar'); }
    if (state.activeRadius) { count++; labels.push(`${state.activeRadius} km`); }
    if (state.activePreset) { count++; labels.push(PRESET_LABELS[state.activePreset] || state.activePreset); }
    if (state.sharedShortlistIds.length) { count++; labels.push(`gedeelde shortlist (${state.sharedShortlistIds.length})`); }
    const bar = document.getElementById('active-filters');
    const label = document.getElementById('filter-count');
    const summary = document.getElementById('filter-summary');
    const clearSharedBtn = document.getElementById('clear-shared-shortlist');
    if (clearSharedBtn) clearSharedBtn.style.display = state.sharedShortlistIds.length ? 'inline-flex' : 'none';
    if (!label.hasAttribute('aria-live')) {
        label.setAttribute('aria-live', 'polite');
    }
    if (count > 0) {
        bar.style.display = 'flex';
        label.textContent = count + ' filter' + (count !== 1 ? 's' : '') + ' actief';
        if (summary) summary.textContent = labels.join(' · ');
    } else {
        bar.style.display = 'none';
        if (summary) summary.textContent = '';
    }
    updateFilterPanelSummary(labels, count);
    syncFilterPanelForViewport();
    updateMapPillBadge();
}

function collapseFilterPanelAfterSelection() {
    if (window.innerWidth < DESKTOP_WIDTH && !document.documentElement.classList.contains('pp-desktop')) {
        toggleFilterPanel(false);
    }
}

/**
 * Toggle the advanced filter panel open or closed.
 * @param {boolean|null} [forceOpen=null] - True to force open, false to force close, null to toggle
 * @returns {void}
 */
export function toggleFilterPanel(forceOpen = null) {
    const panel = document.getElementById('filter-panel');
    const toggle = document.getElementById('filter-panel-toggle');
    if (!panel || !toggle) return;
    const desktop = window.innerWidth >= DESKTOP_WIDTH || document.documentElement.classList.contains('pp-desktop');
    const nextCollapsed = forceOpen === null ? !panel.classList.contains('collapsed') : !forceOpen;
    if (desktop) state.filterPanelUserExpanded = !nextCollapsed;
    panel.classList.toggle('collapsed', nextCollapsed);
    toggle.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
}

/**
 * Toggle a preset filter (e.g. 'rain', 'peuterproof') and reload locations.
 * @param {string} preset - Preset key to toggle
 * @param {Event} [evt] - Optional click event
 * @returns {void}
 */
export function togglePreset(preset, evt) {
    evt?.preventDefault();
    if (preset === 'short-drive' && !state.userLocation) {
        document.getElementById('location-input')?.focus();
        showGpsStatus('Vul eerst een stad of gebruik je locatie voor een korte-rit filter', 'error');
        return;
    }
    state.activePreset = state.activePreset === preset ? null : preset;
    syncPresetAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

/**
 * Toggle the weather filter ('indoor' or 'outdoor') and reload locations.
 * @param {string} weather - Weather filter value ('indoor' or 'outdoor')
 * @param {Event} [evt] - Optional click event
 * @returns {void}
 */
export function toggleWeather(weather, evt) {
    trackEvent('filter', { weather: weather });
    if (state.activeWeather === weather) { state.activeWeather = null; } else { state.activeWeather = weather; }
    document.querySelectorAll('.chip').forEach(c => {
        if (c.textContent.trim() === 'Binnen' || c.textContent.trim() === 'Buiten') c.classList.remove('active');
    });
    if (state.activeWeather) {
        const weatherLabel = state.activeWeather === 'indoor' ? 'Binnen' : 'Buiten';
        const target = evt?.currentTarget || Array.from(document.querySelectorAll('.chip')).find((c) => c.textContent.trim() === weatherLabel);
        if (target) target.classList.add('active');
    }
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

// Base toggleTag (before nav sync extension)
function toggleTagBase(tag, evt) {
    trackEvent('filter', { type: tag });
    state.activeTag = tag;
    state.activeWeather = null;
    document.querySelectorAll('.chip').forEach(p => p.classList.remove('active'));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
    else document.querySelector('.chip').classList.add('active');
    document.querySelectorAll('.chip').forEach(c => {
        if (c.textContent.trim() === 'Koffie' && state.activeFacilities.coffee) c.classList.add('active');
        if (c.textContent.trim() === 'Verschonen' && state.activeFacilities.diaper) c.classList.add('active');
        if (c.textContent.trim() === 'Alcohol' && state.activeFacilities.alcohol) c.classList.add('active');
        if (c.textContent.trim() === 'Dreumes (0–2)' && state.activeAgeGroup === 'dreumes') c.classList.add('active');
        if (c.textContent.trim() === 'Peuter (2–5)' && state.activeAgeGroup === 'peuter') c.classList.add('active');
        if (state.activeRadius && c.classList.contains('radius-chip') && c.textContent.trim() === `${state.activeRadius} km`) c.classList.add('active');
    });
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

/**
 * Toggle the location type filter, sync navigation, and reload locations.
 * @param {string} tag - Type filter key ('all', 'play', 'farm', 'favorites', etc.)
 * @param {Event} [evt] - Optional click event from the chip
 * @returns {void}
 */
export function toggleTag(tag, evt) {
    if (state.currentDisplayMode === 'map') bus.emit('map:displaymode', 'list');
    if (tag === 'favorites') {
        state.currentView = 'favorites';
    } else {
        state.currentView = 'home';
    }
    bus.emit('nav:syncdesktop', 'home');
    toggleTagBase(tag, evt);
}

/**
 * Toggle a facility filter (coffee, diaper, alcohol) and reload locations.
 * @param {string} facility - Facility key ('coffee', 'diaper', or 'alcohol')
 * @param {Event} [evt] - Optional click event
 * @returns {void}
 */
export function toggleFacility(facility, evt) {
    state.activeFacilities[facility] = !state.activeFacilities[facility];
    if (evt && evt.target) {
        evt.target.classList.toggle('active', state.activeFacilities[facility]);
        evt.target.setAttribute('aria-selected', state.activeFacilities[facility] ? 'true' : 'false');
    }
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

/**
 * Toggle the age group filter ('dreumes' or 'peuter') and reload locations.
 * @param {string} group - Age group key ('dreumes' or 'peuter')
 * @param {Event} [evt] - Optional click event
 * @returns {void}
 */
export function toggleAge(group, evt) {
    evt?.stopPropagation();
    state.activeAgeGroup = (state.activeAgeGroup === group) ? null : group;
    document.querySelectorAll('.chip[onclick*="toggleAge"]').forEach(c => {
        c.classList.toggle('active', c.getAttribute('onclick').includes(`'${state.activeAgeGroup}'`));
        c.setAttribute('aria-selected', c.classList.contains('active') ? 'true' : 'false');
    });
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

/**
 * Toggle the radius filter to a specific km value and reload locations.
 * @param {number} km - Radius in kilometers (e.g. 5, 10, 25)
 * @param {Event} [evt] - Optional click event
 * @returns {void}
 */
export function toggleRadius(km, evt) {
    evt?.stopPropagation();
    if (!state.userLocation) { document.getElementById('location-input')?.focus(); return; }
    state.activeRadius = (state.activeRadius === km) ? null : km;
    document.querySelectorAll('.radius-chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-selected', 'false'); });
    if (state.activeRadius && evt?.currentTarget) {
        evt.currentTarget.classList.add('active');
        evt.currentTarget.setAttribute('aria-selected', 'true');
    }
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

/**
 * Reset all filters to their default values and reload locations.
 * @returns {void}
 */
export function resetAllFilters() {
    state.activeTag = 'all';
    state.activeWeather = null;
    state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
    state.activeAgeGroup = null;
    state.activeRadius = null;
    state.activeSort = 'default';
    state.activePreset = null;
    state.filterPanelUserExpanded = false;
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'default';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const firstChip = document.querySelector('.chip');
    if (firstChip) firstChip.classList.add('active');
    syncPresetAria();
    syncChipAria();
    syncMapPresetRow();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

// === Map filter controls ===

/**
 * Open the map search overlay and sync location input.
 * @returns {void}
 */
export function openMapFilters() {
    const overlay = document.getElementById('map-filters-overlay');
    if (!overlay) return;
    const mainInput = document.getElementById('location-input');
    const mapInput = document.getElementById('map-location-input');
    if (mainInput && mapInput) mapInput.value = mainInput.value;
    overlay.classList.add('open');
    setTimeout(() => mapInput?.focus(), 100);
}

/**
 * Close the map search overlay.
 * @returns {void}
 */
export function closeMapFilters() {
    const overlay = document.getElementById('map-filters-overlay');
    if (overlay) overlay.classList.remove('open');
}

/**
 * Open the advanced filter modal from the map filter button.
 * Emits bus event to trigger the modal in sheet-engine.js.
 * @returns {void}
 */
export function openMapFilterModal() {
    bus.emit('filtermodal:open');
}

/**
 * Toggle a type filter from the map preset chip row (does NOT switch to list view).
 * @param {string} tag - Type filter key
 * @param {Event} [evt] - Click event from the chip
 * @returns {void}
 */
export function toggleMapTag(tag, evt) {
    trackEvent('filter', { type: tag, source: 'map_preset' });
    state.activeTag = tag;
    // Sync all .chip elements in sidebar/overlay
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const tagLabels = { all: 'Alles', favorites: 'Favorieten', play: 'Speeltuin', farm: 'Boerderij', nature: 'Natuur', museum: 'Museum', swim: 'Zwemmen', pancake: 'Pannenkoeken', horeca: 'Horeca' };
    const label = tagLabels[tag];
    if (label) {
        document.querySelectorAll('.chip').forEach(c => {
            if (c.textContent.trim() === label) c.classList.add('active');
        });
    }
    // Re-add active to non-type chips
    document.querySelectorAll('.chip').forEach(c => {
        if (c.textContent.trim() === 'Koffie' && state.activeFacilities.coffee) c.classList.add('active');
        if (c.textContent.trim() === 'Verschonen' && state.activeFacilities.diaper) c.classList.add('active');
        if (c.textContent.trim() === 'Alcohol' && state.activeFacilities.alcohol) c.classList.add('active');
        if (c.textContent.trim() === 'Dreumes (0–2)' && state.activeAgeGroup === 'dreumes') c.classList.add('active');
        if (c.textContent.trim() === 'Peuter (2–5)' && state.activeAgeGroup === 'peuter') c.classList.add('active');
        if (state.activeRadius && c.classList.contains('radius-chip') && c.textContent.trim() === `${state.activeRadius} km`) c.classList.add('active');
    });
    syncMapPresetRow();
    syncChipAria();
    updateFilterCount();
    loadLocations();
}

/**
 * Sync map preset chip row active states to match current filter state.
 * @returns {void}
 */
export function syncMapPresetRow() {
    const row = document.getElementById('map-preset-row');
    if (!row) return;
    row.querySelectorAll('.map-preset-chip').forEach(chip => {
        const tag = chip.dataset.tag;
        const isActive = state.activeTag === tag;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

/**
 * Sync all map filter controls — preset row + filter badge.
 * @returns {void}
 */
export function syncMapFilterChips() {
    syncMapPresetRow();
    updateMapFilterBadge();
}

/** Legacy — kept for backward compat */
export function toggleMapMoreFilters() {}

// Bus listeners
bus.on('filters:countupdate', updateFilterCount);
bus.on('filters:closemap', closeMapFilters);
