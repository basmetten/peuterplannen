import { state } from './state.js';
import { trackEvent, ppToast, buildDetailUrl } from './utils.js';
import bus from './bus.js';

export function getFavorites() {
    try { return JSON.parse(localStorage.getItem('peuterplannen_favorites') || '[]'); } catch { return []; }
}

export function isFavorite(id) { return getFavorites().includes(id); }

export function updateFavBadge() {
    const badge = document.getElementById('fav-badge');
    if (!badge) return;
    const count = getFavorites().length;
    if (count === 0) { badge.hidden = true; badge.textContent = ''; }
    else { badge.hidden = false; badge.textContent = count > 99 ? '99+' : count; }
}

export function toggleFavorite(locationId, btn) {
    const favorites = getFavorites();
    const index = favorites.indexOf(locationId);
    const action = index > -1 ? 'remove' : 'add';
    if (index > -1) favorites.splice(index, 1); else favorites.push(locationId);
    trackEvent('favorite_toggle', { action: action });
    try { localStorage.setItem('peuterplannen_favorites', JSON.stringify(favorites)); } catch(e) { console.warn('[favorites:toggleFavorite] localStorage save failed:', e.message); }
    updateShortlistBar();
    updateFavBadge();
    if (btn) { btn.classList.add('heart-pop'); setTimeout(() => btn.classList.remove('heart-pop'), 400); }
    ppToast(action === 'add' ? 'Opgeslagen in favorieten' : 'Verwijderd uit favorieten', 'success', 2000);
    if (state.activeTag === 'favorites') {
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
}

// === Shortlist ===
export function getShortlistIds() {
    return state.sharedShortlistIds.length > 0 ? [...state.sharedShortlistIds] : getFavorites();
}

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

export function buildShortlistUrl(ids) {
    const shortlistIds = (ids || getShortlistIds()).filter((value) => Number.isInteger(value) && value > 0);
    const url = new URL('/app.html', window.location.origin);
    if (shortlistIds.length > 0) url.searchParams.set('ids', shortlistIds.join(','));
    return url.toString();
}

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

export function showShortlist() {
    if (state.sharedShortlistIds.length > 0) {
        bus.emit('data:reload');
        return;
    }
    window.toggleTag('favorites');
}

export function clearShortlist() {
    if (state.sharedShortlistIds.length > 0) { clearSharedShortlist(); return; }
    try { localStorage.removeItem('peuterplannen_favorites'); } catch (error) { console.warn('[favorites:clearShortlist] localStorage remove failed:', error.message); }
    if (state.activeTag === 'favorites') state.activeTag = 'all';
    updateShortlistBar();
    bus.emit('filters:countupdate');
    bus.emit('data:reload');
}

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

export function toggleFavoriteFromSheet(locationId, btn) {
    toggleFavorite(locationId, btn);
    if (state.activeLocSheet === locationId) {
        bus.emit('sheet:open', locationId);
    }
}

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
