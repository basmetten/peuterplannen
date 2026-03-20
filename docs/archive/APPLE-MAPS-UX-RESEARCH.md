# Apple Maps Web UX + Liquid Glass: Deep Research Report

**Date:** 20 March 2026
**Purpose:** Foundation for redesigning PeuterPlannen to feel like Apple Maps with a warm color palette

---

## Summary

Apple Maps web (maps.apple.com) uses a surprisingly simple glass toolkit: `backdrop-filter: blur(50px)` with `rgba(255, 255, 255, 0.6-0.8)` backgrounds, no SVG displacement filters, no fancy refraction. The "magic" comes from careful layering, restrained design, generous whitespace, and smooth 0.15s ease-out transitions. The Liquid Glass design language (WWDC 2025 / iOS 26) adds true refraction via SVG displacement maps, but cross-browser support is Chromium-only -- for a production web app, the simpler glassmorphism approach Apple uses on maps.apple.com is the right call. Spring physics via the Motion library (2.3kb mini) can add that extra native feel without heavy dependencies.

---

## 1. Apple Maps Web App (maps.apple.com) -- Extracted CSS Values

All values below are real computed styles extracted from maps.apple.com via Playwright on 20 March 2026.

### 1.1 Global Design Tokens

| Property | Value |
|---|---|
| Font family | `"SF Pro", -apple-system, "system-ui", "Helvetica Neue", Helvetica, Arial, sans-serif` |
| Base font size | 18px (body) |
| Text color | `rgb(0, 0, 0)` |
| Body background | `rgb(241, 241, 241)` |
| Accent blue | `rgb(2, 120, 252)` -- used for Directions button, caret |
| Secondary text | `rgb(142, 142, 147)` -- used for labels like "Address" |
| Close button bg | `rgba(199, 199, 199, 0.36)` |

### 1.2 Navigation Sidebar (`.mw-nav-bar`)

| Property | Value |
|---|---|
| Width | 210px |
| Backdrop filter | `blur(50px)` |
| Background | `rgba(255, 255, 255, 0.8)` |
| Border right | `1px solid rgba(118, 118, 128, 0.12)` |
| Box shadow | none |

### 1.3 Search/Content Card (`.mw-card`)

| Property | Value |
|---|---|
| Width | 420px (desktop) |
| Backdrop filter | `blur(50px)` |
| Background | `rgba(255, 255, 255, 0.6)` |
| Border radius | 0px (docked to sidebar) |
| Box shadow | `rgba(0, 0, 0, 0.024) 10px 1px 5px 0px` |
| Transition | `transform 0.15s ease-out, width 0.15s ease-in-out, opacity 0.15s` |
| Position | absolute |

### 1.4 Map Controls (Buttons)

| Property | Value |
|---|---|
| Backdrop filter | `blur(15px)` |
| Background | `rgba(255, 255, 255, 0.8)` |
| Border radius | 12px (top/bottom grouped) |
| Transition | `all` |

### 1.5 Popovers (`.mw-popover`)

| Property | Value |
|---|---|
| Backdrop filter | `blur(15px)` |
| Background | `rgba(255, 255, 255, 0.8)` |
| Border radius | 10px |
| Box shadow | `rgba(0, 0, 0, 0.1) 0px -2px 20px 0px, rgba(0, 0, 0, 0.1) 0px 0px 12px 0px` |
| Open transition | `opacity 0.2s, visibility 0.2s steps(1), transform 0.2s steps(1)` |
| Closed transform | `matrix(0.5, 0, 0, 0.5, 0, 0)` (scale down to 50%) |

### 1.6 Legal Links

| Property | Value |
|---|---|
| Backdrop filter | `blur(50px)` |
| Background | transparent |

### 1.7 Place Card

| Property | Mobile (390px) | Desktop (1280px) |
|---|---|---|
| Background | `rgb(242, 242, 242)` (opaque) | `rgba(255, 255, 255, 0.6)` + `blur(50px)` |
| Border radius | `12px 12px 0px 0px` | 0px |
| Box shadow | `rgba(0, 0, 0, 0.024) 10px 1px 5px` | same |
| Transition | `transform 0.3s ease-in-out` | `transform 0.15s ease-out` |

### 1.8 Typography Scale

| Element | Size | Weight |
|---|---|---|
| h1 (page title) | 36.125px | 700 |
| h2 (section headings) | 20px | 600 |
| h3 / labels | 14px | 400 |
| Body / input text | 16px | 400 |
| Button text | varies | 400 |

