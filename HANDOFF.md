# Handoff — PeuterPlannen UX Revamp

> Laatst bijgewerkt: 19 maart 2026

## Status
**Fase 0 is AFGEROND.** Volgende stap is **Fase 1: Code-Fundament**.

### Fase 0 resultaten
- **1442 venue-foto's** gescraped van venue websites (og:image extractie)
- **46 logo's** automatisch gefilterd en verwijderd
- **8 categorie-illustraties** als fallback voor alle locaties zonder foto
- **100% visuele dekking**: elke locatie heeft een afbeelding (foto of illustratie)
- Foto's opgeslagen in `/images/locations/{regio}/{slug}/` (thumb.webp/jpg + hero.webp/jpg)
- DB kolommen `photo_url`, `photo_source`, `photo_fetched_at` gevuld voor 1442 locaties
- `app.html` toont foto's in kaarten (met category fallback)
- Location pages generator checkt foto's op disk (onafhankelijk van DB)

### Nieuwe scripts
| Script | Wat het doet |
|--------|-------------|
| `.scripts/pipeline/fetch-venue-photos.js` | Scrape og:image van venue websites → resize → opslaan |
| `.scripts/pipeline/sync-photo-urls.js` | Sync foto's op disk naar Supabase photo_url |
| `.scripts/pipeline/filter-logo-photos.js` | Detecteer en verwijder logo-achtige afbeeldingen |

### Nog niet gecommit
Alle wijzigingen zijn lokaal — nog niet gecommit of gepusht. Dit omvat:
- 237MB aan foto's in `/images/locations/`
- Wijzigingen in `app.html`, `.scripts/lib/generators/location-pages.js`
- Nieuwe scripts en migratie
- `.supabase_env` bevat credentials — NIET committen

## Het plan
Lees `plan-ux-revamp.md` — dat is het definitieve werkdocument met 10 fases.

## Volgende stap
**Fase 1: Code-Fundament** — Design tokens, CSS variabelen, Warm Liquid Glass basis.

## Ondersteunende documenten
| Document | Wanneer lezen |
|----------|---------------|
| `RESEARCH-SYNTHESIS.md` | Achtergrond bij elke sessie |
| `plan-je-dag-ux-spec.md` | Fase 4 (Plan je dag) |
| `~/SMARTER_PLANNING_ALGORITHM_DESIGN.md` | Fase 4 (algoritme) |
| `~/TOPIC_2_PEUTERSCORE_IMPROVEMENT.md` | Fase 5 (peuterscore) |
| `personalization-strategy.md` | Fase 6 |
| `docs/mobile-map-ux-spec.md` | Fase 3 (bottom sheet) |
| `~/LIQUID_GLASS_GUIDE.md` | Fase 1 (design) |
| `MOBILE-CONCEPTS.md` | Fase 3 (mobiel) |
| `EXPERT-FOCUS-GROUP-MOBILE.md` | Fase 3 (expert advies) |
| `GROWTH-FOCUS-GROUP.md` | Fase 7+ (groei) |
| `mockup-mobile.html` | Visuele referentie (open in browser) |

## Bas's kernvoorkeuren
- Vanilla JS (geen framework)
- Warm Liquid Glass (75-80% opacity)
- Apple Maps als UX-inspiratie
- 3 sheet-posities (peek/half/full)
- Preset filters behouden + nieuw "Terrasje" preset
- Test na elke wijziging via Playwright MCP
- Parallel werken waar mogelijk (worktrees)
- Foto's lokaal in repo, niet R2 (keuze Bas)
