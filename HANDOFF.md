# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, and navigation done.

## What happened this session

### Tier 2 — Desktop layout & navigation

1. **Desktop sidebar layout** — responsive layout at ≥768px:
   - `useIsDesktop` hook (`src/hooks/useIsDesktop.ts`) — `matchMedia` with SSR-safe default
   - `Sidebar` component (`src/features/sidebar/Sidebar.tsx`) — 380px fixed left panel, scrollable content, hairline border right
   - `AppShell` conditionally renders `<Sidebar>` (desktop) or `<Sheet>` (mobile)
   - `MapContainer` accepts `leftOffset` prop to shift map right when sidebar visible
   - Map calls `resize()` when sidebar appears/disappears

2. **URL deep linking** — `?locatie=region/slug` pattern:
   - Deep link format: `/app?locatie=amsterdam/cafe-van-puffelen`
   - On mount: parses URL, finds matching location by region+slug, opens detail
   - On detail open (marker/card click): pushes `?locatie=` to URL via `history.pushState`
   - `useFilters` updated to preserve unknown params (locatie) during filter changes

3. **Browser history integration**:
   - Detail open → `history.pushState` with locatie param
   - Detail close (back button, UI back, map click, sheet drag down) → `history.back()`
   - `popstate` listener syncs sheet state with URL
   - Deep link initial load: creates browse→detail history stack so back works

### Bug fixes
- **MapLibre layer race condition**: `setFilter` on `markers-selected` layer threw when deep-linking (layer not yet created). Fixed with `getLayer()` guard before `setFilter`.
- **Filter URL param preservation**: `useFilters.setFilters()` was constructing URLSearchParams from scratch, stripping non-filter params. Fixed to start from `window.location.search` and only manage its own keys.

### Previous sessions
- Phase 2 Tier 1: Sheet gesture rewrite, corner radius morphing, loading skeletons, empty states, card entrance animation, filtered result count
- Phase 2 core loop: MapLibre integration, bottom sheet, location cards, detail view, filter system, search, API routes, TanStack Query

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Desktop breakpoint | 768px | Matches doc spec (≥768px = sidebar layout) |
| Sidebar width | 380px | Per information-architecture.md |
| Desktop rendering | Separate Sidebar vs Sheet | No sheet gestures on desktop, clean separation |
| Deep link format | `?locatie=region/slug` | Human-readable, matches slug-based URL strategy |
| History management | Native pushState/popState | Lightweight, works with Next.js intercepted history |
| Filter param preservation | Start from window.location.search | Prevents useFilters from stripping locatie param |

## File inventory (Phase 2)

```
app/
  api/
    locations/
      route.ts              — GET all summaries
      [id]/route.ts         — GET single location detail
  (pwa)/
    app/
      page.tsx              — Server component, fetches locations + Suspense
      AppShell.tsx           — Client: responsive layout (sidebar/sheet), URL sync, history

src/
  hooks/
    useIsDesktop.ts          — Media query hook (≥768px)
  providers/
    QueryProvider.tsx        — TanStack Query provider
  features/
    map/
      MapContainer.tsx       — MapLibre full-bleed map with clustering + leftOffset
      queries.ts             — TanStack Query definitions
    sheet/
      Sheet.tsx              — Draggable bottom sheet with scroll-to-drag handoff
      sheetMachine.ts        — XState: browse/detail states, snap points
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

### Tier 3 — Deferred
- Carousel overlay (horizontal card scroll when tapping small cluster)
- PWA manifest + service worker

### Beyond Phase 2
- Staging deployment (Cloudflare Pages for v2 Next.js app)
- Phase 3: SEO foundation (SSG pages, structured data, sitemap, redirects)
- Phase 3.5: Photo migration to Cloudflare R2

## Next step
Continue with Tier 3 (carousel, PWA) or move to Phase 3 (SEO).

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test the app at localhost:3000/app
- Test desktop layout by opening in a wide browser window (≥768px)
- Test deep link: localhost:3000/app?locatie=amsterdam/cafe-van-puffelen
- Test back button navigation after opening a detail

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 2 complete. Desktop sidebar, URL deep linking, history, and back gesture all work.
Carousel + PWA or Phase 3 SEO next.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
