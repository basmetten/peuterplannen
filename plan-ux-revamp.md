# PeuterPlannen UX Revamp — Strategisch Plan

> Gebaseerd op deep research (maart 2026): 17 subagents, 25+ concurrenten geanalyseerd, 6 virtuele persona's, framework-analyse, en gedetailleerde UX specs.

---

## Uitgangspositie

### Wat er al is (en goed werkt)
PeuterPlannen staat op een **indrukwekkend niveau** voor een indie product:
- 2138+ geverifieerde locaties, 22 regio's, 8 categorieën
- MapLibre GL kaart met clustering + type-kleuren (uniek in NL — geen concurrent heeft dit)
- Situatie-presets (Regenproof, Buiten+koffie, etc.) — innovatief, niemand doet dit
- "Plan je dag" AI (Gemini-powered, weer/transport/leeftijd-aware)
- Peuterscore redactioneel ratingsysteem
- Live weer-integratie → automatische suggesties
- Partner portal met Stripe (3-tier model)
- Admin portal met 10+ tabs
- 2200+ statische pagina's met SEO-graduatiesysteem
- Mobile-first responsive, getest op 15+ devices

### Wat de concurrentie doet
- **Geen enkele Nederlandse concurrent heeft een map+list combo** (UitMetKinderen, Kidsproof, DagjeWeg, ANWB zijn allemaal list-only)
- **Alle Nederlandse concurrenten zitten vol advertenties** — PeuterPlannen's schone ervaring is een groot voordeel
- **AllTrails** is de UX-goudstandaard voor map-first discovery (split-panel, synced browsing, filter pills)
- **Airbnb** is de standaard voor bottom sheets en card design
- **Yelp/Spotify** tonen hoe personalisatie en wekelijkse discovery werken

---

## Architectuurbeslissing: Vanilla JS Blijft

### Besluit: NIET migreren naar Astro/Next.js/SvelteKit

Na Opus-level analyse is de conclusie:
1. **Je hebt al wat Astro zou opleveren** — `sync_all.js` = static site generator, `app.html` = interactive island
2. **Migratie-risico te hoog** voor solo non-technical founder — framework errors zijn moeilijker te debuggen
3. **Claude Code werkt beter met vanilla JS** — minder abstractielagen, snellere debugging
4. **Geen geplande feature vereist een framework**
5. **De trend in 2025-2026 beweegt terug naar vanilla JS**, mede door AI-assisted development

### Wat wél moet: Modularisatie van app.html
Splits de 3,327-regel `app.html` in ES modules:
```
/app/modules/
  map.js            (MapLibre init + interactie)
  filters.js        (filter logica + chips)
  planner.js        ("Plan je dag" AI feature)
  bottom-sheet.js   (mobiele interactie)
  state.js          (gedeelde state, localStorage)
  cards.js          (locatiekaarten rendering)
  weather.js        (weer-integratie)
  personalization.js (voorkeuren + scoring)
```
Geen bundler nodig — browsers ondersteunen `import/export` native. Optioneel later esbuild voor minification.

---

## De 7 Verbeterpijlers

### Pijler 1: Foto's (HOOGSTE PRIORITEIT)

**Waarom:** 5 van 6 focusgroep-persona's noemden dit als #1 gemis. Foto's zijn het verschil tussen "dit klinkt interessant" en "we gaan erheen."

**Strategie (4 fasen):**

| Fase | Wat | Kosten | Tijdlijn |
|------|-----|--------|----------|
| 1 | Categorie-illustraties (aquarel stijl, ~15-20 images) als fallback voor emoji's | €0 | Week 1 |
| 2 | Pexels gratis foto's per categorie + Google Places voor top 200 locaties | ~€5 | Week 2-3 |
| 3 | Cloudflare R2 opslag + Worker voor WebP/AVIF conversie | €0-15/mnd | Maand 2 |
| 4 | Partner-uploaded foto's via partner portal | €0 | Maand 3+ |

**Technisch:** Sharp in bestaande build pipeline, `<picture>` elementen met fallbacks, 3:2 aspect ratio voor kaarten.

**GDPR:** Geen foto's van kinderen accepteren zonder expliciete toestemming. Focus op locatie/ruimte foto's.

> Gedetailleerde strategie: `/peuterplannen/PHOTO-STRATEGY.md`

---

### Pijler 2: Plan je dag 2.0 (UNIQUE SELLING POINT)

**Waarom:** Dit is jullie competitive moat. Geen enkele concurrent biedt "ik heb 2 uur op een regenachtige dinsdag met een 2-jarige, wat moet ik doen?"

**Van → Naar:**
- **Nu:** 2-3 zinnen tekst van Gemini
- **Straks:** Visuele tijdlijn met kaartroute, tijdblokken, en deelbaar formaat

