import { state, DESKTOP_WIDTH, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';
import { renderCompactCard, renderSheetPreview, renderSheetScanCard, getPhotoData } from './templates.js';

/* ===================================================
   SCROLL-SNAP SHEET ENGINE
   Native CSS scroll-snap positioning with progressive
   UI morphing. Apple Maps web reference architecture.
   =================================================== */

// --- Constants ---
const PEEK_HEIGHT_PX = 160;
const HALF_RATIO = 0.55;
// Measured dynamically in computeSnapPositions()
let navbarHeight = 52;
const SCROLL_DEBOUNCE_MS = 150;
const RESIZE_DEBOUNCE_MS = 100;
const SUPPRESS_DETECT_MS = 400;

// Morph thresholds: [startProgress, fadeRange] for staggered element fade-in
const MORPH_TABS_START = 0.55;
const MORPH_TABS_RANGE = 0.30;
const MORPH_FILTER_CHIPS_START = 0.45;
const MORPH_FILTER_CHIPS_RANGE = 0.35;
const MORPH_META_START = 0.12;
const MORPH_META_RANGE = 0.35;
const MORPH_FORECAST_START = 0.20;
const MORPH_FORECAST_RANGE = 0.45;
const MORPH_WEEK_PICKS_START = 0.18;
const MORPH_WEEK_PICKS_RANGE = 0.45;
const MORPH_LIST_START = 0.12;
const MORPH_LIST_RANGE = 0.50;

const CONTENT_SCROLL_THRESHOLD = 0.85;
const OVERLAY_MAX_OPACITY = 0.3;
const OPACITY_HIDDEN_THRESHOLD = 0.01;
const OVERLAY_DISPLAY_THRESHOLD = 0.01;
const OVERLAY_POINTER_THRESHOLD = 0.05;
const MORPH_POINTER_THRESHOLD = 0.3;

const SHEET_LIST_BATCH = 30;
const LAZY_OBSERVER_THRESHOLD = 0.1;
const SEARCH_MIN_CHARS = 2;
const SEARCH_MAX_SUGGESTIONS = 6;

// --- DOM ---
let hostEl, sheetEl, contentEl, listEl, dragHandle;
let snapPeekEl, snapHalfEl;
let spacerHead, spacerMid, spacerTail;
const morphEls = {};

// --- Snap positions (scrollTop values) ---
let snapPositions = {};
let currentState = 'hidden';
let lastCanScroll = false;
let suppressDetect = 0;  // timestamp-based guard against detectStateFromScroll overriding programmatic state

// --- Easing ---
function clamp(v) { return Math.max(0, Math.min(1, v)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

/* ===================================================
   INIT
   =================================================== */

function computeSnapPositions() {
    if (!hostEl) return;

    // Dynamically measure the navbar so the sheet never overlaps it
    const nav = document.querySelector('.floating-nav');
    if (nav) {
        // Use bottom edge + small buffer so the sheet never touches the navbar
        navbarHeight = Math.ceil(nav.getBoundingClientRect().bottom) + 4;
    }
    // Ensure minimum — navbar is at least 74px on mobile (64px height + 10px top)
    navbarHeight = Math.max(navbarHeight, 78);

    // Clip scroll host below navbar — bulletproof: sheet physically can't go above it
    hostEl.style.top = navbarHeight + 'px';

    const hostHeight = window.innerHeight - navbarHeight;
    const peekHeight = PEEK_HEIGHT_PX;
    const halfHeight = Math.round(hostHeight * HALF_RATIO);

    // Sheet fills the available space below navbar
    const sheetHeight = hostHeight;
    if (sheetEl) sheetEl.style.height = sheetHeight + 'px';

    const totalSpacer = hostHeight + sheetHeight - peekHeight;
    const maxScroll = totalSpacer;

    // Desired scrollTop values for each state
    const peekScroll = Math.max(0, maxScroll - hostHeight + peekHeight);
    const halfScroll = Math.max(0, maxScroll - hostHeight + halfHeight);

    snapPositions = {
        hidden: 0,
        peek: peekScroll,
        half: halfScroll,
        full: maxScroll
    };

    // Size the spacer segments so snap markers land at the right offsetTop.
    // Layout: [spacerHead] [snap-peek] [spacerMid] [snap-half] [spacerTail] [sheet]
    if (spacerHead) spacerHead.style.height = peekScroll + 'px';
    if (spacerMid)  spacerMid.style.height  = (halfScroll - peekScroll) + 'px';
    if (spacerTail) spacerTail.style.height  = (totalSpacer - halfScroll) + 'px';
}

export function initSheet() {
    if (window.innerWidth >= DESKTOP_WIDTH) return;

    hostEl     = document.getElementById('sheet-scroll-host');
    sheetEl    = document.getElementById('bottom-sheet');
    contentEl  = document.getElementById('sheet-content');
    listEl     = document.getElementById('sheet-list');
    dragHandle = document.getElementById('sheet-drag-handle');
    snapPeekEl = document.getElementById('snap-peek');
    snapHalfEl = document.getElementById('snap-half');
    spacerHead = document.getElementById('snap-spacer-head');
    spacerMid  = document.getElementById('snap-spacer-mid');
    spacerTail = document.getElementById('snap-spacer-tail');
    if (!hostEl || !sheetEl) return;

    // Cache morph targets
    morphEls.filterChips = document.getElementById('sheet-filter-chips');
    morphEls.tabs        = document.getElementById('sheet-tabs');
    morphEls.meta        = document.querySelector('.sheet-meta');
    morphEls.forecast    = document.getElementById('sheet-forecast');
    morphEls.weekPicks   = document.getElementById('sheet-week-picks');
    morphEls.overlay     = document.getElementById('sheet-overlay');
    morphEls.list        = listEl;

    computeSnapPositions();

    // Scroll listener for continuous morphing (passive = compositor-friendly)
    hostEl.addEventListener('scroll', onHostScroll, { passive: true });

    // State detection: prefer scrollsnapchange, fallback to scrollend, then debounce
    if ('onscrollsnapchange' in window) {
        hostEl.addEventListener('scrollsnapchange', detectStateFromScroll);
    }
    hostEl.addEventListener('scrollend', detectStateFromScroll);

    // Ultimate fallback for browsers without scrollend (Safari <16.4)
    let scrollTimer;
    hostEl.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(detectStateFromScroll, SCROLL_DEBOUNCE_MS);
    }, { passive: true });

    // Search
    initSearchPill();

    // Filters
    initSheetFilterChips();
    initFilterModal();

    // Overlay click
    morphEls.overlay?.addEventListener('click', () => setSheetState('half'));

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sheetEl?.classList.contains('show-detail')) {
                hideDetailInSheet(); e.preventDefault();
            } else if (sheetEl?.classList.contains('search-active')) {
                cancelSearch(); e.preventDefault();
            } else if (currentState === 'full') {
                setSheetState('half'); e.preventDefault();
            }
        }
    });

    // Resize: recompute snap positions
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(computeSnapPositions, RESIZE_DEBOUNCE_MS);
    });

    // Start in peek
    setSheetState('peek');

    // Re-measure after layout settles (nav may not have final position during init)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            computeSnapPositions();
            setSheetState(currentState);
        });
    });
}

