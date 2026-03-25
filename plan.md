# Plan: Sheet Default + Canonical Filters + Progressive Disclosure

## Goal

Three coordinated changes to make PeuterPlannen's discovery system feel like one cohesive product:

1. **Sheet default → half-open** — user immediately sees content, not just a peek strip
2. **One canonical filter model** — eliminate inconsistencies between sidebar, modal, sheet chips, and presets
3. **Progressive disclosure** — compact first layer for scanning, expandable groups for depth

These ship together because they're interdependent: the half-open sheet shows the filter UI, the canonical model decides *what* that UI contains, and progressive disclosure decides *how* it's organized.

---

## Current State (Key Facts)

### Sheet
- 4 states: hidden → peek → **half (55vh)** → full
- Default = **peek** (set in `sheet-engine.js:201`)
- Gesture-aware snapping with velocity threshold 0.5 px/ms
- Content scroll locked until 85% toward full
- Lazy-loads 30 cards per batch via IntersectionObserver

### Filters — Where They Live

| Location | What's shown | Gaps |
|----------|-------------|------|
| **Sidebar** (desktop, collapsed on mobile) | All 7 types + weather + coffee/diaper/alcohol + age + radius | Complete but hidden behind toggle |
| **Sheet type chips** (`#sheet-filter-chips`) | 7 types (missing Pannenkoeken) | No weather/age/facilities |
| **Sheet preset chips** (`#sheet-presets`) | 6 of 8 presets | Missing `lunch-play`, `terras-kids` |
| **Filter modal** (`#filter-modal`) | Weather, age, 2 facilities, distance, favorites | Missing: alcohol, presets, types. "Lunch" facility has no state mapping |
| **Preset strip** (above sidebar) | All 8 presets | Desktop only when sidebar visible |

### Supabase Fields Available but Unexposed

11 quality attributes exist in DB but have no filter UI:
`price_band`, `parking_ease`, `buggy_friendliness`, `food_fit`, `play_corner_quality`, `toilet_confidence`, `rain_backup_quality`, `shade_or_shelter`, `noise_level`, `time_of_day_fit`, `crowd_pattern`

---

## Approach

### Change 1: Sheet Default → Half-Open

**What:** Change one line in `sheet-engine.js` from `setSheetState('peek')` → `setSheetState('half')`.

