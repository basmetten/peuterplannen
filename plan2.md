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

**Status:** `DONE`
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

**Status:** `DONE`
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

**Status:** `DONE`
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

---
---

# FASE 2: VAN TOKENS NAAR TOEPASSING

> **Doel:** De uitstekende design-system tokens uit Fase 1 (fasen 1-13) daadwerkelijk en volledig doorvoeren in de gehele codebase. Fase 1 bouwde het museum — Fase 2 laat de kunst uit de vitrine en hangt ze op.
> **Bron:** Gap-analyse op basis van [Every UI/UX Concept Explained in Under 10 Minutes](https://www.youtube.com/watch?v=EcbgbKtOELY) (Kole Jain) + Anthropic Claude Code Best Practices Guide
> **Datum:** 2026-03-18
> **Eigenaar:** Bas Metten

---

## DIAGNOSE: WAAROM FASE 2 NODIG IS

### Het museum-probleem

`design-system.css` bevat een **professioneel, compleet token-systeem** (kleuren, typography, shadows, radii, spacing, icons, components). Maar `style.css` en `app.css` — de bestanden die daadwerkelijk de site renderen — **negeren dit systeem bijna volledig**:

| Categorie | Gedefinieerd in design-system.css | Daadwerkelijk gebruikt in style.css + app.css |
|-----------|-----------------------------------|----------------------------------------------|
| Kleur-tokens (`--pp-primary-*`) | 30+ tokens | 0 directe referenties (alleen via aliases) |
| `rgba()` hardcoded kleuren | — | **240+** handmatige waarden |
| Font-size tokens (`--pp-text-*`) | 8 fluid stappen | **0** referenties — 140+ hardcoded `px` waarden |
| Shadow tokens (`--pp-shadow-*`) | 10 contextuele tokens | **~5** referenties via aliases — 65+ handmatig |
| Radius tokens (`--pp-radius-*`) | 6 tokens | **0** referenties — 85+ hardcoded `px` waarden |
| Icon tokens (`--pp-icon-*`) | 5 tokens | **0** referenties — 17+ ad-hoc maten |
| Component classes (`--pp-btn`, `.pp-card`, etc.) | 40+ classes | **~2** in productie-HTML |
| `:active` states | Gedefinieerd op `.pp-btn` | **7 van 60** interactieve elementen |
| `:focus-visible` (element-specifiek) | Op `.pp-btn`, `.pp-input` | **1 van 60** elementen |
| `:disabled` states | Op `.pp-btn`, `.pp-input` | **1 van 60** elementen |

### Radius-alias bug

De backward-compatible radius aliases wijken af van de canonical tokens:

```
--radius-xs: 10px   maar  --pp-radius-xs: 8px
--radius-sm: 14px   maar  --pp-radius-sm: 12px
--radius-md: 18px   maar  --pp-radius-md: 16px
--radius-lg: 24px   maar  --pp-radius-lg: 22px
```

Dit betekent dat code die `var(--radius-sm)` gebruikt een **andere** waarde krijgt dan `var(--pp-radius-sm)`. Twee waarheden = geen waarheid.

### Grootste visueel gemis

> "An image always adds a great pop of color and makes scanning super easy." — Video, 2:04

**Geen enkele van de 2.138+ locatiekaarten heeft een afbeelding.** Er is zelfs een `owner_photo_url` veld in de database dat nooit gerenderd wordt. Dit is het #1 gemis qua visual hierarchy.

---

## ARCHITECTUURPRINCIPES FASE 2

### 1. Token-first migratie

Elke hardcoded waarde → canonical `--pp-*` token. Geen aliases, geen parallelle systemen. Na Fase 2 is `design-system.css` de **enige** plek waar visuele waarden gedefinieerd staan.

### 2. RGB channel variables voor opacity-patronen

Veel `rgba()` gebruik is bewust (transparante borders, shadows). In plaats van deze naar solid tokens te forceren, voegen we RGB channel variables toe:

```css
--pp-primary-rgb: 212, 119, 90;
/* Gebruik: */
border: 1px solid rgba(var(--pp-primary-rgb), 0.12);
```

### 3. Geen scope creep

Fase 2 wijzigt **alleen bestaande styling** naar tokens. Geen nieuwe features, geen redesigns, geen refactors van HTML-structuur — behalve waar strict nodig (locatie-afbeeldingen, form feedback).

### 4. Verificatie via geautomatiseerde audits

Elke fase eindigt met een grep-audit die bevestigt dat hardcoded waarden zijn vervangen. De finale fase (23) integreert dit in CI.

### 5. Claude Code executie-principes (uit Anthropic Best Practices Guide)

- **Explore first, then plan, then code** — elke fase start met `researcher` die exact inventariseert wat er moet veranderen
- **Give Claude a way to verify** — elke fase heeft expliciete `grep`-commando's en build-checks
- **Use subagents for investigation** — research in aparte context, implementatie in schone sessie
- **`/clear` tussen fasen** — voorkomt context-vervuiling
- **Parallel sub-agents waar mogelijk** — onafhankelijke bestanden gelijktijdig bewerken
- **Specifieke prompts** — exacte bestandspaden, selectoren, en verwachte output per sub-agent

---

## AFHANKELIJKHEIDSGRAAF FASE 2

```
FASE 14 (Location Imagery) ──── ONAFHANKELIJK ────────────┐
                                                            │
FASE 15 (RGB Channel Vars) ──────────────────────────┐     │
                                                      ▼     │
FASE 16 (Token Migratie: style.css) ─── PARALLEL ────┤     │
FASE 17 (Token Migratie: app.css) ───────────────────┤     │
                                                      ▼     │
FASE 18 (Icon Sizing Harmonisatie) ──────────────────┤     │
                                                      ▼     │
FASE 19 (Interaction State Matrix) ── SEQUENTIEEL ───┤     │
                                                      ▼     │
FASE 20 (Button & Chip Padding) ─────────────────────┤     │
                                                      ▼     │
FASE 21 (Form Feedback & Ontbrekende Stijlen) ───────┤     │
                                                      ▼     ▼
FASE 22 (CSS Consolidatie & Performance) ────────────────────┤
                                                              ▼
FASE 23 (Compliance Audit & Verificatie)
```

### Sub-agent rolverdeling

| Rol | Model | Tools | Wanneer |
|-----|-------|-------|---------|
| `researcher` | Sonnet (Explore) | Read, Grep, Glob | Vooraf: inventariseer alle hardcoded waarden met exacte line numbers |
| `implementer` | Opus 4.6 | Edit, Write, Read, Bash | Uitvoering: vervang waarden per bestand volgens mapping |
| `verifier` | Sonnet | Read, Bash, Grep | Achteraf: `npm run build` + grep-audit + visuele steekproef |

---

## FASE 14: LOCATION IMAGERY PIPELINE

**Status:** `DONE`
**Agents:** `researcher` (inventariseer image infrastructure) → `implementer` (pipeline + CSS + generators) → `verifier` (build + visuele check)
**Prioriteit:** KRITIEK — dit is het #1 gemis qua visual hierarchy
**Parallel met:** Fase 15 (geen gedeelde bestanden)

### Achtergrond

> "An image always adds a great pop of color and makes scanning super easy. [...] Images are used whenever possible." — Video, Visual Hierarchy (2:04)

De video toont expliciet dat afbeeldingen het belangrijkste instrument zijn voor scanning en visual hierarchy. Peuterplannen heeft 2.138+ locatiekaarten die puur uit tekst bestaan. Geen thumbnails, geen foto's, geen visueel anker. Het `owner_photo_url` veld in de database wordt nooit gerenderd.

### Fallback-hiërarchie

```
1. owner_photo_url (partner-geüpload, hoogste kwaliteit, gratis)
2. Google Places Photo (geautomatiseerd via place_id, betrouwbaar)
3. Type-specifieke placeholder illustratie (altijd beschikbaar, on-brand)
```

### Stappen

#### 14.1 Nieuwe tokens in design-system.css

**Bestand:** `design-system.css`

```css
/* === Image & Card Image === */
--pp-img-aspect: 3 / 2;
--pp-img-radius: var(--pp-radius-sm) var(--pp-radius-sm) 0 0;
--pp-img-overlay-from: transparent;
--pp-img-overlay-to: rgba(var(--pp-text-rgb), 0.55);
```

#### 14.2 Photo fetch script

**Bestand:** `.scripts/pipeline/fetch-photos.js`

**Logica:**

1. Query Supabase voor locaties waar `photo_url IS NULL` en `place_id IS NOT NULL`
2. Per locatie: Places Photo API → download eerste foto op 640px breedte
3. Sharp: resize naar 2 formaten (400w + 800w), convert naar WebP (quality 80) + JPEG fallback (quality 75)
4. Opslaan in `/images/locations/{region_slug}/{location_slug}/`
5. Update `photo_url` veld in Supabase met relatief pad
6. Rate limit: max 10 requests/seconde, 500 per batch run
7. Skip locaties waar `owner_photo_url` al gevuld is (die hebben prioriteit)

**Fallback image generatie:**

Per type een aantrekkelijke placeholder (al bestaande category icons opschalen of SVG illustraties):

```
/images/placeholders/speeltuinen.webp
/images/placeholders/kinderboerderijen.webp
/images/placeholders/natuur.webp
/images/placeholders/musea.webp
/images/placeholders/zwemmen.webp
/images/placeholders/pannenkoeken.webp
/images/placeholders/horeca.webp
/images/placeholders/cultureel.webp
```

Elke placeholder: 800x533 WebP, on-brand kleuren (type-kleur + illustratief).

#### 14.3 Database schema uitbreiding

**Bestand:** `supabase/migrations/` (nieuw migratiebestand)

```sql
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_source TEXT CHECK (photo_source IN ('owner', 'google', 'placeholder'));
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_fetched_at TIMESTAMPTZ;
```

#### 14.4 Card image CSS component

**Bestand:** `design-system.css` (toevoegen aan components sectie)

```css
/* === Location Card Image === */
.pp-card-img {
  position: relative;
  overflow: hidden;
  aspect-ratio: var(--pp-img-aspect);
  border-radius: var(--pp-img-radius);
  background: var(--pp-bg);
}
.pp-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--pp-transition-slow);
}
.pp-card-interactive:hover .pp-card-img img {
  transform: scale(1.05);
}
.pp-card-img .pp-card-type-badge {
  position: absolute;
  bottom: var(--pp-space-sm);
  left: var(--pp-space-sm);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: var(--pp-space-xs) var(--pp-space-sm);
  border-radius: var(--pp-radius-xs);
  font-family: var(--pp-font-ui);
  font-size: var(--pp-text-xs);
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--pp-text);
}
```

**Skeleton state:**

```css
.pp-card-img.pp-skeleton {
  background: linear-gradient(
    110deg,
    var(--pp-bg) 30%,
    var(--pp-bg-warm) 50%,
    var(--pp-bg) 70%
  );
  background-size: 200% 100%;
  animation: pp-shimmer 1.5s ease-in-out infinite;
}
```

#### 14.5 City page generator update

**Bestand:** `.scripts/lib/generators/city-pages.js`

Huidige card template (regel ~15-29):

```html
<article class="loc-item">
  <h3><a href="/${slug}/">${name}</a></h3>
  <p>${description}</p>
  <span class="badges">...</span>
  <div class="loc-actions">...</div>
</article>
```

**Nieuwe card template:**

```html
<article class="loc-item">
  <div class="loc-img">
    <picture>
      <source srcset="/images/locations/${region}/${slug}/thumb.webp" type="image/webp">
      <img src="/images/locations/${region}/${slug}/thumb.jpg"
           alt="${name}"
           loading="lazy"
           width="400" height="267"
           onerror="this.closest('.loc-img').classList.add('loc-img--fallback')">
    </picture>
    <span class="loc-type-badge">${typeLabel}</span>
  </div>
  <div class="loc-body">
    <h3><a href="/${slug}/">${name}</a></h3>
    <p>${description}</p>
    <span class="badges">...</span>
    <div class="loc-actions">...</div>
  </div>
</article>
```

**Fallback CSS** (als foto niet laadt, toon type-kleur gradient):

```css
.loc-img--fallback {
  background: linear-gradient(
    135deg,
    var(--pp-bg-warm) 0%,
    var(--pp-primary-50) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}
.loc-img--fallback img { display: none; }
.loc-img--fallback::after {
  content: '';
  width: var(--pp-icon-xl);
  height: var(--pp-icon-xl);
  background: url('/images/categories/${type}.webp') center/contain no-repeat;
  opacity: 0.4;
}
```

#### 14.6 Location detail page hero image

**Bestand:** `.scripts/lib/generators/location-pages.js`

Voeg hero image toe boven de locatietitel met gradient overlay:

```html
<div class="hero-location-img">
  <picture>
    <source srcset="/images/locations/${region}/${slug}/hero.webp" type="image/webp">
    <img src="/images/locations/${region}/${slug}/hero.jpg"
         alt="${name}"
         width="800" height="533"
         fetchpriority="high">
  </picture>
  <div class="hero-location-overlay"></div>
</div>
```

```css
.hero-location-img {
  position: relative;
  width: 100%;
  max-height: 400px;
  overflow: hidden;
}
.hero-location-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-location-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(var(--pp-text-rgb), 0.55)
  );
}
```

#### 14.7 app.html card image rendering

**Bestand:** `app.html`

Update twee dingen:

**A) Supabase SELECT strings uitbreiden.** `FULL_LOCATION_SELECT` en `FALLBACK_LOCATION_SELECT` (regel ~1380-1381) bevatten momenteel `owner_photo_url` maar NIET `photo_url` (die Fase 14.3 toevoegt). Voeg toe:

```javascript
// Na owner_photo_url toevoegen:
// ...owner_photo_url,photo_url,photo_source...
```

**B) Card render functie updaten** om foto te tonen:

```javascript
// In de card render functie:
const photoSrc = loc.owner_photo_url || loc.photo_url
  || `/images/placeholders/${loc.type}.webp`;

const imgHTML = `
  <div class="loc-img">
    <img src="${escapeHtml(photoSrc)}"
         alt="${escapeHtml(loc.name)}"
         loading="lazy" width="400" height="267">
    <span class="loc-type-badge">${typeLabel}</span>
  </div>`;
```

#### 14.8 Image optimalisatie in build pipeline

**Bestand:** `.scripts/optimize_images.js` (uitbreiden)

- Process `/images/locations/` directory
- Generate 400w (card thumb) + 800w (detail hero) formaten
- WebP + JPEG dual output
- Quality: WebP 80, JPEG 75
- Strip EXIF metadata
- Toevoegen aan `.scripts/sync_all.js` orchestrator

#### 14.9 CI/CD integratie

**Bestand:** `.github/workflows/sync-site.yml`

Photo fetch als optionele stap (weekly cadence, niet elke 10 min):

```yaml
- name: Fetch new location photos
  if: github.event.schedule == '0 3 * * 1'  # Maandag 03:00
  run: node .scripts/pipeline/fetch-photos.js
  env:
    GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
```

### Verificatie

- [ ] `find images/locations -name "*.webp" | wc -l` toont substantieel aantal foto's
- [ ] City pages tonen afbeeldingen op alle locatiekaarten
- [ ] Fallback placeholder zichtbaar voor locaties zonder foto
- [ ] Location detail pages tonen hero image
- [ ] app.html kaarten tonen afbeeldingen
- [ ] Lighthouse performance score niet significant gedaald (lazy loading werkt)
- [ ] `npm run build` slaagt zonder errors
- [ ] WebP bestanden ≤ 40KB per thumbnail, ≤ 80KB per hero

---

## FASE 15: TOKEN FOUNDATION — RGB CHANNEL VARIABLES

**Status:** `DONE`
**Agents:** `implementer` (kleine, gerichte wijziging) → `verifier` (build)
**Prioriteit:** KRITIEK — fundament voor Fase 16 + 17
**Afhankelijk van:** Geen

### Achtergrond

