# PeuterPlannen — Groot Plan: Apple Maps Polish + Photo Quality + Testing

**Status:** CONCEPT — wacht op goedkeuring Bas
**Datum:** 20 maart 2026
**Context:** UX revamp (10 fasen) is in ~4 uur uitgevoerd. Fase 1-3 klaar, 4-5 grotendeels. Dit plan pakt de drie grootste gaps aan: (A) de UX voelt nog niet genoeg als Apple Maps, (B) foto's zijn te laag kwalitatief, (C) testen is niet grondig genoeg.

---

## Deel A: Apple Maps UX Polish (1-2 sessies)

### Wat ontbreekt vs echte Apple Maps

| Apple Maps gedrag | Onze huidige staat | Fix |
|---|---|---|
| Sheet peek toont alleen search bar + "X results" | Wij tonen search pill + weer + tabs + forecast | Peek compacter: alleen pill + meta, tabs naar half |
| Sheet half: clean lijst, geen afleiding | Week picks + forecast + tabs + lijst = druk | Forecast verbergen (done), tabs boven lijst plaatsen |
| Marker tap → sheet schuift smooth omhoog met preview | Werkt maar preview layout kan strakker | Preview card redesign: grotere foto, minder padding |
| Dragging sheet voelt native (rubber band, momentum) | Touch engine werkt maar mist rubber-band bounce | Overshoot toevoegen: -10px bounce op snap position |
| Achtergrond dimt bij full sheet | Overlay is er maar opacity is subtiel | Overlay opacity 0.4 → 0.5, smooth fade |
| Zoekbalk met "Cancel" knop bij focus | Wij hebben filter chips toggle | Search pill expand animatie bij focus |
| Floating action button (recenter) | Recenter knop bestaat maar styling basic | FAB-style met shadow, pulse animatie na pan |

### Concrete taken

**A1. Sheet peek compacter maken**
- Tabs verplaatsen van peek naar half state (CSS only)
- Peek wordt: pill + meta-line (weer + count). Meer niet.
- Hoogte peek: 120px → ~90px

**A2. Sheet touch-feel verbeteren**
- Rubber-band overshoot: na snap, kort -10px bounce via CSS animation
- Snellere transition: 300ms → 250ms
- Content scroll: `-webkit-overflow-scrolling: touch` al aanwezig, test op echte iPhone

**A3. Location preview card redesign**
- Grotere foto (96x96 → 120x80, landscape ratio)
- Score badge rechts, groter
- "Route" knop prominent, Apple Maps blue
- Afgeronde hoeken 14px

**A4. Map interaction polish**
- Recenter FAB: cirkel, 48x48, shadow, pulse na user pan
- Marker selectie: geselecteerde marker krijgt scale(1.3) + bounce
- Cluster tap: smoother zoom transition

**A5. Micro-animaties**
- Tab switch: slide indicator (niet instant swap)
- Filter chip: press scale(0.95) feedback
- Card tap: subtle highlight 100ms

---

## Deel B: Foto Kwaliteit Upgrade (1 sessie, parallel met A)

### Huidige staat
- 1.442 van 2.138 locaties hebben foto (69%)
- Kwaliteit: mix van echte sfeerfotos, logos, stock, en lage resolutie
- Logo-filter draaide al, 46 gefilterd — maar heuristic is beperkt

### Strategie: Browser-based scraping met kwaliteitscheck

**B1. Google Places API gap-fill**
- Script bestaat al (`fetch-photos.js`)
- Draaien voor alle 696 locaties zonder foto die een `place_id` hebben
- Google Places levert over het algemeen goede kwaliteit
- Geschatte kosten: ~$5-10 (Places Photo API)

**B2. Browser-use scraping voor restant**
- Voor locaties zonder Google Places foto: Playwright MCP browser-based scraping
- Per locatie: navigeer naar website, zoek hero image / gallerij
- Criteria voor acceptatie:
  - Minimaal 400px breed
  - Landscape ratio (breedte > hoogte)
  - Niet overwegend wit/zwart (logo indicator)
  - Bevat kleurvariatie (stddev > 30)
  - Geen gezichten van kinderen (GDPR: simpele heuristiek, geen face detection)
- Haiku agents parallel: 10 tegelijk, elk blok van 20 locaties

**B3. AI-powered kwaliteitsfilter**
- Na scraping: alle nieuwe + bestaande foto's door Gemini Flash Vision
- Prompt: "Is dit een sfeervolle foto van een locatie (speeltuin, boerderij, museum, etc) die ouders aanspreekt? Of is het een logo, stockfoto, of lage-kwaliteit afbeelding? Antwoord: GOOD of BAD met reden."
- BAD foto's verwijderen, fallback naar categorie-illustratie
- Optioneel: top-10% markeren als "featured" voor week picks

**B4. Foto metadata verrijken**
- `photo_quality` kolom toevoegen aan DB (1-5 score van Gemini)
- Discovery scoring: kwaliteitsscore meewegen i.p.v. flat +5 bonus
- Week picks: alleen locaties met score >= 3

