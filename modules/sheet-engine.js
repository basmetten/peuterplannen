import { state, DESKTOP_WIDTH, CATEGORY_IMAGES, TYPE_PHOTO_COLORS, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import { computePeuterScore } from './scoring.js';
import { getTopTags } from './tags.js';
import { isVisited } from './visited.js';

// Sheet state machine
const STATES = ['hidden', 'peek', 'half', 'full'];

let currentState = 'hidden';
let sheetEl, contentEl, listEl, dragHandle;
let touchStartY = 0, touchCurrentY = 0, touchStartTime = 0;
let isDragging = false;

export function initSheet() {
    if (window.innerWidth >= DESKTOP_WIDTH) return;

    sheetEl = document.getElementById('bottom-sheet');
    contentEl = document.getElementById('sheet-content');
    listEl = document.getElementById('sheet-list');
    dragHandle = document.getElementById('sheet-drag-handle');

    if (!sheetEl) return;

    // Touch handlers on drag handle
    dragHandle.addEventListener('touchstart', onTouchStart, { passive: true });
    dragHandle.addEventListener('touchmove', onTouchMove, { passive: false });
    dragHandle.addEventListener('touchend', onTouchEnd, { passive: true });

    // Also allow dragging from content when at scroll top
    contentEl.addEventListener('touchstart', onContentTouchStart, { passive: true });
    contentEl.addEventListener('touchmove', onContentTouchMove, { passive: false });
    contentEl.addEventListener('touchend', onContentTouchEnd, { passive: true });

    // Search pill opens half state
    const searchPill = document.getElementById('sheet-search-pill');
    if (searchPill) {
        searchPill.addEventListener('click', () => {
            if (currentState === 'peek') setSheetState('half');
        });
    }

    // Overlay click closes to peek
    const overlay = document.getElementById('sheet-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => setSheetState('half'));
    }

    // Start in peek state
    setSheetState('peek');
}

export function setSheetState(newState) {
    if (!sheetEl || !STATES.includes(newState)) return;
    currentState = newState;
    sheetEl.dataset.state = newState;

    // Overlay for full state
    const overlay = document.getElementById('sheet-overlay');
    if (overlay) {
        overlay.classList.toggle('active', newState === 'full');
    }

    // Toggle content scrolling
    if (newState === 'full' || newState === 'half') {
        contentEl.style.overflowY = 'auto';
    } else {
        contentEl.style.overflowY = 'hidden';
    }

    // Restore full transition (transform + floating card properties)
    sheetEl.style.transition = '';
}

export function getSheetState() {
    return currentState;
}

// Touch handling on drag handle
function onTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    touchStartTime = Date.now();
    isDragging = true;
    sheetEl.style.transition = 'none';
}

function onTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchCurrentY - touchStartY;

    // Apply transform offset from current state position
    const currentOffset = getStateOffset(currentState);
    const newTranslateY = Math.max(0, currentOffset + deltaY);
    sheetEl.style.transform = `translateY(${newTranslateY}px)`;

    // Performance: remove blur during drag
    sheetEl.style.backdropFilter = 'none';
    sheetEl.style.webkitBackdropFilter = 'none';
    sheetEl.style.background = 'rgba(255, 252, 249, 0.97)';
}

function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    // Restore blur
    sheetEl.style.backdropFilter = '';
    sheetEl.style.webkitBackdropFilter = '';
    sheetEl.style.background = '';

    const deltaY = touchCurrentY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    const velocity = Math.abs(deltaY) / elapsed; // px/ms
    const VELOCITY_THRESHOLD = 0.5;

    let newState = currentState;

    if (currentState === 'peek') {
        if (deltaY < -60 || (deltaY < 0 && velocity > VELOCITY_THRESHOLD))
            newState = 'half';
        else if (deltaY > 40)
            newState = 'hidden';
    } else if (currentState === 'half') {
        if (deltaY < -80 || (deltaY < 0 && velocity > VELOCITY_THRESHOLD))
            newState = 'full';
        else if (deltaY > 60 || (deltaY > 0 && velocity > VELOCITY_THRESHOLD))
            newState = 'peek';
    } else if (currentState === 'full') {
        if (deltaY > 100 || (deltaY > 0 && velocity > VELOCITY_THRESHOLD))
            newState = 'half';
    }

    // Reset inline transform and let CSS handle it
    sheetEl.style.transform = '';
    setSheetState(newState);
}

function getStateOffset(st) {
    const vh = window.innerHeight;
    if (st === 'hidden') return vh;
    if (st === 'peek') return vh - 190;
    if (st === 'half') return vh * 0.45;
    if (st === 'full') return 0;
    return vh;
}

// Content touch handling (for drag-down from scrolled content)
let contentTouchStartY = 0;
let contentDragging = false;

function onContentTouchStart(e) {
    contentTouchStartY = e.touches[0].clientY;
    contentDragging = false;
}

function onContentTouchMove(e) {
    // Only allow drag-down when content is at scroll top
    if (currentState !== 'full' && currentState !== 'half') return;
    if (contentEl.scrollTop > 0) return;

    const deltaY = e.touches[0].clientY - contentTouchStartY;
    if (deltaY > 10 && !contentDragging) {
        contentDragging = true;
        touchStartY = e.touches[0].clientY;
        touchCurrentY = touchStartY;
        touchStartTime = Date.now();
        isDragging = true;
        sheetEl.style.transition = 'none';
    }
    if (contentDragging) {
        e.preventDefault();
        onTouchMove(e);
    }
}

function onContentTouchEnd() {
    if (contentDragging) {
        onTouchEnd();
        contentDragging = false;
    }
}

