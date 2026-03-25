# Canonical Fix Plan — PeuterPlannen

Derived from canonical_audit.md (2026-03-26). Organized by effort and risk.

---

## Quick Wins (rename/copy/config fixes, no logic change)

### QW-1: Fix age filter label hyphen mismatch (CA-006)
- **Files:** `modules/state.js:184-185`, `app.html:757-758`
- **Change:** Replace `-` with `–` (en-dash) in FILTER_SCHEMA age labels and filter modal HTML
- **Test:** `npm test` + verify `syncTypeChips` still highlights age chips correctly
- **Dependencies:** None

### QW-2: Add missing preset labels to updateSheetMeta (CA-004)
- **Files:** `modules/sheet-engine.js:649-651`
- **Change:** Import `PRESET_LABELS` from `state.js` and use it instead of inline partial map. Or add `'dreumesproof': 'dreumesproof', 'terras-kids': 'terrasje + kids'` to the local map.
- **Test:** `npm test` + activate dreumesproof/terras-kids preset and verify label shows in sheet meta
- **Dependencies:** None

### QW-3: Normalize preset button labels in sheet (CA-014)
- **Files:** `app.html:690,693,695`
- **Change:** Add spaces around `+`: `Lunch+spelen` → `Lunch + spelen`, `Buiten+koffie` → `Buiten + koffie`, `Terrasje+kids` → `Terrasje + kids`
- **Test:** Visual check
- **Dependencies:** None

### QW-4: Unify "Terrasje" preset label (CA-014)
- **Files:** `modules/state.js:81`
- **Change:** Change `PRESET_LABELS['terras-kids']` from `'Terrasje met de kids'` to `'Terrasje + kids'` to match FILTER_SCHEMA
- **Test:** `npm test`
- **Dependencies:** QW-3

### QW-5: Fix querySelector to querySelectorAll for chip sync (CA-017)
- **Files:** `app.js:121`
- **Change:** `document.querySelector('.chip.active')?.classList.remove('active')` → `document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'))`
- **Test:** `npm test`
- **Dependencies:** None

### QW-6: Add culture type to TYPE_LABELS (CA-018)
- **Files:** `modules/state.js:68`
- **Change:** Add `culture: 'Cultuur'` to TYPE_LABELS
- **Test:** `npm test` + verify culture-type locations show "Cultuur" badge
- **Dependencies:** None (chip addition is Medium — see MS-6)

### QW-7: Change farm label to Kinderboerderij (CA-013)
- **Files:** `modules/state.js:68`
- **Change:** `farm: 'Boerderij'` → `farm: 'Kinderboerderij'`
- **Test:** `npm test` + verify all card type badges say "Kinderboerderij"
- **Dependencies:** None

---

## Medium Structural (state/logic fixes, need testing)

### MS-1: Fix modal reset to use canonical state types (CA-001) — CRITICAL
- **Files:** `modules/sheet-engine.js:762-785`
- **Change:** Replace the reset handler body with:
  ```js
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
  ```
- **Test:** E2E: activate multiple filters → open modal → click reset → verify no TypeError + all filters cleared + correct result count
- **Dependencies:** None

### MS-2: Fix weather `both` vs `hybrid` bug in detail facility pills (CA-012)
- **Files:** `modules/sheet-engine.js:1062-1063`
- **Change:** Add `|| loc.weather === 'both'` to both conditions:
  ```js
  if (loc.weather === 'indoor' || loc.weather === 'hybrid' || loc.weather === 'both') facilities.push(...)
  if (loc.weather === 'outdoor' || loc.weather === 'hybrid' || loc.weather === 'both') facilities.push(...)
  ```
- **Test:** Load a location with `weather='both'` and verify both "Binnen" and "Buiten" pills appear
- **Dependencies:** None

### MS-3: Fix renderDetailView score /10 bug (CA-007)
- **Files:** `modules/sheet.js:314`
- **Change:** `Math.round(v2.total / 10)` → `v2.total` (or `Math.round(v2.total * 10) / 10` for one decimal)
- **Test:** Open desktop detail → verify score shows a reasonable 0-10 number, not 0 or 1
- **Dependencies:** None

### MS-4: Add verification_confidence + verification_mode to SELECT (CA-019)
- **Files:** `modules/state.js:100` (FULL_LOCATION_SELECT), `modules/state.js:103` (FALLBACK_LOCATION_SELECT)
- **Change:** Append `, verification_confidence, verification_mode` to both select strings
- **Test:** `npm test` + Open detail view → verify trust bullets appear + score reliability dimension > 5
- **Dependencies:** None — DB fields exist, just not fetched

