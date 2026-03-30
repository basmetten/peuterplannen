# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3+4 complete** — location detail pages, region/type hub pages, city+type combo pages, sitemap, robots.txt, redirects.
**Phase 3 blog/guides complete** — 57 blog posts migrated, blog index, guides overview, sitemap updated.
**Route restructuring complete** — unified `(app)` shell replaces `(marketing)` + `(pwa)`.
**Phase 3 progressive enhancement complete** — interactive map on SSR content pages (desktop), now with persistent map.
**Code review hardening complete** — 9 issues fixed (2 critical, 7 warnings).
**Mobile interactive sheet complete** — SSR content pages use draggable bottom sheet on mobile (CSS-first, zero CLS).
**Phase 3.5 photo migration complete** — 2,324 photos uploaded to Cloudflare R2, all DB URLs updated, all components use `getPhotoUrl()` helper.
**Phase 4A complete** — Error boundaries on root, (app), and (legal) route segments. Graceful fallback UI in Dutch.
**Phase 4B complete** — Favorites system: localStorage-backed `useFavorites` hook, heart icons on cards + detail view, favorites list view with empty state.
**Phase 4C complete** — Cloudflare Image Resizing: `OptimizedImage` component, all client + server images use `/cdn-cgi/image/` transform URLs with appropriate presets (card 144x144, hero 800x600, OG 1200x630).
**Phase 4D complete** — Sheet physics refactor: extracted `useSheetDrag` hook (DRY), logarithmic rubber-banding, distance-proportional spring duration, strong fling detection, scroll lock timeout, ref-based position tracking.
**Phase 4E complete** — Filter system completion: price band (multi-select), peuterproof score (7+/8+/9+ presets), age range (0-2/2-4/4-6 presets). All URL-persisted, all with empty-state removable pills. LocationSummary extended with `min_age`, `max_age`.
**Phase 4F complete** — Plan view: localStorage-backed `usePlan` hook (ordered list), reorderable with up/down controls, numbered route display, "Toevoegen aan plan" button on detail view. Empty state with guidance.
**Phase 4G complete** — Empty states + offline banner: all tab states have empty states (browse filters, favorites, plan). OfflineBanner component in root layout shows Dutch notification when offline.
**Phase 4H complete** — Desktop sidebar tabs: segmented control (Ontdek/Bewaard/Plan) at top of sidebar. Desktop users can now access favorites and plan views. All Phase 4 exit criteria met.
**Phase 5A complete** — Playwright E2E tests: 44 tests (22 desktop + 22 mobile), all passing. Core flows covered: home, search, filters, detail, favorites, plan, SSR pages, navigation, error handling.
**UX correction complete** — Replaced bottom TabBar with sheet mode switcher (3 pills inside sheet header: Ontdek/Bewaard/Plan). Mode-aware map markers. No "Kaart" tab — map always visible. Per `CORRECTION-sheet-mode-switcher.md` and updated `docs/v2/information-architecture.md`.
**Phase 5B complete** — Accessibility: axe-core integration, 22 tests, zero critical/serious violations. WCAG AA color contrast fixed (label tokens, accent, category badges). Skip link, `<main>` landmarks, focus-visible styles, nested-interactive fix. Analytics: GA4 with Consent Mode v2, typed event module (seo-analytics.md §9 taxonomy), web-vitals CWV reporting. Performance: Lighthouse CI config with budgets. Visual regression: 16 screenshot baselines.
**Phase 5C complete** — Analytics event wiring: all typed events from `src/lib/analytics.ts` now fire from UI components. detail_open (map/card source), debounced search_query, filter_apply (type/weather/price/score/age), favorite_toggle, plan_add/remove, website_click, route_click. All no-ops without `NEXT_PUBLIC_GA_ID`.
**Phase 6 complete** — Apple Maps iOS visual polish: floating sheet (margins + radius + drop-shadow), glass header (backdrop blur on drag handle + mode pills), GPU optimizations, CategoryGrid (2×4 SVG icons replacing type chips), "In de buurt" nearby locations, ClusterList (vertical card list on mobile replacing carousel).
**Staging deployment complete** — v2 live at `staging.peuterplannen.nl` via `@opennextjs/cloudflare` (Cloudflare Workers). GitHub Actions secrets set. Google Maps API key already restricted.
**Library migration complete** — cmdk + Fuse.js (fuzzy search), Embla Carousel (nearby + desktop carousel). Vaul was tried for bottom sheet but crashed iOS Safari (GPU memory exhaustion from `will-change: transform` + MapLibre WebGL) — reverted to custom `useSheetDrag` hook with Issue A fix (swipe-anywhere-to-expand at non-full snaps). Old SearchInput.tsx deleted. Glass/backdrop-filter tokens removed.
**Phase 7 Silk Polish complete** — MapLibre GPU optimization (pixelRatio:1, maxTileCacheSize:12, fadeDuration:0, fill-extrusion removal), Silk sheet integration (@silk-hq/components replaces custom Sheet.tsx for AppShell), Apple Maps detail view redesign (share/close buttons, quick info row, "Goed om te weten" section), CSS iOS polish (tap feedback, touch improvements), GPS location button (GeolocateControl with warm styling).
**Phase 8 Stability & Polish complete** — GPU stability (single map instance, freeze during animations, WebGL context loss handling), edge-to-edge bleed (overscroll color, safe areas), desktop CarouselOverlay→sidebar ClusterList, desktop browse↔detail slide transition (150ms, parallax), sidebar collapse toggle (localStorage-persisted), search results group fade. Photo gallery skipped (needs multi-photo DB field).
**Phase 9 Home & Navigation Redesign complete** — Mode switcher removed (Ontdek/Bewaard/Plan pills gone). New HomeContent with curated sections: search, categories, guides strip, bewaard/plan previews, filters, location list. Silk SheetStack integration: all drill-downs (detail, cluster, favorites, plan, guide) push as stacked sheet layers with 93.3% scale-back animation. GuideDetailView loads blog posts via dynamic import with client-side markdown rendering. Desktop: 60px icon nav column (search/book/heart/plan) + 380px content panel = 440px sidebar. GuideListView with featured/city/recent sections. All deployed to staging.

