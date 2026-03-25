# Apple Maps Webapp Reverse Engineering — Onderzoeksrapport

**Datum:** 23 maart 2026
**Doel:** Valideer of plan.md en plan-warm-glass-redesign.md exact genoeg zijn om de Apple Maps UX na te bouwen
**Methode:** Puppeteer inspectie van maps.apple.com (v1.6.476) — DOM, computed CSS, inline styles, stylesheets, screenshots

---

## 1. CRUCIAAL: Sheet Mechanisme — Hoe Apple Maps het ECHT doet

### Ons plan zegt:
- Sheet engine met CSS `transform: translateY()` + touch events
- 3 detents: peek (140px), half (~50vh), full (~92vh)
- Spring physics via `motion/mini` voor snap-animaties
- `plan-warm-glass-redesign.md` noemt CSS `scroll-snap` NIET

### Wat Apple Maps ECHT doet:

**Apple Maps gebruikt een SCROLL CONTAINER, geen transforms voor verticale sheet movement.**

De architectuur op mobile (`@media max-width: 768px`):

```
#shell-wrapper          ← De scroll container (overflow: scroll, scroll-snap-type: y)
  #shell-map-outer      ← Map container (position: absolute, full viewport)
  #shell-tray           ← Sheet container (position: relative, margin-top pushes it down)
    #shell-tray-bg      ← Background layer (position: sticky)
    .mw-card            ← De kaart met content (position: static)
      .mw-card-handle   ← Drag handle (position: sticky, z-index: 11)
      .mw-inner         ← Content container
```

**Kritieke CSS van `#shell-wrapper` op mobile:**
```css
@media (max-width: 768px) {
  #shell-wrapper {
    width: 100%;
    height: calc(100% - var(--tray-top-margin));
    margin-top: var(--tray-top-margin);
    scrollbar-width: none;
    background-color: var(--system-background);
    overscroll-behavior-y: none;
    --tray-top-margin: 24px;
    --tray-client-height: calc(100svh - 24px);
    --tray-position: 0;
    --open-card-height: 320px;
    border-radius: 12px 12px 0px 0px;
    flex-direction: column;
    align-items: center;
    display: flex;
    overflow: scroll;
  }
}
```

**Het mechanisme:**
1. `#shell-wrapper` is een scrollbare flex container
2. `#shell-tray` wordt met `margin-top` naar beneden geduwd
3. De gebruiker **scrollt** de wrapper — dit IS de sheet gesture
4. JavaScript leest de scroll positie en zet `--tray-position` als CSS custom property
5. Andere elementen (controls, legal links, redo button) positioneren zich relatief aan `--tray-position`:
   ```css
   .mw-legal-links {
     bottom: calc(100svh - var(--tray-position) * 1px - 4px);
   }
   ```
6. CSS klassen `shell-tray-pos-0` t/m `shell-tray-pos-5` worden door JS gezet op basis van scroll positie

**6 posities, niet 3:**
| Klasse | Positie | Beschrijving |
|--------|---------|-------------|
| `shell-tray-pos-0` | Maximaal expanded | Full screen, geen kaart zichtbaar |
| `shell-tray-pos-1` | Bijna full | Kleine kaartstreep boven |
| `shell-tray-pos-2` | Half | ~50% scherm |
| `shell-tray-pos-3` | Partial | ~35% scherm |
| `shell-tray-pos-4` | Peek | Default initiële staat (`--tray-position: 696` bij 844px viewport) |
| `shell-tray-pos-5` | Collapsed/hidden | Bijna volledig weg |

**Scroll-snap wordt WEL gebruikt, maar selectief:**
```css
/* Modal headers snappen naar de bovenkant bij bepaalde posities */
.shell-tray-pos-5:not(.sliding) .mw-modal-card-header,
.shell-tray-pos-4:not(.sliding) .mw-modal-card-header,
.shell-tray-pos-3:not(.sliding) .mw-modal-card-header,
.shell-tray-pos-2:not(.sliding) .mw-modal-card-header {
  scroll-snap-align: end;
}
```

