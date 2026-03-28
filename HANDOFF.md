# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation scaffolded, compiles clean, Supabase connected.
**Phase 2 next** — first thin slice (map, markers, sheet, cards).

## What happened this session

### Phase 1 delivered
- Scaffolded Next.js 16 (App Router) in `/v2/` with TypeScript strict, Tailwind v4, ESLint
- Domain layer: enums, types, Zod schemas — all aligned with REAL Supabase schema
- Data access: server-only Supabase client, LocationRepository, RegionRepository
- Design tokens: full Apple Maps-inspired CSS variable system in globals.css
- App shell: root layout (Inter + Newsreader), (marketing) and (pwa) route groups
- Config: .env.example, .editorconfig, Prettier, next.config.ts with security headers
- Verification page at /verify proves Supabase → Zod → SSR pipeline works

### Critical finding: DB schema ≠ docs
The `docs/v2/system-architecture.md` types/schemas were aspirational, not real. Major differences:

| Doc assumed | Reality |
|---|---|
| `slug` column | Does NOT exist — locations have no slug |
| `region_slug` | `region` (string name, not slug) |
| `city` column | Does NOT exist |
| `short_description` | `toddler_highlight` |
| `peuter_score` (0-100) | `ai_suitability_score_10` (1-10, nullable) |
| `featured` (boolean) | `is_featured` (boolean) |
| `age_groups` (array) | `min_age`, `max_age` (numbers) |
| `facilities` (array) | `coffee`, `diaper`, `alcohol` (booleans) |
| `quality_*` dimensions | Context dimensions: `rain_backup_quality`, `buggy_friendliness`, etc. |
| `photos` (array) | Single `photo_url` |
| `seo_graduated` (boolean) | `seo_exclude_from_sitemap` (boolean, inverted) |
| Region `tier` (number 1-3) | Region `tier` (string: 'primary', 'standard', 'region') |
| `weather` always present | 1 location has null weather |

**The domain layer in `/v2/src/domain/` is the source of truth.** The docs in `docs/v2/` are now outdated for schema-related content (types, Zod schemas, repos). Consider updating the docs, or just use the code as reference.

## Key design decisions (unchanged from Phase 0)

| Decision | Choice |
|---|---|
| Stack | Next.js 16 App Router, TypeScript strict, React 19, Tailwind v4, Cloudflare Pages |
| Database | Same Supabase (server-side access only via service key) |
| Maps | MapLibre GL behind adapter (Phase 2) |
| State | TanStack Query + XState (Phase 2) |
| Design | Apple Maps 85-90% likeness, warm terracotta `#C05A3A` |
| Fonts | Inter (UI), Newsreader (location names on detail only) |

## File inventory (`/v2/`)

```
app/
  layout.tsx              — Root layout (Inter + Newsreader, nl lang, viewport)
  globals.css             — All design tokens + Tailwind v4 @theme
  not-found.tsx           — Custom 404
  (marketing)/
    layout.tsx            — Header + footer for SEO pages
    page.tsx              — Homepage placeholder
    verify/page.tsx       — Stack verification (Supabase + Zod proof)
  (pwa)/
    layout.tsx            — Full viewport for map app
    app/page.tsx          — Map app placeholder

src/
  domain/
    enums.ts              — LocationType, Weather, PriceBand, RegionTier, etc.
    types.ts              — Location, LocationSummary, Region, FilterState, MapViewport
    schemas.ts            — Zod v4 schemas matching real DB
  lib/
    supabase.ts           — Server-only Supabase client
    cn.ts                 — clsx + tailwind-merge utility
    constants.ts          — Column selections, map defaults, site metadata
  server/repositories/
    location.repo.ts      — getAllSummaries, getById, getByRegion, getByType, etc.
    region.repo.ts        — getAll, getBySlug, getByTier
```

## Build verification

```
✓ TypeScript — zero errors (strict mode)
✓ ESLint — zero warnings
✓ Next.js build — all 4 routes prerendered
✓ Supabase — 2,415 locations fetched + Zod-validated
✓ Regions — all active regions fetched + validated
```

## Next step: Phase 2 — First Thin Slice

From `docs/v2/migration-plan.md`, Phase 2 builds the core loop:

1. **MapLibre integration** — full-bleed map, markers from Supabase data, clustering
2. **Bottom sheet** — two-sheet system (browse + detail), XState machines, touch gestures
3. **Location cards** — cards in browse sheet, tap to open detail
4. **Filter system (basic)** — type filter, weather filter
5. **Search** — city/place name input
6. **Location detail** — detail sheet with location info

**Before starting Phase 2**, the session should:
- Install MapLibre GL, TanStack Query, XState
- Read `docs/v2/system-architecture.md` sections 3 (state machines), 5 (state management), 6 (map architecture)
- Note: URL routing for locations needs a decision since there's no `slug` column — options: use `id`, generate slugs from `name`, or add slugs to DB

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 1 (Next.js foundation) is complete and building clean.
Start Phase 2: the first thin slice — map, markers, sheet, cards.

Key context:
- The real DB schema differs from docs/v2/system-architecture.md — trust the code in /v2/src/domain/ over the docs
- Locations have NO slug — need to decide on URL strategy (id-based, derived slug, or DB migration)
- 2,415 locations, all Zod-validated

Read docs/v2/migration-plan.md Phase 2 and system-architecture.md (sections 3, 5, 6) before starting.
Install: maplibre-gl, @tanstack/react-query, xstate @xstate/react

Working rules:
- Quality over speed. Take more tokens, think deeper, deliver higher quality.
- Use parallel subagents aggressively wherever tasks are independent.
- Read the relevant docs/v2/ files thoroughly before writing code.
- Every architectural decision should trace back to a doc. If it doesn't, flag it.
- Do NOT touch any old app files (app.html, app.css, glass.css, modules/, etc.) — read-only reference.
- All new work goes in /v2/. Branch: staging. Never touch main.
- Update HANDOFF.md before the session ends.
```
