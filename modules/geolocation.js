/**
 * Centralized geolocation state machine.
 * All GPS entry points (search button, map button, plan auto-detect) delegate here.
 *
 * States: idle → requesting → active | denied | timeout | error
 */
import { state } from './state.js';
import { loadGoogleMaps, trackEvent } from './utils.js';
import bus from './bus.js';

// --- Constants ---
const TIMEOUT_MS = 10000;
const MAX_AGE_MS = 60000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const SESSION_KEY = 'pp-geo-denied';

// --- State ---
let geoState = 'idle';
let retryCount = 0;

/** Get current geolocation state */
export function getLocationState() { return geoState; }

/** Detect browser for permission-fix guidance */
function getBrowserGuidance() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
        return 'Ga naar Instellingen \u2192 Safari \u2192 Locatie en sta deze website toe.';
    }
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
        return 'Ga naar Safari \u2192 Instellingen \u2192 Websites \u2192 Locatie en sta deze website toe.';
    }
    return 'Klik op het slotje naast de URL \u2192 Locatie \u2192 Toestaan. Herlaad daarna de pagina.';
}

/** Transition state and update all UI */
function setState(newState, data = {}) {
    geoState = newState;
    bus.emit('geo:statechange', newState, data);
    updateStatusUI(newState, data);
    updateButtonStates(newState);
}

/** Update the #gps-status element for current state */
function updateStatusUI(s, data) {
    const el = document.getElementById('gps-status');
    if (!el) return;

    el.classList.remove('hidden');
    el.className = 'gps-status';

    switch (s) {
        case 'idle':
            el.classList.add('hidden');
            el.textContent = '';
            break;
        case 'requesting':
            el.textContent = 'Locatie ophalen\u2026';
            el.classList.add('loading');
            break;
        case 'active':
            el.innerHTML = '<span>\uD83D\uDCCD ' + (data.name || 'Mijn locatie') + '</span> <button class="gps-status-link" onclick="document.getElementById(\'location-input\')?.focus()">wijzig</button>';
            break;
        case 'denied': {
            const guidance = getBrowserGuidance();
            el.classList.add('denied');
            el.innerHTML = '<span class="gps-status-msg">\u26A0\uFE0F Locatietoegang geblokkeerd</span>'
                + '<button class="gps-status-link" onclick="document.getElementById(\'location-input\')?.focus()">Typ je stad</button>'
                + '<details class="gps-guidance"><summary>Hoe fix ik dit?</summary><p>' + guidance + '</p></details>';
            bus.emit('gps:error', { type: 'denied', message: 'Locatietoegang geblokkeerd' });
            break;
        }
        case 'timeout':
            el.classList.add('error');
            el.innerHTML = '<span class="gps-status-msg">\u26A0\uFE0F Locatie ophalen duurde te lang</span>'
                + '<button class="gps-status-link" onclick="window._geoRetry?.()">Probeer opnieuw</button>'
                + '<button class="gps-status-link secondary" onclick="document.getElementById(\'location-input\')?.focus()">Typ je stad</button>';
            bus.emit('gps:error', { type: 'timeout', message: 'Locatie ophalen duurde te lang' });
            break;
        case 'error':
            el.classList.add('error');
            el.innerHTML = '<span class="gps-status-msg">\u26A0\uFE0F Locatie niet beschikbaar</span>'
                + '<button class="gps-status-link" onclick="window._geoRetry?.()">Probeer opnieuw</button>'
                + '<button class="gps-status-link secondary" onclick="document.getElementById(\'location-input\')?.focus()">Typ je stad</button>';
            bus.emit('gps:error', { type: 'error', message: 'Locatie niet beschikbaar' });
            break;
    }
}

/** Sync gps-loading / gps-active classes on both GPS buttons */
function updateButtonStates(s) {
    const btns = [document.getElementById('gps-btn'), document.getElementById('map-gps-btn')];
    btns.forEach(btn => {
        if (!btn) return;
        btn.classList.remove('gps-loading', 'gps-active');
        if (s === 'requesting') btn.classList.add('gps-loading');
        if (s === 'active') btn.classList.add('gps-active');
    });
}

