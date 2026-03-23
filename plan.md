# Plan: Apple Maps-style Redesign PeuterPlannen

## Doel
Volledige UI redesign van de PeuterPlannen app naar Apple Maps web-app kwaliteit: soepele bottom sheet, map-first loading, native-feel gestures, cross-browser (Chrome iOS, Safari iOS, Android). Parallel bouwen als `app-v2.html`.

---

## Analyse: Wat maakt Apple Maps webapp zo goed?

### 1. Map-first architectuur
- Kaart is **fullscreen viewport** (`100dvh`), laadt als eerste
- UI is een transparante laag **bovenop** de kaart (geen cropping)
- Kaart loopt door tot bovenin het scherm (achter status bar)
- Sheet, zoekbalk en controls zijn floating overlays met backdrop-blur

### 2. Bottom sheet mechanics
- CSS scroll-snap voor snap points (native browser physics)
- 3 detents: **collapsed** (~15% viewport), **half** (~50%), **expanded** (~95%)
- Content scrollt pas als sheet volledig expanded is
- Drag handle heeft subtiele haptic feedback (visueel)
- Sheet heeft grote `border-radius` bovenaan, verdwijnt bij full expand

### 3. Zoekbalk
- Altijd zichtbaar in collapsed state (bovenin de sheet)
- Rounded rectangle, frosted glass achtergrond
- Focus → sheet gaat naar half, keyboard opent
- Cancel knop verschijnt bij focus

### 4. Tabs / Segmented control
- Brede toggle: "Explore" / "Saved" (geen losse tab buttons)
- iOS UISegmentedControl stijl (pill-shaped selector)
- Zit direct onder zoekbalk

### 5. Cards
- Horizontale scroll carrousel in collapsed/half state
- Compacte kaartjes met foto, naam, type badge
- Tap → sheet expanded met detail view

### 6. Desktop
- Sidebar links (~380px breed), kaart rechts
- Sidebar heeft dezelfde content als mobile sheet
- Geen bottom sheet op desktop

### 7. Performance trucs
- Kaart laadt parallel met UI (niet sequentieel)
- Sheet content lazy loaded
- CSS `will-change: scroll-position` + `contain: strict`
- Passive scroll listeners
- Morph-animaties via CSS scroll-driven animations (niet JS)

---

## Technologie keuze

### Sheet engine: `pure-web-bottom-sheet`
- **Web Component** (geen framework nodig)
- CSS scroll-snap core (exact dezelfde techniek als Apple Maps)
- ~3KB gzipped, zero dependencies
- Native nested scroll support
- CSS scroll-driven animations voor morphing
- `scrollsnapchange` → `scrollend` → IntersectionObserver fallback chain
- Declaratieve snap points via HTML slots
- MIT license

### Framework: Vanilla JS + Web Components
- Apple Maps web gebruikt waarschijnlijk Ember.js, maar dat is overkill
- Web Components geven dezelfde encapsulatie zonder framework overhead
- `pure-web-bottom-sheet` is al een Web Component
- Eigen lightweight componenten voor cards, filters, tabs
- Bestaande modules (data.js, scoring.js, plan-engine.js) herbruiken

### Kaart: MapLibre GL (behouden)
- Werkt goed, gratis, open-source
- Styling aanpassen naar Apple Maps-achtige subtiele kleuren
- Full-viewport rendering (geen container cropping)

---

## Architectuur app-v2

