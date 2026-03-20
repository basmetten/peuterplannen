# PeuterPlannen — 4 Mobiele View Concepten

**Datum:** 19 maart 2026
**Doel:** Vier fundamenteel verschillende mobiele UX-architecturen voor de kaart+ontdek-ervaring
**Doelgroep:** Ouders van peuters (0-6) in Nederland, inclusief Oma Gerda (65)
**Viewport referentie:** 390 x 844px (iPhone 14)

---

## Concept 1: "De Speeltuin-Kijker" (AllTrails Split-Sync)

### Metafoor
Je kijkt door een verrekijker naar een speeltuin. Het bovenste deel is de kaart (je blikveld), het onderste deel is een scrollbare lijst (wat je ziet). Beweeg de kijker = de lijst verandert mee.

### Kernidee
De kaart neemt de bovenste ~45% van het scherm in, de onderste ~55% is een gesyncte lijst. Pannen op de kaart filtert de lijst real-time. Scrollen door de lijst highlight markers op de kaart. Altijd beide zichtbaar, altijd in sync.

### Schermopbouw — Standaard staat

```
┌─────────────────────────────┐
│  ☀️ 14° Licht bewolkt       │ ← Weer-banner (28px, solid warm cream)
├─────────────────────────────┤
│  🔍 Zoek speeltuinen...     │ ← Zoekbalk (glass, 44px)
├─────────────────────────────┤
│ [Speeltuin] [Kinderboerderij│ ← Filter chips (glass, horizontaal
│  ] [Museum] [Zwembad] [+Meer│    scrollbaar, 36px)
├─────────────────────────────┤
│                             │
│        ╔══════╗             │
│     ╔══╣KAART ║══╗         │ ← MapLibre kaart (~40% vh)
│     ║  ╚══════╝  ║         │   Type-gekleurde markers
│     ║  ●  ●      ║         │   Clustering actief
│     ║      ●  ●  ║         │
│     ╚═════════════╝         │
│                             │
│  127 locaties in dit gebied │ ← Count label (glass pill, centered)
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ 📸 Artis              │   │ ← Locatiekaart 1
│ │ Dierentuin · 1.2 km   │   │   Foto links (3:2), info rechts
│ │ ⭐ 8.2 · 2-5 jr · ♡  │   │   Peuterscore + leeftijd + favoriet
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 📸 Vondelpark speelt. │   │ ← Locatiekaart 2
│ │ Speeltuin · 0.4 km    │   │
│ │ ⭐ 9.1 · 1-4 jr · ♡  │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 📸 NEMO               │   │ ← Locatiekaart 3 (half zichtbaar)
│ │ Museum · 2.1 km       │   │
│ │ ⭐ 7.8 · 3-6 jr · ♡  │   │
├─────────────────────────────┤
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│ ← Bottom nav (56px, glass)
└─────────────────────────────┘
```

### Laag-voor-laag beschrijving

| Laag | Z-index | Materiaal | Waarom |
|------|---------|-----------|--------|
| Kaart (MapLibre) | 0 | Solid | Achtergrond, altijd zichtbaar |
| Weer-banner | 30 | Solid warm cream | Klein, hoeft niet doorzichtig — leesbaarheid gaat voor |
| Zoekbalk | 20 | Glass (0.78 opacity) | Laat kaartrand doorschemeren als je scrollt |
| Filter chips | 20 | Glass (0.70 opacity) | Lichter dan zoekbalk, zweeft duidelijk boven kaart |
| Count pill | 15 | Glass (0.65 opacity) | Subtiel, moet niet afleiden van kaart of lijst |
| Lijst-container | 10 | Solid wit met afgeronde bovenkant | Lijst-inhoud moet perfect leesbaar zijn, geen glass nodig |
| Locatiekaarten | 10 | Solid wit, subtiele schaduw | Kaarten moeten instant scanbaar zijn — glass zou afleiden |
| Bottom nav | 40 | Glass (0.82 opacity, blur 16px) | Vaste navigatie, kaart zichtbaar erdoorheen |

### Staten

**Eerste bezoek:**
- Kaart centreert op Amsterdam (of GPS-locatie als beschikbaar)
- Lijst toont "Populair in jouw buurt" — gesorteerd op peuterscore
- Onboarding-overlay (glass): "Hoe oud is je kind?" → 6 knoppen → klaar
- Na onboarding: lijst herschikt op leeftijdsfit

**Zoeken:**
- Tik op zoekbalk → kaart krimpt naar 25% hoogte, zoekresultaten nemen rest in
- Toetsenbord verschijnt, recent-zoekchips verschijnen
- Typen filtert live: "Art" → toont Artis, Art Zuid, Artisplein speeltuin
- Selecteer resultaat → kaart vliegt erheen, lijst update

**Filteren:**
- Tik filter chip → toggles actief (terracotta fill + wit tekst)
- Kaart markers filteren real-time, lijst update sync
- "+Meer" chip → schuift extra rij in: Leeftijd, Afstand, Weer, Faciliteiten
- Actieve filters tonen als pills boven de lijst: "Speeltuin × | 0-3 jr × | < 2 km ×"

**Locatie bekijken:**
- Tik op kaart-marker → marker schaalt op (28→36px), lijst scrollt naar die kaart, kaart highlight met glow
- Tik op lijstkaart → marker highlight op kaart, kaart pant naar marker
- Tik nogmaals (of tik "Bekijk") → navigeer naar locatiedetailpagina (full screen)

**Favorieten:**
- ♡ icoon op elke kaart → tik = vult rood, opgeslagen in localStorage
- Favorieten-tab toont zelfde split-layout maar alleen favorieten

**Plan maken:**
- Plan-tab → verlaat split-view, toont Plan je dag wizard (volledig scherm)

### Gesture-patronen

