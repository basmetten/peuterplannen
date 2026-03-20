# PeuterPlannen Redesign Plan — Homepage & App UX

> **Doel:** Homepage en app samenvoegen tot één directe, mobile-first ervaring die ouders in maximaal 3 taps naar relevante locaties brengt.
> **Repo (lokaal):** `/Users/basmetten/peuterplannen`
> **Repo (GitHub):** `github.com/basmetten/peuterplannen` (private)
> **Datum:** 2026-03-18
> **Eigenaar:** Bas Metten (basmetten@gmail.com)
> **Basis:** Synthetische focusgroep-analyse met 5 groepen (ouders, opa/oma, ondernemers, UX designers)

---

## DIAGNOSE: WAAROM DEZE REDESIGN NODIG IS

### De drie fundamentele problemen

| # | Probleem | Impact | Bewijs |
|---|----------|--------|--------|
| 1 | **Homepage is een pitch, niet de tool** | Elke sectie tussen landing en resultaat = afhaakmomenten. Gemiddeld 4-5 taps nodig om een locatie te bereiken. | Homepage heeft 9+ secties, hero + stats + features + type grid + city grid + newsletter + support + footer. Pas op de app-pagina begint het echte werk. |
| 2 | **Vier fragmentaire startpunten** | Keuzestress → geen pad is geoptimaliseerd | Zoekbalk (→ app), "Start met zoeken" (→ app), Quick filters Binnen/Buiten (→ app), Type grid (→ statische pagina). Geen duidelijke primaire actie. |
| 3 | **Generieke `.hero` class veroorzaakt cascade-conflicten** | De gedeelde `.hero` in `style.css`/`style.min.css` (terracotta gradient, `color: #fff`, `text-align: center`) lekt door naar de homepage hero en moest handmatig worden overschreven. Elk van de 7 generators + index.html gebruikt `class="hero"`. | Hero was visueel gebroken op mobile (screenshot 18 maart). Fix was ad-hoc — structurele oplossing nodig. |

### Wat WEL goed is (niet aanraken)

- **Situatie-presets** (Regenproof, Buiten+koffie, Dreumesproof, etc.) — uniek in NL
- **Design system** — kleurpalet, typografie, tokens, alles consistent en warm
- **Data-rijkheid** — 40+ velden per locatie, facility badges, peuterscore
- **Plan mijn dag** — unieke feature, goed gebouwd
- **Statische pagina's** — SEO-fundament met 2200+ pagina's, blog, structured data
- **Build-systeem** — modulair, incrementeel, geaudit, CI/CD elke 10 min
- **Editorial voice** — warm, direct, authentiek ouderperspectief
- **Generators** — alle 16 generators in `.scripts/lib/generators/` blijven qua structuur intact

---

## ARCHITECTUUR-CONTEXT

### Kritieke detail: app.js is INLINE in app.html
De JavaScript van de app-pagina staat **inline in `app.html`** (~3327 regels totaal). Er is GEEN apart `app.js` bestand. Alle wijzigingen aan app-logica zijn bewerkingen van `app.html`. De `app-page.js` generator past alleen markers en meta tags aan — niet de inline JS.

### Bestaande URL-parameter parsing in app.html
App.html heeft AL URL-param support (rond regel 663):
```
?type=play&weather=indoor&regio=amsterdam&age=peuter&ids=1,2,3
```
Fase 3 (deep-linking) BREIDT dit uit met `?preset=` en `?q=` — geen nieuw systeem.

### Bestaande preset-logica in app.html
- `togglePreset(presetName, event)` — activeer/deactiveer een preset
- `matchesPreset(item, preset)` (regel ~1931) — filter-logica per preset
- `matchesPresetDistance(item, preset)` (regel ~1953) — afstandsfilter per preset
- `getCurrentLocation()` (regel ~1150) — GPS met reverse geocoding
- Stad wordt opgeslagen in `localStorage` als `lastCity`

### Desktop breakpoint
De app gebruikt `680px` als desktop-breakpoint (`DESKTOP_WIDTH`), NIET 768px of 1024px. Homepage breakpoints in index.html zijn 768px en 480px. Dit verschil is bewust — de app heeft een compacter mobile-first design.

### Generators die `.hero` gebruiken

