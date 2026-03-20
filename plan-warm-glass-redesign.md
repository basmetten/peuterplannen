# PeuterPlannen — Warm Glass Redesign: Apple Maps-niveau UX

**Status:** PLAN — wacht op goedkeuring Bas
**Datum:** 20 maart 2026
**Scope:** Volledige frontend redesign van de PeuterPlannen webapp
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

### Huidige staat: Vanilla HTML/CSS/JS (ES modules)
- **Sterk:** Geen build step, snelle eerste load, eenvoudig te deployen
- **Zwak:** State management is handmatig (window._pp_modules), geen reactief systeem, animaties zijn ad-hoc, component hergebruik is beperkt

### Aanbeveling: **Svelte 5** (met SvelteKit voor routing)

| Criterium | Vanilla | Svelte 5 | React | Solid |
|-----------|---------|----------|-------|-------|
| Bundle size | 0kb framework | ~2kb runtime | ~40kb | ~7kb |
| Animatie | Handmatig | `svelte/motion` + `spring()` ingebouwd | Framer Motion (18kb) | Custom |
| Reactivity | Handmatig | Runes (`$state`, `$derived`) | useState/useEffect | Signals |
| Performance | Snelst initial | Snelst na initial (compiled) | Virtueel DOM overhead | Snel, complexer |
| Leercurve voor Bas | N/A | Laag (lijkt op HTML) | Hoog (JSX, hooks) | Medium |
| Spring animations | Eigen code | `spring()` native | Framer Motion nodig | Eigen code |
| Transitie-effort | N/A | Medium (component-migratie) | Hoog (complete rewrite) | Medium-hoog |

**Waarom Svelte 5:**
- `spring()` en `tweened()` zijn first-class — exact wat we nodig hebben voor Apple Maps-feel
- Compiled framework: geen runtime overhead, sneller dan React
- Template syntax lijkt op HTML — laagste leercurve voor een non-technical founder
- `svelte/transition` voor enter/exit animaties zonder extra libraries
- Runes (`$state`) maken reactieve state simpel
- SvelteKit geeft ons SSR + routing + progressive enhancement gratis
- `motion/mini` (2.3kb) als aanvulling voor complexe spring physics

**Migratiestrategie:** Incrementeel. Niet alles in één keer herschrijven. Begin met de shell (bottom sheet + map), migreer dan component voor component.

### Alternatief als Svelte te ver gaat: **Vanilla + motion/mini**
Als de framework-switch te groot voelt, kunnen we 80% van het doel bereiken met:
- `motion/mini` (2.3kb) voor spring animations
- CSS `linear()` timing function voor spring curves
- Betere state management via een simpele reactive store
- Web Components voor herbruikbare elementen

---

## 3. Design System: Warm Glass Tokens

### 3.1 Kleuren (gebaseerd op Apple Maps, warm getint)

```css
:root {
  /* Glass surfaces — warm tinted */
  --wg-glass-light: rgba(255, 248, 240, 0.78);      /* panels, sidebar */
  --wg-glass-medium: rgba(255, 248, 240, 0.60);      /* bottom sheet */
  --wg-glass-heavy: rgba(255, 248, 240, 0.92);       /* search bar, controls */
  --wg-glass-overlay: rgba(255, 248, 240, 0.95);     /* full sheet, modals */

  /* Blur levels (exact Apple Maps values) */
  --wg-blur-panel: blur(50px) saturate(150%);         /* large surfaces */
  --wg-blur-control: blur(15px) saturate(150%);       /* small controls */
  --wg-blur-overlay: blur(20px) saturate(120%);       /* modals, overlays */

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
  --wg-text-secondary: rgba(60, 45, 38, 0.60);       /* Apple: rgba(60,60,67,0.6) maar warm */
  --wg-text-tertiary: rgba(60, 45, 38, 0.30);
  --wg-text-inverse: #FFFBF7;

  /* Backgrounds */
  --wg-bg: #FAF7F2;
  --wg-surface: #FFFFFF;
  --wg-surface-warm: #FFFBF7;

  /* Shadows (Apple Maps dual-layer pattern) */
  --wg-shadow-raised: 0 2px 4px rgba(60, 40, 20, 0.08), 0 2px 12px rgba(60, 40, 20, 0.04);
  --wg-shadow-elevated: 0 2px 8px rgba(60, 40, 20, 0.10), 0 2px 16px rgba(60, 40, 20, 0.06);
  --wg-shadow-floating: 0 2px 8px rgba(60, 40, 20, 0.12), 0 8px 24px rgba(60, 40, 20, 0.08);
}
```

