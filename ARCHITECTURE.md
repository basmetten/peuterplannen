# PeuterPlannen — Technische Architectuur

## Overzicht

PeuterPlannen is een gratis, mobile-first webapplicatie die Nederlandse ouders helpt kindvriendelijke activiteiten te vinden voor peuters (0–7 jaar). De app catalogiseert **2100+ geverifieerde locaties** in **22 regio's**, verdeeld over 8 categorieën: speeltuinen, kinderboerderijen, natuur, musea, horeca, pannenkoeken, zwembaden en cultureel.

De architectuur is **static-first met modulaire build**: een Node.js build-systeem haalt data uit Supabase, past SEO-beleid toe, en genereert ~2200 statische HTML-pagina's. De interactieve app (`app.html`) bevraagt Supabase direct vanuit de browser. Admin- en partnerportalen draaien als SPA's op subdomains.

```
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL + Edge Functions)        │
│  ┌──────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │ regions  │  │ locations  │  │ editorial_    │  │ venue_   │ │
│  │ (22)     │◄─┤ (2100+)    │  │ pages (CMS)   │  │ owners   │ │
│  └──────────┘  └────────────┘  └───────────────┘  └──────────┘ │
│  ┌──────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ site_publish_    │  │ location_       │  │ client_       │  │
│  │ state (dirty     │  │ candidates      │  │ errors +      │  │
│  │ gate + change    │  │ (AI pipeline)   │  │ analytics     │  │
│  │ tracking)        │  │                 │  │ _events       │  │
│  └──────────────────┘  └─────────────────┘  └───────────────┘  │
└──────────────┬──────────────────────┬────────────────────────────┘
               │                      │
     ┌─────────▼──────────┐   ┌──────▼──────────────┐
     │  sync_all.js        │   │  app.html (browser)  │
     │  (build-time)       │   │  (runtime)           │
     │                     │   │                      │
     │  Modular build:     │   │  Fetch → filter →    │
     │  - 22 stadspagina's │   │  render kaart/lijst  │
     │  - 8 type-pagina's  │   │  + favoriten         │
     │  - 2100+ locaties   │   │  + locatiezoeken     │
     │  - 26 blogposts     │   └───────┬──────────────┘
     │  - cluster pages    │           │
     │  - editorial hubs   │   ┌───────▼──────────────┐
     │  - split sitemaps   │   │  admin/partner       │
     └─────────┬───────────┘   │  portals (SPA's)     │
               │               │  via Edge Functions   │
     ┌─────────▼───────────┐   └──────────────────────┘
     │  GitHub Pages        │
     │  peuterplannen.nl    │
     │  + Cloudflare CDN    │
     │  + Worker (subdomain │
     │    routing)          │
     └─────────────────────┘
```

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| **Frontend** | Vanilla HTML5 / CSS3 / JavaScript — geen frameworks |
| **Design System** | CSS custom properties (`--pp-*` namespace) in `design-system.css` |
| **Kaart** | MapLibre GL (OpenStreetMap Positron tiles via OpenFreeMap) |
| **Locatiezoeken** | Google Maps API (Places Autocomplete + Geocoding) |
| **Database** | Supabase (PostgreSQL + REST API + Edge Functions) |
| **Build** | Node.js modulair build-systeem (`.scripts/sync_all.js` + `lib/`) |
| **Tests** | Node.js built-in `node:test` (unit + snapshot) |
| **CI/CD** | GitHub Actions (elke 10 min + push + dispatch) |
| **Hosting** | GitHub Pages (statisch) + Cloudflare (CDN/DNS/Worker) |
| **PWA** | Service Worker + Web App Manifest |
| **Betalingen** | Stripe (subscriptions voor featured listings) |
| **AI Pipeline** | Anthropic Claude SDK (locatie-scoring en review) |
| **Monitoring** | Client error tracking + product analytics (Supabase) |

---

## Build Systeem

### Modulaire Architectuur

Het build-systeem is opgesplitst in logische modules:

```
.scripts/
  sync_all.js                     ← Orchestrator (197 regels)
  lib/
    config.js                     ← Configuratie: types, regio's, SEO constanten
    helpers.js                    ← Utilities: slugify, escapeHtml, dates, URLs
    supabase.js                   ← Data fetch: regions, locations, publish state
    seo-content.js                ← SEO content library: markdown, blog metadata
    seo-policy.js                 ← SEO beleid: slugs, overrides, graduation
    html-shared.js                ← Gedeelde HTML: nav, footer, head, badges
    css-minify.js                 ← CSS minificatie (clean-css)
    generators/
      index-page.js               ← Homepage
      app-page.js                 ← Interactieve app
      about-page.js               ← Over ons
      manifest.js                 ← PWA manifest
      four-oh-four.js             ← 404 pagina
      city-pages.js               ← 22 stadspagina's
      type-pages.js               ← 8 type-categoriepagina's
      cluster-pages.js            ← Thematische clusterpagina's
      location-pages.js           ← 2100+ locatie-detailpagina's
      editorial-pages.js          ← Ontdekken + methode hubs
      partner-landing.js          ← /voor-bedrijven/ landing
      blog.js                     ← Blog vanuit markdown bestanden
      redirects.js                ← _redirects bestand
      sitemaps.js                 ← Split sitemaps (6 bestanden)
      seo-registry.js             ← SEO metadata registry
```

### Build Flow

```
node .scripts/sync_all.js

  1. Fetch publish state (incremental vs full beslissing)
  2. Fetch regions + locations + editorial pages uit Supabase
  3. Load en merge SEO content library (markdown + editorial)
  4. Compute slugs + apply SEO overrides + SEO policy
  5. Build mode kiezen:
     - Incremental: < 50 wijzigingen → alleen gewijzigde pagina's
     - Full: alle pagina's regenereren
  6. Genereer alle pagina-types (zie generators/)
  7. Build sitemaps + SEO registry
  8. Minify CSS
  9. Refresh asset versions op hand-geschreven pagina's
```

### Incremental Builds

Het build-systeem ondersteunt incrementele builds via change tracking in `site_publish_state`:

- Database triggers voegen gewijzigde location IDs, region slugs en editorial slugs toe
- Bij < 50 wijzigingen: alleen betreffende pagina's + afhankelijkheden herbouwen
- Bij >= 50 of `FORCE_FULL_BUILD=1`: volledige rebuild
- Na succesvolle CI deploy: change arrays worden geleegd

### Marker-Based Template Systeem

Statische bestanden gebruiken comment-markers voor dynamische content:

```html
<!-- BEGIN:CITY_GRID -->
<div class="cities-grid">...dynamische content...</div>
<!-- END:CITY_GRID -->
```

Het script vervangt alles tussen `BEGIN:X` en `END:X`. Veilig en idempotent.

### Type Mapping

```javascript
const TYPE_MAP = {
  play:      { label: 'Speeltuinen',      slug: 'speeltuinen' },
  farm:      { label: 'Kinderboerderijen', slug: 'kinderboerderijen' },
  nature:    { label: 'Natuur',            slug: 'natuur' },
  museum:    { label: 'Musea',             slug: 'musea' },
  horeca:    { label: 'Restaurants',       slug: 'horeca' },
  pancake:   { label: 'Pannenkoeken',      slug: 'pannenkoeken' },
  swim:      { label: 'Zwembaden',         slug: 'zwembaden' },
  culture:   { label: 'Cultureel',         slug: 'cultureel' },
};
```

---

## Database Schema

### Core tabellen

#### `regions`
Regio-metadata. Bepaalt welke steden op de site verschijnen.

