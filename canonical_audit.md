# Canonical Consistency Audit — PeuterPlannen

Date: 2026-03-26
Scope: Full product system audit across 7 areas

---

## 1. Filters & Filter Groups

### CA-001 — Modal reset sets wrong types, destroys activePractical
- **Category:** state-fix
- **Severity:** HIGH
- **Description:** `sheet-engine.js:770-774` sets `state.activePractical = ''` (string) instead of `{ parking: false, buggy: false }` (object). Also sets `activePreset/activeFoodFit/activePriceBand` to `''` instead of `null`, and `activeSort` to `'relevance'` instead of `'default'`.
- **Source of truth:** `filters.js:resetAllFilters()` (line 396)
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Replace modal reset body with exact assignments from `resetAllFilters()`, or call `resetAllFilters()` directly and just close the modal.
- **Risk:** `state.activePractical = ''` causes TypeError on next `state.activePractical.parking` read. Critical.

### CA-002 — sheet-filter-chip uses legacy activeTag setter, breaks multi-select
- **Category:** component-fix
- **Severity:** HIGH
- **Description:** `sheet-engine.js:632` uses `state.activeTag = filter` which always replaces `activeTags` with a single-item array via the backward-compat setter. A user clicking a sheet chip while multiple tags are active collapses to single-select. Line 633 also spuriously clears `state.activeWeather = null`.
- **Source of truth:** `state.activeTags` (array), toggled via `toggleTag()` in `filters.js`
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Replace `state.activeTag = filter` with proper multi-select toggle logic matching `toggleTag()`.
- **Risk:** Medium — changes sheet chip behavior.

### CA-003 — updateMoreBadge undercounts active filters
- **Category:** state-fix
- **Severity:** MEDIUM
- **Description:** `sheet-engine.js:866-877` counts only 5 filter conditions. Missing: `activeFacilities.alcohol`, `activeFoodFit`, `activePriceBand`, `activePractical.parking`, `activePractical.buggy`, `activePreset`, `activeTags.length`, `activeFavorites`.
- **Source of truth:** `filters.js:getAdvancedFilterCount()` (lines 39-53)
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Import and use `getAdvancedFilterCount()` from filters.js instead of inline counting.
- **Risk:** Low.

### CA-004 — updateSheetMeta missing preset labels
- **Category:** component-fix
- **Severity:** LOW
- **Description:** `sheet-engine.js:649-651` preset label map is missing `dreumesproof` and `terras-kids`. When either preset is active, the sheet meta silently omits the label.
- **Source of truth:** `state.js:PRESET_LABELS` (lines 74-83)
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Import and use `PRESET_LABELS` from state.js instead of a local partial map.
- **Risk:** None.

### CA-005 — Dead map-preset-row code
- **Category:** remove
- **Severity:** LOW
- **Description:** `filters.js:488-500` defines `syncMapPresetRow()` targeting `#map-preset-row` and `.map-preset-chip` — these DOM elements don't exist in app.html. The function silently no-ops.
- **Affected files:** `modules/filters.js`
- **Proposed fix:** Remove `syncMapPresetRow()`, `syncMapFilterChips()`, and any dead references.
- **Risk:** None — dead code removal.

### CA-006 — Age filter label hyphen mismatch
- **Category:** rename
- **Severity:** MEDIUM
- **Description:** Desktop chip bar (`app.html:329-330`) uses en-dash `(0–2)`, but filter modal (`app.html:757-758`) and FILTER_SCHEMA (`state.js:184-185`) use hyphen `(0-2)`. `filters.js:278-279` matches on en-dash. Modal chips will never match.
- **Source of truth:** Use en-dash `–` everywhere (matches what `syncTypeChips` expects)
- **Affected files:** `modules/state.js`, `app.html`
- **Proposed fix:** Replace hyphens with en-dashes in FILTER_SCHEMA and modal HTML.
- **Risk:** None.

---

## 2. Cards & Field Priority

### CA-007 — renderDetailView score bug: divides by 10
- **Category:** component-fix
- **Severity:** HIGH
- **Description:** `sheet.js:314` does `Math.round(v2.total / 10)` — V2 total is already 0-10, so this yields 0 or 1. Mobile detail uses `v2.total` correctly.
- **Source of truth:** `computePeuterScoreV2` returns `{ total: 0-10 }`
- **Affected files:** `modules/sheet.js`
- **Proposed fix:** Use `v2.total` directly (or `Math.round(v2.total * 10)` if 0-100 scale needed).
- **Risk:** Desktop detail score display is currently broken — fixing improves it.