**Kerninnovaties:**
1. **Gestructureerde JSON output** van Gemini (niet vrije tekst) → maakt visuele tijdlijn mogelijk
2. **Verticale tijdlijn** met activiteit-kaarten + reistijd-blokken
3. **Peuter-intelligentie:** nap-time awareness per leeftijd, energiecurve (actief 's ochtends, rustig 's middags), peuter-aangepaste looptijden (2x langzamer), +10 min buffer per activiteit
4. **Drie niveaus regeneratie:** volledige shuffle, enkele activiteit wisselen, of bijsturen ("Meer binnen", "Rustiger")
5. **WhatsApp-first delen:** voorgeformateerd bericht + save-as-image + kalender export (.ics)

**Focusgroep-inzicht:** Mark (vader van tweeling) wil een "één locatie, maak het goed" modus. Sophie (eerste kind) wil nap-schedule integratie. Beide zijn haalbaar.

> Gedetailleerde UX spec: `/peuterplannen/plan-je-dag-ux-spec.md`

---

### Pijler 3: Mobile Map UX (Bottom Sheet)

**Waarom:** Bottom sheets zijn de standaard voor mobiele kaart-apps (Google Maps, Airbnb, AllTrails). De huidige info-panel aanpak voelt gedateerd.

**Drie-state bottom sheet:**
- **Peek (120px):** Naam + peuterscore + type badge — kaart volledig zichtbaar
- **Half (50vh):** Foto + beschrijving + faciliteiten + route knop
- **Full (100vh-64px):** Alles + vergelijkbare locaties + blog links

**Technisch:** Vanilla JS `BottomSheet` class (~150 regels), CSS `translateY()` met spring-like bezier curves, touch/gesture handling.

**Gesture conflict resolution:**
- Sheet handle area: altijd sheet drag
- Sheet content area: scroll, met drag naar beneden als je bovenaan bent
- Map area: altijd map pan/zoom

**MapLibre optimalisaties voor mobiel:** `fadeDuration: 0`, `cancelPendingTileRequestsWhileZooming: true`, rotation en pitch uitschakelen.

> Gedetailleerde spec: `/peuterplannen/docs/mobile-map-ux-spec.md`

---

### Pijler 4: Lichtgewicht Personalisatie

**Waarom:** De app kent de gebruiker niet. Iedereen ziet dezelfde resultaten. Yelp's <2 min onboarding transformeert de hele ervaring.

**Aanpak (privacy-first, geen accounts):**
1. **Onboarding: slechts 2 vragen** — leeftijd kind + transportmodus (88% abandonment bij langere formulieren)
2. **localStorage voor voorkeuren** + IndexedDB voor gedragshistorie
3. **Client-side scoring:** gewogen algoritme (leeftijd match 30%, afstand 25%, type voorkeur 20%, faciliteiten 10%, nieuwheid 10%, kwaliteit 5%)
4. **Progressieve verrijking:** leer van klikgedrag over tijd
5. **GDPR-safe:** expliciete voorkeuren in localStorage = "strictly necessary", geen consent nodig. Gedragstracking = opt-in.
6. **Cross-device sync zonder account:** voorkeuren encoded in URL (base64url), optioneel QR code

**Personalisatieniveau:** Target Level 3 — "Speeltuinen in De Pijp voor kinderen van 2-3 jaar" (niet Level 5 — "Je plant meestal op woensdag"). Altijd uitleggen waarom iets getoond wordt.

> Gedetailleerde strategie: `/peuterplannen/personalization-strategy.md`

---

### Pijler 5: Praktische Locatie-Info

**Waarom:** Focusgroep toont dat ouders beslissingen maken op praktische info die nu ontbreekt.

**Toevoegen per locatie:**
- **Prijsindicatie:** `Gratis` / `€` / `€€` / `€€€` — Mark (vader, budget-bewust) noemde dit als #1 filter-wens
- **"Nu open/gesloten" badge** — real-time, zoals Google Maps
- **Adres met 1-klik kopie**
- **Openingstijden** (indien beschikbaar)
- **Toegankelijkheidsinfo:** bankjes, ondergrond (verhard/grind/zand), afstand parkeerplaats-ingang — Oma Gerda's #1 verzoek
- **Quick-scan tags in lijstweergave:** Gratis/Betaald, Omheind/Open, Koffie, Rolstoeltoegankelijk — zichtbaar zonder te klikken

**Gratis/Betaald filter** als aparte filteroptie in de app.

---

### Pijler 6: Social Proof & Community

**Waarom:** Redactionele scores zijn sterk, maar ouders vertrouwen ook andere ouders. Geen beoordelingen = beslissing afronden op Google Maps.

**Lichtgewicht aanpak (geen full review systeem):**
1. **"Was je hier?" → thumbs up/down** + optioneel 1-zin tip (geen account nodig, localStorage)
2. **"12 ouders bezochten dit recent"** als social proof badge
3. **"Bezocht" tracking** — markeer locaties als bezocht, toon in eigen profiel
4. **Seizoenstips van community:** "In april: lammetjes!" (ingediend, redactioneel goedgekeurd)

