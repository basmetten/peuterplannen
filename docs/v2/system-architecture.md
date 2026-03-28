# System Architecture — PeuterPlannen v2

> Phase 0 documentation. This document defines the technical architecture for the PeuterPlannen rebuild on Next.js App Router. An engineer should be able to scaffold the project from this document alone.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│                                                              │
│  ┌────────────────────────────────┐  ┌───────────────────┐  │
│  │          (app)                 │  │  Service Worker   │  │
│  │  Unified App Shell             │  │  Offline + Cache  │  │
│  │  SSR content in sheet/sidebar  │  │                   │  │
│  │  MapLibre + TanStack Q         │  │                   │  │
│  │  XState (sheet orchestration)  │  │                   │  │
│  └────────────────────────────────┘  └───────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │  (portal)   │  │   (legal)    │                          │
│  │  Partner/   │  │  Simple page │                          │
│  │  Admin      │  │  layout      │                          │
│  └─────────────┘  └──────────────┘                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ fetch / RSC payload
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server (BFF)                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Server       │  │ Route        │  │  ISR / SSG        │  │
│  │ Components   │  │ Handlers     │  │  Revalidation     │  │
│  │ (data fetch) │  │ (/api/*)     │  │                   │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────┘  │
│         │                 │                                   │
│         ▼                 ▼                                   │
│  ┌─────────────────────────────────┐                         │
│  │  Data Access Layer              │                         │
│  │  Repositories + Zod validation  │                         │
│  └──────────────┬──────────────────┘                         │
└─────────────────┼───────────────────────────────────────────┘
                  │ supabase-js (service key)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                             │
│  locations · regions · editorial_pages · analytics_events    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Open-Meteo API (weather, free, no key)          │
│  GET /v1/forecast?current=temperature_2m,precipitation       │
└─────────────────────────────────────────────────────────────┘
```

### Key boundaries

- **Client never talks to Supabase directly.** All data flows through Next.js server components or route handlers. The Supabase service key lives only in server-side environment variables.
- **Route groups** separate concerns:
  - `app/(app)/` — Unified app shell: map + sheet/sidebar. ALL user-facing content renders here. SSR/SSG content is pre-rendered inside the sheet/sidebar container. The map persists across navigations.
  - `app/(portal)/` — Separate layout for partner/admin dashboards. No map.
  - `app/(legal)/` — Minimal page layout for privacy, terms, about, contact. No map.
- **The app IS the website.** There is no separate marketing layout. SEO pages (region hubs, location details, guides) are routes within the `(app)` layout. Google gets SSR HTML rendered inside the sheet/sidebar. Users see the map-first experience.
- **BFF pattern**: Next.js acts as Backend for Frontend. Server components fetch and shape data. Route handlers (`app/api/`) serve JSON for client-side TanStack Query when needed (e.g., viewport-based location fetching).

---

## 2. Directory Structure

```
peuterplannen-v2/
├── app/
│   ├── (app)/                    # Unified app shell — map + sheet/sidebar
│   │   ├── layout.tsx            # App layout: map background, sheet/sidebar, tab bar
│   │   ├── page.tsx              # Home: map + browse sheet with suggestions + guides
│   │   ├── [region]/
│   │   │   ├── page.tsx          # Region guide: map centered + sheet with guide content
│   │   │   ├── [type]/
│   │   │   │   └── page.tsx      # City+type: map with type markers + filtered list
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Location detail: map centered + detail sheet
│   │   ├── blog/
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Article: map background + sheet with content
│   │   └── guides/
│   │       └── page.tsx          # Guides overview: sheet with guide cards
│   ├── (portal)/                 # Separate layout — NO map
│   │   ├── layout.tsx            # Portal layout (standard page, auth required)
│   │   ├── partner/
│   │   │   └── page.tsx          # Partner portal (claim/manage listing)
│   │   └── admin/
│   │       └── page.tsx          # Admin dashboard
│   ├── (legal)/                  # Minimal layout — NO map
│   │   ├── layout.tsx            # Legal layout (simple page, minimal chrome)
│   │   ├── privacy/
│   │   │   └── page.tsx          # Privacy policy
│   │   ├── terms/
│   │   │   └── page.tsx          # Terms of service
│   │   ├── about/
│   │   │   └── page.tsx          # About PeuterPlannen
│   │   └── contact/
│   │       └── page.tsx          # Contact form
│   ├── api/
│   │   ├── locations/
│   │   │   └── route.ts          # GET: filtered locations (GeoJSON or JSON)
│   │   ├── location/[slug]/
│   │   │   └── route.ts          # GET: single location detail
│   │   ├── regions/
│   │   │   └── route.ts          # GET: all regions
│   │   ├── analytics/
│   │   │   └── route.ts          # POST: track events
│   │   └── revalidate/
│   │       └── route.ts          # POST: on-demand ISR trigger (webhook from Supabase)
│   ├── layout.tsx                # Root layout (fonts, metadata, viewport)
│   ├── manifest.ts               # PWA manifest generation
│   └── sitemap.ts                # Dynamic sitemap generation
├── src/
│   ├── domain/                   # Pure domain — no framework imports
│   │   ├── types.ts              # Core TypeScript types
│   │   ├── enums.ts              # LocationType, Weather, etc.
│   │   ├── schemas.ts            # Zod schemas for validation
│   │   ├── scoring.ts            # PeuterScore computation
│   │   └── filters.ts            # Filter logic (pure functions)
│   ├── features/                 # Feature modules
│   │   ├── map/
│   │   │   ├── MapContainer.tsx
│   │   │   ├── MapAdapter.ts     # MapLibre adapter interface
│   │   │   ├── MapLibreAdapter.ts
│   │   │   ├── useMapState.ts
│   │   │   ├── markers.ts        # Marker rendering logic
│   │   │   └── clustering.ts
│   │   ├── sheet/
│   │   │   ├── Sheet.tsx
│   │   │   ├── sheetMachine.ts   # XState state machine
│   │   │   ├── SheetContent.tsx
│   │   │   └── useSheet.ts
│   │   ├── filters/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── FilterModal.tsx
│   │   │   ├── useFilters.ts     # URL param sync
│   │   │   └── presets.ts
│   │   ├── search/
│   │   │   ├── SearchInput.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── useSearch.ts
│   │   ├── detail/
│   │   │   ├── DetailView.tsx
│   │   │   ├── DetailHeader.tsx
│   │   │   ├── DetailScoring.tsx
│   │   │   └── DetailActions.tsx
│   │   ├── favorites/
│   │   │   ├── FavoriteButton.tsx
│   │   │   ├── FavoritesSheet.tsx
│   │   │   └── useFavorites.ts   # localStorage-backed
│   │   ├── guides/
│   │   │   ├── GuidesOverview.tsx  # Guides section for home + /guides
│   │   │   ├── GuideCard.tsx       # Card component for guide entries
│   │   │   ├── GuideContent.tsx    # Article/guide content renderer (sheet)
│   │   │   ├── RegionGuide.tsx     # Region guide content component
│   │   │   └── useGuides.ts       # Guide data fetching + state
│   │   └── plan/
│   │       ├── PlanSheet.tsx
│   │       └── usePlan.ts
│   ├── components/
│   │   ├── primitives/           # Design system atoms
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── Icon.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Sheet.tsx         # Headless sheet primitive
│   │   │   └── Typography.tsx
│   │   └── patterns/             # Composed patterns
│   │       ├── LocationCard.tsx
│   │       ├── LocationList.tsx
│   │       ├── FilterBar.tsx
│   │       ├── RegionCard.tsx
│   │       ├── TypeIcon.tsx
│   │       ├── ScoreBreakdown.tsx
│   │       └── StructuredData.tsx
│   ├── lib/
│   │   ├── supabase.ts           # Server-only Supabase client
│   │   ├── constants.ts
│   │   ├── config.ts
│   │   ├── url.ts                # URL building helpers
│   │   └── cn.ts                 # Tailwind class merge utility
│   └── server/                   # Server-only data access
│       ├── repositories/
│       │   ├── location.repo.ts
│       │   ├── region.repo.ts
│       │   ├── editorial.repo.ts
│       │   └── analytics.repo.ts
│       └── services/
│           ├── location.service.ts   # Business logic on top of repo
│           ├── search.service.ts
│           └── revalidation.service.ts
├── docs/v2/                      # This documentation
├── public/
│   ├── icons/                    # PWA icons
│   ├── fonts/                    # Inter (body), Newsreader (location name accent)
│   └── og/                       # OG images
├── tests/
│   ├── e2e/                      # Playwright E2E
│   ├── visual/                   # Playwright visual regression
│   └── unit/                     # Vitest unit tests
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 3. Domain Model

### Core types

```typescript
// src/domain/enums.ts

export const LOCATION_TYPES = [
  'play', 'farm', 'nature', 'museum',
  'swim', 'pancake', 'horeca', 'culture',
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const WEATHER_OPTIONS = ['indoor', 'outdoor', 'both'] as const;
export type Weather = (typeof WEATHER_OPTIONS)[number];

export const AGE_GROUPS = ['0-2', '2-4', '4-7'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const SHEET_STATES = ['hidden', 'peek', 'half', 'full'] as const;
export type SheetState = (typeof SHEET_STATES)[number];
```

```typescript
// src/domain/types.ts

import type { LocationType, Weather, AgeGroup, SheetState } from './enums';

/** Core location entity — the central model of the entire app */
export interface Location {
  id: number;
  slug: string;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  region_slug: string;

  // Descriptive
  description: string;
  short_description: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;

  // Classification
  weather: Weather;
  age_groups: AgeGroup[];
  facilities: string[];  // e.g., ['parking', 'cafe', 'accessible', 'covered']

  // Quality dimensions (1-5 scale)
  quality_toddler_friendly: number | null;
  quality_safety: number | null;
  quality_facilities: number | null;
  quality_value: number | null;
  quality_atmosphere: number | null;

  // Computed
  peuter_score: number | null;  // 0-100, computed from quality dimensions

  // Media
  photo_url: string | null;
  photo_alt: string | null;
  photos: string[];  // additional photos

  // SEO
  meta_title: string | null;
  meta_description: string | null;
  seo_graduated: boolean;

  // Monetization
  featured: boolean;
  affiliate_url: string | null;

  // Verification
  verified: boolean;
  verified_at: string | null;
  last_checked_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Lightweight projection for map markers and list cards */
export interface LocationSummary {
  id: number;
  slug: string;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  region_slug: string;
  short_description: string | null;
  weather: Weather;
  peuter_score: number | null;
  photo_url: string | null;
  featured: boolean;
  city: string | null;
}

/** GeoJSON Feature for map rendering */
export interface LocationFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [lng: number, lat: number] };
  properties: LocationSummary;
}

