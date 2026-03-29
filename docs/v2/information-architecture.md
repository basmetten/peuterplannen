# Information Architecture — PeuterPlannen v2

Phase 0 documentation for the Next.js App Router rebuild.

**Core principle: The app IS the website.** There is no separate marketing site. Every page on peuterplannen.nl renders within the same map + sheet/sidebar layout, like Apple Maps (maps.apple.com). Guides, search results, place details, region hubs — everything renders in the sidebar/sheet with the map behind it.

---

## 1. Route Structure

### Route Groups

The app uses three Next.js route groups:

- `app/(app)` — Unified app shell: map + sheet/sidebar for everything. This is the core experience and covers 95% of the site.
- `app/(portal)` — Separate layout, NO map. Partner and admin dashboards.
- `app/(legal)` — Simple minimal pages, NO map. Privacy, terms, about, contact.

The `(app)` group includes one root layout with the persistent map, sheet (mobile), and sidebar (desktop). SEO pages (region hubs, location details, guides) are routes within this layout — Google gets SSR HTML with real content; users see the map-first experience.

### App Routes (`app/(app)`)

All routes below share the unified app shell: map background + sheet (mobile) / sidebar (desktop). Content renders in the sheet/sidebar. The map persists across navigations.

| Route | Example | Rendering | Description |
|---|---|---|---|
| `/` | — | SSR (ISR) | Home: map + browse sheet with contextual suggestions + guides section |
| `/[region]` | `/amsterdam` | SSG (ISR) | Map centered on region + sheet with region guide content (intro, type grid, top locations) |
| `/[region]/[type]` | `/amsterdam/speeltuinen` | SSG (ISR) | Map with type markers + sheet with filtered location list |
| `/[region]/[slug]` | `/amsterdam/artis` | SSR | Map centered on location + detail sheet open with full content |
| `/blog/[slug]` | `/blog/beste-uitjes-amsterdam` | SSG | Map background + sheet with article content |
| `/guides` | — | SSG (ISR) | Sheet with guides overview (featured, latest, by city) |

**Route conflict resolution:** `/[region]` and potential catch-all patterns share slug space at the root level. Resolution order:

1. Check against known static routes: `blog`, `guides`
2. Check against the ~22 known region slugs: `amsterdam`, `rotterdam`, `utrecht`, `den-haag`, etc.
3. If neither matches → 404

Implementation: use `generateStaticParams` for regions, and explicit route segments for `blog` and `guides`.

### Portal Routes (`app/(portal)`)

Separate layout — no map, no sheet. Standard page layout for authenticated/dashboard experiences.

| Route | Description |
|---|---|
| `/partner` | Partner portal landing: claim/manage listing |
| `/partner/dashboard` | Partner dashboard (future) |
| `/admin` | Admin dashboard (future) |

### Legal Routes (`app/(legal)`)

Minimal layout — no map, no sheet. Simple content pages.

