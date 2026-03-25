# PeuterPlannen — Research Synthesis
## Complete reference for the UX Revamp project

**Date:** March 2026
**Session:** Full research day — 30+ agents, 25+ competitor analyses, focusgroep, Liquid Glass, algorithm design
**Status:** All research complete. Ready to build.

---

## Table of Contents

A. [Competitor Insights](#a-competitor-insights)
B. [Focusgroep Findings](#b-focusgroep-findings)
C. [Photo Strategy](#c-photo-strategy)
D. [Plan je dag — Algorithm](#d-plan-je-dag--algorithm)
E. [Peuterscore — Improvement Strategy](#e-peuterscore--improvement-strategy)
F. [Personalization — Privacy-First](#f-personalization--privacy-first)
G. [Mobile Map UX](#g-mobile-map-ux)
H. [Liquid Glass — Design Language](#h-liquid-glass--design-language)
I. [Framework Decision](#i-framework-decision)
J. [Claude Code Practices](#j-claude-code-practices)
K. [Bas's Corrections and Preferences](#k-bass-corrections-and-preferences)

---

## A. Competitor Insights

**The central finding:** No Dutch family activity platform combines a map with list browsing and modern filtering. PeuterPlannen's map+list approach is genuinely unique in the NL market.

### Competitors Analyzed (25+, grouped by type)

**Dutch family platforms (all list-only, ad-heavy):**
- **UitMetKinderen.nl** — biggest (11K+ listings), editorial reviews, age-suitability bars, but ad-heavy, no map, search broken
- **Kidsproof.nl** — local editorial voice, scrollable category pills, distance radius filter, AI chatbot "Anne", clean but list-only
- **DagjeWeg.nl** — oldest, most comprehensive filters (weather, budget, accessibility), UI from 2010, no map
- **ANWB Eropuit** — high trust brand, editorial/magazine format, not a discovery tool, no map

**Global map+discovery leaders (the standard to beat):**
- **AllTrails** — THE benchmark: split-panel list+map on desktop, synced browsing (pan map = update list), horizontal filter pills, photo carousels on cards, mobile map-first with list toggle button, data-rich compact cards
- **Airbnb** — polished card design, heart/save on every card, segmented search bar, badge system ("Populair")
- **Natuurmonumenten** — full-screen map is immersive, clean color-coded legend, expandable filter panel

### Patterns PeuterPlannen Must Adopt

**Priority 1 (from AllTrails — the template):**
1. Split-panel desktop layout: list left (~35%), map right (~65%)
2. Synced browsing: pan map → update list; hover card → highlight marker
3. Horizontal scrollable filter pills above the map
4. Mobile: map-first + floating "Lijst" toggle button
5. Data-rich compact cards: photo + name + type + rating + distance

**Priority 2:**
6. Age suitability indicators (UitMetKinderen's progress bars)
7. Distance/radius filter (Kidsproof)
8. Weather-context filtering (DagjeWeg's regen/zon tags)
9. Heart/favorites on every card (Airbnb)

### What PeuterPlannen Already Does Better Than Everyone
- Map-first experience (no NL competitor has this)
- No ads, no clutter, no cookie walls
- Fast static pages
- Amsterdam-specific depth
- No login wall, no subscription

---

## B. Focusgroep Findings

### 6 Parent Persona Insights

**Persona 1 — Jonge stadsmoeder (28, Amsterdam, 1 kind van 2 jaar)**
Core need: "Help me een beslissing nemen, niet alleen opties geven." She discovers on Instagram but decides via Google Maps. PeuterPlannen needs to close this gap — make the decision happen here.

**Persona 2 — Vader met krappe agenda (34, Utrecht, tweeling 3 jaar)**
Core need: "Eén goede locatie, niet een hele dag." He uses Google Maps for street view before going. Suggested: one-location mode for Plan je dag. Multi-age filter (different ages simultaneously).

**Persona 3 — Oma-als-opvang (61, Haarlem)**
Core need: Simple, accessible. No tech barriers. But: no need for accessibility info specifically for her, she wants it for the kids. The site does not need to be redesigned for grandmas — she just wants clarity on what's good for young children.

**Persona 4 — Expat moeder (32, Amsterdam, 1 kind van 18 maanden)**
Core need: "Show me what's near me, in English." She found PeuterPlannen via Google but struggled with Dutch. Biggest friction: distance from public transport, not knowing neighborhood names. Wants: English translation, OV-distance filtering.

**Persona 5 — Budget-bewuste ouder (29, Rotterdam, 2 kinderen)**
Core need: "Gratis of goedkoop, dichtbij." No car, uses bakfiets or public transport. Wants: price filter. But Bas said: no gratis/betaald filter yet (data not complete enough).

**Persona 6 — Weekendplanner (38, Den Haag, 3 kinderen)**
Core need: "Plan voor de hele familie, niet alleen peuters." He wants activities for the widest possible age range — older siblings too. This is outside PeuterPlannen's 0-6 scope; don't expand.

**Cross-persona patterns:**
- WhatsApp is the primary sharing channel (coordinate with partner)
- Weather drives same-day planning decisions
- Distance is relative to transport mode (bike vs car = very different radius)
- Nap time at 12:30-14:30 is a hard constraint for toddler day plans
- Parents want ONE decision, not a menu of options

### 5 Senior Developer Insights

**Dev 1 — Senior Frontend (10 yr exp)**
app.html at 3,327 lines is unmaintainable. Must split into ES modules with event bus. No new framework needed — just modularize vanilla JS.

**Dev 2 — Mobile UX specialist**
Current mobile experience is 60% of the way there. The bottom sheet pattern (peek/half/full) is the critical missing piece. Gesture handling is the hardest part — use `touch-action: none` on sheet, handle all touch events manually.

**Dev 3 — Backend/Supabase**
Supabase is the right call. RLS policies are essential as partner portal grows. For Plan je dag: don't pre-compute a distance matrix — client-side haversine at runtime is fast enough for 2200 locations.

**Dev 4 — Performance specialist**
GeoJSON at 2200 locations is ~150-200KB uncompressed, ~30-40KB gzipped. Fine. Keep clustering at maxZoom 13, radius 45. Load MapLibre lazily — only when user navigates to map tab.

**Dev 5 — Product/growth engineer**
The viral loop is WhatsApp sharing. Every Plan je dag output needs a one-tap WhatsApp share with a pre-formatted message. The format must be scannable in a chat, not marketing text.

---

## C. Photo Strategy

**Current state:** Emoji placeholders across all 2138 pages.

### Recommended Approach (Phased)

**Phase 1 — Now, cost $0:** Generate AI watercolor/sketch illustrations per category (~15 categories). Replace emoji immediately. Clearly styled as illustrations, not photos. All 2138 pages look better instantly.

**Phase 2 — Week 2, cost ~$5:** Pexels category photos (free, no attribution) + Google Places API for top 200 locations. Store in Cloudflare R2 (10GB free). Add `photo_url`, `photo_source`, `photo_color`, `photo_attribution` columns to Supabase.

**Phase 3 — Month 2, cost $0-15/mo:** Expand Google Places to all 2138. Cloudflare Worker for on-the-fly AVIF/WebP conversion. Implement srcset for responsive delivery.

**Phase 4 — Month 3+:** Partner-uploaded photos via partner portal (cleanest legally, venues own the rights).

### Key Technical Decisions
- **Storage:** Cloudflare R2 (already use Cloudflare, zero egress fees, 10GB free)
- **Delivery:** Cloudflare Worker auto-negotiates AVIF/WebP via Accept header
- **Loading:** Color placeholder from `photo_color` column → lazy load → fade in
- **Aspect ratios:** 3:2 for cards, 16:9 for detail hero, 1:1 for category thumbnails
- **Google Places ToS:** Cannot permanently cache photos. Use Cloudflare Worker as short-TTL proxy — gray area but practical for MVP.

### GDPR Note (Critical for NL)
Netherlands has 16-year threshold for children's photos. Prefer photos without identifiable people. Never accept user-uploaded photos of children without proper consent flow.

### What NOT to Do
- Scraping venue websites: copyright infringement under EU law (Bas explicitly said scraping data is fine, but photos from websites are a different matter — the PHOTO-STRATEGY.md recommends against it. However, Bas said "scraping is fine" — apply this to data scraping, be careful with photo scraping)
- imgix ($100/mo minimum), Cloudinary Pro ($89/mo) — unnecessary cost

---

## D. Plan je dag — Algorithm

**Current state:** Free-text Gemini output, 2-3 sentences, no structure.

**Target:** Deterministic 4-phase algorithm selects and sequences real locations, AI writes the narrative summary.

### The 4-Phase Algorithm

**Phase 1: Hard-Constraint Filtering**
Filter all 2200 locations by:
- Age range (min_age ≤ child_age ≤ max_age) — hard stop
- Weather: rainy day → exclude outdoor-only
- Distance: walking ≤ 2.5km, bike ≤ 20km, car ≤ 50km
- Is open today (check against opening hours)

**Phase 2: Quality Scoring**
Score remaining candidates 0-100:
- Travel time from current position (−20 pts per 5 min over 15 min threshold)
- Age fit precision (closer to optimal age = more points)
- Convenience: changing table (+8), seating (+6), shade (+4), low crowding (+5)
- Peuterscore × 2 (0-10 → 0-20 pts)
- Variety bonus: +10 if category not yet in plan, −20 if category repeats
- Energy level fit vs. target energy arc
- Weather bonus for flexible "both" types on uncertain days

**Phase 3: Greedy Selection**
Pick 4-6 locations using greedy algorithm with re-scoring after each selection. Stop when average remaining score drops below 50 or we have 6 locations.

**Phase 4: Sequencing + Time Allocation**
Order selected locations using nearest-neighbor TSP + 2-opt improvement. Evaluate sequences by:
- Total travel time (minimize)
- Energy arc fit: [1,2,3,3,2,1] for full day, [1,2,2,1] for half day
- Penalize abrupt energy switches (museum → crazy playground in 1 step)

Then allocate times: account for toddler travel speed (1km/15min on foot vs adult 1km/12min), transition buffers (+10 min per activity for coat/toilet/departure).

**AI role — only for narrative:** After algorithm generates the plan, Gemini writes 2-3 sentences in warm Dutch parent-guide voice. That's it.

### Template-Based Approach (from plan-ux-revamp.md)

Four itinerary "shapes":
- **Ochtend** (2-3 hr): 1-2 activities, start high energy
- **Halve dag** (4 hr): 2-3 activities + lunch break
- **Hele dag** (7 hr): 3-5 activities, nap awareness
- **Eén locatie** (special): for tweeling parents or short outings

Slot-filling: fill template slots ranked by peuterscore + age fit + distance. This is simpler than full TSP and sufficient for MVP.

### Transport Options
- Auto / OV / Fiets — **Bakfiets = Fiets** (same radius, same speed)
- No slider for age — 5 buttons: 1 / 2 / 3 / 4 / 5 jaar

### Key UX Elements (from plan-je-dag-ux-spec.md)
- Input: progressive disclosure — one question per screen, not a form
- Step 5 output CTA: "Maak mijn dagplan" (sparkle icon, 2-3 sec loading)
- Output: vertical timeline (mobile-native), activity cards with travel/buffer blocks between
- Match indicators: "Top keuze" (green) / "Goede optie" (blue) / "Leuk alternatief" (gray) — never percentages
- Regeneration: full shuffle, single-activity swap, guided refinement chips ("Meer binnen / Rustiger")
- Sharing: WhatsApp (Web Share API) with pre-formatted scannable message, calendar .ics export, save-as-image

### Toddler Intelligence
- Nap-time awareness: ages 1-2 nap 12:30-14:30, ages 2-3 nap 13:00-15:00
- Energy curve: active morning, quiet post-lunch, second wind 15:00+
- Toddler travel time = 2x adult (dogs, puddles, refusals)
- Buffer: +10-15 min per transition for "zit vast in de jas"
- Packing list generated per activity set + weather

### Data Fields to Add to Supabase
```sql
energy_level, has_changing_facilities, has_seating_areas,
shade_coverage, floor_type, crowding_level, noise_level,
estimated_activity_duration_min, weather_type
```

---

## E. Peuterscore — Improvement Strategy

**Current state:** Single 0-10 editorial number, no explanation, not scalable to 2138 locations.

### Peuterscore v2: Transparent 6-Dimension Scorecard

**Still shows a single number (0-10) in UI**, but calculated from 6 weighted dimensions:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Safety & Facilities | 25% | Certifications, incident reports, changing table, floor type |
| Age Appropriateness | 20% | min/max age range + behavioral: dwell time, return rate by age cohort |
| Parent Amenities | 15% | Boolean data: coffee, toilet, parking, shade, stroller access |
| Sensory Experience | 20% | Editorial notes + avg dwell time |
| Value for Time | 12% | Dwell time vs. expected duration, return rate, cost ratio |
| Reliability | 8% | Last verified date, closure reports, hours accuracy, owner-claimed |

**Display for users:** Summary line "Ideaal voor 2-3 jaar · Koffie aanwezig · Verified feb 2024" — show top-3 strengths, not all 6 stars (too much for mobile cards).

**Detail page:** Full 6-dimension breakdown visible behind a "Waarom deze score?" expand.

### Implementation Priority
1. Show top-3 strength reasons on every location (quick win, no formula change needed yet)
2. Build internal 6-dimension calculation
3. Add behavioral tracking: dwell time (client-side page visit duration), return rate
4. Score-weighting adjusts per user's child age (age fit matters more for parents with specific age)

### What NOT to Do
- Don't show all 6 dimensions on list cards — cognitive overload
- Don't show percentages — use star labels with brief explanations
- Don't rely on user reviews yet — not enough traffic to make it meaningful

---

## F. Personalization — Privacy-First

**Principle:** The app feels like it knows you, but your data never leaves your device.

### Storage Architecture
- **localStorage** (`pp_prefs`): explicit preferences — child ages, city, transport mode, max travel time
- **IndexedDB** (`pp_behavior`): implicit behavioral data — visit history, search patterns (opt-in only)
- **Nothing sent to server** (except existing anonymous Supabase reads)

### 2-Step Onboarding (under 10 seconds)
Step 1: "Hoe oud is je kind?" — 6 large tap buttons (0-1, 1-2, 2-3, 3-4, 4-6, 6+)
Step 2: "Hoe ga je meestal op pad?" — 4 icon cards (Lopend, Fiets, Auto, OV)
Step 3: Done. City auto-captured from existing city selector or GPS.

**Bakfiets is Fiets** — not a separate option.

### Scoring Algorithm (client-side, ~2200 locations)
```
relevance_score = (age_match × 30%) + (distance × 25%) + (type_preference × 20%) +
                  (feature_match × 10%) + (novelty × 10%) + (quality × 5%)
```
Scores update silently as user browses. Types they click get +0.05 weight, others decay −0.01.

### "Personal Without Creepy" Principle
- Level 3 is the sweet spot: "Speeltuinen in De Pijp voor kinderen van 2-3 jaar" (transparent why)
- Never: "Je bezoekt vaak op dinsdag..." (surveillance-feel)
- Always explain why: "Aanbevolen voor jou" → "Op basis van jouw leeftijdsvoorkeur"
- Always opt-out: "Wis alles" button in settings

### Cross-Device Sync
URL-encoded preferences (base64url). User copies link or scans QR code. No email, no server.

### GDPR Compliance
- Explicit prefs (user-set): no consent needed (strictly necessary)
- Behavioral tracking: opt-in consent after onboarding
- Age ranges and neighborhoods are NOT personal data under GDPR
- Auto-prune behavioral data after 90 days

---

## G. Mobile Map UX

### Bottom Sheet (The Critical Missing Piece)

**Three states:**
- **Hidden (0px):** default, nothing selected
- **Peek (120px):** marker tapped — shows name, type, rating, distance, thumbnail
- **Half (50vh):** user drags up — full details, photo, description, opening hours
- **Full (100vh - 64px):** scrollable, all details + nearby locations

**Gesture conflict resolution:**
- Touch starts on sheet → sheet captures vertical gestures
- Touch starts on map → map captures all gestures
- Sheet at full + scrolled to top + drag down → collapse sheet (pull-to-dismiss)
- Use `touch-action: none` on sheet container, handle all touch events manually

**Snap animation:** `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)` — Apple's spring curve
**Velocity threshold:** 0.5px/ms triggers flick-snap in direction of flick

### Marker Interaction
- Tap marker → peek state (never use MapLibre popups on mobile — too small, hard to dismiss)
- Selected marker: scales 28px → 36px, white border, pan map to center ABOVE sheet (not full viewport center)
- Cluster tap → zoom in (simple, no spiderfy needed for MVP)

### Filter Chips
- Fixed horizontal scrollable row above map, 44px total height, 32px chips
- Active chip: filled background + white text
- Always visible even when sheet is open
- Count badge: "127 locaties in dit gebied"

### Map Performance (2200 locations)
- Cluster below zoom 13, radius 45 — current settings are correct
- `pixelRatio: Math.min(devicePixelRatio, 2)` — cap at 2x for performance
- `fadeDuration: 0` — faster perceived load
- Disable: rotation, pitch/tilt (battery drain, not needed for playground discovery)
- Lazy-load MapLibre: only initialize on map tab navigation

### Toggle: Map/List
- Floating button (48px) bottom-right, 48px above nav bar
- Label: "Lijst" / "Kaart" with crossfade 200ms
- NOT a tab bar — bottom nav is for app sections

### Implementation: Pure Vanilla JS
~150 lines JS + ~80 lines CSS. No Hammer.js, no React libraries needed. Only dependency: MapLibre GL (already in use).

---

## H. Liquid Glass — Design Language

### What It Is
Apple's WWDC 2025 design language. Not just frosted glass — adds real-time light refraction (lensing), specular highlights, adaptive opacity. For web: implement via `backdrop-filter: blur()`.

**Key principle for PeuterPlannen:** The map is the product. The UI floats above it as warm glass — always letting the map show through.

### PeuterPlannen's Warm Adaptation

Apple uses cool gray glass at 20% opacity. PeuterPlannen uses warm cream/terracotta at 75-80% opacity — more opaque, more readable, warmer feeling. This is intentional — "warmer and less transparent than Apple."

**Core CSS token:**
```css
.glass {
  background: rgba(250, 247, 242, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 16px rgba(212, 119, 86, 0.10);
}
```

**Color palette:**
- Background: Cream `#FFF8E1`
- Accent: Terracotta `#D47756`
- Text on glass: Dark brown `#5C4433`
- Muted text: `#8B7355`
- Warm shadow: `rgba(212, 119, 86, 0.15-0.25)`

### CSS Values by Component

| Component | Blur | Opacity | Use case |
|-----------|------|---------|----------|
| Filter chips | 10px | 0.3 | Above map |
| Glass cards | 8px | 0.2 | In lists/sheets |
| Nav bar | 16px | 0.2 | Sticky header |
| Bottom sheet | 14px | 0.25 | Map overlay |
| Detail overlay | 16px | 0.3 | Location detail card |

### Rules
- **Max 3-4 glass elements per screen** (GPU overhead 15-25% vs opaque)
- **Max blur 20px** on mobile (8-16px recommended)
- **Content always visible through glass** — if you can't see the map, reduce opacity
- **Never glass the map itself** — glass is UI chrome only
- **Always include warm-tinted shadows** — bare glass without shadow looks flat

### Browser Support
- Chrome/Edge: full (76+)
- Safari: full (9.1+), requires `-webkit-backdrop-filter`
- Firefox: partial (104+, disabled by default) — provide solid background fallback
- Coverage: 92% of modern browsers

### Accessibility
- Text on glass must be 4.5:1 contrast minimum (WCAG AA)
- Add `prefers-reduced-motion` fallback (remove animations)
- Add `prefers-contrast: more` fallback (thicker borders, no blur)
- Test actual contrast — the blur background changes perceived contrast

### Production Files (ready to use)
- `/Users/basmetten/liquid-glass-snippets.css` — 10 sections of copy-paste CSS
- `/Users/basmetten/LIQUID_GLASS_QUICK_REFERENCE.md` — cheat sheet
- `/Users/basmetten/LIQUID_GLASS_RESEARCH.md` — full deep dive

---

## I. Framework Decision

**Decision: Vanilla JS stays. No framework migration.**

**Rationale from senior dev review:**
- The current stack (vanilla JS + sync_all.js + Supabase + GitHub Pages + Cloudflare) already delivers what Astro or React would provide
- Claude Code works optimally with vanilla JS — faster, fewer surprises
- Adding a framework would mean: migration effort, bundle complexity, learning curve for Claude Code sessions
- The real problem is not the framework, it's the file size (app.html at 3,327 lines)

**The one structural change needed:**
Split app.html into ES modules with an event bus pattern. This gives the same maintainability benefits as a framework without the overhead.

**Example module structure:**
```
app.js (entry point, event bus)
├── modules/map.js
├── modules/filters.js
├── modules/sheet.js
├── modules/search.js
├── modules/personalization.js
└── modules/plan.js
```

**No new dependencies** unless absolutely necessary. No npm packages for things vanilla JS handles fine.

---

## J. Claude Code Practices

### Session Discipline
- **1 session = 1 clearly defined task** — never mix "fix the filter chips" with "also update the bottom sheet and the plan algorithm"
- **Plan Mode first** (Shift+Tab 2×in Claude Code) — describe approach, get OK, then execute
- **Spec = contract** — reference documents (like this one) are the source of truth, not memory
- **HANDOFF.md** at the end of every complex session so the next session can continue without re-explaining context

### Context Management
- **70% context:** spawn subagents for research tasks
- **85% context:** /compact
- **90% context:** /clear + fresh start with a sharp prompt referencing HANDOFF.md

### Testing Protocol
- Build after every significant change (`node .scripts/sync_all.js`)
- Check mobile at 390px viewport (iPhone 14 size)
- Check desktop at 1280px
- Never report "done" without a build run

### Git Discipline
- Never commit .env or credentials
- Never force-push to main
- Never delete files without asking
- Commit in logical chunks, not mega-commits

### Speed Reality
Claude Code means hours, not weeks. A feature described as "2-3 weeks" in traditional dev is "2-3 Claude Code sessions" in this stack. Plan accordingly — ship faster, iterate faster.

### Per-Phase References
Before starting each phase, read:
- The relevant spec document (see Referentiedocumenten table in plan-ux-revamp.md)
- HANDOFF.md from the previous session
- This RESEARCH-SYNTHESIS.md for cross-cutting principles

---

## K. Bas's Corrections and Preferences

These are the explicit corrections and preferences stated during the research session. They override any research recommendation.

### UX Decisions

**Bakfiets = Fiets**
Bakfiets is not a separate transport mode. Merge it with Fiets. Same speed calculation, same radius, same icon (just a bicycle). The distinction adds friction without adding value.

**No slider for child age — use buttons**
Instead of an age slider (hard to use on mobile, imprecise), use 5 large tappable buttons: 1 / 2 / 3 / 4 / 5 jaar. Faster, clearer, more accurate. Applied in both Plan je dag and the personalization onboarding.

**No gratis/betaald filter yet**
The price data across 2138 locations is not complete enough to make this filter useful. Don't add it until the data is solid. Note it for Phase 9 when data quality has improved.

**No accessibility info for grandmas**
The oma persona raised accessibility, but PeuterPlannen is specifically for toddlers (0-6 jaar). Don't add accessibility filtering for elderly visitors. The site should clearly communicate its 0-6 audience and stay focused.

**Scraping is fine**
For data collection (location info, opening hours, etc.), scraping is an acceptable approach. This applies to structured data like hours, prices, descriptions. Note: for photos, copyright law is a separate concern — scraping photos from venue websites is still legally risky.

### Design Decisions

**Liquid Glass but warmer and less transparent than Apple**
Apple's Liquid Glass uses ~20% opacity (very transparent). PeuterPlannen uses 75-80% opacity (more opaque). Warmer — cream/terracotta palette, not cool gray. The effect should feel friendly and Dutch, not Apple-clinical.

**Content always visible through UI layers**
The map must always be visible through the bottom sheet, filter chips, and nav bar. This is non-negotiable — it's the visual philosophy. If a UI element completely blocks the map, the opacity is too high.

**Progressive disclosure is key for mobile**
Show the minimum first. Let users discover more by interacting. Never show all filters at once. Never front-load information. This applies to: Plan je dag input (one question per step), filter chips (basic by default, advanced behind "+ Meer"), location cards (summary in list, full detail in sheet).

### Scope Decisions

**The plan should be big but phased**
The 10-phase roadmap is intentional — it's ambitious but executed in order. Don't try to build everything at once. Fase 1 is the foundation. Each subsequent phase builds on it. Phase 7 (social proof) requires 3K+ monthly visitors before starting.

**Claude Code speed means hours not weeks**
A feature estimated at "2-3 weeks" in traditional development is 2-3 Claude Code sessions. The roadmap estimates are in Claude Code hours. When the plan says "1-2 dagen," it means 1-2 intensive Claude Code sessions, not calendar days.

---

## Quick Reference: Where to Find Things

| Topic | Primary File |
|-------|-------------|
| Photo strategy (full) | `/Users/basmetten/peuterplannen/PHOTO-STRATEGY.md` |
| Plan je dag UX spec | `/Users/basmetten/peuterplannen/plan-je-dag-ux-spec.md` |
| Plan je dag algorithm | `/Users/basmetten/TOPIC_1_PLAN_JE_DAG_ALGORITHM.md` |
| Peuterscore design | `/Users/basmetten/TOPIC_2_PEUTERSCORE_IMPROVEMENT.md` |
| Personalization strategy | `/Users/basmetten/peuterplannen/personalization-strategy.md` |
| Mobile map UX spec | `/Users/basmetten/peuterplannen/docs/mobile-map-ux-spec.md` |
| Liquid Glass snippets (CSS) | `/Users/basmetten/liquid-glass-snippets.css` |
| Liquid Glass quick reference | `/Users/basmetten/LIQUID_GLASS_QUICK_REFERENCE.md` |
| Liquid Glass deep dive | `/Users/basmetten/LIQUID_GLASS_RESEARCH.md` |
| Competitor analysis | `/Users/basmetten/competitor-ux-research/COMPETITOR-UX-ANALYSIS.md` |
| Full roadmap | `/Users/basmetten/peuterplannen/plan-ux-revamp.md` |
| **This document** | `/Users/basmetten/peuterplannen/RESEARCH-SYNTHESIS.md` |

---

## The One-Page Summary

**What we're building:** A warm glass map app that helps Dutch parents of toddlers (0-6) discover, decide, and plan their day — entirely on mobile, without ads, without accounts, without bullshit.

**Competitive position:** No NL competitor has a map. We have the map. Make it world-class (AllTrails level).

**Design language:** Warm Liquid Glass — UI floats over the map as cream/terracotta glass at 75-80% opacity. The map always shows through.

**Stack:** Vanilla JS stays. app.html splits into ES modules. Supabase + GitHub Pages + Cloudflare. No new frameworks.

**Plan je dag:** 4-phase algorithm (filter → score → select → sequence) + AI narrative. Template-based, deterministic, toddler-aware (nap time, energy curve, buffer time). Bakfiets = fiets. Age buttons not slider.

**Peuterscore:** Show top-3 strengths per location. Internal 6-dimension calculation. Behavioral signals (dwell time, return rate) feed the score automatically over time.

**Personalization:** 2-tap onboarding, localStorage only, no server, no accounts. Client-side weighted scoring.

**Execution:** Claude Code speed. One session, one task. Spec documents are contracts. Ship Fase 1, feel it, then Fase 2.

---

*Synthesized from: PHOTO-STRATEGY.md, plan-je-dag-ux-spec.md, personalization-strategy.md, docs/mobile-map-ux-spec.md, TOPIC_1_PLAN_JE_DAG_ALGORITHM.md, TOPIC_2_PEUTERSCORE_IMPROVEMENT.md, RESEARCH_SUMMARY.md, LIQUID_GLASS_INDEX.md, LIQUID_GLASS_RESEARCH.md, liquid-glass-snippets.css, competitor-ux-research/COMPETITOR-UX-ANALYSIS.md, plan-ux-revamp.md*
