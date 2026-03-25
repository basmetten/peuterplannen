import { state } from './state.js';
import { trackEvent, ppToast, buildDetailUrl } from './utils.js';
import bus from './bus.js';

let _toggleInProgress = false;

/**
 * Read the list of favorited location ids from localStorage.
 * @returns {number[]} Array of favorited location ids
 */
export function getFavorites() {
    try { return JSON.parse(localStorage.getItem('peuterplannen_favorites') || '[]'); } catch { return []; }
}

/**
 * Check whether a location id is in the favorites list.
 * @param {number} id - Location id to check
 * @returns {boolean} True if the location is favorited
 */
export function isFavorite(id) { return getFavorites().includes(id); }

/**
 * Update the favorites badge count in the navigation tab.
 * @returns {void}
 */
export function updateFavBadge() {
    const badge = document.getElementById('fav-badge');
    if (!badge) return;
    const count = getFavorites().length;
    if (count === 0) { badge.hidden = true; badge.textContent = ''; }
    else { badge.hidden = false; badge.textContent = count > 99 ? '99+' : count; }
}

/**
 * Add or remove a location from favorites, update UI, and show a toast notification.
 * @param {number} locationId - Location id to toggle
 * @param {HTMLElement} [btn] - Optional heart button element to animate
 * @returns {void}
 */
export function toggleFavorite(locationId, btn) {
    if (_toggleInProgress) return;
    _toggleInProgress = true;
    try {
        const favorites = getFavorites();
        const index = favorites.indexOf(locationId);
        const action = index > -1 ? 'remove' : 'add';
        if (index > -1) favorites.splice(index, 1); else favorites.push(locationId);
        trackEvent('favorite_toggle', { action: action });
        try { localStorage.setItem('peuterplannen_favorites', JSON.stringify(favorites)); } catch(e) { console.warn('[favorites:toggleFavorite] localStorage save failed:', e.message); }
        updateShortlistBar();
        updateFavBadge();
        if (btn) {
            btn.classList.add('heart-pop');
            btn.addEventListener('animationend', () => btn.classList.remove('heart-pop'), { once: true });
        }
        ppToast(action === 'add' ? 'Opgeslagen in favorieten' : 'Verwijderd uit favorieten', 'success', 2000);
        if (state.activeFavorites) {
            const filtered = state.allLocations.filter(item => getFavorites().includes(item.id));
            bus.emit('cards:render', filtered, {});
        } else {
            if (btn) {
                const isFav = getFavorites().includes(locationId);
                const svg = btn.querySelector('svg');
                if (svg) svg.style.cssText = isFav ? 'fill: #D4775A; stroke: #D4775A;' : 'fill: none; stroke: #9B8688;';
                btn.title = isFav ? 'Verwijder favoriet' : 'Opslaan';
                btn.setAttribute('aria-label', isFav ? 'Verwijder favoriet' : 'Opslaan als favoriet');
            }
        }
    } finally {
        _toggleInProgress = false;
    }
}

// === Shortlist ===

/**
 * Get the active shortlist ids (shared shortlist takes priority over local favorites).
 * @returns {number[]} Array of location ids in the current shortlist
 */
export function getShortlistIds() {
    return state.sharedShortlistIds.length > 0 ? [...state.sharedShortlistIds] : getFavorites();
}

/**
 * Update the shortlist bar UI with the current shortlist count and description.
 * @returns {void}
 */
export function updateShortlistBar() {
    const bar = document.getElementById('shortlist-bar');
    const title = document.getElementById('shortlist-title');
    const subtitle = document.getElementById('shortlist-subtitle');
    const ids = getShortlistIds();
    const usingShared = state.sharedShortlistIds.length > 0;

    if (!bar || !title || !subtitle) return;
    if (ids.length === 0) { bar.style.display = 'none'; return; }

    bar.style.display = 'flex';
    title.textContent = usingShared ? `Gedeelde shortlist (${ids.length})` : `Je shortlist (${ids.length})`;
    subtitle.textContent = usingShared
        ? 'Deze link toont een gedeelde selectie locaties. Sla hem op of gebruik hem als startpunt voor vandaag.'
        : 'Bewaar interessante plekken zonder account en deel ze later als compacte selectie.';
}

