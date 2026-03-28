# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3+4 complete** — location detail pages, region/type hub pages, city+type combo pages, sitemap, robots.txt, redirects.
**Phase 3 blog/guides complete** — 57 blog posts migrated, blog index, guides overview, sitemap updated.
**Route restructuring complete** — unified `(app)` shell replaces `(marketing)` + `(pwa)`.
**Phase 3 progressive enhancement complete** — interactive map on SSR content pages (desktop).

## Architecture (current)

Three route groups, per `docs/v2/information-architecture.md`:

| Group | Layout | Purpose |
|-------|--------|---------|
| `(app)` | Map + sheet/sidebar (QueryProvider + full-viewport) | All user-facing pages: home, region hubs, type hubs, location detail, guides, blog |
| `(portal)` | Simple header, no map | Partner dashboard (future) |
| `(legal)` | Minimal header + footer links | Privacy, terms, about, contact |

### Route map

```
app/
  (app)/
    layout.tsx          — QueryProvider + h-dvh container
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

### ContentShell component

`src/components/layout/ContentShell.tsx` — wraps SSR content in an app-like visual:
- Desktop: 420px sidebar panel (left) + interactive MapLibre map (right)
- Mobile: full-width scrollable content (no map — map is desktop only)
- Sheet footer: partner link + privacy/terms/about/contact links
- Map props: `mapLocations`, `mapRegionSlug`/`mapRegionSlugMap`, `mapHighlightId`
- Map is dynamically imported (`next/dynamic`, `ssr: false`) — only loads on pages that pass locations
- Blog/guides pages don't pass map props → right panel shows neutral background

Map component stack:
```
ContentShell (server) → ContentMapLoader (client, dynamic) → ContentMap (client, MapLibre GL)
```

Used by region hub, type hub, location detail, city+type combo, blog, and guides pages. The interactive home page uses AppShell directly (doesn't use ContentShell).

### Blog data architecture

Blog posts are bundled at build time to avoid `fs.readFileSync` at runtime (Cloudflare Pages constraint):

```
content/posts/*.md          — 57 markdown source files (frontmatter + body)
v2/scripts/bundle-posts.mjs — prebuild script (reads .md → generates JSON)
v2/src/content/blog-posts.generated.json — bundled post data
v2/src/domain/blog.ts       — Zod schema (BlogPost, BlogPostMeta)
v2/src/server/repositories/blog.repo.ts — data access layer
v2/src/lib/markdown.ts      — unified/remark/rehype render pipeline
```

The `prebuild` npm script runs `bundle-posts.mjs` before every build. The markdown pipeline includes a `rehypeRewriteLinks` plugin that converts old-style links (`/amsterdam.html`, `/app.html?regio=X`, trailing slashes) to v2 routes.

## What happened this session

### Progressive enhancement — interactive map on SSR pages
1. **ContentMap** (`src/components/layout/ContentMap.tsx`) — new lightweight MapLibre GL client component for SSR content pages. Features: GeoJSON clustering, terracotta markers, highlighted marker for detail pages, fit-bounds, marker click → Next.js navigation, WebGL error fallback.
2. **ContentMapLoader** (`src/components/layout/ContentMapLoader.tsx`) — dynamic import wrapper (`next/dynamic`, `ssr: false`) so MapLibre JS/CSS only loads on pages that actually render a map. Blog/guides pages pay zero cost.
3. **ContentShell upgraded** — accepts `mapLocations`, `mapRegionSlug`/`mapRegionSlugMap`, `mapHighlightId` props. Renders ContentMapLoader in desktop right panel when locations provided.
4. **Region hub pages** — pass all region locations to ContentShell map (region hub: `mapRegionSlug`, type hub: `mapRegionSlugMap`)
5. **Location detail pages** — pass main location + nearby locations, highlight main location marker
6. **City+type combo pages** — pass combo locations to ContentShell map
7. **"Bekijk op de kaart" fix** — CTA on detail pages now links to `/?locatie=...` (was `/app?locatie=...` which doesn't exist in v2)

### Previous sessions
- Phase 3 blog/guides migration (57 posts, index, guides overview)
- Phase 3 Tier 4: city+type combo pages (224 pages)
- Route restructuring: unified (app) shell

## Build stats
- 1330 total pages
- Build time: ~3-4s static generation
- API routes: force-dynamic
- Home page: ISR 5min
- Hub + detail + blog pages: ISR 24h

## What's NOT done yet

### Phase 3 remaining
- Persistent map in (app) layout (currently each page renders its own map instance — map resets on navigation)
- Mobile interactive sheet for location-based SSR pages (currently full-width scroll)

### Beyond Phase 3
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)
- Staging deployment (Cloudflare Pages)

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| App layout | Minimal (QueryProvider + container) | Each page brings its own rendering; map persistence deferred |
| ContentShell map | Dynamic import, desktop only | MapLibre loaded only on pages with locations; mobile stays full-width scroll |
| ContentMap vs MapContainer | Separate component | ContentMap is simpler (no carousel, no sheet interaction). MapContainer has full interactive logic for home page. Future: unify when persistent map lands. |
| Map on blog/guides | Not shown | No geo data to display; right panel stays neutral background |
| Home page route | `/` (was `/app`) | App IS the website per architecture doc |
| Editorial content | Bundled TypeScript module | No fs.readFileSync; works on Cloudflare Pages |
| Blog content | Prebuild script → generated JSON | Same no-fs principle; `npm run prebuild` bundles content/posts/*.md |
| Markdown pipeline | unified + remark + rehype | Server-only, renders at build time during SSG |
| Link rewriting | rehype plugin | Converts .html links, /app.html?regio=X, trailing slashes to v2 routes |
| Route conflict | KNOWN_TYPE_SLUGS checked first | blog/guides are explicit segments (no conflict with [region]) |
| Guides page | Curated view of blog data | Featured + latest + by-city + by-type — all sourced from BlogRepository |

## Next step

Progressive enhancement is functionally complete. Remaining work:

1. **Persistent map** — move map to (app) layout so it preserves state between navigations (requires AppShell refactor)
2. **Mobile interactive sheet** — SSR location pages use draggable sheet instead of full-width scroll
3. **Photo migration** (Phase 3.5) — Cloudflare R2 storage
4. **Phase 4: Polish** — visual refinement, performance optimization

**Before starting**, the session should:
- Read this HANDOFF.md
- Read `docs/v2/information-architecture.md` for the full architecture spec
- Run `npm run build` to confirm 1330 pages generate
- Test in a real browser: `localhost:3000/amsterdam` (verify map renders with markers in right panel)
- Test: `localhost:3000/amsterdam/artis` (verify highlighted marker on map)
- Test: `localhost:3000/blog` (verify no map, neutral right panel)
