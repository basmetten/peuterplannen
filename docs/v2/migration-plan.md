# PeuterPlannen v2 Migration Plan

**Status:** Phase 0 — Planning
**Date:** 2026-03-28
**Scope:** Full rebuild from vanilla HTML/JS/CSS to Next.js App Router
**Rule:** Everything happens on staging until proven better. Production is untouched until Phase 7.

---

## 1. Assumptions

| # | Assumption | Impact if wrong |
|---|-----------|----------------|
| 1 | Supabase database schema is stable and won't change during migration | Breaks typed repositories and Zod schemas; requires re-validation |
| 2 | Supabase anon key stays read-only for frontend; service key used server-side only | Security model depends on this split |
| 3 | All ~2365 location pages can be generated from current Supabase data | Missing data = missing pages = SEO regression |
| 4 | staging.peuterplannen.nl DNS is already pointed at staging branch (GitHub Pages) | Need to re-point to Cloudflare Pages for v2 |
| 5 | No user accounts exist — favorites are localStorage only | Simplifies migration; no auth migration needed |
| 6 | Blog content (50 posts) is in markdown and can be converted to MDX without loss | Manual fixes may be needed for custom HTML in posts |
| 7 | Affiliate wiring exists but is dormant — can be migrated later | No revenue impact from deferring |
| 8 | Google Maps API key is restricted to peuterplannen.nl and staging domains | v2 on Cloudflare Pages needs the same domain or key update |
| 9 | MapLibre GL can replicate the current map UX without regressions | Map tile provider and style URL must be compatible |
| 10 | Cloudflare Pages free tier is sufficient for staging traffic | If not, need paid plan before cutover |
| 11 | Current indexed URLs follow predictable patterns that can be mapped to v2 routes | Irregular URLs need manual redirect entries |
| 12 | The old site can remain live on a legacy subdomain indefinitely as fallback | GitHub Pages supports custom subdomain assignment |

---

## 2. Migration Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Empty shell deployed to staging that proves the stack works end-to-end.

| Task | Detail |
|------|--------|
| Scaffold Next.js project | New directory (e.g., `peuterplannen-v2/` or `v2/` in repo). App Router, TypeScript strict mode. |
| Tooling | ESLint (strict), Prettier, `.editorconfig` |
| Tailwind setup | Tailwind v4 + CSS custom properties for design tokens (colors, spacing, radii, shadows) |
| Environment variables | `.env.example` with all required vars documented. `.env.local` gitignored. |
| Supabase client | Server-side only client using `@supabase/supabase-js`. No client-side Supabase calls. |
| Typed repositories | `LocationRepository`, `RegionRepository` — thin wrappers around Supabase queries returning typed objects |
| Zod schemas | `LocationSchema`, `RegionSchema`, `BlogPostSchema` — validate all data from Supabase |
| App shell | Basic layout component: mobile viewport, desktop sidebar placeholder, header, bottom nav |
| Deploy to staging | Connect staging.peuterplannen.nl to Cloudflare Pages (using `@cloudflare/next-on-pages`). Verify HTTPS, env vars, Supabase connection. |

**Exit criteria:**
- `staging.peuterplannen.nl` loads the empty shell
- `LocationRepository.getAll()` returns typed, Zod-validated data in a server component
- TypeScript compiles with zero errors
- CI runs lint + type check on push

**Rollback:** Delete the directory. Staging DNS pointed back to GitHub Pages.

---

### Phase 2: First Thin Slice (Week 2-4)

**Goal:** A user can find a location on the map, open its detail, and go back. The core loop works.

