# PeuterPlannen — Project Authority (Gemini CLI)

## ⚠️ STATUS: v2 REBUILD IN PROGRESS

This project is being rebuilt from the ground up. See `docs/v2/` for all documentation.

**Do NOT follow the old instructions below** — they refer to the legacy vanilla JS app.
**All new work happens in `/v2/` (Next.js, TypeScript, React, Tailwind).**

Read `HANDOFF.md` and `docs/v2/migration-plan.md` for current status and next steps.

---

## Legacy reference (for context only — do not act on these)

### Product identity
PeuterPlannen is a discovery tool for Dutch parents finding toddler-friendly outings.
Core loop: Zoeken → Filteren → Vertrouwen → Kiezen.

### Database
Supabase PostgreSQL with `locations` (~60 fields), `regions`, `editorial_pages`, and pipeline tables.
Anon key is read-only and safe for client-side. Service key is server-only.

### Git safety
- NEVER force-push to main
- NEVER delete files without asking
- NEVER commit .env or credentials
- Staging branch → staging.peuterplannen.nl
- Main branch → peuterplannen.nl (PRODUCTION — do not touch)

### AI behavior
- Direct tone, no fake enthusiasm
- Research before assuming
- Use parallel subagents for investigation
- Plan → approval → execute
