import { state, DESKTOP_WIDTH, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';
import { renderCompactCard, renderSheetPreview } from './templates.js';

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

    // Search pill: tap to expand into search bar
    const searchPill = document.getElementById('sheet-search-pill');
    const searchInput = document.getElementById('sheet-search-input');
    const searchCancel = document.getElementById('sheet-search-cancel');

    if (searchPill && searchInput) {
        searchPill.addEventListener('click', (e) => {
            // If already in search mode, don't re-trigger
            if (sheetEl.classList.contains('search-active')) return;

            // Activate search mode
            sheetEl.classList.add('search-active');
            if (currentState === 'peek') setSheetState('half');

            // Focus the input after transition
            requestAnimationFrame(() => searchInput.focus());
        });

        // Live search suggestions
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) { hideSuggestions(); return; }

            const matches = state.allLocations
                .filter(l => l.name.toLowerCase().includes(query))
                .slice(0, 6);

            showSuggestions(matches);
        });

        // Prevent pill click from also triggering on input tap
        searchInput.addEventListener('click', (e) => e.stopPropagation());
    }

    if (searchCancel) {
        searchCancel.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelSearch();
        });
    }

    // Filter chip handlers
    initSheetFilterChips();

    // Overlay click closes to peek
    const overlay = document.getElementById('sheet-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => setSheetState('half'));
    }

    // Keyboard: Escape cancels search or closes full state
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sheetEl?.classList.contains('search-active')) {
                cancelSearch();
                e.preventDefault();
            } else if (currentState === 'full') {
                setSheetState('half');
                e.preventDefault();
            }
        }
    });

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

    // Screen reader announcement
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
        const labels = { peek: 'Zoekpaneel geminimaliseerd', half: 'Zoekresultaten geopend', full: 'Volledig scherm geopend', hidden: 'Paneel gesloten' };
        announcer.textContent = labels[newState] || '';
    }
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

    const previousState = currentState;
    let newState = currentState;

    if (currentState === 'peek') {
        if (deltaY < -60 || (deltaY < 0 && velocity > VELOCITY_THRESHOLD))
            newState = 'half';
        // No peek→hidden: sheet must never disappear via drag
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

    // Rubber-band bounce after snap (only on actual state change via touch)
    if (newState !== previousState) {
        bounceSheet(newState);
    }
}

function getStateOffset(st) {
    const vh = window.innerHeight;
    if (st === 'hidden') return vh;
    if (st === 'peek') return vh - 200;
    if (st === 'half') return vh * 0.45;
    if (st === 'full') return 0;
    return vh;
}

// Rubber-band micro-bounce after sheet snaps to new state
function bounceSheet(targetState) {
    if (!sheetEl || !sheetEl.animate) return;
    // Wait for CSS transition to complete, then overshoot bounce
    setTimeout(() => {
        const bounce = targetState === 'full' ? 6 : -6;
        sheetEl.animate([
            { translate: '0 0' },
            { translate: `0 ${bounce}px` },
            { translate: '0 0' }
        ], { duration: 200, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    }, 310);
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

    const html = locations.slice(0, 30).map(loc =>
        renderCompactCard(loc, { travelTimes })
    ).join('');

    listEl.innerHTML = html;

    // Click handlers — open the location in the existing sheet
    listEl.querySelectorAll('.compact-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            bus.emit('sheet:open', id);
        });
    });
}

// Show a location preview in the sheet (triggered by marker tap on mobile)
export function showLocationInSheet(loc) {
    if (!sheetEl) return;
    const previewEl = document.getElementById('sheet-loc-preview');
    if (!previewEl) return;

    previewEl.innerHTML = renderSheetPreview(loc);

    sheetEl.classList.add('has-preview');
    setSheetState('half');

    // "Meer info" opens the full location detail
    document.getElementById('sheet-preview-meer')?.addEventListener('click', () => {
        hideLocationPreview();
        bus.emit('sheet:open', loc.id);
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
                bus.emit('view:switch', 'plan');
                return;
            }

            if (tabName === 'info') {
                bus.emit('view:switch', 'info');
                return;
            }

            if (tabName === 'bewaard') {
                // Switch to favorites and re-render sheet list
                state.activeTag = 'favorites';
                state.currentView = 'favorites';
                bus.emit('data:reload');
                setSheetState('half');
            } else {
                // Ontdek - reset to all
                if (state.activeTag === 'favorites') {
                    state.activeTag = 'all';
                }
                state.currentView = 'home';
                bus.emit('data:reload');
                setSheetState('half');
            }
        });
    });
}

// === Search helpers ===

function showSuggestions(matches) {
    let container = document.getElementById('search-suggestions');
    if (!container) {
        container = document.createElement('div');
        container.id = 'search-suggestions';
        container.className = 'search-suggestions';
        document.getElementById('sheet-search-area')?.appendChild(container);
    }

    if (!matches.length) { container.innerHTML = ''; return; }

    container.innerHTML = matches.map(loc => {
        const typeLabel = TYPE_LABELS[loc.type] || loc.type;
        return `<div class="search-suggestion" data-id="${loc.id}">
            <span class="suggestion-icon">\uD83D\uDCCD</span>
            <span class="suggestion-name">${escapeHtml(loc.name)}</span>
            <span class="suggestion-meta">${escapeHtml(typeLabel)}${loc.region ? ' \u00b7 ' + escapeHtml(loc.region) : ''}</span>
        </div>`;
    }).join('');

    container.querySelectorAll('.search-suggestion').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id, 10);
            const loc = state.allLocations.find(l => l.id === id);
            if (loc) {
                bus.emit('sheet:showlocation', loc);
                cancelSearch();
            }
        });
    });
}

function hideSuggestions() {
    const container = document.getElementById('search-suggestions');
    if (container) container.innerHTML = '';
}

function cancelSearch() {
    sheetEl?.classList.remove('search-active');
    const input = sheetEl?.querySelector('.sheet-search-input');
    if (input) { input.value = ''; input.blur(); }
    hideSuggestions();
}

// Initialize filter chips in the sheet
function initSheetFilterChips() {
    const container = document.getElementById('sheet-filter-chips');
    if (!container) return;
    container.querySelectorAll('.sheet-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            // Update active state
            container.querySelectorAll('.sheet-filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            // Apply filter
            state.activeTag = filter;
            state.activeWeather = null;
            bus.emit('data:reload');
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

// Bus listeners
bus.on('sheet:setstate', setSheetState);
bus.on('sheet:showlocation', showLocationInSheet);
bus.on('sheet:hidepreview', hideLocationPreview);
bus.on('sheet:renderlist', renderSheetList);
bus.on('sheet:updatemeta', updateSheetMeta);
