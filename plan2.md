# PeuterPlannen UI/UX Design System Upgrade

> **Doel:** Alle UI/UX-principes uit [Every UI/UX Concept Explained in Under 10 Minutes](https://www.youtube.com/watch?v=EcbgbKtOELY) (Kole Jain) consistent en geautomatiseerd toepassen op de volledige publieke site van peuterplannen.nl.
> **Bron:** Videoanalyse + typography trends 2025/2026 + micro-interaction research + Claude Code best practices (Anthropic)
> **Repo:** `/Users/basmetten/peuterplannen` → `github.com/basmetten/peuterplannen`
> **Datum:** 2026-03-17
> **Eigenaar:** Bas Metten

---

## CONTEXT: WAT DE VIDEO LEERT

De video behandelt 11 UI/UX-concepten die samen het verschil maken tussen "netjes" en "professioneel":

| # | Concept | Kern | Status peuterplannen.nl |
|---|---------|------|------------------------|
| 1 | **Signifiers** | UI-elementen communiceren hun functie zonder instructies | Gedeeltelijk — nav active state bestaat, maar buttons missen duidelijke hover/active/disabled signalen |
| 2 | **Visual Hierarchy** | Grootte, positie en kleur bepalen prioriteit | Goed — headings, cards, badges. Kan scherper. |
| 3 | **Grids & White Space** | 4-point grid, consistent spacing, ruimte laten ademen | Tokens bestaan maar worden niet overal consistent gebruikt |
| 4 | **Typography** | Max 1-2 fonts, heading letter-spacing -2/-3%, line-height 110-120% | 4 fonts, geen letter-spacing tuning op headings, line-height te los |
| 5 | **Color** | 1 primary + ramp, semantic kleuren (blauw=trust, rood=danger, etc.) | Primary ramp incompleet, semantic kleuren niet gestructureerd |
| 6 | **Shadows & Depth** | Subtiele shadows, sterkte afhankelijk van context | Shadow tokens bestaan, maar niet gedifferentieerd per context |
| 7 | **Icons & Buttons** | Icons = line-height van font, ghost buttons, padding 2:1 | Badges bestaan, maar geen consistent icon-sizing systeem |
| 8 | **States & Feedback** | Elke button: default/hover/active/disabled. Elke input: focus/error/warning | Basis hover bestaat; geen loading, error, success states |
| 9 | **Micro Interactions** | Elke actie krijgt bevestiging (copy chip, save toast, etc.) | Minimaal — geen toasts, geen copy feedback, geen action confirmations |
| 10 | **Overlays** | Gradient/blur over images voor leesbare tekst | Niet aanwezig op hero images of locatiekaarten |

**Niet in scope:** Dark mode (bewuste keuze — de warme ivoor/terra look IS het merk).

---

## ARCHITECTUURPRINCIPES

### 1. Single Source of Truth: `design-system.css`
Alle visuele tokens, component-stijlen, animaties en interactiepatronen leven in `design-system.css`. Geen hardcoded waarden in generators of pagina-specifieke CSS. Als iets visueel verandert, verandert het op ONE plek.

### 2. Geen nieuwe bestanden tenzij strikt nodig
- Interactie-CSS → toevoegen aan `design-system.css`
- Interactie-JS → `pp-interactions.js` (nieuw, klein, ~100 regels)
- Fonts → vervang bestanden in `/fonts/`, update `fonts.css`
- Generators → passen HTML classes aan, geen inline styles

### 3. Progressive Enhancement
- Alles werkt zonder JS (CSS-first interactions)
- `prefers-reduced-motion` wordt overal gerespecteerd
- Nieuwe CSS features (View Transitions, `@starting-style`, Popover API) degraden graceful

### 4. Performance Budget
- **Fonts:** max 3 WOFF2 bestanden, ≤150KB totaal
- **CSS:** design-system.css groeit met max ~3KB (geminified)
- **JS:** pp-interactions.js max 2KB geminified
- **Geen externe dependencies** — alles vanilla

---

## UITVOERINGSSTRATEGIE: CLAUDE CODE + SUB-AGENTS

### Token-efficiëntie principes (uit Anthropic's Claude Code guide)

1. **Parallel sub-agents voor onafhankelijke fasen** — fasen die verschillende bestanden raken worden gelijktijdig uitgevoerd
2. **Explore-agents (Haiku) voor research** — goedkoop en snel voor file discovery
3. **Worktree isolation** — riskante wijzigingen in geïsoleerde git worktrees
4. **Compact na elke fase** — `/clear` of `/compact` tussen fasen om context schoon te houden
5. **Specifieke prompts** — elke sub-agent krijgt exacte bestandspaden en verwachte output

### Afhankelijkheidsgraaf

```
FASE 1 (Typography) ──────────────────────┐
FASE 2 (Color Ramp)  ─── PARALLEL ────────┤
FASE 3 (Spacing Grid) ────────────────────┤
                                           ▼
FASE 4 (Button & Input States) ───────────┐
FASE 5 (Card & Nav Interactions) PARALLEL ─┤
FASE 6 (Shadows & Overlays) ──────────────┤
                                           ▼
FASE 7 (Micro-interactions & Feedback) ───┐
FASE 8 (Icon System) ──── PARALLEL ───────┤
                                           ▼
FASE 9 (Scroll Animations & View Transitions)
                                           ▼
FASE 10 (CSS Modernization & Audit)
                                           ▼
FASE 11 (Generator Integration & Rollout)
                                           ▼
VERIFICATIE (full build + visuele audit)
```

### Sub-agent rolverdeling per fase

| Rol | Model | Tools | Wanneer |
|-----|-------|-------|---------|
| `researcher` | Haiku (Explore) | Read, Grep, Glob | Vooraf: inventariseer alle plekken waar wijziging nodig is |
| `implementer` | Opus 4.6 | Edit, Write, Read, Bash | Uitvoering: wijzig bestanden volgens spec |
| `verifier` | Sonnet | Read, Bash, Grep | Achteraf: `npm run build` + audits + grep voor hardcoded waarden |

---

## FASE 1: TYPOGRAPHY REVOLUTION

**Status:** `DONE`
**Agents:** `researcher` (inventariseer font-gebruik) → `implementer` (fonts + CSS) → `verifier` (build + visuele check)
**Prioriteit:** KRITIEK — typography is 90% van design (video: "design is mostly just text")
**Impact:** Van "netjes" naar "editorial premium"

### Achtergrond: waarom Fraunces

Onderzoek naar typography trends 2025/2026 toont een duidelijke beweging:
- **Serif revival** als tegenwicht tegen de "generieke AI-aesthetic" (Inter/Geist overal)
- **Variable fonts** zijn nu standaard — 1 bestand, alle weights + axes
- **"Wonky" en "warm"** fonts winnen van steriele geometrics
- **Fraunces** is specifiek ontworpen door Google om warm, menselijk en speels te voelen — perfect voor een kindersite

**Fraunces features:**
- Variable font met 4 axes: `wght` (weight), `SOFT` (softness), `WONK` (quirky letterforms), `opsz` (optical size)
- `WONK` axis maakt letters subtiel onregelmatig → voelt "handgemaakt" en anti-AI
- `SOFT` axis rondt hoeken af → warmer dan een standaard serif
- Self-hosted WOFF2: ~80KB voor ALLE weights en axes
- Open source (SIL), gratis, geen licentie-issues

### Stappen

#### 1.1 Download Fraunces Variable WOFF2

**Actie:** Download `Fraunces[SOFT,WONK,opsz,wght].woff2` van Google Fonts.

```bash
# Download via Google Fonts API (latin subset)
# Sla op als /fonts/fraunces-var.woff2
```

Verwijder na installatie:
- `/fonts/familjen-grotesk-500.woff2`
- `/fonts/familjen-grotesk-600.woff2`
- `/fonts/familjen-grotesk-700.woff2`
- `/fonts/plus-jakarta-sans-600.woff2`
- `/fonts/plus-jakarta-sans-700.woff2`
- `/fonts/plus-jakarta-sans-800.woff2`

**Netto effect:** 6 bestanden → 1 bestand. ~72KB → ~80KB. Meer flexibiliteit, minder requests.

#### 1.2 Overweeg DM Sans Variable

**Actie:** Download `DMSans[ital,opsz,wght].woff2` als variable font.

Verwijder na installatie:
- `/fonts/dm-sans-400.woff2`
- `/fonts/dm-sans-500.woff2`
- `/fonts/dm-sans-600.woff2`
- `/fonts/dm-sans-700.woff2`
- `/fonts/dm-sans-400-italic.woff2`

**Netto effect:** 5 bestanden → 1 bestand. ~50KB → ~45KB.

**Totaal fonts na upgrade:** 3 bestanden (Fraunces var + DM Sans var + Instrument Serif) ≈ 140KB.
**Totaal fonts nu:** 12 bestanden ≈ 135KB.
**Winst:** Bijna dezelfde grootte, 9 minder HTTP requests, vastly meer flexibiliteit.

#### 1.3 Update `fonts.css`

```css
/* fonts.css — PeuterPlannen web fonts (variable, WOFF2) */

/* Fraunces — Headings (variable: weight 100-900, SOFT 0-100, WONK 0-1, opsz 9-144) */
@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/fraunces-var.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                 U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* DM Sans — Body (variable: weight 100-1000, italic, optical size) */
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
  src: url('/fonts/dm-sans-var.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                 U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'DM Sans';
  font-style: italic;
  font-weight: 100 1000;
  font-display: swap;
  src: url('/fonts/dm-sans-var.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                 U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* Instrument Serif — Accent/Editorial italic (static, display only) */
@font-face {
  font-family: 'Instrument Serif';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/instrument-serif-italic.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
                 U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

#### 1.4 Update font tokens in `design-system.css`

```css
:root {
  /* Typography — Fonts */
  --pp-font-heading: 'Fraunces', Georgia, 'Times New Roman', serif;
  --pp-font-ui: 'DM Sans', -apple-system, sans-serif;
  --pp-font-body: 'DM Sans', -apple-system, sans-serif;
  --pp-font-accent: 'Instrument Serif', Georgia, 'Times New Roman', serif;
}
```

**Let op:** `--pp-font-heading` verandert van sans-serif naar serif. Dit is de grootste visuele shift en precies wat de trends 2025/2026 voorschrijven: serif headings + sans body = editorial contrast.

#### 1.5 Fluid type scale met clamp()

Vervang de statische `--pp-text-*` tokens door fluid clamp waarden:

```css
:root {
  /* Typography — Fluid Scale (Minor Third ratio 1.2, base 16px) */
  --pp-text-xs:  clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem);     /* 12→13px */
  --pp-text-sm:  clamp(0.8125rem, 0.76rem + 0.25vw, 0.875rem);   /* 13→14px */
  --pp-text-base: clamp(0.9375rem, 0.88rem + 0.35vw, 1.0625rem); /* 15→17px */
  --pp-text-lg:  clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem);     /* 17→20px */
  --pp-text-xl:  clamp(1.25rem, 1rem + 1.2vw, 1.75rem);          /* 20→28px */
  --pp-text-2xl: clamp(1.5rem, 1.1rem + 2vw, 2.5rem);            /* 24→40px */
  --pp-text-3xl: clamp(2rem, 1.2rem + 3.5vw, 3.5rem);            /* 32→56px */
  --pp-text-4xl: clamp(2.5rem, 1.2rem + 5vw, 4.5rem);            /* 40→72px */
}
```

#### 1.6 Heading typography tuning

Dit is de "hack" uit de video: letter-spacing verlagen + line-height verlagen op headings maakt tekst instant professioneler.

```css
/* Heading defaults */
h1, h2, h3, h4, h5, h6,
.pp-heading {
  font-family: var(--pp-font-heading);
  font-optical-sizing: auto;
  text-wrap: balance;
}

