# Information Architecture — PeuterPlannen v2

Phase 0 documentation for the Next.js App Router rebuild.

---

## 1. Route Structure

### Route Groups

The app uses two Next.js route groups:

- `app/(marketing)` — SSR/SSG pages optimized for SEO and crawlability
- `app/(pwa)` — client-rendered interactive app shell (map, planner, favorites)

Each group gets its own root layout. The marketing layout includes a traditional header/footer. The PWA layout includes the bottom tab bar (mobile) and persistent sidebar (desktop).

### Marketing / SEO Routes

All routes below live in `app/(marketing)` and are crawlable, indexable, and render full HTML server-side.

| Route | Example | Rendering | Description |
|---|---|---|---|
| `/` | — | SSG | Homepage with hero, region cards, type cards, recent blog posts |
| `/[region]` | `/amsterdam` | SSG | Region hub: intro text, type grid, top locations, nearby regions |
| `/[type]` | `/speeltuinen` | SSG | National type hub: intro, region grid, top locations nationwide |
| `/[region]/[type]` | `/amsterdam/speeltuinen` | SSG | City+type combo: filtered location list, map preview, intro text |
| `/[region]/[slug]` | `/amsterdam/artis` | SSG (ISR 24h) | Location detail: full content, photos, score breakdown, nearby |
| `/blog` | — | SSG | Blog index with paginated post cards |
| `/blog/[slug]` | `/blog/beste-speeltuinen-amsterdam` | SSG | Blog post: long-form content with embedded location cards |
| `/ontdekken` | — | SSG | Discovery hub: curated guides, seasonal picks, editorial content |
| `/methode` | — | SSG | Methodology: how scores are calculated, data sources, transparency |
| `/about` | — | SSG | About page |
| `/contact` | — | SSG | Contact form |
| `/voor-bedrijven` | — | SSG | B2B landing page for venue owners |

**Route conflict resolution:** `/[region]` and `/[type]` share the same `[slug]` pattern at the root level. Resolution order:

1. Check against the 8 known type slugs: `speeltuinen`, `boerderijen`, `natuur`, `horeca`, `musea`, `zwemmen`, `pannenkoeken`, `cultuur`
2. Check against the ~22 known region slugs: `amsterdam`, `rotterdam`, `utrecht`, `den-haag`, etc.
3. If neither matches → 404

Implementation: use `generateStaticParams` for both, and a shared `middleware.ts` or catch-all with lookup logic.

### PWA / App Routes

All routes below live in `app/(pwa)` and are client-rendered. They share a single app shell with bottom tabs (mobile) and sidebar (desktop). The map persists across navigations within this group.

| Route | Description |
|---|---|
| `/app` | Main interactive experience: map + bottom sheet with location cards |
| `/app/plan` | Day planner: saved itinerary with drag-to-reorder |
| `/app/favorieten` | Saved/bookmarked locations |
| `/app?locatie=amsterdam/artis` | Deep link: opens location detail in the app context |
| `/app?type=speeltuinen` | Deep link: pre-filters by type |
| `/app?regio=amsterdam` | Deep link: centers map on region |
| `/app?regio=amsterdam&type=speeltuinen` | Combined deep link |

The `/app` route is a single-page app internally. Query parameters control state (selected location, active filters, map viewport) without triggering full page navigations.

### Static / Utility Routes

| Route | Description |
|---|---|
| `/sitemap.xml` | Dynamic sitemap (all ~2200 pages) via `app/sitemap.ts` |
| `/robots.txt` | Standard robots via `app/robots.ts` |
| `/manifest.json` | PWA manifest |
| `/api/og/[...path]` | OG image generation |

---

## 2. Navigation Model

### Mobile Navigation

**Bottom tab bar** — fixed at the bottom, always visible in PWA context:

| Tab | Icon | Target | Active state |
|---|---|---|---|
| Ontdek | compass | `/app` (sheet: peek/half with cards) | Default tab |
| Kaart | map | `/app` (sheet: collapsed, map fullscreen) | Map focused |
| Bewaard | heart | `/app/favorieten` | Heart filled |
| Plan | calendar | `/app/plan` | Badge with count |
| Meer | dots/menu | Slide-up menu (info, settings, about links) | — |

