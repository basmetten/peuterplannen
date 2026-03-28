# PeuterPlannen v2 — Product Principles

> Phase 0 decision-making framework. This is not a vision doc. Every rule here exists to resolve ambiguity during implementation. If a decision contradicts this document, the decision is wrong unless this document is explicitly updated first.

---

## 1. Core Product Identity

**PeuterPlannen IS:** a map-first discovery tool that helps Dutch parents find toddler-friendly outings near them, fast.

**PeuterPlannen IS NOT:** a social network, a review platform, a parenting blog, a booking engine, or a general-purpose family app. It is not trying to be Google Maps with a kid filter. It is a purpose-built tool for one job.

### The Core Loop

```
zoeken → filteren → vertrouwen → kiezen
```

1. **Zoeken** — Parent opens the app, sees what's nearby on a map. No onboarding, no login wall, no splash screen. Map loads, locations appear.
2. **Filteren** — Parent narrows by type (speeltuin, kinderboerderij, museum), distance, or age-appropriateness. Filters are fast, obvious, and reversible.
3. **Vertrouwen** — Parent sees enough information to judge: is this place good, open, worth the trip? Verification badges, photos, practical details (parking, stroller access, cost). No fake reviews, no inflated ratings.
4. **Kiezen** — Parent taps "route" or saves it. Decision made. Time from app-open to decision: under 60 seconds for a familiar area, under 2 minutes for exploration.

Everything in the app exists to serve this loop. If a feature does not accelerate one of these four steps, it does not belong in the core flow.

### Why Map-First

Parents think spatially about outings. "What's near us?" is the first question, not "What's the best-rated playground in the Netherlands?" The map is not a feature — it is the product. The list view exists as an accessibility fallback and a browsing mode, not as the primary interface.

### Target User

Dutch parent. iPhone (70%+ of target demo). One hand free, toddler in the other or nearby. Outdoors or about to leave the house. Needs to make a decision in under 2 minutes. Has used Apple Maps and Google Maps — expects that level of responsiveness and spatial clarity. Does not want to read paragraphs. Does not want to create an account to see basic information.

---

## 2. Non-Negotiable Principles

### 2.1 Trust Before Polish

Data accuracy, verification signals, and honest empty states matter more than animations, transitions, or visual flourish.

**This means:**
- A location with wrong opening hours is worse than no location at all.
- Empty states say "We don't have data for this area yet" — never fake content or show skeleton loaders that never resolve.
- Verification badges are earned (editor-verified, community-confirmed), never decorative.
- If a data field is uncertain, show nothing rather than a guess.

**This does NOT mean:**
- The UI should look unfinished or ugly. Polish is welcome — after trust is established.
- We never show estimated data. We can, but it must be labeled as estimated.

### 2.2 Canonical Systems Over Ad Hoc Fixes

One source of truth per concern. One sheet system. One filter system. One card renderer. One spacing scale. One color palette.

**This means:**
- If two components do similar things, one must be deleted or merged before shipping.
- Design tokens are defined once and referenced everywhere. No magic numbers in CSS.
- State management for sheets, filters, and navigation lives in clearly defined modules, not scattered across event handlers.

**This does NOT mean:**
- We need an abstraction framework or a component library before writing any UI. Start concrete, extract patterns when duplication appears.

### 2.3 Thin Slices Over Moonshots

Ship vertically complete features (data → logic → UI → tests), not horizontal layers ("all the data models first, then all the UI later").

**This means:**
- A single location type working end-to-end (map marker → card → detail → route) ships before all location types are modeled.
- Every PR is deployable. No "this branch needs 3 more PRs to be useful."
- Features are scoped to what can be built, tested, and shipped in 1-3 days.

**This does NOT mean:**
- We skip planning. Thin slices require more upfront design to cut correctly.
- We accumulate tech debt knowingly. Each slice must be clean.

### 2.4 One Owner Per Component

Every rendered element, every CSS scope, every state machine has exactly one owner. No two systems fight over the same pixel.

**This means:**
- The sheet component owns sheet positioning, backdrop, and drag physics. Nothing else touches those concerns.
- CSS is scoped per component. No global overrides that "fix" another component's layout.
- If a bug exists, there is exactly one file to look at.

**This does NOT mean:**
- Components cannot communicate. They can — through defined interfaces, not by reaching into each other's DOM or state.