## Architecture (current)

Three route groups, per `docs/v2/information-architecture.md`:

| Group | Layout | Purpose |
|-------|--------|---------|
| `(app)` | Persistent map + MapStateProvider + QueryProvider | All user-facing pages: home, region hubs, type hubs, location detail, guides, blog |
| `(portal)` | Simple header, no map | Partner dashboard (future) |
| `(legal)` | Minimal header + footer links | Privacy, terms, about, contact |

### Route map

```
app/
  (app)/
    layout.tsx          — QueryProvider + MapStateProvider + PersistentMap (desktop)
    page.tsx            — Home: interactive map app (AppShell, ISR 5min)
    AppShell.tsx         — Client component: map, sheet, sidebar, filters, cards, carousel
    [region]/
      page.tsx          — Region + type hub (SSR, ContentShell + map, ISR 24h)
      [slug]/
        page.tsx        — Location detail + city+type combo (SSR, ContentShell + map, ISR 24h)
    blog/
      page.tsx          — Blog index (SSG, ContentShell, ISR 24h)
      [slug]/
        page.tsx        — Blog post (SSG, ContentShell, ISR 24h)
    guides/
      page.tsx          — Guides overview (SSG, ContentShell, ISR 24h)
  (portal)/
    layout.tsx          — Simple header
    partner/
      page.tsx          — Placeholder
  (legal)/
    layout.tsx          — Minimal header + footer links
    privacy/page.tsx    — Placeholder
    terms/page.tsx      — Placeholder
    about/page.tsx      — Placeholder
    contact/page.tsx    — Placeholder
  api/
    locations/route.ts  — force-dynamic
    locations/[id]/route.ts — force-dynamic
  sitemap.ts
  robots.ts
  layout.tsx            — Root: metadata template, viewport, global styles
  not-found.tsx
```

### Persistent map architecture

The `(app)` layout hosts a persistent MapLibre GL map that never unmounts during intra-app navigation:

```
(app)/layout.tsx (server)
  └── QueryProvider (client)
      └── MapStateProvider (client) — holds locations, hrefs, highlightId
          ├── PersistentMapLoader (client, dynamic) — desktop only, loads MapLibre lazily
          │   └── PersistentMap (client) — reads MapStateContext, updates markers/bounds
          └── {children} (page content)
              └── ContentShell (server) — renders MapUpdater + ContentSheetContainer
                  ├── MapUpdater (client) — pushes page data to MapStateContext
                  └── ContentSheetContainer (client) — responsive sheet/sidebar
```

- **Desktop**: sidebar (420px, absolute left) + persistent map (fills viewport behind sidebar)
- **Mobile**: draggable bottom sheet (peek/half/full) — no map (MapLibre not loaded — saves ~200KB)
- **Home page**: AppShell renders its own MapContainer on top, hiding persistent map
- **Blog/guides**: MapUpdater sets empty locations → map shows NL with no markers
- **Content→content navigation**: map persists, markers update smoothly, bounds fly to new locations

Key files:
- `src/context/MapStateContext.tsx` — React context + provider + `useMapState` hook
- `src/components/layout/PersistentMap.tsx` — MapLibre GL with dynamic data updates
- `src/components/layout/PersistentMapLoader.tsx` — `next/dynamic` + desktop gate via `useIsDesktop`
- `src/components/layout/MapUpdater.tsx` — invisible client component, pushes page data to context

### ContentShell + mobile sheet

`src/components/layout/ContentShell.tsx` — server component wrapping SSR content:
- Renders `MapUpdater` to push location data to persistent map
- Delegates layout to `ContentSheetContainer` (client component)
- Map props: `mapLocations`, `mapRegionSlug`/`mapRegionSlugMap`, `mapHighlightId`

`src/components/layout/ContentSheetContainer.tsx` — responsive layout container:
- **Desktop (≥768px)**: 420px sidebar panel (absolute left, z-10), scroll, border/shadow
- **Mobile (<768px)**: Draggable bottom sheet with peek/half/full snap states
- **CSS-first approach**: Base layout is pure CSS (`.content-sheet` in globals.css), no JS needed for SSR
  - Mobile default: `position: fixed; bottom: 0; transform: translateY(50%)` → half state
  - Desktop override: `@media (min-width: 768px)` → `position: absolute; width: 420px; transform: none !important`
  - Zero CLS on both viewports