| Task | Detail |
|------|--------|
| MapLibre integration | Full-bleed map component, markers from Supabase data, cluster layer |
| Location data fetching | Server component fetches all locations, passes to client map |
| Filter system (basic) | Type filter (speeltuin, kinderboerderij, etc.) and weather filter (indoor/outdoor/both) |
| Bottom sheet (two-sheet) | Browse sheet (peek/half/full) and detail sheet (half/full), managed by XState. Only one visible at a time. Touch gesture support. CSS transitions. |
| Location card list | Cards rendered inside browse sheet half/full state. Tap to open detail sheet. |
| Contextual suggestions | Default browse sheet content on cold start: nearby locations, popular picks, seasonal suggestions. Drives discovery before user searches. |
| Carousel | Horizontally scrollable compact cards as a map-level overlay (visible in peek state, not part of either sheet). |
| Search | City/place name input. Filters map viewport + card list. |
| Location detail | Detail sheet with location info: name, type, address, description, photo, score, map pin |
| Weather integration | Open-Meteo API for current/forecast weather. Powers indoor/outdoor suggestions and weather filter context. |
| PWA manifest | `manifest.json`, basic service worker for offline shell, app icons |

**Exit criteria:**
- Load staging → see map with markers
- Tap a marker → card appears in sheet
- Swipe sheet up → see list of locations
- Tap a card → detail opens with real data
- Use search → map pans, list filters
- Use type filter → markers and list update
- Back gesture → returns to list
- Works on iOS Safari and Chrome Android

**Rollback:** Staging only. No production impact.

---

### Phase 3: SEO Foundation (Week 3-5)

**Goal:** Googlebot can crawl every location, region, and type page with real content and structured data. All SEO pages render within the unified app shell — no separate marketing pages.

| Task | Detail |
|------|--------|
| **Route restructure** | Replace `(marketing)` + `(pwa)` route groups with unified `(app)` + `(portal)` + `(legal)` layout. All SEO routes render inside the app shell (map + sheet/sidebar). |
| SSG region guide pages | `/amsterdam`, `/rotterdam`, etc. — region guide content in the sheet/sidebar, map centered on region |
| SSG city+type pages | `/amsterdam/speeltuinen`, etc. — filtered list in the sheet, map with type markers |
| SSR location detail pages | `/amsterdam/artis` — detail content in the sheet/sidebar, map centered on location |
| Guides feature | Build guides overview (`/guides`) and guide cards section for home sheet. Guides replace standalone blog pages. |
| Blog/article in sheet | `/blog/[slug]` renders article content in the sheet/sidebar with map background. Replaces separate blog layout. |
| Portal layout | `/partner` and `/admin` in `(portal)` route group — separate layout, no map. |
| Legal layout | `/privacy`, `/terms`, `/about`, `/contact` in `(legal)` route group — minimal layout, no map. |
| Sheet footer | "Heb je een locatie? Beheer je listing →" + Privacy · Voorwaarden · Over — replaces traditional footer. |
| Structured data | JSON-LD on location pages (type-specific schema), region pages (ItemList), blog posts (Article) — rendered server-side within app layout |
| Sitemap | Auto-generated `sitemap.xml` from Supabase data |
| Meta tags | Title, description, canonical URL, Open Graph, Twitter cards per page |
| Redirect map | Map every old `.html` URL to its v2 equivalent. Store as `next.config.js` redirects. |
| Blog migration | Convert 50 markdown posts to MDX for sheet rendering. Preserve URLs. Add frontmatter for meta tags. |

**Exit criteria:**
- Every location in Supabase has a crawlable page within the app shell
- Every region and type has a guide/hub page within the app shell
- `/guides` overview page works
- Blog posts render in the sheet with map background
- `/partner`, `/privacy`, `/terms`, `/about`, `/contact` work in their respective layouts
- `sitemap.xml` contains all pages
- Google Rich Results Test passes on a location page
- All 50 blog posts render correctly in the sheet
- Old URL → new URL redirect map covers all ~2365 pages

**Rollback:** Staging only. Old pages still live on production. No SEO impact.

---

### Phase 3.5: Photo Storage Migration (Week 4)

**Goal:** Move location photos from git to Cloudflare R2. Serve optimized images via Cloudflare Image Resizing instead of pre-generated thumbnails.

