# SEO & Analytics Strategy — PeuterPlannen v2

> Phase 0 documentation. Defines URL structure, rendering strategy, structured data, event taxonomy, and analytics architecture for the Next.js rebuild.
>
> **Architecture note:** All SEO pages render within the unified app shell (map + sheet/sidebar). There are no separate marketing pages. Google gets SSR HTML with real content rendered inside the sheet/sidebar container. Users see the map-first experience. Same URL, same content, one layout.

---

## 1. URL Strategy

### Clean URL structure (no `.html` extensions)

| Page type | URL pattern | Example | Layout |
|-----------|-------------|---------|--------|
| Homepage | `/` | `/` | `(app)` — map + sheet |
| Region guide | `/{region}` | `/amsterdam` | `(app)` — map centered + sheet with guide |
| City+type combo | `/{region}/{type}` | `/amsterdam/speeltuinen` | `(app)` — map with markers + sheet with list |
| Location detail | `/{region}/{slug}` | `/amsterdam/artis` | `(app)` — map centered + detail sheet |
| Blog/guide post | `/blog/{slug}` | `/blog/beste-uitjes-amsterdam-peuters` | `(app)` — map ambient + sheet with article |
| Guides overview | `/guides` | `/guides` | `(app)` — map + sheet with guide cards |
| Partner portal | `/partner` | `/partner` | `(portal)` — no map |
| Legal pages | `/{slug}` | `/privacy`, `/terms`, `/about`, `/contact` | `(legal)` — minimal, no map |

All routes in the `(app)` layout share the same map + sheet/sidebar shell. Content renders inside the sheet/sidebar. The map provides spatial context for every page.

### Redirect map (v1 → v2)

All old `.html` URLs get 301 redirects:

```
/amsterdam.html          → /amsterdam
/speeltuinen.html        → /speeltuinen
/amsterdam-speeltuinen.html → /amsterdam/speeltuinen
/locatie/{id}/{slug}.html   → /{region}/{slug}
/blog/{slug}.html        → /blog/{slug}
```

Implementation: `next.config.js` redirects array for known patterns, plus a catch-all middleware for any `.html` request that strips the extension and redirects.

### Canonical URL rules

- Every page sets `<link rel="canonical">` to its own clean URL (full absolute URL with `https://peuterplannen.nl`)
- Location detail: canonical is always `https://peuterplannen.nl/{region}/{slug}` — if `seo_canonical_target` is set in the database, use that instead (handles duplicates across regions)
- All `(app)` routes are indexable by default (they render real SSR content in the sheet/sidebar)
- Filtered views with query params (`?type=speeltuin`) get `noindex` — only the base route is canonical
- `/partner/*` and `/admin/*` routes get `noindex`
- Pagination: `rel="next"` / `rel="prev"` if pages paginate; canonical points to page 1

### Trailing slash convention

No trailing slashes. Next.js `trailingSlash: false` in config. Requests with trailing slashes get 308 redirected.

---

## 2. Page Rendering Strategy

| Page type | Strategy | Revalidation | Why |
|-----------|----------|-------------|-----|
| Homepage (`/`) | SSR (ISR) | Daily (86400s) | Content changes slowly; fast TTFB matters. Renders in app shell. |
| Region guides (`/{region}`) | SSG (ISR) | On data change via webhook, fallback 3600s | ~22 pages, stable content, need fast crawl. Renders in app shell sheet/sidebar. |
| City+type combos | SSG (ISR) | 3600s | ~120 pages, manageable at build time. Renders in app shell. |
| Location detail (`/{region}/{slug}`) | SSR | No cache (or short 60s stale-while-revalidate) | **Must pass graduation check at request time**; content can change. Renders in app shell detail sheet/sidebar. |
| Blog/guide posts | SSG | On deploy (from markdown/MDX) | Static content, changes only on publish. Renders in app shell sheet/sidebar. |
| Guides overview (`/guides`) | SSG (ISR) | 3600s | Picks up new guides. Renders in app shell. |
| Partner portal (`/partner`) | CSR | N/A | Separate layout, `noindex`. |
| Legal pages | SSG | On deploy | Simple content. Separate minimal layout. |

**Key difference from traditional SSR:** All `(app)` routes render their content inside the unified app shell (map + sheet/sidebar container). The server outputs the app shell HTML with the route-specific content pre-rendered in the sheet/sidebar area. After hydration, the map becomes interactive and the sheet gains gesture support.

