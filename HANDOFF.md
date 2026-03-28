# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 in progress** — core loop (map + sheet + cards + filters) built, needs polish.

## What happened this session

### Phase 2: First Thin Slice (partial)
Built the core interactive loop:

1. **MapLibre integration** — full-bleed map with Positron tiles (OpenFreeMap), markers from all 2,415 Supabase locations, clustering with terracotta circles and count labels
2. **Bottom sheet** — XState state machine with peek/half/full states, CSS transitions, touch drag (basic)
3. **Location cards** — cards in browse sheet with photo, name, type badge, score, highlight
4. **Detail view** — fetches full location data via API, shows name (Newsreader font), type badge, photo, score, description, facilities, action buttons (route/website)
5. **Filter system** — type chips (all 8 categories) + weather pills, URL param sync, client-side filtering
6. **Search** — text search filtering by name, region, highlight
7. **API routes** — GET /api/locations (summaries), GET /api/locations/[id] (detail)
8. **TanStack Query** — provider + query definitions with stale-while-revalidate

### Key bugs fixed
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
| Data flow | SSR → client props | Server component fetches all summaries, passes to client AppShell |
| Filtering | Client-side | All 2,415 locations passed to client, filtered in memory (fast enough) |
| Detail fetch | TanStack Query via API route | Fetched on demand when marker/card tapped |

## File inventory (Phase 2 additions)

```
app/
  api/
    locations/
      route.ts              — GET all summaries
      [id]/route.ts         — GET single location detail
  (pwa)/
    app/
      page.tsx              — Server component, fetches locations
      AppShell.tsx           — Client: wires map + sheet + filters

src/
  providers/
    QueryProvider.tsx        — TanStack Query provider
  features/
    map/
      MapContainer.tsx       — MapLibre full-bleed map with clustering
      queries.ts             — TanStack Query definitions
    sheet/
      Sheet.tsx              — Draggable bottom sheet component
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
```

## What's NOT done yet (Phase 2 remaining)
- Sheet touch gestures need polish (drag from handle works, but scroll-to-drag handoff is rough)
- Sheet corner radius morphing (16px → 0 at full state)
- Carousel overlay (horizontal card scroll in peek state)
- PWA manifest + service worker
- Empty states
- Loading skeletons for card list
- Back gesture (swipe to dismiss detail)
- Desktop layout (sidebar instead of sheet)

## Next step
Continue Phase 2 polish, or move to Phase 3 (SEO) if the core loop is good enough.

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test the app at localhost:3000/app
- Review the sheet interaction and filters

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 2 (core loop) is partially built. Map, markers, sheet, cards, filters, detail all work.
Continue with Phase 2 polish or Phase 3.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
