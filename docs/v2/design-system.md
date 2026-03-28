# PeuterPlannen v2 — Design System

> **"Apple Maps but warm."**
> 85-90% Apple Maps in structure, layout, buttons, and sheet behavior.
> Own character through warm coral/terracotta colors, Newsreader for location names, and warm-tinted backgrounds.
> Light mode only. No dark mode.

---

## 1. Typography

**Primary font:** Inter (variable, Google Fonts) — closest web equivalent to SF Pro.
**Accent font:** Newsreader — ONLY for location names on the detail sheet. Editorial warmth.

No Instrument Serif. No Plus Jakarta Sans. One UI font, hierarchy through weight and size.

### Apple Dynamic Type Scale

| Style | Size | Weight | Tracking | CSS Variable |
|-------|------|--------|----------|--------------|
| Large Title | 34px | Bold (700) | -0.031em | `--type-large-title` |
| Title 1 | 28px | Regular (400) | -0.029em | `--type-title1` |
| Title 2 | 22px | Regular (400) | -0.032em | `--type-title2` |
| Title 3 | 20px | Regular (400) | -0.030em | `--type-title3` |
| Headline | 17px | Semibold (600) | -0.025em | `--type-headline` |
| Body | 17px | Regular (400) | -0.025em | `--type-body` |
| Callout | 16px | Regular (400) | -0.020em | `--type-callout` |
| Subheadline | 15px | Regular (400) | 0 | `--type-subheadline` |
| Footnote | 13px | Regular (400) | +0.002em | `--type-footnote` |
| Caption 1 | 12px | Regular (400) | +0.010em | `--type-caption1` |
| Caption 2 | 11px | Regular (400) | +0.014em | `--type-caption2` |

### Font loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

---

## 2. Colors

Apple Maps semantic color system, adapted with warm terracotta palette.

### CSS Variables

```css
:root {
  /* === Accent (replaces Apple systemBlue) === */
  --color-accent:         #C05A3A; /* deep terracotta — primary actions, links, CTAs */
  --color-accent-hover:   #A84D32; /* darker for hover/pressed */
  --color-accent-active:  #93422B;

  /* === Labels (text hierarchy) === */
  --color-label:          #1A1209;                    /* primary text — warm near-black */
  --color-label-secondary: rgba(90, 60, 40, 0.60);   /* effective ~#6B5A4E */
  --color-label-tertiary:  rgba(90, 60, 40, 0.30);
  --color-label-quaternary: rgba(90, 60, 40, 0.18);

  /* === Backgrounds === */
  --color-bg-primary:     #FFFAF7; /* barely warm white — sheet, page */
  --color-bg-secondary:   #F5EDE6; /* warm off-white — grouped backgrounds */
  --color-bg-tertiary:    #FFFFFF; /* pure white — cards on grouped bg */

  /* === Separator === */
  --color-separator:      rgba(180, 130, 100, 0.25); /* renders ~#E0D0C4 */

  /* === System colors (Apple standard) === */
  --color-system-green:   #34C759; /* open badge */
  --color-system-red:     #FF3B30; /* closed / error */
  --color-system-yellow:  #FFCC00; /* warning */

  /* === Category colors === */
  --color-cat-play:       #52B788; /* speeltuinen */
  --color-cat-farm:       #8B6F47; /* boerderijen */
  --color-cat-nature:     #2D6A4F; /* natuur */
  --color-cat-museum:     #7B2D8B; /* musea */
  --color-cat-culture:    #5B3F8B; /* cultuur */
  --color-cat-swim:       #2196F3; /* zwemmen */
  --color-cat-pancake:    #E9C46A; /* pannenkoeken */
  --color-cat-horeca:     #E76F51; /* horeca */

  /* === Glass (map controls ONLY) === */
  --color-glass-bg:       rgba(255, 250, 247, 0.85);
  --glass-blur:           blur(20px) saturate(180%);
}
```

