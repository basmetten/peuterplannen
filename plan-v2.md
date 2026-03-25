# Plan v2: PeuterPlannen App Redesign

## Gevalideerd door Apple Maps Reverse Engineering (23 maart 2026)

Dit plan vervangt `plan.md` en `plan-warm-glass-redesign.md`. Het consolideert beide plannen en corrigeert alle specificaties op basis van reverse engineering van Apple Maps (maps.apple.com v1.6.476). Bronrapport: `docs/apple-maps-research.md`.

---

## Vision

PeuterPlannen's app.html wordt een **map-first discovery experience** die de vloeiendheid van Apple Maps combineert met de functionele UX-patronen van Funda. Warm, uitnodigend, radicaal vereenvoudigd. Alles past in een scherm, elke interactie voelt native.

**Kernprincipes:**
- **Map is always visible** — de kaart is de held, UI drijft erboven
- **Sheet-first navigation** — de bottom sheet IS de navigatie op mobile (geen bottom nav)
- **5 data points per card** — foto, type+afstand, naam, one-liner, hartje
- **Solid mobile, selective glass** — sheet heeft solide achtergrond; alleen floating controls krijgen glaseffect
- **No spring physics** — Apple Maps gebruikt `ease-out` en `ease-in-out` voor alles; wij ook
- **Elke fase shipt onafhankelijk** — geen big bang rewrite

**Wat NIET verandert:**
- Vanilla JS stack (geen framework-migratie)
- Supabase backend (geen schema-wijzigingen)
- MapLibre GL voor de kaart
- GitHub Pages + Cloudflare hosting
- De ~2200 statische pagina's en hun build pipeline
- esbuild bundling (al ingericht, bundels in git)

---

## Design Tokens (Apple Maps-gevalideerd)

Alle waarden hieronder zijn gevalideerd tegen Apple Maps v1.6.476.

### Kleuren

```css
:root {
  /* Achtergronden (warm getint — bewuste afwijking van Apple's neutrale grijs) */
  --pp-bg: #FAF7F2;
  --pp-surface: #FFFFFF;
  --pp-surface-warm: #FFFCF9;         /* sheet achtergrond */
  --pp-sheet-bg: #FFFCF9;             /* SOLIDE — geen backdrop-filter */

  /* Brand (terracotta/koraal) */
  --pp-primary: #D47756;
  --pp-primary-light: #E8956F;
  --pp-primary-dark: #B85E3D;
  --pp-accent: #4A7A4A;               /* groen voor scores */

  /* Text (warm grays, niet Apple's koude grays) */
  --pp-text-primary: #2D2926;
  --pp-text-secondary: rgba(60, 45, 38, 0.60);
  --pp-text-tertiary: rgba(60, 45, 38, 0.30);
  --pp-text-inverse: #FFFBF7;

  /* Glass surfaces — ALLEEN voor floating controls, niet voor sheet/cards */
  --pp-glass-control: rgba(255, 248, 240, 0.85);   /* search pill, map controls */
  --pp-glass-chip: rgba(255, 248, 240, 0.80);       /* filter chips op kaart overlay */
  --pp-glass-badge: rgba(255, 248, 240, 0.85);      /* type badge op foto */
  --pp-glass-desktop-nav: rgba(0, 0, 0, 0.6);       /* desktop nav bar (Apple: rgba(0,0,0,0.6) + blur(50px)) */
}
```

### Border Radius

```css
:root {
  --pp-radius-sm: 10px;    /* foto thumbnails, kleine cards (Apple: 10px) */
  --pp-radius-md: 12px;    /* sheet top corners, search container, cards (Apple: 12px) */
  --pp-radius-lg: 16px;    /* pill buttons, filter chips (Apple: 16px) */
  --pp-radius-pill: 100px;
  --pp-radius-circle: 50%;
}
```

> **Correctie t.o.v. oude plannen:** Sheet radius was `20px`, is nu `12px`. Foto radius was `8px`, is nu `10px`.

### Schaduwen

```css
:root {
  /* Apple Maps card shadow: ultra-subtiel */
  --pp-shadow-card: rgba(0, 0, 0, 0.024) 10px 1px 5px;
  --pp-shadow-sheet: 0 -1px 5px rgba(0, 0, 0, 0.024);

  /* Onze eigen — iets zwaarder voor contrast tegen warm achtergrond */
  --pp-shadow-raised: 0 2px 4px rgba(60, 40, 20, 0.06), 0 2px 12px rgba(60, 40, 20, 0.03);
  --pp-shadow-floating: 0 2px 8px rgba(60, 40, 20, 0.08), 0 8px 24px rgba(60, 40, 20, 0.05);
}
```

### Transitions & Timing

