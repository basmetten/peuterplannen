# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3 complete** — location detail pages, region/type hub pages, sitemap, robots.txt, redirects.
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
        page.tsx        — Location detail (SSR, ContentShell wrapper, ISR 24h)
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

Used by region hub, type hub, and location detail pages. The interactive home page uses AppShell directly (doesn't use ContentShell).

## What happened this session

### Code quality + security fixes
1. Fetch error handling — `r.ok` check before `.json()`
2. Website URL validation — only allow http(s) protocols
3. Accessibility — removed zoom lock, added aria-pressed, `<search>` element
4. App page ISR (5min) instead of force-dynamic
5. TYPE_COLORS extracted to single source in enums.ts
6. Viewport resize tracking via visualViewport listener

### Phase 3 Tier 2 — Region + Type Hub Pages
- Single `[region]/page.tsx` handles both region and type hubs
- Editorial content bundled as TypeScript module (no fs.readFileSync)
- 36 hub pages (18 regions + 8 types)

### Route restructuring
- Replaced `(marketing)` + `(pwa)` with `(app)` + `(portal)` + `(legal)`
- Home page moved from `/app` to `/`
- SEO pages render in ContentShell (app-like sidebar visual)
- Created placeholder pages for partner, privacy, terms, about, contact
- Marketing layout (header+footer) removed

## Build stats
- 1047 total pages
- Build time: ~2.4s static generation
- API routes: force-dynamic
- Home page: ISR 5min
- Hub + detail pages: ISR 24h

## What's NOT done yet

### Phase 3 remaining
- Tier 4: City+type combo pages (`/[region]/[type]` e.g. `/amsterdam/speeltuinen`)
- Blog/guides migration into sheet (`/blog/[slug]`, `/guides`)
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
| ContentShell | Static sidebar visual | Not the interactive sheet; provides app-like UX for SSR pages without full sheet machinery |
| Home page route | `/` (was `/app`) | App IS the website per architecture doc |
| Editorial content | Bundled TypeScript module | No fs.readFileSync; works on Cloudflare Pages |
| Route conflict | KNOWN_TYPE_SLUGS checked first | 8 type slugs are a fixed set, region slugs are dynamic |

## Next step

Continue Phase 3 Tier 4 (city+type combo pages) or start making the ContentShell use the real interactive sheet/sidebar (progressive enhancement toward the persistent map architecture).

**Before starting**, the session should:
- Read this HANDOFF.md
- Read `docs/v2/information-architecture.md` for the full architecture spec
- Run `npm run build` to confirm 1047 pages generate
- Test: `localhost:3000/`, `localhost:3000/amsterdam`, `localhost:3000/amsterdam/artis`, `localhost:3000/privacy`