### 1.9 Directions Button

| Property | Value |
|---|---|
| Background | `rgb(2, 120, 252)` |
| Color | white |
| Border radius | 10px |
| Width | full-width within card |

### 1.10 Close Button

| Property | Value |
|---|---|
| Size | 30x30px (desktop), 44x44px touch target |
| Shape | circle (`border-radius: 50%`) |
| Background | `rgba(199, 199, 199, 0.36)` |

---

## 2. Apple Maps UX Patterns

### 2.1 Bottom Sheet (iOS Native)

Apple Maps on iOS uses a three-detent bottom sheet:

| Detent | Height | Behavior |
|---|---|---|
| **Peek** (~10%) | Just search bar visible | Floating card with gap, fully rounded corners |
| **Half** (~50%) | Search bar + category list | Still floating, gap tightens, corner radius adjusts |
| **Full** (100%) | Full content | Gap disappears, transitions to standard full sheet |

Key behaviors:
- **Velocity-based snapping**: Flick up/down uses velocity to determine which detent to land on
- **Rubber-banding**: Dragging past boundaries shows elastic resistance, then snaps back
- **Content scrolling threshold**: Inner content only scrolls when sheet is fully expanded (expand-to-scroll pattern)
- **Swipe-to-dismiss**: Dragging down past bottom detent dismisses the sheet

### 2.2 Search Experience

1. **Default state**: Search bar in peek sheet, placeholder text "Search Maps"
2. **Tap search bar**: Sheet expands to half, shows "Find Nearby" categories in a vertical list
3. **Categories shown**: Petrol Stations, Supermarkets, Parking, Fast Food, Breakfast, Coffee, Bicycle Sharing, Hotels (each with colored icon)
4. **Type to search**: Autocomplete suggestions appear as list with:
   - Icon (transit badge, place icon, or guide icon)
   - Place name (bold matching text)
   - Subtitle (city/region)
   - Quick action chips below first result (e.g., "Dining", "Car Parks", "Directions")
5. **Submit search**: Results appear as markers on map + list in sheet
6. **"Search Here" button**: Appears when user pans map after searching, allows re-search in new area

### 2.3 Place Card Layout

Desktop layout order (top to bottom):
1. Place name (h1, bold, large)
2. Share + Close buttons (top right)
3. Full-width Directions button (blue, rounded)
4. "X Places at This Address" horizontal scroll cards (photo + name + address)
5. "Details" section heading
6. Address block with directions icon
7. Additional details (phone, website, hours, etc.)

Mobile layout: Same content but as bottom sheet that slides up over the map.

### 2.4 Map Interaction Patterns

- **Marker selection**: Tap marker -> map smoothly pans/zooms (flyTo) to center marker, sheet slides up with place info
- **Selected marker**: Appears larger/elevated compared to unselected markers
- **Map annotations**: Use Apple's MapKit marker style -- colored circles with category icons
- **Look Around**: 360-degree panoramic preview appears as floating thumbnail on map, expandable
- **Compass**: Circular compass widget shows north heading, click to reset orientation
- **Zoom controls**: Grouped +/- buttons, same glass material as other controls

### 2.5 Transitions & Animations

All observed transitions on maps.apple.com:
- Card slide: `transform 0.15s ease-out`
- Card resize: `width 0.15s ease-in-out`
- Card fade: `opacity 0.15s`
- Mobile sheet: `transform 0.3s ease-in-out`
- Popover open: `opacity 0.2s` + scale from 0.5 to 1.0
- Popover close: reverse with `steps(1)` for visibility

---

## 3. Liquid Glass Design Language (WWDC 2025)

### 3.1 Design Principles

Liquid Glass is composed of three layers:
1. **Highlight**: Light casting and movement (specular highlights responding to device motion)
2. **Shadow**: Added depth for separation between foreground and background
3. **Illumination**: Flexible properties of the material (translucence, refraction)

Two variants:
- **Regular**: Adaptive behaviors, automatically adapts to light/dark modes, can be tinted
- **Clear**: No adaptive behaviors, content more visible below the surface

Key design intent: "Translucence helps reveal what is underneath a control" through refractive bending rather than traditional light scattering.

### 3.2 Apple's Private CSS Property

Apple internally uses `-apple-visual-effect` with values:
- `-apple-system-glass-material` (iOS 26+ Liquid Glass)
- `-apple-system-blur-material-thin` (standard materials)

