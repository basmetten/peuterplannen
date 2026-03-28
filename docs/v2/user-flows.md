# PeuterPlannen v2 — User Flows

Phase 0 documentation. Every flow described here is a buildable specification.

> **Architecture note:** The app IS the website. Every page on peuterplannen.nl renders within the same map + sheet/sidebar layout. There are no separate "marketing" pages. SEO routes (region hubs, location details, guides) render as routes within the unified app shell. See `information-architecture.md` for the full route structure.

---

## 1. Cold Start on Mobile — First Time Opening the App

**User goal:** Understand what this app does and see something useful within 5 seconds.

**Context of use:** Parent is on the couch, Saturday morning, iPhone in one hand, toddler eating breakfast. Tapped a link from a friend or Google result. Has never seen PeuterPlannen before. Mildly curious, will bounce if confused.

**Entry point:** Direct URL `peuterplannen.nl` (which IS the app — no splash page, no marketing page, no `/app` redirect needed).

**Step-by-step journey:**

1. App shell loads. Map renders centered on the Netherlands (zoom ~7, showing province boundaries faintly). Bottom sheet is in **peek state** (~120px visible), showing a one-line prompt: "Waar ben je? Kies een stad om te starten."
2. Above the sheet: a search pill/bar at the top of the map reads "Zoek een stad of plek..." with a subtle location icon on the right.
3. No markers are visible yet — the map is intentionally empty to avoid overwhelming.
4. The sheet peek/half state shows **contextual suggestion rows** instead of a generic list or skeleton cards. These look like Apple Maps "Find Nearby" rows: full-width rows with a colored circular SVG icon on the left and a label on the right. No emoji — only SVG icons with colored circular backgrounds per category. 4-6 suggestions are shown, composed by a **contextual algorithm**:
   - **Slots 1-2: time + weather/season based.** The algorithm checks current time of day and weather (via Open-Meteo API, free, no key required). Examples: morning + rain → "Koffie met speelhoek", "Museum"; sunny afternoon → "Speeltuin", "Kinderboerderij"; winter evening → "Zwembad", "Binnenspeeltuin".
   - **Slots 3-4: popular categories** not already in slots 1-2, ranked by proximity (if location known) and season. Examples: "Natuur" in spring/summer, "Pannenkoeken" year-round.
   - **Slots 5-6: personalized** if age preferences, favorites, or city are known from previous sessions (localStorage). Otherwise, fill with more popular categories.
   - Each suggestion maps to a **filter combination** (not a single filter). E.g., "Koffie met speelhoek" → `{type: 'horeca', facilities: ['speelhoek']}`.
   - Tapping a suggestion applies the filter combination and transitions to the results list (→ flow 2, with filters pre-applied). If no city is set yet, prompt city selection first (→ flow 5), then apply the filters.
5. If the browser supports geolocation, a small GPS button pulses once (subtle) in the bottom-right corner of the map, drawing attention.
6. User either: (a) taps the GPS button → flow 3, (b) taps the search bar → flow 5, (c) taps a suggestion row → filters apply + flow 2, (d) scrolls the sheet up → flow 7 with a nudge to pick a location first.

**What the UI must communicate at each step:**
- Step 1: "This is a map app for finding places." Visual language should feel like Apple Maps or Google Maps — familiar, not novel.
- Step 2: "You need to tell me where you are before I can help." The empty map is a feature, not a bug — it says "I'm waiting for you."
- Step 4: "Here's what parents typically look for right now." The suggestion rows give the cold start a sense of life and relevance. They answer "what can I do with this app?" before the user has typed anything.
- Step 5: "The easiest path is to share your location."

**What the system must do:**
- Load map tiles, app shell, and JS bundle. Target: first meaningful paint < 1.5s on 4G.
- Prefetch the location index (lightweight: id, name, lat, lng, type, peuterScore for all ~500 locations, ~80KB gzipped) so that once a city is chosen, markers appear instantly.
- Fetch weather data from **Open-Meteo API** (`https://api.open-meteo.com/v1/forecast?latitude=52.37&longitude=4.89&current_weather=true`) on cold start. Free, no API key needed. Cache for 1 hour. Use the weather code + temperature to select slots 1-2 of the suggestion rows.
- Build suggestion rows from a predefined mapping: `{timeOfDay, weatherCategory, season} → suggestion[]`. Each suggestion has: SVG icon, colored circle background, label, and a filter combination object.
- Do NOT request geolocation permission automatically. Wait for explicit user action.

**Edge cases:**
- User is outside the Netherlands (IP geolocation suggests DE/BE): show the same NL-centered map but add a subtle banner: "PeuterPlannen is er alleen voor Nederland."
- User has extremely slow connection (>5s load): show a branded splash with the PeuterPlannen logo and "Laden..." — not a blank white screen.
- User has visited before but cleared localStorage: treat as cold start, no stale city.

**Failure modes:**
- Map tiles fail to load (CDN down): show a static fallback image of NL with an error message and a list-view link.
- JS bundle fails: the page should still show the brand, a search input, and a "something went wrong" message with a reload button.
- Supabase is unreachable: show cached data if service worker has it, otherwise show error state with retry.

**Success criteria:** User either taps GPS or types a city within 8 seconds of first paint. Bounce rate < 40% for first-time mobile visitors.

**Metrics signal:** `cold_start_to_first_action` (time from page load to first GPS tap or search focus). Target: median < 6s.

---

## 2. First Useful Result After Opening

**User goal:** See a specific place they could actually go to today, with enough info to decide.

**Context of use:** Continuing from flow 1. Parent has just granted location or typed "Amsterdam". They want to see options NOW. Mental model: "show me what's nearby and good."

**Entry point:** Location is now known (GPS result or city selection). May also arrive here from tapping a contextual suggestion row (flow 1 step 4) — in that case, filters from the suggestion are pre-applied.

**Step-by-step journey:**

1. Map animates smoothly (300ms ease) to the chosen location, zooming to level ~13 (neighborhood scale). Markers pop in with a staggered animation (50ms delay each, scale-up from 0).
2. Bottom sheet transitions from peek to **half state** (~45% of viewport). The contextual suggestion rows (from flow 1) are replaced by the results list. The sheet header shows: "12 plekken in Amsterdam" with the active city name (or "4 kinderboerderijen in Amsterdam" if a suggestion pre-applied filters).
3. Sheet content: a horizontal scrollable row of **type filter chips** (Alles, Speeltuinen, Kinderboerderijen, Musea, Zwemmen, Natuur, Pannenkoeken, Horeca, Cultuur). "Alles" is active by default, unless a contextual suggestion pre-selected a filter combination.
4. Below chips: a vertical list of **place cards**, sorted by distance from center. Each card shows:
   - Photo (120x90, lazy-loaded, blurhash placeholder)
   - Name (bold, 16px, one line, truncated with ellipsis)
   - Type badge (e.g., "Kinderboerderij" in a colored pill)
   - PeuterScore (e.g., "8.2" in a small circle, color-coded green/amber/red)
   - Distance ("1.2 km")
   - One-line summary ("Gratis toegang, speeltuin + dieren")
   - Weather icon (sun/roof/hybrid) indicating indoor/outdoor
5. Parent sees the first 3-4 cards without scrolling. Taps the top card — e.g., "Kinderboerderij De Dierencapel". → flow 9.

**What the UI must communicate at each step:**
- Step 1-2: "I found places near you. Here they are." Speed communicates competence.
- Step 3: "You can narrow down by type if you want."
- Step 4: Each card must answer: "What is it? Is it good? How far? Can I go today?"

**What the system must do:**
- Filter the prefetched location index by bounding box of the visible map area OR by city/region.
- Sort by distance from map center.
- Render cards from the preloaded data — no additional API call needed.
- Lazy-load photos as cards scroll into view.

**Edge cases:**
- Only 1-2 results in the area (rural location like Schiermonnikoog): show them, then below add a "Meer in de regio Friesland" link that zooms out.
- User's GPS is slightly off (e.g., across a river): results should still be relevant since we use generous radius.
- PeuterScore is null for some locations: show "Nieuw" badge instead of a score, sort these lower.

**Failure modes:**
- Photos fail to load: show type-specific colored placeholder with an icon (tree for nature, slide for speeltuin, etc.).
- Zero results after filtering by type: "Geen [type] gevonden in dit gebied. Probeer een ander type of zoom uit."

**Success criteria:** Parent taps on a place card within 10 seconds of seeing results. At least 60% of sessions that reach this point continue to a detail view.

**Metrics signal:** `location_set_to_first_card_tap` (time). Target: median < 8s. `card_tap_rate` (% of sessions with location set that tap a card). Target: > 55%.

---

## 3. Location Permission Granted — GPS Flow

**User goal:** Share location so the app shows nearby places.

**Context of use:** Parent tapped the GPS button on the map or a "Gebruik mijn locatie" button. Browser shows the native permission dialog.

**Entry point:** GPS button tap (from flow 1) or location prompt in search.

**Step-by-step journey:**

1. Parent taps GPS button. Button icon changes to a spinning/pulsing state to indicate "requesting..."
2. Browser shows native geolocation permission dialog ("peuterplannen.nl wil je locatie gebruiken").
3. Parent taps "Allow" / "Sta toe".
4. GPS button stops spinning, fills solid (active state). Map flies to their location (animated, ~500ms).
5. A blue dot appears at their position with a subtle accuracy ring.
6. Markers load around them. Sheet transitions to half state with nearby results (→ flow 2 continues).
7. Their city is auto-detected from coordinates (reverse geocode or bounding-box lookup against regions table) and shown in the search bar: "Amsterdam-Oost" or similar.

**What the UI must communicate at each step:**
- Step 1: "I'm working on it." The pulsing button avoids dead-air.
- Step 2: This is the browser's UI — we can't control it. But the GPS button state tells the user what they triggered.
- Step 4-5: "I found you. Here you are." The blue dot is a universally understood pattern.
- Step 7: "I know which area you're in."

**What the system must do:**
- Call `navigator.geolocation.getCurrentPosition()` with `enableHighAccuracy: true`, timeout 8s.
- On success: store coordinates in app state (not localStorage — privacy). Determine city/region from coords.
- Set a flag in localStorage: `locationPermission: 'granted'` so we know to show the blue dot on reload (but re-request coords each session).
- Filter and sort locations by distance from user coords.

**Edge cases:**
- GPS returns low accuracy (>1km radius): still use it, but don't show the accuracy ring (it would be comically large). Log this for debugging.
- User is indoors and GPS takes >5s: after 3s, show a subtle message below the GPS button: "Locatie zoeken..." After 8s timeout, fall back to IP geolocation or show flow 4.
- User grants permission but is moving (on a train): use initial position, don't continuously track. Offer a "Herlaad locatie" option.

**Failure modes:**
- `getCurrentPosition` times out: show toast "Locatie niet gevonden. Probeer het buiten of voer een stad in." → flow 5.
- Permission granted but coords are wildly wrong (ocean, wrong country): detect via bounds check against NL bbox, fall back to manual entry.
- HTTPS not available (HTTP context): geolocation API unavailable. Hide GPS button entirely, default to search flow.