### Location detail SSR rationale

Location detail pages are the core SEO fix. They render within the unified app shell (map + detail sheet/sidebar) and must be server-rendered because:
1. Graduation status can change (location gets verified, description improves)
2. The page must return a proper `noindex` header if the location fails graduation — not rely on client JS
3. Fresh data (opening hours, nearby locations) matters for user experience
4. Googlebot gets complete HTML on first request — the detail content is in the HTML inside the sheet/sidebar container
5. Users landing from Google see the full app experience immediately — map centered on the location, detail content visible

The server renders the app shell with:
- Map container (initialized with center/zoom for this location)
- Detail sheet/sidebar with the full location content pre-rendered
- Structured data in `<head>`

After hydration, the map becomes interactive and the sheet gains gesture/drag support.

For high-traffic location pages, consider adding `Cache-Control: s-maxage=60, stale-while-revalidate=300` at the CDN layer.

---

## 3. Location Detail Pages — The Big Fix

This is the #1 SEO improvement. Currently, location detail pages are `noindex` redirect shells to the SPA. In v2, every graduated location gets a full server-rendered page.

### Page content (top to bottom)

1. **Breadcrumb**: Home > {Region} > {Type} > {Location name}
2. **Hero**: Location name (h1), type badge, region, hero photo (or fallback)
3. **Quick facts**: Address, opening hours, age range, price indication, facilities icons
4. **Description**: Editorial override (`seo_intro_override`) or auto-generated from structured fields
5. **Photo gallery**: Up to 6 photos, lazy-loaded
6. **Quality signals**: PeuterProof score breakdown (if graduated)
7. **Facilities list**: Full facility details
8. **Nearby locations**: 4-6 similar locations in the same region (cards with links)
9. **Nearby locations**: 4-6 nearby location cards (tappable → their detail sheet opens, map pans)
10. **Internal links**: Link to region guide, city+type combo, related blog posts

### Meta tags

```html
<!-- Auto-generated (can be overridden via seo_title_override / seo_description_override) -->
<title>Artis Zoo Amsterdam — Uitje met peuter | PeuterPlannen</title>
<meta name="description" content="Artis in Amsterdam: dierentuin geschikt voor peuters. Ontdek faciliteiten, openingstijden en tips voor je bezoek met kleintjes.">
<link rel="canonical" href="https://peuterplannen.nl/amsterdam/artis">
<meta name="robots" content="index, follow"> <!-- or "noindex, follow" if not graduated -->

<!-- Open Graph -->
<meta property="og:title" content="Artis Zoo Amsterdam — Uitje met peuter">
<meta property="og:description" content="Artis in Amsterdam: dierentuin geschikt voor peuters.">
<meta property="og:image" content="https://peuterplannen.nl/images/locations/artis-hero.jpg">
<meta property="og:url" content="https://peuterplannen.nl/amsterdam/artis">
<meta property="og:type" content="place">
```

### Graduation check (SSR middleware)

On every request, the server checks graduation status:
- **Pass**: Render full page with `index, follow`
- **Fail**: Render full page (for users who land on it) but with `noindex, follow` + `X-Robots-Tag: noindex` header
- **Excluded**: If `seo_exclude_from_sitemap` is true, always `noindex`
- **Canonical redirect**: If `seo_canonical_target` points elsewhere, 301 redirect

### Auto-generated title/description logic

```typescript
function generateTitle(location: Location): string {
  const override = location.seo_title_override;
  if (override) return override;

  const typeName = getTypeName(location.type); // "Speeltuin", "Dierentuin", etc.
  const city = location.seo_primary_locality || location.region_name;
  return `${location.name} ${city} — ${typeName} voor peuters | PeuterPlannen`;
}

function generateDescription(location: Location): string {
  const override = location.seo_description_override;
  if (override) return override;

  const typeName = getTypeName(location.type).toLowerCase();
  const city = location.seo_primary_locality || location.region_name;
  const facilities = getTopFacilities(location, 3).join(', ');
  return `${location.name} in ${city}: ${typeName} geschikt voor peuters. ${facilities ? `Met ${facilities}. ` : ''}Ontdek tips en faciliteiten voor je bezoek met kleintjes.`;
}
```

