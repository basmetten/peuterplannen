# PeuterPlannen Mega Refactor Plan

> **Doel:** Alle 15 kritische punten uit de architectuur-analyse oplossen — duurzaam, schaalbaar, geautomatiseerd.
> **Repo (lokaal):** `/Users/basmetten/peuterplannen`
> **Repo (GitHub):** `github.com/basmetten/peuterplannen` (private)
> **Datum:** 2026-03-13
> **Eigenaar:** Bas Metten (basmetten@gmail.com)

---

## EERSTE STAP — VOORDAT JE IETS DOET

```bash
# 1. Ga naar de repo directory
cd /Users/basmetten/peuterplannen

# 2. Verifieer dat je in de juiste Git repo zit
git remote -v
# Verwacht: origin  git@github.com:basmetten/peuterplannen.git (of https variant)

# 3. Verifieer dat je op main branch zit en up-to-date bent
git checkout main
git pull origin main

# 4. Verifieer dat node/npm werkt
node --version   # verwacht: v20+
npm --version
```

Als een van deze stappen faalt: **STOP en vraag de user**. Ga NIET verder zonder werkende repo + node.

---

## LEESWIJZER VOOR CLAUDE CODE

Dit plan is ontworpen om door Claude Code fase-voor-fase uitgevoerd te worden. De working directory MOET `/Users/basmetten/peuterplannen` zijn — dit is de lokale clone van de GitHub repo `basmetten/peuterplannen`. Alle bestands­paden in dit plan zijn relatief aan die root tenzij anders aangegeven.

Elke fase is zelfstandig uitvoerbaar. Bij context-verlies: lees dit bestand opnieuw (`cat /Users/basmetten/peuterplannen/plan.md`), check de status tracker onderaan, en hervat bij de eerste fase met status `TODO` of `IN_PROGRESS`.

### Agent-strategie
- **Haiku agents:** Simpele file-operaties, repetitieve edits, zoek-en-vervang, lint-fixes, file moves
- **Sonnet agents:** Medium-complexe taken: tests schrijven, module-extractie, configuratie, CI/CD aanpassingen
- **Opus agents:** Architectuur-beslissingen, complexe refactors, security review, frontend redesign, SEO strategie
- Gebruik `subagent_type=Explore` voor codebase-verkenning
- Gebruik `isolation: "worktree"` voor risicovolle refactors zodat main niet breekt
- Lanceer parallelle agents waar taken onafhankelijk zijn

### Commit-strategie
- Elke fase krijgt 1-3 commits met descriptieve messages
- Nooit alles in één mega-commit
- Draai na elke structurele wijziging: `npm run build` + de 3 audits om regressies te vangen
- Bij twijfel: commit NIET, vraag de user

### Verificatie na elke fase
Na het afronden van elke fase:
1. `npm run build` moet slagen
2. `node .scripts/audit_internal_consistency.js --strict` moet slagen
3. `node .scripts/audit_portals.js --strict` moet slagen
4. `node .scripts/audit_seo_quality.js --strict` moet slagen
5. `git diff --stat` reviewen op onbedoelde wijzigingen

---

## FASE 0: VOORBEREIDING & VEILIGHEID
**Status:** `DONE`
**Agent:** Sonnet
**Geschatte duur:** 15 minuten
**Doel:** Veilig startpunt creeren voordat we iets aanraken

### Stappen:
1. Maak een feature branch aan:
   ```bash
   cd /Users/basmetten/peuterplannen
   git checkout -b refactor/mega-plan
   ```

2. Verifieer dat de huidige build werkt:
   ```bash
   npm ci
   npm run build
   node .scripts/audit_internal_consistency.js --strict
   node .scripts/audit_portals.js --strict
   node .scripts/audit_seo_quality.js --strict
   ```
   Als een van deze faalt: STOP. Los het eerst op voordat je verdergaat.

3. Noteer het huidige build-resultaat als baseline:
   ```bash
   # Tel gegenereerde bestanden
   find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' | wc -l
   # Bewaar output hashes voor snapshot-vergelijking later
   find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' -exec md5 {} \; > /tmp/pp-baseline-hashes.txt
   ```

4. Commit nog niets. Ga door naar Fase 1.

### Verificatie:
- [ ] Feature branch bestaat
- [ ] Build slaagt
- [ ] Alle 3 audits slagen
- [ ] Baseline hashes opgeslagen

---

## FASE 1: SPLIT sync_all.js IN MODULES
**Status:** `DONE`
**Agent:** Opus (architectuurbeslissingen) + Sonnet (file-operaties)
**Geschatte duur:** 2-3 uur
**Doel:** Het 3864-regels god-file opsplitsen in logische modules zonder de output te veranderen

### Waarom eerst:
Dit is de basis voor alles wat volgt. Zonder modulaire structuur zijn tests, incremental builds, en verdere refactors onmogelijk.

### Doelstructuur:
```
.scripts/
  sync_all.js                    → Orchestrator (~80 regels: imports + main())
  lib/
    config.js                    → TYPE_MAP, TYPE_PAGES, CLUSTER_PAGES, CITY_FAQ,
                                   NEARBY_CITIES, MUNICIPALITY_COVERAGE, TYPE_ORDER,
                                   TYPE_IMAGES, TYPE_LABELS_CITY, WEATHER_LABELS,
                                   CF_ANALYTICS_TOKEN, TIKKIE_URL, SEO constanten
    helpers.js                   → today(), todayISO(), todayISOAmsterdam(),
                                   isoDateInTimeZone(), replaceMarker(), escapeHtml(),
                                   slugify(), cleanPathLike(), fullSiteUrl(),
                                   readJsonIfExists(), analyticsHTML()
    supabase.js                  → fetchRegions(), fetchLocations(),
                                   fetchEditorialPages(), fetchWithFallback()
    seo-content.js               → loadSeoContentLibrary(), loadSeoDirectory(),
                                   loadSeoLocationDirectory(), readSeoDoc(),
                                   mergeSeoContentLibrary(), normalizeEditorialPageRecord(),
                                   loadBlogMetadata(), getBlogEntriesBySlug(),
                                   loadGscSignals(), parseMarkdownDoc(),
                                   renderMarkdownDoc(), fallbackMarkdownToHtml()
    html-shared.js               → Gedeelde HTML-generatie functies die door meerdere
                                   generators gebruikt worden: sharedNav(), sharedFooter(),
                                   sharedHead(), breadcrumb(), locationCard(),
                                   buildMetaDesc(), buildLocationPracticalBullets(),
                                   buildLocationTrustBits(), buildLocationDecisionHTML()
    generators/
      index-page.js              → updateIndex(data)
      app-page.js                → updateApp(data)
      about-page.js              → updateAbout(data)
      manifest.js                → updateManifest(data)
      four-oh-four.js            → update404(data)
      city-pages.js              → generateCityPage(), generateCityPages(data)
      type-pages.js              → generateTypePage(), generateTypePages(data)
      cluster-pages.js           → buildClusterLocationSet(), generateClusterPage(),
                                   generateClusterPages(data)
      location-pages.js          → generateLocationPages(data)
      editorial-pages.js         → generateDiscoverPage(), generateMethodologyPage()
      blog.js                    → buildBlog(data)
      redirects.js               → updateRedirects(data)
      sitemaps.js                → buildPageCatalog(), generateSitemapsFromCatalog()
      seo-registry.js            → buildSeoRegistry()
    seo-policy.js                → computeSlugs(), applyRepoSeoOverrides(), applySeoPolicy()
    css-minify.js                → minifyCSS()
```

### Gedetailleerde instructies:

#### Stap 1.1: Maak de directorystructuur
```bash
mkdir -p .scripts/lib/generators
```

#### Stap 1.2: Extract config.js
- Open `.scripts/sync_all.js`
- Knip regels 38-403 (alle constanten: TYPE_MAP t/m WEATHER_LABELS, CITY_FAQ, NEARBY_CITIES, MUNICIPALITY_COVERAGE, CLUSTER_PAGES, TYPE_PAGES, etc.)
- Plak in `.scripts/lib/config.js`
- Exporteer alles via `module.exports = { ... }`
- BELANGRIJK: Sommige constanten (LOCATION_COUNT, TIKKIE_URL) worden later in main() gemuteerd. Maak LOCATION_COUNT een `let` die geexporteerd wordt als getter/setter, OF geef het als parameter mee aan functies die het nodig hebben. De betere optie: geef het mee als onderdeel van het `data` object dat main() opbouwt.
- BELANGRIJK: CF_ANALYTICS_TOKEN en analyticsHTML() horen ook in config.js

#### Stap 1.3: Extract helpers.js
- Knip de utility-functies (regels ~414-484): today(), todayISO(), isoDateInTimeZone(), todayISOAmsterdam(), replaceMarker(), escapeHtml(), slugify(), cleanPathLike(), fullSiteUrl(), readJsonIfExists()
- Plak in `.scripts/lib/helpers.js`
- Importeer `path` en `fs` bovenaan
- Exporteer alle functies