/* ===================================================
   SCROLL-DRIVEN MORPHING
   =================================================== */

function onHostScroll() {
    applyMorphs(hostEl.scrollTop);
}

function applyMorphs(scrollTop) {
    const { peek: peekPos, half: halfPos, full: fullPos } = snapPositions;
    if (!peekPos && !halfPos && !fullPos) return;

    // p1: 0 at peek → 1 at half
    const p1raw = clamp((scrollTop - peekPos) / ((halfPos - peekPos) || 1));
    const p1 = easeOut(p1raw);

    // p2: 0 at half → 1 at full
    const p2raw = clamp((scrollTop - halfPos) / ((fullPos - halfPos) || 1));
    const p2 = easeOut(p2raw);

    // Child morphs (staggered fade-in)
    setMorphOpacity(morphEls.tabs,        clamp((p1 - MORPH_TABS_START) / MORPH_TABS_RANGE));
    setMorphOpacity(morphEls.filterChips, clamp((p1 - MORPH_FILTER_CHIPS_START) / MORPH_FILTER_CHIPS_RANGE));
    setMorphOpacity(morphEls.meta,        clamp((p1 - MORPH_META_START) / MORPH_META_RANGE));
    setMorphOpacity(morphEls.forecast,    clamp((p1 - MORPH_FORECAST_START) / MORPH_FORECAST_RANGE));
    setMorphOpacity(morphEls.weekPicks,   clamp((p1 - MORPH_WEEK_PICKS_START) / MORPH_WEEK_PICKS_RANGE));
    setMorphOpacity(morphEls.list,        clamp((p1 - MORPH_LIST_START) / MORPH_LIST_RANGE));

    // Content scroll: only allow when near half or above
    const canScroll = p1raw > CONTENT_SCROLL_THRESHOLD;
    if (canScroll !== lastCanScroll) {
        lastCanScroll = canScroll;
        contentEl.style.overflowY = canScroll ? 'auto' : 'hidden';
        contentEl.style.touchAction = canScroll ? 'pan-y' : 'none';
    }

    // Overlay (dims background toward full)
    if (morphEls.overlay) {
        const o = p2 * OVERLAY_MAX_OPACITY;
        morphEls.overlay.style.opacity = o;
        morphEls.overlay.style.display = o > OVERLAY_DISPLAY_THRESHOLD ? 'block' : 'none';
        morphEls.overlay.style.pointerEvents = o > OVERLAY_POINTER_THRESHOLD ? 'auto' : 'none';
    }
}