---

## 4. Structured Data Strategy

### Homepage

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://peuterplannen.nl/#organization",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl",
      "logo": "https://peuterplannen.nl/images/logo.png",
      "description": "Vind de leukste uitjes met peuters in Nederland"
    },
    {
      "@type": "WebSite",
      "@id": "https://peuterplannen.nl/#website",
      "name": "PeuterPlannen",
      "url": "https://peuterplannen.nl",
      "publisher": { "@id": "https://peuterplannen.nl/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://peuterplannen.nl/?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
```

### Region hub (e.g., `/amsterdam`)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ItemList",
      "name": "Uitjes met peuters in Amsterdam",
      "numberOfItems": 45,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "url": "https://peuterplannen.nl/amsterdam/artis"
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://peuterplannen.nl" },
        { "@type": "ListItem", "position": 2, "name": "Amsterdam" }
      ]
    }
  ]
}
```

### Location detail

Use the most specific schema type based on `location.type`:

| Location type | Schema type |
|--------------|-------------|
| Dierentuin | `Zoo` |
| Museum | `Museum` |
| Speeltuin | `Playground` |
| Kinderboerderij | `LocalBusiness` with `additionalType` |
| Pretpark | `AmusementPark` |
| Default | `TouristAttraction` |

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Zoo",
      "name": "Artis",
      "description": "De oudste dierentuin van Nederland...",
      "url": "https://peuterplannen.nl/amsterdam/artis",
      "image": "https://peuterplannen.nl/images/locations/artis-hero.jpg",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Plantage Kerklaan 38-40",
        "addressLocality": "Amsterdam",
        "postalCode": "1018 CZ",
        "addressCountry": "NL"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 52.3663,
        "longitude": 4.9123
      },
      "openingHoursSpecification": [],
      "isAccessibleForFree": false,
      "publicAccess": true,
      "containedInPlace": {
        "@type": "City",
        "name": "Amsterdam",
        "url": "https://peuterplannen.nl/amsterdam"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://peuterplannen.nl" },
        { "@type": "ListItem", "position": 2, "name": "Amsterdam", "item": "https://peuterplannen.nl/amsterdam" },
        { "@type": "ListItem", "position": 3, "name": "Dierentuinen", "item": "https://peuterplannen.nl/amsterdam/dierentuinen" },
        { "@type": "ListItem", "position": 4, "name": "Artis" }
      ]
    }
  ]
}
```

### Blog posts

```json
{
  "@type": "Article",
  "headline": "10 Beste uitjes met peuters in Amsterdam",
  "datePublished": "2026-03-15",
  "dateModified": "2026-03-20",
  "author": { "@id": "https://peuterplannen.nl/#organization" },
  "publisher": { "@id": "https://peuterplannen.nl/#organization" },
  "image": "https://peuterplannen.nl/images/blog/amsterdam-uitjes-hero.jpg"
}
```

### FAQ sections on hub pages

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Wat zijn de beste speeltuinen in Amsterdam voor peuters?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "De populairste speeltuinen voor peuters in Amsterdam zijn..."
      }
    }
  ]
}
```

---

## 5. Internal Linking Strategy

### Link hierarchy

All links below are within the unified app shell. Navigation between them is seamless — the sheet/sidebar content changes, the map animates to match.

```
Home (/)
├── Region guide (/amsterdam)
│   ├── City+type combo (/amsterdam/speeltuinen)
│   │   └── Location detail (/amsterdam/speeltuin-x)
│   └── Location detail (/amsterdam/artis)
├── Guides overview (/guides)
│   └── Blog/guide post (/blog/slug)
│       └── Location details (mentioned in content)
└── Sheet footer links → /partner, /privacy, /terms, /about (exit app shell)
```

### Linking rules

1. **Home sheet** links to:
   - Featured region guides (Amsterdam, Rotterdam, etc.)
   - Featured guide/blog posts
   - Popular locations

2. **Region guide pages** link to:
   - All city+type combos for that region
   - Top 10-20 location detail pages (highest quality score)
   - Related blog posts mentioning the region
   - Nearby regions

3. **City+type combo pages** link to:
   - All graduated location detail pages matching that filter
   - Parent region guide
   - Related combos (same region different type, same type different region)