**Horizontale card navigatie gebruikt WEL transforms:**
```css
.mw-card {
  transition: transform 0.15s ease-out, width 0.15s ease-in-out, opacity 0.15s;
  transform: translateZ(0px); /* GPU compositing hint */
}

.mw-card.sliding-animation {
  /* Animatie klasse voor horizontale slide */
}

.mw-card.sliding-animation.offscreen {
  /* Kaart schuift uit beeld bij navigatie naar andere kaart */
}
```

### Impact op ons plan:
**Dit is een SIGNIFICANTE afwijking.** Onze huidige sheet-engine gebruikt `transform: translateY()` met touch event handling. Apple Maps gebruikt native scroll + JS position tracking. De `pure-web-bottom-sheet` library die in overweging was, is dichter bij Apple's benadering dan onze huidige engine.

**Aanbeveling:** Onze bestaande sheet-engine NIET herschrijven naar scroll-based. De `transform: translateY()` aanpak werkt en is makkelijker te controleren. Maar we moeten de volgende Apple Maps patterns WEL overnemen:
- `overscroll-behavior-y: none` op de sheet container
- `will-change: transform` op het sheet element (Apple gebruikt `will-change: opacity`)
- CSS custom property voor positie tracking (voor andere elementen)
- De `.sliding` klasse (disable scroll-snap during animation)

---

## 2. Exacte CSS Waarden — Apple Maps vs Ons Plan

### 2.1 Border Radius

| Element | Apple Maps | Ons plan | Status |
|---------|-----------|---------|--------|
| Sheet top corners | `12px 12px 0px 0px` | `20px` | **AFWIJKING** — 12px, niet 20px |
| Pill buttons | `16px` | `16px` | OK |
| Photo items | `10px` | `10px` (`--wg-radius-sm: 8px`) | **AFWIJKING** — 10px, niet 8px |
| Close/share buttons | `50%` (cirkel) | niet gespecificeerd | ONTBREEKT |
| Search bar container | `12px` | `12px` (`--wg-radius-md`) | OK |
| Nav bar recents items | `12px` | — | — |

**Aanbeveling:** `--wg-radius-xl` aanpassen van `20px` naar `12px`.

### 2.2 Backdrop Filter

| Element | Apple Maps | Ons plan | Status |
|---------|-----------|---------|--------|
| Sheet/card | **GEEN** (`backdrop-filter: none`) | `blur(20px)` | **GROTE AFWIJKING** |
| Nav bar (desktop) | `blur(50px)` | niet gespecificeerd | ONTBREEKT |
| Search list dropdown | `blur(15px)` | — | — |
| General list (.mw-list) | `blur(15px)` | — | — |
| Legal links | `blur(50px)` | — | — |
| Map type buttons | `blur(50px)` | — | — |
| Card close/share buttons | **`none`** (expliciet!) | — | — |
| Photo gallery blur layer | `blur(15px)` | — | — |

**CRUCIAAL:** Apple Maps gebruikt **GEEN backdrop-filter op de sheet/card zelf!** De kaart heeft een solide achtergrondkleur (`rgb(242, 242, 242)` in dark mode, vermoedelijk wit/lichtgrijs in light mode). Ons plan specificeerde `blur(20px)` met `rgba(250, 247, 242, 0.78)` — dit is fundamenteel anders.

**Aanbeveling:** `plan.md` Fase 4A klopt eigenlijk al beter: "Sheet krijgt solide warme achtergrond [...] geen backdrop-filter." Dit moet de leidende specificatie zijn. `plan-warm-glass-redesign.md` sectie 4.2 met `backdrop-filter` op de sheet is INCORRECT.

### 2.3 Achtergrondkleuren