```sql
CREATE TABLE regions (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  blurb         TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL,
  population    INTEGER,
  tier          TEXT DEFAULT 'standard',     -- 'primary' | 'standard' | 'region'
  schema_type   TEXT DEFAULT 'City',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

#### `locations`
Alle kindvriendelijke locaties met metadata.

```sql
CREATE TABLE locations (
  id                            SERIAL PRIMARY KEY,
  name                          TEXT NOT NULL,
  region                        TEXT NOT NULL REFERENCES regions(name),
  type                          TEXT NOT NULL,
  description                   TEXT,
  website                       TEXT,
  weather                       TEXT,           -- 'indoor' | 'outdoor' | 'both'
  coffee                        BOOLEAN DEFAULT false,
  diaper                        BOOLEAN DEFAULT false,
  alcohol                       BOOLEAN DEFAULT false,
  lat                           DECIMAL,
  lng                           DECIMAL,
  min_age                       INTEGER DEFAULT 0,
  max_age                       INTEGER DEFAULT 6,
  toddler_highlight             TEXT,
  last_verified                 DATE,
  verification_source           TEXT,
  place_id                      TEXT,
  distance_from_city_center_km  DECIMAL,
  -- Ownership & featuring
  claimed_by_user_id            UUID,
  owner_verified                BOOLEAN DEFAULT false,
  is_featured                   BOOLEAN DEFAULT false,
  featured_until                TIMESTAMPTZ,
  owner_photo_url               TEXT
);
```

### Partner & venue tabellen

| Tabel | Doel |
|-------|------|
| `venue_owners` | Partner accounts met Stripe subscription (plan_tier, subscription_status) |
| `location_claim_requests` | Claim workflow (pending → approved/rejected) |
| `location_edit_log` | Audit trail voor alle wijzigingen |
| `location_observations` | Gemodereerde observaties van partners/bezoekers |
| `location_quality_tasks` | Quality improvement queue (priority 1-5, due dates) |

### Content & SEO tabellen

| Tabel | Doel |
|-------|------|
| `editorial_pages` | CMS content: hubs, clusters, blog, location overrides (status: draft/published/archived) |
| `gsc_snapshots` | Google Search Console data voor SEO graduation |

### AI Pipeline tabellen

| Tabel | Doel |
|-------|------|
| `ingestion_runs` | Batch intake runs (ingest/reaudit) |
| `location_candidates` | Kandidaten vanuit OSM/bronnen (new → enriched → scored → approved/rejected → promoted) |
| `location_source_evidence` | Multi-source bewijsmateriaal (osm/website/google/tripadvisor) |
| `location_ai_reviews` | AI scores en beslissingen (Claude model, score 1-10, confidence) |

### Infrastructuur tabellen

| Tabel | Doel |
|-------|------|
| `site_publish_state` | Build gate: dirty flag, pending_count, changed arrays, last_published_at |
| `client_errors` | Frontend foutmeldingen (geen PII) |
| `analytics_events` | Product event tracking |

### RLS (Row Level Security)

- `locations`: publiek leesbaar, eigenaar kan eigen locatie updaten (met actieve subscription)
- `venue_owners`, `location_claim_requests`: gebruiker ziet alleen eigen records
- `editorial_pages`: draft/published zichtbaarheid per rol
- `client_errors`, `analytics_events`: anonieme insert, service role read

---

## CI/CD Pipeline

### Hoofdworkflow: `sync-site.yml`

Draait elke 10 minuten + bij push naar main + bij repository_dispatch.

```
Schedule (*/10 * * * *)
         │
         ▼
   ┌─────────────┐
   │ Gate check   │ ── Supabase site_publish_state.dirty?
   │              │    (fallback: altijd bouwen als check faalt)
   └──────┬──────┘
          │ dirty=true
          ▼
   ┌─────────────┐
   │ npm ci       │
   │ npm run build│ ── sync_all.js (incremental of full)
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │ 3× Audit    │ ── internal consistency + portals + SEO
   │ (--strict)  │    Faalt bij warnings → build stopt
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │ Deploy      │ ── Cloudflare Worker (wrangler deploy)
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │ Clean state │ ── dirty=false, clear change arrays
   └─────────────┘
