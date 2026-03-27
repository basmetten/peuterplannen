import { state, DESKTOP_WIDTH, TYPE_LABELS, WEATHER_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';
import { renderCompactCard, renderSheetPreview, renderSheetScanCard, getPhotoData } from './templates.js';
import { getPracticalBullets, computePeuterScoreV2, getTrustBullets, getOpenStatus } from './scoring.js';
import { getSterkePunten } from './tags.js';
import { isFavorite } from './favorites.js';
import { getDistanceLabel, getKenmerkenTags, getScoreTier, findNearbyByType } from './card-data.js';
import { getAdvancedFilterCount } from './filters.js';

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

// Swipe-to-dismiss constants
const DISMISS_THRESHOLD_PX = 120;
const DISMISS_VELOCITY_PX_MS = 0.8;    // px/ms for fast-flick dismiss
const DISMISS_MIN_DIST_FOR_VELOCITY = 40; // minimum travel for velocity to count
const DISMISS_COMMIT_PX = 10;           // dead zone before committing to a direction
const SCROLL_LOCK_TIMEOUT_MS = 100;     // block dismiss for 100ms after last scroll
const DISMISS_RUBBER_FACTOR = 0.45;     // resistance beyond threshold
const SNAP_BACK_MS = 250;               // spring-back duration

// Swipe-to-dismiss state
let _dismissCleanup = null;

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

    // Start in half — use instant scroll so CSS scroll-snap doesn't re-snap during layout settle
    setSheetState('half', 'instant');

    // Re-measure after layout settles (nav may not have final position during init)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            computeSnapPositions();
            setSheetState(currentState, 'instant');
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

    let needsDisambiguation = false;

    dragSurface.addEventListener('touchstart', (e) => {
        const target = e.target;

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startScrollTop = hostEl.scrollTop;
        isDragging = true;
        swipeDirection = null;
        lastY = startY;
        lastTime = Date.now();
        velocity = 0;

        // Check if we need to disambiguate content scroll vs sheet drag
        const contentIsScrollable = contentEl && contentEl.scrollHeight > contentEl.clientHeight + 10;
        needsDisambiguation = currentState === 'full' && contentIsScrollable
            && contentEl.contains(target) && !dragHandle.contains(target);

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

        // Apple Maps disambiguation: in full state, content scroll vs sheet drag
        if (needsDisambiguation) {
            needsDisambiguation = false; // only check once per gesture
            const draggingDown = currentY > startY;
            const contentAtTop = contentEl.scrollTop <= 2;
            if (!draggingDown || !contentAtTop) {
                // User wants to scroll content, not drag sheet
                isDragging = false;
                sheetEl.classList.remove('dragging');
                hostEl.style.scrollSnapType = 'y mandatory';
                return;
            }
            // Dragging down with content at top → collapse sheet (continue to drag logic)
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

export function setSheetState(newState, behavior = 'smooth') {
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

    hostEl.scrollTo({ top: target, behavior });
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
            if (filter === 'all') {
                state.activeTags = [];
                state.activeFavorites = false;
            } else {
                const idx = state.activeTags.indexOf(filter);
                if (idx >= 0) state.activeTags.splice(idx, 1);
                else state.activeTags.push(filter);
                state.activeFavorites = false;
            }
            // Sync chip active classes for multi-select
            container.querySelectorAll('.sheet-filter-chip').forEach(c => {
                const chipFilter = c.dataset.filter;
                const isActive = chipFilter === 'all' ? state.activeTags.length === 0 : state.activeTags.includes(chipFilter);
                c.classList.toggle('active', isActive);
                c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            bus.emit('data:reload');
            updateSheetMeta();
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
        const presetLabels = { 'short-drive': 'korte rit', 'rain': 'regenproof', 'lunch-play': 'lunch+spelen', 'peuterproof': 'peuterproof', 'outdoor-coffee': 'buiten+koffie', 'now-open': 'nu open', 'dreumesproof': 'dreumesproof', 'terras-kids': 'terrasje + kids' };
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

    const openModal  = () => { syncModalChips(); updateModalCount(); syncResetBtn(); syncVeilPillCount(); modal.classList.add('open'); overlay.classList.add('open'); trapFocus(modal); if (typeof window.pushNavState === 'function') window.pushNavState('filter-modal'); const ann = document.getElementById('sr-announcer'); if (ann) ann.textContent = 'Filter paneel geopend'; };
    const closeModal = () => { if (modal._focusTrapHandler) modal.removeEventListener('keydown', modal._focusTrapHandler); modal.classList.remove('open'); overlay.classList.remove('open'); const ann = document.getElementById('sr-announcer'); if (ann) ann.textContent = 'Filter paneel gesloten'; };

    if (btn) btn.addEventListener('click', openModal);
    // "Filters" preset chip in sheet also opens this modal
    const filtersPreset = document.getElementById('sheet-preset-filters');
    if (filtersPreset) filtersPreset.addEventListener('click', openModal);
    // Map filter button opens this modal via bus event
    bus.on('filtermodal:open', openModal);
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
            else if (action === 'preset')   { state.activePreset = state.activePreset === value ? null : value; }
            else if (action === 'foodfit')  { state.activeFoodFit = state.activeFoodFit === value ? null : value; }
            else if (action === 'practical') { state.activePractical[value] = !state.activePractical[value]; }
            else if (action === 'priceband') { state.activePriceBand = state.activePriceBand === value ? null : value; }
            syncModalChips(); updateMoreBadge(); syncResetBtn(); syncVeilPillCount();
            // Live update: reload data immediately so results + count update in real-time
            bus.emit('data:reload');
        });
    });

    // Listen for data loaded to update the modal count live
    bus.on('data:loaded', (count) => {
        const btn = document.getElementById('filter-modal-apply');
        if (btn) btn.textContent = count === 1 ? 'Toon 1 resultaat' : `Toon ${count} resultaten`;
    });

    // Gradient veil progressive disclosure
    const veilContainer = document.getElementById('filter-more-container');
    const veilPill = document.getElementById('filter-more-pill');
    const collapseBtn = document.getElementById('filter-more-collapse');
    if (veilPill && veilContainer) {
        // Measure full content height for transition
        const content = document.getElementById('filter-more-content');
        if (content) {
            requestAnimationFrame(() => {
                veilContainer.style.setProperty('--layer2-full-height', content.scrollHeight + 'px');
            });
        }
        veilPill.addEventListener('click', () => {
            veilContainer.classList.add('expanded');
            veilPill.setAttribute('aria-expanded', 'true');
        });
    }
    if (collapseBtn && veilContainer) {
        collapseBtn.addEventListener('click', () => {
            veilContainer.classList.remove('expanded');
            if (veilPill) veilPill.setAttribute('aria-expanded', 'false');
            veilContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    // Reset all filters button
    const resetBtn = document.getElementById('filter-modal-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Full canonical reset of all filter state
            state.activeTags = [];
            state.activeFavorites = false;
            state.activeWeather = null;
            state.activeAgeGroup = null;
            state.activeFacilities = { coffee: false, diaper: false, alcohol: false };
            state.activeRadius = null;
            state.activePreset = null;
            state.activeFoodFit = null;
            state.activePriceBand = null;
            state.activePractical = { parking: false, buggy: false };
            state.activeSort = 'default';
            // Sync all filter chip surfaces (modal + sheet)
            syncModalChips(); updateMoreBadge(); syncResetBtn(); syncVeilPillCount();
            // Sync main chip row
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const firstChip = document.querySelector('.chip');
            if (firstChip) firstChip.classList.add('active');
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) sortSelect.value = 'relevance';
            bus.emit('data:reload');
        });
    }
    function syncResetBtn() {
        if (!resetBtn) return;
        let count = 0;
        if (state.activeWeather) count++;
        if (state.activeAgeGroup) count++;
        if (state.activeFacilities.coffee || state.activeFacilities.diaper || state.activeFacilities.alcohol) count++;
        if (state.activeRadius) count++;
        if (state.activePreset) count++;
        if (state.activeFoodFit) count++;
        if (state.activePriceBand) count++;
        if (state.activePractical.parking || state.activePractical.buggy) count++;
        if (state.activeTag === 'favorites') count++;
        resetBtn.classList.toggle('visible', count > 0);
    }

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
        else if (action === 'preset')   active = state.activePreset === value;
        else if (action === 'foodfit')  active = state.activeFoodFit === value;
        else if (action === 'practical') active = !!state.activePractical[value];
        else if (action === 'priceband') active = state.activePriceBand === value;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    // Auto-expand collapsed section if any collapsed filter is active
    autoExpandIfActive();
}

function autoExpandIfActive() {
    const container = document.getElementById('filter-more-container');
    const pill = document.getElementById('filter-more-pill');
    if (!container) return;
    let hasActive = false;
    if (state.activeFacilities.coffee || state.activeFacilities.diaper || state.activeFacilities.alcohol) hasActive = true;
    if (state.activeFoodFit) hasActive = true;
    if (state.activePractical.parking || state.activePractical.buggy) hasActive = true;
    if (state.activePriceBand) hasActive = true;
    if (state.activeRadius) hasActive = true;
    if (state.activeTag === 'favorites') hasActive = true;
    if (hasActive && !container.classList.contains('expanded')) {
        container.classList.add('expanded');
        if (pill) pill.setAttribute('aria-expanded', 'true');
    }
}

function syncVeilPillCount() {
    const countEl = document.getElementById('filter-more-pill-count');
    if (!countEl) return;
    let count = 0;
    if (state.activeFacilities.coffee || state.activeFacilities.diaper || state.activeFacilities.alcohol) count++;
    if (state.activeFoodFit) count++;
    if (state.activePractical.parking || state.activePractical.buggy) count++;
    if (state.activePriceBand) count++;
    if (state.activeRadius) count++;
    if (state.activeTag === 'favorites') count++;
    countEl.textContent = count > 0 ? `· ${count} actief` : '';
}

function updateModalCount() {
    const btn = document.getElementById('filter-modal-apply');
    if (!btn) return;
    const count = state.allLocations.length;
    btn.textContent = count === 1 ? 'Toon 1 resultaat' : `Toon ${count} resultaten`;
}

function updateMoreBadge() {
    const count = getAdvancedFilterCount();
    const badge = document.getElementById('filter-more-badge');
    if (badge) { badge.textContent = count || ''; badge.hidden = !count; }
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
            listEl.innerHTML = '<div class="sheet-empty-state"><div class="sheet-empty-icon">\uD83D\uDD0D</div><p class="sheet-empty-title">Geen locaties gevonden</p><p class="sheet-empty-hint">Pas je filters aan of probeer een andere stad</p><button class="sheet-empty-reset">Alle filters wissen</button></div>';
            listEl.querySelector('.sheet-empty-reset')?.addEventListener('click', () => bus.emit('filters:resetall'));
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
            bus.emit('sheet:open', parseInt(card.dataset.locId, 10));
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!e.target.closest('.scan-fav')) {
                    bus.emit('sheet:open', parseInt(card.dataset.locId, 10));
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

function getScoreVerbalLabel(total) {
    if (total >= 8.5) return 'Uitstekend voor peuters';
    if (total >= 7) return 'Heel goed voor peuters';
    if (total >= 5) return 'Goed voor peuters';
    return 'Redelijk voor peuters';
}

function renderInSheetDetail(loc) {
    const photo = getPhotoData(loc);
    const typeLbl = TYPE_LABELS[loc.type] || loc.type;
    const googleMapsUrl = (loc.lat && loc.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}` : '';
    const isFav = isFavorite(loc.id);
    const favClass = isFav ? ' active' : '';

    // Score
    const weather = state.isRaining ? 'rain' : state.isSunny ? 'sun' : null;
    const v2 = computePeuterScoreV2(loc, { weather, dayOfWeek: new Date().getDay() });
    const totalScore = v2.total;
    const scoreTier = getScoreTier(totalScore);
    const scoreVerbal = getScoreVerbalLabel(totalScore);

    // Score breakdown
    let scoreBreakdownHtml = '';
    try {
        const dims = Object.values(v2.dimensions);
        const barsHtml = dims.map(d => {
            const pct = d.score * 10;
            const tone = d.score >= 8 ? 'strong' : d.score >= 5 ? 'good' : 'basic';
            return `<div class="score-bar-row">
                <span class="score-bar-label">${d.label}</span>
                <div class="score-bar-track"><div class="score-bar-fill score-bar-fill--${tone}" style="width:${pct}%"></div></div>
                <span class="score-bar-value">${d.score}/10</span>
            </div>`;
        }).join('');
        scoreBreakdownHtml = `<div class="score-breakdown" id="score-breakdown">
            <button class="score-breakdown-toggle" onclick="this.closest('.score-breakdown').classList.toggle('open')">
                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                Waarom deze score?
            </button>
            <div class="score-breakdown-bars">${barsHtml}</div>
        </div>`;
    } catch(e) { /* v2 breakdown not available */ }

    const travelInfo = state.lastTravelTimes?.[loc.id];
    const distLabel = getDistanceLabel(loc, travelInfo);
    const openStatus = getOpenStatus(loc);
    const sterkePunten = getSterkePunten(loc);
    const trustBullets = getTrustBullets(loc);
    const practicalBullets = getPracticalBullets(loc);

    // Bento grid data for Tier 2
    const bentoItems = [];
    if (loc.weather) {
        const wLabel = loc.weather === 'indoor' ? 'Binnen' : loc.weather === 'outdoor' ? 'Buiten' : 'Beide';
        const wIcon = loc.weather === 'indoor'
            ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        bentoItems.push({ icon: wIcon, label: 'Weer', value: wLabel });
    }
    if (loc.parking_ease) {
        const pLabel = loc.parking_ease === 'easy' ? 'Makkelijk' : 'Lastig';
        bentoItems.push({ icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', label: 'Parkeren', value: pLabel });
    }
    if (loc.coffee != null) {
        bentoItems.push({ icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>', label: 'Koffie', value: loc.coffee ? 'Ja' : 'Nee' });
    }
    if (loc.diaper != null) {
        bentoItems.push({ icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><circle cx="12" cy="12" r="10"/></svg>', label: 'Verschonen', value: loc.diaper ? 'Ja' : 'Nee' });
    }
    if (loc.crowd_pattern) {
        const cLabel = loc.crowd_pattern.includes('rustig') ? 'Rustig' : loc.crowd_pattern.includes('druk') ? 'Druk' : 'Gemiddeld';
        bentoItems.push({ icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Drukte', value: cLabel });
    }
    if (loc.buggy_friendliness) {
        const bLabel = loc.buggy_friendliness === 'easy' ? 'Makkelijk' : 'Lastig';
        bentoItems.push({ icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>', label: 'Buggy', value: bLabel });
    }

    // Meta line
    const metaParts = [escapeHtml(typeLbl)];
    if (distLabel) metaParts.push(escapeHtml(distLabel));
    if (openStatus) metaParts.push(`<span class="dt-status dt-status--${openStatus.color}">${escapeHtml(openStatus.label)}</span>`);
    const metaLine = metaParts.join('<span class="dt-dot">\u00b7</span>');

    // Top proof chips (above fold — max 3, curated)
    const topProof = getKenmerkenTags(loc, 3);

    // Build sections
    let si = 0;
    const sections = [];

    // Section: Highlight card — editorial + sterke punten
    if (loc.toddler_highlight || sterkePunten.length) {
        const summary = loc.toddler_highlight
            ? `<p class="dt-hl-summary">${escapeHtml(loc.toddler_highlight)}</p>` : '';
        const reasons = sterkePunten.length
            ? `<ul class="dt-hl-reasons">${sterkePunten.slice(0, 4).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : '';
        sections.push(`<div class="dt-card dt-card--highlight" style="--si:${si++}">
            <div class="dt-card-header">Waarom goed voor peuters</div>
            ${summary}${reasons}
        </div>`);
    }

    // Section: Bento grid — replaces flat facility chips
    if (bentoItems.length) {
        sections.push(`<div class="dt-section" style="--si:${si++}">
            <div class="dt-label">Faciliteiten</div>
            <div class="dt-bento">${bentoItems.map(b => `<div class="dt-bento-cell">
                <span class="dt-bento-icon">${b.icon}</span>
                <span class="dt-bento-label">${escapeHtml(b.label)}</span>
                <span class="dt-bento-value">${escapeHtml(b.value)}</span>
            </div>`).join('')}</div>
        </div>`);
    }

    // Section: Practical + hours
    const infoRows = [];
    if (loc.opening_hours || loc.always_open) {
        const hoursText = loc.always_open ? 'Altijd open' : loc.opening_hours;
        infoRows.push(`<div class="dt-row"><svg class="dt-row-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>${escapeHtml(hoursText)}</span></div>`);
    }
    practicalBullets.slice(0, 4).forEach(b => {
        infoRows.push(`<div class="dt-row"><span class="dt-row-dot"></span><span>${escapeHtml(b)}</span></div>`);
    });
    if (infoRows.length) {
        sections.push(`<div class="dt-section" style="--si:${si++}">
            <div class="dt-label">Praktisch</div>
            <div class="dt-rows">${infoRows.join('')}</div>
        </div>`);
    }

    // Tier 3: Progressive disclosure — score breakdown + description + trust
    const tier3Parts = [];
    if (scoreBreakdownHtml) {
        tier3Parts.push(scoreBreakdownHtml);
    }
    if (loc.description) {
        tier3Parts.push(`<div class="dt-section">
            <div class="dt-label">Over deze plek</div>
            <div class="detail-desc-wrap">
                <p class="detail-desc-text">${escapeHtml(loc.description)}</p>
                <button class="detail-desc-toggle">Lees meer</button>
            </div>
        </div>`);
    }
    if (trustBullets.length) {
        tier3Parts.push(`<div class="dt-trust">${trustBullets.map(b =>
            `<span class="dt-trust-item"><svg class="dt-trust-check" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>${escapeHtml(b)}</span>`
        ).join('')}</div>`);
    }
    if (tier3Parts.length) {
        sections.push(`<details class="dt-more-details" style="--si:${si++}">
            <summary class="dt-more-toggle">Meer details</summary>
            <div class="dt-more-content">${tier3Parts.join('')}</div>
        </details>`);
    }

    // Retention tail: "Vergelijkbaar in de buurt"
    const nearbyLocations = findNearbyByType(loc, 3);
    if (nearbyLocations.length) {
        sections.push(`<div class="dt-section dt-nearby" style="--si:${si++}">
            <div class="dt-label">Vergelijkbaar in de buurt</div>
            <div class="dt-nearby-scroll">${nearbyLocations.map(n => renderSheetScanCard(n, {})).join('')}</div>
        </div>`);
    }

    // Future placeholder: claim CTA
    sections.push(`<div class="dt-section dt-future-cta" style="--si:${si++}">
        <button class="dt-claim-btn" disabled>
            <span>Beheer deze locatie</span>
            <span class="dt-claim-soon">Binnenkort beschikbaar</span>
        </button>
    </div>`);

    // Score — typographic, not badge
    const scoreHtml = totalScore != null
        ? `<span class="dt-score dt-score--${scoreTier}">${totalScore}</span>` : '';

    // Verdict block — tier-colored emotional moment
    const verdictHtml = scoreVerbal
        ? `<div class="dt-verdict-block dt-verdict--${scoreTier}"><span class="dt-verdict-text">${escapeHtml(scoreVerbal)}</span></div>` : '';

    // Proof chips
    const proofHtml = topProof.length
        ? `<div class="dt-proof">${topProof.map(t => `<span class="dt-chip">${escapeHtml(t.label)}</span>`).join('')}</div>` : '';

    // CTA row
    const ctaHtml = `<div class="dt-cta">
        ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="dt-cta-btn dt-cta--primary"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Route</a>` : ''}
        ${loc.website ? `<a href="${escapeHtml(loc.website)}" target="_blank" rel="noopener" class="dt-cta-btn dt-cta--ghost"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Website</a>` : ''}
        <button class="dt-cta-btn dt-cta--ghost" data-share-loc="${loc.id}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>Deel</button>
    </div>`;

    return `
        <div class="detail-hero-wrap">
            <div class="photo-container detail-hero-photo" style="--photo-color: ${photo.photoColor || '#E8D5C4'}">
                <img class="sheet-hero-img" src="${escapeHtml(photo.imgSrc || '')}" alt="${escapeHtml(loc.name)}" loading="lazy">
            </div>
            <div class="dt-hero-veil"></div>
            <button class="detail-float-btn detail-back-btn" aria-label="Terug">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="detail-float-btn detail-fav-btn${favClass}" data-loc-id="${loc.id}" aria-label="${isFav ? 'Verwijder favoriet' : 'Bewaar'}"${isFav ? ' aria-pressed="true"' : ' aria-pressed="false"'}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button class="detail-float-btn detail-close-btn" aria-label="Sluiten">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="dt-above-fold">
            <div class="dt-title-row">
                <h2 class="dt-name">${escapeHtml(loc.name)}</h2>
                ${scoreHtml}
            </div>
            <div class="dt-meta">${metaLine}</div>
            ${verdictHtml}
            ${proofHtml}
            ${ctaHtml}
        </div>
        ${sections.join('')}
    `;
}

/* ===================================================
   SWIPE-TO-DISMISS (Detail View)
   Pointer-event gesture recognizer with scroll-lock
   timeout, DOM tree walk, and rubber-band resistance.
   Based on Vaul (shadcn/ui drawer) battle-tested patterns.
   =================================================== */

function attachDetailSwipeDismiss(detailEl) {
    let startY = 0, startX = 0, startTime = 0;
    let deltaY = 0, state = 'idle'; // idle | pending | dragging
    let lastScrollTime = 0;
    let pointerId = null;

    // Scroll lock: block dismiss for 100ms after any scroll inside detail
    function onContentScroll() {
        lastScrollTime = Date.now();
    }
    detailEl.addEventListener('scroll', onContentScroll, { passive: true, capture: true });

    // Walk DOM tree checking scrollable ancestors
    function isAnyAncestorScrolled(target) {
        let el = target;
        while (el && el !== detailEl) {
            if (el.scrollHeight > el.clientHeight + 2 && el.scrollTop > 1) return true;
            el = el.parentElement;
        }
        return detailEl.scrollTop > 1;
    }

    function onPointerDown(e) {
        // Multi-touch → ignore (pinch)
        if (e.touches && e.touches.length > 1) return;
        if (sheetEl.classList.contains('detail-closing')) return;
        startY = e.clientY ?? e.touches[0].clientY;
        startX = e.clientX ?? e.touches[0].clientX;
        startTime = Date.now();
        deltaY = 0;
        state = 'pending';
        if (e.pointerId != null) {
            pointerId = e.pointerId;
            try { detailEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        }
    }

    function onPointerMove(e) {
        if (state === 'idle') return;
        const currentY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        const currentX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        deltaY = currentY - startY;
        const deltaX = currentX - startX;

        if (state === 'pending') {
            const absDY = Math.abs(deltaY);
            const absDX = Math.abs(deltaX);
            // Dead zone: haven't committed to a direction yet
            if (absDY < DISMISS_COMMIT_PX && absDX < DISMISS_COMMIT_PX) return;
            // Horizontal → cancel (don't interfere with horizontal gestures)
            if (absDX > absDY * 1.5) { state = 'idle'; return; }
            // Upward → native scroll, cancel
            if (deltaY < 0) { state = 'idle'; return; }
            // Scroll lock active → block
            if (Date.now() - lastScrollTime < SCROLL_LOCK_TIMEOUT_MS) { state = 'idle'; return; }
            // Any ancestor scrolled → block
            if (isAnyAncestorScrolled(e.target)) { state = 'idle'; return; }
            // Commit to dragging
            state = 'dragging';
            detailEl.classList.add('swipe-active');
            detailEl.style.willChange = 'transform, opacity';
        }

        if (state === 'dragging') {
            e.preventDefault(); // Steal from native scroll
            // Rubber-band resistance beyond threshold
            const applied = deltaY <= DISMISS_THRESHOLD_PX
                ? deltaY
                : DISMISS_THRESHOLD_PX + (deltaY - DISMISS_THRESHOLD_PX) * DISMISS_RUBBER_FACTOR;
            const opacity = Math.max(0.3, 1 - applied / (DISMISS_THRESHOLD_PX * 3));
            detailEl.style.transform = `translateY(${applied}px)`;
            detailEl.style.opacity = String(opacity);
        }
    }

    function onPointerUp() {
        if (state !== 'dragging') { state = 'idle'; return; }
        const elapsed = Date.now() - startTime;
        const velocity = elapsed > 0 ? deltaY / elapsed : 0; // px/ms
        const shouldDismiss =
            (deltaY >= DISMISS_THRESHOLD_PX) ||
            (velocity >= DISMISS_VELOCITY_PX_MS && deltaY >= DISMISS_MIN_DIST_FOR_VELOCITY);

        if (shouldDismiss) {
            // Animate out before cleanup
            detailEl.style.transition = `transform ${SNAP_BACK_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${SNAP_BACK_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
            detailEl.style.transform = `translateY(${window.innerHeight}px)`;
            detailEl.style.opacity = '0';
            const onTransEnd = () => {
                detailEl.style.transition = '';
                cleanup();
                hideDetailInSheet();
            };
            detailEl.addEventListener('transitionend', onTransEnd, { once: true });
            setTimeout(onTransEnd, SNAP_BACK_MS + 50); // fallback
        } else {
            // Snap back
            detailEl.classList.add('swipe-snap-back');
            detailEl.style.transform = 'translateY(0)';
            detailEl.style.opacity = '1';
            const onTransEnd = () => {
                detailEl.classList.remove('swipe-snap-back', 'swipe-active');
                detailEl.style.willChange = '';
                detailEl.style.transform = '';
                detailEl.style.opacity = '';
            };
            detailEl.addEventListener('transitionend', onTransEnd, { once: true });
            setTimeout(onTransEnd, SNAP_BACK_MS + 50); // fallback
        }
        state = 'idle';
        if (pointerId != null) {
            try { detailEl.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
            pointerId = null;
        }
    }

    // Use pointer events where available (unified mouse+touch), fallback to touch
    const usePointer = 'PointerEvent' in window;
    if (usePointer) {
        detailEl.addEventListener('pointerdown', onPointerDown);
        detailEl.addEventListener('pointermove', onPointerMove, { passive: false });
        detailEl.addEventListener('pointerup', onPointerUp);
        detailEl.addEventListener('pointercancel', onPointerUp);
    } else {
        detailEl.addEventListener('touchstart', onPointerDown, { passive: true });
        detailEl.addEventListener('touchmove', onPointerMove, { passive: false });
        detailEl.addEventListener('touchend', onPointerUp, { passive: true });
        detailEl.addEventListener('touchcancel', onPointerUp, { passive: true });
    }

    // iOS workaround: reset stale drag state on touchend (pointerup can fire late)
    function iosTouchEndReset() { if (state === 'pending') state = 'idle'; }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        window.addEventListener('touchend', iosTouchEndReset, { passive: true });
    }

    // Cleanup function — removes all listeners
    function cleanup() {
        detailEl.removeEventListener('scroll', onContentScroll, { capture: true });
        if (usePointer) {
            detailEl.removeEventListener('pointerdown', onPointerDown);
            detailEl.removeEventListener('pointermove', onPointerMove);
            detailEl.removeEventListener('pointerup', onPointerUp);
            detailEl.removeEventListener('pointercancel', onPointerUp);
        } else {
            detailEl.removeEventListener('touchstart', onPointerDown);
            detailEl.removeEventListener('touchmove', onPointerMove);
            detailEl.removeEventListener('touchend', onPointerUp);
            detailEl.removeEventListener('touchcancel', onPointerUp);
        }
        window.removeEventListener('touchend', iosTouchEndReset);
        detailEl.classList.remove('swipe-active', 'swipe-snap-back');
        detailEl.style.transform = '';
        detailEl.style.opacity = '';
        detailEl.style.willChange = '';
        detailEl.style.transition = '';
        state = 'idle';
    }

    return cleanup;
}

export function showDetailInSheet(locationId) {
    if (!sheetEl) return;
    const loc = state.allLocations.find(l => l.id === locationId);
    if (!loc) return;

    const detailEl = document.getElementById('sheet-detail');
    if (!detailEl) return;

    // Render detail content
    detailEl.innerHTML = renderInSheetDetail(loc);

    // Photo fade-in with subtle scale
    const heroImg = detailEl.querySelector('.sheet-hero-img');
    if (heroImg) {
        if (heroImg.complete && heroImg.naturalWidth > 0) heroImg.classList.add('loaded');
        else heroImg.addEventListener('load', () => heroImg.classList.add('loaded'), { once: true });
    }

    // Switch view
    sheetEl.classList.add('show-detail');
    setSheetState('full');

    // Scroll detail container to top
    detailEl.scrollTop = 0;

    // Attach swipe-to-dismiss gesture
    if (_dismissCleanup) _dismissCleanup();
    _dismissCleanup = attachDetailSwipeDismiss(detailEl);

    // Escape key dismiss
    const escHandler = (e) => { if (e.key === 'Escape') hideDetailInSheet(); };
    document.addEventListener('keydown', escHandler);
    // Store for cleanup
    detailEl._escHandler = escHandler;

    // Push history state for browser-back support
    if (typeof window.pushNavState === 'function') window.pushNavState('in-sheet-detail', { locationId });

    // Back button + close button
    detailEl.querySelector('.detail-back-btn')?.addEventListener('click', hideDetailInSheet);
    detailEl.querySelector('.detail-close-btn')?.addEventListener('click', hideDetailInSheet);

    // Fav button (with haptic + spring)
    const favBtn = detailEl.querySelector('.detail-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const locId = Number(favBtn.dataset.locId);
            window.toggleFavorite(locId, favBtn);
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(10);
            // Spring animation
            favBtn.classList.add('detail-fav-spring');
            favBtn.addEventListener('animationend', () => favBtn.classList.remove('detail-fav-spring'), { once: true });
            // Update aria-pressed
            const nowFav = !favBtn.classList.contains('active');
            favBtn.setAttribute('aria-pressed', String(nowFav));
        });
    }

    // Share button
    const shareBtn = detailEl.querySelector('[data-share-loc]');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            bus.emit('location:share', loc, loc.region);
        });
    }

    // "Lees meer" toggles
    detailEl.querySelectorAll('.detail-desc-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrap = btn.closest('.detail-desc-wrap');
            if (wrap) {
                wrap.classList.toggle('expanded');
                btn.textContent = wrap.classList.contains('expanded') ? 'Lees minder' : 'Lees meer';
            }
        });
    });
}