### 3.2 Typografie

```css
:root {
  /* Font stack — system fonts, Apple-inspired hierarchy */
  --wg-font: -apple-system, "SF Pro", "Helvetica Neue", sans-serif;
  --wg-font-display: -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif;

  /* Scale (Apple Maps: 11px → 36px) */
  --wg-text-micro: 0.6875rem;    /* 11px — legal, timestamps */
  --wg-text-xs: 0.75rem;         /* 12px — labels, badges */
  --wg-text-sm: 0.875rem;        /* 14px — secondary content */
  --wg-text-base: 1rem;          /* 16px — body */
  --wg-text-lg: 1.125rem;        /* 18px — emphasis, default body on Apple */
  --wg-text-xl: 1.25rem;         /* 20px — section headers */
  --wg-text-2xl: 1.375rem;       /* 22px — place title */
  --wg-text-3xl: 1.75rem;        /* 28px — hero title */

  /* Weights */
  --wg-weight-normal: 400;
  --wg-weight-medium: 500;
  --wg-weight-semibold: 600;
  --wg-weight-bold: 700;

  /* Letter spacing (Apple: slightly negative for headings) */
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

### 3.4 Radii (Apple Maps exacte waarden)

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
  --wg-duration-normal: 150ms;    /* Apple Maps desktop standaard */
  --wg-duration-slow: 300ms;      /* Apple Maps mobile standaard */
  --wg-duration-sheet: 400ms;     /* bottom sheet transitions */

  /* Easing curves (exact Apple) */
  --wg-ease-default: cubic-bezier(0.12, 0.55, 0.19, 1);
  --wg-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);      /* overshoot */
  --wg-ease-heavy-in: cubic-bezier(0.03, 0, 0.31, 1);
  --wg-ease-heavy-out: cubic-bezier(0.64, 0, 0.85, 1);
  --wg-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
}
```

---

## 4. Component Redesign

### 4.1 Bottom Sheet (PRIORITEIT 1 — het hart van de app)

**Huidige problemen:**
- Peek state te minimaal (alleen pill + weer)
- Geen echte rubber-banding bij over-drag
- Content scrollt niet native (geen scroll-snap)
- Bounce animatie is nagebouwd, niet echt spring-based

**Apple Maps aanpak:**
- 3 detents: peek (~15vh), half (~50vh), full (~92vh)
- Sheet "drijft" met afgeronde hoeken bij peek/half, gaat edge-to-edge bij full
- Content scrollt pas als sheet volledig open is
- Velocity-based snapping met spring physics

**Nieuw design:**

```
PEEK (140px):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  🔍 Zoek een uitje...   │ ← glasmorfisme pill
│  ☁️ 12° · 2138 uitjes   │
└─────────────────────────┘
  ↑ floating, radius: 20px, margin: 8px

HALF (~50vh):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  🔍 Zoek een uitje...   │
│  ☁️ 12° · 2138 uitjes   │
│                         │
│  [Alles][Speeltuin]...  │ ← filter chips
│                         │
│  ── Deze week ────────  │
│  [📸 Nijntje][📸 NEMO]  │ ← horizontale scroll
│                         │
│  ── In de buurt ──────  │
│  📍 Museum Speelklok    │
│  📍 Dignita Hoftuin     │
│  📍 Het Groot Melkhuis  │
└─────────────────────────┘
  ↑ floating, radius: 20px top, margin: 8px sides

FULL (~92vh):
┌─────────────────────────┐
│     ─── (drag handle)   │
│  🔍 Zoek een uitje...   │
│  [Alles][Speeltuin]...  │
│                         │
│  ── scrollable list ──  │ ← nu pas scrollbaar
│  📍 Museum Speelklok    │
│  📍 Dignita Hoftuin     │
│  ... 2136 meer          │
│                         │
│                         │
│                         │
│                         │
└─────────────────────────┘
  ↑ edge-to-edge, radius: 20px top only
```

