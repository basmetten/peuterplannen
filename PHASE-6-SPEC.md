# Phase 6: Apple Maps iOS Visual Polish

**Priority: Complete in order (6-pre → 6A → 6B → 6C)**

This spec describes visual and UX improvements inspired by the Apple Maps iOS app. Each section specifies exactly what to build, what files to modify, and what NOT to touch. Read the full spec before starting.

**Reference:** Apple Maps iOS app (not the web app). Key patterns: floating sheet with adaptive corner radius, category discovery grid, backdrop-blur glass header, cluster list sheets, nearby locations on detail.

---

## Phase 6-pre: Mandatory Cleanup

These issues MUST be fixed before any Phase 6 work. They are existing bugs/inconsistencies that will cause silent failures or style conflicts.

### 6-pre-1: Register glass tokens in Tailwind theme

**Problem:** `--color-glass-bg` and `--glass-blur` are defined in `:root` in `globals.css` but NOT registered in `@theme inline`. Tailwind utility classes like `bg-glass-bg` silently do nothing.

**File:** `app/globals.css` — find the `@theme inline` block and add:
```css
--color-glass-bg: oklch(1 0 0 / 0.85);
--backdrop-blur-glass: 20px;
```

Also add a utility class below `@theme`:
```css
.glass {
  background: var(--color-glass-bg);
  backdrop-filter: blur(var(--backdrop-blur-glass)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--backdrop-blur-glass)) saturate(1.2);
}
```

### 6-pre-2: Fix `.content-sheet` desktop `!important` conflict

**Problem:** The `.content-sheet` media query at `@media (min-width: 768px)` uses `transform: none !important` and `border-radius: 0 !important`. These will fight any floating sheet styles applied to the same class.

**File:** `app/globals.css` — the `!important` declarations are intentional (prevent inline style conflicts from JS drag). Do NOT remove them. Instead, ensure the floating sheet styles in Phase 6A use a SEPARATE class (`.sheet-float`) that is NOT applied to `.content-sheet`. The two sheet systems (app sheet + content sheet) stay independent.

### 6-pre-3: Fix empty facilities heading

**Problem:** `DetailView.tsx` renders `<h3>Faciliteiten</h3>` even when all facility booleans are false, leaving an orphaned heading.

**File:** `src/features/detail/DetailView.tsx` — wrap the entire facilities section:
```tsx
{(location.coffee || location.diaper || location.weather) && (
  <>
    <div className="hairline mx-4 my-4" />
    <div className="px-4">
      <h3 ...>Faciliteiten</h3>
      ...
    </div>
  </>
)}
```

### 6-pre-4: Fix hardcoded weather options

**File:** `src/features/filters/FilterBar.tsx` — replace the hardcoded `(['indoor', 'outdoor', 'both'] as const)` with the `WEATHER_OPTIONS` import from `src/domain/enums.ts`.

### 6-pre-5: Remove dead `SHEET_STATES` export

**File:** `src/domain/enums.ts` — remove `SHEET_STATES` and `SheetState` exports. The sheet system uses `SheetSnap` from `sheetMachine.ts`.

### 6-pre-6: Fix DetailSkeleton spacing

**File:** `src/features/detail/DetailView.tsx` — in `DetailSkeleton`, change `mb-3` to `mb-4` on the photo placeholder to match the actual photo spacing.

### 6-pre-7: Verify `ease-bouncy` resolves in Tailwind v4

Check if `ease-bouncy` is registered in `@theme inline`. If not, add:
```css
--ease-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1);
```

**After fixing all 7 items: run `npm run build` and `npm run test:e2e:all` to confirm nothing breaks.**

---

## Phase 6A: Visual Polish — Floating Sheet + Glass + GPU

### 6A-1: Floating sheet with gap + adaptive corner radius

**Concept:** The sheet "floats" as a card at peek/half states (horizontal gap from screen edges, rounded bottom corners, drop shadow). At full state, the gap closes and corners go to zero — edge-to-edge, like Apple Maps iOS.

**What changes:**

**File: `src/features/sheet/Sheet.tsx`**

