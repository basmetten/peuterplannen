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

export function syncChipAria() {
    document.querySelectorAll('.chip').forEach((chip) => {
        chip.setAttribute('aria-selected', chip.classList.contains('active') ? 'true' : 'false');
    });
}

export function syncPresetAria() {
    document.querySelectorAll('.preset-chip, .sheet-preset').forEach((chip) => {
        const active = chip.dataset.preset === state.activePreset;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

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

export function updateMapPillBadge() {
    const badge = document.getElementById('map-pill-badge');
    const pill = document.getElementById('map-search-pill');
    if (!badge || !pill) return;
    let count = 0;
    if (state.activeTag !== 'all') count++;
    if (state.activeWeather) count++;
    if (state.activeFacilities.coffee) count++;
    if (state.activeFacilities.diaper) count++;
    if (state.activeFacilities.alcohol) count++;
    if (state.activeAgeGroup) count++;
    if (state.activeRadius) count++;
    if (state.activePreset) count++;
    if (count > 0) {
        const prev = badge.textContent;
        badge.textContent = count + ' filter' + (count !== 1 ? 's' : '');
        badge.style.display = '';
        if (prev !== badge.textContent) popAnimate(badge);
    } else {
        badge.style.display = 'none';
    }
}

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

// Extended toggleTag with nav sync
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
    document.querySelector('.chip').classList.add('active');
    syncPresetAria();
    syncChipAria();
    updateFilterCount();
    collapseFilterPanelAfterSelection();
    loadLocations();
}

// === Map filter overlay ===
export function openMapFilters() {
    const overlay = document.getElementById('map-filters-overlay');
    if (!overlay) return;
    syncMapFilterChips();
    const mainInput = document.getElementById('location-input');
    const mapInput = document.getElementById('map-location-input');
    if (mainInput && mapInput) mapInput.value = mainInput.value;
    overlay.classList.add('open');
}

export function closeMapFilters() {
    const overlay = document.getElementById('map-filters-overlay');
    if (overlay) overlay.classList.remove('open');
}

export function syncMapFilterChips() {
    const typeRow = document.getElementById('map-filter-type-chips');
    if (typeRow) {
        typeRow.querySelectorAll('.chip').forEach(chip => {
            const onclick = chip.getAttribute('onclick') || '';
            let isActive = false;
            if (onclick.includes("'all'")) isActive = state.activeTag === 'all';
            else if (onclick.includes("'favorites'")) isActive = state.activeTag === 'favorites';
            else if (onclick.includes("'play'")) isActive = state.activeTag === 'play';
            else if (onclick.includes("'farm'")) isActive = state.activeTag === 'farm';
            else if (onclick.includes("'nature'")) isActive = state.activeTag === 'nature';
            else if (onclick.includes("'museum'")) isActive = state.activeTag === 'museum';
            else if (onclick.includes("'swim'")) isActive = state.activeTag === 'swim';
            else if (onclick.includes("'pancake'")) isActive = state.activeTag === 'pancake';
            else if (onclick.includes("'horeca'")) isActive = state.activeTag === 'horeca';
            chip.classList.toggle('active', isActive);
            chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }
    const extra = document.getElementById('map-filter-extra');
    if (extra) {
        extra.querySelectorAll('.chip').forEach(chip => {
            const onclick = chip.getAttribute('onclick') || '';
            let isActive = false;
            if (onclick.includes("toggleWeather")) isActive = onclick.includes("'indoor'") ? state.activeWeather === 'indoor' : state.activeWeather === 'outdoor';
            else if (onclick.includes("toggleFacility('coffee'")) isActive = !!state.activeFacilities.coffee;
            else if (onclick.includes("toggleFacility('diaper'")) isActive = !!state.activeFacilities.diaper;
            else if (onclick.includes("toggleFacility('alcohol'")) isActive = !!state.activeFacilities.alcohol;
            else if (onclick.includes("toggleAge('dreumes'")) isActive = state.activeAgeGroup === 'dreumes';
            else if (onclick.includes("toggleAge('peuter'")) isActive = state.activeAgeGroup === 'peuter';
            else if (onclick.includes("toggleRadius(5")) isActive = state.activeRadius === 5;
            else if (onclick.includes("toggleRadius(10")) isActive = state.activeRadius === 10;
            else if (onclick.includes("toggleRadius(25")) isActive = state.activeRadius === 25;
            chip.classList.toggle('active', isActive);
            chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }
    updateMapMoreBadge();
}

export function toggleMapMoreFilters() {
    const extra = document.getElementById('map-filter-extra');
    const btn = document.getElementById('map-filter-more-btn');
    if (!extra || !btn) return;
    const isHidden = extra.style.display === 'none';
    extra.style.display = isHidden ? 'block' : 'none';
    btn.classList.toggle('expanded', isHidden);
}

function updateMapMoreBadge() {
    const badge = document.getElementById('map-filter-more-badge');
    if (!badge) return;
    let count = 0;
    if (state.activeWeather) count++;
    if (state.activeFacilities.coffee) count++;
    if (state.activeFacilities.diaper) count++;
    if (state.activeFacilities.alcohol) count++;
    if (state.activeAgeGroup) count++;
    if (state.activeRadius) count++;
    if (count > 0) {
        const prev = badge.textContent;
        badge.textContent = count;
        badge.style.display = '';
        if (prev !== String(count)) popAnimate(badge);
    } else {
        badge.style.display = 'none';
    }
}

// Bus listeners
bus.on('filters:countupdate', updateFilterCount);
bus.on('filters:closemap', closeMapFilters);