**Tab behavior:**
- Tapping the active tab scrolls its content to top / resets sheet to default state
- Tapping a different tab navigates, preserving map viewport
- Tab bar hides when bottom sheet is in full state (location detail)
- Tab bar shows when sheet is in peek or half state

### Desktop Navigation

**Persistent sidebar** (left, ~380px wide):
- Logo + search bar at top
- Filter chips below search
- Scrollable content area (cards, detail, plan — depends on context)
- No bottom tabs; all navigation is inline in the sidebar

**Sidebar states:**
1. **List state** — scrollable location cards with filter chips
2. **Detail state** — location detail panel (replaces list, back button at top)
3. **Plan state** — itinerary builder
4. **Favorites state** — saved locations

Toggle between states via top-level navigation links in the sidebar header.

### SEO → App Transition

When a user lands on an SEO page (e.g., `/amsterdam/artis`) and taps the "Open in app" CTA:

1. Navigate to `/app?locatie=amsterdam/artis`
2. App shell loads, map centers on location
3. Bottom sheet opens to full state with location detail
4. User is now in the PWA context with full interactivity

This is a full page navigation (not a soft transition). The marketing layout unmounts, the PWA layout mounts.

### Deep Link Handling

| Input | Behavior |
|---|---|
| `/app?locatie=amsterdam/artis` | Center map on location, open detail in sheet/sidebar |
| `/app?type=speeltuinen` | Set type filter, show filtered cards |
| `/app?regio=amsterdam` | Set map viewport to region bounds |
| Shared link (native share) | Generate `/amsterdam/artis` URL (SEO page, not app URL) |

### History Management

- **Within PWA:** use `window.history.replaceState` for filter/viewport changes (no history stack pollution). Use `pushState` only for meaningful navigation: opening a location detail, switching tabs.
- **Back button in detail view:** pops back to list/map state (previous `pushState` entry).
- **Back button from app:** if no PWA history, navigates to referring SEO page or `/`.
- **SEO pages:** standard Next.js navigation with full page loads between route groups.

---

## 3. Screen Inventory

### 3.1 Homepage (`/`)

**Above the fold:**
- Hero with headline ("Ontdek de leukste uitjes met je peuter"), subheading, primary CTA → `/app`
- Search bar (links to `/app` with query)

**Below the fold:**
- Region cards grid (Amsterdam, Rotterdam, Utrecht, Den Haag, ... ~8 featured)
- Type cards grid (8 types with icon + count)
- Editorial picks / seasonal content (3-4 cards)
- Recent blog posts (3 cards)
- Trust signals (location count, review count)
- Footer with full link structure

**Data needed:** Region list with counts, type list with counts, featured locations (curated), recent blog posts.

**Loading state:** Static page — SSG, no loading state needed.

### 3.2 Region Hub (`/[region]`)

**Above the fold:**
- Region name as h1, intro paragraph
- Hero image (region-specific)
- Type filter grid (8 types, each showing count for this region)

**Below the fold:**
- Top locations in region (6-8 cards, sorted by score)
- Map preview (static image linking to `/app?regio=[region]`)
- Type sections (one per type that has locations in this region)
- Nearby regions (horizontal scroll)
- Breadcrumb: Home → [Region]

**Data needed:** Region metadata, location counts by type, top locations (score-sorted), nearby regions.

### 3.3 Type Hub (`/[type]`)

**Above the fold:**
- Type name as h1 (e.g., "Speeltuinen"), intro paragraph
- CTA to explore on map → `/app?type=[type]`

**Below the fold:**
- Region grid (which regions have this type, with counts)
- Top locations nationwide for this type (8-10 cards)
- Editorial content about this type
- Breadcrumb: Home → [Type]

**Data needed:** Type metadata, location counts by region, top locations for type.

### 3.4 City+Type Combo (`/[region]/[type]`)

**Above the fold:**
- h1: "[Type] in [Region]" (e.g., "Speeltuinen in Amsterdam")
- Intro paragraph (unique per combo)
- Location count + CTA to map → `/app?regio=[region]&type=[type]`

**Below the fold:**
- All locations for this combo, sorted by score (card list, paginated if >20)
- Static map preview with markers
- Related combos (same region different type, same type different region)
- Breadcrumb: Home → [Region] → [Type]

