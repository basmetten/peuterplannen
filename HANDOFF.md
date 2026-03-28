# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 mostly complete** — core loop + polish done, desktop layout + carousel remaining.

## What happened this session

### Phase 2 polish (Tier 1)
Built on top of the Phase 2 core loop:

1. **Sheet gesture rewrite** — complete touch handling overhaul:
   - Scroll-to-drag handoff: when content scrolled to top and user pulls down, sheet starts moving instead of rubber-banding
   - Handle drag uses global listeners for reliable tracking outside sheet bounds
   - Velocity tracking with exponential moving average (0.6/0.4 smoothing)
   - Drag threshold (8px) before committing to direction
   - Scroll container locked during active drag to prevent interference

2. **Corner radius morphing** — smooth interpolation from 16px (peek/half) to 0px (full), computed via `computeRadius()` function. Radius interpolates linearly between half (50%) and full (92%) snap points. During drag, radius updates in real-time.

3. **Loading skeletons** — `CardSkeleton` + `CardListSkeleton` matching LocationCard dimensions. `AppShellSkeleton` for Suspense fallback (map placeholder + sheet with search/filter/card skeletons). Staggered opacity for natural loading feel.

4. **Empty states** — `EmptyFilterState` component:
   - Context-aware message: "Geen resultaat voor '[query]'" vs "Geen locaties gevonden"
   - Active filters shown as removable pills (type badges, weather, search query)
   - "Wis alle filters" primary CTA button
   - Binoculars illustration icon
   - Never blames user, always offers next action

5. **Card entrance animation** — `fadeSlideIn` keyframe with 40ms stagger per card (capped at 10 cards), adds subtle slide-up + fade-in effect

6. **Filtered result count** — "X van Y locaties" format when filters active, "X locaties" when unfiltered

### Previous session (Phase 2 core loop)
1. **MapLibre integration** — full-bleed map with Positron tiles (OpenFreeMap), markers from all ~1000 Supabase locations, clustering with terracotta circles and count labels
2. **Bottom sheet** — XState state machine with peek/half/full states, CSS transitions
3. **Location cards** — cards in browse sheet with photo, name, type badge, score, highlight
4. **Detail view** — fetches full location data via API, shows name (Newsreader font), type badge, photo, score, description, facilities, action buttons (route/website)
5. **Filter system** — type chips (all 8 categories) + weather pills, URL param sync, client-side filtering
6. **Search** — text search filtering by name, region, highlight
7. **API routes** — GET /api/locations (summaries), GET /api/locations/[id] (detail)
8. **TanStack Query** — provider + query definitions with stale-while-revalidate

### Key bugs fixed (across sessions)
- MapLibre container height 0: wrapping div needed because MapLibre overrides position to relative
- Zod validation: `ai_suitability_confidence` and `verification_confidence` are numbers in DB, not strings → used `z.coerce.string()`
- MapLibre `load` event never firing: OpenFreeMap Positron uses Noto Sans fonts, not Open Sans → cluster labels requested non-existent fonts → `load` blocked
- React strict mode incompatible with MapLibre: disabled strict mode (MapLibre WebGL context can't survive mount/unmount/remount)

### Dependencies added
- `maplibre-gl` — map rendering
- `@tanstack/react-query` — server state caching
- `xstate` + `@xstate/react` — sheet state machine

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Map style | OpenFreeMap Positron | Free, no API key, same as v1. Uses Noto Sans fonts |
| Map init | Simple useEffect + cleanup | Module-level refs don't work with HMR. Strict mode disabled instead |
| Sheet state | Single XState machine | browse/detail states, snap management, back navigation |
| Sheet drag | Separate handle/scroll handlers | Handle: always starts drag. Scroll: starts drag only at scrollTop=0 + pull down |
| Data flow | SSR → client props | Server component fetches all summaries, passes to client AppShell |
| Filtering | Client-side | All locations passed to client, filtered in memory (fast enough) |
| Detail fetch | TanStack Query via API route | Fetched on demand when marker/card tapped |
| Corner radius | Linear interpolation | 16px ≤ half snap, lerp to 0px at full snap. Updated during drag |

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
      AppShell.tsx           — Client: wires map + sheet + filters + empty states

src/
  providers/
    QueryProvider.tsx        — TanStack Query provider
  features/
    map/
      MapContainer.tsx       — MapLibre full-bleed map with clustering
      queries.ts             — TanStack Query definitions
    sheet/
      Sheet.tsx              — Draggable bottom sheet with scroll-to-drag handoff
      sheetMachine.ts        — XState: browse/detail states, snap points
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

## What's NOT done yet (Phase 2 remaining)

### Tier 2 — Desktop & navigation
- Desktop layout (sidebar at 1024px+ instead of bottom sheet)
- Back gesture (swipe right to dismiss detail)
- URL-based deep linking (`/app/amsterdam/artis` pattern)
- Browser history integration (back button navigates detail → browse → map)

### Tier 3 — Deferred
- Carousel overlay (horizontal card scroll when tapping small cluster)
- PWA manifest + service worker

## Next step
Continue with Tier 2 (desktop layout + navigation) or move to Phase 3 (SEO).

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test the app at localhost:3000/app
- Review the sheet interaction and filters

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 2 core loop + polish done. Sheet gestures, skeletons, empty states all work.
Desktop layout and navigation still needed.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