| Generator | Huidige class | Output |
|-----------|---------------|--------|
| `index-page.js` | n.v.t. (hero is handgeschreven in `index.html`) | `index.html` — stats, type grid, city grid markers |
| `app-page.js` | n.v.t. (geen hero) | `app.html` — noscript, JSON-LD, info-stats, meta |
| `city-pages.js` | `class="hero"` | ~22 stadspagina's (1 per actieve regio) |
| `type-pages.js` | `class="hero"` | 8 type-pagina's |
| `city-type-pages.js` | `class="hero"` | ~176 combinatiepagina's (22 regio's × 8 types) |
| `cluster-pages.js` | `class="hero"` | 6 clusterpagina's (situatie-routes) |
| `location-pages.js` | `class="hero hero-location"` | ~2138 locatiepagina's |
| `editorial-pages.js` | `class="hero hero-blog"` | redactionele pagina's (ontdekken, methode) |
| `blog.js` | `class="hero"` + `class="hero hero-blog"` | 49 blogposts + blog index |

### Build-pipeline volgorde
```
generate-blog-images.js → optimize_images.js → generate-og-images.js → sync_portal_assets.js → sync_all.js
                                                                                                    ↓
                                                                            updateIndex() ← index-page.js
                                                                            updateApp()   ← app-page.js
                                                                            updateAbout()  ← about-page.js
                                                                            generateCityPages() ← city-pages.js
                                                                            generateTypePages() ← type-pages.js
                                                                            ... etc voor alle generators
                                                                                    ↓
                                                                            rewriteAssetVersions() op hand-geschreven pagina's
                                                                            minifyCSS() → style.min.css, app.min.css, nav-floating.min.css
```

### Marker-systeem
`index.html` en `app.html` gebruiken `<!-- BEGIN:X -->...<!-- END:X -->` markers die door generators worden vervangen. Bij wijzigingen aan deze pagina's: **bewaar bestaande markers** of pas de corresponderende generator aan.

**index.html markers:** `STATS`, `TYPE_GRID`, `CITY_GRID`, `JSONLD_INDEX`
**app.html markers:** `NOSCRIPT`, `JSONLD_APP`, `INFO_STATS`

### Regex-replaces in generators (OPPASSEN)
`app-page.js` en `index-page.js` gebruiken agressieve regex-replaces op getallen:
```javascript
content.replace(/\d+ kindvriendelijke locaties/g, `${total} kindvriendelijke locaties`);
content.replace(/\d+\+ locaties/g, `${total}+ locaties`);
```
Nieuwe copy die "locaties" bevat met een getal ervoor wordt door deze regexen geraakt. **Vermijd patronen die matchen** in nieuwe handgeschreven HTML, of pas de regex aan.

### Homepage interactive features
De Shufl, Typewriter en Scheduler features op de homepage worden aangestuurd door inline `<script>` blokken in `index.html` (regels ~708-797). Ze gebruiken ook `pp-interactions.js`. Bij verwijdering (fase 2): verwijder zowel de HTML, de inline JS, als eventuele referenties in `pp-interactions.js`.

---

## PIJLERS

Elke fase wordt getoetst aan:

1. **Consistentie** — Dezelfde design tokens, componenten en voice overal. Geen ad-hoc overrides.
2. **Schaalbaarheid** — Werkt bij 2.138 locaties, bij 10.000, bij 50.000. Geen hardcoded getallen.
3. **Automatisering** — Geen handmatige stappen; build-systeem doet het werk. Generators vullen dynamische data.
4. **Mobile-first** — iPhone-gebruiker met peuter op schoot = primaire persona.
5. **Minimaal pad** — Minder stappen = meer conversie. Doel: 3 taps naar locatie.
6. **Generator-compatibiliteit** — Elke HTML-wijziging wordt getoetst tegen de generator die die pagina verwerkt.

---

## LEESWIJZER VOOR CLAUDE CODE

Dit plan is ontworpen voor fase-voor-fase uitvoering door Claude Code. Working directory MOET `/Users/basmetten/peuterplannen` zijn.

Bij context-verlies: lees `plan2.md`, check de status tracker onderaan, hervat bij eerste fase met `TODO` of `IN_PROGRESS`.

### Agent-strategie

| Agent | Model | Isolatie | Wanneer |
|-------|-------|----------|---------|
| `researcher` | Haiku | Nee | Codebase verkennen, patronen vinden, generators lezen |
| `implementer` | Sonnet | Worktree | Code-wijzigingen in isolatie. Build draait in de worktree. |
| `verifier` | Haiku | Nee | Build + alle 5 audits na elke fase |