**Data needed:** Locations filtered by region+type, combo metadata/intro text.

### 3.5 Location Detail — SEO Version (`/[region]/[slug]`)

**Above the fold:**
- Location name (h1), type badge, region
- Hero image (or gallery carousel if multiple images)
- PeuterPlannen score (overall + breakdown preview)
- Key facts: address, opening hours, price range, age range

**Below the fold:**
- Full score breakdown (8 criteria with individual scores)
- Description / editorial review
- Photo gallery
- Practical info (parking, public transport, facilities)
- Map with pin (static or lightweight interactive)
- Nearby locations (4-6 cards)
- CTA: "Bekijk op de kaart" → `/app?locatie=[region]/[slug]`
- Breadcrumb: Home → [Region] → [Location]
- JSON-LD structured data (see Section 5)

**Data needed:** Full location record, images, score breakdown, nearby locations.

### 3.6 Location Detail — In-App Version (`/app?locatie=...`)

Renders in a **separate detail sheet** (mobile) or sidebar detail panel (desktop). The detail sheet is independent from the browse sheet — only one sheet is visible at a time. Opening a location dismisses the browse sheet and presents the detail sheet; closing the detail sheet returns to the browse sheet.

- No header/footer chrome
- Detail sheet states: half (preview) → full (complete detail) via drag
- Map shows the location pin, zoomed in
- "Add to plan" and "Save" buttons prominent
- Swipe down or back button to dismiss → returns to browse sheet

**Mobile detail sheet states:**
1. **Half state** — name, image, score, key facts, "View more" affordance
2. **Full state** — complete detail (scroll within sheet)

**Desktop sidebar:**
- Full detail visible in sidebar panel (scrollable)
- Map zoomed to location on right side

**Data needed:** Same as SEO version. Fetched client-side from Supabase if not already cached.

**Loading state:** Skeleton with image placeholder, 3 text lines, score placeholder.

**Empty state:** N/A (deep links always target a specific location).

### 3.7 App — Map + List (`/app`)

**Mobile — sheet states:**

| State | Content | Map visibility |
|---|---|---|
| **Peek** (~15% height) | Search bar + "X locaties" count + drag handle | Full map visible |
| **Half** (~50% height) | Search bar + filter chips + scrollable card list | Map visible above sheet |
| **Full** (100% height) | Search bar + filters + full card list (or detail) | Map hidden |

**Desktop:**
- Sidebar (left, 380px): search, filters, scrollable cards
- Map (right, remaining width): always visible
- No sheet concept; sidebar is always visible

**Key interactive elements:**
- Search bar: type-ahead with location/region/type suggestions
- Filter chips: 8 type filters + "Gratis" + age range + distance
- Location cards: tap → open detail (sheet full / sidebar detail)
- Map markers: tap → highlight card + scroll to it (mobile: sheet half if peek)
- Map viewport change → update visible cards (debounced)

**Data needed:** Locations within current map bounds (Supabase query with bounding box). Cached aggressively.

**Loading state:** Map loads immediately (tiles). Cards show skeleton (3 placeholder cards). Markers appear as data arrives.

**Empty state:** "Geen locaties gevonden" with suggestion to zoom out or change filters.

### 3.8 App — Favorites (`/app/favorieten`)

**Content:**
- List of saved locations (stored in localStorage, synced to Supabase if authenticated)
- Empty state: illustration + "Je hebt nog geen favorieten" + CTA to explore

**Mobile:** replaces sheet content. Map shows pins for all saved locations.
**Desktop:** replaces sidebar content. Map shows saved location pins.

### 3.9 App — Plan (`/app/plan`)

**Content:**
- Ordered list of planned locations (drag to reorder)
- Route visualization on map (connecting lines)
- Time estimates between stops
- Empty state: "Begin een dagplan" + CTA to explore

**Mobile:** replaces sheet content. Map shows route.
**Desktop:** replaces sidebar content. Map shows route.

### 3.10 Blog Post (`/blog/[slug]`)

**Above the fold:**
- Title (h1), author, date, reading time
- Hero image

**Below the fold:**
- Long-form content with embedded location cards (clickable → SEO detail page)
- Related posts
- CTA to explore mentioned locations on map