**Implementatie:**
- CSS scroll-snap op een container met onzichtbare snap-punten (draait op compositor thread)
- Spring physics via `motion/mini` of Svelte `spring()`
- `will-change: transform` op sheet element
- Gesture: `touchstart` → track finger → `touchend` → bereken velocity → spring naar dichtstbijzijnde detent
- Rubber-band effect: als je voorbij peek/full draggt, voelt het als een elastiek

### 4.2 Glasmorfisme Oppervlakken

**Huidige staat:** `background: rgba(255,248,240,0.78)` met `backdrop-filter: blur(20px)` — al redelijk goed maar niet consistent toegepast.

**Nieuw:** Elk UI-element dat boven de kaart drijft krijgt glass treatment:

| Element | Glass level | Blur | Achtergrond |
|---------|-------------|------|-------------|
| Bottom sheet | medium | 50px | rgba(255,248,240, 0.78) |
| Search pill | heavy | 15px | rgba(255,248,240, 0.92) |
| Map controls (zoom, recenter) | heavy | 15px | rgba(255,248,240, 0.80) |
| Filter chips container | light | 50px | rgba(255,248,240, 0.60) |
| Location preview card | heavy | 15px | rgba(255,248,240, 0.92) |
| Bottom nav | heavy | 50px | rgba(255,248,240, 0.85) |
| Desktop sidebar | heavy | 50px | rgba(255,248,240, 0.85) |
| Modals/overlays | overlay | 20px | rgba(255,248,240, 0.95) |

### 4.3 Zoekervaring (PRIORITEIT 2)

**Huidig:** Pill met "Zoek & filter..." → tik → sheet gaat naar half met filter chips.

**Nieuw Apple Maps-stijl:**

1. **Idle:** Glass pill op de sheet met "Zoek een uitje of plaats..."
2. **Focus:** Pill expandeert smooth naar volledige zoekbalk. Keyboard opent. Recent searches verschijnen.
3. **Typing:** Live suggesties (locatienamen + steden) in een dropdown
4. **Cancel:** "Annuleren" tekst-knop rechts (Apple Maps patroon). Tik → terug naar pill.

```
Idle:      [🔍 Zoek een uitje...          ]
Focus:     [🔍 amsterda|                  ] [Annuleer]
           ┌──────────────────────────────┐
           │ 📍 Amsterdam                  │
           │ 📍 Amstelpark Amsterdam       │
           │ 📍 ARTIS Amsterdam            │
           └──────────────────────────────┘
```

### 4.4 Locatie Detail (PRIORITEIT 3)

**Huidig probleem:** 12+ secties, overweldigend. Score breakdown, trust section, logistics grid — te veel.

**Nieuw: 3-tier progressive disclosure (Apple Maps style)**

```
TIER 1 — Direct zichtbaar:
┌─────────────────────────────────┐
│ [📸 Hero foto — vol breedte]    │
│                                 │
│ Museum Speelklok                │ ← 22px bold
│ Museum · Utrecht · 2-12 jaar    │ ← 14px secondary
│ ⭐ 9.2 · ☕ Koffie · 🚻 Verschonen │
│                                 │
│ [🧭 Route]  [🌐 Website]  [↗ Deel] │
└─────────────────────────────────┘

TIER 2 — Na kort scrollen:
┌─────────────────────────────────┐
│ Waarom goed voor peuters        │ ← 20px semibold
│ ✓ Muziekinstrumenten op         │
│   kruiphoogte                   │
│ ✓ Verschoontafel aanwezig       │
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
│ ▸ Score breakdown               │
│ ▸ Verificatie & betrouwbaarheid │
│ ▸ Volledige beschrijving        │
└─────────────────────────────────┘
```

### 4.5 Kaartinteractie

**Verbeteringen:**
- Markers: koraal cirkels met witte rand, geselecteerde marker krijgt `scale(1.3)` + spring bounce
- Clusters: grotere size-variatie (Apple Maps schaalt dramatischer)
- FlyTo: `duration: 800ms` met `ease-default` curve
- Recenter FAB: 44x44 cirkel, glass background, alleen icoon (geen tekst)
- Marker tap → sheet gaat naar half met preview card (al geïmplementeerd, polish nodig)