4. **Location detail pages** link to:
   - Parent region guide (in breadcrumb)
   - 4-6 nearby locations (same type preferred, same region required)
   - Related blog posts (via tag matching)

5. **Blog/guide posts** link to:
   - Specific location detail pages mentioned in content (as embedded cards in sheet)
   - Relevant region guides
   - Other related blog posts

6. **Sheet footer** (on every sheet state):
   - "Heb je een locatie? Beheer je listing →" → `/partner`
   - Privacy · Voorwaarden · Over → `/privacy`, `/terms`, `/about`

### Nearby locations query

```sql
SELECT id, name, slug, region_slug, type, seo_quality_score,
  ST_Distance(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint($current_lng, $current_lat)::geography
  ) AS distance_m
FROM locations
WHERE id != $current_id
  AND seo_tier IS NOT NULL
  AND seo_tier <= 3
ORDER BY
  (type = $current_type)::int DESC,  -- prefer same type
  distance_m ASC
LIMIT 6;
```

---

## 6. Sitemap Strategy

### Sitemap index

```xml
<!-- /sitemap.xml -->
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://peuterplannen.nl/sitemap-core.xml</loc></sitemap>
  <sitemap><loc>https://peuterplannen.nl/sitemap-regions.xml</loc></sitemap>
  <sitemap><loc>https://peuterplannen.nl/sitemap-combos.xml</loc></sitemap>
  <sitemap><loc>https://peuterplannen.nl/sitemap-locations.xml</loc></sitemap>
  <sitemap><loc>https://peuterplannen.nl/sitemap-guides.xml</loc></sitemap>
</sitemapindex>
```

### Per-sitemap rules

| Sitemap | Content | lastmod source | Priority |
|---------|---------|---------------|----------|
| core | Homepage, guides overview, legal pages | Deploy date | 1.0 |
| regions | Region guide pages (`/amsterdam`, etc.) | Max location lastmod in region | 0.9 |
| combos | City+type combos (`/amsterdam/speeltuinen`) | Max location lastmod in combo | 0.7 |
| locations | Graduated location details only (`/amsterdam/artis`) | `verified_at` or `updated_at` | 0.6 |
| guides | Published blog/guide posts (`/blog/slug`) | `date_modified` frontmatter | 0.5 |

### Exclusion rules

A location is excluded from the sitemap if:
- `seo_exclude_from_sitemap` is true
- `seo_tier` is null (not graduated)
- `seo_canonical_target` points to a different URL (duplicate)
- Location is marked inactive/deleted

### Generation

Sitemaps are generated at build time (SSG pages) and augmented by an API route for SSR pages (locations). The location sitemap queries Supabase directly:

```sql
SELECT slug, region_slug, updated_at, verified_at, seo_tier
FROM locations
WHERE seo_tier IS NOT NULL
  AND seo_exclude_from_sitemap IS NOT TRUE
  AND seo_canonical_target IS NULL
  AND active = true
ORDER BY seo_tier ASC, seo_quality_score DESC;
```

---

## 7. Indexation Guardrails

### Graduation system

**Mandatory criteria (all 4 required):**
1. Valid coordinates (latitude + longitude)
2. Description length >= 100 characters
3. At least 1 categorized type
4. Region assignment

**Optional criteria (2 of 4 required):**
1. At least 1 photo
2. Opening hours present
3. Website URL present
4. Facilities data (>= 3 facilities)

A location that passes = `seo_tier` assigned (1-4 based on quality score). A location that fails = `seo_tier` null, `noindex`.

### Duplicate detection

When multiple entries exist for the same venue (e.g., "Artis" listed under both Amsterdam and Noord-Holland):
- The version with the highest `seo_quality_score` is canonical
- Other versions set `seo_canonical_target` to the canonical URL
- Other versions are excluded from sitemap
- Other versions 301 redirect to canonical

### Thin content protection

- Pages with fewer than 100 characters of unique body text get `noindex`
- Auto-generated descriptions must pass a quality check (no "Geen beschrijving beschikbaar" filler)
- Hub pages with 0 graduated locations get `noindex` (temporary, until locations are added)

### Hard noindex rules

These page types always get `noindex, follow`:
- `/partner/*` and `/admin/*` (portal routes)
- Any URL with query parameters (`?type=...`, `?q=...`) — these are filtered/sorted views of otherwise indexable pages
- Paginated pages beyond page 1 (debatable — revisit based on crawl data)
- Preview/draft pages
- Non-graduated location detail pages (fail graduation check at SSR time)