**Data needed:** Blog post content (Markdown/MDX), referenced location IDs.

---

## 4. Map / List / Detail Relationships

### Two-Sheet Architecture (Mobile)

Mobile uses two independent sheets that never overlap:

1. **Browse sheet** — search bar, filter chips, location card list, contextual suggestion rows. States: peek / half / full.
2. **Detail sheet** — location detail content. States: half / full.

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

**Cold start default:** Browse sheet in peek/half state showing contextual suggestion rows (nearby, popular, seasonal picks) before the user searches or filters.

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

No sheet mechanics. Sidebar switches between list and detail content. Map is always visible.

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

## 5. SEO Page Strategy

### Rendering Strategy

| Page | Rendering | Revalidation | Count |
|---|---|---|---|
| `/` | SSG | Rebuild on deploy | 1 |
| `/[region]` | SSG | Rebuild on deploy | ~22 |
| `/[type]` | SSG | Rebuild on deploy | 8 |
| `/[region]/[type]` | SSG | Rebuild on deploy | ~176 (22×8) |
| `/[region]/[slug]` | SSG + ISR | Revalidate every 24h | ~2000 |
| `/blog/[slug]` | SSG | Rebuild on deploy | ~50 |
| `/ontdekken` | SSG | Rebuild on deploy | 1 |
| `/methode` | SSG | Rebuild on deploy | 1 |
| `/about`, `/contact`, `/voor-bedrijven` | SSG | Rebuild on deploy | 3 |
| `/app` (and sub-routes) | CSR | N/A | — |

**ISR for location pages:** Location data changes infrequently (scores update weekly, hours may change). 24h revalidation balances freshness with build cost. On-demand revalidation via webhook when a location is updated in Supabase.

### Location Detail: SEO + App-like UX

The `/[region]/[slug]` page must serve two audiences:

1. **Googlebot / first-time visitor:** Full server-rendered HTML with all content, structured data, images, and internal links. No JavaScript required for content visibility.

2. **Returning user / app user:** After hydration, the page gains interactive features (save button, add-to-plan, image gallery swipe, map interaction). A persistent "Open in app" banner/CTA encourages transition to `/app?locatie=...`.

Implementation: standard Next.js SSG page. All content is in the initial HTML. Client components hydrate on top for interactivity. No client-side data fetching needed for the core content.

### Structured Data (JSON-LD)

| Page Type | Schema.org Type | Key Properties |
|---|---|---|
| Homepage | `WebSite` + `Organization` | name, url, searchAction |
| Region hub | `CollectionPage` | name, description, about (region) |
| Type hub | `CollectionPage` | name, description |
| City+type combo | `CollectionPage` + `ItemList` | itemListElement (locations) |
| Location detail | `TouristAttraction` + `Place` | name, address, geo, image, aggregateRating, openingHours, priceRange |
| Blog post | `Article` + `BlogPosting` | headline, author, datePublished, image |
| Methodology | `WebPage` + `FAQPage` | mainEntity (FAQ items about scoring) |

### Canonical URL Rules

- Every page has exactly one canonical URL
- Location detail canonical: `https://peuterplannen.nl/[region]/[slug]`
- No trailing slashes (enforced by Next.js config or middleware)
- `/app?locatie=amsterdam/artis` is NOT indexed; canonical for that content is `/amsterdam/artis`
- `<meta name="robots" content="noindex">` on all `/app/*` routes
- Blog pagination (if any): `rel=prev` / `rel=next` with canonical on page 1

### Internal Linking Strategy

Every SEO page participates in a dense internal link graph:

| From | Links to |
|---|---|
| Homepage | All region hubs, all type hubs, featured locations, recent blog posts |
| Region hub | All type combos for this region, top locations, nearby regions, homepage |
| Type hub | All region combos for this type, top locations, homepage |
| City+type combo | All locations in this combo, region hub, type hub, related combos |
| Location detail | Region hub, type hub, nearby locations, related city+type combo |
| Blog post | Referenced locations, relevant region/type hubs |

**Breadcrumbs** on every page (also in JSON-LD `BreadcrumbList`):
- Location: Home → [Region] → [Location name]
- City+type: Home → [Region] → [Type in Region]
- Type hub: Home → [Type]
- Region hub: Home → [Region]

