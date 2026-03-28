# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3+4 complete** — location detail pages, region/type hub pages, city+type combo pages, sitemap, robots.txt, redirects.
**Phase 3 blog/guides complete** — 57 blog posts migrated, blog index, guides overview, sitemap updated.
**Route restructuring complete** — unified `(app)` shell replaces `(marketing)` + `(pwa)`.

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
      page.tsx          — Region + type hub (SSR, ContentShell wrapper, ISR 24h)
      [slug]/
        page.tsx        — Location detail + city+type combo (SSR, ContentShell, ISR 24h)
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
- Desktop: 420px sidebar panel (left) + map placeholder (right)
- Mobile: full-width scrollable content
- Sheet footer: partner link + privacy/terms/about/contact links

Used by region hub, type hub, location detail, blog, and guides pages. The interactive home page uses AppShell directly (doesn't use ContentShell).

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

### Blog/guides migration (Phase 3)
1. **Blog data layer** — Zod schema for post validation, prebuild script to bundle 57 markdown files into JSON, BlogRepository with getAll/getBySlug/getByTag/getByRegion/getRelated methods
2. **Markdown rendering pipeline** — unified + remark-parse + remark-rehype + rehype-stringify + rehype-slug + rehype-autolink-headings + custom rehypeRewriteLinks plugin
3. **Blog post route** `/blog/[slug]` — SSG with ISR 24h, JSON-LD BlogPosting + BreadcrumbList, reading time, tags, related posts section
4. **Blog index** `/blog` — all posts sorted by date, post cards with title/description/date/tags
5. **Guides overview** `/guides` — featured guides, latest posts, browse by city (links to city guides), browse by type (links to type hub pages)
6. **Sitemap** — blog index, guides overview, and all 57 blog posts added
7. **Blog content CSS** — `.blog-content` class with typography rules for rendered markdown (headings, lists, links, blockquotes, hr)
8. **Dependencies added** — gray-matter, unified, remark-parse, remark-rehype, rehype-stringify, rehype-slug, rehype-autolink-headings

### Previous session: Phase 3 Tier 4 — City+Type Combo Pages
- `/[region]/[type]` e.g. `/amsterdam/speeltuinen` — 224 new pages (28 regions × 8 types)
- Route conflict resolved: `[region]/[slug]/page.tsx` checks `KNOWN_TYPE_SLUGS` first
- `LocationRepository.getByRegionAndType()` — new server method
- JSON-LD: CollectionPage + ItemList + BreadcrumbList
- Internal links: related combos

## Build stats
- 1330 total pages (was 1271 before blog migration)
- Build time: ~2.7s static generation
- API routes: force-dynamic
- Home page: ISR 5min
- Hub + detail + blog pages: ISR 24h

## What's NOT done yet

### Phase 3 remaining
- Persistent map in (app) layout (currently map only on home page)
- SEO content rendered in interactive sheet (currently uses static ContentShell)

### Beyond Phase 3
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)
- Staging deployment (Cloudflare Pages)

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| App layout | Minimal (QueryProvider + container) | Each page brings its own rendering; map persistence deferred |
| ContentShell | Static sidebar visual | Not the interactive sheet; provides app-like UX for SSR pages |
| Home page route | `/` (was `/app`) | App IS the website per architecture doc |
| Editorial content | Bundled TypeScript module | No fs.readFileSync; works on Cloudflare Pages |
| Blog content | Prebuild script → generated JSON | Same no-fs principle; `npm run prebuild` bundles content/posts/*.md |
| Markdown pipeline | unified + remark + rehype | Server-only, renders at build time during SSG |
| Link rewriting | rehype plugin | Converts .html links, /app.html?regio=X, trailing slashes to v2 routes |
| Route conflict | KNOWN_TYPE_SLUGS checked first | blog/guides are explicit segments (no conflict with [region]) |
| Guides page | Curated view of blog data | Featured + latest + by-city + by-type — all sourced from BlogRepository |

## Next step

Phase 3 SEO content is functionally complete. Remaining work:

1. **Progressive enhancement** — make ContentShell use the real interactive sheet/sidebar (move toward persistent map architecture)
2. **Photo migration** (Phase 3.5) — Cloudflare R2 storage
3. **Phase 4: Polish** — visual refinement, performance optimization

**Before starting**, the session should:
- Read this HANDOFF.md
- Read `docs/v2/information-architecture.md` for the full architecture spec
- Run `npm run build` to confirm 1330 pages generate
- Test: `localhost:3000/`, `localhost:3000/blog`, `localhost:3000/blog/amsterdam-met-peuters-en-kleuters`, `localhost:3000/guides`
