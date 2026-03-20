# PeuterPlannen Mobile UX — Virtual Expert Focus Group

**Date:** 19 March 2026
**Facilitator note:** Seven experts from different disciplines reviewed the four mobile UX concepts documented in MOBILE-CONCEPTS.md. This is an unfiltered transcript of their reactions, proposals, disagreements, and insights.

**The panel:**
1. **Yuki (36)** — Senior Interaction Designer, ex-Apple Maps team
2. **Marcus (42)** — Mobile Accessibility Specialist, WCAG consultant
3. **Elena (29)** — Growth Product Manager, scaled 3 consumer apps to 1M+ users
4. **Daan (34)** — Dutch Frontend Developer, built Funda's mobile experience
5. **Sarah (31)** — Parent UX Researcher, 200+ parent user interviews
6. **Raj (38)** — Creative Director, breaks design conventions
7. **Lisa (45)** — VP Engineering turned solo builder, shipped 4 apps with AI tools

---

## Part A: Reactions to the 4 Existing Concepts

---

### Yuki (Interaction Designer, ex-Apple Maps)

**Concept 1 — "De Speeltuin-Kijker" (Split-Sync)**
The split-panel is a desktop pattern forced into a mobile viewport. I worked on Apple Maps and we explicitly rejected split-panel for phones. At 40% viewport height the map shows maybe 500x340 pixels of actual map content — after subtracting the search bar, chips, and weather banner, you can see about 4 city blocks. That's not enough to form spatial awareness. The dual-scroll-zone problem is real: we tested this at Apple and even with careful touch area boundaries, 18% of test users accidentally triggered the wrong scroll zone in their first session. **I would not pick this.**

**Concept 2 — "Het Glazen Venster" (Bottom Sheet)**
This is the right foundation. The three-snap bottom sheet is proven at scale — billions of sessions across Google Maps and Apple Maps. But the document underestimates the gesture conflict at half-state. When the sheet is at 50vh and the user scrolls content inside it, you need a "scroll lock" threshold: only allow sheet drag from the drag handle, and only allow content scroll from the content area. The moment you try to be clever about "drag from anywhere," you get the bug that plagued Google Maps for two years (2021-2023) where the sheet would randomly fly up when you were trying to scroll through restaurant reviews. **My pick, with caveats.**

**Concept 3 — "De Kaartentafel" (Cards + Toggle)**
Solid and safe. The Airbnb mobile web pattern. But it fundamentally misaligns with the stated product vision: "the map IS the product." If the default view is a list of cards, users will perceive this as a directory with a map feature, not a map-first discovery app. This has strategic implications — you'll attract list-browsers, not map-explorers. **Good fallback, wrong default.**

**Concept 4 — "De Ontdekkaart" (Floating Cards)**
I love the ambition. The floating cards idea is genuinely novel. But I've seen this fail in practice. Mapbox tried floating labels with interaction states in 2023 and pulled back. The collision avoidance problem alone would consume weeks of development. At zoom level 13 (city view) with 20+ markers visible, you simply cannot fit 5-8 floating cards without overlap. And the morph animation from 80x40 to 280x300 while maintaining glass backdrop-filter — that's going to stutter on anything below a Snapdragon 8 Gen 2. **Visually stunning concept, operationally impractical.**

---

### Marcus (Accessibility Specialist)

**Concept 1 — Split-Sync**
Two scroll regions without clear visual or semantic boundaries is an accessibility nightmare. Screen readers will struggle to communicate which region is active. Users with motor impairments who use switch access need clearly delineated interactive zones. The "sync" behavior (pan map = update list) violates WCAG 3.2.2 (On Input) if there's no explicit user action triggering the change. Automatic content updates based on map panning are disorienting for cognitively impaired users. **Major concerns.**

**Concept 2 — Bottom Sheet**
Bottom sheets have become expected UI, so assistive technology has evolved to support them. But three snap positions (peek/half/full) is one too many. Two positions (collapsed/expanded) is cognitively manageable. Three forces the user to maintain a mental model of "where am I in the sheet hierarchy" — that's an extra cognitive task that serves the designer, not the user. Also: the drag handle needs `role="slider"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` for screen reader users to understand and control the sheet position. **Workable with modifications.**

**Concept 3 — Cards + Toggle**
This is the most accessible option by far. A scrollable list of cards is the most well-understood pattern in mobile web. Screen readers handle it natively. Switch access works. Large touch targets on each card. The toggle between list and map is a clear binary state. One concern: the floating "Kaart" button at bottom-right could overlap with iOS AssistiveTouch or Android's accessibility button, which often sits in the same position. Move it to bottom-center or bottom-left. **My top pick for accessibility.**

**Concept 4 — Floating Cards**
This is the least accessible concept by a wide margin. Floating cards that appear and disappear based on map state cannot be reliably announced by screen readers. The hamburger menu hides essential navigation. The expand-in-place interaction has no keyboard equivalent. The 48px bottom bar with only 2 items wastes the space that could provide clear navigation. Minimum touch target size per WCAG 2.2 is 24x24px, but the "success criterion" target is 44x44px — floating cards at 80x40px barely clear the minimum and fail the success criterion in their collapsed state. **I cannot endorse this concept.**

---

### Elena (Growth Product Manager)

**Concept 1 — Split-Sync**
My concern is the first-time user experience. A new user lands on a split screen with a small map and 2.5 location cards. Where's the value proposition? Where's the "aha moment"? In growth terms, the Time-to-Value is too long — you have to understand the sync mechanic before the interface makes sense. I've seen this exact pattern kill activation rates at a travel app I worked on. Split-screen dropped Day 1 retention by 23% compared to a single-focus layout. **Pass.**

**Concept 2 — Bottom Sheet**
The peek state is brilliant for growth. "Ontdek 127 locaties" with the weather — that's a hook. It says: there's a lot here, it's relevant to right now (the weather), and all you have to do is swipe up. The progressive disclosure from peek to half to full mirrors the user's growing commitment. But I'd rethink the onboarding. "How old is your child?" as the first interaction is a GATE. Every gate before value reduces activation. Show them the map with locations first, let them feel the product, THEN ask about age to personalize. The age question should be a delightful enhancement, not a barrier. **My pick, but delay the onboarding question.**

**Concept 3 — Cards + Toggle**
The photo-rich cards are excellent for social sharing and SEO — each card is basically a mini landing page. From a growth perspective, this drives the loop: parent discovers location via Google, shares card screenshot on WhatsApp, friend visits, sees more cards, shares again. But the map toggle concerns me. Data from three apps I've worked on shows that toggle-hidden features have 60-70% lower engagement than always-visible features. If the map is behind a toggle, most users will never see it. **Good for content-led growth, bad for map engagement.**

