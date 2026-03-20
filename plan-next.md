# PeuterPlannen — Groot Plan: Apple Maps Polish + Photo Quality + Testing

**Status:** BIJNA KLAAR — Sessie 1 + 3 klaar, Sessie 2 code klaar + scraping draait
**Datum:** 20 maart 2026
**Context:** UX revamp (10 fasen) is in ~4 uur uitgevoerd. Fase 1-3 klaar, 4-5 grotendeels. Dit plan pakt de drie grootste gaps aan: (A) de UX voelt nog niet genoeg als Apple Maps, (B) foto's zijn te laag kwalitatief, (C) testen is niet grondig genoeg.

---

## Deel A: Apple Maps UX Polish (1-2 sessies)

### Wat ontbreekt vs echte Apple Maps

| Apple Maps gedrag | Onze huidige staat | Fix |
|---|---|---|
| Sheet peek toont alleen search bar + "X results" | Peek = 190px: pill + weer + tabs + forecast | Peek compacter: alleen pill + meta, tabs naar half |
| Sheet half: clean lijst, geen afleiding | Week picks + forecast + tabs + lijst = druk | Forecast verbergen (done), tabs boven lijst plaatsen |
| Marker tap → sheet schuift smooth omhoog met preview | Werkt, preview image 72x72 kan groter/strakker | Preview card redesign: landscape foto, minder padding |
| Dragging sheet voelt native (rubber band, momentum) | Velocity-based snap, geen elastic overshoot | Bounce keyframe na snap position |
| Achtergrond dimt bij full sheet | Backdrop blur binary aan/uit tijdens drag | Graduele opacity transition |
| Zoekbalk met "Cancel" knop bij focus | Filter chips toggle, geen expand animatie | Search pill smooth expand bij tap |
| Floating action button (recenter) | 40x40, `border-radius: 10px`, basic shadow | FAB-style: cirkel, groter, pulse na pan |

### Concrete taken

**A1. Sheet peek compacter maken**
- **Waar:** `glass.css:357` — `.bottom-sheet.state-peek { transform: translateY(calc(100% - 190px)) }`
- Peek hoogte: 190px → ~140px (search pill + 1 regel meta, meer niet)
- Tabs (Ontdek/Kaart/etc.) pas tonen vanaf half state
- **Waar:** `sheet-engine.js:36-46` — search pill tap handler, advance to half
- Filter chips container visibility koppelen aan sheet state >= half

**A2. Sheet touch-feel verbeteren**
- **Waar:** `glass.css:328-332` — `transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)`
- Rubber-band bounce: `@keyframes sheetBounce` — na snap, kort -8px overshoot + terugveren (60ms)
- In `sheet-engine.js:114-117` — na `touchend` snap, voeg tijdelijk bounce class toe
- Backdrop blur: nu binary uit tijdens drag (line 104-107), gradueel dimmen ipv aan/uit
- Sheet transition: 300ms behouden (voelt al goed), bounce is de verbetering

**A3. Location preview card redesign**
- **Waar:** `glass.css:668-735` — `.sheet-preview-card` styles
- **Waar:** `sheet-engine.js:236-275` — `showLocationInSheet()` render functie
- Image: 72x72 square → 100x70 landscape (`border-radius: 10px; object-fit: cover`)
- Score badge: `.sheet-preview-score` — groter, rechts uitgelijd, duidelijker kleur
- "Route" knop: behoud terracotta styling (past bij brand, Apple Maps blue niet)
- Card padding: compacter, meer ruimte voor foto
- Afgeronde hoeken: 12px → 14px

**A4. Map interaction polish**
- **Waar:** `app.css:875` — `#recenter-btn` styles
- Recenter FAB: `border-radius: 10px` → `50%`, `40x40` → `44x44`, sterkere shadow
- Pulse animatie: `@keyframes fabPulse` — subtiele scale(1.05) pulse 1x na user pan
- **Waar:** `map.js:97-129` — marker click handler
- Geselecteerde marker: `scale(1.2)` + bounce via MapLibre `setLayoutProperty`
- Cluster tap: map `flyTo` met langere `duration: 600` (nu waarschijnlijk default)

**A5. Micro-animaties**
- Tab switch indicator: **AL GEDAAN** — `nav-indicator` heeft bounce curve `0.38s cubic-bezier(0.34, 1.56, 0.64, 1)` (`app.css:803`)
- Filter chip press: voeg `transform: scale(0.95)` toe op `:active` state (`glass.css:881-906`)
- Card tap: voeg `background: rgba(212,119,86,0.04)` toe op `:active` met 100ms transition
- Heart pop: **AL GEDAAN** — `@keyframes heartPop` (`app.css:18-19`)
- Skeleton shimmer: **AL GEDAAN** — `@keyframes shimmer` (`app.css:10-11`)

