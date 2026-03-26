# PeuterPlannen Design System

Canonical reference for all visual work on peuterplannen.nl.
Read this **before** writing any CSS, HTML, or component code.
Tokens live in `design-system.css` (source of truth). This document explains when and how to use them.

---

## 1. Brand

**Audience:** Parents with toddlers (0-4) looking for outings in the Netherlands.
**Voice:** Warm, helpful, confident. Never corporate, never childish.
**Visual personality:** Apple precision meets warm editorial character.

### Principles

1. **Warm, not cute** — terracotta/coral palette, serif headings, no cartoon iconography.
2. **Quiet confidence** — generous whitespace, subtle shadows, restrained animation.
3. **Content-first** — photos and location data dominate; chrome recedes.
4. **Responsive by default** — mobile is the primary viewport. Desktop is a split-pane map layout.
5. **Glass over map** — UI elements on the map use translucent warm-glass surfaces (the `--wg-*` system).

**Avoid:** Inter font, purple gradients, cookie-cutter layouts, saturated accents competing with terracotta, heavy borders (use shadow instead), decorative animation without purpose.

---

## 2. Colors

### Primary Ramp (coral/terracotta)

| Token | Hex | Use |
|---|---|---|
| `--pp-primary-50` | `#FDF1ED` | Tinted backgrounds, skeleton loaders |
| `--pp-primary-75` | `#f5e0da` | Soft hover backgrounds |
| `--pp-primary-100` | `#FBDDD2` | Light fills, active chip backgrounds |
| `--pp-primary-200` | `#F5B8A4` | Text selection, progress fills |
| `--pp-primary-300` | `#E8957A` | Decorative accents |
| `--pp-primary-400` | `#D4775A` | **Primary brand color** (`--pp-primary`) |
| `--pp-primary-500` | `#C46A4F` | Hover state (`--pp-primary-hover`) |
| `--pp-primary-600` | `#B35D42` | Dark variant (`--pp-primary-dark`), active state |
| `--pp-primary-700` | `#8F4A35` | High-contrast text on light backgrounds |
| `--pp-primary-800` | `#6B3828` | — |
| `--pp-primary-900` | `#472518` | Selection text color |

**Aliases:** `--pp-primary` = 400, `--pp-primary-light` = 50, `--pp-primary-dark` = 600, `--pp-primary-hover` = 500.

**RGB channel:** `--pp-primary-rgb: 212, 119, 90` — use with `rgba(var(--pp-primary-rgb), 0.12)`.

### Secondary (teal) & Accent (gold)

Ramps exist in tokens but are **rarely used**. Secondary (teal): diaper-change badge. Accent (gold): pancake-house type, alcohol badge. Do not introduce new uses without approval.

### Text Hierarchy

| Token | Hex | Use |
|---|---|---|
| `--pp-text` | `#2D2926` | Primary body text, headings |
| `--pp-text-secondary` | `#5C4A48` | Subheadings, secondary labels |
| `--pp-text-tertiary` | `#756762` | Metadata, timestamps |
| `--pp-text-muted` | `#A39490` | Placeholders, disabled text |
| `--pp-text-pressed` | `#1a1714` | Active/pressed text states |
| `--pp-text-inverse` | `#FFFFFF` | Text on dark/primary backgrounds |

Warm-glass text variants (`--wg-text-*`) are used inside glass surfaces on the map:

| Token | Hex | Use |
|---|---|---|
| `--wg-text-primary` | `#3A2F2C` | Sheet headings, card titles |
| `--wg-text-body` | `#5C4433` | Sheet body text |
| `--wg-text-muted` | `#6B5A54` | Glass-surface secondary text |
| `--wg-text-faint` | `#8B7355` | Tertiary labels on glass |
| `--wg-text-placeholder` | `#9B8688` | Input placeholders on glass |

### Surfaces

