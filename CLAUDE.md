# PeuterPlannen — Project Rules for Claude Code

## ⚠️ CRITICAL: This is a REBUILD, not a patch job

PeuterPlannen is being rebuilt from the ground up on a completely new stack.

**The old app files (app.html, app.css, glass.css, modules/, etc.) are READ-ONLY reference material.**
**Do NOT edit, patch, or extend any old frontend files.**

The new app is built in the `/v2/` directory using Next.js, React, TypeScript, and Tailwind.
All design and architecture decisions are documented in `docs/v2/`.

### What to read first
1. `HANDOFF.md` — current status, what phase we're in, what to do next
2. `docs/v2/migration-plan.md` — the phased build plan
3. The specific `docs/v2/*.md` files relevant to your current task

### What is READ-ONLY (old app — do not modify)
- `app.html`, `app.js`, `app.css`, `app.min.css`
- `glass.css`, `design-system.css`, `fonts.css`
- `modules/` (all 19 ES modules)
- `.scripts/` (build pipeline)
- All static HTML pages (amsterdam.html, etc.)
- `content/` (blog posts, SEO content)

Use these only as reference for: product behavior, data fields, content, SEO patterns.

### What is ACTIVE (new app — this is where you work)
- `/v2/` — the new Next.js application
- `docs/v2/` — architecture and design documentation
- `HANDOFF.md` — session continuity

---

## New stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router |
| Language | TypeScript (strict) |
| UI | React, server components where possible |
| Styling | Tailwind CSS + CSS custom properties (design tokens) |
| Server state | TanStack Query |
| UI state | XState (sheet, map orchestration) |
| Validation | Zod |
| Maps | MapLibre GL JS (behind adapter) |
| Database | Supabase PostgreSQL (existing, server-side access only) |
| Deployment | Cloudflare Pages → staging.peuterplannen.nl |
| Testing | Playwright (E2E + visual regression), Vitest (unit) |

## Design direction

Apple Maps 85-90% likeness with warm coral/terracotta palette. Light mode only.

| Aspect | Choice |
|--------|--------|
| Main font | Inter (variable) |
| Accent font | Newsreader (location names on detail sheet only) |
| Primary accent | `#B3553A` (deep terracotta) |
| Sheet | Two separate sheets: browse + detail (never both visible) |
| Icons | SVG, no emoji |
| Glass | Only for map overlay controls, sheet is solid |

Full spec: `docs/v2/design-system.md`

## Branch and deployment rules

- **Branch:** `staging` — all v2 work happens here
- **NEVER touch `main`** — that's production (peuterplannen.nl), must stay untouched
- **NEVER edit old app files** — they serve the current live site
- **Deploy target:** staging.peuterplannen.nl (Cloudflare Pages)
- **NEVER force-push to main**
- **NEVER commit `.env`, credentials, or API keys**

## Commands (v2 app)

```bash
cd /v2 && npm run dev        # local dev server
cd /v2 && npm run build       # production build
cd /v2 && npm run test        # all tests
cd /v2 && npm run test:e2e    # Playwright E2E
cd /v2 && npm run lint        # ESLint + type check
```

## Testing rules (v2 app)

- Run tests after every significant change, before reporting done
- Playwright E2E for core flows (search, filter, detail, map)
- Visual regression for key states (sheet peek/half/full, detail, empty)
- Vitest unit tests for domain logic (scoring, filtering, validation)
- Console error monitoring in all E2E tests
- Test empty states and error states, not just happy paths
- Never report "done" without verification

## Quality standards

- Strict TypeScript — no `any`, no `@ts-ignore` without justification
- Every component has one owner, one style source
- Design tokens from `docs/v2/design-system.md` — never hardcode colors, spacing, radii
- 44px minimum tap targets
- Semantic HTML, ARIA where needed
- Performance: LCP < 2.5s, CLS < 0.1
- No "AI slop" aesthetics (purple gradients, generic layouts, decorative clutter)

## API keys

All keys live in `~/.zprofile` as environment variables. NEVER hardcode, echo, or commit them.
- `$SUPABASE_SERVICE_KEY` — server-side only, never in client code
- `$SUPABASE_ANON_KEY` — read-only, safe for client
- `$CLOUDFLARE_API_TOKEN` — deployment
- `$GEMINI_API_KEY` — visual review tool

## Session continuity

- Always read `HANDOFF.md` at the start of every session
- Always update `HANDOFF.md` before the session ends
- If `HANDOFF.md` seems outdated, read all `docs/v2/*.md` to reconstruct context
- Check `git status` and `git log -5` for uncommitted or half-finished work