---

## Deel B: Foto Kwaliteit Upgrade (1 sessie, parallel met A)

### Huidige staat
- **1.442 / 2.138** locaties hebben foto (69%) — 237 MB op disk
- Bron: og:image scraping via `fetch-venue-photos.js` (19 maart)
- **Fallback chain** in app: `photo_url` → `owner_photo_url` → `CATEGORY_IMAGES[type]`
- **Image formaten:** thumb 400w + hero 800w, WebP + JPEG per locatie
- **Logo filter** draaide: 46 gefilterd, heuristic = squarish ratio + solid bg + low stddev
- **DB kolommen:** `photo_url`, `photo_source` ('owner'|'google'|'scraped'|'placeholder'), `photo_fetched_at`
- **Geen** `photo_quality` kolom

### Concrete taken

**B1. Google Places API gap-fill** ✅ Script bestaat
- **Script:** `.scripts/pipeline/fetch-photos.js` (line 121-123: query voor locations zonder foto met place_id)
- Draaien: `GOOGLE_MAPS_API_KEY=... node .scripts/pipeline/fetch-photos.js`
- Target: ~696 locaties zonder foto maar met `place_id`
- Output: 800px hero + 400px thumb in WebP/JPEG, `photo_source='google'`
- Rate limit: 100ms per request (10/sec), geschatte kosten ~$5-10
- Na afloop: `node .scripts/pipeline/sync-photo-urls.js` om DB te updaten

**B2. Browser-use scraping voor restant**
- Voor locaties zonder Google Places foto: Playwright browser scraping
- Per locatie: navigeer naar website URL, zoek hero image / gallerij
- **Script:** nieuw script `.scripts/pipeline/scrape-website-photos.js`
- Criteria voor acceptatie:
  - Minimaal 400px breed
  - Landscape ratio (breedte > hoogte)
  - Niet overwegend wit/zwart (logo indicator, hergebruik heuristic uit `filter-logo-photos.js:24-56`)
  - Kleurvariatie (stddev > 30)
- Na download: resize via Sharp.js naar zelfde formaat als B1

**B3. AI-powered kwaliteitsfilter**
- Alle foto's (bestaand + nieuw) door Gemini Flash Vision
- Prompt: "Is dit een sfeervolle foto van een locatie (speeltuin, boerderij, museum, etc) die ouders aanspreekt? Of is het een logo, stockfoto, of lage-kwaliteit afbeelding? Score 1-5 (1=logo/slecht, 5=uitstekend). Antwoord: {score} {reden}."
- BAD (score 1-2): foto verwijderen, fallback naar categorie-illustratie
- GOOD (score 4-5): markeren als kandidaat voor week picks
- **Script:** nieuw `.scripts/pipeline/quality-check-photos.js`
- Batch: ~50 foto's per API call (Gemini Flash is goedkoop), base64 inline

**B4. Foto metadata verrijken**
- **Migration:** `photo_quality INTEGER` kolom toevoegen (1-5)
- **Waar updaten:**
  - `modules/discovery.js:36` — `+ 5 (has real photo)` → gewogen op `photo_quality`
  - `modules/discovery.js:19` — `getThisWeekPicks` filter: alleen `photo_quality >= 3`
  - `modules/cards.js:114-121` — optioneel: quality badge op cards met score 5

---

## Deel C: Visual QA Systeem

### Status

**C1. QA slash command** ✅ DONE
- `.claude/commands/visual-qa.md` bestaat al met Quinn-persona
- Dekt: sheet states, bottom nav, map interactie, list toggle, desktop layout
- Integreert Gemini Flash voor visuele verificatie

**C2. Gemini Flash verificatie**
- Al ingebouwd in visual-qa.md command
- Verbetering: gestructureerd qa-report.md output format
- Screenshots opslaan in `/tmp/qa-screenshots/` met beschrijvende namen

**C3. CI integratie** (optioneel, later)
- GitHub Action: headless Playwright QA run na elke push
- Report als PR comment
- **Niet prioriteit** — handmatige `/visual-qa` is genoeg voor nu

---

## Deel D: Resterende UX Revamp Fasen

### D1. Fase 6: Personalisatie (localStorage, geen account)
**Bestaande code:**
- `modules/prefs.js` (24 lines) — `getPrefs()`, `setPrefs()`, `clearPrefs()`, `hasCompletedOnboarding()`
- localStorage structuur: `pp_prefs = { childAges, transport, city, onboardingComplete, lastUsed }`
- "Wis alles" knop in info panel (`app.html:665`)