### CA-008 — Desktop detail bypasses getDistanceLabel
- **Category:** component-fix
- **Severity:** MEDIUM
- **Description:** `sheet.js:46-53` computes its own distance estimate inline, ignoring `getDistanceLabel()` and `state.lastTravelTimes`. When GPS travel times are available, the desktop detail shows a different (less accurate) distance than scan cards.
- **Source of truth:** `card-data.js:getDistanceLabel()`
- **Affected files:** `modules/sheet.js`
- **Proposed fix:** Use `getDistanceLabel(loc, state.lastTravelTimes?.[loc.id])`.
- **Risk:** Low — improves consistency.

### CA-009 — renderCompactCard uses ScoreV1
- **Category:** component-fix
- **Severity:** MEDIUM
- **Description:** `templates.js:77` imports `computePeuterScore` (V1). All other surfaces use V2. Tier thresholds differ: V1 uses `>= 8` (high), V2 uses `>= 7` (high).
- **Source of truth:** `computePeuterScoreV2` in `scoring.js`
- **Affected files:** `modules/templates.js`
- **Proposed fix:** Import `computePeuterScoreV2` and use `getScoreTier()` from `card-data.js`.
- **Risk:** Score values may change slightly for compact cards.

### CA-010 — renderInSheetDetail has inline facility/reasons logic
- **Category:** component-fix
- **Severity:** MEDIUM
- **Description:** `sheet-engine.js:1045-1064` reconstructs facility and kenmerken arrays inline instead of using `getFacilitiesGrid()` and `getKenmerkenTags()` from `card-data.js`. Detail-specific additions (`food_fit`, `buggy_friendliness`, `toilet_confidence`) extend beyond the canonical set.
- **Source of truth:** `card-data.js:getFacilitiesGrid()` and `getKenmerkenTags()`
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Use `getFacilitiesGrid(loc)` for facilities. Extend `getKenmerkenTags` to accept a max > 3 for detail views, or add the extra tags to the canonical function.
- **Risk:** Medium — may change detail view content.

### CA-011 — plan.js fully disconnected from card-data.js
- **Category:** component-fix
- **Severity:** LOW
- **Description:** `plan.js:177-183` has inline `getLocationPhoto()` and `getTypeLabel()` duplicating `getPhotoData()` and `TYPE_LABELS`. Labels like `'indoor': 'Binnenspeeltuin'` don't exist in TYPE_LABELS.
- **Source of truth:** `card-data.js:getPhotoData()`, `state.js:TYPE_LABELS`
- **Affected files:** `modules/plan.js`
- **Proposed fix:** Import and use the canonical helpers.
- **Risk:** Low.

---

## 3. Naming/Copy Inconsistencies

### CA-012 — `both` vs `hybrid` weather value: bug in sheet-engine detail
- **Category:** merge
- **Severity:** HIGH
- **Description:** DB has both `hybrid` and `both` meaning the same thing. `sheet-engine.js:1062-1063` only checks `hybrid`, so locations with `weather='both'` show neither "Binnen" nor "Buiten" in the mobile detail facility pills. All other files (`card-data.js`, `scoring.js`, `state.js`) handle both values.
- **Source of truth:** Normalize to `both` (pipeline already does this)
- **Affected files:** `modules/sheet-engine.js`
- **Proposed fix:** Add `|| loc.weather === 'both'` to both lines. Long-term: migrate all `hybrid` to `both` in DB.
- **Risk:** None.

### CA-013 — farm: "Boerderij" vs "Kinderboerderij(en)"
- **Category:** rename
- **Severity:** MEDIUM
- **Description:** TYPE_LABELS says `farm: 'Boerderij'` (state.js:68). Homepage and nav say "Kinderboerderijen" (index.html:420, app.html:149). SEO chip says "Kinderboerderij" (app.html:562). URL is `kinderboerderijen.html`.
- **Source of truth:** Decide on one: `Kinderboerderij` is more specific and matches user expectation.
- **Affected files:** `modules/state.js`, `app.html` chips
- **Proposed fix:** Change TYPE_LABELS `farm` to `'Kinderboerderij'`.
- **Risk:** Low — label only change.

### CA-014 — Preset label variations
- **Category:** rename
- **Severity:** LOW
- **Description:** Three surfaces show different labels for the same presets:
  - `Terrasje met de kids` (PRESET_LABELS) vs `Terrasje + kids` (FILTER_SCHEMA/modal) vs `Terrasje+kids` (sheet, no spaces)
  - `Lunch+spelen` / `Buiten+koffie` in sheet (no spaces) vs `Lunch + spelen` / `Buiten + koffie` elsewhere