Add a `floatFactor` derived from the current snap percentage. This controls gap, corner radius, and shadow:

```typescript
// floatFactor: 1 at peek (25%), ~0.6 at half (50%), 0 at full (92%)
const floatFactor = Math.max(0, Math.min(1, (92 - snapPct) / 67));
```

Apply to the sheet container:
```tsx
<div
  style={{
    transform: `translateY(${100 - snapPct}%)`,
    transition: springDuration ? `transform ${springDuration}ms var(--ease-spring)` : undefined,
    marginInline: `${floatFactor * 12}px`,        // 12px gap at peek → 0 at full
    marginBottom: `${floatFactor * 8}px`,          // 8px bottom gap → 0
    borderRadius: `${floatFactor * 16}px`,         // 16px all corners → 0
    filter: floatFactor > 0
      ? `drop-shadow(0 -2px ${8 + floatFactor * 8}px rgba(0,0,0,${0.04 + floatFactor * 0.06}))`
      : undefined,
    willChange: 'transform',
  }}
  className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-bg-primary overflow-hidden"
>
```

**Key rules:**
- The `inset-x-0` stays but is overridden by `marginInline` (margin pushes inward from edges)
- `borderRadius` applies to ALL corners (top + bottom) when floating — unlike current top-only radius
- `overflow-hidden` is essential to clip content within the rounded corners
- `willChange: 'transform'` promotes to GPU compositor layer
- `filter: drop-shadow()` is GPU-accelerated (unlike `box-shadow`)
- At full state (`floatFactor = 0`): no margin, no radius, no shadow — edge-to-edge

**Do NOT change:**
- `useSheetDrag.ts` — the hook works in percentages, agnostic to margins
- `ContentSheetContainer.tsx` — leave it as-is for now (SSR content pages keep their current style)
- The `.content-sheet` CSS class — leave untouched

**Update `AppShellSkeleton`** to match the floating style at its default snap (75% translateY = half state, so `floatFactor ≈ 0.6`).

### 6A-2: Glass header on sheet

**Concept:** The sticky header area (mode pills + search bar) gets a semi-transparent background with backdrop blur. Map content is subtly visible through the blur when scrolling.

**File: `src/features/sheet/Sheet.tsx`**

Change the `stickyHeader` container from no background to glass:

```tsx
{stickyHeader && (
  <div className="flex-shrink-0 glass">
    {stickyHeader}
  </div>
)}
```

The `.glass` class was added in 6-pre-1.

**Also apply to the drag handle area** (the area above the sticky header containing the grab bar):
```tsx
<div className="glass flex justify-center py-2">
  <div className="h-1 w-8 rounded-full bg-label-quaternary" />
</div>
```

**Important:** Remove `bg-bg-primary` from the outer sheet container div. Instead, apply `bg-bg-primary` to the SCROLLABLE CONTENT area only. This way:
- Handle + sticky header = glass (map shows through)
- Scrollable content = solid background (readable)

**File: `src/components/layout/SheetModeSwitcher.tsx`**

Remove any background from the mode pills container — the glass parent handles it:
```tsx
<div className="flex justify-center gap-2 px-4 py-1.5">
```
(Already correct — no bg class. Just verify.)

**Do NOT apply glass to:**
- The scroll content area (must remain solid for text readability)
- The detail view back button bar (it already has its own `bg-bg-primary/95 backdrop-blur-sm`)
- The ContentSheetContainer (SSR pages — separate component, separate visual treatment)

### 6A-3: GPU optimizations

**File: `app/globals.css`** — add these performance hints:

```css
/* GPU layer promotion for animated elements */
.sheet-container {
  will-change: transform;
  contain: layout style;
}

/* Offscreen card optimization */
.card-list > * {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px; /* estimated card height */
}
```

**File: `src/features/sheet/Sheet.tsx`** — add `contain: 'layout style'` to the scroll container to isolate layout recalculations.

**File: `src/features/map/MapContainer.tsx`** — clean up unused GeoJSON properties in `toGeoJSON`. Remove `photo_url`, `is_featured`, `price_band` from the feature properties — no map layer reads them. This reduces GeoJSON payload size.