```css
:root {
  /* Durations */
  --pp-duration-fast: 100ms;
  --pp-duration-normal: 150ms;
  --pp-duration-slow: 300ms;

  /* Easing — Apple Maps gebruikt GEEN spring curves */
  --pp-ease-default: ease-out;
  --pp-ease-sheet: ease-in-out;                              /* sheet state changes: 0.3s */
  --pp-ease-card: ease-out;                                  /* card transforms: 0.15s */
  --pp-ease-popover: cubic-bezier(0.25, 0.1, 0.25, 1.3);   /* DE ENIGE overshoot curve — voor popovers/tooltips */

  /* Samengestelde transitie-presets */
  --pp-transition-sheet: transform 0.3s ease-in-out;
  --pp-transition-card-desktop: transform 0.15s ease-out, opacity 0.15s;
  --pp-transition-card-mobile: transform 0.3s ease-in-out;
  --pp-transition-sidebar: left 0.25s ease-in-out, width 0.25s ease-in-out;
  --pp-transition-chip: background-color 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out;
  --pp-transition-image: opacity 0.3s linear;
  --pp-transition-search: width 0.3s ease-out, border-radius 0.3s ease-out;
}
```

> **VERWIJDERD t.o.v. oude plannen:** `motion/mini` dependency, spring parameter tabel (stiffness/damping/mass), CSS `linear()` spring curves, `--wg-ease-spring`, `--wg-ease-heavy-in`, `--wg-ease-heavy-out`, `--wg-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)`.

### Backdrop Filter (selectief gebruik)

```css
:root {
  --pp-blur-control: blur(10px);     /* search pill, map controls (kleine elementen) */
  --pp-blur-nav: blur(50px);         /* desktop nav bar (Apple exact) */
  --pp-blur-dropdown: blur(15px);    /* search dropdown, lijsten (Apple exact) */
}
```

> **CRUCIAAL:** Backdrop-filter gaat NIET op de sheet, NIET op cards, NIET op de desktop sidebar. Alleen op kleine floating controls waar de kaart doorschemert. Dit is exact wat Apple Maps doet.

### Spacing (4px grid)

```css
:root {
  --pp-sp-2: 2px;
  --pp-sp-4: 4px;
  --pp-sp-8: 8px;
  --pp-sp-12: 12px;
  --pp-sp-16: 16px;
  --pp-sp-20: 20px;    /* Apple Maps' meest gebruikte padding */
  --pp-sp-24: 24px;
  --pp-sp-32: 32px;
  --pp-sp-48: 48px;
}
```

---

## Fase 0 — Architectuur Fundament

> Doel: schoon fundament leggen zodat de UX-redesign op een stabiele basis gebouwd wordt. Geen visuele veranderingen — alleen interne kwaliteit.

### 0A. esbuild bundling

**Status:** Grotendeels klaar — bundels worden al gebouwd en gecommit.

**Verificatie:** `npm run bundle` draait, `app.bundle.js` en `app.bundle.css` bestaan, Network tab toont 2 eigen requests.

### 0B. CSS @layer + token consolidatie

**Wat:** Expliciete cascade-volgorde, merged tokens, geen dubbele definities.

**Waarom:** `--pp-*` en `--wg-*` tokens overlappen. Na dit plan bestaan er alleen nog `--pp-*` tokens.

**Layer volgorde:** `@layer tokens, components, layout, overrides;`

**Stappen:**
1. `warm-glass-tokens.css` mergen INTO `design-system.css` — alle `--wg-*` tokens hernoemen naar `--pp-*`
2. `glass.css` wrap in `@layer components`
3. `app.css` wrap in `@layer layout`
4. Verwijder dubbele spacing tokens
5. Update alle referenties in JS/CSS van `--wg-*` naar `--pp-*`

**Verificatie:** Playwright screenshots voor/na op 390px en 1280px — pixel-perfect identiek.

### 0C. EventBus + module ontkoppeling

**Wat:** `window._pp_modules` globale hack vervangen door pub/sub EventBus.

**Files:**
- `modules/bus.js` — uitbreiden met `on()`, `emit()`, `off()`
- Alle modules die `_pp_modules` gebruiken

**Events:**
- `locations:updated` — locatie data geladen/gefilterd
- `filters:changed` — filter selectie gewijzigd
- `sheet:statechange` — sheet peek/half/full
- `map:markerclick` — marker getapt
- `layout:viewchange` — tab gewisseld
- `card:hover` — desktop hover sync

**Verificatie:** `grep -r "_pp_modules" modules/` geeft 0 resultaten.

### 0D. Centralized templates

**Wat:** Card/list HTML uit 5 losse files naar 1 `modules/templates.js`.

**Exports:**
- `renderCard(loc, opts)` — volledige kaart voor resultatenlijst
- `renderCompactCard(loc)` — compact item voor sheet-lijst en mobile-lijst
- `renderDetailHeader(loc)` — bovenste sectie van detail sheet
- `renderPlanSlot(loc)` — kaart voor plan-weergave

**Stappen:**
1. Migreer rendering-code uit `cards.js`, `sheet.js`, `sheet-engine.js`, `layout.js`, `plan.js`
2. Vervang inline HTML met imports uit `templates.js`
3. Gebruik `document.createElement` + `.textContent` voor user data (XSS-veilig)

