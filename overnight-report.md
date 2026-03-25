# Overnight Report — 23 maart 2026

## Taak 1: Codebase Verbeteringen

### Samenvatting
10 parallelle analyse-agents hebben de codebase doorgespit op 10 domeinen. Daaruit zijn 15 high-confidence verbeteringen geselecteerd en geïmplementeerd met 5 parallelle worktree agents.

**Commit:** `d96cdb18c9` — gepusht naar main, Cloudflare cache gepurged, GitHub Actions succesvol.

### Wat is verbeterd

#### Performance
- **Unused motion.js verwijderd** — 11KB JS + 1 DNS lookup naar esm.sh bespaard
- **Overlay change tracking** — DOM schrijfoperaties in `applyMorphs()` gereduceerd door caching van laatste waarden
- **Weather API caching** — Open-Meteo wordt nu max 1x per uur gecalld (was: elke pageload)
- **Double loadLocations() op init gefixt** — cold start is nu sneller doordat locaties niet twee keer worden opgehaald
- **Search debounce** — 150ms debounce op zoekfiltering in de sheet (was: elke toetsaanslag)

#### Accessibility
- **viewport-fit=cover** toegevoegd — safe-area insets werken nu correct op iPhone met notch/Dynamic Island
- **sr-announcer updates** — screenreaders worden nu geïnformeerd bij openen/sluiten van het filter paneel
- **og:site_name + og:image:alt** — betere social sharing en toegankelijkheid

#### Bug fixes
- **Velocity snap bias gefixt** — de sheet snapt nu correct naar de state waar je naartoe flikt (biasedDist werd berekend maar niet gebruikt)
- **Null guards** — crash-preventie in data.js, cards.js, filters.js, map.js voor ontbrekende DOM elementen

#### Code quality
- **WEATHER_LABELS gecentraliseerd** — was 3x gedefinieerd in templates.js en sheet-engine.js, nu 1x in state.js
- **Route buttons null-safe** — lat/lng worden nu gecheckt voordat de Route knop gerenderd wordt
- **-webkit-overflow-scrolling: touch verwijderd** — deprecated CSS property opgeruimd

### Niet geïmplementeerd (bewuste keuze)
De volgende bevindingen waren interessant maar te risicovol of te groot voor een nachtelijke sessie:

- **CSS !important opschoning** (179 instances) — vereist grondige visuele regressie testing
- **Z-index token systeem** — architecturele wijziging die overdag moet gebeuren
- **Service Worker** — grote feature, 2-3 uur werk
- **Newsreader font optimalisatie** — design beslissing nodig
- **Filter modal focus trap** — complexe a11y verbetering die handmatig testen vereist
- **Map event listener cleanup** — vereist refactoring van map module

### Test resultaten
- **185 unit tests** — alle groen ✓
- **77 e2e tests** — alle groen ✓ (screenshot baselines bijgewerkt)
- **GitHub Actions** — succesvol ✓
- **Cloudflare cache** — gepurged ✓

---

## Taak 2: Dataset Kwaliteitscheck

### Aanpak
15 parallelle Haiku agents met web search zijn gelanceerd om de 2000 locaties in de dataset te verifiëren. Elke agent kreeg ~133 locaties om te checken via:
- WebSearch naar locatienaam + regio
- WebFetch van de website (als aanwezig)
- Verificatie: nog open? correct type? juiste naam? werkende website?

### Resultaten

**108 issues gevonden** over 2000 locaties (5.4% foutrate):

| Issue Type | Aantal | High Confidence |
|-----------|--------|-----------------|
| Verkeerd type | 28 | 20 |
| Verkeerde regio | 25 | 18 |
| Dode website | 16 | 12 |
| Verkeerde naam | 13 | 9 |
| Verkeerde locatie | 10 | 8 |
| Permanent gesloten | 8 | 7 |
| Overig | 8 | 5 |

**Belangrijkste bevindingen:**

1. **8 permanent gesloten locaties** — moeten verwijderd of gemarkeerd worden
2. **16 dode websites** — URL's die 404 geven, SQL script zet ze op NULL
3. **25 verkeerde regio's** — locaties in de Amsterdamse Bos staan vaak als "Amsterdam" maar horen bij "Amstelveen"
4. **28 verkeerde types** — vooral Intratuin/tuincentra die als 'horeca' staan, en pannenkoekrestaurants bij vakparken
5. **13 verkeerde namen** — typo's of verouderde namen

**Bestanden:**
- `dataset-audit-report.md` — volledig overzicht per categorie met bronnen
- `dataset-fixes.sql` — SQL script voor high-confidence fixes (REVIEW VOOR UITVOEREN!)
- Database is NIET direct gewijzigd — alleen scripts gegenereerd

---

## Volgende stappen

### Prioriteit 1 (kort)
- Review dataset-audit-report.md en dataset-fixes.sql
- Besluit welke fixes doorgevoerd worden

### Prioriteit 2 (medio)
- CSS !important opschoning (per module)
- Filter modal focus trap implementeren
- Map event listener lifecycle management

### Prioriteit 3 (later)
- Service Worker voor offline support
- Newsreader font subsetting of vervanging
- Z-index token systeem
