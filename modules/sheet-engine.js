import { state, DESKTOP_WIDTH, TYPE_LABELS, WEATHER_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';
import { renderCompactCard, renderSheetPreview, renderSheetScanCard, getPhotoData } from './templates.js';
import { getPracticalBullets, computePeuterScore } from './scoring.js';
import { isFavorite } from './favorites.js';

/* ===================================================
   SCROLL-SNAP SHEET ENGINE
   Native CSS scroll-snap positioning with progressive
   UI morphing. Apple Maps web reference architecture.
   =================================================== */

// --- Constants ---
const PEEK_HEIGHT_PX = 210;
const HALF_RATIO = 0.55;
// Measured dynamically in computeSnapPositions()
let navbarHeight = 52;
const SCROLL_DEBOUNCE_MS = 150;
const RESIZE_DEBOUNCE_MS = 100;
const SUPPRESS_DETECT_MS = 400;

// Morph thresholds: [startProgress, fadeRange] for staggered element fade-in
const MORPH_META_START = 0.12;
const MORPH_META_RANGE = 0.35;
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
    // Dynamic peek height: measure actual content instead of hardcoded constant
    const peekEl = document.getElementById('sheet-peek');
    const handleEl = document.getElementById('sheet-drag-handle');
    const measuredPeek = (peekEl ? peekEl.offsetHeight : 0) + (handleEl ? handleEl.offsetHeight : 0) + 10;
    const peekHeight = Math.max(measuredPeek, 100); // floor at 100px safety
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

    // Apple Maps pattern: GPU compositing hint
    sheetEl.style.transform = 'translateZ(0)';
    // Apple Maps pattern: prevent iOS overscroll bounce at sheet limits
    sheetEl.style.overscrollBehavior = 'none';
    // Apple Maps pattern: 0.3s ease-in-out snap timing (not spring curves)
    sheetEl.style.transition = 'transform 0.3s ease-in-out';
    // Apple Maps pattern: hide scrollbar on scrollable content
    if (contentEl) contentEl.style.scrollbarWidth = 'none';
    // Apple Maps pattern: sticky drag handle with correct z-index
    if (dragHandle) {
        dragHandle.style.position = 'sticky';
        dragHandle.style.zIndex = '11';
        dragHandle.style.cursor = 'pointer';
    }

    // Cache morph targets
    morphEls.filterChips = document.getElementById('sheet-filter-chips');
    morphEls.meta        = document.querySelector('.sheet-meta');
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

    // --- Touch-driven sheet dragging (bypasses WebKit bug #183870) ---
    // The scroll host has pointer-events:none so the map receives touches.
    // iOS WebKit can't propagate scroll gestures from pointer-events:auto children
    // to a pointer-events:none scroll host. We handle touch events on the sheet
    // directly and programmatically scroll the host.
    initSheetTouch();

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
   TOUCH-DRIVEN SHEET DRAGGING
   Bypasses WebKit bug #183870 for iOS Chrome/Safari.
   Listens for touch events on the sheet and scrolls
   the host programmatically.
   =================================================== */

function initSheetTouch() {
    let startX = 0;
    let startY = 0;
    let startScrollTop = 0;
    let isDragging = false;
    let swipeDirection = null; // 'vertical' | 'horizontal' | null
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;

    const dragSurface = sheetEl;
    if (!dragSurface) return;

    dragSurface.addEventListener('touchstart', (e) => {
        // Don't hijack scrolling inside sheet-content when it has overflow
        const target = e.target;
        if (contentEl && contentEl.scrollHeight > contentEl.clientHeight + 10) {
            // If touching inside scrollable content in full state, let it scroll naturally
            if (currentState === 'full' && contentEl.contains(target) && !dragHandle.contains(target)) {
                return;
            }
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startScrollTop = hostEl.scrollTop;
        isDragging = true;
        swipeDirection = null;
        lastY = startY;
        lastTime = Date.now();
        velocity = 0;

        // Apple Maps pattern: mark sheet as dragging (CSS can disable transitions)
        sheetEl.classList.add('dragging');

        // Temporarily disable CSS scroll-snap so manual scrolling is smooth
        hostEl.style.scrollSnapType = 'none';
    }, { passive: true });

    dragSurface.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        // Detect swipe direction on first significant movement (Apple Maps pattern)
        if (!swipeDirection) {
            const dx = Math.abs(currentX - startX);
            const dy = Math.abs(currentY - startY);
            if (dx < 4 && dy < 4) return; // dead zone — wait for clearer intent
            swipeDirection = dx > dy ? 'horizontal' : 'vertical';
        }

        // Horizontal swipe — release to child (preset chips, filter chips)
        if (swipeDirection === 'horizontal') {
            isDragging = false;
            sheetEl.classList.remove('dragging');
            hostEl.style.scrollSnapType = 'y mandatory';
            return;
        }

        // Vertical drag — existing behavior
        const deltaY = startY - currentY; // positive = dragging up (sheet goes up)
        const now = Date.now();
        const dt = now - lastTime;

        if (dt > 0) {
            velocity = (lastY - currentY) / dt; // px/ms, positive = upward
        }
        lastY = currentY;
        lastTime = now;

        // Scroll the host to follow the finger
        hostEl.scrollTop = startScrollTop + deltaY;

        // Prevent page bounce on iOS
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    dragSurface.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        // Re-enable scroll-snap
        hostEl.style.scrollSnapType = 'y mandatory';

        // Apple Maps pattern: remove dragging class after snap animation completes (0.3s)
        setTimeout(() => sheetEl.classList.remove('dragging'), 300);

        // Find the nearest snap position, considering velocity
        const currentScroll = hostEl.scrollTop;
        const threshold = 50; // px — minimum velocity-based overshoot

        let targetState = currentState;
        const positions = ['peek', 'half', 'full'];
        let minDist = Infinity;

        for (const name of positions) {
            const pos = snapPositions[name];
            if (pos == null) continue;
            // Apply velocity bias: if flicking upward, prefer higher states
            const biasedDist = Math.abs(currentScroll - pos) - (velocity * threshold * (pos > currentScroll ? 1 : -1));
            if (biasedDist < minDist) {
                minDist = biasedDist;
                targetState = name;
            }
        }

        // Velocity-based override: strong flick should snap to next state
        if (Math.abs(velocity) > 0.5) { // px/ms threshold
            const idx = positions.indexOf(currentState);
            if (velocity > 0 && idx < positions.length - 1) {
                targetState = positions[idx + 1]; // flick up → next higher state
            } else if (velocity < 0 && idx > 0) {
                targetState = positions[idx - 1]; // flick down → next lower state
            }
        }

        setSheetState(targetState);
    }, { passive: true });
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

    // Apple Maps pattern: expose position as CSS custom property for external styling
    document.documentElement.style.setProperty('--sheet-position', scrollTop);

    // p1: 0 at peek → 1 at half
    const p1raw = clamp((scrollTop - peekPos) / ((halfPos - peekPos) || 1));
    const p1 = easeOut(p1raw);

    // p2: 0 at half → 1 at full
    const p2raw = clamp((scrollTop - halfPos) / ((fullPos - halfPos) || 1));
    const p2 = easeOut(p2raw);

    // Child morphs (staggered fade-in)
    // Tabs removed; filter chips always visible in peek (per PRD content refresh)
    setMorphOpacity(morphEls.meta,        clamp((p1 - MORPH_META_START) / MORPH_META_RANGE));
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
        const shouldDisplay = o > OVERLAY_DISPLAY_THRESHOLD;
        const shouldPointer = o > OVERLAY_POINTER_THRESHOLD;
        if (morphEls.overlay._lastO !== o) {
            morphEls.overlay._lastO = o;
            morphEls.overlay.style.opacity = o;
        }
        if (morphEls.overlay._lastD !== shouldDisplay) {
            morphEls.overlay._lastD = shouldDisplay;
            morphEls.overlay.style.display = shouldDisplay ? 'block' : 'none';
        }
        if (morphEls.overlay._lastP !== shouldPointer) {
            morphEls.overlay._lastP = shouldPointer;
            morphEls.overlay.style.pointerEvents = shouldPointer ? 'auto' : 'none';
        }
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
    const clearBtn = document.getElementById('search-clear-btn');
    const pillText = document.getElementById('search-pill-text');

    if (pill && input) {
        pill.addEventListener('click', () => {
            if (sheetEl.classList.contains('search-active')) return;
            sheetEl.classList.add('search-active');
            if (currentState === 'peek') setSheetState('half');
            requestAnimationFrame(() => input.focus());
            if (typeof window.pushNavState === 'function') window.pushNavState('search');
        });
        let _searchTimer = null;
        input.addEventListener('input', (e) => {
            clearTimeout(_searchTimer);
            const q = e.target.value.toLowerCase().trim();
            // Toggle has-query class for clear button visibility
            sheetEl.classList.toggle('search-has-query', q.length > 0);
            if (q.length < SEARCH_MIN_CHARS) { hideSuggestions(); return; }
            _searchTimer = setTimeout(() => {
                showSuggestions(state.allLocations.filter(l => l.name.toLowerCase().includes(q)).slice(0, SEARCH_MAX_SUGGESTIONS));
            }, 150);
        });
        input.addEventListener('click', (e) => e.stopPropagation());

        // Cancel search when input loses focus (tapping outside)
        input.addEventListener('blur', () => {
            // Small delay to allow click on suggestions/clear button to fire first
            setTimeout(() => {
                if (!input.matches(':focus') && sheetEl.classList.contains('search-active')) {
                    cancelSearch();
                }
            }, 200);
        });
    }

    if (clearBtn && input) {
        clearBtn.addEventListener('mousedown', (e) => {
            // Prevent blur from firing before clear action
            e.preventDefault();
        });
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            input.focus();
            sheetEl.classList.remove('search-has-query');
            hideSuggestions();
        });
    }

    // Dynamic placeholder: show current city when location is known
    updateSearchPlaceholder(pillText, input);
}