- **Source of truth:** `PRESET_LABELS` in state.js should be canonical
- **Affected files:** `modules/state.js`, `app.html` sheet presets
- **Proposed fix:** Normalize all to match PRESET_LABELS. Add spaces around `+` in sheet presets.
- **Risk:** None.

---

## 4. State Models

### CA-015 — switchViewDesktop doesn't write state.currentView
- **Category:** state-fix
- **Severity:** MEDIUM
- **Description:** `layout.js:82` (mobile) writes `state.currentView = view`. `layout.js:69` (desktop) does not. Any code reading `state.currentView` on desktop sees a stale value.
- **Affected files:** `modules/layout.js`
- **Proposed fix:** Move `state.currentView = view` to the common `switchViewCore` path so it runs for both viewports.
- **Risk:** Low.

---

## 5. Query Params / Deep-Linking / Presets

### CA-016 — 6 filter dimensions have no URL param representation
- **Category:** map
- **Severity:** LOW
- **Description:** `activeFacilities`, `activeFoodFit`, `activePriceBand`, `activePractical`, `activeRadius`, `activeFavorites` cannot be set via URL params. Sharing a filtered view loses these filters.
- **Affected files:** `app.js` (URL parsing IIFE)
- **Proposed fix:** Add URL param handlers for important filters (at minimum `facilities` and `radius`). Low priority.
- **Risk:** None.

### CA-017 — Chip sync in app.js uses querySelector (first match only)
- **Category:** component-fix
- **Severity:** LOW
- **Description:** `app.js:121` `document.querySelector('.chip.active')?.classList.remove('active')` only removes the first active chip. Should use `querySelectorAll` + `forEach`.
- **Affected files:** `app.js`
- **Proposed fix:** Replace with `document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'))`.
- **Risk:** None.

---

## 6. Homepage Browse vs App Taxonomy

### CA-018 — `culture` type missing from TYPE_LABELS and app filter chips
- **Category:** map
- **Severity:** HIGH
- **Description:** Homepage links to `cultuur.html` (exists, built from TYPE_MAP). But `TYPE_LABELS` in state.js doesn't include `culture`, and neither chip surface has a `culture` chip. Locations with `type=culture` show the raw English key as their type badge.
- **Source of truth:** TYPE_MAP in `.scripts/lib/config.js` includes `culture`.
- **Affected files:** `modules/state.js`, `app.html`
- **Proposed fix:** Add `culture: 'Cultuur'` to TYPE_LABELS. Add chip to both chip rows.
- **Risk:** None.

---

## 7. Database Fields vs UI Exposure

### CA-019 — verification_confidence + verification_mode not in SELECT
- **Category:** component-fix
- **Severity:** HIGH
- **Description:** `scoring.js:210,236,247,360` uses `verification_confidence` and `verification_mode` for V2 reliability score and trust bullets. Neither field is in `FULL_LOCATION_SELECT` (state.js:100). The reliability dimension permanently defaults to 5/10, and trust bullets never populate.
- **Affected files:** `modules/state.js`
- **Proposed fix:** Add both fields to `FULL_LOCATION_SELECT` and `FALLBACK_LOCATION_SELECT`.
- **Risk:** Increases fetch payload slightly. Score values will change (improve accuracy).

### CA-020 — always_open not in SELECT
- **Category:** component-fix
- **Severity:** MEDIUM
- **Description:** `scoring.js:22` `isLocationOpenNow()` checks `loc.always_open` for the "Nu open" preset. Not fetched. Always-open locations fail the preset filter.
- **Affected files:** `modules/state.js`
- **Proposed fix:** Add `always_open` to `FULL_LOCATION_SELECT`.
- **Risk:** None.

### CA-021 — Dead fetched fields: owner_verified, photo_quality
- **Category:** remove
- **Severity:** LOW
- **Description:** `owner_verified` and `photo_quality` are in FULL_LOCATION_SELECT but used nowhere in any runtime module.
- **Affected files:** `modules/state.js`
- **Proposed fix:** Remove from SELECT to reduce payload.
- **Risk:** None — verify no future use planned first.

### CA-022 — opening_hours not shown in desktop detail
- **Category:** component-fix
- **Severity:** LOW
- **Description:** Mobile detail (`sheet-engine.js:1069`) and compact card (`templates.js:97`) show opening hours. Desktop detail (`sheet.js:openLocSheet`) does not.
- **Affected files:** `modules/sheet.js`
- **Proposed fix:** Add opening_hours to the desktop detail info grid.
- **Risk:** None.