---

## Phase 6B: Discovery — Category Grid + Nearby

### 6B-1: Category grid (replaces type filter chips)

**Concept:** A 2-row visual grid of 8 category buttons (SVG icon in colored circle + label) replaces the text-only type filter chips. Appears on the browse home screen above the cards. When a category is tapped, locations filter to that type. When none are selected, all locations are visible.

**New file: `src/components/patterns/CategoryGrid.tsx`**

```tsx
interface CategoryGridProps {
  activeTypes: string[];
  onTypeToggle: (type: string) => void;
}
```

**Layout:** 4 columns × 2 rows grid, centered. Each cell:
- Circular icon container (40px): filled with TYPE_COLORS[type] when active, outline/muted when inactive
- SVG icon inside (20px, white when active, type color when inactive)
- Label below (11px, `font-medium`, `label-secondary` when inactive, `label` when active)
- Tap target: full cell (at least 44×44px)

**Category definitions** (8 types matching the existing type system):

| Type slug | Dutch label | Icon concept |
|---|---|---|
| `speeltuin` | Speeltuin | Swing/slide |
| `museum` | Museum | Building columns |
| `kinderboerderij` | Boerderij | Barn/animal |
| `dierentuin` | Dierentuin | Paw/animal |
| `zwembad` | Zwembad | Water/waves |
| `park` | Park | Tree |
| `theater` | Theater | Masks/curtain |
| `horeca` | Horeca | Cup/fork |

**Use the TYPE_COLORS from `src/domain/enums.ts`** for the circle colors. These are already defined per type.

**Icons:** Create simple SVG icons inline (like the existing action buttons in DetailView). Keep them minimal — single-path where possible. Do NOT add an icon library dependency.

**Inactive state:**
```css
/* Circle: subtle background with type color as border */
background: transparent;
border: 1.5px solid var(--type-color);
opacity: 0.6;
```

**Active state:**
```css
/* Circle: filled with type color */
background: var(--type-color);
border: none;
opacity: 1;
/* Label: darker */
```

**Transition:** `transition: all 150ms ease` on the circle for smooth fill animation.

**Integration in AppShell.tsx:**

Replace the type chips in `BrowseContent`. The `CategoryGrid` calls the same `onTypeToggle` handler that `FilterBar` currently uses. `FilterBar` row 1 (type chips) is removed — `FilterBar` now only renders row 2 (secondary filters: weather, price, score, age).

**Browse content structure becomes:**
```
1. CategoryGrid (8 circles in 2×4 grid)
2. FilterBar (secondary filters only — weather, price, score, age)
3. Active filter pills (if any filter active, showing removable pills)
4. Result count ("127 locaties")
5. Location cards
```

**When to show CategoryGrid:**
- Always visible in Ontdek mode when NOT in search-active state
- Hidden when search input is focused and user is typing (show search suggestions instead)
- Hidden in Bewaard and Plan modes (those show their own content)
- Visible again when search is cleared

**"Alles" handling:**
- No explicit "Alles" button needed
- When no category is selected: all circles are in muted/outline state, all locations visible
- When 1+ categories selected: those circles are filled, others muted
- A small text link "Wis filters" appears near the result count when any filter is active (this already exists in EmptyFilterState — reuse the pattern)

**Multi-select:** Yes, same as current behavior. User can select "Speeltuin" + "Park" to see both types. This uses the existing `types: string[]` array in filter state.

**Map markers:** Already handled — `filteredLocations` is mode-aware and filter-aware. When types are filtered, the map only shows those types. No MapContainer changes needed.

### 6B-2: Nearby locations on detail view

**Concept:** "In de buurt" section at the bottom of DetailView showing 4-6 closest locations as a horizontal scrollable card strip.

**Changes to AppShell.tsx:**

