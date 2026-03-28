# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.

## What happened this session

### Tier 3 — Carousel overlay + PWA

1. **Carousel overlay** — horizontal card scroll on small cluster tap:
   - Extended `sheetMachine` with `carousel` state + events (`CAROUSEL_OPEN`, `CAROUSEL_SWIPE`, `CAROUSEL_CLOSE`)
   - Context: `carouselLocationIds: number[]`, `carouselActiveId: number`
   - State transitions: browse → carousel (cluster tap), carousel → browse (dismiss), carousel → detail (card tap)
   - `CarouselCard` component (`src/features/carousel/CarouselCard.tsx`) — 200px wide compact card with 72px photo, name, type badge, score
   - `CarouselOverlay` component (`src/features/carousel/CarouselOverlay.tsx`) — CSS scroll-snap container, floats above map, `scrollend`/debounced scroll for active card detection
   - `MapContainer` updated: detects small clusters (zoom ≥ 14, ≤ 5 members) via `getClusterLeaves()`, calls `onClusterExpand` callback. Marker highlight shared between detail and carousel via `carouselActiveId` prop.
   - `AppShell` wired: carousel handlers, carousel locations resolved from IDs, CarouselOverlay rendered (mobile only — desktop passes `undefined` for `onClusterExpand`)

2. **PWA manifest**:
   - `public/manifest.json` — standalone display, terracotta theme (#C05A3A), start_url: /app
   - SVG icons in `public/icons/` — 192px, 512px, maskable, apple-touch-icon (terracotta rounded square with white map pin)
   - Root layout updated: `manifest` link, `appleWebApp` metadata (capable, black-translucent status bar)

### Previous sessions
- Phase 2 Tier 2: Desktop sidebar layout, URL deep linking (?locatie=region/slug), browser history integration
- Phase 2 Tier 1: Sheet gesture rewrite, corner radius morphing, loading skeletons, empty states, card entrance animation, filtered result count
- Phase 2 core loop: MapLibre integration, bottom sheet, location cards, detail view, filter system, search, API routes, TanStack Query

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Carousel trigger | zoom ≥ 14 AND cluster ≤ 5 | Per user-flows.md §8; larger clusters still zoom |
| Carousel position | Map-level overlay, not part of sheet | Per information-architecture.md §4 |
| Carousel scroll | CSS scroll-snap + scrollend event | Native feel, fallback to debounced scroll |
| Carousel active detection | Closest card to container center | Works for 2-5 cards |
| Carousel on desktop | Disabled (no onClusterExpand) | Desktop uses sidebar, no carousel needed |
| Cluster member resolution | getClusterLeaves() → match by ID | Uses MapLibre's built-in cluster API |
| PWA icons | SVG with maskable variant | Modern approach, no PNG generation needed |
| Service worker | Not included yet | Deferred to Phase 5 (Quality Gates) |

## File inventory (Phase 2 complete)

```
app/
  layout.tsx                — Root layout with PWA metadata (manifest, appleWebApp)
  api/
    locations/
      route.ts              — GET all summaries
      [id]/route.ts         — GET single location detail
  (pwa)/
    app/
      page.tsx              — Server component, fetches locations + Suspense
      AppShell.tsx           — Client: responsive layout, URL sync, history, carousel wiring

public/
  manifest.json             — PWA manifest (standalone, terracotta theme)
  icons/
    icon-192.svg            — PWA icon 192px
    icon-512.svg            — PWA icon 512px
    icon-maskable.svg       — Maskable PWA icon
    apple-touch-icon.svg    — Apple touch icon

src/
  hooks/
    useIsDesktop.ts          — Media query hook (≥768px)
  providers/
    QueryProvider.tsx        — TanStack Query provider
  features/
    carousel/
      CarouselCard.tsx       — Compact 200px card (photo, name, type, score)
      CarouselOverlay.tsx    — Horizontal scroll-snap overlay, map-level
    map/
      MapContainer.tsx       — MapLibre map with clustering, small cluster detection, carousel highlight
      queries.ts             — TanStack Query definitions
    sheet/
      Sheet.tsx              — Draggable bottom sheet with scroll-to-drag handoff
      sheetMachine.ts        — XState: browse/detail/carousel states, snap points
    sidebar/
      Sidebar.tsx            — Desktop persistent sidebar (380px)
    filters/
      FilterBar.tsx          — Type chips + weather pills
      SearchInput.tsx        — Pill-shaped search input
      useFilters.ts          — URL param sync + client-side filter logic
    detail/
      DetailView.tsx         — Location detail with photo, score, actions
  components/
    patterns/
      LocationCard.tsx       — Card for browse sheet list
      CardSkeleton.tsx       — Loading skeleton matching card dimensions
      EmptyState.tsx         — Empty filter/search state with removable pills
```

## What's NOT done yet

### Beyond Phase 2
- Staging deployment (Cloudflare Pages for v2 Next.js app)
- Phase 3: SEO foundation (SSG pages, structured data, sitemap, redirects)
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)

## Next step
Move to Phase 3 (SEO foundation) or set up staging deployment first.

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test the app at localhost:3000/app
- Test carousel: zoom to Amsterdam at zoom 14, click a small "2" cluster → horizontal cards should appear
- Test carousel dismiss: tap empty map → browse sheet returns
- Test carousel → detail: tap a carousel card → detail opens with URL update
- Test desktop at ≥768px — no carousel, sidebar works
- Verify manifest: localhost:3000/manifest.json

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 2 fully complete (all 3 tiers). Carousel, PWA manifest, desktop sidebar, URL deep linking, history all work.
Phase 3 SEO or staging deployment next.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