/* Fraunces variable font tuning per heading level */
h1, .pp-h1 {
  font-size: var(--pp-text-4xl);
  font-weight: 750;                    /* Variable font: between bold and extra-bold */
  letter-spacing: -0.035em;            /* Video: -2% to -3% op headers */
  line-height: 1.08;                   /* Video: 110-120% */
  font-variation-settings: 'SOFT' 50, 'WONK' 1;  /* Warm + subtiel speels */
}

h2, .pp-h2 {
  font-size: var(--pp-text-3xl);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.12;
  font-variation-settings: 'SOFT' 40, 'WONK' 1;
}

h3, .pp-h3 {
  font-size: var(--pp-text-2xl);
  font-weight: 650;                    /* Variable font: semi-bold+ */
  letter-spacing: -0.02em;
  line-height: 1.18;
  font-variation-settings: 'SOFT' 30, 'WONK' 1;
}

h4, .pp-h4 {
  font-size: var(--pp-text-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.22;
}

h5, .pp-h5 {
  font-size: var(--pp-text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

/* Body text */
body {
  font-family: var(--pp-font-body);
  font-size: var(--pp-text-base);
  line-height: 1.65;                   /* Leesbaarheid voor body */
  font-optical-sizing: auto;
}

p, li {
  text-wrap: pretty;                   /* Voorkomt weeswoorden */
  max-width: 65ch;                     /* Optimale regellengte */
}

/* Accent text (editorial italic) */
.accent, .pp-accent {
  font-family: var(--pp-font-accent);
  font-style: italic;
}
```

#### 1.7 Fallback font metrics (voorkom layout shift)

```css
/* Fallback metrics zodat de pagina niet springt bij font-swap */
@font-face {
  font-family: 'Fraunces Fallback';
  src: local('Georgia');
  size-adjust: 105%;
  ascent-override: 95%;
  descent-override: 22%;
  line-gap-override: 0%;
}

@font-face {
  font-family: 'DM Sans Fallback';
  src: local('Arial');
  size-adjust: 106%;
  ascent-override: 92%;
  descent-override: 23%;
  line-gap-override: 0%;
}
```

Update de font-stacks:
```css
--pp-font-heading: 'Fraunces', 'Fraunces Fallback', Georgia, serif;
--pp-font-body: 'DM Sans', 'DM Sans Fallback', -apple-system, sans-serif;
```

#### 1.8 Preload critical fonts

**Bestand:** `.scripts/lib/html-shared.js` (headCommon functie)

```html
<link rel="preload" href="/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dm-sans-var.woff2" as="font" type="font/woff2" crossorigin>
```

Instrument Serif wordt NIET gepreload — het is een accent font en verschijnt pas later op de pagina.

#### 1.9 Update backward-compatible aliases

In `design-system.css` de aliassen updaten:
```css
--font-heading: var(--pp-font-heading);  /* nu serif i.p.v. sans */
--font-ui: var(--pp-font-body);          /* DM Sans, was Plus Jakarta Sans */
--font-body: var(--pp-font-body);
--font-accent: var(--pp-font-accent);
```

#### 1.10 Grep & vervang hardcoded font references

**Agent taak:** `researcher` (Explore) zoekt alle bestanden met hardcoded font-names:
```
grep -r "Familjen Grotesk\|Plus Jakarta Sans" --include="*.js" --include="*.css" --include="*.html"
```

Alle resultaten updaten naar `var(--pp-font-heading)` of `var(--pp-font-body)`.

### Verificatie
- `npm run build` succesvol
- Geen referenties naar Familjen Grotesk of Plus Jakarta Sans in output
- `fonts/` bevat exact 3 bestanden
- Visuele check: headings zijn nu serif (Fraunces) met strakke letter-spacing

---

## FASE 2: COLOR SYSTEM — VOLLEDIGE RAMP + SEMANTIC KLEUREN

**Status:** `DONE`
**Agents:** `implementer` (design-system.css) — klein en gefocust
**Prioriteit:** HOOG
**Parallel met:** Fase 1 en Fase 3

### Achtergrond (uit de video)

> "Start with one primary color. Lighten it for backgrounds, darken it for text. Build a color ramp. Use semantic colors: blue for trust, red for danger, yellow for warning, green for success."

PeuterPlannen heeft al een primary (#D4775A) en feedback kleuren, maar de ramp is incompleet en er ontbreken tints voor UI-componenten.

### Stappen

#### 2.1 Voeg primary color ramp toe

```css
:root {
  /* Primary ramp (coral/terra) — 10 stappen */
  --pp-primary-50:  #FDF1ED;   /* achtergronden, highlights */
  --pp-primary-100: #FBDDD2;   /* lichte badges, hover bg */
  --pp-primary-200: #F5B8A4;   /* border-hover, subtle indicators */
  --pp-primary-300: #E8957A;   /* icons, secondary text in primary context */
  --pp-primary-400: #D4775A;   /* === PRIMARY === buttons, links */
  --pp-primary-500: #C46A4F;   /* hover state */
  --pp-primary-600: #B35D42;   /* active/pressed state */
  --pp-primary-700: #8F4A35;   /* dark text in primary context */
  --pp-primary-800: #6B3828;   /* heading text op lichte primary bg */
  --pp-primary-900: #472518;   /* zwaarste contrast */

  /* Aliases (backward compatible) */
  --pp-primary: var(--pp-primary-400);
  --pp-primary-light: var(--pp-primary-50);
  --pp-primary-dark: var(--pp-primary-600);
  --pp-primary-hover: var(--pp-primary-500);
}
```

#### 2.2 Voeg secondary (teal) en accent (gold) ramps toe

Zelfde structuur: 50-900 in stappen van 100. De exacte waarden afleiden van de bestaande teal (#6B9590) en gold (#E8B870).

```css
:root {
  /* Secondary ramp (teal) */
  --pp-secondary-50:  #E8F2F0;
  --pp-secondary-100: #C5DDD9;
  --pp-secondary-200: #9CC5BF;
  --pp-secondary-300: #7EB0A9;
  --pp-secondary-400: #6B9590;  /* === SECONDARY === */
  --pp-secondary-500: #5A8580;
  --pp-secondary-600: #4A7A76;
  --pp-secondary-700: #3A615D;
  --pp-secondary-800: #2A4844;
  --pp-secondary-900: #1A302C;

  /* Accent ramp (gold) */
  --pp-accent-50:  #FEF6E8;
  --pp-accent-100: #FCEACC;
  --pp-accent-200: #F5D89D;
  --pp-accent-300: #F0C87A;
  --pp-accent-400: #E8B870;   /* === ACCENT === */
  --pp-accent-500: #D9A85E;
  --pp-accent-600: #C49A52;
  --pp-accent-700: #A07E3F;
  --pp-accent-800: #7A5F2E;
  --pp-accent-900: #53401F;
}
```

#### 2.3 Structureer semantic kleuren expliciet

De video benadrukt: "Use color for purpose, not decoration."

```css
:root {
  /* Semantic colors — expliciet benoemd naar functie */
  --pp-semantic-success: #2D8B5E;
  --pp-semantic-success-bg: #E8F5EF;
  --pp-semantic-success-border: rgba(45, 139, 94, 0.25);

  --pp-semantic-error: #C0392B;
  --pp-semantic-error-bg: #FDEDED;
  --pp-semantic-error-border: rgba(192, 57, 43, 0.25);

  --pp-semantic-warning: #D4A017;
  --pp-semantic-warning-bg: #FFF8E1;
  --pp-semantic-warning-border: rgba(212, 160, 23, 0.25);

  --pp-semantic-info: #2F586F;
  --pp-semantic-info-bg: #EAF2F7;
  --pp-semantic-info-border: rgba(47, 88, 111, 0.25);
}
```

#### 2.4 Type-kleuren consistent maken

De 8 type-kleuren (play, farm, nature, etc.) zijn goed maar missen een lichte variant voor badges/backgrounds:

```css
:root {
  /* Per type: basis + lichte bg variant */
  --pp-type-play:      #52B788;  --pp-type-play-bg:      rgba(82, 183, 136, 0.10);
  --pp-type-farm:      #8B6F47;  --pp-type-farm-bg:      rgba(139, 111, 71, 0.10);
  --pp-type-nature:    #2D6A4F;  --pp-type-nature-bg:    rgba(45, 106, 79, 0.10);
  --pp-type-museum:    #7B2D8B;  --pp-type-museum-bg:    rgba(123, 45, 139, 0.10);
  --pp-type-culture:   #5B3F8B;  --pp-type-culture-bg:   rgba(91, 63, 139, 0.10);
  --pp-type-swim:      #2196F3;  --pp-type-swim-bg:      rgba(33, 150, 243, 0.10);
  --pp-type-pancake:   #E9C46A;  --pp-type-pancake-bg:   rgba(233, 196, 106, 0.12);
  --pp-type-horeca:    #E76F51;  --pp-type-horeca-bg:    rgba(231, 111, 81, 0.10);
}
```

### Verificatie
- Alle kleuren gedefinieerd in design-system.css, nergens anders
- `grep -r "#D4775A\|#6B9590\|#E8B870" --include="*.css"` → alleen design-system.css

---

## FASE 3: SPACING & GRID DISCIPLINE

**Status:** `DONE`
**Agents:** `implementer` (design-system.css + style.css audit)
**Prioriteit:** HOOG
**Parallel met:** Fase 1 en Fase 2

### Achtergrond (uit de video)

> "Everything is a multiple [of 4], not because it inherently looks better, but because you can always split things in half, which creates consistency."

### Stappen

#### 3.1 Verifieer dat alle spacing tokens multiples van 4 zijn

Huidige tokens:
```css
--pp-space-xs: 4px;   /* ✓ 4×1 */
--pp-space-sm: 8px;   /* ✓ 4×2 */
--pp-space-md: 16px;  /* ✓ 4×4 */
--pp-space-lg: 24px;  /* ✓ 4×6 */
--pp-space-xl: 32px;  /* ✓ 4×8 */
--pp-space-2xl: 48px; /* ✓ 4×12 */
```

Voeg ontbrekende stappen toe:
```css
--pp-space-3xl: 64px;  /* 4×16 — sectie spacing */
--pp-space-4xl: 96px;  /* 4×24 — grote sectie gaps */
--pp-space-5xl: 128px; /* 4×32 — hero/footer padding */
```

#### 3.2 Audit hardcoded spacing in style.css en app.css

**Agent taak:** `researcher` grep alle CSS bestanden voor pixel-waarden die GEEN multiple van 4 zijn:

```bash
# Vind spacing die niet 4-point aligned is
grep -oP '(?:padding|margin|gap|top|bottom|left|right):\s*\d+px' style.css app.css
```

Corrigeer waarden naar dichtstbijzijnde multiple van 4. Voorbeelden:
- `padding: 22px` → `padding: 24px` (var(--pp-space-lg))
- `gap: 18px` → `gap: 16px` (var(--pp-space-md))
- `margin: 13px` → `margin: 12px` (var(--pp-space-md) - 4px, of custom)

**Uitzondering:** Border-width, border-radius, en font-sizes hoeven NIET op 4-point grid te zitten.

#### 3.3 Voeg section spacing utilities toe

```css
/* Section spacing — consistent vertical rhythm */
.pp-section {
  padding-block: var(--pp-space-3xl);  /* 64px boven+onder */
}
.pp-section-lg {
  padding-block: var(--pp-space-4xl);  /* 96px */
}
.pp-section-sm {
  padding-block: var(--pp-space-xl);   /* 32px */
}

/* Content container */
.pp-container {
  max-width: var(--pp-max-width);
  margin-inline: auto;
  padding-inline: var(--pp-space-md);  /* 16px gutter */
}
```

### Verificatie
- Alle spacing in style.css gebruikt `var(--pp-space-*)` tokens of expliciete 4px multiples
- Geen "magic numbers" voor spacing

---

## FASE 4: BUTTON & INPUT STATES — COMPLETE STATE MATRIX

**Status:** `DONE`
**Agents:** `implementer` (design-system.css uitbreiden)
**Prioriteit:** HOOG — de video noemt dit expliciet: "every button needs at least four states"
**Afhankelijk van:** Fase 2 (semantic kleuren)

### Achtergrond (uit de video)

> "A good rule of design is when a user does anything, there should be a response. Every button needs at least four states: default, hovered, active/pressed, and disabled. Sometimes loading too. Inputs are even more critical."

### Stappen

#### 4.1 Button focus-visible state

Huidige buttons missen een zichtbare focus state voor keyboard-navigatie:

```css
/* Toevoegen aan design-system.css */
.pp-btn:focus-visible {
  outline: 2.5px solid var(--pp-primary);
  outline-offset: 3px;
}
```

#### 4.2 Button loading state

```css
.pp-btn[aria-busy="true"] {
  position: relative;
  color: transparent;
  pointer-events: none;
  cursor: wait;
}
.pp-btn[aria-busy="true"]::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: pp-spin 0.6s linear infinite;
}
/* Inverted spinner color for secondary/ghost buttons */
.pp-btn-secondary[aria-busy="true"]::after,
.pp-btn-ghost[aria-busy="true"]::after {
  border-color: rgba(45, 41, 38, 0.15);
  border-top-color: var(--pp-text);
}

@keyframes pp-spin {
  to { transform: rotate(360deg); }
}
```

**HTML:** `<button class="pp-btn pp-btn-accent" aria-busy="true">Opslaan</button>`
**JS:** Toggle `aria-busy="true"` bij klik, verwijder bij response.

#### 4.3 Input validation states

```css
/* Error state */
.pp-input[aria-invalid="true"],
.pp-input.is-error {
  border-color: var(--pp-semantic-error);
  box-shadow: 0 0 0 3px var(--pp-semantic-error-border);
}
.pp-input[aria-invalid="true"]:focus {
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.22);
}

/* Success state */
.pp-input.is-valid {
  border-color: var(--pp-semantic-success);
  box-shadow: 0 0 0 3px var(--pp-semantic-success-border);
}

/* Warning state */
.pp-input.is-warning {
  border-color: var(--pp-semantic-warning);
  box-shadow: 0 0 0 3px var(--pp-semantic-warning-border);
}

/* Field error message (slide-down) */
.pp-field-error {
  color: var(--pp-semantic-error);
  font-size: var(--pp-text-xs);
  font-weight: 500;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.25s ease, opacity 0.2s ease, margin 0.25s ease;
  margin-top: 0;
}
.pp-field-error.is-visible {
  max-height: 3em;
  opacity: 1;
  margin-top: var(--pp-space-xs);
}
```

**Accessibility:**
- `aria-invalid="true"` op input
- `aria-describedby="field-error-id"` linkt input aan foutmelding
- `role="alert"` op foutmelding voor screen readers

#### 4.4 Ghost button variant versterken

De video beschrijft ghost buttons als "sidebar links without a background until you hover." Dit is al aanwezig als `.pp-btn-ghost` maar de hover kan subtieler:

```css
/* Ghost button enhanced — sidebar/nav style */
.pp-btn-ghost {
  background: transparent;
  color: var(--pp-text-secondary);
  padding: 8px 12px;
  border-radius: var(--pp-radius-xs);
}
.pp-btn-ghost:hover:not([disabled]) {
  background: rgba(212, 119, 90, 0.06);  /* Warm tint, niet koud grijs */
  color: var(--pp-text);
}
.pp-btn-ghost:active:not([disabled]) {
  background: rgba(212, 119, 90, 0.12);
}
```

#### 4.5 Button padding ratio (uit de video)

> "A good guideline for padding is to double the height for the width."

```css
/* Padding tokens voor buttons */
.pp-btn {
  padding: 10px 20px;        /* 1:2 ratio ✓ */
}
.pp-btn-sm {
  padding: 7px 14px;         /* 1:2 ratio */
  font-size: var(--pp-text-xs);
}
.pp-btn-lg {
  padding: 14px 28px;        /* 1:2 ratio */
  font-size: var(--pp-text-base);
}
```

### Verificatie
- Elke `.pp-btn` variant heeft 5 visuele states: default, hover, active, disabled, loading
- Elke `.pp-input` heeft 4 states: default, focus, error, success
- `aria-busy` en `aria-invalid` worden correct ondersteund
- `prefers-reduced-motion` disables de spinner animation

---

## FASE 5: CARD & NAVIGATION INTERACTIONS

**Status:** `DONE`
**Agents:** `implementer` (design-system.css + nav-floating.css)
**Prioriteit:** HOOG
**Parallel met:** Fase 4

### Stappen

#### 5.1 Card hover refinement

De bestaande card hover (translateY -3px + shadow) is goed. Toevoegen:

```css
/* Warm border glow bij hover */
.pp-card-interactive:hover {
  border-color: var(--pp-primary-200);
}

/* Title kleurshift bij hover (subtle signifier) */
.pp-card-interactive:hover .pp-card-title,
.pp-location-card:hover h3 {
  color: var(--pp-primary);
  transition: color var(--pp-transition);
}

/* Full-card click area (geen JS nodig) */
.pp-card-interactive { position: relative; }
.pp-card-interactive a.pp-card-link::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* Image zoom in card bij hover */
.pp-card-img {
  overflow: hidden;
  border-radius: var(--pp-radius-sm);
}
.pp-card-interactive:hover .pp-card-img img {
  transform: scale(1.04);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
```

#### 5.2 Nav active link indicator (animated underline)

```css
/* Animated underline die schuift tussen links */
.nav-link {
  position: relative;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 10px;
  right: 10px;
  height: 2px;
  background: var(--pp-primary);
  border-radius: 1px;
  transform: scaleX(0);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
}
.nav-link.active::after,
.nav-link:hover::after {
  transform: scaleX(1);
}
```

#### 5.3 Navbar shrink bij scroll

Subtiele verkleining van de nav bij scrollen. CSS-class getoggeld door minimale JS:

```css
nav.scrolled .nav-inner {
  height: 48px;
  transition: height 0.25s ease;
}
nav.scrolled .nav-logo svg {
  width: 28px;
  height: 28px;
  transition: width 0.25s ease, height 0.25s ease;
}
```

**JS (IntersectionObserver, geen scroll listener):**
```javascript
// In pp-interactions.js
const sentinel = document.createElement('div');
sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none';
document.body.prepend(sentinel);

new IntersectionObserver(([e]) => {
  document.querySelector('nav')?.classList.toggle('scrolled', !e.isIntersecting);
}).observe(sentinel);
```

### Verificatie
- Card hover: border glow + title color shift + shadow lift
- Nav link: animated underline op hover en active
- Nav shrink: werkt via IntersectionObserver (geen scroll listener)

---

## FASE 6: SHADOWS, DEPTH & OVERLAYS

**Status:** `DONE`
**Agents:** `implementer` (design-system.css + generators)
**Prioriteit:** HOOG
**Parallel met:** Fase 4 en 5

### Achtergrond (uit de video)

> "Shadows are a fantastic tool. Reduce opacity and dial up the blur. Cards require less, while popovers need stronger. If the shadow is the first thing you notice, you're not using it right."

> "Add a linear gradient overlay for text readable backgrounds. Or a progressive blur for a modern look."

### Stappen

#### 6.1 Shadow tokens verfijnen per context

```css
:root {
  /* Shadows gedifferentieerd per context (video principle) */
  --pp-shadow-card:    0 2px 8px rgba(45, 41, 38, 0.06),
                       0 1px 3px rgba(45, 41, 38, 0.04);
  --pp-shadow-card-hover: 0 12px 32px rgba(45, 41, 38, 0.10),
                          0 4px 12px rgba(45, 41, 38, 0.05);
  --pp-shadow-popover: 0 16px 48px rgba(45, 41, 38, 0.16),
                       0 4px 16px rgba(45, 41, 38, 0.08);
  --pp-shadow-modal:   0 24px 64px rgba(45, 41, 38, 0.20),
                       0 8px 24px rgba(45, 41, 38, 0.10);
  --pp-shadow-nav:     0 1px 4px rgba(45, 41, 38, 0.06);

  /* Inner shadow voor tactile/pressed effect */
  --pp-shadow-inset:   inset 0 2px 4px rgba(45, 41, 38, 0.08);
}
```

Update bestaande componenten:
```css
.pp-card { box-shadow: var(--pp-shadow-card); }
.pp-card-interactive:hover { box-shadow: var(--pp-shadow-card-hover); }
.pp-location-card { box-shadow: var(--pp-shadow-card); }
.pp-location-card:hover { box-shadow: var(--pp-shadow-card-hover); }
```

#### 6.2 Image overlay gradient (voor hero en kaarten met tekst)

```css
/* Linear gradient overlay voor tekst over images */
.pp-img-overlay {
  position: relative;
}
.pp-img-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(45, 41, 38, 0.75) 0%,
    rgba(45, 41, 38, 0.25) 40%,
    transparent 70%
  );
  border-radius: inherit;
  pointer-events: none;
}