| Route | Description |
|---|---|
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/about` | About PeuterPlannen |
| `/contact` | Contact form |

### Static / Utility Routes

| Route | Description |
|---|---|
| `/sitemap.xml` | Dynamic sitemap (all ~2200 pages) via `app/sitemap.ts` |
| `/robots.txt` | Standard robots via `app/robots.ts` |
| `/manifest.json` | PWA manifest |
| `/api/og/[...path]` | OG image generation |

---

## 2. Navigation Model

There is no traditional website navigation (header with nav links, footer with sitemap). The sheet/sidebar IS the navigation — just like Apple Maps.

### Mobile Navigation

**Sheet mode switcher** — compact pills inside the sheet header, below the drag handle. There is NO bottom tab bar. The sheet IS the navigation container, like Apple Maps web (maps.apple.com).

| Mode | Label | Sheet Content | Map State |
|---|---|---|---|
| Ontdek | "Ontdek" | Search, filters, suggestions, cards, guide previews | All/filtered markers |
| Bewaard | "Bewaard" + count badge | Saved location cards | Favorited location markers only, fit bounds |
| Plan | "Plan" + count badge | Ordered day plan list | Planned stops with numbered badges + route lines |

**Why no tab bar:**
- Saves 49px of screen real estate on mobile (plus safe-area)
- Keeps everything inside the sheet (Apple Maps web model — no external navigation)
- The map is always accessible by dragging the sheet down — no need for a "Kaart" tab
- Modes are content variants within the same sheet, not separate destinations

**Mode switcher behavior:**
- Pills are sticky at the top of the sheet (below drag handle, above scrollable content)
- Switching mode changes sheet content AND map markers — map viewport preserved
- Active pill: accent background + white text. Inactive: `bg-secondary` + `label-secondary`
- Bewaard/Plan pills show count badge (small, like Apple notification badges) when > 0
- Tapping the active mode pill scrolls its content to top / resets sheet to default state
- When detail view is open, mode pills are hidden (detail has its own back button)
- Returning from detail restores the previous mode

**Mode switcher design:**
- Pill height: ~32px, row total ~44px with padding
- Pill shape: rounded-full, subtle background
- Positioned directly below drag handle, horizontally centered
- Consistent with Apple Maps web panel header aesthetic

### Desktop Navigation

**Persistent sidebar** (left, ~380px wide) — Apple Maps style:

- Top: PeuterPlannen logo + sidebar toggle
- Navigation: Search bar + filter chips
- Content area: depends on active route (browse cards, detail, guide content, region hub)
- Footer (always visible at bottom of sidebar): "Heb je een locatie? Beheer je listing →" + Privacy · Voorwaarden · Over

**Sidebar states:**
1. **Browse state** — contextual suggestions + guides section (home)
2. **List state** — scrollable location cards with filter chips (after search/filter)
3. **Detail state** — location detail panel (replaces list, back button at top)
4. **Guide state** — guide/article content (region hub, blog post)
5. **Plan state** — itinerary builder
6. **Favorites state** — saved locations

### Sheet/Sidebar Content by Route

| Route | Sheet/Sidebar Content | Map State |
|---|---|---|
| `/` | Contextual suggestions + "Gidsen" section with guide cards | NL overview or user's last city |
| `/amsterdam` | Region guide: intro, type grid, top locations, editorial content | Centered on Amsterdam, markers visible |
| `/amsterdam/speeltuinen` | Filtered list: all speeltuinen in Amsterdam | Centered on Amsterdam, type markers only |
| `/amsterdam/artis` | Full location detail (peek → half → full) | Centered on Artis, marker highlighted |
| `/blog/beste-uitjes` | Article content (scrollable in sheet/sidebar) | Ambient map, markers for mentioned locations |
| `/guides` | Guide overview: featured, latest, by city | NL overview |

### Navigation Within the App Shell

All navigation happens within the sheet/sidebar. The map transitions smoothly between states.

| Action | Result |
|---|---|
| Tap region card on home | URL → `/amsterdam`, map flies to Amsterdam, sheet shows region guide |
| Tap type in region guide | URL → `/amsterdam/speeltuinen`, sheet shows filtered list |
| Tap location card | URL → `/amsterdam/artis`, browse sheet hides, detail sheet opens |
| Back from detail | URL pops, detail sheet hides, browse sheet restores |
| Tap guide card | URL → `/blog/slug`, sheet shows article content |
| Tap "Heb je een locatie?" in footer | URL → `/partner` (separate layout, exits app shell) |
| Tap Privacy/Terms/About in footer | URL → `/privacy` etc. (separate layout, exits app shell) |

### Deep Link Handling

| Input | Behavior |
|---|---|
| `/amsterdam/artis` | App shell loads, map centers on Artis, detail sheet opens |
| `/amsterdam` | App shell loads, map centers on Amsterdam, sheet shows region guide |
| `/amsterdam/speeltuinen` | App shell loads, map shows speeltuin markers, sheet shows filtered list |
| Shared link (native share) | Generate `/amsterdam/artis` URL (same app shell URL — it's the canonical URL) |

### History Management

- **Within app shell:** use `window.history.replaceState` for filter/viewport changes (no history stack pollution). Use `pushState` for meaningful navigation: opening a location detail, switching to a region, opening a guide.
- **Back button in detail view:** pops back to list/map state (previous `pushState` entry).
- **Back button from guide:** returns to browse/home state.
- **Portal/legal pages:** standard Next.js navigation with full page loads between route groups.

---

## 3. Screen Inventory

### 3.1 Home (`/`)

The home screen IS the app. No separate landing page. Users land directly on the map with the browse sheet showing contextual content.

**Browse sheet content (mobile) / Sidebar content (desktop):**

1. **Search bar** at top (always visible)
2. **Contextual suggestion rows** — time/weather-based (4-6 rows with SVG icon + label, like Apple Maps "Find Nearby")
3. **"Gidsen" section** — guide cards organized by:
   - Featured guides (hero card carousel)
   - Latest guides
   - By city (Amsterdam, Rotterdam, Utrecht, etc.)
4. **Popular locations** — top-scored nearby (if location known) or nationwide

**Map state:** NL overview (zoom ~7) or user's last city. Markers visible when zoomed in.

**Data needed:** Weather data (Open-Meteo), guide/editorial content, featured locations.

**SEO:** SSR with contextual content. `<title>`: "PeuterPlannen — Ontdek de leukste uitjes met je peuter". Structured data: `WebSite` + `Organization` + `SearchAction`.

### 3.2 Region Guide (`/[region]`)

A region page renders as a guide in the sheet/sidebar, with the map centered on the region.

**Sheet/sidebar content:**

1. **Back button** (top left) — returns to home
2. **Region hero image** (full width in sheet)
3. **Region name** (h1) + intro paragraph
4. **Type grid** — 8 type cards filtered to this region (icon + name + count)
5. **Top locations** — 6-8 highest-scored cards
6. **Editorial content** — region-specific tips, seasonal highlights
7. **Nearby regions** — horizontal scroll of region cards

**Map state:** Centered on region bounds, markers visible for all locations in region.

**Data needed:** Region metadata, location counts by type, top locations, nearby regions.

**SEO:** SSG with ISR. Full HTML content server-rendered in the sheet. Structured data: `ItemList` + `BreadcrumbList`.

### 3.3 City+Type Combo (`/[region]/[type]`)

**Sheet/sidebar content:**

1. **Back button** + breadcrumb (Region → Type)
2. **Header** — h1 "[Type] in [Region]", location count
3. **Filter chips** — active type pre-selected, additional filters available
4. **Location cards** — all locations matching region+type, sorted by score

**Map state:** Centered on region, only matching type markers visible.

**Data needed:** Locations filtered by region+type.

**SEO:** SSG with ISR. Structured data: `ItemList` + `BreadcrumbList`.

### 3.4 Location Detail (`/[region]/[slug]`)

Renders in a **detail sheet** (mobile) or sidebar detail panel (desktop). The detail sheet replaces the browse sheet — only one is visible at a time.

**Mobile detail sheet states:**
1. **Peek state** — name, type, score, open/closed, thumbnail
2. **Half state** — action buttons, quick-info row, description intro, hero photo
3. **Full state** — complete detail (scrollable): score breakdown, practical info, opening hours, nearby locations

**Desktop sidebar:**
- Full detail visible in sidebar panel (scrollable)
- Map zoomed to location on right side

**Content (server-rendered for SEO, interactive after hydration):**
1. Location name (h1), type badge, region
2. Hero image gallery
3. PeuterPlannen score + breakdown
4. Key facts: address, opening hours, price range, age range
5. Description / editorial review
6. Practical info (parking, public transport, facilities)
7. Map with pin
8. Nearby locations (4-6 cards)
9. JSON-LD structured data

**Data needed:** Full location record, images, score breakdown, nearby locations.

**SEO:** SSR (graduation check at request time). Full HTML rendered in the sheet container. Googlebot sees complete content. Structured data: type-specific schema + `BreadcrumbList`.

### 3.5 App — Map + Browse (`/`)

**Mobile — sheet states:**

| State | Content | Map visibility |
|---|---|---|
| **Peek** (~15% height) | Search bar + suggestion count + drag handle | Full map visible |
| **Half** (~50% height) | Search bar + filters + scrollable cards or guide content | Map visible above sheet |
| **Full** (100% height) | Full scrollable content (cards, guides, or detail) | Map hidden |

**Desktop:**
- Sidebar (left, 380px): search, filters, scrollable content
- Map (right, remaining width): always visible
- No sheet concept; sidebar is always visible

**Key interactive elements:**
- Search bar: type-ahead with location/region/type suggestions
- Filter chips: 8 type filters + "Gratis" + age range + distance
- Location cards: tap → URL changes, detail opens
- Map markers: tap → highlight card + scroll to it
- Map viewport change → update visible cards (debounced)
- Guide cards: tap → URL changes, guide content loads in sheet

**Loading state:** Map loads immediately (tiles). Cards show skeleton (3 placeholder cards). Markers appear as data arrives.

**Empty state:** "Geen locaties gevonden" with suggestion to zoom out or change filters.

### 3.6 Blog/Article (`/blog/[slug]`)

Renders in the sheet/sidebar, with the map as ambient background. Map shows markers for locations mentioned in the article.

**Sheet/sidebar content:**

1. **Back button** (top left)
2. **Hero image** (full width)
3. **Title** (h1), author, date, reading time
4. **Article body** — Markdown/MDX rendered content with:
   - Embedded location cards (clickable → `/[region]/[slug]`, opens detail in sheet)
   - Images with captions
   - h2/h3 subheadings
5. **Related locations** — cards for all locations mentioned
6. **Related articles** — 2-3 related posts

**Map state:** Ambient/zoomed out, with markers for mentioned locations.

**Data needed:** Article content (Markdown/MDX), referenced location IDs.

### 3.7 Guides Overview (`/guides`)

**Sheet/sidebar content:**

1. **Section header** — "Gidsen"
2. **Featured guides** — hero card carousel
3. **Latest** — card grid
4. **By city** — city cards (photo + city name + location count)
5. **Browse by type** — type cards linking to guide collections

**Map state:** NL overview.

### 3.8 App — Favorites (Bewaard mode)

Activated via sheet mode switcher pill. Content renders in the same sheet container — the user never leaves the map.

**Sheet content:**
- Count header ("3 bewaarde locaties")
- Saved location cards (stored in localStorage, synced to Supabase if authenticated)
- Cards are tappable → opens detail view (same flow as Ontdek mode)
- Empty state: illustration + "Je hebt nog geen favorieten" + CTA to explore

**Map state:** Shows markers ONLY for saved locations. Fits bounds to show all favorites.
**Desktop:** Same content in sidebar, same map behavior.

### 3.9 App — Plan (Plan mode)

Activated via sheet mode switcher pill. Content renders in the same sheet container.

**Sheet content:**
- Header "Jouw dagplan"
- Ordered list of planned locations (drag to reorder)
- Route visualization on map (connecting lines between stops)
- Time estimates between stops
- "Route bekijken" CTA → opens directions
- Empty state: "Begin een dagplan" + CTA to explore

**Map state:** Shows markers for planned stops with numbered badges + route lines.
**Desktop:** Same content in sidebar, same map behavior.

---

## 4. Map / List / Detail Relationships

### Two-Sheet Architecture (Mobile)

Mobile uses two independent sheets that never overlap:

1. **Browse sheet** — search bar, filter chips, location card list, contextual suggestions, guide content, article content. States: peek / half / full.
2. **Detail sheet** — location detail content. States: peek / half / full.

Only one sheet is visible at a time. Opening a location transitions from browse sheet to detail sheet. Closing detail returns to browse sheet (restored to its previous state).

### Browse Sheet State Machine

```
                    ┌──────────┐
        ┌──────────►│   PEEK   │◄─────────────┐
        │           │ (map+bar)│               │
        │           └────┬─────┘               │
        │                │ drag up             │
        │                ▼                     │
        │           ┌──────────┐               │
        │           │   HALF   │               │
        │           │(map+list)│               │
        │           └────┬─────┘               │
        │                │ drag up             │ drag down
        │                ▼                     │
        │           ┌──────────┐               │
        │           │   FULL   │───────────────┘
        │           │  (list)  │
        │           └──────────┘
        └────────────────┘
