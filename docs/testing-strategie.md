# Testing Strategie: peuterplannen.nl

## Context

Dit document beschrijft de teststrategie voor peuterplannen.nl — een statische website (GitHub Pages + Cloudflare CDN) die Nederlandse ouders helpt peuterplannen te vinden. De site bevat locatiekaarten, filters, zoekfunctionaliteit en responsive layouts.

**Kernprobleem dat dit document oplost:** Claude Code kan niet betrouwbaar visueel beoordelen of UI-output correct is. Screenshots interpreteren levert gemiste details op. Daarom schakelen we over naar **machine-leesbare verificatie**: pixel-diffs, computed style checks en assertions die binair pass/fail opleveren.

**Principe: vraag Claude nooit "ziet dit er goed uit?" — geef het tools die pass/fail antwoorden.**

---

## 1. Aanpak overzicht

We gebruiken drie lagen van testing, elk met een ander doel:

| Laag | Tool | Wat het vangt | Wanneer runnen |
|------|------|---------------|----------------|
| **Functioneel** | Playwright Tests | Kapotte links, niet-werkende filters, navigatiefouten, formuliergedrag | Na elke feature-wijziging |
| **Visueel (pixel-diff)** | Playwright Visual Regression (`toHaveScreenshot`) | Layout shifts, verdwenen elementen, kleurverschillen, spacing-problemen | Na elke CSS/layout-wijziging |
| **Structureel (CSS)** | Playwright Computed Style Checks | Exacte padding, font-size, kleuren, display-properties, responsive breakpoints | Bij component-wijzigingen |

De drie lagen vullen elkaar aan:
- Functionele tests vangen **logica-bugs** (filter toont verkeerde resultaten)
- Pixel-diff vangt **visuele regressies** (element verschuift 3px na CSS-wijziging)
- Computed style checks vangen **structurele fouten** (verkeerde font-size op mobile)

---

## 2. Setup

### 2.1 Installatie

```bash
# Playwright installeren met browsers
npm install -D @playwright/test
npx playwright install chromium

# Optioneel: BackstopJS voor sitemap-brede visuele checks
npm install -g backstopjs
```

### 2.2 Playwright configuratie

Maak `playwright.config.ts` in de project root:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',

  // Base URL naar lokale dev server
  use: {
    baseURL: 'http://localhost:4000', // pas aan naar jouw dev server port
    trace: 'on-first-retry',
  },

  projects: [
    // Desktop
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobiel - cruciaal voor peuterplannen.nl doelgroep
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 14'] },
    },
    // Tablet
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // Dev server automatisch starten voor tests
  webServer: {
    command: 'npm run serve', // pas aan naar jouw serve command
    port: 4000,
    reuseExistingServer: !process.env.CI,
  },

  // Visual regression settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% tolerantie
      threshold: 0.2,          // per-pixel kleurdrempel (0-1)
      animations: 'disabled',  // voorkom flaky tests door animaties
    },
  },
});
```

### 2.3 Directory structuur

```
tests/
├── functional/          # Functionele tests
│   ├── navigation.spec.ts
│   ├── search-filter.spec.ts
│   ├── location-cards.spec.ts
│   └── links.spec.ts
├── visual/              # Visuele regressie tests
│   ├── homepage.spec.ts
│   ├── location-detail.spec.ts
│   └── search-results.spec.ts
├── structural/          # Computed style checks
│   ├── typography.spec.ts
│   ├── spacing.spec.ts
│   └── responsive.spec.ts
└── fixtures/            # Test data en helpers
    └── test-helpers.ts