**Verificatie:** Alle kaartweergaven identiek. `innerHTML.*loc\\.name` in andere modules geeft 0 resultaten.

### 0E. switchView refactor

**Wat:** God-functie `switchView()` splitsen in `switchViewDesktop()` en `switchViewMobile()`.

**Stappen:**
1. Verwijder legacy mobile path (dead code)
2. Split in `switchViewDesktop(view)` (~30 regels) en `switchViewMobile(view)` (~40 regels)
3. Top-level: `const switchView = (view) => isDesktop() ? switchViewDesktop(view) : switchViewMobile(view)`

**Verificatie:** Alle views werken op 390px en 1280px.

---

## Fase 1 — Sheet-First Navigation

> Doel: bottom nav verwijderen, de sheet wordt de primaire navigatie op mobile. Desktop behoudt de top-nav mode switch.

### 1A. Bottom nav verwijderen

**Wat:** De 5-tab bottom nav (`#bottom-nav`) verwijderen. De sheet tabs nemen navigatie over.

**Waarom:** Apple Maps heeft GEEN bottom nav op mobile. De sheet IS de navigatie. Bottom nav + sheet tabs = dubbele navigatie die 60px vertical space vreet.

**Stappen:**
1. Verwijder `#bottom-nav` element en alle children uit `app.html`
2. Verwijder alle `.bottom-nav` en `.bnav-*` CSS
3. Verwijder `moveNavIndicator()` functie en alle referenties
4. Verwijder `body` padding-bottom voor bottom nav
5. Sheet tabs: "Ontdek" | "Bewaard" | "Plan" (3 tabs, korte labels)
6. Sheet peek state: tabs altijd zichtbaar, direct onder de drag handle
7. Gear-icon in sheet header voor Info/Settings panel
8. Update `switchView` om sheet tabs te gebruiken

**Verificatie:**
- Mobile 390px: sheet peek toont search pill + tabs, geen bottom nav
- Alle 3 tabs werken
- Desktop: ongewijzigd (gebruikt top-nav mode switch)

### 1B. Sheet peek state herontwerp

**Wat:** De peek state wordt het primaire navigatie-oppervlak.

**Layout (top → bottom):**
```
[drag handle]
[search pill ─────────── filter icon]
[Regenproof] [Buiten+Koffie] [Dreumesproof]  ← preset chips, scroll
[Ontdek     |    Bewaard    |    Plan    ]     ← sheet tabs
```

**Cruciale CSS (Apple Maps-gevalideerd):**
```css
#bottom-sheet {
  background: var(--pp-sheet-bg);   /* #FFFCF9 — SOLIDE, geen backdrop-filter */
  border-radius: 12px 12px 0 0;    /* Apple: 12px, niet 20px */
  box-shadow: var(--pp-shadow-sheet);
  transform: translateZ(0);         /* GPU compositing hint */
  will-change: transform;
  overscroll-behavior-y: none;      /* voorkom iOS rubber-band */
  scrollbar-width: none;            /* verberg scrollbar */
  -webkit-overflow-scrolling: touch;
}

/* CSS custom property voor positie tracking — andere elementen reageren hierop */
:root {
  --sheet-position: 0;  /* JS zet dit tijdens drag/snap */
}

/* Voorbeeld: map controls positioneren relatief aan sheet */
.map-controls {
  bottom: calc(100svh - var(--sheet-position) * 1px - 16px);
}

/* Dragging state — disable transitions tijdens gesture */
#bottom-sheet.dragging {
  transition: none !important;
}
```

**Peek hoogte:** ~180px (search pill + presets + tabs)

**Verificatie:** iPhone SE (375x667): peek state toont alle elementen, kaart zichtbaar erboven.

---

## Fase 2 — Card Redesign

> Doel: kaarten van 20+ datapunten naar 5. Focus op scanability en tap-through.

### 2A. Scan Card design

**Anatomie:**
```
┌──────────────────────────────────┐
│ [FOTO ───────────────────] [♡]  │
│  Speeltuin                       │
├──────────────────────────────────┤
│ Artis                    12 min  │
│ "Perfect voor regenachtige dag"  │
└──────────────────────────────────┘
```

**5 elementen:** foto, hartje, naam+afstand, one-liner, type badge.

Alles anders (score breakdown, facilities, trust chips, action buttons, weather badge, leeftijdsindicatie) verplaatst naar detail-view.

**Card CSS (Apple Maps-gevalideerd):**
```css
.loc-card {
  background: var(--pp-surface);       /* wit, solide */
  border-radius: var(--pp-radius-md);  /* 12px */
  box-shadow: var(--pp-shadow-card);   /* rgba(0,0,0,0.024) 10px 1px 5px */
  transform: translateZ(0);            /* GPU compositing */
  transition: var(--pp-transition-card-mobile);
  content-visibility: auto;            /* off-screen cards niet renderen */
  contain-intrinsic-size: 200px;       /* geschatte hoogte voor layout stability */
}

/* Desktop hover */
@media (min-width: 769px) {
  .loc-card {
    transition: var(--pp-transition-card-desktop);
  }
  .loc-card:hover {
    transform: translateY(-2px) translateZ(0);
    box-shadow: var(--pp-shadow-raised);
  }
}
```