### Verificatie na elke fase
```bash
npm run build
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
node .scripts/audit_design_system.js --strict
node .scripts/audit_design_tokens.js --strict
git diff --stat
```

### Commit-strategie
- Elke fase = 1-3 commits met descriptieve messages
- Bij twijfel: commit NIET, vraag de user

---

## FASE 1: HERO SIMPLIFICATIE — ACTIE BOVEN DE VOUW
**Status:** `DONE`
**Prioriteit:** KRITIEK — dit is de eerste indruk op mobile
**Agents:** `researcher` (huidige hero + `index-page.js` analyseren) → `implementer` (worktree) → `verifier`
**Bestanden:** `index.html`, `.scripts/lib/generators/index-page.js`

### Probleem
Op iPhone neemt de hero (illustratie + titel + description + proof badge + zoekbalk + CTA + tertiary link) meer dan 2 volle schermen in beslag. De zoekbalk is onder de vouw. De hero-afbeelding is decoratief, niet informatief.

### Wat we doen

**1.1** Hero herschrijven naar mobile-first actie-layout:
```
[Nav — 80px]
[Kicker: "2138 locaties · 100% geverifieerd" — dynamisch via updateIndex()]
[H1: "De beste peuteruitjes voor jouw kleintje"]
[Subtitle: 1 zin max]
[Zoekbalk met GPS-knop — full width, 48px hoogte]
[Preset-chips: Regenproof | Buiten+koffie | Dreumesproof | Korte rit — 2×2 grid, 48px]
```

- **Verwijder:** hero-afbeelding op mobile (toon alleen op desktop ≥768px als aside, consistent met bestaande homepage breakpoint)
- **Verwijder:** "Start met zoeken" knop (zoekbalk IS de actie)
- **Verwijder:** "Lees meer over PeuterPlannen" link (verplaats naar footer)
- **Verwijder:** floating icon overlays op hero-visual (kindfiguurtje, camerafiguurtje)
- **Behoud:** hero-afbeelding op desktop (≥768px) als visuele aside in 2-kolom layout
- **Verplaats:** proof badge naar kicker-positie boven H1, compact als tekstregel
- **Noot:** `updateIndex()` in `index-page.js` update al de hero badge text via regex (regel ~223). De nieuwe kicker-marker vervangt dit.

**1.2** Kicker dynamisch maken via `index-page.js`:
- Voeg een nieuw `<!-- BEGIN:HERO_KICKER -->...<!-- END:HERO_KICKER -->` marker toe
- `updateIndex()` genereert: `"${total} locaties · ${regions.length} regio's · 100% geverifieerd"`
- Verwijder de bestaande `STATS` marker/sectie (grote getallen verdwijnen)

**1.3** Preset-chips toevoegen aan homepage:
- Statische HTML-chips die linken naar `app.html?preset=X`
- Dezelfde preset-namen als in de inline JS van app.html: `rain`, `outdoor-coffee`, `dreumesproof`, `peuterproof`, `short-drive`, `lunch-play`
- Toon top 4 op mobile (2×2 grid), alle 6 op desktop
- Chips zijn groot genoeg voor touch: min 48px hoogte, duidelijke labels

**1.4** Zoekbalk functionaliteit:
- `<form action="/app.html" method="get">` met `<input name="q">`
- Submit navigeert naar `app.html?q={query}`
- GPS-knop slaat positie op in localStorage en navigeert naar `app.html?gps=1`
- Placeholder: "Waar woon je?" (simpeler dan "Zoek een stad, type of locatie...")
- "Populair:" chips onder de zoekbalk met top-5 regio's (dynamisch via generator)

### Verwacht resultaat mobile
```
[Nav — ~70px incl. margin]
[Kicker — 20px]
[H1 — ~70px (2 regels)]
[Subtitle — ~25px]
[Zoekbalk — 48px]
[4 preset-chips — 2×2 grid, ~108px]
= ~341px, past boven de vouw op iPhone 14 (844px viewport)
```

### Niet aanraken
- Desktop hero-layout (2-kolom met afbeelding) blijft beschikbaar ≥768px
- SEO structured data (JSON-LD) — wordt al correct gegenereerd via `JSONLD_INDEX` marker
- Meta tags — worden al correct geüpdatet door `updateIndex()`
- Admin portal (`/admin/`) — gebruikt eigen `.admin-hero-grid` class, niet `.hero`
- Partner portal (`/partner/`) — gebruikt eigen `.portal-hero` class, niet `.hero`
- Partner landing page (`/voor-bedrijven/`) — gebruikt `.vb-hero` namespace, niet `.hero`

