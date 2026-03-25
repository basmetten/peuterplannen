# PeuterPlannen — Project Rules for Claude Code

## Project overview
PeuterPlannen.nl is a vanilla HTML/CSS/JS web app that helps parents find toddler-friendly outings across the Netherlands. It uses MapLibre GL maps, Supabase as backend, and is hosted on GitHub Pages + Cloudflare.

## Architecture
- `app.html` — main interactive SPA
- `app.css` / `app.min.css` — styles
- `app.js` — entry point, imports ES modules
- `modules/` — 19 ES modules (state, map, sheet, cards, filters, etc.)
- `design-system.css` / `glass.css` / `fonts.css` — shared styles
- `.scripts/` — build scripts, pipeline, audits
- `.scripts/__tests__/` — Node.js unit + snapshot tests
- Static pages: ~2200 generated HTML files per city/region

## Key UI components
- **Bottom sheet**: 4 states (peek / half / full / hidden), managed by `sheet-engine.js`
- **Map**: MapLibre GL with clusters, markers, popup cards — `modules/map.js`
- **Filter chips**: type, weather, age, radius, presets — `modules/filters.js`
- **Location cards**: rendered by `modules/cards.js`
- **Tabs**: Ontdek, Kaart, Favorieten, Plan, Info — `modules/layout.js`
- **Desktop**: split layout (sidebar + map), no bottom sheet

## Commands
- `npm run build` — full static site generation (needs Supabase secrets)
- `npm run build:local` — local build with fixtures
- `npm run dev` — local dev server on port 3000
- `npm test` — all tests (unit + snapshot)
- `npm run test:unit` — unit tests only
- `npm run audit:tokens` — design token compliance

## Dev server for visual testing
Start the dev server before any Playwright/visual testing:
```bash
cd /Users/basmetten/peuterplannen && npx serve -l 8771 --no-clipboard . &
```
The app is then at `http://localhost:8771/app.html`.

## MapLibre testing
The map instance is at `state.mapInstance` (in modules/state.js). To check map loaded state from Playwright:
```js
await page.waitForFunction(() => {
  const map = document.querySelector('#map')?.__maplibregl;
  return map && map.loaded();
}, { timeout: 15000 });
```

---

## MANDATORY TESTING RULES

These rules are NON-NEGOTIABLE. You MUST follow them on every task.

### Rule 1: Test after EVERY visual change
After editing ANY of these files, you MUST run `/verify-change` before reporting done:
- `app.css`, `app.min.css`, `design-system.css`, `glass.css`, `fonts.css`
- `app.html`
- Any file in `modules/`

"Reporting done" means ANY of: "Done", "All changes applied", "Fixed", "Updated", "The fix is in place", "Changes complete", "Implemented", "Should work now".

You are NOT ALLOWED to say any of these phrases until you have taken and inspected screenshots.

### Rule 2: What /verify-change means
1. Ensure dev server is running (`npx serve -l 8771 --no-clipboard . &`)
2. Take mobile screenshot (390x844) of `http://localhost:8771/app.html`
3. Take desktop screenshot (1280x800) of `http://localhost:8771/app.html`
4. Inspect BOTH screenshots yourself — describe what you see
5. If the change affects a specific component (sheet, filter, map, card), interact with it and screenshot the result
6. If anything looks wrong, fix it BEFORE reporting done

### Rule 3: Full QA on major changes
For changes that affect layout, sheet behavior, navigation, or multiple components, run `/visual-qa` instead of just `/verify-change`. Major changes include:
- Any change to `sheet-engine.js` or `sheet.js`
- Any change to `layout.js`
- CSS changes affecting layout (flexbox, grid, position, z-index)
- Changes to more than 3 files in a single task

### Rule 4: Build verification
After changing build-related files (`.scripts/`, templates), run:
```bash
npm run test:unit
```
After any HTML template change, run the full test suite:
```bash
npm test
```

### Rule 5: Never skip verification
- If Playwright MCP is unavailable, use Puppeteer via Bash to take screenshots
- If the dev server won't start, fix that first
- If screenshots show issues, fix them — do NOT report "done with caveats"
- The user should NEVER have to find visual bugs you could have caught

### Rule 6: Gemini second opinion
For ambiguous visual issues, get a Gemini Flash second opinion:
```bash
curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Analyze this screenshot for visual bugs: layout issues, overflow, clipping, spacing problems, broken elements. Be specific."},{"inlineData":{"mimeType":"image/png","data":"'"$(base64 -i screenshot.png)"'"}}]}]}'
```
(GEMINI_API_KEY is set in the environment. Never commit it.)