| Gesture | Locatie | Actie |
|---------|---------|-------|
| Pan/pinch | Kaart | Beweeg/zoom kaart, lijst update na 300ms debounce |
| Scroll verticaal | Lijst | Scroll door locaties |
| Swipe links op kaart | Lijst-kaart | Snelle favoriet toggle (optioneel, niet essentieel) |
| Tik | Marker | Highlight + scroll lijst naar kaart |
| Tik | Lijst-kaart | Highlight marker + pan kaart |
| Lang drukken | Lijst-kaart | Quick-actions: Favoriet, Deel, Route |

### Oma Gerda test
- **Goed:** Alles is altijd zichtbaar. Geen verborgen gebaren nodig. Lijst is vertrouwd.
- **Goed:** Grote tikbare kaarten met duidelijke tekst.
- **Risico:** Sync-gedrag (pan kaart = lijst update) kan verwarrend zijn. Oplossing: eerste keer een korte animatie die de sync demonstreert ("Beweeg de kaart om locaties in de buurt te zien").
- **Risico:** Twee scroll-gebieden (kaart + lijst) kan frustrerend zijn als je de verkeerde raakt.

### Eerlijke nadelen

1. **Kaart is klein** — ~40% van het scherm is niet genoeg voor echte kaartexploratie. Je ziet 3-4 straten, niet een heel stadsdeel. Voor gebruikers die primair de kaart willen verkennen, voelt dit beperkend.
2. **Twee scroll-zones** — de grens tussen kaart-pan en lijst-scroll is een klassiek touch-conflict. Zelfs met goede touch-handling zullen sommige gebruikers per ongeluk de verkeerde zone aanraken.
3. **Lijst toont max 2.5 kaarten** — bij 55% lijstgebied en kaarten van ~90px zie je slechts 2-3 kaarten zonder scrollen. Dat voelt schaars vergeleken met een volledige lijstweergave.
4. **Complexe sync-logica** — map-bounds-change → filter → re-render lijst → highlight → dit is technisch niet triviaal en kan bij slechte verbinding laggy aanvoelen.
5. **Geen ruimte voor rich content** — foto's op kaarten moeten klein (thumbnail), geen ruimte voor beschrijving of faciliteiten-iconen.

---

## Concept 2: "Het Glazen Venster" (Bottom Sheet Dominant)

### Metafoor
De kaart is een grote etalageruit. Je kijkt erdoorheen naar de stad. De bottom sheet is een glazen plank die je omhoog schuift om meer informatie te zien — maar de etalage (kaart) blijft altijd zichtbaar erdoorheen.

### Kernidee
Fullscreen kaart als achtergrond. Alle UI zweeft als glass-lagen erboven. Een bottom sheet met drie snap-posities (peek/half/full) is de primaire navigatie naar content. De kaart is ALTIJD zichtbaar — zelfs bij full sheet via de glass-transparantie. Dit is het Google Maps-patroon, maar warm en specifiek voor peuters.

### Schermopbouw — Standaard staat (sheet = peek)

```
┌─────────────────────────────┐
│                             │
│  ┌─ 🔍 Zoek... ──────────┐ │ ← Zoekbalk (glass, floating, 44px)
│  └────────────────────────┘ │
│                             │
│  [Speeltuin][Boerderij][Mu..│ ← Filter chips (glass, floating)
│                             │
│          ●                  │
│     ●        ●    ⑤        │ ← Fullscreen kaart
│                  ●          │   Markers + clusters
│        ●                    │
│              ●      ●      │
│     ●                       │
│  ●       ●                  │
│                    ●        │
│                             │
│                             │
│        ●          ●        │
│                             │
│ ╔═══════════════════════════╗
│ ║ ─── (drag handle) ────── ║ ← Bottom sheet PEEK (120px)
│ ║                           ║   Glass: 0.82 opacity, blur 14px
│ ║  ☀️ 14° Ideaal buitenweer ║   Weer + suggestie
│ ║  Ontdek 127 locaties ↑   ║   CTA om sheet omhoog te trekken
│ ╚═══════════════════════════╝
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│ ← Bottom nav (56px, glass)
└─────────────────────────────┘
```

### Schermopbouw — Sheet = HALF (50vh)

```
┌─────────────────────────────┐
│                             │
│  ┌─ 🔍 Zoek... ──────────┐ │ ← Zoekbalk blijft zichtbaar
│  └────────────────────────┘ │
│                             │
│  [Speeltuin][Boerderij][+M..│ ← Chips blijven zichtbaar
│                             │
│        ●      ⑤    ●      │ ← Kaart: bovenste 50%
│              ●              │   (markers nog steeds zichtbaar
│     ●                 ●    │    en interactief)
│                             │
│ ╔═══════════════════════════╗
│ ║ ─── (drag handle) ────── ║ ← Sheet HALF staat
│ ║                           ║
│ ║ Populair in de buurt      ║ ← Sectie-header
│ ║ ┌─────────────────────┐   ║
│ ║ │📸│ Artis             │   ║ ← Locatiekaart (compact)
│ ║ │  │ Dierentuin · 1.2km│   ║   Foto thumbnail links
│ ║ │  │ ⭐8.2 · 2-5 · ♡  │   ║   Score + leeftijd + fav
│ ║ └─────────────────────┘   ║
│ ║ ┌─────────────────────┐   ║
│ ║ │📸│ Vondelpark speelt.│   ║ ← Locatiekaart 2
│ ║ │  │ Speeltuin · 0.4km │   ║
│ ║ │  │ ⭐9.1 · 1-4 · ♡  │   ║
│ ║ └─────────────────────┘   ║
│ ╚═══════════════════════════╝
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│
└─────────────────────────────┘
```

### Schermopbouw — Sheet = FULL (marker getikt)