Requires private `useSystemAppearance` preference in WKWebView -- NOT available to third-party developers or the public web.

```css
/* Apple's internal approach (not usable in production) */
@supports (-apple-visual-effect: -apple-system-glass-material) {
  .toolbar {
    background: transparent;
    -apple-visual-effect: -apple-system-glass-material;
  }
}
```

### 3.3 Best Web Recreation: Simple Glassmorphism

Since true Liquid Glass is not available on the web, the recommended approach is enhanced glassmorphism. Apple Maps itself uses this on maps.apple.com:

```css
/* Direct from maps.apple.com -- the "real" Apple approach for web */
.glass-panel {
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  background-color: rgba(255, 255, 255, 0.6);
  /* That's it. No SVG filters, no displacement maps. */
}

.glass-control {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
}
```

### 3.4 Advanced Liquid Glass (Chromium Only)

For a more authentic look (but Chromium-only), SVG displacement maps can add refraction:

```xml
<svg style="display: none">
  <filter id="glass-distortion">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008"
                  numOctaves="2" seed="92" result="noise" />
    <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
    <feDisplacementMap in="SourceGraphic" in2="blurred"
                       scale="70" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```

```css
.advanced-glass::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  backdrop-filter: blur(8px);
  filter: url(#glass-distortion);
}
```

**Do NOT use in production** -- Safari and Firefox do not support SVG filters as backdrop-filter inputs. Falls back to nothing.

### 3.5 Production-Ready Glass Recipe

Combining the best of all research into a practical implementation:

```css
.glass-surface {
  /* Core glass effect -- matches Apple Maps web */
  backdrop-filter: blur(50px) saturate(180%);
  -webkit-backdrop-filter: blur(50px) saturate(180%);
  background: rgba(255, 255, 255, 0.6);

  /* Subtle border for edge definition */
  border: 1px solid rgba(255, 255, 255, 0.3);

  /* Depth shadow */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);

  /* Smooth corners */
  border-radius: 12px;

  /* Prevent event blocking */
  /* pointer-events: none; -- only on overlay elements */
}

/* Warm tint adaptation for PeuterPlannen */
.glass-surface-warm {
  backdrop-filter: blur(50px) saturate(150%);
  -webkit-backdrop-filter: blur(50px) saturate(150%);
  background: rgba(255, 248, 240, 0.65);
  border: 1px solid rgba(255, 220, 180, 0.3);
  box-shadow:
    0 8px 32px rgba(120, 60, 20, 0.06),
    inset 0 1px 0 rgba(255, 240, 220, 0.5);
}
```

---

## 4. Bottom Sheet Implementation for Web

### 4.1 Recommended Approach: CSS Scroll Snap

The most modern and performant approach uses native CSS scroll snap mechanics. The `pure-web-bottom-sheet` library demonstrates this pattern as a vanilla Web Component.

Core concept:
```css
:host {
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  pointer-events: none; /* allow map interaction through host */
}

.sheet {
  pointer-events: all; /* capture events on sheet itself */
}
```

Snap points defined declaratively:
```html
<bottom-sheet>
  <div slot="snap" style="--snap: 15vh"></div>         <!-- peek -->
  <div slot="snap" style="--snap: 50vh" class="initial"></div> <!-- half -->
  <div slot="snap" style="--snap: 95vh"></div>          <!-- full -->
</bottom-sheet>
```

### 4.2 Simpler Custom Implementation

For PeuterPlannen's vanilla JS approach, a pointer-events-based system:

```javascript
// Spring physics constants (from Framer Motion defaults)
const SPRING = {
  stiffness: 100,   // How rigid (higher = snappier)
  damping: 10,       // How quickly settles (higher = less bounce)
  mass: 1            // Heft of movement
};

// Snap points (as percentage from bottom)
const SNAPS = {
  peek: 0.15,     // 15vh -- search bar + summary
  half: 0.50,     // 50vh -- list visible
  full: 0.92      // 92vh -- full content
};

// Velocity-based snap selection
function getTargetSnap(currentPos, velocity) {
  const threshold = 0.3; // velocity threshold
  if (velocity > threshold) return nextHigherSnap(currentPos);
  if (velocity < -threshold) return nextLowerSnap(currentPos);
  return nearestSnap(currentPos);
}
```

### 4.3 Key Bottom Sheet Behaviors to Implement