| Token | Value | Use |
|---|---|---|
| `--pp-bg` | `#fcf9f7` | Page background |
| `--pp-bg-warm` | `#FFF5EB` | Warm section backgrounds |
| `--pp-surface` | `#FFFFFF` | Cards, panels, modals |
| `--pp-surface-hover` | `#FEFCF9` | Hovered card surfaces |
| `--pp-surface-dark` | `#1e1c1a` | Toast background, dark UI |
| `--pp-border` | `rgba(212,119,90, 0.15)` | Default border |
| `--pp-border-strong` | `rgba(212,119,90, 0.3)` | Emphasized border |

### Semantic Colors

| Intent | Foreground | Background | Border |
|---|---|---|---|
| Success | `#2D8B5E` | `#E8F5EF` | `rgba(45,139,94, 0.25)` |
| Error | `#C0392B` | `#FDEDED` | `rgba(192,57,43, 0.25)` |
| Warning | `#D4A017` | `#FFF8E1` | `rgba(212,160,23, 0.25)` |
| Info | `#2F586F` | `#EAF2F7` | `rgba(47,88,111, 0.25)` |

Tokens: `--pp-semantic-{intent}`, `--pp-semantic-{intent}-bg`, `--pp-semantic-{intent}-border`.

### Type Colors (category badges & map markers)

| Type | Token | Hex | Context |
|---|---|---|---|
| play | `--pp-type-play` | `#52B788` | Playgrounds |
| farm | `--pp-type-farm` | `#8B6F47` | Children's farms |
| nature | `--pp-type-nature` | `#2D6A4F` | Nature/parks |
| museum | `--pp-type-museum` | `#7B2D8B` | Museums |
| culture | `--pp-type-culture` | `#5B3F8B` | Culture |
| swim | `--pp-type-swim` | `#2196F3` | Swimming |
| pancake | `--pp-type-pancake` | `#E9C46A` | Pancake houses |
| horeca | `--pp-type-horeca` | `#E76F51` | Restaurants/cafes |

Each has a `--pp-type-{name}-bg` variant at 10% opacity for chip/badge backgrounds.
Play also has `--pp-type-play-rgb: 82, 183, 136` for alpha compositions.

---

## 3. Typography

### Font Families

| Token | Family | Role |
|---|---|---|
| `--pp-font-heading` | Newsreader | All headings (h1-h5, `.pp-heading`) |
| `--pp-font-body` / `--pp-font-ui` | Plus Jakarta Sans | Body text, UI labels, buttons |
| `--pp-font-accent` | Instrument Serif | Editorial italic accents (`.pp-accent`) |

### Type Scale (fluid, Minor Third 1.2)

| Token | Min | Max | Typical use |
|---|---|---|---|
| `--pp-text-2xs`* | 10px | 11px | Fine print, legal |
| `--pp-text-xs` | 12px | 13px | Badges, metadata, captions |
| `--pp-text-sm` | 13px | 14px | Secondary UI text, buttons |
| `--pp-text-base` | 15px | 17px | Body text (default) |
| `--pp-text-lg` | 17px | 20px | Card titles, h5 |
| `--pp-text-xl` | 20px | 28px | Section headings, h4 |
| `--pp-text-2xl` | 24px | 40px | Page section titles, h3 |
| `--pp-text-3xl` | 32px | 56px | Page titles, h2 |
| `--pp-text-4xl` | 40px | 72px | Hero headlines, h1 |

*`--pp-text-2xs` is planned but not yet in `design-system.css`.*

All sizes use `clamp()` for fluid scaling between 390px and 1280px viewports.

### Font Weights

| Token | Value | Use |
|---|---|---|
| `--pp-weight-regular` | 400 | Body text |
| `--pp-weight-medium` | 500 | UI labels, metadata |
| `--pp-weight-semibold` | 600 | Buttons, card titles, subheadings |
| `--pp-weight-bold` | 700 | Headings (h2, h3) |

### Heading Defaults (set in `design-system.css`)

| Level | Size token | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| h1 | `--pp-text-4xl` | 750 | -0.035em | 1.08 |
| h2 | `--pp-text-3xl` | 700 | -0.025em | 1.12 |
| h3 | `--pp-text-2xl` | 650 | -0.02em | 1.18 |
| h4 | `--pp-text-xl` | 600 | -0.015em | 1.22 |
| h5 | `--pp-text-lg` | 600 | -0.01em | 1.30 |