### Rule 7: Console error monitoring (CRITICAL)
After ANY change to JS modules or app.html, check for JavaScript errors:
```javascript
// In Playwright tests or ad-hoc scripts, ALWAYS add:
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
// At end of test: assert errors.length === 0
```
A broken import, failed Supabase call, or unhandled exception MUST cause a test failure. Never assume "page loaded = no errors".

### Rule 8: Test data correctness, not just UI state
When testing interactions, assert the RESULT, not just that "something happened":
- **Search**: after typing, assert results appear AND contain matching text
- **Filters**: after clicking a chip, assert displayed cards match the filter (e.g., all have the correct `data-type`)
- **Detail view**: after navigating to `?locatie=X`, assert the location name, image, and key data actually loaded
- **Cards**: assert cards contain real data (name, image src, type badge) — not just that card elements exist
- **Map markers**: after map loads, assert markers/clusters are present (`document.querySelectorAll('.maplibregl-marker').length > 0`)

### Rule 9: Test error and empty states
Always consider what happens when things go wrong:
- What if Supabase returns 0 results for a filter combination?
- What if a network request fails?
- What if favorites/visited localStorage is empty?
Test these states — don't only test the happy path.

### Rule 10: Run `npm run test:e2e` before reporting done
After ANY change to CSS, JS, or HTML app files, the full e2e suite must pass:
```bash
cd /Users/basmetten/peuterplannen && npm run test:e2e
```
If a test fails, fix the code (not the test) unless the change was intentional. If the change is intentional, update baselines with `npm run test:e2e:update`.
This is separate from visual verification — BOTH must happen.

---

## Testing protocol (IMPORTANT)

### Three-layer testing strategy
The project uses machine-readable verification instead of visual judgment:

| Layer | Command | What it catches |
|-------|---------|-----------------|
| **Functional** | `npm run test:e2e -- tests/functional.spec.ts` | Broken interactions, navigation, filter/search logic |
| **Visual regression** | `npm run test:e2e -- tests/smoke.spec.ts` | Layout shifts, missing elements, color changes (pixel-diff) |
| **Structural (CSS)** | `npm run test:e2e -- tests/structural.spec.ts` | Wrong font-size, padding, colors, responsive breakpoints |
| **Accessibility** | `npm run test:a11y` | ARIA violations, missing alt text, role issues |
| **All e2e tests** | `npm run test:e2e` | Everything above |

### When to run which tests
- After CSS/layout changes: `npm run test:e2e` (all three layers)
- After JS logic changes: `npm run test:e2e -- tests/functional.spec.ts`
- After component changes: `npm run test:e2e -- tests/structural.spec.ts`
- Before every commit: `npm test` (unit tests) + CSS brace balance (pre-commit hook handles this)
- After visual redesigns: `npm run test:e2e:update` to update screenshot baselines

### Rules
- Use ASSERTIONS and PIXEL-DIFFS, not visual judgment of screenshots
- Run tests AFTER every change, BEFORE reporting done
- If a test fails, fix the CODE, not the test (unless the change is intentional)
- After intentional visual changes: update baselines with `npm run test:e2e:update`
- Never skip tests — if they can't run, fix the blocker first

## Deploy workflow

### After pushing to main:
Bundle files are tracked in git. The pre-commit hook auto-rebuilds them. After push:
```bash
# Purge Cloudflare cache (REQUIRED after CSS/JS changes)
source ~/.env.cloudflare
ZONE_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=peuterplannen.nl" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['id'])")
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" -d '{"purge_everything":true}'
```

### Pre-commit hook (auto-installed):
- Rebuilds `app.bundle.css` and `app.bundle.js` via `npm run bundle`
- Checks CSS brace balance in `app.css` and `glass.css`
- Stages the rebuilt bundles automatically

## Git workflow
- Run `npm test` before committing
- Never force-push to main
- Never commit `.env`, credentials, or API keys
- Bundle files (`app.bundle.css`, `app.bundle.js`) MUST be committed — they are served directly by GitHub Pages

## Style guidelines
- Vanilla JS — no frameworks, no build step for frontend
- ES modules with explicit imports
- Design tokens defined in `design-system.css` — use CSS custom properties
- Mobile-first responsive design
- Minimum 44px tap targets
- No "AI slop" aesthetics (Inter font, purple gradients, generic layouts)