#### Stap 1.4: Extract supabase.js
- Knip de Supabase fetch-logica uit main() (de delen die regions, locations, editorial_pages ophalen)
- Maak functies: `async function fetchRegions(sbUrl, sbKey)`, `async function fetchLocations(sbUrl, sbKey)`, `async function fetchEditorialPages(sbUrl, sbKey)`
- SB_URL en SB_KEY configuratie hoort in config.js maar wordt via parameter doorgegeven
- De fallback-regions array (hardcoded regio's bij 404) hoort in deze module
- Exporteer de functies

#### Stap 1.5: Extract seo-content.js
- Knip regels ~520-700: alle SEO content loading functies
- loadGscSignals(), fallbackMarkdownToHtml(), parseMarkdownDoc(), renderMarkdownDoc(), readSeoDoc(), loadSeoDirectory(), loadSeoLocationDirectory(), loadBlogMetadata(), getBlogEntriesBySlug(), loadSeoContentLibrary(), normalizeEditorialPageRecord(), mergeSeoContentLibrary()
- Importeer gray-matter en marked met de bestaande try/catch pattern
- Exporteer alles

#### Stap 1.6: Extract html-shared.js
- Identificeer alle HTML-generatie helper functies die door meerdere generators gebruikt worden
- buildMetaDesc(), buildLocationPracticalBullets(), buildLocationTrustBits(), buildLocationDecisionHTML()
- Alle gedeelde HTML-fragmenten (nav, footer, head, breadcrumb templates)
- Exporteer alles

#### Stap 1.7: Extract generators (per bestand)
Per generator-bestand:
1. Knip de relevante functie(s) uit sync_all.js
2. Voeg bovenaan de benodigde imports toe uit de lib/ modules
3. Exporteer de publieke functie(s)
4. Zorg dat elke generator een `data` parameter accepteert (het object dat main() opbouwt met regions, locations, counts, seoContent, etc.)

Volgorde (van minst naar meest dependencies):
1. `manifest.js` (simpelst — schrijft alleen manifest.json)
2. `four-oh-four.js` (simpel — update 404.html)
3. `redirects.js` (schrijft _redirects)
4. `about-page.js` (updateAbout)
5. `index-page.js` (updateIndex — gebruikt TYPE_MAP, counts)
6. `app-page.js` (updateApp — gebruikt regions, counts)
7. `editorial-pages.js` (generateDiscoverPage, generateMethodologyPage)
8. `city-pages.js` (generateCityPage, generateCityPages — complex, uses seoContent)
9. `type-pages.js` (generateTypePage, generateTypePages — complex)
10. `cluster-pages.js` (buildClusterLocationSet, generateClusterPage, generateClusterPages)
11. `location-pages.js` (generateLocationPages — de grootste, ~500 regels)
12. `blog.js` (buildBlog — gebruikt marked, gray-matter)
13. `sitemaps.js` (buildPageCatalog, generateSitemapsFromCatalog)
14. `seo-registry.js` (buildSeoRegistry)

#### Stap 1.8: Extract seo-policy.js
- computeSlugs(), applyRepoSeoOverrides(), applySeoPolicy()
- Deze functies muteren het data-object — documenteer dat in een comment

#### Stap 1.9: Extract css-minify.js
- Het CSS-minificatieblok uit main() (regels 3839-3858)
- Maak er een functie van: `function minifyCSS(rootDir)`

#### Stap 1.10: Herschrijf sync_all.js als orchestrator
Het nieuwe sync_all.js moet er zo uitzien:
```javascript
/**
 * sync_all.js — Unified build script for PeuterPlannen
 * Orchestrator: imports modules and runs the build pipeline.
 */
const { SB_URL, SB_KEY, ROOT } = require('./lib/config');
const { fetchRegions, fetchLocations, fetchEditorialPages } = require('./lib/supabase');
const { loadSeoContentLibrary, mergeSeoContentLibrary } = require('./lib/seo-content');
const { computeSlugs, applyRepoSeoOverrides, applySeoPolicy } = require('./lib/seo-policy');
const { updateIndex } = require('./lib/generators/index-page');
const { updateApp } = require('./lib/generators/app-page');
const { updateAbout } = require('./lib/generators/about-page');
const { updateManifest } = require('./lib/generators/manifest');
const { update404 } = require('./lib/generators/four-oh-four');
const { generateCityPages } = require('./lib/generators/city-pages');
const { generateTypePages } = require('./lib/generators/type-pages');
const { generateClusterPages } = require('./lib/generators/cluster-pages');
const { generateDiscoverPage, generateMethodologyPage } = require('./lib/generators/editorial-pages');
const { generateLocationPages } = require('./lib/generators/location-pages');
const { buildBlog } = require('./lib/generators/blog');
const { updateRedirects } = require('./lib/generators/redirects');
const { buildPageCatalog, generateSitemapsFromCatalog } = require('./lib/generators/sitemaps');
const { buildSeoRegistry } = require('./lib/generators/seo-registry');
const { minifyCSS } = require('./lib/css-minify');
const { today } = require('./lib/helpers');

async function main() {
  console.log('=== PeuterPlannen Build ===\n');

  // 1. Fetch data
  const regions = await fetchRegions(SB_URL, SB_KEY);
  const locations = await fetchLocations(SB_URL, SB_KEY);
  const editorialPages = await fetchEditorialPages(SB_URL, SB_KEY);

  // 2. Build data object
  const seedContent = loadSeoContentLibrary();
  const seoContent = mergeSeoContentLibrary(seedContent, editorialPages);

  const data = {
    regions,
    locations,
    editorialPages,
    seoContent,
    // ... counts, type mappings, etc. — computed here
  };

  // 3. SEO policy
  computeSlugs(data);
  applyRepoSeoOverrides(data);
  applySeoPolicy(data);

  // 4. Generate pages
  console.log('\nUpdating static pages...');
  updateIndex(data);
  updateApp(data);
  updateAbout(data);
  updateManifest(data);
  update404(data);

  console.log('\nGenerating city pages...');
  generateCityPages(data);

  console.log('\nGenerating type pages...');
  generateTypePages(data);

  console.log('\nGenerating cluster pages...');
  const clusterPages = generateClusterPages(data);

  console.log('\nGenerating shared editorial pages...');
  const sharedPages = [generateDiscoverPage(data), generateMethodologyPage(data)].filter(Boolean);

  console.log('\nGenerating location pages...');
  generateLocationPages(data);

  console.log('\nBuilding blog...');
  const blogPosts = buildBlog(data);

  console.log('\nUpdating redirects...');
  updateRedirects(data);

  console.log('\nGenerating split sitemaps...');
  const catalog = buildPageCatalog(data, blogPosts, clusterPages, sharedPages);
  generateSitemapsFromCatalog(catalog);

  console.log('\nBuilding SEO registry...');
  buildSeoRegistry(catalog);

  // 5. CSS minification
  console.log('\nMinifying CSS...');
  minifyCSS(ROOT);

  console.log(`\nDone! Laatst bijgewerkt: ${today()}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

#### Stap 1.11: Verificatie (KRITISCH)
```bash
npm run build
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict

# Vergelijk output met baseline
find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' -exec md5 {} \; > /tmp/pp-refactored-hashes.txt
diff /tmp/pp-baseline-hashes.txt /tmp/pp-refactored-hashes.txt
```

De output moet IDENTIEK zijn. Als er differences zijn: debug en fix voordat je verdergaat.

#### Stap 1.12: Commit
```
git add .scripts/
git commit -m "Refactor: split sync_all.js into modular architecture

Extract 3864-line monolith into lib/ modules and generators/.
Zero output changes — verified via hash comparison and all 3 CI audits."
```

---

## FASE 2: TEST INFRASTRUCTURE
**Status:** `DONE`
**Agent:** Sonnet (test setup) + Haiku (repetitieve test cases)
**Geschatte duur:** 2 uur
**Doel:** Test framework opzetten met snapshot tests en unit tests

### Stap 2.1: Test runner setup
Gebruik Node.js 20 ingebouwde test runner (geen extra dependencies):

```javascript
// .scripts/__tests__/helpers.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
```

Voeg toe aan package.json:
```json
"scripts": {
  "test": "node --test .scripts/__tests__/*.test.js",
  "test:watch": "node --test --watch .scripts/__tests__/*.test.js"
}
```

### Stap 2.2: Unit tests voor helpers.js

Test file: `.scripts/__tests__/helpers.test.js`

Test cases (laat een Haiku agent deze schrijven — het zijn simpele assertions):

**replaceMarker():**
- Vervangt content tussen markers correct
- Werkt met meerdere markers in hetzelfde bestand
- Laat content buiten markers ongewijzigd
- Werkt correct als marker niet gevonden wordt (geen wijziging)
- Werkt met lege replacement string
- Werkt met multiline replacement

**escapeHtml():**
- Escaped &, <, >, "
- Leeg/null/undefined input → lege string
- String zonder speciale tekens → ongewijzigd

**slugify():**
- "Den Haag" → "den-haag"
- "'s-Hertogenbosch" → "s-hertogenbosch"
- "Utrechtse Heuvelrug" → "utrechtse-heuvelrug"
- Diacritics: "cafe" → "cafe" (al zonder), "café" → "cafe"
- Leading/trailing hyphens worden gestript

**cleanPathLike():**
- "/" → "/"
- "/app" → "/app.html"
- "/blog" → "/blog/"
- "/index.html" → "/"
- Volledige URL → pad extractie
- Null/undefined → "/"

**fullSiteUrl():**
- "/" → "https://peuterplannen.nl/"
- "/amsterdam.html" → "https://peuterplannen.nl/amsterdam.html"

### Stap 2.3: Unit tests voor config constanten

Test file: `.scripts/__tests__/config.test.js`

- TYPE_MAP bevat alle verwachte types: play, farm, nature, museum, culture, swim, pancake, horeca
- TYPE_ORDER bevat alle types uit TYPE_MAP
- TYPE_PAGES heeft een entry voor elke type in TYPE_MAP
- CLUSTER_PAGES heeft de verwachte 6 entries
- CITY_FAQ heeft een entry voor elke verwachte regio
- NEARBY_CITIES referenties zijn valide (elke referenced slug bestaat als key)

### Stap 2.4: Snapshot test voor build output

Test file: `.scripts/__tests__/build-snapshot.test.js`

Dit is de belangrijkste test. Het idee:
1. Draai een build (of lees de huidige build output)
2. Bereken hashes van alle gegenereerde bestanden
3. Vergelijk met opgeslagen snapshot
4. Bij verschil: test faalt, tenzij je expliciet de snapshot update

```javascript
// Pseudo-code
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SNAPSHOT_PATH = path.join(__dirname, 'snapshots', 'build-hashes.json');

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function collectHashes() {
  // Collect hashes of all generated HTML files
  // Return { 'amsterdam.html': 'abc123', ... }
}

describe('Build snapshot', () => {
  it('output matches saved snapshot', () => {
    if (process.env.UPDATE_SNAPSHOTS === '1') {
      const hashes = collectHashes();
      fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(hashes, null, 2));
      return; // snapshot updated
    }

    if (!fs.existsSync(SNAPSHOT_PATH)) {
      throw new Error('No snapshot found. Run with UPDATE_SNAPSHOTS=1 to create.');
    }

    const expected = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    const actual = collectHashes();

    // Check for missing files
    for (const [file, hash] of Object.entries(expected)) {
      assert.ok(actual[file], `Missing generated file: ${file}`);
      assert.equal(actual[file], hash, `Hash mismatch for ${file}`);
    }
  });
});
```

Voeg script toe:
```json
"scripts": {
  "test:snapshot:update": "UPDATE_SNAPSHOTS=1 node --test .scripts/__tests__/build-snapshot.test.js"
}
```

### Stap 2.5: Package.json test scripts
```json
"scripts": {
  "build": "node .scripts/optimize_images.js && node .scripts/sync_portal_assets.js && node .scripts/sync_all.js",
  "test": "node --test .scripts/__tests__/*.test.js",
  "test:unit": "node --test .scripts/__tests__/helpers.test.js .scripts/__tests__/config.test.js",
  "test:snapshot": "node --test .scripts/__tests__/build-snapshot.test.js",
  "test:snapshot:update": "UPDATE_SNAPSHOTS=1 node --test .scripts/__tests__/build-snapshot.test.js"
}
```

### Stap 2.6: Initial snapshot
```bash
npm run build
npm run test:snapshot:update
npm test
```

### Stap 2.7: Commit
```
git add .scripts/__tests__/ package.json
git commit -m "Add test infrastructure: unit tests + build snapshot tests

Node.js 20 native test runner. Helper unit tests, config validation,
and build output snapshot comparison. Zero dependencies added."
```

---

## FASE 3: LOCAL DEV EXPERIENCE
**Status:** `DONE`
**Agent:** Sonnet
**Geschatte duur:** 1 uur
**Doel:** Lokaal ontwikkelen mogelijk maken zonder productie-database

### Stap 3.1: Fixture data
Maak `.scripts/fixtures/` directory met:

```bash
mkdir -p .scripts/fixtures
```

Genereer fixture data vanuit de huidige build:

**`.scripts/fixtures/regions.json`** — Neem 3 regio's: Amsterdam, Utrecht, Haarlem. Strip tot de essientiele velden.

**`.scripts/fixtures/locations.json`** — Neem ~30 locaties (10 per regio, verspreid over types). Strip gevoelige velden (verification_confidence, etc.).

**`.scripts/fixtures/editorial_pages.json`** — Neem 2-3 gepubliceerde editorial pages.

De fixture data wordt gegenereerd door een script:
```javascript
// .scripts/generate-fixtures.js
// Draait met productie-credentials, slaat geanonimiseerde subset op als JSON fixtures
// ALLEEN lokaal draaien, NIET in CI
```

### Stap 3.2: Fixture mode in sync_all.js

Voeg toe aan `.scripts/lib/supabase.js`:
```javascript
const FIXTURE_MODE = process.env.PP_FIXTURES === '1';
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

async function fetchRegions(sbUrl, sbKey) {
  if (FIXTURE_MODE) {
    console.log('  [fixtures] Loading regions from fixtures');
    return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'regions.json'), 'utf8'));
  }
  // ... bestaande fetch logica
}
```

### Stap 3.3: Dev server script
Voeg toe aan package.json:
```json
"scripts": {
  "dev": "npx serve -l 3000 --no-clipboard .",
  "build:local": "PP_FIXTURES=1 node .scripts/sync_all.js"
}
```

### Stap 3.4: .env.example
Maak `.env.example` (NIET .env zelf):
```
# Kopieer naar .env en vul in
SUPABASE_URL=https://piujsvgbfflrrvauzsxe.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
```

### Stap 3.5: Commit
```
git add .scripts/fixtures/ .scripts/generate-fixtures.js .env.example package.json
git commit -m "Add local dev experience: fixture data + dev server

PP_FIXTURES=1 enables offline builds with sample data.
npx serve for local development. .env.example for onboarding."
```

---

## FASE 4: NOINDEX DETAIL PAGES → RUNTIME RENDERING
**Status:** `DONE`
**Agent:** Opus (architectuur) + Sonnet (implementatie)
**Geschatte duur:** 4-6 uur
**Doel:** ~1700 noindex location detail pages verplaatsen van static naar client-side rendered

### Waarom:
- 85% van detail pages zijn noindex → geen SEO waarde als statisch
- ~1700 HTML bestanden minder in git (repo van ~640MB naar ~200MB)
- Build tijd drastisch sneller
- Minder GitHub Actions minuten

### Aanpak:
De ~300 SEO-geindexeerde detail pages (tier="index") BLIJVEN statisch. Alleen noindex pages worden runtime.

### Stap 4.1: Identificeer welke pages statisch blijven
In `.scripts/lib/seo-policy.js` (of waar de SEO tier logica zit), identificeer de logica die bepaalt welke locations `index,follow` krijgen vs `noindex,follow`. Documenteer het criterium.

Verwacht: locaties met voldoende content (beschrijving >= X woorden, toddler_highlight aanwezig, etc.) krijgen tier="index".

### Stap 4.2: Pas generateLocationPages aan
In `.scripts/lib/generators/location-pages.js`:
- Genereer ALLEEN pages voor locaties met SEO tier "index"
- Voor alle overige locaties: genereer GEEN statisch bestand
- Houd een manifest bij van welke locaties statisch zijn (bijv. `output/static-locations.json`)

### Stap 4.3: Voeg client-side detail rendering toe aan app.html
Voeg een detail-view mode toe aan app.html die activeert op URL parameter:
```
app.html?locatie=amsterdam/artis
```

Wanneer deze parameter aanwezig is:
1. Parse de regio-slug en locatie-slug uit de parameter
2. Fetch de locatie vanuit Supabase: `locations?slug=eq.artis&region=eq.Amsterdam&select=*`
3. Render een detail view die visueel identiek is aan de statische pagina's
4. Voeg een "terug naar overzicht" knop toe

### Stap 4.4: Redirects voor oude URLs
Voeg redirect regels toe zodat oude URLs (`/amsterdam/artis/`) redirecten naar de runtime versie:
- In `_redirects`: `/amsterdam/:slug /app.html?locatie=amsterdam/:slug 301`
- MAAR: alleen voor noindex locaties. Indexed locaties houden hun statische pagina.

De redirect-generatie moet geautomatiseerd worden in `updateRedirects()`:
1. Lees de statische-locations manifest
2. Genereer redirects voor ALLE regio/slug combinaties die NIET in de statische manifest zitten

### Stap 4.5: Cleanup oude statische bestanden
Na het verifieren dat de redirects werken, verwijder de noindex HTML bestanden:
```bash
# NIET handmatig doen — laat generateLocationPages() ze simpelweg niet meer genereren
# De oude bestanden moeten wel opgeruimd worden uit git
```

Voeg een cleanup stap toe aan de build:
```javascript
// In generateLocationPages of aan het eind van main():
function cleanupOrphanedLocationPages(data) {
  // Lees de lijst van gegenereerde statische pages
  // Walk door alle /{regio}/{slug}/ directories
  // Verwijder directories die niet in de statische lijst zitten
}
```

### Stap 4.6: Update sitemaps
In `generateSitemapsFromCatalog()`:
- Noindex pagina's staan sowieso al niet in de sitemap
- Verifieer dat alleen indexed detail pages in de sitemap zitten
- Voeg GEEN app.html?locatie= URLs toe aan de sitemap (die zijn niet indexeerbaar)

### Stap 4.7: Verificatie
```bash
npm run build
# Check: significant minder HTML files
find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' | wc -l
# Verwacht: van ~2096 naar ~400-500

# Audits moeten slagen
node .scripts/audit_internal_consistency.js --strict
# LETOP: de consistency audit checkt broken links. De redirect naar app.html
# moet correct zijn anders faalt deze audit. Mogelijk moet de audit aangepast
# worden om redirected paths te accepteren.

# Test dat de app.html detail view werkt: open lokaal in browser
npm run dev
# Open http://localhost:3000/app.html?locatie=amsterdam/artis
```

### Stap 4.8: Commit
```
git add -A
git commit -m "Move noindex location pages to runtime rendering

~1700 noindex detail pages replaced by client-side rendering in app.html.
~300 SEO-indexed pages remain static. Redirects for old URLs.
Repo size reduction: ~60%. Build time reduction: ~70%."
```

### BELANGRIJK — Risico's en mitigatie:
- **Broken backlinks:** De redirects in _redirects zorgen dat oude URLs blijven werken. Maar: Cloudflare/GitHub Pages moet _redirects ondersteunen. GitHub Pages gebruikt GEEN _redirects (dat is Netlify/Cloudflare Pages). Gebruik in plaats daarvan een lichte HTML redirect page per locatie:
  ```html
  <!-- amsterdam/artis/index.html (voor noindex locaties) -->
  <!DOCTYPE html>
  <html><head>
  <meta http-equiv="refresh" content="0;url=/app.html?locatie=amsterdam/artis">
  <link rel="canonical" href="https://peuterplannen.nl/app.html?locatie=amsterdam/artis">
  </head><body></body></html>
  ```
  Dit is ~200 bytes per pagina in plaats van ~30KB. Dat is nog steeds een 99% reductie.

  ALTERNATIEF (beter): Gebruik de Cloudflare Worker voor redirects. De worker handelt al subdomain routing af en kan ook location redirects doen. Maar dit vereist dat alle location URLs door de worker gaan, wat meer werk is.

  BESTE OPTIE: Genereer mini-redirect HTML bestanden. Dit werkt op GitHub Pages zonder extra configuratie.

---

## FASE 5: ADMIN-API OPSPLITSEN
**Status:** `DONE`
**Agent:** Sonnet (module extractie)
**Geschatte duur:** 2 uur
**Doel:** De 1400-regels admin-api edge function opsplitsen in handlers

### Doelstructuur:
```
supabase/functions/admin-api/
  index.ts                   → Router (~80 regels)
  lib/
    auth.ts                  → authenticateAdmin(), ADMIN_EMAILS
    cors.ts                  → CORS headers, preflight handler
    errors.ts                → AppError class, error response helper
    db.ts                    → Supabase client init, shared queries
  handlers/
    locations.ts             → GET/PATCH/DELETE locations, search, detail
    observations.ts          → GET/PATCH observations, review flow
    editorial.ts             → GET/POST/PATCH editorial pages
    quality-tasks.ts         → GET/PATCH quality tasks
    claims.ts                → GET/PATCH claim requests
    publish.ts               → POST publish trigger
    analytics.ts             → GET dashboard stats, GSC data
```

### Aanpak:
Supabase Edge Functions ondersteunen Deno imports. We splitsen in modules maar houden 1 entrypoint.

#### Stap 5.1: Extract lib/auth.ts
```typescript
// supabase/functions/admin-api/lib/auth.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAILS = ["basmetten@gmail.com"];
// TOEKOMSTIG: laad uit env var: Deno.env.get("ADMIN_EMAILS")?.split(",") || [...]

export async function authenticateAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new AppError("Unauthorized", 401);
  // ... bestaande auth logica
  if (!ADMIN_EMAILS.includes(user.email!)) throw new AppError("Forbidden", 403);
  return user;
}
```

#### Stap 5.2: Extract handlers per domein
Elke handler file exporteert een async functie die (req, user) accepteert en een Response returnt.

#### Stap 5.3: Herschrijf index.ts als router
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { authenticateAdmin } from "./lib/auth.ts";
import { handleLocations } from "./handlers/locations.ts";
import { handleObservations } from "./handlers/observations.ts";
// ... etc.

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-api\/?/, "");

  try {
    const user = await authenticateAdmin(req);

    if (path.startsWith("locations")) return handleLocations(req, user, url);
    if (path.startsWith("observations")) return handleObservations(req, user, url);
    // ... etc.

    return json({ error: "Not found" }, 404);
  } catch (err) {
    // ... error handling
  }
});
```

### Stap 5.4: Test
```bash
# Deploy naar Supabase (handmatig of via CI)
npm run deploy:supabase
# Test via admin portal dat alle functionaliteit werkt
```

### Stap 5.5: Commit
```
git add supabase/functions/admin-api/
git commit -m "Refactor admin-api: split into handler modules

