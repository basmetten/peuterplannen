# PeuterPlannen — Parallel Agent Plan

**Doel:** Maximale waarde uit beschikbare tokens halen via parallelle agents.
**Drie pijlers:** (1) Test Coverage, (2) SEO Blog Content, (3) Code Quality.
**Geschatte agents:** 18-22 parallel, elk zelfstandig uitvoerbaar.

---

## Pijler 1: Test Coverage (8 agents)

Het project heeft 20 modules (4.700 regels JS) maar **nul unit tests voor client-side code**. Alleen build-helpers zijn getest. Dit is de grootste kwaliteitswinst.

**Framework:** `node:test` (al in gebruik). Tests komen in `.scripts/__tests__/modules/`.
**Belangrijk:** Modules zijn ES modules met DOM-dependencies. Tests moeten pure logica testen — DOM-afhankelijke functies mocken of skippen.

### Agent T1: Tests voor `plan-engine.js`
**Prioriteit:** Hoogst — puur algoritmisch, geen DOM
**Bestand:** `modules/plan-engine.js` (291 regels)
**Te testen exports:**
- `selectLocations()` — MCDM scoring met 8 dimensies
- `PLAN_TEMPLATES` — structuur validatie
- `getNapBlock()` — dutjestijd-logica
- `swapPlanSlot()` — slot verwisseling

**Schrijf:** `.scripts/__tests__/modules/plan-engine.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/plan-engine.test.js`

### Agent T2: Tests voor `scoring.js`
**Prioriteit:** Hoogst — puur algoritmisch
**Bestand:** `modules/scoring.js` (344 regels)
**Te testen exports:**
- `computePeuterScore()` — hoofd-scoring
- `computePeuterScoreV2()` — nieuwe scoring met gewichten
- `matchesPreset()` / `matchesPresetDistance()` — preset matching
- `getPrimaryFitReason()` / `getLogisticsReason()` — reden-generatie
- `getTrustBullets()` / `getPracticalBullets()` — bullet points

**Schrijf:** `.scripts/__tests__/modules/scoring.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/scoring.test.js`

### Agent T3: Tests voor `utils.js`
**Prioriteit:** Hoog — utility functies, geen DOM nodig
**Bestand:** `modules/utils.js` (135 regels)
**Te testen exports:**
- `calculateDistance()` — Haversine afstandsberekening
- `calculateTravelTimes()` — reistijd auto/fiets/lopen
- `cleanToddlerHighlight()` — tekst cleaning
- `comparableText()` / `isNearDuplicateCopy()` — tekst similarity
- `slugify()` — slug generatie
- `safeUrl()` — URL sanitization
- `escapeHtml()` — HTML escaping
- `buildDetailUrl()` / `buildMapsUrl()` — URL builders

**Schrijf:** `.scripts/__tests__/modules/utils.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/utils.test.js`

### Agent T4: Tests voor `tags.js`
**Prioriteit:** Hoog — puur algoritmisch
**Bestand:** `modules/tags.js` (94 regels)
**Te testen exports:**
- `getTopTags()` — tag selectie en prioritering
- `getWeatherBadge()` — weer-afhankelijke badge
- `getSterkePunten()` — sterke punten extractie

**Schrijf:** `.scripts/__tests__/modules/tags.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/tags.test.js`

### Agent T5: Tests voor `discovery.js`
**Prioriteit:** Hoog — seizoenslogica, weer-scoring
**Bestand:** `modules/discovery.js` (140 regels)
**Te testen:**
- `getThisWeekPicks()` — seizoens-type selectie + scoring
- Seizoenstabel (SEASONAL_TYPES) — correcte maand-mapping
- Score-weging met foto-kwaliteit

**Schrijf:** `.scripts/__tests__/modules/discovery.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/discovery.test.js`

### Agent T6: Tests voor `favorites.js` + `visited.js` + `prefs.js`
**Prioriteit:** Medium — localStorage logica
**Bestanden:** `modules/favorites.js` (138r), `modules/visited.js` (21r), `modules/prefs.js` (23r)
**Te testen:**
- `getFavorites()` / `isFavorite()` / `toggleFavorite()` — favorieten CRUD
- `getShortlistIds()` — shortlist parsing
- `markVisited()` / `getVisited()` / `isVisited()` — bezocht-tracking
- `getPrefs()` / `setPrefs()` / `clearPrefs()` — preferences CRUD
- **Mock:** localStorage via simpele Map-mock

**Schrijf:** `.scripts/__tests__/modules/storage.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/storage.test.js`

