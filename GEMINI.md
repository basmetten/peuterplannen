# PeuterPlannen — Project Authority (Gemini CLI)
*Laatst bijgewerkt: 26 maart 2026*

## 🎯 CORE DOEL (Roadmap)
PeuterPlannen is een nuchtere, snelle, betrouwbare discovery-tool voor ouders.
**Kernlus:** Zoeken -> Filteren -> Vertrouwen -> Kiezen.
**Focus nu:** Data Reliability (Horizon 3). UI/UX Horizon 1 & 2 zijn afgerond.

## 🧠 MINDSET & WERKREGELS
1. **Trust > Luxe:** Data (GPS, tijden, filters) gaat voor styling en effecten.
2. **Core Loop Eerst:** Verbeter alleen wat direct helpt bij kiezen van een plek.
3. **Bewijs vóór Redesign:** Geen wijzigingen op smaak; alleen op basis van frictie of inconsistenties.
4. **Canonical Systems:** Eén bron van waarheid voor filters, cards en state. UI volgt schema.
5. **Minder Twijfel, niet meer features:** Verlaagt dit frictie? Zo nee: parkeren.

## 📏 DESIGN CANONICAL (Warm Liquid Glass)
- **Kleuren:** Terracotta/Koraal (`--pp-primary: #D4775A`). Geen paars. Geen Inter font.
- **Typografie:** Newsreader (Koppen), Plus Jakarta Sans (Body/UI), Instrument Serif (Accenten).
- **Glass:** UI boven de kaart gebruikt `--wg-*` tokens (opacity 75-80%, borderless, blur 20px).
- **Checklist:** Altijd design tokens gebruiken. Nooit hardcoden. Draai `node .scripts/audit_design_tokens.js` na CSS wijzigingen.

## 🛠 TECHNISCHE STACK & OPS
- **Frontend:** Vanilla HTML/JS/CSS (Modular ES imports). Geen frameworks.
- **Backend:** Supabase (REST API). Cloudflare Workers voor routing/proxying.
- **CI/CD:** GitHub Actions bouwt elke 10 min als `dirty` flag in DB op `true` staat.
- **Staging:** `staging.peuterplannen.nl` — push naar `staging` branch om te deployen.
- **API Keys:** Gebruik `$GEMINI_API_KEY`, `$SUPABASE_SERVICE_KEY` etc. uit `~/.zprofile`. NOOIT hardcoden.
- **Bundle:** `npm run bundle` → esbuild → `app.bundle.js` + `app.bundle.css`
- **Build:** `npm run build` → genereert ~2200 statische pagina's vanuit Supabase

## 🧪 MANDATORY TESTING (Non-negotiable)
1. **Dev Server:** `npx serve -l 8771 --no-clipboard . &`
2. **Visual QA:** Na ELKE visuele wijziging screenshots op 390x844 (Mobile) en 1280x800 (Desktop).
3. **Zero AI Slop:** Inspecteer op generieke layouts, clipping of foute spacing.
4. **Console Check:** Altijd console log controleren na JS wijzigingen.
5. **E2E tests:** `npm run test:e2e` na layout/module wijzigingen.

## 🔐 VEILIGHEID & GIT
- NOOIT force-pushen naar main
- NOOIT bestanden verwijderen zonder te vragen
- NOOIT .env of credentials committen
- Staging branch → `staging.peuterplannen.nl` (veilig experimenteren)
- Main branch → `peuterplannen.nl` (productie)

## 🔑 SECURITY AUDIT BEVINDINGEN (maart 2026)
- **Google Maps API key in `modules/utils.js:148`**: Dit is opzettelijk — Maps JS API vereist een publieke key in de frontend. Risico zit in ontbrekende key restrictions. Bas moet in Google Cloud Console de key beperken tot `peuterplannen.nl/*` en `staging.peuterplannen.nl/*`. Niet uit de code halen.
- **Supabase anon key in `.scripts/lib/config.js`**: Veilig en opzettelijk. Read-only publieke key, hoort in de code.
- **Cloudflare analytics token in `.scripts/lib/config.js`**: Veilig. Analytics tokens zijn publiek by design.
- **`.supabase_env`**: Bevat service keys — correct gitignored, nooit committen.
- **Hardcoded Zone IDs**: Verwijderd uit `staging.yml`; wordt nu dynamisch opgehaald (consistent met `sync-site.yml`).
- **`.archive/`**: Gitignored. Oude expired Gemini keys in HANDOFF.md — geen actief risico.

## 📌 HUIDIGE FOCUS: HORIZON 3 (Data Reliability)
- **Taak 11:** Datakwaliteitbatch draaien (openingstijden, dode links, duplicaten).
- **Output:** `dataset_audit_report.md`, `dataset_fixes.sql`, `manual_review_queue.csv`.
- **Geen direct writes:** Lever alleen SQL/CSV op voor handmatige controle of batch-run.

## 🤖 AI GEDRAG & TOON
- **Eerlijk over onzekerheid:** Zeg altijd expliciet als je iets niet weet of onzeker bent. "Ik weet dit niet zeker, laat me het nakijken" is correct gedrag.
- **Onderzoek bij onzekerheid:** Bij twijfel over de codebase of een beslissing: gebruik parallele subagents (lokale verkenning + web search) VOORDAT je een antwoord geeft. Geen aannames.
- **Directe toon:** Geen "Great!", geen nep-enthousiasme, geen lange samenvattingen achteraf. Gewoon to the point.
- **Workflow:** Plan → akkoord Bas → uitvoeren. "Doe maar" = akkoord gegeven.
- **Parallel werken:** Gebruik parallele subagents voor onderzoek en grote taken.