**Context:** The old app stores ~547 MB of photos in git (`/images/locations/`), with 4 files per location (thumb.webp, thumb.jpg, hero.webp, hero.jpg). This cannot move to Cloudflare Pages (size limits) and bloats the repo. The v2 approach: store one original per location in R2, let Cloudflare Image Resizing generate sizes on-demand at the CDN edge.

| Task | Detail |
|------|--------|
| Create R2 bucket | `peuterplannen-photos` bucket via Cloudflare API (`$CLOUDFLARE_API_TOKEN`) |
| Upload existing photos | Script to upload all `hero.webp` files from `/images/locations/` to R2 with key pattern `{region}/{slug}/hero.webp` |
| Configure Image Resizing | Enable on the staging domain. Set up transform URL pattern for thumb/hero/card sizes. |
| Next.js image loader | Custom Cloudflare image loader in `next.config.ts` so `<Image>` components request transforms automatically |
| Update photo pipeline | Modify `.scripts/pipeline/fetch-photos.js` to upload to R2 instead of writing to disk |
| Update Supabase URLs | Batch update `photo_url` in Supabase to point to R2 public URLs instead of relative paths |
| R2 binding in wrangler | Add `R2_BUCKET` binding in `wrangler.jsonc` for direct access from Cloudflare Pages functions |
| Verify | All location cards and detail pages show photos from R2. Thumbnail generation works via Image Resizing. No broken images. |

**Image sizes (generated on-demand by Cloudflare Image Resizing):**

| Use | Dimensions | Quality |
|-----|-----------|---------|
| Card thumbnail | 400×300 (fit=cover) | 80 |
| Detail hero | 800×600 (fit=cover) | 85 |
| Carousel card | 144×144 (fit=cover) | 80 |
| OG image | 1200×630 (fit=cover) | 85 |

**Environment variables to add:**

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | R2 API access |
| `R2_BUCKET_NAME` | Bucket name (`peuterplannen-photos`) |
| `R2_PUBLIC_URL` | Public access URL for the bucket |

**Exit criteria:**
- All photos served from R2 via Cloudflare CDN
- `<Image>` components in v2 request correct transform URLs
- No photos stored in git for v2 (old `/images/locations/` remains for v1 until cutover)
- Photo pipeline uploads to R2 instead of disk
- Page load time for cards with photos is equal or better than v1

**Rollback:** R2 is additive. Old photos in git still work for v1. If R2 fails, point `photo_url` back to relative paths.

---

### Phase 4: Polish & Canonicalize (Week 4-6)

**Goal:** The app feels calm, premium, and coherent. Not just functional — desirable. The unified app shell renders all content types beautifully.

| Task | Detail |
|------|--------|
| Location detail canonical | Full detail view in sheet/sidebar: photos, score breakdown, tips, opening hours, directions link, save button |
| Glass design system | Frosted glass panels, subtle shadows, smooth transitions. Brand fonts: Newsreader (headings), Inter (body/UI). |
| Sheet physics | Velocity-based animation, rubber-band overscroll, gesture handoff between scroll and sheet drag |
| Sheet content types | Polish all content types in the sheet: browse cards, region guides, article content, guide overview, detail view |
| Filter system complete | All filter types: age, type, weather, distance, peuterproof score, free/paid |
| Favorites | localStorage read/write. Heart icon on cards and detail. Favorites tab in bottom nav. |
| Plan view (basic) | Simple list of saved locations, reorderable. No route optimization yet. |
| Guide content polish | Region guides and blog articles render beautifully in the sheet. Embedded location cards, images, typography. |
| Sheet footer | "Heb je een locatie? Beheer je listing →" + Privacy · Voorwaarden · Over links — styled consistently across all sheet states. |
| Empty states | Friendly illustrations or copy for: no results, no favorites, no plan items, error, offline |
| Loading skeletons | Skeleton cards, skeleton detail, skeleton map — no layout shift |
| Error boundaries | Graceful fallback per route segment. Never a white screen. |