**Success criteria:** 70%+ of users who see the permission dialog grant it. Time from tap to markers visible < 3s (excluding browser dialog time).

**Metrics signal:** `gps_permission_grant_rate`, `gps_to_results_time`. Also track `gps_accuracy_median` to monitor quality.

---

## 4. Location Permission Denied — Fallback

**User goal:** Still find places even though they declined to share location.

**Context of use:** Parent tapped "Block" / "Blokkeer" on the browser dialog, or previously denied and the browser remembers. They're privacy-conscious or habit-denied. Shouldn't feel punished.

**Entry point:** Geolocation permission denied callback, or `permissions.query` returns `denied` on load.

**Step-by-step journey:**

1. GPS button greys out with a small slash icon (universally "disabled"). No error toast — that feels aggressive.
2. The search bar gently pulses once and the placeholder text changes to: "Voer je stad in om te beginnen..."
3. Map stays at NL overview level. Sheet stays in peek state.
4. If the user taps the greyed GPS button again: show a small tooltip/popover: "Locatie geblokkeerd. Je kunt dit wijzigen in je browserinstellingen, of typ een stad hieronder."
5. Parent types city → flow 5.

**What the UI must communicate at each step:**
- Step 1: "That's fine, no judgment." Greying out is informational, not punitive.
- Step 2: "Here's the alternative path — it's easy."
- Step 4: "If you change your mind, here's how."

**What the system must do:**
- Store `locationPermission: 'denied'` in localStorage.
- On future visits, don't show the GPS pulse animation — go straight to search-first UX.
- Never re-request geolocation permission programmatically (browsers block this anyway after denial).

**Edge cases:**
- User denied on a previous visit but has since changed browser settings to allow: check `permissions.query` on each load. If status changed to `prompt` or `granted`, re-enable the GPS button.
- User is on a device without geolocation at all (old desktop browser): same flow — no GPS button shown, search is the primary path.

**Failure modes:**
- The search bar doesn't get focus properly after denial (keyboard doesn't appear): ensure `inputmode="search"` and test on iOS Safari specifically.

**Success criteria:** 80%+ of users who deny location still proceed to enter a city (don't bounce). Time from denial to city entry < 15s.

**Metrics signal:** `denied_to_city_entry_rate`, `denied_bounce_rate`.

---

## 5. City/Manual Location Search

**User goal:** Type a city or area name and see results there.

**Context of use:** Parent knows where they want to go (or where they are). Could be planning for next weekend ("We gaan zaterdag naar Haarlem") or just denied GPS. One thumb typing on iPhone keyboard.

**Entry point:** Tap on the search bar/pill at the top of the map.

**Step-by-step journey:**

1. Parent taps search bar. The bar expands (if collapsed) or focuses. iOS keyboard slides up. Map dims slightly (20% overlay). Sheet slides to peek or hides.
2. As the parent types "Ams", results appear immediately in a dropdown below the search bar:
   - **City/region matches** at the top: "Amsterdam", "Amstelveen", "Amersfoort" — each with a region icon and location count ("42 plekken").
   - **Place name matches** below: "Amstelpark", "Amsterdam Bos" — each with type badge and distance (if known).
3. Results update on every keystroke with debounce (150ms). Matching portion of text is **bolded** in each result.
4. Parent taps "Amsterdam" from the suggestions.
5. Keyboard dismisses. Search bar shows "Amsterdam" with an X button to clear. Map flies to Amsterdam (zoom ~13). Search overlay disappears.
6. Markers appear, sheet transitions to half state with results → flow 2 continues.

**What the UI must communicate at each step:**
- Step 1: "I'm ready for your input. The map is waiting."
- Step 2: "I'm fast and I understand what you're looking for." Instant results build trust.
- Step 3: "I'm narrowing down as you type." Boldface matching prevents confusion about why a result appeared.
- Step 5-6: "Done. Here's what's there."

**What the system must do:**
- Search is client-side against the prefetched index (cities/regions from `regions` table + location names). No server round-trip needed for autocomplete.
- Matching algorithm: prefix match on city/region names, then fuzzy substring on location names. Cities first, locations second.
- On city selection: set `currentCity` in state, filter locations by region, center map.
- On place selection: jump directly to that place's detail → flow 9 (skip the list).
- Store last searched city in localStorage for flow 16.

**Edge cases:**
- Typo: "Amstrdam" — implement basic fuzzy matching (Levenshtein distance ≤ 2) so "Amsterdam" still appears.
- Non-Dutch input: "The Hague" should match "Den Haag". Maintain an alias map for common English names.
- Very long city name typed: "Leidschendam-Voorburg" — ensure the dropdown doesn't overflow or wrap weirdly.
- User types a full address ("Vondelpark 1, Amsterdam"): treat it as a place search, not a geocode. If no match, show "Geen resultaten — probeer een stadsnaam."
- User presses Enter without selecting a suggestion: use the top suggestion as the default.

**Failure modes:**
- No suggestions at all (user types gibberish): show "Geen resultaten" with a hint: "Probeer een stad zoals Amsterdam, Utrecht, of Rotterdam."
- Client-side index failed to load: fall back to a server-side search endpoint. Show a brief loading spinner in the dropdown.

**Success criteria:** Parent selects a city within 3 taps (focus → type 2-4 chars → tap suggestion). 90%+ of search sessions end with a selection (not abandonment).

**Metrics signal:** `search_to_selection_time`, `search_keystrokes_before_selection` (target: median ≤ 4), `search_abandonment_rate`.

---

## 6. Browse by Type/Region — Filtering

**User goal:** Narrow down results to a specific kind of outing (e.g., only kinderboerderijen) or by practical criteria (indoor, free, good for 1-year-olds).

**Context of use:** Parent is in the half-sheet state, sees 15+ results, and wants to narrow down. "We're looking for something free and outdoors today." Or: browsing by region on a desktop planning session.

**Entry point:** Filter chips in the sheet header, or a "Filters" button that opens a filter modal.

**Step-by-step journey:**

1. **Type filter chips** are always visible in the sheet header (horizontal scroll): Alles | Speeltuinen | Kinderboerderijen | Musea | Zwemmen | Natuur | Pannenkoeken | Horeca | Cultuur.
2. Parent taps "Kinderboerderijen". Chip fills with color (active state). Map markers animate: non-matching markers fade out (200ms), matching ones pulse briefly. Card list filters to show only kinderboerderijen. Sheet header updates: "4 kinderboerderijen in Amsterdam".
3. Parent wants more filters. Taps a small "Filters" button (funnel icon) next to the type chips.
4. **Filter modal** slides up from the bottom (full sheet on mobile, sidebar panel on desktop):
   - **Weer**: Buiten / Binnen / Allebei (toggle group)
   - **Leeftijd**: Slider or chips: 0-1 / 1-2 / 2-3 / 3-4 / 4+ (multi-select)
   - **Prijs**: Gratis / Goedkoop (< EUR 10) / Maakt niet uit
   - **Voorzieningen**: Koffie / Verschoontafel / Buggy-vriendelijk / Parkeren (toggle chips)
   - **PeuterScore**: Minimaal 7.0 / 8.0 / Maakt niet uit
5. Parent selects "Buiten" + "Gratis" + "Verschoontafel". Taps "Toon resultaten (3)". The count updates live as they toggle filters.
6. Modal closes. Results update. A small badge on the filter button shows "3" (number of active filters). Active filter summary appears as removable pills below the type chips: "Buiten × | Gratis × | Verschoontafel ×".

**What the UI must communicate at each step:**
- Step 2: Instant feedback. The map responding to the filter creates a sense of direct manipulation.
- Step 4: Filters should feel like narrowing, not configuring. Keep it visual and tappable, not dropdown-heavy.
- Step 5: "Toon resultaten (3)" — the live count prevents dead-end fear. If count reaches 0, button becomes disabled: "Geen resultaten — pas filters aan."
- Step 6: Active filters are always visible and dismissable. No hidden state.

**What the system must do:**
- All filtering is client-side against the preloaded location index. No API calls.
- Filter state is stored in URL query params: `?type=kinderboerderij&weather=outdoor&price=free` — enables sharing and back-button behavior.
- When filters change: re-filter the list, update marker visibility on the map, update the count in the sheet header.
- If type filter + advanced filters together yield 0 results: suggest removing the most restrictive filter.

**Edge cases:**
- All filters active at once yields 0 results: show a friendly empty state with "Te veel filters actief. Probeer er een paar te verwijderen." and a "Wis alle filters" button.
- User selects a type chip AND the same type in the modal: they should be the same control, not stacking.
- Region-based browsing (from SEO pages or homepage): pre-set the region filter in the URL, show results for that region on load.

**Failure modes:**
- Filter modal doesn't scroll on small screens (iPhone SE): ensure modal content is scrollable within the modal viewport.
- URL params get corrupted (manual editing): validate and fall back to no filters.

**Success criteria:** Users who filter see a higher card-tap rate (>65%) than unfiltered sessions. Filter usage in >30% of sessions with >10 results.

**Metrics signal:** `filter_usage_rate`, `filter_combination_frequency`, `post_filter_card_tap_rate`, `zero_result_filter_rate` (target: < 5%).

---

## 7. Map Browsing with Sheet — Core Interaction Model

**User goal:** Explore the map freely while having access to a list of places.

**Context of use:** Parent is casually browsing, maybe zooming into a specific neighborhood, or planning a route that passes multiple places. One-handed, thumb on the bottom half of the screen.

**Entry point:** Any state where the map is visible and results are loaded.

**Step-by-step journey:**

1. **Sheet states** — the bottom sheet has three snap points:
   - **Peek** (~120px): shows sheet handle + header text ("12 plekken in Amsterdam"). Map is fully visible. Used when actively exploring the map.
   - **Half** (~45% viewport): shows filter chips + 3-4 cards. Map visible above sheet. Default state after loading results.
   - **Full** (~92% viewport, leaves 60px of map visible at top): full scrollable list. Map still peeks at top for orientation.

2. **Sheet transitions**: drag handle up/down to switch between states. Snapping with spring physics (overshoot + settle). Velocity-sensitive: fast flick up goes peek→full, slow drag goes peek→half.

3. **Map interaction while sheet is visible**:
   - In peek state: full map interaction (pan, zoom, tap markers).
   - In half state: map area above sheet is interactive. Panning the map auto-collapses sheet to peek (after 300ms of continuous pan).
   - In full state: map is minimal. Tapping the visible map strip at top collapses sheet to half.

4. **Marker visibility**: markers cluster at low zoom levels (zoom < 12). Individual markers appear at zoom ≥ 12. Cluster markers show a count number.

5. **Map pan → card list sync**: as the parent pans the map, the card list updates to show places visible in the current viewport (debounced, 300ms after pan ends). Sheet header count updates: "8 plekken in dit gebied".

6. **Card → map highlight**: when a card scrolls into the center of the visible list area, its corresponding marker on the map subtly enlarges/highlights. Tapping a card zooms the map to that marker.

**What the UI must communicate at each step:**
- The sheet handle (small gray bar, 32x4px, centered) is the universal "drag me" affordance.
- The map and list are always in sync — what you see in one is reflected in the other.
- Sheet state transitions must feel physical — like sliding a real card up from a table.

**What the system must do:**
- Sheet position management: CSS `transform: translateY()` with touch event handling. Use `will-change: transform` for GPU compositing.
- Snap points calculated relative to viewport height (CSS `dvh` units for iOS Safari compatibility).
- Map viewport → location filtering: on every map `moveend` event, compute visible bounds and filter the location list.
- Maintain sheet state in memory (not URL) — it's a UI state, not a navigation state.

**Edge cases:**
- iOS Safari bottom bar (dynamic viewport): use `dvh` units. When Safari's bar appears/disappears, sheet snap points must recalculate.
- Landscape orientation on phone: sheet only has two states (peek and half). Full state disabled — not enough vertical space.
- Accessibility: sheet must be operable via keyboard (up/down arrows to switch states) and announce state changes to screen readers.
- User rotates phone while sheet is in full state: recalculate and re-snap.

**Failure modes:**
- Sheet gets stuck between snap points (touch event lost): on `touchend`, always animate to nearest snap point.
- Map tiles fail to load during pan: show grey placeholder tiles, retry on next `moveend`.
- Performance on low-end Android with 50+ visible markers: limit visible markers to 30, prioritize by PeuterScore.

**Success criteria:** Sheet transitions feel native-app smooth (60fps). No jank during pan-to-peek collapse. Users naturally discover all three sheet states within first session.

**Metrics signal:** `sheet_state_transitions_per_session`, `map_pan_events_per_session`, `time_in_each_sheet_state`.

---

## 8. Small Cluster Discovery

**User goal:** See what's grouped together in one area and pick one.

**Context of use:** Parent zoomed into a neighborhood and sees a cluster marker showing "4". They want to see what's inside without zooming further (because at some point zooming more doesn't help — places are literally next door to each other).