export interface Region {
  id: number;
  name: string;
  slug: string;
  tier: number;  // 1 = major city, 2 = city, 3 = area
  blurb: string | null;
  schema_type: string;  // e.g., 'City', 'AdministrativeArea'
  location_count?: number;
}

export interface EditorialPage {
  id: number;
  slug: string;
  page_type: 'blog' | 'guide' | 'landing';
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  body_markdown: string;
  faq_json: Array<{ question: string; answer: string }> | null;
  curated_location_ids: number[] | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Computed PeuterScore breakdown */
export interface PeuterScore {
  total: number;          // 0-100
  toddlerFriendly: number;
  safety: number;
  facilities: number;
  value: number;
  atmosphere: number;
  dataCompleteness: number;  // bonus for having all fields
}

/** Filter state — always derived from URL search params */
export interface FilterState {
  types: LocationType[];
  weather: Weather | null;
  ageGroups: AgeGroup[];
  region: string | null;
  query: string;
  minScore: number | null;
  facilities: string[];
}

/** Map viewport for viewport-based fetching */
export interface MapViewport {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
  center: { lat: number; lng: number };
}
```

### Sheet state machines

The app uses **two separate sheets** that are never visible simultaneously. Transitions between them are choreographed by a coordinator (see section 10).

- **Browse sheet**: search bar, filter chips, result cards, contextual suggestions
- **Detail sheet**: full location detail (photo carousel, scores, info, actions)

```typescript
// src/features/sheet/browseSheetMachine.ts

import { setup, assign } from 'xstate';

export type BrowseSheetEvent =
  | { type: 'DRAG_START'; y: number }
  | { type: 'DRAG_MOVE'; y: number; velocity: number }
  | { type: 'DRAG_END'; velocity: number }
  | { type: 'SNAP_TO'; target: 'peek' | 'half' | 'full' | 'hidden' }
  | { type: 'CONTENT_TAP' }
  | { type: 'SEARCH_FOCUS' }
  | { type: 'FILTER_OPEN' }
  | { type: 'ESCAPE' };

interface BrowseSheetContext {
  translateY: number;
  dragStartY: number;
}

export const browseSheetMachine = setup({
  types: {} as {
    context: BrowseSheetContext;
    events: BrowseSheetEvent;
  },
}).createMachine({
  id: 'browseSheet',
  initial: 'peek',
  context: {
    translateY: 0,
    dragStartY: 0,
  },
  states: {
    hidden: {
      on: {
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'peek', target: 'peek' },
          { guard: ({ event }) => event.target === 'half', target: 'half' },
          { guard: ({ event }) => event.target === 'full', target: 'full' },
        ],
      },
    },
    peek: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity < -0.5, target: 'half' },
          { target: 'peek' },
        ],
        CONTENT_TAP: { target: 'half' },
        SEARCH_FOCUS: { target: 'full' },
        FILTER_OPEN: { target: 'half' },
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'half', target: 'half' },
          { guard: ({ event }) => event.target === 'full', target: 'full' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
      },
    },
    half: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity < -0.5, target: 'full' },
          { guard: ({ event }) => event.velocity > 0.5, target: 'peek' },
          { target: 'half' },
        ],
        SEARCH_FOCUS: { target: 'full' },
        ESCAPE: { target: 'peek' },
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'peek', target: 'peek' },
          { guard: ({ event }) => event.target === 'full', target: 'full' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
      },
    },
    full: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity > 0.5, target: 'half' },
          { target: 'full' },
        ],
        ESCAPE: { target: 'half' },
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'half', target: 'half' },
          { guard: ({ event }) => event.target === 'peek', target: 'peek' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
      },
    },
  },
});
```

```typescript
// src/features/sheet/detailSheetMachine.ts