```
app-v2.html
├── <div id="map"> .................. 100dvh full-viewport kaart
├── <div class="map-controls"> ...... floating GPS + compass buttons
├── <bottom-sheet> .................. pure-web-bottom-sheet Web Component
│   ├── [slot=snap] 85% ............. expanded detent
│   ├── [slot=snap] 50% .initial .... half detent (default)
│   ├── [slot=snap] 15% ............. collapsed detent (peek)
│   ├── [slot=header] ............... sticky: search + tabs
│   │   ├── .drag-handle
│   │   ├── .search-bar ............. Apple Maps style rounded search
│   │   └── .segment-control ........ Ontdek | Bewaard toggle
│   └── [default slot] .............. scrollable content
│       ├── .filter-chips ........... horizontale chip scroll
│       ├── .card-carousel .......... horizontale card scroll (peek)
│       ├── .location-list .......... verticale lijst (half/full)
│       └── .location-detail ........ detail view (full)
├── <div class="desktop-sidebar"> ... alleen op ≥1024px
│   ├── .search-bar
│   ├── .segment-control
│   ├── .filter-chips
│   └── .location-list / .detail
└── <script type="module" src="app-v2.bundle.js">
```

### Desktop layout
```css
@media (min-width: 1024px) {
  bottom-sheet { display: none; }
  .desktop-sidebar { display: flex; flex-direction: column; width: 380px; }
  #map { margin-left: 380px; }
}
```

---

## Fasering

### Fase 0: Setup (1 taak)
- [ ] Maak `app-v2.html` aan naast bestaande `app.html`
- [ ] Installeer `pure-web-bottom-sheet` via npm
- [ ] Maak `app-v2.css` en `app-v2.js` entry points
- [ ] Configureer esbuild voor v2 bundles
- [ ] Zet dev server op die beide versies serveert

### Fase 1: Map-first viewport (2 taken)
- [ ] Full-viewport MapLibre kaart (`position: fixed; inset: 0; z-index: 0`)
- [ ] Kaart laadt als eerste, UI mount daarna
- [ ] Subtiele kaart styling (muted kleuren, minder labels)
- [ ] Floating map controls (GPS button) met frosted glass stijl
- [ ] Safe area handling: `env(safe-area-inset-top)` voor notch/dynamic island

### Fase 2: Bottom sheet integratie (3 taken)
- [ ] `<bottom-sheet>` Web Component registreren
- [ ] 3 snap points configureren: 15% (collapsed), 50% (half), 85% (expanded)
- [ ] Drag handle styling (5px × 36px pill, centered, subtle grijs)
- [ ] Sheet achtergrond: frosted glass (`backdrop-filter: blur(20px) saturate(1.8)`)
- [ ] Border-radius: 12px top, 0 bij expanded
- [ ] `nested-scroll` attribute voor content scrolling
- [ ] Sheet overlay/dimming bij expanded state
- [ ] Luister naar `snap-position-change` events voor state management

### Fase 3: Zoekbalk (Apple Maps stijl) (2 taken)
- [ ] Rounded search input in `[slot=header]`
- [ ] Frosted glass achtergrond met subtle border
- [ ] Zoek-icoon links, clear button rechts
- [ ] Focus state: sheet → half, cancel knop slide-in
- [ ] Autocomplete dropdown (hergebruik bestaande Google Places integratie)
- [ ] Blur bij cancel → sheet terug naar collapsed

### Fase 4: Segmented control (tabs) (1 taak)
- [ ] iOS-stijl segmented control: "Ontdek" | "Bewaard"
- [ ] Pill-shaped sliding indicator
- [ ] Onder zoekbalk, in `[slot=header]`
- [ ] CSS: `border-radius: 8px; background: rgba(0,0,0,0.06); padding: 2px`
- [ ] Active segment: `background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1)`
- [ ] Smooth slide animatie bij tab switch

### Fase 5: Filter chips (2 taken)
- [ ] Horizontale scroll container met `scroll-snap-type: x mandatory`
- [ ] Chip stijl: rounded pill, subtle achtergrond, compact
- [ ] Active state: filled achtergrond (accent kleur)
- [ ] "Meer filters" chip opent modal (hergebruik bestaande filter-modal)
- [ ] Fade-out maskers links/rechts van scroll container
- [ ] Presets (Regenproof, Buiten+Koffie, etc.) als eerste rij
- [ ] Type filters (Speeltuin, Boerderij, etc.) als tweede rij of gecombineerd