```

---

## 3. Functionele tests

### 3.1 Wat testen

Functionele tests verifiëren dat de site **doet wat hij moet doen**. Test altijd:

- Alle navigatielinks werken (geen 404s)
- Zoek/filter-functionaliteit geeft correcte resultaten
- Locatiekaarten tonen de juiste data
- Externe links (Google Maps, etc.) openen correct
- Pagina's laden binnen acceptabele tijd
- Meta tags en SEO-elementen aanwezig

### 3.2 Voorbeeld: navigatie en links

```typescript
// tests/functional/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigatie', () => {
  test('hoofdnavigatie links werken', async ({ page }) => {
    await page.goto('/');

    // Verzamel alle navigatielinks
    const navLinks = page.locator('nav a[href]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href && href.startsWith('/')) {
        const response = await page.goto(href);
        expect(response?.status(), `Link ${href} geeft geen 200`).toBe(200);
      }
    }
  });

  test('404 pagina toont correcte melding', async ({ page }) => {
    const response = await page.goto('/deze-pagina-bestaat-niet');
    // Static sites retourneren vaak 200 met custom 404 content
    await expect(page.locator('text=niet gevonden')).toBeVisible();
  });
});
```

### 3.3 Voorbeeld: zoek- en filterfunctionaliteit

```typescript
// tests/functional/search-filter.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Zoeken en filteren', () => {
  test('zoekbalk filtert locaties correct', async ({ page }) => {
    await page.goto('/');

    // Tel initieel aantal locatiekaarten
    const initialCards = await page.locator('.location-card').count();
    expect(initialCards).toBeGreaterThan(0);

    // Zoek op een specifieke term
    await page.fill('[data-testid="search-input"]', 'speeltuin');
    await page.waitForTimeout(500); // debounce

    // Verifieer dat resultaten gefilterd zijn
    const filteredCards = await page.locator('.location-card').count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);

    // Verifieer dat alle getoonde kaarten relevant zijn
    const cardTexts = await page.locator('.location-card').allTextContents();
    for (const text of cardTexts) {
      expect(text.toLowerCase()).toContain('speeltuin');
    }
  });

  test('categorie-filter werkt', async ({ page }) => {
    await page.goto('/');

    // Klik op een categorie filter
    await page.click('[data-testid="filter-speeltuinen"]');

    // Verifieer dat alleen die categorie getoond wordt
    const cards = page.locator('.location-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const category = await cards.nth(i).getAttribute('data-category');
      expect(category).toBe('speeltuinen');
    }
  });

  test('lege zoekresultaten tonen melding', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'xyznonexistent123');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
  });
});
```

### 3.4 Voorbeeld: locatiekaarten data-integriteit

```typescript
// tests/functional/location-cards.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Locatiekaarten', () => {
  test('elke kaart heeft verplichte elementen', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.location-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);

      // Verplichte elementen aanwezig
      await expect(card.locator('.card-title')).toBeVisible();
      await expect(card.locator('.card-location')).toBeVisible();

      // Titel is niet leeg
      const title = await card.locator('.card-title').textContent();
      expect(title?.trim().length).toBeGreaterThan(0);
    }
  });

  test('locatie detail pagina laadt correct', async ({ page }) => {
    await page.goto('/');

    // Klik op eerste locatiekaart
    await page.locator('.location-card').first().click();

    // Verifieer detail pagina elementen
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="location-address"]')).toBeVisible();
  });
});
```

---

## 4. Visuele regressie tests (pixel-diff)

### 4.1 Hoe het werkt

Playwright's `toHaveScreenshot()` maakt een screenshot en vergelijkt die pixel-by-pixel met een opgeslagen baseline. Bij de eerste run maakt hij baseline screenshots aan. Bij volgende runs vergelijkt hij automatisch.

**Belangrijk:** Claude hoeft de screenshot niet te "interpreteren". Het krijgt een binair resultaat:
- **PASS:** screenshot matcht baseline binnen tolerantie
- **FAIL:** X pixels verschil gevonden, diff-image beschikbaar

### 4.2 Voorbeeld: homepage visuele regressie

```typescript
// tests/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage visuele regressie', () => {
  test('homepage boven de vouw', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot van viewport (boven de vouw)
    await expect(page).toHaveScreenshot('homepage-above-fold.png');
  });

  test('homepage volledige pagina', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Full-page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
    });
  });

  test('homepage footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('homepage-footer.png');
  });
});
```

### 4.3 Voorbeeld: component-level visuele tests

```typescript
// tests/visual/location-detail.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Locatie detail visuele regressie', () => {
  test('locatiekaart component', async ({ page }) => {
    await page.goto('/');

    // Screenshot van individuele component
    const firstCard = page.locator('.location-card').first();
    await expect(firstCard).toHaveScreenshot('location-card.png');
  });

  test('zoekbalk component', async ({ page }) => {
    await page.goto('/');

    const searchBar = page.locator('[data-testid="search-bar"]');
    await expect(searchBar).toHaveScreenshot('search-bar-empty.png');

    // Met ingevulde tekst
    await page.fill('[data-testid="search-input"]', 'speeltuin');
    await expect(searchBar).toHaveScreenshot('search-bar-filled.png');
  });
});
```

### 4.4 Baselines beheren

```bash
# Eerste keer: baselines aanmaken
npx playwright test tests/visual/ --update-snapshots

# Daarna: testen tegen baselines
npx playwright test tests/visual/

