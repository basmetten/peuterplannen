# Handoff: UX Revamp Fase 1-5

> Laatst bijgewerkt: 19 maart 2026

## Wat is gedaan

### Fase 1: Code-Fundament (KLAAR)
- 14 ES modules in `modules/`, entry point `app.js`
- Glass CSS tokens in `glass.css`
- Foto-fallback hierarchie + hero foto in bottom sheet

### Fase 2: Rijke Data Ontsluiten (KLAAR)
- Quick-scan tags, "sterke punten" sectie, weer-reactieve badges
- Drukte-indicator, Supabase query met 11 rijke velden

### Fase 3: Mobiel UX — Bottom Sheet (KLAAR)
- 4-state sheet engine (hidden/peek/half/full) met touch gestures
- Map-first layout (Apple Maps paradigma)
- Compact cards in half-state (30 locaties)
- Marker → sheet preview (foto, naam, score, Meer info/Route)
- Kaart/Lijst toggle (floating pill button)
- Sheet tabs (Ontdek/Opgeslagen/Plan)
- Deep linking (#plan, #list, #@lat,lng,zoom/loc/slug)
- Safari fixes + glass polish + bottom nav fix
- Sheet height: 100dvh voor correcte transform percentages

### Fase 4: Plan je dag 2.0 (GROTENDEELS KLAAR)
- Progressive disclosure input (4 stappen + "✨ Maak mijn dagplan" CTA)
- Duration cards: Ochtend / Halve dag / Hele dag / Eén locatie
- `modules/plan-engine.js` — 8-dimensie MCDM scoring algoritme
- Template-based selectie (4 shapes) + greedy algorithm
- Nap-time awareness + peuter-reistijden (1.5x factor + 10min buffer)
- Timeline v2 output met reistijden + match badges
- Swap/shuffle per activiteit
- Supabase query uitgebreid met rijke velden voor plan scoring

### Fase 5: Peuterscore 2.0 (DEELS KLAAR)
- `computePeuterScoreV2()` in scoring.js — 6 gewogen dimensies
- `getTopStrengths()` — top-3 sterktes per locatie
- Context-aanpassing (weer, leeftijd, dag van de week)
- "Waarom deze score?" expand met 6 horizontale balken in sheet.js

**WAT NOG OPEN STAAT:**
- Fase 4: Timeline v2 CSS grid layout verfijnen (foto's in cards, dot-line connector)
- Fase 4: WhatsApp delen verbeteren met v2 format
- Fase 4: AI-narratief (Gemini) als garnering
- Fase 5: Top-3 sterktes tonen op browse kaarten
- Fase 5: Score verandert zichtbaar bij weerslag (live demo)
- Fase 6+: Personalisatie, zoekfunctie, etc.

## Bestanden gewijzigd

```
peuterplannen/
├── app.js                    (imports + window._pp_modules + deep linking + hash management)
├── app.html                  (~750 regels, sheet preview + list view + toggle + tabs + duration cards)
├── app.css                   (timeline v2 CSS + duration chip styles)
├── app.min.css               (moet opnieuw geminified)
├── glass.css                 (sheet CSS + preview + toggle + tabs + safari fixes + score breakdown)
└── modules/
    ├── plan-engine.js        (NIEUW — 8-dimensie MCDM scoring + templates + nap + swap)
    ├── scoring.js            (computePeuterScoreV2 + getTopStrengths toegevoegd)
    ├── sheet-engine.js       (4-state sheet + showLocationInSheet + hideLocationPreview + tabs)
    ├── sheet.js              (score breakdown UI + bestaande loc detail)
    ├── map.js                (marker → sheet interactie + deep link hash updates)
    ├── layout.js             (map-list toggle + hash updates + initMapListToggle)
    ├── data.js               (renderSheetList + updateSheetMeta hooks)
    ├── plan.js               (plan v2 met timeline rendering + swap + engine integratie)
    ├── state.js, cards.js, tags.js, scoring.js, filters.js
    └── bus.js, utils.js, favorites.js
```

## Volgende sessie prompt

```
Lees /Users/basmetten/peuterplannen/HANDOFF.md en /Users/basmetten/peuterplannen/plan-ux-revamp.md. Fase 3 is klaar, Fase 4 en 5 zijn grotendeels klaar. Verfijn de timeline v2 visuele output (grid layout met foto's en dot-line connector). Test de score breakdown expand. Start daarna met Fase 6 (personalisatie). Test op mobile viewport 390x844.
```

## Test lokaal

```
cd /Users/basmetten/peuterplannen
python3 -c "
import http.server, socketserver, os
os.chdir('/Users/basmetten/peuterplannen')
h = http.server.SimpleHTTPRequestHandler
h.extensions_map['.js'] = 'application/javascript'
socketserver.TCPServer(('', 8771), h).serve_forever()
"
# Open http://localhost:8771/app.html
# Test mobile: Chrome DevTools → 390x844 viewport
# Test plan: http://localhost:8771/app.html#plan
```
