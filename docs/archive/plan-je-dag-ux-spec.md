# Plan je dag — UX Specification
## A best-in-class itinerary builder for peuterplannen.nl

**Version:** 1.0
**Date:** March 2026
**Based on:** Deep UX research across Google Travel Canvas, Wanderlog, Roadtrippers, and 20+ sources

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Current State vs Target State](#2-current-state-vs-target-state)
3. [Input Flow — The Smart Setup](#3-input-flow--the-smart-setup)
4. [Output — The Visual Day Plan](#4-output--the-visual-day-plan)
5. [Timeline Design](#5-timeline-design)
6. [Confidence & Match Indicators](#6-confidence--match-indicators)
7. [Regenerate & Alternatives](#7-regenerate--alternatives)
8. [Toddler-Specific Intelligence](#8-toddler-specific-intelligence)
9. [Sharing & Export](#9-sharing--export)
10. [Interaction Flows](#10-interaction-flows)
11. [Mockup Descriptions](#11-mockup-descriptions)
12. [The Viral Loop — What Makes Parents Share](#12-the-viral-loop--what-makes-parents-share)
13. [Technical Architecture Notes](#13-technical-architecture-notes)
14. [Implementation Phases](#14-implementation-phases)
15. [Sources](#15-sources)

---

## 1. Design Philosophy

### Core Insight: Eliminate Decision Fatigue

Parents of toddlers make hundreds of micro-decisions per day. Research from NN/Group shows that as choices increase, so does fatigue — the famous jam experiment found 30% purchased when shown 6 options, but only 3% when shown 24. Our Plan je dag feature must be the opposite of a choice overload. It should feel like a knowledgeable friend saying: "Here's exactly what you should do today."

### Three Design Principles

**1. Opinionated, Not Open-Ended**
Don't present 10 options and ask parents to choose. Present ONE great plan with the confidence to say "this is what we'd do." Alternatives are available but not the default.

**2. Actionable, Not Informational**
The difference between a suggestion ("you could visit Artis") and a plan ("Start at Artis at 10:00, you'll need about 2 hours, then walk 8 minutes to Cafe de Plantage for lunch"). Every item in the plan should answer: what, where, when, how long, and how to get there.

**3. Toddler-Realistic, Not Idealistic**
Build in buffer time. Acknowledge that a 2-year-old melts down at 14:00. Suggest a quiet activity after lunch. This realism is what makes parents trust the tool and tell other parents about it.

---

## 2. Current State vs Target State

### Current State
- Input: location, day, children count, age slider, transport mode, duration
- Output: 2-3 sentences of AI text via Gemini 2.5 Flash Lite
- Weather-aware
- No visual structure, no timeline, no map, no sharing

### Target State
- Same smart inputs (refined UX) + optional extras
- Output: A structured visual day plan with 3-5 activity blocks on a timeline
- Integrated map showing the route between activities
- Travel time calculations between stops
- Toddler-specific intelligence (nap windows, buffer time, energy management)
- One-tap sharing to WhatsApp, calendar export
- Regenerate / shuffle for alternatives
- Confidence indicators per activity

---

## 3. Input Flow — The Smart Setup

### Design Decision: Progressive Disclosure, Not a Form

Instead of showing all inputs at once (which feels like paperwork), use a conversational step-by-step flow inspired by Wanderlog's onboarding quizzes. Each step is a single question with big, tappable options.

### Step 1: Where? (Location)
- Large search input with geolocation button ("Gebruik mijn locatie")
- Recent locations shown as chips below
- Auto-suggest from peuterplannen.nl city list
- **Design:** Full-width input, minimal chrome, placeholder "Amsterdam, Utrecht, ..."

### Step 2: When? (Day Selection)
- 4 large pill buttons in a row: **Vandaag** / **Morgen** / **Za** / **Zo**
- If today/tomorrow: show current weather icon inline on the pill
- Date appears below in subtle text ("zaterdag 22 maart")
- **Design:** Pills ~60px height, weather icon 20px, selected state = filled primary color

### Step 3: Who? (Children)
- Simplified: "Hoeveel kinderen?" with -/+ stepper (default 1, max 5)
- Age: instead of a slider, use large tappable age bubbles: **1** / **2** / **3** / **4** / **5** jaar
- If multiple children, allow selecting age per child (appears as mini cards)
- **Why this change:** Age bubbles are faster and more precise than sliders on mobile. Wanderlog research shows tap-to-select reduces onboarding friction.

### Step 4: How? (Transport + Radius)
- 4 icon cards in a 2x2 grid:
  - Auto (auto icon) — "tot 50 km"
  - Fiets (bike icon) — "tot 5 km"
  - OV (train icon) — "tot 25 km"
  - Bakfiets (cargo bike icon) — "tot 8 km"
- Selected card gets a subtle border + checkmark
- **Advanced (collapsed by default):** Custom radius slider

### Step 5: How Long? (Duration)
- 3 large cards with illustration + description:
  - **Ochtend** — "2-3 uur, 1-2 activiteiten"
  - **Halve dag** — "4 uur, 2-3 activiteiten"
  - **Hele dag** — "7 uur, 3-5 activiteiten"
- Each card shows a tiny timeline preview (dots representing activity blocks)

### The Magic Button
- After step 5: large CTA button: **"Maak mijn dagplan"** (with a small sparkle icon)
- Below the button in subtle text: "Op basis van weer, reistijd en leeftijd"
- Button triggers a brief loading animation (2-3 seconds) showing a playful progress indicator

### Why Not a Single Form?
Google Travel Canvas uses a conversational side panel. Wanderlog uses step-by-step quizzes. Research shows that step-by-step disclosure reduces perceived effort and increases completion rates. For mobile (our primary use case), single-question screens prevent scroll fatigue.

**However:** For returning users, offer a compact "Snel plannen" mode that shows all inputs on one screen with previous values pre-filled.

---

## 4. Output — The Visual Day Plan

### The Plan Card: A Structured, Scannable Result

The AI output transforms from free text into a structured visual plan. This is the core innovation.

#### Plan Header
- **Plan title** (AI-generated, e.g., "Regendag in Utrecht met Emma (3)")
- **Summary line:** "3 activiteiten | ~4 uur | 12 km totaal"
- **Weather badge:** icon + temperature + relevant note ("Droog tot 14:00, daarna buien")
- **Match indicator:** (see section 6)

#### Activity Blocks (The Timeline)
Each activity is a card in a vertical timeline (see section 5 for layout details):

```
[Activity Card]
├── Time: "10:00 – 11:30"
├── Activity name: "Nijntje Museum"
├── Type badge: "Museum" (with icon)
├── Why this fits: "Binnen, perfect voor regendag. Interactief voor 3-jarigen."
├── Practical info: "Entree: EUR 12,50 | Duur: ~1,5 uur"
├── Match indicator: "Ideaal voor 3 jaar" (green dot)
└── Link: "Bekijk op peuterplannen.nl →"
```

#### Travel Blocks (Between Activities)
Between each activity card, a compact travel block shows:
```
[Travel Block]
├── Icon: walking/bike/car/OV
├── "12 min fietsen (2,1 km)"
└── Optional: "Via Oudegracht — mooie route!"
```

#### Buffer Blocks (Toddler Intelligence)
The plan includes explicit buffer/rest blocks:
```
[Buffer Block]
├── Icon: coffee cup / snack / diaper
├── "Pauze & snackmoment" (15 min)
└── "Tip: er is een speelhoek bij Cafe X"
```

#### Plan Footer
- Total duration and distance summary
- "Wat mee te nemen" checklist (AI-generated based on activities + weather)
  - e.g., "Regenjas, extra kleren, snacks, luiers, buggy-regenhoes"
- Action buttons (see section 9)

---

## 5. Timeline Design

### Decision: Vertical Timeline (Not Horizontal)

**Why vertical:**
- Mobile-first: vertical scrolling is natural on phones
- Accommodates variable content length per block
- Travel time blocks fit naturally between activity blocks
- Research confirms vertical timelines are superior for mobile and scroll-based interfaces
- Google Travel Canvas and Wanderlog both use vertical day-by-day layouts

### Visual Structure

```
    10:00  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           |  [Activity Card: Nijntje Museum]
    11:30  |
           ┊  🚲 12 min fietsen
           ┊
    11:45  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           |  [Buffer: Snack & verschonen]
    12:00  |
           ┊  🚲 5 min fietsen
           ┊
    12:05  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           |  [Activity Card: Lunch bij Cafe X]
    13:00  |
           ┊  🚶 8 min lopen
           ┊
    13:15  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           |  [Activity Card: Speeltuin Y]
    15:00  |
```

### Design Specifications

- **Timeline line:** 2px, color `#E0E0E0`, left-aligned at 16px from edge
- **Time labels:** 14px, semi-bold, muted color, left of the timeline line
- **Activity nodes (dots):** 12px filled circles, primary color
- **Travel segments:** Dashed line with transport icon
- **Buffer segments:** Dotted line with a softer color
- **Activity cards:** White background, 8px border-radius, subtle shadow, full-width minus timeline gutter
- **Card content:** 16px padding, activity name in 18px semi-bold, details in 14px regular

### Map Integration

Below (or togglable above) the timeline, a small map shows:
- Numbered markers (1, 2, 3...) for each activity
- Route line between markers in the chosen transport color
- Current location dot (if geolocation allowed)
- Map is ~200px tall, expandable to full-screen

**Design decision:** The map is secondary to the timeline. Parents want the structured list first, map for orientation. This matches Wanderlog's approach where the itinerary list is primary and the map is a supporting view. Roadtrippers does the opposite (map-first) but their use case is different (road trips vs. day activities).

---

## 6. Confidence & Match Indicators

### Why Show Confidence?

Research on AI confidence visualization shows that displaying certainty levels helps users make informed decisions. For a toddler activity planner, confidence communicates: "We've actually thought about whether this is right for YOUR child."

### Match Indicator System

Each activity card gets a small match indicator. Use simple, parent-friendly language instead of percentages:

| Level | Label | Visual | When Used |
|-------|-------|--------|-----------|
| High | "Top keuze" | Green dot + text | Activity matches age, weather, transport, and interests perfectly |
| Medium | "Goede optie" | Blue dot + text | Good match with 1 minor trade-off (e.g., slightly far, or better for slightly older kids) |
| Low | "Leuk alternatief" | Gray dot + text | Workable but not ideal (e.g., outdoor activity with rain chance) |

### Overall Plan Score

The plan header shows an overall assessment:
- "Dit plan past perfect bij jullie dag" (all activities are high match)
- "Een goed plan met 1 tip" (mostly high, one thing to note — like "Activiteit 2 kan druk zijn rond 14:00")
- Never show a negative score — reframe as helpful advice

### Why NOT Percentages?

Percentages (87% match) feel clinical and tech-y. Parent-friendly labels feel warm and trustworthy. Research from Smashing Magazine on trust in AI confirms that overly precise confidence scores can backfire by creating false precision. Labels with brief explanations ("Binnen, ideaal voor deze regendag") are more actionable.

---

## 7. Regenerate & Alternatives

### The "Shuffle" Pattern

Based on the Regenerate UX pattern research, implement three levels of regeneration:

#### 1. Full Regenerate: "Verras me opnieuw"
- Button at the bottom of the plan
- Generates an entirely new plan with the same constraints
- Brief animation (shuffling cards effect)
- Previous plan is NOT lost — accessible via "Vorig plan" link
- **Implementation:** Unguided regeneration — same prompt, new seed

#### 2. Swap Single Activity: "Iets anders hier"
- Small refresh icon on each activity card
- Replaces only that one activity, keeping the rest intact
- Shows a brief "choosing..." animation on just that card
- **Implementation:** Partial regeneration — the most useful pattern for parents who like the plan but don't want one specific stop

#### 3. Guided Refinement: "Meer binnen" / "Meer buiten" / "Rustiger"
- After the initial plan, show 2-3 refinement chips below the plan:
  - "Meer binnenactiviteiten"
  - "Meer buitenactiviteiten"
  - "Rustiger programma"
  - "Avontuurlijker"
- Tapping a chip regenerates with an adjusted prompt
- **Implementation:** Guided regeneration with parameter adjustment

### Design Detail: Preserving Previous Plans

Following ElevenLabs' pattern of storing regeneration history: each generated plan gets stored in a simple carousel. Swipe left/right between plan versions. Maximum 3 stored plans per session. This prevents the frustration of "the first one was actually better."

---

## 8. Toddler-Specific Intelligence

### This Is the Differentiator

No generic travel planner accounts for toddler reality. This is what makes Plan je dag remarkable and shareable.

#### 8.1 Nap-Time Awareness

**The logic:**
- Ages 1-2: Most toddlers nap 12:30-14:30
- Ages 2-3: Nap window typically 13:00-15:00
- Ages 3-4: Many skip naps but get cranky 13:00-14:00
- Ages 4-5: Usually no nap, but energy dips after lunch

**How it appears in the plan:**
- For a "hele dag" plan with a 2-year-old, the 12:30-14:30 slot automatically becomes a rest/quiet block
- The plan suggests: "Rustig moment — Jullie zitten dan dicht bij Park X (schaduwrijk, bankjes)" or "Buggy-wandeling via [route] terwijl [name] slaapt"
- If the parent selected "halve dag / ochtend," the plan avoids activities that run into nap time

#### 8.2 Energy Curve Management

**The logic:**
- Morning (9:00-11:00): High energy → active/stimulating activities
- Late morning (11:00-12:00): Still good → moderate activity or transition
- Post-lunch (13:00-14:30): Low energy → quiet, indoor, or rest
- Afternoon (15:00-17:00): Second wind → playground, outdoor play

**How it appears:**
- Activities are ordered by energy demand, not just geography
- The AI explains this: "We beginnen actief in [X] als de energie hoog is"
- An active museum visit is placed in the morning, a calm park visit in the afternoon

#### 8.3 Buffer Time Calculations

Standard travel planners calculate point-to-point travel time. Toddler travel time is different:

| Standard | Toddler-Adjusted |
|----------|-------------------|
| 10 min walking | 20 min (half speed, stopping to look at dogs) |
| 5 min to leave a location | 15 min (shoes, coats, toilet, "I don't want to leave") |
| Arrival = start time | Arrival + 10 min setup (buggy parking, coats off, orientation) |

**How it appears:**
- Travel blocks show toddler-adjusted times: "15 min lopen (met peuter-tempo)"
- Transition buffers are built in: "Vertrek ~11:15 (even aankleden en WC)"
- Total plan duration reflects reality, not Google Maps fantasy

#### 8.4 Weather-Aware Activity Swapping

**The logic:**
- Rain forecast after 14:00? Outdoor activities scheduled before 14:00, indoor after
- Temperature below 5C? Prefer indoor activities, minimize walking distance
- Heatwave (30C+)? Water play activities, shaded locations, shorter outdoor time
- Wind strong? Avoid open playgrounds, prefer sheltered locations

**How it appears:**
- Weather influences activity order, not just selection
- Explicit weather notes: "We plannen het buitendeel 's ochtends — 's middags kans op regen"
- "Weer-plan B" link: "Als het toch gaat regenen, ga dan naar [indoor alternative]"

#### 8.5 Practical Toddler Tips

Each plan includes contextual tips drawn from the peuterplannen.nl database:
- "Er is een verschoontafel bij [location]"
- "Buggy-toegankelijk: ja/nee (er zijn trappen)"
- "Gratis parkeren op [straat], 5 min lopen"
- "Dit is een populaire locatie — voor 10:30 is het rustiger"

---

## 9. Sharing & Export

### 9.1 WhatsApp Share (Primary)

**Why primary:** Dutch parents coordinate via WhatsApp. This is the #1 sharing channel.

**Format: A clean, scannable message**

```
Dagplan: Regendag in Utrecht met Emma (3)
Zaterdag 22 maart | 10:00 – 15:00 | 3 activiteiten

10:00 Nijntje Museum (binnen, ideaal voor 3 jaar)
11:45 Lunch bij Cafe de Dom (speelhoek!)
13:15 Speeltuin Griftpark (overdekt gedeelte)

Weer: 12°C, droog tot 14:00
Totaal: ~4 uur, 6 km fietsen

Bekijk het volledige plan: [link]

Gemaakt met peuterplannen.nl/plan
```

**Implementation:**
- Use Web Share API (navigator.share) for native share sheet on mobile
- Fallback: WhatsApp deep link with pre-formatted text
- The shared link opens a read-only version of the plan with the full visual timeline

**Design decision:** The WhatsApp message is deliberately concise. No emojis overload, no marketing fluff. Parents sharing with their partner want practical info.

### 9.2 Calendar Export

**"Zet in je agenda" button** generates:
- A single calendar event spanning the full plan duration
- Event title: "Dagplan: [plan name]"
- Event location: First activity location
- Event description: Full activity list with times and addresses
- Supports: Google Calendar (webcal link), Apple Calendar (.ics file), Outlook (.ics)

**Implementation:** Generate .ics file client-side. For Google Calendar, construct a `calendar.google.com/calendar/r/eventedit` URL with pre-filled fields.

### 9.3 Save as Image

**"Bewaar als afbeelding" button:**
- Renders the timeline as a clean, tall image (optimized for phone screenshots)
- Includes: plan title, timeline, weather, peuterplannen.nl branding
- Uses html2canvas or similar library
- Great for saving to phone gallery or sharing on Instagram Stories

### 9.4 PDF Export (Offline Use)

**"Download PDF" button:**
- One-page PDF with timeline, map snapshot, and practical details
- Formatted for printing (A4) — some parents still print plans
- Includes QR code linking back to the interactive plan

### 9.5 "Stuur naar partner" Quick Action

- Pre-populated WhatsApp share targeting a single contact
- Message: "Ik heb een plan gemaakt voor [dag]! Wat vind je? [link]"
- This is a social UX insight: framing it as "stuur naar partner" instead of generic "share" increases usage because it matches the mental model (partners coordinate childcare)

---

## 10. Interaction Flows

### Flow 1: First-Time User (Happy Path)

```
1. User taps "Plan je dag" on homepage/app
2. Step-by-step input (5 screens, ~30 seconds)
3. Loading animation: "We maken je plan..." (2-3 sec)
4. Plan appears with timeline view
5. User scrolls through activities
6. User taps "Deel via WhatsApp" → sends to partner
7. User taps "Zet in je agenda" → event created
8. User visits first activity
```

### Flow 2: Returning User (Quick Plan)

```
1. User taps "Plan je dag"
2. Sees compact form with previous values pre-filled
3. Adjusts day (vandaag → morgen)
4. Taps "Maak mijn dagplan"
5. New plan generated in 2-3 seconds
```

### Flow 3: Plan Refinement

```
1. User sees generated plan
2. Activity 2 doesn't appeal → taps refresh icon on that card
3. New activity swapped in, travel times recalculated
4. User taps "Rustiger programma" chip
5. Plan regenerates with calmer activities, same timing
6. User is satisfied → shares plan
```

### Flow 4: Weather Changes

```
1. User made a plan yesterday for today
2. Opens saved plan → banner: "Het weer is veranderd: regen vanaf 11:00"
3. Button: "Pas plan aan voor het weer"
4. Plan regenerates with indoor alternatives, preserving time structure
```

### Flow 5: Shared Plan (Recipient View)

```
1. Partner receives WhatsApp message with plan link
2. Opens link → sees read-only visual timeline
3. Can tap "Pas dit plan aan" to make their own copy
4. OR can tap "Voeg toe aan agenda" directly
```

---

## 11. Mockup Descriptions

### Mockup A: Input Flow — Mobile (390px)

**Screen 1 (Location):**
- Status bar + subtle "Plan je dag" header with back arrow
- Large text: "Waar wil je heen?"
- Full-width search input, 48px height, rounded corners
- Geolocation button (compass icon) right-aligned inside input
- Below: 3 recent location chips ("Amsterdam", "Utrecht", "Haarlem")
- Below: "Of kies een stad:" with scrollable city list
- Background: soft off-white (#FAFAF8)

**Screen 2 (When):**
- "Welke dag?"
- 4 pills in a row, equal width
- "Vandaag" shows weather icon (sun/cloud) + "14°C"
- "Morgen" shows weather icon + "12°C"
- Selected pill: primary green fill, white text
- Unselected: white fill, gray border

**Screen 3 (Children):**
- "Wie gaan er mee?"
- Stepper for count: large minus/plus buttons, number in center
- Per child: age bubbles (1-5) in a row, tappable
- If 2+ children: horizontal scroll of child cards, each with own age selection
- Friendly illustration of children at the top (matching site style)

**Screen 4 (Transport):**
- "Hoe gaan jullie?"
- 2x2 grid of transport cards, each ~170x100px
- Each card: large icon (40px), label, radius in muted text
- Selected: green border + subtle green tint
- Unselected: white with gray border

**Screen 5 (Duration):**
- "Hoe lang hebben jullie?"
- 3 stacked cards, each ~100px tall
- Each card: left icon/illustration, right side has title + description
- Timeline preview dots on each card showing activity density
- Large "Maak mijn dagplan" CTA at bottom, 56px height, full-width minus 32px padding
- Subtle text below CTA: "Op basis van weer, reistijd en leeftijd"

### Mockup B: Plan Output — Mobile (390px)

**Header area (sticky top):**
- Back arrow + "Plan je dag" + share icon (right)
- Plan title: "Regendag in Utrecht met Emma (3)"
- Summary: "3 activiteiten | ~4 uur | 6 km"
- Weather bar: Cloud icon + "12°C, droog tot 14:00" on a light blue background chip

**Timeline area (scrollable):**
- Left gutter (48px): time labels + timeline line
- Right area: activity cards, travel blocks, buffer blocks
- First activity card: green left border (top keuze), activity photo thumbnail (if available), name, type badge, description, practical info, link
- Travel block between cards: dashed line, bike icon, "12 min fietsen"
- Buffer block: dotted line, coffee icon, "Snack & pauze (15 min)"
- Second activity card: blue left border (goede optie)
- And so on...

**Below timeline:**
- Small map (200px, rounded corners, showing numbered markers and route)
- "Vergroot kaart" link

**Checklist section:**
- "Wat mee te nemen:" header
- Checklist items with checkbox UI (interactive, tappable)
- "Regenjas", "Extra kleren", "Snacks", "Luiers"

**Action bar (sticky bottom, 64px):**
- Two buttons side by side:
  - "Deel plan" (primary green, share icon)
  - "Opnieuw" (secondary outlined, shuffle icon)
- Above action bar: refinement chips ("Meer binnen", "Rustiger", "Avontuurlijker")

### Mockup C: Plan Output — Desktop (1280px)

**Layout: Two-column**
- Left column (55%): Timeline view with all activity cards
- Right column (45%): Sticky map showing the route
- Plan header spanning full width above both columns
- Action buttons and refinement chips below the timeline
- Sharing options in a dropdown from the header share icon

### Mockup D: Shared Plan (WhatsApp Preview)

**Link preview card (Open Graph):**
- Image: small map snapshot with route + peuterplannen.nl logo
- Title: "Dagplan: Regendag in Utrecht met Emma (3)"
- Description: "3 activiteiten | ~4 uur | Gemaakt op peuterplannen.nl"

---

## 12. The Viral Loop — What Makes Parents Share

### The "Magic Moment"

Research shows 92% of consumers trust recommendations from people they know. For Plan je dag, the magic moment is:

**"I typed in 5 things about my day, and it gave me a perfect plan that actually worked."**

This moment has three components:

1. **Speed:** From zero to complete plan in under 45 seconds
2. **Relevance:** The plan accounts for things the parent didn't even ask about (nap time, weather change, buggy accessibility)
3. **Discovery:** At least one activity the parent didn't know about ("I never would have found this")

### Built-in Sharing Triggers

**Trigger 1: The Partner Share**
- After generating a plan, prompt: "Stuur naar je partner?" with one-tap WhatsApp share
- This is the most natural sharing moment — couples coordinate weekend plans
- Every shared plan is a new user exposed to peuterplannen.nl

**Trigger 2: The Success Share**
- After a plan is completed (based on time), show: "Hoe was jullie dag?"
- If positive: "Deel je plan met andere ouders" → share to WhatsApp groups
- The shared format becomes a social object: other parents see it and want to make their own plans

**Trigger 3: The Group Plan**
- "Plan een dag met vrienden" option that generates a plan and shares it to a WhatsApp group
- Parents planning playdates together is a natural use case
- The shared link allows the group to view and comment

### The Referral Loop

```
Parent A makes a plan → Shares with Partner (2 users)
Plan works great → Shares in Parent WhatsApp Group (20 users)
3 parents from group make plans → Each shares with partner (6 more users)
Word of mouth: "Ken je peuterplannen.nl? Ze hebben een dagplanner, echt handig"
```

### What Makes It Remarkable (Worth Remarking About)

1. **The toddler-time thing:** "It actually accounts for nap time and tantrums — finally someone gets it"
2. **The weather adaptability:** "It changed the plan when it started raining"
3. **The hidden gem:** "It suggested this playground I walk past every day but never knew was there"
4. **The packing list:** "It even told me to bring rain covers for the buggy"
5. **The realistic timing:** "The times were actually right — with toddler-speed walking"

Each of these is a story a parent tells another parent. Stories spread features, not feature lists.

---

## 13. Technical Architecture Notes

### AI Prompt Structure

The Gemini prompt should request structured JSON output, not free text:

```json
{
  "plan_title": "Regendag in Utrecht met Emma (3)",
  "summary": "3 activiteiten, ~4 uur, 6 km fietsen",
  "weather_note": "12°C, droog tot 14:00, daarna buien",
  "overall_match": "high",
  "overall_note": "Dit plan past perfect bij jullie dag",
  "activities": [
    {
      "start_time": "10:00",
      "end_time": "11:30",
      "name": "Nijntje Museum",
      "type": "museum",
      "match_level": "high",
      "match_reason": "Binnen, interactief voor 3-jarigen",
      "description": "...",
      "practical_info": {
        "price": "EUR 12,50",
        "duration": "~1,5 uur",
        "changing_table": true,
        "buggy_accessible": true
      },
      "peuterplannen_url": "/utrecht/nijntje-museum/"
    }
  ],
  "travel_segments": [
    {
      "from": 0,
      "to": 1,
      "mode": "bike",
      "duration_minutes": 12,
      "distance_km": 2.1,
      "toddler_adjusted_minutes": 15,
      "note": "Via Oudegracht"
    }
  ],
  "buffers": [
    {
      "after_activity": 0,
      "type": "snack",
      "duration_minutes": 15,
      "suggestion": "Er is een speelhoek bij Cafe de Dom"
    }
  ],
  "packing_list": ["Regenjas", "Extra kleren", "Snacks", "Luiers"],
  "plan_b": {
    "trigger": "Regen voor 14:00",
    "suggestion": "Ga direct naar het Spoorwegmuseum in plaats van de speeltuin"
  }
}
```

### Data Sources

The AI should be grounded in peuterplannen.nl's actual location database:
- Activity details (name, type, age range, indoor/outdoor, price)
- Coordinates (for travel time calculation)
- Practical info (changing tables, buggy access, parking)
- User reviews/ratings if available
- Opening hours per day

### Travel Time

- Use a simple distance-based estimation (no need for full routing API initially):
  - Walking: 4 km/h (toddler) vs 5 km/h (adult)
  - Biking: 12 km/h (with child seat) vs 15 km/h (adult)
  - Car: use straight-line distance x 1.3 factor, then estimate based on 30 km/h city / 60 km/h outside
  - OV: hardest to estimate — consider using 9292 API later
- Add transition buffers: +10 min per activity (arrival setup + departure)

### Map

- Use MapLibre GL (already in tech stack)
- Show numbered markers + route polyline
- Simple straight-line connections initially, upgrade to actual routes later

---

## 14. Implementation Phases

### Phase 1: Structured Output (1-2 days)
- Change Gemini prompt to return structured JSON
- Parse JSON and render as basic HTML cards (no fancy timeline yet)
- Already a massive upgrade from 2-3 sentence text output
- Add travel time estimates between activities
- Add basic packing list

### Phase 2: Visual Timeline (2-3 days)
- Build the vertical timeline CSS/HTML component
- Activity cards with match indicators
- Travel blocks between activities
- Buffer blocks for toddler moments
- Mobile-first responsive design

### Phase 3: Input Flow Upgrade (1-2 days)
- Step-by-step input on mobile (progressive disclosure)
- Compact form for returning users
- Weather preview on day selection pills
- Recent locations memory (localStorage)

### Phase 4: Sharing & Export (1-2 days)
- WhatsApp share with formatted message
- Calendar export (.ics generation)
- Save as image (html2canvas)
- Open Graph meta tags for link previews
- Shared plan read-only page

### Phase 5: Regeneration (1 day)
- Full plan regeneration button
- Single activity swap (refresh icon per card)
- Guided refinement chips
- Plan version carousel (swipe between versions)

### Phase 6: Map Integration (1-2 days)
- MapLibre map with numbered markers
- Route visualization
- Expandable map view
- Desktop two-column layout

### Phase 7: Toddler Intelligence Polish (ongoing)
- Nap-time awareness tuning per age
- Energy curve optimization
- Weather-adaptive plan B suggestions
- Seasonal activity weighting
- Opening hours validation

---

## 15. Sources

### Itinerary Builder UX & Design
- [Google's AI Mode Canvas Makes Travel Planning Visual](https://www.techbuzz.ai/articles/google-s-ai-mode-canvas-makes-travel-planning-visual)
- [Google Blog: Explore new ways to plan and book travel with AI](https://blog.google/products/search/agentic-plans-booking-travel-canvas-ai-mode/)
- [How to use Canvas in AI Mode for travel planning](https://blog.google/products-and-platforms/products/search/tips-prompts-ai-mode-canvas-travel-planning/)
- [How Wanderlog Simplifies Trip Planning Using Behavioral Design](https://designli.co/blog/how-wanderlog-app-simplifies-trip-planning-using-behavioral-design/)
- [Wanderlog Travel Planner — ScreensDesign](https://screensdesign.com/showcase/wanderlog-travel-planner)
- [Roadtrippers Trip Planner — ScreensDesign](https://screensdesign.com/showcase/roadtrippers-trip-planner)
- [Roadtrippers New Itinerary Planner](https://roadtrippers.com/magazine/introducing-roadtrippers-new-itinerary-planner/)
- [Build an AI Trip Planner App: Guide 2026](https://asd.team/blog/how-to-build-an-ai-trip-planner-software/)

### AI UX Patterns
- [Regenerate Pattern — Shape of AI](https://www.shapeof.ai/patterns/regenerate)
- [Partial Regeneration — AI UX Patterns](https://www.aiuxpatterns.com/pattern-partial-regeneration.html)
- [20+ GenAI UX Patterns — UX Collective](https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1)
- [Confidence Visualization — AI Design Patterns](https://www.aiuxdesign.guide/patterns/confidence-visualization)
- [Confidence Visualization — Agentic Design Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/confidence-visualization-patterns)
- [10 UX Design Patterns That Improve AI Accuracy and Trust](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/)
- [The Psychology of Trust in AI — Smashing Magazine](https://www.smashingmagazine.com/2025/09/psychology-trust-ai-guide-measuring-designing-user-confidence/)
- [Designing for Agentic AI: Practical UX Patterns — Smashing Magazine](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)

### Decision Fatigue & Choice Architecture
- [Simplicity Wins over Abundance of Choice — NN/Group](https://www.nngroup.com/articles/simplicity-vs-choice/)
- [Decision Fatigue: The Hidden Enemy of UX — Medium](https://medium.com/design-bootcamp/decision-fatigue-the-hidden-enemy-of-user-experience-f62c061d5156)
- [Every Parent's Guide to Decision Fatigue](https://lifeskillsadvocate.com/blog/every-parents-guide-to-decision-fatigue/)
- [Decision Fatigue — The Decision Lab](https://thedecisionlab.com/biases/decision-fatigue)

### Context-Aware Recommendations
- [Real-Time Context-Aware Recommendation System for Tourism — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10098936/)
- [Multi-objective Contextual Bandits in Recommendation Systems — Nature](https://www.nature.com/articles/s41598-025-89920-2)
- [Context-Aware Tourist Trip Recommendations](https://ceur-ws.org/Vol-1906/paper3.pdf)

### Timeline & Visual Design
- [Vertical Timeline Templates — Venngage](https://venngage.com/blog/vertical-timeline/)
- [Best Visual Timeline Examples on the Web](https://shorthand.com/the-craft/best-visual-timeline-examples-on-the-web/index.html)
- [Drag & Drop UX Best Practices — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)
- [Designing a Reorderable List Component](https://www.darins.page/articles/designing-a-reorderable-list-component)
- [Drag-and-Drop UX Guidelines — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)

### Sharing & Export
- [How to Export and Share Your Itinerary — ItiMaker](https://www.itimaker.com/blog/how-to-export-and-share-itinerary)
- [WhatsApp Calendar Integration Guide — Chatarmin](https://chatarmin.com/en/blog/whatsapp-calendar)

### Family & Toddler Planning
- [FamFlow — AI Family Planner](https://famflow.xyz)
- [Lil Planner: Visual Schedule App](https://apps.apple.com/us/app/lil-planner-visual-schedule/id6448482826)

### Viral Growth & Word of Mouth
- [Word of Mouth: The Sales Channel for Parents — Sogolytics](https://www.sogolytics.com/blog/word-of-mouth-sales-for-parents/)
- [How to Create Word of Mouth for Your Mobile App — AppSamurai](https://appsamurai.com/blog/how-to-create-word-of-mouth-for-your-mobile-app/)
- [Word-of-Mouth Marketing in 2026 — BigCommerce](https://www.bigcommerce.com/articles/ecommerce/word-of-mouth-marketing/)

### AI Trip Planning Trends
- [How to Develop a Smart AI Trip Planner App in 2026 — Appinventiv](https://appinventiv.com/blog/build-ai-trip-planner-app/)
- [AI Travel Planning: Smart Travelers in 2026 — RunWithTrip](https://runwithtrip.com/ai-travel-planning-how-smart-travelers-are-designing-perfect-trips-in-2026/)
- [10 UX Design Shifts You Can't Ignore in 2026 — UX Collective](https://uxdesign.cc/10-ux-design-shifts-you-cant-ignore-in-2026-8f0da1c6741d)