/* Progressive blur variant (modern, voor hero sections) */
.pp-img-overlay-blur::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(250, 247, 242, 0.95) 0%,
    rgba(250, 247, 242, 0.5) 40%,
    transparent 70%
  );
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  mask-image: linear-gradient(to top, black 0%, black 30%, transparent 70%);
  -webkit-mask-image: linear-gradient(to top, black 0%, black 30%, transparent 70%);
  border-radius: inherit;
  pointer-events: none;
}
```

#### 6.3 Tactile button effect (raised/pressed)

Uit de video: inner + outer shadows voor "raised tactile buttons."

```css
/* Tactile button — raised look */
.pp-btn-tactile {
  box-shadow: 0 4px 0 var(--pp-primary-600),
              0 6px 12px rgba(45, 41, 38, 0.15);
  transform: translateY(0);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.pp-btn-tactile:hover:not([disabled]) {
  transform: translateY(-1px);
  box-shadow: 0 5px 0 var(--pp-primary-600),
              0 8px 16px rgba(45, 41, 38, 0.18);
}
.pp-btn-tactile:active:not([disabled]) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--pp-primary-600),
              0 2px 4px rgba(45, 41, 38, 0.10);
}
```

### Verificatie
- Cards gebruiken `--pp-shadow-card`, niet de generieke `--pp-shadow-sm`/`--pp-shadow-md`
- Hero sections met tekst over images hebben gradient overlay
- Shadows zijn subtiel — als je ze opmerkt, zijn ze te sterk

---

## FASE 7: MICRO-INTERACTIONS & FEEDBACK SYSTEEM

**Status:** `DONE`
**Agents:** `implementer` (design-system.css + nieuw pp-interactions.js)
**Prioriteit:** HOOG — dit is het grootste verschil met de huidige site
**Afhankelijk van:** Fase 4 (states), Fase 6 (shadows)

### Achtergrond (uit de video)

> "Micro interactions are a form of feedback, but they step things up a notch. If we have this chip slide up, that's a micro interaction that confirms our action."

> "Every interaction needs a response. Loading spinners when data is fetching, success messages when an action completes."

### Stappen

#### 7.1 Toast notification systeem

**CSS toevoegen aan design-system.css:**

```css
/* Toast zone — vaste positie onderaan het scherm */
.pp-toast-zone {
  position: fixed;
  bottom: calc(var(--pp-safe-bottom) + 16px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--pp-space-sm);
  pointer-events: none;
}