**Concept 4 — Floating Cards**
Incredibly shareable, incredibly viral if executed well — the floating glass cards over a map would make stunning screenshots that people would share just for the aesthetic. But the learning curve is steep. In my experience, any app that requires "figuring out" loses 40% of first-time users in the first 30 seconds. No visible list, no visible navigation, just floating cards that appear and disappear — most parents will feel lost. And lost parents close apps. **Too risky for a product that hasn't found product-market fit yet.**

---

### Daan (Dutch Frontend Developer, built Funda mobile)

**Concept 1 — Split-Sync**
We built something similar at Funda for the "kaart en lijst" view. The sync logic is deceptively hard. The `moveend` event on MapLibre fires during momentum scrolling too, so your debounce at 300ms will still fire 3-4 list updates during a single map pan. Each update triggers a Supabase query or at minimum a client-side filter of 2138 locations. On a 4G connection in the Bijlmer (where a lot of young families live), that's noticeable lag. We ended up using `idle` event instead of `moveend` at Funda, which only fires when the map has completely stopped moving. Also: the dual-scroll problem isn't just UX — it's a real CSS `overflow` headache. You need `touch-action: none` on the map container and `touch-action: pan-y` on the list, with a clear divider that doesn't accidentally capture touches. We spent 3 sprints on this at Funda. **Not worth the effort for a solo builder.**

**Concept 2 — Bottom Sheet**
This is buildable. I've implemented bottom sheets in vanilla JS and the core logic is maybe 200 lines: track touch start/move/end on the handle, calculate velocity, snap to nearest position. The gesture conflict at half-state is solvable: use `touch-action: pan-y` on the sheet content and only allow sheet dragging from the drag handle element (a 44px tall bar at the top of the sheet). The `backdrop-filter: blur(14px)` on a full-width sheet is my one concern for Dutch users. The most popular phones in the Netherlands in 2026 are Samsung Galaxy A-series (A25, A35, A55). The A25 has a Mali-G68 GPU that can handle backdrop-filter but will drop frames during the sheet drag animation. Solution: disable blur during `touchmove` and re-enable on `touchend` with a 100ms transition. Or use a pre-rendered blurred canvas as fallback. **My pick. Buildable in a weekend, polishable in a week.**

**Concept 3 — Cards + Toggle**
The simplest to build and maintain. No gesture complexity, no glass performance issues in list mode, standard scrollable content. The toggle is a `display: none` swap between two containers. For a solo builder this is the lowest-risk option. But it's also the least impressive technically. Dutch users are used to Funda, Marktplaats, Thuisbezorgd — all list-first apps. PeuterPlannen would just be "another list app" visually. **Build this as a Phase 1 if you want to ship fast, but plan to evolve to Concept 2.**

**Concept 4 — Floating Cards**
The collision avoidance alone is a multi-week project. You'd need to implement something like a force-directed layout that runs on every map `render` event, repositioning 5-8 absolutely positioned DOM elements while maintaining their association with map markers. MapLibre's `Marker` class positions elements via CSS `transform`, but these floating cards need to avoid each other AND stay connected to their marker with a visual line or arrow. This is what cartographers call "label placement" and it's literally an NP-hard problem. You'd end up pulling in a library like `rbush` for spatial indexing and writing a custom layout algorithm. For a solo builder with vanilla JS — no. **This would take 4-6 weeks minimum and still feel fragile.**

---

### Sarah (Parent UX Researcher)

**Concept 1 — Split-Sync**
I've watched 200+ parents use phones. The number one thing parents do is hold the phone in one hand while the other hand holds a child, a bag, a snack, or the stroller handle. The thumb reaches the bottom 60% of the screen comfortably, the top 20% requires stretching. In this concept, the search bar and filter chips are in the top 20% — the hardest-to-reach zone. And the map (which requires precise two-finger gestures for pinch-zoom) is right in the middle where the thumb naturally lands, but pinch-zoom requires two hands. You've put the two-hand interaction in the one-hand zone and the one-hand interaction (filter taps) in the two-hand zone. **The ergonomics are backwards.**

**Concept 2 — Bottom Sheet**
This gets the ergonomics right by accident. The bottom sheet peek and drag handle are right in the thumb zone. The CTA buttons ("Route plannen") in the full sheet are in the middle zone — reachable. The search bar is at the top, which is the least-used element (parents browse more than they search). My concern is the onboarding question. When I interview parents about apps, the number one complaint is "it asked me too many questions before I could use it." The age question is useful but should be a gentle inline prompt AFTER they've seen 3-4 locations, not a modal before they see anything. Also: the ♡ (favorite) button on location cards is typically a small icon. With buttery fingers (literally — parents have food on their hands), make it at least 44x44px with generous padding. **Good direction, needs parent-context details.**