1. **Expand-to-scroll**: Content inside sheet only scrolls when sheet is at full detent
2. **Backdrop dimming**: Gradual opacity of dark overlay behind sheet as it rises
3. **Corner radius transition**: Rounded corners at peek/half, square corners at full
4. **Safe area handling**: `env(safe-area-inset-bottom)` for home indicator
5. **Keyboard avoidance**: Sheet adjusts when virtual keyboard opens
6. **Swipe-to-dismiss**: Optional, pull below peek to collapse entirely

### 4.4 iOS Safari Gotchas

- Rubber-banding: Use `overscroll-behavior: none` on sheet container but NOT on body
- 300ms tap delay: Already gone in modern iOS Safari with proper viewport meta
- Safe areas: Require `<meta name="viewport" content="viewport-fit=cover">`
- Sticky elements + overflow + border-radius = backdrop-filter breaks in some WebKit versions

---

## 5. Spring Animation Implementation

### 5.1 The Physics Model

```
Force = -stiffness * displacement - damping * velocity
Acceleration = Force / mass
```

JavaScript implementation (no library needed):
```javascript
function springAnimate(element, from, to, options = {}) {
  const { stiffness = 100, damping = 10, mass = 1 } = options;
  let position = from;
  let velocity = options.initialVelocity || 0;
  const frameRate = 1 / 60;

  function step() {
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * frameRate;
    position += velocity * frameRate;

    element.style.transform = `translateY(${position}px)`;

    // Stop when settled
    if (Math.abs(velocity) < 0.01 && Math.abs(displacement) < 0.5) {
      element.style.transform = `translateY(${to}px)`;
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

### 5.2 Motion.dev (Lightweight Alternative)

The mini animate function is just 2.3kb:
```javascript
import { animate } from "motion/mini";

// Spring-based sheet animation
animate(sheet, { transform: "translateY(50vh)" }, {
  type: "spring",
  stiffness: 300,
  damping: 30
});
```

### 5.3 CSS-Only Spring Approximation

Using the `linear()` timing function (88% browser support):
```css
/* Spring-like easing with slight overshoot */
.spring-transition {
  transition-timing-function: linear(
    0, 0.006, 0.025, 0.057, 0.1, 0.152, 0.212, 0.278,
    0.349, 0.423, 0.498, 0.573, 0.644, 0.71, 0.769,
    0.82, 0.862, 0.895, 0.92, 0.938, 0.951, 0.962,
    0.971, 0.978, 0.984, 0.989, 0.993, 0.996, 0.998,
    0.999, 1
  );
}
```

### 5.4 Recommended Spring Presets

| Feel | Stiffness | Damping | Mass | Use case |
|---|---|---|---|---|
| Snappy | 300 | 30 | 1 | Sheet snapping, button press |
| Gentle | 100 | 15 | 1 | Card transitions, fade-in |
| Bouncy | 200 | 10 | 1 | Marker selection, notification |
| Heavy | 100 | 20 | 2 | Full-screen transitions |

---

## 6. Warm Color Adaptation

### 6.1 Apple Maps Glass -> PeuterPlannen Warm Glass

| Apple Maps (cold) | PeuterPlannen (warm) |
|---|---|
| `rgba(255,255,255, 0.8)` | `rgba(255,248,240, 0.8)` -- warm white |
| `rgba(255,255,255, 0.6)` | `rgba(255,245,235, 0.65)` -- warm translucent |
| `rgb(241,241,241)` body bg | `rgb(250,247,242)` -- cream (already used) |
| `rgb(2,120,252)` accent | warm accent (coral/terracotta) |
| `rgb(142,142,147)` secondary | `rgb(160,140,120)` -- warm gray |
| `rgba(199,199,199,0.36)` close btn | `rgba(180,160,140,0.3)` -- warm neutral |
| `rgba(118,118,128,0.12)` border | `rgba(180,150,120,0.15)` -- warm border |

### 6.2 Glass Blur with Warm Tint

The key to warm glassmorphism: reduce saturation boost (from 180% to 150%) and use warm-tinted semi-transparent backgrounds rather than pure white. The blur itself should remain high (50px for panels, 15px for controls) to match Apple's approach.

### 6.3 Warm Color Palette Tokens

```css
:root {
  /* Warm base palette */
  --color-bg: #faf7f2;           /* Cream background */
  --color-surface: rgba(255, 248, 240, 0.8);  /* Warm glass */
  --color-surface-dim: rgba(255, 245, 235, 0.6);  /* Lighter glass */
  --color-text: #2d2926;         /* Warm black */
  --color-text-secondary: #9a8a78;  /* Warm gray */
  --color-accent: #e8704a;       /* Coral/terracotta */
  --color-accent-soft: rgba(232, 112, 74, 0.12);  /* Soft accent bg */
  --color-border: rgba(180, 150, 120, 0.15);  /* Warm separator */

  /* Glass effect tokens */
  --glass-blur: 50px;
  --glass-blur-control: 15px;
  --glass-saturate: 150%;
  --glass-bg-panel: rgba(255, 248, 240, 0.65);
  --glass-bg-control: rgba(255, 248, 240, 0.8);
  --glass-shadow: 0 8px 32px rgba(120, 60, 20, 0.06);
  --glass-border: 1px solid rgba(255, 220, 180, 0.3);

  /* Spring animation tokens */
  --spring-snappy: 0.15s ease-out;     /* For sheet snap */
  --spring-gentle: 0.3s ease-in-out;   /* For content transitions */
}
```

---

## 7. Performance Considerations

### 7.1 Backdrop Filter Performance

- `backdrop-filter: blur()` is GPU-accelerated but expensive on large surfaces
- Apple Maps uses `blur(50px)` on fixed-width panels (210px, 420px) -- NOT full-screen
- Keep glass surfaces to reasonable sizes; avoid applying to full viewport overlays
- On mobile, reduce blur value or disable for low-end devices via `@media (prefers-reduced-motion)`

### 7.2 Lazy Loading Strategy for Maps

Three-tier progressive loading:
1. **Immediate**: Map tile placeholder + skeleton UI (< 100ms)
2. **First paint**: Low-quality map tiles + basic markers (< 1s)
3. **Full quality**: High-res tiles + clustered markers + photos (< 3s)

Use Intersection Observer for off-screen content:
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadFullContent(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px' }); // Pre-load 200px before visible
```

