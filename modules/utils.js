import { SB_KEY, SB_EVENTS_URL } from './state.js';

// === Security Helpers ===
export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function safeUrl(url) {
    if (!url || url === '-') return null;
    try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) ? url : null; }
    catch { return null; }
}

export function cleanToddlerHighlight(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/[•·]+/g, ' · ')
        .replace(/\s*[|/]\s*/g, ' · ')
        .replace(/\s*-\s*/g, ' · ')
        .replace(/\b(ideaal|perfect|superleuk|aanrader)\b/gi, '')
        .replace(/\s+([.,!?;:])/g, '$1')
        .replace(/(?:\s*·\s*){2,}/g, ' · ')
        .replace(/^\s*·\s*|\s*·\s*$/g, '')
        .trim();
}

export function comparableText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isNearDuplicateCopy(a, b) {
    const aa = comparableText(a);
    const bb = comparableText(b);
    if (!aa || !bb) return false;
    if (aa === bb) return true;
    if (aa.length > 28 && bb.includes(aa)) return true;
    if (bb.length > 28 && aa.includes(bb)) return true;
    const aWords = aa.split(' ').filter(Boolean);
    const bWords = bb.split(' ').filter(Boolean);
    const overlap = aWords.filter((word) => bWords.includes(word)).length;
    const threshold = Math.min(aWords.length, bWords.length) * 0.72;
    return overlap >= threshold;
}

export function getCardSupportingCopy(item) {
    const description = String(item.description || '').trim();
    const highlight = cleanToddlerHighlight(item.toddler_highlight || '');
    if (description && highlight && isNearDuplicateCopy(description, highlight)) {
        return highlight.length < description.length ? highlight : description;
    }
    if (highlight && highlight.length <= 120) return highlight;
    return description || highlight || '';
}

// === Distance ===
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function calculateTravelTimes(userLocation, destinations) {
    if (!userLocation || destinations.length === 0) return {};
    const results = {};
    destinations.forEach(dest => {
        if (dest.lat && dest.lng) {
            const dist = calculateDistance(userLocation.lat, userLocation.lng, dest.lat, dest.lng);
            const mins = Math.round(dist * 1.3);
            results[dest.id] = { duration: mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}u ${mins%60}m`, durationValue: mins * 60, distance: dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)} km`, distanceKm: dist };
        }
    });
    return results;
}

export function slugify(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// === Toast ===
export function ppToast(msg, type, duration) {
    type = type || 'default'; duration = duration || 2000;
    let zone = document.querySelector('.pp-toast-zone');
    if (!zone) { zone = document.createElement('div'); zone.className = 'pp-toast-zone'; zone.setAttribute('aria-live', 'polite'); document.body.append(zone); }
    const t = document.createElement('div'); t.className = 'pp-toast pp-toast-' + type; t.textContent = msg; t.setAttribute('role', 'status'); zone.append(t);
    setTimeout(function() { t.classList.add('is-hiding'); t.addEventListener('transitionend', function() { t.remove(); }, { once: true }); setTimeout(function() { t.remove(); }, 400); }, duration);
}

// === Tracking ===
export function trackEvent(type, data) {
    try {
        fetch(SB_EVENTS_URL, {
            method: 'POST',
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ event_type: type, event_data: data || {}, page_path: location.pathname }),
            keepalive: true
        });
    } catch(e) {}
}

// === URL helpers ===
export function buildDetailUrl(item) {
    if (!item.region) return null;
    const s = (t) => t.toLowerCase()
        .replace(/['']/g, '')
        .replace(/\s+/g, '-')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return `/${s(item.region)}/${s(item.name)}/`;
}

export function buildMapsUrl(item) {
    if (item.place_id) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}&query_place_id=${item.place_id}`;
    if (item.lat && item.lng) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ", " + (item.region || ""))}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`;
}

// === Google Maps Lazy Loading ===
export function loadGoogleMaps(state) {
    if (state.mapsLoaded) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) { state.mapsLoaded = true; resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4&libraries=places,geometry&callback=onMapsLoaded';
        script.async = true;
        script.defer = true;
        script.onerror = reject;
        window.onMapsLoaded = () => { state.mapsLoaded = true; resolve(); };
        document.head.appendChild(script);
    });
}