Extract 1400-line monolith into router + handler pattern.
Auth, CORS, errors extracted to shared lib. Zero API changes."
```

---

## FASE 6: SECURITY HARDENING
**Status:** `DONE`
**Agent:** Opus (security review) + Sonnet (implementatie)
**Geschatte duur:** 3 uur
**Doel:** CSP fixen, inline handlers verwijderen, rate limiting, column-level security

### Stap 6.1: Verwijder inline event handlers uit portal
In `/partner/index.html` (en `/portal/index.html` als dat nog bestaat):
- Verplaats alle `onclick="..."` naar event listeners in een extern JS bestand
- Patroon: `document.getElementById('btn-login').addEventListener('click', () => showScreen('login'))`
- Geef knoppen een `id` of `data-action` attribuut
- Verwijder de inline handlers uit de HTML

In `/admin/index.html`:
- Zelfde behandeling
- admin.js bevat al de meeste logica, maar de HTML heeft mogelijk nog inline handlers

### Stap 6.2: CSP versterken — verwijder 'unsafe-inline' voor scripts
In `_headers`:
1. Verplaats de inline Google Analytics snippet naar `/ga-init.js`:
   ```javascript
   // ga-init.js
   window.dataLayer = window.dataLayer || [];
   function gtag(){dataLayer.push(arguments);}
   gtag('consent', 'default', {
     analytics_storage: 'denied', ad_storage: 'denied',
     ad_user_data: 'denied', ad_personalization: 'denied',
     wait_for_update: 500
   });
   try { var _s = localStorage.getItem('pp_consent'); if (_s) gtag('consent', 'update', JSON.parse(_s)); } catch(e) {}
   gtag('js', new Date()); gtag('config', 'G-46RW178B97');
   ```

2. Update alle HTML pagina's om `<script src="/ga-init.js">` te gebruiken in plaats van inline script
   - Dit kan in sync_all.js aangepast worden (de sharedHead functie)
   - LETOP: app.html, index.html, about.html, contact.html, en alle gegenereerde pagina's moeten aangepast worden

3. Update `_headers` CSP:
   - Verwijder `'unsafe-inline'` uit `script-src`
   - Voeg `https://peuterplannen.nl/ga-init.js` toe (of gewoon `'self'` dekt dit al)
   - HOUD `'unsafe-inline'` voor `style-src` (industry standard, nodig voor inline styles)