- **Client enhancement**: After hydration on mobile, drag handler + scroll-to-drag handoff activate
- **Initial snap by page type**: `half` for location pages (via `.content-sheet`), `full` for blog/guides (via `.content-sheet--full`)
- Built-in drag logic (extracted from `Sheet.tsx`): velocity-based fling, closest-snap fallback, corner radius morphing
- Footer: partner link + privacy/terms/about/contact links

**Known issue**: Turbopack (dev mode) strips `.content-sheet` CSS rules. Use `npm run build && npx next start` for accurate testing. Production builds work correctly.
- Blog/guides pages don't pass map props → persistent map shows no markers

### Blog data architecture

Blog posts are bundled at build time to avoid `fs.readFileSync` at runtime (Cloudflare Pages constraint):

```
content/posts/*.md          — 57 markdown source files (frontmatter + body)
v2/scripts/bundle-posts.mjs — prebuild script (reads .md → generates JSON, validates dates + descriptions)
v2/src/content/blog-posts.generated.json — bundled post data
v2/src/domain/blog.ts       — Zod schema (BlogPost, BlogPostMeta, description min 1 char)
v2/src/server/repositories/blog.repo.ts — data access layer
v2/src/lib/markdown.ts      — unified/remark/rehype render pipeline
```

The `prebuild` npm script runs `bundle-posts.mjs` before every build. The markdown pipeline includes a `rehypeRewriteLinks` plugin that converts old-style links (`/amsterdam.html`, `/app.html?regio=X`, trailing slashes) to v2 routes.

## What happened this session

### Phase 8: GPU Stability, Edge-to-Edge, Desktop Transitions & Polish

**8A: GPU Stability Foundation:**
- Single map instance: added `appMapActive` flag to MapStateContext — PersistentMap doesn't render when AppShell's MapContainer is active (prevents dual WebGL contexts)
- Map freeze during sheet animations: `useMapFreeze` hook freezes MapLibre render loop, `flyTo` sequenced AFTER sheet animation (450ms delay)
- Skip `map.resize()` on mobile (leftOffset=0)
- WebGL context loss/restored handlers on canvas
- CarouselOverlay conditionally rendered (unmount when hidden)
- `renderWorldCopies: false` on both map instances

**8B: Edge-to-Edge Visual Bleed:**
- `html { background-color: #E8DED5; overscroll-behavior: none }` — matches map tile edges
- GPS button uses `env(safe-area-inset-*)` for notch/Dynamic Island
- `interactive-widget=resizes-visual` prevents map reflow on keyboard open

**8C: Desktop CarouselOverlay → Sidebar ClusterList:**
- Removed floating CarouselOverlay on desktop (Funda-style → Apple Maps style)
- ClusterList now renders inside sidebar on both mobile and desktop

**8D: Desktop Browse↔Detail Slide Transition:**
- Detail panel slides in from right (`translateX(100%→0)`, 150ms ease-out)
- Browse panel shifts left 30% for parallax depth
- Browse content stays mounted (scroll position preserved on back)
- `inert` attribute disables browse panel when detail is open

**8E: Photo Gallery — SKIPPED:**
- Data model only has single `photo_url` per location
- Gallery needs `additional_photos` DB field — deferred to future phase

**8F: Desktop Sidebar Collapse Toggle:**
- Toggle button on map edge, chevron icon flips based on state
- Sidebar slides out with `transform: translateX(-380px)`, map fills full width
- State persisted in localStorage (`pp-sidebar-collapsed`)
- Desktop only

**8G: Search Results Fade:**
- `fadeInGroup` keyframe: opacity + translateY, 200ms, applied to Command.List as a whole
- Apple Maps pattern: entire group fades, no card stagger

### Phase 7: Silk Sheet + Apple Maps Detail Redesign + Performance

**7A: MapLibre GPU memory optimization:**
- `pixelRatio: 1` (saves 50-75% canvas VRAM on Retina)
- `maxTileCacheSize: 12` (down from ~45)
- `fadeDuration: 0` (no fade on zoom)
- Remove 3D `fill-extrusion` layers on load (can use 900MB+ on iOS)
- Applied to both MapContainer and PersistentMap

**7B: Silk sheet integration (`@silk-hq/components`):**
- `SilkSheet.tsx` — controlled wrapper mapping our snaps to Silk detents
- Detents: `25lvh` (peek), `50lvh` (half), content height `92lvh` (full)
- `inertOutside={false}` — map stays interactive behind sheet
- `SpecialWrapper` for Safari compatibility without backdrop
- `Scroll.Root` + `Scroll.View` for scroll-to-drag handoff
- `scrollGesture` disabled until last detent reached (no content scroll at peek/half)
- `swipeDismissal={false}`, `swipeOvershoot={true}`
- Silk CSS layered import for Tailwind V4 compatibility
- **NEEDS IPHONE TESTING** — if crashes like Vaul, revert immediately

**7C: Apple Maps detail view redesign:**
- Share button (left) + X close button (right) replace back arrow
- Route button now first (primary action)
- Quick info row: score, type, price (compact, evenly spaced)
- Photo moved below quick info (Apple Maps: actions first)
- New "Goed om te weten" section surfacing hidden DB fields:
  buggy_friendliness, toilet_confidence, parking_ease, food_fit,
  rain_backup_quality, noise_level, shade_or_shelter