// Render compact cards in sheet list
export function renderSheetList(locations, travelTimes = {}) {
    if (!listEl) return;

    if (locations.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:32px 16px;color:#8B7355;"><p style="font-size:0.9rem;font-weight:600;">Nog geen favorieten</p><p style="font-size:0.8rem;margin-top:4px;">Tik op het hartje bij een locatie om deze hier te bewaren.</p></div>';
        return;
    }

    const html = locations.slice(0, 30).map(loc => {
        const tags = getTopTags(loc).slice(0, 2);
        const ps = computePeuterScore(loc);
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        const travelInfo = travelTimes[loc.id];
        const distance = travelInfo ? travelInfo.duration : (loc.region || '');
        const photoSrc = loc.photo_url || loc.owner_photo_url;
        const categoryImg = CATEGORY_IMAGES[loc.type] || CATEGORY_IMAGES.play;
        const imgSrc = photoSrc || categoryImg;
        const photoColor = TYPE_PHOTO_COLORS[loc.type] || '#E8D5C4';

        const visitedLabel = isVisited(loc.id) ? `<span class="compact-card-visited">Bezocht</span>` : '';

        return `<div class="compact-card" data-id="${loc.id}">
            <img class="compact-card-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" loading="lazy" style="background:${photoColor}"
                 onerror="this.src='${escapeHtml(categoryImg)}'">
            <div class="compact-card-body">
                <div class="compact-card-name">${escapeHtml(loc.name)}</div>
                <div class="compact-card-meta">${escapeHtml(typeLabel)}${distance ? ' \u00b7 ' + escapeHtml(String(distance)) : ''} ${visitedLabel}</div>
                ${tags.length ? `<div class="compact-card-tags">${tags.map(t => `<span class="card-tag">${t.icon} ${t.label}</span>`).join('')}</div>` : ''}
            </div>
            <div class="compact-card-score">${ps}\u2605</div>
        </div>`;
    }).join('');

    listEl.innerHTML = html;

    // Click handlers — open the location in the existing sheet
    listEl.querySelectorAll('.compact-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            window._pp_modules?.openLocSheet?.(id);
        });
    });
}

// Show a location preview in the sheet (triggered by marker tap on mobile)
export function showLocationInSheet(loc) {
    if (!sheetEl) return;
    const previewEl = document.getElementById('sheet-loc-preview');
    if (!previewEl) return;

    const tags = getTopTags(loc).slice(0, 2);
    const ps = computePeuterScore(loc);
    const typeLabel = TYPE_LABELS[loc.type] || loc.type;
    const photoSrc = loc.photo_url || loc.owner_photo_url;
    const categoryImg = CATEGORY_IMAGES[loc.type] || CATEGORY_IMAGES.play;
    const imgSrc = photoSrc || categoryImg;
    const photoColor = TYPE_PHOTO_COLORS[loc.type] || '#E8D5C4';
    const distance = loc.region || '';

    previewEl.innerHTML = `
        <div class="sheet-preview-card">
            <img class="sheet-preview-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(loc.name)}" style="background:${photoColor}"
                 onerror="this.src='${escapeHtml(categoryImg)}'">
            <div class="sheet-preview-body">
                <div class="sheet-preview-name">${escapeHtml(loc.name)}</div>
                <div class="sheet-preview-meta">${escapeHtml(typeLabel)}${distance ? ' \u00b7 ' + escapeHtml(String(distance)) : ''}</div>
                ${tags.length ? `<div class="sheet-preview-tags">${tags.map(t => `<span class="card-tag">${t.icon} ${t.label}</span>`).join('')}</div>` : ''}
            </div>
            <div class="sheet-preview-score">${ps}\u2605</div>
        </div>
        <div class="sheet-preview-actions">
            <button class="sheet-preview-btn sheet-preview-btn-primary" id="sheet-preview-meer">Meer info</button>
            <button class="sheet-preview-btn sheet-preview-btn-secondary" id="sheet-preview-route"
                onclick="window.open('https://maps.apple.com/?daddr=${loc.lat},${loc.lng}','_blank')">Route</button>
        </div>`;

    sheetEl.classList.add('has-preview');
    setSheetState('half');

    // "Meer info" opens the full location detail
    document.getElementById('sheet-preview-meer')?.addEventListener('click', () => {
        hideLocationPreview();
        window._pp_modules?.openLocSheet?.(loc.id);
    });
}

// Hide the location preview and restore the list
export function hideLocationPreview() {
    if (!sheetEl) return;
    sheetEl.classList.remove('has-preview');
    const previewEl = document.getElementById('sheet-loc-preview');
    if (previewEl) previewEl.innerHTML = '';
}

// Initialize sheet navigation tabs
export function initSheetTabs() {
    const tabs = document.querySelectorAll('.sheet-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tabName === 'plan') {
                window._pp_modules?.switchView?.('plan');
                return;
            }

            if (tabName === 'opgeslagen') {
                // Switch to favorites and re-render sheet list
                state.activeTag = 'favorites';
                window._pp_modules?.loadLocations?.();
                setSheetState('half');
            } else {
                // Ontdek - reset to all
                if (state.activeTag === 'favorites') {
                    state.activeTag = 'all';
                    window._pp_modules?.loadLocations?.();
                }
                setSheetState('half');
            }
        });
    });
}

// Update sheet meta (weather + count)
export function updateSheetMeta() {
    const weatherEl = document.getElementById('sheet-weather');
    const countEl = document.getElementById('sheet-count');
    if (!weatherEl || !countEl) return;

    if (state.currentTemp !== null) {
        const icon = state.isRaining ? '\uD83C\uDF27\uFE0F' : state.isSunny ? '\u2600\uFE0F' : '\uD83C\uDF25\uFE0F';
        weatherEl.textContent = `${icon} ${state.currentTemp}\u00b0`;
    }
    countEl.textContent = `${state.allLocations.length} locaties`;
}