```
┌─────────────────────────────┐
│  ← Terug          ♡  📤   │ ← Glass header (44px)
│ ╔═══════════════════════════╗
│ ║ ─── (drag handle) ────── ║ ← Sheet FULL (100vh - 64px)
│ ║                           ║   Glass: 0.85 opacity, blur 16px
│ ║  ┌───────────────────┐    ║
│ ║  │                   │    ║ ← Locatiefoto (hero, 16:9)
│ ║  │   📸 ARTIS        │    ║   Color placeholder → lazy load
│ ║  │                   │    ║
│ ║  └───────────────────┘    ║
│ ║                           ║
│ ║  Artis                    ║ ← Naam (24px, bold, dark brown)
│ ║  Dierentuin               ║ ← Type badge (terracotta pill)
│ ║  ⭐ 8.2 · Ideaal 2-5 jr  ║ ← Peuterscore + leeftijdsindicatie
│ ║                           ║
│ ║  📍 1.2 km · 🚶 16 min   ║ ← Afstand + looptijd
│ ║  🕐 Open · Sluit om 17:00║ ← Openingstijden
│ ║                           ║
│ ║  Waarom goed voor peuters ║ ← Top-3 sterke punten
│ ║  ✓ Verschoontafel         ║
│ ║  ✓ Kindvriendelijk cafe   ║
│ ║  ✓ Buitenspeeltuin 1-4 jr ║
│ ║                           ║
│ ║  [  Route plannen  ]      ║ ← CTA knop (terracotta, solid)
│ ║  [Toevoegen aan dagplan]   ║ ← Secundaire CTA (glass)
│ ║                           ║
│ ║  ▼ Waarom deze score?     ║ ← Uitklapbaar: 6-dimensie details
│ ║  ▼ Alle faciliteiten      ║ ← Uitklapbaar
│ ║                           ║
│ ║  In de buurt              ║ ← Horizontaal scrollbare kaarten
│ ║  [📸 Loc A] [📸 Loc B]   ║
│ ╚═══════════════════════════╝
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│
└─────────────────────────────┘
```

### Glass-effecten gedetailleerd

| Element | Glass? | Opacity | Blur | Reden |
|---------|--------|---------|------|-------|
| Zoekbalk | Ja | 0.78 | 8px | Zweeft over kaart, kaart zichtbaar erdoorheen |
| Filter chips | Ja | 0.70 | 10px | Lichter dan zoekbalk, subtiel boven kaart |
| Bottom sheet (peek) | Ja | 0.82 | 14px | Voelt als een glazen plank die over de kaart schuift |
| Bottom sheet (half) | Ja | 0.82 | 14px | Zelfde als peek, content wordt leesbaar door hogere opacity |
| Bottom sheet (full) | Ja | 0.88 | 16px | Iets opaquer voor leesbaarheid lange teksten |
| Locatiekaarten in sheet | Nee | Solid wit | - | Kaarten moeten scanbaar zijn, glass-op-glass is te druk |
| CTA knoppen | Nee | Solid terracotta | - | Call-to-action moet opvallen, niet wegvallen in glass |
| Bottom nav | Ja | 0.82 | 16px | Consistent met sheet, kaart zichtbaar erdoorheen |
| Weer-pill (in peek) | Nee | Solid warm cream pill | - | Te klein voor glass, moet instant leesbaar zijn |

### Staten

**Eerste bezoek:**
- Fullscreen kaart met markers rond huidige locatie (of Amsterdam centrum)
- Sheet in PEEK: toont weer + "Ontdek 127 locaties" uitnodiging
- Subtiele pulse-animatie op de drag handle (1x, dan nooit meer)
- Onboarding: transparante glass-overlay boven kaart met leeftijdsknoppen

**Zoeken:**
- Tik zoekbalk → sheet gaat naar FULL, zoekbalk verplaatst naar top van sheet
- Toetsenbord open, recente zoekopdrachten + suggesties
- Resultaten verschijnen live in de sheet
- Selecteer resultaat → kaart vliegt naar locatie, sheet naar PEEK met die locatie

**Filteren:**
- Chips altijd zichtbaar boven kaart (ook als sheet half/full is)
- Tik chip → toggle, markers en sheet-lijst filteren
- "+Meer" → extra filterrij schuift in onder bestaande chips
- Bij actieve filters: count badge update: "23 locaties"

**Locatie bekijken:**
- Tik marker → sheet naar PEEK met locatiepreview (naam, type, score, afstand, thumbnail)
- Sleep sheet omhoog → HALF met meer info
- Sleep verder omhoog → FULL met alle details
- Of: tik op de peek-kaart → spring direct naar FULL
- Op FULL: kaart is nog vaag zichtbaar door de glass-bovenkant van de sheet

**Favorieten:**
- ♡ op elke kaart en in de detail-sheet
- Favorieten-tab: sheet start in HALF met alleen favorieten, kaart toont alleen favorieten-markers

**Plan maken:**
- Plan-tab → sheet naar FULL, wizard-stappen binnen de sheet
- Kaart toont tussentijds de geselecteerde locaties als de wizard vordert
- Eindresultaat: tijdlijn in sheet, route op kaart

### Gesture-patronen

| Gesture | Locatie | Actie |
|---------|---------|-------|
| Pan/pinch | Kaart (als sheet ≤ half) | Beweeg/zoom kaart |
| Verticaal slepen | Sheet drag handle | Sheet wisselt peek ↔ half ↔ full |
| Verticaal scrollen | Sheet content (half/full) | Scroll door lijst/details |
| Pull-to-dismiss | Sheet full, content bovenaan, sleep omlaag | Sheet naar half |
| Flick omhoog | Sheet (snelle swipe) | Spring naar volgende snap-positie |
| Flick omlaag | Sheet (snelle swipe) | Spring naar vorige snap-positie |
| Tik | Marker | Sheet naar peek met locatiepreview |
| Tik | Kaart (geen marker) | Sheet naar peek (sluit detail) |
| Lang drukken | Kaart (leeg punt) | "Drop pin" → zoek in dit gebied |

**Velocity threshold:** >0.5px/ms triggert flick-snap.
**Snap-animatie:** `transform 300ms cubic-bezier(0.32, 0.72, 0, 1)`.

