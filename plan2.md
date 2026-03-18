# PeuterPlannen — Mobile UX Fix & Polish Plan

> **Doel:** Alle visuele bugs, data-inconsistenties en UX-problemen oplossen die zichtbaar zijn op de live mobiele site (iPhone screenshots, 18 maart 2026), gevolgd door design-system polish.
> **Methode:** Gefaseerd, resumable plan — ontworpen voor Claude Code met context-window resets.
> **Repo:** `/Users/basmetten/peuterplannen` → `github.com/basmetten/peuterplannen`
> **Datum:** 2026-03-18
> **Eigenaar:** Bas Metten
> **Vorig plan:** Dit vervangt het eerdere plan2.md (UI/UX Design System Upgrade, 2026-03-17)

---

## HOE DIT PLAN TE GEBRUIKEN

### Voor Claude Code (na elke `/clear`)

```
Lees /Users/basmetten/peuterplannen/plan2.md en ga verder waar je gebleven was.
Zoek de eerstvolgende [ ] taak onder de huidige fase en voer die uit.
Update het checkbox naar [x] als je klaar bent. Commit niet tenzij ik dat vraag.
```

### Regels

1. **Lees dit bestand EERST.** Oriënteer op de huidige fase en het `>> RESUME HERE` marker.
2. **Werk één fase tegelijk af.** Ga pas naar de volgende fase als alle checkboxen [x] zijn.
3. **Update checkboxen in dit bestand** na elke voltooide taak (`[ ]` → `[x]`).
4. **Verplaats het `>> RESUME HERE` marker** naar de volgende onvoltooide taak.
5. **Verifieer elke fix** met het verificatiecommando in de taak (indien aanwezig).
6. **Breek niets.** Run `npm run build:local` na elke fase om te checken dat de build slaagt.
7. **Lees altijd het doelbestand** voordat je het wijzigt. Geen blinde edits.
8. **Raadpleeg de architectuur** als je twijfelt:
   - `ARCHITECTURE.md` — tech stack, build systeem, database schema
   - `BRAND.md` — kleuren, fonts, tone of voice
   - `OPERATIONS.md` — deploy flow, hoe regio's/locaties werken
   - `design-system.css` — alle CSS tokens (`--pp-*` namespace)
   - `.scripts/sync_all.js` — build orchestrator
   - `.scripts/lib/config.js` — TYPE_MAP, REGIONS, SEO constanten

### Architectuur-beperkingen (niet breken!)

- **Marker-based templates:** `<!-- BEGIN:X -->...<!-- END:X -->` wordt door generators overschreven. Wijzigingen binnen markers moeten in de generator, niet in het HTML-bestand.
- **CSS single source of truth:** `design-system.css` voor tokens, `app.css` voor app-specifieke layout, `nav-floating.css` voor navigatie. Geen inline styles toevoegen.
- **Build pipeline:** `npm run build` → `sync_all.js` → genereert ~2200 pagina's. Na CSS/HTML wijzigingen altijd `npm run build:local` testen.
- **Incremental builds:** Wijzigingen aan `app.html`, `index.html`, `about.html` worden door `sync_all.js` gekopieerd met asset-version updates. Wijzig het bronbestand, niet de output.
- **Audit gates:** CI draait `audit:strict` na build. Wijzigingen moeten deze audits passeren.
- **`app.html` is ~3300 regels.** Gebruik grep/zoek om de juiste sectie te vinden. Lees context rondom de target-regel.
- **`app.css` is ~76KB.** Idem — zoek op selector, niet blind lezen.
- **Info-stats en homepage-stats zitten in `<!-- BEGIN:INFO_STATS -->` markers** — deze worden door `app-page.js` en `index-page.js` gegenereerd. Hardcoded waarden in die generators wijzigen, niet in de HTML.

---

## FASEVOLGORDE