function updateSearchPlaceholder(pillText, input) {
    const fallback = 'Zoek stad of plek';
    function setPlaceholder() {
        const city = state.userLocation?.name;
        if (city && city !== 'Mijn locatie' && pillText && input) {
            pillText.textContent = city;
            input.placeholder = city;
        } else if (pillText && input) {
            pillText.textContent = fallback;
            input.placeholder = fallback;
        }
    }
    // Update when user location changes
    bus.on('map:userlocation', setPlaceholder);
    // Set initial value
    setPlaceholder();
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
        // Prevent blur from cancelling search before click fires
        el.addEventListener('mousedown', (e) => e.preventDefault());
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
    sheetEl?.classList.remove('search-active', 'search-has-query');
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
    const countEl = document.getElementById('sheet-count');
    if (!countEl) return;

    const count = state.allLocations.length;
    const parts = [];

    // Active filter context
    const activePreset = state.activePreset;
    if (activePreset) {
        const presetLabels = { 'short-drive': 'korte rit', 'rain': 'regenproof', 'lunch-play': 'lunch+spelen', 'peuterproof': 'peuterproof', 'outdoor-coffee': 'buiten+koffie', 'now-open': 'nu open' };
        if (presetLabels[activePreset]) parts.push(presetLabels[activePreset]);
    }
    if (state.activeWeather === 'indoor') parts.push('binnen');
    if (state.activeWeather === 'outdoor') parts.push('buiten');
    if (state.activeTag && state.activeTag !== 'all' && state.activeTag !== 'favorites') {
        const typeLabels = { play: 'speeltuinen', farm: 'boerderijen', nature: 'natuur', museum: 'musea', horeca: 'horeca', swim: 'zwemmen' };
        if (typeLabels[state.activeTag]) parts.push(typeLabels[state.activeTag]);
    }
    if (state.activeTag === 'favorites') parts.push('bewaard');

    // Region context
    const region = state.userLocation?.name || '';
    if (region) parts.push(`rond ${region}`);

    const context = parts.length ? ` \u00b7 ${parts.join(' \u00b7 ')}` : '';
    countEl.textContent = `${count} locaties${context}`;
}