---

## Deel C: Geautomatiseerd Visual QA Systeem (1 sessie)

### Probleem
Testen was "load page + screenshot + looks ok" — te oppervlakkig. Gaps in sheet states, touch interactions, en edge cases werden gemist.

### Oplossing: Quinn QA Persona + Gemini Verificatie

**C1. QA slash command maken** (`.claude/commands/visual-qa.md`)
```
Je bent Quinn, een veteran QA engineer. Je kunt GEEN broncode lezen —
je test uitsluitend via de browser als een echte gebruiker.

## Testprotocol
1. Resize naar 390x844 (iPhone 14)
2. Navigeer naar de app
3. Neem een screenshot NA ELKE stap

### Sheet states
- [ ] Peek state: is search pill zichtbaar? Weer? Count?
- [ ] Tik search pill: openen filter chips?
- [ ] Sleep sheet omhoog: half state? Lijst zichtbaar?
- [ ] Sleep verder omhoog: full state?
- [ ] Sleep omlaag vanuit full: terug naar half?
- [ ] Sleep omlaag vanuit half: terug naar peek?
- [ ] Probeer sheet weg te slepen vanuit peek: MOET NIET verdwijnen

### Tabs
- [ ] Tik "Kaart" tab: map resize correct?
- [ ] Tik "Favorieten" tab: sheet naar half? Lege state tekst?
- [ ] Tik "Plan" tab: plan view laden?
- [ ] Tik "Info" tab: info panel openen?
- [ ] Tik "Ontdek" tab: terug naar peek + alle locaties?

### Map interactie
- [ ] Tik op cluster: zoom in?
- [ ] Tik op marker: preview card in sheet?
- [ ] Tik op lege map: preview verdwijnt, terug naar peek?

### Filter chips
- [ ] Tik "Speeltuin": lijst filtert? Count verandert?
- [ ] Tik "Alles": reset?

### Desktop (resize naar 1280x800)
- [ ] Split layout: filters links, map rechts?
- [ ] Geen bottom sheet zichtbaar?
- [ ] Location cards laden in grid?

### Visuele kwaliteit (per screenshot → Gemini Flash)
- Geen clipping of overflow
- Tekst leesbaar, niet afgesneden
- Juiste spacing, geen overlapping
- Animaties correct afgerond (geen half-state artifacts)
```

**C2. Gemini Flash verificatie integreren**
- Na elke screenshot: automatisch naar Gemini Flash sturen met specifieke prompt
- Resultaat loggen in `qa-report.md`
- Bij FAIL: screenshot opslaan met beschrijving van het probleem

**C3. CI integratie (optioneel, later)**
- GitHub Action die na elke push een headless Playwright QA run doet
- Report als PR comment

---

## Deel D: Resterende UX Revamp Fasen

### D1. Fase 6: Personalisatie (localStorage, geen account)
- Na 2e locatie bekeken: inline onboarding ("Heb je een dreumes of peuter?")
- Leeftijdsvoorkeur opslaan, filters automatisch vullen
- "Wis mijn voorkeuren" knop (al gebouwd)
- Relevantie-sortering: dichtstbijzijnd + leeftijd-match eerst

### D2. Fase 7: Discovery & Retentie
- "Deze week in [stad]" blok (al gebouwd, polish nodig)
- Forecast strip: alleen in half state (done)
- Newsletter deep-link: vanuit app naar signup met pre-fill

### D3. Fase 5 afronden
- Score breakdown op browse cards (niet alleen in sheet)
- Score live laten veranderen bij weer-toggle

---

## Volgorde & Tijdsinschatting

| Stap | Wat | Geschatte tijd |
|---|---|---|
| **Nu** | C1: QA slash command schrijven | 15 min |
| **Sessie 1** | A1-A5: Apple Maps polish | 2-3 uur |
| **Sessie 1** | C2: QA run na polish | 30 min |
| **Sessie 2** | B1: Google Places gap-fill | 1 uur |
| **Sessie 2** | B2: Browser-based scraping | 2-3 uur |
| **Sessie 2** | B3: Gemini kwaliteitsfilter | 1 uur |
| **Sessie 3** | D1: Personalisatie | 2 uur |
| **Sessie 3** | D2-D3: Discovery + Score afronding | 1 uur |

Totaal: ~3 sessies van 3-4 uur. Gegeven ons track record van gisteren (4 uur = weken werk) is dat realistisch.

---

## Over de snelheid van gisteren

Het UX revamp plan was geschreven voor meerdere dagen/weken. Het is in ~4 uur uitgevoerd. Dat is niet fout — het is precies hoe Claude Code + een goede operator werkt:
- Het plan was extreem specifiek (CSS tokens, exacte component namen, stap-voor-stap)
- Jij hoefde niks te debuggen, alleen beslissingen te nemen
- Parallel agents deden het onderzoek, ik deed de implementatie
- Geen meetings, geen PR reviews, geen context switches

De les: **plannen moeten ambitieuzer, maar nóg specifieker.** Dit plan is daar een voorbeeld van.