- 7 custom SVG icons (stroller, toilet, parking, food, umbrella, volume, sun)
- Updated skeleton to match new layout

**7D: CSS iOS polish:**
- `-webkit-tap-highlight-color: transparent` on all interactive elements
- `touch-action: manipulation` (removes 300ms tap delay)
- `-webkit-user-select: none` on UI chrome
- LocationCard press feedback: scale(0.97) on press, spring bounce-back

**7E: GPS location button:**
- MapLibre GeolocateControl (top-right, both map instances)
- `trackUserLocation: true`, `showAccuracyCircle: true`
- Custom styling: 44px, 12px radius, warm bg, accent color active state
- Pulse animation while waiting for GPS signal
- User location dot + accuracy circle in accent color

### Previous: Library migration: cmdk + Fuse.js + Embla (Vaul reverted)

**Vaul attempted and reverted:** Vaul was installed and VaulSheet.tsx built as a thin wrapper. Deployed to staging — immediately crashed iOS Safari. Root cause: Vaul injects `will-change: transform` on `[data-vaul-drawer]` and a `::after` pseudo-element at 200% height, creating permanent GPU compositing layers. Combined with MapLibre WebGL canvas, this exhausts iOS Safari's ~300-500MB GPU memory budget. VaulSheet.tsx deleted, vaul package removed.

**Issue A fix (custom useSheetDrag):** Instead of Vaul, Issue A was fixed directly in `useSheetDrag.ts`. At non-full snaps (peek/half), swiping anywhere on the content area moves the sheet — content scrolling is only allowed at the full snap. This matches Apple Maps behavior. Three changes: `scrollTouchStart` locks overflow at non-full snaps, `scrollTouchMove` begins drag immediately at non-full snaps, `scrollTouchEnd` restores overflow.

**cmdk + Fuse.js migration (SearchInput → SearchCommand):**
- `src/features/search/SearchCommand.tsx` — fuzzy search across all 2000+ locations
- Fuse.js keys: name (0.7), region (0.2), type (0.1), threshold 0.3
- Results grouped by type with colored circle badges
- cmdk provides keyboard navigation (arrow keys, enter)
- Old `SearchInput.tsx` deleted

**Embla Carousel migration:**
- `src/components/patterns/HorizontalCardStrip.tsx` — reusable Embla-based horizontal scroll
- Used in DetailView's "In de buurt" nearby locations (replaces manual `overflow-x-auto`)
- `CarouselOverlay.tsx` refactored: Embla replaces manual scroll-snap + scrollend + IntersectionObserver

**Glass/backdrop-filter removal:** All `backdrop-filter: blur()` removed from sheet components. `--color-glass-bg`, `--backdrop-blur-glass`, `--glass-blur` tokens removed. Sheet header uses solid `bg-bg-primary`. Shadow simplified to `0 -2px 16px rgba(0,0,0,0.10)`.

**Cloudflare Workers:** User upgraded to paid plan ($5/mo, 10 MiB limit) to accommodate larger bundle.

### Previous: Staging deployment to Cloudflare Workers

**Infrastructure completed:**
1. **GitHub Actions secrets set** — `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` via `gh secret set`
2. **Google Maps API key verified** — already restricted to `peuterplannen.nl/*` + `staging.peuterplannen.nl/*`
3. **`@opennextjs/cloudflare` adapter** — installed and configured in v2/
   - `wrangler.jsonc` — targets `peuterplannen-staging` worker, route `staging.peuterplannen.nl/*`
   - `open-next.config.ts` — minimal config (no ISR bindings for staging)
   - `initOpenNextCloudflareForDev()` added to `next.config.ts`
   - `npm run deploy:staging` script: `opennextjs-cloudflare build && wrangler deploy`
4. **v2 deployed and verified** at `staging.peuterplannen.nl`:
   - Home page: sidebar, CategoryGrid, map, location cards, photos loading
   - Detail view: location data, action buttons, description, facilities
   - Blog/SSR pages: full content rendering, breadcrumbs
   - API routes: HTTP 200
   - Sitemap: HTTP 200

**Bug fix: image lazy loading deadlock**
- `content-visibility: auto` on `.card-list > *` combined with `loading="lazy"` creates an IntersectionObserver deadlock: content-visibility hides elements → browser never detects them for lazy loading → images never load
- Fix: changed `OptimizedImage` default from `loading="lazy"` to `loading="eager"`. Performance stays good because `content-visibility: auto` already handles render optimization.

**Deployment architecture:**
- v2 runs on Cloudflare Workers (not Pages) via `@opennextjs/cloudflare`
- Static assets served from Workers Static Assets (.open-next/assets)
- ISR not configured (build-time static pages served as-is — fine for staging)
- `peuterplannen.nl` (production) remains on GitHub Pages (old app, untouched)
- `staging.peuterplannen.nl` now serves v2 via Cloudflare Workers

### Cloudflare edge caching on API routes

Added `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60` to both API route success responses (`/api/locations` and `/api/locations/[id]`). 404/error responses intentionally not cached. Reduces Supabase egress ~99% — Cloudflare edge serves cached responses for 1 hour. `force-dynamic` stays on both routes so code executes on cache miss.

