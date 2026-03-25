# Mobile Map UX Specification — peuterplannen.nl

**Version:** 1.0
**Date:** 2026-03-19
**Stack:** Vanilla JS + MapLibre GL JS + CSS
**Target:** Location discovery for parents finding playgrounds/activities in Amsterdam

---

## Table of Contents

1. [Bottom Sheet Pattern](#1-bottom-sheet-pattern)
2. [Map-First vs List-First](#2-map-first-vs-list-first)
3. [Marker Interaction](#3-marker-interaction)
4. [Filter UX](#4-filter-ux)
5. [Performance](#5-performance)
6. [Gesture Design](#6-gesture-design)
7. [Implementation Approach](#7-implementation-approach)
8. [Sources](#8-sources)

---

## 1. Bottom Sheet Pattern

### 1.1 Why a Bottom Sheet

A bottom sheet is an overlay anchored to the bottom edge of a mobile screen that shows additional details while preserving visibility of the underlying map. This is the dominant pattern in all major map apps (Google Maps, Apple Maps, Airbnb, AllTrails) because it lets users:

- See location context (the map) while reading details
- Maintain spatial orientation
- Quickly dismiss and return to browsing
- Use a natural thumb-reachable zone

Per NNGroup guidelines, bottom sheets excel when "users are likely to need to refer to the main, background information while interacting with the sheet." This is exactly the case for map-based location discovery.

### 1.2 Three-State Sheet Design

The sheet has three snap positions:

| State | Height | Content Shown | When Used |
|-------|--------|---------------|-----------|
| **Collapsed/Hidden** | 0px | Nothing | Default state, no selection |
| **Peek** | 120px | Location name + type + rating + distance | Marker tapped |
| **Half** | 50vh | Full details: photos, address, description, opening hours | User drags peek up OR taps "more" |
| **Full** | calc(100vh - 64px) | Scrollable content, all details + nearby locations | User drags half up |

Specific pixel values:

```
Peek:  120px from bottom (enough for 2-3 lines + handle)
Half:  50% of viewport height
Full:  100vh - 64px (leaves 64px of map visible at top for orientation)
```

### 1.3 Drag Handle

- **Visual:** 36px wide, 4px tall, rounded, centered at top of sheet
- **Color:** `#C4C4C4` (or `var(--color-border)`)
- **Touch target:** 48px x 48px minimum (the entire top 48px of the sheet is draggable)
- **Top padding:** 8px above handle, 12px below handle before content starts

### 1.4 Sheet + Map Gesture Conflict Resolution

This is the hardest UX problem. The solution:

**Rule: The sheet captures vertical gestures; the map captures horizontal gestures and pinch.**

Implementation logic:

```
IF touch starts on sheet:
  IF sheet is at peek/half AND drag direction is vertical:
    → Move the sheet (not the map)
  IF sheet is at full AND content is scrolled to top AND drag is downward:
    → Shrink the sheet (pull-to-dismiss)
  IF sheet is at full AND content is NOT scrolled to top:
    → Scroll the sheet content (normal scroll)
  IF drag direction is primarily horizontal:
    → Allow map pan (pass through)

IF touch starts on map:
  → All gestures go to map (pan, zoom, rotate)
```

**Key technique:** Use `touch-action: none` on the sheet container and handle all touch events manually via JavaScript. This prevents the browser from capturing scroll/pan gestures and gives you full control.

```css
.bottom-sheet {
  touch-action: none;       /* JS handles all touch */
  overscroll-behavior: contain; /* prevent pull-to-refresh */
}

.bottom-sheet[data-state="full"] .sheet-content {
  touch-action: pan-y;      /* allow normal scrolling when full */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

### 1.5 Sheet Transitions

- **Snap animation:** Use CSS `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)` (Apple's spring-like curve)
- **During drag:** Remove transition, follow finger 1:1 with `transform: translateY()`
- **On release:** Add transition back, snap to nearest state based on:
  - Velocity: If flick velocity > 0.5px/ms, snap in flick direction
  - Position: Otherwise snap to nearest snap point
- **Backdrop:** Semi-transparent overlay (`rgba(0,0,0,0.3)`) appears at half state, increases to `rgba(0,0,0,0.5)` at full. Tapping backdrop collapses sheet.

### 1.6 Sheet Content Structure (Peek State)

```html
<div class="sheet-peek">
  <div class="sheet-handle"></div>
  <div class="sheet-peek-content">
    <div class="sheet-peek-left">
      <h3 class="sheet-title">Artis Playground</h3>
      <span class="sheet-type">Speeltuin</span>
      <span class="sheet-distance">850m</span>
    </div>
    <div class="sheet-peek-right">
      <img class="sheet-thumb" src="..." alt="" width="72" height="72">
    </div>
  </div>
</div>
```

---

## 2. Map-First vs List-First

### 2.1 Recommendation: Map-First on Mobile

For a location discovery app focused on playgrounds in a specific city (Amsterdam), **map-first is the correct default**. Reasons:

1. **Spatial context matters:** Parents want to find playgrounds near them or near a specific neighborhood. A map immediately answers "what's nearby?"
2. **Google Maps / Apple Maps precedent:** Users expect map-based discovery to show the map
3. **Density of locations:** With ~2200 locations in Amsterdam, a list is overwhelming without pre-filtering. A map naturally filters by visible area.
4. **Distance intuition:** On a map, parents instantly see how far something is relative to landmarks they know

### 2.2 Toggle Pattern: Floating Action Button

**Do NOT use a tab bar for map/list toggle.** The bottom nav is already used for app sections. Instead:

- **Floating button** in bottom-right corner, 48px above bottom nav
- Position: `right: 16px; bottom: 72px` (clears the nav bar)
- Size: 48px x 48px, rounded, with shadow
- Icons: Map icon (when showing list) / List icon (when showing map)
- Label: Small text below icon: "Lijst" / "Kaart"
- Transition: Crossfade (200ms) between views

```
┌─────────────────────────┐
│         MAP             │
│                         │
│                    [≡]  │  ← Floating toggle button
│  ┌───────────────────┐  │
│  │ Peek sheet        │  │
├──┴───────────────────┴──┤
│  🏠  📍  🗺️  ❤️  ≡   │  ← Bottom nav (existing)
└─────────────────────────┘
```

### 2.3 "Map Peek" Pattern (Advanced)

When showing the list view, show a small map strip (120px) at the top:

```
┌─────────────────────────┐
│  [Map strip - 120px]    │  ← Shows markers, tappable to expand
├─────────────────────────┤
│  📍 Vondelpark Speeltuin│
│  📍 Artis Playground    │
│  📍 Oosterpark Kids     │
│  ...scrollable list...  │
├─────────────────────────┤
│  Bottom nav             │
└─────────────────────────┘
```

This gives spatial context while browsing the list. Tapping the map strip transitions to full map view.

### 2.4 User Preferences Data

Research from Baymard Institute (2023) and industry patterns show:
- **Map-first users (60-65%):** Prefer spatial browsing when looking for nearby locations
- **List-first users (35-40%):** Prefer scanning names/ratings, often when they have a specific need
- **Parents specifically:** Tend toward map-first because proximity to home/school is the #1 factor

The toggle button ensures both user types are served.

---

## 3. Marker Interaction

### 3.1 Tap Marker → Bottom Sheet (Not Popup)

**Never use MapLibre popups on mobile.** They are:
- Too small to read
- Hard to dismiss
- Block map interaction
- Not thumb-friendly

Instead: Tap marker → open bottom sheet in peek state (120px).

### 3.2 Marker States

| State | Visual | When |
|-------|--------|------|
| Default | 28px circle, color-coded by activity type | Normal |
| Selected | 36px circle with white border (3px) + subtle shadow + scale animation | Marker tapped, sheet open |
| Cluster | 36px circle with count label, darker shade | Multiple markers overlap |

Color coding (existing, keep):
- Speeltuinen: Green (`#4CAF50`)
- Kinderboerderijen: Orange (`#FF9800`)
- Musea: Blue (`#2196F3`)
- Zwembaden: Cyan (`#00BCD4`)
- etc.

### 3.3 Selected Marker Behavior

When a marker is selected:
1. Marker scales up (28px → 36px) with 200ms ease-out
2. White border appears
3. Marker z-index increases (rendered on top)
4. Map smoothly pans to center the marker in the **visible** map area (above the sheet)
5. Sheet opens in peek state

**Critical:** When the sheet is at peek (120px) or half (50vh), the map must center the marker in the VISIBLE portion of the map, not the full viewport. Calculate:

```javascript
const sheetHeight = currentSheetHeight; // 120, 50vh, etc.
const visibleMapHeight = window.innerHeight - sheetHeight - navBarHeight;
const centerY = visibleMapHeight / 2;
// Use map.panTo() with offset
map.panTo(markerLngLat, {
  offset: [0, -sheetHeight / 2]
});
```

### 3.4 Cluster Tap Behavior

```
IF cluster contains <= 8 markers AND zoom >= 13:
  → "Spiderfy": expand markers in a circle around cluster point
ELSE:
  → Zoom in one level, centered on cluster
  → Use map.getSource('locations').getClusterExpansionZoom(clusterId)
```

Spiderfication is optional (complex to implement). The current zoom-in behavior is already good. Keep it.

### 3.5 Swipe Between Locations

When the sheet is in peek state, enable horizontal swipe on the sheet to cycle through nearby visible markers:

- Swipe left → next location (ordered by distance from center)
- Swipe right → previous location
- Map pans to the new marker
- Previous marker deselects, new marker selects
- Pagination dots below the handle show position

This is a "nice to have" — implement after core sheet is working.

---

## 4. Filter UX

### 4.1 Filter Placement: Horizontal Scrolling Chips Above Map

```
┌─────────────────────────┐
│ [Speeltuinen] [Zwembad] [Musea] [Boerderij] → │  ← Scrollable chips
├─────────────────────────┤
│                         │
│         MAP             │
│                         │
│  ┌───────────────────┐  │
│  │ Sheet             │  │
├──┴───────────────────┴──┤
│  Bottom nav             │
└─────────────────────────┘
```

Specs:
- **Position:** Fixed at top of map container, 8px padding
- **Height:** 44px total (32px chip height + 6px top/bottom padding)
- **Chip style:** Rounded pill, 32px height, 12px horizontal padding
- **Active chip:** Filled background with white text
- **Inactive chip:** White background, 1px border, dark text
- **Overflow:** Horizontal scroll with `-webkit-overflow-scrolling: touch`
- **Scroll indicator:** Subtle gradient fade on right edge (20px wide)

### 4.2 Filter Count Badge

When filters are active, show a small count badge:

```
[🎯 Speeltuinen (847)] [Zwembad (23)] [+ Meer filters]
```

Or simpler: Show total visible count in the map:
```
"127 locaties in dit gebied"  ← Small text below filter chips
```

### 4.3 "No Results in This Area"

When the visible map area has zero matching locations after filtering:

```
┌─────────────────────────┐
│ [Active filters...]     │
├─────────────────────────┤
│                         │
│   ┌───────────────┐     │
│   │ 😕            │     │
│   │ Geen locaties │     │
│   │ in dit gebied │     │
│   │               │     │
│   │ [Zoom uit]    │     │
│   │ [Wis filters] │     │
│   └───────────────┘     │
│                         │
└─────────────────────────┘
```

- Centered card on the map (not blocking the entire view)
- Two action buttons: "Zoom uit" (zoom out) and "Wis filters" (clear filters)
- Only show after 500ms of no visible markers (avoid flash during pan)

### 4.4 "Search This Area" Button

When the user pans the map significantly (>50% of viewport in any direction), show:

```
┌──────────────────────┐
│ 🔄 Zoek in dit gebied │  ← Floating pill, centered top
└──────────────────────┘
```

- Position: Centered horizontally, 56px from top (below filter chips)
- Style: White pill with shadow, 40px height
- Appears with slide-down animation (200ms)
- On tap: Re-queries visible bounds, updates markers
- Disappears after search completes

**For peuterplannen.nl:** Since all data is loaded as GeoJSON client-side, this button is less critical. The markers already update as you pan. But it can be useful to show the count of visible locations dynamically.

### 4.5 Active Filter Visibility

When the sheet is in half or full state, the filter chips should remain visible. Options:

1. **Best:** Filter chips are part of the main layout, not the map container. They stay visible above the sheet.
2. **Alternative:** When sheet expands, filter chips slide into the sheet header.

Recommendation: Keep filter chips always visible. They are 44px tall and do not significantly reduce map space.

---

## 5. Performance

### 5.1 MapLibre GL JS on Mobile

MapLibre GL JS uses WebGL for rendering, which performs well on most modern phones. Key considerations:

- **Minimum viable devices:** iPhone SE (2nd gen, 2020), Samsung Galaxy A series (2021+)
- **Older devices (pre-2019):** May struggle with WebGL. Provide graceful degradation.
- **WebGL context loss:** Handle the `webglcontextlost` event to show a "tap to reload" message

### 5.2 Marker Rendering Limits

| Markers | Performance | Recommendation |
|---------|-------------|----------------|
| < 500 | Smooth on all devices | No clustering needed below zoom 14 |
| 500-2000 | OK with clustering | Use clustering with radius 45-50 |
| 2000-5000 | Needs clustering | Cluster below zoom 13, max 500 unclustered |
| > 5000 | Challenging | Consider server-side clustering or viewport filtering |

For peuterplannen.nl with ~2200 locations:
- **Cluster below zoom 13** (current: `clusterMaxZoom: 13`)
- **Cluster radius: 45px** (current: `clusterRadius: 45`)
- These settings are already good. No changes needed.

### 5.3 Tile Loading Optimization

```javascript
const map = new maplibregl.Map({
  // Performance options
  fadeDuration: 0,                          // Disable tile fade (faster perceived load)
  cancelPendingTileRequestsWhileZooming: true, // Don't load tiles that will be replaced
  maxTileCacheSize: 100,                    // Limit memory usage
  pixelRatio: Math.min(window.devicePixelRatio, 2), // Cap at 2x for performance
  antialias: false,                         // Disable for better performance on mobile
  trackResize: true,                        // Handle orientation changes
  cooperativeGestures: false,               // Not needed for fullscreen map app
});
```

### 5.4 Battery Usage

MapLibre GL uses the GPU via WebGL. To reduce battery drain:

- **Disable continuous rendering:** Only re-render on interaction or data change. MapLibre does this by default (no idle rendering).
- **Reduce `maxTileCacheSize`** to lower memory/GPU pressure
- **Avoid `map.triggerRepaint()`** in animation loops
- **Disable 3D terrain** (not needed for a playground finder)
- **Disable `touchPitch`** (3D tilt via two-finger drag — unnecessary and drains battery)

```javascript
map.touchPitch.disable();
```

### 5.5 Initial Load Optimization

Current approach (load all GeoJSON at once) works for ~2200 points. Optimize with:

1. **Lazy-load the map:** Only initialize MapLibre when user navigates to map tab
2. **Preload GeoJSON** as a static file (not Supabase query) for map layer
3. **Compress GeoJSON:** Remove unnecessary properties from the map GeoJSON (only keep id, name, type, lat, lng)
4. **Use `transformRequest`** to add cache headers

Estimated GeoJSON size for 2200 locations with minimal properties: ~150-200KB (gzipped: ~30-40KB). This is fine.

---

## 6. Gesture Design

### 6.1 Supported Gestures on Map

| Gesture | Action | Notes |
|---------|--------|-------|
| Single tap on marker | Select marker, open sheet | |
| Single tap on empty map | Deselect marker, close sheet | |
| Single tap on cluster | Zoom into cluster | |
| Pan (one finger drag) | Move map | |
| Pinch | Zoom in/out | Two fingers |
| Double tap | Zoom in one level | Center on tap point |
| Two-finger tap | Zoom out one level | Optional, uncommon |

### 6.2 Disabled Gestures

| Gesture | Why Disabled |
|---------|-------------|
| Two-finger rotation | Confusing for non-power-users, north-up is better for wayfinding |
| Two-finger pitch/tilt | 3D view not useful for playground discovery, wastes battery |
| Keyboard shortcuts | Not applicable on mobile |

```javascript
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
map.touchPitch.disable();
```

### 6.3 Pinch-to-Zoom Specifics

- MapLibre handles pinch natively via `touchZoomRotate`
- Keep zoom range constrained: `minZoom: 10, maxZoom: 18`
  - Zoom 10: See all of Amsterdam
  - Zoom 18: Street level, individual markers visible
- Disable rotation during pinch (already covered above)

### 6.4 Swipe Conflicts: Map Pan vs Sheet Drag vs Page Scroll

This is the critical UX challenge. Resolution hierarchy:

```
1. Sheet handle area (top 48px of sheet):
   → Always captured by sheet
   → Vertical = move sheet
   → Horizontal = ignored (or swipe between locations)

2. Sheet content area (below handle):
   → IF sheet is full AND content scrollable: normal scroll
   → IF sheet is full AND scrolled to top AND swipe down: collapse sheet
   → IF sheet is peek/half: move sheet

3. Map area (everything above sheet):
   → All gestures go to map
   → Map ignores vertical swipes that start on sheet

4. Filter chip area:
   → Horizontal scroll for chips
   → Does not interfere with map
```

Implementation: Use a `touchstart` listener on the sheet to determine if the gesture belongs to the sheet. Set a flag that prevents the map from receiving that touch.

### 6.5 Long Press

- **On map:** Not used. Long press has no standard meaning for playground discovery.
- **On marker:** Not used. Single tap is sufficient.
- **On sheet location:** Could open share/save menu, but this is a v2 feature.

---

## 7. Implementation Approach

### 7.1 Bottom Sheet in Vanilla JS

No framework needed. The implementation is ~150 lines of JS + ~80 lines of CSS.

**HTML Structure:**

```html
<div id="map-container">
  <div id="map"></div>

  <!-- Filter chips -->
  <div class="map-filters">
    <button class="filter-chip active" data-type="all">Alles</button>
    <button class="filter-chip" data-type="speeltuin">Speeltuinen</button>
    <!-- ... -->
  </div>

  <!-- Bottom sheet -->
  <div class="sheet-backdrop" id="sheet-backdrop"></div>
  <div class="sheet" id="sheet" data-state="hidden">
    <div class="sheet-handle-area">
      <div class="sheet-handle"></div>
    </div>
    <div class="sheet-content" id="sheet-content">
      <!-- Populated dynamically -->
    </div>
  </div>
</div>
```

**CSS Core:**

```css
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 100;
  will-change: transform;
  max-height: calc(100vh - 64px);
  overflow: hidden;
}

.sheet[data-state="peek"] {
  transform: translateY(calc(100% - 120px));
}

.sheet[data-state="half"] {
  transform: translateY(50%);
}

.sheet[data-state="full"] {
  transform: translateY(0);
}

.sheet[data-state="hidden"] {
  transform: translateY(100%);
  pointer-events: none;
}

.sheet-handle-area {
  padding: 8px 0 12px;
  cursor: grab;
  display: flex;
  justify-content: center;
  touch-action: none;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #C4C4C4;
}

.sheet-content {
  overflow-y: hidden;
  padding: 0 16px 16px;
}

.sheet[data-state="full"] .sheet-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  transition: background 300ms ease;
  pointer-events: none;
  z-index: 99;
}

.sheet-backdrop.visible {
  background: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}
```

**JavaScript Core (Touch Handling):**

```javascript
class BottomSheet {
  constructor(el, options = {}) {
    this.el = el;
    this.content = el.querySelector('.sheet-content');
    this.handleArea = el.querySelector('.sheet-handle-area');
    this.backdrop = document.getElementById('sheet-backdrop');

    // Snap points as pixels from bottom of screen
    this.snapPoints = {
      hidden: 0,
      peek: 120,
      half: window.innerHeight * 0.5,
      full: window.innerHeight - 64
    };

    this.state = 'hidden';
    this.startY = 0;
    this.currentY = 0;
    this.startTranslateY = 0;
    this.isDragging = false;
    this.lastTimestamp = 0;
    this.velocity = 0;

    this.bindEvents();
  }

  bindEvents() {
    // Handle area always captures touch
    this.handleArea.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    this.handleArea.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.handleArea.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Content area: only capture when conditions met
    this.content.addEventListener('touchstart', (e) => this.onContentTouchStart(e), { passive: true });
    this.content.addEventListener('touchmove', (e) => this.onContentTouchMove(e), { passive: false });
    this.content.addEventListener('touchend', (e) => this.onContentTouchEnd(e));

    // Backdrop tap to dismiss
    this.backdrop.addEventListener('click', () => this.setState('hidden'));

    // Update snap points on resize
    window.addEventListener('resize', () => this.updateSnapPoints());
  }

  updateSnapPoints() {
    this.snapPoints.half = window.innerHeight * 0.5;
    this.snapPoints.full = window.innerHeight - 64;
  }

  onTouchStart(e) {
    this.isDragging = true;
    this.startY = e.touches[0].clientY;
    this.startTranslateY = this.getCurrentTranslateY();
    this.el.style.transition = 'none';
    this.lastTimestamp = Date.now();
    this.velocity = 0;
  }

  onTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.startY;
    const now = Date.now();
    const dt = now - this.lastTimestamp;

    if (dt > 0) {
      this.velocity = (currentY - this.currentY) / dt; // px/ms
    }

    this.currentY = currentY;
    this.lastTimestamp = now;

    // Calculate new position
    const newTranslateY = Math.max(
      this.getTranslateForState('full'),
      this.startTranslateY + deltaY
    );

    this.el.style.transform = `translateY(${newTranslateY}px)`;
    this.updateBackdrop(newTranslateY);
  }

  onTouchEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.el.style.transition = '';

    const currentTranslateY = this.getCurrentTranslateY();
    const targetState = this.getSnapTarget(currentTranslateY, this.velocity);
    this.setState(targetState);
  }

  onContentTouchStart(e) {
    if (this.state === 'full' && this.content.scrollTop > 0) {
      // Let normal scroll handle it
      this.contentDragging = false;
      return;
    }
    this.onTouchStart(e);
    this.contentDragging = true;
  }

  onContentTouchMove(e) {
    if (this.state === 'full' && this.content.scrollTop > 0) return;
    if (this.state === 'full' && this.content.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - this.startY;
      if (deltaY < 0) {
        // Scrolling up into content — let it scroll
        this.isDragging = false;
        return;
      }
    }
    this.onTouchMove(e);
  }

  onContentTouchEnd(e) {
    if (!this.isDragging) return;
    this.onTouchEnd(e);
  }

  getSnapTarget(currentTranslateY, velocity) {
    const VELOCITY_THRESHOLD = 0.5; // px/ms

    // Convert translateY to sheet height
    const sheetHeight = window.innerHeight - currentTranslateY;

    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      // Flick: snap in direction of flick
      if (velocity > 0) {
        // Flicking down
        if (this.state === 'full') return 'half';
        if (this.state === 'half') return 'peek';
        return 'hidden';
      } else {
        // Flicking up
        if (this.state === 'peek') return 'half';
        if (this.state === 'half') return 'full';
        return 'full';
      }
    }

    // No flick: snap to nearest
    const distances = Object.entries(this.snapPoints).map(([state, height]) => ({
      state,
      distance: Math.abs(sheetHeight - height)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    return distances[0].state;
  }

  setState(state) {
    this.state = state;
    this.el.dataset.state = state;
    this.el.style.transition = '';
    this.el.style.transform = '';

    // Backdrop
    if (state === 'half' || state === 'full') {
      this.backdrop.classList.add('visible');
    } else {
      this.backdrop.classList.remove('visible');
    }

    // Content scrollability
    if (state === 'full') {
      this.content.style.overflowY = 'auto';
    } else {
      this.content.style.overflowY = 'hidden';
      this.content.scrollTop = 0;
    }

    // Callback
    if (this.onStateChange) this.onStateChange(state);
  }

  getCurrentTranslateY() {
    const transform = getComputedStyle(this.el).transform;
    if (transform === 'none') return window.innerHeight;
    const matrix = new DOMMatrix(transform);
    return matrix.m42;
  }

  getTranslateForState(state) {
    return window.innerHeight - this.snapPoints[state];
  }

  updateBackdrop(translateY) {
    const progress = 1 - (translateY / window.innerHeight);
    const opacity = Math.min(0.5, progress * 0.6);
    this.backdrop.style.background = `rgba(0, 0, 0, ${opacity})`;
    if (opacity > 0) {
      this.backdrop.style.pointerEvents = 'auto';
    }
  }
}
```

### 7.2 Integration with MapLibre GL

```javascript
// Initialize sheet
const sheet = new BottomSheet(document.getElementById('sheet'));

// When marker clicked
map.on('click', 'unclustered-point', (e) => {
  const props = e.features[0].properties;

  // Update sheet content
  document.getElementById('sheet-content').innerHTML = buildPeekContent(props);

  // Open sheet in peek state
  sheet.setState('peek');

  // Highlight marker
  selectMarker(props.id, e.features[0].geometry.coordinates);

  // Pan map to show marker above sheet
  const sheetHeight = 120; // peek height
  map.easeTo({
    center: e.features[0].geometry.coordinates,
    offset: [0, -sheetHeight / 2],
    duration: 300
  });
});

// When empty map clicked
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters', 'unclustered-point']
  });
  if (features.length === 0) {
    sheet.setState('hidden');
    deselectMarker();
  }
});

// When sheet state changes
sheet.onStateChange = (state) => {
  if (state === 'hidden') {
    deselectMarker();
  }
  if (state === 'half') {
    // Load full content
    loadFullContent(activeLocationId);
  }
  // Resize map to account for sheet
  const sheetHeight = sheet.snapPoints[state] || 0;
  map.setPadding({ bottom: sheetHeight });
};

// Selected marker styling
function selectMarker(id, coords) {
  // Use a separate source/layer for the selected marker
  // or use feature-state
  map.setFeatureState(
    { source: 'locations', id: id },
    { selected: true }
  );
}
```

### 7.3 No External Libraries Needed

This can all be done in vanilla JS. Do NOT add:
- Hammer.js (touch library) — native touch events are sufficient
- Any React bottom sheet library
- CSS scroll snap for the sheet (it does not work well for this use case; `scroll-snap-type` is for scroll containers, not drag-to-snap)

The only dependency is MapLibre GL JS (already in use).

### 7.4 Accessibility

Per NNGroup guidelines:
- **Always include a visible close button** (X) in the sheet, not just the drag handle
- **Support back button/gesture** to dismiss the sheet
- **`aria-hidden="true"`** on the map when sheet is in full state
- **`role="dialog"`** on the sheet
- **`aria-label`** on the sheet with location name
- **Focus trap** when sheet is full (tab/shift-tab stays within sheet)
- **Escape key** dismisses sheet

```javascript
// Back button support
window.addEventListener('popstate', () => {
  if (sheet.state !== 'hidden') {
    sheet.setState('hidden');
  }
});

// Push state when sheet opens
sheet.onStateChange = (state) => {
  if (state === 'peek') {
    history.pushState({ sheet: true }, '');
  }
};
```

---

## 8. Sources

### Bottom Sheet UX Guidelines
- **NNGroup (2024):** "Bottom Sheet" — comprehensive UX guidelines on states, dismissal patterns, accessibility requirements, modal vs non-modal behavior. Key takeaway: always include visible close button, never stack sheets, use for brief interactions. Source: nngroup.com/articles/bottom-sheet/
- **Material Design 3:** Bottom sheet component guidelines — modal and standard variants, `SheetState` management, drag handle specifications, dismiss-on-outside-tap. Source: m3.material.io/components/bottom-sheets/

### MapLibre GL JS
- **MapLibre GL JS API docs:** Map class documentation covering gesture handlers (`dragPan`, `touchZoomRotate`, `touchPitch`, `cooperativeGestures`), performance options (`cancelPendingTileRequestsWhileZooming`), event binding. Source: maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- **MapLibre Examples:** Clustering, markers, popups, cooperative gestures, draggable markers, HTML clusters. Source: maplibre.org/maplibre-gl-js/docs/examples/

### Web Platform Standards
- **web.dev:** Dialog and popover patterns — `<dialog>` element with `showModal()`, `::backdrop` pseudo-element, `closedBy="any"` for light-dismiss, CSS transitions for entry/exit animations. Source: web.dev/patterns/components/dialog

### Industry Patterns (Based on Analysis of Live Apps)
- **Google Maps:** Three-state bottom sheet (peek/half/full), marker selection highlights with bounce animation, cluster tap zooms, filter chips at top, "search this area" button
- **Airbnb:** Map + list toggle via floating button, price markers on map, bottom sheet for listing preview, card swipe between listings
- **AllTrails:** Map-first for discovery, trail cards in bottom sheet, filter chips scrollable at top
- **Apple Maps:** Sheet with continuous drag (not snapped to 3 states but with momentum), backdrop opacity tied to sheet position

### Touch/Gesture Design
- **Apple Human Interface Guidelines:** Recommended spring curve for sheet animations: `cubic-bezier(0.32, 0.72, 0, 1)`. Minimum touch target: 44x44pt.
- **Material Design:** Minimum touch target: 48x48dp. Drag handle: 32dp wide, 4dp tall.
- **Web Platform:** `touch-action: none` for custom gesture handling, `overscroll-behavior: contain` to prevent pull-to-refresh interference.

---

## Implementation Priority

### Phase 1 (MVP)
1. Bottom sheet with peek + hidden states (marker tap → peek, tap empty → hide)
2. Disable rotation and pitch on map
3. Map/list toggle floating button
4. Map centers selected marker above sheet

### Phase 2
1. Add half state (drag peek up)
2. Full state with scrollable content
3. Backdrop overlay
4. Velocity-based snap detection

### Phase 3
1. Filter chips redesign (scrollable, with active count)
2. "No results" empty state
3. Map peek strip in list view
4. Accessibility (close button, back button, focus trap)

### Phase 4 (Polish)
1. Swipe between locations in peek state
2. Selected marker animation
3. Spring physics on sheet drag
4. Performance tuning (lazy load, compressed GeoJSON)