### 2.5 Stability Before Monetization

Affiliate links, featured listings, and any commercial content must never compromise the core discovery loop.

**This means:**
- The free experience must be complete and excellent. No "upgrade to see opening hours."
- Commercial features are added only after the core loop is stable, tested, and trusted.
- Revenue code is isolated — removing it changes nothing about core functionality.

**This does NOT mean:**
- We ignore monetization planning. We design the architecture to support it cleanly from day one. We just don't build it first.

### 2.6 Reduce Decision Friction

Fewer taps to confidence, not more features. Every interaction must earn its existence by moving the user closer to a decision.

**This means:**
- Critical info (type, distance, open/closed, one photo) is visible without tapping into a detail view.
- Filters default to the most common use case (nearby, all types, open now).
- "Route" is always one tap away from any card or detail view.
- Back navigation is instant and predictable. No "where did my map go?"

**This does NOT mean:**
- We remove all depth. Detail views exist for users who want more. But the common case should not require them.

### 2.7 Measure Behavior, Don't Guess

Analytics before redesigns. Never rebuild a feature based on assumption when you can instrument the current one.

**This means:**
- Core interactions are tracked: map pan/zoom, filter usage, card taps, detail views, route taps, save actions.
- Redesign proposals cite data: "40% of users tap filter but 80% never change the default" is a valid reason to redesign filters.
- A/B testing infrastructure exists before launch, even if it's just a feature flag and an event counter.

**This does NOT mean:**
- We delay shipping until analytics is perfect. Ship with basic event tracking, iterate.
- We track everything. Only track what informs decisions.

### 2.8 Calm, Dense, Clear UI

Apple Maps density, not Instagram noise. Information-rich without feeling cluttered. Quiet without feeling empty.

**This means:**
- Cards show 4-5 data points without feeling busy (name, type, distance, rating, open status).
- Map UI uses translucent overlays that let the map breathe underneath.
- No competing calls-to-action. One primary action per screen state.
- Typography does the hierarchy work, not color or size extremes.

**This does NOT mean:**
- We copy Apple Maps pixel-for-pixel. We learn from its information density and spatial clarity, then apply our own identity.

### 2.9 Everything Supports the Discovery Loop

If it doesn't help the user find, evaluate, or choose a place, it does not belong in the core flow.

**This means:**
- Blog content, about pages, and editorial content live outside the app shell.
- Settings, account management, and preferences are accessible but never in the way.
- Onboarding is implicit (use the map, learn the UI) not explicit (tutorial screens, coach marks).

**This does NOT mean:**
- We never build features outside the loop. We can — but they don't live in the app's primary navigation or interrupt the map experience.

### 2.10 Two-Sheet Separation

The browse sheet and the detail sheet are independent, never overlapping. Only one is visible at a time.

**This means:**
- Opening a location detail dismisses the browse sheet entirely and presents the detail sheet.
- Closing the detail sheet restores the browse sheet to its previous state.
- No sheet-within-a-sheet nesting. No partial overlays. Two distinct containers, hard-switched.

**This does NOT mean:**
- The sheets can't share code or design tokens. They should look cohesive — they just don't coexist on screen.

### 2.11 Rebuild Cleanly

No dragging v1 spaghetti into v2 without explicit justification and a migration plan.

**This means:**
- Every v1 pattern is evaluated: keep (with refactor), replace, or delete. No silent carry-forward.
- If v1 code is reused, it gets a refactor pass to meet v2 standards before merging.
- The v2 codebase compiles and runs independently from v1 from day one.

**This does NOT mean:**
- We rewrite everything from scratch for the sake of it. Proven, clean v1 code can be migrated. But it must be a conscious decision, not copy-paste inertia.

---

## 3. Design Rules

These are build rules, not guidelines. Violating them requires updating this document first.

### Layout

- **Mobile map-first.** The map is the default view on every screen size. The app is a PWA that feels native on iOS Safari.
- **Maximum 3 visual grammars:** glass surfaces (translucent overlays on map), solid cards (opaque content containers), and the map itself. Everything rendered fits one of these three. No fourth category.
- **Sheet is the primary navigation container on mobile.** Peek → half → full. Three states, no in-between.

### Spacing

