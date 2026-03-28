# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+2+3 complete** — location detail pages, region/type hub pages, sitemap, robots.txt, redirects.

## What happened this session

### Code quality + security fixes (pre-Phase 3 Tier 2)

1. **Fetch error handling** — `r.ok` check before `.json()` in TanStack Query functions
2. **Website URL validation** — only render link if `https://` or `http://` protocol
3. **Accessibility** — removed zoom lock (`maximumScale`/`userScalable`), added `aria-pressed` to filter chips, `<search>` element for search input
4. **ISR for app page** — `revalidate = 300` instead of `force-dynamic` (API routes stay dynamic)
5. **TYPE_COLORS extracted** — single export from `enums.ts`, removed 4 duplicate definitions
6. **Viewport resize** — `visualViewport` listener for accurate sheet padding on resize/orientation change

### Phase 3 Tier 2 — Region + Type Hub Pages

1. **Hub page** (`app/(marketing)/[region]/page.tsx`):
   - Single dynamic route handles both region hubs and type hubs
   - Route conflict resolved: checks `KNOWN_TYPE_SLUGS` first, then region lookup
   - `generateStaticParams` returns 18 region slugs + 8 type slugs = 36 paths
   - `generateMetadata` with editorial content frontmatter (meta_title, meta_description)
   - ISR 24h revalidation
   - JSON-LD: `CollectionPage` with `ItemList` (top 20 locations) + `BreadcrumbList`

2. **Region hub features**:
   - H1 + region blurb from DB
   - Editorial content from `content/seo/regions/*.md` (18 files)
   - Locations grouped by type with category color dots
   - Max 8 cards per type, "Alle [type] bekijken →" overflow links
   - Internal links: other regions (pill chips) + all type hubs

3. **Type hub features**:
   - H1 with category color dot
   - Editorial content from `content/seo/types/*.md` (7 files)
   - Locations grouped by region with "Alle uitjes →" links
   - Max 6 cards per region
   - Internal links: other type categories (pill chips)

4. **Content reader** (`src/lib/content.ts`):
   - Reads markdown files with YAML frontmatter
   - Parses `## H2` sections into heading + body pairs
   - Handles filename mismatch: `boerderijen` → `kinderboerderijen.md`
   - Returns null gracefully for missing files (e.g., `cultuur` has no content file)

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Route conflict | Type slugs checked first via `KNOWN_TYPE_SLUGS` | Static set of 8 slugs; no ambiguity possible |
| Hub page approach | Single `[region]/page.tsx` for both | Clean branching at top; `generateStaticParams` covers both |
| Editorial content | Markdown files read at build time via `fs.readFileSync` | Content lives in old repo's `content/seo/` dir; read via `../content/seo/` relative path |
| Card limit | 8 per type (region hub), 6 per region (type hub) | Prevents huge DOM; overflow links to category/region pages |
| Hero image fallback | Gradient with category color + map pin | Photos not migrated yet (Phase 3.5); only external URLs shown |
| Title template | Page generates base title, layout appends "| PeuterPlannen" | Avoids duplication |
| ISR revalidation | 24 hours (86400s) | Content changes slowly; on-demand revalidation via webhook later |

## File inventory (Phase 3 all tiers)

```
app/
  sitemap.ts                  — Dynamic sitemap (1037 URLs)
  robots.ts                   — robots.txt
  (marketing)/
    [region]/
      page.tsx                — Region + type hub page (ISR 24h)
      [slug]/
        page.tsx              — Location detail SSR page (ISR 24h)

src/
  lib/
    seo.ts                    — SEO utilities (title, description, graduation, schema types, URL builders)
    content.ts                — Markdown content reader for editorial blurbs
  components/
    patterns/
      Breadcrumb.tsx          — SEO breadcrumb navigation
      StructuredData.tsx      — JSON-LD structured data component + builders
  domain/
    enums.ts                  — Added TYPE_COLORS (single source of truth)
  server/
    repositories/
      location.repo.ts        — Added getNearby() method
  domain/
    schemas.ts                — Fixed nullable boolean handling (boolOrFalse)

next.config.ts                — Added .html redirects + trailingSlash: false
```

## What's NOT done yet

### Phase 3 remaining
- Tier 4: City+type combo pages (`/[region]/[type]/page.tsx`) — e.g., `/amsterdam/speeltuinen`

### Beyond Phase 3
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)
- Staging deployment (Cloudflare Pages)

## Build stats
- 1044 total pages (1000 detail + 18 region hubs + 8 type hubs + homepage + app + sitemap + robots + verify + 404)
- Build time: ~3s for static generation
- API routes stay `force-dynamic` (TanStack Query with client-side staleTime)
- App page: ISR 5min; detail + hub pages: ISR 24h

## Next step
Continue Phase 3 Tier 4 (city+type combo pages) or move to staging deployment.

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test hub pages (e.g., localhost:3000/amsterdam, localhost:3000/speeltuinen)
- Verify detail pages still work (e.g., localhost:3000/amsterdam/artis)
- Run `npm run build` to confirm all 1044 pages generate

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 3 Tier 1+2+3 complete (1044 pages: details, region hubs, type hubs, sitemap, robots).
Phase 3 Tier 4 (city+type combo pages) or staging deployment next.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