**Wat ontbreekt:**
- Inline onboarding trigger na 2e locatie bekeken
- **Waar:** `modules/sheet.js` of `map.js` marker click — teller bijhouden, na 2e keer onboarding tonen
- Leeftijdsvoorkeur → automatisch filter chips pre-selecteren
- Relevantie-sortering: `scoring.js` aanpassen — leeftijd-match + afstand meewegen

### D2. Fase 7: Discovery & Retentie
**Bestaande code:**
- `modules/discovery.js` (127 lines) — `getThisWeekPicks()`, `fetch5DayForecast()`, `renderWeekPicks()`, `renderForecastStrip()`
- HTML containers bestaan: `#sheet-week-picks` (line 736), `#sheet-forecast` (line 729)
- Week picks: max 5, type-divers, seizoensgewogen
- Forecast: **2-dag**, niet 5-dag (plan zegt 5) — `discovery.js:64` `forecast_days=2`

**Wat ontbreekt:**
- Week picks renderen in app lifecycle (code bestaat maar is niet aangesloten)
- **Waar:** `app.js:30-39` — `_pp_modules.renderDiscovery()` wordt al aangeroepen, checken of het daadwerkelijk rendert
- Forecast naar 5-dag uitbreiden (`discovery.js:64`)
- Newsletter deep-link vanuit app

### D3. Fase 5 afronden
**Bestaande code:**
- `modules/scoring.js:4-13` — `computePeuterScore()` (max 11 punten)
- `modules/cards.js:90-93` — Peuterscore badge op cards (score + ster + kleurcode)

**Wat ontbreekt:**
- Score breakdown op cards: toon waarom de score hoog/laag is (dreumes-friendly, verschonen, etc.)
- **Waar:** `scoring.js` heeft al `getPrimaryFitReason()`, `getComfortReason()` — deze aansluiten op card render
- Score live laten veranderen bij weer-toggle: `computePeuterScore` herberekenen na weather filter change

---

## Volgorde & Planning

| Stap | Wat | Status | Bestanden |
|---|---|---|---|
| ~~C1~~ | ~~QA slash command~~ | ✅ DONE | `.claude/commands/visual-qa.md` |
| ~~Sessie 1~~ | ~~A1-A5: Apple Maps polish~~ | ✅ DONE | `glass.css`, `sheet-engine.js`, `app.css`, `map.js` |
| ~~Sessie 1~~ | ~~C2: QA run na polish~~ | ✅ DONE | Gemini Flash verified |
| ~~Sessie 2~~ | ~~B1: Browser scraping (was Google Places)~~ | ✅ DONE | `.scripts/pipeline/scrape-website-photos.js` |
| ~~Sessie 2~~ | ~~B3: Gemini kwaliteitsfilter~~ | ✅ DONE | `.scripts/pipeline/quality-check-photos.js` |
| ~~Sessie 2~~ | ~~B4: photo_quality kolom + scoring~~ | ✅ DONE | migration + `discovery.js` + `state.js` |
| ~~Sessie 3~~ | ~~D1: Personalisatie onboarding~~ | ✅ DONE | `prefs.js`, `sheet.js`, `app.js`, `app.css` |
| ~~Sessie 3~~ | ~~D2: Discovery aansluiten~~ | ✅ DONE | `discovery.js`, `app.js`, `glass.css` |
| ~~Sessie 3~~ | ~~D3: Score breakdown~~ | ✅ DONE | `scoring.js`, `cards.js`, `glass.css` |

B2 (browser scraping) is optioneel — eerst B1 draaien en kijken hoeveel gap er overblijft.

---

## Parallellisatie per sessie

### Sessie 1 (Apple Maps polish)
```
Agent 1: A1 (sheet peek) + A2 (touch feel)     → glass.css + sheet-engine.js
Agent 2: A3 (preview card)                       → glass.css:668-735 + sheet-engine.js:236-275
Agent 3: A4 (map FAB + markers)                  → app.css:875 + map.js
Agent 4: A5 (micro-animaties filter chips/cards) → glass.css:881-906 + app.css
Na alle agents: /visual-qa run (C2)
```

### Sessie 2 (foto's)
```
Agent 1: B1 Google Places fetch               → .scripts/pipeline/fetch-photos.js
Agent 2: B3 Gemini quality script schrijven    → nieuw script
Na B1 klaar: B3 draaien op alle foto's
Na B3 klaar: B4 migration + scoring update
```

### Sessie 3 (features)
```
Agent 1: D1 onboarding trigger                → prefs.js + sheet.js
Agent 2: D2 discovery wiring + forecast 5-dag → discovery.js + app.js
Agent 3: D3 score breakdown op cards          → scoring.js + cards.js
```