**Exit criteria:**
- Detail page looks and feels premium on iPhone 14 and Pixel 7
- Sheet gestures feel native (no jank, no missed gestures)
- Region guides and blog articles render well in the sheet on all screen sizes
- All filter combinations return sensible results or a friendly empty state
- Favorites persist across sessions
- No layout shift on any page load (CLS < 0.1)
- Sheet footer links work and lead to correct layouts (portal/legal)

**Rollback:** Staging only. Revert commits if design direction is wrong.

---

### Phase 5: Quality Gates (Week 5-7)

**Goal:** Confidence that v2 won't break in production. Automated proof, not hope.

| Task | Detail |
|------|--------|
| Playwright E2E | Core flows: load → search → filter → open detail → save favorite → view favorites → plan |
| Visual regression | Screenshot tests for: home, detail, sheet states, filters open, empty state, error state |
| Performance | Code splitting per route. Image optimization (next/image). ISR for location pages (revalidate: 3600). Performance budget: LCP < 2.5s, FID < 100ms, CLS < 0.1. |
| Accessibility | axe-core audit on home, detail, search. Keyboard navigation for all interactive elements. Screen reader testing on detail page. |
| Analytics | GA4 page views. Custom events: search, filter, detail_open, favorite_save, plan_add. |

**Exit criteria:**
- All Playwright tests pass in CI
- Core Web Vitals green on staging (measured by Lighthouse CI)
- Zero axe-core critical violations
- Analytics events firing correctly on staging
- Visual regression baseline established

**Rollback:** Staging only. Fix failing tests before proceeding.

---

### Phase 6: Staging Validation (Week 7-8)

**Goal:** Prove v2 is better than v1 with evidence, not opinion.

| Task | Detail |
|------|--------|
| Content parity | Script that compares every location/region/type URL between v1 and v2. Flag missing pages. |
| SEO parity | Compare page titles, meta descriptions, structured data, canonical URLs. Verify no regressions. |
| Performance comparison | Run Lighthouse on 10 representative pages on both v1 and v2. Compare scores. |
| User testing | 2-3 real parents use v2 on staging for 10 minutes. Note friction points, confusion, praise. |
| Bug fix sprint | Fix everything found in validation. Re-test. |

**Exit criteria:**
- Zero missing pages vs. v1
- v2 Lighthouse scores equal or better than v1 on every metric
- User testers prefer v2 or identify fixable issues (all fixed)
- No critical bugs remaining
- Team consensus: v2 is ready

**Rollback:** Don't proceed to Phase 7. Fix issues. Re-validate.

---

### Phase 7: Production Cutover (Week 8+)

**Goal:** peuterplannen.nl serves v2. Old site preserved as fallback. Reversible within 15 minutes.

| Step | Detail |
|------|--------|
| 1. Preserve old site | Deploy current production to `legacy.peuterplannen.nl` (GitHub Pages, separate CNAME) |
| 2. Activate redirect map | All old `.html` URLs 301-redirect to v2 equivalents via `next.config.js` |
| 3. DNS switch | Point `peuterplannen.nl` to Cloudflare Pages |
| 4. Verify | Check: homepage loads, search works, detail pages render, sitemap accessible, analytics firing |
| 5. Monitor (48h) | Watch: Search Console coverage, error rates, Core Web Vitals, analytics traffic |
| 6. Submit updated sitemap | Ping Google with new sitemap URL |

**Rollback plan:**
1. DNS switch `peuterplannen.nl` back to GitHub Pages (propagation: ~5-15 min with Cloudflare)
2. Legacy site is already live and unchanged
3. No data loss — Supabase is shared and was never modified
4. Communicate rollback reason, fix, re-attempt

**Exit criteria:**
- peuterplannen.nl serves v2 for 48 hours with no critical issues
- Search Console shows no coverage regressions
- Analytics traffic is stable or growing
- No user-reported critical bugs