/**
 * Build a shareable URL containing the given location ids as query params.
 * @param {number[]} [ids] - Location ids to include (defaults to current shortlist)
 * @returns {string} Full URL with ids query parameter
 */
export function buildShortlistUrl(ids) {
    const shortlistIds = (ids || getShortlistIds()).filter((value) => Number.isInteger(value) && value > 0);
    const url = new URL('/app.html', window.location.origin);
    if (shortlistIds.length > 0) url.searchParams.set('ids', shortlistIds.join(','));
    return url.toString();
}

/**
 * Share the current shortlist via Web Share API, clipboard, or WhatsApp fallback.
 * @returns {Promise<void>}
 */
export async function shareShortlist() {
    const ids = getShortlistIds();
    if (!ids.length) return;
    const url = buildShortlistUrl(ids);
    const title = state.sharedShortlistIds.length > 0 ? 'Gedeelde shortlist van PeuterPlannen' : 'Mijn shortlist op PeuterPlannen';
    const text = state.sharedShortlistIds.length > 0
        ? 'Hier is een compacte selectie peuteruitjes op PeuterPlannen.'
        : 'Hier is mijn shortlist met peuteruitjes op PeuterPlannen.';
    try {
        if (navigator.share) { await navigator.share({ title, text, url }); return; }
        await navigator.clipboard.writeText(url);
        bus.emit('gps:status', 'Shortlistlink gekopieerd', '');
    } catch (error) {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
    }
}

/**
 * Navigate to the shortlist view (shared shortlist reloads data, local switches to favorites tab).
 * @returns {void}
 */
export function showShortlist() {
    if (state.sharedShortlistIds.length > 0) {
        bus.emit('data:reload');
        return;
    }
    window.toggleTag('favorites');
}

/**
 * Clear all favorites from localStorage (or clear shared shortlist if active) and reload.
 * @returns {void}
 */
export function clearShortlist() {
    if (state.sharedShortlistIds.length > 0) { clearSharedShortlist(); return; }
    try { localStorage.removeItem('peuterplannen_favorites'); } catch (error) { console.warn('[favorites:clearShortlist] localStorage remove failed:', error.message); }
    if (state.activeFavorites) { state.activeFavorites = false; state.activeTags = []; }
    updateShortlistBar();
    bus.emit('filters:countupdate');
    bus.emit('data:reload');
}

/**
 * Clear the shared shortlist from state and URL, then reload locations.
 * @returns {void}
 */
export function clearSharedShortlist() {
    state.sharedShortlistIds = [];
    const url = new URL(window.location.href);
    url.searchParams.delete('ids');
    window.history.replaceState({}, '', url.toString());
    document.getElementById('clear-shared-shortlist').style.display = 'none';
    updateShortlistBar();
    bus.emit('filters:countupdate');
    bus.emit('data:reload');
}

/**
 * Toggle a favorite from the detail sheet and refresh the sheet if it's still open.
 * @param {number} locationId - Location id to toggle
 * @param {HTMLElement} [btn] - Optional heart button element to animate
 * @returns {void}
 */
export function toggleFavoriteFromSheet(locationId, btn) {
    toggleFavorite(locationId, btn);
    if (state.activeLocSheet === locationId) {
        bus.emit('sheet:open', locationId);
    }
}

/**
 * Share a single location via Web Share API or WhatsApp fallback.
 * @param {Object|string} itemOrName - Location object or location name string
 * @param {string} [region=''] - Region name appended to Google Maps fallback query
 * @returns {void}
 */
export function shareLocation(itemOrName, region = '') {
    const item = typeof itemOrName === 'object' ? itemOrName : null;
    const name = item ? item.name : itemOrName;
    const detailUrl = item ? buildDetailUrl(item) : null;
    const shortlistUrl = item ? buildShortlistUrl([item.id]) : '';
    const url = detailUrl ? `${window.location.origin}${detailUrl}` : (shortlistUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + (region ? ", " + region : ""))}`);
    const text = `Bekijk ${name} op PeuterPlannen: ${url}`;
    trackEvent('share', { method: navigator.share ? 'native' : 'whatsapp' });
    if (navigator.share) { navigator.share({ title: name, text: text, url: url }); }
    else { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); }
}

// Bus listeners
bus.on('location:share', shareLocation);