---

## 8. Content Strategy

### Guides as the discovery content layer

Guides replace the traditional blog as the primary content discovery mechanism. They render in the sheet/sidebar within the app shell — not on separate pages. This is the Apple Maps Guides model.

**Guide types:**

1. **Region guides** (`/amsterdam`, `/rotterdam`, etc.): The region route IS the guide for that city. Map centered on the region, sheet shows curated guide content with top locations, type grid, tips.
2. **City guides** (`/blog/amsterdam-met-peuters`): Long-form editorial content about visiting a city with toddlers. Renders in the sheet with map showing mentioned locations.
3. **Seasonal content** (`/blog/binnenspeeltuinen-regenachtige-dagen`): Timely guides that appear in the "Gidsen" section on the home sheet.
4. **Age-specific** (`/blog/uitjes-met-1-jarige`): Targeted content for specific age groups.
5. **Type deep-dives** (`/blog/beste-kinderboerderijen-nederland`): Comprehensive type overviews.
6. **Practical guides** (`/blog/peuter-proof-dagje-uit-checklist`): Utility content.

**Guides overview** (`/guides`): A dedicated route showing all guides organized by featured, latest, and city. Renders in the sheet/sidebar.

### Collection content (data-backed)

Region guides and city+type pages are populated from actual data:

```
/amsterdam/speeltuinen
→ Query: locations WHERE type='speeltuin' AND region='amsterdam' ORDER BY seo_quality_score DESC
```

These pages render in the app shell sheet and get:
- Auto-updated location cards from the database
- Editorial intro text (from region/type metadata)
- Internal links to each featured location
- Map with markers for all listed locations

### Editorial overrides

High-value location pages (top 50 by search volume from GSC data) get:
- `seo_intro_override`: Custom markdown intro paragraph
- `seo_title_override`: Manually crafted title tag
- `seo_description_override`: Manually crafted meta description
- Additional content sections (tips, what to expect, parking info)

### Content quality standards

- Minimum 150 words per location detail page (including auto-generated content)
- Minimum 500 words per blog post
- All content in Dutch (target audience is Dutch parents)
- No AI-generated filler text — every sentence must add value
- Photos must have descriptive `alt` text in Dutch

---

## 9. Event Taxonomy

All events follow a consistent shape:

```typescript
interface AnalyticsEvent {
  event_name: string;
  timestamp: string;         // ISO 8601
  session_id: string;
  user_id?: string;          // anonymous hash from cookie
  page_path: string;
  page_type: 'home' | 'region' | 'combo' | 'detail' | 'guide' | 'guides_overview' | 'partner' | 'legal';
  properties: Record<string, string | number | boolean>;
}
```

### Discovery events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `page_view` | `page_type`, `region`, `location_id` | Page load |
| `search_query` | `query`, `result_count` | Search submitted |
| `filter_apply` | `filter_type`, `filter_value`, `result_count` | Filter chip tapped |
| `filter_clear` | `filter_type` | Filter removed |
| `map_pan` | `center_lat`, `center_lng`, `zoom` | Map move ended (debounced 500ms) |
| `map_zoom` | `zoom_level`, `direction` (in/out) | Zoom changed |

### Engagement events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `marker_tap` | `location_id`, `location_type`, `region` | Map marker clicked |
| `card_tap` | `location_id`, `source` (list/nearby/collection) | Location card clicked |
| `detail_open` | `location_id`, `source` (search/map/card/direct) | Detail page opened |
| `detail_scroll_depth` | `location_id`, `depth_pct` (25/50/75/100) | Scroll milestones |
| `photo_view` | `location_id`, `photo_index` | Photo gallery interaction |
| `nearby_tap` | `source_location_id`, `target_location_id` | Nearby location clicked |

### Conversion events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `affiliate_click` | `provider` (tiqets/bol/thefork/booking), `location_id`, `destination_url` | Affiliate link clicked |
| `website_click` | `location_id`, `destination_url` | External website link clicked |
| `route_click` | `location_id`, `provider` (google_maps/apple_maps) | Directions link clicked |
| `share_click` | `location_id`, `method` (copy/whatsapp/native) | Share action |
| `favorite_toggle` | `location_id`, `action` (add/remove), `total_favorites` | Heart icon toggled |

