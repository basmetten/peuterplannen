# PeuterPlannen — Technische Architectuur

## Overzicht

PeuterPlannen is een gratis, mobile-first webapplicatie die Nederlandse ouders helpt kindvriendelijke activiteiten te vinden voor peuters (0–7 jaar). De app catalogiseert **418 geverifieerde locaties** in **14 steden**, verdeeld over 5 categorieën: speeltuinen, natuur, musea, horeca en pannenkoeken.

De architectuur is **static-first**: een Node.js build-script haalt data uit Supabase en genereert statische HTML-pagina's. De interactieve app (app.html) bevraagt Supabase direct vanuit de browser.

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                 │
│  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │   regions     │  │          locations              │   │
│  │  (14 actief)  │◄─┤  (418 rijen, FK op region)     │   │
│  └──────────────┘  └────────────────────────────────┘   │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
     ┌─────────▼──────────┐   ┌──────▼──────────────┐
     │  sync_all.js        │   │  app.html (browser)  │
     │  (build-time)       │   │  (runtime)           │
     │                     │   │                      │
     │  Genereert:         │   │  Fetch → filter →    │
     │  - 14 stadspagina's │   │  render kaart/lijst  │
     │  - 5 type-pagina's  │   │  + favoriten         │
     │  - index/app/about  │   │  + locatiezoeken     │
     │  - sitemap.xml      │   └──────────────────────┘
     └─────────┬───────────┘
               │
     ┌─────────▼───────────┐
     │  GitHub Pages        │
     │  peuterplannen.nl    │
     │  (statische hosting) │
     └─────────────────────┘
