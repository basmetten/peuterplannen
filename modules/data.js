import { state, SB_URL, SB_KEY, FULL_LOCATION_SELECT, FALLBACK_LOCATION_SELECT, LOCATIONS_CACHE_KEY, LOCATIONS_CACHE_TTL_MS, LOCATIONS_CACHE_DB, LOCATIONS_CACHE_STORE } from './state.js';
import { escapeHtml, calculateTravelTimes, loadGoogleMaps, trackEvent } from './utils.js';
import { computePeuterScore, matchesPreset, matchesPresetDistance } from './scoring.js';
import { getFavorites } from './favorites.js';
import { setPrefs } from './prefs.js';
import { requestLocation, resetLocationState } from './geolocation.js';
import bus from './bus.js';

// --- Constants ---
const AUTO_RETRY_MAX = 3;
const AUTO_RETRY_INTERVAL_MS = 30000;
const SKELETON_FADEOUT_MS = 220;
const DEFAULT_FETCH_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 500;
const FETCH_PAGE_SIZE = 1000;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_RETRY_DELAY_MS = 2000;
const CACHE_MAX_ITEMS = 250;
const FALLBACK_LAT = 52.37;
const FALLBACK_LNG = 4.90;

let currentAbort = null;
let autoRetryInterval = null;
let autoRetryCount = 0;
let _weatherCacheTime = 0;
const WEATHER_CACHE_TTL = 3600000; // 1 hour

function startAutoRetry() {
    stopAutoRetry();
    autoRetryCount = 0;
    autoRetryInterval = setInterval(() => {
        autoRetryCount++;
        if (autoRetryCount >= AUTO_RETRY_MAX) { stopAutoRetry(); return; }
        loadLocations();
    }, AUTO_RETRY_INTERVAL_MS);
}

function stopAutoRetry() {
    if (autoRetryInterval) { clearInterval(autoRetryInterval); autoRetryInterval = null; }
}

/** Fade out skeleton cards over 200ms, then hide the loader */
function fadeOutLoader(loader) {
    const skeletons = loader.querySelector('.skeleton-cards');
    if (skeletons) {
        skeletons.classList.add('is-hiding');
        setTimeout(() => loader.classList.add('hidden'), SKELETON_FADEOUT_MS);
    } else {
        loader.classList.add('hidden');
    }
}

// === IndexedDB Cache ===
function openLocationsCacheDb() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('indexedDB unavailable')); return; }
        const request = indexedDB.open(LOCATIONS_CACHE_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(LOCATIONS_CACHE_STORE)) db.createObjectStore(LOCATIONS_CACHE_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open cache DB'));
    });
}

async function readLocationsCache() {
    try {
        const db = await openLocationsCacheDb();
        const parsed = await new Promise((resolve, reject) => {
            const tx = db.transaction(LOCATIONS_CACHE_STORE, 'readonly');
            const store = tx.objectStore(LOCATIONS_CACHE_STORE);
            const request = store.get(LOCATIONS_CACHE_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('Failed to read cache'));
        });
        db.close();
        if (!parsed || !Array.isArray(parsed.items) || !parsed.savedAt) return null;
        if ((Date.now() - parsed.savedAt) > LOCATIONS_CACHE_TTL_MS) return null;
        return parsed;
    } catch (_) { return null; }
}

async function writeLocationsCache(items) {
    try {
        const cachedItems = Array.isArray(items) ? items.slice(0, CACHE_MAX_ITEMS) : [];
        const payload = { savedAt: Date.now(), count: Array.isArray(items) ? items.length : 0, partial: Array.isArray(items) && items.length > cachedItems.length, items: cachedItems };
        const db = await openLocationsCacheDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(LOCATIONS_CACHE_STORE, 'readwrite');
            const store = tx.objectStore(LOCATIONS_CACHE_STORE);
            const request = store.put(payload, LOCATIONS_CACHE_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error('Failed to write cache'));
        });
        db.close();
    } catch (_) { console.warn('[data:writeLocationsCache] Cache write failed:', _.message); }
}

// === Fetch helpers ===