### Fase 6: Location cards (3 taken)
- [ ] **Collapsed state**: horizontale card carrousel
  - Compacte kaarten (140×180px), foto bovenin, naam + type badge onderin
  - `scroll-snap-type: x mandatory` per card
  - Tap → sheet naar half met preview
- [ ] **Half state**: verticale lijst
  - Grotere cards met foto links, info rechts
  - Lazy loading met IntersectionObserver
  - Infinite scroll (30 items per batch)
- [ ] **Expanded/detail state**: volledige locatie detail
  - Hero foto (full-width)
  - Naam, type, PeuterScore
  - Info grid (faciliteiten, leeftijd, weer)
  - Adres + routeknop
  - Vergelijkbare locaties carrousel

### Fase 7: Desktop sidebar (2 taken)
- [ ] `@media (min-width: 1024px)`: sidebar links, kaart rechts
- [ ] Sidebar width: 380px, vaste positie
- [ ] Zelfde content als mobile sheet (search, tabs, filters, list)
- [ ] Geen bottom sheet op desktop
- [ ] Detail view als overlay/panel binnen sidebar
- [ ] Smooth transition bij resize (responsive)

### Fase 8: State management & data (2 taken)
- [ ] Hergebruik `modules/state.js` (minimal refactor)
- [ ] Hergebruik `modules/data.js` (Supabase fetch, caching)
- [ ] Hergebruik `modules/scoring.js` (PeuterScore)
- [ ] Hergebruik `modules/bus.js` (event bus)
- [ ] Nieuwe `v2/layout.js` voor responsive switching
- [ ] Nieuwe `v2/sheet-controller.js` voor sheet ↔ state sync
- [ ] Map instance koppelen aan sheet events (fly-to bij card tap, etc.)

### Fase 9: Animaties & polish (2 taken)
- [ ] Sheet morph: content opacity staggered reveals via CSS scroll-driven animations
- [ ] Card tap: scale-down micro-animation (0.97 → 1.0)
- [ ] Filter chip: subtle bounce bij toggle
- [ ] Search focus: smooth sheet transition
- [ ] Map markers: fade-in bij laden
- [ ] `prefers-reduced-motion`: alle animaties uit
- [ ] Safe area: `env(safe-area-inset-bottom)` voor home indicator

### Fase 10: Cross-browser testing & fixes (2 taken)
- [ ] Safari iOS: scroll-snap consistency, safe areas, rubber banding
- [ ] Chrome iOS: viewport resize bij keyboard, 300ms tap delay (`touch-action: manipulation`)
- [ ] Android Chrome: overscroll behavior, status bar color
- [ ] Desktop Safari/Chrome/Firefox: sidebar layout
- [ ] Playwright e2e tests voor v2 (nieuwe test file `tests/v2-functional.spec.ts`)
- [ ] Visual regression baselines voor v2

### Fase 11: Migratie bestaande features (3 taken)
- [ ] Plan tab ("Plan je dag") → integreren in Bewaard tab of als apart panel
- [ ] Info/instellingen → gear icon in header of als sheet section
- [ ] Favorieten → Bewaard tab (al onderdeel van segmented control)
- [ ] Visited markers → visual indicator op cards
- [ ] Discovery (weektips, weer) → Ontdek tab content
- [ ] Consent banner → overlay onderaan
- [ ] Deep linking (`?locatie=X`) → sheet opent met detail

### Fase 12: Bundle & deploy (1 taak)
- [ ] esbuild config voor `app-v2.bundle.js` en `app-v2.css`
- [ ] Pre-commit hook update voor v2 bundles
- [ ] Cache busting (`?v=` querystring)
- [ ] Smoke test op staging
- [ ] A/B test setup (v1 vs v2) of directe switch

---

## Technische details