import { setup, assign } from 'xstate';

export type DetailSheetEvent =
  | { type: 'DRAG_START'; y: number }
  | { type: 'DRAG_MOVE'; y: number; velocity: number }
  | { type: 'DRAG_END'; velocity: number }
  | { type: 'SNAP_TO'; target: 'peek' | 'half' | 'full' | 'hidden' }
  | { type: 'OPEN'; locationSlug: string }
  | { type: 'BACK' }
  | { type: 'ESCAPE' };

interface DetailSheetContext {
  translateY: number;
  dragStartY: number;
  locationSlug: string | null;
}

export const detailSheetMachine = setup({
  types: {} as {
    context: DetailSheetContext;
    events: DetailSheetEvent;
  },
}).createMachine({
  id: 'detailSheet',
  initial: 'hidden',
  context: {
    translateY: 0,
    dragStartY: 0,
    locationSlug: null,
  },
  states: {
    hidden: {
      on: {
        OPEN: {
          target: 'half',
          actions: assign({ locationSlug: ({ event }) => event.locationSlug }),
        },
      },
    },
    peek: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity < -0.5, target: 'half' },
          { target: 'peek' },
        ],
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'half', target: 'half' },
          { guard: ({ event }) => event.target === 'full', target: 'full' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
        BACK: {
          target: 'hidden',
          actions: assign({ locationSlug: null }),
        },
        ESCAPE: {
          target: 'hidden',
          actions: assign({ locationSlug: null }),
        },
      },
    },
    half: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity < -0.5, target: 'full' },
          { guard: ({ event }) => event.velocity > 0.5, target: 'peek' },
          { target: 'half' },
        ],
        BACK: {
          target: 'hidden',
          actions: assign({ locationSlug: null }),
        },
        ESCAPE: { target: 'peek' },
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'peek', target: 'peek' },
          { guard: ({ event }) => event.target === 'full', target: 'full' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
      },
    },
    full: {
      on: {
        DRAG_END: [
          { guard: ({ event }) => event.velocity > 0.5, target: 'half' },
          { target: 'full' },
        ],
        BACK: {
          target: 'hidden',
          actions: assign({ locationSlug: null }),
        },
        ESCAPE: { target: 'half' },
        SNAP_TO: [
          { guard: ({ event }) => event.target === 'half', target: 'half' },
          { guard: ({ event }) => event.target === 'peek', target: 'peek' },
          { guard: ({ event }) => event.target === 'hidden', target: 'hidden' },
        ],
      },
    },
  },
});
```

**Choreography rule**: Only one sheet is visible at a time. When a card is tapped in the browse sheet, the coordinator:
1. Sends `SNAP_TO hidden` to the browse sheet
2. Waits for the exit animation to complete (~200ms)
3. Sends `OPEN { locationSlug }` to the detail sheet

When BACK is pressed on the detail sheet, the reverse happens: detail hides, browse restores to its previous state.

### Map interaction state machine

```typescript
// src/features/map/mapMachine.ts

import { setup, assign } from 'xstate';

interface MapContext {
  selectedMarkerId: number | null;
  selectedClusterId: number | null;
  carouselLocationIds: number[] | null;
  viewport: MapViewport | null;
}

type MapEvent =
  | { type: 'MAP_MOVE'; viewport: MapViewport }
  | { type: 'MARKER_TAP'; locationId: number }
  | { type: 'CLUSTER_TAP'; clusterId: number; expansion: MapViewport }
  | { type: 'MAP_TAP' }  // tap on empty map area
  | { type: 'DETAIL_CLOSE' }
  | { type: 'GPS_LOCATE'; center: { lat: number; lng: number } }
  | { type: 'CAROUSEL_OPEN'; locationIds: number[] }
  | { type: 'CAROUSEL_SWIPE'; locationId: number }
  | { type: 'CAROUSEL_CLOSE' };

export const mapMachine = setup({
  types: {} as {
    context: MapContext;
    events: MapEvent;
  },
}).createMachine({
  id: 'map',
  initial: 'idle',
  context: {
    selectedMarkerId: null,
    selectedClusterId: null,
    carouselLocationIds: null,
    viewport: null,
  },
  states: {
    idle: {
      on: {
        MAP_MOVE: {
          target: 'browsing',
          actions: assign({ viewport: ({ event }) => event.viewport }),
        },
        MARKER_TAP: {
          target: 'markerSelected',
          actions: assign({ selectedMarkerId: ({ event }) => event.locationId }),
        },
        CLUSTER_TAP: {
          target: 'clusterSelected',
          actions: assign({ selectedClusterId: ({ event }) => event.clusterId }),
        },
        GPS_LOCATE: { target: 'idle' },
      },
    },
    browsing: {
      on: {
        MAP_MOVE: {
          actions: assign({ viewport: ({ event }) => event.viewport }),
        },
        MARKER_TAP: {
          target: 'markerSelected',
          actions: assign({ selectedMarkerId: ({ event }) => event.locationId }),
        },
        CLUSTER_TAP: {
          target: 'clusterSelected',
          actions: assign({ selectedClusterId: ({ event }) => event.clusterId }),
        },
      },
      after: {
        2000: 'idle',  // settle back to idle after 2s of no movement
      },
    },
    clusterSelected: {
      on: {
        MAP_MOVE: {
          target: 'browsing',
          actions: assign({
            selectedClusterId: null,
            viewport: ({ event }) => event.viewport,
          }),
        },
        MARKER_TAP: {
          target: 'markerSelected',
          actions: assign({
            selectedClusterId: null,
            selectedMarkerId: ({ event }) => event.locationId,
          }),
        },
        MAP_TAP: {
          target: 'idle',
          actions: assign({ selectedClusterId: null }),
        },
      },
    },
    markerSelected: {
      // When a marker is selected, sheet transitions to detail view
      on: {
        MAP_TAP: {
          target: 'idle',
          actions: assign({ selectedMarkerId: null }),
        },
        MARKER_TAP: {
          actions: assign({ selectedMarkerId: ({ event }) => event.locationId }),
        },
        DETAIL_CLOSE: {
          target: 'idle',
          actions: assign({ selectedMarkerId: null }),
        },
        MAP_MOVE: {
          target: 'browsing',
          actions: assign({
            selectedMarkerId: null,
            viewport: ({ event }) => event.viewport,
          }),
        },
        CAROUSEL_OPEN: {
          target: 'carousel',
          actions: assign({
            carouselLocationIds: ({ event }) => event.locationIds,
            selectedMarkerId: ({ event }) => event.locationIds[0] ?? null,
          }),
        },
      },
    },
    carousel: {
      // Horizontal card carousel overlay on the map (e.g., after cluster tap)
      on: {
        CAROUSEL_SWIPE: {
          actions: assign({ selectedMarkerId: ({ event }) => event.locationId }),
        },
        MARKER_TAP: {
          actions: assign({ selectedMarkerId: ({ event }) => event.locationId }),
        },
        CAROUSEL_CLOSE: {
          target: 'idle',
          actions: assign({
            selectedMarkerId: null,
            carouselLocationIds: null,
          }),
        },
        MAP_TAP: {
          target: 'idle',
          actions: assign({
            selectedMarkerId: null,
            carouselLocationIds: null,
          }),
        },
      },
    },
  },
});
```

### Smart contextual suggestion engine

The app surfaces 4–6 contextual suggestion presets based on real-time signals. Each preset is a label + SVG icon + filter combination displayed as horizontally scrollable chips in the browse sheet's peek/half state.

**Inputs:**

| Signal | Source | Fetched where |
|--------|--------|---------------|
| Current weather (temp, precipitation) | Open-Meteo API (free, no key) | Server-side route handler, cached 30 min |
| Time of day | `new Date()` | Client-side |
| Day of week (weekend vs weekday) | `new Date()` | Client-side |
| Season | Derived from date | Client-side |
| User preferences | `localStorage` (visited types, favorites) | Client-side |

**Weather API (Open-Meteo):**

```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,precipitation
```

No API key required. Server-side fetch via route handler to avoid CORS and enable caching:

```typescript
// app/api/weather/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat') ?? '52.37';  // default: Amsterdam
  const lng = searchParams.get('lng') ?? '4.90';

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation`,
    { next: { revalidate: 1800 } }  // cache 30 min
  );
  return Response.json(await res.json());
}
```