### Oma Gerda test
- **Goed:** De kaart is groot en duidelijk. Markers zijn goed zichtbaar.
- **Goed:** De peek-staat is uitnodigend — "Ontdek 127 locaties" is een duidelijke instructie.
- **Risico:** Sheet-swipen is een geleerd gedrag. Oma Gerda kent dit misschien niet. Oplossing: de drag handle heeft een subtiele pijl-omhoog animatie + tekst "Sleep omhoog" bij eerste bezoek.
- **Risico:** Bij full sheet is de kaart bijna onzichtbaar. Ze kan vergeten dat er een kaart is. Oplossing: de glass-transparantie houdt de kaart subtiel aanwezig, en "Terug" knop is duidelijk.
- **Goed:** Lang drukken is optioneel — alles kan ook met simpele tikken.

### Eerlijke nadelen

1. **Sheet-swipen is niet universeel begrepen** — ondanks dat Google Maps en Apple Maps dit patroon populair maakten, zijn er nog steeds gebruikers (vooral 55+) die niet weten dat je een sheet omhoog kunt slepen. De pulse-animatie helpt, maar lost het niet volledig op.
2. **Kaart is passief** — in peek/half-staat is de kaart zichtbaar maar je interacteert er niet actief mee. De kaart voelt als een mooie achtergrond in plaats van een actief hulpmiddel. Gebruikers die willen pannen moeten eerst de sheet minimaliseren.
3. **Drie snap-posities = cognitieve overhead** — peek, half, full is technisch elegant maar de gebruiker moet "leren" waar de sheet stopt. Half-staat kan onbevredigend voelen: te veel voor een snelle blik, te weinig voor echte details.
4. **Glass performance op budget-telefoons** — `backdrop-filter: blur(14px)` op een full-width sheet van 50-100vh is GPU-intensief. Op een Samsung Galaxy A14 (populair budget-toestel in NL) kan dit stotteren, vooral tijdens het slepen.
5. **Deep linking is complex** — als iemand een WhatsApp-link opent, moet de app weten: ga naar deze marker, open sheet in half-staat. Dit vereist state-management in de URL.
6. **Gesture conflict bij half-staat** — als de sheet op 50vh staat en de gebruiker verticaal swipet, moet het systeem beslissen: scroll de sheet-content of verplaats de sheet? Dit is het hardste UX-probleem van het hele concept.

---

## Concept 3: "De Kaartentafel" (Cards + Map Toggle)

### Metafoor
Een ouder die aan de keukentafel locatiekaartjes uitlicht. Je bladert door een stapel mooie kaarten. Als je de kaart wilt zien, draai je het vel om — de achterkant is de plattegrond. Lijst en kaart zijn twee kanten van hetzelfde vel.

### Kernidee
De standaard view is een fullscreen kaartenstapel (Airbnb-stijl). Grote, mooie, foto-rijke kaarten die je verticaal scrollt. Een floating "Kaart" knop onderaan wisselt naar fullscreen kaartweergave. Geen split-panel, geen bottom sheet als primaire navigatie. Content-first, kaart-second. Dit is het tegenovergestelde van Concept 2.

### Schermopbouw — Lijstweergave (standaard)

```
┌─────────────────────────────┐
│  ☀️ 14° Lekker buitenweer   │ ← Weer-banner (28px, solid)
├─────────────────────────────┤
│  🔍 Zoek in Amsterdam...    │ ← Zoekbalk (solid, afgerond)
├─────────────────────────────┤
│ [Alles] [Speeltuin] [Boerde.│ ← Filter chips (solid pills)
│  [Museum] [Zwembad] [+Meer] │   Horizontaal scrollbaar
├─────────────────────────────┤
│  127 locaties · Gesorteerd  │ ← Count + sorteer-link
│  op afstand ▾               │
├─────────────────────────────┤
│ ┌───────────────────────────┐
│ │                           │
│ │    📸 FOTO (3:2 ratio)    │ ← Grote foto (of illustratie)
│ │    Artis                  │   Venster voor visuele aantrekking
│ │                           │
│ │───────────────────────────│
│ │ Artis                     │ ← Naam + type
│ │ Dierentuin · 1.2 km      │
│ │ ⭐ 8.2  · 2-5 jr  · ♡   │ ← Score + leeftijd + favoriet
│ │ Verschoontafel · Cafe     │ ← Top-2 faciliteiten als chips
│ └───────────────────────────┘
│
│ ┌───────────────────────────┐
│ │                           │
│ │    📸 FOTO (3:2 ratio)    │ ← Locatiekaart 2
│ │    Vondelpark Speeltuin   │
│ │                           │
│ │───────────────────────────│
│ │ Vondelpark Speeltuin      │
│ │ Speeltuin · 0.4 km       │
│ │ ⭐ 9.1  · 1-4 jr  · ♡   │
│ │ Gratis · Schaduw          │
│ └───────────────────────────┘
│                    ┌────────┐
│                    │🗺️Kaart │ ← Floating toggle knop
│                    └────────┘   48px, terracotta, rechtsonder
├─────────────────────────────┤
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│ ← Bottom nav (56px, solid)
└─────────────────────────────┘
```

### Schermopbouw — Kaartweergave (na toggle)

```
┌─────────────────────────────┐
│                             │
│  ┌─ 🔍 Zoek... ──────────┐ │ ← Zoekbalk (glass, floating)
│  └────────────────────────┘ │
│                             │
│  [Speeltuin][Boerderij][+M..│ ← Filter chips (glass, floating)
│                             │
│          ●                  │
│     ●        ●    ⑤        │ ← Fullscreen kaart
│                  ●          │   Alle markers zichtbaar
│        ●                    │
│              ●      ●      │
│     ●                       │
│  ●       ●                  │
│                    ●        │
│                             │
│                             │
│        ●          ●        │
│                             │
│  ┌───────────────────────┐  │
│  │📸│ Artis   8.2  1.2km │  │ ← Horizontaal scrollbare
│  └───────────────────────┘  │   mini-kaarten (80px, glass)
│  ← swipe voor meer →        │
│                    ┌────────┐
│                    │📋Lijst │ ← Toggle knop (nu "Lijst")
│                    └────────┘
├─────────────────────────────┤
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│
└─────────────────────────────┘
```

### Schermopbouw — Locatiedetail (na tik op kaart)