**Entry point:** Tap on a cluster marker showing ≤ 5 places.

**Step-by-step journey:**

1. Parent sees a cluster marker labeled "4" at the Vondelpark area in Amsterdam.
2. Taps the cluster. Two possible behaviors based on zoom level:
   - **If zoom < 14**: map zooms in one level to try to de-cluster. If still clustered, repeat.
   - **If zoom ≥ 14 AND cluster ≤ 5** (already close enough, small cluster): triggers the **carousel flow** (see below).
   - **If zoom ≥ 14 AND cluster > 5**: map zooms in further to de-cluster.
3. Also triggers for **co-located markers** (multiple locations at the same or nearly identical coordinates) regardless of cluster size.

**Carousel flow:**

4. Browse sheet animates down to **hidden**. Individual markers for the cluster members appear on the map (spread out or at their actual positions).
5. A **horizontal carousel** rises from the bottom of the screen, floating over the map. Contains compact cards (~200px wide) that can be swiped horizontally:
   - Each card: 72px photo (rounded) + name (bold, single line) + type badge (colored pill) + PeuterScore (compact circle) + distance ("0.3 km")
   - Cards are horizontally scrollable with snap-to-card behavior.
6. The **active card** (centered in viewport) highlights its corresponding marker on the map with a terracotta-colored ring. Swiping to the next card moves the highlight to the next marker.
7. Parent taps a card → carousel dismisses, **detail sheet** rises to peek state (flow 9). Map centers on the selected marker.
8. Parent taps empty map area (not a marker) → carousel dismisses, **browse sheet** returns to its previous position.
9. The carousel and browse sheet are **never visible simultaneously**.

**What the UI must communicate at each step:**
- Step 4-5: "Here's what's grouped together — swipe to compare." The carousel floating over the map makes the spatial relationship tangible.
- Step 6: The terracotta ring on the active marker answers "which one am I looking at on the map?"
- Step 7: Tapping a card means "I want to know more about this one."
- Step 8: Tapping the map means "I'm done comparing, take me back."

**What the system must do:**
- Cluster detection: use a grid-based clustering algorithm (e.g., Supercluster library) with MapLibre GL's built-in clustering.
- On cluster tap (zoom ≥ 14, ≤ 5 members): resolve cluster member IDs, place individual markers, build carousel from preloaded index data.
- Carousel: CSS scroll-snap container (`scroll-snap-type: x mandatory`). Each card is a scroll-snap child. Use `IntersectionObserver` or `scrollend` to detect the active card and update the corresponding marker highlight.
- Marker highlight: apply a terracotta-colored ring (CSS box-shadow or SVG stroke) to the marker corresponding to the active carousel card.
- Dismiss carousel: animate carousel down (200ms), animate browse sheet up to its stored position (200ms).
- Store the browse sheet's previous position so it can be restored on carousel dismissal.

**Edge cases:**
- Cluster of 2: carousel with 2 cards. Markers placed at their actual positions (or slightly offset if co-located).
- Cluster of exactly 1 (edge case in clustering algorithm): skip carousel, go directly to detail sheet (flow 9).
- Co-located markers (same lat/lng): offset markers slightly in a circular pattern so they're individually tappable on the map.
- Carousel at the bottom of a small screen (iPhone SE): reduce card height, ensure carousel doesn't cover more than 30% of viewport.

**Failure modes:**
- Carousel scroll-snap not supported (very old browsers): fall back to free-scrolling with closest-card detection on scroll end.
- Tapping a marker while carousel is visible: treat as selecting that card — scroll carousel to it and highlight.
- Carousel animation jank on old devices: reduce to instant show/hide (no animation) if device has < 4GB RAM (detect via `navigator.deviceMemory`).

**Success criteria:** Users who see the carousel have > 70% chance of tapping one of the cards (not dismissing). Carousel swipe-through rate > 50% (users look at 2+ cards).

**Metrics signal:** `cluster_tap_rate`, `carousel_shown_rate`, `carousel_cards_viewed`, `carousel_to_detail_rate`, `carousel_dismiss_rate`.

---

## 9. Marker Tap → Preview → Detail — Core Selection Micro-Flow

**User goal:** Get a quick preview of a place, then decide whether to learn more.

**Context of use:** Parent has been browsing the map or list and something caught their eye. They want a quick "is this worth looking at?" check before committing to the detail view.

**Entry point:** Tap a marker on the map, or tap a card in the sheet.

**Step-by-step journey:**

The detail view is a **separate sheet** that replaces the browse sheet — the same pattern Apple Maps and Google Maps use. The browse sheet and detail sheet are never visible simultaneously.

**Path A — Marker tap:**

1. Parent taps a marker on the map (e.g., Artis Zoo marker).
2. Marker enlarges and changes color (selected state). Map pans slightly to center the marker if it was near an edge.
3. The **browse sheet** animates down to **hidden**. A new **detail sheet** rises to **peek state** (~25% of viewport), showing:
   - Name: "Artis"
   - Type: "Museum & Dierentuin"
   - PeuterScore: "7.8" + open/closed status
   - Thumbnail photo (right-aligned, 64x64, rounded)
4. Parent swipes the detail sheet up to **half state**: action button row becomes visible (Route, Website, Bellen, Bewaren, Delen), plus first info sections (quick-info row, beschrijving intro).
5. Parent swipes up to **full state**: all info, kenmerken, opening hours, score breakdown, "Vergelijkbaar in de buurt" section → flow 10 content.
6. Swipe down past peek → detail sheet dismisses, browse sheet returns to its previous position.

**Path B — Card tap from sheet:**

1. Parent taps a card in the half-sheet list (e.g., "Kinderboerderij De Dierencapel").
2. The corresponding marker on the map highlights. Map pans to center it.
3. Browse sheet animates down to hidden. Detail sheet rises to **peek state** with the location's name, type, rating, open/closed, and thumbnail. → same flow as Path A step 3 onward.

**What the UI must communicate at each step:**
- Marker/card selection: instant visual feedback (< 100ms). The marker must feel "tapped."
- Detail sheet peek: answering "what is this and is it any good?" in a glance. Not more than 2 seconds of reading.
- The sheet swap (browse out, detail in) must feel like a coordinated transition, not two separate animations. Browse slides down as detail rises — ~300ms total.
- Swipe-down dismissal: the detail sheet should feel like it can be flicked away. Browse sheet returning signals "you're back to browsing."

**What the system must do:**
- On marker/card tap: look up place ID from the marker's feature properties or card data. Render detail sheet peek from the preloaded index data (no API call needed for peek content).
- On swipe to half/full: fetch full detail data from Supabase for this location (all 60 fields) if not already cached. Show skeleton sections while loading.
- Manage two sheet instances: browse sheet and detail sheet. Only one is visible at a time. Store the browse sheet's previous position (peek/half/full) so it can be restored on detail dismissal.
- Update URL to `/amsterdam/artis` for deep-linking and back-button support.
- Push to browser history stack so back button dismisses the detail sheet and returns the browse sheet (same as swipe-down past peek).

**Edge cases:**
- User taps the map (not a marker) while detail sheet is showing: dismiss detail sheet, return browse sheet.
- User taps a different marker while detail sheet is showing: crossfade detail sheet content to the new location (150ms), don't animate the full sheet swap again.
- Detail sheet peek on small phones (iPhone SE): use compact layout, single-line name with ellipsis.
- Location has no photo: hide the thumbnail area in peek state, let text use full width.

**Failure modes:**
- Full detail data fails to load from Supabase: show the index data in the detail sheet (which we already have) with a "Fout bij laden van details. Tik om opnieuw te proberen." message for the missing fields.
- Marker tap target too small (hard to tap on mobile): ensure marker hit area is at least 44x44px even if the visual marker is smaller.
- Sheet swap animation jank: use `will-change: transform` on both sheets. Coordinate the two animations in a single `requestAnimationFrame` to avoid layout thrash.

**Success criteria:** > 50% of marker taps lead to a detail sheet open (at least peek). Peek-to-half swipe rate > 60%. Browse-detail sheet swap < 300ms at 60fps.

**Metrics signal:** `marker_tap_to_detail_peek_time`, `detail_peek_to_half_rate`, `detail_peek_to_dismiss_rate`, `card_tap_to_detail_time`.

---

## 10. Detail Evaluation — What a Parent Checks Before Deciding

**User goal:** Get enough information to decide: "Are we going here today/this weekend?"

**Context of use:** Parent is looking at a specific place. They need to make a go/no-go decision quickly. Key questions in their mind: "Is it good? Can we park? Is there coffee? Will my 2-year-old enjoy it? Is it open today? How much does it cost?"

**Entry point:** Detail sheet is open from flow 9. The parent has swiped up from peek and is now evaluating the location across the detail sheet's three states.

**Step-by-step journey:**

The detail sheet content is distributed across three progressive disclosure levels:

1. **Peek state** (~25% viewport — visible immediately after marker/card tap):
   - Name: "Kinderboerderij De Dierencapel" (20px, bold, Newsreader — Newsreader is used only for location names on the detail sheet)
   - Type + open/closed: "Kinderboerderij · Open tot 17:00" (green/red status)
   - PeuterScore: "8.4" in a compact circle
   - Thumbnail photo (right-aligned, 64x64, rounded)
   - Swipe-up affordance (handle bar)