/* Individuele toast */
.pp-toast {
  background: var(--pp-text);
  color: var(--pp-text-inverse);
  padding: 12px 20px;
  border-radius: var(--pp-radius-xs);
  font-family: var(--pp-font-body);
  font-size: var(--pp-text-sm);
  font-weight: 500;
  box-shadow: var(--pp-shadow-popover);
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--pp-space-sm);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease,
              transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Entry animation via @starting-style */
@starting-style {
  .pp-toast {
    opacity: 0;
    transform: translateY(12px);
  }
}

/* Exit */
.pp-toast.is-hiding {
  opacity: 0;
  transform: translateY(-8px);
}

/* Variants */
.pp-toast-success { background: var(--pp-semantic-success); }
.pp-toast-error   { background: var(--pp-semantic-error); }
.pp-toast-warning { background: var(--pp-semantic-warning); color: var(--pp-text); }
```

**JS in pp-interactions.js:**

```javascript
// Toast systeem
function ppToast(msg, type = 'default', duration = 3000) {
  let zone = document.querySelector('.pp-toast-zone');
  if (!zone) {
    zone = document.createElement('div');
    zone.className = 'pp-toast-zone';
    zone.setAttribute('aria-live', 'polite');
    document.body.append(zone);
  }
  const t = document.createElement('div');
  t.className = `pp-toast pp-toast-${type}`;
  t.textContent = msg;
  t.setAttribute('role', 'status');
  zone.append(t);

  setTimeout(() => {
    t.classList.add('is-hiding');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, duration);
}

// Expose globally
window.ppToast = ppToast;
```

#### 7.2 Copy-to-clipboard feedback

```css
/* Copy button met slide-swap */
.pp-copy-btn { position: relative; overflow: hidden; }

.pp-copy-btn__label,
.pp-copy-btn__done {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.2s ease;
}
.pp-copy-btn__done {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pp-semantic-success);
  font-weight: 600;
  opacity: 0;
  transform: translateY(100%);
}
.pp-copy-btn.is-copied .pp-copy-btn__label {
  opacity: 0;
  transform: translateY(-100%);
}
.pp-copy-btn.is-copied .pp-copy-btn__done {
  opacity: 1;
  transform: translateY(0);
}
```

**JS in pp-interactions.js:**

```javascript
// Copy buttons
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.pp-copy-btn');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.classList.add('is-copied');
    btn.setAttribute('aria-label', 'Gekopieerd');
    setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.removeAttribute('aria-label');
    }, 2000);
  } catch { /* graceful fallback */ }
});
```

#### 7.3 Animated checkmark (SVG)

```css
/* CSS-only checkmark draw */
.pp-checkmark {
  width: 20px;
  height: 20px;
  stroke: var(--pp-semantic-success);
  stroke-width: 2.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: pp-draw-check 0.4s 0.15s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes pp-draw-check {
  to { stroke-dashoffset: 0; }
}
```

**HTML:** `<svg class="pp-checkmark" viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg>`

#### 7.4 Favorieten hartje animatie (app.html)

Wanneer een gebruiker een locatie als favoriet markeert:

```css
/* Heart bounce */
.pp-heart-btn.is-active svg {
  animation: pp-heart-pop 0.35s cubic-bezier(0.17, 0.89, 0.32, 1.49);
  fill: var(--pp-primary);
  stroke: var(--pp-primary);
}
@keyframes pp-heart-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.3); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
```

#### 7.5 Skeleton loader tokens (warm, niet grijs)

Update bestaande shimmer in app.css om design-system kleuren te gebruiken:

```css
/* Warm skeleton — past bij het merk */
.pp-skeleton {
  background: linear-gradient(
    90deg,
    var(--pp-primary-50) 0%,
    rgba(212, 119, 90, 0.06) 40%,
    var(--pp-primary-50) 80%
  );
  background-size: 300% 100%;
  animation: pp-shimmer 1.8s ease-in-out infinite;
  border-radius: var(--pp-radius-xs);
}
@keyframes pp-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* Shape variants */
.pp-skeleton-text  { height: 14px; margin-bottom: 10px; }
.pp-skeleton-text:last-child { width: 65%; }
.pp-skeleton-title { height: 22px; width: 60%; margin-bottom: 14px; }
.pp-skeleton-img   { aspect-ratio: 16/9; width: 100%; }
.pp-skeleton-pill  { height: 32px; width: 80px; border-radius: var(--pp-radius-pill); }
```

### Verificatie
- `ppToast('Test', 'success')` in browser console toont toast met slide-up
- Copy buttons op locatiepagina's tonen "Gekopieerd!" feedback
- Favoriet hartje bounced bij klik
- Skeleton loaders gebruiken warme primaire tint (niet grijs)
- Alles werkt in `prefers-reduced-motion: reduce` (geen animatie, wel functie)

---

## FASE 8: ICON SYSTEM CONSISTENTIE

**Status:** `DONE`
**Agents:** `researcher` (inventariseer alle icon-gebruik) → `implementer` (design-system.css + html-shared.js)
**Prioriteit:** MEDIUM-HOOG
**Parallel met:** Fase 7

### Achtergrond (uit de video)

> "Get the line height of your font, in this case 24px, and make the icons the same size. Then tighten up the text."

### Stappen

#### 8.1 Icon sizing tokens

```css
:root {
  /* Icon sizes — matched aan line-heights */
  --pp-icon-xs: 16px;   /* bij text-xs/sm */
  --pp-icon-sm: 20px;   /* bij text-base */
  --pp-icon-md: 24px;   /* bij text-lg/xl — standaard */
  --pp-icon-lg: 32px;   /* bij text-2xl */
  --pp-icon-xl: 48px;   /* decoratief / hero */
}
```

#### 8.2 Icon+text alignment utility

```css
/* Icon naast tekst — altijd verticaal gecentreerd, zelfde hoogte als line-height */
.pp-icon-text {
  display: inline-flex;
  align-items: center;
  gap: var(--pp-space-xs);
}
.pp-icon-text svg {
  width: var(--pp-icon-md);
  height: var(--pp-icon-md);
  flex-shrink: 0;
}
.pp-icon-text-sm svg {
  width: var(--pp-icon-sm);
  height: var(--pp-icon-sm);
}
```

#### 8.3 Audit bestaande SVG icons op consistente sizing

**Agent taak:** `researcher` grep alle inline SVGs in generators en check width/height attributen.

Verwachte fix: alle badge-iconen (coffee, diaper, alcohol) in `html-shared.js` unified naar `--pp-icon-sm` (20px).

### Verificatie
- Alle icons in badge-rij dezelfde hoogte
- Icons verticaal gecentreerd met adjacent text
- Geen hardcoded icon sizes in generators

---

## FASE 9: SCROLL ANIMATIONS & VIEW TRANSITIONS

**Status:** `TODO`
**Agents:** `implementer` (design-system.css + pp-interactions.js)
**Prioriteit:** MEDIUM-HOOG
**Afhankelijk van:** Fase 7 (animations foundation)

### Stappen

#### 9.1 Scroll reveal systeem

```css
/* Reveal base state — hidden */
.pp-reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.pp-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.pp-reveal-stagger.is-visible > * {
  opacity: 1;
  transform: translateY(0);
}
.pp-reveal-stagger > * {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.pp-reveal-stagger.is-visible > *:nth-child(1) { transition-delay: 0s; }
.pp-reveal-stagger.is-visible > *:nth-child(2) { transition-delay: 0.07s; }
.pp-reveal-stagger.is-visible > *:nth-child(3) { transition-delay: 0.14s; }
.pp-reveal-stagger.is-visible > *:nth-child(4) { transition-delay: 0.21s; }
.pp-reveal-stagger.is-visible > *:nth-child(n+5) { transition-delay: 0.28s; }
```

**JS in pp-interactions.js:**

```javascript
// Scroll reveal — single IntersectionObserver, fires once per element
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.pp-reveal, .pp-reveal-stagger')
          .forEach(el => revealObs.observe(el));
}
```

#### 9.2 View Transitions verbeteren

De bestaande View Transitions setup (`@view-transition { navigation: auto; }`) is correct. Voeg named transitions toe voor specifieke elementen:

```css
/* Named transitions voor hero images op locatiepagina's */
.location-hero-img {
  view-transition-name: hero-img;
}