| Fase | Naam | Prioriteit | Status |
|------|------|-----------|--------|
| 0 | Pre-flight checks | — | DONE |
| 1 | Kritieke bugs (P0) | Blocker | IN PROGRESS |
| 2 | Vertrouwen & data-integriteit (P1) | Hoog | DONE |
| 3 | Visuele bugs (P1) | Hoog | DONE |
| 4 | Layout & overflow bugs (P2) | Middel | DONE |
| 5 | Favorieten-experience (P2) | Middel | DONE |
| 6 | Error-handling UX (P2) | Middel | DONE |
| 7 | Homepage CTA-vereenvoudiging (P3) | Laag | DONE |
| 8 | Design-system polish | Laag | DONE |
| 9 | Post-flight validatie | — | IN PROGRESS |

---

## FASE 0: PRE-FLIGHT CHECKS

> Doel: Bevestig dat de ontwikkelomgeving werkt en de huidige build slaagt.

- [x] **0.1** Build slaagt ✓
- [x] **0.2** Tests slagen (57/57, snapshot ge-updated) ✓
- [x] **0.3** Working tree heeft wijzigingen van build — normaal na `npm run build:local`.
- [x] **0.4** 1810 HTML-bestanden geteld.

**Verificatie:** Build slaagt, tests groen, working tree is clean of gestashed.

---

## FASE 1: KRITIEKE BUGS (P0)

> Doel: De twee bugs fixen die de core-functionaliteit breken.

### 1.1 Supabase data-laden: retry-logica en timeout

**Probleem:** "Live data laden lukte niet. Je ziet een recente beperkte versie." verschijnt op de Ontdek-tab. Er is geen timeout op de fetch en geen automatische retry.

**Bestanden:**
- `app.html` — zoek op `fetchLocationsLive` (~regel 1615-1639) en `fetchAllPages` (~regel 1321-1384)

**Taken:**
- [x] **1.1.1** AbortController timeout van 10s toegevoegd in `loadLocations()`.
- [x] **1.1.2** Retry-logica toegevoegd: als fetch faalt, wacht 2s en probeer 1x opnieuw voordat cache-fallback wordt getoond.
- [x] **1.1.3** Error-message toont nu cache-timestamp ("Gegevens van [datum]") via `cached.savedAt`.

**Verificatie:** Open `app.html` in een browser, schakel netwerk uit in DevTools → bevestig dat error na ~12s verschijnt (10s timeout + 2s retry) met timestamp.

### 1.2 Favorieten-tab: dedicated empty state

**Probleem:** De Favorieten-tab toont dezelfde content als Ontdek wanneer er geen favorieten zijn opgeslagen. Gebruikers denken dat de feature kapot is.

**Bestanden:**
- `app.html` — zoek op `activeTag === 'favorites'` in de `loadLocations` functie (~regel 1666-1669) en de `renderCards` functie

**Taken:**
- [x] **1.2.1** Dedicated empty state met hartje-SVG toegevoegd voor favorieten in `loadLocations()`.
- [x] **1.2.2** CSS `.favorites-empty` toegevoegd in `app.css`.
- [ ] **1.2.3** Test: open app.html → klik Favorieten-tab → bevestig dat de empty state verschijnt. *(handmatig testen)*

**Verificatie:** Favorieten-tab toont hartje + "Nog geen favorieten" tekst bij 0 favorieten, en werkende kaarten bij 1+ favorieten.

---

## FASE 2: VERTROUWEN & DATA-INTEGRITEIT (P1)

> Doel: Alle hardcoded getallen synchroniseren zodat de site intern consistent is.

### 2.1 Info-panel: "18 regio's" → "22 regio's"

**Probleem:** `app.html` info-panel tekst (regel ~530) zegt "18 regio's" maar de stat-counter (regel ~540) toont "22". De homepage toont ook "22".

**Bestanden:**
- `app.html` — zoek op `18 regio` (verwacht ~regel 530)
- Controleer ook `.scripts/lib/generators/app-page.js` — als de info-panel tekst door een generator wordt geschreven (check op `BEGIN:INFO` markers)

**Taken:**
- [x] **2.1.1** "18 regio's" → dynamisch via generator (`${regions.length} regio's`). Regex-replacement toegevoegd in `app-page.js`.
- [x] **2.1.2** Geen andere "18"-regio voorkomens gevonden.

**Verificatie:** `grep -n "18 regio" app.html` retourneert 0 resultaten.