| Element | Apple Maps (dark mode gemeten) | Apple Maps (light mode geschat) | Ons plan |
|---------|-------------------------------|--------------------------------|---------|
| System background | `#2b2b2b` | `#ffffff` | `#FAF7F2` |
| Card background | `rgb(242, 242, 242)` | `rgb(242, 242, 242)` (~`#f2f2f2`) | `#FFFCF9` |
| Nav bar bg | `rgba(0, 0, 0, 0.6)` + blur | — | niet gespecificeerd |
| Text primary | `#ffffff` (dark) | `#000000` (light) | `#2D2926` |
| Text secondary | `rgba(235,235,245,0.6)` | system secondary | `rgba(60,45,38,0.60)` |
| Text tertiary | `rgba(235,235,245,0.3)` | system tertiary | `rgba(60,45,38,0.30)` |
| System blue | `#0a84ff` | `#007aff` | niet in palette |
| Button bg | `rgba(143, 143, 146, 0.14)` | — | niet gespecificeerd |

**Apple gebruikt system-level CSS variables** (`--system-background`, `--label`, `--secondary-label`, `--tertiary-label`, `--system-blue`, etc.) die automatisch switchen tussen light en dark mode. Dit is een iOS design system pattern.

### 2.4 Box Shadow

| Element | Apple Maps | Ons plan |
|---------|-----------|---------|
| Card | `rgba(0,0,0,0.024) 10px 1px 5px` | `--wg-shadow-raised` (dual-layer) |

**Apple's shadow is EXTREEM subtiel** — opacity 0.024 (bijna onzichtbaar). Ons dual-layer shadow systeem is zwaarder.

### 2.5 Transitions & Timing

| Transition | Apple Maps | Ons plan |
|-----------|-----------|---------|
| Card transform | `0.15s ease-out` (desktop) / `0.3s ease-in-out` (mobile) | `0.3s cubic-bezier(0.32, 0.72, 0, 1)` |
| Card full state | `0.2s ease-in-out` (transform) + `0.25s linear` (opacity) | `400ms ease-sheet` |
| Sidebar slide | `0.25s ease-in-out` (left, width) | `0.2s ease-out` + `0.15s` |
| Pill button | `0.2s ease-out` (transform) | `0.15s ease-default` |
| Close/share buttons | `0.2s ease-out` (opacity, transform) | — |
| Image fade-in | `0.3s linear` (opacity) | — |
| Popover show | `0.2s cubic-bezier(0.25, 0.1, 0.25, 1.3)` | — |
| Foldable sections | `0.25s` (height, opacity) | — |
| Search result items | `0.14s ease-out` | — |

**Belangrijkste inzicht:** Apple Maps gebruikt **GEEN spring curves** voor de meeste animaties! Bijna alles is `ease-out` of `ease-in-out`. De enige "overshoot" curve is op popovers: `cubic-bezier(0.25, 0.1, 0.25, 1.3)`.

**Ons plan overschat de noodzaak van spring physics.** `motion/mini` is overbodig voor Apple Maps-achtige animaties — pure CSS `ease-out` transitions zijn voldoende.

### 2.6 Pill Buttons (Filter Chips)

```css
/* Apple Maps — exacte CSS */
.pill-button {
  border: 1px solid var(--tertiary-label);
  cursor: pointer;
  box-sizing: border-box;
  will-change: transform;
  color: var(--label);
  background-color: rgba(0, 0, 0, 0);  /* transparant! */
  border-radius: 16px;
  outline: none;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-family: inherit;
  font-size: 0.9412rem;  /* ~15px */
  transition: transform 0.2s ease-out;
  display: flex;
}

.pill-button[data-selected="true"] {
  /* Active state - filled background */
}

.pill-button:hover {
  /* Hover state */
}
```

**Ons plan klopt grotendeels:** `border-radius: 16px`, `border: 1px solid`, `padding: 6px 12px`. Kleine afwijking: font-size is `0.9412rem` (~15px), niet 14px.

### 2.7 Search Input

```css
/* Apple Maps search input */
#mw-search-input {
  font-size: 17px;
  role: combobox;
  placeholder: "Apple Maps";
  border-radius: 0px;  /* binnen de search bar container */
}

/* Search bar container */
.mw-search-bar-container {
  border-radius: 12px;
}

/* Cancel button */
.mw-search-container .mw-cancel-button {
  /* Tekst-knop "Cancel" rechts */
}
```