**WAARSCHUWING:** Google AdSense vereist mogelijk `'unsafe-inline'` of `'unsafe-eval'` voor scripts. Test grondig. Als AdSense breekt, overweeg een aparte CSP voor pagina's met ads vs zonder ads.

### Stap 6.3: Supabase rate limiting
1. Ga naar Supabase Dashboard → Settings → API → Rate Limiting
2. Stel in: 100 requests/minuut per IP voor anon key
3. Dit is een dashboard-instelling, geen code-wijziging

### Stap 6.4: Column-level security via database view
Maak een Supabase migration:
```sql
-- supabase/migrations/20260313_public_locations_view.sql

-- View die alleen publiek-relevante kolommen exposeert
CREATE OR REPLACE VIEW public.locations_public AS
SELECT
  id, name, region, type, description, website, weather,
  coffee, diaper, alcohol, lat, lng, min_age, max_age,
  toddler_highlight, place_id, distance_from_city_center_km,
  is_featured, owner_verified, owner_photo_url, opening_hours,
  last_verified, seo_primary_locality,
  -- Trust velden NIET exposed:
  -- verification_confidence, verification_mode, last_context_refresh_at,
  -- price_band, time_of_day_fit, rain_backup_quality, shade_or_shelter,
  -- parking_ease, buggy_friendliness, toilet_confidence, noise_level,
  -- food_fit, play_corner_quality, crowd_pattern
  -- Portal velden NIET exposed:
  -- claimed_by_user_id, featured_tier, featured_until, last_owner_update
  slug
FROM public.locations;

-- RLS op de view (inherits van base table)
-- Anon key mag alleen de view lezen, niet de base table
-- Dit vereist dat je de RLS policy op locations aanpast:
-- De "Public read" policy moet beperkt worden tot de view

-- ALTERNATIEF (simpeler): Houd de huidige RLS maar update app.html
-- om alleen de benodigde kolommen op te vragen via ?select=...
```

**PRAGMATISCHER ALTERNATIEF:** Pas app.html aan om een expliciete `?select=` te gebruiken:
```javascript
const url = SB_URL + "?select=id,name,region,type,description,website,weather,coffee,diaper,alcohol,lat,lng,min_age,max_age,toddler_highlight,place_id,is_featured,owner_verified,slug";
```
Dit stuurt minder data over de lijn en exposed niet de vertrouwelijke velden. Het is geen echte security (iemand kan nog steeds `?select=*` doen), maar het is een defense-in-depth laag.

Voor echte column-level security: gebruik de view + pas RLS aan zodat anon alleen de view kan lezen.

### Stap 6.5: Admin email configureerbaar maken
In admin-api/lib/auth.ts:
```typescript
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "basmetten@gmail.com")
  .split(",")
  .map(e => e.trim().toLowerCase());
```

Stel de env var in via Supabase dashboard.

### Stap 6.6: Verwijder /portal/ als het verouderd is
Als `/portal/index.html` een oude versie is van het partner portal en `/partner/index.html` de actieve versie is:
1. Verifieer door de Cloudflare Worker routing te checken
2. Als portal verouderd is: verwijder de directory
3. Update audit_portals.js als het portal/ referenties had

### Stap 6.7: Commit
```
git add _headers ga-init.js partner/ admin/ supabase/migrations/ supabase/functions/admin-api/
git commit -m "Security hardening: CSP, inline handlers, column security

Remove inline event handlers from portals. Extract GA init to external script.
Strengthen CSP by removing unsafe-inline for scripts. Add column-level
security view for public API. Make admin email list configurable."
```