### 2.2 Info-panel: "5 Categorieën" → "8 Categorieën"

**Probleem:** De stat-counter toont "5" categorieën maar er zijn er 8 (speeltuinen, kinderboerderijen, natuur, musea, zwemmen, pannenkoeken, horeca, cultuur).

**Bestanden:**
- `app.html` — zoek op `Categorieën` in de `<!-- BEGIN:INFO_STATS -->` sectie (~regel 543-544)
- Controleer `.scripts/lib/generators/app-page.js`

**Taken:**
- [x] **2.2.1** "5" → `${Object.keys(TYPE_MAP).length}` in `app-page.js` generator. Nu dynamisch (toont 8).

**Verificatie:** `grep -n "Categorieën" app.html` toont "8" in de stat.

### 2.3 Info-panel tekst: "Alle 2138 locaties"

**Probleem:** Het exacte getal "2138" is hardcoded op meerdere plekken. Als locaties worden toegevoegd, raakt dit verouderd.

**Bestanden:**
- `app.html` — zoek op `2138` (verwacht meerdere hits: meta tags, JSON-LD, info-panel, noscript)
- `.scripts/lib/generators/app-page.js` — de generator die app.html bijwerkt
- `.scripts/lib/generators/index-page.js` — de homepage generator

**Taken:**
- [x] **2.3.1** "2138" kwam niet voor in `app.html` (al dynamisch). In `index.html` stond het in hero badge.
- [x] **2.3.2** Generators gebruikten al `${total}` dynamisch. Bug gefixed: `index-page.js` regex matchte `--ink-muted` i.p.v. `--pp-text-muted`.
- [x] **2.3.3** Hero badge in `index.html` nu dynamisch via gefixte regex.

**Verificatie:** `npm run build:local` slaagt. Getallen in de output-HTML matchen het aantal locaties in de dataset.

### 2.4 Cross-check: homepage vs. app vs. Over-pagina

**Taken:**
- [x] **2.4.1** Cross-check gedaan. Alle drie pagina's tonen nu consistente dynamische stats. About-page "7" → "8" gefixed (zelfde `TYPE_MAP.length` aanpak in `about-page.js`).

**Verificatie:** Alle drie pagina's tonen identieke stats na `npm run build:local`.

---

## FASE 3: VISUELE BUGS (P1)

> Doel: De visuele glitches fixen die de eerste indruk ondermijnen.

### 3.1 Hero-afbeelding: zwart blok verwijderen

**Probleem:** Er is een zwart rechthoekig artefact zichtbaar links in de hero-illustratie op de homepage. Mogelijke oorzaken: (a) de bronafbeelding bevat het artefact, (b) CSS gradient overlay `rgba(45,41,38,0.18)` in `.hero-image-wrapper::after` is te donker in de hoek, (c) de combinatie van `.hero-image-mask` radial-gradient + de overlay creëert een donkere zone.

**Bestanden:**
- `index.html` — zoek op `hero-image-wrapper` en de `::after` pseudo-element styles (~regel 230-234)
- `/images/homepage_hero_ai.jpeg` en de responsive varianten in `/images/` (400w, 800w, 1200w WebP)

**Taken:**
- [x] **3.1.1** Bronafbeelding geïnspecteerd — geen zwart artefact in het beeld zelf.
- [x] **3.1.2** N.v.t. — artefact zit niet in het bronbeeld.
- [x] **3.1.3** CSS gradient aangepast: `rgba(45,41,38,0.18)` → `rgba(45,41,38,0.06)` en warm overlay `0.2` → `0.15`.
- [ ] **3.1.4** Check of de `.hero-image-mask` radial gradient niet te agressief is op kleine schermen. *(handmatig testen)*

**Verificatie:** Open `index.html` in browser met mobile viewport (375×812) → geen zwart blok zichtbaar.

### 3.2 Menu-overlay: volledig opaque maken + backdrop scrim

**Probleem:** Wanneer het hamburger-menu open is, is de onderliggende pagina-content zichtbaar door het menu heen. Het menu is 96% opaque en er is geen achtergrond-overlay.

