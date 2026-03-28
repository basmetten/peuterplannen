# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 1 complete** — Next.js foundation, Supabase connected, slugs migrated.
**Phase 2 complete** — core loop, polish, desktop layout, navigation, carousel, and PWA done.
**Phase 3 Tier 1+3 complete** — location detail SSR pages, sitemap, robots.txt, .html redirects.

## What happened this session

### Phase 3 Tier 1 — Location Detail SSR Pages (biggest SEO impact)

1. **Location detail page** (`app/(marketing)/[region]/[slug]/page.tsx`):
   - Full server-rendered page with ISR (24h revalidation)
   - `generateStaticParams` — builds 1000+ pages from all SEO-included locations
   - `generateMetadata` — auto-generated title, description, OG tags, canonical URL, robots directive
   - Graduation check via `shouldIndex()` — noindex if `seo_exclude_from_sitemap` or no `seo_tier`
   - Canonical redirect for duplicate locations (`seo_canonical_target`)
   - Sections: breadcrumb, hero (gradient fallback for missing photos), header with score badge, quick facts, CTA bar ("Bekijk op de kaart" + website), toddler highlight tip, description, quality dimension grid, practical info, nearby locations (6 cards), internal links to region/type hubs
   - JSON-LD structured data: schema.org type mapping (Playground, Museum, Restaurant, etc.) + BreadcrumbList

2. **SEO utility library** (`src/lib/seo.ts`):
   - `generateSeoTitle()` / `generateSeoDescription()` — with override support
   - `shouldIndex()` — graduation check
   - `locationCanonicalUrl()` — canonical URL builder
   - Type slug mapping (play → speeltuinen, etc.)
   - Schema.org type mapping
   - Quality dimension labels (Dutch)

3. **Components**:
   - `Breadcrumb` — SEO-friendly nav with chevron separators
   - `StructuredData` — JSON-LD script tag + `buildLocationStructuredData()` builder

4. **Data access**:
   - `LocationRepository.getNearby()` — same region, prefer same type, sorted by score
   - Zod schema hardened: `boolOrFalse` preprocess for nullable DB booleans, nullable description

### Phase 3 Tier 3 — Sitemap + Redirects + robots.txt

1. **Sitemap** (`app/sitemap.ts`):
   - 1037 URLs: homepage (1.0), region hubs (0.9), type hubs (0.8), location details (0.6)
   - Queries Supabase for graduated locations, maps region names to slugs

2. **robots.txt** (`app/robots.ts`):
   - Allow all, disallow /app and /api, sitemap reference

3. **Redirects** (`next.config.ts`):
   - `/:path*.html` → `/:path*` (permanent redirect)
   - `trailingSlash: false`

## Key design decisions

| Decision | Choice | Notes |
|---|---|---|
| Hero image fallback | Gradient with category color + map pin | Photos not migrated yet (Phase 3.5); only external URLs shown |
| Title template | Page generates base title, layout appends "| PeuterPlannen" | Avoids duplication |
| ISR revalidation | 24 hours (86400s) | Content changes slowly; on-demand revalidation via webhook later |
| Graduation check | Check `seo_tier` + `seo_exclude_from_sitemap` | Database pre-computes graduation; page respects it |
| Canonical redirects | 301 via `redirect()` in page | If `seo_canonical_target` is set |
| Nullable booleans | `z.preprocess(v => v ?? false, z.boolean())` | DB has nulls for coffee/diaper/alcohol/etc. |
| Nearby locations | Same region, prefer same type, limit 6 | Simple approach; PostGIS distance calc deferred |
| Schema type mapping | play→Playground, museum→Museum, farm→LocalBusiness, etc. | Per seo-analytics.md spec |

## File inventory (Phase 3 additions)

```
app/
  sitemap.ts                  — Dynamic sitemap (1037 URLs)
  robots.ts                   — robots.txt
  (marketing)/
    [region]/
      [slug]/
        page.tsx              — Location detail SSR page (ISR 24h)

src/
  lib/
    seo.ts                    — SEO utilities (title, description, graduation, schema types)
  components/
    patterns/
      Breadcrumb.tsx          — SEO breadcrumb navigation
      StructuredData.tsx      — JSON-LD structured data component + builders
  server/
    repositories/
      location.repo.ts        — Added getNearby() method
  domain/
    schemas.ts                — Fixed nullable boolean handling (boolOrFalse)

next.config.ts                — Added .html redirects + trailingSlash: false
```

## What's NOT done yet

### Phase 3 remaining
- Tier 2: Region hub pages (`/[region]/page.tsx`) + Type hub pages (`/[type]/page.tsx`)
- Tier 4: City+type combo pages (`/[region]/[type]/page.tsx`)
- Route conflict resolution for `[region]` vs `[type]` at root level

### Beyond Phase 3
- Phase 3.5: Photo migration to Cloudflare R2
- Phase 4: Polish & Canonicalize
- Phase 5: Quality Gates (E2E tests, CWV, accessibility, service worker)
- Staging deployment (Cloudflare Pages)

## Next step
Continue Phase 3 Tier 2: region hub pages + type hub pages, or move to staging deployment.

**Before starting**, the session should:
- Read this HANDOFF.md
- Run `npm run dev` in `/v2/` and test a detail page (e.g., localhost:3000/amsterdam/artis)
- Verify sitemap: localhost:3000/sitemap.xml
- Verify robots: localhost:3000/robots.txt
- Test .html redirect: localhost:3000/amsterdam.html → /amsterdam
- Run `npm run build` to confirm all 1007 pages generate

## Prompt for new session

```
cd peuterplannen && read HANDOFF.md

Phase 3 Tier 1+3 complete (1000+ location detail pages, sitemap, robots, redirects).
Phase 3 Tier 2 (region/type hub pages) or staging deployment next.

Working rules:
- Quality over speed
- Use parallel subagents for independent tasks
- Do NOT touch old app files
- All work in /v2/. Branch: staging
- Update HANDOFF.md before session ends
```