Body text: `line-height: 1.65`, `text-wrap: pretty`, `max-width: 65ch`.
Headings: `text-wrap: balance`, `font-optical-sizing: auto`.

---

## 4. Spacing

Based on a **4-point grid**. All spacing should use named tokens.

| Token | Value | Use |
|---|---|---|
| `--pp-space-2xs`* | 2px | Hairline gaps, icon-to-text micro gap |
| `--pp-space-xs` | 4px | Badge padding, tight gaps |
| `--pp-space-xs2`* | 6px | Between badge icon and label |
| `--pp-space-sm` | 8px | Chip padding, card internal gaps |
| `--pp-space-sm2`* | 12px | Common small spacing (was 69+ raw `12px` uses) |
| `--pp-space-md` | 16px | Default padding, section gaps |
| `--pp-space-md2`* | 20px | Medium-large internal spacing |
| `--pp-space-lg` | 24px | Card padding, section margins |
| `--pp-space-xl` | 32px | Between content sections |
| `--pp-space-2xl` | 48px | Major section breaks |
| `--pp-space-3xl` | 64px | Page-level vertical rhythm |
| `--pp-space-4xl` | 96px | Hero sections |
| `--pp-space-5xl` | 128px | Maximum vertical breathing room |

*Tokens marked with \* are planned additions not yet in `design-system.css`.*

**Rules:**
- Never use raw pixel values for spacing. Use `var(--pp-space-*)`.
- Horizontal padding on containers: `--pp-space-md` (16px).
- Card internal padding: `--pp-space-lg` (24px).
- Gap between cards in a grid/list: `--pp-space-md` (16px).

---

## 5. Radius

| Token | Value | Use |
|---|---|---|
| `--pp-radius-xs` | 10px | Badges, tooltips, small chips, skeleton loaders |
| `--pp-radius-sm` | 16px | Cards (`.pp-location-card`), image containers |
| `--pp-radius-md` | 20px | Large cards, panels |
| `--pp-radius-lg` | 24px | Buttons (primary, secondary), modals |
| `--pp-radius-xl` | 28px | Bottom sheet top corners |
| `--pp-radius-pill` | 999px | Pills, filter chips, search bar |

Warm-glass radii (`--wg-radius-*`) for map overlay components:

| Token | Value | Use |
|---|---|---|
| `--wg-radius-tag` | 8px | Type tags inside sheet |
| `--wg-radius-card` | 10px | Glass cards on map |
| `--wg-radius-sheet` | 12px | Sheet corners, hero photo |
| `--wg-radius-chip` | 16px | Filter chips on map |
| `--wg-radius-pill` | 24px | Pill buttons on map |

---

## 6. Shadows

### Ambient (single-layer, neutral)

| Token | Offset | Blur | Opacity | Use |
|---|---|---|---|---|
| `--pp-shadow-sm` | 0 1px | 3px | 0.06 | Subtle resting state |
| `--pp-shadow-md` | 0 4px | 12px | 0.08 | Default card elevation |
| `--pp-shadow-lg` | 0 8px | 30px | 0.10 | Elevated panels |
| `--pp-shadow-hover` | 0 12px | 40px | 0.12 | Hover lift |

### Context-differentiated

| Token | Use |
|---|---|
| `--pp-shadow-card` | Cards at rest (2px offset, 8px blur) |
| `--pp-shadow-card-hover` | Hovered cards (12px offset, 32px blur) |
| `--pp-shadow-popover` | Dropdowns, popovers (16px offset) |
| `--pp-shadow-modal` | Modals, dialogs (24px offset) |
| `--pp-shadow-nav` | Navigation bar (1px, very subtle) |
| `--pp-shadow-inset` | Pressed/recessed inputs |

### Warm-glass shadows (`--wg-shadow-*`)

Ultra-subtle, black-based (not warm). Used on glass components over the map:

| Token | Use |
|---|---|
| `--wg-shadow-sheet` | Bottom sheet (upward, 8px blur) |
| `--wg-shadow-panel` | Sidebar panels (upward, 12px blur) |
| `--wg-shadow-control` | Buttons on map (downward, 8px blur) |
| `--wg-shadow-chip` | Filter chips (1px, barely visible) |
| `--wg-shadow-nav` | Bottom nav bar |
| `--wg-shadow-float` | Floating action buttons (dual-layer) |
| `--wg-shadow-header` | Sheet drag handle area |

