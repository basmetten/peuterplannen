# Plan 3: Typography, Illustraties & Progressive Disclosure

## Doel

PeuterPlannen visueel en interactief naar professioneel niveau tillen via drie pijlers:
1. **Typografie** — consistent token-systeem op ALLE pagina's
2. **Illustraties** — warme vector-art subtiel integreren buiten de blog
3. **Progressive Disclosure** — informatie-architectuur die rust en overzicht geeft op elk scherm

Het eindresultaat moet aanvoelen als één doordacht merk, niet als losse pagina's. Elegant maar niet rommelig — aantrekkelijk voor Nederlandse ouders op mobile devices in 2026/2027.

---

## Synthetische Focusgroep

### Normie-ouder (Sanne, 33, Amsterdam, iPhone 14)
> "Die homepage-titel is mooi, maar zodra ik op een stadspagina kom ziet het er minder af uit. Knoppen en labels voelen als een andere site. De blog-illustraties zijn schattig — waarom staan die alleen bij artikelen? En ik zie op de app-pagina meteen 25 filterknoppen — dat is overweldigend als ik gewoon snel iets wil vinden."

### Webdesigner (Daan, 28, freelancer, 2026 design trends)
> "Jullie hebben Fraunces + Instrument Serif + DM Sans — driekoppig typesysteem dat fantastisch kan werken. Maar Instrument Serif wordt precies één keer gebruikt. En overal hardcoded px-waarden in inline styles die de fluid tokens overschrijven. Progressive disclosure is in 2026 de standaard — Apple, Linear, Notion doen het allemaal. Toon eerst de essentie, onthul details op interactie."

### Ondernemer/growth hacker (Lisa, 36, startup-achtergrond)
> "Blog-cards met illustraties hebben hogere engagement dan gradient fallbacks. Categoriepagina's zijn puur tekst — daar mis je visual hooks. En consistentie = vertrouwen = conversie. Progressive disclosure verlaagt cognitive load en verbetert time-to-action."

### Mobile developer (Kai, 31, Android + iOS)
> "Die inline style blocks die in elke gegenereerde pagina staan — dat is een maintainability-nachtmerrie. Eén wijziging = 50 bestanden updaten. En op mobile moet je keuzes maken over wat je meteen toont. Alles tegelijk dumpen is een desktop-reflex."

---

## Fase 1: Typography Token Migration (fundament)

### Probleem
Elke gegenereerde pagina (~50 bestanden) bevat een identiek inline `<style>` blok met hardcoded px-waarden die de token-waarden uit style.css overschrijven. Dit maakt central styling onmogelijk.

### Fix — Verplaats inline styles naar style.css met tokens

| Hardcoded | Token | Elementen |
|-----------|-------|-----------|
| `12px` | `var(--pp-text-xs)` | `.guide-kicker`, `.guide-pill`, `.editorial-support-links span` |
| `13px` | `var(--pp-text-xs)` | `.guide-link span` |
| `14px` | `var(--pp-text-sm)` | `.editorial-support-card p`, `.editorial-support-links strong` |
| `15px` | `var(--pp-text-sm)` | `.guide-link strong` |
| `16px` | `var(--pp-text-base)` | `.guide-card p`, `.guide-card li` |
| `17px` | `var(--pp-text-base)` | `.editorial-body p, li` |
| `18px` | `var(--pp-text-lg)` | `.editorial-support-card h3` |
| `clamp(22px, 4vw, 28px)` | `var(--pp-text-xl)` | `.guide-card h3`, `.editorial-body h3` |
| `clamp(28px, 5vw, 40px)` | `var(--pp-text-2xl)` | `.guide-card h2`, `.editorial-body h2` |

### Aanpak
1. Voeg guide/editorial styles toe aan `style.css` met token-waarden
2. Pas build-templates aan om het inline block te verwijderen
3. Regenereer alle pagina's met `node .scripts/sync_all.js`
4. Verifieer dat er niets verschuift (tokens zijn ~gelijk aan de px-waarden)

### Bestanden
- `.scripts/lib/page-*.js` (template bestanden)
- `style.css`
- Alle gegenereerde HTML's (via rebuild)

---

## Fase 2: Homepage Typography Cleanup

### Probleem
`index.html` inline styles gebruiken hardcoded px-waarden in plaats van design tokens.

### Fix

| Element | Nu | Wordt |
|---------|-----|-------|
| `.hero-kicker` | `12px` | `var(--pp-text-xs)` |
| `.hero-content h1` | `clamp(44px, 5.8vw, 68px)` | `var(--pp-text-4xl)` |
| `.hero-content p` | `20px` | `var(--pp-text-lg)` |
| `.hero-popular span/a` | `13px` | `var(--pp-text-xs)` |
| `.hero-preset-chip` | `14px` | `var(--pp-text-sm)` |
| `.section-title` | `clamp(30px, 4vw, 46px)` | `var(--pp-text-3xl)` |
| `.section-sub` | `17px` | `var(--pp-text-base)` |
| `.city-card strong` | `19px` | `var(--pp-text-lg)` |
| `.city-card span` | `13px` | `var(--pp-text-xs)` |
| `.blog-preview-card strong` | `16px` | `var(--pp-text-base)` |