---

## 3. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **SEO regression** — losing indexed pages or ranking | Medium | High | 301 redirects for every old URL. Staging validation with content parity script. Monitor Search Console daily for 2 weeks post-cutover. |
| **Supabase schema change** during migration | Low | High | Zod validation catches mismatches early. Typed repositories isolate data access. Don't change the schema during migration. |
| **Next.js bundle too large** for mobile | Medium | Medium | Performance budget enforced in CI. Code splitting per route. Measure on real 4G device before cutover. |
| **v2 UX feels worse** than v1 | Medium | High | User testing on staging before cutover. Keep v1 on legacy subdomain. Don't cut over until testers prefer v2. |
| **Cloudflare Pages downtime** | Low | High | Keep GitHub Pages as instant fallback. DNS switch back takes <15 min on Cloudflare. |
| **Map tile provider issues** | Low | Medium | MapLibre supports multiple tile sources. Have backup style URL configured. |
| **Blog content breaks** in MDX conversion | Medium | Low | Validate all 50 posts render correctly. Manual review of posts with custom HTML. |
| **localStorage favorites lost** on domain change | Low | Low | Same domain, so localStorage persists. If subdomain changes, offer one-time migration prompt. |
| **Redirect map incomplete** | Medium | Medium | Automated script generates redirects from Supabase data. Manual review of edge cases. Test with crawler before cutover. |

---

## 4. Rollback Logic

| Phase | Rollback action | Time to recover | Data risk |
|-------|----------------|-----------------|-----------|
| Phase 1 (Foundation) | Delete v2 directory. Point staging DNS back to GitHub Pages. | 5 min | None |
| Phase 2 (Thin slice) | Revert staging deployment. Old staging branch still exists. | 2 min | None |
| Phase 3 (SEO) | Staging only — no production impact. Revert commits. | 2 min | None |
| Phase 4 (Polish) | Revert commits on staging. No production impact. | 2 min | None |
| Phase 5 (Quality) | Fix failing tests. No deployment to revert. | N/A | None |
| Phase 6 (Validation) | Don't proceed to Phase 7. Fix and re-validate. | N/A | None |
| Phase 7 (Cutover) | DNS switch back to GitHub Pages. Legacy site untouched. | 5-15 min | None — Supabase is read-only and shared |

**Key principle:** Production is never at risk until Phase 7. Phase 7 is fully reversible.

---

## 5. Success Criteria per Phase

| Phase | Criteria | How to verify |
|-------|---------|---------------|
| 1. Foundation | Shell loads on staging, Supabase returns data, TS compiles clean | `curl staging.peuterplannen.nl` returns 200. CI green. |
| 2. Thin slice | Core loop works: search → find → open → back | Manual test on iPhone + Android. Playwright smoke test. |
| 3. SEO | Every location has a crawlable page within app shell. Guides replace blog. Route groups unified. | Content parity script. Google Rich Results Test. All routes render in correct layout. |
| 4. Polish | Feels premium. No jank. All content types render well in sheet. | User testing. 60fps sheet animations. No blank states. Guides + articles look great in sheet. |
| 5. Quality | Tests pass. CWV green. Accessible. | CI pipeline. Lighthouse CI. axe-core report. |
| 6. Validation | v2 provably better than v1 | Side-by-side Lighthouse. User preference. Zero missing pages. |
| 7. Cutover | Live for 48h with no critical issues | Search Console. Analytics. Error monitoring. |

---

## 6. What Is Intentionally Deferred

These are known features or capabilities that are **not** part of the v2 migration. They will be built after production cutover is stable.