```

**Cold start default:** Browse sheet in peek/half state showing contextual suggestion rows (nearby, popular, seasonal picks) + guides section before the user searches or filters.

### Detail Sheet State Machine

```
        ┌──────────┐               ┌──────────┐
        │   HALF   │──── drag ────►│   FULL   │
        │(preview) │               │ (detail) │
        └──────────┘◄──── drag ────┴──────────┘
              │                          │
              └──── back / swipe ────────┘ → dismiss → return to browse sheet
```

### Transitions Between Sheets
- **Tap card in browse sheet** → browse sheet hides, detail sheet appears (half)
- **Tap map marker** → browse sheet hides, detail sheet appears (half)
- **Back / swipe down from detail half** → detail sheet dismisses, browse sheet restores
- **Tap nearby location in detail** → detail sheet swaps to new location (push history)

### Route-Driven Sheet Content

When the URL changes (e.g., user navigates to `/amsterdam`), the sheet content updates to match the route:

| URL | Sheet content type |
|---|---|
| `/` | Browse: suggestions + guides |
| `/amsterdam` | Browse: region guide |
| `/amsterdam/speeltuinen` | Browse: filtered location list |
| `/amsterdam/artis` | Detail: location detail |
| `/blog/slug` | Browse: article content |
| `/guides` | Browse: guides overview |

The sheet state machine manages peek/half/full positioning. The route determines what content fills the sheet.

### Carousel (Map-Level Overlay)

The carousel is a horizontally scrollable row of compact location cards that floats above the map, below the sheet. It is a **map-level overlay component**, not part of either sheet.

- Visible when browse sheet is in peek state
- Scrolling the carousel highlights the corresponding map marker
- Tapping a carousel card opens the detail sheet
- Hidden when any sheet is in half or full state

### Desktop State Machine

```
        ┌──────────────┐         ┌──────────────┐
        │  LIST STATE   │────────►│ DETAIL STATE  │
        │ sidebar:cards │ click   │ sidebar:detail│
        │ map: markers  │ card    │ map: zoomed   │
        └──────────────┘◄────────┴──────────────┘
                              back button
