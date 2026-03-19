# PeuterPlannen UX Revamp — Definitief Bouwplan

> Versie: DEFINITIEF (19 maart 2026)
> Status: Goedgekeurd door Bas. Dit is het werkdocument waarmee we bouwen.
> Gebaseerd op: 30+ research agents, 25+ concurrentanalyses, 2 expert focusgroepen, MOBILE-CONCEPTS.md

---

## Hoe dit plan te lezen

- Elke fase begint met **"Wat verandert er voor de gebruiker?"** in 1-2 zinnen
- Bij elke taak staat een **tijdschatting** in Claude Code-uren en of het **parallel** kan
- CSS specs en formules zijn **exact en implementeerbaar** — geen "verbeter dit" maar concrete waarden
- Het plan beschermt wat al werkt en bouwt erop voort

---

## Wat we al hebben (niet afbreken)

### Uniek in Nederland
- Kaart + lijst — geen enkele NL concurrent heeft dit
- Situatie-presets (Regenproof, Buiten+koffie) — USP, niemand doet dit
- Ad-vrij, privacy-first, geen cookie walls, geen login
- 2138+ geverifieerde locaties, 22 regio's
- Snelle statische pagina's + Cloudflare CDN

### Rijke data in de database die nauwelijks getoond wordt

| Veld | Wat het is | Huidig gebruik |
|------|-----------|----------------|
| `price_band` | free/low/mid/high | Alleen trust chip op detail |
| `time_of_day_fit` | ochtend/middag/heel de dag | Bullet in detail |
| `rain_backup_quality` | none/weak/strong | Decision sentences |
| `shade_or_shelter` | none/some/good | Niet zichtbaar |
| `parking_ease` | easy/okay/hard | Detail bullets |
| `buggy_friendliness` | easy/okay/tricky | Detail bullets |
| `toilet_confidence` | low/medium/high | Detail bullets |
| `noise_level` | quiet/moderate/loud | Niet zichtbaar |
| `food_fit` | none/snacks/full | Detail bullets |
| `play_corner_quality` | none/basic/strong | Decision sentences |
| `crowd_pattern` | Drukte-patroon | Niet zichtbaar |
| `photo_url` + `photo_source` | Foto-infrastructuur | Kolommen bestaan, leeg |
| `verification_confidence` | Hoe zeker we zijn | Niet zichtbaar |
| `energy_level` | calm/moderate/active | In DB of af te leiden |

### Bestaande code die werkt
- Bottom sheet (`#loc-sheet`) — toont details, maar mist peek/half/full states en gestures
- Plan je dag — GPS, weerfiltering, afstandsberekening, maar primitieve scoring
- Peuterscore (`computePeuterScore`) — max 11 punten, simpel maar werkend
- Desktop split-panel met lijst-kaart sync
- IndexedDB caching (12 uur TTL)

---

## Design-Filosofie: Warm Liquid Glass

### Het Principe
De kaart is het product. De UI zweeft erboven als warm glas. Apple Maps als UX-referentie, maar warmer en persoonlijker.

### Concrete CSS Design Tokens

```css
:root {
  /* Kleuren */
  --pp-cream:        #FFF8E1;
  --pp-terracotta:   #D47756;
  --pp-brown-dark:   #5C4433;
  --pp-brown-muted:  #8B7355;
  --pp-white-soft:   rgba(255, 255, 255, 0.4);
  --pp-shadow-warm:  rgba(212, 119, 86, 0.12);

  /* Glass base — 75-80% opacity, warmer dan Apple */
  --glass-bg:        rgba(250, 247, 242, 0.78);
  --glass-blur:      8px;
  --glass-border:    1px solid var(--pp-white-soft);
  --glass-shadow:    0 4px 16px var(--pp-shadow-warm);

  /* Animatie */
  --spring-curve:    cubic-bezier(0.32, 0.72, 0, 1);
  --snap-duration:   300ms;
}

/* Bottom sheet */
.bottom-sheet-glass {
  background: rgba(250, 247, 242, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 -4px 24px rgba(212, 119, 86, 0.15);
  border-radius: 16px 16px 0 0;
}

/* Filter chips */
.filter-chip-glass {
  background: rgba(250, 247, 242, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 8px rgba(212, 119, 86, 0.06);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--pp-brown-dark);
}
.filter-chip-glass.active {
  background: var(--pp-terracotta);
  color: white;
  border-color: transparent;
}

/* Zoekbalk / search pill */
.search-pill-glass {
  background: rgba(250, 247, 242, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 12px rgba(212, 119, 86, 0.08);
  border-radius: 24px;
  padding: 10px 16px;
}

/* Locatie-kaart in lijst */
.loc-card-glass {
  background: rgba(250, 247, 242, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 12px rgba(212, 119, 86, 0.08);
  border-radius: 12px;
}

/* Firefox fallback */
@supports not (backdrop-filter: blur(1px)) {
  .bottom-sheet-glass, .filter-chip-glass,
  .search-pill-glass, .loc-card-glass {
    background: rgba(250, 247, 242, 0.95);
  }
}

/* Accessibility: hoog contrast */
@media (prefers-contrast: more) {
  .bottom-sheet-glass, .filter-chip-glass,
  .search-pill-glass, .loc-card-glass {
    backdrop-filter: none;
    background: var(--pp-cream);
    border: 2px solid var(--pp-brown-dark);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

### Glass Regels
- Max **3 glass-elementen** tegelijk zichtbaar (search pill + sheet + filter chips)
- Max blur **16px** op mobiel (8-14px aanbevolen)
- Tekst op glas: minimaal **4.5:1 contrast** (WCAG AA)
- `text-shadow: 0 0 8px rgba(255, 248, 240, 0.8)` op alle glastekst boven de kaart (voorkomt onleesbaarheid boven donkere kaartdelen)
- Nooit de kaart zelf glazen — glas is alleen UI-chrome
- Altijd warme schaduwen (`rgba(212, 119, 86, ...)`)
- Tijdens `touchmove` op sheet: `backdrop-filter: none` + solid fallback voor budget-telefoons. Na `touchend`: blur terug met 200ms transitie

---

## Mobiel: Hybride Concept 2 + Concept 3

### Architectuurbeslissing (finaal)

**Basis:** Concept 2 — fullscreen kaart met bottom sheet (Apple Maps / Google Maps patroon)
**Escape hatch:** Concept 3's lijstweergave via toggle-knop (voor wie geen kaart wil)
**Apple Maps webapp als primaire UX-referentie**

### DRIE sheet-posities (finaal)

| Positie | Hoogte | Wat je ziet |
|---------|--------|-------------|
| **Peek** | 120px | Search pill + weer + "X locaties in de buurt" + drag handle |
| **Half** | 50dvh | Locatielijst met compacte kaarten, filters inline toegankelijk |
| **Full** | calc(100dvh - env(safe-area-inset-top)) | Volledige locatiedetail OF volledige lijst |

Bas heeft expliciet gekozen voor DRIE posities, niet twee. De half-state dient als browse-modus: genoeg kaart zichtbaar om oriëntatie te houden, genoeg sheet om locaties te scannen.

### Bottom nav: sheet-gebaseerde navigatie

Op basis van expert-consensus (Safari bottom bar probleem) en pragmatische afweging:

- **Geen aparte 5-tab bottom nav bar in browser-modus** — Safari's bottom bar + home indicator vreten 128px, een eigen nav bar maakt dat 180px+
- **Sheet-header bevat navigatie-tabs:** `[Ontdek] [Opgeslagen] [Plan je dag]` als tabs binnen de collapsed sheet
- **PWA-modus (standalone):** wél een dunne bottom nav (40px) omdat Safari's bar wegvalt

```css
/* Browser-modus: geen bottom nav */
.sheet-collapsed {
  bottom: env(safe-area-inset-bottom, 0px);
}