```
┌─────────────────────────────┐
│  ← Terug          ♡  📤   │ ← Navigatie-header (glass)
├─────────────────────────────┤
│                             │
│    📸 HERO FOTO (16:9)      │ ← Grote foto bovenaan
│    Artis                    │   Parallax scroll-effect
│                             │
├─────────────────────────────┤
│                             │
│  Artis                      │ ← Naam (28px, bold)
│  [Dierentuin]               │ ← Type badge (terracotta pill)
│                             │
│  ⭐ 8.2 Peuterscore         │ ← Score groot weergegeven
│  Ideaal voor 2-5 jaar       │ ← Leeftijdsindicatie
│                             │
│  ┌─────────┬────────┐       │
│  │ 📍1.2km │ 🚶16min│       │ ← Info-grid (2 kolommen)
│  │ 🕐 Open │ ⏰17:00│       │
│  └─────────┴────────┘       │
│                             │
│  Waarom goed voor peuters   │
│  ✓ Verschoontafel           │ ← Top-3 sterke punten
│  ✓ Kindvriendelijk cafe     │
│  ✓ Buitenspeeltuin 1-4 jr   │
│                             │
│  [ Route plannen ]          │ ← CTA (solid terracotta)
│  [ Aan dagplan toevoegen ]   │ ← Secundair (outlined)
│                             │
│  ▼ Waarom deze score?       │ ← Uitklapbare secties
│  ▼ Alle faciliteiten        │
│  ▼ Openingstijden           │
│                             │
│  ── Meer in de buurt ──     │
│  [📸 Loc A] [📸 Loc B]     │ ← Horizontaal scrollbaar
│                             │
├─────────────────────────────┤
│ 🧭Ontdek  🗺️Kaart  ♡  📋  ℹ️│
└─────────────────────────────┘
```

### Glass-effecten gedetailleerd

| Element | Glass? | Reden |
|---------|--------|-------|
| Lijstweergave — Zoekbalk | Nee (solid) | Geen kaart erachter, glass is zinloos op witte achtergrond |
| Lijstweergave — Filter chips | Nee (solid) | Zelfde reden: solid achtergrond |
| Lijstweergave — Kaarten | Nee (solid wit) | Content-first, maximale leesbaarheid |
| Lijstweergave — Bottom nav | Nee (solid) | Geen kaart om doorheen te zien |
| Kaartweergave — Zoekbalk | Ja (0.78, blur 8px) | Zweeft nu over kaart |
| Kaartweergave — Filter chips | Ja (0.70, blur 10px) | Zweeft over kaart |
| Kaartweergave — Mini-kaarten | Ja (0.82, blur 12px) | Glass cards over kaart, kaart zichtbaar erdoorheen |
| Kaartweergave — Toggle knop | Ja (0.85, blur 8px) | Floating element over kaart |
| Kaartweergave — Bottom nav | Ja (0.82, blur 16px) | Kaart zichtbaar erdoorheen |
| Detailweergave — Header | Ja (0.78, blur 12px) | Hero-foto zichtbaar erdoorheen bij scroll |

**Kernregel:** Glass alleen waar content (kaart/foto) erdoorheen zichtbaar moet zijn. In lijstweergave is alles solid — glass op een witte achtergrond is nutteloze GPU-overhead.

### Staten

**Eerste bezoek:**
- Lijstweergave met mooie kaarten, gesorteerd op populariteit
- Onboarding: fullscreen overlay met "Hoe oud is je kind?" → leeftijdknoppen → klaar
- Na onboarding: lijst herschikt, "Aanbevolen voor 2-3 jaar" label verschijnt

**Zoeken:**
- Tik zoekbalk → zoekresultaten vervangen lijst (in-place, geen navigatie)
- Typen filtert live
- Selecteer resultaat → navigeer naar locatiedetail

**Filteren:**
- Chips werken als toggles
- Lijst filtert instant, count badge update
- "+Meer" → extra rij met geavanceerde filters (leeftijd, afstand, faciliteiten)
- Sorteer-dropdown: Afstand / Peuterscore / Nieuw

**Locatie bekijken:**
- Tik op kaart in lijst → navigeer naar detailpagina (volledig scherm, niet een sheet)
- Tik op marker in kaartweergave → mini-kaart scrollt naar die locatie, tik nogmaals → detailpagina
- "Terug" knop → terug naar lijst/kaart op zelfde scrollpositie

**Favorieten:**
- ♡ op elke kaart (lijst en kaart) + in detail
- Favorieten-tab toont zelfde lijstweergave maar alleen opgeslagen locaties

**Plan maken:**
- Plan-tab → wizard als fullscreen flow
- Eindresultaat: tijdlijn-pagina met locatiekaarten + reistijd-blokken

### Gesture-patronen

| Gesture | Locatie | Actie |
|---------|---------|-------|
| Scroll verticaal | Lijst | Scroll door kaarten |
| Tik | Locatiekaart | Navigeer naar detail |
| Tik | Toggle knop | Wissel lijst ↔ kaart (crossfade 200ms) |
| Pan/pinch | Kaart (kaartweergave) | Beweeg/zoom kaart |
| Swipe horizontaal | Mini-kaarten (kaartweergave) | Bladeren door locaties |
| Tik | Marker | Highlight + scroll mini-kaarten naar die locatie |
| Swipe links | Locatiekaart (lijst) | Onthul snelacties: Favoriet, Deel |
| Pull-to-refresh | Lijst bovenaan | Ververs (als data veranderd is) |

### Oma Gerda test
- **Uitstekend:** Een lijst met mooie kaarten is het meest vertrouwde patroon dat bestaat. Dit is hoe ze Facebook, Marktplaats, en webshops gebruikt.
- **Uitstekend:** Geen verborgen gebaren, geen sheets om te ontdekken. Alles is zichtbaar.
- **Uitstekend:** Grote foto's en duidelijke tekst op elke kaart.
- **Goed:** De toggle-knop is duidelijk gelabeld ("Kaart" / "Lijst").
- **Klein risico:** De horizontale mini-kaarten in kaartweergave zijn klein. Maar de toggle naar lijstweergave is altijd beschikbaar.