---

## FASE 2: HOMEPAGE SECTIES STROOMLIJNEN
**Status:** `DONE`
**Prioriteit:** HOOG
**Agents:** `implementer` (worktree) → `verifier`
**Bestanden:** `index.html`, `.scripts/lib/generators/index-page.js`

### Probleem
Na de hero zijn er 7+ secties die allemaal "inspiratie" bieden maar geen directe actie. De interactive playground (Shufl, Typewriter, Scheduler) is een demo die niet klikbaar is — verwarrend.

### Nieuwe sectie-volgorde (mobile)

| # | Sectie | Marker | Generator | Status |
|---|--------|--------|-----------|--------|
| 1 | Hero + presets (fase 1) | `HERO_KICKER` | `index-page.js` | Nieuw |
| 2 | Type Grid (compact) | `TYPE_GRID` | `index-page.js` | Bestaand, vereenvoudigd |
| 3 | City/Regio Grid | `CITY_GRID` | `index-page.js` | Bestaand, vereenvoudigd |
| 4 | Blog Preview (3 posts) | `BLOG_PREVIEW` | `index-page.js` (nieuw) | Nieuw marker |
| 5 | Newsletter | Handgeschreven | n.v.t. | Bestaand |
| 6 | Footer | Handgeschreven | n.v.t. | Bestaand |

### Wat we verwijderen
- **Stats-sectie** (`STATS` marker) → getallen verhuisd naar hero kicker. Verwijder ook de `STATS` marker uit `index.html` EN de `statsHTML` generatie in `index-page.js`
- **Quick Filter "Wat zoek je?"** (Binnen/Buiten) → overbodig, presets in hero zijn beter
- **Interactive Playground** (Shufl, Typewriter, Scheduler):
  - Verwijder de HTML (features-sectie in `index.html`)
  - Verwijder de inline `<script>` blok (regels ~708-797 in `index.html`) dat shuffle/typewriter/scheduler state beheert
  - Check `pp-interactions.js` of daar referenties naar staan — zo ja, verwijder die ook