**Output example:**

```typescript
// Rainy Saturday morning → indoor-friendly presets
[
  { label: 'Lekker binnen', icon: 'indoor', filters: { indoor: true } },
  { label: 'Museum', icon: 'museum', filters: { type: 'museum' } },
  { label: 'Zwembad', icon: 'pool', filters: { type: 'zwembad' } },
  { label: 'Speelparadijs', icon: 'playground-indoor', filters: { type: 'speelparadijs' } },
]

// Sunny Wednesday afternoon → outdoor presets
[
  { label: 'Speeltuin', icon: 'playground', filters: { type: 'speeltuin' } },
  { label: 'Boerderij', icon: 'farm', filters: { type: 'boerderij' } },
  { label: 'Gratis', icon: 'free', filters: { free: true } },
  { label: 'Natuur', icon: 'nature', filters: { type: 'natuur' } },
]
```

The ranking algorithm is intentionally simple — a weighted score per preset based on weather match, time appropriateness, and user history. No ML.

---

## 4. Data Access Layer

### Supabase client (server-only)

```typescript
// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

// This file should only be imported in server components and route handlers.
// The 'server-only' package enforces this at build time.
import 'server-only';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);
```

### Zod schemas for validation

```typescript
// src/domain/schemas.ts

import { z } from 'zod';
import { LOCATION_TYPES, WEATHER_OPTIONS, AGE_GROUPS } from './enums';

export const LocationRowSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(LOCATION_TYPES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  region_slug: z.string(),
  description: z.string(),
  short_description: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  website: z.string().url().nullable().or(z.literal('')),
  phone: z.string().nullable(),
  weather: z.enum(WEATHER_OPTIONS),
  age_groups: z.array(z.enum(AGE_GROUPS)).default([]),
  facilities: z.array(z.string()).default([]),
  quality_toddler_friendly: z.number().min(1).max(5).nullable(),
  quality_safety: z.number().min(1).max(5).nullable(),
  quality_facilities: z.number().min(1).max(5).nullable(),
  quality_value: z.number().min(1).max(5).nullable(),
  quality_atmosphere: z.number().min(1).max(5).nullable(),
  peuter_score: z.number().min(0).max(100).nullable(),
  photo_url: z.string().nullable(),
  photo_alt: z.string().nullable(),
  photos: z.array(z.string()).default([]),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  seo_graduated: z.boolean(),
  featured: z.boolean(),
  affiliate_url: z.string().nullable(),
  verified: z.boolean(),
  verified_at: z.string().nullable(),
  last_checked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const LocationSummarySchema = LocationRowSchema.pick({
  id: true,
  slug: true,
  name: true,
  type: true,
  lat: true,
  lng: true,
  region_slug: true,
  short_description: true,
  weather: true,
  peuter_score: true,
  photo_url: true,
  featured: true,
  city: true,
});

export const RegionRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  tier: z.number().min(1).max(3),
  blurb: z.string().nullable(),
  schema_type: z.string(),
});

export const EditorialPageSchema = z.object({
  id: z.number(),
  slug: z.string(),
  page_type: z.enum(['blog', 'guide', 'landing']),
  title: z.string(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  body_markdown: z.string(),
  faq_json: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).nullable(),
  curated_location_ids: z.array(z.number()).nullable(),
  published: z.boolean(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LocationRow = z.infer<typeof LocationRowSchema>;
export type RegionRow = z.infer<typeof RegionRowSchema>;
export type EditorialPageRow = z.infer<typeof EditorialPageSchema>;
```

### Repository pattern

```typescript
// src/server/repositories/location.repo.ts

import 'server-only';
import { supabase } from '@/lib/supabase';
import { LocationRowSchema, LocationSummarySchema } from '@/domain/schemas';
import type { Location, LocationSummary, FilterState, MapViewport } from '@/domain/types';

// Column selections to avoid fetching all ~60 fields when not needed
const SUMMARY_COLUMNS = `
  id, slug, name, type, lat, lng, region_slug,
  short_description, weather, peuter_score,
  photo_url, featured, city