/**
 * Fetch JSON from a URL with automatic retry and exponential backoff.
 * @param {string} url - The URL to fetch
 * @param {RequestInit} opts - Fetch options (headers, signal, etc.)
 * @param {number} [attempts=3] - Maximum number of attempts
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchJsonWithRetry(url, opts, attempts = DEFAULT_FETCH_RETRIES) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const resp = await fetch(url, opts);
            if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
            return await resp.json();
        } catch (err) {
            lastError = err;
            if (err?.name === 'AbortError') throw err;
            if (attempt === attempts) break;
            await new Promise(resolve => setTimeout(resolve, attempt * RETRY_BACKOFF_BASE_MS));
        }
    }
    throw lastError || new Error('Unknown fetch failure');
}

/**
 * Fetch all pages from a paginated Supabase REST endpoint.
 * @param {string} baseUrl - Base URL with query params (without limit/offset)
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the request
 * @returns {Promise<Array<Object>>} All rows concatenated across pages
 */
export async function fetchAllPages(baseUrl, signal) {
    const BATCH = FETCH_PAGE_SIZE;
    const headers = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };
    let all = [], offset = 0;
    while (true) {
        const url = `${baseUrl}&limit=${BATCH}&offset=${offset}`;
        const opts = { method: 'GET', headers };
        if (signal) opts.signal = signal;
        const batch = await fetchJsonWithRetry(url, opts);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < BATCH) break;
        offset += BATCH;
    }
    return all;
}

/**
 * Normalize a raw Supabase location row by ensuring all optional fields default to null.
 * @param {Object} row - Raw location row from Supabase
 * @returns {Object} Location row with all optional fields guaranteed present
 */
export function normalizeLocationRow(row) {
    return {
        ...row,
        price_band: row.price_band ?? null,
        time_of_day_fit: row.time_of_day_fit ?? null,
        rain_backup_quality: row.rain_backup_quality ?? null,
        shade_or_shelter: row.shade_or_shelter ?? null,
        parking_ease: row.parking_ease ?? null,
        buggy_friendliness: row.buggy_friendliness ?? null,
        toilet_confidence: row.toilet_confidence ?? null,
        noise_level: row.noise_level ?? null,
        food_fit: row.food_fit ?? null,
        play_corner_quality: row.play_corner_quality ?? null,
        crowd_pattern: row.crowd_pattern ?? null,
        verification_confidence: row.verification_confidence ?? null,
        verification_mode: row.verification_mode ?? null,
        seo_primary_locality: row.seo_primary_locality ?? null
    };
}

async function fetchLocationsLive(signal) {
    const baseFilters = [];
    if (state.activeTags.length === 1) baseFilters.push("&type=eq." + state.activeTags[0]);
    else if (state.activeTags.length > 1) baseFilters.push("&type=in.(" + state.activeTags.join(',') + ")");
    if (state.activeWeather) {
        if (state.activeWeather === "indoor") baseFilters.push("&weather=in.(indoor,hybrid,both)");
        else if (state.activeWeather === "outdoor") baseFilters.push("&weather=in.(outdoor,hybrid,both)");
        else baseFilters.push("&weather=eq." + state.activeWeather);
    }
    if (state.activeFacilities.coffee) baseFilters.push("&coffee=eq.true");
    if (state.activeFacilities.diaper) baseFilters.push("&diaper=eq.true");
    if (state.activeFacilities.alcohol) baseFilters.push("&alcohol=eq.true");
    if (state.activeFoodFit) baseFilters.push("&food_fit=eq." + state.activeFoodFit);
    if (state.activePriceBand) baseFilters.push("&price_band=eq." + state.activePriceBand);
    if (state.activePractical.parking) baseFilters.push("&parking_ease=eq.easy");
    if (state.activePractical.buggy) baseFilters.push("&buggy_friendliness=eq.easy");
    if (state.activeRegion) baseFilters.push("&region=eq." + encodeURIComponent(state.activeRegion));
    const suffix = `${baseFilters.join('')}&order=created_at.desc`;
    const fullUrl = `${SB_URL}?select=${FULL_LOCATION_SELECT}${suffix}`;
    try {
        const rows = await fetchAllPages(fullUrl, signal);
        return rows.map(normalizeLocationRow);
    } catch (fullError) {
        if (fullError?.name === 'AbortError') throw fullError;
        console.warn('Primary location payload failed, retrying with fallback fields', fullError);
        const fallbackUrl = `${SB_URL}?select=${FALLBACK_LOCATION_SELECT}${suffix}`;
        const rows = await fetchAllPages(fallbackUrl, signal);
        return rows.map(normalizeLocationRow);
    }
}

