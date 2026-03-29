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
**Phase 4B complete** — Favorites system: localStorage-backed `useFavorites` hook, heart icons on cards + detail view, bottom tab bar (Ontdek/Kaart/Bewaard/Plan), favorites list view with empty state.
**Phase 4C complete** — Cloudflare Image Resizing: `OptimizedImage` component, all client + server images use `/cdn-cgi/image/` transform URLs with appropriate presets (card 144x144, hero 800x600, OG 1200x630).
**Phase 4D complete** — Sheet physics refactor: extracted `useSheetDrag` hook (DRY), logarithmic rubber-banding, distance-proportional spring duration, strong fling detection, scroll lock timeout, ref-based position tracking.
**Phase 4E complete** — Filter system completion: price band (multi-select), peuterproof score (7+/8+/9+ presets), age range (0-2/2-4/4-6 presets). All URL-persisted, all with empty-state removable pills. LocationSummary extended with `min_age`, `max_age`.
**Phase 4F complete** — Plan view: localStorage-backed `usePlan` hook (ordered list), reorderable with up/down controls, numbered route display, "Toevoegen aan plan" button on detail view. Empty state with guidance.
**Phase 4G complete** — Empty states + offline banner: all tab states have empty states (browse filters, favorites, plan). OfflineBanner component in root layout shows Dutch notification when offline.
**Phase 4H complete** — Desktop sidebar tabs: segmented control (Ontdek/Bewaard/Plan) at top of sidebar. Desktop users can now access favorites and plan views. All Phase 4 exit criteria met.
**Phase 5A complete** — Playwright E2E tests: 44 tests (22 desktop + 22 mobile), all passing. Core flows covered: home, search, filters, detail, favorites, plan, SSR pages, navigation, error handling.

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

### Phase 4H: Desktop Sidebar Tabs
1. **SidebarTabs component** — Apple-style segmented control (Ontdek/Bewaard/Plan) at top of sidebar
2. **Removed `!isDesktop` guard** in `getSheetContent()` — desktop now routes to favorites/plan views
3. **"Kaart" tab excluded** on desktop — map is always visible, no need for tab
4. Mobile TabBar unchanged — still shows all 4 tabs (Ontdek/Kaart/Bewaard/Plan)
5. **Phase 4 exit criteria fully met** — all 7 criteria verified with screenshots

### Phase 5A: Playwright E2E Tests
1. **44 tests** (22 desktop × 2 projects: Desktop Chrome 1280×800, iPhone 14)
2. **Core flows covered**: home load, search, filters (type/weather/empty state), location detail (open/buttons/back), favorites (save + view), plan (add + view), SSR pages (region/blog/guides/404), navigation (footer/breadcrumbs), no-crash check
3. **WebGL graceful fallback** — MapContainer catches WebGL init failure (headless Chromium). PersistentMap already had this.
4. **`data-testid="location-card"`** added to LocationCard for reliable test targeting
5. **Playwright config**: SwiftShader WebGL, auto webServer build+start, HTML reporter

### Previous sessions
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

## What's NOT done yet

### Phase 3.5 remaining
- Update photo pipeline (`fetch-photos.js`) to upload new photos to R2 instead of disk
- ~108 locations have null photo_url (no local hero.webp found)

### Phase 4 deferred (low priority polish)
- **Distance filter** — requires GPS permission flow + haversine calculation
- **Mobile map on SSR content pages** — currently warm bg behind sheet (intentional: saves ~200KB MapLibre on mobile)
- **Cloudflare Image Resizing activation** — `/cdn-cgi/image/` URLs generated but need Image Resizing enabled on the Cloudflare zone (falls back to full-size images until then)
- Turbopack dev compatibility for `.content-sheet` CSS (works in production)

### Phase 5 remaining
- **Accessibility audit** — axe-core integration, keyboard navigation testing
- **Performance budget** — Lighthouse CI, LCP < 2.5s, CLS < 0.1
- **Analytics** — GA4 page views + custom events
- **Staging deployment** — Cloudflare Pages at staging.peuterplannen.nl

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
| Tab bar | Mobile: 4-tab bar. Desktop: 3-tab segmented control | Mobile: Apple HIG 49px + safe area. Desktop: Ontdek/Bewaard/Plan (no Kaart — map always visible). Shared `activeTab` state. |
| Image optimization | Cloudflare Image Resizing via URL pattern | `/cdn-cgi/image/width=W,height=H,fit=cover,quality=Q,format=auto/path`. Client uses `OptimizedImage`, server uses `getResizedPhotoUrl()`. |
| Sheet drag logic | Single `useSheetDrag` hook | Both Sheet.tsx and ContentSheetContainer.tsx consume this hook. Vaul-inspired rubber-band, scroll lock, strong fling. Eliminated ~260 lines of duplication. |
| Filter system | 6 filter types, URL-persisted | Types (multi-select), weather (radio), price (multi-select), score (threshold), age (preset), search query. All in `useFilters` hook. Distance deferred (needs GPS). |
| Plan view | localStorage ordered array via `useSyncExternalStore` | `pp-plan` key, number[] of IDs. Reorderable. Same cross-tab sync pattern as favorites. |
| Offline indicator | `navigator.onLine` event listeners | OfflineBanner in root layout. Auto-shows/hides. No service worker needed. |

## Next step

**Phase 4 complete, Phase 5 E2E done.** Next priorities:

1. **Enable Cloudflare Image Resizing** on the zone (dashboard toggle) — all `/cdn-cgi/image/` URLs ready
2. **Phase 5 remaining** — accessibility audit (axe-core), performance budget (Lighthouse), analytics (GA4)
3. **Staging deployment** — Cloudflare Pages at staging.peuterplannen.nl
4. **Phase 6: Staging Validation** — content parity, SEO parity, performance comparison, user testing

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run build` to confirm 1330 pages generate
- Run `npm run test:e2e` to confirm 44 E2E tests pass
- Verify photos load: `curl -sI https://photos.peuterplannen.nl/amsterdam/artis/hero.webp`
- `localhost:3000/` → AppShell renders with map, sidebar tabs (desktop) or tab bar (mobile)