**Bestanden:**
- `nav-floating.css` — zoek op `--pp-nav-mobile-bg` (~regel 14) en `.nav-mobile` (~regel 178-203)
- `nav-floating.js` — menu toggle logica (~regel 19-55)

**Taken:**
- [x] **3.2.1** `--pp-nav-mobile-bg` gewijzigd naar `rgba(var(--pp-bg-rgb), 1.0)`.
- [x] **3.2.2** Backdrop scrim toegevoegd via CSS `::before` pseudo-element op `.nav-mobile.open`.
- [ ] **3.2.3** Test: open het menu op mobile → achtergrond is gedimd, geen content zichtbaar door het menu heen. *(handmatig testen)*

**Verificatie:** Menu is volledig opaque. Achtergrond is subtiel gedimd. Sluiten (X, escape, click buiten menu) werkt nog.

### 3.3 Cultuur-categorie: ontbrekend icoon toevoegen

**Probleem:** In de "Uitjes per type" grid op de Ontdekken-pagina mist de Cultuur-kaart zijn emoji/icoon. Alle andere 7 categorieën hebben er wel een.

**Bestanden:**
- `/images/categories/` — bevat PNG+WebP voor alle categorieën behalve `cultuur`
- `index.html` — zoek op `cultuur` in de categories grid
- `.scripts/lib/generators/index-page.js` of `.scripts/lib/generators/type-pages.js` — de generator die de category grid bouwt

**Taken:**
- [x] **3.3.1** Geïnventariseerd: 7 categorieën hebben .png + .webp, cultuur mist.
- [x] **3.3.2** Cultuur-icoon gegenereerd via Gemini 2.5 Flash Image API (poppentheater met gordijnen, 1024x1024 PNG).
- [x] **3.3.3** WebP variant gegenereerd via `optimize_images.js`.
- [x] **3.3.4** Generator aangepast met `fs.existsSync` check zodat ontbrekende afbeelding geen broken image oplevert.

**Verificatie:** Alle 8 categoriekaarten hebben een icoon. `ls /images/categories/cultuur*` toont bestanden.

---

## FASE 4: LAYOUT & OVERFLOW BUGS (P2)

> Doel: Elementen die overlappen, afgeknipt worden of achter de navigatie verdwijnen fixen.

### 4.1 Bottom tab bar: content overlapt met "Toon of verberg"

**Probleem:** De tekst "Toon of verberg de uitgebreide filters" is zichtbaar achter de bottom tab bar. Content scrollt niet ver genoeg om boven de vaste navigatie te eindigen.

**Bestanden:**
- `app.css` — zoek op `.app-container` padding (~regel 24-52) en `.bottom-nav` (~regel 538-549)
- `app.html` — zoek op `newsletter-signup` (~regel 458-468) en `app-seo-content`

**Taken:**
- [x] **4.1.1** Padding was `calc(80px + var(--pp-safe-bottom))` — te krap.
- [x] **4.1.2** Newsletter en SEO-content zitten buiten `.app-container`. Eigen margin-bottom toegevoegd.
- [x] **4.1.3** Padding-bottom verhoogd naar `calc(100px + var(--pp-safe-bottom))`.
- [ ] **4.1.4** Test op mobile viewport *(handmatig testen)*.

**Verificatie:** Geen tekst of interactieve elementen overlappen met de bottom nav bij scrollen.

### 4.2 Newsletter-signup: overlap op Kaart-pagina

**Probleem:** Op de Kaart-tab overlapt het email-veld met de navigatie.

**Bestanden:**
- `app.html` — zoek op `newsletter-signup` (~regel 458)
- `app.css` — zoek op `.newsletter-signup` of de inline styles

**Taken:**
- [x] **4.2.1** Newsletter en SEO-content verborgen in map-view via `body.map-view-active` class + CSS `display: none`.
- [x] **4.2.2** Newsletter `margin-bottom: calc(100px + env(safe-area-inset-bottom, 20px))` toegevoegd.

**Verificatie:** Newsletter niet zichtbaar in kaart-view. Wel zichtbaar in Ontdek-view met voldoende afstand tot bottom nav.