### 7.3 Skeleton Loading

Show structural placeholders matching final layout dimensions while data loads. For place cards: gray rectangles for photo, text bars for name/address, pill shapes for action buttons.

### 7.4 Animation Performance Rules

- Use `transform` and `opacity` only for animations (compositor-thread, no reflow)
- Never animate `width`, `height`, `top`, `left` -- use `transform: translate/scale` instead
- Add `will-change: transform` sparingly on elements about to animate
- Remove `will-change` after animation completes to free GPU memory

---

## 8. Haptic Feedback on Web

- `navigator.vibrate()` does NOT reliably work on iOS Safari (despite recent reports of partial support)
- iOS 18+ Safari supports haptics on `<input type="checkbox" switch>` elements only
- Best approach: Skip haptics, rely on visual + audio feedback instead
- Alternative: Subtle CSS scale animation on tap (0.95 -> 1.0) mimics tactile feel

---

## 9. Libraries & Tools Reference

| Tool | Purpose | Size | URL |
|---|---|---|---|
| `pure-web-bottom-sheet` | CSS scroll snap bottom sheet | ~5kb | github.com/viliket/pure-web-bottom-sheet |
| `motion/mini` | Spring animations | 2.3kb | motion.dev |
| `spring-easing` | Spring curve generation | tiny | github.com/okikio/spring-easing |
| MapLibre GL JS | Map rendering | ~200kb | maplibre.org |
| CSS `linear()` | Spring-like CSS easing | 0kb (native) | 88% browser support |

---

## 10. Recommendations for PeuterPlannen

### Do This (High Impact)

1. **Match Apple's actual blur values**: Use `blur(50px)` for panels, `blur(15px)` for controls -- this is what Apple Maps web actually uses
2. **Warm-tint the glass**: Replace pure white backgrounds with cream-tinted rgba values
3. **Use Apple's exact transition timing**: `transform 0.15s ease-out` for desktop, `0.3s ease-in-out` for mobile sheet
4. **Three-detent bottom sheet**: Peek (15vh), Half (50vh), Full (92vh) with velocity-based snapping
5. **Expand-to-scroll pattern**: Content inside sheet only scrolls when fully expanded
6. **Section headings**: 20px semi-bold, matching Apple Maps' h2 style
7. **Close button**: 30px circle, `rgba(199,199,199,0.36)` background, `border-radius: 50%`
8. **Directions/action button**: Full-width, rounded (10px radius), accent color

### Consider (Medium Impact)