- **Auth / social login** — no user accounts yet
- **Affiliate integration** — keep wiring in code, don't activate UI
- **Featured listings UI** — data model exists, UI deferred
- **Admin cockpit** — manage via Supabase dashboard for now
- **Push notifications** — requires auth infrastructure
- **Dark mode** — design tokens support it, but not shipping in v2
- **Internationalization** — Dutch only for now
- **Native app wrapper** — PWA is sufficient
- **Advanced map features** — heatmaps, custom map styles, 3D terrain
- **Plan view advanced** — route optimization, time-based planning, sharing
- **Real-time data** — Supabase realtime subscriptions
- **User reviews / ratings** — requires auth
- **Social sharing cards** — OG images are enough for now

---

## 7. Environment Variables Required

```bash
# Supabase
SUPABASE_URL=                        # Supabase project URL
SUPABASE_SERVICE_KEY=                # Server-side only. Never expose to client.
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Client-safe read-only key (used in server components too)

# Map
NEXT_PUBLIC_MAP_STYLE_URL=           # MapLibre style JSON URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=     # For directions links (not map tiles)

# Analytics
NEXT_PUBLIC_GA_ID=                   # Google Analytics 4 measurement ID

# Site
NEXT_PUBLIC_SITE_URL=                # https://peuterplannen.nl (or staging URL)
NEXT_PUBLIC_SITE_NAME=               # PeuterPlannen

# Build
NEXT_PUBLIC_BUILD_ID=                # Git SHA, injected at build time
NODE_ENV=                            # production | development

# Cloudflare
CLOUDFLARE_API_TOKEN=                # Deployments and cache purge
CLOUDFLARE_ACCOUNT_ID=               # Cloudflare account identifier

# Weather
# Open-Meteo API — no key required (free, open API)

# Optional (Phase 5+)
SENTRY_DSN=                          # Error monitoring
REVALIDATE_SECRET=                   # ISR on-demand revalidation token
```

All secrets stored in Cloudflare Pages environment settings. `.env.example` committed to repo with descriptions, no values. `.env.local` gitignored.

---

## 8. Decision Log

| Decision | Chosen | Alternative | Reasoning |
|----------|--------|-------------|-----------|
| **Framework** | Next.js App Router | Keep vanilla / Astro / Remix | SSR for SEO is the primary driver. Next.js has the largest ecosystem, and App Router enables server components for data fetching. Deployed on Cloudflare Pages via `@cloudflare/next-on-pages`. |
| **Styling** | Tailwind CSS | Custom CSS / CSS Modules / styled-components | Speed of development. Utility-first matches our design token system. No runtime CSS cost. Tailwind v4 has native CSS variable support. |
| **State management** | XState for sheet, React state for rest | useReducer / Zustand / Jotai | The bottom sheet has 5+ states with complex transitions (peek/half/full/detail/search). This is a genuine state machine. Everything else is simple enough for React state + URL params. |
| **Data fetching** | TanStack Query | SWR / plain fetch | Stale-while-revalidate, cache keys, background refetch. Worth the bundle cost for the map + filter interaction pattern. |
| **Validation** | Zod | io-ts / Yup / no validation | Runtime validation of Supabase data catches schema drift before it hits the UI. Zod integrates with TypeScript types. |
| **Hosting** | Cloudflare Pages (with `@cloudflare/next-on-pages`) | Vercel / GitHub Pages | Already using Cloudflare for DNS and CDN. API token available (`$CLOUDFLARE_API_TOKEN`). No new vendor dependency. CF Pages supports Next.js SSR via edge runtime. |
| **Migration strategy** | Clean rebuild in separate directory | Gradual file-by-file migration | The old codebase has CSS debt, no types, no component model. Incremental migration would mean carrying that debt into v2. Clean break is faster and results in better architecture. |
| **Maps** | MapLibre GL (keep) | Google Maps / Mapbox | Already proven in v1. Free, open-source, performant. No reason to change. |
| **Database** | Keep Supabase (shared) | New database / migrate | The data model works. No reason to add migration risk. v2 reads from the same tables with better typing. |
| **Favorites** | Keep localStorage (for now) | Supabase + auth | No auth system yet. localStorage works. Will migrate to server-side when auth ships post-v2. |