```

### Ops Cadence: `ops-cadence.yml`

Wekelijks (maandag 06:00 UTC): trust gaps, priority drafts, quality tasks, ops briefs, editorial export.

### Deploy Supabase: `deploy-supabase.yml`

Handmatige trigger voor database migrations.

### Preview: `preview.yml`

Preview builds voor pull requests.

---

## Frontend

### Bestandsstructuur

```
peuterplannen/
├── .github/workflows/          ← CI/CD (4 workflows)
├── .scripts/                   ← Build systeem + pipeline + audits
│   ├── sync_all.js             ← Orchestrator
│   ├── lib/                    ← Modules (config, helpers, generators)
│   ├── pipeline/               ← OSM + AI intake pipeline (30+ scripts)
│   ├── trust/                  ← Data quality operaties
│   ├── editorial/              ← Editorial CMS operaties
│   ├── __tests__/              ← Unit + snapshot tests
│   ├── audit_*.js              ← 3 audit scripts (CI gates)
│   └── ops/                    ← Operationele briefings
├── admin/                      ← Admin portal (SPA)
├── partner/                    ← Partner/venue portal (SPA)
├── cloudflare-worker/          ← Subdomain router
├── supabase/
│   ├── migrations/ (20 files)  ← Database schema
│   └── functions/ (7 edge fn)  ← Serverless API's
├── blog/                       ← 26 blogposts (markdown)
├── content/seo/                ← SEO content library (markdown)
├── fonts/                      ← Self-hosted fonts
├── icons/, images/             ← Assets
│
├── index.html                  ← Landing page
├── app.html                    ← Interactieve app (SPA)
├── about.html, contact.html    ← Informatieve pagina's
├── design-system.css           ← CSS tokens (--pp-* namespace)
├── style.css                   ← Hoofd stylesheet (36 KB → 30 KB minified)
├── error-reporter.js           ← Client-side error tracking
├── _headers                    ← Security headers (CSP, X-Frame-Options)
│
├── amsterdam/                  ┐
├── rotterdam/                  │  22 stadsmappen met
├── utrecht/                    │  locatie-detailpagina's
├── ...                         ┘
│
├── ontdekken/, methode/        ← Editorial hub pagina's
├── voor-bedrijven/             ← Partner landing page
├── privacy/, disclaimer/       ← Juridische pagina's
├── sitemap.xml                 ← Sitemap index (6 deelbestanden)
└── _redirects                  ← SEO redirect aliases
```

### Design System

CSS custom properties in `design-system.css` met `--pp-*` namespace:

| Token groep | Voorbeelden |
|-------------|-------------|
| Kleuren | `--pp-primary` (#D4775A), `--pp-accent` (#E8B870), `--pp-secondary` (#6B9590) |
| Surfaces | `--pp-bg` (#FAF7F2), `--pp-surface`, `--pp-border` |
| Typography | Familjen Grotesk (koppen), Plus Jakarta Sans (body), DM Sans (mono) |
| Spacing | `--pp-space-xs` (4px) t/m `--pp-space-2xl` (48px) |
| Borders | `--pp-radius-xs` (8px) t/m `--pp-radius-pill` (999px) |
| Shadows | `--pp-shadow-sm/md/lg/hover` |
| Type kleuren | Per locatietype (play groen, museum paars, etc.) |

Fonts zijn self-hosted in `/fonts/` voor betere performance (geen externe Google Fonts dependency).

### app.html — Interactieve App

Single-page applicatie in vanilla JavaScript met:
- MapLibre GL kaart met GeoJSON clustering
- Google Places Autocomplete locatiezoeken
- Filter chips: type, weer (indoor/outdoor), faciliteiten (koffie, verschonen)
- Regio-filter via URL parameter (`?regio=Amsterdam`)
- Favorieten via localStorage
- Skeleton loading met shimmer-animatie
- AbortController voor request cancellation

### Portalen

| Portal | URL | Functie |
|--------|-----|---------|
| **Admin** | admin.peuterplannen.nl | Data management, quality tasks, editorial CMS, observation reviews |
| **Partner** | partner.peuterplannen.nl | Locatie claimen, details updaten, featured listing kopen |

Beide portalen delen `portal-shell.css` en `portal-shell.js` voor consistente UI en auth.

Subdomain routing via Cloudflare Worker:
- `partner.peuterplannen.nl` → `/partner/`
- `admin.peuterplannen.nl` → `/admin/`

---

## Supabase Edge Functions

| Functie | Doel |
|---------|------|
| `admin-api` | Admin control plane: observations, editorial, quality tasks |
| `submit-partner-observations` | Partner observatie-indiening |
| `stripe-webhook` | Stripe subscription lifecycle events |
| `create-checkout-session` | Stripe checkout voor featured listings |
| `create-customer-portal-session` | Stripe klantportaal toegang |
| `generate-plan` | Daguitje-plannen genereren (AI of template) |
| `public-feedback` | Publiek feedback/suggestie formulier |

---

## AI Data Pipeline

Automatische locatie-ontdekking en -beoordeling:

```
OpenStreetMap data
       │
       ▼
  ┌────────────┐     ┌──────────────────┐
  │ Discover    │────►│ location_        │
  │ (OSM tags)  │     │ candidates       │
  └────────────┘     │ (status: new)     │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │ Enrich           │
                     │ (Google, website, │
                     │ TripAdvisor)      │
                     │ status: enriched  │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │ Score (Claude)    │
                     │ score 1-10,       │
                     │ confidence,       │
                     │ decision          │
                     │ status: scored    │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         approved       needs_review      rejected
              │               │
              ▼               │
         promoted ◄───────────┘ (na handmatige review)
         (→ locations tabel)