**Ons plan klopt:** Search pill pattern met expanderende zoekbalk + Cancel knop.

---

## 3. Desktop Layout

### Wat Apple Maps ECHT doet:

```
┌─────────────┬───────────────────────┬──────────────────────────────┐
│ Nav bar     │ Card container        │                              │
│ (210px)     │ (420px + 20px pad)    │         MAP                  │
│             │                       │    (full width, behind all)  │
│ [Logo]      │ (leeg bij start!)     │                              │
│ [Search]    │ (card verschijnt bij  │     [controls]               │
│ [Guides]    │  zoeken/selectie)     │     (z-index: 3)             │
│ [Directions]│                       │                              │
│             │                       │                              │
│ z-index: 99 │ position: absolute    │                              │
│ backdrop:   │ width: 420px          │                              │
│ blur(50px)  │ left: 211px           │                              │
│ bg: rgba    │ padding-right: 20px   │                              │
│ (0,0,0,0.6) │ transition:          │                              │
│             │   left 0.25s ease-    │                              │
│             │   in-out              │                              │
│             │                       │                              │
│ [Privacy]   │                       │     [Privacy Terms Legal]    │
│ [Terms]     │                       │                              │
└─────────────┴───────────────────────┴──────────────────────────────┘
```

### Verschil met ons plan:

| Aspect | Apple Maps | Ons plan |
|--------|-----------|---------|
| Nav bar positie | Links, verticaal, 210px breed | Niet gespecificeerd (alleen top-nav) |
| Nav bar achtergrond | `rgba(0,0,0,0.6)` + `blur(50px)` | — |
| Sidebar breedte | 420px (+ 20px padding = 440px totaal) | 440px |
| Sidebar initiële staat | **LEEG** — geen kaart, alleen nav bar | Altijd lijst met resultaten |
| Sidebar achtergrond | Transparant (card bepaalt bg) | Glass panel met blur |
| Card background | `rgb(242, 242, 242)` (solide) | `rgba(255, 242, 229, 0.88)` + blur |
| Map positie | Full viewport (1280px), achter sidebar | Naast sidebar |
| Map left offset | `0px` (achter nav bar en sidebar) | Rechts van sidebar |

**CRUCIAAL VERSCHIL:** Apple Maps' kaart is FULL WIDTH en de sidebar/nav bar drijven erboven met transparantie. De kaart begint NIET naast de sidebar. Dit is het "map-first" principe in actie.

Bij 1024px of kleiner:
```css
@media (max-width: 1024px) {
  #shell-tray-card-container { width: 393px; }
}
```

### Z-Index Layer Stack (Desktop)

| Z-Index | Element | Beschrijving |
|---------|---------|-------------|
| auto | Map container | Basis laag |
| 0 | `#shell-tray` | Sheet/sidebar container |
| 1 | Map view | MapKit JS view |
| 3 | Map controls | Zoom, compass, etc. |
| 10 | Menu wrapper | Context menus |
| 99 | `#shell-nav` | Nav bar |
| 1000 | `#shell-overlay` | Modals, overlays |

---

## 4. Performance Optimalisaties

### Wat Apple Maps doet:

```css
/* will-change */
.pill-button { will-change: transform; }
.mw-card { will-change: opacity; }
.mw-popover { will-change: transform, opacity, visibility; }
.mw-search-content { will-change: scroll-position; }

/* contain */
look-around-view-element .mw-look-around-view { contain: strict; }

/* content-visibility */
.mw-guide-list .mw-brick {
  content-visibility: auto;
  contain-intrinsic-size: 211px;
}

/* GPU compositing */
.mw-card { transform: translateZ(0px); }

/* Touch handling */
horizontal-pages .mw-scrollable {
  touch-action: pan-x pan-y;
  overscroll-behavior-x: contain;
}

/* Scroll behavior */
#shell-wrapper {
  overscroll-behavior-y: none;
  scrollbar-width: none;
}
```

### Vergelijking met ons plan:

| Optimalisatie | Apple Maps | Ons plan | Status |
|--------------|-----------|---------|--------|
| `will-change` op sheet | `opacity` | `transform` | Verschilt (beide valid) |
| `will-change` op pill buttons | `transform` | Niet gespecificeerd | ONTBREEKT |
| `content-visibility: auto` | Ja, op guide bricks | Ja, in Fase 5 | OK (maar later) |
| `contain: strict` | Op look-around view | Niet gespecificeerd | ONTBREEKT |
| `overscroll-behavior` | `none` op wrapper | Niet gespecificeerd | ONTBREEKT |
| `scrollbar-width: none` | Ja | Niet gespecificeerd | ONTBREEKT |
| GPU hint (`translateZ(0)`) | Op `.mw-card` | Niet gespecificeerd | ONTBREEKT |
| Disable backdrop during drag | **Niet nodig** (geen backdrop op card!) | Ja (hack) | N/A |

---

## 5. Dark Mode

Apple Maps heeft **173 `prefers-color-scheme: dark` media query groups** — extreem uitgebreide dark mode ondersteuning. Ze gebruiken system-level CSS custom properties:

```css
/* Voorbeelden van Apple's system tokens */
--system-background: #2b2b2b;  /* dark */
--label: #fff;                  /* dark */
--secondary-label: rgba(235, 235, 245, 0.6);  /* dark */
--tertiary-label: rgba(235, 235, 245, 0.3);   /* dark */
--system-blue: #0a84ff;         /* dark */
```

**Ons plan:** Dark mode is "expliciet deferred" maar tokens zijn voorbereid. Dit klopt — we hoeven niet meteen dark mode te implementeren, maar het token-systeem moet het ondersteunen.

---

## 6. Fonts & Typografie

| Aspect | Apple Maps | Ons plan |
|--------|-----------|---------|
| Font family | SF Pro (system font via Apple CDN) | Fraunces + DM Sans |
| Search font-size | 17px | — |
| Pill button font-size | 15px (~0.9412rem) | — |
| Body font-size | 1rem (16px) | clamp() fluid scale |
| Error text | 1rem, weight 400, line-height 1.313rem | — |

Apple laadt SF Pro via: `https://www.apple.com/wss/fonts/?families=SF+Pro,v4|SF+Pro+Icons,v3`

**Ons plan klopt:** We gebruiken eigen fonts (Fraunces + DM Sans), niet Apple's SF Pro. Dit is correct — we bouwen niet een Apple Maps kopie maar gebruiken hun UX-patronen met eigen visuele identiteit.

---

## 7. Animaties & Keyframes

Apple Maps definieert **48 @keyframes** animaties. De meest relevante:

```css
@keyframes fadeIn { /* standard fade */ }
@keyframes fadeOut { /* standard fade */ }
@keyframes moveIn { /* slide in */ }
@keyframes moveOut { /* slide out */ }
@keyframes activate { /* tap feedback */ }
@keyframes activate-border { /* tap feedback on bordered elements */ }
@keyframes loading-indicator-keyframe { /* spinner */ }

/* Focus animations voor foto-galerij */
@keyframes focus-top-left { }
@keyframes focus-top-right { }
@keyframes focus-bottom-left { }
@keyframes focus-bottom-right { }
```

**62 CSS animaties** zijn gedefinieerd, voornamelijk voor:
- Foto galerij focus/unfocus
- Loading spinners
- Card activate (tap) feedback
- Element in/out transitions

**Geen spring animations in CSS!** Apple Maps gebruikt geen CSS spring() of complexe cubic-bezier curves. Bijna alles is `ease`, `ease-out`, of `ease-in-out`.

---

## 8. DOM Structuur

### Mobile Sheet DOM (vereenvoudigd):

