import { state, DESKTOP_WIDTH, TYPE_LABELS } from './state.js';
import { escapeHtml } from './utils.js';
import bus from './bus.js';
import { renderCompactCard, renderSheetPreview } from './templates.js';

/* ===================================================
   CONTINUOUS SHEET ENGINE
   Fluid per-pixel positioning with spring physics
   and progressive UI morphing. Apple Maps reference.
   =================================================== */

// --- Rest points (Y = px from viewport top to sheet top) ---
let restPoints = {};

// --- DOM ---
let sheetEl, contentEl, listEl, dragHandle;
const morphEls = {};

// --- Position state ---
let sheetY = 0;
let currentState = 'hidden';
let animId = null;

// --- Drag state ---
let isDragging = false;
let dragStartY = 0;
let dragStartSheetY = 0;
let lastTouchY = 0;
let lastTouchTime = 0;
let dragVelocity = 0;

// --- Content drag ---
let contentDragActive = false;
let contentStartY = 0;

// --- Spring config ---
const SPRING_K = 380;       // stiffness
const SPRING_D = 30;        // damping
const SPRING_M = 1;         // mass
const REST_EPS = 0.5;       // settle threshold (px)
const VEL_EPS = 50;         // settle velocity threshold (px/s)
const FLICK_THRESHOLD = 0.4; // px/ms for directional snap

/* ===================================================
   INIT
   =================================================== */

function computeRestPoints() {
    const vh = window.innerHeight;
    restPoints = {
        hidden: vh + 20,
        peek:   vh - 160,  // compact peek: handle + search + presets only
        half:   Math.round(vh * 0.45),
        full:   getSafeAreaTop()
    };
}

function getSafeAreaTop() {
    const el = document.createElement('div');
    el.style.cssText = 'height:env(safe-area-inset-top,0px);position:fixed;top:0;visibility:hidden;pointer-events:none;';
    document.body.appendChild(el);
    const v = el.getBoundingClientRect().height || 0;
    el.remove();
    return v;
}

export function initSheet() {
    if (window.innerWidth >= DESKTOP_WIDTH) return;

    sheetEl    = document.getElementById('bottom-sheet');
    contentEl  = document.getElementById('sheet-content');
    listEl     = document.getElementById('sheet-list');
    dragHandle = document.getElementById('sheet-drag-handle');
    if (!sheetEl) return;

    // Cache morph targets
    morphEls.filterChips = document.getElementById('sheet-filter-chips');
    morphEls.tabs        = document.getElementById('sheet-tabs');
    morphEls.meta        = document.querySelector('.sheet-meta');
    morphEls.forecast    = document.getElementById('sheet-forecast');
    morphEls.weekPicks   = document.getElementById('sheet-week-picks');
    morphEls.overlay     = document.getElementById('sheet-overlay');
    morphEls.list        = listEl;

    computeRestPoints();

    // Kill CSS transitions — everything is JS-driven
    sheetEl.style.transition = 'none';

    // Set initial position (hidden, off-screen)
    sheetY = restPoints.hidden;
    sheetEl.style.transform = `translateY(${sheetY}px)`;

    // --- Drag handle touch ---
    dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
    dragHandle.addEventListener('touchmove', onDragMove, { passive: false });
    dragHandle.addEventListener('touchend', onDragEnd, { passive: true });

    // --- Content area touch (drag-down from scroll top) ---
    contentEl.addEventListener('touchstart', onContentStart, { passive: true });
    contentEl.addEventListener('touchmove', onContentMove, { passive: false });
    contentEl.addEventListener('touchend', onContentEnd, { passive: true });

    // --- Search ---
    initSearchPill();

    // --- Filters ---
    initSheetFilterChips();
    initFilterModal();

    // --- Overlay click ---
    morphEls.overlay?.addEventListener('click', () => setSheetState('half'));

    // --- Keyboard ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sheetEl?.classList.contains('search-active')) {
                cancelSearch(); e.preventDefault();
            } else if (currentState === 'full') {
                setSheetState('half'); e.preventDefault();
            }
        }
    });

    // --- Resize ---
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            computeRestPoints();
            if (!isDragging && restPoints[currentState] != null) {
                updatePosition(restPoints[currentState]);
            }
        }, 100);
    });

    // Start in peek (springs up from hidden)
    setSheetState('peek');
}

/* ===================================================
   POSITION + MORPHING
   =================================================== */

function updatePosition(y) {
    sheetY = y;
    sheetEl.style.transform = `translateY(${y}px)`;
    applyMorphs(y);
}