---

## FASE 7: STAGING/PREVIEW ENVIRONMENT
**Status:** `DONE`
**Agent:** Sonnet
**Geschatte duur:** 1.5 uur
**Doel:** Preview deployments voordat code live gaat

### Optie A: Cloudflare Pages (AANBEVOLEN)
Je gebruikt Cloudflare al. Cloudflare Pages biedt:
- Automatische preview URLs per branch/commit
- Dezelfde CDN als productie
- Gratis voor open source

#### Stap 7.1: Setup Cloudflare Pages
Dit is grotendeels een handmatige stap (Cloudflare dashboard):
1. Ga naar Cloudflare Dashboard → Pages
2. Connect de GitHub repo `basmetten/peuterplannen`
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `.` (de hele repo is de site)
   - Environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY
4. Production branch: `main`
5. Preview branches: alle andere branches

#### Stap 7.2: Update DNS
Als je overschakelt van GitHub Pages naar Cloudflare Pages:
1. Verwijder de GitHub Pages CNAME record
2. Cloudflare Pages maakt automatisch een `peuterplannen.pages.dev` domain
3. Voeg custom domain `peuterplannen.nl` toe in Cloudflare Pages settings
4. De bestaande Cloudflare DNS is al correct geconfigureerd

**ALTERNATIEF als je GitHub Pages wilt houden:** Ga naar Optie B.

### Optie B: Staging branch workflow
Als je GitHub Pages wilt houden:

#### Stap 7.1b: Pas sync-site.yml aan
```yaml
# Wijzig de commit+push stap:
- name: Commit to staging branch
  if: steps.gate.outputs.run_build == 'true'
  run: |
    git config user.name "PeuterPlannen Bot"
    git config user.email "bot@peuterplannen.nl"
    git add -A
    if git diff --cached --quiet; then exit 0; fi
    git commit -m "Auto-sync: update data $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    git push origin HEAD:staging --force

- name: Create PR from staging to main
  if: steps.gate.outputs.run_build == 'true'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # Check of er al een open PR is
    existing=$(gh pr list --head staging --json number -q '.[0].number' || echo "")
    if [ -z "$existing" ]; then
      gh pr create --head staging --base main \
        --title "Auto-sync: data update" \
        --body "Automated data sync. Audits passed."
    fi
```

Dit geeft je een PR-based review flow. De PR kan dan handmatig of automatisch gemerged worden.

### Stap 7.3: Commit
```
git add .github/workflows/
git commit -m "Add staging/preview deployment workflow

Changes are pushed to staging branch first, then merged to main
via PR. Provides review opportunity before production deployment."
```

### Wat daadwerkelijk geïmplementeerd is (Route 2 + productie-switch):
- **CF Pages project** `peuterplannen.pages.dev` voor branch previews (Direct Upload)
- **Productie** blijft via Cloudflare Worker (`wrangler deploy`), niet CF Pages
- **sync-site.yml**: geen HTML meer committen naar git; bouwt en deployt via `wrangler deploy`
- **preview.yml**: nieuw workflow — push naar feature branch → automatische preview op CF Pages
- **push trigger**: push naar main triggert automatisch een build + deploy
- **deploy_live.sh**: vereenvoudigd naar build + `wrangler deploy`
- GitHub secrets: `CLOUDFLARE_API_KEY`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_ACCOUNT_ID`

---

## FASE 8: MONITORING & OBSERVABILITY
**Status:** `DONE`
**Agent:** Sonnet (setup) + Haiku (kleine scripts)
**Geschatte duur:** 2 uur
**Doel:** Uptime monitoring, error tracking, business metrics

### Stap 8.1: Uptime monitoring
Maak een Cloudflare Health Check (gratis):
1. Cloudflare Dashboard → Traffic → Health Checks
2. Monitor: `https://peuterplannen.nl` — verwacht 200
3. Monitor: `https://peuterplannen.nl/app.html` — verwacht 200
4. Monitor: `https://partner.peuterplannen.nl` — verwacht 200
5. Notification: email naar basmetten@gmail.com bij failure

**Alternatief:** UptimeRobot free tier (gratis, 50 monitors, 5-min interval).
Dit is een handmatige stap — documenteer het in de commit message.

### Stap 8.2: Client-side error tracking (zero dependencies)
Maak `/error-reporter.js`:
```javascript
// Lightweight error reporter — stuurt naar Supabase via anon key
(function() {
  var SB = 'https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/client_errors';
  var KEY = '...'; // anon key

  window.onerror = function(msg, src, line, col, err) {
    try {
      navigator.sendBeacon(SB, JSON.stringify({
        message: String(msg).slice(0, 500),
        source: String(src).slice(0, 200),
        line: line,
        col: col,
        stack: err && err.stack ? String(err.stack).slice(0, 1000) : null,
        url: location.href.slice(0, 200),
        ua: navigator.userAgent.slice(0, 200),
        ts: new Date().toISOString()
      }));
    } catch(e) {}
  };

  window.addEventListener('unhandledrejection', function(e) {
    try {
      navigator.sendBeacon(SB, JSON.stringify({
        message: 'Unhandled rejection: ' + String(e.reason).slice(0, 500),
        url: location.href.slice(0, 200),
        ts: new Date().toISOString()
      }));
    } catch(ex) {}
  });
})();
```

Supabase migration:
```sql
-- supabase/migrations/20260313_client_errors.sql
CREATE TABLE IF NOT EXISTS public.client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  source TEXT,
  line INTEGER,
  col INTEGER,
  stack TEXT,
  url TEXT,
  ua TEXT,
  ts TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Anon kan inserten (error reporting), niemand kan lezen behalve service role
CREATE POLICY "Anon can insert errors"
  ON public.client_errors FOR INSERT WITH CHECK (true);
```

Voeg `<script src="/error-reporter.js" defer></script>` toe aan de shared head.

### Stap 8.3: Business event tracking (consent-vrij)
Maak een `analytics_events` tabel voor anonieme product metrics:
```sql
-- supabase/migrations/20260313_analytics_events.sql
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_type_created
  ON public.analytics_events(event_type, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert events"
  ON public.analytics_events FOR INSERT WITH CHECK (true);

-- Auto-cleanup: verwijder events ouder dan 90 dagen (via scheduled function of cron)
```

Voeg tracking toe in app.html (anoniem, geen PII):
```javascript
function trackEvent(type, data = {}) {
  try {
    navigator.sendBeacon(SB_URL.replace('/rest/v1/locations', '/rest/v1/analytics_events'), JSON.stringify({
      event_type: type,
      event_data: data,
      page_path: location.pathname
    }));
  } catch(e) {}
}

// Track key events:
// trackEvent('search', { query_type: 'gps' | 'places' })
// trackEvent('filter', { type: activeTag, weather: activeWeather })
// trackEvent('detail_view', { location_id: id })
// trackEvent('favorite_toggle', { action: 'add' | 'remove' })
// trackEvent('map_view')
// trackEvent('share', { method: 'native' | 'copy' })
```

### Stap 8.4: GitHub Actions failure notifications
Verifieer dat GitHub notification settings aan staan:
- GitHub → Settings → Notifications → Actions → "Send notifications for failed workflows only"
- Dit is een handmatige check.

### Stap 8.5: Commit
```
git add error-reporter.js supabase/migrations/20260313_*.sql
git commit -m "Add monitoring: error tracking + anonymous product analytics

Client-side error reporter via sendBeacon to Supabase.
Anonymous event tracking for search, filter, detail views.
Zero PII stored. No consent required."
```

---

## FASE 9: PERFORMANCE OPTIMALISATIE
**Status:** `DONE`
**Agent:** Sonnet (implementatie) + Haiku (font download)
**Geschatte duur:** 2 uur
**Doel:** Self-host fonts, preload critical assets, reduce third-party requests

### Stap 9.1: Self-host Google Fonts
Download de 3 font families:

```bash
mkdir -p fonts

# Download via google-webfonts-helper of direct van Google
# Familjen Grotesk: wght 500,600,700
# Plus Jakarta Sans: wght 600,700,800
# DM Sans: wght 400,500,600,700 + italic 400
```

