# PeuterPlannen — Operationeel Runbook

## Dagelijkse operatie

De site draait grotendeels op autopilot:

- **Elke 10 minuten**: GitHub Actions checkt `site_publish_state.dirty`. Als er wijzigingen zijn → build → audit → deploy.
- **Elke maandag**: `ops-cadence.yml` draait trust gaps, quality tasks, priority drafts, ops briefs, editorial export.
- **Database triggers**: bij elke INSERT/UPDATE op `locations` of `regions` wordt `site_publish_state.dirty = true` gezet en worden gewijzigde IDs getracked.

---

## Nieuwe regio toevoegen

Geen code-wijzigingen nodig. Alleen database:

```sql
-- 1. Voeg de regio toe
INSERT INTO regions (name, slug, blurb, display_order, population, tier, schema_type)
VALUES (
  'Zwolle',
  'zwolle',
  'Zwolle is een bruisende stad met veel kindvriendelijke activiteiten...',
  23,           -- display_order: na de huidige laatste regio
  134000,       -- bevolking
  'standard',   -- tier: 'primary', 'standard', of 'region'
  'City'        -- of 'AdministrativeArea' voor grotere regio's
);

-- 2. Voeg locaties toe
INSERT INTO locations (name, type, region, lat, lng, description, weather, coffee, diaper)
VALUES
  ('Speeltuin De Bult', 'play', 'Zwolle', 52.5100, 6.1000, 'Grote speeltuin...', 'outdoor', false, false),
  ('Museum de Fundatie', 'museum', 'Zwolle', 52.5120, 6.0930, 'Kunstmuseum...', 'indoor', true, true);
```

De volgende build genereert automatisch:
- `zwolle/` directory met locatie-detailpagina's
- Stadspagina in de city grid
- Zwolle in alle type-pagina's
- Bijgewerkte sitemap, JSON-LD, counts

## Locatie handmatig toevoegen

```sql
INSERT INTO locations (
  name, type, region, description, website,
  lat, lng, weather, coffee, diaper, alcohol,
  min_age, max_age, toddler_highlight,
  verification_source
) VALUES (
  'Speeltuin Oosterpark',
  'play',
  'Amsterdam',
  'Grote speeltuin in het Oosterpark met klimtoestellen en zandbak.',
  'https://example.com',
  52.3610, 4.9130,
  'outdoor',
  false, false, false,
  0, 6,
  'Ideaal voor peuters: zandbak, glijbaan en schommel',
  'web_research'
);
```

## Locatie verwijderen

```sql
-- Soft delete: verwijder uit de build maar behoud data
UPDATE locations SET region = 'ARCHIVED' WHERE id = 123;

-- Hard delete (alleen als je zeker weet dat het weg mag)
DELETE FROM locations WHERE id = 123;
```

Na delete wordt de stadspagina automatisch bijgewerkt bij de volgende build.

---

## Build draaien

### Automatisch (CI)

De build draait automatisch via GitHub Actions. Handmatig triggeren:

1. Ga naar Actions → "Sync PeuterPlannen Data" → "Run workflow"
2. Optioneel: vink "Force rebuild and publish" aan

### Lokaal

```bash
cd /Users/basmetten/peuterplannen

# Volledige build (met Supabase data)
npm run build

# Build met fixture data (geen Supabase nodig)
npm run build:local

# Dev server
npm run dev
# Open http://localhost:3000
```

### Verificatie na build

```bash
node .scripts/audit_internal_consistency.js --strict
node .scripts/audit_portals.js --strict
node .scripts/audit_seo_quality.js --strict
```

Alle drie moeten 0 issues rapporteren.

---

## Nooddeploy

Als de site kapot is en je snel moet deployen:

```bash
cd /Users/basmetten/peuterplannen
git checkout main

# 1. Bouw lokaal
npm ci
npm run build

# 2. Controleer
node .scripts/audit_internal_consistency.js --strict

# 3. Commit en push
git add -A
git commit -m "Emergency rebuild"
git push origin main
```

GitHub Pages deployt automatisch bij push naar main.

Als GitHub Pages niet reageert: de Cloudflare CDN cached. Purge de cache via Cloudflare dashboard of:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer CF_API_TOKEN" \
  -d '{"purge_everything":true}'
