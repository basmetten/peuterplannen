# PeuterPlannen — Warm Glass Redesign

**Status:** PLAN — wacht op goedkeuring Bas
**Datum:** 20 maart 2026
**Scope:** Frontend redesign van app.html (statische SEO-pagina's niet beïnvloed)
**Ambitie:** Apple Maps webapp kwaliteitsniveau, maar dan warm en uitnodigend

---

## 1. Visie

PeuterPlannen moet aanvoelen als een **warme, premium kaart-app** die ouders vertrouwen geeft. Niet koud en zakelijk zoals Apple Maps, maar ook niet rommelig en overloaded zoals de huidige versie (UX audit: 6/10).

**Design DNA:** "Warm Liquid Glass" — Apple Maps' glasmorfisme maar dan met crème, koraal en terracotta tinten. Elke interactie voelt vloeiend, elk oppervlak ademt.

**Kernprincipes:**
1. **Map-first** — de kaart is altijd zichtbaar, UI drijft erboven als glas
2. **Progressive disclosure** — toon weinig, onthul meer op verzoek
3. **Native feel** — spring animations, rubber-banding, velocity-based gestures
4. **Warm restraint** — minder is meer, maar wat er is voelt premium

---

## 2. Framework-beslissing

### Aanbeveling: Vanilla JS + motion/mini (geen build step)

De huidige vanilla stack is een **concurrentievoordeel**, niet een beperking. Geen build step = snelste mogelijk deploy, geen tooling-onderhoud, directe debugging. We bouwen hierop voort.

**Toevoegingen:**
- **motion/mini** (2.3kb) via CDN — geen npm, geen build step:
  ```html
  <script type="module">
    import { animate, spring } from 'https://esm.sh/motion/mini';
  </script>
  ```
- **CSS `linear()` timing function** voor spring curves in pure CSS animaties
- **Simpele reactive store** (~20 regels) om geleidelijk `window._pp_modules` te vervangen:
  ```js
  // store.js — tiny reactive store, replaces window._pp_modules over time
  function createStore(initial) {
    let state = { ...initial };
    const listeners = new Set();
    return {
      get: (key) => state[key],
      set: (key, val) => { state[key] = val; listeners.forEach(fn => fn(key, val)); },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
  }
  export const store = createStore({ sheet: 'peek', view: 'discover', filters: [] });
  ```

**Waarom geen framework:**
- Zero build step is sneller dan elke framework pipeline
- Geen dependency upgrades, geen breaking changes, geen toolchain debugging
- `motion/mini` geeft ons spring physics zonder framework overhead
- Web Components voor eventueel herbruikbare elementen
- De huidige codebase is 100% vanilla — migratie zou weken kosten zonder UX-winst

---

## 3. Design System: Warm Glass Tokens

> `warm-glass-tokens.css` is **additief** — het vervangt `design-system.css` niet maar bouwt erop voort. Alle tokens zijn CSS custom properties, gestructureerd zodat toekomstige dark mode alleen waarden hoeft te overriden.

### 3.1 Kleuren (warm getint, matcht bestaand --pp-bg)

```css
:root {
  /* Glass surfaces — warm tinted, matching --pp-bg (#FAF7F2) */
  --wg-glass-light: rgba(250, 247, 242, 0.78);      /* panels, sidebar */
  --wg-glass-medium: rgba(250, 247, 242, 0.60);      /* bottom sheet */
  --wg-glass-heavy: rgba(250, 247, 242, 0.92);       /* search bar, controls */
  --wg-glass-overlay: rgba(250, 247, 242, 0.95);     /* full sheet, modals */

  /* Blur levels — conservative, test on real iPhone before increasing */
  --wg-blur-panel: blur(20px) saturate(150%);         /* large surfaces */
  --wg-blur-control: blur(10px) saturate(150%);       /* small controls */
  --wg-blur-overlay: blur(20px) saturate(120%);       /* modals, overlays */
  /* NOTE: disable backdrop-filter during drag gestures (existing pattern in glass.css)
     to prevent jank on lower-end iOS devices */

  /* Borders (Apple Maps: extremely subtle) */
  --wg-border-subtle: 1px solid rgba(180, 140, 110, 0.12);
  --wg-border-medium: 1px solid rgba(180, 140, 110, 0.20);

  /* Brand colors — behoud bestaand warm palet */
  --wg-primary: #D47756;           /* terracotta/koraal */
  --wg-primary-light: #E8956F;
  --wg-primary-dark: #B85E3D;
  --wg-accent: #4A7A4A;            /* groen voor scores */

  /* Text — warm grays (niet Apple's koude grays) */
  --wg-text: #2D2926;
  --wg-text-secondary: rgba(60, 45, 38, 0.60);
  --wg-text-tertiary: rgba(60, 45, 38, 0.30);
  --wg-text-inverse: #FFFBF7;

  /* Backgrounds */
  --wg-bg: #FAF7F2;               /* identical to --pp-bg */
  --wg-surface: #FFFFFF;
  --wg-surface-warm: #FFFBF7;

  /* Shadows (Apple Maps dual-layer pattern) */
  --wg-shadow-raised: 0 2px 4px rgba(60, 40, 20, 0.08), 0 2px 12px rgba(60, 40, 20, 0.04);
  --wg-shadow-elevated: 0 2px 8px rgba(60, 40, 20, 0.10), 0 2px 16px rgba(60, 40, 20, 0.06);
  --wg-shadow-floating: 0 2px 8px rgba(60, 40, 20, 0.12), 0 8px 24px rgba(60, 40, 20, 0.08);

  /* === Dark mode prep: override these in @media (prefers-color-scheme: dark) later === */
}
```

### 3.2 Typografie

Behoud de bestaande **Fraunces + DM Sans** font stack en fluid `clamp()` schaal uit `design-system.css`. We voegen alleen line-height tokens toe:

```css
:root {
  /* Font stack — keep existing Fraunces + DM Sans */
  --wg-font: var(--pp-font-ui);         /* 'DM Sans', fallbacks */
  --wg-font-display: var(--pp-font-heading);  /* 'Fraunces', fallbacks */

  /* Fluid type scale — reference existing design-system.css clamp() values */
  --wg-text-xs:   var(--pp-text-xs);     /* clamp(0.75rem, ...) */
  --wg-text-sm:   var(--pp-text-sm);     /* clamp(0.8125rem, ...) */
  --wg-text-base: var(--pp-text-base);   /* clamp(0.9375rem, ...) */
  --wg-text-lg:   var(--pp-text-lg);     /* clamp(1.0625rem, ...) */
  --wg-text-xl:   var(--pp-text-xl);     /* clamp(1.25rem, ...) */
  --wg-text-2xl:  var(--pp-text-2xl);    /* clamp(1.5rem, ...) */
  --wg-text-3xl:  var(--pp-text-3xl);    /* clamp(2rem, ...) */

  /* Line heights */
  --wg-leading-tight: 1.2;    /* headings */
  --wg-leading-normal: 1.5;   /* body text */
  --wg-leading-relaxed: 1.65; /* long-form content */
  --wg-leading-none: 1;       /* single-line labels */

  /* Weights */
  --wg-weight-normal: 400;
  --wg-weight-medium: 500;
  --wg-weight-semibold: 600;
  --wg-weight-bold: 700;

  /* Letter spacing */
  --wg-tracking-tight: -0.3px;
  --wg-tracking-normal: 0;
  --wg-tracking-wide: 0.2px;
}
```

### 3.3 Spacing (Apple 4px grid)

```css
:root {
  --wg-sp-2: 2px;
  --wg-sp-4: 4px;
  --wg-sp-8: 8px;
  --wg-sp-12: 12px;
  --wg-sp-16: 16px;
  --wg-sp-20: 20px;   /* Apple Maps' meest gebruikte padding */
  --wg-sp-24: 24px;
  --wg-sp-32: 32px;
  --wg-sp-48: 48px;
  --wg-sp-64: 64px;
}
```

### 3.4 Radii (Apple Maps waarden)

```css
:root {
  --wg-radius-sm: 8px;
  --wg-radius-md: 12px;    /* standaard — controls, cards, search */
  --wg-radius-lg: 16px;    /* platter containers */
  --wg-radius-xl: 20px;    /* bottom sheet top corners */
  --wg-radius-pill: 100px;
  --wg-radius-circle: 50%;
}
```

### 3.5 Animaties (Apple Maps timing)

```css
:root {
  /* Durations */
  --wg-duration-fast: 100ms;
  --wg-duration-normal: 150ms;
  --wg-duration-slow: 300ms;
  --wg-duration-sheet: 400ms;

  /* Easing curves */
  --wg-ease-default: cubic-bezier(0.12, 0.55, 0.19, 1);
  --wg-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);      /* overshoot */
  --wg-ease-heavy-in: cubic-bezier(0.03, 0, 0.31, 1);
  --wg-ease-heavy-out: cubic-bezier(0.64, 0, 0.85, 1);
  --wg-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
}
```

---

## 4. Component Redesign

### 4.0 Component Inventory

Alle bestaande UI-componenten met disposities:

| Component | Dispositie | Opmerkingen |
|-----------|-----------|-------------|
| Bottom sheet (incl. tabs) | **Polish** | Huidige engine werkt, spring animations + glass toevoegen |
| Search pill / bar | **Redesign** | Apple Maps expanderende zoekbalk |
| Filter chips | **Polish** | Betere :active states, scroll indicator |
| Location detail panel | **Redesign** | 3-tier progressive disclosure |
| Location cards (lijst) | **Polish** | Glass treatment, betere spacing |
| Map markers + clusters | **Polish** | Grotere size-variatie, spring bounce |
| Bottom navigation (5 tabs) | **Polish** | Houd 5 tabs inclusief Info, glass background |
| Desktop sidebar | **Polish** | Glass panel, 440px |
| Cookie banner | **Keep** | Wettelijk vereist, minimale styling update |
| Offline banner | **Keep** | Functioneel, glass treatment toevoegen |
| GPS onboarding modal | **Polish** | Glass overlay styling |
| Shortlist bar | **Polish** | Glass treatment |
| Weather banner | **Polish** | Integreer in sheet peek state |
| Decision stage presets | **Polish** | Compacter op desktop |
| Newsletter form | **Keep** | Minimale styling update |
| Sort dropdown | **Polish** | Glass dropdown styling |
| Active filters bar | **Polish** | Consistente chips styling |
| Info panel / tab | **Keep** | Blijft in bottom nav — verwijderen is discoverability regressie |
| Plan wizard | **Polish** | Glass overlay styling |
| App mode switch | **Keep** | Eventueel subtielere styling |
| Toast system | **Polish** | Glass treatment |
| Map filters overlay | **Redesign** | Integreer met vernieuwde filter chips |
| Shared shortlist | **Keep** | Minimale styling update |
| Lijst FAB | **Remove** | Bottom nav tabs vervullen deze functie |
| Top navbar (mobile) | **Remove** | 60px ruimtewinst, logo subtiel in sheet header |

### 4.1 Bottom Sheet (polish, geen engine rewrite)

De huidige sheet engine **werkt** — een volledige rewrite is te risicovol en te tijdrovend. We polishen wat er is:

**Toevoegingen:**
- Spring physics via `motion/mini` voor snap-animaties
- Glass background met warm tint tokens
- Verfijnde rubber-band effect bij over-drag
- `will-change: transform` op sheet element
- Floating met rounded corners bij peek/half, edge-to-edge bij full

**Bestaand behouden:**
- 3-detent systeem (peek/half/full)
- Gesture tracking en velocity-based snapping
- Content scroll lock mechanisme

**Sheet tabs vs. bottom nav overlap:** Sheet tabs (Ontdek/Kaart/Opgeslagen/Plan/Info) en bottom nav zijn dubbele navigatie. Oplossing: bottom nav is de primaire navigatie, sheet tabs worden content-tabs binnen elke view (bijv. "Lijst" / "Week picks" / "In de buurt" binnen Ontdek).

```
PEEK (140px):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  Zoek een uitje...      │  glass pill
│  12° · 2138 uitjes      │
└─────────────────────────┘
  floating, radius: 20px, margin: 8px

HALF (~50vh):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  Zoek een uitje...      │
│  [Alles][Speeltuin]...  │  filter chips
│                         │
│  ── Deze week ────────  │
│  [Nijntje Museum][NEMO] │  horizontale scroll
│                         │
│  ── In de buurt ──────  │
│  Museum Speelklok       │
│  Dignita Hoftuin        │
└─────────────────────────┘
  floating, radius: 20px top, margin: 8px sides

FULL (~92vh):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  Zoek een uitje...      │
│  [Alles][Speeltuin]...  │
│                         │
│  ── scrollable list ──  │  nu pas scrollbaar
│  Museum Speelklok       │
│  Dignita Hoftuin        │
│  ... 2136 meer          │
└─────────────────────────┘
  edge-to-edge, radius: 20px top only
```

### 4.2 Glasmorfisme Oppervlakken

Elk UI-element dat boven de kaart drijft krijgt glass treatment:

| Element | Glass level | Blur | Achtergrond |
|---------|-------------|------|-------------|
| Bottom sheet | medium | 20px | rgba(250,247,242, 0.78) |
| Search pill | heavy | 10px | rgba(250,247,242, 0.92) |
| Map controls (zoom, recenter) | heavy | 10px | rgba(250,247,242, 0.80) |
| Filter chips container | light | 20px | rgba(250,247,242, 0.60) |
| Location preview card | heavy | 10px | rgba(250,247,242, 0.92) |
| Bottom nav | heavy | 20px | rgba(250,247,242, 0.85) |
| Desktop sidebar | heavy | 20px | rgba(250,247,242, 0.85) |
| Modals/overlays | overlay | 20px | rgba(250,247,242, 0.95) |

### 4.3 Zoekervaring

**Huidig:** Pill met "Zoek & filter..." → tik → sheet gaat naar half met filter chips.

**Nieuw Apple Maps-stijl:**

1. **Idle:** Glass pill op de sheet met "Zoek een uitje of plaats..."
2. **Focus:** Pill expandeert smooth naar volledige zoekbalk. Keyboard opent. Recent searches verschijnen.
3. **Typing:** Live suggesties (locatienamen + steden) in een dropdown
4. **Cancel:** "Annuleren" tekst-knop rechts (Apple Maps patroon). Tik → terug naar pill.

```
Idle:      [Zoek een uitje...              ]
Focus:     [amsterda|                      ] [Annuleer]
           ┌──────────────────────────────┐
           │ Amsterdam                     │
           │ Amstelpark Amsterdam          │
           │ ARTIS Amsterdam               │
           └──────────────────────────────┘
```

### 4.4 Locatie Detail (progressive disclosure)

**Huidig probleem:** 12+ secties, overweldigend.

**Nieuw: 3-tier progressive disclosure (Apple Maps style)**

```
TIER 1 — Direct zichtbaar:
┌─────────────────────────────────┐
│ [Hero foto — vol breedte]       │
│                                 │
│ Museum Speelklok                │  22px bold
│ Museum · Utrecht · 2-12 jaar   │  14px secondary
│ 9.2 · Koffie · Verschonen      │
│                                 │
│ [Route]  [Website]  [Deel]     │
└─────────────────────────────────┘

TIER 2 — Na kort scrollen:
┌─────────────────────────────────┐
│ Waarom goed voor peuters        │  20px semibold
│ - Muziekinstrumenten op         │
│   kruiphoogte                   │
│ - Verschoontafel aanwezig       │
│                                 │
│ Handig om te weten              │
│ ┌───────────┬────────────────┐  │
│ │ Weer      │ Binnen & buiten│  │
│ │ Parkeren  │ Betaald        │  │
│ │ Drukte    │ Weekend druk   │  │
│ └───────────┴────────────────┘  │
└─────────────────────────────────┘

TIER 3 — Achter "Meer details" toggle:
┌─────────────────────────────────┐
│ > Score breakdown               │
│ > Verificatie & betrouwbaarheid │
│ > Volledige beschrijving        │
└─────────────────────────────────┘
```

### 4.5 Kaartinteractie

- Markers: koraal cirkels met witte rand, geselecteerde marker krijgt `scale(1.3)` + spring bounce
- Clusters: grotere size-variatie (Apple Maps schaalt dramatischer)
- FlyTo: `duration: 800ms` met `ease-default` curve
- Recenter FAB: 44x44 cirkel, glass background, alleen icoon (geen tekst)
- Marker tap → sheet gaat naar half met preview card (al geïmplementeerd, polish nodig)

### 4.6 Bottom Navigation

**Huidig:** 5 tabs (Ontdek, Kaart, Favorieten, Plan, Info)
**Nieuw:** Houd 5 tabs, hernoemd.

```
┌──────────────────────────────────┐
│  Ontdek   Kaart  Opgeslagen  Plan  Info │
└──────────────────────────────────┘
```

- **Info tab blijft** — verwijderen is een discoverability regressie (gebruikers verwachten het daar)
- Filled icons voor actieve tab (Apple Maps patroon)
- Glasmorfisme achtergrond op de nav bar
- Indicator-pill animatie behouden (is al goed)
- "Favorieten" hernoemd naar "Opgeslagen"

### 4.7 Desktop Layout

```
┌────────────────────┬──────────────────────────────┐
│ Glass sidebar      │                              │
│ (440px, blur:20px) │         MAP                  │
│                    │                              │
│ Zoek...            │                              │
│                    │                              │
│ [Presets]          │     [zoom] [recenter]        │
│                    │     (glass controls)         │
│ ── Resultaten ──   │                              │
│ [Card] [Card]      │                              │
│ [Card] [Card]      │                              │
└────────────────────┴──────────────────────────────┘
```

- Sidebar: `backdrop-filter: blur(20px) saturate(150%)`, warm glass achtergrond
- Breedte: 440px
- Cards in 1-kolom lijst
- Hover op card → marker highlight op kaart
- Click op card → detail panel schuift in van rechts

### 4.8 Verwijderingen

- **Lijst FAB** — bottom nav tabs vervullen deze functie
- **Top navbar op mobile** — 60px ruimtewinst, logo subtiel in sheet header

---

## 5. Interactie & Animatie Specificaties

### 5.1 Spring Parameters

| Animatie | Stiffness | Damping | Mass | Via |
|----------|-----------|---------|------|----|
| Sheet snap | 300 | 30 | 1 | motion/mini |
| Sheet bounce (overshoot) | 200 | 15 | 1 | motion/mini |
| Marker select | 400 | 20 | 0.8 | CSS spring() |
| Tab indicator slide | 250 | 25 | 1 | motion/mini |
| Card press feedback | 500 | 35 | 1 | CSS :active |
| Modal enter | 200 | 20 | 1 | motion/mini |

### 5.2 Gesture Handling

```
Touch start → track position
Touch move  → update transform (requestAnimationFrame)
              disable backdrop-filter during drag (prevent jank)
Touch end   → calculate velocity (dx / dt)
              if velocity > threshold → spring to next detent
              else → spring to nearest detent
              re-enable backdrop-filter after settle

Rubber-band: if dragging past bounds,
  displacement = offset * (1 - 1 / (offset * 0.005 + 1))
  (logarithmic resistance, Apple's formule)
```

### 5.3 Transitie-specificaties

| Transitie | Duur | Curve | Eigenschap |
|-----------|------|-------|------------|
| Sheet state change | 400ms | ease-sheet | transform |
| Filter chip select | 150ms | ease-default | background, color |
| Card hover (desktop) | 150ms | ease-default | box-shadow, transform |
| Search expand | 300ms | ease-default | width, border-radius |
| Tab switch | 300ms | ease-spring | left (indicator) |
| Glass opacity | 150ms | linear | opacity |
| Map flyTo | 800ms | ease-default | (MapLibre) |
| Location preview enter | 300ms | ease-spring | transform, opacity |

---

## 6. Accessibility

### 6.1 Focus Management
- **Focus trap** voor full sheet state — Tab/Shift+Tab cyclet binnen de sheet
- **Focus restoration** — als sheet sluit, focus terug naar trigger element

### 6.2 Keyboard Support
- Arrow Up/Down voor sheet detent changes
- Escape sluit full sheet naar half
- Enter/Space op sheet items voor activering

### 6.3 Screen Reader
- `aria-live="polite"` announcements bij sheet state changes ("Zoekresultaten geopend", "Detail gesloten")
- Alle bestaande ARIA attributen behouden en uitbreiden
- `role="dialog"` op full sheet state

### 6.4 Visuele Toegankelijkheid
- **Contrast ratio verificatie** voor alle nieuwe glass tokens tegen WCAG AA (4.5:1 tekst, 3:1 UI)
- Alle glasmorfisme oppervlakken moeten leesbare tekst garanderen ongeacht kaart-achtergrond
- **Reduced motion fallbacks** voor alle spring animaties:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.15s !important; }
  }
  ```

### 6.5 Touch Targets
- **Minimum 44x44px** voor alle interactieve elementen (Apple HIG)
- Audit bestaande controls: drag handle, filter chips, nav items, map controls
- Vergroot waar nodig met `padding` of `min-height/min-width`

---

## 7. Scope & Constraints

1. **Scope: app.html only** — statische SEO-pagina's (locatie-/stad-pagina's) worden niet beïnvloed
2. **warm-glass-tokens.css is additief** — vervangt design-system.css niet, bouwt erop voort
3. **Service worker (sw.js)** moet worden bijgewerkt met nieuwe CSS bestanden in de cache-lijst
4. **Dark mode expliciet deferred** — maar alle tokens zijn CSS custom properties zodat dark mode later alleen waarden overridet
5. **Feature branch vereist:** `redesign/warm-glass` — nooit merge naar main zonder volledige QA pass
6. **Sheet engine rewrite deferred** — te risicovol, huidige engine werkt. Polish only.
7. **Geen build step** — alle dependencies via CDN (esm.sh), geen npm/bundler

---

## 8. Performance Strategie

### 8.1 Kritieke optimalisaties
- **Compositor-thread animaties:** Alleen `transform` en `opacity` animeren (nooit `height`, `top`, `left`)
- **will-change:** Op sheet element, tab indicator, en kaart controls
- **Content visibility:** `content-visibility: auto` op off-screen cards
- **Virtual scrolling:** Lijst toont max 20 cards, lazy-load bij scroll
- **Image lazy loading:** `loading="lazy"` + `decoding="async"` + blur-up placeholder
- **Preconnect:** MapLibre tiles, Supabase, fonts
- **Disable backdrop-filter during gestures** — re-enable after animation settles

### 8.2 Lighthouse targets

| Metric | Huidig (geschat) | Target |
|--------|-------------------|--------|
| Performance | ~65 | 90+ |
| FCP | ~2.5s | <1.5s |
| LCP | ~4s | <2.5s |
| CLS | ~0.15 | <0.05 |
| INP | ~300ms | <200ms |

---

## 9. Test Strategie

### 9.1 Visuele QA (elke fase)
- `/visual-qa` op 390px (mobile) + 1280px (desktop)
- Test alle sheet states, tabs, filter interacties
- Gemini 3 Flash als primaire visuele analyzer

### 9.2 Visuele Regressie (geautomatiseerd)
Playwright `toHaveScreenshot()` voor 8 critical states:
1. Mobile peek state
2. Mobile half state met week picks
3. Mobile full state met lijst
4. Mobile location detail
5. Mobile onboarding modal
6. Desktop sidebar + map
7. Desktop card grid
8. Desktop location detail panel

### 9.3 QA Checklist — 8 Critical Flows (must pass per fase)

Elke fase moet deze 8 flows doorstaan voordat de fase als klaar wordt beschouwd:

1. **Sheet drag cycle:** peek → half → full → half → peek (smooth, no jank)
2. **Search flow:** tap pill → type → select suggestion → resultaat zichtbaar
3. **Filter flow:** select chip → resultaten updaten → reset → originele staat
4. **Location detail:** tap card → detail opent → scroll → route link werkt → terug
5. **Map interaction:** pan, zoom, tap marker → preview, recenter button
6. **Navigation:** alle nav tabs doorlopen → juiste view per tab
7. **Offline:** airplane mode → offline banner → reconnect → data laadt
8. **Desktop responsive:** resize 390px → 768px → 1280px → geen layout breaks

### 9.4 Performance Criteria
- **60fps** tijdens sheet drag (gemeten via Chrome DevTools Performance panel)
- **Sheet snap animatie < 400ms** van start tot settle
- Lighthouse scores gemeten na elke fase

---

## 10. Implementatie Fasen

> **Branch:** `redesign/warm-glass`
> **Tag per fase:** `v0.phase-1`, `v0.phase-2`, etc.
> **Sessie-schattingen zijn conservatief** — beter onder- dan overschatten.

### Fase 0: Voorbereiding (1-2 sessies)
- [ ] Feature branch `redesign/warm-glass` aanmaken
- [ ] Design tokens file (`warm-glass-tokens.css`) schrijven op basis van sectie 3
- [ ] `motion/mini` via esm.sh CDN toevoegen aan app.html
- [ ] Reactive store (`store.js`) opzetten
- [ ] Playwright visual regression baselines vastleggen
- [ ] Service worker cache-lijst updaten voor nieuwe bestanden
- [ ] Apple Maps screenshots opruimen uit repo root

**QA:** Baselines kloppen, app laadt zonder fouten, motion/mini importeert correct.

### Fase 1: Design Tokens + Glass Polish (2-4 sessies)
**Glass treatment op alle oppervlakken + desktop sidebar**
- [ ] Alle oppervlakken → glass treatment (blur + tint + border) conform sectie 4.2
- [ ] Consistente shadows (dual-layer Apple patroon)
- [ ] Typography tokens koppelen aan bestaande clamp() schaal
- [ ] Spacing migratie naar 4px grid
- [ ] Border-radius consistentie
- [ ] Kleurvariabelen migratie
- [ ] Bottom sheet glass polish (spring snap via motion/mini, geen engine rewrite)
- [ ] Desktop sidebar glass panel (440px, blur:20px)
- [ ] Bottom nav glass background + filled active icons
- [ ] Top navbar verbergen op mobile
- [ ] Reduced motion fallbacks
- [ ] Contrast ratio verificatie

**QA:** 8 critical flows + Lighthouse baseline meting.
**Tag:** `v0.phase-1`

### Fase 2: Location Detail Redesign (2-4 sessies)
- [ ] 3-tier progressive disclosure implementeren
- [ ] Hero foto vol breedte met gradient overlay
- [ ] Compacte info-grid (type, weer, parkeren, drukte)
- [ ] "Meer details" expandable sections
- [ ] Verwijder dubbele beschrijvingen
- [ ] Route knop fix (target="_blank", Google Maps primary)
- [ ] Accessibility: focus trap, ARIA labels
- [ ] Desktop: detail panel schuift in van rechts

**QA:** 8 critical flows + detail view specifiek op mobile + desktop.
**Tag:** `v0.phase-2`

### Fase 3: Map & Navigation Polish (2-4 sessies)
- [ ] Marker redesign (grotere size-variatie clusters)
- [ ] Geselecteerde marker spring bounce via motion/mini
- [ ] FlyTo duration 800ms
- [ ] Recenter FAB: 44x44 cirkel, glass achtergrond, alleen icoon
- [ ] Tab indicator spring animatie verbeteren
- [ ] Touch target audit (44px minimum) op alle controls
- [ ] Keyboard sheet controls (arrow keys, escape)
- [ ] Screen reader announcements voor sheet state changes
- [ ] Lijst FAB verwijderen

**QA:** 8 critical flows + map interaction specifiek.
**Tag:** `v0.phase-3`

### Fase 4: Search Redesign (2-4 sessies)
- [ ] Search pill → expanderende zoekbalk animatie
- [ ] Live suggesties dropdown (locatienamen + steden)
- [ ] "Annuleren" knop bij focus
- [ ] Recent searches in localStorage
- [ ] Filter chips polish (betere :active states, scroll indicator)
- [ ] Focus management en keyboard navigatie in suggesties
- [ ] Map filters overlay integreren met vernieuwde chips

**QA:** 8 critical flows + zoek flow van start tot resultaat.
**Tag:** `v0.phase-4`

### Fase 5: Performance & Final QA (2-4 sessies)
- [ ] Virtual scrolling voor kaartlijst
- [ ] `content-visibility: auto` op off-screen elementen
- [ ] Image blur-up placeholders
- [ ] Preconnect hints
- [ ] Lighthouse CI meting vs targets
- [ ] 60fps verificatie tijdens sheet drag
- [ ] Sheet snap < 400ms verificatie
- [ ] Volledige visuele regressie pass (alle 8 Playwright states)
- [ ] Multi-device test: echte iPhone Safari, Android Chrome
- [ ] Final /visual-qa pass op alle viewports

**QA:** Alle 8 critical flows + Lighthouse 90+ + 60fps drag + visual regression pass.
**Tag:** `v0.phase-5` → klaar voor merge naar main.

---

## 11. Parallellisatie

**Belangrijk:** `glass.css` en gerelateerde CSS bestanden zijn monolitisch. Meerdere agents die dezelfde bestanden bewerken leidt tot merge conflicts en subtiele regressies. **Sequential is veiliger dan parallel voor CSS werk.**

### Wat WEL parallel kan:
- Research + prototyping (bijv. motion/mini spring parameters testen) terwijl een andere agent Playwright baselines maakt
- Lighthouse audits draaien terwijl er aan een andere fase wordt gewerkt
- Visuele QA met Gemini terwijl code wordt geschreven

### Wat NIET parallel moet:
- Twee agents die glass.css bewerken
- CSS tokens wijzigen terwijl componenten die tokens gebruiken worden aangepast
- Sheet polish en search redesign tegelijk (overlappende CSS selectors)

---

## 12. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Glass polish breekt bestaande styling | Hoog | Feature branch + 8 critical flows QA per fase |
| backdrop-filter performance op low-end devices | Medium | Lagere blur waarden (20px/10px) + disable tijdens drag + fallback bij reduced-motion |
| Apple Maps update verandert hun design | Laag | We bouwen op principes, niet op exacte kopie |
| Safari bugs met backdrop-filter | Medium | Test op echte iOS Safari, graceful degradation |
| motion/mini CDN downtime | Laag | Fallback CSS animations, CDN is esm.sh (zeer betrouwbaar) |

---

## 13. Success Criteria

De redesign is geslaagd als:

### Meetbare criteria
1. **Lighthouse Performance:** 65 → 90+
2. **Sheet drag:** 60fps gemeten in Chrome DevTools Performance panel
3. **Sheet snap animatie:** < 400ms van trigger tot settle
4. **Visual regression:** 8/8 Playwright screenshot states passing
5. **Lighthouse per fase:** score mag niet dalen t.o.v. vorige fase

### Kwalitatieve criteria
6. **UX audit score:** 6/10 → 9/10
7. **Glass effect:** Consistent warm glasmorfisme op ALLE oppervlakken boven de kaart
8. **Detail view:** Max 3 secties zichtbaar zonder scrollen (was 12+)
9. **Eerste impressie:** Nieuwe gebruiker snapt in < 3 seconden wat de app doet

### Eindtest
10. **Real-device test:** Voelt vloeiend en native op iPhone Safari + Android Chrome
11. **Bas-test (bonus):** "Dit voelt als een echte app, niet als een website"