> **Nieuw t.o.v. oude plannen:** `content-visibility: auto` op cards al in Fase 2 (was Fase 5). Apple Maps doet dit op hun guide bricks.

**Stappen:**
1. Herschrijf `renderCard()` in templates.js: alleen 5 elementen
2. Foto: `object-fit: cover`, lazy loading, category fallback
3. Type badge: absolute positioned op foto, glass chip (`--pp-glass-badge`)
4. Hartje: absolute positioned, 44px tap target
5. Naam: `font-family: var(--pp-font-heading)`, `font-size: 17px`
6. One-liner: `font-size: 14px`, `color: var(--pp-text-secondary)`, `text-overflow: ellipsis`

**Verificatie:** 3-4 kaarten zichtbaar in sheet half-state. Tap op card opent detail view.

### 2B. Compact card voor sheet-lijst

**Anatomie:**
```
┌───────────────────────────────────────┐
│ [thumb] Artis              12 min [♡] │
│         Speeltuin · Buiten            │
└───────────────────────────────────────┘
```

- Horizontaal layout: 60x60px thumbnail links, content rechts
- Thumbnail: `border-radius: 10px` (Apple: 10px)
- `content-visibility: auto` met `contain-intrinsic-size: 72px`

### 2C. Detail view verrijken

**Wat:** Alle informatie die van de card verdwijnt, gaat naar de detail view. 3-tier progressive disclosure.

**Tier 1 — Direct zichtbaar:**
```
┌─────────────────────────────────┐
│ [Hero foto — vol breedte]       │
│ Museum Speelklok                │  22px bold
│ Museum · Utrecht · 2-12 jaar   │  14px secondary
│ 9.2 · Koffie · Verschonen      │
│ [Route]  [Website]  [Deel]     │
└─────────────────────────────────┘
```

**Tier 2 — Na kort scrollen:**
- "Waarom goed voor peuters" sectie
- "Handig om te weten" info grid

**Tier 3 — Achter "Meer details" toggle:**
- Score breakdown, verificatie, volledige beschrijving

**Detail transitions:**
```css
/* Detail view opent: sheet gaat naar full-state */
#bottom-sheet.full {
  border-radius: 12px 12px 0 0;
  transition: var(--pp-transition-sheet);
}

/* Foldable sections (Apple: 0.25s height + opacity) */
.detail-section.expandable {
  transition: height 0.25s ease-in-out, opacity 0.25s ease-in-out;
  overflow: hidden;
}
```

---

## Fase 3 — Filter UX Redesign

> Doel: Funda-geinspireerde filters met live resultaattelling, Apple Maps-stijl chips.

### 3A. Inline filter chips (Tier 1)

**Layout in sheet peek:**
```
[Regenproof] [Buiten+Koffie] [Dreumesproof] [Korte rit]  ← presets
[Alles] [Speeltuin] [Boerderij] [Natuur] [Museum] [...]   ← type filters
```

**Pill button CSS (Apple Maps exact):**
```css
.filter-chip {
  border: 1px solid var(--pp-text-tertiary);  /* Apple: var(--tertiary-label) */
  background-color: transparent;               /* Apple: rgba(0,0,0,0) */
  border-radius: 16px;                         /* Apple: 16px */
  padding: 6px 12px;                           /* Apple: 6px 12px */
  font-size: 0.9375rem;                        /* ~15px, Apple: 0.9412rem */
  font-family: inherit;
  color: var(--pp-text-primary);
  cursor: pointer;
  will-change: transform;                      /* Apple doet dit! */
  transition: var(--pp-transition-chip), transform 0.2s ease-out;
  display: flex;
  align-items: center;
  gap: 8px;
  outline: none;
  box-sizing: border-box;
}

.filter-chip[data-selected="true"],
.filter-chip.active {
  background: var(--pp-primary-light);
  border-color: var(--pp-primary);
  color: var(--pp-text-inverse);
}
```

**Stappen:**
1. Presets als primaire rij (boven type chips), horizontaal scrollbaar
2. Type chips als tweede scrollbare rij
3. Single filter implementation (weg met 3 losse filter-UIs)
4. Chip tapping triggers `bus.emit('filters:changed')` → locaties herladen

### 3B. "Meer filters" modal met live counts (Tier 2)

**Wat:** Button "Meer filters" opent bottom-sheet-style modal.