**Later (als volume groeit):**
- "Trending deze week" sectie
- Gamification: badges voor bezochte locaties

---

### Pijler 7: Engelse Versie (Bereik Vergroten)

**Waarom:** 2 van 6 persona's (Fatima, Priya) konden de site niet of nauwelijks gebruiken door de taalbarrière. Den Haag, Amsterdam, Eindhoven hebben enorme expat-gemeenschappen.

**Aanpak (geen volledige vertaling):**
1. **Fase 1:** Engelse navigatie, filter-labels, en situatie-preset namen
2. **Fase 2:** Korte Engelse samenvatting (2-3 zinnen) per locatie
3. **Fase 3:** Engelse blogartikelen voor top-steden

**Technisch:** i18n laag in `sync_all.js`, JSON vertalingsbestand, genereer `/en/amsterdam/` etc. Geen framework nodig.

---

## Implementatie Roadmap

### Fase 1: Fundament (weken 1-2)
- [ ] `app.html` opsplitsen in ES modules
- [ ] Categorie-illustraties als foto fallback
- [ ] Prijsindicatie toevoegen aan locatie-data

### Fase 2: Core UX (weken 3-6)
- [ ] Bottom sheet implementatie (mobiel)
- [ ] Pexels/Google Places foto's voor top 200 locaties
- [ ] Quick-scan tags in lijstweergave (gratis/betaald, omheind, koffie)
- [ ] "Nu open/gesloten" badges
- [ ] 2-vragen onboarding (leeftijd + transport)

### Fase 3: Plan je dag 2.0 (weken 7-10)
- [ ] Gestructureerde JSON output van Gemini
- [ ] Visuele tijdlijn UI
- [ ] Peuter-intelligentie (nap awareness, buffers, energiecurve)
- [ ] WhatsApp-deelformat
- [ ] "Één locatie" modus

### Fase 4: Community & Verrijking (weken 11-14)
- [ ] "Was je hier?" thumbs up/down
- [ ] "Bezocht" tracking (localStorage)
- [ ] Cloudflare R2 foto-pipeline + partner uploads
- [ ] Personalisatie scoring engine
- [ ] Client-side aanbevelingen

### Fase 5: Bereik (weken 15-18)
- [ ] Engelse navigatie + filter labels
- [ ] Engelse locatie-samenvattingen (top 500)
- [ ] Toegankelijkheidsinfo per locatie
- [ ] "Deze week in [stad]" blok

### Fase 6: Polish (doorlopend)
- [ ] Kalender export voor dagplannen
- [ ] Seizoenstips community
- [ ] Gamification (bezochte locaties)
- [ ] "Trending deze week" sectie

---

## Focusgroep Samenvatting

| Persona | NPS | #1 Wens | #1 Frustratie |
|---------|-----|---------|---------------|
| Sophie (30, Amsterdam, baby 11mnd) | 7 | Foto's | Site naam suggereert "niet voor baby's" |
| Mark (34, Rotterdam, tweeling 3jr) | 8 | Gratis/betaald filter | Kan niet filteren op prijs |
| Fatima (28, Den Haag, zoon 2jr) | 4 | Engels | Hele site is ontoegankelijk |
| Jan & Lisa (38, Haarlem, 1+4jr) | 7 | "Bezocht" markering | Geen multi-leeftijd filter |
| Oma Gerda (65, Amersfoort, kleinzoon 2jr) | 6 | Toegankelijkheidsinfo | Kaart onbruikbaar, regio te breed |
| Priya (32, Utrecht, dochter 18mnd) | 6 | Foto's + deelbare kaarten | Geen foto's = geen Instagram-share |

**Gemiddelde NPS: 6.3** — Gerespecteerd maar niet geliefd. De site helpt bij ontdekking maar ouders voltooien hun beslissing elders (Google Maps, Instagram).

**Doel na revamp: NPS 8+** — De site wordt de plek waar de beslissing wordt genomen, niet alleen waar de ontdekking begint.

---

## Referentiedocumenten

| Document | Locatie |
|----------|---------|
| Foto strategie | `/peuterplannen/PHOTO-STRATEGY.md` |
| Plan je dag UX spec | `/peuterplannen/plan-je-dag-ux-spec.md` |
| Personalisatie strategie | `/peuterplannen/personalization-strategy.md` |
| Mobile map UX spec | `/peuterplannen/docs/mobile-map-ux-spec.md` |
| Competitor UX analyse | `/competitor-ux-research/COMPETITOR-UX-ANALYSIS.md` |
| Competitor screenshots | `/competitor-ux-research/*.png` |

---

*Dit plan is het resultaat van 17 research agents (Haiku + Opus), analyse van 25+ concurrenten/vergelijkbare apps, 6 virtuele persona-interviews, en gedetailleerde technische specs. Het is bedoeld als strategisch fundament — elke fase moet worden uitgewerkt in een gedetailleerd implementatieplan voordat er gebouwd wordt.*