/* PWA standalone: bottom nav zichtbaar */
@media (display-mode: standalone) {
  .bottom-nav { display: flex; height: 40px; }
  .sheet-collapsed { bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }
}
```

### Lijstweergave (escape hatch)

- Floating toggle-knop (48px, rechtsonder): "Lijst" in kaartmodus, "Kaart" in lijstmodus
- Crossfade 200ms bij wisselen
- Lijstweergave = Concept 3: fullscreen scrollbare kaarten met foto's, solid styling (geen glass op witte achtergrond)
- Glass alleen in kaartweergave waar content (kaart/foto) erdoorheen zichtbaar moet zijn

---

## De Roadmap: Overzicht & Afhankelijkheden

```
Fase 0: Data & Foto's verzamelen (EERST — scraping pipeline)
  │
  ├── Fase 1: Code-fundament (modularisatie + glass tokens + foto-integratie)
  │     │
  │     ├── Fase 2: Rijke Data Ontsluiten (parallel met Fase 3)
  │     ├── Fase 3: Mobiel UX — Bottom Sheet + Lijstweergave (parallel met Fase 2)
  │     │     │
  │     │     └── Fase 4: Plan je dag 2.0 (na foto's + glass + rijke data + sheet)
  │     │
  │     └── Fase 5: Peuterscore 2.0 (na rijke data uit Fase 2)
  │
  └── Fase 6: Personalisatie (na Fase 5)
       │
       ├── Fase 7: Discovery & Retentie + Nieuwsbrief-integratie
       ├── Fase 8: Engelse versie (UITGESTELD — later)
       └── Fase 9: Social Proof & Community (pas bij 3K+ bezoekers)
```

**Parallel mogelijkheden:**
- Fase 2 + 3 tegelijk (onafhankelijke werkstromen, aparte worktrees)
- Fase 0 kan deels parallel met Fase 1 (scraping draait op achtergrond)

---

## Fase 0: Data & Foto's Verzamelen via Scraping

**Wat verandert er voor de gebruiker?**
Nog niets zichtbaar — maar dit vult de lege `photo_url` kolommen en verrijkt ontbrekende data. Zonder foto's is de hele visuele upgrade een lege huls.

### Waarom scraping en geen Google Places API

Google Places Photo API kost $200-300 voor 2138 locaties. Dat is een no-go. In plaats daarvan:

**Haiku subagents met Playwright** — dezelfde aanpak die andere Claude Code developers gebruiken:

### Het concrete scraping-proces

```
Voor elke locatie in de database:

1. CHECK: heeft het al een photo_url die werkt? → skip

2. HEEFT HET EEN WEBSITE URL?
   Ja → Haiku subagent opent de website met Playwright:
   a. Navigeer naar de URL
   b. Wacht tot pagina geladen is (networkidle)
   c. Zoek de beste foto: <meta property="og:image">, hero images, gallery images
   d. Evalueer foto-kwaliteit: minimaal 400px breed, geen logo's, geen banner-ads
   e. Download de foto, resize naar 800x533 (3:2), converteer naar WebP
   f. Upload naar Cloudflare R2 bucket
   g. Update Supabase: photo_url, photo_source='scraped', photo_fetched_at

3. GEEN WEBSITE?
   → Zoek op Google Images met "naam + stad + type" via Playwright
   → Pak het eerste relevante resultaat (Creative Commons waar mogelijk)
   → Zelfde download/resize/upload flow

4. GEEN RESULTAAT?
   → photo_source='placeholder' (pakt categorie-illustratie)

Batchgrootte: 20 per subagent-run (rate limiting, beleefdheid)
Parallellisme: 3-4 subagents tegelijk, elk op een batch van 20
Geschatte kosten: ~$3-8 aan Claude API tokens (Haiku is goedkoop)
Geschatte doorlooptijd: 2-3 uur voor alle 2138 locaties
```

### Foto-opslag en -levering

- **Opslag:** Cloudflare R2 bucket (al in gebruik, 10GB gratis, zero egress fees)
- **Formaten:** WebP als primair, JPEG als fallback
- **Afmetingen:** 800x533px (3:2) voor kaarten en sheet, 1200x675px (16:9) voor detail hero
- **Naamgeving:** `photos/{location_id}_card.webp`, `photos/{location_id}_hero.webp`
- **Delivery:** Direct vanuit R2 via Cloudflare CDN (al geconfigureerd)

### 15 Categorie-illustraties als fallback

AI-gegenereerde warme aquarel-illustraties per type:
`speeltuin`, `kinderboerderij`, `museum`, `zwembad`, `park`, `dierentuin`, `indoor-speeltuin`, `theater`, `bibliotheek`, `strand`, `bos`, `pretpark`, `ijsbaan`, `cafe-met-speelhoek`, `overig`

Stijl: warm, handgetekend gevoel, terracotta/cream kleurenpalet. Duidelijk herkenbaar als illustratie (geen deepfake-foto-poging).

### Data-verrijking tijdens scraping

Terwijl een subagent toch op de website is, scrape ook:
- Openingstijden (als ontbrekend)
- Prijsinformatie (als ontbrekend)
- Beschrijvende tekst (als onze beschrijving kort is)
- Faciliteiten (verschoontafel, parkeren, etc.)

Sla dit op in een staging-tabel, niet direct in productie. Review voor import.

### GDPR & foto-rechten

- Geen foto's met herkenbare kinderen (NL: 16-jaar grens)
- Voorkeur voor foto's van de locatie zelf, zonder mensen
- Bij twijfel: gebruik categorie-illustratie
- Partner-geüploade foto's (via partner portal) zijn juridisch het schoonst — fase 2 van foto-strategie

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 0.1 | Scraping-script bouwen (Haiku + Playwright + R2 upload) | 3-4 uur | Nee |
| 0.2 | Batch-run voor alle 2138 locaties | 2-3 uur (draait op achtergrond) | Ja, terwijl Fase 1 start |
| 0.3 | 15 categorie-illustraties genereren (AI) | 1-2 uur | Ja, parallel met 0.1 |
| 0.4 | Foto-kwaliteitscheck: steekproef van 50 locaties handmatig reviewen | 30 min | Na 0.2 |
| 0.5 | Data-verrijking review en import uit staging-tabel | 1 uur | Na 0.2 |
| | **Totaal Fase 0** | **~1 dag** | |

**Klaar-criterium:** >70% van locaties heeft een echte foto. Alle locaties hebben minimaal een categorie-illustratie. Foto's zijn via R2/CDN beschikbaar.

---

## Fase 1: Code-Fundament

**Wat verandert er voor de gebruiker?**
De app laadt sneller, ziet er warmer uit door het glass-design, en elke locatie toont een foto of illustratie in plaats van een emoji.

### 1.1 app.html opsplitsen in ES modules + event bus

**Waarom:** app.html is 3300+ regels. Ononderhoudbaar. Elke volgende fase wordt een nachtmerrie zonder modularisatie.

**Modulestructuur:**
```
app.js                    (entry point, event bus, state management)
├── modules/map.js        (MapLibre init, markers, clustering, flyTo)
├── modules/sheet.js      (bottom sheet: peek/half/full, gestures, content rendering)
├── modules/filters.js    (preset filters, type chips, weather-reactive filters)
├── modules/search.js     (zoekbalk, live search, recente zoekopdrachten)
├── modules/list.js       (lijstweergave: kaarten renderen, scroll, toggle)
├── modules/plan.js       (Plan je dag wizard + algoritme + tijdlijn output)
├── modules/photos.js     (foto-fallback hierarchie, lazy loading, color placeholders)
├── modules/personalization.js (voorkeuren, onboarding, localStorage)
└── modules/share.js      (WhatsApp delen, Web Share API)
```

**Event bus pattern:**
```javascript
// Simpele pub/sub — geen library nodig
const bus = {
  _events: {},
  on(event, fn) { (this._events[event] ||= []).push(fn); },
  off(event, fn) { this._events[event] = (this._events[event] || []).filter(f => f !== fn); },
  emit(event, data) { (this._events[event] || []).forEach(fn => fn(data)); }
};

// Gebruik:
bus.emit('marker:selected', { locationId: 123 });
bus.on('marker:selected', (data) => sheet.showPeek(data.locationId));
```

| Tijd | 3-4 uur | Parallel: nee, dit is de basis |

### 1.2 Liquid Glass CSS tokens implementeren

Alle design tokens uit de CSS-sectie hierboven als `glass.css` bestand. Importeer in app.html.

| Tijd | 1 uur | Parallel: ja, samen met 1.1 |

### 1.3 Foto-fallback hierarchie in rendering

```
Volgorde per locatie:
1. photo_url (uit Fase 0 scraping) → lazy load met color placeholder
2. owner_photo_url (partner-geüpload) → zelfde behandeling
3. Categorie-illustratie (uit 0.3) → altijd beschikbaar
4. Type-icoon op terracotta achtergrond → ultieme fallback
```

**Lazy loading met color placeholder:**
```html
<div class="photo-container" style="background: var(--photo-color, #E8D5C4)">
  <img loading="lazy" src="photo_url" alt="Locatienaam"
       onload="this.classList.add('loaded')"
       onerror="this.src='illustrations/type.webp'">
</div>
```
```css
.photo-container img { opacity: 0; transition: opacity 300ms ease; }
.photo-container img.loaded { opacity: 1; }
```

| Tijd | 1-2 uur | Parallel: na 1.1 |

### 1.4 Glass styling toepassen op bestaande UI-elementen

Vervang opaque achtergronden door glass tokens op:
- Zoekbalk/search pill
- Filter chips boven de kaart
- Bestaande bottom sheet
- Status-elementen (stad + weer + count)

**Niet glaszen:** locatiekaarten in lijstweergave (solid wit voor leesbaarheid), CTA-knoppen (solid terracotta voor opvallen).

| Tijd | 2-3 uur | Na 1.2 |

### 1.5 Foto's integreren in kaarten + sheet

- Lijstkaarten: foto links (80x60px thumbnail), info rechts
- Bottom sheet peek: foto-thumbnail (60x45) + naam + type + afstand
- Bottom sheet half/full: hero foto (3:2 of 16:9) bovenaan
- Detailpagina's (statisch): hero foto als eerste element

| Tijd | 2-3 uur | Na 1.3 |

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 1.1 | app.html → ES modules + event bus | 3-4 uur | Nee, eerst |
| 1.2 | Glass CSS tokens als glass.css | 1 uur | Ja, met 1.1 |
| 1.3 | Foto-fallback hierarchie | 1-2 uur | Na 1.1 |
| 1.4 | Glass styling op bestaande UI | 2-3 uur | Na 1.2 |
| 1.5 | Foto's in kaarten + sheet | 2-3 uur | Na 1.3 |
| | **Totaal Fase 1** | **~1-1.5 dagen** | |

**Klaar-criterium:** De app is gemodulariseerd, heeft warm glass-uiterlijk, en elke locatie toont een foto of illustratie. Code is onderhoudbaar voor alle volgende fases.

---

## Fase 2: Rijke Data Ontsluiten

**Wat verandert er voor de gebruiker?**
Bij elke locatie zie je in 2 seconden de 3 belangrijkste praktische kenmerken — regenbestendig, goed parkeren, lekker eten, rustig doordeweeks. Informatie die er al was maar verstopt zat.

### Quick-scan tags: maximaal 3 per locatie

**Selectie-algoritme voor welke 3 tags te tonen:**
```javascript
function getTopTags(location) {
  const candidates = [];

  // Weer-gerelateerd (hoogste prioriteit bij regen)
  if (location.rain_backup_quality === 'strong')
    candidates.push({ label: 'Regenproof', icon: '☔', priority: isRaining ? 10 : 3 });
  if (location.shade_or_shelter === 'good')
    candidates.push({ label: 'Veel schaduw', icon: '⛱️', priority: isSunny ? 8 : 2 });

  // Gemak
  if (location.parking_ease === 'easy')
    candidates.push({ label: 'Makkelijk parkeren', icon: '🅿️', priority: 5 });
  if (location.buggy_friendliness === 'easy')
    candidates.push({ label: 'Buggy-vriendelijk', icon: '👶', priority: 4 });
  if (location.toilet_confidence === 'high')
    candidates.push({ label: 'Goede toiletten', icon: '🚻', priority: 3 });

  // Eten & drinken
  if (location.food_fit === 'full')
    candidates.push({ label: 'Goed lunchen', icon: '🍽️', priority: 5 });
  else if (location.food_fit === 'snacks')
    candidates.push({ label: 'Snacks aanwezig', icon: '🍪', priority: 2 });
  if (location.coffee)
    candidates.push({ label: 'Koffie', icon: '☕', priority: 3 });

  // Speelwaarde
  if (location.play_corner_quality === 'strong')
    candidates.push({ label: 'Sterke speelprikkel', icon: '🎯', priority: 6 });
  if (location.noise_level === 'quiet')
    candidates.push({ label: 'Rustige plek', icon: '🤫', priority: 4 });

  // Timing
  if (location.time_of_day_fit === 'ochtend')
    candidates.push({ label: 'Ochtend is het mooist', icon: '🌅', priority: 3 });

  // Drukte
  if (location.crowd_pattern?.includes('rustig doordeweeks'))
    candidates.push({ label: 'Rustig doordeweeks', icon: '📅', priority: 3 });

  // Prijs
  if (location.price_band === 'free')
    candidates.push({ label: 'Gratis', icon: '🎉', priority: 5 });

  return candidates.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
```

### Weer-reactieve badges

- Als het regent: locaties met `rain_backup_quality === 'strong'` krijgen groene "Regenproof" badge op hun kaart
- Als het zonnig is: locaties met `shade_or_shelter === 'good'` krijgen subtiel "Schaduwrijk" label
- Dit is de "Binnenlocaties" smart banner uit de expert-consensus

### "Sterke punten" sectie in sheet

In de half/full sheet, prominent boven de beschrijving:
```
Waarom goed voor peuters
✓ Verschoontafel aanwezig
✓ Kindvriendelijk cafe met koffie
✓ Rustig doordeweeks, druk in weekend
```

Afgeleid uit de hoogst-scorende dimensies van de Peuterscore (zie Fase 5).

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 2.1 | Quick-scan tags op lijstkaarten (max 3 per locatie) | 2-3 uur | Ja |
| 2.2 | "Sterke punten" sectie in bottom sheet | 1-2 uur | Ja |
| 2.3 | Weer-reactieve badges (regen/zon-afhankelijk) | 1 uur | Ja |
| 2.4 | Drukte-indicator op detailweergave | 30 min | Ja |
| 2.5 | Supabase query uitbreiden (alle rijke velden meenemen in rendering) | 1 uur | Eerst |
| | **Totaal Fase 2** | **~halve dag** | |

**Klaar-criterium:** Elke locatie toont 3 contextgevoelige tags. Bij regen zijn regenproof-locaties direct herkenbaar.

---

## Fase 3: Mobiel UX — Bottom Sheet + Lijstweergave

**Wat verandert er voor de gebruiker?**
Op je telefoon werkt de app nu zoals Apple Maps: tik op een locatie, een paneel schuift omhoog met foto en naam. Sleep omhoog voor meer. De kaart blijft altijd bruikbaar. Wil je liever een lijst? Tik op "Lijst".

### Bottom Sheet: 3 staten + hidden

```
HIDDEN:     transform: translateY(100%)     — niets geselecteerd
PEEK:       120px                           — search pill + weer + count
HALF:       50dvh                           — locatielijst of geselecteerde locatie
FULL:       calc(100dvh - env(safe-area-inset-top))  — alles
```

### Touch Gesture Engine (~200 regels vanilla JS)

```javascript
// Kernprincipes:
// 1. touch-action: none op sheet container
// 2. Alle touch events handmatig afhandelen
// 3. Velocity tracking voor flick-herkenning

const PEEK_Y  = window.innerHeight - 120;
const HALF_Y  = window.innerHeight * 0.5;
const FULL_Y  = 44; // safe-area-inset-top fallback

const VELOCITY_THRESHOLD = 0.5; // px/ms — flick detectie
const SNAP_POSITIONS = [PEEK_Y, HALF_Y, FULL_Y];

// Snap-logica:
// Van peek: omhoog slepen >60px OF velocity >0.5px/ms → half
// Van half: omhoog slepen >80px OF velocity >0.5px/ms → full
// Van half: omlaag slepen >60px OF velocity >0.5px/ms → peek
// Van full: omlaag slepen >100px OF velocity >0.5px/ms → half
// Van peek: omlaag slepen >40px → hidden (sluiten)

// Touch conflict resolution:
// - touchstart op sheet drag handle (44px bar) → sheet captures vertical
// - touchstart op sheet content (half/full) → content scrollt
// - Sheet in full + scrollTop === 0 + drag down → collapse naar half
// - touchstart op kaart → kaart captures alle gestures

// Snap-animatie:
// transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)

// Budget-telefoon optimalisatie:
// Tijdens touchmove: backdrop-filter: none (solid fallback)
// Na touchend: backdrop-filter: blur(14px) met 200ms transitie
```

### Sheet-content per staat

**Peek (120px):**
```
╔═══════════════════════════════════╗
║  ─── (drag handle, 44px) ───     ║
║  🔍 Zoek of ontdek...            ║  ← Search pill
║  ☀️ 14° · 23 locaties in de buurt ║  ← Weer + count
║  [Ontdek] [Opgeslagen] [Plan]    ║  ← Navigatie-tabs
╚═══════════════════════════════════╝
```

**Half (50dvh) — browse-modus:**
```
╔═══════════════════════════════════╗
║  ─── (drag handle) ───           ║
║  🔍 Zoek...   [Filter ▾]        ║
║  [Ontdek] [Opgeslagen] [Plan]    ║
║───────────────────────────────────║
║  ┌─────────────────────────┐     ║
║  │📸│ Artis           8.2  │     ║  ← Compact kaart
║  │  │ Dierentuin · 1.2 km  │     ║    Foto links, info rechts
║  │  │ ☔ Regenproof · 🍽️   │     ║    Max 2 tags
║  └─────────────────────────┘     ║
║  ┌─────────────────────────┐     ║
║  │📸│ Vondelpark sp.  9.1  │     ║
║  │  │ Speeltuin · 0.4 km   │     ║
║  │  │ 🎉 Gratis · ⛱️       │     ║
║  └─────────────────────────┘     ║
╚═══════════════════════════════════╝
```

**Full — locatiedetail:**
```
╔═══════════════════════════════════╗
║  ← Terug              ♡   📤    ║
║───────────────────────────────────║
║  ┌───────────────────────────┐   ║
║  │     📸 HERO FOTO (16:9)   │   ║
║  └───────────────────────────┘   ║
║                                   ║
║  Artis                            ║  ← 24px bold
║  [Dierentuin]                     ║  ← Terracotta pill
║  ⭐ 8.2 · Ideaal 2-5 jaar        ║
║                                   ║
║  📍 1.2 km · 🚶 16 min           ║
║  🕐 Open · Sluit om 17:00        ║
║                                   ║
║  Waarom goed voor peuters         ║
║  ✓ Verschoontafel                 ║
║  ✓ Kindvriendelijk cafe           ║
║  ✓ Buitenspeeltuin 1-4 jr         ║
║                                   ║
║  [ Route plannen ]                ║  ← Solid terracotta CTA
║  [ Aan dagplan toevoegen ]        ║  ← Outlined CTA
║                                   ║
║  ▼ Waarom deze score?             ║
║  ▼ Alle faciliteiten              ║
║  ▼ Openingstijden                 ║
║                                   ║
║  ── Meer in de buurt ──           ║
║  [📸 Loc A] [📸 Loc B] →         ║
╚═══════════════════════════════════╝
```

### Marker-interactie

- Tik marker → sheet naar peek met locatiepreview, marker schaalt 28px → 36px met witte border
- Kaart pant zodat marker centreert BOVEN de sheet (niet viewport-midden)
- Cluster-tik → `map.fitBounds(clusterLeaves.getBounds(), { padding: 50 })` met 400ms `flyTo`
- Tik op kaart zonder marker → sheet terug naar peek default

### Kaart/Lijst toggle

```
Floating knop: 48px diameter, rechtsonder, 16px boven sheet peek
Label: "Lijst" in kaartmodus / "Kaart" in lijstmodus
Icon: list-icon of map-icon
Glass: 0.85 opacity, blur 8px
Crossfade: 200ms
```

### Lijstweergave (Concept 3)

Wanneer de toggle "Lijst" is ingedrukt:
- Fullscreen scrollbare kaarten met grote foto's (3:2 aspect ratio)
- Solid styling (geen glass — witte achtergrond)
- Sortering + filter bovenaan
- Toggle-knop wordt "Kaart" om terug te gaan

### Preset Filters — BEHOUDEN en UITBREIDEN

Presets zijn de USP. Ze blijven. Bereikbaar via een "Filter" icoon in de sheet-header.

**Bestaande presets:**
- Regenachtige dag
- Buiten + koffie
- Dreumes-uitjes

**NIEUW preset:**
- **"Terrasje met de kids"** — use case: weekendmiddag met partner. Filtert op: `food_fit IN ('snacks', 'full') AND coffee = true AND (weather = 'outdoor' OR weather = 'both')`. De naam is direct duidelijk voor ouders.

**Type-filters als secundaire laag:**
Onder de presets: horizontaal scrollbare type-chips (Speeltuin, Kinderboerderij, Museum, Zwembad, Meer).

### Map Performance Optimalisaties

```javascript
// MapLibre config
{
  pixelRatio: Math.min(devicePixelRatio, 2),  // cap op 2x
  fadeDuration: 0,                             // snellere perceived load
  cooperativeGestures: false,                  // niet op onze kaart
  pitchWithRotate: false,                      // geen 3D, bespaart GPU
  dragRotate: false,                           // geen rotatie nodig
}

// Clustering (bestaande config is goed)
{
  maxZoom: 13,
  radius: 45
}

// Lazy-load MapLibre: alleen initialiseren bij eerste kaart-tab navigatie
// Niet bij page load (bespaart 200-400KB initial download)
```

### Safari-specifieke fixes

```css
/* Gebruik dvh, niet vh */
.sheet-half { height: 50dvh; }
.sheet-full { height: calc(100dvh - env(safe-area-inset-top, 0px)); }

/* Map vult beschikbare ruimte */
.map-container { height: 100dvh; width: 100vw; }

/* Safe area padding */
.sheet-collapsed { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); }
```

### Deep linking (URL state)

```
app.html#@52.36,4.90,14z              → kaart op deze positie
app.html#@52.36,4.90,14z/loc/artis    → kaart + sheet open op Artis
app.html#list/amsterdam               → lijstweergave Amsterdam
app.html#plan                          → Plan je dag wizard
```

Essentieel voor WhatsApp-delen: een gedeelde link moet de juiste locatie openen in de juiste sheet-staat.

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 3.1 | Sheet refactor: 4 states met CSS transforms | 2-3 uur | Nee |
| 3.2 | Touch gesture engine (velocity + snap + conflict resolution) | 2-3 uur | Na 3.1 |
| 3.3 | Sheet content: peek + half + full states | 2-3 uur | Na 3.1 |
| 3.4 | Sheet-gebaseerde navigatie (tabs: Ontdek/Opgeslagen/Plan) | 1-2 uur | Na 3.3 |
| 3.5 | Kaart-interactie bij open sheet (centering, marker scaling) | 1-2 uur | Na 3.2 |
| 3.6 | Kaart/Lijst toggle + lijstweergave | 2-3 uur | Parallel met 3.2 |
| 3.7 | Preset filters behouden + "Terrasje met de kids" toevoegen | 1 uur | Parallel |
| 3.8 | Map performance + Safari fixes + deep linking | 1-2 uur | Na 3.5 |
| 3.9 | Glass styling op sheet + search pill | 1 uur | Na 3.1 |
| | **Totaal Fase 3** | **~1.5-2 dagen** | |

**Klaar-criterium:** Tik op marker → peek schuift omhoog → sleep voor details → kaart blijft bruikbaar. Lijst-toggle werkt. Voelt als Apple Maps met een warm Nederlands jasje.

---

## Fase 4: Plan je dag 2.0

**Wat verandert er voor de gebruiker?**
Je vult je leeftijd, vervoer en tijdsduur in. Je krijgt een visueel dagprogramma met foto's, reistijden en peuter-buffers. Je kunt locaties wisselen of het hele plan delen via WhatsApp.

### Input flow: progressive disclosure

**Stap 1 — "Hoe oud is je peuter?"**
4 grote knoppen, full-width, 64px hoog:
```
[  Baby (0-1)  ]
[ Dreumes (1-2) ]
[ Peuter (2-4)  ]
[ Kleuter (4-6) ]
```
Meerdere selecteerbaar (voor gezinnen met meerdere kinderen).

**Stap 2 — "Hoe ga je op pad?"**
3 icoonkaarten, naast elkaar:
```
[ 🚲 Fiets ] [ 🚗 Auto ] [ 🚌 OV ]
```
Bakfiets = Fiets. Geen apart icoon.

**Stap 3 — "Wanneer?"**
```
[ Vandaag ] [ Morgen ] [ Kies datum 📅 ]
```

**Stap 4 — "Hoe lang?"**
4 template-knoppen met subtekst:
```
[ Ochtend     (2-3 uur, 1-2 plekken) ]
[ Halve dag   (4 uur, 2-3 plekken)   ]
[ Hele dag    (7 uur, 3-5 plekken)    ]
[ Eén locatie (de beste plek voor nu) ]
```

**Stap 5 — CTA:**
```
[  ✨ Maak mijn dagplan  ]
```
2-3 seconden laadanimatie (terracotta spinner met subtiele sparkle).

### Het 8-Dimensie MCDM Scoring Algoritme

Multi-Criteria Decision Making — elke locatie krijgt een score 0-100.

```javascript
function scorePlanLocation(location, context) {
  // context = { childAge, transport, weather, date, existingPlan, userLocation }

  let score = 0;

  // === DIMENSIE 1: Leeftijdsmatch (0-20 punten) ===
  // Perfecte match = 20, 1 jaar verschil = 12, 2 jaar = 5, >2 = 0
  const ageCenter = (location.min_age + location.max_age) / 2;
  const ageDiff = Math.abs(context.childAge - ageCenter);
  const ageRange = location.max_age - location.min_age;
  if (ageDiff <= ageRange / 2) score += 20;
  else if (ageDiff <= ageRange) score += 12;
  else if (ageDiff <= ageRange + 1) score += 5;
  // else: 0

  // === DIMENSIE 2: Reistijd (0 tot -40 punten) ===
  // Elke 5 min boven 15 min threshold = -10 punten
  const travelMinutes = estimateTravelTime(location, context.userLocation, context.transport);
  if (travelMinutes <= 15) score += 15;
  else score += Math.max(-40, 15 - ((travelMinutes - 15) / 5) * 10);

  // === DIMENSIE 3: Convenience (0-20 punten) ===
  if (location.buggy_friendliness === 'easy') score += 5;
  if (location.toilet_confidence === 'high') score += 4;
  if (location.shade_or_shelter === 'good') score += 3;
  if (location.parking_ease === 'easy' && context.transport === 'auto') score += 4;
  if (location.food_fit === 'full') score += 4;
  else if (location.food_fit === 'snacks') score += 2;

  // === DIMENSIE 4: Peuterscore (0-20 punten) ===
  // Bestaande peuterscore (0-10) × 2
  score += (location.peuterscore || 5) * 2;

  // === DIMENSIE 5: Weerfit (0-15 punten) ===
  if (context.weather === 'rain') {
    if (location.rain_backup_quality === 'strong') score += 15;
    else if (location.rain_backup_quality === 'weak') score += 5;
    else if (location.weather_type === 'indoor') score += 12;
    // outdoor-only bij regen: +0
  } else {
    if (location.weather_type === 'outdoor' || location.weather_type === 'both') score += 10;
    if (location.shade_or_shelter === 'good') score += 5; // bonus bij zon
  }

  // === DIMENSIE 6: Categorie-variatie (-20 tot +10 punten) ===
  const typesInPlan = context.existingPlan.map(p => p.sub_type);
  if (!typesInPlan.includes(location.sub_type)) score += 10; // nieuw type = bonus
  else score -= 20; // herhaling = penalty

  // === DIMENSIE 7: Energieniveau-fit (0-10 punten) ===
  // Target energy per slot: hoog 's ochtends, laag na lunch, medium 's middags
  const slotEnergy = context.targetEnergy; // 'high', 'low', 'medium'
  const locEnergy = location.energy_level || estimateEnergy(location);
  if (slotEnergy === locEnergy) score += 10;
  else if (Math.abs(energyToNum(slotEnergy) - energyToNum(locEnergy)) === 1) score += 5;
  // Abrupte switches (calm → active in 1 stap) = 0

  // === DIMENSIE 8: Serendipiteit (0-5 punten) ===
  // Kleine random bonus zodat plannen niet altijd identiek zijn
  score += Math.random() * 5;

  return Math.min(100, Math.max(0, score));
}

function energyToNum(level) {
  return { calm: 1, moderate: 2, active: 3 }[level] || 2;
}

function estimateEnergy(location) {
  // Afgeleid als energy_level niet in DB staat
  if (location.noise_level === 'loud' || location.play_corner_quality === 'strong') return 'active';
  if (location.noise_level === 'quiet') return 'calm';
  return 'moderate';
}
```

**Transport-specifieke snelheden:**
```javascript
function estimateTravelTime(location, userLoc, transport) {
  const distKm = haversine(location.lat, location.lng, userLoc.lat, userLoc.lng);
  const speeds = { fiets: 15, auto: 40, ov: 25 }; // km/u, OV incl. wachttijden
  return (distKm / speeds[transport]) * 60; // minuten
}
```

### Template-based selectie (4 shapes)

```javascript
const TEMPLATES = {
  ochtend: {
    duration: 3,        // uur
    slots: [
      { time: '09:30', energy: 'high', duration: 90 },
      { time: '11:15', energy: 'moderate', duration: 60 }
    ]
  },
  halve_dag: {
    duration: 4,
    slots: [
      { time: '09:30', energy: 'high', duration: 90 },
      { time: '11:30', energy: 'moderate', duration: 45, type: 'lunch_area' },
      { time: '13:00', energy: 'moderate', duration: 90 }
    ]
  },
  hele_dag: {
    duration: 7,
    slots: [
      { time: '09:30', energy: 'high', duration: 90 },
      { time: '11:30', energy: 'moderate', duration: 45, type: 'lunch_area' },
      // 12:30-14:30: NAP BLOCK (geen activiteit)
      { time: '14:30', energy: 'moderate', duration: 60 },
      { time: '16:00', energy: 'calm', duration: 60 }
    ],
    napBlock: { start: '12:30', end: '14:30', ageMax: 3 } // alleen voor 0-3 jaar
  },
  een_locatie: {
    duration: 2,
    slots: [
      { time: 'nu', energy: 'any', duration: 120 }
    ]
  }
};
```

### Nap-time & Energie-awareness

```javascript
const NAP_RULES = {
  // Leeftijd 0-2: vast dutje 12:30-14:30
  // Leeftijd 2-3: dutje 13:00-15:00 (flexibeler)
  // Leeftijd 3+: geen dutje nodig
  getNapBlock(childAge) {
    if (childAge <= 2) return { start: '12:30', end: '14:30' };
    if (childAge <= 3) return { start: '13:00', end: '15:00' };
    return null;
  }
};

// Energiecurve per dagdeel:
// 09:00-11:30  → HIGH   (actieve speeltuin, rennen, kinderboerderij)
// 11:30-12:30  → MEDIUM (lunch, rustigere activiteit)
// 12:30-14:30  → LOW    (nap voor kleintjes, rustige activiteit voor ouderen)
// 14:30-16:00  → MEDIUM (tweede wind, gematigde activiteit)
// 16:00-17:30  → CALM   (korte wandeling, cafe, naar huis)
```

### Peuter-reistijd & buffers

```javascript
// Peuter loopt langzamer: elke 100m kost 2 min (vs volwassene 1.2 min)
// Factor 1.5x op alle reistijden
const TODDLER_TRAVEL_FACTOR = 1.5;

// Buffer per transitie: 10 min
// "Jas aan, naar toilet, afscheid nemen van de glijbaan"
const TRANSITION_BUFFER_MIN = 10;
```

### Greedy Selection Algorithm

```javascript
function selectLocations(template, candidates, context) {
  const plan = [];

  for (const slot of template.slots) {
    // Score alle kandidaten voor deze slot
    const scored = candidates.map(loc => ({
      location: loc,
      score: scorePlanLocation(loc, {
        ...context,
        existingPlan: plan,
        targetEnergy: slot.energy
      })
    }));

    // Sorteer op score, pak de beste
    scored.sort((a, b) => b.score - a.score);

    // Filter: minimum score 30, anders is het niet goed genoeg
    const best = scored.find(s => s.score >= 30);
    if (best) {
      plan.push({
        ...best.location,
        slotTime: slot.time,
        slotDuration: slot.duration,
        matchScore: best.score,
        matchLabel: best.score >= 75 ? 'Top keuze' : best.score >= 50 ? 'Goede optie' : 'Leuk alternatief'
      });

      // Verwijder uit kandidaten (niet herhalen)
      candidates = candidates.filter(c => c.id !== best.location.id);
    }
  }

  return plan;
}
```

### Visuele tijdlijn output

Verticale tijdlijn, mobiel-native:
```
09:30  ──●── Vondelpark Speeltuin
              📸 [foto]
              ⭐ 9.1 · Speeltuin · 0.4 km
              🟢 Top keuze
              [Wissel deze ↻]

        🚲 8 min fietsen

10:30  ──●── Kinderboerderij De Pijp
              📸 [foto]
              ⭐ 8.4 · Kinderboerderij · 1.1 km
              🔵 Goede optie
              [Wissel deze ↻]

        🚶 5 min lopen + 10 min buffer

12:00  ──●── Lunch bij Cafe X
              Dichtbij · Kinderstoel · Taart

        😴 12:30-14:30 Dutjestijd
              Tip: ga naar huis of vind een
              rustig plekje in het park

14:30  ──●── NEMO Science Museum
              📸 [foto]
              ⭐ 7.8 · Museum · 2.1 km
              🔵 Goede optie
              [Wissel deze ↻]
```

### Match-indicatoren (nooit percentages)

- **Top keuze** (score >= 75): groene pill
- **Goede optie** (score 50-74): blauwe pill
- **Leuk alternatief** (score 30-49): grijze pill

### Shuffle & Swap

- **"Shuffle alles"**: nieuwe selectie met zelfde template + randSeed
- **Per activiteit "Wissel deze"**: beste alternatief uit dezelfde categorie OF volgende beste score
- **Refinement chips**: "Meer binnen" / "Rustiger" / "Dichter bij huis" — past context.weights aan en herberekent

### WhatsApp delen

```javascript
async function shareViaWhatsApp(plan) {
  const lines = plan.map(p =>
    `  ${p.slotTime} ${p.name}`
  ).join('\n');

  const weather = getCurrentWeather();
  const text = `Plan voor ${formatDate(plan[0].date)}:\n${lines}\n\nWeer: ${weather.temp}° ${weather.desc}\nBekijk op peuterplannen.nl/plan/${plan.shareId}`;

  if (navigator.share) {
    await navigator.share({ text });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }
}
```

Format is bewust scanbaar — geen marketing, geen emoji-overdosis. Precies zoals je een bericht aan je partner zou sturen.

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 4.1 | Input flow: progressive disclosure (4 stappen + CTA) | 2-3 uur | Nee |
| 4.2 | 8-dimensie scoring algoritme | 2-3 uur | Parallel met 4.1 |
| 4.3 | Template-based selectie (4 shapes) + greedy algorithm | 1-2 uur | Na 4.2 |
| 4.4 | Nap-time & energie-awareness + peuter-reistijden | 1 uur | In 4.3 |
| 4.5 | Visuele tijdlijn output (verticaal, foto's, reistijden) | 2-3 uur | Na 4.3 |
| 4.6 | Match-indicatoren + shuffle/swap/refinement | 1-2 uur | Na 4.5 |
| 4.7 | WhatsApp delen (Web Share API + fallback) | 1 uur | Na 4.5 |
| 4.8 | AI-narratief (Gemini) als garnering | 30 min | Na 4.5 |
| | **Totaal Fase 4** | **~1.5-2 dagen** | |

**Klaar-criterium:** Plan je dag genereert een visuele tijdlijn met foto's, reistijden, peuter-buffers en nap-gaps. Delen via WhatsApp werkt met 1 tik en het bericht is scanbaar.

**Performance-eis:** Algoritme draait in <300ms client-side voor 2200 locaties. Geen server nodig.

---

## Fase 5: Peuterscore 2.0

**Wat verandert er voor de gebruiker?**
De score naast elke locatie is niet meer een mysterieus cijfer. Je ziet WAAROM een plek goed scoort. De score past zich aan: een regenbestendige plek scoort hoger als het regent.

### Huidige score (ter referentie)

```javascript
// Max 11 punten, primitief
if (min_age <= 2) score += 3;
if (diaper) score += 3;
if (coffee) score += 1;
if (indoor/hybrid) score += 2;
if (toddler_highlight) score += 1;
if (is_featured) score += 1;
```

### Nieuwe Peuterscore v2: 6 gewogen dimensies

De gebruiker ziet nog steeds **één getal (0-10)**. De berekening gebruikt alle rijke DB-velden.

```javascript
function computePeuterScoreV2(location, context = {}) {
  // context = { childAge, weather, dayOfWeek }

  // Standaard gewichten
  let weights = {
    ageFit:      0.25,
    facilities:  0.20,
    playValue:   0.20,
    weatherFit:  0.15,
    practical:   0.10,
    reliability: 0.10
  };

  // === CONTEXT-AANPASSING ===
  if (context.weather === 'rain') {
    weights.weatherFit += 0.10;
    weights.playValue -= 0.05;
    weights.practical -= 0.05;
  }
  if (context.childAge) {
    weights.ageFit += 0.10;
    weights.reliability -= 0.05;
    weights.practical -= 0.05;
  }
  if (context.dayOfWeek >= 6) { // weekend
    weights.practical += 0.05; // crowd_pattern telt zwaarder
    weights.reliability -= 0.05;
  }

  // === DIMENSIE SCORES (elk 0-10) ===

  // 1. Leeftijdsmatch
  let ageFitScore = 5; // default als geen kind-leeftijd bekend
  if (context.childAge) {
    const optimalAge = (location.min_age + location.max_age) / 2;
    const diff = Math.abs(context.childAge - optimalAge);
    const range = (location.max_age - location.min_age) / 2;
    if (diff <= range * 0.5) ageFitScore = 10;
    else if (diff <= range) ageFitScore = 7;
    else if (diff <= range + 1) ageFitScore = 4;
    else ageFitScore = 1;
  }

  // 2. Gemak & Faciliteiten
  let facilitiesScore = 0;
  if (location.diaper) facilitiesScore += 3;
  if (location.coffee) facilitiesScore += 2;
  if (location.buggy_friendliness === 'easy') facilitiesScore += 2;
  else if (location.buggy_friendliness === 'okay') facilitiesScore += 1;
  if (location.parking_ease === 'easy') facilitiesScore += 1.5;
  if (location.toilet_confidence === 'high') facilitiesScore += 1.5;
  facilitiesScore = Math.min(10, facilitiesScore);

  // 3. Speelwaarde
  let playScore = 0;
  if (location.play_corner_quality === 'strong') playScore += 4;
  else if (location.play_corner_quality === 'basic') playScore += 2;
  if (location.toddler_highlight) playScore += 3;
  if (location.noise_level === 'moderate') playScore += 2; // levendig maar niet overweldigend
  else if (location.noise_level === 'quiet') playScore += 1;
  if (location.energy_level === 'active') playScore += 1;
  playScore = Math.min(10, playScore);

  // 4. Weerbestendigheid
  let weatherScore = 5; // default
  if (context.weather === 'rain') {
    if (location.rain_backup_quality === 'strong') weatherScore = 10;
    else if (location.rain_backup_quality === 'weak') weatherScore = 5;
    else if (location.weather_type === 'indoor') weatherScore = 9;
    else weatherScore = 1;
  } else {
    if (location.weather_type === 'outdoor' || location.weather_type === 'both') weatherScore = 8;
    if (location.shade_or_shelter === 'good') weatherScore += 2;
    weatherScore = Math.min(10, weatherScore);
  }

  // 5. Praktisch
  let practicalScore = 0;
  if (location.food_fit === 'full') practicalScore += 3;
  else if (location.food_fit === 'snacks') practicalScore += 1.5;
  if (location.price_band === 'free') practicalScore += 3;
  else if (location.price_band === 'low') practicalScore += 2;
  if (location.crowd_pattern?.includes('rustig')) practicalScore += 2;
  if (location.time_of_day_fit) practicalScore += 2;
  practicalScore = Math.min(10, practicalScore);

  // 6. Betrouwbaarheid
  let reliabilityScore = 5;
  if (location.verification_confidence === 'high') reliabilityScore = 9;
  else if (location.verification_confidence === 'medium') reliabilityScore = 6;
  if (location.owner_verified) reliabilityScore += 1;
  reliabilityScore = Math.min(10, reliabilityScore);

  // === GEWOGEN TOTAAL ===
  const raw = (ageFitScore * weights.ageFit) +
              (facilitiesScore * weights.facilities) +
              (playScore * weights.playValue) +
              (weatherScore * weights.weatherFit) +
              (practicalScore * weights.practical) +
              (reliabilityScore * weights.reliability);

  // Featured bonus: +0.3 (klein, niet dominant)
  const featured = location.is_featured ? 0.3 : 0;

  return {
    total: Math.min(10, Math.round((raw + featured) * 10) / 10),
    dimensions: {
      ageFit: { score: ageFitScore, weight: weights.ageFit },
      facilities: { score: facilitiesScore, weight: weights.facilities },
      playValue: { score: playScore, weight: weights.playValue },
      weatherFit: { score: weatherScore, weight: weights.weatherFit },
      practical: { score: practicalScore, weight: weights.practical },
      reliability: { score: reliabilityScore, weight: weights.reliability }
    }
  };
}
```

### Top-3 sterktes per locatie

```javascript
function getTopStrengths(scoreResult) {
  const labels = {
    ageFit: { strong: 'Ideaal voor {age} jaar', good: 'Geschikt voor {age} jaar' },
    facilities: { strong: 'Uitstekende faciliteiten', good: 'Goede faciliteiten' },
    playValue: { strong: 'Sterke speelprikkel', good: 'Leuke speelmogelijkheden' },
    weatherFit: { strong: 'Regenproof', good: 'Goed bij wisselend weer' },
    practical: { strong: 'Zeer praktisch (gratis, goed eten)', good: 'Praktisch ingericht' },
    reliability: { strong: 'Recent geverifieerd', good: 'Betrouwbare info' }
  };

  return Object.entries(scoreResult.dimensions)
    .sort(([, a], [, b]) => (b.score * b.weight) - (a.score * a.weight))
    .slice(0, 3)
    .map(([key, dim]) => ({
      label: dim.score >= 7 ? labels[key].strong : labels[key].good,
      dimension: key
    }));
}
```

### "Waarom deze score?" expand

Op de detailpagina, uitklapbaar paneel met 6 horizontale balken:
```
Waarom deze score? ▼

Leeftijdsmatch    ████████░░  8/10  Ideaal voor 2-3 jaar
Faciliteiten      ██████░░░░  6/10  Verschoontafel, koffie
Speelwaarde       █████████░  9/10  Sterke speelprikkel
Weerbestendigheid ███████░░░  7/10  Overdekt gedeelte
Praktisch         ████░░░░░░  4/10  Gratis, beperkt eten
Betrouwbaarheid   ███████░░░  7/10  Geverifieerd jan 2026
```

Labels: "Sterk" (8+) / "Goed" (5-7) / "Basis" (3-4) / "Onbekend" (<3 of geen data).

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 5.1 | `computePeuterScoreV2()` met 6 dimensies | 2-3 uur | Nee |
| 5.2 | Context-aanpassing (weer, leeftijd, dag) | 1 uur | In 5.1 |
| 5.3 | Top-3 sterktes tonen op kaarten en in sheet | 1-2 uur | Na 5.1 |
| 5.4 | "Waarom deze score?" expand met 6 balken | 1 uur | Na 5.3 |
| 5.5 | Migratie-script: herbereken alle 2138 scores + data-gaps rapport | 1 uur | Na 5.1 |
| | **Totaal Fase 5** | **~1 dag** | |

**Klaar-criterium:** Elke locatie toont een contextgevoelige score met uitleg. Score verandert zichtbaar als het weer omslaat.

---

## Fase 6: Personalisatie (lichtgewicht)

**Wat verandert er voor de gebruiker?**
Bij je eerste bezoek kies je de leeftijd van je kind en hoe je reist. Daarna zijn de resultaten automatisch relevanter. Geen account, geen registratie.

### Beslissing: Level 1-2, GEEN Level 3

Op basis van focus group consensus:
- **Level 1 (essentieel):** Onthoud stad + kind-leeftijd + transport. Pre-filter resultaten.
- **Level 2 (nice-to-have):** Pre-fill Plan je dag inputs. Onthoud laatste filters.
- **Level 3 (SKIP):** Behavioral learning, type preferences, weighted decay. Over-engineered voor huidige schaal.

### Onboarding: NIET als gate, WEL als enhancement

Volg Elena's "Activation-First" aanpak uit de expert focus group:

1. **App opent → direct waarde** — kaart met markers, geen onboarding-modal
2. **Na 2e locatie bekeken:** inline banner in sheet: "Hoe oud is je peuter? Dan tonen we betere suggesties."
3. **Tik → leeftijdknoppen inline** (niet modal). Kies → opslaan in `localStorage('pp_prefs')`
4. **Na 3e locatie:** "Hoe ga je op pad?" — fiets/auto/OV inline
5. **Daarna:** resultaten herschikken op basis van voorkeuren

### Storage

```javascript
// localStorage('pp_prefs')
{
  childAges: [2],           // array voor meerdere kinderen
  transport: 'fiets',
  city: 'amsterdam',
  onboardingComplete: true,
  lastUsed: '2026-03-19'
}
```

Geen IndexedDB, geen behavioral tracking, geen server-side opslag.

### Pre-fill en relevantie

- Kind-leeftijd → leeftijdsfilter automatisch actief
- Transport → zoekradius: fiets 20km, auto 50km, OV 30km
- Stad → kaart centreert op die stad
- Plan je dag → stappen 1-2 al ingevuld

### UI-weergave

Op kaarten waar personalisatie meespeelt:
"Aanbevolen voor 2 jaar + fiets" — altijd transparant, nooit "aanbevolen voor jou" zonder uitleg.

### "Wis alles" knop

In info/instellingen sectie: reset localStorage. Clean slate. Geen dark patterns.

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 6.1 | Inline onboarding (na 2e locatie, niet als gate) | 1-2 uur | Nee |
| 6.2 | Stad auto-capture (uit stadsselector of GPS) | 30 min | Parallel |
| 6.3 | Pre-fill filters + Plan je dag op basis van voorkeuren | 1-2 uur | Na 6.1 |
| 6.4 | Resultaat-sortering op relevantie | 1-2 uur | Na 6.1 |
| 6.5 | "Aanbevolen" labels (transparant waarom) | 30 min | Na 6.4 |
| 6.6 | "Wis alles" knop | 15 min | Na 6.1 |
| | **Totaal Fase 6** | **~halve dag** | |

**Klaar-criterium:** Twee ouders met verschillende kinderen zien bij dezelfde stad een andere volgorde. Transparant waarom.

---

## Fase 7: Discovery, Retentie & Nieuwsbrief

**Wat verandert er voor de gebruiker?**
Elke week is er iets nieuws. De app toont wat er deze week leuk is in jouw stad, rekening houdend met het weer. Dezelfde picks komen in de vrijdag-nieuwsbrief.

### "Deze week in [stad]" blok

Bovenaan de sheet (half-state), boven de reguliere locatielijst:
```
── Deze week in Amsterdam ──
☀️ Woensdag wordt zonnig!

[📸 Vondelpark sp.] [📸 Artis] [📸 Westerpark]
← swipe →
```

Selectie-algoritme:
```javascript
function getThisWeekPicks(city, weather5day) {
  const candidates = locations.filter(l => l.city === city);

  // Seizoenslogica
  const month = new Date().getMonth();
  const seasonal = {
    3: 'lammetjes',    // april
    6: 'buitenzwemmen', // juli
    11: 'schaatsen'     // december
  };

  // Score op basis van: weer-fit + seizoen + peuterscore + variatie
  // Selecteer 3-5 met type-diversiteit
  return selectDiverse(candidates, 5);
}
```

### Weer-forecast (5 dagen)

```
Ma ☁️  Di 🌧️  Wo ☀️  Do ☁️  Vr 🌧️
          ↑
  "Woensdag zon → 8 speeltuinen bij jou in de buurt"
  [Bekijk →]
```

### Koppeling met nieuwsbrief

**Eenmaal bouwen, twee kanalen:**
- Dezelfde "Deze week" picks → genereer automatisch de vrijdag-nieuwsbrief content
- 60-70% overlap met de app = versterking (unaniem panel-advies)

**Nieuwsbrief-exclusief (10 min per week):**
- 1 persoonlijke zin ("Dit weekend wordt bewolkt maar droog — ideaal voor...")
- "Partner van de maand" feature (verkooptool voor partner-acquisitie)
- Reply-vraag: "Wat was jullie leukste uitje deze week?"

**Newsletter template:**
```
Onderwerp: 3 uitjes voor dit weekend (14°, bewolkt)

1 persoonlijke zin

3 locatie-picks met foto + 1-zin waarom
[📸 Vondelpark Speeltuin — Gratis en ideaal bij bewolkt weer]

📋 Plan je weekend → [link naar app met pre-filled datum]

Partner van de maand: [Kinderboerderij X — foto + quote eigenaar]

Wat was jullie leukste uitje vorige week? Reply op deze mail!
```

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 7.1 | "Deze week in [stad]" blok in de app | 2-3 uur | Nee |
| 7.2 | 5-daagse weer-forecast integratie | 1-2 uur | Parallel met 7.1 |
| 7.3 | Nieuwsbrief-content generatie vanuit dezelfde data | 1-2 uur | Na 7.1 |
| 7.4 | "Partner van de maand" sectie in nieuwsbrief | 30 min | Parallel |
| | **Totaal Fase 7** | **~halve dag** | |

---

## Fase 8: Engelse Versie (UITGESTELD)

**Expliciete beslissing:** niet bouwen tot het core product gepolijst is. Wordt later opgepakt.

Wanneer het zover is:
- Start met Amsterdam only (top 300 locaties)
- AI-vertaling + handmatige review van top 200
- Aparte URL-structuur: `/en/amsterdam/locatie-naam`
- Taaldetectie + duidelijke NL/EN toggle (geen auto-redirect)

---

## Fase 9: Social Proof & Community (bij 3K+ bezoekers)

**Wat verandert er voor de gebruiker?**
Je ziet dat andere ouders hier ook komen. Een subtiel duimpje-omhoog systeem laat zien welke locaties populair zijn.

### "Was je hier?" thumbs up — met anti-fraude

**Pas bouwen bij 3K+ maandelijkse bezoekers.** (Panel unaniem: empty states zijn erger dan geen social proof.)

**Anti-fraude systeem:**
```javascript
// 1. Cookie + localStorage (NIET IP-based — huishoudens delen IP)
// 2. Eén stem per device per locatie per 30 dagen
// 3. Rate limiting server-side: max 20 votes per sessie
// 4. Minimum 3 stemmen voor weergave (display threshold)
// 5. Positief-only: geen downvotes. Ooit.

function canVote(locationId) {
  const key = `vote_${locationId}`;
  const lastVote = localStorage.getItem(key);
  if (lastVote && Date.now() - parseInt(lastVote) < 30 * 24 * 60 * 60 * 1000) {
    return false; // al gestemd binnen 30 dagen
  }
  return true;
}

function vote(locationId) {
  if (!canVote(locationId)) return;
  localStorage.setItem(`vote_${locationId}`, Date.now().toString());
  // Supabase: increment vote count
  // Server-side rate limit check: max 20 per session cookie
}
```

**Weergave:**
- < 3 stemmen: toon niets
- 3-10: "Enkele ouders waren hier"
- 10-25: "Populair bij ouders"
- 25+: "Veel ouders bezochten dit" met exact aantal

### Analytics-based trust signals (KAN NU al)

Zonder community-features, op basis van bestaande page views:
- **"Populair in [wijk]"** badge: top 10% locaties in een buurt op basis van page views
- **"Recent bekeken"**: "43 ouders bekeken dit deze week" — page view counter, geen social feature
- Nul abuse-risico, trivially te bouwen

| # | Taak | Tijd | Parallel? |
|---|------|------|-----------|
| 9.1 | "Was je hier?" thumbs up + anti-fraude | 2-3 uur | Nee |
| 9.2 | Display threshold (3+) + weergave-teksten | 1 uur | Na 9.1 |
| 9.3 | "Populair in [wijk]" badge (analytics-based) | 1-2 uur | Parallel, KAN EERDER |
| 9.4 | "Bezocht" markering (localStorage) | 1 uur | Parallel |
| | **Totaal Fase 9** | **~halve dag** | |

---

## Totaaloverzicht

| Fase | Inhoud | Tijd (CC-uren) | Parallel? |
|------|--------|----------------|-----------|
| 0 | Data & Foto's (scraping pipeline) | 1 dag | Kan deels parallel met 1 |
| 1 | Code-fundament (modules + glass + foto-integratie) | 1-1.5 dagen | Na 0 (deels) |
| 2 | Rijke data ontsluiten | halve dag | **Parallel met 3** |
| 3 | Mobiel UX (bottom sheet + lijst + filters) | 1.5-2 dagen | **Parallel met 2** |
| 4 | Plan je dag 2.0 | 1.5-2 dagen | Na 1+2+3 |
| 5 | Peuterscore 2.0 | 1 dag | Na 2, parallel met 4 |
| 6 | Personalisatie (lichtgewicht) | halve dag | Na 5 |
| 7 | Discovery + retentie + nieuwsbrief | halve dag | Na 6 |
| 8 | Engelse versie | UITGESTELD | — |
| 9 | Social proof (bij 3K+ bezoekers) | halve dag | UITGESTELD |
| **Totaal** | | **~7-10 dagen CC** | |

*Tijden zijn Claude Code-uren (actieve sessies). Met denktijd, review, testen: realistisch 3-5 weken kalender-tijd.*

### Parallellisme voor meerdere Claude Code agents

```
Agent A (worktree 1):          Agent B (worktree 2):
─────────────────────         ─────────────────────
Fase 0.1: Scraping script     Fase 0.3: Illustraties
Fase 1.1: Modularisatie       Fase 1.2: Glass CSS
Fase 1.3-1.5: Foto's         Fase 2.1-2.5: Rijke data
Fase 3.1-3.5: Sheet           Fase 3.6: Lijst toggle
Fase 4.1-4.8: Plan je dag     Fase 5.1-5.5: Peuterscore
```

---

## Wat We Beschermen (niet veranderen)

1. **Situatie-presets** — uniek in NL, USP, door panel als sterkste feature benoemd
2. **Redactionele stem** — advies van een ouder, geen database-dump
3. **Geen advertenties** — alle concurrenten zitten vol ads
4. **Privacy-first** — geen accounts, geen server-side tracking, localStorage only
5. **Snelheid** — statische pagina's, Cloudflare CDN
6. **Vanilla JS** — geen framework, Claude Code werkt hier optimaal mee
7. **SEO-graduatie systeem** — bewust ontworpen, niet afbreken

---

## Wat we NIET bouwen (expliciete beslissingen)

| Feature | Waarom niet |
|---------|-------------|
| Engelse versie | Later, core product eerst |
| Community features / gamification | Later, bij 3K+ bezoekers |
| Gratis/betaald filter | Data niet compleet genoeg |
| Toegankelijkheidsinfo voor oma's | Buiten scope (0-6 focus) |
| Adres kopieerknop | Google Maps knop is genoeg |
| Behavioral personalization (Level 3) | Over-engineered voor schaal |
| "Verras me" knop | Geen power users nog |
| Cross-device sync | Oplossing voor niet-bestaand probleem |
| User accounts / login | "Geen login" is differentiator |
| Decision-first / Adventure Queue | Plan je dag IS de oplossing |
| Peuterscore wiskundige breakdown voor gebruikers | Niemand klikt dat. Top-3 sterktes volstaan. |

---

## Browser-Testing Protocol

### Na elke change

Claude Code moet ZELF testen via Playwright MCP:

```
1. Build: node .scripts/sync_all.js (als statische pagina's geraakt)
2. Open app.html in browser via Playwright
3. Screenshot op 4 viewports:
   - 390 x 844   (iPhone 14)
   - 430 x 932   (iPhone 15 Pro Max)
   - 768 x 1024  (iPad mini)
   - 1280 x 800  (Desktop)
4. Visueel beoordelen:
   - Glass-effecten zichtbaar en consistent?
   - Tekst leesbaar op alle achtergronden? (contrast check)
   - Sheet snap-posities correct?
   - Foto's laden (of fallback werkt)?
   - Geen overflow of clipping?
5. Bij twijfel: Gemini Flash als second opinion
```

### Per fase: acceptatietest

| Fase | Test |
|------|------|
| 0 | Steekproef 50 foto's: laden ze? Kwaliteit OK? |
| 1 | Glass zichtbaar, modules laden zonder errors, foto's tonen |
| 2 | Tags zichtbaar op kaarten, weer-reactieve badges bij regen |
| 3 | Sheet peek/half/full werkt. Gesture-conflicten: sheet vs kaart. Liste toggle. |
| 4 | Plan genereren → tijdlijn correct. WhatsApp share opent met juiste tekst. |
| 5 | Score verandert bij weer-omslag. Top-3 sterktes zichtbaar. |
| 6 | Na onboarding: resultaten herschikken. "Wis alles" reset werkt. |
| 7 | "Deze week" blok toont relevante picks. |

---

## Claude Code Werkwijze

### Per sessie
1. **Lees dit plan** + de relevante sectie van `RESEARCH-SYNTHESIS.md`
2. **Plan Mode** (Shift+Tab 2x) — beschrijf aanpak, krijg OK, dan bouwen
3. **1 sessie = 1 duidelijke taak** — niet 3 dingen tegelijk
4. **Test na elke change** — Playwright screenshots op 390px + 1280px
5. **HANDOFF.md** bij elke complexe sessie

### Context management
- 70% context → spawn subagents voor research
- 85% → /compact
- 90% → /clear + frisse start met scherpe prompt die refereert aan HANDOFF.md

### Git discipline
- Nooit .env of credentials committen
- Nooit force-push naar main
- Logische commits, geen mega-commits
- Nooit bestanden verwijderen zonder te vragen

---

## Referentiedocumenten

| Document | Locatie | Wanneer lezen |
|----------|---------|---------------|
| Research synthese (alles) | `RESEARCH-SYNTHESIS.md` | Bij elke sessie |
| Mobiele concepten | `MOBILE-CONCEPTS.md` | Fase 3 |
| Expert focusgroep mobiel | `EXPERT-FOCUS-GROUP-MOBILE.md` | Fase 3 |
| Growth focusgroep | `GROWTH-FOCUS-GROUP.md` | Fase 7 + 9 |
| Plan je dag UX spec | `plan-je-dag-ux-spec.md` | Fase 4 |
| Plan je dag algoritme | `~/TOPIC_1_PLAN_JE_DAG_ALGORITHM.md` | Fase 4 |
| Peuterscore design | `~/TOPIC_2_PEUTERSCORE_IMPROVEMENT.md` | Fase 5 |
| Personalisatie strategie | `personalization-strategy.md` | Fase 6 |
| Mobile map UX spec | `docs/mobile-map-ux-spec.md` | Fase 3 |
| Liquid Glass CSS snippets | `~/liquid-glass-snippets.css` | Fase 1 |
| Liquid Glass quick reference | `~/LIQUID_GLASS_QUICK_REFERENCE.md` | Fase 1 |
| Competitor analyse | `~/competitor-ux-research/COMPETITOR-UX-ANALYSIS.md` | Achtergrond |

---

## Success Metrics

| Metric | Baseline (nu) | Na Fase 3 | Na Fase 6 |
|--------|--------------|-----------|-----------|
| Mobiele bounce rate | Meten | -25% | -40% |
| Sessieduur (mobiel) | Meten | +50% | 2x |
| Locaties met foto | 0% | 70%+ | 90%+ |
| Rijke data zichtbaar | ~20% velden | 80%+ | 90%+ |
| Plan je dag gebruik | n.v.t. | n.v.t. | 15% van sessies |
| WhatsApp shares | n.v.t. | n.v.t. | 50+/week |
| Terugkeerbezoek (7d) | Meten | +25% | +50% |

---

*Start bij Fase 0. Verzamel de foto's. Dan Fase 1: leg het fundament. Ship het. Voel het. Fase 2+3 parallel. De luxe van goede research is dat elke fase een duidelijk spec-document heeft dat als contract dient.*