### 4.3 Filter-chip tekst: "Buiten + k..." afgekapt

**Probleem:** De preset-chip "Buiten + koffie" wordt afgeknipt in de horizontale scroll-strip.

**Bestanden:**
- `app.css` — zoek op `.preset-chip` (~regel 350-373) en `.preset-strip`
- `app.html` — de preset chips (~regel 236-260)

**Taken:**
- [x] **4.3.1** `white-space: nowrap` toegevoegd aan `.preset-chip strong`.
- [x] **4.3.2** Scroll-hint gradient `::after` toegevoegd aan `.preset-strip`.
- [ ] **4.3.3** Test op mobile viewport *(handmatig testen)*.

**Verificatie:** Geen enkele preset-chip tekst is afgeknipt. Scroll-hint is subtiel zichtbaar.

---

## FASE 5: FAVORIETEN-EXPERIENCE (P2)

> Doel: De Favorieten-tab een volwaardige, betrouwbare feature maken.

### 5.1 Visuele feedback bij favoriet toggle

**Bestanden:**
- `app.html` — zoek op `toggleFavorite` functie (~regel 889-908)
- `app.css` — zoek op `heart-pop` animatie

**Taken:**
- [x] **5.1.1** `heart-pop` animatie is correct: keyframes in `app.css:18`, class toggle in `toggleFavorite`. Werkt op mobile.
- [x] **5.1.2** Toast-notificatie "Opgeslagen in favorieten" toegevoegd via inline `ppToast()` functie (hergebruikt CSS uit `design-system.css`).
- [x] **5.1.3** Toast "Verwijderd uit favorieten" toegevoegd in dezelfde `toggleFavorite` aanroep.

**Verificatie:** Hartje-animatie speelt af bij klik. Toast verschijnt en verdwijnt na 2s.

### 5.2 Favorieten-counter op tab-icoon

**Taken:**
- [x] **5.2.1** Badge-counter toegevoegd: `.fav-badge` span in bottom nav met primary-kleur achtergrond. Verborgen bij 0.
- [x] **5.2.2** `updateFavBadge()` wordt aangeroepen in `toggleFavorite` en bij beide init-paden (normal + fallback).

**Verificatie:** Badge toont correct aantal. Verdwijnt bij 0.

---

## FASE 6: ERROR-HANDLING UX (P2)

> Doel: De error-ervaring transformeren van "kapot" naar "graceful degradation".

### 6.1 Verbeterde error-state design

**Bestanden:**
- `app.html` — zoek op `error-msg` (~regel 339) en de error-toewijzing (~regel 1660-1662)
- `app.css` — zoek op `.error-msg`

**Taken:**
- [x] **6.1.1** Herontwerp de error-message. Vervang de huidige inline HTML-string door een betere versie:
  ```html
  <div class="error-state">
    <svg>...</svg> <!-- wifi-off icoon -->
    <strong>Even geen verbinding</strong>
    <p>Je ziet nu opgeslagen gegevens van [timestamp]. Zodra de verbinding terug is, laden we de nieuwste locaties.</p>
    <button onclick="loadLocations()">Opnieuw proberen</button>
  </div>
  ```
- [x] **6.1.2** Style de `.error-state` in `app.css`: centered, warm kleuren (geen agressief rood), consistent met het design-system.
- [x] **6.1.3** Voeg een automatische retry toe: als de error wordt getoond, probeer elke 30 seconden automatisch opnieuw (max 3x). Als het dan lukt, verberg de error en laad de data. Gebruik `setInterval` met een counter die stopt na 3 pogingen.

**Verificatie:** Error-state toont timestamp, retry-knop werkt, automatische retry herlaadt na verbindingsherstel.

### 6.2 Offline-detectie banner

**Taken:**
- [x] **6.2.1** Voeg een globale offline-banner toe die verschijnt wanneer `navigator.onLine === false`. Verberg hem wanneer de verbinding terugkomt (`online`/`offline` events). Positie: bovenaan de app, onder de floating nav. Tekst: "Je bent offline — getoonde gegevens kunnen verouderd zijn."
- [x] **6.2.2** Style de banner in `app.css`: subtiel, warm geel (geen agressief), `position: sticky; top: 92px; z-index: 50;`.