::view-transition-old(hero-img) {
  animation: vt-fade-out 120ms ease-in both;
}
::view-transition-new(hero-img) {
  animation: pp-fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 60ms;
}
```

#### 9.3 Generator updates — reveal classes toevoegen

**Bestanden:** Alle generators in `.scripts/lib/generators/`

Voeg `pp-reveal` en `pp-reveal-stagger` classes toe aan:
- Stadspagina's: `.guide-section` → `class="guide-section pp-reveal-stagger"`
- Type-pagina's: locatie grid → `pp-reveal-stagger`
- Locatiepagina's: info-secties → `pp-reveal`
- Homepage: elke sectie → `pp-reveal`
- Blog: content blocks → `pp-reveal`

**Regel:** Nooit de hero/first-fold content als reveal markeren — dat moet instant zichtbaar zijn.

### Verificatie
- Secties faden zachtjes in bij scrollen
- Eerste viewport is instant zichtbaar (geen flash)
- `prefers-reduced-motion` → alles direct zichtbaar
- View Transitions werken bij pagina-navigatie (Chrome/Safari)

---

## FASE 10: CSS MODERNIZATION

**Status:** `TODO`
**Agents:** `implementer` (design-system.css + style.css)
**Prioriteit:** MEDIUM
**Parallel met:** Fase 9

### Stappen

#### 10.1 text-wrap: balance & pretty

```css
/* Toevoegen aan heading defaults */
h1, h2, h3, h4, h5, h6 { text-wrap: balance; }
p, li { text-wrap: pretty; }
```

**Browser support:** Chrome 114+, Firefox 121+, Safari 17.5+. Progressieve verbetering — geen fallback nodig.

#### 10.2 font-optical-sizing

```css
body {
  font-optical-sizing: auto;
}
```

Fraunces heeft een `opsz` axis — bij kleine tekst worden streken dikker, bij grote tekst dunner. Dit wordt automatisch geactiveerd.

#### 10.3 Verbeterde prefers-reduced-motion guard

Update de bestaande guard:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Waarom 0.01ms i.p.v. 0s:** `animationend`/`transitionend` events vuren nog steeds, zodat JS die daarvan afhankelijk is niet breekt.

#### 10.4 ::selection styling

```css
::selection {
  background: var(--pp-primary-200);
  color: var(--pp-primary-900);
}
```

#### 10.5 Smooth scroll (met motion guard)

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

#### 10.6 Focus-visible globaal

```css
:focus-visible {
  outline: 2.5px solid var(--pp-primary);
  outline-offset: 3px;
}
:focus:not(:focus-visible) {
  outline: none;
}
```

### Verificatie
- Headings wrappen gebalanceerd (geen korte laatste regel)
- Paragrafen vermijden weeswoorden
- Selectie-kleur matcht brand
- Tab-navigatie toont duidelijke focus ring

---

## FASE 11: GENERATOR INTEGRATION & DESIGN SYSTEM ROLLOUT

**Status:** `TODO`
**Agents:** `researcher` (inventariseer alle hardcoded waarden in generators) → meerdere `implementer` agents PARALLEL (1 per generator) → `verifier` (full build + audits)
**Prioriteit:** KRITIEK — dit is waar alles samenkomt
**Afhankelijk van:** Alle voorgaande fasen

### Achtergrond

De fasen 1-10 definiëren het design system. Deze fase past het toe op alle ~2200 gegenereerde pagina's door de generators te updaten.

### Stappen

#### 11.1 Inventarisatie: hardcoded waarden in generators

**Agent taak:** `researcher` zoekt in `.scripts/lib/generators/*.js` en `.scripts/lib/html-shared.js`:

```bash
# Zoek hardcoded hex kleuren
grep -rn '#[0-9A-Fa-f]\{3,6\}' .scripts/lib/ --include="*.js"

# Zoek hardcoded pixel waarden in inline styles
grep -rn 'style="[^"]*px' .scripts/lib/ --include="*.js"

# Zoek hardcoded font-families
grep -rn "font-family\|Familjen\|Plus Jakarta\|DM Sans" .scripts/lib/ --include="*.js"
```

#### 11.2 HTML shared components updaten

**Bestand:** `.scripts/lib/html-shared.js`

Wijzigingen:
- `headCommon()`: voeg font preloads toe (Fraunces + DM Sans variable)
- `headCommon()`: voeg `<link rel="stylesheet" href="/pp-interactions.css">` toe (of inline in design-system)
- `headCommon()`: voeg `<script src="/pp-interactions.js" defer></script>` toe
- `navHTML()`: voeg `pp-reveal` NIET toe aan nav (altijd zichtbaar)
- `footerHTML()`: voeg `pp-reveal` toe
- `supportHTML()`: voeg `pp-reveal` toe
- `newsletterHTML()`: voeg `pp-reveal` toe
- Badge SVG icons: unified naar `--pp-icon-sm` (20px)
- Alle inline styles vervangen door design system classes

#### 11.3 Homepage (`index.html`) updates

**Via generator of handmatig:**
- Hero section: voeg `pp-img-overlay-blur` toe als er een achtergrondafbeelding is
- City grid: `class="guide-section pp-reveal-stagger"`
- Type grid: `class="guide-section pp-reveal-stagger"`
- Cluster grid: `class="guide-section pp-reveal-stagger"`
- Stats section: `pp-reveal`
- CTA section: `pp-reveal`
- FAQ: `pp-reveal`
- Newsletter: `pp-reveal`

#### 11.4 Locatiepagina generator (`location-pages.js`)

- Type badge: gebruik `--pp-type-{type}-bg` als achtergrond
- "Link kopiëren" knop: voeg `pp-copy-btn` class toe met `data-copy` attribuut
- Share knop: voeg toast feedback toe via `ppToast()`
- Info secties: `pp-reveal` classes
- Related locations grid: `pp-reveal-stagger`
- Hero image (als aanwezig): `pp-img-overlay` class

#### 11.5 Stadspagina generator (`city-pages.js`)

- Locatie grid: `pp-reveal-stagger`
- Type filter chips: `pp-chip` classes (al aanwezig, verifieer states)
- Hero section: heading met Fraunces serif styling

#### 11.6 Type-pagina generator (`type-pages.js`)

- Zelfde patronen als stadspagina's
- FAQ sectie: `pp-reveal`

#### 11.7 Blog generator (`blog.js`)

- Content secties: `pp-reveal`
- Share buttons: `pp-copy-btn` voor link kopiëren
- Related posts: `pp-reveal-stagger`

#### 11.8 City+type generator (`city-type-pages.js`)

- Locatie grid: `pp-reveal-stagger`
- Breadcrumb: geen reveal (altijd zichtbaar)

#### 11.9 App.html updates

**Bestand:** `app.html`

- Filter chips: verifieer `pp-chip` states
- Locatie kaarten: `pp-card-interactive` hover effecten
- Favorieten: `pp-heart-btn` met bounce animatie
- Loading state: warm `pp-skeleton` tokens
- Toast feedback bij acties (favoriet, delen)

#### 11.10 pp-interactions.js samenstellen

Combineer alle JS uit fasen 5, 7, 9 in één bestand:

```javascript
// pp-interactions.js — PeuterPlannen micro-interactions (~100 regels)
// 1. Navbar scroll shrink (IntersectionObserver)
// 2. Scroll reveal (IntersectionObserver)
// 3. Toast system (ppToast)
// 4. Copy-to-clipboard
// Alles achter prefers-reduced-motion guard waar nodig
```

Dit bestand wordt `defer` geladen en is ~2KB geminified.

### Verificatie (KRITIEK)

```bash
# Full build
npm run build

# Audits
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_seo_quality.js --strict

# Geen hardcoded fonts
grep -rn "Familjen\|Plus Jakarta" --include="*.html" --include="*.css" --include="*.js" \
  | grep -v node_modules | grep -v fonts.css.bak

# Geen hardcoded kleuren in generators (alleen via tokens/classes)
grep -rn '#[0-9A-Fa-f]\{6\}' .scripts/lib/generators/ --include="*.js" | head -20

# Font file count
ls fonts/*.woff2 | wc -l  # moet 3 zijn

# Page count sanity
find . -name "index.html" -not -path "./node_modules/*" | wc -l  # moet ~2200 zijn
```

---

## FASE 12: DESIGN AUDIT TOOLING

**Status:** `TODO`
**Agents:** `implementer` (nieuw audit script)
**Prioriteit:** MEDIUM — future-proofing
**Afhankelijk van:** Fase 11

### Achtergrond

Om te garanderen dat toekomstige wijzigingen consistent blijven met het design system, voegen we een geautomatiseerde design audit toe aan de CI pipeline.

### Stappen

#### 12.1 Nieuw audit script: `audit_design_system.js`

**Bestand:** `.scripts/audit_design_system.js`

Dit script controleert de gegenereerde HTML op:

1. **Geen hardcoded hex kleuren in inline styles** — alles via CSS classes
2. **Geen hardcoded font-families** — alles via `var(--pp-font-*)`
3. **Geen hardcoded pixel spacing** in inline styles die niet op 4-point grid zitten
4. **Alle buttons hebben interactie-classes** (`pp-btn`, `pp-btn-*`)
5. **Alle forms hebben validation attributen** (`aria-invalid`, `aria-describedby`)
6. **Font bestanden tellen** — exact 3 WOFF2 bestanden in `/fonts/`
7. **CSS custom properties coverage** — percentage van design tokens dat daadwerkelijk gebruikt wordt

```javascript
// Pseudo-code
const checks = [
  { name: 'no-hardcoded-colors', pattern: /style="[^"]*#[0-9a-f]{3,6}/gi },
  { name: 'no-hardcoded-fonts', pattern: /style="[^"]*font-family/gi },
  { name: 'font-file-count', expected: 3 },
  { name: 'pp-interactions-loaded', pattern: /pp-interactions\.js/ },
];
```

#### 12.2 Toevoegen aan CI pipeline

**Bestand:** `.github/workflows/sync-site.yml`

```yaml
- name: Design system audit
  run: node .scripts/audit_design_system.js --strict
```

Dit draait na de build en voor de deploy — net als de bestaande 3 audit gates.

### Verificatie
- Audit script runt zonder warnings
- Eventuele toekomstige regressies worden direct gevangen

---

## FASE 13: PORTAL DESIGN SYSTEM ROLLOUT (ADMIN + PARTNER)

**Status:** `DONE`
**Agents:** `researcher` (inventariseer portal CSS/HTML) → 2 `implementer` agents PARALLEL (admin + partner) → `verifier`
**Prioriteit:** MEDIUM-HOOG
**Afhankelijk van:** Fase 1-10 (design tokens moeten stabiel zijn)

### Achtergrond

De admin portal (`admin/`) en partner portal (`partner/`) delen `portal-shell.css` (15KB) en `portal-shell.js` (7KB). Ze gebruiken nu eigen hardcoded kleuren, fonts en spacing die niet aansluiten bij het vernieuwde design system. Door ze mee te nemen wordt de merkervaring 100% consistent — of een bezoeker nu op de publieke site, het admin dashboard of het partner portaal zit.

### Stappen

#### 13.1 Portal-shell.css migreren naar design tokens

**Bestand:** `portal-shell.css`

- Vervang alle hardcoded hex kleuren door `var(--pp-*)` tokens
- Vervang `font-family` declaraties door `var(--pp-font-body)` / `var(--pp-font-heading)`
- Vervang hardcoded spacing door `var(--pp-space-*)` tokens
- Vervang hardcoded border-radius door `var(--pp-radius-*)` tokens
- Vervang hardcoded shadows door `var(--pp-shadow-*)` tokens

Specifieke mapping:
```css
/* Oud → Nieuw */
#eee          → var(--pp-border)
#ddd          → var(--pp-border)
#4caf50       → var(--pp-semantic-success)
#f44336       → var(--pp-semantic-error)
#2196f3       → var(--pp-semantic-info)
#e8f5e9       → var(--pp-semantic-success-bg)
#ffebee       → var(--pp-semantic-error-bg)
#e3f2fd       → var(--pp-semantic-info-bg)
var(--primary) → var(--pp-primary)
font-family: inherit → font-family: var(--pp-font-body)
```

#### 13.2 Portal buttons migreren naar pp-btn classes

**Bestanden:** `admin/index.html`, `admin/admin.js`, `partner/index.html`

- `.portal-button` → `.pp-btn .pp-btn-accent`
- `.portal-button:disabled` → via bestaande `.pp-btn[disabled]`
- Voeg loading state toe: `aria-busy="true"` bij API calls
- Voeg focus-visible toe (gratis via globale CSS uit Fase 10)

#### 13.3 Portal forms migreren naar pp-input classes

- `.portal-input` → `.pp-input`
- `.portal-select` → `.pp-select`
- `.portal-textarea` → `.pp-textarea`
- Voeg error/success states toe uit Fase 4 (`aria-invalid`, `.pp-field-error`)

#### 13.4 Portal alerts migreren naar toast systeem

- `.portal-alert-success` → `ppToast('Opgeslagen', 'success')`
- `.portal-alert-error` → `ppToast('Er ging iets mis', 'error')`
- `.portal-alert-info` → `ppToast('...', 'default')`
- Verwijder de statische alert-blokken, vervang door toast calls in JS

#### 13.5 Portal modals updaten

- `.portal-modal-content` → gebruik `--pp-shadow-modal`, `--pp-radius-md`, `--pp-surface`
- Voeg `pp-scale-in` animatie toe bij openen
- Focus trap en Esc-to-close blijven (al aanwezig in portal-shell.js)

#### 13.6 Portal typography updaten

- Portal headings: Fraunces (via `var(--pp-font-heading)`)
- Portal body: DM Sans (via `var(--pp-font-body)`)
- Zorg dat portals `design-system.css` en `fonts.css` laden (via `<link>`)

#### 13.7 Laad design-system.css + pp-interactions.js in portals

**Bestanden:** `admin/index.html`, `partner/index.html`

```html
<link rel="stylesheet" href="/design-system.css">
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/portal-shell.css">
<script src="/pp-interactions.js" defer></script>
```

Volgorde is belangrijk: design-system.css eerst (tokens), dan portal-shell.css (overrides).

### Verificatie
- `grep -rn '#[0-9A-Fa-f]\{6\}' portal-shell.css` → 0 resultaten
- Admin en partner portals laden correct met Fraunces headings en DM Sans body
- Buttons tonen alle 5 states (default, hover, active, disabled, loading)
- Toasts werken bij CRUD operaties
- Modals hebben design-system shadows en animaties
- Responsive: portals werken op mobile

---

## IMPLEMENTATIE-VOLGORDE (EXECUTIEPLAN)

### Sprint 1: Foundation (Fase 1+2+3 PARALLEL)

```
┌─ Agent A: Typography (Fase 1)
│  Files: fonts.css, design-system.css, fonts/, html-shared.js
│
├─ Agent B: Color Ramp (Fase 2)
│  Files: design-system.css (color tokens only)
│
└─ Agent C: Spacing Audit (Fase 3)
   Files: design-system.css (spacing tokens), style.css (audit)