**Modal layout:**
```
┌─ Meer filters ──────────── x ─┐
│ Weer                           │
│ [Binnen (847)] [Buiten (1291)] │
│ Leeftijd                       │
│ [Dreumes (1420)] [Peuter (1718)]│
│ Faciliteiten                   │
│ [Koffie (892)] [Verschonen (634)]│
│ Afstand                        │
│ [5km] [10km] [15km] [30km]    │
│ ┌────────────────────────────┐ │
│ │   Toon 47 resultaten       │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

**Stappen:**
1. Modal als bottom sheet (slide-up)
2. Per filter-optie: live count (client-side op `state.allLocations`)
3. "Toon X resultaten" button met live count
4. Focus trap + `aria-modal="true"` + escape sluit
5. Badge op "Meer filters" knop bij actieve geavanceerde filters

**Modal transition (Apple Maps-stijl):**
```css
.filter-modal {
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
}
.filter-modal.open {
  transform: translateY(0);
}
/* Popover-achtige elementen (tooltips, kleine modals) krijgen de ENIGE overshoot curve */
.popover {
  transition: transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1.3),
              opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1.3);
}
```

**Verificatie:**
- Tap "Meer filters" → modal opent, counts kloppen
- Toggle filter → count update real-time
- "Toon X" → modal sluit, resultaten gefilterd

---

## Fase 4 — Visual Polish

> Doel: de visuele identiteit verfijnen op basis van Apple Maps-gevalideerde specificaties. GEEN backdrop-filter op sheet/cards. GEEN motion/mini dependency.

### 4A. Mobile: solid sheet + selective glass

**Wat:** Sheet is solide. Alleen kleine floating controls krijgen glaseffect.

```css
/* Sheet — SOLIDE (Apple Maps heeft geen backdrop-filter op de card) */
#bottom-sheet {
  background: var(--pp-sheet-bg);  /* #FFFCF9 */
  backdrop-filter: none;
}

/* Search pill — klein element, glass OK */
.search-pill {
  background: var(--pp-glass-control);  /* rgba(255, 248, 240, 0.85) */
  backdrop-filter: var(--pp-blur-control);  /* blur(10px) */
  border-radius: var(--pp-radius-md);  /* 12px */
}

/* Filter chips op kaart overlay — glass OK */
.map-filter-overlay .filter-chip {
  background: var(--pp-glass-chip);
  backdrop-filter: var(--pp-blur-control);
}

/* Type badge op foto — glass OK */
.type-badge {
  background: var(--pp-glass-badge);
  backdrop-filter: blur(6px);
  border-radius: var(--pp-radius-lg);  /* 16px */
}

/* Reduced transparency fallback */
@media (prefers-reduced-transparency: reduce) {
  .search-pill,
  .map-filter-overlay .filter-chip,
  .type-badge {
    backdrop-filter: none;
    background: var(--pp-surface-warm);
  }
}

/* Reduced motion fallback */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.15s !important;
  }
}
```

> **VERWIJDERD t.o.v. `plan-warm-glass-redesign.md`:**
> - Backdrop-filter op de sheet (`blur(20px)` + `rgba(250, 247, 242, 0.78)`)
> - "Disable backdrop-filter during drag" hack — niet meer nodig want sheet heeft geen blur
> - Glass levels tabel (light/medium/heavy/overlay) — te granullair, niet wat Apple doet

### 4B. Desktop: solid sidebar + glass nav

**Wat:** Desktop sidebar/cards krijgen solide achtergrond (zoals Apple Maps). Alleen de nav bar krijgt glaseffect.

```css
/* Desktop sidebar — SOLIDE (Apple Maps: rgb(242,242,242) op card, geen blur) */
@media (min-width: 769px) {
  .desktop-sidebar {
    width: 420px;               /* Apple: 420px (+ 20px padding = 440px totaal) */
    background: var(--pp-surface-warm);
    backdrop-filter: none;
    padding-right: 20px;
    position: absolute;
    left: 0;                    /* map is FULL WIDTH, sidebar drijft erboven */
    transition: var(--pp-transition-sidebar);
  }

  /* Desktop nav bar — WEL glass (Apple: blur(50px)) */
  .desktop-nav {
    backdrop-filter: var(--pp-blur-nav);  /* blur(50px) */
    background: var(--pp-glass-desktop-nav);
  }
}
```

> **Correctie:** `plan-warm-glass-redesign.md` specificeerde `rgba(255, 242, 229, 0.88)` + `blur(14px)` op de sidebar. Apple Maps doet dit NIET — de card heeft een solide achtergrond.

### 4C. Animaties en transitions

**Wat:** Apple Maps-achtige vloeiende overgangen met standaard CSS easing.

| Transitie | Specificatie | Apple Maps referentie |
|-----------|-------------|----------------------|
| Sheet state change | `transform 0.3s ease-in-out` | Mobile card: `0.3s ease-in-out` |
| Desktop panel slide | `left 0.25s ease-in-out` | Sidebar: `0.25s ease-in-out` |
| Card hover (desktop) | `transform 0.15s ease-out, box-shadow 0.15s ease-out` | Card: `0.15s ease-out` |
| Filter chip activate | `background-color 0.15s ease-out, border-color 0.15s ease-out` | — |
| Search expand | `width 0.3s ease-out, border-radius 0.3s ease-out` | — |
| Image fade-in | `opacity 0.3s linear` | Apple: `0.3s linear` |
| Popover/tooltip | `transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1.3)` | Apple's ENIGE overshoot |
| Foldable sections | `height 0.25s ease-in-out, opacity 0.25s ease-in-out` | Apple: `0.25s` |
| Search results | `opacity 0.14s ease-out` | Apple: `0.14s ease-out` |

**Tap feedback keyframe (Apple Maps patroon):**
```css
@keyframes card-activate {
  0% { transform: scale(1) translateZ(0); }
  50% { transform: scale(0.97) translateZ(0); }
  100% { transform: scale(1) translateZ(0); }
}