2. **Half state** (~45% viewport — after first swipe up):
   - Action button row: Route | Website | Bellen | Bewaren | Delen (horizontally scrollable icon+label buttons, 44px tap targets)
   - Quick-info row: Buiten | 1-4 jaar | Gratis | 1.2 km (icon + label chips)
   - **Beschrijving** intro: first 2-3 sentences of editorial copy. "Gezellige kinderboerderij met geiten, kippen en een konijnenhok. De speeltuin ernaast is ruim."
   - Hero photo (full width, 180px height, with gradient overlay — loads here, not in peek, to keep peek lightweight)

3. **Full state** (~92% viewport — after second swipe up, scrollable):
   - **Kenmerken / Score breakdown** (expandable accordion, collapsed by default):
     - Speelhoek: ●●●●○ (4/5)
     - Buggy-vriendelijkheid: ●●●○○ (3/5)
     - Parkeren: ●●●●● (5/5)
     - Toiletten: ●●●●○ (4/5)
     - Eten & drinken: ●●○○○ (2/5)
     - Geluidsniveau: ●●●○○ (3/5 — "Rustig")
   - **Praktische info**:
     - Openingstijden (with today highlighted, open/closed status in green/red)
     - Adres (tappable → maps)
     - Parkeren: "Gratis parkeren aan de straat, meestal plek beschikbaar"
     - Toegankelijkheid: "Buggy-vriendelijk, grindpaden"
     - Facilities icons row: Koffie | Verschoontafel | Parkeren (SVG icons)
   - **Vergelijkbaar in de buurt** (horizontal scroll of 3-4 cards): "Meer in de buurt" → flow 11. Tapping a comparison card swaps the detail sheet content (crossfade, not a new sheet).
   - **Op de kaart** (small static map showing this location with a marker).