```

**Duur:** 1 sessie
**Token strategie:** 3 parallel sub-agents in worktrees. Merge na verificatie.

### Sprint 2: Interactions (Fase 4+5+6 PARALLEL)

```
┌─ Agent D: Button & Input States (Fase 4)
│  Files: design-system.css (component section)
│
├─ Agent E: Card & Nav (Fase 5)
│  Files: design-system.css, nav-floating.css
│
└─ Agent F: Shadows & Overlays (Fase 6)
   Files: design-system.css (shadow section)
```

**Duur:** 1 sessie
**Token strategie:** 3 parallel sub-agents. Alle schrijven naar design-system.css maar verschillende secties.

### Sprint 3: Micro-interactions (Fase 7+8 PARALLEL)

```
┌─ Agent G: Toast/Copy/Heart/Skeleton (Fase 7)
│  Files: design-system.css (animations), pp-interactions.js (nieuw)
│
└─ Agent H: Icon System (Fase 8)
   Files: design-system.css (icon tokens), html-shared.js (SVG sizes)
```

**Duur:** 1 sessie

### Sprint 4: Polish & Rollout (Fase 9+10 → 11 → 12)

```
Agent I: CSS Modernization (Fase 9+10)
  Files: design-system.css, style.css
         ↓
Agent J+K+L: Generator Integration (Fase 11, PARALLEL per generator-groep)
  Group 1: index-page.js, about-page.js, four-oh-four.js
  Group 2: city-pages.js, type-pages.js, city-type-pages.js
  Group 3: location-pages.js (grootste impact)
  Group 4: blog.js, cluster-pages.js, editorial-pages.js
         ↓
