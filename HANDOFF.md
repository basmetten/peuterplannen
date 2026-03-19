# Handoff — 19 maart 2026

## Wat is af en live

### Plan 3 (plan3.md) — volledig geïmplementeerd
- **Fase 1**: Typography token migration — inline CSS verwijderd uit ~2200 pagina's
- **Fase 2**: Homepage typography cleanup — 20+ px → tokens
- **Fase 3**: Instrument Serif expansie — accent spans op homepage, blog, type pages
- **Fase 4**: Illustraties — 8 category headers + 20 city headers + empty state (Nano Banana 2)
- **Fase 5**: Progressive disclosure — regio's grid, situatie scroll-strip, viewport-focus cards, blog TOC, loc-list disclosure, footer disclosure, nav simplification, app preset disclosure
- **Fase 6**: Consistentie-audit — alle pagina-types gecontroleerd

### Desktop App Redesign — geïmplementeerd
- Fullscreen kaart als achtergrond (map vult hele viewport)
- Floating glasspanel links (400px, backdrop-blur, rounded right edge)
- Floating context bar ("Wat gaan we doen?" + Ontdek locaties / Plan mijn dag)
  - Gecentreerd boven de kaart, zelfde visuele taal als nav bar
  - Rounded corners, backdrop-blur, shadow
- Titel gewijzigd: "Waar gaan we vandaag naartoe?" → "Wat gaan we doen?"
- Preset grid: 2 kolommen op desktop (was 3)
- Mobile layout ongewijzigd

### CI
- Alle tests (57/57) + alle audits groen
- Laatste commit: `0e0f47` — floating context bar

## Wat open staat / verbeterpunten

### 1. Desktop app polish
De floating context bar en glasspanel werken, maar kunnen nog gepolijst worden:
- Header tekst "Wat gaan we doen?" is vrij klein (15px) — misschien iets groter
- De bar staat nu gecentreerd — optie om hem links uit te lijnen boven het panel
- Rechterhoek van het glasspanel heeft border-radius maar de header erboven matcht niet perfect
- De `app-context-strip` is `position: fixed` met `top: 78px` — dit kan breken als de nav hoogte verandert

### 2. Visual testing workflow (nieuw in CLAUDE.md)
- CLAUDE.md is bijgewerkt met visual verification regels
- Gemini Flash API key beschikbaar voor second-opinion screenshot analyse
- Overweeg: `visual-check.js` script dat automatisch key pages screenshoot + analyseert

### 3. Playwright browser setup
- Playwright MCP probeert Chrome.app te openen → conflicteert met draaiende Chrome
- Workaround: gebruiker sluit Chrome handmatig, of lock file verwijderen
- Structurele fix: configureer MCP om Playwright's eigen Chromium te gebruiken

## Technische context

### Build systeem
- `node .scripts/sync_all.js` regenereert ~2200 pagina's
- Na rebuild: `UPDATE_SNAPSHOTS=1 node --test .scripts/__tests__/build-snapshot.test.js`
- **LET OP**: stage ALLE gewijzigde bestanden incl. partner/, admin/, privacy/, disclaimer/
- Audits voor commit: `npm test && node .scripts/audit_seo_quality.js --strict && node .scripts/audit_design_tokens.js --strict`

### Desktop app CSS architectuur
- Alle desktop regels in `app.css` onder `html.pp-desktop` selectors
- `pp-desktop` class wordt door JS toegevoegd bij viewport > 1024px
- Floating panel: `#list-view` met `position: absolute; backdrop-filter: blur(20px)`
- Context bar: `.app-context-strip` met `position: fixed; top: 78px; border-radius: 20px`
- Map: `#map-container` met `position: absolute; inset: 0`

### API keys (NIET committen)
- Gemini: via `GEMINI_API_KEY` env var, key staat in `~/.claude/CLAUDE.md`
- Supabase: via GitHub Secrets in CI