4. Parent sees the PeuterScore and open/closed status in peek. Swipes to half, taps "Route" → phone opens navigation. Or swipes to full to check score breakdown and opening hours (it's Wednesday, "Vandaag: 9:00 - 17:00" in green).

**What the UI must communicate at each step:**
- Above the fold answers: "Is this place any good?" (PeuterScore) and "Can I go?" (weather, age, price, distance).
- Below the fold answers: "What's it actually like?" (description, score breakdown) and "How do I get there?" (practical info).
- The hierarchy of information mirrors the decision priority: quality → basics → details → alternatives.

**What the system must do:**
- Fetch full location record from Supabase (single row query by slug/id). Cache in memory for back-navigation.
- Compute "Vandaag open/dicht" from opening_hours field + current day/time.
- "Route" button: construct deep link for Apple Maps (iOS) or Google Maps (Android/other): `maps://` or `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
- "Vergelijkbare plekken": query preloaded index for same type + within 5km + sorted by PeuterScore. Exclude current place.
- Track scroll depth on detail view for analytics.

**Edge cases:**
- Location has sparse data (no description, no opening hours, few quality scores): show what's available without empty sections. Hide the score breakdown if fewer than 3 dimensions have values. Show "Informatie beperkt beschikbaar" where gaps are.
- Photo is very dark or very bright: the gradient overlay on the hero must ensure text readability regardless.
- Opening hours data is missing or outdated: show "Openingstijden onbekend — check de website" with a link to the location's website if available.
- PeuterScore is very low (< 5): still show it honestly. We don't hide bad scores.
- Location is permanently closed: show a prominent red banner at the top: "Deze locatie is gesloten." Don't show route/save buttons.

**Failure modes:**
- Detail data fails to load: show the index data (name, type, score, coords) with a retry button for full details.
- Opening hours parsing error: fall back to "Zie website" with link.
- Hero photo 404: show type-specific gradient placeholder with the location name in large text.

**Success criteria:** > 40% of detail views result in an action (save, route, affiliate click, or compare-nearby tap). Average time on detail view: 15-30 seconds (enough to evaluate, not so long they're struggling).

**Metrics signal:** `detail_view_scroll_depth`, `detail_action_rate`, `detail_time_on_screen`, `route_tap_rate`, `save_tap_rate`.

---

## 11. Compare Similar Nearby Places

**User goal:** See alternatives without losing context of the place they just evaluated.

**Context of use:** Parent looked at Kinderboerderij De Dierencapel (flow 10) and it scored 7.2 on food. They wonder: "Is there something better nearby with a proper terras?" Or they just want to see what else is around before committing.

**Entry point:** "Meer in de buurt" section at the bottom of the detail view, or back button from detail.

**Step-by-step journey:**

**Path A — "Vergelijkbaar in de buurt" horizontal scroll (in full state of detail sheet):**

1. At the bottom of the detail sheet's full state, 3-4 cards show similar places:
   - Filtered: same type OR same region, within 5km, sorted by PeuterScore.
   - Each card shows: photo, name, PeuterScore, distance, and the ONE dimension where this place scores notably higher than the current one (e.g., "Eten: 4/5" highlighted if the current place scored 2/5).
2. Parent taps "Zuiderpark Kinderboerderij" (3.2 km, score 8.6).
3. Detail sheet content crossfades to the new location (150ms). The sheet stays in full state. Map marker highlight moves to the new location.
4. Back button (←) or swipe-right gesture returns to the previous place's detail sheet content. History stack: browse → De Dierencapel → Zuiderpark.

**Path B — Back to browse sheet and compare:**

1. Parent swipes the detail sheet down past peek, or taps the back button.
2. Detail sheet dismisses. Browse sheet returns to its previous position (peek/half/full). The previously viewed card has a subtle "Bekeken" indicator.
3. Parent can now tap another card to open a new detail sheet.

**What the UI must communicate at each step:**
- Path A: "Here are alternatives that might be better for your needs." The highlighted dimension says "this place is better at X." The crossfade within the same sheet signals "comparing," not "navigating away."
- Path B: "You're back to browsing. You can see what you've already looked at."

**What the system must do:**
- Comparison cards: compute from preloaded index. Identify the dimension where the alternative scores highest relative to the current place.
- Crossfade transition within detail sheet: swap content with CSS `opacity` transition (150ms). No sheet dismiss/re-open — keeps the user in the evaluation mindset.
- Browser history: `pushState` for each detail view. Back button navigates through the stack naturally. When the stack unwinds past the first detail view, the detail sheet dismisses and browse sheet returns.
- "Bekeken" state: store viewed location IDs in sessionStorage. Style visited cards in the browse sheet with a subtle check mark.

**Edge cases:**
- Current place is the only one of its type in the area: show places of OTHER types nearby, with label "Ander soort uitje in de buurt."
- User navigates 5+ levels deep in comparison: history stack works, but show a "Terug naar lijst" button in the detail sheet header to escape the stack entirely (dismisses detail sheet, returns browse sheet).
- All nearby alternatives have lower PeuterScore: still show them, but don't highlight a comparison dimension. Just show them as alternatives.

**Failure modes:**
- Crossfade transition gets stuck (fast tapping): debounce taps, only allow one transition at a time.
- Back button after comparison doesn't restore browse sheet scroll position: store scroll position before entering detail sheet, restore on return.

**Success criteria:** > 25% of detail views include a tap on a comparison card. Users who compare have higher save/route rates.

**Metrics signal:** `comparison_card_tap_rate`, `comparison_depth` (how many places in sequence), `action_rate_after_comparison`.

---

## 12. No Results / Dead End Recovery

**User goal:** Recover from a state where no results are shown and find something useful.

**Context of use:** Parent typed a location with no coverage, or applied too many filters, or zoomed into an area of the map with no locations. Frustration is building — they need a way out, not a dead end.

**Entry point:** Any state where the card list is empty.

**Step-by-step journey:**

**Scenario A — Too many filters:**

1. Card list shows an illustrated empty state: a simple line drawing of a parent looking around with binoculars.
2. Text: "Geen plekken gevonden met deze filters."
3. Below: active filters shown as removable pills. "Buiten × | Gratis × | Verschoontafel ×"
4. CTA button: "Wis alle filters" (primary) and "Zoom uit" (secondary).
5. Parent taps "Wis alle filters" → filters reset, results appear, sheet animates to half state.

**Scenario B — Empty area on map:**

1. Parent zoomed into a rural area with no locations.
2. Sheet peek shows: "Geen plekken in dit gebied."
3. Below: "Dichtstbijzijnde plek: Kinderboerderij Het Woeste Westen (8 km)" — a tappable link that zooms the map there.
4. Also: "Of zoek een andere stad" → focus search bar.

**Scenario C — Search with no results:**

1. Parent typed "Blaricum" in search, no exact match in regions.
2. Dropdown shows: "Geen resultaat voor 'Blaricum'. Bedoelde je: Bussum (3 plekken, 4 km)? Hilversum (7 plekken, 6 km)?"
3. These suggestions are based on geographic proximity to Blaricum (using a basic geocoding lookup or known municipality relationships).

**What the UI must communicate at each step:**
- Never blame the user. The tone is "we don't have this yet" or "try a different approach," not "no results found."
- Always offer a clear next action. No dead ends.
- The illustrated empty state feels human, not like a database error.

**What the system must do:**
- Detect empty state after filtering/panning/searching.
- For scenario B: compute nearest location from the map center using the preloaded index (simple Haversine distance).
- For scenario C: implement a suggestions algorithm: look for nearby cities/regions, partial name matches, common misspellings.
- Track empty state occurrences for content gap analysis (which areas need more locations?).

**Edge cases:**
- Empty state appears during first-ever session (no filters set, no city selected): this shouldn't happen — flow 1 ensures a city is selected first. If it does happen (direct URL to an empty area), treat as scenario B.
- User keeps getting empty results across multiple searches: after 3 empty states in a session, show a persistent banner: "We breiden PeuterPlannen continu uit. Mis je een plek? Laat het ons weten!" with a feedback link.

**Failure modes:**
- "Nearest location" calculation is slow with large dataset: precompute a k-d tree or spatial index for fast nearest-neighbor queries.
- Empty state illustration doesn't load: CSS-only fallback (SVG icon + text).

**Success criteria:** > 70% of empty state views result in a recovery action (filter reset, zoom out, alternative search), not a bounce.

**Metrics signal:** `empty_state_occurrence_rate`, `empty_state_recovery_rate`, `empty_state_bounce_rate`, `empty_state_by_cause` (filter/map/search breakdown).

---

## 13. Saved/Favorites — Anonymous Mode (localStorage)

**User goal:** Save places for later without signing up. Build a shortlist for a day out.

**Context of use:** Parent found 3 good options and wants to remember them. Might be planning for the weekend. Doesn't want to create an account for this — it's a small app, not a major commitment.

**Entry point:** Heart icon on cards and detail views, "Bewaard" tab in the bottom navigation.

**Step-by-step journey:**

1. Parent is on the detail view for Artis. Taps the ❤️ "Bewaren" button.
2. Heart fills (red, 300ms scale animation with a small bounce). Button text changes to "Bewaard ✓".
3. A subtle toast appears at the bottom: "Artis bewaard. Bekijk je lijst →" (tappable link to Bewaard tab).
4. Parent saves 2 more places over the next few minutes.
5. Parent taps the "Bewaard" tab in the bottom navigation (heart icon with a badge showing "3").
6. **Bewaard view**: a simple list of saved places, each showing the same card format as the main list. Cards can be reordered by drag-and-drop (optional v2). Each has a remove button (trash icon or swipe-to-delete).
7. At the top of Bewaard: "3 plekken bewaard" with a share button.
8. Parent taps Share → generates a shareable link: `peuterplannen.nl/lijst/abc123` (short hash of the saved IDs). Standard share sheet opens (WhatsApp, copy link, etc.).
9. The shared link opens a read-only view of the saved list for the recipient (no need to be the original saver).

**What the UI must communicate at each step:**
- Step 2: The animation makes saving feel satisfying and confirmed. Not just a state change — a reward.
- Step 3: The toast gives an immediate path to the saved list without requiring navigation.
- Step 5-6: "Here's everything you saved." Clean, simple, no sign-up nag.
- Step 8: "Share this with your partner to decide together."

**What the system must do:**
- Store saved location IDs in `localStorage` under key `savedLocations: [id1, id2, id3]`.
- Also store save timestamps for potential sorting: `savedLocations: [{id: 1, savedAt: timestamp}, ...]`.
- Bewaard tab: fetch full data for saved IDs from the preloaded index (no API call needed for card rendering).
- Share link generation: encode saved IDs into a URL-safe base64 hash. Store the mapping server-side (simple Supabase table: `shared_lists` with columns `hash`, `location_ids`, `created_at`). No auth required — these are ephemeral lists.
- On opening a shared link: decode the hash, fetch location data, render as a read-only list within the app shell (each location links to its detail route).

**Edge cases:**
- User clears browser data: saved list is lost. When Bewaard tab is empty, show: "Je bewaarde plekken verschijnen hier. Bewaar plekken door op ❤️ te tikken." (NOT "Log in to save" — that's a future feature.)
- User saves 20+ places: list should still perform well. Consider pagination or "Bewaard deze week / Eerder bewaard" sections.
- User opens the shared link on desktop: show a nice list view with a CTA to open each place in the full app.
- Two people share conflicting lists: each shared link is independent. No merge logic needed.

**Failure modes:**
- localStorage is full (rare, 5MB limit): catch the error, show "Opslag vol — verwijder een paar bewaarde plekken."
- localStorage is unavailable (private browsing Safari): detect this, show toast "Bewaren werkt niet in privémodus. Open in een normaal venster."
- Shared link hash collision: use UUID v4 or 8+ random characters — collision probability is negligible.

**Success criteria:** > 20% of sessions with a detail view include at least one save. > 10% of sessions visit the Bewaard tab. > 5% of saved lists are shared.

**Metrics signal:** `save_rate`, `saves_per_session`, `bewaard_tab_visit_rate`, `share_link_creation_rate`, `shared_link_open_rate`.

---

## 14. Saved/Favorites — Logged-In Future Mode

**User goal:** Keep saved places across devices and over time, with additional features.

**Context of use:** Future state (no auth exists yet). Parent has been using PeuterPlannen for weeks, has saved 15+ places, and wants to access them on their partner's phone or on desktop. Or their phone was replaced and localStorage is gone.

**Entry point:** Future: prompted when visiting Bewaard tab or after N saves.

**Step-by-step journey (planned, not built):**

1. After the user saves their 5th place, a gentle non-blocking banner appears at the bottom of the Bewaard tab: "Maak een account aan om je lijst op al je apparaten te zien." with "Later" and "Account aanmaken" buttons.
2. "Account aanmaken" → flow 21 (social login).
3. After login: localStorage saved items are synced to the server (Supabase `user_favorites` table: `user_id`, `location_id`, `saved_at`).
4. On subsequent visits (any device), favorites are loaded from the server.
5. New feature unlocked: **collaborative lists**. User can create named lists ("Zomervakantie Amsterdam", "Regendagen activiteiten") and share edit access with a partner.

**What the system must do (future):**
- Migration: on first login, read localStorage `savedLocations`, write to Supabase, then set a flag `favorites_migrated: true`.
- Conflict resolution: if localStorage and server both have favorites, merge (union of both sets).
- Collaborative lists: separate Supabase table `shared_lists_v2` with `owner_id`, `collaborator_ids[]`, `location_ids[]`, `name`, `created_at`.

**What to build NOW for forward-compatibility:**
- Use a structured localStorage format (`{id, savedAt}`) that maps 1:1 to the future database schema.
- Abstract favorites behind a `favoritesService` module with `save(id)`, `remove(id)`, `getAll()`, `isStored(id)` methods. When auth lands, swap the localStorage implementation for a Supabase-backed one without changing any UI code.
- The share link feature (flow 13) doubles as a migration path: users can "export" their list as a link before signing up.

**Success criteria (future):** > 30% of users with 5+ saves create an account. > 50% of logged-in users access favorites on 2+ devices.

**Metrics signal (future):** `auth_prompt_shown_rate`, `auth_conversion_rate`, `cross_device_session_rate`.

---

## 15. Install PWA

**User goal:** Add PeuterPlannen to their home screen for faster access.

**Context of use:** Parent has used the app 3+ times and finds it useful. They want it to feel like a "real app" — one tap from home screen, no browser chrome.

**Entry point:** Browser install prompt (Chrome) or manual "Add to Home Screen" (Safari). Or an in-app install banner.

**Step-by-step journey:**

1. **Automatic prompt (Chrome Android):** After 3+ visits and 30+ seconds of engagement, Chrome shows the native "Add to Home Screen" mini-infobar. PeuterPlannen manifest provides: app name, icon (192x192 + 512x512), theme color (#1B7B3B or brand green), start URL `/`.
2. **Manual prompt (Safari iOS):** Safari doesn't support `beforeinstallprompt`. Instead, after 3 visits, show a custom banner at the bottom of the screen: "Voeg PeuterPlannen toe aan je beginscherm voor snelle toegang." with a Safari share icon illustration and "Tik op [share icon] → 'Zet op beginscherm'". Dismissable with ×, don't show again for 30 days after dismissal.
3. **In-app nudge (both platforms):** After a successful save action, one-time toast: "Tip: zet PeuterPlannen op je beginscherm!" — very brief, non-blocking.
4. After install: app opens in standalone mode (no browser URL bar). Splash screen shows PeuterPlannen logo on brand green background. App remembers last city and state.

**What the system must do:**
- `manifest.json` with proper fields: `name`, `short_name` ("Peuterplannen"), `start_url`, `display: standalone`, `background_color`, `theme_color`, `icons`.
- Service worker for offline support (see flow 17).
- Detect standalone mode via `window.matchMedia('(display-mode: standalone)')` to suppress install prompts.
- Store `installBannerDismissed` and `installBannerLastShown` in localStorage to control banner frequency.

**Edge cases:**
- User installs but the app icon is wrong (cached old icon): ensure cache busting on manifest URL. Include icon with proper masking for Android adaptive icons.
- User installs on iPad: should work in standalone mode, but layout should adapt to tablet (sidebar layout, not sheet).

**Failure modes:**
- Service worker registration fails: app still works as a website, just without offline support and without the install prompt on Chrome.
- Manifest has errors: validate with Chrome DevTools Lighthouse audit. Common mistake: icon sizes don't match declared sizes.

**Success criteria:** > 5% of multi-session mobile users install the PWA. Installed users have 3x higher return rate than browser-only users.

**Metrics signal:** `pwa_install_rate`, `standalone_mode_session_rate`, `installed_user_return_rate`.

---

## 16. Reopen App Later and Resume Context

**User goal:** Pick up where they left off without having to re-enter their city or re-find their place.

**Context of use:** Parent opened the app yesterday, searched Amsterdam, saved a few places. Today they open it again (from home screen or browser). They expect to see Amsterdam, not a blank slate.

**Entry point:** App load (any entry: direct URL, home screen PWA, revisit).

**Step-by-step journey:**

1. App loads. System checks localStorage for `lastCity`, `lastFilters`, `lastViewedLocation`.
2. If `lastCity` exists (e.g., "Amsterdam"):
   - Map centers on Amsterdam at zoom ~13.
   - Sheet loads in half state with Amsterdam results.
   - Search bar shows "Amsterdam".
   - Previously active filters are restored (if any).
   - Toast: "Welkom terug! Je bent in Amsterdam." (only on revisit after > 24h).
3. If `lastViewedLocation` exists AND the URL is just `/` (no deep link):
   - Don't auto-open the last detail view — that feels presumptuous.
   - Instead, the last viewed location's card has a subtle "Laatst bekeken" badge.
4. GPS status: if previously granted, re-request position silently (no UI, no permission dialog — browser remembers). Update blue dot if successful.
5. Bewaard tab badge updates with current count.

**What the system must do:**
- On every meaningful state change, persist to localStorage:
  - `lastCity` (string)
  - `lastMapCenter` (lat, lng)
  - `lastMapZoom` (number)
  - `lastFilters` (object: `{type, weather, age, price, facilities}`)
  - `lastViewedLocation` (id)
  - `lastVisit` (timestamp)
- On load: read these values and restore state. Apply before first render to avoid flash of default state.
- For deep links (`/amsterdam/artis`): ignore stored state, use the URL as source of truth.

**Edge cases:**
- Stored city no longer exists in the database (region was renamed or removed): fall back to cold start.
- Stored filters produce 0 results (data changed since last visit): silently remove filters, show unfiltered results.
- User visits on desktop after mobile session (different device, no shared state): cold start on desktop. No cross-device sync without auth (see flow 14).
- LocalStorage is corrupted (e.g., manually edited): wrap all reads in try/catch, fall back to cold start on any parse error.

**Failure modes:**
- Flash of wrong state (map briefly shows NL overview, then jumps to Amsterdam): render map hidden, set center/zoom BEFORE making it visible.
- Stale `lastMapCenter` combined with changed data: not a problem since we re-filter from the index on every load.

**Success criteria:** Returning users see their city within 1 second of app load. > 60% of multi-session users return to the same city.

**Metrics signal:** `returning_user_rate`, `city_persistence_rate`, `time_to_interactive_returning_user`.

---

## 17. Offline / Open with Stale Data

**User goal:** See something useful even when the internet is spotty (in a park, on the train, in a basement restaurant checking nearby options).

**Context of use:** Parent is already out with the toddler. They're in a park with poor reception and want to check opening hours of the kinderboerderij they saved. Or they're on the train planning and go through a tunnel.

**Entry point:** App loads or user navigates while offline or on a very slow connection.

**Step-by-step journey:**

1. **Fully offline, first load ever:** Service worker has no cache → blank screen with PeuterPlannen logo and "Geen internetverbinding. Maak verbinding om PeuterPlannen te gebruiken." Not much we can do without initial data.

2. **Offline, returning user (cache available):**
   - App shell loads from service worker cache.
   - Location index loads from cache (however old it is).
   - Map tiles load from tile cache (MapLibre has its own tile cache, typically last ~50 tiles viewed).
   - Sheet shows results from cached data. Everything works as usual for the cached area.
   - A subtle offline indicator appears: a small banner below the search bar "Je bent offline — getoonde info kan verouderd zijn" in amber.
   - Full detail views: if the user previously visited a detail page, the full data is in the runtime cache. If not, show the index-level data (name, score, type, location) with "Volledige info niet beschikbaar offline."

3. **Connection returns:** Banner auto-dismisses after successful fetch. Any pending actions (saves, etc.) sync. Data refreshes in the background.

4. **Spotty connection (slow, intermittent):**
   - All API calls have timeouts (5s for detail data, 3s for index).
   - On timeout: serve from cache + show offline indicator.
   - Retry silently in the background every 30s.

**What the system must do:**
- **Service worker caching strategy:**
  - App shell (HTML, CSS, JS): cache-first, update in background (stale-while-revalidate).
  - Location index: cache-first with background refresh. Max stale: 24 hours, after that force refresh when online.
  - Map tiles: cache-first, up to 50MB tile cache.
  - Photos: cache-first for any photo previously loaded. Max cache: 100MB, LRU eviction.
  - Detail data: network-first with cache fallback.
- Version the cache (`pp-cache-v{version}`). On new deploy, old caches are cleaned up.
- Never cache API keys or user-specific data in the service worker.

**Edge cases:**
- User is in a location not covered by cached tiles: show a blank/grey map with markers still positioned correctly (markers don't need tiles).
- Cache exceeds storage quota (some browsers limit to 50MB per origin): implement LRU eviction, prioritize app shell and index over photos.
- User has "Data Saver" mode on (Android Chrome): respect the `Save-Data` header. Don't preload photos. Compress more aggressively.

**Failure modes:**
- Service worker update causes cache miss: include a fallback HTML page in the service worker that shows a "Loading..." state while re-caching.
- IndexedDB quota exceeded (iOS Safari ~50MB limit): catch QuotaExceededError, evict oldest cached photos.

**Success criteria:** Returning users can browse the app meaningfully (see names, scores, distances) even when fully offline. < 3% of returning users see a blank/broken state.

**Metrics signal:** `offline_session_rate`, `offline_session_duration`, `cache_hit_rate_by_resource_type`.

---

## 18. Affiliate Clickout Flow

**User goal:** Buy tickets, book, or learn more about a place — and PeuterPlannen helps them get there.

**Context of use:** Parent decided they want to go to Artis. The detail page has all the practical info, but now they want to buy tickets (and PeuterPlannen earns a commission). Parent doesn't think about affiliates — they just want a ticket.

**Entry point:** "Koop tickets" or "Bekijk op [partner]" button on the detail view.

**Step-by-step journey:**

1. On detail views for locations with affiliate partnerships, a prominent CTA appears below the hero section:
   - **Primary CTA**: "Koop tickets via Tiqets" (or "Reserveer via Booking.com" for relevant types).
   - Styled as a full-width button, brand-colored for the affiliate partner.
   - Small text below: "PeuterPlannen verdient een kleine commissie als je via deze link koopt."
2. Parent taps "Koop tickets via Tiqets".
3. A brief interstitial (500ms): "Je wordt doorgestuurd naar Tiqets..." with PeuterPlannen and Tiqets logos side by side.
4. Browser opens the affiliate URL in a new tab (not replacing PeuterPlannen). URL includes affiliate tracking parameters: `?partner=peuterplannen&ref=detail_artis`.
5. Parent buys on Tiqets (outside our control).
6. When parent returns to PeuterPlannen tab: everything is still there. A subtle "Gelukt? Veel plezier bij Artis!" toast if they've been away > 60 seconds (heuristic that they probably completed a purchase).

**What the UI must communicate at each step:**
- Step 1: The CTA should feel helpful, not salesy. "We found you a way to buy tickets" not "BUY NOW."
- Step 1 (disclosure): Dutch law (and trust) requires disclosure. The small text is legally required and builds trust.
- Step 3: The interstitial explains the redirect so the user isn't confused by the domain change.
- Step 6: The app didn't break while they were away.

**What the system must do:**
- Affiliate URLs stored in the `locations` table or a separate `affiliates` table (`location_id`, `partner`, `url_template`, `commission_type`).
- Construct the outbound URL with tracking params. Include: `utm_source=peuterplannen`, `utm_medium=referral`, `utm_campaign=detail_page`, `utm_content={location_slug}`, plus partner-specific affiliate ID.
- Open in new tab: `window.open(url, '_blank')`.
- Track the clickout event: `affiliate_clickout` with `{partner, location_id, location_slug, source_page}`.
- Interstitial: show a centered overlay for 500ms with animated loading dots, then `window.open`.

**Edge cases:**
- Location has multiple affiliate partners (tickets via Tiqets + hotel nearby via Booking): show both, primary CTA for the most relevant one (tickets for a museum), secondary text link for the other.
- Affiliate URL is broken/expired: monitor with regular health checks. On 404 detected: hide the CTA for that location.
- User has an ad blocker that blocks the redirect: detect `window.open` returning null, show the URL as a copyable link: "Link geblokkeerd? Kopieer: [url]".
- Location has no affiliate partner: don't show any CTA. Never show a "buy tickets" button that links to a generic Google search — that's deceptive.

**Failure modes:**
- Affiliate partner's site is down: we can't control this. The clickout still works (we redirect), the broken site is their problem.
- Tracking params stripped by the affiliate (misconfigured): verify attribution setup with each partner quarterly.

**Success criteria:** > 15% of detail views for affiliate-eligible locations result in a clickout. Affiliate revenue covers hosting costs by month 6.

**Metrics signal:** `affiliate_clickout_rate`, `affiliate_clickout_by_partner`, `affiliate_revenue` (via partner dashboards), `return_after_clickout_rate`.

---

## 19. Featured Listing Disclosure Flow

**User goal:** Find good places — not unknowingly view paid advertising.

**Context of use:** Some locations pay to be featured (higher visibility in search results, promoted card in the list). Parents must be able to trust that PeuterPlannen recommendations are genuine, not bought.

**Entry point:** Any view where a featured listing appears (cards in the list, map markers, search results).

**Step-by-step journey:**

1. A featured location's card in the list has a small "Uitgelicht" label in the top-right corner of the card (muted color, not flashy). The card may appear in position 2-3 in the list (not always #1 — that would be too obvious and undermine trust).
2. The card is otherwise identical to non-featured cards: same design, same PeuterScore (real, not inflated), same information.
3. On the map: featured locations have a slightly larger marker or a subtle glow/ring. Not a different color — that would create a "paid tier" visual hierarchy that undermines the organic results.
4. In the detail view: a small text at the bottom of the hero section: "Uitgelichte vermelding" — tappable, opens a brief explainer: "Deze locatie is een uitgelichte vermelding. De PeuterScore en alle beoordelingen zijn onafhankelijk en onbepaald door de locatie-eigenaar."
5. Featured listings never:
   - Override PeuterScore (score is always independently calculated).
   - Appear as the #1 result when sorted by score (that's reserved for the genuinely best-scoring place).
   - Hide the "Uitgelicht" label — it's always visible.

**What the system must do:**
- `is_featured` boolean in the `locations` table.
- When building the sorted results list: insert featured locations at position 2-4 (not higher) if they wouldn't already appear there organically. Never push an organically high-ranked result down by more than 1 position.
- Track impressions and interactions for featured vs. non-featured to report back to paying partners.
- Featured status has an expiry date (`featured_until` timestamp). Expired features are automatically de-listed.

**Edge cases:**
- All visible results happen to be featured (in a sparse area): show all of them, but the "Uitgelicht" label on every card makes it obvious. Consider a subtle disclaimer at the top: "Sommige resultaten zijn uitgelichte vermeldingen."
- A featured location has a very low PeuterScore (< 5): still show the real score. This is a trust signal — we don't inflate scores for money.
- Partner complains their featured listing is at position 4 instead of 1: explain the editorial policy. Position 1 is earned, not bought.

**Failure modes:**
- "Uitgelicht" label gets cut off in card layout: test on all screen widths, use abbreviation "Uitg." if space-constrained.
- Featured location expires but cache hasn't refreshed: set cache TTL for featured metadata to 1 hour max.

**Success criteria:** User survey: > 80% of users report trusting PeuterPlannen's recommendations after learning about the featured model. Featured clickthrough rate within 1.5x of organic rate (not dramatically higher, which would suggest deceptive prominence).

**Metrics signal:** `featured_impression_rate`, `featured_ctr_vs_organic_ctr`, `featured_to_affiliate_conversion`, `trust_survey_score`.

---

## 20. Future Owner/Partner Flow — Venue Claiming

**User goal:** A venue owner (e.g., the manager of Kinderboerderij De Werf) wants to claim their listing and update information.

**Context of use:** Future state. The owner found their venue on PeuterPlannen and wants to correct opening hours, add better photos, or sign up for featured placement.

**Entry point:** "Is dit jouw locatie?" link at the bottom of every detail page.

**Step-by-step journey (planned, not built):**

1. Owner taps "Is dit jouw locatie?" at the bottom of their location's detail page.
2. Opens a form: business email, role (eigenaar/manager/medewerker), message.
3. After submission: confirmation page. "We nemen binnen 2 werkdagen contact op."
4. **Verification (manual initially):** PeuterPlannen team verifies ownership via email domain match, Google Maps listing cross-reference, or phone call.
5. After verification: owner gets a simple dashboard (future) or receives a form to submit updates (MVP).
6. Owner can update: opening hours, photos (max 5, moderated), description, facilities info. Cannot update: PeuterScore, type categorization, or age ranges (these are editorially controlled).
7. After updates: changes are flagged for editorial review. Approved changes go live within 24h.

**What to build NOW for forward-compatibility:**
- "Is dit jouw locatie?" link on every detail page that opens a mailto: link to a dedicated email address (e.g., locaties@peuterplannen.nl) with the location name pre-filled in the subject.
- Track clicks on this link as a signal of owner interest.
- Store a `claimed_by_email` field in the locations table (nullable) for future use.

**Failure modes:**
- Fraudulent claims (someone claims a venue they don't own): manual verification prevents this. Never auto-approve.
- Owner submits spammy/marketing content as a description: editorial review catches this.

**Success criteria (future):** > 10% of locations claimed within year 1. Claimed locations have 20% better data quality (more photos, accurate hours).

**Metrics signal:** `claim_link_click_rate`, `claim_submission_rate`, `claim_verification_success_rate`, `claimed_location_data_completeness`.

---

## 21. Future Social Login Flow

**User goal:** Create an account quickly using an existing identity (Google, Apple, Facebook).

**Context of use:** Future state. Parent has been using PeuterPlannen anonymously and now wants to sync favorites across devices, or has been prompted after their 5th save (flow 14).

**Entry point:** "Account aanmaken" button from Bewaard tab or settings.

**Step-by-step journey (planned, not built):**

1. Parent taps "Account aanmaken" or "Inloggen".
2. A clean modal appears with three buttons:
   - "Ga door met Google" (Google brand colors/logo)
   - "Ga door met Apple" (Apple brand colors/logo)
   - "Ga door met Facebook" (Facebook brand colors/logo)
   - No email/password option in v1 — reduces complexity and support burden.
3. Parent taps Google. Standard OAuth flow in popup/redirect.
4. After auth: welcome screen. "Welkom, Lisa! Je bewaarde plekken zijn nu gesynchroniseerd." Migration from localStorage happens silently (flow 14).
5. User's name and avatar appear in a small profile pill in the top corner. No complex settings page — just: name, email, "Uitloggen".

**What the system must do (future):**
- Supabase Auth with Google, Apple, and Facebook providers (built-in support).
- Create `users` table: `id` (UUID from Supabase Auth), `display_name`, `avatar_url`, `created_at`, `last_active_at`.
- On first login: run localStorage → Supabase favorites migration.
- JWT token stored in httpOnly cookie (not localStorage — security).
- Auth state checked on app load. If valid session: show logged-in UI. If expired: silently refresh token.

**What value auth unlocks (ordered by user value):**
1. Cross-device favorites sync
2. Collaborative lists (shared with partner)
3. Personalized recommendations (based on saved types/regions)
4. Review/rating submission
5. Owner verification (flow 20)

**What to build NOW for forward-compatibility:**
- Abstract all user-specific state (favorites, preferences) behind service modules.
- Use anonymous UUIDs in localStorage that can be linked to a future user account.
- Reserve space in the UI for a profile element (top-right corner).

**Failure modes (future):**
- OAuth popup blocked by browser: detect and show "Popup geblokkeerd? Probeer het opnieuw of sta popups toe voor peuterplannen.nl."
- Token refresh fails: gracefully degrade to anonymous mode. Don't show error screens — just lose sync until next login.
- Apple private relay email: accept it. Don't require a "real" email for basic features.

**Success criteria (future):** > 15% of multi-session users create an account. > 80% of account creations use Google (predict based on Dutch market demographics).

**Metrics signal (future):** `auth_modal_shown_rate`, `auth_provider_choice`, `auth_success_rate`, `post_auth_favorites_migration_count`.

---

## 22. Future Premium/Paid Feature Flow

**User goal:** Access advanced features that justify a small payment.

**Context of use:** Future state (year 2+). Parent is a power user — uses PeuterPlannen weekly, has 50+ saved places, wants more depth.

**Entry point:** Locked feature indicators in the UI, or an upgrade prompt after heavy usage.

**Step-by-step journey (planned, not built):**

1. **Free tier** (current + near-future): all discovery, map, filtering, saving, sharing. The core app is always free.
2. **Potential premium features** (speculative, validate demand first):
   - **Dagplanner**: build an optimized day itinerary from saved places (route optimization, time estimates, lunch stop suggestions). Currently free as basic list, premium as optimized route.
   - **Vergelijker**: side-by-side comparison of 2-3 places with detailed score breakdowns. Free version: sequential detail views. Premium: true split-screen comparison.
   - **Seizoensgids**: curated seasonal content (best autumn walks, summer splash spots, winter indoor options). Updated monthly by editorial team.
   - **Offline kaarten**: download full region data + tiles for offline use in specific areas.
   - **Advertentievrij**: remove featured listing indicators (already subtle, but some parents may prefer pure organic results).
3. **Pricing model** (if validated): ~EUR 1.99/month or EUR 14.99/year ("minder dan een koffie per maand").
4. **Payment**: Stripe integration via Supabase, or Apple/Google in-app purchase if distributed via app stores.

**What NOT to put behind a paywall:**
- Basic search, map, filtering, detail views — core discovery must always be free.
- PeuterScores — these are the trust signal. Hiding them would undermine the product.
- Saving/sharing — too fundamental, and localStorage is free to us anyway.
- Any safety-relevant information (age ranges, facilities).

**What to build NOW for forward-compatibility:**
- Track feature usage deeply: which users visit the plan tab, how many places they compare, whether they save seasonal content. This data validates which features have premium potential.
- Build the day planner as a free MVP first. If engagement is high, it's a premium candidate.

**Failure modes (future):**
- Premium conversion is too low (< 2%): pivot to pure affiliate + featured listing revenue model.
- Users feel nickel-and-dimed: keep free tier genuinely useful. Premium should feel like "bonus," not "unlocking what should be free."

**Success criteria (future):** > 3% of monthly active users convert to premium. LTV > EUR 20 per premium user per year.

**Metrics signal (future):** `premium_feature_discovery_rate`, `upgrade_prompt_conversion`, `premium_churn_rate`, `premium_feature_usage_by_type`.

---

## 23. SEO Landing on a Region/Type Page

**User goal:** Parent Googled "speeltuinen amsterdam" and landed on a PeuterPlannen page. They want to find a good playground in Amsterdam.

**Context of use:** The parent has never heard of PeuterPlannen. They're on a Google search results page, see our listing ("Beste speeltuinen in Amsterdam — PeuterPlannen"), and tap it. First impression must earn trust and deliver value immediately.

**Entry point:** URL like `/amsterdam/speeltuinen` — this is a route within the unified app shell, not a separate marketing page.

**Step-by-step journey:**

1. Page loads. **It renders inside the same map + sheet/sidebar layout as the rest of the app.** The server pre-renders the content inside the sheet/sidebar container:
   - **Map**: centered on Amsterdam with speeltuin markers visible
   - **Sheet/sidebar content** (SSR HTML):
     - **Back button** (top left) + breadcrumb: Home → Amsterdam → Speeltuinen
     - **H1**: "De 12 beste speeltuinen in Amsterdam voor peuters"
     - **Intro paragraph**: 2-3 sentences of editorial context
     - **Filter chips** — "Speeltuinen" pre-selected, other filters available
     - **Card list**: the top 12 speeltuinen in Amsterdam, sorted by PeuterScore. Each card shows: photo, name, PeuterScore, one-line summary
   - The user already sees the map with markers. There is no "Open in app" CTA — they are already IN the app.

2. After hydration (< 1s): the map becomes interactive. Cards become tappable. Filters work. The user has the full app experience.

3. Parent scans the list. Taps "Vondelpark Speeltuin" card.

4. URL changes to `/amsterdam/vondelpark-speeltuin`. Browse sheet hides, detail sheet opens with the location's full information. Map zooms to the location. This is flow 9 — seamless, no page navigation, no layout change.

5. Back button → returns to `/amsterdam/speeltuinen`, browse sheet restores with the filtered list.

**What the UI must communicate at each step:**
- Step 1: "We're experts on this topic. We've done the research." The editorial voice builds trust.
- Step 1 (cards): "These are ranked by quality, not by who paid us." PeuterScore is the trust anchor.
- Step 3: "Want to explore more? Here's the full interactive experience."

**What the system must do:**
- Pre-render collection pages at build time (static site generation). One page per region × type combination: `/amsterdam/speeltuinen/`, `/rotterdam/kinderboerderijen/`, etc.
- Pull data from Supabase at build time. Rebuild daily (or on data change via webhook).
- SEO metadata: `<title>`, `<meta description>`, OpenGraph tags, structured data (JSON-LD `ItemList` with `ListItem` entries).
- Internal linking: each collection page links to related collections ("Zie ook: Kinderboerderijen in Amsterdam", "Speeltuinen in Utrecht").
- Canonical URLs and proper `rel="alternate"` if there are near-duplicate pages.

**Edge cases:**
- Collection has < 3 results (sparse area/type): still show the page but add a section: "We zijn nog bezig dit gebied in kaart te brengen. Ken je een goede plek? Laat het ons weten!"
- Collection page data becomes very stale (> 7 days without rebuild): show a "Laatst bijgewerkt" date. Trigger a rebuild alert.
- Googlebot crawls before the page is rebuilt with latest data: this is fine — slightly stale data is better than no data. Rebuild frequency handles freshness.

**Failure modes:**
- Page not indexed by Google (noindex tag accidentally set, or thin content penalty): monitor Google Search Console weekly. Ensure no accidental noindex.
- User lands but JavaScript fails: the page must be fully readable without JS. Cards, text, images are all server-rendered HTML. Only the filter chips and map embed need JS.
- Duplicate content across similar pages ("/amsterdam/speeltuinen/" vs. "/amsterdam/speeltuinen-voor-peuters/"): maintain strict URL taxonomy. One canonical page per region × type.

**Success criteria:** SEO pages account for > 40% of total traffic within 6 months. Bounce rate < 50%. > 30% of SEO visitors click through to the app or a detail page.

**Metrics signal:** `seo_landing_traffic_by_page`, `seo_bounce_rate`, `seo_to_app_conversion_rate`, `seo_to_detail_click_rate`, `google_search_console_impressions_clicks`.

---

## 24. Landing on a Location Detail Page from Google

**User goal:** Parent Googled "artis met peuter" and landed directly on the PeuterPlannen detail page for Artis. They want specific info about visiting Artis with a toddler.

**Context of use:** The parent is actively planning and is looking for parent-specific intel that the official Artis website doesn't provide (buggy-friendliness, noise level, is the food any good for adults, where to park with a stroller).

**Entry point:** URL `/amsterdam/artis` — this is a route within the unified app shell, not a separate page.

**Step-by-step journey:**

1. Page loads. **It renders inside the same map + sheet/sidebar layout as the rest of the app.** The server pre-renders the detail content inside the sheet/sidebar container:
   - **Map**: centered on Artis with the marker highlighted
   - **Detail sheet/sidebar content** (SSR HTML):
     - **H1**: "Artis met je peuter — PeuterPlannen Review"
     - Hero photo (full width in sheet)
     - PeuterScore prominently displayed
     - Quick-info row (weather, age, price, type)
     - Full editorial review
     - Score breakdown with detailed explanations
     - Opening hours, address, parking info
     - "Koop tickets" affiliate CTA (flow 18)
     - "Vergelijkbare plekken" section linking to 3-4 nearby alternatives
     - Breadcrumb: Home → Amsterdam → Artis
   - The user is immediately IN the app — they see the map with the location pin. No "Open in app" CTA needed.

2. After hydration: map becomes interactive. Save/share buttons work. Nearby locations are tappable. The user has the full app experience.

3. Parent reads the review. Checks the score breakdown. Sees parking is 4/5 ("Parkeergarage Artis, EUR 4/uur"). Decides to go.

4. Taps "Koop tickets via Tiqets" → flow 18. OR taps "Route" to navigate directly.

5. Parent taps a nearby location card (e.g., NEMO) → URL changes to `/amsterdam/nemo`, detail sheet crossfades to NEMO's content, map pans to NEMO. This is flow 11 — seamless within the app shell.

6. Parent taps back → returns to Artis detail. Taps back again → URL changes to `/amsterdam`, browse sheet shows Amsterdam region guide. The user is now browsing Amsterdam — fully in the app, from a single Google click.

**What the UI must communicate at each step:**
- Step 1: "We visited this place as parents and here's our honest assessment." The editorial voice is parent-to-parent, not corporate.
- Score breakdown: "Here's exactly what you need to know, dimension by dimension."
- Breadcrumb: "This place exists within our broader coverage of Amsterdam."

**What the system must do:**
- Pre-render detail pages at build time (one per location): `/amsterdam/artis/`, `/rotterdam/plaswijckpark/`, etc.
- SEO metadata: `<title>`: "Artis met je peuter — Review & PeuterScore | PeuterPlannen", `<meta description>`: practical summary, structured data (JSON-LD `LocalBusiness` or `TouristAttraction` with `aggregateRating` mapped from PeuterScore).
- Internal linking: breadcrumbs, related locations, collection pages.
- Affiliate CTA: only show if an affiliate relationship exists for this location.
- Nearby location cards: tappable, URL changes to the nearby location's detail route within the same app shell.

**Edge cases:**
- Location has very sparse data (no editorial review, few scores): show what's available with a "We zijn deze locatie nog aan het beoordelen" note. Don't serve a thin page — either have enough content to be useful or redirect to the collection page with an anchor to this location.
- Location is permanently closed: show the page with a prominent "Let op: deze locatie is gesloten" banner. Keep the page live (it may still get search traffic, and we can redirect that attention to alternatives). Show the "Vergelijkbare plekken" section prominently.
- URL slug changes (location renamed): set up 301 redirects from old slug to new slug.

**Failure modes:**
- Structured data errors (Google Search Console reports): validate JSON-LD with Google's Rich Results Test tool before deploy.
- Stale opening hours shown on the SEO page: add a disclaimer "Openingstijden kunnen afwijken — check de website van [location name]" with a link.
- Page is duplicate of the in-app detail view (canonical confusion): the SEO page and the in-app detail view have different URLs and different `<link rel="canonical">` tags. SEO page is canonical for Google. In-app view is for app users.

**Success criteria:** Detail pages from Google have > 60% scroll depth (users actually read the content). > 20% of Google detail page visitors click an affiliate link or interact with the map/nearby locations. These pages rank in top 5 for "[location name] met peuter/kleuter" queries within 3 months.

**Metrics signal:** `seo_detail_traffic`, `seo_detail_scroll_depth`, `seo_detail_to_affiliate_rate`, `seo_detail_to_app_rate`, `google_ranking_position_by_keyword`.

---

## 25. Guides Discovery — Browsing Content in the Sheet

**User goal:** Discover curated guides and articles about toddler-friendly outings, directly in the app.

**Context of use:** Parent is on the home screen, browsing the sheet, and scrolls past the contextual suggestions to the "Gidsen" section. They see guide cards like "Amsterdam met peuters" or "Regendag activiteiten". This is the Apple Maps Guides model — editorial content rendered in the sidebar/sheet, not on a separate blog page.

**Entry point:** Home screen (sheet/sidebar), scrolled to the "Gidsen" section. Or `/guides` directly.

**Step-by-step journey:**

1. Parent is on `/` (home). Browse sheet shows contextual suggestions at the top, then a "Gidsen" section with guide cards: hero carousel of featured guides + card grid of latest guides.
2. Parent taps "Amsterdam met peuters" guide card.
3. URL changes to `/amsterdam`. Map flies to Amsterdam. Browse sheet content transitions to the Amsterdam region guide: hero image, intro text, type grid, top locations, editorial content.
4. Parent scrolls through the guide in the sheet. Sees top locations as cards. Taps "Artis" card.
5. URL changes to `/amsterdam/artis`. Browse sheet hides, detail sheet opens with Artis info. Map zooms to Artis.
6. Parent taps back → returns to `/amsterdam` region guide. Can continue browsing the guide.

**What the UI must communicate:**
- Guides are part of the app, not a separate "blog" section. They live in the sheet, with the map responding to the content.
- Tapping a location in a guide opens its detail — same interaction as tapping a search result card.
- The map context enhances the guide: when reading about Amsterdam locations, you see them on the map.

**What the system must do:**
- Guides section on home: fetch editorial pages from Supabase (type: 'guide') + region hub data.
- Region guides: pre-render as SSG pages within the `(app)` layout.
- Guide → location transitions: same detail sheet mechanism as browse → detail.
- Map animation: fly to the region when a guide is opened.

**Success criteria:** > 15% of home screen sessions scroll to the guides section. > 30% of guide viewers tap through to a location detail.

---

## 26. Blog/Article Reading in the Sheet

**User goal:** Read an article about toddler outings, with the map providing ambient context.

**Context of use:** Parent found a blog post via Google ("beste uitjes amsterdam peuters") or tapped a blog card in the guides section. The article renders in the sheet/sidebar — not on a separate page.

**Entry point:** `/blog/beste-uitjes-amsterdam-peuters` — renders in the app shell.

**Step-by-step journey:**

1. Page loads within the unified app shell. Map shows NL overview or Amsterdam (if article is Amsterdam-specific). Sheet/sidebar shows the article content.
2. **Sheet/sidebar content** (SSR HTML):
   - Back button (top left) + Share button (top right)
   - Hero image (full width in sheet)
   - Title (h1), author badge, date, reading time
   - Article body with embedded location cards
   - Map shows markers for all locations mentioned in the article
3. Parent reads the article. Taps an embedded "Artis" location card.
4. URL changes to `/amsterdam/artis`. Article sheet hides, detail sheet opens for Artis. Map zooms to Artis.
5. Back button → returns to the article, scrolled to the same position.

**What the system must do:**
- Blog posts render as SSG pages within `(app)` layout.
- Referenced locations: extract location IDs from frontmatter, show their markers on the map.
- Embedded location cards in article body: MDX component that renders a tappable card linking to the location's detail route.
- Scroll position preservation: store scroll position before navigating to detail.

**Success criteria:** Blog pages within the app shell have > 60% scroll depth and > 20% click-through to a location detail.

---

## 27. Partner Flow — "Heb je een locatie?"

**User goal:** A venue owner wants to claim or manage their listing on PeuterPlannen.

**Context of use:** The venue owner sees the "Heb je een locatie? Beheer je listing →" link in the sheet footer while browsing the app. Or they found their venue's detail page and want to update information.

**Entry point:** Link in sheet/sidebar footer, or "Is dit jouw locatie?" link at bottom of location detail sheet.

**Step-by-step journey:**

1. Owner taps "Heb je een locatie? Beheer je listing →" in the sheet footer.
2. Browser navigates to `/partner` — this is in the `(portal)` route group with a separate layout (no map, no sheet).
3. Partner portal page loads: clean, professional layout with information about claiming a listing, updating details, and featured placement options.
4. Owner fills out the contact/claim form.

**Key difference from the old plan:** The link to `/partner` is the ONLY place where users leave the app shell (aside from legal pages). There is no separate "voor-bedrijven" marketing page — the partner portal IS the B2B page.

---

## 28. Legal Pages — Outside the App Shell

**User goal:** Read privacy policy, terms, or about page.

**Context of use:** User clicks Privacy, Voorwaarden, or Over in the sheet/sidebar footer.

**Entry point:** Link in sheet/sidebar footer.

**Step-by-step journey:**

1. User taps "Privacy" in the sheet footer.
2. Browser navigates to `/privacy` — this is in the `(legal)` route group with a minimal layout (no map, no sheet, just simple page content).
3. User reads the content. Navigates back to the app via browser back button or "← Terug naar PeuterPlannen" link.

**Key point:** Legal pages are the only other pages outside the app shell. They don't need the map — they're reference content.

---

## Cross-cutting concerns

### Navigation model

The app has a clear navigation hierarchy. The app IS the website — all navigation happens within the unified map + sheet/sidebar layout (except partner portal and legal pages).

```
Bottom tabs: Ontdek (map+sheet) | Kaart | Bewaard | Plan

Within the app shell:
  Home (suggestions+guides) → Region guide → Type list → Detail → Compare
                                                       ↓
                                                    Filters (modal)

URL structure (all within (app) layout):
  /                              → home: map + suggestions + guides
  /amsterdam                     → region guide in sheet, map centered
  /amsterdam/speeltuinen         → filtered list in sheet, map with markers
  /amsterdam/artis               → detail in sheet, map zoomed to location
  /blog/slug                     → article in sheet, map ambient
  /guides                        → guides overview in sheet

Outside the app shell:
  /partner                       → partner portal (separate layout)
  /privacy, /terms, /about, /contact → legal pages (minimal layout)
```

Back button behavior:
- Detail sheet → dismiss detail sheet, browse sheet returns to previous position
- Region guide → home
- Filtered list → region guide (or home)
- Article → wherever the user came from
- Filter modal → whatever was behind it

### Error handling philosophy

- Never show raw error messages. Always show Dutch, friendly, actionable text.
- Always offer a next step: retry, alternative path, or contact.
- Errors should feel temporary ("even geduld") not permanent ("fout").
- Log errors to a lightweight client-side error tracker (Sentry or custom).

### Performance budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.2s | Lighthouse, 4G throttled |
| Largest Contentful Paint | < 2.5s | Lighthouse, 4G throttled |
| Time to Interactive | < 3.0s | Lighthouse, 4G throttled |
| Total JS bundle size | < 150KB gzipped | Build output |
| Location index payload | < 80KB gzipped | Network tab |
| Sheet transition (60fps) | 0 dropped frames | Chrome DevTools |
| Marker tap to preview | < 100ms | Performance.mark() |
| Detail data fetch | < 500ms | Network + render |

### Accessibility requirements

- All interactive elements: minimum 44x44px tap target.
- Color contrast: WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components).
- Sheet states announced to screen readers (`aria-live` on state change).
- Map markers accessible via keyboard (Tab to focus, Enter to select).
- All images have descriptive `alt` text (auto-generated from location name + type if no custom alt).
- Reduced motion: respect `prefers-reduced-motion`. Disable animations, use instant transitions.

### Analytics event taxonomy

Every flow above references metrics. Here's the unified event structure:

```javascript
track(eventName, {
  // Always included:
  session_id,
  timestamp,
  platform,        // 'mobile' | 'desktop' | 'pwa'
  city,            // current active city or null

  // Flow-specific:
  location_id,     // when a specific place is involved
  location_type,   // 'speeltuin', 'kinderboerderij', etc.
  source,          // 'map_marker', 'card_tap', 'search', 'seo_landing'
  filters_active,  // serialized active filter state
  sheet_state,     // 'peek', 'half', 'full'
  duration_ms,     // for timed events
})
```

Key events: `app_load`, `city_set`, `filter_change`, `card_tap`, `marker_tap`, `detail_view`, `detail_scroll`, `save_action`, `share_action`, `affiliate_clickout`, `search_query`, `search_select`, `empty_state`, `error`.

---

*This document describes the complete user flow surface area for PeuterPlannen v2. Every flow is designed for a one-handed parent on an iPhone who needs to decide "waar gaan we heen?" in under 60 seconds.*