function setMorphOpacity(el, opacity) {
    if (!el) return;
    if (opacity < OPACITY_HIDDEN_THRESHOLD) {
        if (!el.classList.contains('morph-hidden')) {
            el.classList.add('morph-hidden');
            el.style.opacity = '';
        }
    } else {
        if (el.classList.contains('morph-hidden')) {
            el.classList.remove('morph-hidden');
        }
        el.style.opacity = opacity;
        el.style.pointerEvents = opacity > MORPH_POINTER_THRESHOLD ? 'auto' : 'none';
    }
}

/* ===================================================
   STATE DETECTION + PUBLIC API
   =================================================== */

function detectStateFromScroll() {
    if (!hostEl || Date.now() < suppressDetect) return;
    const scrollTop = hostEl.scrollTop;

    let closest = 'peek';
    let minDist = Infinity;
    for (const [name, pos] of Object.entries(snapPositions)) {
        if (name === 'hidden') continue;
        const d = Math.abs(scrollTop - pos);
        if (d < minDist) { minDist = d; closest = name; }
    }

    if (closest !== currentState) {
        currentState = closest;
        sheetEl.dataset.state = currentState;
        announceState(currentState);
    }
}

export function setSheetState(newState) {
    if (!hostEl || !['hidden', 'peek', 'half', 'full'].includes(newState)) return;
    currentState = newState;
    sheetEl.dataset.state = newState;

    if (newState === 'hidden') {
        hostEl.scrollTo({ top: 0, behavior: 'instant' });
        applyMorphs(0);
        announceState(newState);
        return;
    }

    const target = snapPositions[newState];
    if (target == null) return;

    // Suppress scroll-based state detection briefly so it doesn't override the
    // programmatic state. Scroll-snap can cause a re-snap that triggers
    // detectStateFromScroll with a different scrollTop under heavy CPU load.
    suppressDetect = Date.now() + SUPPRESS_DETECT_MS;

    // Smooth scroll for natural bounce-back feel; CSS transitions handle border-radius/margin.
    hostEl.scrollTo({ top: target, behavior: 'smooth' });
    applyMorphs(target);
    announceState(newState);
}

export function getSheetState() {
    return currentState;
}

function announceState(name) {
    const el = document.getElementById('sr-announcer');
    if (el) {
        const labels = {
            peek: 'Zoekpaneel geminimaliseerd',
            half: 'Zoekresultaten geopend',
            full: 'Volledig scherm geopend',
            hidden: 'Paneel gesloten'
        };
        el.textContent = labels[name] || '';
    }
    if (sheetEl) {
        sheetEl.setAttribute('aria-expanded', (name === 'half' || name === 'full') ? 'true' : 'false');
    }
}

/* ===================================================
   SEARCH
   =================================================== */

function initSearchPill() {
    const pill   = document.getElementById('sheet-search-pill');
    const input  = document.getElementById('sheet-search-input');
    const cancel = document.getElementById('sheet-search-cancel');

    if (pill && input) {
        pill.addEventListener('click', () => {
            if (sheetEl.classList.contains('search-active')) return;
            sheetEl.classList.add('search-active');
            if (currentState === 'peek') setSheetState('half');
            requestAnimationFrame(() => input.focus());
            if (typeof window.pushNavState === 'function') window.pushNavState('search');
        });
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (q.length < SEARCH_MIN_CHARS) { hideSuggestions(); return; }
            showSuggestions(state.allLocations.filter(l => l.name.toLowerCase().includes(q)).slice(0, SEARCH_MAX_SUGGESTIONS));
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    }

    if (cancel) {
        cancel.addEventListener('click', (e) => { e.stopPropagation(); cancelSearch(); });
    }
}

