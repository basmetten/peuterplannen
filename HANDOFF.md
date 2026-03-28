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

### Phase 3.5: Photo migration infrastructure
1. **Image helper** (`src/lib/image.ts`) — `getPhotoUrl()` converts relative DB paths (`/images/locations/...`) to R2 public URLs. Also includes `getResizedPhotoUrl()` and `cloudflareLoader()` ready for Phase 4 Image Resizing.
2. **Migration script** (`scripts/migrate-photos-r2.mjs`) — scans 2,324 hero.webp files (200MB), uploads to R2 via S3-compatible API, batch-updates Supabase photo_url values. Supports dry run, skip-upload, and concurrency control.
3. **Component updates** — all 7 photo rendering points now use `getPhotoUrl()`:
   - Client: LocationCard, CarouselCard, DetailView
   - Server: HeroImage, NearbyCard, CityTypeCard, RegionLocationCard
   - Metadata: OG image, structured data
4. **Config** — `next.config.ts` adds R2 domain to remotePatterns. `wrangler.jsonc` adds R2 bucket binding. `@aws-sdk/client-s3` added as dev dependency.
5. **Backward compatible** — without `NEXT_PUBLIC_R2_URL` env var, `getPhotoUrl()` returns null for relative paths (shows fallback gradient). With R2 configured, converts to full URLs.

### Previous sessions
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

### Phase 4: Polish & Canonicalize
- Visual refinement, performance optimization
- Mobile map on SSR content pages (currently warm bg behind sheet — add static map image or lazy MapLibre)
- Turbopack dev compatibility for `.content-sheet` CSS (works in production, stripped in dev mode)

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
| Photo storage | Cloudflare R2 (S3-compatible) | Migration script uploads hero.webp files. Image Resizing ready for Phase 4. |

## Next step

Phase 3.5 infrastructure is complete. Next priorities:

1. **Phase 4: Polish** — visual refinement, performance optimization, mobile map behind sheet
3. **Staging deployment** — Cloudflare Pages at staging.peuterplannen.nl

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run build` to confirm 1330 pages generate
- Verify photos load: `curl -sI https://photos.peuterplannen.nl/amsterdam/artis/hero.webp`
- `localhost:3000/` → AppShell renders normally with its own map