/** Reverse-geocode coords → Dutch city name */
async function reverseGeocode(lat, lng) {
    try {
        await loadGoogleMaps(state);
        const geocoder = new google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) resolve(results[0]);
                else reject(new Error(status));
            });
        });
        const locality = result.address_components?.find(c =>
            c.types.includes('locality') || c.types.includes('sublocality')
        );
        return locality ? locality.long_name : result.formatted_address;
    } catch {
        return null;
    }
}

/**
 * Request the user's GPS location. Returns coords or null.
 * @param {Object} [opts]
 * @param {boolean} [opts.lowAccuracy] - Faster but less precise (for plan generation)
 * @param {number} [opts.timeout] - Custom timeout in ms
 * @param {number} [opts.maxAge] - Custom maximumAge in ms
 * @returns {Promise<{lat:number, lng:number, name:string}|null>}
 */
export async function requestLocation(opts = {}) {
    const { lowAccuracy = false, timeout, maxAge } = opts;

    // Already active — reuse
    if (geoState === 'active' && state.userLocation) return state.userLocation;

    // Secure context check
    if (typeof window !== 'undefined' && !window.isSecureContext
        && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        setState('error', { message: 'HTTPS vereist' });
        return null;
    }

    // API check
    if (!navigator.geolocation) {
        setState('error', { message: 'GPS niet beschikbaar' });
        return null;
    }

    // Previously denied — check if user has since granted permission
    // On iOS Safari, the Permissions API is not supported for geolocation,
    // so we cannot reliably detect permission changes. Instead of blocking
    // with a session-long poison pill, we use a short TTL (60s) so users
    // who fix their settings in iOS can retry within a minute.
    try {
        const deniedAt = sessionStorage.getItem(SESSION_KEY);
        if (deniedAt && (Date.now() - Number(deniedAt)) < 60000) {
            setState('denied');
            return null;
        }
        // Expired or invalid — clear and retry against the OS
        if (deniedAt) sessionStorage.removeItem(SESSION_KEY);
    } catch { /* sessionStorage unavailable */ }

    setState('requesting');
    retryCount = 0;

    const posOpts = {
        enableHighAccuracy: !lowAccuracy,
        timeout: timeout || (lowAccuracy ? 6000 : TIMEOUT_MS),
        maximumAge: maxAge || (lowAccuracy ? 300000 : MAX_AGE_MS),
    };

    return new Promise(resolve => {
        function attempt() {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    state.userLocation = { lat, lng, name: 'Mijn locatie' };

                    // Reverse geocode for city name (non-blocking for UI)
                    const cityName = await reverseGeocode(lat, lng);
                    if (cityName) {
                        state.userLocation.name = cityName;
                        const input = document.getElementById('location-input');
                        if (input) input.value = cityName;
                        try { localStorage.setItem('pp-last-city', cityName); } catch {}
                    }

                    // Activate
                    setState('active', { name: state.userLocation.name });
                    document.getElementById('app-container')?.classList.add('has-location');

                    // Hide onboarding + popular cities
                    const onboarding = document.getElementById('gps-onboarding');
                    if (onboarding) onboarding.hidden = true;
                    const popular = document.getElementById('popular-cities');
                    if (popular) popular.classList.add('hidden');

                    // Notify other modules
                    bus.emit('plan:chipupdate');
                    bus.emit('map:userlocation');
                    trackEvent('search', { query_type: 'gps' });

                    resolve(state.userLocation);
                },
                (err) => {
                    // Permission denied — remember with TTL
                    if (err.code === 1) {
                        try { sessionStorage.setItem(SESSION_KEY, String(Date.now())); } catch {}
                        setState('denied');
                        resolve(null);
                        return;
                    }

                    // Retry for timeout/unavailable
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        console.warn('[geolocation] Retry ' + retryCount + '/' + MAX_RETRIES + ' (error code ' + err.code + ')');
                        setTimeout(attempt, RETRY_DELAY_MS * retryCount);
                        return;
                    }

                    // Final failure
                    setState(err.code === 3 ? 'timeout' : 'error');
                    resolve(null);
                },
                posOpts
            );
        }
        attempt();
    });
}

/** Reset geolocation state (called when user manually sets a city) */
export function resetLocationState() {
    geoState = 'idle';
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    updateStatusUI('idle', {});
}

/** Initialize module — expose retry handler */
export function initGeolocation() {
    window._geoRetry = () => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
        return requestLocation();
    };
}