**Verificatie:** Schakel vliegtuigmodus in → banner verschijnt. Schakel uit → banner verdwijnt.

---

## FASE 7: HOMEPAGE CTA-VEREENVOUDIGING (P3)

> Doel: De homepage focussen op één duidelijke actie i.p.v. 6 competerende opties.

### 7.1 Analyse en vereenvoudiging van CTA-structuur

**Bestanden:**
- `index.html` — de hero-sectie en alles daaronder
- `.scripts/lib/html-shared.js` — nav generator (default CTA tekst)

**Taken:**
- [x] **7.1.1** Inventarisatie: 7 CTA's boven de fold — zoekbalk, "Start met zoeken", "Lees meer", "Open App" (nav), "Binnen", "Buiten", "Alles bekijken". Drie gaan naar dezelfde bestemming (app.html).
- [x] **7.1.2** Primaire user-intent bepaald via synthetische focusgroepen (ouders, growth, UX): ouders willen browsen, niet zoeken op naam. "Start met zoeken" is de juiste primaire CTA.
- [x] **7.1.3** CTA-hiërarchie geïmplementeerd:
  - **Primair:** "Start met zoeken" (ongewijzigd, groot, primary kleur)
  - **Secundair:** Zoekbalk (ongewijzigd)
  - **Tertiair:** "Lees meer" → tekst-link met pijl (was: volwaardige secondary button)
  - **Quick filters:** Binnen/Buiten → compacte pill-chips (was: grote knoppen met borders)
  - **Verwijderd:** "Alles bekijken" (duplicaat van "Start met zoeken")
  - **Hernoemd:** "Open App" → "Uitjes zoeken" in alle nav's (alle pagina's + generator default)
- [x] **7.1.4** Wijzigingen doorgevoerd in `index.html` (CSS + HTML), `html-shared.js` (generator default), en alle 6 handmatige pagina's. Build slaagt.

**Verificatie:** Homepage heeft één duidelijke primaire actie boven de fold. Geen twee knoppen die op hetzelfde niveau om aandacht strijden.

---

## FASE 8: DESIGN-SYSTEM POLISH

> Doel: De resterende UI/UX verbeteringen uit het vorige plan2.md doorvoeren die nog relevant zijn. Dit is een LAGE prioriteit — alleen uitvoeren als fasen 1-7 volledig af zijn.

### 8.1 Button states verbeteren

**Bestanden:**
- `design-system.css` — zoek op button-gerelateerde tokens en states

**Taken:**
- [x] **8.1.1** Audit: `design-system.css` heeft al generieke `:active` (scale 0.98), `:focus-visible` (brand ring), en `:disabled` (opacity 0.5) states voor alle interactieve elementen. Hover states zijn per component gedefinieerd — correct patroon.
- [x] **8.1.2** Disabled styling bestaat al: `:where(button, [role="button"], .btn, a.btn):disabled` → opacity 0.5, pointer-events none.
- [x] **8.1.3** Al aanwezig: `:where(a, button, [role="button"]):active:not(:disabled) { transform: scale(0.98); }` — 0.98 is subtieler dan 0.97, bewust gekozen.

### 8.2 Loading-states

**Taken:**
- [x] **8.2.1** Skeleton-loading toegevoegd: 3 skeleton-kaarten met `.pp-skeleton` shimmer in de loader HTML van `app.html`.
- [x] **8.2.2** Spinner/tekst-loader vervangen door skeleton-kaarten. CSS in `app.css` aangepast: `.loader::before` verborgen, `.skeleton-cards` layout toegevoegd.

### 8.3 Typography fine-tuning

**Bestanden:**
- `design-system.css` — heading styles (~regel 212-242)

**Taken:**
- [x] **8.3.1** Al aanwezig: h1 `-0.035em`, h2 `-0.025em`, h3 `-0.02em` — strakker dan gevraagd.
- [x] **8.3.2** Al correct: h1 `1.08`, h2 `1.12`, h3 `1.18` — allemaal binnen 108-118% range.
- [x] **8.3.3** N.v.t. — geen wijzigingen nodig, al correct geconfigureerd.