function clamp(v) { return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function applyMorphs(y) {
    const { peek: peekY, half: halfY, full: fullY } = restPoints;

    // p1: 0 at peek → 1 at half (sheet rising)
    const p1 = clamp((peekY - y) / (peekY - halfY));
    // p2: 0 at half → 1 at full
    const p2 = clamp((halfY - y) / (halfY - fullY));

    // --- Sheet geometry ---
    const rTop = lerp(16, 0, p2);
    const rBot = lerp(16, 0, p1);
    sheetEl.style.borderRadius = `${rTop}px ${rTop}px ${rBot}px ${rBot}px`;

    const insetLR  = lerp(8, 4, p1) * (1 - p2);
    const insetBot = lerp(8, 0, p1);
    sheetEl.style.left   = insetLR + 'px';
    sheetEl.style.right  = insetLR + 'px';
    sheetEl.style.bottom = insetBot + 'px';

    // --- Child morphs (staggered fade-in as sheet rises) ---
    setMorphOpacity(morphEls.tabs,        clamp((p1 - 0.02) / 0.20)); // tabs appear very early
    setMorphOpacity(morphEls.filterChips, clamp((p1 - 0.08) / 0.40));
    setMorphOpacity(morphEls.meta,        clamp((p1 - 0.12) / 0.35));
    setMorphOpacity(morphEls.forecast,    clamp((p1 - 0.20) / 0.45));
    setMorphOpacity(morphEls.weekPicks,   clamp((p1 - 0.18) / 0.45));
    setMorphOpacity(morphEls.list,        clamp((p1 - 0.12) / 0.50));

    // --- Content scroll ---
    const canScroll = p1 > 0.35;
    contentEl.style.overflowY  = canScroll ? 'auto' : 'hidden';
    contentEl.style.touchAction = canScroll ? 'pan-y' : 'none';

    // --- Overlay (dims background toward full) ---
    if (morphEls.overlay) {
        const o = p2 * 0.3;
        morphEls.overlay.style.opacity = o;
        morphEls.overlay.style.display = o > 0.01 ? 'block' : 'none';
        morphEls.overlay.style.pointerEvents = o > 0.05 ? 'auto' : 'none';
    }
}

function setMorphOpacity(el, opacity) {
    if (!el) return;
    el.style.opacity = opacity;
    el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none';
    // Collapse hidden elements so they don't take layout space (fixes peek whitespace)
    if (opacity < 0.01) {
        el.style.maxHeight = '0';
        el.style.overflow = 'hidden';
        el.style.marginTop = '0';
        el.style.marginBottom = '0';
        el.style.paddingTop = '0';
        el.style.paddingBottom = '0';
    } else {
        el.style.maxHeight = '';
        el.style.overflow = '';
        el.style.marginTop = '';
        el.style.marginBottom = '';
        el.style.paddingTop = '';
        el.style.paddingBottom = '';
    }
}

/* ===================================================
   SPRING ANIMATION
   =================================================== */

function springTo(target, initVel = 0, onDone) {
    cancelAnimationFrame(animId);
    let pos = sheetY;
    let vel = initVel * 1000; // px/ms → px/s
    let lastT = performance.now();

    function tick(now) {
        const dt = Math.min((now - lastT) / 1000, 0.033);
        lastT = now;

        const dx = pos - target;
        const force = -SPRING_K * dx - SPRING_D * vel;
        vel += (force / SPRING_M) * dt;
        pos += vel * dt;

        if (Math.abs(dx) < REST_EPS && Math.abs(vel) < VEL_EPS) {
            updatePosition(target);
            animId = null;
            if (onDone) onDone();
            return;
        }

        updatePosition(pos);
        animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
}

/* ===================================================
   DRAG HANDLING
   =================================================== */

function onDragStart(e) {
    cancelAnimationFrame(animId);
    animId = null;
    isDragging = true;

    const t = e.touches[0];
    dragStartY      = t.clientY;
    dragStartSheetY = sheetY;
    lastTouchY      = t.clientY;
    lastTouchTime   = performance.now();
    dragVelocity    = 0;

    // Performance: disable blur during drag
    sheetEl.style.backdropFilter        = 'none';
    sheetEl.style.webkitBackdropFilter  = 'none';
    sheetEl.style.background            = 'rgba(255, 252, 249, 0.97)';
}

function onDragMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const t   = e.touches[0];
    const now = performance.now();
    const dt  = now - lastTouchTime;

    // Smoothed velocity
    if (dt > 0) {
        const iv = (t.clientY - lastTouchY) / dt;
        dragVelocity = dragVelocity * 0.65 + iv * 0.35;
    }
    lastTouchY    = t.clientY;
    lastTouchTime = now;

    // Apply position with rubber-banding at edges
    let newY = dragStartSheetY + (t.clientY - dragStartY);
    newY = rubberBand(newY);
    updatePosition(newY);
}

function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    // Restore blur
    sheetEl.style.backdropFilter       = '';
    sheetEl.style.webkitBackdropFilter = '';
    sheetEl.style.background           = '';

    // Find snap target & animate
    const target = findSnapTarget(sheetY, dragVelocity);
    currentState = stateNameForY(target);
    sheetEl.dataset.state = currentState;
    springTo(target, dragVelocity, () => announceState(currentState));
}

