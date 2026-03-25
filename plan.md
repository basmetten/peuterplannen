# Plan: Filter entry in map view — dedicated filter button

## Goal
Create one clear primary filter control directly adjacent to the search bar, visually grouped as a single control cluster. Filtering should never be mistaken for a regular chip — it gets its own dedicated button with strong affordance.

## Design Direction
- Search bar remains the main width owner
- Filter button sits on the **right side** of the search bar, visually grouped (same surface/shadow)
- Sliders/filter icon, 20–22px, centered in a 48×48 tap target
- Active filter badge (count) when filters are applied
- Inactive: neutral but clearly tappable (not a chip)
- Active: stronger border/fill/accent — user sees filtering is on
- Clicking filter button → opens the existing filter modal
- Quick preset chips below search stay as secondary shortcuts, but made more recognizable as tappable
- Keep PeuterPlannen visual language: warm light surface, rounded corners, soft shadow, terracotta accent

## Current State

**Search pill** (`#map-search-pill`, lines 393-397 in app.html):
- Full-width glass pill: `left: 12px; right: 12px; top: 80px` (mobile map view)
- Contains: search icon + "Zoek & filter..." label + optional badge
- Tapping it opens the `#map-filters-overlay` panel (slides down from top)
- Glass background `rgba(250, 247, 242, 0.78)`, muted text, 16px icon at 0.7 opacity

**Filter overlay** (`#map-filters-overlay`, lines 399-464):
- Search input + GPS button + search button
- Type chip row (scrollable)
- "Meer filters" toggle with extra filter groups
- Slides down from top, z-index 4

**Preset chips**: Currently inside the overlay only — not visible until you tap the pill.

## Steps

### 1. HTML: Restructure search pill into search bar + filter button cluster
**File:** `app.html` (lines 393-397)

Replace the current `#map-search-pill` with a grouped control cluster:

```html
<div class="map-search-cluster" id="map-search-cluster">
  <!-- Search bar — main width, taps to open overlay -->
  <button class="map-search-bar" id="map-search-bar"
          onclick="openMapFilters()" role="button" tabindex="0"
          aria-label="Open zoekopties">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <span class="map-search-label">Zoek locatie...</span>
  </button>
  <!-- Filter button — dedicated, opens filter modal -->
  <button class="map-filter-btn" id="map-filter-btn"
          onclick="openMapFilterModal()"
          aria-label="Filters">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3"/>
      <path d="M1 14h6M9 8h6M17 16h6"/>
    </svg>
    <span class="map-filter-badge" id="map-filter-badge"></span>
  </button>
</div>
```

### 2. HTML: Add preset chip row below the search cluster
**File:** `app.html` (after the cluster, before the overlay)

```html
<div class="map-preset-row" id="map-preset-row">
  <button class="map-preset-chip active" onclick="toggleTag('all', event)">Alles</button>
  <button class="map-preset-chip" onclick="toggleTag('play', event)">Speeltuin</button>
  <button class="map-preset-chip" onclick="toggleTag('farm', event)">Boerderij</button>
  <button class="map-preset-chip" onclick="toggleTag('nature', event)">Natuur</button>
  <button class="map-preset-chip" onclick="toggleTag('museum', event)">Museum</button>
  <button class="map-preset-chip" onclick="toggleTag('swim', event)">Zwemmen</button>
  <button class="map-preset-chip" onclick="toggleTag('pancake', event)">Pannenkoeken</button>
  <button class="map-preset-chip" onclick="toggleTag('horeca', event)">Horeca</button>
</div>
```

### 3. CSS: Search cluster (grouped surface)
**File:** `app.css`

```css
.map-search-cluster {
  position: absolute;
  top: 80px; /* below navbar on mobile */
  left: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  gap: 0; /* no gap — visually one unit */
  background: rgba(255, 252, 249, 0.96); /* near-opaque warm white */
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden; /* children share the rounded container */
  animation: map-control-enter 0.35s ease both;
  animation-delay: 0.15s;
}
```

### 4. CSS: Search bar (left, main width)
```css
.map-search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  min-height: 48px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--pp-text-sm);
  color: var(--pp-text-secondary);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.map-search-bar svg {
  width: 20px;
  height: 20px;
  stroke: var(--pp-primary);
  fill: none;
  stroke-width: 2;
  flex-shrink: 0;
}

.map-search-bar:active {
  background: rgba(0, 0, 0, 0.03);
}
```

### 5. CSS: Filter button (right, dedicated)
```css
.map-filter-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px; /* 48px tap + padding */
  min-height: 48px;
  background: none;
  border: none;
  border-left: 1px solid rgba(0, 0, 0, 0.06); /* separator */
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s ease;
}

.map-filter-btn svg {
  width: 20px;
  height: 20px;
  stroke: var(--pp-text-secondary);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}

.map-filter-btn:active {
  background: rgba(0, 0, 0, 0.04);
}

/* Active state — filters are applied */
.map-filter-btn.has-filters {
  background: rgba(var(--pp-primary-rgb), 0.08);
  border-left-color: rgba(var(--pp-primary-rgb), 0.15);
}

.map-filter-btn.has-filters svg {
  stroke: var(--pp-primary);
}

/* Badge */
.map-filter-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--pp-primary);
  color: var(--pp-text-inverse);
  font-size: 11px;
  font-weight: 700;
  border-radius: 9px;
  display: none; /* shown via JS */
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.map-filter-badge.visible {
  display: flex;
}
```