- **Support/Tikkie sectie** → verplaats naar about-pagina (staat daar al via `about-page.js`)
- **Guide sections** in type/city grids → vereenvoudigen (verwijder guide-card-lead uitleg-tekst, maar **BEHOUD alle interne links** naar cluster-, blog- en ontdekken-pagina's — die zijn essentieel voor de interne linking mesh uit plan.md fase 10)

### Nieuwe `BLOG_PREVIEW` marker
- `index-page.js` genereert 3 recente blogposts als compacte kaarten
- De logica voor `loadBlogMetadata()` bestaat al in `index-page.js` (nu gebruikt voor featured blog entries in city grid)
- Verplaats deze naar een eigen sectie met horizontaal scrollbare kaarten op mobile

### Generator-wijzigingen in `index-page.js`
- **Nieuw:** `HERO_KICKER` marker generatie
- **Nieuw:** `BLOG_PREVIEW` marker generatie
- **Verwijderd:** `STATS` marker generatie (het hele statsHTML blok)
- **Gewijzigd:** `TYPE_GRID` — verwijder guide-section-featured, hou alleen de kaarten
- **Gewijzigd:** `CITY_GRID` — verwijder crawl hub guides, hou kaarten + 1 "Ontdek meer" link

---

## FASE 3: APP.HTML PRESET DEEP-LINKING
**Status:** `DONE`
**Prioriteit:** HOOG
**Agents:** `implementer` → `verifier`
**Bestanden:** `app.html` (bevat inline JS — er is GEEN apart app.js bestand)

### Probleem
Homepage presets moeten naadloos doorlinken naar app.html met het juiste filter actief. Nu vereist app.html handmatige stappen (stad invullen → preset kiezen → wachten).

### Bestaande code om op voort te bouwen
App.html heeft AL URL-param parsing (rond regel 663) voor `?type=`, `?weather=`, `?regio=`, `?age=`, `?ids=`. Er is ook al een `togglePreset()` functie en `getCurrentLocation()` met GPS + reverse geocoding.

### Wat we bouwen

**3.1** Breid bestaande URL-param parsing uit met `?preset=` en `?q=`:
```javascript
// TOEVOEGEN aan bestaande init-flow (rond regel 663 in app.html)
const preset = params.get('preset');
const query = params.get('q');
const useGps = params.get('gps') === '1';

if (query) {
  document.getElementById('location-input').value = query;
  updateLocation(); // bestaande functie (regel ~1180)
}
if (useGps) getCurrentLocation(); // bestaande functie (regel ~1150)
if (preset) togglePreset(preset); // bestaande functie
```
**Belangrijk:** Dit is een toevoeging van ~10 regels aan bestaande code, GEEN nieuwe functie.

**3.2** Auto-GPS op eerste bezoek (uitgewerkt in fase 8):
- Fase 8 beschrijft de volledige GPS-onboarding flow
- Hier alleen de URL-param `?gps=1` afhandeling: `if (useGps) getCurrentLocation();`
- `getCurrentLocation()` bestaat al (regel ~1150) en slaat resultaat op in `lastCity`

**3.3** Decision-stage header simplificeren:
- **Verwijder:** "Kies eerst hoe de dag voelt" kicker + uitleg-paragraaf
- **Vervang door:** "Wat voor dag wordt het?" als label boven presets
- Dit is handgeschreven HTML in app.html (rond regel 193-197) — geen generator-conflict
- `app-page.js` raakt alleen noscript, JSON-LD en meta — niet de decision-stage

**3.4** Presets responsive touch-targets:
- Min 48px hoogte per preset-chip (WCAG/Apple HIG)
- Op mobile (<680px, de bestaande `DESKTOP_WIDTH`): 2-koloms grid i.p.v. horizontale scroll
- CSS wijziging in de inline `<style>` van app.html of in `app.css` (bron van `app.min.css`)

---

## FASE 4: `.hero` CLASS SCOPING — CASCADE-CONFLICT STRUCTUREEL OPLOSSEN
**Status:** `DONE`
**Prioriteit:** HOOG — voorkomt herhaling van de hero-bug op alle pagina's
**Agents:** `researcher` (volledige hero-class inventaris) → `implementer` (worktree) → `verifier`
**Bestanden:** alleen `index.html` (rename `class="hero"` → `class="hero-home"` + CSS verplaatsen). `style.css` en generators worden NIET gewijzigd.

### Probleem
`style.css` (bron van `style.min.css`) bevat een generieke `.hero` class met terracotta gradient, witte tekst en centered text-align. Deze stijlen worden door ALLE pagina-typen overerfd. De homepage, die een compleet ander hero-design nodig heeft, moest dit handmatig overschrijven — fragiel en niet schaalbaar.

### Inventaris: wie gebruikt `.hero`?

| Pagina-type | Generator | Hero class | Gewenste stijl |
|-------------|-----------|------------|----------------|
| Stadspagina's | `city-pages.js:225` | `class="hero"` | Terracotta gradient + witte tekst ✓ |
| Type-pagina's | `type-pages.js:188` | `class="hero"` | Terracotta gradient + witte tekst ✓ |
| City-type combo's | `city-type-pages.js:167` | `class="hero"` | Terracotta gradient + witte tekst ✓ |
| Clusterpagina's | `cluster-pages.js:129` | `class="hero"` | Terracotta gradient + witte tekst ✓ |
| Locatiepagina's | `location-pages.js:472` | `class="hero hero-location"` | Foto of gradient ✓ |
| Editorial/blog | `editorial-pages.js:51`, `blog.js:246` | `class="hero hero-blog"` | Donkerder gradient ✓ |
| Blog index | `blog.js:138` | `class="hero"` | Terracotta gradient ✓ |
| Blog detail (met image) | `blog.js:138` | `class="hero"` + inline style | Padding override ✓ |
| **Homepage** | Handgeschreven | `class="hero"` | **ANDERS: geen gradient, donkere tekst, 2-kolom** |

### Oplossing
De generieke `.hero` in `style.css` is correct voor stad/type/cluster/blog-pagina's. Het probleem is alleen de **homepage**. In plaats van alle generators te refactoren:

**4.1** Geef de homepage hero een eigen class:
- `index.html`: verander `<section class="hero">` naar `<section class="hero-home">`
- Verplaats alle homepage-specifieke hero-stijlen van inline `<style>` naar `.hero-home` in de inline stylesheet
- Voeg expliciete resets toe: `background: none; color: var(--pp-text); text-align: left;`

**4.2** Verwijder de ad-hoc overrides uit fase 0:
- De `background: none; color: var(--pp-text); text-align: left;` die nu in `.hero` inline staan → verplaats naar `.hero-home`
- `.hero` in de inline styles van index.html krijgt GEEN stijlen meer — de generieke `.hero` uit style.css is niet meer actief

**4.3** Verifieer dat alle andere pagina's NIET geraakt worden:
- Alle generators blijven `class="hero"` gebruiken → geen wijzigingen
- `style.css` `.hero` regels blijven identiek → geen wijzigingen
- Alleen `index.html` verandert

### Verificatie
- `npm run build` slaagt
- Alle 5 audits slagen
- Steekproef: open amsterdam.html, speeltuinen.html, een blogpost, een locatiepagina → hero ziet er normaal uit
- Open index.html → hero gebruikt `.hero-home`, geen cascade-conflict

---

## FASE 5: MOBILE TOUCH TARGETS & SPACING
**Status:** `DONE`
**Prioriteit:** MIDDEL
**Agents:** `implementer` → `verifier`
**Bestanden:** `app.css` (bron van `app.min.css`), `index.html` inline styles

### Probleem
Touch targets in app presets te klein voor gebruik met peuter op schoot. Floating nav + hero padding = ~40% scherm weg voor content op kleine iPhones.

### Breakpoints om rekening mee te houden
- App.html gebruikt `DESKTOP_WIDTH = 680px` als breakpoint
- Homepage gebruikt `768px` en `480px` breakpoints in inline `<style>`
- Nav gebruikt `768px` breakpoint in `nav-floating.css`

### Wat we doen

**5.1** Touch targets (in `app.css`):
- Preset chips (`.preset-chip`): verhoog naar min 48px hoogte
- Filter chips (`.chip`): verhoog naar min 40px hoogte
- Search input: bevestig 48px hoogte
- Alle klikbare elementen: min 44px (Apple HIG)

**5.2** Hero padding optimaliseren (in `index.html` inline styles):
- Mobile `padding-top`: 118px → 100px (bespaart 18px boven de vouw)
- `gap` in hero grid: 42px → 24px op mobile
- Deze stijlen staan op `.hero-home` na fase 4

**5.3** Geen wijzigingen aan nav (werkt goed, compact genoeg)

### Generator-impact
- Geen — touch targets zijn CSS-only wijzigingen
- `app.css` wordt door `minifyCSS()` in sync_all.js geminified naar `app.min.css`

---

## FASE 6: HOMEPAGE → APP SEAMLESS TRANSITION
**Status:** `DONE`
**Prioriteit:** MIDDEL
**Agents:** `implementer` → `verifier`
**Bestanden:** `index.html`, `app.html`

### Probleem
De overgang homepage → app voelt als een nieuw bezoek. De context-strip ("Waar gaan we vandaag naartoe?") is redundant als je al via een preset of zoekopdracht binnenkomt.

### Wat we bouwen (minimaal — bouw voort op fase 3)

**6.1** Geen apart localStorage-systeem nodig:
Fase 3 voegt `?preset=` en `?q=` URL-params toe. De homepage presets linken al naar `app.html?preset=rain`. App.html leest deze params bij page load en activeert het juiste filter. **Dit IS de seamless transition** — geen extra state-management nodig.

**6.2** Context-strip conditioneel verbergen:
- Als URL een `?preset=` of `?q=` param bevat: verberg de "Waar gaan we vandaag naartoe?" header
- Scroll direct naar de resultaten
- Simpele check: `if (location.search) document.querySelector('.app-context-strip').hidden = true;`

**6.3** View Transition API (CSS-only enhancement):
- Beide pagina's hebben al `<meta name="view-transition" content="same-origin">`
- Voeg `view-transition-name: hero-title` toe aan homepage H1 en app-context-title
- Browsers die het ondersteunen krijgen een smooth crossfade; rest ziet een gewone navigatie
- Geen JS nodig

### Generator-impact
- `app-page.js` verandert NIET
- `index-page.js` verandert NIET

---

## FASE 7: QUICK RESULTS HOMEPAGE COMPONENT
**Status:** `DONE`
**Prioriteit:** MIDDEL
**Agents:** `implementer` → `verifier`
**Bestanden:** `index.html`, nieuw: `homepage-results.js`

### Wat we bouwen
Een lichtgewicht script dat op de homepage 3 locatiekaarten toont als "teaser".

**7.1** Logica:
```
1. Check localStorage voor GPS-positie
2. Als GPS: haal 3 dichtstbijzijnde locaties op via Supabase (anon key, read-only)
3. Als geen GPS: haal 3 locaties met homepage_featured = true
4. Render als compacte kaarten
5. "Bekijk alle locaties →" link naar app.html
```

**7.2** Performance & Supabase access:
- Script is `defer`
- Supabase anon key + URL staan al in `app.html` — hergebruik dezelfde credentials
  - `SB_URL = 'https://piujsvgbfflrrvauzsxe.supabase.co'`
  - `SB_ANON = 'eyJ...'` (read-only, publieke key)
- Direct REST API call (geen Supabase JS client nodig op homepage): `fetch(SB_URL + '/rest/v1/locations?select=id,name,slug,region,type&homepage_featured=eq.true&limit=3', { headers: { apikey: SB_ANON } })`
- Skeleton loader terwijl data laadt (hergebruik bestaand `.pp-skeleton` patroon uit design-system)
- Als Supabase onbereikbaar: sectie wordt niet getoond (graceful degradation)

**7.3** Supabase credentials in homepage-results.js:
- Hardcode `SB_URL` en `SB_ANON` in het script (dezelfde publieke waarden als in app.html)
- Dit is safe: de anon key is read-only en al publiek in app.html
- Alternief: definieer als `<script>` constants in index.html boven de `defer` script-tag

**7.4** Database-aanpassing:
- Voeg `homepage_featured` boolean kolom toe aan `locations` tabel via Supabase SQL Editor:
  ```sql
  ALTER TABLE locations ADD COLUMN homepage_featured boolean DEFAULT false;
  ```
- Zet 6-9 locaties op `true` via admin portal
- Admin portal (`admin/admin.js`): voeg toggle toe aan locatie-detail tab — het `saveLocationDetail` endpoint ondersteunt al willekeurige kolom-updates

### Generator-impact
- Voeg `<!-- BEGIN:QUICK_RESULTS -->...<!-- END:QUICK_RESULTS -->` marker toe aan `index.html`
- `index-page.js`: genereer statische placeholder HTML (skeleton) als de marker-content
- Client-side JS (`homepage-results.js`) vervangt skeletons met echte data

---

## FASE 8: APP.HTML ONBOARDING FLOW
**Status:** `DONE`
**Prioriteit:** MIDDEL-LAAG
**Agents:** `implementer` → `verifier`
**Bestanden:** `app.html` (inline JS + HTML), `app.css`

### Probleem
App-pagina opent met lege staat. Oudere gebruikers krijgen soms "niet gevonden" voor steden die in een grotere regio zitten.

### Wat we bouwen

**8.1** Inline GPS-prompt als eerste stap (als geen locatie bekend):
- Prominente kaart boven presets: "Waar ben je? [Gebruik mijn locatie] of [Typ je stad]"
- Na keuze: kaart verdwijnt, presets en resultaten laden

**8.2** Stad-autocomplete verbeteren:
- Huidige "Populair:" chips hardcoded → maak dynamisch vanuit regio's
- Fuzzy matching: "Hilversum" → match op "Het Gooi" regio
- Autocomplete dropdown met suggesties tijdens typen

**8.3** Empty state verbeteren:
- Bij 0 resultaten: toon suggesties (verbreed filters, andere regio)

### Generator-impact
- `app-page.js` verandert niet — de populaire steden en GPS-prompt zijn client-side JS
- Noscript fallback blijft intact

---

## FASE 9: CONTENT & COPY REFRESH
**Status:** `DONE`
**Prioriteit:** LAAG
**Agents:** implementer → verifier
**Bestanden:** `index.html`, `app.html`

### Wat we herschrijven

| Huidige copy | Nieuwe copy | Waarom |
|---|---|---|
| "Zoek een stad, type of locatie..." | "Waar woon je?" | Eén concept i.p.v. drie |
| "Kies eerst hoe de dag voelt" + paragraaf | "Wat voor dag wordt het?" | Korter, directer |
| "Minder filters, sneller naar een shortlist" | Verwijderen | Uitleg voor de bouwer, niet de gebruiker |
| "Menselijk geverifieerd · AI-slim gesorteerd" | "Elke locatie persoonlijk gecheckt" | "AI-slim" is jargon |
| "Plan mijn dag" header uitleg | "Vertel hoe je dag eruitziet. Wij bouwen een route." | Korter |

### Copy-principes
- Max 1 zin per element
- Geen jargon (shortlist, preset, AI, filteren)
- Spreek aan als "je", niet "u" of "ouders"
- Schrijf alsof je een vriend vertelt over de site

### Generator-impact
- Geen — alle copy-wijzigingen zijn in handgeschreven HTML
- `app-page.js` regex-replaces werken op getallen, niet op copy

---

## STATUS TRACKER

| Fase | Titel | Status | Prioriteit | Afhankelijk van | Generator-impact |
|------|-------|--------|------------|-----------------|------------------|
| 4 | `.hero` class scoping | `DONE` | HOOG | — | Geen generator-impact (alleen `index.html` rename) |
| 1 | Hero simplificatie | `DONE` | KRITIEK | Fase 4 | `index-page.js`: nieuw `HERO_KICKER` marker, verwijder `STATS` |
| 2 | Homepage secties stroomlijnen | `DONE` | HOOG | Fase 1 | `index-page.js`: nieuw `BLOG_PREVIEW`, wijzig `TYPE_GRID` + `CITY_GRID` |
| 3 | App.html preset deep-linking | `DONE` | HOOG | Fase 1 | Geen generator-impact (inline JS in `app.html`) |
| 5 | Mobile touch targets | `DONE` | MIDDEL | Fase 1, 4 | Geen generator-impact (CSS-only) |
| 6 | Seamless transition | `DONE` | MIDDEL | Fase 3 | Geen generator-impact |
| 7 | Quick Results component | `DONE` | MIDDEL | Fase 2 | `index-page.js`: nieuw `QUICK_RESULTS` marker |
| 8 | App onboarding flow | `DONE` | MIDDEL-LAAG | Fase 3 | Geen generator-impact (inline JS in `app.html`) |
| 9 | Content & copy refresh | `DONE` | LAAG | Fase 1, 2 | Geen generator-impact |

### Aanbevolen uitvoeringsvolgorde

```
Batch 1 (sequentieel): Fase 4 (cascade fix) → Fase 1 (hero)
   ↳ Fase 4 eerst omdat het een rename is die index.html raakt.
     Fase 1 bouwt daarna voort op de schone .hero-home class.
     NIET parallel — beide raken index.html → merge-conflict.
         ↓
Parallel batch 2:  Fase 3 (deep-linking) + Fase 5 (touch) → dan Fase 2 (secties)
   ↳ Fase 3 raakt app.html inline JS, fase 5 raakt app.css → parallel OK.
     Fase 2 raakt index.html + index-page.js → sequentieel NA 3+5 (vermijd overlap met fase 5 op index.html inline styles).
         ↓
Parallel batch 3:  Fase 6 (transition) + Fase 7 (quick results)
   ↳ Fase 6 is klein (paar regels in app.html + CSS). Fase 7 is een nieuw script + marker.
         ↓
Sequentieel:       Fase 8 (onboarding) → Fase 9 (copy)
```

### Geschatte doorlooptijd
- Batch 1: 1 sessie (fase 4 is klein, fase 1 is de meeste werk)
- Batch 2: 1 sessie
- Batch 3: 1 sessie
- Fase 8+9: 1 sessie
- **Totaal: 4 Claude Code sessies**

---

## VERWACHTE IMPACT

### UX metrics (verwacht)
- **Taps naar eerste locatie:** 4-5 → 2-3
- **Content boven de vouw (mobile):** H1 + zoekbalk + 4 presets (vs. alleen hero image)
- **Paginasecties homepage:** 9+ → 5 (hero, type grid, city grid, blog preview, newsletter + footer)
- **Bounce rate homepage → app:** verwacht -30% door seamless transition

### Wat NIET verandert
- **SEO:** alle statische pagina's, structured data, sitemaps blijven identiek
- **Build-systeem:** markers, generators, audits — structuur intact
- **Design tokens:** geen nieuwe kleuren, fonts of spacing-waarden (`design-system.css` ongewijzigd)
- **App.html core:** filtering, kaart, detail-view, plan-wizard — ongewijzigd
- **URL-structuur:** geen redirects nodig
- **Generators:** stad, type, locatie, cluster, editorial, blog generators — ongewijzigd
- **`app-page.js`:** noscript, JSON-LD, meta updates — ongewijzigd
- **Admin portal:** eigen CSS namespace (`.admin-*`, `portal-shell.css`), geen gedeelde hero-classes
- **Partner portal:** eigen CSS namespace (`.portal-*`), geen gedeelde hero-classes
- **Partner landing (`/voor-bedrijven/`):** eigen `.vb-*` namespace, gegenereerd door `partner-landing.js`
- **Interne linking mesh:** alle links naar cluster-, blog- en ontdekken-pagina's blijven behouden
