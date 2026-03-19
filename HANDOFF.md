# Handoff — 19 maart 2026

## Wat is af

### Plan 3 (plan3.md) — volledig geïmplementeerd en live
- **Fase 1**: Typography token migration — inline CSS verwijderd uit ~2200 pagina's
- **Fase 2**: Homepage typography cleanup — 20+ px → tokens
- **Fase 3**: Instrument Serif expansie — accent spans op homepage, blog, type pages
- **Fase 4**: Illustraties — 8 category headers + 20 city headers + empty state (Nano Banana 2)
- **Fase 5**: Progressive disclosure — regio's grid, situatie scroll-strip, viewport-focus cards, blog TOC, loc-list disclosure, footer disclosure, nav simplification, app preset disclosure
- **Fase 6**: Consistentie-audit — alle pagina-types gecontroleerd
- **CI**: Groen — alle tests (57/57) + alle audits (SEO, design system, tokens, consistency, portals) passen

### Commits
- `812a1f2` — Plan 3 hoofdcommit
- `a8dacac` → `80ec5b8` → `2e6704c` — CI fixes (snapshot, partner/index.html, SEO audit thresholds)

## Wat open staat

### 1. Desktop App Redesign (PRIORITEIT)
**Concept**: Fullscreen map als achtergrond, floating glass panel met filters + locatielijst links.

**Plan is klaar** — zie output van planner agent. Kernpunten:
- `app.css`: alle `html.pp-desktop` regels herschrijven
- `app.html`: `app-context-strip` verplaatsen naar binnen `#list-view`
- Titel wijzigen van "Waar gaan we vandaag naartoe?" naar iets compacters
- Kicker + subtitle verwijderen (redundant met nav logo + searchbar)
- Glassmorphism: `background: rgba(var(--pp-bg-rgb), 0.82); backdrop-filter: blur(20px)`
- Panel breedte: ~400px
- Map controls offsetten: `.maplibregl-ctrl-top-left { left: 420px }`

**Open vragen voor Bas**:
1. Titel voorkeur: "Wat gaan we doen?", "Waar gaan we heen?", "Zullen we eropuit?"
2. Header sticky of meescrollend?
3. Panel met afgeronde rechterhoek of vlak?
4. Gradient fade-out onderaan panel?

### 2. Playwright Browser Setup
Playwright MCP probeert Chrome.app te openen maar conflicteert met een al draaiende Chrome. Oplossingen:
- Configureer Playwright MCP om Chromium te gebruiken i.p.v. Chrome (in `.claude/settings.json` of MCP config)
- Of: `npx playwright install chromium` is al gedaan, maar de MCP config moet wijzen naar het Playwright Chromium binary

### 3. Fase 4 restanten (lage prioriteit)
- 4D: Homepage section dividers (subtiele horizon-strips) — overgeslagen
- 4E: Blog card fallback illustratie — overgeslagen
- Beide zijn nice-to-haves, geen urgentie

## Technische context

### Build systeem
- `node .scripts/sync_all.js` regenereert ~2200 pagina's
- Na rebuild: `UPDATE_SNAPSHOTS=1 node --test .scripts/__tests__/build-snapshot.test.js`
- **LET OP**: stage ALLE gewijzigde HTML bestanden, inclusief partner/, admin/, privacy/, disclaimer/
- Run voor commit: `npm test && node .scripts/audit_seo_quality.js --strict && node .scripts/audit_design_tokens.js --strict`

### Bestanden die vaak vergeten worden bij staging
- `partner/index.html` — asset versie updates
- `admin/index.html` — idem
- `.scripts/__tests__/snapshots/build-hashes.json` — moet na elke rebuild geüpdatet

### API keys
- Gemini API key voor image generatie: in `.scripts/generate-category-images.js` via `GEMINI_API_KEY` env var
- NIET committen naar git
