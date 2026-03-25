Full interactive QA pass for PeuterPlannen. Run this after major changes (layout, sheet, navigation, multi-file edits).

## Prerequisites
1. Dev server running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8771/app.html` — if not 200, start it:
   ```bash
   cd /Users/basmetten/peuterplannen && npx serve -l 8771 --no-clipboard . &
   sleep 2
   ```
2. Console error monitoring — add this to EVERY page you open:
   ```javascript
   const errors = [];
   page.on('pageerror', e => errors.push(e.message));
   page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
   ```

## Phase 1: Mobile (390x844)

### 1.1 Initial load
- Navigate to `http://localhost:8771/app.html`
- Wait for cards to appear (`.compact-card` visible)
- Screenshot → `qa-mobile-initial.png`
- **Assert**: at least 5 cards visible, each has a name and image
- **Assert**: no JS console errors

### 1.2 Sheet states
- Verify sheet is in `peek` state: `document.querySelector('#bottom-sheet')?.dataset?.state === 'peek'`
- Drag/click to `half` state → screenshot
- Drag/click to `full` state → screenshot
- Press Escape → verify returns to `peek`
- **Assert**: each state transition changes `data-state` attribute correctly

### 1.3 Tabs
- Click each tab: Ontdek, Kaart, Favorieten, Plan, Info
- Screenshot each tab state
- **Assert**: Kaart tab shows map canvas (`.maplibregl-canvas` visible)
- **Assert**: Favorieten tab shows empty state or saved items
- **Assert**: active tab has visual indicator

### 1.4 Search
- Tap search pill → verify search input appears
- Type "artis" → wait 500ms for debounce
- **Assert**: search suggestions/results appear AND contain "Artis" text
- Click a result → **Assert**: detail view opens with location name, image, data
- Press back/Escape → verify return to list

### 1.5 Filters
- Click a type filter chip (e.g., Speeltuin)
- **Assert**: chip shows `aria-pressed="true"`
- **Assert**: ALL visible cards have matching `data-type`
- **Assert**: card count changed from initial
- Click again to deselect → verify cards reset

### 1.6 Map
- Switch to Kaart tab
- Wait for map to load: `page.waitForFunction(() => document.querySelector('#map')?.__maplibregl?.loaded())`
- **Assert**: map markers or clusters are present
- Click a marker → verify popup or card appears
- **Assert**: no JS errors during map interaction

## Phase 2: Desktop (1280x800)

### 2.1 Layout
- Navigate to `http://localhost:8771/app.html`
- **Assert**: sidebar visible (`.sidebar` or similar)
- **Assert**: map visible alongside sidebar (split layout)
- **Assert**: no bottom sheet visible on desktop
- Screenshot → `qa-desktop-initial.png`

### 2.2 Cards & interactions
- **Assert**: cards in sidebar contain name, image, type badge
- Click a card → **Assert**: detail view loads with real data
- Test sort dropdown → verify card order changes
- Test filter chips → verify filtered results match

### 2.3 Search
- Click search → type query → **Assert**: results appear with matching text
- Click result → **Assert**: detail loads

## Phase 3: Automated tests

### 3.1 Run the full e2e suite
```bash
cd /Users/basmetten/peuterplannen && npm run test:e2e
```
- ALL tests must pass
- If any fail, fix the code before continuing

### 3.2 Run unit tests
```bash
cd /Users/basmetten/peuterplannen && npm test
```

## Phase 4: Final checks

### 4.1 Console errors
Review collected console errors from all phases. There should be ZERO errors. If any exist, investigate and fix.

### 4.2 Gemini second opinion (if uncertain about visual quality)
```bash
curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Compare these screenshots of a Dutch toddler activities app. Check for: layout issues, overflow, clipping, spacing, broken elements, text readability. Is this production-ready?"},{"inlineData":{"mimeType":"image/png","data":"'"$(base64 -i qa-mobile-initial.png)"'"}},{"inlineData":{"mimeType":"image/png","data":"'"$(base64 -i qa-desktop-initial.png)"'"}}]}]}'
```

### 4.3 Report
Summarize what you tested, what passed, and any issues found+fixed. Only report done when ALL phases pass.

## $ARGUMENTS
If arguments are provided, focus the QA on that specific area but still run Phase 3 (automated tests).