### 6. CSS: Preset chip row (below search, secondary shortcuts)
```css
.map-preset-row {
  position: absolute;
  top: 136px; /* 80 (navbar offset) + 48 (cluster height) + 8 (gap) */
  left: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  padding: 2px 0;
  mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 24px), transparent);
  animation: map-control-enter 0.35s ease both;
  animation-delay: 0.3s; /* stagger after search cluster */
}
.map-preset-row::-webkit-scrollbar { display: none; }

.map-preset-chip {
  flex-shrink: 0;
  scroll-snap-align: start;
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 252, 249, 0.94);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--pp-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s ease, color 0.2s ease,
              border-color 0.2s ease, box-shadow 0.2s ease,
              transform 0.15s ease;
}

.map-preset-chip:active {
  transform: scale(0.96);
}

.map-preset-chip.active {
  background: var(--pp-primary);
  color: var(--pp-text-inverse);
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(212, 119, 86, 0.25);
  font-weight: 700;
}
```

### 7. CSS: Entrance animation + responsive
```css
@keyframes map-control-enter {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Adjust overlay and map-controls positioning */
body.map-view-active .map-filters-overlay {
  top: 140px; /* below preset row */
}

body.map-view-active .map-controls {
  top: calc(184px + env(safe-area-inset-top, 0px)); /* below chips */
}

/* Hide on desktop */
@media (min-width: 680px) {
  .map-search-cluster { display: none; }
  .map-preset-row { display: none; }
}
```

### 8. JS: New `openMapFilterModal()` function
**File:** `modules/filters.js`

Create a new function that opens the existing filter modal directly (the bottom-sheet style `#filter-modal`), bypassing the overlay:

```js
export function openMapFilterModal() {
  // Sync current filter state to modal chips
  syncFilterModal();
  // Open the modal
  document.getElementById('filter-modal')?.classList.add('open');
  document.getElementById('filter-modal-overlay')?.classList.add('open');
}
```

### 9. JS: Update badge logic
**File:** `modules/filters.js`

Update `updateMapPillBadge()` → `updateMapFilterBadge()`:
- Count all active non-type filters (weather, facilities, age, radius, preset)
- Show count on `#map-filter-badge` with `.visible` class
- Toggle `.has-filters` class on `#map-filter-btn`

### 10. JS: Sync preset chip row
**File:** `modules/filters.js`

Update `syncMapFilterChips()` to also sync the new `#map-preset-row` chips:
- On map view activation, sync active states
- When a preset chip is tapped, update both the row and the sidebar chips

### 11. JS: Expose new function on window
**File:** `app.js`

Add `openMapFilterModal` to the `Object.assign(window, {...})` block.

### 12. HTML: Clean up overlay
**File:** `app.html`

The overlay (`#map-filters-overlay`) can be simplified:
- Remove type chip row (now in preset row on map surface)
- Keep: search input + GPS + search button
- Keep: "Meer filters" button that opens filter modal
- Or: consider removing overlay entirely if search can be handled differently

### 13. Test & verify
- Run `/verify-change` with mobile (390px) + desktop (1280px) screenshots
- Verify search bar + filter button look like one grouped control
- Verify filter button has clear tap affordance (not a chip)
- Verify badge appears when filters are active
- Verify preset chips are visible and clearly tappable
- Verify filter modal opens from the filter button
- Verify existing overlay still works from search bar tap
- Cross-browser: test in Safari, Chrome, Firefox
- Run `npm run test:e2e`

## Files to modify

| File | Change |
|------|--------|
| `app.html` | Replace pill with search cluster + filter button, add preset row, simplify overlay |
| `app.css` | New styles for cluster, search bar, filter button, preset chips, positioning |
| `modules/filters.js` | Add `openMapFilterModal()`, update badge logic, sync preset row |
| `app.js` | Expose `openMapFilterModal` on window |

## Risks

| Risk | Mitigation |
|------|-----------|
| Filter modal not designed for map-context entry | It already works as a standalone modal — just needs correct state sync |
| Old pill CSS/JS references break | Search for `map-search-pill` and `map-pill-badge` — replace all refs |
| Preset chip row overlaps map controls | Adjust `.map-controls` top position |
| Cross-browser: `overflow: hidden` + `border-radius` on cluster | Well-supported pattern, test in Safari |
| Entrance animation janky | Simple opacity + translateY, hardware accelerated |

## Verification
1. Mobile (390px): search bar + filter button clearly visible as one unit
2. Filter button looks like a dedicated control, not a chip
3. Badge shows "3" when 3 filters active, `.has-filters` tints the button
4. Preset chips below: clearly tappable, active state with terracotta fill
5. Tapping filter button → filter modal opens
6. Tapping search bar → overlay with search input opens
7. Desktop (1280px): no change (hidden on desktop)
8. `npm run test:e2e` passes
9. Gemini Flash confirms high affordance and salience