```

No sheet mechanics. Sidebar switches between content types based on the active route. Map is always visible.

### Map ↔ List Synchronization

| Action | Effect |
|---|---|
| Pan/zoom map | Update card list to show locations in new bounds (debounced 300ms) |
| Scroll cards into view | No map change (map follows selection, not scroll) |
| Tap card | Center map on location, highlight marker, open detail |
| Tap marker | Scroll to card in list (mobile: sheet → half if peek), highlight card |
| Apply filter | Re-query locations, update both markers and card list |
| Card hover (desktop) | Highlight corresponding marker (scale up, z-index) |
| Marker hover (desktop) | Highlight corresponding card (subtle border/shadow) |

### Detail View ↔ Map

- When detail is open, map zooms to the location (zoom level 15)
- Nearby location markers remain visible (dimmed)
- Tapping a nearby location card swaps to that location's detail (push new history entry)
- Closing detail restores previous map viewport (stored before zoom)

---

## 5. SEO Strategy

### The App IS the SEO Page

There is no separate marketing page that then links to an app version. The SSR HTML that Google sees IS the app shell with real content rendered in the sheet/sidebar container. After hydration, users get the full interactive map experience.

This is the Apple Maps model: `maps.apple.com/place/artis` renders a full HTML page with place details for Google, and an interactive map experience for users. Same URL, same content, one experience.

### Rendering Strategy

| Page | Rendering | Revalidation | Count |
|---|---|---|---|
| `/` | SSR (ISR) | Daily | 1 |
| `/[region]` | SSG (ISR) | On data change, fallback 3600s | ~22 |
| `/[region]/[type]` | SSG (ISR) | 3600s | ~176 (22x8) |
| `/[region]/[slug]` | SSR | Graduation check at request time | ~2000 |
| `/blog/[slug]` | SSG | On deploy | ~50 |
| `/guides` | SSG (ISR) | 3600s | 1 |
| `/privacy`, `/terms`, etc. | SSG | On deploy | ~4 |
| `/partner` | CSR | N/A | — |

### Server-Rendered Content in App Shell

Each SSR/SSG page renders within the `(app)` layout. The server outputs:

1. The app shell (map container, sheet/sidebar container, tab bar)
2. The route-specific content pre-rendered inside the sheet/sidebar container
3. Map initialization data (center, zoom, markers for the route)
4. JSON-LD structured data in `<head>`

Googlebot sees the full content in the HTML. Users see the same content hydrated with interactivity.

### Structured Data (JSON-LD)

| Page Type | Schema.org Type | Key Properties |
|---|---|---|
| Homepage | `WebSite` + `Organization` | name, url, searchAction |
| Region guide | `CollectionPage` + `ItemList` | name, description, about (region), itemListElement |
| City+type combo | `CollectionPage` + `ItemList` | itemListElement (locations) |
| Location detail | `TouristAttraction` / `Zoo` / `Museum` + `Place` | name, address, geo, image, aggregateRating, openingHours, priceRange |
| Blog/guide post | `Article` + `BlogPosting` | headline, author, datePublished, image |
| Guides overview | `CollectionPage` | name, description |

### Canonical URL Rules

- Every page has exactly one canonical URL
- Location detail canonical: `https://peuterplannen.nl/[region]/[slug]`
- No trailing slashes (enforced by Next.js config or middleware)
- `<meta name="robots" content="noindex">` on `/partner/*` and `/admin/*` routes
- Filtered views with query params (e.g., `?type=speeltuin`) get `noindex`