### 4.6 Bottom Navigation

**Huidig:** 5 tabs (Ontdek, Kaart, Favorieten, Plan, Info)

**Nieuw:** 4 tabs + Info wordt overlay

```
┌────────────────────────────────┐
│  🏠        🗺️       ❤️       📅  │
│ Ontdek   Kaart  Opgeslagen  Plan│
└────────────────────────────────┘
```

- **Ontdek** = standaard view (kaart + sheet met lijst)
- **Kaart** = fullscreen kaart, sheet verborgen
- **Opgeslagen** = favorieten lijst
- **Plan** = dagplanner
- **Info** → verplaatst naar gear icon in header of long-press op logo

Wijzigingen:
- Filled icons voor actieve tab (Apple Maps patroon)
- Glasmorfisme achtergrond op de nav bar
- Indicator-pill animatie behouden (is al goed)
- "Favorieten" hernoemd naar "Opgeslagen" (vermijdt verwarring met filter chip)

### 4.7 Desktop Layout

**Huidig probleem:** Geen achtergrond op sidebar, content onleesbaar over drukke kaart.

**Nieuw:**
```
┌────────────────────┬──────────────────────────────┐
│ Glass sidebar      │                              │
│ (440px, blur:50px) │         MAP                  │
│                    │                              │
│ 🔍 Zoek...         │                              │
│                    │                              │
│ [Presets]          │     [zoom] [recenter]        │
│                    │     (glass controls)         │
│ ── Resultaten ──   │                              │
│ [Card] [Card]      │                              │
│ [Card] [Card]      │                              │
│ [Card] [Card]      │                              │
│                    │                              │
└────────────────────┴──────────────────────────────┘
```

- Sidebar: `backdrop-filter: blur(50px) saturate(150%)`, warm glass achtergrond
- Breedte: 440px (was 400px)
- Cards in 1-kolom lijst (niet grid — Apple Maps toont ook lijst)
- Hover op card → marker highlight op kaart (al geïmplementeerd)
- Click op card → detail panel schuift in van rechts (overlay op kaart)

### 4.8 Lijst-toggle Verwijderen

De "Lijst" FAB wordt verwijderd. De bottom nav tabs (Ontdek/Kaart) vervullen deze functie al. Dit bespaart visual clutter en een conflicterend UI-element.

### 4.9 Top Navbar op Mobile Verbergen

Op mobile app view: de "Peuter Plannen" navbar verbergen. Die 60px verticale ruimte is waardevol. De bottom nav biedt al navigatie. Het logo kan subtiel in de sheet header.

---

## 5. Interactie & Animatie Specificaties

### 5.1 Spring Parameters

| Animatie | Stiffness | Damping | Mass | Bibliotheek |
|----------|-----------|---------|------|-------------|
| Sheet snap | 300 | 30 | 1 | motion/mini of Svelte spring |
| Sheet bounce (overshoot) | 200 | 15 | 1 | motion/mini |
| Marker select | 400 | 20 | 0.8 | CSS spring() |
| Tab indicator slide | 250 | 25 | 1 | Svelte spring |
| Card press feedback | 500 | 35 | 1 | CSS :active |
| Modal enter | 200 | 20 | 1 | Svelte transition |

### 5.2 Gesture Handling

