# Plan: Homepage CTA-hiërarchie + Browse-bundeling (Roadmap 9 & 10)

## Goal
Simplify the homepage so it has **one clear primary action** above the fold, and merge the "per type" and "per regio" browse sections into **one coherent browse block** — reducing scroll depth, decision friction, and fragmentation.

## Current state (problems)

### Above the fold
- **4 competing CTAs**: "Uitjes in de buurt" (primary), "Plan je dag", "Inspiratie", "Ons verhaal"
- "Inspiratie" and "Ons verhaal" are secondary/tertiary content posing as equal-weight actions
- "Door een vader van twee peuters" trust line is buried and disconnected
- The primary CTA label "Uitjes in de buurt" requires GPS permission — can feel like a commitment

### Browse sections (below fold)
- **Two separate sections** with identical visual language (same card grid, same heading style):
  1. "Uitjes per type" (8 type cards + 6 situatie links)
  2. "Uitjes per regio" (22 region cards + 2 meta links)
- Combined scroll depth: ~1800px on mobile just for browse
- "Of kies op situatie" feels like an afterthought bolted onto the type section
- Region section is clamped at 340px on mobile with a "show all" button — creates friction
- Both sections share `.cities-section` and `.city-card` classes (even types use city-card) — semantic confusion
- The 6 situatie-links and 2 meta-links feel disconnected

## Approach

### Part A: Hero CTA hierarchy (Roadmap 9)
**One primary action, everything else demoted.**

1. **Keep "Uitjes in de buurt"** as the single primary CTA (it's the core loop entry)
2. **Add a secondary text link** "of zoek op plaats of type" that scrolls to the browse section — gives an alternative for users who don't want GPS
3. **Remove "Inspiratie" and "Ons verhaal"** from above-fold CTAs — they're in the nav already
4. **Keep "Plan je dag"** but restyle as a subtle secondary link, not a glass card
5. **Move trust statement** up — place "2138 uitjes, door ouders gecheckt" more prominently as a trust badge rather than subtitle
6. **Tighten vertical spacing** — hero should breathe but not sprawl

### Part B: Unified browse section (Roadmap 10)
**One heading, two browse modes (type / regio) under tabs or toggle.**

1. **Single section**: "Ontdek uitjes" (or "Zoek en ontdek")
2. **Two sub-modes** via lightweight inline tabs: "Per type" | "Per regio"
   - Default: "Per type" (more actionable, answers "what kind of day")
   - Tab switch shows region grid (no page reload, CSS/JS toggle)
3. **Situatie-links** become a compact row below the type grid (they're type-adjacent)
4. **Meta-links** ("Alles geordend bekijken", "Hoe we selecteren") move to a single subtle footer line below both tab contents
5. **Region grid** shows top 8 regions by default, expandable — no separate "show all" button needed, tab already provides focus
6. **One card style** for both (already the case visually, now also semantically)

## Steps

### Step 1: Hero simplification
**Files**: `index.html` (lines 355-392 + inline CSS 184-231)

1. Remove `hero-cta-row` div with "Plan je dag", "Inspiratie", "Ons verhaal" glass cards
2. Add a secondary text link below primary CTA: `<a class="hero-secondary-link">of zoek op type of regio</a>` that smooth-scrolls to `#browse`
3. Restyle trust line: move "2138 uitjes" count into a small badge/kicker above the h1
4. Simplify hero-sub to just "Door ouders gecheckt. Altijd actueel."
5. Remove associated CSS for `.hero-cta-row`, `.hero-cta-secondary`
6. Add minimal CSS for `.hero-secondary-link` (text link style, coral color, centered)

### Step 2: Merge browse sections into one
**Files**: `index.html` (lines 409-592 + inline CSS 252-267)

1. Replace both `<section class="cities-section">` blocks with one:
   ```html
   <section class="browse-section pp-reveal" id="browse">
     <div class="container">
       <h2 class="section-title">Ontdek uitjes</h2>
       <div class="browse-tabs">
         <button class="browse-tab active" data-tab="type">Per type</button>
         <button class="browse-tab" data-tab="regio">Per regio</button>
       </div>
       <div class="browse-panel active" id="browse-type">
         <!-- type cards grid (8 cards) -->
         <!-- situatie links compact row -->
       </div>
       <div class="browse-panel" id="browse-regio">
         <!-- region cards grid (22 cards, top 8 visible) -->
       </div>
       <p class="browse-meta">
         <a href="/ontdekken/">Alles geordend bekijken</a> ·
         <a href="/methode/">Hoe we selecteren</a>
       </p>
     </div>
   </section>
   ```

2. Add tab switching JS (simple, no framework):
   - Click handler toggles `.active` on tabs and panels
   - CSS: `.browse-panel { display: none; } .browse-panel.active { display: block; }`

3. Restyle situatie-links as compact pill-chips below the type grid instead of full-width cards

### Step 3: CSS cleanup and new styles
**Files**: `index.html` inline `<style>` block

1. Add `.browse-section`, `.browse-tabs`, `.browse-tab`, `.browse-panel`, `.browse-meta` styles
2. Tab design: underline-style tabs (not pill tabs) — fits editorial warmth brand
3. Remove `.show-all-regions` button (replaced by tab interaction)
4. Keep `.city-card` as-is (works for both type and region cards)
5. Region grid: show all on desktop, first 2 rows (8 items) on mobile with "Alle regio's" link

### Step 4: Update build generator
**Files**: `.scripts/lib/generators/index-page.js`

1. Update marker system: replace `TYPE_GRID` + `CITY_GRID` with single `BROWSE_SECTION` marker
2. Both type and region data still injected at build time
3. Blog preview section unchanged

### Step 5: Gemini UI review
1. Take mobile (390px) + desktop (1280px) screenshots of new homepage
2. Run `/gemini-ui` with task: "Review homepage CTA hierarchy and browse section redesign"
3. Apply feedback
4. Final verification

## Files to modify
| File | Change |
|------|--------|
| `index.html` | Hero simplification, browse section merge, new inline CSS |
| `.scripts/lib/generators/index-page.js` | Update markers for new browse section |
| `pp-interactions.js` | Add tab switching logic, remove show-all-regions handler |

## Risks
1. **SEO**: The type and region pages are linked from these grids — must preserve all `<a>` links with same hrefs. Tab-hidden content is still in DOM, so crawlers see it.
2. **Build system**: Marker replacement in `index-page.js` needs to match new HTML structure. Test with `npm run build:local`.
3. **Scroll-to-browse**: The `#browse` anchor link from hero needs smooth scroll behavior.
4. **Mobile tab UX**: Tabs must be large enough tap targets (44px min height).
5. **Situatie links on mobile**: Currently pills on mobile, full cards on desktop. Merging might lose desktop descriptions. Keep descriptions in `title` attr or tooltip.

## Verification
1. `npm test` — unit tests pass
2. `npm run test:e2e` — e2e tests pass (may need baseline updates for homepage)
3. Visual QA: mobile 390px + desktop 1280px screenshots
4. Gemini UI review pass
5. All existing links still work (type pages, region pages, guide pages)
6. Tab switching works without JS errors
7. Build generator produces correct output: `npm run build:local`