### Internal Linking Strategy

Every SSR page participates in a dense internal link graph, rendered in the sheet/sidebar content:

| From | Links to |
|---|---|
| Home (suggestions + guides) | Region guides, featured locations, latest blog posts |
| Region guide | Type combos for this region, top locations, nearby regions |
| City+type combo | All locations in this combo, region guide, related combos |
| Location detail | Region guide, nearby locations, related city+type combo |
| Blog/guide post | Referenced locations, relevant region guides |
| Sheet footer | /partner, /privacy, /terms, /about |

**Breadcrumbs** on every content page (also in JSON-LD `BreadcrumbList`):
- Location: Home → [Region] → [Location name]
- City+type: Home → [Region] → [Type in Region]
- Region guide: Home → [Region]

---

## 6. Content Hierarchy per Page Type

### 6.1 Home (`/`) — Browse Sheet/Sidebar

1. **Search bar** (always at top)
2. **Contextual suggestion rows** — 4-6 time/weather-based suggestions (SVG icon + label)
3. **"Gidsen" section header**
4. **Featured guide cards** — hero carousel (Amsterdam met peuters, Regendag activiteiten, etc.)
5. **Latest guides** — 3 cards with image, title, excerpt
6. **Popular cities** — region cards (Amsterdam, Rotterdam, Utrecht, etc.)
7. **Sheet footer** — "Heb je een locatie? Beheer je listing →" + Privacy · Voorwaarden · Over