### CSS Design tokens (v2)
```css
:root {
  /* Apple Maps inspired palette */
  --v2-sheet-bg: rgba(242, 242, 247, 0.82);
  --v2-sheet-blur: 20px;
  --v2-sheet-saturate: 1.8;
  --v2-sheet-radius: 12px;
  --v2-search-bg: rgba(118, 118, 128, 0.12);
  --v2-search-radius: 10px;
  --v2-segment-bg: rgba(118, 118, 128, 0.12);
  --v2-segment-active: #ffffff;
  --v2-chip-bg: rgba(118, 118, 128, 0.12);
  --v2-chip-active: var(--brand-coral, #D4775A);
  --v2-card-bg: #ffffff;
  --v2-card-radius: 12px;
  --v2-card-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  --v2-text-primary: #1c1c1e;
  --v2-text-secondary: #8e8e93;
  --v2-separator: rgba(60, 60, 67, 0.12);
  --v2-accent: #D4775A; /* PeuterPlannen coral, niet Apple blue */
}
```

### Bottom sheet configuratie
```html
<bottom-sheet id="main-sheet" nested-scroll tabindex="0">
  <!-- Snap points: collapsed, half, expanded -->
  <div slot="snap" style="--snap: 85%"></div>
  <div slot="snap" style="--snap: 50%" class="initial"></div>
  <div slot="snap" style="--snap: 15%"></div>

  <div slot="header">
    <div class="drag-handle"><div class="handle-pill"></div></div>
    <div class="search-bar">
      <svg class="search-icon">...</svg>
      <input type="text" placeholder="Zoek locatie of regio...">
      <button class="search-cancel">Annuleren</button>
    </div>
    <div class="segment-control">
      <button class="segment active" data-tab="ontdek">Ontdek</button>
      <button class="segment" data-tab="bewaard">Bewaard</button>
      <div class="segment-indicator"></div>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="sheet-body">
    <div class="filter-row">...</div>
    <div class="card-carousel">...</div>
    <div class="location-list">...</div>
    <div class="location-detail">...</div>
  </div>
</bottom-sheet>
```

### Map-first loading strategie
```javascript
// app-v2.js — kaart laadt EERST, UI DAARNA
async function boot() {
  // 1. Kaart initialiseren (parallel met data fetch)
  const [map] = await Promise.all([
    initMap(),           // MapLibre GL — start rendering immediately
    prefetchData(),      // Supabase fetch in background
  ]);

  // 2. UI mounten nadat kaart zichtbaar is
  registerSheetElements();  // pure-web-bottom-sheet
  initSheetController();    // onze state sync
  renderFilters();
  renderCards();

  // 3. Markers toevoegen (na data beschikbaar)
  addMarkers(state.locations);
}

// Kaart is 100dvh fixed, geen layout shift
document.getElementById('map').style.cssText = `
  position: fixed; inset: 0; z-index: 0;
`;
```

### Nested scroll configuratie
```css
/* Content scrollt alleen als sheet expanded is */
bottom-sheet::part(content) {
  overscroll-behavior-y: contain;
}

/* Bij half state: geen content scroll, alleen sheet drag */
bottom-sheet[data-state="partially-expanded"]::part(content) {
  overflow-y: hidden;
  touch-action: none;
}

/* Bij expanded: content scrollt normaal */
bottom-sheet[data-state="expanded"]::part(content) {
  overflow-y: auto;
  touch-action: pan-y;
}
```

### Segmented control CSS
```css
.segment-control {
  display: flex;
  background: var(--v2-segment-bg);
  border-radius: 8px;
  padding: 2px;
  margin: 8px 16px;
  position: relative;
}

.segment {
  flex: 1;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  border: none;
  background: transparent;
  color: var(--v2-text-primary);
  cursor: pointer;
  z-index: 1;
  transition: color 0.2s;
}

.segment-indicator {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: calc(50% - 2px);
  background: var(--v2-segment-active);
  border-radius: 7px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.segment-control[data-active="bewaard"] .segment-indicator {
  transform: translateX(100%);
}
```