### PWA events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `install_prompt_shown` | `page_path` | beforeinstallprompt fired |
| `install_accepted` | `page_path` | User accepted install |
| `app_reopened` | `source` (homescreen/notification) | App opened from installed state |
| `offline_served` | `page_path`, `cache_age_s` | Service worker served cached page |

### Commercial events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `featured_impression` | `location_id`, `placement` (list/map/sidebar), `position` | Featured listing visible in viewport |
| `featured_click` | `location_id`, `placement`, `position` | Featured listing clicked |
| `ad_impression` | `ad_unit`, `page_type`, `position` | AdSense ad rendered |
| `ad_click` | `ad_unit`, `page_type` | AdSense ad clicked (from GA4 publisher events) |

### Example event payload (sent to Supabase)

```json
{
  "event_name": "affiliate_click",
  "timestamp": "2026-03-28T14:22:31.000Z",
  "session_id": "s_abc123",
  "user_id": "u_def456",
  "page_path": "/amsterdam/artis",
  "page_type": "detail",
  "properties": {
    "provider": "tiqets",
    "location_id": 42,
    "destination_url": "https://www.tiqets.com/artis"
  }
}
```

---

## 10. Analytics Architecture

### Dual-track approach

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼─────────┐
     │   GA4 (gtag)    │     │  Custom tracker    │
     │  via Consent    │     │  (first-party JS)  │
     │  Mode v2        │     │                    │
     └────────┬────────┘     └─────────┬──────────┘
              │                        │
              ▼                        ▼
     Google Analytics         Supabase analytics_events
     (traffic, acquisition,   (product analytics,
      engagement, ads)         affiliate tracking,
                               funnel analysis)
```

### GA4 configuration

- Existing GA4 property, no changes needed to property setup
- Consent Mode v2 with `ad_storage`, `analytics_storage`, `ad_personalization` signals
- Enhanced measurement enabled (scroll, outbound clicks, site search)
- Custom dimensions: `page_type`, `region`, `location_type`
- Custom metrics: `affiliate_clicks`, `favorite_count`

### Supabase `analytics_events` table

```sql
CREATE TABLE analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id text,
  page_path text NOT NULL,
  page_type text NOT NULL,
  properties jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_events_name_time ON analytics_events (event_name, timestamp DESC);
CREATE INDEX idx_events_session ON analytics_events (session_id);
CREATE INDEX idx_events_location ON analytics_events ((properties->>'location_id')) WHERE properties->>'location_id' IS NOT NULL;

-- Partition by month for performance (locations detail pages will generate volume)
-- Consider partitioning once table exceeds ~1M rows
```

### Server-side SEO page view tracking

To measure SEO performance independently of client-side JS (blocked by consent, ad blockers):

```typescript
// In Next.js middleware or getServerSideProps
async function trackServerPageView(req: Request, pageType: string, metadata: Record<string, string>) {
  // Only for Googlebot or when we want server-side counts
  await supabase.from('page_views_server').insert({
    path: req.url,
    page_type: pageType,
    user_agent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
    metadata,
    timestamp: new Date().toISOString(),
  });
}
```

This gives a complete picture of crawl activity and organic page views regardless of consent state.

### Key dashboards

1. **Discovery funnel**: Home → Region guide → Location detail → Affiliate click (conversion rates at each step, all within app shell)
2. **Detail page performance**: Views, scroll depth, time on page, affiliate CTR — grouped by location type and region
3. **Affiliate performance**: Clicks per provider, per location, per page type, estimated revenue
4. **SEO health**: Pages indexed (from GSC), impressions, clicks, CTR, average position — trended weekly
5. **Guide engagement**: Guide views, scroll depth, click-through to location details, guide-to-action conversion
6. **Content quality**: Pages with high impressions but low CTR (title/description optimization candidates)

---

## 11. Commercial Analytics

### Affiliate tracking

Each affiliate link gets tagged with UTM-style parameters for the provider's tracking:

```html
<a href="https://www.tiqets.com/artis?partner=peuterplannen&utm_source=peuterplannen&utm_medium=affiliate&utm_campaign=location_detail"
   data-affiliate="tiqets"
   data-location-id="42"
   class="affiliate-link">
  Koop tickets bij Tiqets