**Why it's not just one line:** Half-open reveals the sheet content area. We need to ensure:
- Cards render immediately (lazy loading triggers at half, not just full)
- Map remains usable — 45% viewport is enough for map interaction
- First-load experience feels right (no empty sheet if data hasn't loaded yet)
- Deep-link / `locatieParam` flows still work (sheet should stay hidden when showing a direct location)
- Performance: half-state triggers card rendering — ensure skeleton/loading state shows during data fetch

**Detailed changes:**

| File | Change | Lines |
|------|--------|-------|
| `modules/sheet-engine.js` | `setSheetState('peek')` → `setSheetState('half')` in `initSheet()` | ~201 |
| `modules/sheet-engine.js` | Also update the post-RAF re-measure block (line ~208) to re-set `half` not `peek` | ~208 |
| `modules/sheet-engine.js` | Ensure `renderSheetList()` fires on half-state (check if it already does via the scroll handler) | ~754-821 |
| `glass.css` | Verify that half-state CSS shows content area, list skeleton, and filter chips correctly (likely already works) | sheet rules |

**Edge cases:**
- If `state.locatieParam` is set → keep sheet hidden (detail view takes over)
- If `sharedShortlistIds` → half is fine, shows the shortlist
- Skeleton cards should show while data loads (verify existing skeleton logic covers half-state)

### Change 2: Canonical Filter Model

**What:** Define ONE authoritative filter schema that all UI surfaces derive from. Eliminate duplicates, fill gaps, and add high-value missing filters.

**Canonical schema:**

```
┌─────────────────────────────────────────────────────┐
│  CANONICAL FILTER GROUPS                             │
├──────────────┬──────────────────────────────────────┤
│ Group        │ Filters                              │
├──────────────┼──────────────────────────────────────┤
│ type         │ all, play, farm, nature, museum,     │
│              │ swim, pancake, horeca                 │
│              │ (+ favorites as view toggle)          │
├──────────────┼──────────────────────────────────────┤
│ situaties    │ rain, outdoor-coffee, dreumesproof,  │
│ (presets)    │ peuterproof, now-open, short-drive,  │
│              │ lunch-play, terras-kids               │
├──────────────┼──────────────────────────────────────┤
│ weer         │ indoor, outdoor                      │
├──────────────┼──────────────────────────────────────┤
│ leeftijd     │ dreumes (0-2), peuter (2-5)          │
├──────────────┼──────────────────────────────────────┤
│ faciliteiten │ coffee, diaper, alcohol               │
├──────────────┼──────────────────────────────────────┤
│ eten_drinken │ food_fit: full, snacks               │
│              │ (replaces broken "Lunch" chip)        │
├──────────────┼──────────────────────────────────────┤
│ praktisch    │ parking_ease: easy                   │
│              │ buggy_friendliness: easy              │
│              │ price_band: free, budget              │
├──────────────┼──────────────────────────────────────┤
│ afstand      │ 5 km, 10 km, 25 km                  │
│              │ (requires user location)              │
├──────────────┼──────────────────────────────────────┤
│ persoonlijk  │ favorites-only toggle                 │
└──────────────┴──────────────────────────────────────┘
```

**New filters added (from existing DB fields):**
- `food_fit` → "Restaurant" (full) / "Snacks" (snacks) — replaces broken "Lunch" chip
- `parking_ease` → "Makkelijk parkeren" (easy)
- `buggy_friendliness` → "Buggy-vriendelijk" (easy)
- `price_band` → "Gratis" (free) / "Budget" (budget)

**Inconsistencies fixed:**
- Add `alcohol` to filter modal (currently missing)
- Add `Pannenkoeken` to sheet type chips (currently missing)
- Remove duplicate "Koffie" from "Eten & drinken" group (already in Faciliteiten)
- Replace non-functional "Lunch" chip with `food_fit` filter
- Ensure preset chips are available in all 3 preset locations (strip, sheet, modal)

**State changes:**

| File | Change |
|------|--------|
| `modules/state.js` | Add `activePractical: { parking: false, buggy: false }` and `activeFoodFit: null` and `activePriceBand: null` to state |
| `modules/state.js` | Add `FILTER_SCHEMA` constant — single source of truth defining all groups, options, labels |
| `modules/filters.js` | Add `togglePractical(key)`, `toggleFoodFit(value)`, `togglePriceBand(value)` functions |
| `modules/filters.js` | Update `resetAllFilters()` to clear new filters |
| `modules/filters.js` | Update `updateFilterCount()` and `updateMapFilterBadge()` to count new filters |
| `modules/data.js` | Add `parking_ease`, `buggy_friendliness`, `food_fit`, `price_band` to Supabase query filters in `fetchLocationsLive()` |

### Change 3: Progressive Disclosure in Filter Modal

**What:** Restructure the filter modal into collapsible groups. Default: show compact "quick filters" (situaties, weather, age). Expandable: facilities, food, practical, distance.

**Layout (mobile filter modal):**

```
┌──────────────────────────────────────┐
│  Filters                          ×  │
├──────────────────────────────────────┤
│                                      │
│  SITUATIES (always visible)          │
│  [Rain] [Buiten+koffie] [Dreumes..] │
│  [Peuter..] [Nu open] [Korte rit]   │
│  [Lunch+spelen] [Terras+kids]       │
│                                      │
│  WEER (always visible)               │
│  [Binnen] [Buiten]                   │
│                                      │
│  LEEFTIJD (always visible)           │
│  [Dreumes 0-2] [Peuter 2-5]         │
│                                      │
│  ─── Meer opties ▾ ────────────     │
│                                      │
│  FACILITEITEN (collapsed)            │
│  [Koffie] [Verschonen] [Alcohol]     │
│                                      │
│  ETEN & DRINKEN (collapsed)          │
│  [Restaurant] [Snacks]              │
│                                      │
│  PRAKTISCH (collapsed)               │
│  [Makkelijk parkeren]                │
│  [Buggy-vriendelijk]                 │
│  [Gratis] [Budget]                   │
│                                      │
│  AFSTAND (collapsed)                 │
│  [5 km] [10 km] [25 km]             │
│                                      │
│  PERSOONLIJK (collapsed)             │
│  [Alleen bewaard]                    │
│                                      │
│  ┌──────────────────────────────┐   │
│  │     Toon X resultaten        │   │
│  └──────────────────────────────┘   │
│                                      │
│  Wis alle filters                    │
└──────────────────────────────────────┘
```

**Disclosure logic:**
- **Always visible** (layer 1): Situaties, Weer, Leeftijd — the most-used filters, zero taps to reach
- **Collapsed** (layer 2): Behind "Meer opties" divider — Faciliteiten, Eten & drinken, Praktisch, Afstand, Persoonlijk
- **Auto-expand:** If any collapsed filter is active, its group auto-expands (user sees what's filtering)
- **"Meer opties" button:** Toggles all collapsed groups open/closed with smooth height animation
- **Result count:** "Toon X resultaten" button shows live count
- **Reset:** "Wis alle filters" link at bottom, only visible when filters are active

**Detailed changes:**

| File | Change |
|------|--------|
| `app.html` | Rewrite `#filter-modal` body: new group structure with `data-group` attributes, "Meer opties" toggle, preset chips in modal, new filter chips (parking, buggy, food_fit, price_band), "Wis alle filters" link, result count in apply button |
| `glass.css` | Add `.filter-modal-divider` styles, `.filter-modal-collapsible` hide/show with `max-height` transition, auto-expanded group highlight |
| `modules/sheet-engine.js` | Update `initFilterModal()`: "Meer opties" toggle handler, auto-expand logic for active groups, live result count on filter change |
| `modules/filters.js` | Wire new chip click handlers through existing `data-action`/`data-value` pattern |
| `modules/data.js` | Add `getFilteredCount()` — returns count without full render (for live preview in apply button) |

---

## Steps (Implementation Order)

### Phase A: State & Data Layer (no UI changes yet)
1. **`modules/state.js`** — Add new state properties + `FILTER_SCHEMA` constant
2. **`modules/filters.js`** — Add new toggle functions, update counters, update `resetAllFilters()`
3. **`modules/data.js`** — Add new Supabase query params in `fetchLocationsLive()` + add `getFilteredCount()`

### Phase B: Sheet Default Change
4. **`modules/sheet-engine.js`** — Change default from peek → half (2 lines)
5. Verify lazy loading triggers correctly at half-state

### Phase C: Filter Modal Rebuild + Progressive Disclosure
6. **`app.html`** — Rewrite `#filter-modal` with canonical groups + progressive disclosure structure
7. **`glass.css`** — Add collapsible group styles, divider, max-height transition animation
8. **`modules/sheet-engine.js`** — Update `initFilterModal()` for new groups, toggle, auto-expand, live count
9. **`modules/filters.js`** — Wire new chip handlers via `data-action`/`data-value`

### Phase D: Sync All Filter Surfaces
10. **`app.html`** — Add Pannenkoeken to `#sheet-filter-chips`
11. **`app.html`** — Update sidebar filter panel to match canonical model (add food_fit, practical chips)
12. **`modules/filters.js`** — Update `syncModalChips()` for new groups, update `syncFilterPanelForViewport()`
13. **`app.js`** — Export new toggle functions to window

### Phase E: Polish & Verify
14. Build bundles, run `npm test` + `npm run test:e2e`
15. Visual QA: mobile 390px + desktop 1280px screenshots
16. Test sheet states: app loads → half (new default) → drag to full → back to half
17. Test filter modal: open, "Meer opties" expand, apply filters, verify badge counts
18. Test every new filter chip (parking, buggy, food_fit, price_band) → verify results filter correctly
19. Test auto-expand: activate a collapsed filter → re-open modal → group is expanded
20. Push + verify CI green + purge CDN

---

## Files to Modify

| File | Changes | Size |
|------|---------|------|
| `modules/state.js` | Add state props, FILTER_SCHEMA | Small |
| `modules/filters.js` | New toggles, counter updates, sync updates | Medium |
| `modules/data.js` | New query params, getFilteredCount() | Medium |
| `modules/sheet-engine.js` | Default state change, modal init rewrite | Medium |
| `app.html` | Filter modal rebuild, sheet chips fix, sidebar sync | Large |
| `glass.css` | Collapsible group styles, animation | Medium |
| `app.js` | Export new functions to window | Small |

---

## Parallel Subagent Strategy

These phases can be parallelized:

```
Agent 1: Phase A (state.js + filters.js + data.js)  ─┐
                                                       ├→ Agent 4: Phase D + E (sync + QA)
Agent 2: Phase B (sheet-engine.js default change)     ─┤
                                                       │
Agent 3: Phase C (modal HTML + CSS + JS)              ─┘
```

- **Agent 1:** Phase A — state.js + filters.js + data.js changes (data layer)
- **Agent 2:** Phase B — sheet-engine.js default change (fast, 2 lines)
- **Agent 3:** Phase C — app.html modal rebuild + glass.css styles + sheet-engine.js modal init

After all three complete:
- **Agent 4:** Phase D (sync all surfaces) + Phase E (build/test/visual QA)

Each agent gets full context: file paths, line numbers, exact changes, and the canonical schema to ensure consistency.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Half-default shows empty sheet before data loads | Verify skeleton cards display in half-state; sheet-engine already has skeleton logic |
| New filters break existing Supabase queries | New filters are additive `AND` clauses; null/false = no filter applied |
| Collapsible groups feel sluggish | Use CSS `max-height` transition ≤200ms, not JS animation |
| Live result count is expensive | `getFilteredCount()` reuses existing filter pipeline, returns `.length` without rendering cards |
| Modal rewrite breaks existing filter sync | Extend existing `data-action`/`data-value` pattern, don't replace |
| CSS brace imbalance from modal rewrite | Pre-commit hook catches this; also manual check before commit |
| Parallel agents create merge conflicts | Agents edit different files; Phase D reconciles after all complete |

---

## Verification

1. **Automated:** `npm test` + `npm run test:e2e` pass (no new failures beyond pre-existing)
2. **Visual QA (mobile 390px):**
   - App loads → sheet opens at half (not peek) ← **Change 1**
   - Cards visible immediately, skeleton during data load
   - Tap filter button → modal opens with progressive disclosure ← **Change 3**
   - Layer 1 (situaties, weer, leeftijd) visible immediately
   - Tap "Meer opties" → layer 2 expands smoothly
   - New filters visible: Makkelijk parkeren, Buggy-vriendelijk, Gratis, Restaurant, Snacks ← **Change 2**
   - Apply filters → badge shows, results filter correctly
   - Reset filters → all clear, badge gone
   - Activate a collapsed filter → close + reopen modal → group auto-expanded
3. **Visual QA (desktop 1280px):**
   - Sidebar shows updated filter panel matching canonical model
4. **Cross-check:** activate filter in modal → verify same filter shows active in sidebar (and vice versa)
5. **Performance:** half-default doesn't add visible load time