```

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| **Frontend** | Vanilla HTML5 / CSS3 / JavaScript — geen frameworks |
| **Kaart** | MapLibre GL v5.19 (OpenStreetMap Positron tiles) |
| **Locatiezoeken** | Google Maps API (Places Autocomplete + Geocoding) |
| **Database** | Supabase (PostgreSQL + REST API) |
| **Build** | Node.js script (`sync_all.js`, 995 regels) |
| **CI/CD** | GitHub Actions (dagelijks + webhook) |
| **Hosting** | GitHub Pages (statisch) + Cloudflare (CDN/DNS) |
| **PWA** | Service Worker + Web App Manifest |

---

## Database Schema

### `regions` tabel

De single source of truth voor alle regio-metadata. Bepaalt welke steden op de site verschijnen en in welke volgorde.

```sql
CREATE TABLE regions (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,        -- "Amsterdam", "Den Haag"
  slug          TEXT NOT NULL UNIQUE,        -- "amsterdam", "den-haag"
  blurb         TEXT NOT NULL DEFAULT '',    -- SEO intro voor stadspagina
  display_order INTEGER NOT NULL,            -- volgorde overal (1 = eerst)
  population    INTEGER,                     -- inwoneraantal
  tier          TEXT DEFAULT 'standard',     -- 'primary' | 'standard' | 'region'
  schema_type   TEXT DEFAULT 'City',         -- JSON-LD: "City" of "AdministrativeArea"
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### `locations` tabel

Elke rij is één kindvriendelijke locatie met alle metadata die de app nodig heeft.

```sql
CREATE TABLE locations (
  id                          SERIAL PRIMARY KEY,
  name                        TEXT NOT NULL,
  region                      TEXT NOT NULL REFERENCES regions(name),
  type                        TEXT NOT NULL,  -- 'play' | 'nature' | 'museum' | 'horeca' | 'pancake'
  description                 TEXT,
  website                     TEXT,
  weather                     TEXT,           -- 'indoor' | 'outdoor' | 'both'
  coffee                      BOOLEAN DEFAULT false,
  diaper                      BOOLEAN DEFAULT false,
  alcohol                     BOOLEAN DEFAULT false,
  lat                         DECIMAL,
  lng                         DECIMAL,
  min_age                     INTEGER DEFAULT 0,
  max_age                     INTEGER DEFAULT 6,
  toddler_highlight           TEXT,           -- marketing-beschrijving
  last_verified               DATE,
  verification_source         TEXT,           -- 'web_research' | 'phone_call' | 'visit'
  place_id                    TEXT,           -- Google Places ID
  distance_from_city_center_km DECIMAL
);
```

### Data-verdeling

| Type | Aantal | Nederlandse naam |
|------|--------|-----------------|
| play | 108 | Speeltuinen |
| nature | 125 | Natuur & Kinderboerderijen |
| museum | 50 | Musea |
| horeca | 82 | Restaurants & Cafés |
| pancake | 53 | Pannenkoekenrestaurants |

---

## Build Systeem: `sync_all.js`

Het hart van de architectuur. Eén script dat alle statische pagina's regenereert vanuit de database.

### Marker-Based Template Systeem

In plaats van fragiele regex op willekeurige HTML, gebruikt het script **comment-markers** in de statische bestanden:

```html
<!-- BEGIN:CITY_GRID -->
<div class="cities-grid">
  ...dynamische content...
</div>
<!-- END:CITY_GRID -->
```

Het script vervangt alles tussen `BEGIN:X` en `END:X` met verse, database-gedreven HTML:

```javascript
function replaceMarker(content, marker, replacement) {
  const regex = new RegExp(
    `(<!-- BEGIN:${marker} -->)[\\s\\S]*(<!-- END:${marker} -->)`, 'g'
  );
  return content.replace(regex, `$1\n${replacement}\n$2`);
}
```

Dit is **veilig en idempotent** — het script kan onbeperkt opnieuw gedraaid worden.

### Markers per bestand

| Bestand | Markers |
|---------|---------|
| `index.html` | `STATS`, `TYPE_GRID`, `CITY_GRID`, `JSONLD_INDEX` |
| `app.html` | `NOSCRIPT`, `JSONLD_APP`, `INFO_STATS` |
| `about.html` | `META_ABOUT`, `STATS_ABOUT` |

### Uitvoeringsstappen

```
node .scripts/sync_all.js

  1. Fetch regions tabel (gesorteerd op display_order)
  2. Fetch locations tabel
  3. Bereken counts per regio en per type
  4. Update index.html    → city grid, type grid, stats, JSON-LD
  5. Update app.html      → noscript, JSON-LD, info panel
  6. Update about.html    → meta, stat cards
  7. Update manifest.json → description met actueel aantal
  8. Genereer {slug}.html → stadspagina per actieve regio
  9. Genereer type pages  → speeltuinen.html, musea.html, etc.
  10. Genereer sitemap.xml → alle URLs + vandaag als lastmod
```

### Type Mapping

```javascript
const TYPE_MAP = {
  play:    { label: 'Speeltuinen',    slug: 'speeltuinen' },
  nature:  { label: 'Natuur',         slug: 'natuur' },
  museum:  { label: 'Musea',          slug: 'musea' },
  horeca:  { label: 'Restaurants',    slug: 'horeca' },
  pancake: { label: 'Pannenkoeken',   slug: 'pannenkoeken' },
};
```

### Fallback Mechanisme

Als de `regions` tabel niet bereikbaar is (HTTP 404), valt het script terug op een hardcoded array van 14 regio's. Zo werkt de build altijd, ook zonder database-verbinding.

---

## CI/CD Pipeline

```yaml
# .github/workflows/sync-site.yml
name: Sync PeuterPlannen Data
on:
  schedule:
    - cron: '0 6 * * *'          # dagelijks 07:00 CET
  workflow_dispatch:               # handmatige trigger
  repository_dispatch:
    types: [data-changed]          # webhook trigger
```

### Trigger Flow

```
Database wijziging
    ↓
GitHub repository_dispatch (via curl/webhook)
    ↓
GitHub Actions: sync-site.yml
    ↓
node .scripts/sync_all.js
    ↓
git commit + push (alleen als er changes zijn)
    ↓
GitHub Pages / Cloudflare auto-deploy
    ↓
Live site updated (~90 seconden)
```

### Webhook triggeren

```bash
curl -X POST \
  -H "Authorization: Bearer $GITHUB_PAT" \
  https://api.github.com/repos/basmetten/peuterplannen/dispatches \
  -d '{"event_type":"data-changed"}'
```

---

## Frontend Architectuur

### Bestandsstructuur

```
peuterplannen/
├── .github/workflows/sync-site.yml    # CI/CD
├── .scripts/sync_all.js               # Build script
├── icons/                             # PWA icons (192px, 512px)
├── data/                              # JSON data backups
│
├── index.html          ← Landing page (SEO-geoptimaliseerd)
├── app.html            ← Interactieve app (kaart + lijst)
├── about.html          ← Over ons
├── contact.html        ← Contact
│
├── amsterdam.html      ┐
├── rotterdam.html      │
├── den-haag.html       │  14 stadspagina's
├── utrecht.html        │  (gegenereerd door sync_all.js)
├── ...                 │
├── nijmegen.html       ┘
│
├── speeltuinen.html    ┐
├── natuur.html         │  5 type-pagina's
├── musea.html          │  (gegenereerd door sync_all.js)
├── horeca.html         │
├── pannenkoeken.html   ┘
│
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker
├── sitemap.xml         ← SEO sitemap (gegenereerd)
├── robots.txt          ← Crawler regels
├── CNAME               ← GitHub Pages domein
└── favicon.ico
```

### Styling

Alle CSS zit inline in elke HTML-pagina (geen externe stylesheets). Thema-variabelen:

```css
--primary:       #2A9D8F;     /* Teal */
--primary-light: #E6F5F3;     /* Licht teal achtergrond */
--accent:        #E76F51;     /* Peach / oranje */
--navy:          #264653;     /* Tekst kleur */
--gold:          #E9C46A;     /* Accent goud */
--bg:            #FEFBF6;     /* Pagina achtergrond */
```

**Fonts:** Nunito (koppen), Inter (body) — geladen via Google Fonts.

**Responsive:** Mobile-first met `max-width: 540px` container voor de app.

---

## app.html — Interactieve App

De kern van PeuterPlannen. Een single-page applicatie in vanilla JavaScript.

### Layout

```
┌─────────────────────────────┐
│  Header (logo + stats)      │
├─────────────────────────────┤
│  Zoekbalk (Google Places)   │
│  + GPS knop                 │
├─────────────────────────────┤
│  Filter chips (scrollbaar)  │
│  Alles│Speeltuin│Natuur│... │
├─────────────────────────────┤
│                             │
│  Resultaten (lijst)         │
│  of                         │
│  Kaart (MapLibre GL)        │
│                             │
├─────────────────────────────┤
│  ◉ Home  ◉ Kaart  ♡ Fav  ℹ │  ← Bottom nav (mobiel)
└─────────────────────────────┘
```

### Data Flow

```javascript
// 1. Fetch locaties direct vanuit Supabase
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
const SB_KEY = atob("...");  // Base64-encoded anon key

async function loadLocations() {
  let url = SB_URL + "?select=*";
  if (activeTag !== 'all')     url += "&type=eq." + activeTag;
  if (activeWeather)           url += "&weather=eq." + activeWeather;
  if (activeRegion)            url += "&region=eq." + activeRegion;
  // ... meer filters

  const res = await fetch(url, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  const locations = await res.json();
  renderResults(locations);
}
```

### Filtersysteem

| Filter | Type | Bron |
|--------|------|------|
| Type | `activeTag` | Chips: alles, play, nature, museum, horeca, pancake, favorites |
| Weer | `activeWeather` | null, 'indoor', 'outdoor' |
| Faciliteiten | `activeFacilities` | { coffee: bool, diaper: bool } |
| Regio | `activeRegion` | URL param `?regio=Amsterdam` |
| Locatie | `userLocation` | GPS of Google Places zoekopdracht |

### Kaart (MapLibre GL)

```javascript
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [5.1, 52.1],  // Nederland centrum
  zoom: 7
});

// GeoJSON source met clustering
map.addSource('locations', {
  type: 'geojson',
  data: buildGeoJSON(locations),
  cluster: true,
  clusterMaxZoom: 13,
  clusterRadius: 45
});
```

**Type-kleuren op de kaart:**

| Type | Kleur |
|------|-------|
| Speeltuin | `#52B788` (groen) |
| Natuur | `#2D6A4F` (donkergroen) |
| Horeca | `#E76F51` (oranje) |
| Museum | `#7B2D8B` (paars) |
| Pannenkoeken | `#E9C46A` (goud) |

### Locatiekaart

```
┌──────────────────────────────┐
│  [Speeltuin]  2.3 km   ☀️   │
│                          ♡   │
│  Monkey Town Amsterdam       │
│  Overdekte speeltuin met...  │
│                              │
│  👶 0-10 jaar                │
│  ☕ Koffie  🚼 Verschonen    │
│                              │
│  [🗺 Maps]    [↗ Delen]      │
└──────────────────────────────┘
```

### Favorieten

Opgeslagen in `localStorage` als JSON array van locatie-IDs:

```javascript
const favKey = 'peuterplannen_favorites';
let favorites = JSON.parse(localStorage.getItem(favKey) || '[]');

function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx >= 0) favorites.splice(idx, 1);
  else favorites.push(id);
  localStorage.setItem(favKey, JSON.stringify(favorites));
}
```

### URL Parameters

| Parameter | Effect |
|-----------|--------|
| `?weather=indoor` | Pre-filter op binnen |
| `?weather=outdoor` | Pre-filter op buiten |
| `?type=play` | Pre-filter op type |
| `?regio=Amsterdam` | Filter op specifieke regio |

### Performance

- **Lazy loading**: Google Maps API wordt pas geladen bij eerste zoekopdracht
- **MapLibre**: Geladen via `requestIdleCallback` (achtergrond)
- **Skeleton loading**: Shimmer-animatie tijdens data-fetch
- **AbortController**: Vorige requests worden geannuleerd bij nieuwe filter

---

## Gegenereerde Pagina's

### Stadspagina's (14 stuks)

Gegenereerd door `generateCityPage()` per actieve regio.

```
amsterdam.html
├── Nav (logo + "Zoek in Amsterdam" CTA)
├── Hero ("Uitjes met peuters in Amsterdam")
├── Breadcrumb (PeuterPlannen › Amsterdam)
├── Intro (regio blurb + locatie-aantal)
├── Secties per type:
│   ├── Speeltuinen & Speelparadijzen (h2)
│   │   ├── Locatie 1 (naam, beschrijving, website, badges)
│   │   └── Locatie 2 ...
│   ├── Natuur & Kinderboerderijen
│   ├── Musea
│   ├── Pannenkoekenrestaurants
│   └── Kindvriendelijke Restaurants
├── CTA ("Zoek op jouw locatie")
├── Andere steden (links naar 13 andere stadspagina's)
└── JSON-LD (ItemList met TouristAttraction items)
```

### Type-pagina's (5 stuks)

Gegenereerd door `generateTypePage()` per locatietype.

```
speeltuinen.html
├── Nav + Hero
├── Breadcrumb (PeuterPlannen › Speeltuinen)
├── Intro (type-beschrijving)
├── Secties per regio:
│   ├── Speeltuinen in Amsterdam (h2)
│   ├── Speeltuinen in Rotterdam
│   └── ... (14 regio's)
├── FAQ sectie (3 veelgestelde vragen met <details>)
├── CTA
├── Links naar andere typen + steden
└── JSON-LD (ItemList + FAQPage)
```

---

## SEO & Structured Data

### JSON-LD Schemas

| Pagina | Schema | Inhoud |
|--------|--------|--------|
| `index.html` | WebApplication | App-beschrijving, prijs (gratis), areaServed |
| `index.html` | FAQPage | 3 veelgestelde vragen |
| `app.html` | WebApplication | Idem met runtime-context |
| Stadspagina's | ItemList | Alle locaties als TouristAttraction |
| Type-pagina's | ItemList + FAQPage | Locaties + FAQ |

### Meta Tags

Elke pagina bevat:
- `<title>` — Uniek per pagina
- `<meta name="description">` — Dynamisch gegenereerd
- `<link rel="canonical">` — Canonieke URL
- **Open Graph**: `og:title`, `og:description`, `og:image`, `og:locale`
- **Twitter Card**: `twitter:card`, `twitter:title`, `twitter:description`

### Sitemap

Gegenereerd door sync_all.js met prioriteiten:

| URL | Priority | Changefreq |
|-----|----------|------------|
| `/` | 1.0 | weekly |
| `/app.html` | 0.9 | daily |
| Stadspagina (primary tier) | 0.85 | weekly |
| Type-pagina's | 0.80 | weekly |
| Stadspagina (standard tier) | 0.75 | weekly |
| `/about.html` | 0.5 | monthly |
| `/contact.html` | 0.4 | monthly |

---

## PWA (Progressive Web App)

### manifest.json

```json
{
  "name": "PeuterPlannen",
  "short_name": "PeuterPlannen",
  "start_url": "/app.html",
  "display": "standalone",
  "background_color": "#FEFBF6",
  "theme_color": "#2A9D8F",
  "orientation": "portrait-primary",
  "lang": "nl",
  "categories": ["lifestyle", "kids"]
}
```

### Service Worker (sw.js)

**Strategie: Stale-While-Revalidate**

1. **Install** — Cache statische assets (HTML, icons)
2. **Activate** — Verwijder oude cache-versies
3. **Fetch** — Serveer uit cache, update op achtergrond

```
Request → Cache hit?
  ├── Ja  → Serveer uit cache + fetch in achtergrond → update cache
  └── Nee → Fetch van netwerk → cache resultaat → serveer
```

Cache naam: `peuterplannen-v2`

---

## Nieuwe Regio Toevoegen

Na de herstructurering zijn er **2 stappen, 0 code-wijzigingen** nodig:

### Stap 1: Regio toevoegen

```sql
INSERT INTO regions (name, slug, blurb, display_order, population, tier)
VALUES ('Zwolle', 'zwolle', 'Zwolle is een bruisende...', 15, 134000, 'standard');
```

### Stap 2: Locaties toevoegen

```sql
INSERT INTO locations (name, type, region, lat, lng, description, ...)
VALUES ('Speeltuin De Bult', 'play', 'Zwolle', 52.51, 6.10, '...', ...);
```

### Automatisch resultaat

De pipeline regenereert alles:
- Nieuwe stadspagina `zwolle.html`
- Zwolle verschijnt in alle type-pagina's
- Index city grid bevat Zwolle
- Sitemap bevat nieuwe URL
- JSON-LD areaServed is bijgewerkt
- Alle counts zijn correct

---

## Beveiliging

| Aspect | Implementatie |
|--------|--------------|
| **Database** | Row Level Security (RLS) op Supabase; anon key = read-only |
| **API keys** | Anon key (publiek, alleen lezen) in client; service key alleen in CI/CD |
| **Secrets** | GitHub Actions encrypted secrets voor Supabase credentials |
| **XSS** | Geen user-generated content gerenderd; alle data server-gecontroleerd |
| **HTTPS** | Afgedwongen via Cloudflare |
| **robots.txt** | JSON data-bestanden geblokkeerd (`Disallow: /*.json`) |

---

## Samenvatting Dataflow

```
  Supabase DB
  (regions + locations)
       │
       ├──── BUILD-TIME ────────────────────────────┐
       │     sync_all.js (dagelijks via GitHub       │
       │     Actions of handmatig)                   │
       │         │                                   │
       │         ├── index.html (markers bijgewerkt) │
       │         ├── app.html (markers bijgewerkt)   │
       │         ├── about.html (markers bijgewerkt) │
       │         ├── manifest.json                   │
       │         ├── 14× {stad}.html (gegenereerd)   │
       │         ├── 5× {type}.html (gegenereerd)    │
       │         └── sitemap.xml (gegenereerd)        │
       │                                             │
       │              git push → GitHub Pages        │
       │                                             │
       └──── RUNTIME ───────────────────────────────┐
             app.html laadt data via                 │
             Supabase REST API (anon key)            │
                 │                                   │
                 ├── Filtering (type/weer/regio)      │
                 ├── MapLibre kaart + clustering      │
                 ├── Google Places locatiezoeken      │
                 ├── Afstandsberekening (Haversine)   │
                 └── Favorieten (localStorage)        │
                                                     │
             Browser ← Statische HTML + live data    │
             └────────────────────────────────────────┘
```