export function hideDetailInSheet() {
    if (!sheetEl) return;
    const detailEl = document.getElementById('sheet-detail');

    // Clean up swipe-to-dismiss
    if (_dismissCleanup) { _dismissCleanup(); _dismissCleanup = null; }

    // Clean up escape handler
    if (detailEl?._escHandler) {
        document.removeEventListener('keydown', detailEl._escHandler);
        detailEl._escHandler = null;
    }

    // Clear inline swipe styles before exit animation
    if (detailEl) {
        detailEl.style.transform = '';
        detailEl.style.opacity = '';
        detailEl.style.willChange = '';
        detailEl.style.transition = '';
    }

    // Exit animation
    if (detailEl) {
        sheetEl.classList.add('detail-closing');
        const onEnd = () => {
            sheetEl.classList.remove('show-detail', 'detail-closing');
            detailEl.innerHTML = '';
            setSheetState('half');
        };
        detailEl.addEventListener('animationend', onEnd, { once: true });
        // Fallback if animation doesn't fire
        setTimeout(onEnd, 350);
    } else {
        sheetEl.classList.remove('show-detail');
        setSheetState('half');
    }
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

// GPS error toast — show inside bottom sheet for mobile visibility
bus.on('gps:error', ({ type, message }) => {
    const sheetEl2 = document.getElementById('bottom-sheet');
    if (!sheetEl2) return;

    // Remove any existing toast
    sheetEl2.querySelector('.gps-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'gps-toast';
    toast.innerHTML = `
        <span class="gps-toast-icon">\uD83D\uDCCD</span>
        <span class="gps-toast-text">Locatie niet gevonden \u2014 <button class="gps-toast-action">typ je stad</button></span>
        <button class="gps-toast-close" aria-label="Sluiten">\u2715</button>
    `;

    // Wire up action buttons — focus the CITY input (not the location name search)
    toast.querySelector('.gps-toast-action')?.addEventListener('click', () => {
        toast.remove();
        // Focus the city/location input which triggers geocoding
        const cityInput = document.getElementById('location-input');
        if (cityInput) {
            cityInput.focus();
            cityInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Show popular cities as fallback options
        const popular = document.getElementById('popular-cities');
        if (popular) popular.classList.remove('hidden');
    });
    toast.querySelector('.gps-toast-close')?.addEventListener('click', () => {
        toast.remove();
    });

    // Insert at top of sheet content
    const content = sheetEl2.querySelector('.sheet-content') || sheetEl2.querySelector('[data-sheet-content]') || sheetEl2.children[0];
    if (content) content.prepend(toast);
    else sheetEl2.prepend(toast);

    // Auto-dismiss after 6s
    setTimeout(() => toast.remove(), 6000);
});