- **Strict spacing scale:** 4, 8, 12, 16, 24, 32, 48, 64. No other values. No `margin: 13px`. No `padding: 0.7rem`. If the design needs 13px, it's wrong — pick 12 or 16.
- **Spacing tokens are named, not numeric.** Use `--space-xs`, `--space-sm`, etc. Never raw pixel values in component CSS.

### Typography

- **Two roles, two fonts:**
  - Headings: Newsreader (editorial, warm, trustworthy)
  - Body/UI: Inter (clean, functional, readable at small sizes)
- **Type scale is predefined.** No custom font sizes. Every text element maps to a named step in the scale.
- **Font loading is non-blocking.** System font fallbacks are visually acceptable. No FOUT that shifts layout.

### Glass and Surfaces

- **Glass is functional, not decorative.** It is used for elements that overlay the map (search bar, sheet header, filter bar) so the map remains partially visible. Glass is never used on opaque backgrounds where it serves no purpose.
- **One glass recipe.** Same blur radius, same background opacity, same border treatment everywhere. No per-component glass variations.

### Touch and Interaction

- **44px minimum tap targets.** Always. No exceptions. This includes filter chips, close buttons, list items, and map controls.
- **Sheet physics: predictable, velocity-aware, no sudden jumps.** Drag-to-dismiss uses momentum. Snap points are hard (peek/half/full). Releasing between snap points animates to the nearest one based on velocity and position. Never teleports.
- **Touch feedback on every interactive element.** Subtle scale or opacity change on press. No element should feel dead when tapped.

### UI Chrome

- **No emoji in UI.** Use SVG icons for all iconography. Emoji rendering varies across platforms and looks unprofessional.
- **Light mode only.** No dark mode toggle, no `prefers-color-scheme` switching. Design tokens are light-mode only. Dark mode is explicitly deferred (see migration plan).

### Color

- **Warm coral/terracotta palette.** The brand is warm, approachable, and distinctly not corporate-tech.
- **No cold blues, no purples, no gradients.** Ever. Not in buttons, not in charts, not in illustrations.
- **Semantic colors for states:** success (green), warning (amber), error (red), info (neutral). These are the only non-brand colors allowed.
- **Map tiles use muted, desaturated styling** so markers and UI elements stand out. The map is a canvas, not a competitor for attention.

### Information Density

- **Information density over whitespace.** Parents need data, not decoration. A card that shows name + type + distance + open status + rating in a compact layout beats a card that shows a giant photo and a name.
- **Photos are supporting, not primary.** A small thumbnail builds trust. A full-bleed hero image wastes viewport on mobile.
- **No decorative illustrations in the core flow.** Illustrations are acceptable in empty states and onboarding. Nowhere else.

---

## 4. Feature Inclusion Rules

### When to Add a Feature

A feature is approved for the current cycle if ALL of the following are true:

1. **It accelerates one of the four loop steps** (zoeken, filteren, vertrouwen, kiezen).
2. **It can be built as a thin slice** — fully functional end-to-end in 1-3 days.
3. **It does not require new infrastructure** that isn't already planned.
4. **It has a clear "done" definition** (see Quality Gates below).
5. **Removing it later would not break anything else.**

If any condition is false, the feature is deferred to a future cycle.

### Evaluating "Does This Reduce Friction?"

Ask these questions in order:

1. What user action does this replace or eliminate?
2. How many taps/seconds does it save on the critical path?
3. Does it introduce new concepts the user must learn?
4. Could we achieve 80% of the benefit with a simpler version?

If the answer to #1 is "nothing" — the feature adds capability, not reduces friction. Defer it unless it's in the current roadmap.

### Optional Features Must Never Gate Core Discovery

- **Authentication:** Optional. Needed only for saving favorites and plan creation. The entire discovery loop (zoeken → filteren → vertrouwen → kiezen) works without an account.
- **Premium/paid features:** If they ever exist, they enhance (more filters, export, alerts) — they never restrict (hiding locations, gating detail views, limiting searches).
- **Social features:** Reviews, tips, photos from users — these are trust signals that feed step 3 (vertrouwen). They are additive. They never replace editorial verification.

### Handling "Nice to Have" Requests During Rebuild

1. Log it in a `deferred.md` backlog with the requester and a one-line description.
2. Do not discuss scope, design, or implementation until the current cycle is complete.
3. Review the backlog at the start of each new cycle. Evaluate against the inclusion rules above.
4. If it keeps getting deferred for 3+ cycles, delete it. It's not important enough.