```html
<div id="shell-wrapper">
  <div id="shell-map-outer">
    <!-- MapKit canvas + controls -->
    <div class="mk-controls-container" style="z-index: 3">
      <!-- zoom, compass, location buttons -->
    </div>
  </div>

  <div id="shell-tray" style="--tray-position: 696; margin-top: 750px">
    <div id="shell-tray-bg"></div>  <!-- sticky background -->

    <div class="mw-card" style="border-radius: 12px 12px 0 0">
      <div class="mw-card-handle" style="position: sticky; z-index: 11">
        <!-- drag handle indicator -->
      </div>

      <div class="mw-inner">
        <div class="mw-search-container">
          <div class="mw-search-header">
            <div class="mw-search-bar-container">
              <input id="mw-search-input" role="combobox" />
              <button class="mw-cancel-button">Cancel</button>
            </div>
          </div>
          <div class="mw-search-content">
            <!-- "Find Nearby" tiles -->
            <div class="mw-search-home-find-nearby-items">
              <!-- category tiles (Petrol, Restaurants, etc.) -->
            </div>
            <!-- Search results list -->
            <div class="mw-search-list" style="backdrop-filter: blur(15px)">
              <!-- autocomplete results -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="shell-overlay" style="z-index: 1000">
    <!-- Modals, full-screen views -->
  </div>

  <div id="shell-nav" style="z-index: 99">
    <!-- Navigation (hidden on mobile) -->
  </div>
</div>
```

### Desktop DOM (additioneel):

```html
<div class="mw-nav-bar" style="width: 210px; backdrop-filter: blur(50px)">
  <!-- Apple Maps logo -->
  <!-- Search, Guides, Directions nav items -->
  <!-- Recent searches -->
</div>

<div id="shell-tray-card-container" style="width: 420px; left: 211px; padding-right: 20px">
  <div class="mw-card" style="width: calc(100% - 20px); background: rgb(242,242,242)">
    <!-- Search container + results -->
  </div>
</div>
```

---

## 9. Gap Analysis — plan.md vs Realiteit

### Wat we GOED hebben:

1. **Map-first principle** — Apple Maps' kaart is altijd zichtbaar, UI drijft erboven. Ons plan zegt hetzelfde.
2. **Sheet-first navigation op mobile** — Apple Maps' hele navigatie gaat via de sheet/card.
3. **Search pill → expanding search bar** — Apple Maps doet dit exact zo met Cancel knop.
4. **Filter chips styling** — `border-radius: 16px`, `padding: 6px 12px`, transparante achtergrond. Bijna identiek.
5. **Progressive disclosure** — Apple Maps toont eerst minimaal (peek), dan meer bij scrollen.
6. **Desktop sidebar links van kaart** — Correct patroon (al verschilt de exacte implementatie).
7. **Solid sheet background op mobile** (plan.md Fase 4A) — Klopt! Apple Maps heeft GEEN backdrop-filter op de card.

### Wat AFWIJKT:

| # | Ons plan | Apple Maps realiteit | Ernst |
|---|---------|---------------------|-------|
| 1 | Sheet border-radius: 20px | **12px** | Medium — visueel verschil |
| 2 | 3 detents (peek/half/full) | **6 posities** (0-5) | Laag — 3 is voldoende voor ons |
| 3 | Spring animations (motion/mini) | **Geen springs** — `ease-out` / `ease-in-out` | Hoog — motion/mini is overbodig |
| 4 | Sheet transition: `0.3s cubic-bezier(0.32, 0.72, 0, 1)` | `0.3s ease-in-out` (mobile) / `0.15s ease-out` (desktop) | Medium |
| 5 | Glass backdrop-filter op sheet | **Solide achtergrond**, geen blur | Hoog — plan-warm-glass-redesign.md sectie 4.2 is fout |
| 6 | Desktop sidebar: glass panel + blur | **Solide card** met `rgb(242,242,242)`, geen blur op card zelf | Hoog |
| 7 | Desktop sidebar altijd zichtbaar met lijst | **Leeg bij start** — content verschijnt bij zoeken | Medium — bewuste afwijking, wij willen content tonen |
| 8 | Desktop sidebar 440px | **420px** (+ 20px padding = 440px totaal container) | Laag — netto gelijk |
| 9 | Card shadow: dual-layer warm shadows | **Ultra-subtle**: `rgba(0,0,0,0.024) 10px 1px 5px` | Medium |
| 10 | Bottom nav behouden (plan-warm-glass) vs verwijderen (plan.md) | **Geen bottom nav** — alles via sheet | High — plan.md (verwijderen) is correct |