function initFilterModal() {
    const btn      = document.getElementById('sheet-filter-more-btn');
    const modal    = document.getElementById('filter-modal');
    const overlay  = document.getElementById('filter-modal-overlay');
    const closeBtn = document.getElementById('filter-modal-close');
    const applyBtn = document.getElementById('filter-modal-apply');
    if (!modal) return;

    // Focus trap for filter modal
    function trapFocus(m) {
        const focusable = m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        m._focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        m.addEventListener('keydown', m._focusTrapHandler);
        first.focus();
    }

    const openModal  = () => { syncModalChips(); updateModalCount(); modal.classList.add('open'); overlay.classList.add('open'); trapFocus(modal); if (typeof window.pushNavState === 'function') window.pushNavState('filter-modal'); const ann = document.getElementById('sr-announcer'); if (ann) ann.textContent = 'Filter paneel geopend'; };
    const closeModal = () => { if (modal._focusTrapHandler) modal.removeEventListener('keydown', modal._focusTrapHandler); modal.classList.remove('open'); overlay.classList.remove('open'); const ann = document.getElementById('sr-announcer'); if (ann) ann.textContent = 'Filter paneel gesloten'; };

    if (btn) btn.addEventListener('click', openModal);
    // "Filters" preset chip in sheet also opens this modal
    const filtersPreset = document.getElementById('sheet-preset-filters');
    if (filtersPreset) filtersPreset.addEventListener('click', openModal);
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
            else if (action === 'saved')    { state.activeTag = state.activeTag === 'favorites' ? 'all' : 'favorites'; }
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
        else if (action === 'saved')    active = state.activeTag === 'favorites';
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

    const isFavoritesView = state.activeTag === 'favorites';

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
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', (e) => {
            if (e.target.closest('.scan-fav')) return;
            bus.emit('sheet:open', parseInt(card.dataset.id, 10));
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!e.target.closest('.scan-fav')) {
                    bus.emit('sheet:open', parseInt(card.dataset.id, 10));
                }
            }
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
            else { _lazyObserver.disconnect(); _lazyObserver = null; sentinel.remove(); }
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
    const isFav = isFavorite(loc.id);
    const favClass = isFav ? ' active' : '';

    // Score
    const ps = computePeuterScore(loc);
    const scoreHtml = ps ? `<span class="detail-score">\u2605 ${ps}</span>` : '';

    // Age range
    const minAge = loc.min_age != null ? loc.min_age : 0;
    const maxAge = loc.max_age != null ? loc.max_age : 12;
    const ageHtml = `<span class="detail-meta-pill">${minAge}\u2013${maxAge} jr</span>`;

    // Price
    const priceMap = { free: 'Gratis', low: '\u20AC', mid: '\u20AC\u20AC', high: '\u20AC\u20AC\u20AC' };
    const priceHtml = loc.price_band && priceMap[loc.price_band] ? `<span class="detail-meta-pill">${priceMap[loc.price_band]}</span>` : '';

    // Weather
    const weatherMap = WEATHER_LABELS;
    const weatherHtml = loc.weather && weatherMap[loc.weather] ? `<span class="detail-meta-pill">${escapeHtml(weatherMap[loc.weather])}</span>` : '';

    // Practical reasons
    const reasons = [];
    if (loc.coffee) reasons.push('Koffie');
    if (loc.diaper) reasons.push('Verschonen');
    if (loc.play_corner_quality === 'strong') reasons.push('Speelprikkel');
    if (loc.rain_backup_quality === 'strong') reasons.push('Regenproof');
    if (loc.parking_ease === 'easy') reasons.push('Parkeren');
    if (loc.food_fit === 'strong') reasons.push('Goed eten');
    if (loc.buggy_friendliness === 'easy') reasons.push('Buggy-vriendelijk');
    if (loc.toilet_confidence === 'confident') reasons.push('Goed toilet');

    // Facility grid — comprehensive
    const facilities = [];
    if (loc.coffee) facilities.push({ icon: '\u2615', label: 'Koffie' });
    if (loc.diaper) facilities.push({ icon: '\uD83D\uDEBC', label: 'Verschonen' });
    if (loc.parking_ease === 'easy') facilities.push({ icon: '\uD83C\uDD7F\uFE0F', label: 'Parkeren' });
    if (loc.buggy_friendliness === 'easy') facilities.push({ icon: '\uD83D\uDED2', label: 'Buggy OK' });
    if (loc.toilet_confidence === 'confident') facilities.push({ icon: '\uD83D\uDEBB', label: 'Toilet' });
    if (loc.weather === 'indoor' || loc.weather === 'hybrid') facilities.push({ icon: '\uD83C\uDFE0', label: 'Binnen' });
    if (loc.weather === 'outdoor' || loc.weather === 'hybrid') facilities.push({ icon: '\uD83C\uDF3F', label: 'Buiten' });
    if (loc.alcohol) facilities.push({ icon: '\uD83C\uDF77', label: 'Alcohol' });

    const practicalBullets = getPracticalBullets(loc);

    // Opening hours
    const hoursHtml = loc.opening_hours
        ? `<div class="detail-hours"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${escapeHtml(loc.opening_hours)}</div>`
        : loc.always_open
            ? '<div class="detail-hours"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Altijd open</div>'
            : '';

    // Toddler highlight (editorial intro)
    const highlightHtml = loc.toddler_highlight
        ? `<p class="detail-highlight">${escapeHtml(loc.toddler_highlight)}</p>`
        : '';

    // Build sections with separators
    const sectionsHtml = [];

    // Section: highlight + hours (key decision info)
    if (highlightHtml || hoursHtml) {
        sectionsHtml.push(`<div class="detail-section detail-section-key">${highlightHtml}${hoursHtml}</div>`);
    }

    // Section: reasons (quick scan)
    if (reasons.length) {
        sectionsHtml.push(`<div class="detail-section"><div class="detail-section-label">Waarom hier naartoe</div><div class="sheet-detail-reasons-list">${reasons.slice(0, 6).map(r => `<span class="detail-reason-tag">${escapeHtml(r)}</span>`).join('')}</div></div>`);
    }

    // Section: facilities (supporting info)
    if (facilities.length) {
        sectionsHtml.push(`<div class="detail-section"><div class="detail-section-label">Faciliteiten</div><div class="sheet-detail-facilities-grid">${facilities.map(f => `<span class="detail-facility">${f.icon} ${escapeHtml(f.label)}</span>`).join('')}</div></div>`);
    }

    // Section: practical (supporting info)
    if (practicalBullets.length) {
        sectionsHtml.push(`<div class="detail-section"><div class="detail-section-label">Praktisch</div>${practicalBullets.slice(0, 5).map(b => `<p class="detail-practical-item">${escapeHtml(b)}</p>`).join('')}</div>`);
    }

    // Section: description (deep detail)
    if (loc.description) {
        sectionsHtml.push(`<div class="detail-section"><p class="sheet-detail-insheet-desc">${escapeHtml(loc.description)}</p></div>`);
    }

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
            <div class="sheet-detail-insheet-title-row">
                <h2 class="sheet-detail-insheet-name">${escapeHtml(loc.name)}</h2>
                <button class="sheet-detail-fav${favClass}" onclick="event.stopPropagation();toggleFavorite(${loc.id}, this)" aria-label="${isFav ? 'Verwijder favoriet' : 'Bewaar'}">
                    <svg viewBox="0 0 24 24" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
            </div>
            <div class="detail-meta-row">
                <span class="sheet-detail-insheet-type">${escapeHtml(typeLbl)}</span>
                ${loc.region ? `<span class="detail-meta-sep">\u00b7</span><span class="sheet-detail-insheet-region">${escapeHtml(loc.region)}</span>` : ''}
                ${scoreHtml}
            </div>
            <div class="detail-pills-row">
                ${ageHtml}${weatherHtml}${priceHtml}
            </div>
        </div>
        ${sectionsHtml.join('')}
        <div class="detail-section detail-section-cta">
            <div class="sheet-detail-insheet-actions">
                ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="pp-btn-primary">Route</a>` : ''}
                ${loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" class="pp-btn-secondary">Website</a>` : ''}
            </div>
        </div>
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
    // Tabs removed per PRD content refresh — no-op for backwards compatibility
    const tabs = document.querySelectorAll('.sheet-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.tab;
            tabs.forEach(t => {
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