### 6.2 Region Guide (`/[region]`) — Sheet/Sidebar

1. **Back button** (top left) + Share button (top right)
2. **Hero image** (full width, region-specific)
3. **Region name** (h1) + intro paragraph (2-3 sentences)
4. **Type grid** — 8 type cards filtered to this region (icon + name + count)
5. **Top locations** — 6-8 highest-scored location cards
6. **Editorial content** — region-specific tips, seasonal highlights
7. **Nearby regions** — horizontal scroll of region cards
8. **Sheet footer**

### 6.3 City+Type Combo (`/[region]/[type]`) — Sheet/Sidebar

1. **Back button** + breadcrumb
2. **Header** — h1 "[Type] in [Region]", intro paragraph, location count
3. **Filter/sort bar** — active type highlighted, additional filters
4. **Location cards** — all locations matching region+type, sorted by score
5. **Related combos** — "Also in [Region]" + "Also [type] in"
6. **Sheet footer**

### 6.4 Location Detail (`/[region]/[slug]`) — Detail Sheet/Sidebar

**Peek state (mobile):**
1. Drag handle
2. Name + type badge
3. Score + open/closed status
4. Thumbnail (right-aligned)

**Half state / sidebar top:**
1. Hero image gallery (swipeable)
2. Name (h1) + type badge
3. Action bar: Save, Add to plan, Share, Directions
4. Quick-info: weather, age, price, distance
5. Description intro (2-3 sentences)

**Full state / sidebar scrollable:**
1. Score breakdown (expandable)
2. Full description
3. Practical info (collapsible sections): opening hours, address, parking, facilities
4. Photo gallery
5. Nearby locations (horizontal scroll cards)
6. "Heb je een locatie?" footer link

### 6.5 Blog/Guide Post (`/blog/[slug]`) — Sheet/Sidebar

1. **Back button** (top left) + Share button (top right)
2. **Hero image** (full width)
3. **Title** (h1) + author/publisher badge + date
4. **Article body** — rendered Markdown/MDX with:
   - Embedded location cards (tap → detail sheet)
   - Images with captions
   - h2/h3 subheadings
5. **Related locations** — card grid of all mentioned locations
6. **Related articles** — 2-3 related posts
7. **Sheet footer**

### 6.6 Guides Overview (`/guides`) — Sheet/Sidebar

1. **Section header** — "Gidsen"
2. **Featured guide carousel** — large hero cards
3. **Latest** — card grid (6-8 cards)
4. **By city** — city cards with photo + name + guide count
5. **Browse by type** — type cards
6. **Sheet footer**