### Previous: Phase 6 code review fixes (4 critical, 3 warning)

1. **CategoryGrid hidden during search** (critical) — wrapped in `!filters.query` guard in BrowseContent
2. **ClusterList desktop guard** (critical) — added `!isDesktop` check; desktop uses CarouselOverlay
3. **overflow-clip instead of overflow-hidden** (critical) — prevents Safari from creating a new stacking context that breaks `backdrop-filter` on `.glass` children
4. **Stagger animations removed** (critical) — removed `animate-[fadeSlideIn]` + `animationDelay` wrappers from card list; cards render instantly (Apple Maps behavior)
5. **Margin transition properties** (warning) — `margin` → `margin-inline` + `margin-bottom` for correct CSS transition targeting
6. **Glass token warm white** (warning) — `oklch(1 0 0 / 0.85)` → `rgba(255, 250, 247, 0.85)` to match `:root` bg-primary warmth
7. **Dead `.sheet-container` CSS removed** (warning) — unused class, Sheet.tsx uses inline styles

Also: visual regression tests now mask the map canvas (`canvas` locator) to eliminate tile-rendering flakiness. Threshold back to 3% (from 5%). All 82 tests passing consistently.

### Phase 6: Apple Maps iOS Visual Polish

**Phase 6-pre: Mandatory cleanup (7 items):**
- Registered glass tokens (`--color-glass-bg`, `--backdrop-blur-glass`) in `@theme inline` + `.glass` utility class
- Fixed empty facilities heading guard in `DetailView.tsx` (no orphaned `<h3>`)
- Replaced hardcoded weather options with `WEATHER_OPTIONS` import in `FilterBar.tsx`
- Removed dead `SHEET_STATES`/`SheetState` exports from `enums.ts`
- Fixed `DetailSkeleton` photo spacing (`mb-3` → `mb-4`)
- Verified `ease-bouncy` was already registered in `@theme inline`
- Note: 6-pre-2 (`.content-sheet` `!important` conflict) documented as awareness — no code change needed

**Phase 6A: Visual Polish — Floating Sheet + Glass + GPU:**
- **Floating sheet**: `Sheet.tsx` uses `floatFactor` (1 at peek → 0 at full) to control `marginInline`, `marginBottom`, `borderRadius`, and `drop-shadow`. All corners round at peek, edge-to-edge at full.
- **Glass header**: Drag handle and sticky header use `.glass` class (semi-transparent + backdrop blur). Scrollable content gets solid `bg-bg-primary` for readability.
- **GPU optimizations**: `will-change: transform` on sheet container, `content-visibility: auto` on `.card-list > *`, `contain: layout style` on scroll container. Cleaned unused GeoJSON properties (`photo_url`, `is_featured`, `price_band`) from MapContainer.
- **AppShellSkeleton** updated to match floating style at peek state

**Phase 6B: Discovery — Category Grid + Nearby:**
- **CategoryGrid component** (`src/components/patterns/CategoryGrid.tsx`): 2×4 grid of category buttons with inline SVG icons and TYPE_COLORS. Replaces type filter chips in `FilterBar`.
- **FilterBar** simplified to secondary filters only (weather, price, score, age). Type filtering moved to CategoryGrid.
- **"In de buurt" section** on DetailView: shows 4-6 nearest locations as horizontal scroll cards with photo, name, type dot, and distance. Uses new `haversine()` utility from `src/lib/geo.ts`. `nearbyLocations` computed in AppShell via `useMemo` when detail is open.
- **NearbyCard** component in DetailView: compact 140px card with photo, name, type dot, distance

**Phase 6C: Monetization-ready — Cluster List:**
- **ClusterList component** (`src/features/carousel/ClusterList.tsx`): vertical card list replacing CarouselOverlay on mobile. Featured locations (`is_featured`) sort to top with "Aanbevolen" badge. Back button + count header.
- **CAROUSEL_OPEN snap** changed from `hidden` to `half` in `sheetMachine.ts`
- **Mobile**: cluster taps show ClusterList in sheet (via `getSheetContent()`)
- **Desktop**: cluster taps show CarouselOverlay (floating, unchanged)
- **Cluster expand** now enabled on both mobile and desktop (was mobile-only)

**Tests:**
- E2E test updated: "has filter chips" → "has category grid" (checks for "Boerderij" instead of "Kinderboerderij")
- Visual regression baselines regenerated for home page states (CategoryGrid changes layout)
- Home page visual tests use 5% tolerance (map tile rendering variance)
- **82 tests total: 44 core + 22 a11y + 16 visual** — 81+ consistently passing, 1 home-initial desktop screenshot occasionally flaky due to map tile loading variance

### Previous: Phase 5D: CI, Map Analytics, Image Quota Optimization, GA4 + Image Resizing Activation

**CI Pipeline:**
- Created `.github/workflows/v2-ci.yml` — triggers on staging pushes/PRs, builds, typechecks, runs E2E + a11y tests with Playwright browser caching

**Analytics events (map + scroll):**
- `trackMapPan(lat, lng, zoom)` — debounced 500ms on moveend in MapContainer
- `trackMapZoom(zoom, direction)` — tracks in/out direction on zoomend
- `trackDetailScrollDepth(locationId, depth)` — IntersectionObserver on 4 invisible markers at 25/50/75/100% in DetailView