`style.css` en `app.css` bevatten samen **240+ hardcoded `rgba()` waarden**. De meeste zijn opacity-varianten van drie basiskleuren: primary (#D4775A), text (#2D2926), en white (#FFFFFF). Om deze naar tokens te migreren zonder het opacity-gedrag te verliezen, hebben we RGB channel variables nodig.

### Stappen

#### 15.1 RGB channel variables toevoegen

**Bestand:** `design-system.css` — toevoegen direct na de color ramp definities (na regel 23)

```css
/* === RGB Channels (for rgba() patterns) === */
--pp-primary-rgb: 212, 119, 90;
--pp-secondary-rgb: 107, 149, 144;
--pp-accent-rgb: 232, 184, 112;
--pp-text-rgb: 45, 41, 38;
--pp-bg-rgb: 250, 247, 242;
--pp-surface-rgb: 255, 255, 255;
```

#### 15.2 Ontbrekende semantic tokens toevoegen

**Bestand:** `design-system.css` — toevoegen bij Surfaces sectie

```css
/* === Extended Surfaces === */
--pp-surface-dark: #1e1c1a;
--pp-surface-dark-rgb: 30, 28, 26;

/* === Brand colors (external) === */
--pp-brand-whatsapp: #25D366;
--pp-brand-whatsapp-hover: #1ebe57;

/* === Facility badge colors (mapped to type colors where possible) === */
--pp-badge-coffee-bg: var(--pp-primary-50);       /* #FDF1ED */
--pp-badge-coffee-text: var(--pp-primary-600);     /* #B35D42 */
--pp-badge-alcohol-bg: var(--pp-accent-50);        /* #FEF6E8 ≈ #FEF8E7 */
--pp-badge-alcohol-text: var(--pp-accent-800);     /* #7A5F2E ≈ #8B6914 */
--pp-badge-diaper-bg: var(--pp-secondary-50);      /* #E8F2F0 ≈ #EEF3EC */
--pp-badge-diaper-text: var(--pp-secondary-700);   /* #3A615D ≈ #5C7A52 */
```

**Let op kleurverschuivingen bij badges:**
- **badge-coffee:** `#FDF1ED` → `--pp-primary-50` (`#FDF1ED`) — **exacte match**, geen verschil
- **badge-alcohol:** `#FEF8E7` → `--pp-accent-50` (`#FEF6E8`) — **minimaal**, nauwelijks zichtbaar
- **badge-diaper:** `#EEF3EC` → `--pp-secondary-50` (`#E8F2F0`) — **MERKBARE verschuiving** van groenig naar tealig. Tekst verschuift van olijfgroen (`#5C7A52`) naar donkerteal (`#3A615D`). **Alternatief:** definieer aparte `--pp-badge-diaper-bg: #EEF3EC` en `--pp-badge-diaper-text: #5C7A52` tokens die de huidige kleuren exact behouden, onafhankelijk van de secondary ramp. Dit is veiliger.

#### 15.3 Radius-alias bug fixen

**Bestand:** `design-system.css` — fix de backward-compatible radius aliases (regel 205-210)

```css
/* Oud (FOUT — wijkt af van canonical tokens): */
--radius-xs: 10px;
--radius-sm: 14px;
--radius-md: 18px;
--radius-lg: 24px;

/* Nieuw (correct — verwijst naar canonical tokens): */
--radius-xs: var(--pp-radius-xs);   /* 8px */
--radius-sm: var(--pp-radius-sm);   /* 12px */
--radius-md: var(--pp-radius-md);   /* 16px */
--radius-lg: var(--pp-radius-lg);   /* 22px */
```

**Impact:** Dit verandert visueel de rounding op ~20 elementen in `app.css` die `var(--radius-*)` gebruiken. De verandering is subtiel (2-4px verschil) maar maakt het systeem consistent.

### Verificatie

- [ ] `grep -c 'pp-primary-rgb' design-system.css` ≥ 1
- [ ] `grep -c 'pp-text-rgb' design-system.css` ≥ 1
- [ ] `grep 'radius-xs:' design-system.css` toont `var(--pp-radius-xs)`, niet `10px`
- [ ] `npm run build` slaagt
- [ ] Geen visuele regressies op homepage, stadspagina's en app

---

## FASE 16: TOKEN MIGRATIE — style.css COMPLEET

**Status:** `DONE`
**Agents:** `researcher` (exact inventaris met line numbers) → `implementer` (search-and-replace per categorie) → `verifier` (grep-audit + build)
**Prioriteit:** KRITIEK — style.css bepaalt hoe 2.200+ gegenereerde pagina's eruitzien
**Afhankelijk van:** Fase 15

### Achtergrond

> "Good UI has many signifiers [...] the difference between small and big, or colorful and not, that actually creates the hierarchy." — Video, Visual Hierarchy

`style.css` bevat **90+ hardcoded kleuren**, **60+ hardcoded font sizes**, **15+ handmatige shadows**, **25+ hardcoded radii**, en **30+ off-grid spacing waarden**. Alle moeten gemigreerd worden naar canonical `--pp-*` tokens.

### Stappen

#### 16.1 Kleurmigratie

**Bestand:** `style.css`

**Mapping-tabel `rgba(212, 119, 90, X)` → `rgba(var(--pp-primary-rgb), X)`:**

Vervang ELKE instantie van `rgba(212,119,90,...)` (met of zonder spaties) door `rgba(var(--pp-primary-rgb), <opacity>)`. Exacte instanties:

| Huidige waarde | Nieuwe waarde | Voorbeeldselectoren |
|---|---|---|
| `rgba(212,119,90,0.08)` | `rgba(var(--pp-primary-rgb), 0.08)` | `.guide-kicker`, `.editorial-meta span`, `.coverage-chip` |
| `rgba(212,119,90,0.10)` | `rgba(var(--pp-primary-rgb), 0.10)` | `.loc-item` border |
| `rgba(212,119,90,0.12)` | `rgba(var(--pp-primary-rgb), 0.12)` | `nav` border, `.guide-card` border, `.guide-pill` border |
| `rgba(212,119,90,0.14)` | `rgba(var(--pp-primary-rgb), 0.14)` | `.editorial-meta a:hover`, `.coverage-chip` border |
| `rgba(212,119,90,0.15)` | `var(--pp-border)` | `.nav-links-box .divider`, `.location-info` |
| `rgba(212,119,90,0.24)` | `rgba(var(--pp-primary-rgb), 0.24)` | `.editorial-support-links a:hover` border |
| `rgba(212,119,90,0.25)` | `rgba(var(--pp-primary-rgb), 0.25)` | `.guide-link:hover` border |
| `rgba(212,119,90,0.30)` | `var(--pp-border-strong)` | — |
| `rgba(212,119,90,0.32)` | `rgba(var(--pp-primary-rgb), 0.32)` | `.editorial-body a` border |
| `rgba(212,119,90,0.40)` | `rgba(var(--pp-primary-rgb), 0.40)` | `.cta-block a:hover` shadow |
| `rgba(212,119,90,0.60)` | `rgba(var(--pp-primary-rgb), 0.60)` | `.editorial-body a:hover` border |
| `rgba(212,119,90,0.95)` | `rgba(var(--pp-primary-rgb), 0.95)` | `.guide-card-lead::before` gradient |

**Mapping-tabel `rgba(45, 41, 38, X)` → `rgba(var(--pp-text-rgb), X)`:**

| Huidige waarde | Nieuwe waarde | Voorbeeldselectoren |
|---|---|---|
| `rgba(45,41,38,0.05)` | `rgba(var(--pp-text-rgb), 0.05)` | `.nav-link:hover`, `.intro-box` shadow |
| `rgba(45,41,38,0.06)` | `rgba(var(--pp-text-rgb), 0.06)` | `.loc-item` shadow, `.editorial-support-card` shadow |
| `rgba(45,41,38,0.07)` | `rgba(var(--pp-text-rgb), 0.07)` | `.guide-card` shadow |
| `rgba(45,41,38,0.08)` | `rgba(var(--pp-text-rgb), 0.08)` | `.intro-box` border, `.guide-link:hover` shadow |
| `rgba(45,41,38,0.10)` | `rgba(var(--pp-text-rgb), 0.10)` | `.type-section h2` border, `.loc-item:hover` shadow |
| `rgba(45,41,38,0.12)` | `rgba(var(--pp-text-rgb), 0.12)` | `.faq-item:hover` shadow |
| `rgba(45,41,38,0.18)` | `rgba(var(--pp-text-rgb), 0.18)` | `.skip-link:focus-visible` shadow |
| `rgba(45,41,38,0.25)` | `rgba(var(--pp-text-rgb), 0.25)` | `.nav-cta:hover` shadow |

**Mapping-tabel `rgba(255, 255, 255, X)` → `rgba(var(--pp-surface-rgb), X)`:**

| Huidige waarde | Nieuwe waarde |
|---|---|
| `rgba(255,255,255,0.07)` | `rgba(var(--pp-surface-rgb), 0.07)` |
| `rgba(255,255,255,0.12)` | `rgba(var(--pp-surface-rgb), 0.12)` |
| `rgba(255,255,255,0.14)` | `rgba(var(--pp-surface-rgb), 0.14)` |
| `rgba(255,255,255,0.15)` | `rgba(var(--pp-surface-rgb), 0.15)` |
| `rgba(255,255,255,0.18)` | `rgba(var(--pp-surface-rgb), 0.18)` |
| `rgba(255,255,255,0.25)` | `rgba(var(--pp-surface-rgb), 0.25)` |
| `rgba(255,255,255,0.30)` | `rgba(var(--pp-surface-rgb), 0.30)` |
| `rgba(255,255,255,0.50)` | `rgba(var(--pp-surface-rgb), 0.50)` |
| `rgba(255,255,255,0.60)` | `rgba(var(--pp-surface-rgb), 0.60)` |
| `rgba(255,255,255,0.75)` | `rgba(var(--pp-surface-rgb), 0.75)` |
| `rgba(255,255,255,0.85)` | `rgba(var(--pp-surface-rgb), 0.85)` |
| `rgba(255,255,255,0.86)` | `rgba(var(--pp-surface-rgb), 0.86)` |
| `rgba(255,255,255,0.92)` | `rgba(var(--pp-surface-rgb), 0.92)` |
| `rgba(255,255,255,0.95)` | `rgba(var(--pp-surface-rgb), 0.95)` |
| `rgba(255,255,255,0.98)` | `rgba(var(--pp-surface-rgb), 0.98)` |
| `rgba(255,255,255,0.99)` | `rgba(var(--pp-surface-rgb), 0.99)` |
| `#fff` | `var(--pp-text-inverse)` |

**Mapping-tabel `rgba(250, 212, 160, X)`:**

| Huidige waarde | Nieuwe waarde | Toelichting |
|---|---|---|
| `rgba(250,212,160,0.18)` | Nieuw token: `--pp-hero-blog-glow-rgb: 250, 212, 160` → `rgba(var(--pp-hero-blog-glow-rgb), 0.18)` | `rgb(250,212,160)` ≠ accent-rgb (`232,184,112`). Peach/gold tint die specifiek is voor hero-blog. Definieer als apart token in design-system.css |

**Mapping solid hex kleuren:**

| Huidige waarde | Token | Context |
|---|---|---|
| `#C46050` | Nieuw token: `--pp-primary-450: #C46050` of gebruik `var(--pp-primary-500)` (`#C46A4F`, Δ26 green channel — acceptabele shift in gradient context) | Hero gradient stop |
| `#B55A45` | Nieuw token: `--pp-primary-550: #B55A45` of gebruik `var(--pp-primary-600)` (`#B35D42`, minimaal verschil) | Hero gradient stop |
| `#D4775A` | `var(--pp-primary)` | Direct primary reference |
| `#a75a46` | `var(--pp-primary-600)` | `.hero-blog` gradient |
| `#36241d` | `var(--pp-primary-900)` | `.hero-blog` gradient |
| `#d4775a` | `var(--pp-primary)` | `.hero-blog` gradient |
| `#1e1c1a` | `var(--pp-surface-dark)` | `footer` background |
| `#25D366` | `var(--pp-brand-whatsapp)` | `.share-wa` |
| `#1ebe57` | `var(--pp-brand-whatsapp-hover)` | `.share-wa:hover` |
| `#756762` | Nieuw token: `--pp-text-tertiary: #756762` (NIET text-muted `#A39490` — dat is veel lichter) | `.blog-excerpt` |
| `#FDF1ED` | `var(--pp-badge-coffee-bg)` | `.badge-coffee` |
| `#B35D42` | `var(--pp-badge-coffee-text)` | `.badge-coffee` |
| `#FEF8E7` | `var(--pp-badge-alcohol-bg)` | `.badge-alcohol` |
| `#8B6914` | `var(--pp-badge-alcohol-text)` | `.badge-alcohol` |
| `#EEF3EC` | `var(--pp-badge-diaper-bg)` | `.badge-diaper` |
| `#5C7A52` | `var(--pp-badge-diaper-text)` | `.badge-diaper` |
| `#6B9590` | `var(--pp-secondary)` | `.support-section` gradient |
| `#4A7A76` | `var(--pp-secondary-dark)` | `.support-section` gradient |
| `rgba(107,149,144,0.30)` | `rgba(var(--pp-secondary-rgb), 0.30)` | `.btn-support:hover` shadow |
| `#f5e0da` | Nieuw token: `--pp-primary-75: #f5e0da` (tussenwaarde primary-50/100 — `--pp-primary-100` is `#FBDDD2`, te anders) | `.share-native:hover` |
| `#f0e8dc` | Nieuw token: `--pp-bg-muted: #f0e8dc` (NIET bg-warm `#FFF5EB` — dat is significant lichter/warmer) | `.error-links a.secondary:hover` |
| `#f0f0f0` | Nieuw token: `--pp-surface-neutral: #f0f0f0` (NIET surface-hover `#FEFCF9` — dat is warm wit, dit is neutraal grijs. Hover zou onzichtbaar worden op witte achtergrond) | `.newsletter-signup button:hover` |
| `rgba(250,247,242,0.96)` | `rgba(var(--pp-bg-rgb), 0.96)` | `nav` background |
| `rgba(250,247,242,0.98)` | `rgba(var(--pp-bg-rgb), 0.98)` | `.nav-mobile` background |
| `#1a1714` | Nieuw token: `--pp-text-pressed: #1a1714` (donkerder dan `--pp-text` voor pressed/hover states) | `.nav-cta:hover`, `.loc-detail-btn:hover` |
| `#1da851` | `var(--pp-brand-whatsapp-hover)` (of nieuw token `--pp-brand-whatsapp-active: #1da851` als er 3 WhatsApp shades nodig zijn) | `.share-whatsapp:hover` (blog share variant) |

#### 16.2 Typografiemigratie

**Bestand:** `style.css`

**Mapping-tabel hardcoded font sizes → tokens:**

| Huidige `px` | Token | Selectoren (voorbeelden) |
|---|---|---|
| `11px` | `var(--pp-text-xs)` | `.loc-region`, `.map-attribution` |
| `12px` | `var(--pp-text-xs)` | `.hero-kicker`, `.guide-pill`, `.badge-pill`, `.coverage-chip`, `.info-label`, `.footer-copy`, `.hero-location-badge` |
| `13px` | `var(--pp-text-sm)` | `.hero-stat span`, `.nav-cta`, `.loc-detail-btn`, `.loc-website-btn`, `.editorial-meta`, `.guide-link span` |
| `14px` | `var(--pp-text-sm)` | `.nav-link`, `.logo-text`, `.skip-link`, `.breadcrumb`, `.loc-item p`, `.editorial-support-card p`, `.editorial-support-links a strong`, `.faq-item p`, `.nav-links-box h3/a`, `.info-value`, `.blog-meta`, `.error-tip` |
| `15px` | `var(--pp-text-sm)` | `.guide-card p`, `.guide-link strong`, `.faq-item summary`, `.support-section p`, `.cta-block p`, `.location-highlight`. **Let op:** `--pp-text-sm` = 14px@1440px, `--pp-text-base` = 17px@1440px. Snap naar sm (1px kleiner) is minder disruptief dan base (2px groter). Visueel controleren na migratie. |
| `16px` | `var(--pp-text-base)` | `.intro-box p`, `.nav-mobile-link`, `.location-subtitle`, `.location-description`, `.blog-content p`, `.error-page p` |
| `17px` | `var(--pp-text-lg)` | `.hero p`, `.loc-item h3`, `.editorial-body p/li` |
| `18px` | `var(--pp-text-lg)` | `.nav-logo`, `.editorial-support-card h3` |
| `20px` | `var(--pp-text-xl)` | `.similar-locations h2`, `.support-section h3` |
| `22px` | `var(--pp-text-xl)` | `.guide-card h3`, `.faq-section h2` |
| `30px` | `var(--pp-text-2xl)` | `.hero-stat strong` |
| `80px` | `var(--pp-text-4xl)` | `.error-emoji` |

**Clamp-waarden:**

| Huidige clamp | Token |
|---|---|
| `clamp(34px, 5.4vw, 66px)` | `var(--pp-text-4xl)` |
| `clamp(34px, 5vw, 56px)` | `var(--pp-text-3xl)` |
| `clamp(30px, 3vw, 40px)` | `var(--pp-text-2xl)` |
| `clamp(28px, 3vw, 38px)` | `var(--pp-text-2xl)` |
| `clamp(24px, 2.6vw, 32px)` | `var(--pp-text-xl)` |
| `clamp(22px, 2.3vw, 28px)` | `var(--pp-text-xl)` |
| `clamp(40px, 6vw, 76px)` | Behouden als custom clamp (`.hero-blog-title` — bewust groter dan standaard hero) |
| `clamp(32px, 5vw, 52px)` | `var(--pp-text-3xl)` (`.location-header h1`) |
| `clamp(72px, 16vw, 120px)` | Behouden als custom clamp (`.error-page h1` — bewust gigantisch, decoratief) |

**Aanpak:** Aangezien de `clamp()` waarden in `style.css` iets afwijken van de design-system clamps, snap we naar de dichtstbijzijnde `--pp-text-*` token. Het resultaat is een fluid range in plaats van een vaste px-waarde, wat beter is voor responsive design.

**Uitzondering:** De 404-pagina h1 (`clamp(72px, 16vw, 120px)`) is opzettelijk gigantisch. Definieer hiervoor een lokale custom property:

```css
.error-page h1 {
  font-size: clamp(72px, 16vw, 120px); /* bewust buiten het type-systeem */
}
```

#### 16.3 Shadowmigratie

**Bestand:** `style.css`

**Mapping-tabel:**

| Huidige shadow | Token | Selectoren |
|---|---|---|
| `0 1px 3px rgba(..., 0.08)` | `var(--pp-shadow-sm)` | `.intro-box`, `.blog-card` (base) |
| `0 1px 4px rgba(..., 0.05/0.06)` | `var(--pp-shadow-sm)` | `.intro-box`, `.loc-item` |
| `0 4px 12px rgba(..., 0.07/0.08/0.10)` | `var(--pp-shadow-md)` | `.loc-item`, `.guide-card` |
| `0 4px 14px rgba(..., 0.25)` | `var(--pp-shadow-md)` | `.nav-cta:hover` |
| `0 4px 16px rgba(..., 0.40)` | `var(--pp-shadow-md)` | `.cta-block a:hover` |
| `0 6px 20px rgba(..., 0.12)` | `var(--pp-shadow-md)` | `.faq-item:hover` |
| `0 8px 24px rgba(...)` | `var(--pp-shadow-lg)` | `.blog-card` (base, 2nd layer) |
| `0 10px 18px rgba(...)` | `var(--pp-shadow-lg)` | `.editorial-support-links a:hover` |
| `0 10px 20px rgba(...)` | `var(--pp-shadow-lg)` | `.guide-link:hover` |
| `0 10px 26px rgba(...)` | `var(--pp-shadow-lg)` | `.guide-card` |
| `0 10px 30px rgba(...)` | `var(--pp-shadow-lg)` | `.skip-link:focus-visible` |
| `0 12px 26px rgba(...)` | `var(--pp-shadow-lg)` | `.editorial-support-card` |
| `0 12px 28px rgba(...)` | `var(--pp-shadow-card-hover)` | `.loc-item:hover` |
| `0 14px 32px rgba(...)` | `var(--pp-shadow-card-hover)` | `.blog-card:hover` |
| `0 16px 36px rgba(...)` | `var(--pp-shadow-hover)` | `.editorial-body` |
| Dubbele shadow combinaties | `var(--pp-shadow-card)` / `var(--pp-shadow-card-hover)` | `.loc-item`, `.blog-card` |

**Aanpak:** Vervang compound shadows (meerdere lagen) door het dichtstbijzijnde context-specifieke token. Waar de huidige shadow bewust sterker of subtieler is dan het token, accepteer het token als de nieuwe standaard voor consistentie.

#### 16.4 Radiusmigratie

**Bestand:** `style.css`

**Mapping-tabel:**

| Huidige waarde | Token | Selectoren |
|---|---|---|
| `6px` | `var(--pp-radius-xs)` | `*:focus-visible`, `.nav-link` |
| `7px` | `var(--pp-radius-xs)` | — (snap naar 8px) |
| `8px` | `var(--pp-radius-xs)` | `.nav-cta`, `.loc-detail-btn`, `.loc-website-btn` |
| `9px` | `var(--pp-radius-xs)` | — (snap naar 8px) |
| `10px` | `var(--pp-radius-sm)` | `.faq-item`, `.btn-route` |
| `12px` | `var(--pp-radius-sm)` | `.intro-box` |
| `14px` | `var(--pp-radius-sm)` | `.loc-item` (snap naar 12px) |
| `16px` | `var(--pp-radius-md)` | `.guide-card`, `.newsletter-signup` |
| `18px` | `var(--pp-radius-md)` | `.blog-card` (snap naar 16px) |
| `20px` | `var(--pp-radius-lg)` | — (snap naar 22px) |
| `24px` | `var(--pp-radius-lg)` | `.hero` (snap naar 22px) |
| `999px` | `var(--pp-radius-pill)` | Pills, badges |

#### 16.5 Spacing alignment naar 4pt grid

**Bestand:** `style.css`

Alle off-grid waarden snappen naar het dichtstbijzijnde punt op het 4pt grid:

| Huidige | Snap naar | Selectoren |
|---|---|---|
| `7px` | `8px` / `var(--pp-space-sm)` | `.badge-pill`, `.loc-detail-btn`, `.guide-pill`, `.editorial-meta span`, `.coverage-chip`, `.hero-location-badge` |
| `10px` | `8px` of `12px` | `.guide-kicker` padding |
| `11px` | `12px` | `.guide-pill` padding-right |
| `13px` | `12px` of `16px` | `.cta-block a` padding |
| `14px` | `16px` / `var(--pp-space-md)` | `.loc-item` padding, `.guide-link` padding, `.editorial-support-links a` padding |
| `15px` | `16px` | Diverse paddings |
| `17px` | `16px` | — |
| `18px` | `16px` of `20px` | `.hero-blog-meta` margin, `.editorial-meta` margin, `.editorial-support-card` padding |
| `22px` | `24px` / `var(--pp-space-lg)` | `.loc-item` padding, `.guide-card-lead` padding |
| `26px` | `24px` | `.guide-card-lead` padding-bottom |
| `28px` | `32px` / `var(--pp-space-xl)` | `.cta-block p` margin |
| `30px` | `32px` | `.editorial-body` padding |
| `34px` | `32px` | `.editorial-meta span` min-height |
| `54px` | `48px` / `var(--pp-space-2xl)` | `.hero-blog` padding-bottom |
| `60px` | `64px` / `var(--pp-space-3xl)` | `.nav-inner` height |

**Aanpak:** Gebruik `var(--pp-space-*)` tokens waar de waarde een veelvoud van een grid-stap is. Gebruik anders de dichtstbijzijnde waarde in `px`.

#### 16.6 Backward-compatible alias referenties vervangen

**Bestand:** `style.css`

Na de bovenstaande migraties: vervang alle resterende `var(--text-muted)`, `var(--navy)`, `var(--primary)`, etc. door canonical `var(--pp-*)` equivalenten. Gebruik `replace_all`:

| Alias | Canonical |
|---|---|
| `var(--font-heading)` | `var(--pp-font-heading)` |
| `var(--font-body)` | `var(--pp-font-body)` |
| `var(--font-accent)` | `var(--pp-font-accent)` |
| `var(--font-ui)` | `var(--pp-font-ui)` |
| `var(--navy)` | `var(--pp-text)` |
| `var(--navy-light)` | `var(--pp-text-secondary)` |
| `var(--primary)` | `var(--pp-primary)` |
| `var(--primary-light)` | `var(--pp-primary-light)` |
| `var(--primary-dark)` | `var(--pp-primary-dark)` |
| `var(--accent)` | `var(--pp-accent)` |
| `var(--accent-light)` | `var(--pp-accent-light)` |
| `var(--secondary)` | `var(--pp-secondary)` |
| `var(--bg)` | `var(--pp-bg)` |
| `var(--bg-cream)` | `var(--pp-bg-cream)` |
| `var(--bg-warm)` | `var(--pp-bg-warm)` |
| `var(--surface)` | `var(--pp-surface)` |
| `var(--text)` | `var(--pp-text)` |
| `var(--text-secondary)` | `var(--pp-text-secondary)` |
| `var(--text-muted)` | `var(--pp-text-muted)` |
| `var(--card-shadow)` | `var(--pp-shadow-md)` |
| `var(--shadow-sm)` | `var(--pp-shadow-sm)` |
| `var(--shadow-md)` | `var(--pp-shadow-md)` |
| `var(--shadow-lg)` | `var(--pp-shadow-lg)` |
| `var(--shadow-hover)` | `var(--pp-shadow-hover)` |

#### 16.7 nav-floating.css migratie

**Bestand:** `nav-floating.css`

Dit bestand bevat ~20 hardcoded waarden en unprefixed aliases die MOETEN gemigreerd worden VOORDAT Fase 22.4 de aliases verwijdert.

**Alias-migratie:**

| Huidig | Nieuw |
|---|---|
| `var(--navy, #2d2926)` | `var(--pp-text)` |
| `var(--primary, #d4775a)` | `var(--pp-primary)` |
| `var(--ink-light, #7a5e60)` | `var(--pp-text-secondary)` |
| `var(--primary-dark, #b35d42)` | `var(--pp-primary-dark)` |
| `var(--primary-light, #fdf1ed)` | `var(--pp-primary-light)` |
| `var(--ink, var(--text, #2d2926))` | `var(--pp-text)` |
| `var(--text, #2d2926)` | `var(--pp-text)` |
| `#fff` | `var(--pp-text-inverse)` |

**Kleurmigratie:**

| Huidig | Nieuw | Toelichting |
|---|---|---|
| `rgba(255, 251, 246, X)` | `rgba(var(--pp-bg-rgb), X)` | Let op: `#FFFBF6` wijkt licht af van `--pp-bg` (#FAF7F2). Als het verschil te groot is, definieer `--pp-nav-bg-rgb: 255, 251, 246` als nav-specifiek token |
| `rgba(212, 119, 90, X)` | `rgba(var(--pp-primary-rgb), X)` | Direct match |
| `rgba(45, 41, 38, X)` | `rgba(var(--pp-text-rgb), X)` | Direct match |

**Aanpak:** Researcher inventariseert exact; implementer vervangt. Verwijder alle inline CSS fallback waarden (de `var(--navy, #2d2926)` pattern) — na migratie naar canonical tokens zijn fallbacks overbodig.

### Verificatie

```bash
# Geen hardcoded rgba() meer (max 5 uitzonderingen voor gradient stops)
grep -cP 'rgba\(\d+\s*,' style.css
# Verwacht: ≤ 5

# Geen hardcoded px font-sizes meer (behalve 404 hero)
grep -cP 'font-size:\s*\d+px' style.css
# Verwacht: ≤ 2

# Geen hardcoded shadow waarden meer
grep -cP 'box-shadow:\s*\d' style.css
# Verwacht: 0

# Geen unprefixed aliases meer
grep -cP 'var\(--(?!pp-)[a-z]' style.css
# Verwacht: 0

# Geen hardcoded border-radius meer
grep -cP 'border-radius:\s*\d+px' style.css
# Verwacht: ≤ 3

# Build + audit
npm run build
```

---

## FASE 17: TOKEN MIGRATIE — app.html INLINE CSS COMPLEET

**Status:** `DONE`
**Agents:** `researcher` (inventariseer inline CSS in app.html) → `implementer` (migreer) → `verifier` (grep-audit + build)
**Prioriteit:** KRITIEK — de app-ervaring voor alle gebruikers
**Parallel met:** Fase 16 (verschillende bestanden, zelfde aanpak)
**Afhankelijk van:** Fase 15

### Achtergrond

**Let op: `app.css` is GEEN apart bestand.** De ~68KB aan app-specifieke CSS staat als inline `<style>` blok in `app.html` (het HTML bestand is ~185KB / 3.281 regels totaal, waarvan ~1.070 regels CSS). Dit is relevant voor de implementatie: je bewerkt `app.html`, niet een los `.css` bestand.

De inline CSS bevat dezelfde problemen als `style.css` maar op grotere schaal: **150+ hardcoded kleuren**, **80+ hardcoded font sizes**, **50+ handmatige shadows**, **60+ hardcoded radii**. De aanpak is identiek aan Fase 16.

**Extra aandachtspunt: inline styles op HTML-elementen.** `app.html` bevat ook ~14 inline `style="..."` attributen op HTML-elementen, waaronder dynamisch gegenereerde kleuren via JavaScript template literals (bijv. peuterscore badges: `` style="background:${psColor}18;color:${psColor}" ``). Deze zijn NIET migreerbaar via CSS tokens en vereisen JS-refactoring:

```javascript
// Oud (hardcoded inline style):
style="background:${psColor}18;color:${psColor};border:1px solid ${psColor}30"

// Nieuw (CSS class + custom property):
style="--ps-color:${psColor}"
// Met CSS:
// .peuterscore-badge { background: rgba(var(--ps-color-rgb), 0.09); color: var(--ps-color); }
```

Dit is een edge case die extra aandacht vereist in de implementatie.

### Stappen

#### 17.1 Kleurmigratie

Exact dezelfde mapping-tabellen als Fase 16.1, toegepast op `app.css`. De `rgba()` patronen zijn identiek (zelfde basiskleuren met andere opacities). Gebruik `researcher` sub-agent om exacte line numbers te inventariseren.

#### 17.2 Typografiemigratie

Zelfde mapping als Fase 16.2. Extra font sizes die specifiek in app.css voorkomen:

| Huidige `px` | Token | Context |
|---|---|---|
| `10px` | `var(--pp-text-xs)` | `.bnav-item` labels |
| `11px` | `var(--pp-text-xs)` | `.pill-weather`, `.facility` labels |
| `12px` | `var(--pp-text-xs)` | `.preset-chip`, `.filter-count` |
| `13px` | `var(--pp-text-sm)` | `.plan-location-chip`, `.plan-chip`, `.filter-panel-toggle` |
| `14px` | `var(--pp-text-sm)` | `.btn`, `.detail-back`, `.promo-cta` |
| `15px` | `var(--pp-text-base)` | `.info-link`, `.detail-btn-route` |
| `18px` | `var(--pp-text-lg)` | `.loc-card h3` |
| `22px` | `var(--pp-text-xl)` | `.info-close`, `.info-title` |

#### 17.3 Shadow, radius en spacing migratie

Identieke aanpak als Fase 16.3-16.5. `researcher` agent inventariseert; `implementer` vervangt.

#### 17.4 Backward-compatible alias referenties vervangen

Zelfde mapping-tabel als Fase 16.6, toegepast op `app.css`.

### Verificatie

Zelfde grep-commando's als Fase 16, maar op `app.css`:

```bash
grep -cP 'rgba\(\d+\s*,' app.css        # verwacht: ≤ 5
grep -cP 'font-size:\s*\d+px' app.css   # verwacht: 0
grep -cP 'box-shadow:\s*\d' app.css      # verwacht: 0
grep -cP 'var\(--(?!pp-)[a-z]' app.css  # verwacht: 0
grep -cP 'border-radius:\s*\d+px' app.css  # verwacht: ≤ 3
npm run build
```

---

## FASE 18: ICON SIZING HARMONISATIE

**Status:** `DONE`
**Agents:** `researcher` (inventariseer alle icon sizes) → `implementer` (vervang) → `verifier` (visuele check)
**Prioriteit:** HOOG
**Afhankelijk van:** Fase 16 + 17 (tokens zijn dan beschikbaar)

### Achtergrond

> "The trick is to get the line-height of your font, in this case 24 pixels, and make the icons the same size. And then tighten up the text." — Video, Icons & Buttons (6:53)

Er zijn momenteel **17+ verschillende hardcoded icon maten** (12px, 13px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, 36px, 44px, 48px). Geen enkele gebruikt de `--pp-icon-*` tokens. Veel maten (13px, 15px, 18px, 22px) bestaan niet eens als token.

### Regels

1. **Inline icons** (naast tekst): icon size = line-height van begeleidende tekst
2. **Standalone icons** (knoppen zonder tekst): `--pp-icon-sm` (20px) of `--pp-icon-md` (24px)
3. **Decoratieve icons** (sectieheaders, categorieën): `--pp-icon-lg` (32px) of `--pp-icon-xl` (48px)

### Mapping

| Huidig | Nieuw token | Context | Reden |
|---|---|---|---|
| `12px` | `var(--pp-icon-xs)` (16px) | `.pill-weather svg` | Tekst is 11px → icon 16px is proportioneel |
| `13px` | `var(--pp-icon-xs)` (16px) | `.badge-pill svg` | Tekst is 12px → icon 16px past |
| `14px` | `var(--pp-icon-xs)` (16px) | `.facility svg`, `.plan-location-chip svg`, `.gps-status` | Inline bij 11-13px tekst |
| `15px` | `var(--pp-icon-xs)` (16px) | `.preset-chip svg` | Inline bij 12px tekst |
| `16px` | `var(--pp-icon-xs)` (16px) | `.btn svg`, `.detail-back svg`, `.plan-chip svg` | Token match — al correct |
| `18px` | `var(--pp-icon-sm)` (20px) | `.filter-panel-toggle svg`, `.info-close svg`, `.detail-btn-route svg`, `.faq-item summary::after`, `.pp-btn[aria-busy]::after` | Standalone/action context |
| `20px` | `var(--pp-icon-sm)` (20px) | `.icon-btn svg`, `.info-link svg`, `.map-recenter svg`, `.bnav-item svg`, `.info-item .info-icon` | Token match — al correct |
| `22px` | `var(--pp-icon-md)` (24px) | `.card-fav svg`, `.promo-icon svg` | Prominent inline → snap naar 24px |
| `24px` | `var(--pp-icon-md)` (24px) | `.pp-icon-text svg` | Token match — al correct |
| `36px` | `var(--pp-icon-lg)` (32px) | `.nav-logo-svg`, `.category-icon` | Decoratief → snap naar 32px of gebruik `--pp-icon-xl` (48px) afhankelijk van context |

### Stappen

#### 18.1 Voeg icon sizing utilities toe aan design-system.css

```css
/* === Icon sizing utilities === */
[class*="icon"] svg,
.pp-icon { transition: color var(--pp-transition); }

.pp-icon-xs svg, svg.pp-icon-xs { width: var(--pp-icon-xs); height: var(--pp-icon-xs); }
.pp-icon-sm svg, svg.pp-icon-sm { width: var(--pp-icon-sm); height: var(--pp-icon-sm); }
.pp-icon-md svg, svg.pp-icon-md { width: var(--pp-icon-md); height: var(--pp-icon-md); }
.pp-icon-lg svg, svg.pp-icon-lg { width: var(--pp-icon-lg); height: var(--pp-icon-lg); }
.pp-icon-xl svg, svg.pp-icon-xl { width: var(--pp-icon-xl); height: var(--pp-icon-xl); }
```

#### 18.2 Migreer alle icon sizes in style.css en app.css

Vervang alle hardcoded `width: Xpx; height: Xpx;` op SVG/icon-selectoren door de overeenkomstige `var(--pp-icon-*)` tokens volgens bovenstaande mapping.

**Voorbeeld:**

```css
/* Oud: */
.badge-pill svg { width: 13px; height: 13px; }
/* Nieuw: */
.badge-pill svg { width: var(--pp-icon-xs); height: var(--pp-icon-xs); }

/* Oud: */
.card-fav svg { width: 22px; height: 22px; }
/* Nieuw: */
.card-fav svg { width: var(--pp-icon-md); height: var(--pp-icon-md); }
```

### Verificatie

```bash
# Alle icon sizes gebruiken tokens
grep -P 'width:\s*\d+px.*height:\s*\d+px' style.css app.css | grep -i 'svg\|icon'
# Verwacht: 0 matches (behalve .nav-logo als die bewust afwijkt)

# Token usage check
grep -c 'pp-icon-' style.css app.css
# Verwacht: ≥ 20 matches
```

---

## FASE 19: INTERACTION STATE MATRIX

**Status:** `DONE`
**Agents:** `researcher` (inventariseer alle interactieve elementen en hun states) → `implementer` (voeg states toe per bestand) → `verifier` (visuele check + keyboard navigatie test)
**Prioriteit:** HOOG — video: "when a user does anything, there should be a response"
**Parallel met:** Fase 18 + 20 (geen gedeelde CSS-selectoren)

### Achtergrond

> "A good rule of design is when a user does anything, there should be a response. For example, every button needs at least four states: default, hovered, active or pressed, and disabled." — Video, Feedback & States (7:29)

**Huidige staat:**
- `:hover` — aanwezig op ~55 van 60 elementen ✓
- `:active` — aanwezig op **7 van 60** elementen ✗
- `:focus-visible` — element-specifiek op **1 van 60** ✗
- `:disabled` — op **1 van 60** ✗
- `transition` — op **~30 van 60** ✗

### Stappen

#### 19.1 Generieke state templates in design-system.css

**Bestand:** `design-system.css` — toevoegen aan utilities sectie

```css
/* === Interactive State Defaults ===
   Applied to any element with a transition.
   Individual selectors can override these patterns. */

/* Active = slight scale down for tactile feel.
   Excludes summary (FAQ accordion) — scale op summary voelt storend
   bij open/close animatie. Excludes elements met eigen :active in app.css. */
:where(a, button, [role="button"]):active:not(:disabled) {
  transform: scale(0.98);
}

/* Focus-visible = brand-colored ring */
:where(a, button, [role="button"], input, select, textarea, summary):focus-visible {
  outline: 2px solid var(--pp-primary);
  outline-offset: 2px;
  border-radius: var(--pp-radius-xs);
}

/* Disabled = reduced opacity, no pointer events */
:where(button, [role="button"], .btn, a.btn):disabled,
:where(button, [role="button"], .btn, a.btn)[aria-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
```

**Waarom `:where()`:** Specificity van 0, dus individuele selectors kunnen altijd overriden zonder `!important`.

#### 19.2 Element-specifieke :active states in style.css

**Bestand:** `style.css`

Voeg `:active` toe aan alle interactieve elementen die dit missen. Patroon: subtiele visuele feedback bij klik/tap.

```css
/* Buttons — active = darker bg + slight inset shadow */
.nav-cta:active { background: var(--pp-primary-600); }
.loc-detail-btn:active { background: var(--pp-primary-600); color: var(--pp-text-inverse); }
.loc-website-btn:active { background: rgba(var(--pp-text-rgb), 0.08); }
.cta-block a:active { transform: scale(0.97); }
.btn-route:active { background: var(--pp-primary-600); }
.btn-support:active { background: var(--pp-secondary-700); }
.btn-app-cta:active { transform: scale(0.97); }
.newsletter-signup button:active { transform: scale(0.97); }

/* Cards — active = deeper press */
.loc-item:active { transform: translateY(0) rotate(0); box-shadow: var(--pp-shadow-sm); }
.blog-card:active { transform: translateY(0); box-shadow: var(--pp-shadow-sm); }
.guide-link:active { transform: scale(0.98); }

/* Links — active = dimmed color */
.breadcrumb a:active { color: var(--pp-primary-600); }
.nav-links-box a:active { color: var(--pp-primary); }
.other-cities a:active { color: var(--pp-primary); }
footer a:active { opacity: 0.7; }

/* Share buttons */
.share-wa:active { transform: scale(0.95); }
.share-native:active { transform: scale(0.95); }
```

#### 19.3 Element-specifieke :active states in app.css

**Bestand:** `app.css`

```css
/* Buttons zonder :active */
.btn-detail:active { background: var(--pp-primary-600); }
.btn-maps:active { background: rgba(var(--pp-text-rgb), 0.08); }
.card-fav:active { transform: scale(0.9); }
.detail-back:active { background: rgba(var(--pp-text-rgb), 0.08); }
.detail-btn-route:active { background: var(--pp-primary-600); }
.detail-share-wa:active { transform: scale(0.95); }
.detail-share-native:active { transform: scale(0.95); }
.kids-counter button:active { transform: scale(0.9); }
.btn-explore:active { background: var(--pp-primary-600); }
.shortlist-btn:active { transform: scale(0.95); }
.city-chip:active { transform: scale(0.97); }
.preset-chip:active { transform: scale(0.97); }
.info-close:active { transform: scale(0.9); }
.info-link:active { opacity: 0.7; }
.promo-cta:active { transform: scale(0.97); }
.active-filters button:active { transform: scale(0.9); }
```

#### 19.4 Missende transitions toevoegen

**Bestand:** `style.css` — voeg `transition` toe aan elementen die dit missen:

```css
/* Alle interactieve elementen met ontbrekende transition */
.breadcrumb a,
.guide-inline-link,
.btn-route,
.share-wa,
.share-native,
.newsletter-signup button,
.blog-card h2 a,
.blog-content a,
.share-whatsapp,
.error-links a,
.other-cities a,
.nav-links-box a,
footer a,
.editorial-meta a,
.editorial-body a,
.editorial-support-links a,
.info-item a,
.loc-item h3 a {
  transition: all var(--pp-transition);
}
```

**Bestand:** `app.css` — idem voor:

```css
.btn,
.sort-select,
.shortlist-btn,
.promo-cta,
.active-filters button {
  transition: all var(--pp-transition);
}
```

**Let op:** `transition: all` is een pragmatische keuze voor de eerste pass. In een **opvolgstap binnen deze fase** verfijnen naar specifieke properties waar GPU-impact merkbaar is (bijv. `transform`, `box-shadow`):

```css
/* Voorkeur (specifiek): */
transition: color var(--pp-transition), background-color var(--pp-transition);
/* Acceptabel voor elementen zonder layout-shifting properties: */
transition: all var(--pp-transition);
```

De verifier checkt of `transition: all` niet op elementen staat die `width`, `height`, of `padding` animeren (die veroorzaken layout thrashing).

### Verificatie

- [ ] Tab door de gehele homepage → elke link/button toont focus ring
- [ ] Klik op elke button → tactiele press feedback zichtbaar
- [ ] `prefers-reduced-motion: reduce` → geen transitions/transforms
- [ ] Lighthouse Accessibility score ≥ 95
- [ ] Keyboard-only navigatie werkt op app.html (alle filters, cards, detail view)

---

## FASE 20: BUTTON & CHIP PADDING HARMONISATIE

**Status:** `DONE`
**Agents:** `implementer` (directe wijzigingen) → `verifier` (visuele check + responsive)
**Prioriteit:** HOOG
**Parallel met:** Fase 18 + 19
**Afhankelijk van:** Fase 16 + 17 (spacing tokens beschikbaar)

### Achtergrond

> "A good guideline for padding on these is to double the height for the width." — Video, Icons & Buttons (6:53)

Slechts **7 van 24** button-like elementen volgen de 1:2 (height:width) padding richtlijn. Veel gebruiken off-grid waarden (7px, 13px, 15px).

### Regels

1. **Buttons:** padding-block : padding-inline = 1 : 2 (bijv. `8px 16px`, `12px 24px`)
2. **Chips/pills:** padding-block : padding-inline = 1 : 1.5-2 (bijv. `6px 12px`, `8px 14px`)
3. **Alle waarden op het 4pt grid** (4, 8, 12, 16, 20, 24, 28, 32px)
4. **Gebruik `var(--pp-space-*)` tokens** waar de waarde een token-stap is

### Mapping — Buttons

| Selector | Huidig | Nieuw | Ratio |
|---|---|---|---|
| `.loc-detail-btn` | `7px 16px` | `8px 16px` | 1:2 ✓ |
| `.loc-website-btn` | `7px 16px` | `8px 16px` | 1:2 ✓ |
| `.nav-cta` | `8px 18px` | `8px 16px` | 1:2 ✓ |
| `.cta-block a` | `13px 28px` | `12px 24px` | 1:2 ✓ |
| `.btn-app-cta` | `10px 22px` | `12px 24px` | 1:2 ✓ |
| `.share-wa, .share-native` | `10px 18px` | `8px 16px` | 1:2 ✓ |
| `.newsletter-signup button` | `14px 32px` | `12px 24px` | 1:2 ✓ |
| `.share-btn` | `10px 20px` | `8px 16px` | 1:2 ✓ |
| app `.btn` | `12px 14px` | `12px 24px` | 1:2 ✓ |
| `.shortlist-btn` | `8px 12px` | `8px 16px` | 1:2 ✓ |
| `.detail-back` | `8px 14px` | `8px 16px` | 1:2 ✓ |
| `.detail-btn-route` | `12px 22px` | `12px 24px` | 1:2 ✓ |
| `.detail-share-wa/native` | `10px 16px` | `8px 16px` | 1:2 ✓ |
| `.plan-generate-btn` | `15px` (all) | `12px 24px` | 1:2 ✓ |
| `.promo-cta` | `8px 16px` | `8px 16px` | 1:2 ✓ (al goed) |

### Mapping — Chips/Pills

| Selector | Huidig | Nieuw | Ratio |
|---|---|---|---|
| `.chip` | `10px 16px` | `8px 16px` | 1:2 ✓ |
| `.plan-chip` | `10px 12px` | `8px 16px` | 1:2 ✓ |
| `.preset-chip` | `10px 14px` | `8px 16px` | 1:2 ✓ |
| `.badge-pill` | `3px 10px` | `4px 8px` | 1:2 ✓ (compact variant) |
| `.guide-pill` | `7px 11px` | `4px 8px` | 1:2 ✓ |
| `.coverage-chip` | `7px 11px` | `4px 8px` | 1:2 ✓ |
| `.hero-kicker` | `7px 14px` | `4px 12px` | 1:3 (kicker is bewust breder) |

### Verificatie

```bash
# Geen off-grid padding waarden meer
grep -P 'padding.*\b(5|7|9|11|13|15|17|19|21|23|25|26|27|29|30|31|33|34)px' style.css app.css
# Verwacht: 0

# Visueel: alle buttons uniform en proportioneel op mobile + desktop
```

---

## FASE 21: FORM FEEDBACK, TOOLTIPS & ONTBREKENDE STIJLEN

**Status:** `DONE`
**Agents:** `implementer` (CSS + JS wijzigingen) → `verifier` (interactieve test)
**Prioriteit:** MEDIUM-HOOG
**Afhankelijk van:** Fase 16-19

### Achtergrond

> "Inputs are even more critical. You'll need a focus state when the user clicks in, error states with red borders, and messages when something's wrong." — Video, Feedback & States (7:29)

Drie specifieke problemen:
1. Newsletter form heeft **geen enkele feedback** (geen loading, success, error state)
2. `.section-hub-link` ("Bekijk alle Speeltuinen →") heeft **helemaal geen CSS**
3. Geen custom tooltip component (alleen native `title` attributes)

### Stappen

#### 21.1 Newsletter form feedback

**Bestand:** `style.css` (CSS) + generators (HTML) + eventueel een klein JS-blok

**HTML wijziging** (in city page generator en andere generators die het newsletter block bevatten):

```html
<form class="newsletter-signup" action="..." method="post" target="popupwindow">
  <div class="newsletter-field">
    <input type="email" name="email" placeholder="Je e-mailadres" required
           aria-describedby="newsletter-msg">
    <button type="submit">
      <span class="newsletter-btn-label">Aanmelden</span>
      <span class="newsletter-btn-loading" hidden>
        <svg class="pp-spinner" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"
                  stroke-width="2.5" stroke-dasharray="50" stroke-linecap="round"/>
        </svg>
      </span>
    </button>
  </div>
  <p id="newsletter-msg" class="newsletter-msg" aria-live="polite" hidden></p>
</form>
```

**CSS:**

```css
/* Newsletter states */
.newsletter-msg {
  font-size: var(--pp-text-xs);
  margin-top: var(--pp-space-sm);
  padding: var(--pp-space-xs) var(--pp-space-sm);
  border-radius: var(--pp-radius-xs);
}
.newsletter-msg--success {
  background: var(--pp-semantic-success-bg);
  color: var(--pp-semantic-success);
  border: 1px solid var(--pp-semantic-success-border);
}
.newsletter-msg--error {
  background: var(--pp-semantic-error-bg);
  color: var(--pp-semantic-error);
  border: 1px solid var(--pp-semantic-error-border);
}
.newsletter-signup input:invalid:not(:placeholder-shown) {
  border-color: var(--pp-semantic-error);
}
.newsletter-signup button[aria-busy="true"] .newsletter-btn-label { display: none; }
.newsletter-signup button[aria-busy="true"] .newsletter-btn-loading { display: inline-flex; }

.pp-spinner {
  width: var(--pp-icon-sm);
  height: var(--pp-icon-sm);
  animation: pp-spin 0.8s linear infinite;
}
/* NB: @keyframes pp-spin bestaat al in design-system.css (regel 619).
   NIET opnieuw definiëren — hergebruik de bestaande keyframe. */
```

**JS** (inline in generator output of in `pp-interactions.js`):

```javascript
document.querySelectorAll('.newsletter-signup').forEach(form => {
  form.addEventListener('submit', e => {
    const btn = form.querySelector('button');
    const msg = form.querySelector('.newsletter-msg');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    msg.hidden = true;

    // De form submit gaat via target="popupwindow", dus we simuleren feedback
    setTimeout(() => {
      btn.setAttribute('aria-busy', 'false');
      btn.disabled = false;
      msg.textContent = 'Bedankt voor je aanmelding!';
      msg.className = 'newsletter-msg newsletter-msg--success';
      msg.hidden = false;
      form.reset();
    }, 1500);
  });
});
```

#### 21.2 `.section-hub-link` styling

**Bestand:** `style.css`

```css
.section-hub-link {
  display: inline-flex;
  align-items: center;
  gap: var(--pp-space-xs);
  font-family: var(--pp-font-ui);
  font-size: var(--pp-text-sm);
  font-weight: 600;
  color: var(--pp-primary);
  text-decoration: none;
  padding: var(--pp-space-xs) var(--pp-space-sm);
  border-radius: var(--pp-radius-xs);
  transition: all var(--pp-transition);
}
.section-hub-link:hover {
  color: var(--pp-primary-dark);
  background: rgba(var(--pp-primary-rgb), 0.06);
}
.section-hub-link:active {
  transform: scale(0.97);
}
.section-hub-link::after {
  content: '→';
  transition: transform var(--pp-transition);
}
.section-hub-link:hover::after {
  transform: translateX(3px);
}
```

#### 21.3 Custom tooltip component

**Bestand:** `design-system.css`

```css
/* === Tooltip === */
[data-tooltip] {
  position: relative;
}
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + var(--pp-space-sm));
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: var(--pp-space-xs) var(--pp-space-sm);
  background: var(--pp-surface-dark);
  color: var(--pp-text-inverse);
  font-family: var(--pp-font-ui);
  font-size: var(--pp-text-xs);
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  border-radius: var(--pp-radius-xs);
  box-shadow: var(--pp-shadow-popover);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--pp-transition), transform var(--pp-transition);
  z-index: 1000;
}
[data-tooltip]:hover::after,
[data-tooltip]:focus-visible::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
/* Positionering-varianten */
[data-tooltip-pos="bottom"]::after {
  bottom: auto;
  top: calc(100% + var(--pp-space-sm));
}
[data-tooltip-pos="left"]::after {
  bottom: auto;
  left: auto;
  right: calc(100% + var(--pp-space-sm));
  top: 50%;
  transform: translateY(-50%) translateX(4px);
}
[data-tooltip-pos="left"]:hover::after,
[data-tooltip-pos="left"]:focus-visible::after {
  transform: translateY(-50%) translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  [data-tooltip]::after { transition: none; }
}
```

**Migratie in app.html:** Vervang `title="Gebruik mijn locatie"` door `data-tooltip="Gebruik mijn locatie"` op GPS button, map recenter, peuterscore badge, etc.

**Op gegenereerde pagina's:** Voeg `data-tooltip` toe aan badge-pills, action buttons en informatie-iconen.

#### 21.4 Breadcrumb hover transition

**Bestand:** `style.css`

```css
.breadcrumb a {
  transition: color var(--pp-transition);
}
.breadcrumb a:hover {
  color: var(--pp-primary);
}
```

### Verificatie

- [ ] Newsletter: submit → loading spinner → success bericht
- [ ] Newsletter: leeg veld → HTML5 validatie + rood border op `:invalid:not(:placeholder-shown)`
- [ ] `.section-hub-link` zichtbaar en gestyled op alle stadspagina's
- [ ] Tooltips verschijnen op hover + focus-visible
- [ ] Breadcrumbs: smooth hover transition
- [ ] `prefers-reduced-motion: reduce` → geen tooltip-animatie

---

## FASE 22: CSS CONSOLIDATIE & PERFORMANCE

**Status:** `DONE`
**Agents:** `researcher` (inventariseer duplicatie) → `implementer` (cleanup + minificatie) → `verifier` (build + performance)
**Prioriteit:** MEDIUM
**Afhankelijk van:** Fase 14-21 (alle inhoudelijke wijzigingen zijn klaar)

### Achtergrond

Na de token-migratie zijn er nog drie performance/maintenance issues:

1. **Inline `<style>` blokken** in gegenereerde pagina's dupliceren (en soms divergeren van) `style.css`
2. **app.css is niet geminified** (68KB — het grootste CSS bestand)
3. **Fraunces font is 192KB** — ver boven het performancebudget van ≤150KB totaal
4. **Backward-compatible aliases** in `design-system.css` zijn na migratie overbodig

### Stappen

#### 22.1 Inline `<style>` deduplicatie

**Bestanden:** `.scripts/lib/generators/city-pages.js`, `location-pages.js`, `type-pages.js`, `cluster-pages.js`, `blog-pages.js`

De generators injecteren `<style>` blokken met styles voor `.guide-card`, `.editorial-body`, `.explore-cta`, `.btn-explore`, `.related-blogs`, `.verified-badge`, etc. Deze moeten **verplaatst worden naar `style.css`** zodat ze (`style.min.css` wordt automatisch geregenereerd door `css-minify.js` bij `npm run build`):
- Op één plek onderhouden worden
- Gecacht worden tussen pagina's
- Niet per pagina de HTML opblazen

**Aanpak:**
1. `researcher` agent: grep alle `<style>` blokken uit generator output
2. Verplaats unieke regels naar `style.css`
3. Verwijder inline `<style>` injectie uit generators
4. Test met `npm run build` + steekproef van output pagina's

#### 22.2 app.css minificatie

**Bestand:** `.scripts/lib/css-minify.js` (uitbreiden)

Momenteel minificeert het build systeem alleen `style.css` → `style.min.css`. Breid dit uit:

```javascript
// In css-minify.js:
const filesToMinify = [
  { src: 'style.css', dest: 'style.min.css' },
  { src: 'app.css', dest: 'app.min.css' },       // NIEUW
  { src: 'nav-floating.css', dest: 'nav-floating.min.css' }  // NIEUW
];
```

Update `app.html` om `app.min.css` te laden:

```html
<link rel="stylesheet" href="/app.min.css?v=${timestamp}">
```

**Verwachte besparing:** ~30-40% (68KB → ~40-45KB).

#### 22.3 Fraunces font subsetting

**Probleem:** `fraunces-var.woff2` is 192KB — ruim boven het font budget van 150KB voor ALLE fonts samen.

**Oorzaak:** Het bestand bevat waarschijnlijk het volledige character set inclusief Cyrillic, Vietnamese, en alle OpenType features.

**Oplossing:** Subset het font met `pyftsubset` of `glyphhanger`:

```bash
# Alleen Latin + Latin Extended + common punctuation
pyftsubset fraunces-var.woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features="kern,liga,calt,frac,sups,subs" \
  --flavor=woff2 \
  --output-file=fraunces-var-subset.woff2
```

**Verwachte besparing:** 192KB → ~80-100KB.

#### 22.4 Backward-compatible aliases verwijderen

**Bestand:** `design-system.css`

Na voltooiing van Fase 16 + 17 gebruiken `style.css` en `app.css` geen unprefixed aliases meer. Verwijder het volledige `/* === Backward-compatible aliases === */` blok (regel 173-213 in huidige versie).

**Controleer eerst:**

```bash
# Geen enkel CSS bestand mag nog unprefixed aliases gebruiken
grep -rP 'var\(--(?!pp-)[a-z]' *.css
# Verwacht: 0 matches
```

**Uitzondering:** Als `nav-floating.css` of portal CSS nog aliases gebruikt, migreer die ook eerst.

#### 22.5 Ongebruikte `.pp-*` component classes opruimen

Na Fase 14-21: inventariseer welke `.pp-*` classes nog steeds ongebruikt zijn. Verwijder deze uit `design-system.css` om het bestand lean te houden. Bewaar alleen:

- Tokens (`:root` block) — altijd behouden
- Components die daadwerkelijk in HTML voorkomen
- Utility classes die door meerdere consumers gebruikt worden

**Niet verwijderen:** `.pp-toast`, `.pp-skeleton`, `.pp-reveal` — deze worden door JS aangemaakt en zijn niet grep-baar in HTML.

**Fix hardcoded waarden in design-system.css zelf:** `.pp-location-card` (regel ~551) gebruikt `border-radius: 14px` — vervang door `border-radius: var(--pp-radius-sm)`. Scan het hele bestand op andere hardcoded `px` waarden buiten de `:root` token-definitie.

### Verificatie

```bash
# Geen inline <style> meer in gegenereerde pagina's
grep -r '<style>' amsterdam.html rotterdam.html speeltuinen.html | wc -l
# Verwacht: 0 (of max 1 voor critical CSS)

# app.min.css bestaat en is kleiner dan app.css
ls -la app.css app.min.css
# app.min.css moet < 50KB zijn

# Font budget
ls -la fonts/
# Totaal < 180KB (Fraunces ~90KB + DM Sans ~80KB + Instrument Serif ~16KB)

# Geen backward-compatible aliases meer
grep -c 'Backward-compatible' design-system.css
# Verwacht: 0

# Full build
npm run build
```

---

## FASE 23: COMPLIANCE AUDIT & VERIFICATIE

**Status:** `DONE`
**Agents:** `implementer` (audit script) → `verifier` (CI integratie + full run)
**Prioriteit:** MEDIUM — borgt alles voor de toekomst
**Afhankelijk van:** Alle voorgaande fasen

### Achtergrond

Zonder geautomatiseerde handhaving driften `style.css` en `app.css` onvermijdelijk weer af van het design system. Deze fase maakt het onmogelijk om hardcoded waarden terug te introduceren.

### Stappen

#### 23.1 Design system compliance audit script

**Bestand:** `.scripts/audit_design_tokens.js` (nieuw)

```javascript
#!/usr/bin/env node
/**
 * Design Token Compliance Audit
 * Scant CSS-bestanden op hardcoded waarden die tokens moeten zijn.
 * Exit code 1 = violations gevonden (blokkeert CI in strict mode).
 */

const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
const CSS_FILES = ['style.css', 'app.css', 'nav-floating.css'];

const RULES = [
  {
    name: 'hardcoded-rgba',
    pattern: /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/g,
    message: 'Hardcoded rgba() — gebruik rgba(var(--pp-*-rgb), opacity)',
    allowList: [/design-system\.css/],
    maxViolations: 5,
  },
  {
    name: 'hardcoded-font-size',
    pattern: /font-size:\s*\d+px/g,
    message: 'Hardcoded font-size — gebruik var(--pp-text-*)',
    allowList: [/design-system\.css/, /error-page h1/],
    maxViolations: 2,
  },
  {
    name: 'hardcoded-shadow',
    pattern: /box-shadow:\s*\d+px\s+\d+px/g,
    message: 'Hardcoded box-shadow — gebruik var(--pp-shadow-*)',
    allowList: [/design-system\.css/],
    maxViolations: 0,
  },
  {
    name: 'hardcoded-radius',
    pattern: /border-radius:\s*\d+px(?!\s*\/)/g,
    message: 'Hardcoded border-radius — gebruik var(--pp-radius-*)',
    allowList: [/design-system\.css/],
    maxViolations: 3,
  },
  {
    name: 'unprefixed-alias',
    pattern: /var\(--(?!pp-)[a-z][a-z-]*\)/g,
    message: 'Unprefixed CSS variable — gebruik var(--pp-*)',
    allowList: [/design-system\.css/],
    maxViolations: 0,
  },
  {
    name: 'hardcoded-hex',
    pattern: /#[0-9a-fA-F]{3,8}(?!.*(?:url|svg|data|content))/g,
    message: 'Hardcoded hex kleur — gebruik var(--pp-*)',
    allowList: [/design-system\.css/, /fonts\.css/],
    maxViolations: 10, // Gradient stops en SVG fills mogen
  },
  {
    name: 'off-grid-spacing',
    pattern: /(?:padding|margin|gap).*?\b(?:5|7|9|11|13|15|17|19|21|23|25|26|27|29|30|31|33|34|35)px/g,
    message: 'Off-grid spacing — gebruik 4pt grid (4,8,12,16,20,24,28,32,48,64,96,128)',
    allowList: [/design-system\.css/],
    maxViolations: 0,
  },
  {
    name: 'hardcoded-icon-size',
    pattern: /(?:width|height):\s*(?:12|13|14|15|18|22)px/g,
    message: 'Non-standard icon size — gebruik var(--pp-icon-*)',
    allowList: [/design-system\.css/],
    maxViolations: 0,
  },
];

let totalViolations = 0;

for (const file of CSS_FILES) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const rule of RULES) {
    if (rule.allowList?.some(re => re.test(file))) continue;

    let count = 0;
    lines.forEach((line, i) => {
      const matches = line.match(rule.pattern);
      if (matches) {
        count += matches.length;
        if (count <= 3 || !STRICT) {
          console.log(`  ${file}:${i + 1} [${rule.name}] ${line.trim()}`);
        }
      }
    });

    if (count > rule.maxViolations) {
      console.log(`\n❌ ${file}: ${rule.name} — ${count} violations (max ${rule.maxViolations})`);
      console.log(`   ${rule.message}\n`);
      totalViolations += count - rule.maxViolations;
    }
  }
}

if (totalViolations > 0) {
  console.log(`\n🚫 ${totalViolations} design token violations gevonden.`);
  if (STRICT) process.exit(1);
} else {
  console.log('\n✅ Alle CSS bestanden voldoen aan het design system.');
}
```

#### 23.2 CI integratie

**Bestand:** `.github/workflows/sync-site.yml`

Voeg toe als audit gate (naast bestaande audits):

```yaml
- name: Design token compliance audit
  run: node .scripts/audit_design_tokens.js --strict
```

#### 23.3 NPM script

**Bestand:** `package.json`

```json
{
  "scripts": {
    "audit:tokens": "node .scripts/audit_design_tokens.js",
    "audit:tokens:strict": "node .scripts/audit_design_tokens.js --strict"
  }
}
```

#### 23.4 Visuele regressie checklist

Na alle fasen: handmatige visuele check op de volgende pagina's:

- [ ] Homepage (desktop + mobile)
- [ ] Amsterdam stadspagina (desktop + mobile)
- [ ] Speeltuinen type pagina
- [ ] Een locatie detailpagina
- [ ] app.html (search, filters, results, detail view, map, plan wizard)
- [ ] Een blogpost
- [ ] 404 pagina
- [ ] Contact pagina
- [ ] admin.peuterplannen.nl
- [ ] partner.peuterplannen.nl

Per pagina controleren:
- [ ] Geen visuele regressies t.o.v. huidige versie
- [ ] Afbeeldingen laden correct (Fase 14)
- [ ] Hover/active/focus states werken op alle interactieve elementen
- [ ] Tooltips verschijnen waar verwacht
- [ ] Mobile responsive layout intact
- [ ] Dark mode niet gebroken (als die bestaat via OS preference)
- [ ] `prefers-reduced-motion` respecteert: geen animaties

### Verificatie

```bash
# Audit slaagt in strict mode
npm run audit:tokens:strict
# Exit code: 0

# Full build succesvol
npm run build
# Exit code: 0

# Alle bestaande audits slagen
node .scripts/audit_internal.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo.js --strict
```

---

## IMPLEMENTATIE-VOLGORDE (EXECUTIEPLAN FASE 2)

### Sprint 1: Fundament (Fase 15) + Imagery fundament (Fase 14 stap 1-4)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 1-2                                                │
│                                                         │
│  [Fase 15: RGB Channel Vars]  ◄── Snel, ~30 min        │
│        │                                                │
│  [Fase 14 stap 1-4:]                                    │
│  • 14.1 Tokens in design-system.css                     │
│  • 14.2 fetch-photos.js schrijven (nog niet runnen)     │
│  • 14.3 Database migratie (photo_url kolom)             │
│  • 14.4 Card image CSS component                        │
│                                                         │
│  ⚠ Google API key setup is voorwaarde voor 14.2 te      │
│    RUNNEN, maar het script kan al GESCHREVEN worden.     │
│  /clear na Fase 15                                      │
└─────────────────────────────────────────────────────────┘
```

### Sprint 2: Token Migratie (Fase 16 + 17)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 3-5                                                │
│                                                         │
│  [Fase 16: style.css]  ──── PARALLEL ────  [Fase 17:   │
│                                             app.css]    │
│                                                         │
│  Sub-agent per bestand:                                 │
│  • researcher: inventariseer exact                      │
│  • implementer: vervang per categorie                   │
│  • verifier: grep-audit                                 │
│                                                         │
│  /clear na elk bestand                                  │
└─────────────────────────────────────────────────────────┘
```

### Sprint 3: Harmonisatie (Fase 18 → 19 → 20)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 6-8                                                │
│                                                         │
│  [Fase 18: Icons]                                       │
│        │  /clear                                        │
│        ▼                                                │
│  [Fase 19: States]                                      │
│        │  /clear                                        │
│        ▼                                                │
│  [Fase 20: Button Padding]                              │
│                                                         │
│  ⚠ NIET parallel: alle drie bewerken style.css +        │
│    app.html. Sequentieel uitvoeren om merge conflicts    │
│    te voorkomen. /clear na elke fase.                    │
└─────────────────────────────────────────────────────────┘
```

### Sprint 4: Polish (Fase 21 + 22)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 8-9                                                │
│                                                         │
│  [Fase 21: Form + Tooltips + Hub Link]                  │
│        │                                                │
│        ▼                                                │
│  [Fase 22: CSS Cleanup + Minification]                  │
│                                                         │
│  /clear tussen fasen                                    │
└─────────────────────────────────────────────────────────┘
```

### Sprint 5: Verificatie (Fase 23)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 10                                                 │
│                                                         │
│  [Fase 23: Audit Script + CI + Visuele Check]           │
│                                                         │
│  Full build + alle audits + handmatige steekproef       │
└─────────────────────────────────────────────────────────┘
```

### Sprint 6: Imagery afronden (Fase 14 stap 5-9)

```
┌─────────────────────────────────────────────────────────┐
│  DAG 11-14                                              │
│                                                         │
│  Voorwaarde: Google Maps API key met Places Photos      │
│  enabled in secrets.                                    │
│                                                         │
│  [Fase 14 stap 5-9:]                                    │
│  • 14.5 City page generator update (card HTML)          │
│  • 14.6 Location detail page hero image                 │
│  • 14.7 app.html card rendering + SELECT update         │
│  • 14.8 Image optimalisatie pipeline                    │
│  • 14.9 CI/CD integratie (weekly photo fetch)           │
│                                                         │
│  Plus: eerste batch foto's downloaden en optimaliseren  │
│  Visuele QA op 22 stadspagina's                        │
└─────────────────────────────────────────────────────────┘
```

---

## DESIGN BESLISSINGEN FASE 2 — MOTIVATIE

| Beslissing | Waarom | Alternatief overwogen |
|---|---|---|
| RGB channel variables i.p.v. `color-mix()` | Betere browser support (99%+ vs 96%), simpeler syntax | `color-mix(in srgb, var(--pp-primary) 12%, transparent)` — eleganter maar minder breed ondersteund |
| `:where()` voor generieke states | Specificity 0 = geen cascade-conflicten | Individuele selectors — meer controle maar ~60 extra regels |
| Snap off-grid waarden naar 4pt grid | Visuele consistentie > pixel-perfect behoud van huidige design | Niets doen — leidt tot steeds meer ad-hoc waarden |
| Font subsetting | 192KB → ~90KB is significante winst | CDN (Google Fonts) — privacy concern + extra DNS lookup |
| Inline `<style>` verwijderen | Cache-efficiëntie, DRY, onderhoudbaarheid | Critical CSS inline houden — complexer build, marginale FCP winst |
| `data-tooltip` i.p.v. `title` | Styleable, animeerbaar, consistent met design system | Tooltip library (Tippy.js) — 10KB+ dependency, overkill |
| Google Places Photos | Betrouwbaar, hoge kwaliteit, `place_id` al beschikbaar | Unsplash (niet locatie-specifiek), AI-generated (uncanny), scraping (juridisch risico) |

---

## WAT FASE 2 NIET DOET

- **Dark mode** — bewuste keuze, de warme ivoor/terra look IS het merk
- **HTML-structuur refactoren** — behalve wat strict nodig is voor images en form feedback
- **Nieuwe pagina-types** — geen nieuwe generators of routes
- **Component class consolidatie** (`.loc-item` → `.pp-card`) — dit is een Fase 3 project; te riskant om gelijktijdig met token migratie te doen
- **Portal CSS migratie** — `portal-shell.css` en admin/partner portals worden apart behandeld
- **JavaScript refactoring** — alleen minimale JS voor newsletter feedback en tooltip migratie
- **A/B testing** — deploy als big bang na alle fasen, niet incrementeel

---

## STATUS TRACKER FASE 2

| # | Fase | Status | Sprint | Prioriteit | Bestanden |
|---|------|--------|--------|------------|-----------|
| 14 | Location Imagery Pipeline | `TODO` | 1+6 | KRITIEK | `.scripts/pipeline/fetch-photos.js`, generators, design-system.css, style.css, app.html |
| 15 | Token Foundation (RGB Channels) | `DONE` | 1 | KRITIEK | design-system.css |
| 16 | Token Migratie: style.css + nav-floating.css | `TODO` | 2 | KRITIEK | style.css, nav-floating.css |
| 17 | Token Migratie: app.html inline CSS | `TODO` | 2 | KRITIEK | app.html (inline `<style>` + inline `style=""` attrs) |
| 18 | Icon Sizing Harmonisatie | `DONE` | 3 | HOOG | style.css, app.html, design-system.css |
| 19 | Interaction State Matrix | `TODO` | 3 | HOOG | style.css, app.html, design-system.css |
| 20 | Button & Chip Padding | `TODO` | 3 | HOOG | style.css, app.html |
| 21 | Form Feedback & Ontbrekende Stijlen | `TODO` | 4 | MEDIUM-HOOG | style.css, generators, pp-interactions.js, design-system.css |
| 22 | CSS Consolidatie & Performance | `DONE` | 4 | MEDIUM | generators, css-minify.js, design-system.css, fonts/ |
| 23 | Compliance Audit & Verificatie | `DONE` | 5 | MEDIUM | `.scripts/audit_design_tokens.js`, sync-site.yml, package.json |

---

## VERWACHTE IMPACT FASE 2

### Visueel
- **Locatie-afbeeldingen** transformeren de scan-ervaring volledig — van tekst-wall naar visueel rijke cards
- **Consistente tokens** elimineren subtiele visuele inconsistenties (2px verschil in radii, verschillende shadow-sterktes)
- **Interaction states** maken de site voelbaar responsief op elke tap/click/hover
- **Tooltips** geven context zonder de UI te vervuilen
- **Newsletter feedback** bouwt vertrouwen

### Performance
- **app.css minificatie:** ~25KB bespaard (68KB → ~43KB)
- **Fraunces subsetting:** ~100KB bespaard (192KB → ~90KB)
- **Inline `<style>` verwijderen:** ~2-5KB per pagina × 2.200 pagina's = minder totale HTML
- **Netto:** ~150KB minder data per unieke pageview

### Onderhoudbaarheid
- **Eén waarheidsbron:** elke visuele waarde staat in `design-system.css` en nergens anders
- **Geen backward-compatible aliases** — geen verwarring meer over welke variabele te gebruiken
- **Geautomatiseerde handhaving:** CI blokkeert nieuwe hardcoded waarden
- **Grep-bare codebase:** `grep 'pp-primary' *.css` vindt alles

### Schaalbaarheid
- **Nieuwe pagina-types** hoeven alleen tokens te refereren, geen waarden te kopiëren
- **Kleurwijzigingen** (bijv. seizoensthema) vereisen 1 token-wijziging → 2.200+ pagina's updaten automatisch
- **Design system audit** vangt regressies voordat ze in productie komen
- **Afbeeldingen-pipeline** schaalt automatisch mee bij nieuwe locaties