9. **Spring animations**: Either hand-rolled (no dependency) or `motion/mini` (2.3kb)
10. **CSS `linear()` easing**: For spring-like feel without JavaScript
11. **Skeleton loading**: For place cards and photo loading
12. **`pure-web-bottom-sheet`**: If the custom sheet engine becomes hard to maintain
13. **Popover scale animation**: `matrix(0.5,0,0,0.5,0,0)` -> `matrix(1,0,0,1,0,0)` on open

### Skip (Low ROI or Risky)

14. **SVG displacement maps**: Chromium-only, no Safari support, big perf hit
15. **`-apple-visual-effect`**: Private API, not usable
16. **`navigator.vibrate()`**: Unreliable on iOS
17. **Heavy animation libraries**: GSAP/Anime.js are overkill for this use case
18. **True refraction effects**: The web is not there yet; simple blur + tint is what Apple does too

---

## Sources

### Apple Maps Web (Primary Sources)
- [Apple Maps on the web](https://maps.apple.com) -- live CSS extraction via Playwright
- [Apple Maps leaves beta](https://9to5mac.com/2025/04/11/apple-maps-web-mobile/)
- [Apple Maps newsroom](https://www.apple.com/newsroom/2024/07/apple-maps-on-the-web-launches-in-beta/)
- [Apple Maps HIG](https://developer.apple.com/design/human-interface-guidelines/maps)

### Liquid Glass
- [Apple introduces Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [CSS-Tricks: Getting Clarity on Liquid Glass](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/)
- [Apple's private CSS property](https://alastair.is/apple-has-a-private-css-property-to-add-liquid-glass-effects-to-web-content/)
- [LogRocket: Liquid Glass with CSS and SVG](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- [DesignFast: Liquid Glass CSS](https://designfast.io/liquid-glass)
- [Liquid Glass CSS recreation (DEV)](https://dev.to/kevinbism/recreating-apples-liquid-glass-effect-with-pure-css-3gpl)
- [nikdelvin/liquid-glass GitHub](https://github.com/nikdelvin/liquid-glass)
- [Liquid Glass with CSS and SVG (DEV)](https://dev.to/fabiosleal/how-to-create-the-apple-liquid-glass-effect-with-css-and-svg-2o06)

### Bottom Sheet
- [Native-like bottom sheets with CSS scroll snap](https://viliket.github.io/posts/native-like-bottom-sheets-on-the-web/)
- [pure-web-bottom-sheet GitHub](https://github.com/viliket/pure-web-bottom-sheet)
- [Apple Maps style sheets in Expo](https://expo.dev/blog/how-to-create-apple-maps-style-liquid-glass-sheets)
- [UISheetPresentationController](https://sarunw.com/posts/bottom-sheet-in-ios-15-with-uisheetpresentationcontroller/)
- [Bottom Sheet best practices](https://mobbin.com/glossary/bottom-sheet)

### Spring Animations
- [Josh Comeau: Spring Physics Intro](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)
- [Josh Comeau: CSS Springs with linear()](https://www.joshwcomeau.com/animation/linear-timing-function/)
- [Maxime Heckel: Physics Behind Spring Animations](https://blog.maximeheckel.com/posts/the-physics-behind-spring-animations/)
- [Motion.dev spring docs](https://motion.dev/docs/spring)
- [spring-easing library](https://github.com/okikio/spring-easing)

### Glass CSS
- [Josh Comeau: backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [Glassmorphism CSS Generator](https://ui.glass/generator)
- [Mitkov Systems: CSS Liquid Glass How To](https://www.mitkov-systems.de/en/blog/css-liquid-glass-how-to)

### iOS / Safe Areas / Overscroll
- [MDN: env() safe area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [CSS overscroll-behavior](https://css-tricks.com/almanac/properties/o/overscroll-behavior/)
- [Prevent iOS overscroll](https://www.bram.us/2016/05/02/prevent-overscroll-bounce-in-ios-mobilesafari-pure-css/)

### UX Analysis
- [Google Maps vs Apple Maps UX](https://medium.com/ux-splash/user-experience-google-maps-versus-apple-maps-part-1-36efbc395643)
- [Apple Place Cards SEO](https://www.localfalcon.com/blog/what-are-apple-maps-place-cards-do-you-need-one)
- [Map UX Design Strategies](https://www.revivalpixel.com/blog/ux-design-strategies-high-performance-map-based-applications/)
- [iOS UX Design Trends 2026](https://asappstudio.com/ios-ux-design-trends-2026/)