function showSuggestions(matches) {
    let c = document.getElementById('search-suggestions');
    if (!c) {
        c = document.createElement('div');
        c.id = 'search-suggestions';
        c.className = 'search-suggestions';
        document.getElementById('sheet-search-area')?.appendChild(c);
    }
    if (!matches.length) { c.innerHTML = ''; return; }

    c.innerHTML = matches.map(loc => {
        const tl = TYPE_LABELS[loc.type] || loc.type;
        return `<div class="search-suggestion" data-id="${loc.id}">
            <span class="suggestion-icon">\uD83D\uDCCD</span>
            <span class="suggestion-name">${escapeHtml(loc.name)}</span>
            <span class="suggestion-meta">${escapeHtml(tl)}${loc.region ? ' \u00b7 ' + escapeHtml(loc.region) : ''}</span>
        </div>`;
    }).join('');

    c.querySelectorAll('.search-suggestion').forEach(el => {
        el.addEventListener('click', () => {
            const loc = state.allLocations.find(l => l.id === parseInt(el.dataset.id, 10));
            if (loc) { bus.emit('sheet:showlocation', loc); cancelSearch(); }
        });
    });
}

function hideSuggestions() {
    const c = document.getElementById('search-suggestions');
    if (c) c.innerHTML = '';
}

function cancelSearch() {
    sheetEl?.classList.remove('search-active');
    const input = sheetEl?.querySelector('.sheet-search-input');
    if (input) { input.value = ''; input.blur(); }
    hideSuggestions();
}

/* ===================================================
   FILTER CHIPS + MODAL
   =================================================== */

function initSheetFilterChips() {
    const container = document.getElementById('sheet-filter-chips');
    if (!container) return;
    container.querySelectorAll('.sheet-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;
            container.querySelectorAll('.sheet-filter-chip').forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-pressed', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-pressed', 'true');
            state.activeTag = filter;
            state.activeWeather = null;
            bus.emit('data:reload');
        });
    });
}

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

function initFilterModal() {
    const btn      = document.getElementById('sheet-filter-more-btn');
    const modal    = document.getElementById('filter-modal');
    const overlay  = document.getElementById('filter-modal-overlay');
    const closeBtn = document.getElementById('filter-modal-close');
    const applyBtn = document.getElementById('filter-modal-apply');
    if (!btn || !modal) return;

    const openModal  = () => { syncModalChips(); updateModalCount(); modal.classList.add('open'); overlay.classList.add('open'); if (typeof window.pushNavState === 'function') window.pushNavState('filter-modal'); };
    const closeModal = () => { modal.classList.remove('open'); overlay.classList.remove('open'); };

    btn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    applyBtn.addEventListener('click', () => { bus.emit('data:reload'); closeModal(); });

    modal.querySelectorAll('.filter-modal-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { action, value } = chip.dataset;
            if (action === 'weather')       state.activeWeather = state.activeWeather === value ? null : value;
            else if (action === 'age')      state.activeAgeGroup = state.activeAgeGroup === value ? null : value;
            else if (action === 'facility') state.activeFacilities[value] = !state.activeFacilities[value];
            else if (action === 'radius')   { const n = parseInt(value, 10); state.activeRadius = state.activeRadius === n ? null : n; }
            syncModalChips(); updateModalCount(); updateMoreBadge();
        });
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
    bus.on('data:reload', () => updateMoreBadge());
    updateMoreBadge();
}

