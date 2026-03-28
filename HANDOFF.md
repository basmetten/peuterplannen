# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3+4 complete** — location detail pages, region/type hub pages, city+type combo pages, sitemap, robots.txt, redirects.
**Phase 3 blog/guides complete** — 57 blog posts migrated, blog index, guides overview, sitemap updated.
**Route restructuring complete** — unified `(app)` shell replaces `(marketing)` + `(pwa)`.
**Phase 3 progressive enhancement complete** — interactive map on SSR content pages (desktop), now with persistent map.
**Code review hardening complete** — 9 issues fixed (2 critical, 7 warnings).

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
              └── ContentShell (server) — renders MapUpdater + sidebar
                  └── MapUpdater (client) — pushes page data to MapStateContext
```

- **Desktop**: sidebar (420px, absolute left) + persistent map (fills viewport behind sidebar)
- **Mobile**: full-width scrollable content, no map (MapLibre not loaded — saves ~200KB)
- **Home page**: AppShell renders its own MapContainer on top, hiding persistent map
- **Blog/guides**: MapUpdater sets empty locations → map shows NL with no markers
- **Content→content navigation**: map persists, markers update smoothly, bounds fly to new locations

Key files:
- `src/context/MapStateContext.tsx` — React context + provider + `useMapState` hook
- `src/components/layout/PersistentMap.tsx` — MapLibre GL with dynamic data updates
- `src/components/layout/PersistentMapLoader.tsx` — `next/dynamic` + desktop gate via `useIsDesktop`
- `src/components/layout/MapUpdater.tsx` — invisible client component, pushes page data to context

### ContentShell component

`src/components/layout/ContentShell.tsx` — wraps SSR content in an app-like visual:
- Desktop: 420px sidebar panel (absolute left, z-10) — persistent map visible to the right
- Mobile: full-width scrollable content (no map)
- Renders `MapUpdater` to push location data to persistent map
- Sheet footer: partner link + privacy/terms/about/contact links
- Map props: `mapLocations`, `mapRegionSlug`/`mapRegionSlugMap`, `mapHighlightId`
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

### Code review hardening (9 fixes)
1. **CRITICAL: `safeHostname()`** — `new URL()` wrapped in try/catch for URLs without protocol
2. **CRITICAL: Open redirect prevention** — `seo_canonical_target` validated: must start with `/` and not `//`
3. **Sitemap dedup** — removed duplicate `TYPE_SLUG_MAP`, imports `TYPE_SLUGS` from `seo.ts`
4. **`resolveHub` caching** — wrapped with React `cache()` to avoid double fetch per request
5. **Plural labels** — uses `LOCATION_TYPE_LABELS_PLURAL` instead of hardcoded `{typeName}en`
6. **Blog reading time** — decoupled from `post.tags.length`, always visible
7. **Date validation** — bundle-posts.mjs validates YYYY-MM-DD format, warns on malformed dates
8. **Robots narrowed** — `/app` → `/app.html` to avoid blocking future routes
9. **Blog descriptions** — `z.string().min(1)` + build-time fallback from body for empty descriptions

### Persistent map (Phase 3 remaining)
1. **MapStateContext** — React context in `(app)` layout holds location data for the persistent map
2. **PersistentMap** — MapLibre GL component that lives in the layout, never unmounts. Reads data from context. Dynamic GeoJSON updates, fly-to bounds on navigation, highlight filter.
3. **PersistentMapLoader** — `next/dynamic` wrapper + `useIsDesktop` gate. Mobile clients never download MapLibre (~200KB savings).
4. **MapUpdater** — invisible client component rendered by ContentShell. Pushes page-specific locations/hrefs/highlightId to context on mount.
5. **ContentShell refactored** — removed right panel map div. Sidebar uses absolute positioning (left 0, z-10). Persistent map in layout shows through on right side.
6. **ContentMap + ContentMapLoader deleted** — replaced by PersistentMap architecture.
7. **Layout upgraded** — `(app)/layout.tsx` now wraps children in `MapStateProvider` + renders `PersistentMapLoader` behind content.

### Previous sessions
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

### Phase 3 remaining
- Mobile interactive sheet for location-based SSR pages (currently full-width scroll)

### Beyond Phase 3
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)
- Staging deployment (Cloudflare Pages)

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Persistent map | Layout-level MapLibre + React context | Map never unmounts, pages push data via MapUpdater. Home page covers it with AppShell's own MapContainer. |
| Map on mobile | Not loaded | `useIsDesktop` gate prevents MapLibre bundle download on mobile (~200KB savings) |
| Map data flow | Server page → ContentShell → MapUpdater → Context → PersistentMap | Server components compute locations + hrefs, client MapUpdater pushes to context |
| ContentShell positioning | Absolute sidebar (z-10) + transparent right side | Persistent map in layout (z-0) visible through transparent area |
| Home page map | Two map instances (AppShell + persistent) | AppShell covers persistent map. Simpler than unifying MapContainer + PersistentMap. |
| Map on blog/guides | Empty markers, map tiles visible | MapUpdater sets empty locations. NL map tiles show as neutral background. |
| Home page route | `/` (was `/app`) | App IS the website per architecture doc |
| Editorial content | Bundled TypeScript module | No fs.readFileSync; works on Cloudflare Pages |
| Blog content | Prebuild script → generated JSON | Same no-fs principle; `npm run prebuild` bundles content/posts/*.md |
| Markdown pipeline | unified + remark + rehype | Server-only, renders at build time during SSG |
| Link rewriting | rehype plugin | Converts .html links, /app.html?regio=X, trailing slashes to v2 routes |
| Route conflict | KNOWN_TYPE_SLUGS checked first | blog/guides are explicit segments (no conflict with [region]) |
| Guides page | Curated view of blog data | Featured + latest + by-city + by-type — all sourced from BlogRepository |

## Next step

Persistent map is complete. Remaining Phase 3 work:

1. **Mobile interactive sheet** — SSR location pages use draggable sheet instead of full-width scroll
2. **Photo migration** (Phase 3.5) — Cloudflare R2 storage
3. **Phase 4: Polish** — visual refinement, performance optimization

**Before starting**, the session should:
- Read this HANDOFF.md
- Read `docs/v2/information-architecture.md` for the full architecture spec
- Run `npm run build` to confirm 1330 pages generate
- **Verify persistent map in a real browser**: `localhost:3000/amsterdam` → sidebar left, map right with markers
- Navigate `localhost:3000/amsterdam` → `localhost:3000/amsterdam/artis` → map should smoothly transition (no reset)
- `localhost:3000/blog` → no markers on map, just NL tiles
- `localhost:3000/` → AppShell renders normally with its own map