Agent M: Design Audit Script (Fase 12)
  Files: audit_design_system.js, sync-site.yml
         ↓
Agent N+O: Portal Rollout (Fase 13, PARALLEL: admin + partner)
  Agent N: admin/index.html, admin/admin.js
  Agent O: partner/index.html, partner JS
  Shared: portal-shell.css, portal-shell.js
         ↓
VERIFICATIE: full build + alle 4 audits + visuele check portals
```

**Duur:** 2 sessies

### Totaal: 5-6 sessies

---

## DESIGN BESLISSINGEN — MOTIVATIE

Elke visuele keuze is gegrond in het merk en de doelgroep:

| Beslissing | Waarom |
|-----------|--------|
| **Fraunces serif headings** | Warme, menselijke uitstraling die past bij een kindersite. De "wonk" axis geeft speelsheid zonder kinderachtig te zijn. Anti-generiek (niet Inter/Geist). Serif = editorial autoriteit. |
| **DM Sans body** | Bewezen leesbaar, niet overused, geometrisch maar met warmte. Complementeert Fraunces' organische karakter. |
| **Instrument Serif accent** | Dramatisch contrast voor editorial momenten. Behouden uit eerdere fase — werkt uitstekend als "wow factor" op headlines. |
| **Coral/terra primary (#D4775A)** | Warm, uitnodigend, kindvriendelijk maar niet kinderachtig. Onderscheidend t.o.v. concurrenten (Kidsproof = blauw, DagjeWeg = groen). |
| **Geen dark mode** | De warme ivoor/crème achtergrond IS het merkgevoel. Dark mode zou dat teniet doen. |
| **Subtiele micro-interactions** | "Thoughtful, not flashy" — ouders willen informatie, geen spektakel. Maar ze moeten wel voelen dat de site professioneel en responsief is. |
| **Scroll reveals** | Voegt dynamiek toe zonder afleiding. Fire-once = geen herhaalde animatie bij terugkeren. |
| **4-point grid** | Consistentie in spacing die onbewust "klopend" voelt. |
| **Letter-spacing -3% op headings** | Instant professioneler (video: "this one kind of is a hack"). |
| **65ch max-width op body** | Wetenschappelijk optimale regellengte voor leescomfort. |
| **Warm skeleton loaders** | Primaire tint i.p.v. grijs → voelt als onderdeel van het merk, niet als "loading error". |

---

## WAT DIT PLAN NIET DOET

- **Geen nieuwe pagina's** — dit plan wijzigt alleen het VISUELE systeem
- **Geen SEO-wijzigingen** — meta tags, structured data, en indexatie blijven ongewijzigd
- **Geen content-wijzigingen** — teksten, beschrijvingen, en redactionele content worden niet aangepast
- **Geen database-wijzigingen** — Supabase schema blijft intact
- **Geen nieuwe dependencies** — alles is vanilla CSS/JS
- **Geen breaking changes** — backward-compatible aliases behouden bestaande CSS werkend
- **Portals mee** — admin.peuterplannen.nl en partner.peuterplannen.nl worden in Fase 13 meegenomen

---

## STATUS TRACKER

| Fase | Titel | Status | Sprint | Prioriteit | Bestanden |
|------|-------|--------|--------|------------|-----------|
| 1 | Typography Revolution | `DONE` | 1 | KRITIEK | fonts.css, design-system.css, fonts/, html-shared.js |
| 2 | Color System Ramp | `DONE` | 1 | HOOG | design-system.css |
| 3 | Spacing Grid Discipline | `DONE` | 1 | HOOG | design-system.css, style.css |
| 4 | Button & Input States | `DONE` | 2 | HOOG | design-system.css |
| 5 | Card & Nav Interactions | `DONE` | 2 | HOOG | design-system.css, nav-floating.css |
| 6 | Shadows, Depth & Overlays | `DONE` | 2 | HOOG | design-system.css |
| 7 | Micro-interactions & Feedback | `DONE` | 3 | HOOG | design-system.css, pp-interactions.js |
| 8 | Icon System | `DONE` | 3 | MEDIUM-HOOG | design-system.css, html-shared.js |
| 9 | Scroll Animations & View Transitions | `DONE` | 4 | MEDIUM-HOOG | design-system.css, pp-interactions.js, generators |
| 10 | CSS Modernization | `DONE` | 4 | MEDIUM | design-system.css, style.css |
| 11 | Generator Integration & Rollout | `DONE` | 4 | KRITIEK | Alle generators, html-shared.js, app.html |
| 12 | Design Audit Tooling | `DONE` | 4 | MEDIUM | audit_design_system.js, sync-site.yml |
| 13 | Portal Design System Rollout | `DONE` | 5 | MEDIUM-HOOG | portal-shell.css, portal-shell.js, admin/, partner/ |

---

## VERWACHTE IMPACT

### Visueel
- Van "netjes gebouwde site" naar "professioneel editorial platform"
- Fraunces serif headings geven instant autoriteit en warmte
- Micro-interactions maken de site voelbaar responsief
- Consistente shadows, spacing en kleuren creëren een "polished" gevoel

### Performance
- **Fonts:** 12 bestanden → 3 bestanden (-9 HTTP requests), zelfde totale grootte
- **CSS:** ~3KB extra in design-system.css (geminified)
- **JS:** ~2KB nieuw (pp-interactions.js, defer loaded)
- **FCP:** Verbetering door minder font files + preload strategy
- **CLS:** Verbetering door fallback font metrics (size-adjust)

### Onderhoudbaarheid
- Alle visuele tokens in 1 bestand (design-system.css)
- Geautomatiseerde design audit vangt regressies
- Toekomstige wijzigingen: verander 1 token → 2200 pagina's updaten
- Geen spaghetti: generators produceren classes, niet inline styles

### Schaalbaarheid
- Design system groeit mee: nieuwe pagina-types gebruiken dezelfde tokens
- Color ramp maakt nieuwe kleuren trivial (bijv. een 9e type toevoegen)
- Variable fonts maken nieuwe weight-variaties gratis (geen extra downloads)