</a>
```

On click, fire both:
- GA4 event: `affiliate_click` with provider label
- Supabase event: full payload with location_id and destination URL

### Revenue attribution query

```sql
-- Which SEO pages drive the most affiliate clicks?
SELECT
  page_path,
  page_type,
  properties->>'provider' AS provider,
  COUNT(*) AS clicks,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM analytics_events
WHERE event_name = 'affiliate_click'
  AND timestamp > now() - interval '30 days'
GROUP BY page_path, page_type, properties->>'provider'
ORDER BY clicks DESC
LIMIT 50;
```

### Featured listing metrics

```sql
-- CTR for featured listings by placement
SELECT
  properties->>'placement' AS placement,
  COUNT(*) FILTER (WHERE event_name = 'featured_impression') AS impressions,
  COUNT(*) FILTER (WHERE event_name = 'featured_click') AS clicks,
  ROUND(
    COUNT(*) FILTER (WHERE event_name = 'featured_click')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_name = 'featured_impression'), 0) * 100, 2
  ) AS ctr_pct
FROM analytics_events
WHERE event_name IN ('featured_impression', 'featured_click')
  AND timestamp > now() - interval '30 days'
GROUP BY properties->>'placement';
```

### Organic vs commercial separation

- All commercial metrics (affiliate clicks, featured impressions, ad revenue) are tracked separately from organic engagement
- Dashboard shows: organic page views, organic engagement → commercial conversion rate
- Never mix ad performance with content quality metrics

---

## 12. Monitoring

### Google Search Console integration

The existing `gsc_snapshots` table stores periodic GSC data. In v2, automate this:

```
Daily cron (GitHub Action or Supabase Edge Function):
1. Pull GSC Search Analytics API for last 3 days (data delay)
2. Store per-page: impressions, clicks, CTR, average position
3. Store per-query: same metrics
4. Alert if any metric drops >20% week-over-week
```

### Core Web Vitals

Monitor via:
- **CrUX API**: Monthly field data check (automated)
- **Lighthouse CI**: Run on every deploy for synthetic metrics
- **web-vitals.js**: Report real user metrics to Supabase

Key thresholds:
| Metric | Target | Alert |
|--------|--------|-------|
| LCP | < 2.5s | > 3.0s |
| INP | < 200ms | > 300ms |
| CLS | < 0.1 | > 0.15 |

### Indexation health

Weekly check (automated):
- Pages in sitemap vs pages indexed (from GSC)
- Pages with `noindex` that should be indexed (graduation drift)
- Pages indexed that should be `noindex` (stale cache)
- New 404s from GSC coverage report

### Crawl budget efficiency

Monitor via GSC crawl stats:
- Pages crawled per day
- Crawl response codes (should be >95% 200s)
- Average response time (target < 500ms)
- Ratio of useful crawls (indexed pages) vs wasted crawls (noindex, redirects, 404s)

### 404 monitoring and redirect health

```sql
-- Track 404s in middleware
CREATE TABLE redirect_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requested_path text NOT NULL,
  redirected_to text,        -- null if 404
  status_code int NOT NULL,  -- 301, 308, 404
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX idx_redirect_404 ON redirect_log (status_code, timestamp DESC)
  WHERE status_code = 404;
```

Weekly review:
- Top 404 paths → add redirects or fix broken links
- Redirect chains (A → B → C) → flatten to A → C
- Old `.html` URLs still getting traffic → verify redirects work

---

## Summary: Priority order of implementation

1. **Unified app shell with SSR** — all pages render within the map + sheet/sidebar layout. This is the foundation.
2. **Location detail SSR pages** (Section 3) — biggest SEO impact. Content rendered in the detail sheet/sidebar.
3. **Redirect map** (Section 1) — preserve existing authority on migration
4. **Structured data** (Section 4) — rich results in search, rendered server-side within app layout
5. **Region guides + guides feature** (Section 8) — guides replace blog as discovery content layer, rendered in sheet/sidebar
6. **Sitemap generation** (Section 6) — ensure crawling works
7. **Event tracking** (Section 9-10) — measure everything from day one
8. **Internal linking** (Section 5) — strengthen page authority, all links within app shell
9. **Monitoring** (Section 12) — automated health checks