**Image Resizing quota optimization:**
- Enabled Cloudflare Image Transformations on peuterplannen.nl zone (Images > Transformations, free tier: 5000/month)
- Removed `/cdn-cgi/image/` resize for OG images (social crawlers get raw R2 URL) — saves 2000+ potential transformations
- With 2000+ locations: card (144×144) + hero (800×600) = max ~4000 transforms, within free limit

**GA4 activated:**
- Set `NEXT_PUBLIC_GA_ID=G-46RW178B97` in `.env.local`
- GA4 stream: PeuterPlannen, https://peuterplannen.nl, Stream-ID 13695083201

### Previous: Phase 5C: Analytics Event Wiring

Wired all typed analytics events from `src/lib/analytics.ts` into UI components:
- **`useFavorites.ts`** — `trackFavoriteToggle(id, add/remove, count)` in `toggleFavorite()`
- **`usePlan.ts`** — `trackPlanToggle(id, add/remove)` in `addToPlan()` / `removeFromPlan()`
- **`AppShell.tsx`** — `trackDetailOpen(id, 'map'|'card')` in marker/card/carousel handlers; debounced `trackSearch(query, count)` (800ms); `trackFilterApply(type, value, count)` via useEffect comparing prev/current filter state
- **`DetailView.tsx`** — `trackWebsiteClick(id, url)` and `trackRouteClick(id, 'google_maps')` on action button clicks

All events are fire-and-forget no-ops without GA4 loaded (`NEXT_PUBLIC_GA_ID` env var).

### Previous: Phase 5B: Quality Gates — Accessibility, Analytics, Performance, Visual Regression

**Accessibility (22 tests, zero violations):**
1. **axe-core integration** — `@axe-core/playwright` tests on home, region, blog pages at both viewports
2. **WCAG AA color contrast fixes**:
   - Label tokens: `label-secondary` 0.60→0.82 (5.8:1), `label-tertiary` 0.30→0.73 (4.6:1)
   - Accent: `#C05A3A`→`#B3553A` (4.73:1) — fixes both accent-on-light and white-on-accent
   - Category badges: darkened `play`, `swim`, `pancake`, `horeca` — all now ≥4.5:1 with white text
3. **Skip link** — "Ga naar inhoud" (sr-only, visible on focus), targets `#main-content`
4. **`<main>` landmarks** — added `id="main-content"` on all 3 route group layouts
5. **Focus-visible styles** — SearchInput uses `focus-visible:ring-2` instead of `focus:outline-none`
6. **LocationCard nested-interactive fix** — changed from `<button>` to `<div>` with sr-only button for keyboard access
7. **Keyboard navigation tests** — search input reachable, filter chips keyboard-activatable

**Analytics (GA4 + event taxonomy):**
1. **`src/lib/analytics.ts`** — typed event functions matching `seo-analytics.md` §9 taxonomy (page_view, search_query, filter_apply, detail_open, favorite_toggle, plan_add, affiliate_click, route_click, website_click, etc.)
2. **`GoogleAnalytics` component** — GA4 with Consent Mode v2 (analytics_storage granted, ad_storage denied). Loads via `next/script` afterInteractive.
3. **`WebVitalsReporter` component** — reports CLS, INP, LCP, FCP, TTFB to GA4. Dynamic import keeps it off critical path.
4. **Root layout** — GA4 conditionally loaded when `NEXT_PUBLIC_GA_ID` env var is set.

**Performance:**
1. **`lighthouserc.json`** — Lighthouse CI config testing 4 representative URLs. Budgets: LCP < 2.5s, CLS < 0.1, a11y ≥ 0.9, perf ≥ 0.8.
2. **`web-vitals` package** — real user CWV monitoring via WebVitalsReporter.
3. **npm scripts**: `test:e2e:a11y`, `test:e2e:visual`, `test:e2e:all`, `test:e2e:update-snapshots`

**Visual regression:**
1. **16 screenshot baselines** — 8 states × 2 viewports (mobile + desktop)
2. **States captured**: home initial, search active, filter active, detail open, region hub, blog post, empty search results, 404 page
3. **Run `npm run test:e2e:update-snapshots`** after intentional visual changes

### Previous sessions
- Phase 5A: Playwright E2E tests (44 tests, WebGL fallback)
- Phase 4H/UX correction: Sheet mode switcher, mode-aware map markers
- Phase 4E/F/G: Filter system, plan view, empty states, offline banner
- Phase 4D: Sheet physics refactor (useSheetDrag, rubber-banding, spring duration)
- Phase 4A/B/C: Error boundaries, favorites system, image optimization
- Phase 3.5: Photo migration to R2 (2,324 files, custom domain photos.peuterplannen.nl)
- Mobile interactive sheet (ContentSheetContainer, CSS-first, zero CLS)
- Code review hardening (9 fixes, 2 critical)
- Persistent map in (app) layout (MapStateContext, PersistentMap, MapUpdater)
- Phase 3 progressive enhancement (ContentMap on SSR pages)
- Phase 3 blog/guides migration (57 posts, index, guides overview)
- Phase 3 Tier 4: city+type combo pages (224 pages)
- Route restructuring: unified (app) shell