.loc-card:active {
  animation: card-activate 0.15s ease-out;
}
```

---

## Fase 5 — Desktop Refinement

> Doel: desktop-specifieke verbeteringen voor de 2-kolom layout.

### Desktop layout (Apple Maps-gevalideerd)

```
┌────────────────────┬───────────────────────────────────────┐
│ Nav / controls     │                                       │
│ (top bar)          │              MAP                      │
├────────────────────┤         (full viewport width,         │
│ Sidebar            │          achter sidebar)              │
│ (420px + 20px pad) │                                       │
│                    │     [zoom] [compass] [recenter]       │
│ [Search pill]      │     (z-index: 3, glass controls)      │
│ [Filter chips]     │                                       │
│                    │                                       │
│ ── Resultaten ──   │                                       │
│ [Card]             │                                       │
│ [Card]             │                                       │
│ [Card]             │                                       │
└────────────────────┴───────────────────────────────────────┘
```

> **Verschil met Apple Maps:** Apple's sidebar is leeg bij start (content verschijnt bij zoeken). Wij tonen altijd resultaten — bewuste afwijking voor discovery UX.

### 5A. Panel collapse toggle

**Wat:** Chevron-knop op de list panel waarmee gebruikers het panel inklappen.

**Stappen:**
1. Chevron-knop (`<` / `>`) aan rechterrand van panel
2. Click → panel schuift uit met `transform: translateX(-100%)`
3. Kaart neemt full-width
4. State opslaan in localStorage
5. Animatie: `transform 0.3s ease-in-out`

### 5B. Desktop card hover ↔ map sync

**Wat:** Hover op card highlight de marker op de kaart, en vice versa.

**Stappen:**
1. `mouseenter` op card → `bus.emit('card:hover', locationId)`
2. Map module highlight marker (schaal + kleur)
3. Click op marker → `bus.emit('map:markerclick', locationId)` → scroll naar card

---

## Fase 6 — Testing Infrastructure

> Doel: robuuste QA pipeline zodat elke fase verifieerbaar is.

### 6A. Visual QA skill

**Wat:** `/visual-qa` als volledige visuele QA pass.

### 6B. Playwright regression tests

- 2 projecten: mobile-chrome (iPhone 14) + desktop-chrome (1280x800)
- `disable-animations.css`: `* { animation: none !important; transition: none !important; }`
- `toHaveScreenshot()` met `maxDiffPixelRatio: 0.01`

### 6C. Accessibility audit

- axe-core integratie
- Focus: sheet tabs als `role="tablist"`, kaarten als `role="article"`, modals met focus trap

---

## Fase-volgorde & afhankelijkheden

```
Fase 0A (esbuild)           ─── KLAAR
Fase 0B (CSS @layer)         ─┐
Fase 6A (QA skill)           ─┘  parallel, geen afhankelijkheden

Fase 0C (EventBus)          ─── na 0B (tokens opgeschoond)
Fase 0D (templates.js)      ─── na 0C (gebruikt bus events)
Fase 0E (switchView refactor)── na 0C

Fase 1A (bottom nav weg)    ─── na 0E (switchView opgeschoond)
Fase 1B (sheet peek redesign)── na 1A

Fase 2A (scan cards)         ─── na 0D (templates.js bestaat)
Fase 2B (compact cards)      ─── na 2A
Fase 2C (detail view)        ─── na 2A

Fase 3A (inline filter chips)── na 0C (bus events)
Fase 3B (filter modal)       ─── na 3A

Fase 4A (mobile solid+glass) ─── na 1B + 2A (sheet + cards staan)
Fase 4B (desktop solid+glass)─── na 4A
Fase 4C (animaties)          ─── na 4A + 4B

Fase 5A (panel collapse)     ─── na 4B (desktop staat)
Fase 5B (hover sync)         ─── na 0C (bus events)