### 8.4 Shadow differentiatie

**Taken:**
- [x] **8.4.1** Al volledig gedifferentieerd: `--pp-shadow-card`, `-card-hover`, `-popover`, `-modal`, `-nav`, `-inset` bestaan en worden correct gebruikt (cards op `.pp-location-card`, popovers op tooltips, nav op `.floating-nav`).

### 8.5 Scroll-reveal animaties

**Taken:**
- [x] **8.5.1** Al actief: `.pp-reveal` wordt gebruikt op 6 secties in `index.html` (features, cities, type-grid, newsletter, support, footer). `IntersectionObserver` in `pp-interactions.js` voegt `is-visible` toe bij scrollen.
- [x] **8.5.2** Al correct: `prefers-reduced-motion` media query in `design-system.css` zet opacity en transform op `!important` defaults.

---

## FASE 9: POST-FLIGHT VALIDATIE

> Doel: Bevestig dat alles werkt en niets gebroken is.

- [x] **9.1** `npm run build:local` slaagt ✓
- [x] **9.2** `npm test` — 57/57 tests groen (snapshot ge-updated na wijzigingen) ✓
- [x] **9.3** `npm run audit:tokens:strict` — 5 pre-bestaande violations, geen nieuwe door onze wijzigingen ✓
- [ ] **9.4** *(handmatig testen)* Open `index.html` in browser met mobile viewport (375×812):
  - Hero-afbeelding: geen zwart blok
  - Stats: correcte getallen (matchen met app en about)
  - CTA-hiërarchie: één duidelijke primaire actie, "Lees meer" als tekst-link, Binnen/Buiten als chips
- [ ] **9.5** *(handmatig testen)* Open `app.html` in browser met mobile viewport:
  - Ontdek-tab: skeleton-loading → locaties laden (of graceful error met timestamp)
  - Favorieten-tab: empty state toont bij 0 favorieten
  - Kaart-tab: geen newsletter-overlap
  - Plan-tab: formulier is bruikbaar
  - Info-tab: getallen kloppen (22 regio's, 8 categorieën, correct locatie-aantal)
  - Bottom nav: geen content overlap
  - Menu: volledig opaque, achtergrond gedimd
  - Preset chips: geen afgeknipte tekst
- [x] **9.6** NEEDS MANUAL FIX items:
  - Hero-afbeelding artefact: CSS overlay aangepast, handmatig checken of zwart blok weg is
  - Cultuur-icoon: gegenereerd via AI, handmatig checken of stijl consistent is met andere 7 iconen
  - Alle "handmatig testen" taken in fasen 1-4 (marked with *(handmatig testen)*)
- [ ] **9.7** Bas: wil je committen en deployen?

---

## KNOWN LIMITATIONS & HANDMATIGE ACTIES

Items die Claude Code niet zelf kan oplossen:

| Item | Reden | Actie voor Bas |
|------|-------|----------------|
| Hero-afbeelding artefact (als in bronbeeld) | Vereist nieuwe AI-gegenereerde illustratie | Genereer nieuw beeld of laat het huidige herstellen |
| Cultuur-categorie icoon | Vereist custom artwork in dezelfde stijl als de andere 7 iconen | Ontwerp of laat ontwerpen, sla op als `/images/categories/cultuur.png` |
| Supabase CORS/rate-limit issues | Vereist Supabase dashboard toegang | Check CORS settings en rate limits in het Supabase project |
| Google Autocomplete API issues | API key configuratie | Controleer API key quotas en restrictions |

---

## REFERENTIES

- `ARCHITECTURE.md` — Volledige technische architectuur
- `BRAND.md` — Kleurenpalet, typografie, tone of voice
- `OPERATIONS.md` — Operationeel runbook (deploy, regio toevoegen, etc.)
- `plan.md` — 15-fasen groeiplan (business/SEO/content strategie)
- `design-system.css` — Alle CSS design tokens
- `.scripts/sync_all.js` — Build orchestrator
- `.scripts/lib/config.js` — TYPE_MAP (8 types), REGIONS (22 regio's)