Compute nearby locations when detail is open:
```typescript
const nearbyLocations = useMemo(() => {
  if (!detailId) return [];
  const current = initialLocations.find(l => l.id === detailId);
  if (!current) return [];
  return initialLocations
    .filter(l => l.id !== detailId)
    .map(l => ({
      ...l,
      distance: haversine(current.lat, current.lng, l.lat, l.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}, [detailId, initialLocations]);
```

Add `haversine` as a small utility in `src/lib/geo.ts`:
```typescript
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**Pass to DetailView:**
```tsx
<DetailView
  locationId={detailId}
  onClose={handleDetailClose}
  nearbyLocations={nearbyLocations}
  onNearbyTap={handleCardTap}
/>
```

**Changes to DetailView.tsx:**

Add a new section at the bottom (after opening hours, before the end):
```tsx
{nearbyLocations.length > 0 && (
  <>
    <div className="hairline mx-4 my-4" />
    <div className="px-4">
      <h3 className="mb-3 text-[17px] font-semibold tracking-[-0.025em] text-label">
        In de buurt
      </h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {nearbyLocations.map(loc => (
          <NearbyCard key={loc.id} location={loc} onTap={() => onNearbyTap(loc)} />
        ))}
      </div>
    </div>
  </>
)}
```

**NearbyCard** — compact card (140px wide × ~120px tall):
- Photo thumbnail (aspect-[4/3], rounded-photo, w-full)
- Name (13px, font-medium, 1 line truncated)
- Type badge (tiny, colored)
- Distance ("0.8 km")
- Tap → opens that location's detail (same flow as card tap)

---

## Phase 6C: Monetization-ready — Cluster List

### 6C-1: Cluster list sheet (replaces carousel on mobile)

**Concept:** When a user taps a map cluster (with ≤8 locations at zoom ≥ 14), instead of the horizontal carousel overlay, the sheet content switches to a vertical list of clustered location cards. A paying partner can be promoted to position #1 with a subtle badge.

**XState machine change:**

The `carousel` state in `sheetMachine.ts` currently stores `carouselLocationIds` and `carouselActiveId`. Rename conceptually:
- Keep the same machine state name (`carousel`) for backwards compatibility
- The rendering changes from horizontal carousel to vertical list

**AppShell.tsx changes:**

In `getSheetContent()`, when `isCarouselOpen`:
```tsx
if (isCarouselOpen && carouselLocationIds) {
  const clusterLocations = carouselLocationIds
    .map(id => initialLocations.find(l => l.id === id))
    .filter(Boolean)
    .sort((a, b) => {
      // Promoted locations first (future: check is_featured or promoted flag)
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      // Then by score
      return (b.ai_suitability_score_10 ?? 0) - (a.ai_suitability_score_10 ?? 0);
    });

  return (
    <ClusterList
      locations={clusterLocations}
      onCardTap={handleCarouselCardTap}
      onClose={() => sheetSend({ type: 'CAROUSEL_CLOSE' })}
    />
  );
}
```

**New file: `src/features/carousel/ClusterList.tsx`**

A vertical list of location cards (reuse existing `LocationCard` component) with:
- Back button at top ("← Terug naar kaart")
- Count header ("5 locaties in dit gebied")
- Vertical list of cards (same as browse, but limited to cluster members)
- Promoted card (if `is_featured`): subtle "Aanbevolen" badge in top-right corner of the card

**Remove `CarouselOverlay.tsx` on mobile?**

No — keep it for now. The carousel is still useful for the DESKTOP experience where the sheet doesn't exist. But on mobile, `getSheetContent()` now returns `ClusterList` instead of showing the overlay. Conditionally render `CarouselOverlay` only when `isDesktop`:

```tsx
{isDesktop && isCarouselOpen && (
  <CarouselOverlay ... />
)}
```

**Snap state:** When cluster list shows, snap to `half` (same as current carousel behavior sets snap to `hidden` + overlay — but now we want the list IN the sheet at half).

Update the `CAROUSEL_OPEN` action in `sheetMachine.ts`:
```typescript
snap: 'half' as SheetSnap,  // was 'hidden'
```

**Monetization-ready:**
The `is_featured` field already exists in `LocationSummary`. Currently it's populated in Supabase but not used in the UI. The cluster list sorts featured first and shows a badge. When a partner pays, you set `is_featured = true` in Supabase — the UI updates automatically.

Future expansion: add `promoted_position` field for finer control (which cluster lists, date range, etc.).

---

## What NOT to change

- `useSheetDrag.ts` — no changes needed, works with floating margins
- `ContentSheetContainer.tsx` — keep separate from app sheet for now
- `.content-sheet` CSS class — do not touch
- `useFilters.ts` — no changes needed, `toggleType` already supports multi-select
- `sheetMachine.ts` states — only change `CAROUSEL_OPEN` snap from `hidden` to `half`
- Blog/guide pages — no changes
- Analytics events — no changes
- E2E tests — update screenshot baselines after visual changes (`npm run test:e2e:update-snapshots`)

---

## Implementation order

```
6-pre (cleanup, ~30min)
  ├── Fix glass tokens in @theme
  ├── Fix facilities empty heading
  ├── Fix weather options hardcode
  ├── Remove dead SHEET_STATES
  ├── Fix DetailSkeleton mb-3
  ├── Verify ease-bouncy
  └── Build + test