function applyActiveSort() {
    if (state.activeSort === 'peuterscore') state.allLocations.sort((a,b) => computePeuterScore(b) - computePeuterScore(a));
    else if (state.activeSort === 'az') state.allLocations.sort((a,b) => (a.name||'').localeCompare(b.name||'', 'nl'));
}

/**
 * Set the active sort mode, re-sort locations, and re-render cards and sheet list.
 * @param {string} val - Sort mode ('default', 'peuterscore', or 'az')
 * @returns {void}
 */
export function applySort(val) {
    state.activeSort = val;
    applyActiveSort();
    bus.emit('cards:render', state.allLocations, state.lastTravelTimes);
    bus.emit('sheet:renderlist', state.allLocations, state.lastTravelTimes);
}

/**
 * Update the results count label in the DOM (e.g. "42 locaties").
 * @param {number} count - Number of visible locations
 * @returns {void}
 */
export function updateResultsCount(count) {
    const el = document.getElementById('results-count');
    if (el) el.textContent = count + ' locatie' + (count !== 1 ? 's' : '');
}

/**
 * Return the count of locations that match current filters without rendering.
 * Uses a lightweight fetch + client-side filter to show live count in filter modal.
 * @returns {Promise<number>}
 */
export async function getFilteredCount() {
    try {
        const locations = await fetchLocationsLive();
        let filtered = locations;
        if (state.activeFavorites) {
            const favorites = getFavorites();
            filtered = filtered.filter(item => favorites.includes(item.id));
        }
        if (state.activeAgeGroup === 'dreumes') {
            filtered = filtered.filter(loc => loc.min_age === null || loc.min_age <= 2);
        } else if (state.activeAgeGroup === 'peuter') {
            filtered = filtered.filter(loc =>
                (loc.min_age === null || loc.min_age <= 5) && (loc.max_age === null || loc.max_age >= 2));
        }
        filtered = filtered.filter(loc => matchesPreset(loc));
        return filtered.length;
    } catch (e) {
        return state.allLocations.length;
    }
}

/**
 * Fetch, filter, sort, and render all locations based on current state filters.
 * @returns {Promise<void>}
 */