### Bestanden
- `index.html` (inline `<style>` blok)

---

## Fase 3: Instrument Serif Expansie

### Probleem
Het accent-font (Instrument Serif italic) wordt slechts 1x gebruikt: het woord "peuteruitjes" op de homepage h1. Het font wordt al geladen — het kost niets extra om het breder in te zetten.

### Waar toepassen (subtiel — max 1 accent per heading)

| Context | Toepassing | Voorbeeld |
|---------|-----------|---------|
| Blog post titels | Accent-woord in h1 | "Arnhem met peuters: natuur, dieren en *verrassend* veel te doen" |
| Sectie-ondertitels homepage | Lead-in woord | "*Elke regio* omvat de stad én omliggende gemeenten" |
| Category page hero subtitle | Ondertitel | "*De mooiste* speeltuinen voor peuters" |
| Blog index hero | Subtitel | "*Praktische gidsen* voor ouders met peuters" |
| Pull quotes in blog body | Gehele quote | Nieuw `.pullquote` element |

### Implementatie
- CSS rule bestaat al: `.accent { font-family: var(--pp-font-accent); font-style: italic; }`
- Per element: wrap accent-woord in `<span class="accent">...</span>`
- **Regel:** maximaal 1 accent per heading, nooit in body text, nooit in buttons/chips

---

## Fase 4: Illustraties Breder Integreren

### Huidige staat
- 49 blog posts met warme flat-vector illustraties
- Stijl: terracotta/sage/cream/yellow, Nederlandse settings, simplified characters
- Alleen gebruikt in blog hero's en blog-card thumbnails

### 4A: Category Page Headers (8 nieuwe illustraties)

| Categorie | Scene |
|-----------|-------|
| Speeltuinen | Kinderen op schommels en glijbaan, zandbak |
| Kinderboerderijen | Peuter aait geit, kippen, houten hek |
| Natuur | Familie op bospad, vlinders, beekje |
| Musea | Kind kijkt omhoog naar groot schilderij |
| Zwemmen | Peuter in zwembad, opblaasband, spatwater |
| Pannenkoeken | Gezin aan tafel, grote pannenkoek, boerderij |
| Horeca | Koffie + speelhoek, gezellig café |
| Cultuur | Kind bij muziekinstrumenten, theater |

CSS: `max-height: 160px` mobile, `240px` desktop, full-width, `border-radius: 16px`, `object-fit: cover`.

### 4B: City/Region Page Headers
Hergebruik bestaande blog-illustraties waar mogelijk (amsterdam.html → amsterdam-met-peuters-en-kleuters.jpg). Nieuwe illustraties alleen waar geen blog-match is.

### 4C: Empty States (App)
Illustratie van een leeg speelplein bij "Geen locaties gevonden" — ~200x140px.

### 4D: Homepage Section Dividers
Subtiele horizon-strip (~40px hoog, 8% opacity) met silhouet van molens, bomen, speeltoestellen tussen secties.

### 4E: Blog Card Fallback
Generieke "peuter in park" illustratie voor posts zonder specifieke afbeelding (als dat ooit voorkomt).

---

## Fase 5: Progressive Disclosure — Overal

### Filosofie
Progressive disclosure = toon eerst de essentie, onthul details bij interactie. Dit verlaagt cognitive load, maakt mobile-schermen ruimer, en geeft de gebruiker controle. Apple, Linear, Notion, Arc — alle topproducten van 2025-2026 passen dit toe.

### 5A: Homepage — Regio's Grid

**Nu:** 22 stadkaarten worden allemaal tegelijk getoond → overweldigend, veel scrollen.

**Wordt:**
- Toon top-6 regio's (Amsterdam, Rotterdam, Den Haag, Utrecht, Haarlem, Amersfoort)
- "Alle 22 regio's bekijken" knop die de rest onthult met een smooth expand-animatie
- Desktop: top-8 zichtbaar, rest achter knop

**Implementatie:**
```css
.cities-grid:not(.expanded) .city-card:nth-child(n+7) { display: none; }
```
```js
document.querySelector('.show-all-regions').addEventListener('click', function() {
  document.querySelector('.cities-grid').classList.add('expanded');
  this.style.display = 'none';
});
```

### 5B: Homepage — Situatie-pagina's

**Nu:** 6 situatie-links altijd zichtbaar onder de type-grid.

**Wordt:**
- Verberg achter "Of kies op situatie →" link die de rij smooth inschuift
- Of: toon als horizontale scroll-strip (vergelijkbaar met preset-chips)

### 5C: App — Filter Panel (al gedeeltelijk gedaan)

**Nu:** "Meer filters" toggle met uitklapbare groepen (Weer, Extra, Leeftijd, Afstand) — dit is al progressive disclosure! Maar:

**Verbetering:**
- Type chips in de main list view: toon top-5 (Alles, Speeltuin, Boerderij, Natuur, Museum), rest achter "+" chip die horizontal scrollt
- Preset-chips: toon top-3 op mobile, rest achter "Meer situaties" → accordion
- Desktop sidebar: presets in collapsed accordion by default, filter panel expanded

### 5D: App — Location Cards

**Nu:** Elke loc-card toont alle info tegelijk (naam, type, beschrijving, tags, afstand, acties).

**Wordt:**
- Eerste scan: naam + type-badge + peuterscore + afstandsindicatie
- Expand on tap: volledige beschrijving, alle tags, route-knop, deel-knop
- CSS: `.loc-card-details { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }`
- Toggle via data-attribute: `.loc-card.expanded .loc-card-details { max-height: 300px; }`

### 5E: Blog Post — Lange Artikelen

**Nu:** Artikelen tonen alles in een lange scroll.

**Wordt:**
- TOC (Table of Contents) bovenaan bij posts > 3 headings → sticky op desktop, collapsible op mobile
- "Lees verder" na de intro-paragraaf (eerste 150 woorden) voor langere posts
- Gerelateerde posts: collapsed onder "Meer lezen" toggle ipv altijd zichtbaar

### 5F: Category/City Pages — Guide Cards

**Nu:** Alle guide-cards (locatie-beschrijvingen) worden tegelijk getoond → pagina's met 20+ kaarten.

**Wordt:**
- Toon eerste 6 kaarten
- "Toon alle X locaties" knop met count-badge
- Smooth height-animation bij expand
- Optioneel: lazy-load images voor kaarten onder de fold

### 5G: Footer — Progressive Disclosure

**Nu:** Footer toont alle links altijd (Product, Contact, Legal kolommen).

**Wordt op mobile:**
- Alleen merknaam + "© 2026 PeuterPlannen" + een rij icon-links
- Tik op "Meer" → expandeert naar volledige footer met alle kolommen
- Desktop: ongewijzigd (genoeg ruimte)

### 5H: Navigation — Context-Aware Simplification

**Nu:** Nav toont altijd alle 6 links.

**Wordt:**
- Mobile nav: top-4 items (Home, Ontdekken, Inspiratie, Uitjes zoeken)
- "Over" en "Contact" achter hamburger → secondary level
- Active page highlighted, geen ruimte verspild aan de pagina waar je al bent

---

## Fase 6: Consistentie-audit na implementatie

### Checklist per pagina-type

| Pagina | Fraunces | DM Sans | Serif accent | Tokens | Illustratie | Disclosure |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|
| Homepage | ✓ | ✓ | ✓ h1 | Fase 2 | ✓ hero | 5A, 5B |
| App | ✓ | ✓ | Fase 3 | ✓ al tokens | 4C | 5C, 5D |
| Blog index | ✓ | ✓ | Fase 3 | Fase 1 | ✓ cards | — |
| Blog post | ✓ | ✓ | Fase 3 | Fase 1 | ✓ hero | 5E |
| City page | ✓ | ✓ | Fase 3 | Fase 1 | 4B | 5F |
| Category page | ✓ | ✓ | Fase 3 | Fase 1 | 4A | 5F |
| About/Contact | ✓ | ✓ | Fase 3 | Fase 1 | — | — |

---

## Uitvoeringsvolgorde

| # | Fase | Impact | Risico | Claude Code notes |
|---|------|--------|--------|-------------------|
| 1 | Token migration | Hoog (50+ pagina's) | Laag | Template-wijziging + rebuild, verifieer met Playwright |
| 2 | Homepage cleanup | Medium | Laag | Enkel index.html inline styles |
| 3 | Instrument Serif | Medium (brand) | Laag | Templates + handmatig, max 1 accent/heading |
| 4 | Illustraties genereren | Hoog (visual) | Medium | Batch via generate-blog-images.js, optimize via optimize_images.js |
| 5A | Regio's disclosure | Medium | Laag | Bestaat al deels (.show-all-regions), uitbreiden |
| 5C | App filter disclosure | Hoog (UX) | Medium | Al gestart (map filters), uitbreiden naar list view |
| 5D | Card disclosure | Hoog (mobile UX) | Medium | CSS transition, JS toggle, test touch targets |
| 5E | Blog TOC + read more | Medium | Laag | Build template wijziging |
| 5F | Guide cards disclosure | Medium | Laag | Vergelijkbaar met 5A |
| 5G-H | Footer + nav | Laag | Laag | Mobile-only wijzigingen |

---

## Verificatie per fase

- **Playwright** op 320px, 375px, 390px, 428px, 768px, 1280px
- **Lighthouse** performance check (illustraties mogen LCP niet vertragen → lazy load)
- **Visuele check** op echte iPhone via localhost tunnel
- **Commit per fase** — niet alles in één grote commit
- Na elke fase: screenshot vergelijking voor/na
