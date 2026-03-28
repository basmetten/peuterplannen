# HANDOFF — PeuterPlannen v2 Rebuild

## Status
**Phase 0 complete** — all discovery and documentation done.
**Phase 1 next** — scaffold the Next.js project.

## What happened
- Deep inspection of current database (8 Supabase tables, `locations` with ~60 fields)
- Deep inspection of current app flows (vanilla JS SPA, 20 ES modules, scroll-snap sheet)
- Deep inspection of current SEO strategy (~2365 pages, graduation system, location pages are redirect shells)
- Deep inspection of current design system (dual `--pp-*`/`--wg-*` tokens, Warm Liquid Glass)
- Research: Apple Maps detail flow, Apple Maps design system (reverse-engineered)
- Review: 52 reference screenshots (Apple Maps, Funda, ZenChef)
- Review: Gemini CLI session about v3 blueprint
- 7 comprehensive docs written in `docs/v2/`

## Key design decisions

| Decision | Choice |
|---|---|
| Stack | Next.js App Router, TypeScript, React, Tailwind, Cloudflare Pages |
| Database | Same Supabase (server-side access only) |
| Maps | MapLibre GL behind adapter |
| State | TanStack Query (server), XState (UI orchestration) |
| Main font | Inter (variable) — replaces Plus Jakarta Sans |
| Accent font | Newsreader — only for location names on detail sheet |
| Design | Apple Maps 85-90% likeness, warm terracotta palette |
| Color mode | Light mode only |
| Primary accent | `#C05A3A` (deep terracotta) |
| Detail flow | Separate sheet (not in-place in browse sheet) |
| Carousel | Compact horizontal cards for small clusters (≤5) |
| Start screen | Contextual algorithm (time + weather + season + prefs) |
| Icons | SVG icons, no emoji |
| Weather API | Open-Meteo (free, no key) |
| Deployment | Cloudflare Pages → staging.peuterplannen.nl |
| Production | peuterplannen.nl untouched until v2 proven on staging |

## Documentation (read these first)

All in `docs/v2/`:

| File | What |
|---|---|
| `user-flows.md` | 24 concrete user flows with step-by-step journeys |
| `product-principles.md` | Build rules and decision framework |
| `information-architecture.md` | Routes, screens, navigation, SEO page strategy |
| `system-architecture.md` | Full technical architecture with code examples |
| `design-system.md` | Canonical design system (Apple Maps + warm palette) |
| `seo-analytics.md` | URL strategy, structured data, event taxonomy |
| `migration-plan.md` | 7 phases, risks, rollback, deferred scope |

## Next step

Start Phase 1 from `migration-plan.md`:
1. Scaffold Next.js project in `/v2/` directory
2. TypeScript strict, ESLint, Prettier
3. Tailwind + design token CSS variables
4. Environment variables (.env.example)
5. Supabase server-side client + typed repositories
6. Zod schemas for Location, Region
7. Basic app shell layout
8. Deploy to staging.peuterplannen.nl via Cloudflare Pages

## Prompt for new session

```
We're rebuilding PeuterPlannen on a new stack. Phase 0 (docs) is done.
Read docs/v2/migration-plan.md Phase 1 for scope, then start scaffolding.
```