Gebruik een Haiku agent om:
1. De font WOFF2 bestanden te downloaden (via https://gwfh.mranftl.com/api/fonts/ of direct)
2. Een `fonts.css` te genereren met @font-face declaraties
3. Alle HTML templates te updaten: vervang de Google Fonts `<link>` met `<link rel="stylesheet" href="/fonts.css">`

**WOFF2-only** is voldoende (browser support >97%).

Voordelen:
- 2 minder DNS lookups (fonts.googleapis.com, fonts.gstatic.com)
- Geen Google tracking via fonts
- GDPR-compliant (Duitse jurisprudentie verbiedt Google Fonts via CDN)
- Snellere font loading (zelfde origin)

### Stap 9.2: Preload critical resources
Voeg toe aan de shared `<head>` in sync_all.js:
```html
<link rel="preload" href="/style.min.css" as="style">
<link rel="preload" href="/fonts/familjen-grotesk-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin>
```

Alleen de 2 meest-gebruikte font weights preloaden. Niet alles.

### Stap 9.3: app.html CSS extraction
Verplaats de inline `<style>` in app.html naar `app.css`:
1. Knip de volledige `<style>...</style>` uit app.html
2. Plak in `app.css`
3. Voeg `<link rel="stylesheet" href="/app.css">` toe aan de head
4. Voeg `app.css` toe aan de service worker cache list

Dit maakt de CSS cacheable los van de HTML. Bij content-wijzigingen hoeft de browser niet de hele CSS opnieuw te downloaden.

### Stap 9.4: Verifieer
```bash
npm run build
# Open lokaal en check dat fonts correct laden
npm run dev
# Lighthouse audit op app.html — verwacht performance score > 90
```

### Stap 9.5: Commit
```
git add fonts/ fonts.css app.css
git commit -m "Performance: self-host fonts, preload critical assets, extract app CSS

Remove Google Fonts CDN dependency (GDPR + performance).
Self-hosted WOFF2 fonts. Preload critical resources.
Extract app.html inline CSS to cacheable app.css."
```

---

## FASE 10: FRONTEND DESIGN SYSTEM & CONSISTENTIE
**Status:** `TODO`
**Agent:** Opus (design system architectuur + frontend-design skill)
**Geschatte duur:** 6-8 uur
**Doel:** Consistent, modern, distinctive design system dat future-proof en schaalbaar is

### Context voor de agent:
Gebruik de frontend-design skill (geinstalleerd in `~/.claude/skills/frontend-design/SKILL.md`).

PeuterPlannen is een webapp voor Nederlandse ouders met jonge kinderen. Het huidige design is al warm en uitnodigend maar vertoont inconsistenties. Het doel is NIET een complete redesign, maar het formaliseren en versterken van wat er is tot een coherent design system.

### Huidige staat:
- **Kleuren:** Warm terracotta palette met `--primary: #D4775A`, `--accent: #E8B870`, `--bg: #FAF7F2`
- **Fonts:** Familjen Grotesk (headings), Plus Jakarta Sans (UI), DM Sans (body)
- **Inconsistenties:**
  - app.html, index.html, stadspagina's, en blog pagina's hebben elk hun eigen inline styles
  - CSS variabelen worden niet overal consistent gebruikt (sommige pagina's gebruiken hardcoded kleuren)
  - De admin portal en partner portal hebben hun eigen design tokens die afwijken
  - nav-floating.css is een externe stylesheet maar de meeste page-specifieke styles zijn inline
  - Schaduw-variabelen, border-radius, en spacing zijn niet genormaliseerd
  - Location cards in app.html vs stadspagina's zien er anders uit

### Design Direction (voor de frontend-design skill):
- **Tone:** Warm, organic, playful but trustworthy. Denk aan een kindvriendelijk cafe, niet aan een corporate website
- **Differentiation:** De terracotta + goud palette is al distinctief en memorabel. Versterk dit.
- **Constraints:** Vanilla HTML/CSS/JS. Geen frameworks. Moet werken op mobiel (mobile-first, 85%+ mobile traffic). Moet snel laden.

### Stap 10.1: Formaliseer het Design System
Maak `design-system.css`:
```css
/* design-system.css — PeuterPlannen Design Tokens & Utilities */

:root {
  /* === Colors === */
  --pp-primary: #D4775A;
  --pp-primary-light: #FDF1ED;
  --pp-primary-dark: #B35D42;
  --pp-primary-hover: #C46A4F;

  --pp-accent: #E8B870;
  --pp-accent-light: #FEF6E8;
  --pp-accent-dark: #C49A52;

  --pp-secondary: #6B9590;
  --pp-secondary-light: #E8F2F0;

  --pp-success: #2D8B5E;
  --pp-success-bg: #E8F5EF;
  --pp-error: #C0392B;
  --pp-error-bg: #FDEDED;

  /* === Surfaces === */
  --pp-bg: #FAF7F2;
  --pp-bg-warm: #FFF5EB;
  --pp-surface: #FFFFFF;
  --pp-surface-hover: #FEFCF9;
  --pp-border: rgba(212, 119, 90, 0.15);
  --pp-border-strong: rgba(212, 119, 90, 0.3);

  /* === Text === */
  --pp-text: #2D2926;
  --pp-text-secondary: #7A5E60;
  --pp-text-muted: #A39490;
  --pp-text-inverse: #FFFFFF;

  /* === Typography === */
  --pp-font-heading: 'Familjen Grotesk', 'Plus Jakarta Sans', sans-serif;
  --pp-font-ui: 'Plus Jakarta Sans', sans-serif;
  --pp-font-body: 'DM Sans', -apple-system, sans-serif;

  --pp-text-xs: 0.75rem;    /* 12px */
  --pp-text-sm: 0.8125rem;  /* 13px */
  --pp-text-base: 0.9375rem; /* 15px */
  --pp-text-lg: 1.125rem;   /* 18px */
  --pp-text-xl: 1.375rem;   /* 22px */
  --pp-text-2xl: 1.75rem;   /* 28px */
  --pp-text-3xl: 2.25rem;   /* 36px */

  /* === Spacing === */
  --pp-space-xs: 4px;
  --pp-space-sm: 8px;
  --pp-space-md: 16px;
  --pp-space-lg: 24px;
  --pp-space-xl: 32px;
  --pp-space-2xl: 48px;

  /* === Shadows === */
  --pp-shadow-sm: 0 1px 3px rgba(45, 41, 38, 0.08);
  --pp-shadow-md: 0 4px 12px rgba(45, 41, 38, 0.10);
  --pp-shadow-lg: 0 8px 30px rgba(45, 41, 38, 0.12);
  --pp-shadow-hover: 0 12px 40px rgba(45, 41, 38, 0.15);

  /* === Borders === */
  --pp-radius-xs: 8px;
  --pp-radius-sm: 12px;
  --pp-radius-md: 16px;
  --pp-radius-lg: 22px;
  --pp-radius-xl: 28px;
  --pp-radius-pill: 999px;

  /* === Transitions === */
  --pp-transition: 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  --pp-transition-slow: 0.35s cubic-bezier(0.22, 1, 0.36, 1);

  /* === Layout === */
  --pp-max-width: 1200px;
  --pp-content-width: 720px;
  --pp-app-width: 540px;
  --pp-safe-bottom: env(safe-area-inset-bottom, 20px);

  /* === Map type colors === */
  --pp-type-play: #52B788;
  --pp-type-farm: #8B6F47;
  --pp-type-nature: #2D6A4F;
  --pp-type-museum: #7B2D8B;
  --pp-type-culture: #5B3F8B;
  --pp-type-swim: #2196F3;
  --pp-type-pancake: #E9C46A;
  --pp-type-horeca: #E76F51;
}
```

### Stap 10.2: Component library als CSS classes
Voeg toe aan `design-system.css`:
```css
/* === Buttons === */
.pp-btn { ... }
.pp-btn-primary { ... }
.pp-btn-secondary { ... }
.pp-btn-ghost { ... }

/* === Cards === */
.pp-card { ... }
.pp-card-interactive { ... }

/* === Badges === */
.pp-badge { ... }
.pp-badge-type { ... }

/* === Form elements === */
.pp-input { ... }
.pp-select { ... }
.pp-checkbox { ... }

/* === Chips/Tags === */
.pp-chip { ... }
.pp-chip-active { ... }

/* === Location card (herbruikbaar) === */
.pp-location-card { ... }
```

### Stap 10.3: Migreer bestaande pagina's naar design system
Dit is het meeste werk. Per pagina-type:

1. **sync_all.js generators** — Update de HTML-generatie om design system classes te gebruiken
2. **app.html** — Vervang inline CSS variabelen met `--pp-*` tokens
3. **index.html** — Idem
4. **admin portal** — De admin heeft al `--pp-*` prefixed variabelen in portal-shell.css. Align met design-system.css
5. **partner portal** — Migreer naar design system tokens

### Stap 10.4: Motion & Micro-interactions (frontend-design skill)
Gebruik de frontend-design skill om tasteful, on-brand animaties toe te voegen:

- **Page load:** Staggered fade-up reveals (al deels aanwezig, formaliseer het)
- **Card hovers:** Subtle lift + shadow transition (al aanwezig, consistent maken)
- **Filter chips:** Snap-animatie bij actief worden
- **Map markers:** Bounce-in bij laden
- **Favoriet toggle:** Hart-animatie (scale + color)
- **Scroll-triggered:** Lazy reveal van content secties

Alles CSS-only. Geen JavaScript animation libraries.

### Stap 10.5: Verifieer visuele consistentie
- Open alle pagina-types in een browser
- Vergelijk: zijn kleuren, spacing, shadows, typography consistent?
- Mobile test: zijn alle pagina's bruikbaar op 375px breed?

### Stap 10.6: Commit
```
git add design-system.css style.css app.css
git commit -m "Establish design system: tokens, components, consistent styling

Formalize color palette, typography scale, spacing, shadows into
design-system.css. Migrate all pages to shared design tokens.
Add tasteful motion and micro-interactions."
```

---

## FASE 11: DATA INTEGRITEIT & DATABASE VERBETERINGEN
**Status:** `TODO`
**Agent:** Sonnet
**Geschatte duur:** 1.5 uur
**Doel:** FK integriteit verbeteren, CI audit toevoegen

### Stap 11.1: Audit voor region-name integriteit
In plaats van een zware FK migratie (text → integer), voeg een CI-audit toe.

Voeg toe aan `.scripts/audit_internal_consistency.js`:
```javascript
function auditRegionIntegrity(regions, locations) {
  const regionNames = new Set(regions.map(r => r.name));
  const issues = [];
  for (const loc of locations) {
    if (!regionNames.has(loc.region)) {
      issues.push({
        type: 'orphan_location',
        detail: `Location "${loc.name}" (id=${loc.id}) references non-existent region "${loc.region}"`
      });
    }
  }
  return issues;
}
```

Dit vangt het probleem op zonder de database te migreren.

### Stap 11.2: Supabase constraint toevoegen
Voeg een database-level check toe als extra veiligheid:
```sql
-- supabase/migrations/20260313_region_fk_validation.sql

-- Trigger die voorkomt dat locations een niet-bestaande region referentieren
CREATE OR REPLACE FUNCTION public.validate_location_region()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.regions WHERE name = NEW.region) THEN
    RAISE EXCEPTION 'Region "%" does not exist in regions table', NEW.region;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_location_region ON public.locations;
CREATE TRIGGER validate_location_region
  BEFORE INSERT OR UPDATE OF region ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.validate_location_region();
```

### Stap 11.3: Commit
```
git add .scripts/audit_internal_consistency.js supabase/migrations/
git commit -m "Strengthen data integrity: region validation trigger + CI audit

Add database trigger to prevent orphan location-region references.
Add CI audit check for region name consistency."
```

---

## FASE 12: SEO GRADUATIESYSTEEM
**Status:** `TODO`
**Agent:** Opus (strategie) + Sonnet (implementatie)
**Geschatte duur:** 4-6 uur
**Doel:** Meer location detail pages promoten van noindex naar index

### Achtergrond:
Na Fase 4 zijn ~300 pages indexed en ~1700 runtime-rendered (noindex). Het doel is om het percentage indexed pages geleidelijk te verhogen door content-kwaliteit te meten en te verbeteren.

### Stap 12.1: Definieer graduatie-criteria
Een locatie krijgt SEO tier "index" als het voldoet aan ALLE van:
1. `description` is niet leeg EN >= 90 karakters
2. `toddler_highlight` is niet leeg
3. `weather` is ingevuld (indoor/outdoor/both)
4. `lat` en `lng` zijn ingevuld
5. `min_age` en `max_age` zijn ingevuld
6. Minimaal 1 facility-veld is true (coffee, diaper, of alcohol)
7. Geen AI-slop patronen in description (bestaande GENERIC_DESCRIPTION_PATTERNS check)

Optionele bonus-criteria (verhogen prioriteit in sitemap):
- `website` is ingevuld → +0.05 priority
- `place_id` is ingevuld → +0.05 priority
- `verification_confidence` >= 0.7 → +0.05 priority
- Heeft 1+ approved observations → +0.05 priority

### Stap 12.2: Implementeer graduatie-logica
In `.scripts/lib/seo-policy.js`:
```javascript
function computeLocationSeoTier(loc) {
  const hasDescription = loc.description && loc.description.length >= 90;
  const hasHighlight = !!loc.toddler_highlight;
  const hasWeather = !!loc.weather;
  const hasCoords = loc.lat != null && loc.lng != null;
  const hasAgeRange = loc.min_age != null && loc.max_age != null;
  const hasFacility = loc.coffee || loc.diaper || loc.alcohol;
  const noSlop = !AI_SLOP_PATTERNS.some(p => p.test(loc.description || ''));
  const noGeneric = !GENERIC_DESCRIPTION_PATTERNS.some(p => p.test(loc.description || ''));

  if (hasDescription && hasHighlight && hasWeather && hasCoords && hasAgeRange && hasFacility && noSlop && noGeneric) {
    return 'index';
  }
  return 'support'; // noindex
}
```

### Stap 12.3: Dashboard metric
Voeg aan de admin-api een endpoint toe dat rapporteert:
- Totaal locaties
- Locaties met tier "index"
- Locaties per ontbrekend criterium (welke velden moeten nog ingevuld worden)
- Top-10 locaties die het dichtst bij promotie zijn (missen slechts 1 criterium)

Dit helpt bij het prioriteren van content-verrijking.

### Stap 12.4: Automatische verrijking via pipeline
Breid de bestaande pipeline uit met een "enrichment pass" die:
1. Locaties identificeert die 1-2 criteria missen voor promotie
2. Via AI (Haiku) de ontbrekende velden genereert (bijv. toddler_highlight)
3. De resultaten als observations indient (pending review)

Dit maakt SEO-groei semi-automatisch.

### Stap 12.5: Commit
```
git add .scripts/lib/seo-policy.js
git commit -m "Implement SEO graduation system for location detail pages

Clear criteria for index vs noindex. Dashboard metrics for tracking
progress. Foundation for automated content enrichment pipeline."
```

---

## FASE 13: PARTNER CONVERSIE-FUNNEL
**Status:** `TODO`
**Agent:** Opus (strategie + frontend-design skill) + Sonnet (implementatie)
**Geschatte duur:** 4-6 uur
**Doel:** Partner portal conversie verbeteren met een public-facing pagina en gestroomlijnde funnel

### Stap 13.1: Maak /voor-bedrijven/ pagina
Gebruik de frontend-design skill voor een distinctive, conversion-optimized landing page.

**Inhoud:**
- Hero: "Sta je op PeuterPlannen? Beheer je profiel en bereik meer gezinnen."
- Value propositions: geverifieerd badge, featured listing, analytics
- Pricing: 3 tiers (gratis claim, basis, featured) met duidelijke prijzen
- Social proof: "418 locaties vertrouwen op PeuterPlannen" (dynamisch getal)
- CTA: direct naar partner portal login/signup
- FAQ: veelgestelde vragen van locatie-eigenaren

**SEO:** `<title>Voor bedrijven — PeuterPlannen</title>`, index,follow, in sitemap.

**Design direction (frontend-design skill):**
- Tone: Professional maar warm. Dit is een B2B pagina maar de tone moet bij PeuterPlannen passen
- Layout: Full-width hero, pricing cards, testimonial strip
- Gebruik het design system uit Fase 10

### Stap 13.2: Voeg pagina toe aan sync_all.js
Genereer `/voor-bedrijven/index.html` als onderdeel van de build.
- Statistieken (locatie-aantallen, regio-aantallen) worden dynamisch ingevuld
- Pricing komt uit een config constante (makkelijk te updaten)

### Stap 13.3: Link vanuit de main site
- Voeg "Voor bedrijven" toe aan de footer van alle pagina's
- Voeg het toe aan de floating nav (als secondary link)

### Stap 13.4: Funnel tracking
Voeg conversion events toe in de partner portal:
```javascript
trackEvent('partner_signup_start');
trackEvent('partner_signup_complete');
trackEvent('partner_claim_start', { location_id });
trackEvent('partner_claim_complete', { location_id });
trackEvent('partner_checkout_start', { tier });
trackEvent('partner_checkout_complete', { tier });
```

### Stap 13.5: Commit
```
git add voor-bedrijven/ .scripts/lib/generators/
git commit -m "Add /voor-bedrijven/ landing page and partner funnel tracking

Public-facing B2B page with pricing, value props, and CTAs.
Conversion event tracking throughout partner signup flow."
```

---

## FASE 14: INCREMENTAL BUILDS
**Status:** `TODO`
**Agent:** Opus (architectuur) + Sonnet (implementatie)
**Geschatte duur:** 4-6 uur
**Doel:** Build alleen de pagina's die veranderd zijn

### Waarom:
Na alle vorige fases is de build al sneller (minder pagina's door Fase 4). Maar bij 300+ statische pages en groeiend, is een full rebuild bij elke location-update inefficient.

### Stap 14.1: Change detection
Breid `site_publish_state` uit met een `changed_ids` array:
```sql
-- supabase/migrations/20260313_incremental_build.sql
ALTER TABLE public.site_publish_state
  ADD COLUMN IF NOT EXISTS changed_location_ids BIGINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS changed_region_slugs TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS changed_editorial_slugs TEXT[] NOT NULL DEFAULT '{}';
```

Update de triggers om changed IDs bij te houden:
```sql
-- In trg_mark_publish_dirty_locations:
-- Append NEW.id to changed_location_ids
UPDATE public.site_publish_state
SET changed_location_ids = array_append(
  COALESCE(changed_location_ids, '{}'),
  COALESCE(NEW.id, OLD.id)
)
WHERE id = 1;
```

### Stap 14.2: Incremental build mode in sync_all.js
```javascript
async function main() {
  const publishState = await fetchPublishState(SB_URL, SB_KEY);
  const isIncremental = !process.env.FORCE_FULL_BUILD
    && publishState.changed_location_ids.length > 0
    && publishState.changed_location_ids.length < 50; // < 50 changes = incremental

  if (isIncremental) {
    console.log(`Incremental build: ${publishState.changed_location_ids.length} locations changed`);
    // Only regenerate:
    // 1. Affected location detail pages
    // 2. Parent city pages for affected regions
    // 3. Type pages if type distribution changed
    // 4. Index page (stats might have changed)
    // 5. Sitemaps
  } else {
    console.log('Full build');
    // ... existing full build
  }
}
```

### Stap 14.3: Clear changed IDs after build
In de CI workflow, na succesvolle build:
```bash
curl -X PATCH ... -d '{"changed_location_ids": [], "changed_region_slugs": [], "changed_editorial_slugs": []}'
```

### Stap 14.4: Commit
```
git add .scripts/ supabase/migrations/
git commit -m "Implement incremental builds via change tracking

Track changed location/region/editorial IDs in site_publish_state.
Incremental mode rebuilds only affected pages when < 50 changes.
Full rebuild fallback for larger changes or manual trigger."
```

---

## FASE 15: DOCUMENTATIE & BUS FACTOR
**Status:** `TODO`
**Agent:** Sonnet (documentatie) + Haiku (formatting)
**Geschatte duur:** 2 uur
**Doel:** ARCHITECTURE.md updaten, operationele documentatie toevoegen

### Stap 15.1: Update ARCHITECTURE.md
Het huidige ARCHITECTURE.md is uitstekend maar verouderd na al onze wijzigingen. Update het met:
- Nieuwe modulaire structuur van sync_all.js
- Design system referentie
- Test infrastructure
- Incremental build uitleg
- Monitoring setup
- Partner funnel documentatie

### Stap 15.2: Operationeel runbook
Maak `OPERATIONS.md` met:
- Hoe je een nieuwe regio toevoegt (al gedocumenteerd, maar update)
- Hoe je een locatie handmatig toevoegt/verwijdert
- Hoe je de pipeline draait
- Hoe je een nooddeploy doet
- Hoe je fouten in de build debugt
- Hoe je de admin portal gebruikt
- Hoe je Stripe subscriptions beheert
- Hoe je Supabase migrations deployt
- Hoe je de Cloudflare Worker updatet

### Stap 15.3: Pipeline documentatie
Maak `.scripts/pipeline/README.md` met:
- Wat de pipeline doet
- Hoe je hem draait
- Configuratie uitleg
- Scoring criteria
- Troubleshooting

### Stap 15.4: Commit
```
git add ARCHITECTURE.md OPERATIONS.md .scripts/pipeline/README.md
git commit -m "Update documentation for new architecture

Comprehensive ARCHITECTURE.md update reflecting modular build,
design system, and monitoring. Add OPERATIONS.md runbook.
Add pipeline documentation."
```

---

## FASE 16: CI/CD HARDENING
**Status:** `TODO`
**Agent:** Sonnet
**Geschatte duur:** 1.5 uur
**Doel:** Tests toevoegen aan CI, audit versterken

### Stap 16.1: Voeg tests toe aan sync-site.yml
```yaml
- name: Run tests
  if: steps.gate.outputs.run_build == 'true'
  run: npm test

- name: Build static site
  if: steps.gate.outputs.run_build == 'true'
  run: npm run build
  # ... rest van de pipeline
```

Tests draaien VOOR de build zodat broken helpers niet tot een corrupte build leiden.

### Stap 16.2: Voeg build-time snapshot vergelijking toe
Na de build, vergelijk het aantal gegenereerde bestanden met een verwacht bereik:
```yaml
- name: Sanity check generated files
  if: steps.gate.outputs.run_build == 'true'
  run: |
    count=$(find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' | wc -l)
    echo "Generated HTML files: $count"
    if [ "$count" -lt 100 ]; then
      echo "ERROR: Too few HTML files generated ($count). Build may be broken."
      exit 1
    fi
    if [ "$count" -gt 3000 ]; then
      echo "ERROR: Too many HTML files generated ($count). Possible runaway generation."
      exit 1
    fi
```

### Stap 16.3: Commit
```
git add .github/workflows/sync-site.yml
git commit -m "Harden CI: add tests, file count sanity check

Run unit tests before build. Verify generated file count is within
expected range to catch runaway generation or broken builds."
```

---

## FASE 17: FINAL CLEANUP & MERGE
**Status:** `TODO`
**Agent:** Sonnet (review) + Haiku (cleanup)
**Geschatte duur:** 1 uur
**Doel:** Review, cleanup, en merge naar main

### Stap 17.1: Verwijder dead code
Zoek naar:
- Ongebruikte JSON bestanden (locaties_*.json in root)
- Ongebruikte scripts (audit_fix_report.csv, oude pipeline bestanden)
- Verouderde portal (als /portal/ weg kan)

### Stap 17.2: Final audit run
```bash
npm test
npm run build
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
```

### Stap 17.3: Review alle wijzigingen
```bash
git diff main...refactor/mega-plan --stat
```

Review de diff. Check voor:
- Geen secrets gelekt
- Geen onbedoelde file deletions
- Geen broken imports

### Stap 17.4: Merge
```bash
git checkout main
git merge refactor/mega-plan --no-ff -m "Merge mega refactor: modular architecture, tests, design system, monitoring

15-phase refactoring covering:
- Modular build system (sync_all.js split)
- Test infrastructure (unit + snapshot)
- Local dev experience (fixtures + dev server)
- Noindex pages to runtime rendering
- Admin API modularization
- Security hardening (CSP, column security)
- Staging/preview deployments
- Monitoring & observability
- Performance (self-hosted fonts, preload)
- Design system
- Data integrity
- SEO graduation system
- Partner conversion funnel
- Incremental builds
- Documentation & CI hardening"
```

---

## FASE-ONAFHANKELIJKE REFERENTIES

### Belangrijke bestanden (huidige locaties):
```
/Users/basmetten/peuterplannen/
  .scripts/sync_all.js                    → 3864 regels, het hart van de build
  .scripts/pipeline/config.js             → Pipeline configuratie, 80+ gemeenten
  .scripts/pipeline/run_osm_ai_codex.js   → OSM+AI discovery pipeline
  .scripts/audit_internal_consistency.js   → CI audit: broken links, integriteit
  .scripts/audit_seo_quality.js            → CI audit: SEO kwaliteit
  .scripts/audit_portals.js               → CI audit: portal a11y + endpoints
  .github/workflows/sync-site.yml         → Hoofd CI/CD: 10-min cron + dirty gate
  .github/workflows/deploy-supabase.yml   → Supabase deploy bij push naar supabase/
  supabase/functions/admin-api/index.ts   → Admin API (~1400 regels)
  supabase/functions/stripe-webhook/      → Stripe subscription lifecycle
  supabase/functions/submit-partner-observations/ → Partner edit flow
  admin/index.html + admin/admin.js       → Admin portal
  partner/index.html                      → Partner portal (actief)
  portal/index.html                       → Partner portal (mogelijk verouderd)
  cloudflare-worker/subdomain-router.js   → Subdomain → path routing
  app.html                                → Interactieve app (SPA)
  index.html                              → Landing page
  _headers                                → Cloudflare/security headers incl. CSP
  package.json                            → Build scripts, dependencies
  ARCHITECTURE.md                         → Technische documentatie
```

### Database tabellen:
```
regions                    → 22 regio's
locations                  → 2025+ locaties
site_publish_state         → Dirty flag (singleton)
venue_owners               → Partner accounts + Stripe
location_claim_requests    → Claim workflow
location_edit_log          → Audit trail
location_observations      → Moderated observations
editorial_pages            → CMS content
location_quality_tasks     → Quality task queue
gsc_snapshots              → Search Console data
```

### Environment variabelen (CI):
```
SUPABASE_URL               → Supabase project URL
SUPABASE_SERVICE_KEY       → Service role key
SUPABASE_ACCESS_TOKEN      → CLI access token (deploy)
SUPABASE_PROJECT_REF       → Project reference (deploy)
SUPABASE_DB_PASSWORD       → DB wachtwoord (deploy)
STRIPE_SECRET_KEY          → Stripe (edge functions)
STRIPE_WEBHOOK_SECRET      → Stripe webhook (edge functions)
```

### Commando's die altijd moeten werken:
```bash
npm run build              → Full site build
npm test                   → Alle tests (na Fase 2)
npm run dev                → Lokale dev server (na Fase 3)
npm run build:local        → Build met fixture data (na Fase 3)
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
```

---

## NOODPROCEDURE BIJ CONTEXT-VERLIES

Als je midden in een fase je context verliest:

```bash
# 1. Ga naar de repo
cd /Users/basmetten/peuterplannen

# 2. Lees dit plan
cat /Users/basmetten/peuterplannen/plan.md

# 3. Check git status en welke branch je op zit
git status
git branch --show-current
git log --oneline -10

# 4. Check of je in de feature branch zit (verwacht: refactor/mega-plan)
#    Als je op main zit: git checkout refactor/mega-plan
#    Als de branch niet bestaat: begin bij Fase 0

# 5. Scroll naar de STATUS TRACKER onderaan dit bestand
#    Hervat bij de eerste fase met status TODO of IN_PROGRESS

# 6. Lees ook ARCHITECTURE.md voor de huidige staat van het project:
cat /Users/basmetten/peuterplannen/ARCHITECTURE.md
```

**BELANGRIJK:** Dit is de repo `github.com/basmetten/peuterplannen`. Push NIET naar main/origin zonder dat de user dat expliciet vraagt. Werk op de `refactor/mega-plan` branch.

---

## STATUS TRACKER

Update deze sectie na het afronden van elke fase:

| Fase | Beschrijving | Status | Datum |
|------|-------------|--------|-------|
| 0 | Voorbereiding & veiligheid | `DONE` | 2026-03-13 |
| 1 | Split sync_all.js | `DONE` | 2026-03-13 |
| 2 | Test infrastructure | `DONE` | 2026-03-13 |
| 3 | Local dev experience | `DONE` | 2026-03-13 |
| 4 | Noindex → runtime rendering | `TODO` | |
| 5 | Admin-API opsplitsen | `TODO` | |
| 6 | Security hardening | `TODO` | |
| 7 | Staging/preview environment | `TODO` | |
| 8 | Monitoring & observability | `TODO` | |
| 9 | Performance optimalisatie | `TODO` | |
| 10 | Design system & frontend | `TODO` | |
| 11 | Data integriteit | `TODO` | |
| 12 | SEO graduatiesysteem | `TODO` | |
| 13 | Partner conversie-funnel | `TODO` | |
| 14 | Incremental builds | `TODO` | |
| 15 | Documentatie & bus factor | `TODO` | |
| 16 | CI/CD hardening | `TODO` | |
| 17 | Final cleanup & merge | `TODO` | |