---

## 3. Spacing

Apple Maps rhythm: multiples of 4.

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;  /* sheet horizontal padding, card padding, button gap */
  --space-6:  24px;  /* section spacing */
  --space-8:  32px;

  --sheet-padding-x: 16px;
  --card-padding:    16px;
  --section-gap:     24px;
  --tap-target-min:  44px;
}
```

---

## 4. Corner Radii

```css
:root {
  --radius-sheet:    16px;  /* floating state; morphs to 0 at full */
  --radius-card:     12px;
  --radius-circle:   50%;   /* action buttons */
  --radius-pill:     999px; /* search bar */
  --radius-photo:    10px;  /* 8-12px range */
  --radius-badge:    8px;   /* tags, badges */
}
```

---

## 5. Shadows

Apple Maps style: subtle, multi-layer.

```css
:root {
  --shadow-sheet: 0 4px 8px rgba(0,0,0,0.07),
                  0 8px 24px rgba(0,0,0,0.08),
                  0 16px 48px rgba(0,0,0,0.05);

  --shadow-card:  0 2px 8px rgba(0,0,0,0.08),
                  0 4px 16px rgba(0,0,0,0.06);
}
```

---

## 6. Motion

Spring physics matching Apple Maps.

```css
:root {
  --ease-default:   cubic-bezier(0.32, 0.72, 0, 1);   /* non-bouncy spring */
  --ease-bouncy:    cubic-bezier(0.34, 1.56, 0.64, 1); /* playful elements */

  --duration-fast:    200ms;
  --duration-default: 350ms;
  --duration-slow:    500ms;

  --stagger-card:     40ms;  /* per card in list */
  --duration-sheet:   350ms; /* sheet snap — velocity-based spring */
}
```

---

## 7. Icons

- Style: filled SVG, consistent weight, rounded corners
- Sizes:
  - 22px in action buttons
  - 20px in navigation
  - 17-20px in list rows
  - 13px trailing chevrons
- Category icons: custom SVG set with colored circular backgrounds (Apple Maps "Find Nearby" style)
- **No emoji anywhere in the UI**

---

## 8. Components

### 8.1 Sheet

Solid background. NOT frosted glass.

| Property | Value |
|----------|-------|
| Background | `--color-bg-primary` (#FFFAF7) |
| Corner radius | 16px at peek, morphs to 0 at full |
| Shadow | `--shadow-sheet` |
| Horizontal padding | 16px |
| Drag handle | 36 x 5px, `rgba(160, 130, 110, 0.30)`, centered, 8px from top |
| Dividers | 0.5px hairline, `--color-separator`, 16px inset from left |
| Snap states | peek (~25%), half (~50%), full (~92%) |
| Animation | velocity-based spring, ~350ms, `--ease-default` |

Two sheet types:
- **Browse sheet**: search bar, filters, result cards
- **Detail sheet**: location info, separate peek/half/full states

### 8.2 Action Buttons (Apple Maps circular row)

Horizontal row of circular icon buttons with label below.

| Property | Value |
|----------|-------|
| Circle diameter | 48px (exceeds 44px min tap target) |
| Icon size | 22px inside circle |
| Primary action (Route) | terracotta fill (`--color-accent`), white icon |
| Other actions | warm gray fill (`--color-bg-secondary`), dark icon |
| Label | Caption 2 (11px Regular), centered below circle |
| Spacing between buttons | 16px |

### 8.3 Cards (carousel)

Compact horizontal scroll cards.

| Property | Value |
|----------|-------|
| Width | ~200px |
| Photo | 72px square, `--radius-photo` |
| Content | name + type + score + distance |
| Background | `--color-bg-tertiary` (white) |
| Corner radius | `--radius-card` (12px) |
| Shadow | `--shadow-card` |
| Padding | `--card-padding` (16px) |

### 8.4 Contextual Suggestion Rows

Apple Maps "Find Nearby" style.

| Property | Value |
|----------|-------|
| Layout | full-width row, colored circular icon left, label right |
| Icon circle | category color background, white icon |
| Divider | 0.5px hairline, inset 16px from left |

### 8.5 Search Bar

| Property | Value |
|----------|-------|
| Shape | pill (`--radius-pill`) |
| Background | `--color-bg-secondary` |
| Height | 44px (tap target) |
| Icon | search glyph, `--color-label-secondary` |
| Placeholder text | `--color-label-tertiary` |

### 8.6 Glass Controls (map-only)

Glass is ONLY for controls floating directly over the map.

| Use case | Example |
|----------|---------|
| GPS button | `--color-glass-bg` + `--glass-blur` |
| Zoom controls | `--color-glass-bg` + `--glass-blur` |
| Map attribution | `--color-glass-bg` + `--glass-blur` |

Sheet is NOT glass. Navigation bar is solid unless floating over map.

---

## 9. Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      accent: ['Newsreader', 'Georgia', 'serif'],
    },
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-hover)',
          active:  'var(--color-accent-active)',
        },
        label: {
          DEFAULT:    'var(--color-label)',
          secondary:  'var(--color-label-secondary)',
          tertiary:   'var(--color-label-tertiary)',
          quaternary: 'var(--color-label-quaternary)',
        },
        bg: {
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary:  'var(--color-bg-tertiary)',
        },
        separator: 'var(--color-separator)',
        system: {
          green:  'var(--color-system-green)',
          red:    'var(--color-system-red)',
          yellow: 'var(--color-system-yellow)',
        },
        cat: {
          play:     'var(--color-cat-play)',
          farm:     'var(--color-cat-farm)',
          nature:   'var(--color-cat-nature)',
          museum:   'var(--color-cat-museum)',
          culture:  'var(--color-cat-culture)',
          swim:     'var(--color-cat-swim)',
          pancake:  'var(--color-cat-pancake)',
          horeca:   'var(--color-cat-horeca)',
        },
      },
      spacing: {
        'sheet-x': 'var(--sheet-padding-x)',
      },
      borderRadius: {
        sheet: 'var(--radius-sheet)',
        card:  'var(--radius-card)',
        pill:  'var(--radius-pill)',
        photo: 'var(--radius-photo)',
        badge: 'var(--radius-badge)',
      },
      boxShadow: {
        sheet: 'var(--shadow-sheet)',
        card:  'var(--shadow-card)',
      },
      transitionTimingFunction: {
        spring:  'var(--ease-default)',
        bouncy:  'var(--ease-bouncy)',
      },
      transitionDuration: {
        fast:    'var(--duration-fast)',
        default: 'var(--duration-default)',
        slow:    'var(--duration-slow)',
      },
    },
  },
};
```

---

## 10. Design Principles — "What Makes This Feel Apple Maps"

1. **One font family for UI** (Inter). Hierarchy via weight and size only.
2. **Very few visual grammars:** solid cards, solid sheet, map, glass only on map controls.
3. **Circular action buttons** with labels below.
4. **16px consistent horizontal padding** everywhere.
5. **Velocity-based sheet physics**, non-bouncy spring.
6. **Map never dimmed** behind sheet — always interactive.
7. **Camera adjusts** to keep selected location visible above sheet.
8. **Corner radius morphs** as sheet drags (16px floating -> 0 full).
9. **Hairline dividers** (0.5px), not thick borders.
10. **No gradients, no glow, no 3D transforms, no decorative complexity.**

---

## 11. Newsreader Usage (strict)

Newsreader appears in exactly ONE place: **location names on the detail sheet**.

```css
.detail-location-name {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 28px;       /* Title 1 size */
  font-weight: 400;
  letter-spacing: -0.029em;
}
```

Everything else — buttons, labels, metadata, navigation, cards, search — uses Inter.