---

## 7. Motion

### Duration Tokens

| Token | Value | Use |
|---|---|---|
| `--pp-duration-instant`* | 100ms | Micro-interactions (color change, opacity) |
| `--pp-duration-fast`* | 150ms | Button feedback, chip toggle |
| `--pp-duration-normal`* | 250ms | Most transitions (default) |
| `--pp-duration-slow`* | 400ms | Sheet state changes, reveals |
| `--pp-duration-slower`* | 600ms | Staggered list animations |

*Planned tokens. Current system uses:*
- `--pp-transition: 0.2s cubic-bezier(0.22, 1, 0.36, 1)` — default.
- `--pp-transition-slow: 0.35s cubic-bezier(0.22, 1, 0.36, 1)` — image hover zoom.
- `--wg-duration-fast: 100ms`, `--wg-duration-ui: 200ms`, `--wg-duration-snap: 300ms` — glass UI.

### Easing Curves

| Token | Curve | Use |
|---|---|---|
| `--pp-ease-standard`* | `cubic-bezier(0.4, 0, 0.2, 1)` | General-purpose |
| `--pp-ease-decelerate`* | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `--pp-ease-accelerate`* | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `--pp-ease-spring`* | `cubic-bezier(0.22, 1, 0.36, 1)` | Bouncy reveals (already used inline) |
| `--pp-ease-bounce`* | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful micro-interactions |

*Planned tokens. The spring curve `cubic-bezier(0.22, 1, 0.36, 1)` is already the default easing throughout.*

### Keyframe Animations (defined in `design-system.css`)

| Name | Effect | Duration |
|---|---|---|
| `pp-fade-up` | Fade in + slide up 20px | 0.5s |
| `pp-scale-in` | Fade in + scale from 0.92 | 0.5s |
| `pp-slide-down` | Fade in + slide down 8px | 0.5s |
| `pp-spin` | 360deg rotation (loaders) | — |
| `pp-shimmer` | Skeleton loader sweep | 1.8s infinite |

### Stagger Pattern

`.pp-stagger > *` children animate in sequence with 60ms delay increments (max 7 steps, then all at 360ms).
`.pp-reveal` elements fade up 16px when `.is-visible` is added via IntersectionObserver.

### Interaction Feedback

- **Tap/click:** `scale(0.98)` on `:active` (global default).
- **Button hover:** bg color shift (200ms). **Card hover:** `translateY(-3px)` + shadow upgrade.
- **Image hover:** `scale(1.05)` via `--pp-transition-slow`.
- **Reduced motion:** all animations collapse to 0.01ms via `prefers-reduced-motion: reduce`.

---

## 8. Glass Surfaces

The `--wg-*` (warm glass) system provides translucent surfaces for UI that floats over the MapLibre map.

### Glass Opacity Scale

| Token | Opacity | Use |
|---|---|---|
| `--wg-glass-chip` | 72% | Filter chips |
| `--wg-glass-control` | 78% | Map control buttons |
| `--wg-glass-surface` | 82% | Generic glass surface |
| `--wg-glass-panel` | 85% | Sidebar panels |
| `--wg-glass-nav` | 88% | Bottom navigation bar |
| `--wg-glass-sheet` | 94% | Bottom sheet |
| `--wg-glass-solid` | 95% | Near-opaque panels |
| `--wg-glass-opaque` | 96% | Maximum glass opacity |

Base color is warm off-white `rgba(250, 247, 242, ...)` or `rgba(255, 252, 249, ...)`.

### Blur Scale

| Token | Value | Use |
|---|---|---|
| `--wg-blur-heavy` | `blur(24px) saturate(140%)` | Nav bar, sheet (heaviest) |
| `--wg-blur-panel` | `blur(14px)` | Sidebar, large panels |
| `--wg-blur-control` | `blur(10px)` | Buttons, controls |
| `--wg-blur-light` | `blur(6px)` | Chips, small elements |
| `--wg-blur-overlay` | `blur(4px)` | Subtle background blur |