### Wat ONTBREEKT in ons plan:

1. **Desktop nav bar** — Apple Maps heeft een 210px verticale nav bar links met Search/Guides/Directions. Wij hebben alleen een top-nav mode switch.
2. **`overscroll-behavior-y: none`** op de sheet container — voorkomt bounce effect op iOS.
3. **`scrollbar-width: none`** — verberg de scrollbar op de sheet.
4. **`.sliding` klasse** — disable snap/transitions tijdens actieve gesture.
5. **`content-visibility: auto`** op off-screen cards met `contain-intrinsic-size` — Apple doet dit al.
6. **System-level CSS variables** — Apple gebruikt een gestructureerd token systeem (`--system-background`, `--label`, `--secondary-label`, etc.) dat naadloos schakelt voor dark mode.
7. **Card activate animation** — `@keyframes activate` voor tap feedback (0.15s, 2 cycles, alternate).
8. **`transform: translateZ(0px)`** op de card — GPU compositing hint.
9. **Popover overshoot curve** — `cubic-bezier(0.25, 0.1, 0.25, 1.3)` voor tooltips/popovers (de ENIGE "spring-achtige" curve).

---

## 10. Verdict: pure-web-bottom-sheet vs Eigen Engine

### De vraag:
> Is `pure-web-bottom-sheet` de juiste keuze, of moeten we een eigen sheet engine bouwen op basis van wat Apple Maps echt doet?

### Antwoord: **Behoud de huidige engine, maar adopteer Apple Maps' CSS patterns**

Apple Maps gebruikt een scroll-container-gebaseerd systeem dat fundamenteel anders is dan zowel `pure-web-bottom-sheet` als onze huidige engine. Maar:

1. **Onze huidige engine werkt** — het heeft touch tracking, velocity-based snapping, en 3 detents
2. **Een rewrite naar scroll-based is risicovol** — het vereist een compleet andere architectuur
3. **`pure-web-bottom-sheet` is ook transform-based** — het zou geen Apple Maps-achtige scroll geven
4. **Apple's scroll-based approach heeft nadelen** — complexe positie-tracking met CSS variables, moeilijker te debuggen

**Concrete aanbevelingen:**

1. **Verwijder `motion/mini` uit het plan** — Apple Maps gebruikt geen spring physics. Gewone `ease-out` CSS transitions zijn voldoende. Dit bespaart een dependency.

2. **Pas de timing curve aan:**
   ```css
   /* Was: */
   --wg-ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);

   /* Wordt (Apple Maps): */
   --wg-ease-sheet: ease-in-out; /* 0.3s op mobile */
   --wg-ease-card: ease-out;     /* 0.15s op desktop */
   ```

3. **Verwijder backdrop-filter van de sheet** — solide achtergrond is wat Apple Maps doet:
   ```css
   .bottom-sheet {
     background: #FFFCF9;  /* warm wit, solide */
     backdrop-filter: none;
     border-radius: 12px 12px 0 0;
     box-shadow: 0 -1px 5px rgba(0,0,0,0.024); /* ultra-subtle */
   }
   ```

4. **Voeg performance hints toe:**
   ```css
   .bottom-sheet {
     transform: translateZ(0);
     will-change: transform;
     overscroll-behavior-y: none;
     -webkit-overflow-scrolling: touch;
   }
   ```

5. **Voeg een CSS custom property toe voor positie tracking:**
   ```css
   /* JS zet dit tijdens drag/snap */
   :root { --sheet-position: 696; }

   /* Andere elementen kunnen hierop reageren */
   .map-controls {
     bottom: calc(100svh - var(--sheet-position) * 1px - 16px);
   }
   ```

---

## 11. Samenvatting Aanpassingen aan plan.md

### Moet veranderen:

