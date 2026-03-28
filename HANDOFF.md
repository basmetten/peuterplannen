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

### Phase 4A: Error Boundaries
- `app/error.tsx` — root-level fallback (warm white bg, "Er ging iets mis", retry + home buttons)
- `app/(app)/error.tsx` — app layout overlay (semi-transparent bg, "Oeps, dat ging niet goed")
- `app/(legal)/error.tsx` — legal pages fallback
- All client components with `'use client'`, on-brand styling, Dutch copy

### Phase 4B: Favorites System
1. **`useFavorites` hook** (`src/hooks/useFavorites.ts`) — `useSyncExternalStore` with localStorage (`pp-favorites`). SSR-safe. Cross-tab sync via `storage` event. Cached snapshots to avoid unnecessary allocations.
2. **Heart on LocationCard** — 28x28 button top-right, `stopPropagation`, scale bounce animation. Filled terracotta when favorited, outline when not.
3. **Heart on DetailView** — 48px circle action button (matches Website/Route style). Label: "Bewaren" ↔ "Bewaard". Scale bounce on toggle.
4. **FavoritesList** (`src/features/favorites/FavoritesList.tsx`) — filters `initialLocations` by favorite IDs. Empty state: "Nog geen favorieten" with heart icon.
5. **TabBar** (`src/components/layout/TabBar.tsx`) — 4 tabs (Ontdek/Kaart/Bewaard/Plan), 49px + safe-area padding, mobile only. Badge count on Bewaard tab. Compass/pin/heart/list SVG icons.
6. **AppShell integration** — `activeTab` state, tab-based content routing (Bewaard → FavoritesList, Plan → placeholder, default → BrowseContent). Tab changes adjust sheet snap state.
7. **Sheet bottom padding** — 49px spacer at bottom of Sheet scroll area for TabBar clearance.

### Phase 4C: Image Optimization
1. **`OptimizedImage` component** (`src/components/patterns/OptimizedImage.tsx`) — generates Cloudflare Image Resizing URLs (`/cdn-cgi/image/...`). Fade-in on load. Warm gradient fallback for null src. `decoding="async"`, explicit width/height for CLS.
2. **IMAGE_SIZES updated** — card/carousel: 144x144 (2x retina for 72px display), hero: 800x600, OG: 1200x630.
3. **Client components updated** — LocationCard, CarouselCard, DetailView all use `OptimizedImage`.
4. **Server components updated** — `[region]/[slug]/page.tsx` and `[region]/page.tsx` use `getResizedPhotoUrl()` for HeroImage, NearbyCard, CityTypeCard, OG images.
5. **Format auto** — Cloudflare serves WebP/AVIF based on browser Accept header.

### Previous sessions
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

### Phase 4 remaining
- **Filter system completion** — price band, score threshold, age range UI (data types exist)
- **Plan view** — basic saved list, reorderable (currently placeholder "Binnenkort beschikbaar")
- **Desktop favorites** — TabBar is mobile-only; desktop sidebar could show a favorites toggle
- **Guide/blog content polish** — typography refinements in sheet
- **Visual refinement** — glass design system, sheet physics tuning
- **Mobile map on SSR content pages** — currently warm bg behind sheet
- **Cloudflare Image Resizing activation** — `/cdn-cgi/image/` URLs generated but need Image Resizing enabled on the Cloudflare zone (falls back to full-size images until then)
- Turbopack dev compatibility for `.content-sheet` CSS (works in production)

### Phase 5: Quality Gates
- E2E tests, CWV, accessibility, service worker
- Staging deployment (Cloudflare Pages)

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
| Tab bar | Mobile-only, 4 tabs (Ontdek/Kaart/Bewaard/Plan) | Apple HIG 49px height + safe area. Content routing via `activeTab` state in AppShell. |
| Image optimization | Cloudflare Image Resizing via URL pattern | `/cdn-cgi/image/width=W,height=H,fit=cover,quality=Q,format=auto/path`. Client uses `OptimizedImage`, server uses `getResizedPhotoUrl()`. |

## Next step

Phase 4A/B/C complete. Next priorities:

1. **Phase 4 continued** — filter system completion, plan view, visual polish
2. **Enable Cloudflare Image Resizing** on the zone (via dashboard/API) so `/cdn-cgi/image/` URLs work
3. **Staging deployment** — Cloudflare Pages at staging.peuterplannen.nl

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run build` to confirm 1330 pages generate
- Verify photos load: `curl -sI https://photos.peuterplannen.nl/amsterdam/artis/hero.webp`
- `localhost:3000/` → AppShell renders with map, tab bar, favorites