export async function loadLocations() {
    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const fetchTimeout = setTimeout(() => currentAbort.abort(), FETCH_TIMEOUT_MS);
    const container = document.getElementById('results-container'), loader = document.getElementById('loader'), error = document.getElementById('error');
    if (state.currentDisplayMode !== 'map') { if (container) container.innerHTML = ''; if (loader) loader.classList.remove('hidden'); }
    if (error) error.classList.add('hidden');
    try {
        let fetchedLocations;
        let usingCachedData = false;
        try {
            fetchedLocations = await fetchLocationsLive(currentAbort.signal);
            await writeLocationsCache(fetchedLocations);
        } catch (fetchError) {
            if (fetchError?.name === 'AbortError') throw fetchError;
            try {
                await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY_MS));
                fetchedLocations = await fetchLocationsLive(currentAbort.signal);
                await writeLocationsCache(fetchedLocations);
            } catch (retryError) {
                if (retryError?.name === 'AbortError') throw retryError;
                const cached = await readLocationsCache();
                if (!cached) throw retryError;
                usingCachedData = true;
                fetchedLocations = cached.items;
                const cacheDate = new Date(cached.savedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                error.classList.remove('hidden');
                error.innerHTML = `<div class="error-state"><svg viewBox="0 0 24 24"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg><strong>Even geen verbinding</strong><p>Je ziet nu opgeslagen gegevens van ${cacheDate}. Zodra de verbinding terug is, laden we de nieuwste locaties.</p><button onclick="loadLocations()">Opnieuw proberen</button></div>`;
                startAutoRetry();
            }
        }
        state.allLocations = fetchedLocations;

        if (state.activeFavorites) {
            const favorites = getFavorites();
            state.allLocations = state.allLocations.filter(item => favorites.includes(item.id));
        }
        if (state.sharedShortlistIds.length) {
            state.allLocations = state.allLocations.filter(item => state.sharedShortlistIds.includes(item.id));
        }

        if (state.activeAgeGroup === 'dreumes') {
            state.allLocations = state.allLocations.filter(loc => loc.min_age === null || loc.min_age <= 2);
        } else if (state.activeAgeGroup === 'peuter') {
            state.allLocations = state.allLocations.filter(loc =>
                (loc.min_age === null || loc.min_age <= 5) && (loc.max_age === null || loc.max_age >= 2));
        }

        state.allLocations = state.allLocations.filter((loc) => matchesPreset(loc));

        if (state.allLocations.length === 0) {
            loader.classList.add('hidden');
            if (state.activeFavorites) {
                container.innerHTML = '<div class="favorites-empty"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><strong>Nog geen favorieten</strong><p>Tik op het hartje bij een locatie om \u2019m hier te bewaren. Zo houd je de leukste plekken bij de hand.</p><button class="fav-empty-cta" onclick="document.querySelector(\'.sheet-tab[data-tab=ontdek], .chip\')?.click();if(typeof switchView===\'function\')switchView(\'home\')">Ontdek locaties</button></div>';
            } else {
                const suggestions = [];
                if (state.activePreset) suggestions.push('Probeer een andere situatie');
                if (state.activeWeather) suggestions.push('Verwijder het weer-filter');
                if (state.activeTags.length > 0) suggestions.push('Kies een ander type');
                if (!state.userLocation) suggestions.push('Vul een stad in voor resultaten bij jou in de buurt');
                const suggestHTML = suggestions.length ? '<ul style="text-align:left;margin:12px auto;max-width:280px;padding-left:20px;">' + suggestions.map(s => '<li>' + s + '</li>').join('') + '</ul>' : '';
                container.innerHTML = '<div class="no-results"><strong>Geen locaties gevonden</strong>' + suggestHTML + '<button class="gps-onboarding-btn" onclick="resetAllFilters()" style="margin-top:12px;">Alle filters wissen</button></div>';
            }
            bus.emit('map:update', []); bus.emit('sheet:renderlist', [], {}); updateResultsCount(0); return;
        }

        if (state.userLocation) {
            const travelTimes = calculateTravelTimes(state.userLocation, state.allLocations);
            state.allLocations = state.allLocations.filter((loc) => matchesPresetDistance(loc, travelTimes[loc.id]));
            state.lastTravelTimes = travelTimes;
            state.allLocations.sort((a, b) => (travelTimes[a.id]?.durationValue || 999999) - (travelTimes[b.id]?.durationValue || 999999));
            if (state.activeRadius) {
                state.allLocations = state.allLocations.filter(loc => {
                    const t = travelTimes[loc.id];
                    return t ? t.distanceKm <= state.activeRadius : false;
                });
            }
            applyActiveSort();
            fadeOutLoader(loader);
            bus.emit('cards:render', state.allLocations, travelTimes);
            bus.emit('sheet:renderlist', state.allLocations, travelTimes);
            bus.emit('sheet:updatemeta');
            bus.emit('map:update', state.allLocations); updateResultsCount(state.allLocations.length);
        } else {
            state.lastTravelTimes = {};
            state.allLocations.sort((a, b) => (a.distance_from_city_center_km || 999) - (b.distance_from_city_center_km || 999));
            applyActiveSort();
            fadeOutLoader(loader);
            bus.emit('cards:render', state.allLocations, {});
            bus.emit('sheet:renderlist', state.allLocations, {});
            bus.emit('sheet:updatemeta');
            bus.emit('map:update', state.allLocations); updateResultsCount(state.allLocations.length);
        }
        if (!usingCachedData) { error.classList.add('hidden'); stopAutoRetry(); }
        bus.emit('data:loaded', state.allLocations.length);
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Error:', e); loader.classList.add('hidden'); error.classList.remove('hidden');
        error.innerHTML = '<div class="error-state"><svg viewBox="0 0 24 24"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg><strong>Kon locaties niet laden</strong><p>Controleer je internetverbinding en probeer het opnieuw.</p><button onclick="loadLocations()">Opnieuw proberen</button></div>';
        startAutoRetry();
    } finally { clearTimeout(fetchTimeout); }
}