```

Pipeline scripts in `.scripts/pipeline/` (30+ bestanden).
Configuratie in `.scripts/pipeline/config.js` (80+ gemeenten).

---

## Monitoring & Observability

### Client-side error tracking
- `error-reporter.js`: vangt `onerror` en `unhandledrejection`
- Stuurt naar `client_errors` tabel via anon key (geen PII)

### Product analytics
- Google Analytics 4
- Cloudflare Web Analytics
- Custom `analytics_events` tabel voor behavioral tracking

### Build audits (CI gates)
Drie audit scripts draaien bij elke build in strict mode:

| Audit | Check |
|-------|-------|
| `audit_internal_consistency.js` | Broken links, orphan pages, blog slugs, regio-integriteit |
| `audit_portals.js` | Admin/partner portal endpoints en toegankelijkheid |
| `audit_seo_quality.js` | Meta tags, canonical URLs, structured data |

---

## Beveiliging

| Aspect | Implementatie |
|--------|--------------|
| **Database** | Row Level Security (RLS); anon key = read-only |
| **CSP** | Strict Content-Security-Policy in `_headers` |
| **Headers** | X-Frame-Options: DENY, nosniff, strict referrer |
| **API keys** | Anon key (publiek) in client; service key alleen in CI/CD |
| **Secrets** | GitHub Actions encrypted secrets |
| **XSS** | Geen ongecontroleerde user-generated content; `escapeHtml()` helper |
| **HTTPS** | Afgedwongen via Cloudflare |
| **Permissions** | camera=(), microphone=(), payment=() geblokkeerd |

---

## SEO

### Pagina-types en volumes

| Type | Aantal | Voorbeeld |
|------|--------|-----------|
| Homepage | 1 | `/` |
| App | 1 | `/app.html` |
| Stadspagina's | 22 | `/amsterdam/`, `/rotterdam/` |
| Type-pagina's | 8 | `/speeltuinen/`, `/musea/` |
| Clusterpagina's | 10+ | `/regen-uitjes/`, `/budget-uitjes/` |
| Locatie-detailpagina's | 2100+ | `/amsterdam/speeltuin-vondelpark/` |
| Blogposts | 26 | `/blog/kindvriendelijke-musea/` |
| Editorial hubs | 2 | `/ontdekken/`, `/methode/` |

### Split Sitemaps

```
sitemap.xml (index)
├── sitemap-core.xml        ← Hub pages, type pages, editorial
├── sitemap-blog.xml        ← Blog posts
├── sitemap-hubs.xml        ← City + cluster pages
├── sitemap-locations-01.xml ← Locatie detail batch 1
├── sitemap-locations-02.xml ← Locatie detail batch 2
└── sitemap-locations-03.xml ← Locatie detail batch 3
```

### SEO Graduation System

Locatie-detailpagina's starten als `noindex` en gradueren naar indexeerbaar op basis van content-kwaliteit (beschrijving lengte, verified status, editorial override, etc.).

### Structured Data (JSON-LD)

Elke pagina bevat relevante JSON-LD: WebApplication, ItemList, TouristAttraction, FAQPage, BreadcrumbList.

---

## Nieuwe Regio Toevoegen

**0 code-wijzigingen nodig:**

```sql
-- 1. Regio toevoegen
INSERT INTO regions (name, slug, blurb, display_order, population, tier)
VALUES ('Zwolle', 'zwolle', 'Zwolle is een bruisende...', 23, 134000, 'standard');