### Eerlijke nadelen

1. **Kaart is een afterthought** — de kaart is verstopt achter een toggle. Gebruikers die "de kaart IS het product" verwachten (Bas's visie), zullen teleurgesteld zijn. De lijst domineert, de kaart is een hulpmiddel.
2. **Geen simultane kaart+lijst** — je ziet altijd maar een van de twee. De krachtige sync (pan kaart = update lijst) uit Concept 1 is onmogelijk. Je moet constant togglen.
3. **Toggle-knop is extra handeling** — elke keer dat je wilt wisselen: tik, wacht op animatie (200ms crossfade), herorienter. Dit telt op bij intensief gebruik.
4. **Photo-afhankelijkheid** — dit concept leunt ZWAAR op foto's. Zonder goede foto's (fase C van de research) zien de grote 3:2 kaarten er leeg uit met alleen emoji's of illustraties. Dit concept werkt pas echt goed na foto-implementatie.
5. **Minder "magisch"** — dit is een veilig, bewezen patroon (Airbnb, Booking.com). Het mist het innovatieve gevoel van glass-over-kaart. PeuterPlannen ziet er "gewoon goed" uit in plaats van "wow, dit is anders."
6. **Geen glass in de standaard view** — 80% van de tijd (lijstweergave) is er geen glass-effect. De Liquid Glass design language wordt alleen zichtbaar in kaartweergave en details. Dat voelt als een halve implementatie.

---

## Concept 4: "De Ontdekkaart" (Radial Discovery)

### Metafoor
Je staat midden in de stad met je peuter. Je draait om je as. Alles om je heen is bereikbaar. De dichtstbijzijnde locaties zweven als zeepbellen om je heen — grotere bellen zijn betere locaties. Je tikt op een bel om meer te weten.

### Kernidee
Volledig nieuw patroon. De kaart is fullscreen. Er is GEEN lijst, GEEN bottom sheet als primaire navigatie. In plaats daarvan: de kaart IS de interface. Locaties zijn interactieve markers die, wanneer het scherm in rust is, automatisch de 5-8 beste locaties in je viewport als "floating cards" tonen — kleine glass-kaartjes die direct op de kaart zweven bij hun marker, met naam en score. Tik op een floating card voor meer detail (expandeert in-place). Een "lade" (drawer) schuift van links in voor filters en favorieten.

### Schermopbouw — Standaard (kaart in rust)

```
┌─────────────────────────────┐
│                             │
│  ┌─ 🔍 ──────────── ≡ ┐   │ ← Zoekbalk (glass) + hamburger
│  └─────────────────────┘   │   Hamburger opent linker-lade
│                             │
│  [Speeltuin][Boerderij][+M] │ ← Filter chips (glass)
│                             │
│          ●                  │
│     ┌────────┐   ●    ⑤   │
│     │Westerp.│              │ ← Floating card op marker
│     │⭐ 8.4  │      ●      │   Glass: 0.82, blur 10px
│     └────────┘              │   Alleen top 5-8 in viewport
│              ┌──────────┐   │
│     ●        │Vondelpark│   │ ← Floating card
│  ●           │⭐ 9.1    │   │
│              └──────────┘   │
│                    ●        │
│   ┌─────────┐              │
│   │NEMO     │     ●        │ ← Floating card
│   │⭐ 7.8   │              │
│   └─────────┘              │
│        ●          ●        │
│                             │
│      ☀️ 14° · 127 locaties  │ ← Status-pill (glass, centered)
│                             │
├─────────────────────────────┤
│  📋Plan je dag    ♡ Opgesl. │ ← Minimale bottom bar (48px, glass)
│                             │   Slechts 2 acties, geen 5-tab nav
└─────────────────────────────┘
```

### Schermopbouw — Floating card getikte (in-place expand)

```
┌─────────────────────────────┐
│                             │
│  ┌─ 🔍 ──────────── ≡ ┐   │
│  └─────────────────────┘   │
│                             │
│          ●                  │
│     ●        ●    ⑤        │
│                             │
│   ╔═════════════════════╗   │
│   ║  Vondelpark Speelt. ║   │ ← Expanded card (glass, 0.88)
│   ║  ┌────────────────┐ ║   │   Animeert vanuit floating card
│   ║  │  📸 FOTO       │ ║   │   Foto, details, actieknoppen
│   ║  └────────────────┘ ║   │
│   ║  Speeltuin · 0.4 km ║   │
│   ║  ⭐ 9.1 · 1-4 jr   ║   │
│   ║  ✓ Gratis           ║   │
│   ║  ✓ Schaduw          ║   │
│   ║  ✓ Geschikt 1-4 jr  ║   │
│   ║                     ║   │
│   ║  [Bekijk] [Route] ♡║   │
│   ╚═════════════════════╝   │
│                             │
│        ●          ●        │
│                             │
│      ☀️ 14° · 127 locaties  │
├─────────────────────────────┤
│  📋Plan je dag    ♡ Opgesl. │
└─────────────────────────────┘
```

### Schermopbouw — Linker drawer (filters + navigatie)

```
┌─────────────────────────────┐
│╔══════════════════╗         │
│║                  ║         │ ← Drawer (glass 0.90, blur 20px)
│║  PeuterPlannen   ║    ●    │   Schuift van links, 80% breedte
│║                  ║         │
│║  ── Filters ──   ║  ●     │
│║                  ║         │
│║  Leeftijd        ║         │
│║  [1][2][3][4][5] ║         │ ← Leeftijdknoppen
│║                  ║         │
│║  Type            ║  ●     │
│║  ☐ Speeltuin     ║         │ ← Checkboxes
│║  ☐ Kinderboerd.  ║         │
│║  ☐ Museum        ║         │
│║  ☐ Zwembad       ║         │
│║                  ║         │
│║  Afstand         ║         │
│║  [< 1km][< 3km] ║  ●     │ ← Afstandknoppen
│║  [< 5km][> 5km] ║         │
│║                  ║         │
│║  ── Situatie ──  ║         │
│║  [☀️Zon] [🌧️Regen]║        │ ← Weer-presets
│║  [❄️Koud][🌡️Warm] ║        │
│║                  ║         │
│║  ── Meer ──      ║         │
│║  ℹ️ Over          ║         │ ← Navigatie-links
│║  📧 Contact      ║         │
│║  🔒 Privacy      ║         │
│╚══════════════════╝         │
└─────────────────────────────┘
```

### Schermopbouw — Locatiedetail (na "Bekijk" in expanded card)

```
┌─────────────────────────────┐
│  ← Terug          ♡  📤   │ ← Glass header
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   📸 HERO FOTO        │  │ ← Grote foto (16:9)
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Mini-kaartje               │ ← Kleine kaart (120px hoog)
│  ┌───────────────────────┐  │   Met marker van deze locatie
│  │     ●(hier)           │  │   Geeft ruimtelijk context
│  └───────────────────────┘  │
│                             │
│  Vondelpark Speeltuin       │ ← Alle details (scrollbaar)
│  [Speeltuin] · 0.4 km      │
│  ⭐ 9.1 Peuterscore        │
│  ...                        │
│  (zelfde detailcontent als  │
│   Concept 2/3)              │
│                             │
├─────────────────────────────┤
│  📋Plan je dag    ♡ Opgesl. │
└─────────────────────────────┘
```

### Glass-effecten gedetailleerd

| Element | Glass? | Opacity | Blur | Reden |
|---------|--------|---------|------|-------|
| Zoekbalk | Ja | 0.78 | 8px | Zweeft over kaart |
| Filter chips | Ja | 0.70 | 10px | Zweeft over kaart |
| Floating cards (ruststand) | Ja | 0.82 | 10px | Kaart zichtbaar erdoorheen, voelt als zeepbellen |
| Expanded card | Ja | 0.88 | 14px | Meer content = iets opaquer voor leesbaarheid |
| Status-pill onderaan | Ja | 0.65 | 8px | Subtiel, mag niet domineren |
| Linker drawer | Ja | 0.90 | 20px | Groot oppervlak, maar kaart nog subtiel zichtbaar aan de rand |
| Bottom bar | Ja | 0.78 | 12px | Minimaal, kaart zichtbaar erdoorheen |
| Detail-header | Ja | 0.78 | 12px | Foto zichtbaar erdoorheen bij scroll |

**Uniek aan dit concept:** glass is OVERAL, op elk moment. De kaart is altijd de achtergrond. Er is geen "solid mode" — alles zweeft.

### Staten

**Eerste bezoek:**
- Kaart centreert op locatie (GPS of Amsterdam)
- Floating cards verschijnen met een zachte fade-in (300ms, gestaffeld per card)
- Onboarding: glass-overlay met leeftijdknoppen, daarna verdwijnt overlay en floating cards passen aan
- De 5-8 beste locaties in viewport zijn automatisch zichtbaar als floating cards

**Zoeken:**
- Tik zoekbalk → zoekresultaten als floating lijst OVER de kaart (glass container)
- Typen filtert live
- Selecteer resultaat → kaart vliegt erheen, floating card van die locatie expandeert automatisch

**Filteren:**
- Snelle filters via chips boven de kaart
- Uitgebreide filters via hamburger → linker drawer
- Bij actieve filters: floating cards updaten, irrelevante markers vervagen (opacity 0.3)
- Actieve filter-count op hamburger-icoon: "≡ 3"

**Locatie bekijken:**
- Tik floating card → card expandeert in-place (morph-animatie vanuit klein naar groot)
- Tik "Bekijk" in expanded card → navigeer naar detailpagina
- Tik buiten expanded card → card krimpt terug
- Op de kaart: markers zonder floating card (minder relevante) tonen bij tik een mini-popup (naam + score) die na 3 sec verdwijnt

**Favorieten:**
- ♡ op expanded card + detailpagina
- "Opgeslagen" in bottom bar → kaart toont alleen favorieten-markers met floating cards

**Plan maken:**
- "Plan je dag" in bottom bar → fullscreen wizard-overlay (glass achtergrond)
- Kaart vaag zichtbaar achter de wizard
- Na wizard: kaart toont route, floating cards worden de dagplan-stops

### Gesture-patronen

| Gesture | Locatie | Actie |
|---------|---------|-------|
| Pan/pinch | Kaart | Beweeg/zoom, floating cards verdwijnen bij pan, verschijnen weer bij rust (400ms debounce) |
| Tik | Floating card | Expand in-place |
| Tik | Buiten expanded card | Collapse terug |
| Tik | Marker (zonder floating card) | Mini-tooltip (naam + score, 3 sec) |
| Swipe van links | Schermrand | Open drawer |
| Swipe naar rechts | Drawer | Sluit drawer |
| Tik | Hamburger ≡ | Open drawer |
| Tik buiten drawer | Dimmed kaart-achtergrond | Sluit drawer |
| Lang drukken | Kaart (leeg punt) | Drop pin → "Zoek hier in de buurt" |

### Oma Gerda test
- **Goed:** De floating cards zijn visueel aantrekkelijk en direct informatief — ze hoeft niets te openen om namen en scores te zien.
- **Goed:** De kaart is altijd het volledige scherm — geen verwarrende split-gebieden.
- **Risico:** Floating cards die verschijnen en verdwijnen bij pannen kan desorienterend zijn. "Waar is dat kaartje gebleven?" Oplossing: zachte animaties, en cards verschijnen altijd op dezelfde plek bij dezelfde zoom.
- **Probleem:** Hamburger menu is de slechtste discoverability van alle vier concepten. Oma Gerda weet misschien niet dat ≡ een menu is. Oplossing: label "Menu" naast het icoon, of eerste-keer tooltip.
- **Probleem:** Geen zichtbare tab-navigatie voor Plan/Favorieten. De bottom bar met 2 items is minimalistisch maar kan verwarrend zijn — "waar vind ik de rest?"
- **Probleem:** Geen lijstweergave. Sommige gebruikers (inclusief Oma Gerda) willen gewoon een lijst. Ze zijn niet gewend aan kaart-als-interface.

### Eerlijke nadelen

1. **Geen lijst** — dit is het grootste risico. Een significant deel van de gebruikers (geschat 30-40%) prefereert een lijst boven een kaart. Dit concept dwingt iedereen naar kaart-navigatie. Dat is een moedige keuze, maar mogelijk te moedig.
2. **Floating cards = visuele ruis** — 5-8 glaskaartjes op een kaart kan druk en chaotisch voelen, vooral op een klein scherm. Op zoom-level 13 (stadsniveau) overlappen ze waarschijnlijk. Positioneringslogica (collision avoidance) is technisch complex.
3. **Hamburger menu is verborgen navigatie** — decennia aan UX-research toont aan dat hamburger menus de engagement verlagen. Essientiele functies (filters, navigatie) achter een hamburger verstoppen is een bewezen anti-pattern.
4. **GPU-belasting is hoog** — floating cards zijn elk een glass-element met backdrop-filter. 5-8 tegelijk + zoekbalk + chips + status pill = 8-11 glass-elementen. De research zegt max 3-4. Dit kan ernstige performance-problemen geven op budget-telefoons.
5. **Collision avoidance is niet opgelost** — floating cards moeten niet overlappen, maar ook niet te ver van hun marker staan. Dit is een algoritmisch probleem (label placement) dat zelfs Google Maps niet perfect oplost.
6. **Expand-animatie is complex** — een floating card die morph-animeert van klein (80x40px) naar groot (280x300px) terwijl het op de kaart zweeft, met glass-effect, op een bewegende achtergrond... dit is technisch ambitieus en kan janky aanvoelen als het niet perfect is.
7. **Slechte discoverability** — nieuwe gebruikers weten niet wat ze moeten doen. Er is geen duidelijke "start hier" of lijstweergave om door te bladeren. De floating cards zijn passief — je moet de kaart pannen om meer te ontdekken.
8. **Plan + Favorieten zijn tweederangs** — met slechts 2 items in de bottom bar (in plaats van 5 tabs) voelen Plan je dag en Favorieten als bijzaak. Terwijl Plan je dag juist een kernfeature is.

---

## Vergelijkingstabel

| Criterium | 1. Speeltuin-Kijker | 2. Glazen Venster | 3. Kaartentafel | 4. Ontdekkaart |
|-----------|--------------------|--------------------|-----------------|----------------|
| **Kaart-prominentie** | Medium (40% vh) | Hoog (fullscreen) | Laag (achter toggle) | Maximaal (altijd fullscreen) |
| **Lijst-toegankelijkheid** | Hoog (altijd zichtbaar) | Medium (in sheet) | Hoog (standaard view) | Geen (alleen floating cards) |
| **Oma Gerda score** | 7/10 | 6/10 | 9/10 | 4/10 |
| **"Wow"-factor** | Medium | Hoog | Laag | Zeer hoog |
| **Glass-intensiteit** | Laag (2-3 elementen) | Hoog (4-5 elementen) | Variabel (0-4) | Zeer hoog (8-11) |
| **Technische complexiteit** | Hoog (sync-logica) | Hoog (gesture handling) | Laag-medium | Zeer hoog (collision, morph) |
| **Photo-afhankelijkheid** | Laag (thumbnails) | Medium (peek preview) | Zeer hoog (grote kaarten) | Medium (expanded cards) |
| **Progressive disclosure** | Medium | Hoog (peek→half→full) | Medium (toggle + expand) | Hoog (float→expand→detail) |
| **Gesture-complexiteit** | Medium (2 scroll-zones) | Hoog (sheet drag + map) | Laag (scroll + tik) | Medium (pan + tik) |
| **Past bij "kaart IS product"** | Gedeeltelijk | Ja | Nee | Volledig |
| **Performance-risico** | Laag | Medium | Laag | Hoog |
| **AllTrails-proximity** | Zeer hoog | Medium | Laag (meer Airbnb) | Laag (eigen patroon) |

---

## Aanbeveling: Hybride aanpak

Na het doordenken van alle vier concepten is mijn eerlijke aanbeveling een **hybride van Concept 2 (Glazen Venster) met elementen van Concept 3 (Kaartentafel):**

**Waarom Concept 2 als basis:**
- Fullscreen kaart = "de kaart IS het product" (Bas's kernvisie)
- Bottom sheet is het bewezen mobiele patroon (Google Maps, Apple Maps — miljoenen gebruikers weten hoe het werkt)
- Glass-effecten komen maximaal tot hun recht op een fullscreen kaart
- Progressive disclosure is ingebakken (peek → half → full)
- De research-synthesis noemt de bottom sheet letterlijk als "the critical missing piece"

**Wat te lenen van Concept 3:**
- De lijstweergave als alternatief (via toggle-knop) voor gebruikers die geen kaart willen — dit vangt Oma Gerda op
- De rijke, foto-gedreven kaarten wanneer in lijstmodus
- Solid styling in lijstmodus (geen nutteloze glass op witte achtergrond)

**Wat NIET te doen:**
- Concept 1 (split-panel): te weinig kaart op mobile, AllTrails werkt beter op desktop
- Concept 4 (floating cards): te experimenteel, te zware GPU-belasting, te slecht voor niet-tech-savvy gebruikers

**Concreet:** Fullscreen kaart met glass bottom sheet (Concept 2), plus een floating "Lijst" toggle-knop die wisselt naar een fullscreen kaartenstapel (Concept 3's lijstweergave). Beste van twee werelden. De kaart is standaard, maar wie wil kan naar een lijst. Glass waar het werkt (kaartweergave), solid waar het beter is (lijstweergave).

---

*Dit document is een ontwerp-artefact, geen implementatiespec. De gekozen richting moet vertaald worden naar een technische spec voordat er code wordt geschreven.*
