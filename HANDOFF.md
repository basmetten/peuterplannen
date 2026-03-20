# HANDOFF — 20 maart 2026

## Wat is er gedaan deze sessie

### plan-next.md: ALLES AFGEROND
- **Sessie 1 (A1-A5):** Apple Maps UX polish
- **Sessie 2 (B1-B4):** 262 nieuwe sfeerfoto's (67%->80%), quality check script, scoring integratie
- **Sessie 3 (D1-D3):** Personalisatie onboarding, 5-dag forecast, score strength chips

### Warm Glass Redesign: VOLLEDIG UITGEVOERD (Fase 0-5)
- **Fase 0:** Design tokens, motion/mini CDN, reactive store
- **Fase 1:** ~80 hardcoded CSS waarden gemigreerd naar warm-glass tokens
- **Fase 2:** Location detail 12 secties -> 3-tier progressive disclosure
- **Fase 3:** Map polish (cluster sizing, glass FAB, filled nav icons, a11y, Lijst FAB verwijderd, top nav hidden)
- **Fase 4:** Apple Maps search (expanderende pill, live suggesties, Annuleren knop)
- **Fase 5:** Performance (content-visibility, blur-up, preconnect, will-change, decoding=async)
- Framework beslissing: Vanilla JS + motion/mini (geen Svelte)

### B3 Foto Quality Check: DRAAIT OP ACHTERGROND
- Script evalueert alle 1000+ foto's met Gemini 3 Flash
- Score 1-2 foto's worden automatisch verwijderd uit Supabase
- ~53% fail rate tot nu toe (logos, schilderijen, screenshots)
- Duurt ~2 uur totaal (7s rate limit per Gemini call)

## Huidige staat

### Code (op main, gepusht)
- QA: 13/13 critical flows PASS (Fase 5 final QA)
- Redesign branch gemerged naar main
- CI: check na merge

### Wat nog draait / open staat
1. **B3 quality check** draait in terminal — laat draaien tot klaar, of herstart:
   ```bash
   GEMINI_API_KEY=AIzaSyBtd21R1VqAYZLjwnuti5K4Qool-vT9nXA node .scripts/pipeline/quality-check-photos.js
   ```
2. **Foto's committen** — 262 nieuwe images (293MB) in `/images/locations/`, nog niet in git
3. **sync-photo-urls.js** draaien na B3 klaar is
4. **sw.js updaten** met `warm-glass-tokens.css` in cache-lijst
5. **Gemini API key** vernieuwd: `AIzaSyBtd21R1VqAYZLjwnuti5K4Qool-vT9nXA`

### Belangrijke bestanden
- `plan-warm-glass-redesign.md` — redesign plan (alle fasen klaar)
- `warm-glass-tokens.css` — het design token systeem
- `plan-next.md` — het eerdere plan (alles afgerond)
- `.scripts/pipeline/quality-check-photos.js` — Gemini quality filter
- `docs/archive/APPLE-MAPS-UX-RESEARCH.md` — Apple Maps research

### Gemini feedback voor polish later
- Week picks cards: wit tekst contrast verbeteren
- Bottom nav tekst iets groter
- Desktop sidebar glass effect sterker maken (hogere blur na device testing)