### Glass Recipe

```css
.my-glass-element {
  background: var(--wg-glass-panel);
  backdrop-filter: var(--wg-blur-panel);
  -webkit-backdrop-filter: var(--wg-blur-panel); /* required for Safari */
  box-shadow: var(--wg-shadow-control);
}
```

Design direction is **borderless glass** — no `border` on glass elements. Use `box-shadow` for definition.

---

## 9. Components

### Card (`.pp-location-card`, `.loc-item`)

- **Background:** `--pp-surface`
- **Radius:** `--pp-radius-sm` (16px)
- **Padding:** `--pp-space-lg` (24px)
- **Shadow:** `--pp-shadow-card` at rest, `--pp-shadow-card-hover` on hover
- **Hover:** `translateY(-3px)` + shadow transition
- **Image:** `aspect-ratio: 3/2` (`--pp-img-aspect`), top-rounded corners
- **Type badge:** absolute-positioned on image, glass-backed, uppercase, `--pp-text-xs`

### Filter Chip

- **Background:** `--wg-glass-chip` (inactive), type-color bg at 10% (active)
- **Radius:** `--wg-radius-chip` (16px) or `--pp-radius-pill`
- **Shadow:** `--wg-shadow-chip`
- **Text:** `--pp-text-xs`, weight 600
- **Active state:** type-specific color from `--pp-type-{name}` and `--pp-type-{name}-bg`

### Button System (5 types)

| Type | Class | Background | Text | Radius | Min-height |
|---|---|---|---|---|---|
| Primary | `.pp-btn-primary` | `--pp-primary` | `--pp-text-inverse` | `--pp-radius-lg` | 44px |
| Secondary | `.pp-btn-secondary` | `--pp-surface` | `--pp-text` | `--pp-radius-lg` | 44px |
| Icon | `.pp-btn-icon` | transparent | — | 50% (circle) | 44px |
| Text | `.pp-btn-text` | none | `--pp-primary` | — | — |

All buttons: `font-family: var(--pp-font-ui)`, `font-weight: 600`, `font-size: var(--pp-text-sm)`.
Hover: primary darkens to `--pp-primary-dark`, secondary gets tinted border + light bg.
Active: `scale(0.97)`. Focus-visible: 2px `--pp-primary` outline, 2px offset.
**Minimum tap target: 44x44px** (enforced by `min-height` and `width`/`height` on icon buttons).

### Bottom Sheet

4 states: **peek**, **half**, **full**, **hidden**. Managed by `sheet-engine.js`.

- **Surface:** `--wg-glass-sheet` with `--wg-blur-heavy`
- **Top radius:** `--pp-radius-xl` (28px)
- **Shadow:** `--wg-shadow-sheet`
- **Drag handle:** `--wg-handle-color: rgba(160, 130, 120, 0.35)`, centered, 36x4px, rounded
- **Desktop:** sheet is replaced by a sidebar panel; the bottom sheet is mobile-only

### Toast (`.pp-toast`)

- **Background:** `--pp-text` (dark), or semantic variant
- **Text:** `--pp-text-inverse`, `--pp-text-sm`, weight 500
- **Radius:** `--pp-radius-xs` (10px)
- **Shadow:** `--pp-shadow-popover`
- **Animation:** slide up 12px on enter, slide up -8px on exit (`.is-hiding`)
- **Variants:** `.pp-toast-success`, `.pp-toast-error`, `.pp-toast-warning`
- **Position:** fixed, bottom-center, above safe-area inset

### Tooltip (`[data-tooltip]`)

- **Background:** `--pp-surface-dark`
- **Text:** `--pp-text-inverse`, `--pp-text-xs`, weight 500
- **Radius:** `--pp-radius-xs`
- **Shadow:** `--pp-shadow-popover`
- **Positioning:** `[data-tooltip-pos="bottom"]` or `[data-tooltip-pos="left"]`
- **Enter:** fade + translate 4px, using `--pp-transition`

### Skeleton Loader (`.pp-skeleton`)