---

## 6. Content Hierarchy per Page Type

### 6.1 Homepage

1. **Hero section** — headline, subheading, search bar, primary CTA
2. **Region grid** — 8 featured regions as cards (image + name + location count)
3. **Type grid** — 8 types as cards (icon + name + count)
4. **Editorial picks** — 3-4 curated location cards (seasonal/topical)
5. **Recent blog posts** — 3 cards with image, title, excerpt
6. **Trust bar** — total locations, total reviews, methodology link
7. **Footer** — full sitemap links, legal, social

### 6.2 Region Hub

1. **Header** — h1 region name, intro paragraph (2-3 sentences), hero image
2. **Type grid** — 8 type cards filtered to this region (icon + name + count in region)
3. **Top locations** — 6-8 highest-scored locations in region (card with image, name, score, type badge)
4. **Map preview** — static map image with marker clusters, CTA to `/app?regio=...`
5. **Type sections** — for each type with >3 locations: h2 + 4 cards + "Bekijk alle" link to city+type combo
6. **Nearby regions** — horizontal scroll of region cards
7. **Breadcrumb** + footer

### 6.3 Type Hub

1. **Header** — h1 type name (e.g., "Speeltuinen in Nederland"), intro paragraph, type icon
2. **Region grid** — regions that have this type, sorted by count (card with region name + count)
3. **Top locations** — 8-10 highest-scored locations of this type nationwide
4. **Editorial content** — what makes a great [type], tips for visiting with toddlers
5. **Breadcrumb** + footer

### 6.4 City+Type Combo

1. **Header** — h1 "[Type] in [Region]", intro paragraph, location count
2. **Filter/sort bar** — sort by score/distance/name (minimal, not the full app filter)
3. **Location cards** — all locations matching region+type, sorted by score (image, name, score, address snippet, key facts)
4. **Map preview** — static map with all location markers, CTA to `/app?regio=...&type=...`
5. **Related combos** — "Also in [Region]: [other types]" + "Also [type] in: [other regions]"
6. **Breadcrumb** + footer

### 6.5 Location Detail — SEO Version

1. **Breadcrumb** (top)
2. **Hero** — image gallery (1 hero + thumbnails), location name (h1), type badge, region link
3. **Quick facts bar** — score (large), price, age range, opening hours summary
4. **CTA bar** — "Open in app" button, save button, share button
5. **Score breakdown** — 8 criteria each with score + one-line explanation
6. **Description** — editorial review (2-4 paragraphs)
7. **Practical info** — full address, opening hours table, pricing table, parking, public transport, facilities (toilets, changing table, stroller access)
8. **Photo gallery** — remaining images in grid
9. **Map** — static map with pin + address, link to directions
10. **Nearby locations** — 4-6 cards within ~5km, same type preferred
11. **Back to region/type** — contextual links
12. **Footer**

### 6.6 Location Detail — In-App Version

Same content, different container. Rendered in the bottom sheet (mobile) or sidebar panel (desktop):

**Half-sheet preview (mobile):**
1. Drag handle
2. Hero image (aspect 16:9, edge-to-edge)
3. Location name + type badge
4. Score (large) + price + age range
5. "Bekijk meer" affordance (or just drag up)

**Full-sheet / sidebar detail:**
1. Hero image gallery (swipeable)
2. Name (h1) + type badge
3. Action bar: Save, Add to plan, Share, Directions
4. Score breakdown (expandable)
5. Description
6. Practical info (collapsible sections)
7. Nearby locations (horizontal scroll cards)

### 6.7 Blog Post

1. **Header** — title (h1), author name + avatar, publish date, reading time estimate
2. **Hero image** — full-width
3. **Article body** — Markdown/MDX rendered content with:
   - Embedded location cards (inline component, clickable → `/[region]/[slug]`)
   - Images with captions
   - h2/h3 subheadings
   - Callout boxes (tips, warnings)
4. **Related locations** — all locations mentioned in the post (card grid)
5. **Related posts** — 2-3 posts with similar tags/region
6. **CTA** — "Ontdek deze locaties op de kaart" → `/app` with relevant filters
7. **Breadcrumb** + footer