// === Weather Banner ===

/**
 * Fetch current weather from Open-Meteo and render the weather banner in the DOM.
 * @returns {Promise<void>}
 */
export async function checkWeather() {
    if (Date.now() - _weatherCacheTime < WEATHER_CACHE_TTL) return;
    try {
        const lat = state.userLocation ? state.userLocation.lat : FALLBACK_LAT;
        const lng = state.userLocation ? state.userLocation.lng : FALLBACK_LNG;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code,temperature_2m`);
        if (!res.ok) return;
        const data = await res.json();
        const code = data.current.weather_code;
        const temp = Math.round(data.current.temperature_2m);
        const banner = document.getElementById('weather-banner');
        const OUTDOOR_SAFE = new Set([0,1,2,3]);
        const RAIN_CODES = new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,83,84,85,86,95,96,99]);
        state.currentWeatherCode = code;
        state.currentTemp = temp;
        state.isRaining = RAIN_CODES.has(code);
        state.isSunny = OUTDOOR_SAFE.has(code) && temp >= 10;
        _weatherCacheTime = Date.now();

        if (RAIN_CODES.has(code)) {
            banner.innerHTML = `<div class="weather-banner indoor" onclick="toggleWeather('indoor', null);">
                <span class="weather-banner-icon">🌧️</span>
                <span class="weather-banner-text"><strong>${temp}° en regen</strong> — tip: kies een <strong>binnenlocatie</strong></span>
                <span class="weather-banner-arrow">›</span>
            </div>`;
        } else if (OUTDOOR_SAFE.has(code) && temp >= 10) {
            banner.innerHTML = `<div class="weather-banner outdoor" onclick="toggleWeather('outdoor', null);">
                <span class="weather-banner-icon">☀️</span>
                <span class="weather-banner-text"><strong>${temp}° en zonnig</strong> — <strong>buitenlocaties</strong> zijn extra fijn vandaag</span>
                <span class="weather-banner-arrow">›</span>
            </div>`;
        } else {
            banner.innerHTML = `<div class="weather-banner neutral">
                <span class="weather-banner-icon">🌥️</span>
                <span class="weather-banner-text"><strong>${temp}° en wisselvallig</strong> — binnen én buiten opties beschikbaar</span>
                <span class="weather-banner-arrow">›</span>
            </div>`;
        }
    } catch(e) { console.warn('[data:checkWeather] Weather fetch failed:', e.message); }
}

// === Location search ===

/**
 * Initialize Google Maps Places Autocomplete on the location input field.
 * @returns {Promise<void>}
 */
export async function initAutocomplete() {
    try { await loadGoogleMaps(state); } catch(e) { console.warn('Google Maps unavailable:', e); bus.emit('gps:status', 'Google Maps niet beschikbaar', 'error'); return; }
    const input = document.getElementById('location-input');
    state.autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode'], componentRestrictions: { country: 'nl' }, fields: ['geometry', 'formatted_address', 'name']
    });
    state.autocomplete.addListener('place_changed', () => {
        const place = state.autocomplete.getPlace();
        if (place.geometry) {
            state.userLocation = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), name: place.formatted_address || place.name };
            try { localStorage.setItem('pp-last-city', state.userLocation.name); } catch(e) { console.warn('[data:initAutocomplete] localStorage save city failed:', e.message); }
            const popularElAc = document.getElementById('popular-cities');
            if (popularElAc) popularElAc.classList.add('hidden');
            document.getElementById('app-container')?.classList.add('has-location');
            document.getElementById('gps-btn')?.classList.remove('gps-active');
            bus.emit('plan:chipupdate');
            trackEvent('search', { query_type: 'places' });
            loadLocations(); bus.emit('map:userlocation');
        }
    });
}

/**
 * Request the user's GPS position via centralized geolocation module, then reload locations.
 * @returns {Promise<void>}
 */
export async function getCurrentLocation() {
    const loc = await requestLocation();
    if (loc) {
        loadLocations();
    }
}

/**
 * Display a GPS status message (loading, error, active) in the status element.
 * @param {string} message - Status text to display
 * @param {string} type - CSS class suffix ('loading', 'error', 'active', or '')
 * @returns {void}
 */
export function showGpsStatus(message, type) {
    const el = document.getElementById('gps-status');
    el.textContent = message;
    el.className = 'gps-status ' + type;
}

/**
 * Geocode the text in the location input field and reload locations for that position.
 * @returns {Promise<void>}
 */
export async function updateLocation() {
    const input = document.getElementById('location-input').value.trim(); if (!input) return;
    resetLocationState();
    try { await loadGoogleMaps(state); } catch(e) { showGpsStatus('Google Maps niet beschikbaar', 'error'); return; }
    const geocoder = new google.maps.Geocoder();
    try {
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: input + ', Nederland' }, (results, status) => {
                if (status === 'OK' && results[0]) resolve(results[0]); else reject(status);
            });
        });
        state.userLocation = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng(), name: input };
        try { localStorage.setItem('pp-last-city', input); } catch(e) { console.warn('[data:geocodeAndSet] localStorage save city failed:', e.message); }
        const popularEl = document.getElementById('popular-cities');
        if (popularEl) popularEl.classList.add('hidden');
        showGpsStatus(`Zoeken bij ${input}...`, 'active');
        document.getElementById('app-container')?.classList.add('has-location');
        document.getElementById('gps-btn')?.classList.remove('gps-active');
        bus.emit('plan:chipupdate');
        loadLocations(); bus.emit('map:userlocation');
    } catch (err) { showGpsStatus('Locatie niet gevonden', 'error'); }
}

/**
 * Set a city by name, geocode it, save to preferences, and reload locations.
 * @param {string} cityName - Dutch city name to geocode (e.g. 'Amsterdam')
 * @returns {Promise<void>}
 */
export async function setCity(cityName) {
    const input = document.getElementById('location-input');
    if (input) input.value = cityName;
    resetLocationState();
    const popularEl = document.getElementById('popular-cities');
    if (popularEl) popularEl.classList.add('hidden');
    try { await loadGoogleMaps(state); } catch(e) { showGpsStatus('Google Maps niet beschikbaar', 'error'); return; }
    const geocoder = new google.maps.Geocoder();
    try {
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: cityName + ', Nederland' }, (results, status) => {
                if (status === 'OK' && results[0]) resolve(results[0]); else reject(status);
            });
        });
        state.userLocation = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng(), name: cityName };
        // Persist city AFTER geocoding succeeds
        try { localStorage.setItem('pp-last-city', cityName); } catch(e) { console.warn('[data:setCity] localStorage save city failed:', e.message); }
        setPrefs({ city: cityName });
        showGpsStatus(`Zoeken bij ${cityName}...`, 'active');
        document.getElementById('app-container')?.classList.add('has-location');
        document.getElementById('gps-btn')?.classList.remove('gps-active');
        bus.emit('plan:chipupdate');
        loadLocations(); bus.emit('map:userlocation');
    } catch (err) { showGpsStatus('Locatie niet gevonden', 'error'); }
}

/**
 * Copy the map filter overlay's location input to the main input and trigger a location update.
 * @returns {void}
 */
export function updateLocationFromMap() {
    const mapInput = document.getElementById('map-location-input');
    const mainInput = document.getElementById('location-input');
    if (mapInput && mainInput) mainInput.value = mapInput.value;
    updateLocation();
    bus.emit('filters:closemap');
}

// Bus listeners
bus.on('data:reload', () => loadLocations());
bus.on('gps:status', showGpsStatus);