### Agent T7: Tests voor `filters.js` (pure logica)
**Prioriteit:** Medium — filter state logica
**Bestand:** `modules/filters.js` (335 regels)
**Te testen (alleen pure functies):**
- `getAdvancedFilterCount()` — tel actieve filters
- `applyFilters()` — filter locations array op basis van state
- Filter matching logica (type, weer, leeftijd, afstand)

**Schrijf:** `.scripts/__tests__/modules/filters.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/filters.test.js`

### Agent T8: Tests voor `data.js` (normalisatie + cache)
**Prioriteit:** Medium — data transformatie
**Bestand:** `modules/data.js` (439 regels)
**Te testen:**
- `normalizeLocationRow()` — CSV/JSON normalisatie
- `fetchJsonWithRetry()` — retry logica (mock fetch)
- Cache slicing logica (max 250 items)

**Schrijf:** `.scripts/__tests__/modules/data.test.js`
**Run na schrijven:** `node --test .scripts/__tests__/modules/data.test.js`

---

## Pijler 2: SEO Blog Content (8 agents)

49 blogposts bestaan, maar 25+ Nederlandse steden met 50k+ inwoners missen. Elk artikel = ~2.000-2.500 woorden, markdown in `content/posts/`.

**Format:** Bekijk bestaande posts (bijv. `content/posts/utrecht-met-peuters.md`) voor exact frontmatter-format en secties.
**Structuur per stadsgids:** ochtendactiviteiten → lunch → middagopties → regenalternatief → vervoer → FAQ → samenvatting.
**Stijl:** Praktisch, direct, vanuit ouder-perspectief. Geen AI-slop (geen "ontdek de magie van..."). Concrete tips, geen vage beschrijvingen.

### Agent C1: Stadsgids — Leeuwarden
**Schrijf:** `content/posts/leeuwarden-met-peuters.md`
**Focus:** Natuurmuseum Fryslân, Prinsentuin, AquaZoo, Grote Kerk speelplein, pannenkoeken bij De Koperen Tuin
**Zoek online** naar actuele peuteractiviteiten in Leeuwarden voor inhoud

### Agent C2: Stadsgids — Delft
**Schrijf:** `content/posts/delft-met-peuters.md`
**Focus:** Botanische Tuin TU Delft, Kinderboerderij De Tanthof, Vermeer Centrum (kindroute), Delfse Hout speeltuin
**Zoek online** naar actuele peuteractiviteiten in Delft voor inhoud

### Agent C3: Stadsgids — Deventer
**Schrijf:** `content/posts/deventer-met-peuters.md`
**Focus:** Speeltuinvereniging, Worpplantsoen, De Brink, Deventer Speelgoedmuseum, Sallandse Heuvelrug
**Zoek online** naar actuele peuteractiviteiten in Deventer voor inhoud

### Agent C4: Stadsgids — Alkmaar
**Schrijf:** `content/posts/alkmaar-met-peuters.md`
**Focus:** Kaasmuseum (kindroute), Stedelijk Museum, Victoriepark, Bergen aan Zee strand, Kinderboerderij De Rekerhout
**Zoek online** naar actuele peuteractiviteiten in Alkmaar voor inhoud

### Agent C5: Stadsgids — Hilversum
**Schrijf:** `content/posts/hilversum-met-peuters.md`
**Focus:** Beeld en Geluid (kindvleugel), Corversbos, Goois Natuurreservaat, Pinetum Blijdenstein
**Zoek online** naar actuele peuteractiviteiten in Hilversum voor inhoud

### Agent C6: Stadsgids — Venlo
**Schrijf:** `content/posts/venlo-met-peuters.md`
**Focus:** Toverland (vlakbij), Limburgs Museum, Jochumhof, Tegelse Bos, Maasduinen
**Zoek online** naar actuele peuteractiviteiten in Venlo voor inhoud

### Agent C7: Seizoensartikel — Kerstvakantie met peuters
**Schrijf:** `content/posts/kerstvakantie-met-peuters.md`
**Focus:** Indoor activiteiten december-januari, kerstmarkten met kinderen, ijsbanen, winterse speeltuinen, warm aankleden tips
**Zoek online** naar kerstvakantie activiteiten met peuters Nederland

### Agent C8: Seizoensartikel — Sinterklaas met peuters
**Schrijf:** `content/posts/sinterklaas-met-peuters.md`
**Focus:** Intochten, Sinterklaasactiviteiten indoor, omgaan met angst voor Piet, leeftijdsgeschikte verwachtingen, cadeau-tips
**Zoek online** naar sinterklaas activiteiten met peuters

---

## Pijler 3: Code Quality (4-6 agents)

Geen grote refactors — focus op concrete, veilige verbeteringen die de codebase robuuster maken.