# Na bewuste wijzigingen: baselines updaten
npx playwright test tests/visual/ --update-snapshots
```

**Workflow bij wijzigingen:**
1. Maak je code-wijziging
2. Run `npx playwright test tests/visual/`
3. Als tests falen: bekijk diff-images in `test-results/`
4. Als de wijziging **bewust** is: update baselines met `--update-snapshots`
5. Als de wijziging **onbewust** is: fix de code
6. Commit baselines mee in git (in `tests/visual/*.spec.ts-snapshots/`)

---

## 5. Structurele tests (computed style checks)

### 5.1 Waarom dit nodig is

Pixel-diffs vangen visuele veranderingen, maar missen soms subtiele problemen:
- Een element heeft 14px font-size in plaats van 16px (nauwelijks zichtbaar in screenshot)
- Padding is 12px in plaats van 16px
- Een kleur is #333 in plaats van #222
- Flexbox alignment is subtiel verkeerd

Computed style checks lezen de **daadwerkelijke CSS-waarden** die de browser berekent. Dit is 100% deterministisch — geen visueel oordeel nodig.

### 5.2 Helper functie

```typescript
// tests/fixtures/test-helpers.ts

import { Page } from '@playwright/test';

export async function getComputedStyles(
  page: Page,
  selector: string,
  properties: string[]
): Promise<Record<string, string>> {
  return page.evaluate(
    ({ sel, props }) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element niet gevonden: ${sel}`);
      const computed = getComputedStyle(el);
      const result: Record<string, string> = {};
      for (const prop of props) {
        result[prop] = computed.getPropertyValue(prop);
      }
      return result;
    },
    { sel: selector, props: properties }
  );
}

export async function getAllComputedStyles(
  page: Page,
  selector: string,
  properties: string[]
): Promise<Record<string, string>[]> {
  return page.evaluate(
    ({ sel, props }) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map((el) => {
        const computed = getComputedStyle(el);
        const result: Record<string, string> = {};
        for (const prop of props) {
          result[prop] = computed.getPropertyValue(prop);
        }
        return result;
      });
    },
    { sel: selector, props: properties }
  );
}
```

### 5.3 Voorbeeld: typografie checks

```typescript
// tests/structural/typography.spec.ts
import { test, expect } from '@playwright/test';
import { getComputedStyles } from '../fixtures/test-helpers';

test.describe('Typografie', () => {
  test('h1 heeft correcte styling', async ({ page }) => {
    await page.goto('/');

    const styles = await getComputedStyles(page, 'h1', [
      'font-size', 'font-weight', 'color', 'font-family'
    ]);

    expect(styles['font-size']).toBe('32px');     // pas aan naar jouw design
    expect(styles['font-weight']).toBe('700');
    expect(styles['color']).toBe('rgb(34, 34, 34)'); // #222
  });

  test('body text heeft correcte styling', async ({ page }) => {
    await page.goto('/');

    const styles = await getComputedStyles(page, 'p', [
      'font-size', 'line-height', 'color'
    ]);

    expect(styles['font-size']).toBe('16px');
    expect(parseFloat(styles['line-height'])).toBeGreaterThanOrEqual(22);
  });
});
```

### 5.4 Voorbeeld: spacing en layout checks

```typescript
// tests/structural/spacing.spec.ts
import { test, expect } from '@playwright/test';
import { getComputedStyles, getAllComputedStyles } from '../fixtures/test-helpers';

test.describe('Spacing en layout', () => {
  test('locatiekaarten hebben consistente spacing', async ({ page }) => {
    await page.goto('/');

    const cardStyles = await getAllComputedStyles(
      page, '.location-card', ['padding', 'margin-bottom', 'border-radius']
    );

    for (const styles of cardStyles) {
      expect(styles['padding']).toBe('16px');         // pas aan
      expect(styles['margin-bottom']).toBe('16px');    // pas aan
      expect(styles['border-radius']).toBe('8px');     // pas aan
    }
  });

  test('grid layout is correct', async ({ page }) => {
    await page.goto('/');

    const gridStyles = await getComputedStyles(
      page, '.location-grid', ['display', 'grid-template-columns', 'gap']
    );

    expect(gridStyles['display']).toBe('grid');
    expect(gridStyles['gap']).toBe('16px');
  });
});
```

### 5.5 Voorbeeld: responsive design checks

```typescript
// tests/structural/responsive.spec.ts
import { test, expect } from '@playwright/test';
import { getComputedStyles } from '../fixtures/test-helpers';

test.describe('Responsive design', () => {
  test('mobile: kaarten zijn full-width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone
    await page.goto('/');

    const gridStyles = await getComputedStyles(
      page, '.location-grid', ['grid-template-columns']
    );

    // Op mobile: 1 kolom
    expect(gridStyles['grid-template-columns']).not.toContain(' ');
    // (enkele waarde = 1 kolom, meerdere waarden gescheiden door spatie = meerdere kolommen)
  });

  test('tablet: kaarten zijn 2 kolommen', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/');

    const gridStyles = await getComputedStyles(
      page, '.location-grid', ['grid-template-columns']
    );

    // Op tablet: 2 kolommen (twee waarden)
    const columns = gridStyles['grid-template-columns'].trim().split(/\s+/);
    expect(columns.length).toBe(2);
  });

  test('desktop: kaarten zijn 3 kolommen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const gridStyles = await getComputedStyles(
      page, '.location-grid', ['grid-template-columns']
    );

    const columns = gridStyles['grid-template-columns'].trim().split(/\s+/);
    expect(columns.length).toBe(3);
  });

  test('navigatie is hamburger menu op mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Desktop nav is verborgen
    const desktopNav = page.locator('[data-testid="desktop-nav"]');
    await expect(desktopNav).toBeHidden();

    // Hamburger icon is zichtbaar
    const hamburger = page.locator('[data-testid="hamburger-menu"]');
    await expect(hamburger).toBeVisible();
  });
});
```

---

## 6. BackstopJS: sitemap-brede visuele checks

### 6.1 Wanneer BackstopJS gebruiken (naast Playwright)

BackstopJS is complementair aan Playwright visual regression. Gebruik het voor:

- **Bulk-checks over alle pagina's** na een globale CSS-wijziging
- **Snelle sitemap-brede scan** zonder individuele tests te schrijven
- **Vergelijking productie vs lokaal** (referentie van live site, test tegen dev)

### 6.2 Configuratie

```bash
backstop init
```

Pas `backstop.json` aan:

```json
{
  "id": "peuterplannen",
  "viewports": [
    { "label": "phone", "width": 375, "height": 812 },
    { "label": "tablet", "width": 768, "height": 1024 },
    { "label": "desktop", "width": 1280, "height": 800 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "http://localhost:4000/",
      "delay": 1000,
      "misMatchThreshold": 0.1,
      "requireSameDimensions": true
    },
    {
      "label": "Zoekresultaten",
      "url": "http://localhost:4000/zoeken",
      "delay": 1000,
      "misMatchThreshold": 0.1
    }
  ],
  "paths": {
    "bitmaps_reference": "tests/backstop/reference",
    "bitmaps_test": "tests/backstop/test",
    "html_report": "tests/backstop/report"
  },
  "engine": "playwright",
  "engineOptions": {
    "args": ["--no-sandbox"]
  },
  "report": ["browser"],
  "debug": false
}
```

### 6.3 Workflow

```bash
# Baseline screenshots maken (na goedgekeurde staat)
backstop reference

# Testen na wijzigingen
backstop test

# Resultaten goedkeuren als de wijzigingen bewust zijn
backstop approve
```

---

## 7. npm scripts en CI integratie

### 7.1 Package.json scripts

```json
{
  "scripts": {
    "test": "npx playwright test",
    "test:functional": "npx playwright test tests/functional/",
    "test:visual": "npx playwright test tests/visual/",
    "test:structural": "npx playwright test tests/structural/",
    "test:visual:update": "npx playwright test tests/visual/ --update-snapshots",
    "test:report": "npx playwright show-report",
    "test:backstop": "backstop test",
    "test:backstop:ref": "backstop reference",
    "test:backstop:approve": "backstop approve",
    "test:all": "npx playwright test && backstop test"
  }
}
```

### 7.2 Wanneer welke tests runnen

| Situatie | Commando | Reden |
|----------|----------|-------|
| Na feature-wijziging | `npm run test:functional` | Verifieer dat functionaliteit werkt |
| Na CSS/layout-wijziging | `npm run test:visual` | Vang onbedoelde visuele regressies |
| Na component-wijziging | `npm run test:structural` | Check exacte CSS-waarden |
| Globale CSS-wijziging | `npm run test:backstop` | Scan alle pagina's in alle viewports |
| Voor deployment | `npm run test:all` | Alles verifiëren |
| Na bewuste redesign | `npm run test:visual:update` | Nieuwe baselines |

---

## 8. CLAUDE.md instructies voor testing

Voeg het volgende toe aan je `CLAUDE.md` om Claude Code correct te laten testen:

```markdown
## Testing protocol

### Regels
- Gebruik NOOIT visuele beoordeling van screenshots om te bepalen of iets "er goed uitziet"
- Gebruik ALTIJD machine-leesbare verificatie: assertions, pixel-diffs, computed styles
- Run tests NA elke wijziging, VOOR je meldt dat iets klaar is
- Als een test faalt, fix de CODE, niet de test (tenzij de wijziging bewust is)
- Schrijf EERST een falende test, DAN de implementatie (TDD)

### Test commando's
- Functioneel: `npx playwright test tests/functional/`
- Visueel: `npx playwright test tests/visual/`
- Structureel: `npx playwright test tests/structural/`
- Alles: `npx playwright test`
- Visuele baselines updaten (alleen na bewuste wijzigingen): `npx playwright test tests/visual/ --update-snapshots`

### Bij nieuwe features
1. Schrijf eerst functionele test die faalt
2. Implementeer de feature
3. Verifieer dat functionele test slaagt
4. Voeg visuele regressie test toe voor nieuwe componenten
5. Voeg computed style checks toe voor kritieke CSS-waarden

### Bij bug fixes
1. Schrijf eerst test die de bug reproduceert
2. Fix de bug
3. Verifieer dat de test slaagt
4. Run volledige test suite om regressies te vangen

### Bij CSS/layout wijzigingen
1. Run `npx playwright test tests/visual/` VOOR de wijziging (moet slagen)
2. Maak de wijziging
3. Run `npx playwright test tests/visual/` NA de wijziging
4. Bekijk diff-output: als wijzigingen bewust zijn, update baselines
5. Run `npx playwright test tests/structural/` om CSS-waarden te verifiëren
```

---

## 9. Design tokens referentie

Vul deze tabel aan met de daadwerkelijke design tokens van peuterplannen.nl. Claude Code gebruikt deze waarden in computed style checks.

```
### Kleuren
- Primary (teal):     #
- Secondary (amber):  #
- Text:               #
- Background:         #
- Card background:    #

### Typografie
- Font family:        ''
- H1 size:            px
- H2 size:            px
- Body size:          px
- Body line-height:   px

### Spacing
- Card padding:       px
- Card gap:           px
- Section padding:    px
- Container max-width: px

### Breakpoints
- Mobile max:         px
- Tablet max:         px
- Desktop min:        px

### Border radius
- Cards:              px
- Buttons:            px
```

---

## 10. Veelgemaakte fouten en hoe te voorkomen

### Claude wijzigt tests om ze te laten slagen
**Preventie:** Commit tests VOOR implementatie. Als Claude een test wijzigt, is dat zichtbaar in de git diff. Instructie in CLAUDE.md: "Fix de CODE, niet de test."

### Visuele tests zijn flaky door animaties
**Preventie:** `animations: 'disabled'` in playwright.config.ts. Gebruik `page.waitForLoadState('networkidle')` voor screenshots.

### Pixel-diffs falen door font rendering verschillen
**Preventie:** Stel `maxDiffPixelRatio: 0.01` in (1% tolerantie). Voor CI: gebruik dezelfde Docker-image als lokaal.

### Computed style waarden zijn browser-afhankelijk
**Preventie:** Test altijd in Chromium (consistent). Gebruik rgb() notatie voor kleuren in expects (browsers normaliseren naar rgb).

### Tests draaien te lang
**Preventie:** Run alleen relevante test suite. Gebruik `--grep` om specifieke tests te runnen: `npx playwright test --grep "homepage"`.

---

## 11. Checklist: setup voltooien

- [ ] Playwright geïnstalleerd met Chromium browser
- [ ] `playwright.config.ts` aangemaakt met juiste base URL en viewports
- [ ] Directory structuur aangemaakt (`tests/functional/`, `tests/visual/`, `tests/structural/`)
- [ ] Helper functies in `tests/fixtures/test-helpers.ts`
- [ ] Design tokens ingevuld in sectie 9
- [ ] `data-testid` attributen toegevoegd aan kritieke HTML-elementen
- [ ] npm scripts toegevoegd aan package.json
- [ ] CLAUDE.md aangevuld met testing protocol (sectie 8)
- [ ] Eerste set functionele tests geschreven en groen
- [ ] Visuele baseline screenshots aangemaakt
- [ ] Eerste set computed style checks geschreven
- [ ] BackstopJS geconfigureerd (optioneel)
- [ ] Alle tests slagen op huidige codebase

---

## 12. data-testid conventies

Voeg `data-testid` attributen toe aan HTML-elementen die in tests gebruikt worden. Dit maakt selectors stabiel (onafhankelijk van CSS classes die kunnen veranderen).

```
Conventie: data-testid="[component]-[element]"

Voorbeelden:
- data-testid="search-input"
- data-testid="search-bar"
- data-testid="filter-speeltuinen"
- data-testid="filter-kinderboerderijen"
- data-testid="location-card"
- data-testid="location-address"
- data-testid="no-results"
- data-testid="desktop-nav"
- data-testid="hamburger-menu"
- data-testid="footer"
```