```

---

## Admin portal gebruiken

URL: https://admin.peuterplannen.nl (of lokaal: http://localhost:3000/admin/)

### Functies:
- **Locaties beheren**: zoeken, bewerken, filteren op regio/type
- **Quality tasks**: bekijken en afwerken van data quality verbeterpunten
- **Editorial CMS**: editorial pagina's bewerken (ontdekken, methode, locatie overrides)
- **Observaties**: partner-observaties reviewen en goedkeuren/afwijzen
- **Claim requests**: venue owner claims goedkeuren

### Authenticatie:
Login via Supabase Auth. Admin-rechten worden via RLS gecontroleerd.

---

## Partner portal gebruiken

URL: https://partner.peuterplannen.nl

### Voor venue owners:
1. Account aanmaken / inloggen
2. Locatie claimen (claim request → goedkeuring door admin)
3. Locatie details bijwerken (beschrijving, foto, openingstijden)
4. Featured listing kopen via Stripe
5. Observaties indienen over eigen locatie

---

## Stripe subscriptions beheren

### Stripe Dashboard
Ga naar https://dashboard.stripe.com voor:
- Actieve subscriptions bekijken
- Betalingen en facturen
- Webhook events inspecteren

### Edge Functions
Stripe events worden afgehandeld door:
- `stripe-webhook`: verwerkt subscription lifecycle (created, updated, cancelled)
- `create-checkout-session`: maakt Stripe checkout voor featured listings
- `create-customer-portal-session`: geeft venue owners toegang tot hun Stripe portaal

### Subscription flow:
```
Venue owner klikt "Featured" → create-checkout-session →
Stripe Checkout → betaling → stripe-webhook →
venue_owners.subscription_status = 'active' →
locations.is_featured = true
```

---

## Supabase migrations deployen

### Via CI
```bash
# Push migrations naar supabase/migrations/ en trigger
npm run deploy:supabase
```

### Handmatig
```bash
# Met Supabase CLI
npx supabase db push --linked
```

### Nieuwe migration maken
```sql
-- supabase/migrations/YYYYMMDD_beschrijving.sql
-- Schrijf je SQL hier
ALTER TABLE locations ADD COLUMN new_field TEXT;
```

---

## Cloudflare Worker updaten

De Worker doet subdomain routing (partner/admin subdomains).

```bash
# Bewerk cloudflare-worker/subdomain-router.js
# Deploy:
npm run deploy:wrangler

# Of via CI: wordt automatisch gedeployed bij elke succesvolle build
```

Configuratie in `wrangler.jsonc`.

---

## Build fouten debuggen

### "Audit failed" in CI

```bash
# Draai de falende audit lokaal
node .scripts/audit_internal_consistency.js --strict 2>&1
node .scripts/audit_portals.js --strict 2>&1
node .scripts/audit_seo_quality.js --strict 2>&1

# Check het audit rapport
cat output/audit-consistency.md
cat output/audit-portals.md
cat output/seo-report.md
```

### "Build failed" / sync_all.js crashed

1. Check of Supabase bereikbaar is
2. Probeer `npm run build:local` (met fixture data)
3. Als dat lukt: probleem zit in de Supabase data, niet in de code

### "Too few HTML files"

De build genereert normaal ~2200 HTML bestanden. Als dat significant minder is:
- Check of alle regio's `is_active = true` staan
- Check of `locations` tabel niet leeg is
- Check de Supabase logs voor fetch errors

### Incremental build herbouwt niet alles

Set `FORCE_FULL_BUILD=1` als env var, of trigger via workflow_dispatch met force=true.

---

## Pipeline draaien (locatie-ontdekking)

De AI pipeline ontdekt nieuwe locaties via OpenStreetMap en beoordeelt ze met Claude:

```bash
# Dry run (20 items, geen database wijzigingen)
npm run pipeline:utrecht:codex:dry

# Volledige run voor Utrecht
npm run pipeline:utrecht:codex

# Custom regio
PIPELINE_SCORE_CONCURRENCY=20 node .scripts/pipeline/run_osm_ai_codex.js \
  --region=Amsterdam --with-surroundings=true
```

### Pipeline stages:
1. **Discover**: OSM data ophalen voor regio
2. **Enrich**: Google Places, website scraping, evidence verzamelen
3. **Score**: Claude beoordeelt of locatie kindvriendelijk is (score 1-10)
4. **Review**: `needs_review` items handmatig beoordelen in admin portal
5. **Promote**: Goedgekeurde kandidaten toevoegen aan `locations` tabel

---

## Operationele taken

### Wekelijkse cadence (automatisch via ops-cadence.yml)

| Taak | Script | Doel |
|------|--------|------|
| Trust gaps | `npm run ops:trust-gaps` | Rapporteer locaties met ontbrekende beschrijvingen/metadata |
| Priority drafts | `npm run ops:seed-priority-drafts` | Genereer editorial drafts voor high-traffic locaties |
| Quality tasks | `npm run ops:quality-tasks` | Sync quality improvement taken vanuit database |
| Ops briefs | `npm run ops:briefs` | Genereer operationele briefings |
| Editorial export | `npm run ops:export-editorial` | Exporteer editorial pagina snapshot |

### Handmatig

```bash
# Bekijk content gaps
npm run ops:trust-gaps

# Bekijk quality tasks in de admin portal
# URL: https://admin.peuterplannen.nl → Quality Tasks
```

---

## Monitoring

### Client errors
- Tabel: `client_errors` in Supabase
- Bevat: message, source, line, col, stack, url, user agent
- Geen PII, geen consent vereist

### Product analytics
- Google Analytics 4: paginabezoeken, user flows
- Cloudflare Web Analytics: performance metrics
- Custom events: `analytics_events` tabel in Supabase

### Build health
- GitHub Actions: check workflow runs op https://github.com/basmetten/peuterplannen/actions
- Audit rapporten: `output/audit-*.md` na elke build

---

## Contactgegevens

| Wat | Wie/Waar |
|-----|----------|
| **Eigenaar** | Bas Metten (basmetten@gmail.com) |
| **Repo** | github.com/basmetten/peuterplannen (private) |
| **Domein** | peuterplannen.nl (Cloudflare DNS) |
| **Database** | Supabase project (piujsvgbfflrrvauzsxe) |
| **Betalingen** | Stripe dashboard |
| **CDN** | Cloudflare dashboard |