**Concept 3 — Cards + Toggle**
This is the pattern parents already know from Marktplaats (selling kids' clothes), Thuisbezorgd (ordering dinner), and Instagram (scrolling). Zero learning curve. The large photo cards are excellent because parents share screenshots in WhatsApp groups: "Kijk, dit lijkt leuk voor zaterdag!" A card with a big photo + name + score is a perfect shareable unit. I'd argue this is the best concept for the parent word-of-mouth loop: see card → screenshot → send to partner/friend → they visit → they share. **Best for parent behavior patterns, weakest for map discovery.**

**Concept 4 — Floating Cards**
I can tell you exactly what would happen in a user test. A parent opens this app at the playground while their toddler is climbing something. They have 10 seconds of attention. They see a map with floating cards. They try to tap one but their thumb lands between two overlapping cards. They accidentally pan the map. The cards disappear. They have no idea what happened. Their child yells. They close the app. This concept requires focused, two-handed attention — the opposite of how parents use phones. **Not suitable for the target audience.**

---

### Raj (Creative Director)

**Concept 1 — Split-Sync**
Boring. It's AllTrails-on-mobile, which itself is just Google Maps for hikers. There's nothing here that would make a parent screenshot this and send it to a friend saying "look at this beautiful app." The split layout looks functional but forgettable. Functional is fine for enterprise tools. For a consumer app aimed at parents who are drowning in gray, functional apps — PeuterPlannen should be a breath of fresh air. **Next.**

**Concept 2 — Bottom Sheet**
This is the "correct" answer and that's exactly what concerns me. Every mapping app in 2026 uses a bottom sheet. Google Maps, Apple Maps, Citymapper, Uber, every food delivery app. When PeuterPlannen opens and there's a map with a bottom sheet, the user's brain files it under "maps app" — not "magical toddler discovery tool." The glass effects help differentiate, and the warm terracotta palette is lovely, but structurally this is the same skeleton as every other app. That said — there's a reason every app uses it. It works. My instinct says: use the bottom sheet structure, but make the CONTENT inside it radically different. More on that in my proposal.

**Concept 3 — Cards + Toggle**
If I showed this to my team, they'd say "that's a nice website from 2019." Photo cards in a vertical scroll. A toggle button. Filter chips. This is a template. It's Airbnb without the brand equity. There's nothing in this concept that couldn't be built with a Webflow template and a Supabase backend. For a bootstrapped MVP that just needs to work — sure. But if PeuterPlannen wants to be a BRAND that parents love, this design won't get them there. **Functional but forgettable.**

**Concept 4 — Floating Cards**
Now THIS is interesting. I know everyone else is going to tear this apart for accessibility and feasibility, and they're right. But the core insight is correct: the map itself should communicate. Not "map + list on top of map" but "map that speaks." The floating cards are the wrong execution of the right idea. The idea of information that lives ON the map, that's spatially aware, that breathes — that's the direction. The execution needs to be simpler. **Wrong solution, right instinct. Keep the ambition, change the execution.**

---

### Lisa (VP Engineering turned solo builder)

**Concept 1 — Split-Sync**
I've built a split-panel map app. Never again. The sync logic is a maintenance nightmare. Every edge case spawns two more: what happens when GPS jumps? When there are 0 results in viewport? When the user zooms out to see all of the Netherlands and now you're rendering 2138 cards? The debounce timing is a constant tuning battle. And the moment you add a feature (sorting, grouping, "show more like this"), you're re-implementing it in both the list AND the map context. **Hard no from a maintenance perspective.**

**Concept 2 — Bottom Sheet**
I've shipped two apps with vanilla JS bottom sheets. Here's what the concept doc doesn't mention: deep linking. When a parent shares a WhatsApp link to a specific location, the app needs to open with the sheet in the right state showing the right location. That means your URL structure needs to encode: map center, zoom level, sheet state, and active location. Something like `app.html#@52.36,4.90,14z/loc/artis`. This is doable but you need to think about it from day one, not bolt it on later. Also: the sheet snap positions should use `CSS snap-type` where possible (Safari 16+ supports it on scroll containers) rather than pure JS touch handling — it's smoother and handles the rubber-band effect natively. **My pick. Ship the 2-snap version (collapsed/expanded) first, add the middle snap later if data shows users want it.**

**Concept 3 — Cards + Toggle**
Fastest to ship, easiest to maintain, and honestly? For a solo builder with 2138 locations and no full-time design team, this is the pragmatic choice. You can ship this in a day, iterate based on real user data, and evolve toward Concept 2 when you have evidence of what users actually want. The toggle is dead simple. The cards are just HTML. The map view is your existing MapLibre setup. **If I were building this from scratch tomorrow, I'd start here and evolve.**

**Concept 4 — Floating Cards**
I estimate 3-4 weeks of full-time development for a working prototype, and it would still have edge cases. The collision avoidance, the morph animation, the glass performance on budget Android — any one of these is a rabbit hole. And here's the thing nobody mentions: maintenance. Every new feature interacts with the floating card system. Add a "currently open" badge? Recalculate card sizes. Add a photo to the card? Recalculate collision boxes. Change the map tile style? Re-test all glass opacity values. This concept has the highest "ongoing tax" of all four. **Build this as a demo/prototype to impress investors, never as a production app.**

---

## Part B: Each Expert's Proposed Variation

---

### Yuki's Proposal: "Confident Sheet" (Simplified Concept 2)

Strip the bottom sheet to TWO snap positions, not three. Collapsed (peek: 100px) and expanded (85vh). No half-state. The half-state is where all the gesture conflicts live.

**Collapsed (peek):** Shows a single horizontal card carousel at the bottom. Cards are 160x80px glass pills showing: thumbnail (40x40), name, score, distance. Swipe horizontally to browse. Each card corresponds to a visible marker. Tap a card to expand the sheet.

**Expanded (85vh):** Full location detail, like Concept 2's full state. No intermediate list view in the sheet — the horizontal carousel IS the list. Users who want to browse use the carousel. Users who want details tap to expand.

**Why no half-state:** The half-state in Concept 2 tries to be a list view, but it's a bad list view — you see 2 cards in a cramped space with the map squeezed above. Either give the user the full map (collapsed) or the full detail (expanded). Don't try to give them 50% of both.

```
Collapsed state:
┌─────────────────────────────┐
│                             │
│  [🔍 Zoek...]               │ ← Glass search, top-left
│                             │
│        ●      ●             │
│   ●         ⑤    ●         │ ← Fullscreen map
│        ●              ●    │
│              ●              │
│   ●                         │
│        ●          ●        │
│                             │
│ ╔═══════════════════════════╗
│ ║ [📸Artis 8.2] [📸Vondel..] ║ ← Horizontal card carousel
│ ║  ← swipe →                ║    Glass, 80px tall
│ ╚═══════════════════════════╝
│ [♡ Saved]  [📋 Plan]  [≡]  │ ← Minimal bottom bar (44px)
└─────────────────────────────┘
```

**Key detail:** When the map moves, the carousel updates after 500ms idle (not 300ms debounce — idle is more intentional). Cards animate in with a subtle slide-and-fade. The carousel always sorts by distance from map center.

---

### Marcus's Proposal: "Accessible Sheet + List Escape Hatch"

Take Concept 2 with two modifications:

1. **Two snap positions only** (I agree with Yuki). Collapsed and expanded. Reduce cognitive load.

2. **A persistent "Lijst" toggle in the top-right** that switches to Concept 3's full-screen list view. This isn't just a nice-to-have — it's an accessibility requirement. Some users CANNOT use map interfaces: screen reader users, users with severe motor impairments, users with cognitive disabilities that make spatial reasoning difficult. They need a linear, scrollable list.

**Specific accessibility requirements:**
- Sheet drag handle: `role="slider"`, `aria-label="Locatiepaneel"`, `aria-valuemin="0"`, `aria-valuemax="1"`, `aria-valuenow="0"` (collapsed) or `"1"` (expanded). Keyboard: Arrow Up/Down to toggle.
- Map markers: each marker needs `role="button"`, `aria-label="Artis, dierentuin, peuterscore 8.2"`. Tab order should follow distance from center.
- Location cards: `role="article"` within a `role="feed"` container, with `aria-setsize` and `aria-posinset`.
- Minimum touch target: 44x44px for ALL interactive elements. The ♡ button on cards is often 24px — wrap it in a 44px padding box.
- Color contrast: terracotta (#C65D3E or similar) on cream (#FFF8F0 or similar) — verify this meets 4.5:1 ratio. Terracotta on glass over a map background is unpredictable — the contrast ratio changes with the map content behind it. You need a solid-color fallback shadow or outline on all glass text.

**The single most important accessibility fix across all concepts:** Every glass text element needs a `text-shadow: 0 0 8px rgba(255,248,240,0.8)` or a solid pill background behind text. Glass text over a dark map tile (like a park or water body) will become unreadable. I see no concept addressing this.

---

### Elena's Proposal: "Activation-First Sheet"

Concept 2, but redesign the entire first-visit flow for activation metrics:

**Step 1 — Zero-gate entry (0 seconds):**
App opens. Full-screen map. Markers visible. Bottom sheet peek shows: "23 speeltuinen binnen 2 km" (personalized if GPS available, otherwise "127 locaties in Amsterdam"). No age question. No onboarding modal. Immediate value.

**Step 2 — First engagement (5-15 seconds):**
User either taps a marker or swipes up the sheet. Either action = activation event. The sheet shows location cards. The user browses. They see scores, distances, photos.

**Step 3 — Soft personalization prompt (after 2nd location viewed):**
A non-blocking inline banner appears at the top of the sheet: "Hoe oud is je peuter? Dan tonen we betere suggesties." Tapping it reveals age buttons inline (not a modal). Dismissing it stores "asked, declined" — don't ask again for 7 days.

**Step 4 — Retention hook (after 3rd location viewed):**
"Sla je favorieten op ♡ — dan vind je ze altijd terug." This teaches the ♡ mechanic at the moment the user has formed enough intent to care about saving.

**Step 5 — Day-plan upsell (after 1st favorite saved):**
"Tip: maak een dagplan met meerdere locaties! [Plan je dag]"

**Why this matters:** The current concepts all put an onboarding gate before value. Every tap between "open app" and "see useful content" loses 20-30% of users. Gates should come AFTER the user has experienced value, not before.

**Metric framework:**
- Activation = viewed 1 location detail (within first session)
- Engagement = viewed 3+ locations OR saved 1 favorite
- Retention = returned within 7 days
- Target: 60% activation, 30% engagement, 15% D7 retention

---

### Daan's Proposal: "Progressive Glass Sheet" (Technical Spec)

Concept 2 with Yuki's 2-snap simplification and concrete technical implementation:

**Bottom sheet implementation (vanilla JS):**

```javascript
// Core: CSS custom property drives everything
// --sheet-y: 0 (collapsed) to 1 (expanded)
// All animations derive from this single value

const sheet = document.getElementById('sheet');
const COLLAPSED_H = 100; // px
const EXPANDED_H = window.innerHeight * 0.85;

// Snap positions
const SNAPS = [COLLAPSED_H, EXPANDED_H];

// Touch handling — ONLY on drag handle
handle.addEventListener('touchstart', onTouchStart, { passive: true });
handle.addEventListener('touchmove', onTouchMove, { passive: false });
handle.addEventListener('touchend', onTouchEnd, { passive: true });
```

**Glass performance strategy for Dutch market:**
The Samsung Galaxy A25 (Mali-G68) and Galaxy A35 (Adreno 619) are the #1 and #2 Android phones in NL. Both struggle with `backdrop-filter: blur()` during animations.

```css
/* Static state: full glass */
.sheet {
  background: rgba(255, 248, 240, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  will-change: transform;
}

/* During drag: kill blur, use solid fallback */
.sheet.dragging {
  background: rgba(255, 248, 240, 0.95);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* Transition blur back after drag ends */
.sheet.settling {
  transition: backdrop-filter 200ms ease-out,
              background 200ms ease-out;
}
```

**Safari bottom bar handling (critical for NL — 52% iOS market share):**

```css
/* Use dvh (dynamic viewport height) not vh */
.sheet-expanded {
  height: 85dvh; /* accounts for Safari bottom bar */
}

/* Safe area padding for bottom nav */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* The sheet peek should sit ABOVE the bottom nav */
.sheet-collapsed {
  bottom: calc(44px + env(safe-area-inset-bottom, 0px));
}
```

**Map tile optimization:** Use `maplibre-gl`'s `cooperativeGestures: true` option so accidental map touches while scrolling don't pan the map. Users need two-finger pan or must not be touching the sheet.

---

### Sarah's Proposal: "Parent-Context Mode"

Take Concept 2 as the base, but add a "parent-context" layer that no concept addresses:

**One-handed thumb zone design:**
Map the entire interface to the bottom 60% of the screen for one-handed use. This means:

```
Top 20% (hard to reach):   Map only — no interactive elements
Middle 20% (stretch zone): Filter chips (used rarely, OK to stretch for)
Bottom 60% (thumb zone):   Sheet, carousel, nav — ALL interactions here
```

Move the search bar INTO the sheet header (collapsed state), not floating at the top of the screen. When collapsed, the sheet shows:
```
╔═══════════════════════════════╗
║  🔍 Zoek of ontdek...        ║ ← Search IS the sheet header
║  [📸 Artis 8.2] [📸 Vondel..] ║ ← Carousel below
╚═══════════════════════════════╝
```

**"Snel kijken" mode:**
Parents look at their phone in 10-15 second bursts. Design for it. When the app detects it hasn't been touched for 30+ minutes and then opens (common "check quickly at the playground" pattern), show a special state:

```
╔═══════════════════════════════╗
║  In de buurt nu:              ║
║  🏛️ NEMO · 400m · Open       ║ ← Closest location, big text
║  🌳 Westerpark · 1.2km       ║ ← Second closest
║  ← Swipe voor meer            ║
╚═══════════════════════════════╝
```

No map chrome, no filters, just "here's what's near you right now." One tap opens the full detail.

**"Samen kiezen" mode:**
Parents often decide together. When a parent long-presses a location card, offer "Stuur naar partner" which generates a clean WhatsApp-shareable link with a preview card. Not a generic share sheet — a purpose-built WhatsApp message with emoji and context: "Zullen we zaterdag naar Artis? Peuterscore 8.2, 1.2 km van ons. [link]"

---

### Raj's Proposal: "The Living Map"

Everyone's thinking about what goes ON TOP of the map. I want to think about what the map itself communicates.

**Core idea:** The map isn't just tiles with pins. The map itself is the interface. Replace standard MapLibre markers with custom-rendered "zones" that pulse, glow, and breathe based on relevance.

**Specifically:**
- Within a 2km radius of the user, the map tiles get a warm terracotta tint overlay (like a vignette, strongest at the edges, transparent at center). This says "you are here, this is your world."
- Location markers aren't pins — they're small terracotta circles (12px) that PULSE subtly (0.8 → 1.0 scale, 2s cycle) for the top-3 scored locations in viewport. Other markers are static. This draws the eye without UI clutter.
- When you tap a pulsing marker, the map smoothly ZOOMS IN to it (not just pans, but flies in) and a single card rises from the bottom (not a sheet — a single card, 200px tall, with all key info and a "Meer" button).

```
After tapping a marker:
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│     [zoomed-in map area     │ ← Map has flown to marker
│      showing the specific   │    Surrounding markers dimmed
│      location context —     │    Streets, parks visible
│      nearby streets,        │
│      the park shape, etc.]  │
│                             │
│ ╔═══════════════════════════╗
│ ║ 📸  Vondelpark Speeltuin  ║ ← Single card (glass, 200px)
│ ║     ⭐ 9.1 · 0.4 km      ║    NOT a sheet — a card
│ ║     Gratis · 1-4 jr       ║    Swipe left/right = next/prev
│ ║     [Meer info →]  [♡]    ║    nearby location
│ ╚═══════════════════════════╝
│                             │
└─────────────────────────────┘
```

**The key innovation:** Swipe LEFT/RIGHT on this card to cycle through nearby locations. The map pans smoothly to each one. It's like Tinder for playgrounds — a spatial card deck. No list needed. No sheet needed. Just the map and one card at a time.

**Why this could work for parents:** One card = one decision. Not a list of 127 options (choice paralysis). Not a complex sheet with sections. Just: "Here's a place. Good? Tap for more. Not interested? Swipe to next." Parents with 10 seconds of attention can swipe through 3-4 options and tap "Meer info" on the one that catches their eye.

**Why this is NOT Concept 4:** No floating cards. No collision avoidance. No 8 glass elements at once. Just the map, one card, and swipe gestures. Technically simple: it's a horizontally paginated container with `scroll-snap-type: x mandatory`, positioned above the bottom bar, with map `flyTo()` calls on `scrollend`.

---

### Lisa's Proposal: "Ship Concept 3, Evolve to Concept 2"

I'm going to be the pragmatist nobody asked for. Here's what I'd actually build:

**Week 1: Ship Concept 3 (Cards + Toggle)**
- Full-screen scrollable list of location cards
- A floating "Kaart" toggle button
- Map view with markers and horizontal mini-card carousel at bottom
- No glass effects, no bottom sheet, no fancy animations
- Solid, fast, works on every phone, scores 9/10 on Oma Gerda test

**Week 2-3: Add glass polish**
- Glass search bar and chips in map view
- Glass mini-cards in map view
- Smooth toggle animation (crossfade 200ms)
- Test on Samsung Galaxy A25 — if glass stutters, use solid fallback

**Week 4: Introduce bottom sheet as the map view evolution**
- Replace the map toggle with a proper bottom sheet
- 2-snap positions (collapsed with carousel, expanded with detail)
- The list view remains accessible via a "Lijst" button in the search bar area

**Week 5+: Iterate based on data**
- If >60% of users stay in list view: invest in list, deprioritize sheet
- If >60% use map view: invest in sheet UX, add progressive disclosure
- If swipe-through card (Raj's idea) tests well: add it as the collapsed-sheet card behavior

**Why I propose this:** Every other expert is optimizing a concept in theory. But PeuterPlannen is a live product with real users. The fastest way to learn what Dutch parents actually want is to ship something simple, measure behavior, and evolve. The bottom sheet is the right endpoint, but you don't need to start there.

---

## Part C: The Safari iOS Bottom Bar Problem

---

### The Problem

In 2026, Safari on iOS places its address/tab bar at the BOTTOM of the screen by default (this has been the case since iOS 15, and by 2026 it's deeply entrenched). This means:

```
┌─────────────────────────────┐
│                             │
│       App content           │
│                             │
│                             │
│                             │
├─────────────────────────────┤ ← 44px: App's bottom nav
├─────────────────────────────┤ ← ~50px: Safari's bottom bar
│  ⟨  ⟩  🔲  📑  aA          │    (address + tab switcher)
├─────────────────────────────┤ ← 34px: iPhone home indicator
│         ───                 │
└─────────────────────────────┘
```

That's potentially **128px of unusable space** at the bottom of the screen. On a 844px viewport (iPhone 14), that's 15% of the screen. With a bottom sheet peek (100px) also at the bottom, almost 30% of the viewport is chrome and navigation, leaving only 70% for the map.

---

### Yuki

**Kill the bottom nav entirely.** Apple Maps doesn't have a bottom tab bar on mobile web. Neither should PeuterPlannen. The bottom sheet IS the navigation. Put "Favorieten" and "Plan je dag" inside the sheet as section tabs, not as a global nav bar.

Concretely: the collapsed sheet shows `[🔍 Zoek] [♡ Opgeslagen] [📋 Plan]` as three tabs within the sheet header. Tapping a tab expands the sheet and shows that section. The map is always visible behind the collapsed sheet. No separate bottom nav.

```css
/* No bottom nav at all */
.sheet-collapsed {
  bottom: env(safe-area-inset-bottom, 0px);
  /* Sits directly above Safari's bar + home indicator */
}
```

This reclaims 44-56px and removes the "double bar" problem entirely.

---

### Marcus

I partly agree with Yuki, but tabs inside a sheet are less discoverable than a global nav bar. As a compromise: use a **minimal bottom bar with 3 items max** (not 5), and make it VERY thin — 40px instead of 56px. Use icon-only (no labels) for users who understand icons, but add a `title` tooltip and `aria-label` for accessibility.

**Critical:** Use `env(safe-area-inset-bottom)` in CSS to account for the home indicator. And test with "Show Tab Bar" enabled in Safari settings — some users switch the address bar back to the top, which means your safe-area calculations must be dynamic.

```css
.bottom-nav {
  height: 40px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  /* Total height: 40px + safe area (34px on notch iPhones) = 74px */
}
```

---

### Elena

**The data says: remove the bottom nav.** I've analyzed heatmaps for three apps with bottom tab bars on mobile Safari. The bottom-most tab (rightmost item in a 5-tab bar) gets 60% fewer taps than the leftmost item, because users' thumbs collide with Safari's bar. The "Info" and "Plan" tabs in the concepts would be dead zones.

But don't just remove it — replace it with contextual actions. When viewing the map, show a collapsed sheet with browse/search. When viewing a location detail, show "Route" and "Favoriet" as floating bottom buttons. Each screen gets exactly the actions it needs, not a universal nav that's irrelevant half the time.

---

### Daan

**Use `display-mode: standalone` detection.** When the app is added to the home screen (PWA), there IS no Safari bar. So:

```css
/* In Safari browser: no bottom nav, use sheet only */
.bottom-nav { display: none; }
.sheet-collapsed { bottom: env(safe-area-inset-bottom); }

/* In PWA standalone mode: show bottom nav, no Safari bar */
@media (display-mode: standalone) {
  .bottom-nav { display: flex; }
  .sheet-collapsed { bottom: calc(40px + env(safe-area-inset-bottom)); }
}
```

This is the cleanest solution. In-browser users get the sheet-only navigation (saves space). PWA users get a proper bottom nav (they have the space). Encourage "Add to Home Screen" with a smart banner after 2nd visit.

---

### Sarah

Parents almost never install PWAs. Let's be honest. The browser experience IS the product for 90%+ of users. So design for Safari-with-bottom-bar as the primary viewport. That means: no app bottom nav. Sheet-based navigation only. And here's a specific UX detail: the sheet drag handle must be **at least 20px above** Safari's bottom bar. If the drag handle is right at the boundary, parents will accidentally tap Safari's address bar instead of the sheet. Add 12px of transparent padding between the last interactive element and the Safari zone.

```css
.sheet-collapsed {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
}
```

---

### Raj

The double-bar problem is an opportunity, not a problem. Safari's bar is TRANSPARENT on scroll. The map behind it is visible. If PeuterPlannen's bottom sheet is ALSO glass, the entire bottom of the screen becomes a layered glass sandwich: sheet glass → Safari glass → home indicator. That's beautiful. Lean into it. Make the sheet peek glass at 0.75 opacity with a warm tint so the map bleeds through both the sheet AND Safari's chrome. It creates depth that no native app can replicate because native apps don't have Safari's layer.

---

### Lisa

Raj's "glass sandwich" idea sounds lovely and will look different on every iOS version, every Safari update, and every "Reduce Transparency" accessibility setting. Fragile. Just remove the bottom nav bar and use the sheet. Ship it, move on.

**My concrete recommendation:**
1. No bottom nav in browser mode
2. Sheet navigation with tabs in the collapsed header
3. `env(safe-area-inset-bottom)` everywhere
4. Test on a real iPhone SE (smallest screen, 375x667) where every pixel matters
5. Use `100dvh` not `100vh` for the map height

---

## Part D: Progressive Disclosure

---

### What Should the "First Screen" Show?

**Yuki:** Map with markers. Collapsed sheet showing horizontal carousel of 5-6 nearest locations. Nothing else. The map IS the hook. Users should immediately feel "oh, there's a lot around me."

**Marcus:** Same as Yuki, but with one addition: a screen-reader-friendly text announcement: "PeuterPlannen: 23 locaties binnen 2 kilometer." Visually this is the count in the sheet. Semantically it's an `aria-live` region that announces on load.

**Elena:** Map + markers + collapsed sheet with personalized hook. If GPS is available: "14 speeltuinen binnen loopafstand." If not: "127 locaties in Amsterdam — waar ben je?" The first screen must communicate abundance and relevance.

**Daan:** Same as Yuki. But I'd pre-load the 5 closest locations' data in the initial HTML payload (server-side or baked into `app.html`) so the carousel renders instantly without waiting for a Supabase query. First paint with content < 1 second on 4G.

**Sarah:** The first screen should answer the question parents actually have: "Wat kan ik NU doen met mijn kind?" So: map + collapsed sheet, but the sheet shows: current weather + a single sentence: "Lekker weer — er zijn 8 speeltuinen binnen 1 km." This connects weather to action. Parents don't think in "locations" — they think in "what can we do."

**Raj:** The first screen should be emotionally evocative, not informationally dense. A fullscreen map with warm-tinted markers gently pulsing. No text visible except a softly glowing "Ontdek" label on the sheet handle. The feeling should be: "there's a world to explore." Details come when you engage.

**Lisa:** Whatever loads in under 1 second. Practically: the map centered on Amsterdam with hardcoded popular markers, a collapsed sheet with "Ontdek locaties" text, and a spinner in the carousel slot until Supabase responds. Perception of speed matters more than visual poetry.

---

### Progressive Disclosure Sequence

The panel converged on this sequence (with disagreements noted):

**Layer 0 — Instant (0s):** Fullscreen map + markers + collapsed sheet with count/weather. *Zero interaction required to see value.*

**Layer 1 — First tap (user taps a marker OR swipes carousel):** Sheet shows location preview card. Name, type, score, distance, one photo thumbnail. *One interaction reveals one location's summary.*

**Layer 2 — Second tap (user taps "Meer" or expands sheet):** Full location detail. Photo, description, facilities, opening hours, CTA buttons. *Second interaction reveals full depth.*

**Layer 3 — Active engagement (user saves a favorite or starts a plan):** Personalization prompt appears (age question). Retention mechanics activate (save to favorites explanation). Day-plan feature surfaces. *Third interaction reveals personalization and power features.*

**Layer 4 — Return visit:** App remembers last map position, active filters, saved favorites. Sheet opens with "Nieuw in de buurt" or "Je favorieten." *Return reveals continuity.*

**Disagreements:**
- **Elena vs. Raj** on Layer 0: Elena wants data ("14 speeltuinen") while Raj wants emotion ("Ontdek"). Elena: "Data reduces uncertainty. Uncertainty causes bounce." Raj: "Data is forgettable. Feeling is memorable." **Resolution: use both.** A number AND a warm word: "14 speeltuinen vlakbij — ga op ontdekking."
- **Sarah vs. Yuki** on when to show filters: Sarah says never show filters proactively — let users ask for them. Yuki says filter chips should be visible from the start to communicate that refinement is possible. **This connects directly to Part E below.**

---

## Part E: The Doubt About Filters

**Bas's question:** Are preset filters even needed? Or are they over-engineering a problem users don't have?

---

### TEAM "FILTERS ARE OVERRATED" (Sarah, Elena, Raj)

**Sarah:**
In my 200+ parent interviews, do you know how many parents said "I wish this app had better filters"? Zero. Do you know what they said? "I wish this app showed me what's good nearby." Parents don't think in filter categories. They don't wake up and say "today I want a kinderboerderij within 3km that has a changing table." They say "what should we do today?" and then scroll until something catches their eye.

The peuterscore already does the filtering work. If a location has a high score for their child's age, it floats to the top. If it's nearby, it appears first. That IS the filter — it's just invisible and automatic. Adding explicit filter chips says to the user: "the default sorting isn't good enough, you need to fix it yourself." That's a design failure, not a feature.

**My recommendation:** No filter chips. Instead, sort by a combined score: `(peuterscore * 0.4) + (distance_score * 0.3) + (weather_fit * 0.2) + (age_fit * 0.1)`. This "smart sort" replaces 4 filter categories with one algorithm. Show the REASON each location ranks high: "Dichtbij + hoge peuterscore" or "Ideaal bij regen" as a subtle label on each card.

**Elena:**
Every filter you add is a decision you're forcing the user to make. Decisions cost cognitive effort. Cognitive effort causes abandonment. The app has 2138 locations, but a parent in Amsterdam will see maybe 15-30 in their viewport. That's already a manageable number. You don't need to filter 2138 down to 8 — you need to RANK 15 so the best are on top.

Filters make sense when: (a) the catalog is so large that browsing is impossible (Amazon: millions of products), or (b) the user has a specific constraint they can't relax (flight booking: specific dates). PeuterPlannen is neither. 15-30 visible locations is browsable. And parents' constraints are flexible — they'd go to a kinderboerderij OR a speeltuin OR a museum. They're not committed to one category.

**One exception:** A "weather" filter makes sense. "Show me indoor locations" when it's raining is a genuine, urgent, binary need. Build that as a single smart toggle, not as part of a filter system.

**Raj:**
Filters are UI clutter from the 2010s. They're what you add when your information architecture is too flat and your ranking is too dumb. If PeuterPlannen's smart sort works, users don't need to filter. They need to trust. Design for trust: "We've shown you the best options." Not: "Here are 17 filter combinations to play with."

Kill the chips. Use the horizontal space for something better — maybe a weather-reactive banner ("Perfect zwembadweer vandaag!") or a curated collection ("Verborgen pareltjes in West").

---

### TEAM "SOME FILTERING IS ESSENTIAL" (Marcus, Daan, Yuki)

**Marcus:**
Filters are an accessibility feature, full stop. A parent with a child in a wheelchair NEEDS to filter for "rolstoeltoegankelijk." A parent with a child with autism NEEDS to filter for "rustig" or "niet te druk." These aren't preferences — they're access requirements. You cannot rely on a smart algorithm to surface these. The parent knows their constraint; let them express it.

Also: cognitive accessibility means reducing ambiguity. When I see 15 markers on a map, I feel overwhelmed. When I tap "Speeltuin" and see 6 markers, I feel in control. Filtering isn't just about narrowing results — it's about giving users a sense of control over information density.

**Daan:**
In the Netherlands, parents are VERY specific when they plan outings. Dutch parents plan. They check the weather, the distance, whether there's parking, whether there's a cafe for them. I know this because at Funda, we tried removing filters on the mobile app and got flooded with complaints within a week. Dutch users WANT to specify their criteria. It's cultural.

That said: the filter chips in the concepts are too many. Five chips plus "+Meer" is overwhelming. Here's what I'd do:

Three chips only, contextual:
1. **Type** (most important): Speeltuin | Kinderboerderij | Museum | Zwembad | Meer
2. **Weather-reactive** (auto-selected): "Buiten" on sunny days, "Binnen" on rainy days
3. **Distance**: < 2km | < 5km | Alles

That's it. No age filter (the smart sort handles it). No facilities filter (too specific for quick mobile use — save it for a desktop filter panel).

**Yuki:**
Sarah's smart sort approach is correct in theory but dangerous in practice. If the algorithm surfaces a kinderboerderij first and the parent hates kinderboerderijen, they have no way to say "not this." They just see a bad recommendation and lose trust. Filters are a trust mechanism — they let the user correct the algorithm.

But I agree the chips should be minimal. Two filter dimensions maximum on mobile: Type and one contextual dimension (distance or weather). Put them in the collapsed sheet header, not floating above the map.

---

### RESOLUTION

The panel reached rough consensus:

1. **No proactive filter chips floating above the map.** Reclaim that screen space.
2. **Smart sort as the default** — rank by combined relevance score, show the WHY on each card.
3. **Type filter accessible via a single "Filter" icon** in the sheet header, revealing 4-5 type chips inline. Not visible by default, but one tap away.
4. **Weather-reactive smart banner** — when it's raining, show "Binnenlocaties" as a prominent one-tap filter at the top of the sheet. When it's sunny, don't show anything (outside is the default).
5. **Accessibility filters** (wheelchair, quiet, etc.) in a "Meer filters" section within the expanded sheet, not in the quick-filter chips.

---

## Part F: The #1 "You're Missing This" Insight

Each expert names the single biggest gap in all four concepts.

---

### Yuki: "Map interaction feedback is underspecified"

None of the concepts describe what happens when you tap a cluster marker (the "5" badge). Does it zoom in? Does it expand into individual markers? Does the sheet show the 5 locations as a list? Cluster interaction is the MOST common map interaction when you have 2138 locations, and it's not addressed. At Apple Maps, cluster behavior accounted for 30% of all map touches.

**Specific suggestion:** Tapping a cluster should smooth-zoom to a level where all clustered markers are individually visible (`map.fitBounds(clusterLeaves.getBounds(), { padding: 50 })`), AND the sheet carousel should populate with those specific locations. The cluster "dissolve" animation should take 400ms and use `map.flyTo` with `essential: true`.

---

### Marcus: "No offline or low-connectivity state"

Dutch parents use this app at playgrounds, parks, and farms — places with spotty 4G. None of the concepts address what happens when the connection drops. Does the map go blank? Do the markers disappear? Does the sheet show a spinner forever?

**Specific suggestion:** Cache the last 50 viewed locations in `localStorage`. Cache map tiles using MapLibre's tile caching. When offline, show a subtle banner "Offline — laatst opgeslagen locaties" and display cached locations. The sheet should never show an empty state or a spinner longer than 3 seconds — always fall back to cached data.

---

### Elena: "No sharing/viral loop is designed"

PeuterPlannen's growth will come from parent-to-parent sharing on WhatsApp. None of the concepts have a share flow. There's a generic share icon (📤) but no specification of what gets shared. A URL? An image? A preview card?

**Specific suggestion:** Build a "share card" — when a parent taps share on a location, generate an image (using Canvas API or html2canvas) showing: location photo, name, peuterscore, distance, and a QR code linking back to the app. This image is optimized for WhatsApp (1200x630px, Open Graph dimensions). Parents share images, not links. The image IS the marketing material.

Share message template: `"Vondelpark Speeltuin ⭐ 9.1 — Gratis, ideaal voor 1-4 jaar! https://peuterplannen.nl/locatie/vondelpark-speeltuin"`

---

### Daan: "Performance budget is missing"

None of the concepts set a performance budget. With 2138 locations, an unoptimized MapLibre setup will load megabytes of GeoJSON and render thousands of markers. On a Samsung Galaxy A25 with 4G, initial load could be 5+ seconds.

**Specific numbers to target:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 200ms
- Map interactive: < 3s
- GeoJSON payload: < 200KB (use server-side viewport filtering or tile-based loading)
- Maximum simultaneous glass elements: 3 (search bar, sheet, bottom bar)
- `backdrop-filter` only on elements < 50% viewport width/height, or use pre-blurred image fallback

**Practical suggestion:** Don't load all 2138 locations at once. Use MapLibre's vector tile source with Supabase's PostGIS to serve only the locations in the current viewport + 1 tile buffer. This is the same pattern Funda uses for 400K+ listings.

---

### Sarah: "The 'what about my baby?' gap"

The concepts talk about "peuters (0-6)" but don't address that a parent with a 6-month-old has COMPLETELY different needs than a parent with a 4-year-old. A 6-month-old needs: shade, changing table, breastfeeding-friendly, flat terrain for the stroller. A 4-year-old needs: climbing equipment, space to run, other kids around.

None of the concepts show HOW the interface changes based on child age. The onboarding asks "how old is your child?" but then what? If I say "8 months," how does the list change? What scores differently? If this isn't visible, the personalization feels like empty theater.

**Specific suggestion:** After age selection, show a brief "personalization confirmation" in the sheet: "Aangepast voor 8 maanden: we letten extra op verschoontafels, schaduw en vlakke paden." Then, on each location card, show WHY it's good for that age: "Goed voor 8 mnd: schaduwrijke wandelpaden" instead of generic "⭐ 8.2." Make the personalization tangible and visible on every card.

---

### Raj: "There's no emotional design"

Every concept treats locations as data objects: name, type, score, distance, facilities. But parents don't choose a Saturday outing based on data. They choose based on FEELING. "This looks magical." "My kid would love this." "This seems peaceful."

None of the concepts include: reviews/quotes from other parents, photos of actual toddlers playing (not stock hero shots), seasonal or time-of-day atmosphere ("Prachtig bij zonsondergang"), or mood-based browsing ("Ik wil iets rustigs" vs "Mijn kind heeft energie over").

**Specific suggestion:** Add a single parent quote to each location card: "Mijn 3-jarige wilde niet meer weg — Jessie, moeder." This takes the location from a data point to a story. One line of text. Enormous emotional impact. Source these from Google Reviews or ask parents to contribute.

---

### Lisa: "No error states, no empty states, no edge cases"

All four concepts show the happy path: markers on the map, locations in the list, nice weather. None show:
- What happens when GPS is denied ("We couldn't find you — search for your city")
- What happens when no locations match a filter ("Geen resultaten — pas je filters aan")
- What happens when a location has no photo (color-coded placeholder with type icon?)
- What happens on a 320px wide screen (iPhone SE in landscape is 667x320)
- What happens when JavaScript fails to load (does the user see a blank screen or a static HTML fallback?)

**Specific suggestion:** Design three error states before you design the happy path:
1. **No GPS + no search:** Show Amsterdam-centered map with a search prompt
2. **No results in viewport:** "Zoom uit om meer locaties te zien" with a one-tap "Toon alles" button
3. **No photo for location:** A solid terracotta rectangle with a white icon (playground swing, farm animal, museum building) based on location type. This is better than a broken image and reinforces the type-color coding.

---

## Summary: Where the Panel Landed

### Consensus Points
1. **Concept 2 (Bottom Sheet) is the right foundation** — 6 of 7 experts picked it or a variant of it
2. **Two snap positions, not three** — collapsed + expanded, skip the half-state
3. **No bottom nav bar in browser mode** — use sheet-based navigation; Safari's bottom bar makes a 5-tab nav impractical
4. **Smart sort replaces heavy filtering** — minimal, contextual filters; no default filter chips above the map
5. **Ship simple first, evolve** — start with Concept 3's simplicity if needed, iterate toward Concept 2
6. **Glass effects: beautiful but budget with care** — max 3 simultaneous glass elements, disable during animations on mid-range devices
7. **Design for one-handed, distracted, 15-second use** — bottom 60% of screen for all interactions

### Active Disagreements
1. **Lisa vs. Raj** on shipping strategy: Lisa says ship Concept 3 first and evolve. Raj says shipping boring means building a boring brand, and you never get a second chance at a first impression.
2. **Sarah vs. Yuki** on filters: Sarah says kill all filters and use smart sort. Yuki says at least type filters are needed for user trust and control. Marcus adds that accessibility filters are non-negotiable.
3. **Elena vs. Raj** on first screen: Elena wants data ("14 speeltuinen vlakbij"). Raj wants emotion ("Ontdek"). Both are right — the solution is both: data wrapped in warm language.
4. **Raj's "Living Map" vs. everyone else**: Raj proposed marker pulsing + swipe-through single card. Yuki called it "interesting but unproven." Lisa called it "2 days to prototype, worth testing." Sarah said "one card at a time is actually how parents decide." Elena said "test it as a variant against the carousel." This idea has energy. It deserves a prototype.

### Recommended Next Step

Build a single prototype that combines:
- Fullscreen map (Concept 2 base)
- Two-snap bottom sheet (Yuki's simplification)
- Horizontal card carousel in collapsed state (Yuki + Daan)
- Sheet-based navigation, no bottom nav (panel consensus)
- Smart sort with optional type filter (compromise)
- Weather-reactive indoor/outdoor suggestion (Elena + Sarah)
- `env(safe-area-inset-bottom)` + `dvh` units throughout (Daan)
- Glass disabled during animations, 3 glass elements max (Daan + Lisa)

Test it on a real iPhone SE and Samsung Galaxy A25. If it works on those, it works everywhere.

---

*This document captures the virtual focus group discussion. All experts are fictional personas representing their respective disciplines. Their opinions are based on established UX research, industry patterns, and domain-specific expertise.*