function rubberBand(y) {
    const { full: fY, peek: pY } = restPoints;
    if (y < fY) return fY - (fY - y) * 0.2;
    if (y > pY) return pY + (y - pY) * 0.2;
    return y;
}

function findSnapTarget(y, vel) {
    const pts = [restPoints.full, restPoints.half, restPoints.peek];

    // Strong flick: snap in direction
    if (Math.abs(vel) > FLICK_THRESHOLD) {
        if (vel < 0) { // flick up
            for (const p of pts) if (p < y - 30) return p;
        } else { // flick down
            for (let i = pts.length - 1; i >= 0; i--) if (pts[i] > y + 30) return pts[i];
        }
    }

    // Otherwise: nearest
    let best = pts[0], dist = Infinity;
    for (const p of pts) {
        const d = Math.abs(y - p);
        if (d < dist) { dist = d; best = p; }
    }
    return best;
}

function stateNameForY(y) {
    let best = 'peek', dist = Infinity;
    for (const n of ['peek', 'half', 'full']) {
        const d = Math.abs(y - restPoints[n]);
        if (d < dist) { dist = d; best = n; }
    }
    return best;
}

/* ===================================================
   CONTENT DRAG (drag-down from scrolled content)
   =================================================== */

function onContentStart(e) {
    contentStartY    = e.touches[0].clientY;
    contentDragActive = false;
}

function onContentMove(e) {
    if (currentState !== 'full' && currentState !== 'half') return;
    if (contentEl.scrollTop > 0) return;

    const dy = e.touches[0].clientY - contentStartY;
    if (dy > 10 && !contentDragActive) {
        contentDragActive = true;
        // Bootstrap into main drag
        dragStartY       = e.touches[0].clientY;
        dragStartSheetY  = sheetY;
        lastTouchY       = e.touches[0].clientY;
        lastTouchTime    = performance.now();
        dragVelocity     = 0;
        isDragging       = true;
        cancelAnimationFrame(animId);
        animId = null;
        sheetEl.style.backdropFilter       = 'none';
        sheetEl.style.webkitBackdropFilter = 'none';
        sheetEl.style.background           = 'rgba(255, 252, 249, 0.97)';
    }
    if (contentDragActive) {
        e.preventDefault();
        onDragMove(e);
    }
}

function onContentEnd() {
    if (contentDragActive) {
        onDragEnd();
        contentDragActive = false;
    }
}

/* ===================================================
   PUBLIC API
   =================================================== */

export function setSheetState(newState) {
    if (!sheetEl || !['hidden', 'peek', 'half', 'full'].includes(newState)) return;
    currentState = newState;
    sheetEl.dataset.state = newState;
    const target = restPoints[newState];
    if (target == null) return;

    if (newState === 'hidden') {
        cancelAnimationFrame(animId);
        updatePosition(target);
        announceState(newState);
        return;
    }

    springTo(target, 0, () => announceState(newState));
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
    // Update aria-expanded on bottom sheet
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
        });
        input.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (q.length < 2) { hideSuggestions(); return; }
            showSuggestions(state.allLocations.filter(l => l.name.toLowerCase().includes(q)).slice(0, 6));
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

    const openModal  = () => { syncModalChips(); updateModalCount(); modal.classList.add('open'); overlay.classList.add('open'); };
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
const BATCH = 30;

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
    const batch = _sheetLocations.slice(_renderedCount, _renderedCount + BATCH);
    if (!batch.length) return false;
    const html = batch.map(loc => renderCompactCard(loc, { travelTimes: _travelTimes })).join('');
    listEl.insertAdjacentHTML('beforeend', html);
    listEl.querySelectorAll('.compact-card:not([data-bound])').forEach(card => {
        card.dataset.bound = '1';
        card.addEventListener('click', () => bus.emit('sheet:open', parseInt(card.dataset.id, 10)));
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
    }, { root: listEl.closest('.sheet-content') || null, threshold: 0.1 });
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
   TABS
   =================================================== */

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
            if (name === 'plan') { bus.emit('view:switch', 'plan'); return; }
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
}

/* ===================================================
   BUS LISTENERS
   =================================================== */

bus.on('sheet:setstate', setSheetState);
bus.on('sheet:showlocation', showLocationInSheet);
bus.on('sheet:hidepreview', hideLocationPreview);
bus.on('sheet:renderlist', renderSheetList);
bus.on('sheet:updatemeta', updateSheetMeta);