### Agent Q1: Magic numbers → constanten
**Scope:** Alle modules
**Taak:**
1. Lees alle modules en identificeer magic numbers (sheet-engine peek=160, flick=0.4, spring K=300, data timeout=10000, retry=3, etc.)
2. Voeg benoemde constanten toe bovenaan het betreffende module of in `state.js`
3. Vervang de magic numbers door de constanten
4. **Run na wijziging:** `npm test` om te checken dat niets breekt

**Belangrijk:** Verander GEEN gedrag, alleen naamgeving. Geen functionele wijzigingen.

### Agent Q2: Dubbele code consolideren
**Scope:** Cross-module duplicatie
**Concrete duplicaties:**
- `RAIN_CODES` — bestaat in zowel `plan.js` (line 138) als `discovery.js` (line 85). Verplaats naar `state.js`
- Slug-generatie — herhaald in `map.js` (147-149) en `app.js` (211-213). Gebruik `slugify()` uit `utils.js`
- Filter count logica — duplicaat in `filters.js` `updateMapPillBadge()` vs `getAdvancedFilterCount()`
- **Run na wijziging:** `npm test` en `npm run bundle`

### Agent Q3: Stille errors fixen
**Scope:** Alle `catch(e) {}` blokken
**Taak:**
1. Zoek alle lege catch-blokken: `catch(e) {}`, `catch(e) { }`, `catch(_) {}`
2. Voeg minimaal `console.warn()` toe met context (welke operatie faalde)
3. Specifiek: `sheet.js:76`, `cards.js:61`, `app.js:136`, `app.js:252`, `data.js:196`
4. **Run na wijziging:** `npm test`

**Belangrijk:** Geen error handling toevoegen waar het niet nodig is. Alleen bestaande stille catches verbeteren.

### Agent Q4: Dead code opruimen
**Scope:** Ongebruikte exports en modules
**Concrete items:**
1. `store.js` — check of dit ergens geïmporteerd wordt. Zo niet: verwijder het bestand
2. `ADSENSE_SLOT_ID` in `state.js` — lege string, check of het ergens gebruikt wordt
3. `computePeuterScoreV2` in `scoring.js` — check of het daadwerkelijk aangeroepen wordt of dode code is
4. Ongebruikte import `CATEGORY_IMAGES` in `plan.js` line 4
5. **Run na wijziging:** `npm test` en `npm run bundle`

**Belangrijk:** Verwijder ALLEEN code waarvan je 100% zeker bent dat het ongebruikt is. Bij twijfel: laat staan.

### Agent Q5: JSDoc toevoegen aan publieke exports
**Scope:** Modules zonder documentatie
**Prioriteit:** `state.js`, `filters.js`, `data.js`, `sheet.js`, `map.js`, `favorites.js`
**Taak:**
1. Lees elke module
2. Voeg `@param` en `@returns` JSDoc toe aan alle geëxporteerde functies
3. Beschrijf het doel van de functie in 1 zin
4. **Geen** functionele wijzigingen

### Agent Q6: Accessibility quick wins
**Scope:** `cards.js`, `filters.js`, `sheet.js`
**Concrete fixes:**
1. `cards.js` — ARIA feed pattern: voeg `role="article"`, `aria-posinset`, `aria-setsize` toe aan card items
2. `filters.js` — voeg `aria-live="polite"` toe aan filter count badge zodat screenreaders wijzigingen aankondigen
3. `sheet.js` — voeg `aria-label` toe aan `<details>` elementen in locatie-detail
4. **Run na wijziging:** `npm run test:a11y`

---

## Uitvoeringsadvies

### Volgorde
1. **Start alle agents tegelijk** — ze zijn volledig onafhankelijk
2. Test-agents (T1-T8) schrijven nieuwe bestanden en raken bestaande code niet aan
3. Content-agents (C1-C8) schrijven nieuwe bestanden in `content/posts/`
4. Quality-agents (Q1-Q6) wijzigen bestaande code — run tests na elke wijziging

### Merge-volgorde
1. Test-agents eerst mergen (geen conflicten mogelijk)
2. Content-agents (geen conflicten)
3. Quality-agents één voor één (potentiële merge-conflicten in `state.js`)

### Verificatie na alle agents
```bash
npm test                           # unit tests
npm run bundle                     # check bundle bouwt
npm run test:e2e                   # e2e tests (als playwright beschikbaar)
npm run audit:tokens               # design token compliance
```

### Geschatte token-gebruik
- Test-agents: ~15k tokens per agent × 8 = ~120k
- Content-agents: ~20k tokens per agent × 8 = ~160k
- Quality-agents: ~10k tokens per agent × 6 = ~60k
- **Totaal: ~340k tokens** — goed te doen in een paar uur