- **Gradient:** `--pp-primary-50` to `rgba(212,119,90, 0.06)` and back
- **Animation:** `pp-shimmer` 1.8s ease-in-out infinite, background-size 300%
- **Radius:** `--pp-radius-xs`
- **Variants:** `.pp-skeleton-text` (14px h), `.pp-skeleton-title` (24px h, 60% w), `.pp-skeleton-img` (16:9), `.pp-skeleton-pill` (32px h, 80px w, pill radius)

### Navigation

- **Glass background:** `--wg-glass-nav` with `--wg-blur-heavy`
- **Shadow:** `--wg-shadow-nav`
- **Tab icons:** `--pp-icon-sm` (20px), active = `--pp-primary`, inactive = `--pp-text-muted`
- **Safe area:** `padding-bottom: var(--pp-safe-bottom)`

---

## 10. Patterns

### Loading States

1. **Skeleton screens** for content areas — never blank white. Shimmer via `pp-shimmer`.
2. **Photo containers** use `--photo-color` (dominant color) as placeholder, then fade+unblur on load.
3. **Spinner** (`pp-spin`) only for discrete actions (save, submit), never for page load.

### Empty States

Centered layout with muted icon + helpful text. Suggest an action ("Pas je filters aan"). Use `--pp-text-muted` for message, `--pp-text-secondary` for heading.

### Error States

Toast for transient errors. Inline `--pp-semantic-error-bg` for form validation. Never show raw error messages.

### Feedback

Toast (auto-dismiss), copy-button swap animation (`.is-copied`), global `:active` scale, `.pp-reveal` scroll reveals.

---

## 11. Layout

### Breakpoints

| Name | Width | Layout |
|---|---|---|
| Mobile | < 768px | Full-width, bottom sheet, bottom nav tabs |
| Desktop | >= 768px | Split pane — sidebar (cards/detail) + map |

### Layout Tokens

| Token | Value | Use |
|---|---|---|
| `--pp-max-width` | 1200px | Content wrapper max-width |
| `--pp-content-width` | 720px | Blog/article max-width |
| `--pp-app-width` | 540px | App sidebar max-width |
| `--pp-safe-bottom` | `env(safe-area-inset-bottom, 20px)` | Bottom spacing for notch devices |

### Icon Sizes

| Token | Value |
|---|---|
| `--pp-icon-xs` | 16px |
| `--pp-icon-sm` | 20px |
| `--pp-icon-md` | 24px |
| `--pp-icon-lg` | 32px |
| `--pp-icon-xl` | 48px |

---

## 12. Rules for Claude Code

Before writing or modifying any visual code, verify every item:

### Pre-flight Checklist

- [ ] **Tokens only.** No raw color hex, no raw pixel spacing, no raw font stacks. Use `var(--pp-*)` or `var(--wg-*)`.
- [ ] **Font assignment.** Headings = `--pp-font-heading`. UI/body = `--pp-font-ui`. Editorial accents = `--pp-font-accent`.
- [ ] **Tap targets.** Every interactive element >= 44x44px.
- [ ] **Mobile-first.** Write base styles for 390px, enhance at `min-width: 768px`.
- [ ] **Glass recipe.** Any element over the map uses `--wg-glass-*` + `backdrop-filter` + `-webkit-backdrop-filter`. No visible borders on glass.
- [ ] **Shadows, not borders.** Use `--pp-shadow-*` or `--wg-shadow-*` for elevation. Avoid `border: 1px solid` unless on form inputs.
- [ ] **Reduced motion.** The global `prefers-reduced-motion` rule handles this. Do not add new animation without verifying it degrades gracefully.
- [ ] **CSS layers.** Tokens in `@layer tokens`, components in `@layer components`. Respect the cascade: `tokens < components < layout < overrides`.
- [ ] **Brace balance.** After editing any CSS file, verify brace count matches (pre-commit hook checks this).
- [ ] **Test after every change.** Run `npm run test:e2e` and take Playwright screenshots at 390px and 1280px. Describe what you see before reporting done.
- [ ] **No AI slop.** No Inter font, no purple, no generic card grids. Match the warm terracotta editorial aesthetic.