-- 2. Locaties toevoegen
INSERT INTO locations (name, type, region, lat, lng, description, ...)
VALUES ('Speeltuin De Bult', 'play', 'Zwolle', 52.51, 6.10, '...', ...);
```

De pipeline regenereert automatisch: stadspagina, type-pagina's, index, sitemap, JSON-LD.

---

## Commando's

```bash
# Build
npm run build              # Full site build (optimize images + sync portals + sync_all.js)
npm run build:local        # Build met fixture data (geen Supabase nodig)

# Tests
npm test                   # Alle tests (unit + snapshot)
npm run test:unit          # Alleen unit tests
npm run test:snapshot      # Alleen snapshot tests

# Development
npm run dev                # Lokale dev server (port 3000)

# Deploy
npm run deploy             # Deploy naar GitHub Pages
npm run deploy:supabase    # Deploy Supabase migrations
npm run deploy:wrangler    # Deploy Cloudflare Worker

# Pipeline
npm run pipeline:utrecht:codex      # OSM+AI pipeline voor Utrecht
npm run pipeline:utrecht:codex:dry  # Dry run (20 items)

# Operationeel
npm run ops:trust-gaps              # Rapport over content gaps
npm run ops:quality-tasks           # Sync quality improvement tasks
npm run ops:seed-priority-drafts    # Genereer editorial drafts
npm run ops:export-editorial        # Export editorial snapshot
npm run ops:briefs                  # Genereer ops briefings

# Audits
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
```

---

## Environment Variabelen

### CI (GitHub Actions secrets)

| Variabele | Gebruik |
|-----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (build + deploy) |
| `SUPABASE_ACCESS_TOKEN` | CLI access token (migrations) |
| `SUPABASE_PROJECT_REF` | Project reference (migrations) |
| `SUPABASE_DB_PASSWORD` | DB wachtwoord (migrations) |
| `CLOUDFLARE_API_KEY` | Cloudflare API (Worker deploy) |
| `CLOUDFLARE_EMAIL` | Cloudflare account email |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `STRIPE_SECRET_KEY` | Stripe (edge functions) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verificatie |

### Lokaal (optioneel)

| Variabele | Gebruik |
|-----------|---------|
| `PP_FIXTURES=1` | Gebruik fixture data i.p.v. Supabase |
| `FORCE_FULL_BUILD=1` | Forceer volledige rebuild |

---

## Dataflow Samenvatting

```
  Supabase DB
  (regions + locations + editorial + candidates)
       │
       ├──── BUILD-TIME ──────────────────────────────────┐
       │     sync_all.js (elke 10 min via GitHub          │
       │     Actions, gated door dirty flag)              │
       │         │                                        │
       │         ├── 22× stadspagina's                    │
       │         ├── 8× type-pagina's                     │
       │         ├── 10+ clusterpagina's                  │
       │         ├── 2100+ locatie-detailpagina's          │
       │         ├── 26 blogposts                         │
       │         ├── editorial hubs                       │
       │         ├── index, app, about, 404, manifest     │
       │         ├── split sitemaps (6 bestanden)          │
       │         └── SEO registry                          │
       │                                                  │
       │              → audits → deploy → clean state     │
       │                                                  │
       └──── RUNTIME ─────────────────────────────────────┐
             app.html + admin/ + partner/                  │
             via Supabase REST API + Edge Functions         │
                 │                                         │
                 ├── Filtering (type/weer/regio/faciliteit) │
                 ├── MapLibre kaart + clustering            │
                 ├── Google Places locatiezoeken             │
                 ├── Partner claims + observations          │
                 ├── Editorial CMS                         │
                 ├── Stripe subscriptions                  │
                 └── Error tracking + analytics            │
                                                           │
             Browser ← Statische HTML + live data          │
             └─────────────────────────────────────────────┘
```