## Build stats
- 1330 total pages
- Build time: ~3s static generation
- API routes: force-dynamic
- Home page: ISR 5min
- Hub + detail + blog pages: ISR 24h
- **Test suite**: 82 tests (44 core + 22 a11y + 16 visual regression), ~60s total

## What's NOT done yet

### Phase 3.5 remaining
- Update photo pipeline (`fetch-photos.js`) to upload new photos to R2 instead of disk
- ~108 locations have null photo_url (no local hero.webp found)

### Phase 4 deferred (low priority polish)
- **Distance filter** — requires GPS permission flow (haversine utility now exists in `src/lib/geo.ts`)
- **Mobile map on SSR content pages** — currently warm bg behind sheet (intentional: saves ~200KB MapLibre on mobile)
- Turbopack dev compatibility for `.content-sheet` CSS (works in production)

### Remaining infrastructure
- **Lighthouse CI in CI pipeline** — `lighthouserc.json` config ready, needs GitHub Actions workflow

### Next: Phase 8 — GPU Stability + Desktop Transitions + Edge-to-Edge
See `PHASE-8-STABILITY-AND-POLISH.md` for full spec:
- **8A: GPU stability** — eliminate double MapLibre instances, freeze map during sheet animations, WebGL context loss handling
- **8B: Edge-to-edge bleed** — overscroll color matching, safe area handling, 100dvh map
- **8C: Desktop CarouselOverlay → sidebar ClusterList** — Apple Maps style
- **8D: Desktop browse↔detail slide transition** — 150ms ease-out, scroll position preserved
- **8E: Photo gallery** — in sheet/sidebar, Embla carousel
- **8F: Sidebar collapse toggle** — map goes fullscreen
- **8G: Search results fade** — group fade, no stagger