Fase 6B (Playwright tests)   ─── na fase 2 (baseline zinvol)
Fase 6C (accessibility)      ─── na fase 3 (modals af)
```

## Geschatte doorlooptijd

| Fase | Onderdelen | Sessies* |
|------|-----------|----------|
| 0 | Architectuur fundament (B-E, A is klaar) | 2-3 |
| 1 | Sheet-first navigation | 1-2 |
| 2 | Card redesign | 2-3 |
| 3 | Filter UX | 1-2 |
| 4 | Visual polish | 1-2 |
| 5 | Desktop refinement | 1 |
| 6 | Testing infrastructure | 1 |
| **Totaal** | | **9-14 sessies** |

*Een sessie = een Claude Code conversatie met /clear tussendoor.

---

## Appendix A: Performance Hints (Apple Maps-gevalideerd)

Deze CSS patterns zijn gevalideerd in Apple Maps en moeten consistent worden toegepast:

```css
/* Op het sheet element */
#bottom-sheet {
  transform: translateZ(0);           /* GPU compositing */
  will-change: transform;
  overscroll-behavior-y: none;        /* voorkom iOS bounce */
  scrollbar-width: none;              /* verberg scrollbar */
  -webkit-overflow-scrolling: touch;
}

/* Op cards (off-screen optimalisatie) */
.loc-card {
  content-visibility: auto;           /* Apple doet dit op guide bricks */
  contain-intrinsic-size: 200px;      /* voorkom layout shift */
  transform: translateZ(0);           /* GPU compositing */
}

/* Op pill buttons */
.filter-chip {
  will-change: transform;             /* Apple doet dit! */
}

/* Dragging state — disable transitions */
#bottom-sheet.dragging {
  transition: none !important;
}
#bottom-sheet.dragging * {
  pointer-events: none;
}

/* CSS custom property voor positie tracking */
:root {
  --sheet-position: 0;  /* JS update dit continu tijdens drag/snap */
}
```

---

## Appendix B: Apple Maps vs PeuterPlannen Token Vergelijking

| Token | Apple Maps (exact) | PeuterPlannen | Afwijking |
|-------|-------------------|---------------|-----------|
| Sheet border-radius | `12px 12px 0 0` | `12px 12px 0 0` | Gelijk |
| Sheet background | `rgb(242,242,242)` (solide) | `#FFFCF9` (solide, warm) | Bewust warmer |
| Sheet backdrop-filter | `none` | `none` | Gelijk |
| Sheet transition | `0.3s ease-in-out` | `0.3s ease-in-out` | Gelijk |
| Card shadow | `rgba(0,0,0,0.024) 10px 1px 5px` | `rgba(0,0,0,0.024) 10px 1px 5px` | Gelijk |
| Card border-radius | `12px` | `12px` | Gelijk |
| Card GPU hint | `translateZ(0)` | `translateZ(0)` | Gelijk |
| Pill button radius | `16px` | `16px` | Gelijk |
| Pill button padding | `6px 12px` | `6px 12px` | Gelijk |
| Pill button font-size | `0.9412rem` (~15px) | `0.9375rem` (~15px) | Verwaarloosbaar |
| Pill button bg | `transparent` | `transparent` | Gelijk |
| Photo thumbnail radius | `10px` | `10px` | Gelijk |
| Desktop sidebar width | `420px` (+20px pad) | `420px` (+20px pad) | Gelijk |
| Desktop nav blur | `blur(50px)` | `blur(50px)` | Gelijk |
| Search dropdown blur | `blur(15px)` | `blur(15px)` | Gelijk |
| Font family | SF Pro (system) | Fraunces + DM Sans | Bewust anders |
| Search font-size | `17px` | `17px` | Gelijk |
| Image fade-in | `0.3s linear` | `0.3s linear` | Gelijk |
| Popover curve | `cubic-bezier(0.25,0.1,0.25,1.3)` | `cubic-bezier(0.25,0.1,0.25,1.3)` | Gelijk |
| Card desktop transition | `0.15s ease-out` | `0.15s ease-out` | Gelijk |
| Bottom nav | Geen | Geen | Gelijk |
| Spring animations | Geen | Geen | Gelijk |
| content-visibility | `auto` op off-screen items | `auto` op off-screen cards | Gelijk |
| overscroll-behavior-y | `none` | `none` | Gelijk |

---

## Appendix C: Wat We Bewust Afwijken Van Apple Maps (en waarom)

### 1. Fonts: Fraunces + DM Sans i.p.v. SF Pro
**Waarom:** SF Pro is Apple's system font — het zou onze app als een Apple Maps kopie laten aanvoelen. Fraunces (headings) geeft warmte, DM Sans (body) is neutraal leesbaar. Dit is ons merk.

### 2. Warm kleurpalet (#FFFCF9, koraal) i.p.v. neutrale grijs
**Waarom:** Apple Maps is koel en functioneel. PeuterPlannen moet warm en uitnodigend voelen voor ouders. De warme achtergrondkleur en koraal accenten zijn merkonderscheidend.

### 3. 3 detents i.p.v. 6 posities
**Waarom:** Apple Maps heeft 6 tray posities voor hun complexe navigatie (guides, directions, search, place cards). Wij hebben een eenvoudiger use case: ontdek locaties, bekijk details. Peek/half/full is voldoende. Minder complexiteit = minder bugs.