### MS-5: Add always_open to SELECT (CA-020)
- **Files:** `modules/state.js:100`
- **Change:** Append `, always_open` to FULL_LOCATION_SELECT
- **Test:** Activate "Nu open" preset → verify always-open locations appear in results
- **Dependencies:** None

### MS-6: Fix sheet-filter-chip multi-select support (CA-002)
- **Files:** `modules/sheet-engine.js:621-637`
- **Change:** Replace `state.activeTag = filter` with proper multi-select toggle:
  ```js
  if (filter === 'all') {
      state.activeTags = [];
      state.activeFavorites = false;
  } else {
      const idx = state.activeTags.indexOf(filter);
      if (idx >= 0) state.activeTags.splice(idx, 1);
      else state.activeTags.push(filter);
  }
  ```
  Remove the spurious `state.activeWeather = null` line.
- **Test:** E2E: tap Museum chip → tap Speeltuin chip → verify both active + results show both types
- **Dependencies:** MS-1 (modal reset must be fixed first)

### MS-7: Fix updateMoreBadge to use canonical count (CA-003)
- **Files:** `modules/sheet-engine.js:866-877`
- **Change:** Import `getAdvancedFilterCount` from `filters.js` and use it:
  ```js
  function updateMoreBadge() {
      const count = getAdvancedFilterCount();
      const badge = document.getElementById('filter-more-badge');
      if (badge) { badge.textContent = count || ''; badge.hidden = !count; }
  }
  ```
- **Test:** Activate multiple filter types → verify badge shows correct total count
- **Dependencies:** None

### MS-8: Fix desktop detail distance to use getDistanceLabel (CA-008)
- **Files:** `modules/sheet.js:46-53`
- **Change:** Import `getDistanceLabel` from `card-data.js`. Replace inline distance computation with:
  ```js
  const distLabel = getDistanceLabel(loc, state.lastTravelTimes?.[loc.id]);
  ```
- **Test:** Set GPS location → open desktop detail → verify distance shows GPS travel time
- **Dependencies:** None

### MS-9: Fix switchViewDesktop to write state.currentView (CA-015)
- **Files:** `modules/layout.js:69` or common `switchViewCore` path
- **Change:** Add `state.currentView = view` before the desktop-specific logic
- **Test:** `npm test` + switch views on desktop → verify state.currentView is correct
- **Dependencies:** None

### MS-10: Switch compact card to ScoreV2 (CA-009)
- **Files:** `modules/templates.js:77`
- **Change:** Import `computePeuterScoreV2` instead of `computePeuterScore`. Use `getScoreTier()` from card-data.js for tier classification.
- **Test:** Visual check — compact card score badges may show slightly different values
- **Dependencies:** None

---

## Later Cleanup (larger refactors, separate session)

### LC-1: Remove dead map-preset-row code (CA-005)
- **Files:** `modules/filters.js:488-500`
- Remove `syncMapPresetRow()`, `syncMapFilterChips()`, and dead DOM references

### LC-2: Consolidate renderInSheetDetail inline facilities/reasons with card-data.js (CA-010)
- **Files:** `modules/sheet-engine.js:1045-1064`
- Extend `getFacilitiesGrid()` and `getKenmerkenTags()` to cover the extra detail-only fields, then use them

### LC-3: Wire plan.js to card-data.js (CA-011)
- **Files:** `modules/plan.js:177-183`
- Replace inline `getLocationPhoto` and `getTypeLabel` with imports from card-data.js and state.js

### LC-4: Remove dead fetched fields (CA-021)
- **Files:** `modules/state.js:100`
- Remove `owner_verified`, `photo_quality` from SELECT after confirming no future use

### LC-5: Add opening_hours to desktop detail (CA-022)
- **Files:** `modules/sheet.js`
- Add opening_hours display parity with mobile detail

### LC-6: Add culture chip to filter bars (CA-018)
- **Files:** `app.html:314-319, 701-707`
- Add `<button class="chip" data-type="culture">Cultuur</button>` to both chip rows

### LC-7: URL param support for additional filters (CA-016)
- **Files:** `app.js`
- Add `?facilities=`, `?food=`, `?radius=` param handlers