### After Phase 8: Phase 9 — Home State Redesign + Guides + Stack Navigation
See `PHASE-9-HOME-GUIDES-NAVIGATION.md` for full spec:
- **Remove mode switcher** (Ontdek/Bewaard/Plan pills) — replace with stack navigation
- **Home state**: peek = search only, half = categories + nearby, full = guides + bewaard + plan + all locations
- **Silk SheetStack** for layered navigation (detail, guide, favorites, plan as stacked sheets)
- **Guide detail view** in sheet — hero image + markdown rendered + related locations
- **Desktop nav column** (60px) with icons replacing tab buttons
- **Blog/guide routes stay** for SEO, sheet provides in-app discovery
- **CSS iOS feel** — `touch-action: manipulation` globally, `-webkit-tap-highlight-color: transparent`, `overscroll-behavior: contain` on scroll containers, `pointerdown`/`pointerup` press feedback
- **LazyMotion** — `npm install motion`, `<LazyMotion features={domAnimation} strict>` in root layout, `whileTap={{ scale: 0.96 }}` on tappable elements
- **GPS location button** — MapLibre `GeolocateControl` (built-in, 3-state), custom styling, inline error messages

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Persistent map | Layout-level MapLibre + React context | Map never unmounts, pages push data via MapUpdater. Home page covers it with AppShell's own MapContainer. |
| Map on mobile | Not loaded | `useIsDesktop` gate prevents MapLibre bundle download on mobile (~200KB savings) |
| Map data flow | Server page → ContentShell → MapUpdater → Context → PersistentMap | Server components compute locations + hrefs, client MapUpdater pushes to context |
| ContentShell positioning | Absolute sidebar (z-10) + transparent right side | Persistent map in layout (z-0) visible through transparent area |
| Mobile content sheet | CSS-first `.content-sheet` + JS drag enhancement | Zero CLS: CSS handles SSR layout, JS adds drag after hydration. `!important` desktop override prevents inline style conflicts. |
| Content sheet initial snap | half for location pages, full for blog/guides | `.content-sheet` = translateY(50%), `.content-sheet--full` = translateY(8%). Server-rendered class, no JS needed. |
| Home page map | Two map instances (AppShell + persistent) | AppShell covers persistent map. Simpler than unifying MapContainer + PersistentMap. |
| Map on blog/guides | Empty markers, map tiles visible | MapUpdater sets empty locations. NL map tiles show as neutral background. |
| Home page route | `/` (was `/app`) | App IS the website per architecture doc |
| Editorial content | Bundled TypeScript module | No fs.readFileSync; works on Cloudflare Pages |
| Blog content | Prebuild script → generated JSON | Same no-fs principle; `npm run prebuild` bundles content/posts/*.md |
| Markdown pipeline | unified + remark + rehype | Server-only, renders at build time during SSG |
| Link rewriting | rehype plugin | Converts .html links, /app.html?regio=X, trailing slashes to v2 routes |
| Route conflict | KNOWN_TYPE_SLUGS checked first | blog/guides are explicit segments (no conflict with [region]) |
| Guides page | Curated view of blog data | Featured + latest + by-city + by-type — all sourced from BlogRepository |
| Photo URLs | `getPhotoUrl()` centralized helper | Converts relative paths → R2 URLs. All components use it. Backward compatible without R2. |
| Photo storage | Cloudflare R2 (S3-compatible) | Migration script uploads hero.webp files. Image Resizing URLs generated. |
| Favorites | localStorage via `useSyncExternalStore` | `pp-favorites` key, Set<number> of IDs. Cross-tab sync. No auth needed. |
| Mode switcher | Mobile: 3 pills in sheet header. Desktop: segmented control in sidebar | Ontdek/Bewaard/Plan. No tab bar, no "Kaart" mode. Pills sticky below drag handle. Count badges on Bewaard/Plan. Mode-aware map markers. |
| Image optimization | Cloudflare Image Resizing via URL pattern | `/cdn-cgi/image/width=W,height=H,fit=cover,quality=Q,format=auto/path`. Client uses `OptimizedImage`, server uses `getResizedPhotoUrl()`. |
| Sheet drag logic | Silk (@silk-hq/components) for AppShell, useSheetDrag for ContentSheetContainer | Silk uses CSS Scroll Snap + WAAPI (no will-change compositing layers). ContentSheetContainer keeps custom hook. If Silk crashes Safari, revert to useSheetDrag. |
| Detail view | Apple Maps-style with share/close header | Share (left) + X close (right), quick info row, "Goed om te weten" from hidden DB fields, photo below actions. |
| GPS button | MapLibre GeolocateControl | 44px warm-styled button, accent-colored dot + accuracy circle. Browser permission prompt = GDPR consent. |
| MapLibre GPU | pixelRatio: 1, maxTileCacheSize: 12 | Saves 50-75% canvas VRAM on Retina. 3D fill-extrusion layers removed on load. |
| Filter system | 6 filter types, URL-persisted | Types (multi-select), weather (radio), price (multi-select), score (threshold), age (preset), search query. All in `useFilters` hook. Distance deferred (needs GPS). |
| Plan view | localStorage ordered array via `useSyncExternalStore` | `pp-plan` key, number[] of IDs. Reorderable. Same cross-tab sync pattern as favorites. |
| Offline indicator | `navigator.onLine` event listeners | OfflineBanner in root layout. Auto-shows/hides. No service worker needed. |
| API caching | Cloudflare edge cache via Cache-Control headers | `s-maxage=3600` (1h edge), `max-age=300` (5min browser), `stale-while-revalidate=60`. Reduces Supabase egress ~99%. Routes stay `force-dynamic` (execute on miss), but Cloudflare caches responses. |
| Color contrast | All tokens pass WCAG AA 4.5:1 | Label secondary 0.82, tertiary 0.73, accent #B3553A, all category badges darkened for white text. |
| Analytics | GA4 + Consent Mode v2 + web-vitals | Typed event module in `src/lib/analytics.ts`. GA4 loads only when `NEXT_PUBLIC_GA_ID` set. CWV reported via `web-vitals` dynamic import. |
| LocationCard a11y | div + sr-only button + heart button | No nested interactive. div has onClick for mouse, sr-only button for keyboard/screen reader. Heart button independent at z-1. |
| Test suite | 82 Playwright tests | 44 core flows + 22 axe-core a11y + 16 visual regression screenshots. `npm run test:e2e:all` runs everything. |
| Floating sheet | REVERTED — causes Safari crashes | floatFactor margins + radius + drop-shadow was tried and removed. Sheet is now flat, full-width, fixed radius. |
| Sheet header | Solid bg-bg-primary on drag handle + sticky header | Glass/backdrop-filter crashes iOS Safari. NEVER add backdrop-filter to sheet or its children. |
| Search | cmdk + Fuse.js fuzzy search | SearchCommand replaces SearchInput. Grouped results by type, keyboard nav, typo-tolerant. |
| Carousel | Embla Carousel | HorizontalCardStrip (nearby), CarouselOverlay (desktop clusters). Replaces manual scroll-snap logic. |
| Category grid | 2×4 grid of SVG icons with TYPE_COLORS | Replaces type filter chips in FilterBar. Same onTypeToggle handler, same multi-select behavior. |
| Nearby locations | haversine distance + horizontal scroll cards | Bottom of DetailView, 6 nearest locations. NearbyCard: 140px wide, photo + name + type dot + distance. |
| Cluster list | Vertical card list in sheet (mobile) | Replaces CarouselOverlay on mobile. Featured locations sort first with "Aanbevolen" badge. Desktop keeps carousel overlay. |
| Staging deployment | Cloudflare Workers via @opennextjs/cloudflare | `npm run deploy:staging` builds + deploys. wrangler.jsonc in v2/. ISR not configured (build-time static). |
| Image loading | `loading="eager"` default in OptimizedImage | `content-visibility: auto` handles perf; `loading="lazy"` deadlocks with it in scroll containers. |

## Next step

**Staging deployed. Infrastructure ready for Phase 7.**

Remaining:
1. **Phase 7: Staging Validation** — content parity, SEO parity, performance comparison, user testing at staging.peuterplannen.nl
2. **CI/CD for staging** — update `.github/workflows/staging.yml` to deploy v2 (currently deploys old app)
3. **ISR setup** (optional for production) — R2 bucket + Durable Objects bindings for time-based revalidation
4. **Production cutover** — DNS switch peuterplannen.nl from GitHub Pages to Cloudflare Workers

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `cd /Users/basmetten/peuterplannen/v2 && npm run build` to confirm 1330 pages generate
- Run `npm run test:e2e:all` to confirm 82 tests pass (44 core + 22 a11y + 16 visual)
- Visit `staging.peuterplannen.nl` to verify live deployment
- `npm run deploy:staging` to push latest changes to staging