function syncModalChips() {
    const modal = document.getElementById('filter-modal');
    if (!modal) return;
    modal.querySelectorAll('.filter-modal-chip').forEach(chip => {
        const { action, value } = chip.dataset;
        let active = false;
        if (action === 'weather')       active = state.activeWeather === value;
        else if (action === 'age')      active = state.activeAgeGroup === value;
        else if (action === 'facility') active = !!state.activeFacilities[value];
        else if (action === 'radius')   active = state.activeRadius === parseInt(value, 10);
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function updateModalCount() {
    const btn = document.getElementById('filter-modal-apply');
    if (btn) btn.textContent = `Toon ${state.allLocations.length} resultaten`;
}

function updateMoreBadge() {
    const badge = document.getElementById('filter-more-badge');
    if (!badge) return;
    let count = 0;
    if (state.activeWeather) count++;
    if (state.activeAgeGroup) count++;
    if (state.activeFacilities.coffee) count++;
    if (state.activeFacilities.diaper) count++;
    if (state.activeRadius) count++;
    badge.textContent = count > 0 ? count : '';
    badge.classList.toggle('has-count', count > 0);
}

/* ===================================================
   SHEET LIST RENDERING
   =================================================== */

let _sheetLocations = [];
let _renderedCount = 0;
let _travelTimes = {};

export function renderSheetList(locations, travelTimes = {}) {
    if (!listEl) return;

    // Hide discovery content (week picks, forecast) when viewing favorites
    const isFavoritesView = state.activeTag === 'favorites';
    if (morphEls.weekPicks) morphEls.weekPicks.style.display = isFavoritesView ? 'none' : '';
    if (morphEls.forecast) morphEls.forecast.style.display = isFavoritesView ? 'none' : '';

    if (locations.length === 0) {
        if (isFavoritesView) {
            listEl.innerHTML = '<div class="favorites-empty"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><strong>Nog geen favorieten</strong><p>Tik op het hartje bij een locatie om \u2019m hier te bewaren. Zo houd je de leukste plekken bij de hand.</p></div>';
        } else {
            listEl.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--pp-text-muted);"><p style="font-size:0.9rem;font-weight:600;">Geen locaties gevonden</p><p style="font-size:0.8rem;margin-top:4px;">Pas je filters aan voor meer resultaten.</p></div>';
        }
        return;
    }

    // Reset and render first batch with lazy loading
    _sheetLocations = locations;
    _renderedCount = 0;
    _travelTimes = travelTimes;
    listEl.innerHTML = '';
    _loadMoreCards();
    _setupLazyObserver();
}

function _loadMoreCards() {
    const batch = _sheetLocations.slice(_renderedCount, _renderedCount + SHEET_LIST_BATCH);
    if (!batch.length) return false;
    const html = batch.map(loc => renderSheetScanCard(loc, { travelTimes: _travelTimes })).join('');
    listEl.insertAdjacentHTML('beforeend', html);
    listEl.querySelectorAll('.sheet-scan-card:not([data-bound])').forEach(card => {
        card.dataset.bound = '1';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.scan-fav')) return;
            bus.emit('sheet:open', parseInt(card.dataset.id, 10));
        });
    });
    /* Fade in card images once loaded */
    listEl.querySelectorAll('.scan-photo img:not(.loaded)').forEach(img => {
        if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
        else img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    });
    _renderedCount += batch.length;
    return _renderedCount < _sheetLocations.length;
}

let _lazyObserver = null;
function _setupLazyObserver() {
    if (_lazyObserver) _lazyObserver.disconnect();
    const sentinel = document.createElement('div');
    sentinel.className = 'sheet-list-sentinel';
    listEl.appendChild(sentinel);
    _lazyObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            sentinel.remove();
            if (_loadMoreCards()) listEl.appendChild(sentinel);
            else _lazyObserver.disconnect();
        }
    }, { root: listEl.closest('.sheet-content') || null, threshold: LAZY_OBSERVER_THRESHOLD });
    _lazyObserver.observe(sentinel);
}

/* ===================================================
   LOCATION PREVIEW
   =================================================== */

export function showLocationInSheet(loc) {
    if (!sheetEl) return;
    const previewEl = document.getElementById('sheet-loc-preview');
    if (!previewEl) return;
    previewEl.innerHTML = renderSheetPreview(loc);
    /* Fade in preview image once loaded */
    const previewImg = previewEl.querySelector('.sheet-preview-img');
    if (previewImg) {
        if (previewImg.complete && previewImg.naturalWidth > 0) previewImg.classList.add('loaded');
        else previewImg.addEventListener('load', () => previewImg.classList.add('loaded'), { once: true });
    }
    sheetEl.classList.add('has-preview');
    setSheetState('half');
    document.getElementById('sheet-preview-meer')?.addEventListener('click', () => {
        hideLocationPreview();
        bus.emit('sheet:open', loc.id);
    });
}