`;

const DETAIL_COLUMNS = '*';

export const LocationRepository = {
  /** Fetch all locations as summaries (for map markers + list) */
  async getAllSummaries(): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(SUMMARY_COLUMNS);

    if (error) throw new Error(`Failed to fetch locations: ${error.message}`);
    return data.map((row) => LocationSummarySchema.parse(row));
  },

  /** Fetch locations within a map viewport */
  async getByViewport(viewport: MapViewport): Promise<LocationSummary[]> {
    const { bounds } = viewport;
    const { data, error } = await supabase
      .from('locations')
      .select(SUMMARY_COLUMNS)
      .gte('lat', bounds.south)
      .lte('lat', bounds.north)
      .gte('lng', bounds.west)
      .lte('lng', bounds.east);

    if (error) throw new Error(`Failed to fetch by viewport: ${error.message}`);
    return data.map((row) => LocationSummarySchema.parse(row));
  },

  /** Fetch a single location by slug (full detail) */
  async getBySlug(slug: string): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select(DETAIL_COLUMNS)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch location: ${error.message}`);
    }
    if (!data) return null;
    return LocationRowSchema.parse(data) as Location;
  },

  /** Fetch locations by region (for region hub pages) */
  async getByRegion(regionSlug: string): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(SUMMARY_COLUMNS)
      .eq('region_slug', regionSlug)
      .order('peuter_score', { ascending: false, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch by region: ${error.message}`);
    return data.map((row) => LocationSummarySchema.parse(row));
  },

  /** Fetch locations by type (for city+type combo pages and filtering) */
  async getByType(type: string): Promise<LocationSummary[]> {
    const { data, error } = await supabase
      .from('locations')
      .select(SUMMARY_COLUMNS)
      .eq('type', type)
      .order('peuter_score', { ascending: false, nullsFirst: false });

    if (error) throw new Error(`Failed to fetch by type: ${error.message}`);
    return data.map((row) => LocationSummarySchema.parse(row));
  },

  /** Fetch SEO-graduated locations only (for sitemap, static generation) */
  async getSeoGraduated(): Promise<Array<{ slug: string; updated_at: string }>> {
    const { data, error } = await supabase
      .from('locations')
      .select('slug, updated_at')
      .eq('seo_graduated', true);

    if (error) throw new Error(`Failed to fetch SEO locations: ${error.message}`);
    return data;
  },

  /** Convert summaries to GeoJSON FeatureCollection */
  toGeoJSON(locations: LocationSummary[]) {
    return {
      type: 'FeatureCollection' as const,
      features: locations.map((loc) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat] as [number, number],
        },
        properties: loc,
      })),
    };
  },
};
```

### Caching strategy

| Data | Strategy | TTL |
|------|----------|-----|
| Region guide pages | ISR (Static Generation) | Revalidate on Supabase webhook or every 1 hour |
| City+type combo pages | ISR | Same as region |
| Location detail (in app shell) | ISR | Revalidate on data change, fallback: 30 min |
| Location detail (app) | TanStack Query | `staleTime: 5 min`, `gcTime: 30 min` |
| All locations (markers) | TanStack Query | `staleTime: 10 min`, prefetched in app shell |
| Regions list | TanStack Query | `staleTime: 1 hour` (rarely changes) |
| Editorial pages | ISR | Revalidate on publish |

---

## 5. State Management

### Overview

```
┌────────────────────────────────────┐
│         URL (source of truth)      │  ← filters, region, selected location
├────────────────────────────────────┤
│  TanStack Query (server state)     │  ← locations, regions, detail data
├────────────────────────────────────┤
│  XState (UI orchestration)         │  ← sheet position, map interaction mode
├────────────────────────────────────┤
│  localStorage (preferences)        │  ← favorites, city, age, transport
└────────────────────────────────────┘
```

### TanStack Query setup

```typescript
// src/features/locations/queries.ts

import { queryOptions } from '@tanstack/react-query';
import type { LocationSummary, Location, FilterState } from '@/domain/types';

export const locationQueries = {
  all: () =>
    queryOptions<LocationSummary[]>({
      queryKey: ['locations'],
      queryFn: () => fetch('/api/locations').then((r) => r.json()),
      staleTime: 10 * 60 * 1000,  // 10 minutes
    }),

  filtered: (filters: FilterState) =>
    queryOptions<LocationSummary[]>({
      queryKey: ['locations', filters],
      queryFn: () => {
        const params = new URLSearchParams();
        if (filters.types.length) params.set('types', filters.types.join(','));
        if (filters.weather) params.set('weather', filters.weather);
        if (filters.region) params.set('region', filters.region);
        if (filters.query) params.set('q', filters.query);
        return fetch(`/api/locations?${params}`).then((r) => r.json());
      },
      staleTime: 5 * 60 * 1000,
    }),

  detail: (slug: string) =>
    queryOptions<Location>({
      queryKey: ['location', slug],
      queryFn: () => fetch(`/api/location/${slug}`).then((r) => r.json()),
      staleTime: 5 * 60 * 1000,
    }),
};
```

### URL as state (filters)

```typescript
// src/features/filters/useFilters.ts

'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import type { FilterState, LocationType, Weather, AgeGroup } from '@/domain/types';
import { LOCATION_TYPES, WEATHER_OPTIONS, AGE_GROUPS } from '@/domain/enums';

const DEFAULT_FILTERS: FilterState = {
  types: [],
  weather: null,
  ageGroups: [],
  region: null,
  query: '',
  minScore: null,
  facilities: [],
};

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterState = useMemo(() => ({
    types: parseEnumList(searchParams.get('types'), LOCATION_TYPES),
    weather: parseEnum(searchParams.get('weather'), WEATHER_OPTIONS),
    ageGroups: parseEnumList(searchParams.get('ages'), AGE_GROUPS),
    region: searchParams.get('region'),
    query: searchParams.get('q') ?? '',
    minScore: searchParams.get('score') ? Number(searchParams.get('score')) : null,
    facilities: searchParams.get('facilities')?.split(',').filter(Boolean) ?? [],
  }), [searchParams]);

  const setFilters = useCallback((updates: Partial<FilterState>) => {
    const next = { ...filters, ...updates };
    const params = new URLSearchParams();

    if (next.types.length) params.set('types', next.types.join(','));
    if (next.weather) params.set('weather', next.weather);
    if (next.ageGroups.length) params.set('ages', next.ageGroups.join(','));
    if (next.region) params.set('region', next.region);
    if (next.query) params.set('q', next.query);
    if (next.minScore) params.set('score', String(next.minScore));
    if (next.facilities.length) params.set('facilities', next.facilities.join(','));

    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [filters, router, pathname]);

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const isFiltered = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  }, [filters]);

  return { filters, setFilters, clearFilters, isFiltered };
}

// Helpers
function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return value && allowed.includes(value as T) ? (value as T) : null;
}

function parseEnumList<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T[] {
  if (!value) return [];
  return value.split(',').filter((v): v is T => allowed.includes(v as T));
}
```

### localStorage for preferences and favorites

```typescript
// src/features/favorites/useFavorites.ts

'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'pp:favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavoriteIds(new Set(JSON.parse(stored)));
    } catch { /* ignore corrupt data */ }
  }, []);

  const persist = useCallback((ids: Set<number>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }, []);

  const toggle = useCallback((id: number) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  }, [persist]);

  const isFavorite = useCallback(
    (id: number) => favoriteIds.has(id),
    [favoriteIds],
  );

  return { favoriteIds, toggle, isFavorite, count: favoriteIds.size };
}
```

---

## 6. Map Architecture

### Adapter interface

```typescript
// src/features/map/MapAdapter.ts

import type { LocationFeature, MapViewport } from '@/domain/types';

/**
 * Abstract map adapter. Allows swapping MapLibre for another provider
 * without touching feature code.
 */
export interface MapAdapter {
  initialize(container: HTMLElement, options: MapInitOptions): void;
  destroy(): void;

  // Data
  setLocations(geojson: GeoJSON.FeatureCollection): void;

  // Viewport
  getViewport(): MapViewport;
  flyTo(center: { lat: number; lng: number }, zoom?: number): void;
  fitBounds(bounds: MapViewport['bounds'], padding?: number): void;

  // Markers
  setSelectedMarker(locationId: number | null): void;

  // Events
  onViewportChange(callback: (viewport: MapViewport) => void): void;
  onMarkerClick(callback: (feature: LocationFeature) => void): void;
  onClusterClick(callback: (clusterId: number, expansion: MapViewport) => void): void;
  onMapClick(callback: () => void): void;

  // Clustering
  enableClustering(options: ClusterOptions): void;
}

export interface MapInitOptions {
  center: { lat: number; lng: number };
  zoom: number;
  styleUrl: string;
  minZoom?: number;
  maxZoom?: number;
}

export interface ClusterOptions {
  radius: number;      // cluster radius in pixels (default: 50)
  maxZoom: number;     // max zoom to cluster at (default: 14)
}
```

### MapLibre implementation

```typescript
// src/features/map/MapLibreAdapter.ts

import maplibregl from 'maplibre-gl';
import type { MapAdapter, MapInitOptions, ClusterOptions } from './MapAdapter';
import type { LocationFeature, MapViewport } from '@/domain/types';

export class MapLibreAdapter implements MapAdapter {
  private map: maplibregl.Map | null = null;
  private SOURCE_ID = 'locations';
  private CLUSTER_LAYER = 'clusters';
  private MARKER_LAYER = 'markers';

  initialize(container: HTMLElement, options: MapInitOptions) {
    this.map = new maplibregl.Map({
      container,
      style: options.styleUrl,
      center: [options.center.lng, options.center.lat],
      zoom: options.zoom,
      minZoom: options.minZoom ?? 4,
      maxZoom: options.maxZoom ?? 18,
      attributionControl: false,
    });
  }

  destroy() {
    this.map?.remove();
    this.map = null;
  }

  setLocations(geojson: GeoJSON.FeatureCollection) {
    if (!this.map) return;
    const source = this.map.getSource(this.SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
    // Source is added in enableClustering on first call
  }

  enableClustering(options: ClusterOptions) {
    if (!this.map) return;

    this.map.addSource(this.SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterRadius: options.radius,
      clusterMaxZoom: options.maxZoom,
    });

    // Cluster circles
    this.map.addLayer({
      id: this.CLUSTER_LAYER,
      type: 'circle',
      source: this.SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#D4775A',     // brand coral
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
        'circle-opacity': 0.9,
      },
    });

    // Individual markers
    this.map.addLayer({
      id: this.MARKER_LAYER,
      type: 'circle',
      source: this.SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#D4775A',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });
  }

  getViewport(): MapViewport {
    const bounds = this.map!.getBounds();
    const center = this.map!.getCenter();
    return {
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      zoom: this.map!.getZoom(),
      center: { lat: center.lat, lng: center.lng },
    };
  }

  flyTo(center: { lat: number; lng: number }, zoom?: number) {
    this.map?.flyTo({
      center: [center.lng, center.lat],
      zoom,
      duration: 800,
      essential: true,
    });
  }

  fitBounds(bounds: MapViewport['bounds'], padding = 40) {
    this.map?.fitBounds(
      [[bounds.west, bounds.south], [bounds.east, bounds.north]],
      { padding, duration: 800 },
    );
  }

  setSelectedMarker(locationId: number | null) {
    if (!this.map) return;
    this.map.setFilter(`${this.MARKER_LAYER}-selected`, locationId
      ? ['==', ['get', 'id'], locationId]
      : ['==', ['get', 'id'], -1],  // match nothing
    );
  }

  onViewportChange(callback: (viewport: MapViewport) => void) {
    this.map?.on('moveend', () => callback(this.getViewport()));
  }

  onMarkerClick(callback: (feature: LocationFeature) => void) {
    this.map?.on('click', this.MARKER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (feature) callback(feature as unknown as LocationFeature);
    });
  }

  onClusterClick(callback: (clusterId: number, expansion: MapViewport) => void) {
    this.map?.on('click', this.CLUSTER_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties.cluster_id;
      const source = this.map!.getSource(this.SOURCE_ID) as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const center = (feature.geometry as GeoJSON.Point).coordinates;
        this.map!.flyTo({ center: center as [number, number], zoom });
        callback(clusterId, this.getViewport());
      });
    });
  }

  onMapClick(callback: () => void) {
    this.map?.on('click', (e) => {
      const features = this.map!.queryRenderedFeatures(e.point, {
        layers: [this.MARKER_LAYER, this.CLUSTER_LAYER],
      });
      if (features.length === 0) callback();
    });
  }
}
```

### Map-Sheet coordination

Map and sheet state machines communicate through shared events dispatched by a coordinator. The coordinator manages both the browse sheet and detail sheet, ensuring only one is visible at a time:

```typescript
// src/features/map/useMapSheetCoordinator.ts

'use client';

import { useEffect } from 'react';
import { useSelector } from '@xstate/react';
import type { ActorRefFrom } from 'xstate';
import type { browseSheetMachine } from '../sheet/browseSheetMachine';
import type { detailSheetMachine } from '../sheet/detailSheetMachine';
import type { mapMachine } from './mapMachine';

/**
 * Coordinates map, browse sheet, and detail sheet state machines.
 * Only one sheet is visible at a time — transitions are choreographed.
 *
 * Marker tap → hide browse sheet → open detail sheet
 * Detail BACK → hide detail sheet → restore browse sheet
 */
export function useMapSheetCoordinator(
  mapActor: ActorRefFrom<typeof mapMachine>,
  browseActor: ActorRefFrom<typeof browseSheetMachine>,
  detailActor: ActorRefFrom<typeof detailSheetMachine>,
) {
  const selectedMarkerId = useSelector(mapActor, (s) => s.context.selectedMarkerId);
  const detailState = useSelector(detailActor, (s) => s.value);
  const detailSlug = useSelector(detailActor, (s) => s.context.locationSlug);
  const browseState = useSelector(browseActor, (s) => s.value);

  // Map marker tap → hide browse sheet, open detail sheet
  useEffect(() => {
    if (selectedMarkerId !== null) {
      browseActor.send({ type: 'SNAP_TO', target: 'hidden' });
      // After browse exit animation (~200ms), open detail
      setTimeout(() => {
        detailActor.send({ type: 'OPEN', locationSlug: String(selectedMarkerId) });
      }, 200);
    }
  }, [selectedMarkerId, browseActor, detailActor]);

  // Detail sheet dismissed → deselect map marker, restore browse sheet
  useEffect(() => {
    if (detailSlug === null && detailState === 'hidden' && selectedMarkerId !== null) {
      mapActor.send({ type: 'DETAIL_CLOSE' });
      browseActor.send({ type: 'SNAP_TO', target: 'peek' });
    }
  }, [detailSlug, detailState, selectedMarkerId, mapActor, browseActor]);
}
```

---

## 7. PWA Strategy

### Service worker (Workbox)

```typescript
// next.config.ts — relevant PWA config

import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false,  // Show "update available" banner instead
  runtimeCaching: [
    // App shell — cache first
    {
      urlPattern: /^\/(app)?$/,
      handler: 'CacheFirst',
      options: { cacheName: 'app-shell', expiration: { maxEntries: 1 } },
    },
    // API responses — stale while revalidate
    {
      urlPattern: /^\/api\//,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 600 } },
    },
    // Map tiles — cache first (large, rarely change)
    {
      urlPattern: /^https:\/\/tiles\./,
      handler: 'CacheFirst',
      options: { cacheName: 'map-tiles', expiration: { maxEntries: 500, maxAgeSeconds: 86400 * 30 } },
    },
    // Images — stale while revalidate
    {
      urlPattern: /\.(jpg|jpeg|png|webp|avif)$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 } },
    },
    // Fonts — cache first (immutable)
    {
      urlPattern: /\.(woff2?|ttf)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'fonts', expiration: { maxEntries: 10 } },
    },
  ],
});
```

### Behavior

| Scenario | Behavior |
|----------|----------|
| First visit | Full page load. Service worker installs in background. |
| Return visit (online) | App shell loads instantly from cache. Data fetches fresh. |
| Return visit (offline) | App shell from cache. Cached data displayed. "Offline" indicator shown. |
| New version deployed | Service worker detects update. Banner: "Nieuwe versie beschikbaar". Tap reloads. |
| Install prompt | Custom prompt shown after 2nd visit OR after favoriting a location. Uses `beforeinstallprompt` event. |
| Push notifications | Deferred to future roadmap. Architecture supports it (service worker is ready). |

---

## 8. Auth Strategy (Future-Ready)

No authentication in the initial rebuild. The architecture is designed so auth can be added without restructuring.

### Current state (v2 launch)

- All features work anonymously
- Favorites stored in localStorage
- Preferences stored in localStorage
- No user accounts, no login UI

### Future auth addition

```
Auth provider: NextAuth.js (Auth.js v5)
Session strategy: JWT (stateless, no session table needed)
Providers: Google, Apple, Facebook (social only — no email/password)

New tables (when needed):
- users (id, email, name, avatar, provider, created_at)
- user_favorites (user_id, location_id, created_at)
- user_preferences (user_id, city, age_groups, transport_mode)
- user_collections (user_id, name, location_ids, shared, created_at)
```

### Migration path

1. Add NextAuth.js, configure providers
2. Add login button to app shell (never block usage)
3. On first login: migrate localStorage favorites to `user_favorites` table
4. Sync preferences across devices
5. Enable collections (shared lists of locations)
6. Enable push notification subscription (tied to user)

### Principle: auth never gates core discovery

All browse, search, filter, map, and detail views remain fully functional without login. Auth only adds persistence and social features.

---

## 9. Testing Strategy

### Playwright E2E

```typescript
// tests/e2e/core-flow.spec.ts (example)

import { test, expect } from '@playwright/test';

test('core discovery flow', async ({ page }) => {
  await page.goto('/');

  // Sheet starts in peek state
  const sheet = page.locator('[data-testid="sheet"]');
  await expect(sheet).toBeVisible();

  // Search for a location
  await page.locator('[data-testid="search-input"]').fill('Artis');
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  await page.locator('[data-testid="search-result"]').first().click();

  // Detail view opens
  await expect(page.locator('[data-testid="detail-view"]')).toBeVisible();
  await expect(page.locator('[data-testid="detail-name"]')).toContainText('Artis');

  // Back returns to list
  await page.locator('[data-testid="detail-back"]').click();
  await expect(page.locator('[data-testid="detail-view"]')).not.toBeVisible();
});

test('filter flow', async ({ page }) => {
  await page.goto('/');

  // Apply type filter
  await page.locator('[data-testid="filter-chip-play"]').click();
  await expect(page).toHaveURL(/types=play/);

  // Results update
  await expect(page.locator('[data-testid="location-card"]')).toHaveCount.greaterThan(0);

  // Clear filters
  await page.locator('[data-testid="clear-filters"]').click();
  await expect(page).not.toHaveURL(/types=/);
});
```

### Visual regression

```typescript
// tests/visual/sheet-states.spec.ts

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`sheet peek state — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    await page.waitForSelector('[data-testid="sheet"]');
    await expect(page).toHaveScreenshot(`sheet-peek-${vp.name}.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });
}
```

### Unit tests (Vitest)

```typescript
// tests/unit/scoring.test.ts

import { describe, it, expect } from 'vitest';
import { computePeuterScore } from '@/domain/scoring';

describe('computePeuterScore', () => {
  it('returns null when no quality dimensions are set', () => {
    expect(computePeuterScore({
      quality_toddler_friendly: null,
      quality_safety: null,
      quality_facilities: null,
      quality_value: null,
      quality_atmosphere: null,
    })).toBeNull();
  });

  it('computes weighted average across dimensions', () => {
    const score = computePeuterScore({
      quality_toddler_friendly: 5,
      quality_safety: 4,
      quality_facilities: 3,
      quality_value: 4,
      quality_atmosphere: 5,
    });
    expect(score).not.toBeNull();
    expect(score!.total).toBeGreaterThan(0);
    expect(score!.total).toBeLessThanOrEqual(100);
  });
});
```

### Quality gates

| Gate | Tool | Threshold |
|------|------|-----------|
| Type safety | `tsc --noEmit` | Zero errors |
| Lint | ESLint | Zero errors |
| Unit tests | Vitest | All pass |
| E2E tests | Playwright | All pass |
| Visual regression | Playwright | < 1% pixel diff |
| Bundle size | Next.js build | App shell < 200 KB gzipped |
| Performance | Lighthouse CI | LCP < 2.5s, FID < 100ms, CLS < 0.1 |

---

## 10. SEO Architecture

### Page generation strategy

All pages below render within the unified `(app)` layout (map + sheet/sidebar), except portal and legal routes.

| Page type | Rendering | Revalidation | Example URL | Layout |
|-----------|-----------|--------------|-------------|--------|
| Homepage | SSR (ISR) | Daily | `/` | `(app)` |
| Region guide | SSG | ISR 1 hour or on-demand | `/amsterdam` | `(app)` |
| City+type combo | SSG | ISR 1 hour | `/amsterdam/speeltuinen` | `(app)` |
| Location detail | SSR | On data change (webhook) or 30 min | `/amsterdam/artis` | `(app)` |
| Blog/guide post | SSG | On publish | `/blog/beste-speeltuinen-amsterdam` | `(app)` |
| Guides overview | SSG (ISR) | 1 hour | `/guides` | `(app)` |
| Partner portal | CSR | N/A | `/partner` | `(portal)` |
| Legal pages | SSG | On deploy | `/privacy`, `/terms` | `(legal)` |

### Structured data

```typescript
// src/components/patterns/StructuredData.tsx

interface LocationStructuredDataProps {
  location: Location;
  region: Region;
}

export function LocationStructuredData({ location, region }: LocationStructuredDataProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: location.name,
    description: location.description,
    url: `https://peuterplannen.nl/${location.region_slug}/${location.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: location.city,
      addressRegion: region.name,
      addressCountry: 'NL',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location.lat,
      longitude: location.lng,
    },
    ...(location.photo_url && { image: location.photo_url }),
    ...(location.phone && { telephone: location.phone }),
    ...(location.website && { url: location.website }),
    ...(location.peuter_score && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (location.peuter_score / 20).toFixed(1),  // Convert 0-100 to 0-5
        bestRating: '5',
        worstRating: '1',
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### SEO graduation system (preserved)

The existing SEO graduation system is carried forward. Only locations that meet quality criteria get indexed:

- **4 mandatory**: valid coordinates, description >= 90 chars, no slop, no generic content
- **2 of 4 optional**: quality photo, complete facilities, verified, high peuter score

Locations that don't graduate render as `noindex` pages with a redirect to the app view. This prevents thin content from diluting domain authority.

### Sitemap generation

```typescript
// app/sitemap.ts

import { MetadataRoute } from 'next';
import { LocationRepository } from '@/server/repositories/location.repo';
import { RegionRepository } from '@/server/repositories/region.repo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [locations, regions] = await Promise.all([
    LocationRepository.getSeoGraduated(),
    RegionRepository.getAll(),
  ]);

  const base = 'https://peuterplannen.nl';

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...regions.map((r) => ({
      url: `${base}/${r.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...locations.map((l) => ({
      url: `${base}/${l.region_slug}/${l.slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
```

---

## 11. Monetization Integration Points

### Affiliate links

- Stored in `locations.affiliate_url` (nullable)
- Rendered server-side on detail pages as clearly labeled "Boek via partner" buttons
- Click tracking via route handler:

```typescript
// app/api/affiliate/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LocationRepository } from '@/server/repositories/location.repo';
import { AnalyticsRepository } from '@/server/repositories/analytics.repo';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const location = await LocationRepository.getBySlug(params.slug);
  if (!location?.affiliate_url) {
    return NextResponse.redirect(new URL(`/${location?.region_slug ?? ''}/${params.slug}`, req.url));
  }

  await AnalyticsRepository.track({
    event: 'affiliate_click',
    location_id: location.id,
    referrer: req.headers.get('referer'),
  });

  return NextResponse.redirect(location.affiliate_url);
}
```

### Featured listings

- `locations.featured = true` in database
- UI treatment: subtle "Aanbevolen" badge, never deceptive
- Ranking: featured locations get a small boost in list ordering but never override relevance
- Disclosure: clearly marked as promoted content

### Ad slots

- Defined slot positions (never inline with organic results):
  - After every 8th card in list view
  - Bottom of detail page (below all content)
  - Between sections on editorial pages
- Implementation: lazy-loaded `<AdSlot position="list-8" />` component
- Never blocks or delays core content rendering
- Respectful: max 1 ad visible at any time on mobile

---

## 12. Analytics / Telemetry

### Event tracking

```typescript
// src/lib/analytics.ts

type AnalyticsEvent =
  | { event: 'search'; query: string; resultCount: number }
  | { event: 'filter_apply'; filters: Record<string, string> }
  | { event: 'filter_clear' }
  | { event: 'marker_tap'; locationId: number }
  | { event: 'detail_open'; locationSlug: string; source: 'card' | 'marker' | 'search' | 'url' }
  | { event: 'detail_close'; locationSlug: string; dwellTimeMs: number }
  | { event: 'affiliate_click'; locationId: number }
  | { event: 'favorite_toggle'; locationId: number; action: 'add' | 'remove' }
  | { event: 'share'; locationSlug: string; method: 'native' | 'copy' }
  | { event: 'install_pwa'; prompt: 'banner' | 'custom' }
  | { event: 'sheet_state_change'; from: string; to: string }
  | { event: 'map_viewport_change'; zoom: number; center: { lat: number; lng: number } };

export function trackEvent(event: AnalyticsEvent) {
  // Send to Supabase analytics_events
  navigator.sendBeacon('/api/analytics', JSON.stringify(event));

  // Also send to GA4 if loaded
  if (typeof window.gtag === 'function') {
    window.gtag('event', event.event, event);
  }
}
```

### Infrastructure

| System | Purpose |
|--------|---------|
| GA4 | Traffic, engagement, acquisition (existing) |
| Supabase `analytics_events` | Custom event storage, affiliate tracking, usage patterns |
| Sentry (or similar) | Error tracking, performance monitoring |
| Lighthouse CI | Performance regression detection in CI |
| Next.js Analytics | Web Vitals monitoring |

### Key dashboards (to build)

1. **Discovery funnel**: pageview → search/filter → detail open → affiliate click
2. **Engagement**: session duration, locations viewed per session, favorites per user
3. **Map usage**: zoom distribution, pan patterns, cluster vs marker taps
4. **PWA**: install rate, return visits, offline usage

---

## 13. Deployment

### Target infrastructure

```
Cloudflare Pages + Workers
- Edge-first deployment via @cloudflare/next-on-pages adapter
- Preview deployments per PR (via Cloudflare Pages branch previews)
- Cheaper at scale, full control over edge logic
- Existing Cloudflare relationship (current CDN + DNS)
- ISR via Cloudflare KV for cache, edge functions for API routes
```

### Environment variables

```bash
# Server-only (never exposed to client)
SUPABASE_URL=https://piujsvgbfflrrvauzsxe.supabase.co
SUPABASE_SERVICE_KEY=       # from ~/.zprofile, set in deployment platform
REVALIDATION_SECRET=        # webhook secret for on-demand ISR

# Public (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://piujsvgbfflrrvauzsxe.supabase.co
NEXT_PUBLIC_MAPLIBRE_STYLE_URL=https://tiles.openfreemap.org/styles/positron
NEXT_PUBLIC_SITE_URL=https://peuterplannen.nl
NEXT_PUBLIC_GA_ID=          # GA4 measurement ID
```

### Deployment flow

```
Feature branch → PR → Preview deployment (auto)
                   ↓
            Code review + visual QA on preview URL
                   ↓
            Merge to staging → staging.peuterplannen.nl (auto)
                   ↓
            QA on staging (manual + automated)
                   ↓
            Merge to main → peuterplannen.nl (auto)
```

### Migration from GitHub Pages

The rebuild deploys alongside the current site. Migration steps:

1. Build and deploy v2 to `v2.peuterplannen.nl` (Cloudflare Pages preview)
2. QA extensively on staging
3. When ready: update Cloudflare DNS to point `peuterplannen.nl` to Cloudflare Pages
4. Keep GitHub Pages deployment as fallback (can revert DNS in minutes)
5. Monitor for 1 week, then decommission old deployment

### On-demand ISR via Supabase webhook

```typescript
// app/api/revalidate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidation-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { table, record } = body;

  switch (table) {
    case 'locations':
      revalidatePath(`/${record.region_slug}/${record.slug}`);
      revalidatePath(`/${record.region_slug}`);
      revalidateTag('locations');
      break;
    case 'regions':
      revalidatePath(`/${record.slug}`);
      revalidateTag('regions');
      break;
    case 'editorial_pages':
      revalidatePath(`/blog/${record.slug}`);
      revalidateTag('editorial');
      break;
  }

  return NextResponse.json({ revalidated: true });
}
```