---

## 5. Monetization Rules

### Affiliate Links

- Displayed at the **edge of the UX**: bottom of detail views, "book tickets" buttons, external links section.
- **Clearly disclosed.** A small label ("affiliate link" or equivalent) is always present. No dark patterns.
- **Never in the way.** Affiliate links never appear in map cards, filter results, or the sheet's peek/half states. They live in detail views and dedicated sections only.
- **Never influence ranking or display order.** Affiliate partnerships do not change which locations appear first or how they are scored.

### Featured Listings

- **Explicit.** Visually distinct from organic results. Labeled "uitgelicht" or equivalent.
- **Sparse.** Maximum 1 featured listing per 10 organic results. Never more than 2 visible simultaneously.
- **Measurable.** Every featured listing tracks impressions, taps, and conversion separately from organic.
- **Reversible.** Featured listings can be turned off instantly without affecting the rest of the UI or data model.

### Ads

- **If present:** below the fold only. Never between the user and their next action in the discovery loop.
- **Never interrupting:** no interstitials, no pre-roll, no "watch this ad to see more results."
- **Never in the map view.** The map is sacred. No ad overlays, no sponsored markers (unless clearly labeled and sparse — see Featured Listings).

### Trust Protection

- Commercial content must never silently corrupt search results or ranking algorithms.
- Any change to ranking that considers commercial factors must be documented in this file and approved.
- Users must never wonder "is this result here because it's good or because someone paid?" If that question is possible, the implementation is wrong.

---

## 6. Quality Gates

### What "Done" Means for a Feature

A feature is done when ALL of the following are true:

- [ ] **Functional:** Works correctly on iOS Safari 16+, Chrome mobile, and desktop Chrome/Safari/Firefox.
- [ ] **Tested:** Has at least one automated test covering the happy path and one covering the primary error state.
- [ ] **Visually verified:** Screenshots taken at 390px (mobile) and 1280px (desktop). All interactive states exercised (open, closed, loading, empty, error).
- [ ] **Accessible:** Keyboard navigable on desktop. Screen reader announces interactive elements correctly. Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI elements).
- [ ] **Performant:** Meets the performance budget (see below).
- [ ] **Reviewed:** Code reviewed by at least one other person or thoroughly self-reviewed with a checklist.
- [ ] **Documented:** If the feature introduces a new pattern, it is documented in the relevant architecture doc.

### Testing Requirements

- **Unit/integration tests:** Every state machine, data transformer, and utility function has tests.
- **E2E tests:** Core discovery loop (load → see map → tap marker → view card → open detail → tap route) has an automated E2E test that runs on every PR.
- **Visual regression:** Playwright screenshots compared against baselines for key states. Regressions block merge.
- **Manual QA:** Before any release, run the `/visual-qa` checklist covering all sheet states, tabs, filters, and map interactions.

### Performance Budget

- **First Contentful Paint:** < 1.5s on 4G connection.
- **Largest Contentful Paint:** < 2.5s on 4G connection.
- **Time to Interactive:** < 3.0s on 4G connection.
- **Total JS bundle:** < 150KB gzipped (excluding map library).
- **Total CSS:** < 30KB gzipped.
- **Map tile load:** First meaningful map render < 2.0s on 4G.
- **Sheet animation:** 60fps on iPhone 12 and newer. No dropped frames during drag.

### Accessibility Minimums

- All interactive elements reachable via keyboard (Tab, Enter, Escape).
- Sheet states announced to screen readers (expanded/collapsed).
- Map markers have accessible labels.
- No information conveyed by color alone.
- Touch targets: 44px minimum (repeated here because it's both a design rule and an accessibility requirement).
- `prefers-reduced-motion` respected: sheet snaps instantly instead of animating, map transitions are instant.

### Visual Regression Standards

- Baseline screenshots stored in the repo, updated intentionally (never auto-accepted).
- Pixel diff threshold: 0.1% of viewport. Anything above triggers manual review.
- Baselines cover: empty state, loading state, populated state, error state, and all sheet positions (peek, half, full).

---

*This document is the source of truth for product decisions during the v2 rebuild. It is a living document — but changes require explicit justification and must be committed with a clear rationale in the commit message. "I felt like it" is not a rationale.*