### 4. Transform-based sheet i.p.v. scroll-container
**Waarom:** Apple Maps gebruikt een `overflow: scroll` container waar JS de scroll positie trackt. Onze huidige sheet-engine gebruikt `transform: translateY()` met touch events. De transform-aanpak werkt, is makkelijker te debuggen, en is dichter bij wat `pure-web-bottom-sheet` en de meeste open-source sheet libraries doen. Een rewrite is te risicovol.

### 5. Desktop sidebar toont altijd resultaten (Apple start leeg)
**Waarom:** Apple Maps is een navigatie-tool — gebruikers komen met een specifiek doel. PeuterPlannen is een discovery-tool — ouders browsen. Lege sidebar zou onze core UX breken.

### 6. Filter chips in sheet peek (Apple heeft categorie-tegels anders)
**Waarom:** Apple Maps toont "Find Nearby" categorie-tegels (Petrol, Restaurants, etc.) als vierkante knoppen. Wij gebruiken horizontaal scrollbare chips — compacter en geschikt voor onze specifiekere filtercombinaties (Regenproof, Dreumesproof, etc.).

### 7. Desktop kaart NAAST sidebar (niet erachter)
**Waarom:** Apple Maps' kaart is full-width met de sidebar die erbovenop drijft. Dit werkt omdat hun sidebar transparent kan zijn (solide card, maar dunne nav bar). Onze sidebar is dichter — de kaart naast de sidebar plaatsen geeft meer zichtbare kaartruimte zonder overlap. We overwegen Apple's full-width approach in een latere iteratie.

---

## Appendix D: Verwijderd Uit Plan (onderzoek bewees het onnodig)

### 1. `motion/mini` dependency (2.3kb CDN)
**Reden voor verwijdering:** Apple Maps gebruikt GEEN spring physics. Alle animaties zijn standaard CSS `ease-out` of `ease-in-out`. De enige "overshoot" is `cubic-bezier(0.25, 0.1, 0.25, 1.3)` op popovers — dat is pure CSS, geen library nodig.

### 2. Spring parameter tabel
```
VERWIJDERD:
| Animatie       | Stiffness | Damping | Mass |
| Sheet snap     | 300       | 30      | 1    |
| Sheet bounce   | 200       | 15      | 1    |
| Marker select  | 400       | 20      | 0.8  |
| Tab indicator  | 250       | 25      | 1    |
| Card press     | 500       | 35      | 1    |
| Modal enter    | 200       | 20      | 1    |
```
**Reden:** Onnodig. Apple Maps bereikt vloeiende animaties met standaard CSS easing.

### 3. Custom cubic-bezier sheet curve
```
VERWIJDERD: --wg-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)
VERVANGEN: --pp-ease-sheet: ease-in-out
```
**Reden:** Apple Maps gebruikt gewoon `ease-in-out` voor sheet transitions. De custom curve was een overbodige optimalisatie.

### 4. Backdrop-filter op sheet
```
VERWIJDERD: backdrop-filter: blur(20px) op #bottom-sheet
```
**Reden:** Apple Maps heeft GEEN backdrop-filter op de sheet/card. De achtergrond is solide. Dit bespaart ook de "disable backdrop-filter during drag" performance hack.

### 5. Reactive store (store.js)
```
VERWIJDERD: createStore() met get/set/subscribe
```
**Reden:** De EventBus (bus.js) uit plan.md is eenvoudiger en voldoende. Geen need voor een reactive store wanneer pub/sub volstaat.

### 6. Glasmorfisme oppervlakken tabel
```
VERWIJDERD: Tabel met 8 elementen × glass levels (light/medium/heavy/overlay)
```
**Reden:** Apple Maps past backdrop-filter alleen toe op kleine floating controls en de desktop nav bar. De uitgebreide glass-level tabel uit `plan-warm-glass-redesign.md` was overspecified.

---

## Verificatie per fase

Elke fase eindigt met:
1. `npm test` — alle bestaande tests groen
2. `npm run test:e2e` — volledige e2e test suite
3. `/visual-qa` — visuele QA pass met Playwright screenshots
4. Git commit met beschrijvende message
5. CI build groen + deploy naar productie
6. HANDOFF.md updaten voor volgende sessie

### 8 Critical Flows (must pass per fase)

1. **Sheet drag cycle:** peek → half → full → half → peek (smooth, no jank)
2. **Search flow:** tap pill → type → select suggestion → resultaat zichtbaar
3. **Filter flow:** select chip → resultaten updaten → reset → originele staat
4. **Location detail:** tap card → detail opent → scroll → route link werkt → terug
5. **Map interaction:** pan, zoom, tap marker → preview, recenter button
6. **Navigation:** alle tabs doorlopen → juiste view per tab
7. **Offline:** airplane mode → offline banner → reconnect → data laadt
8. **Desktop responsive:** resize 390px → 768px → 1280px → geen layout breaks