export function hideLocationPreview() {
    if (!sheetEl) return;
    sheetEl.classList.remove('has-preview');
    const el = document.getElementById('sheet-loc-preview');
    if (el) el.innerHTML = '';
}

/* ===================================================
   IN-SHEET LOCATION DETAIL (mobile only)
   =================================================== */

function renderInSheetDetail(loc) {
    const photo = getPhotoData(loc);
    const typeLbl = TYPE_LABELS[loc.type] || loc.type;
    const googleMapsUrl = (loc.lat && loc.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}` : '';

    return `
        <button class="sheet-detail-back pp-btn-icon" aria-label="Terug">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="sheet-hero-wrap">
            <div class="sheet-hero-photo" style="--photo-color: ${photo.photoColor || '#E8D5C4'}">
                <img class="sheet-hero-img" src="${escapeHtml(photo.imgSrc || '')}" alt="${escapeHtml(loc.name)}" loading="lazy">
            </div>
        </div>
        <div class="sheet-detail-insheet-header">
            <h2 class="sheet-detail-insheet-name">${escapeHtml(loc.name)}</h2>
            <span class="sheet-detail-insheet-type">${escapeHtml(typeLbl)}</span>
            ${loc.region ? `<span class="sheet-detail-insheet-region">${escapeHtml(loc.region)}</span>` : ''}
        </div>
        <div class="sheet-detail-insheet-actions">
            ${loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" class="pp-btn-secondary">Website</a>` : ''}
            ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="pp-btn-primary">Route</a>` : ''}
        </div>
        ${loc.description ? `<p class="sheet-detail-insheet-desc">${escapeHtml(loc.description)}</p>` : ''}
    `;
}

export function showDetailInSheet(locationId) {
    if (!sheetEl) return;
    const loc = state.allLocations.find(l => l.id === locationId);
    if (!loc) return;

    const detailEl = document.getElementById('sheet-detail');
    if (!detailEl) return;

    // Render detail content
    detailEl.innerHTML = renderInSheetDetail(loc);

    // Photo fade-in
    const heroImg = detailEl.querySelector('.sheet-hero-img');
    if (heroImg) {
        if (heroImg.complete && heroImg.naturalWidth > 0) heroImg.classList.add('loaded');
        else heroImg.addEventListener('load', () => heroImg.classList.add('loaded'), { once: true });
    }

    // Switch view
    sheetEl.classList.add('show-detail');
    setSheetState('full');

    // Back button
    detailEl.querySelector('.sheet-detail-back')?.addEventListener('click', hideDetailInSheet);
}

export function hideDetailInSheet() {
    if (!sheetEl) return;
    sheetEl.classList.remove('show-detail');
    const detailEl = document.getElementById('sheet-detail');
    if (detailEl) detailEl.innerHTML = '';
    setSheetState('half');
}

/* ===================================================
   TABS
   =================================================== */

function updateTabIndicator() {
    const tabs = document.getElementById('sheet-tabs');
    const activeTab = tabs?.querySelector('.sheet-tab.active');
    if (tabs && activeTab) {
        tabs.style.setProperty('--tab-left', activeTab.offsetLeft + 'px');
        tabs.style.setProperty('--tab-width', activeTab.offsetWidth + 'px');
    }
}

export function initSheetTabs() {
    document.querySelectorAll('.sheet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            document.querySelectorAll('.sheet-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            updateTabIndicator();
            if (name === 'info') { bus.emit('view:switch', 'info'); return; }
            if (name === 'bewaard') {
                state.activeTag = 'favorites';
                state.currentView = 'favorites';
                bus.emit('data:reload');
                setSheetState('half');
            } else {
                if (state.activeTag === 'favorites') state.activeTag = 'all';
                state.currentView = 'home';
                bus.emit('data:reload');
                setSheetState('half');
            }
        });
    });
    // Set initial indicator position after layout is computed
    requestAnimationFrame(() => updateTabIndicator());
}

/* ===================================================
   BUS LISTENERS
   =================================================== */

bus.on('sheet:setstate', setSheetState);
bus.on('sheet:showlocation', showLocationInSheet);
bus.on('sheet:hidepreview', hideLocationPreview);
bus.on('sheet:renderlist', renderSheetList);
bus.on('sheet:updatemeta', updateSheetMeta);
bus.on('sheet:opendetail', showDetailInSheet);