6A (visual polish, ~2h)
  ├── 6A-1: Floating sheet (Sheet.tsx + skeleton)
  ├── 6A-2: Glass header (Sheet.tsx background restructure)
  ├── 6A-3: GPU optimizations (globals.css + MapContainer cleanup)
  └── Build + test + update visual baselines
6B (discovery, ~2h)
  ├── 6B-1: CategoryGrid component + integrate in AppShell
  ├── 6B-1b: Remove type chips from FilterBar (row 2 only)
  ├── 6B-2: Nearby locations (geo.ts + DetailView + AppShell)
  └── Build + test + update visual baselines
6C (monetization-ready, ~1h)
  ├── 6C-1: ClusterList component
  ├── 6C-1b: AppShell cluster rendering switch
  ├── 6C-1c: sheetMachine snap change
  ├── 6C-1d: Desktop-only CarouselOverlay
  └── Build + test + update visual baselines
```

---

## Verification checklist

### Phase 6-pre
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e:all` — all 82 tests pass
- [ ] No TypeScript errors

### Phase 6A
- [ ] Sheet floats at peek state (visible gap from edges, rounded all corners)
- [ ] Sheet transitions smoothly to edge-to-edge at full state
- [ ] Glass header visible — map content blurs through at peek/half
- [ ] Scrollable content has solid background (text readable)
- [ ] Detail view back button glass is unchanged
- [ ] Desktop sidebar is unchanged (no floating on desktop)
- [ ] Sheet drag still works correctly (peek/half/full)
- [ ] `will-change` on sheet container
- [ ] `content-visibility: auto` on card list items

### Phase 6B
- [ ] Category grid visible on home screen (2 rows × 4 columns)
- [ ] Each category has SVG icon in colored circle + label
- [ ] Tapping category filters locations (same as old type chips)
- [ ] Multiple categories selectable simultaneously
- [ ] No category selected = all locations visible
- [ ] Old type filter chips (row 1) removed from FilterBar
- [ ] Secondary filters (weather, price, score, age) still work
- [ ] Category grid hidden during search-active state
- [ ] Category grid hidden in Bewaard/Plan modes
- [ ] "In de buurt" section visible at bottom of detail view
- [ ] 4-6 nearby locations shown as horizontal scroll cards
- [ ] Tapping nearby card opens that location's detail
- [ ] Distance shown on nearby cards (e.g., "0.8 km")

### Phase 6C
- [ ] Tapping a cluster (≤8 locations, zoom ≥ 14) opens cluster list in sheet
- [ ] Cluster list shows as vertical card list (not horizontal carousel)
- [ ] `is_featured` locations sort to top with "Aanbevolen" badge
- [ ] Back button in cluster list returns to browse
- [ ] Desktop still uses CarouselOverlay for clusters
- [ ] Sheet snaps to half when cluster list opens

### Final
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e:all` — all tests pass (update baselines first)
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Lighthouse performance score ≥ 0.8