| Item | Huidige waarde | Nieuwe waarde | Reden |
|------|---------------|---------------|-------|
| Sheet border-radius | `20px` | `12px` | Apple Maps exact |
| Sheet backdrop-filter | `blur(20px)` | `none` (solide bg) | Apple Maps doet dit niet |
| Sheet transition | `cubic-bezier(0.32, 0.72, 0, 1)` | `ease-in-out` | Apple Maps patroon |
| Sheet transition duur | `400ms` | `300ms` | Apple Maps exact |
| motion/mini dependency | Ja (2.3kb CDN) | **Verwijderen** | Overbodig, geen springs nodig |
| Spring parameters tabel | 6 entries | **Verwijderen** | Apple gebruikt geen springs |
| Card shadow | Dual-layer warm | `rgba(0,0,0,0.024) 10px 1px 5px` | Apple Maps exact |
| `--wg-radius-xl` | `20px` | `12px` | Apple Maps sheet radius |
| `--wg-radius-sm` | `8px` | `10px` | Apple Maps photo/card radius |

### Moet toegevoegd:

1. **`overscroll-behavior-y: none`** op sheet container
2. **`transform: translateZ(0)`** op sheet element
3. **CSS custom property `--sheet-position`** voor positie tracking
4. **`.dragging` klasse** op sheet during gesture (disable transitions)
5. **`scrollbar-width: none`** op scrollable containers
6. **`content-visibility: auto`** op off-screen cards (verplaats van Fase 5 naar Fase 2)
7. **Popover curve** `cubic-bezier(0.25, 0.1, 0.25, 1.3)` voor tooltips (DE enige overshoot curve)

### Kan blijven:

- Fraunces + DM Sans font stack (bewuste afwijking van SF Pro)
- Warme kleurpalet (#FFFCF9, koraal, terracotta)
- Filter chips styling (bijna identiek aan Apple Maps)
- Search pill → expanding search bar pattern
- Desktop sidebar concept (440px totaal)
- 3-detent systeem (peek/half/full is voldoende)
- EventBus / templates.js / switchView refactor (interne architectuur)

---

## 12. Screenshots Referenties

Alle screenshots staan in `/tmp/apple-maps-research/`:

| Bestand | Beschrijving |
|---------|-------------|
| `mobile-01-initial.png` | Mobile peek state — dark mode, search bar onderaan, "Find Nearby" categorie-knoppen |
| `mobile-02-search-focused.png` | Search bar gefocust, cursor zichtbaar, blauw outline |
| `mobile-03-search-typing.png` | "Amsterdam" getypt, autocomplete suggesties zichtbaar, Cancel knop rechts |
| `mobile-04-search-results.png` | Amsterdam geselecteerd, place card zichtbaar met Directions knop, Population/Elevation/Area |
| `desktop-01-initial.png` | Desktop layout, nav bar links (Search/Guides/Directions), full-width kaart |
| `desktop-02-chrome-initial.png` | Zelfde als desktop-01, met Chrome UA |

---

## 13. Ruwe Data Bestanden

Alle JSON bestanden in `/tmp/apple-maps-research/`:

| Bestand | Inhoud |
|---------|--------|
| `mobile-structure.json` | Volledige DOM tree analyse van mobile layout |
| `css-analysis.json` | 136 transitions, 62 animations, 48 keyframes, 25 scroll-snap rules, 15 backdrop-filters |
| `sheet-deep.json` | Diepte-analyse van het best-scorende sheet element |
| `search-deep.json` | Alle search-gerelateerde elementen met computed styles |
| `tray-analysis.json` | `#shell-tray`, `.mw-card`, drag handle, search container analyse |
| `sheet-css-rules.json` | 688 CSS regels gerelateerd aan tray/card/sheet/search |
| `tray-position-css.json` | 124 CSS regels met `--tray-position` referenties |
| `scroll-snap-css.json` | Alle scroll-snap gerelateerde CSS |
| `timing-css.json` | Transition/animation timing waarden voor sheet-gerelateerde elementen |
| `inline-data.json` | Inline styles en data-attributen (JS-driven state) |
| `desktop-layout-detailed.json` | Desktop nav bar, card container, CSS variables |