---

## Bestanden die HERGEBRUIKT worden (niet herschrijven)
- `modules/state.js` — centraal state object
- `modules/bus.js` — event bus
- `modules/data.js` — Supabase fetch + caching
- `modules/scoring.js` — PeuterScore algoritme
- `modules/plan-engine.js` — itinerary optimalisatie
- `modules/favorites.js` — localStorage favorieten
- `modules/visited.js` — bezochte locaties
- `modules/prefs.js` — gebruikersvoorkeuren
- `modules/tags.js` — type definities
- `modules/utils.js` — hulpfuncties
- `modules/discovery.js` — weektips, weer

## Bestanden die NIEUW worden
- `app-v2.html` — nieuwe HTML structuur
- `app-v2.css` — volledige nieuwe CSS (Apple Maps stijl)
- `app-v2.js` — nieuwe entry point
- `v2/sheet-controller.js` — sheet ↔ state sync
- `v2/layout-v2.js` — responsive layout (mobile/desktop)
- `v2/cards-v2.js` — nieuwe card rendering (carrousel + lijst + detail)
- `v2/filters-v2.js` — nieuwe filter chip rendering
- `v2/map-v2.js` — map setup (full-viewport, controls, markers)
- `v2/templates-v2.js` — nieuwe card/detail templates

## Bestanden die VERVALLEN (v1 only)
- `modules/sheet-engine.js` → vervangen door `pure-web-bottom-sheet`
- `modules/sheet.js` → vervangen door `v2/sheet-controller.js`
- `modules/layout.js` → vervangen door `v2/layout-v2.js`
- `modules/cards.js` → vervangen door `v2/cards-v2.js`
- `modules/templates.js` → vervangen door `v2/templates-v2.js`
- `modules/map.js` → vervangen door `v2/map-v2.js`
- `modules/filters.js` → vervangen door `v2/filters-v2.js`
- `glass.css` → niet meer nodig (v2 heeft eigen CSS)
- `nav-floating.css` → niet meer nodig

---

## Risico's en mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| `pure-web-bottom-sheet` bug in Safari iOS | Hoog | Library is al getest op Safari iOS; fallback naar eigen scroll-snap als nodig |
| Desktop sidebar layout breekt | Medium | Aparte CSS media query, onafhankelijk van sheet component |
| Performance regressie door nieuwe code | Medium | Lighthouse audit voor/na; bundle size monitoring |
| Feature parity met v1 | Hoog | Checklist per feature; v1 blijft beschikbaar tot v2 complete |
| MapLibre conflict met full-viewport | Laag | MapLibre ondersteunt `position: fixed` native |

---

## Acceptatiecriteria
- [ ] Bottom sheet voelt identiek aan Apple Maps webapp op iPhone (Safari + Chrome)
- [ ] Kaart loopt door tot boven in het scherm (geen cropping)
- [ ] Kaart laadt eerst, UI verschijnt erna (geen layout shift)
- [ ] 3 snap points werken soepel met native scroll physics
- [ ] Content scrollt alleen in expanded state
- [ ] Segmented control (Ontdek/Bewaard) werkt met slide animatie
- [ ] Filter chips horizontaal scrollbaar
- [ ] Cards tonen in carrousel (collapsed) en lijst (half/full)
- [ ] Detail view vult expanded sheet
- [ ] Desktop: sidebar layout, geen bottom sheet
- [ ] Alle bestaande features werken (zoeken, filteren, favorieten, plan)
- [ ] Playwright e2e tests slagen
- [ ] Lighthouse performance score ≥ 90
- [ ] Geen console errors
- [ ] Werkt op: Safari iOS 16+, Chrome iOS, Chrome Android, Desktop Chrome/Safari/Firefox