```
Touch start → track position
Touch move  → update transform (requestAnimationFrame)
Touch end   → calculate velocity (dx / dt)
              if velocity > threshold → spring to next detent
              else → spring to nearest detent

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
| Map flyTo | 800ms | ease-default | — (MapLibre) |
| Location preview enter | 300ms | ease-spring | transform, opacity |

---

## 6. Performance Strategie

### 6.1 Kritieke optimalisaties
- **Compositor-thread animaties:** Alleen `transform` en `opacity` animeren (nooit `height`, `top`, `left`)
- **will-change:** Op sheet element, tab indicator, en kaart controls
- **Content visibility:** `content-visibility: auto` op off-screen cards
- **Virtual scrolling:** Lijst toont max 20 cards, lazy-load bij scroll
- **Image lazy loading:** `loading="lazy"` + `decoding="async"` + blur-up placeholder
- **Preconnect:** MapLibre tiles, Supabase, fonts

### 6.2 Lighthouse targets
| Metric | Huidig (geschat) | Target |
|--------|-------------------|--------|
| Performance | ~65 | 90+ |
| FCP | ~2.5s | <1.5s |
| LCP | ~4s | <2.5s |
| CLS | ~0.15 | <0.05 |
| INP | ~300ms | <200ms |

---

## 7. Test Strategie

### 7.1 Visuele QA (elke PR)
- **`/visual-qa` skill** (migratie naar `.claude/skills/visual-qa/SKILL.md`)
  - `context: fork` voor geïsoleerde browser sessie
  - Vision mode voor MapLibre canvas testing
  - Gemini 3 Flash als primaire visuele analyzer
  - Screenshots op 390px (mobile) + 1280px (desktop)
  - Test alle sheet states, tabs, filter interacties

### 7.2 Visuele Regressie (geautomatiseerd)
- Playwright `toHaveScreenshot()` voor 8 critical states:
  1. Mobile peek state
  2. Mobile half state met week picks
  3. Mobile full state met lijst
  4. Mobile location detail
  5. Mobile onboarding modal
  6. Desktop sidebar + map
  7. Desktop card grid
  8. Desktop location detail panel
- Baselines in `.playwright-snapshots/`
- `/snapshot-baseline` skill voor updates na intentionele UI changes

### 7.3 Functionele Tests
- Sheet gesture tests (drag up/down, velocity snap, rubber-band)
- Filter interactie (chip toggle, preset select, reset)
- Zoek flow (focus, type, select suggestion, cancel)
- Location detail (open, scroll, score breakdown toggle, route link)
- Onboarding flow (2 views → modal → select → preset active)
- Offline detection (banner, retry)
- Deep links (hash navigation, URL params)

### 7.4 Performance Tests
- `/perf-check` skill: Lighthouse CI op elke deploy
- Core Web Vitals budgets in `lighthouserc.json`
- MapLibre tile loading benchmarks
- Sheet animation FPS monitoring (>55fps target)

### 7.5 Multi-Model Visuele Verificatie
- **Gemini 3 Flash:** Primair — spatial reasoning, layout bugs, overflow detectie
- **Claude Vision:** Secundair — design consistency, brand adherence check
- **PostToolUse hook:** Automatische reminder bij CSS/HTML wijzigingen

---

## 8. Implementatie Fasen

### Fase 0: Voorbereiding (1 sessie)
- [ ] Design tokens file (`warm-glass-tokens.css`) schrijven
- [ ] `motion/mini` installeren (of Svelte setup)
- [ ] Playwright visual regression baselines vastleggen
- [ ] `/visual-qa` migreren naar skills format
- [ ] Apple Maps screenshots opruimen uit repo root

### Fase 1: Bottom Sheet Rewrite (2-3 sessies)
**Het hart van de app. Dit moet perfect zijn.**
- [ ] Nieuwe sheet engine met spring physics
- [ ] 3-detent systeem (peek/half/full) met velocity-based snapping
- [ ] Rubber-band effect bij over-drag
- [ ] Content scroll lock (pas scrollen bij full state)
- [ ] Glass background met warm tint
- [ ] Floating met rounded corners bij peek/half, edge-to-edge bij full
- [ ] Drag handle redesign (groter, meer contrast)
- [ ] QA: sheet feel test op echte iPhone (Safari)

### Fase 2: Glass Design System (1-2 sessies)
- [ ] Alle oppervlakken → glass treatment (blur + tint + border)
- [ ] Consistente shadows (dual-layer Apple patroon)
- [ ] Typography migratie naar nieuwe schaal
- [ ] Spacing migratie naar 4px grid
- [ ] Border-radius consistentie
- [ ] Kleurvariabelen migratie
- [ ] Desktop sidebar glass background
- [ ] Bottom nav glass background
- [ ] QA: visuele regressie tests

### Fase 3: Zoek & Filter Redesign (1-2 sessies)
- [ ] Search pill → expanderende zoekbalk animatie
- [ ] Live suggesties dropdown (locatienamen + steden)
- [ ] "Annuleren" knop bij focus
- [ ] Recent searches in localStorage
- [ ] Filter chips polish (betere :active states, scroll indicator)
- [ ] Verwijder "Lijst" FAB
- [ ] QA: zoek flow van start tot resultaat

### Fase 4: Location Detail Redesign (1-2 sessies)
- [ ] 3-tier progressive disclosure
- [ ] Hero foto vol breedte met gradient overlay
- [ ] Compacte info-grid (type, weer, parkeren, drukte)
- [ ] "Meer details" expandable sections
- [ ] Verwijder dubbele beschrijvingen
- [ ] Prijs-indicator naar pills row
- [ ] Route knop fix (target="_blank", Google Maps primary)
- [ ] QA: detail view op mobile + desktop

### Fase 5: Kaart & Navigation Polish (1 sessie)
- [ ] Marker redesign (grotere size-variatie clusters)
- [ ] Geselecteerde marker spring bounce
- [ ] FlyTo duration 800ms
- [ ] Recenter FAB: alleen icoon, glass achtergrond
- [ ] Bottom nav: 4 tabs, filled active icons
- [ ] Top navbar verbergen op mobile
- [ ] Tab indicator spring animatie verbeteren
- [ ] QA: map interactie + navigatie flow

### Fase 6: Desktop Layout (1 sessie)
- [ ] Sidebar glass panel (440px, blur:50px)
- [ ] Cards in 1-kolom lijst format
- [ ] Location detail als overlay panel van rechts
- [ ] Preset area compact of collapsible
- [ ] Cards boven de fold zichtbaar
- [ ] QA: desktop-specifieke flows

### Fase 7: Performance & Polish (1 sessie)
- [ ] Virtual scrolling voor kaartlijst
- [ ] `content-visibility: auto` op off-screen elementen
- [ ] Image blur-up placeholders
- [ ] Preconnect hints
- [ ] Lighthouse CI setup
- [ ] Animator FPS monitoring
- [ ] Final QA pass: alle states, alle viewports, multi-model verificatie

### Fase 8: Framework Migratie (optioneel, 3-5 sessies)
**Alleen als Fase 1-7 aantoont dat vanilla niet genoeg is.**
- [ ] Svelte 5 + SvelteKit setup
- [ ] Component-voor-component migratie
- [ ] State management naar Svelte stores
- [ ] Animaties naar svelte/motion
- [ ] Route via SvelteKit
- [ ] Volledige QA regressie suite

---

## 9. Parallellisatie

### Fase 1-2 kunnen deels parallel:
```
Agent 1: Sheet engine rewrite (JS)
Agent 2: Glass design tokens + CSS variables
Agent 3: Visual regression baselines
Na alle agents: /visual-qa verificatie
```

### Fase 3-5 kunnen deels parallel:
```
Agent 1: Search redesign (JS + CSS)
Agent 2: Location detail redesign (JS + CSS)
Agent 3: Map + navigation polish (CSS + minor JS)
Na alle agents: /visual-qa verificatie
```

---

## 10. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Sheet rewrite breekt bestaande functionaliteit | Hoog | Feature branch + uitgebreide QA voor merge |
| backdrop-filter performance op low-end devices | Medium | Fallback: solid background als `matchMedia('(prefers-reduced-motion)')` |
| Svelte migratie duurt langer dan verwacht | Medium | Fase 8 is optioneel — vanilla + motion/mini is fallback |
| Apple Maps update verandert hun design | Laag | We bouwen op principes, niet op exacte kopie |
| Safari bugs met backdrop-filter | Medium | Test op echte iOS Safari, graceful degradation |

---

## 11. Succes Criteria

De redesign is geslaagd als:
1. **UX audit score:** 6/10 → 9/10
2. **Lighthouse Performance:** 65 → 90+
3. **Sheet interactie:** Voelt native op iPhone Safari
4. **Eerste impressie:** Nieuwe gebruiker snapt in <3 seconden wat de app doet
5. **Glass effect:** Consistent warm glasmorfisme op ALLE oppervlakken
6. **Detail view:** Max 3 secties zichtbaar zonder scrollen (was 12+)
7. **Bas-test:** "Dit voelt als een echte app, niet als een website"
