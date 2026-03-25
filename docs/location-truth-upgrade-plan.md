# Location Truth Upgrade — Plan

**Datum:** 24 maart 2026
**Doel:** Systematisch verbeteren van de waarheid en volledigheid van alle 2138 locaties in de PeuterPlannen dataset, gevolgd door discovery van nieuwe kandidaat-locaties.

---

## 1. Doel & Scope

### Primair doel
Voor elke bestaande locatie: elk relevant veld aanvullen, corrigeren of valideren op basis van publiek beschikbare informatie. Waar onbetrouwbaar → leeg laten of markeren als onzeker.

### Secundair doel
Nieuwe kandidaat-locaties ontdekken die passen in de dataset. Niet blind toevoegen maar via de bestaande `location_candidates` staging-workflow.

### Buiten scope
- Frontend/app wijzigingen
- Foto-pipeline (apart systeem, 99.9% coverage)
- SEO-content generatie
- Partner portal

---

## 2. Aannames

1. **Supabase service key** in `.supabase_env` heeft schrijftoegang tot `locations` tabel — gevalideerd
2. **Google Maps API key** in `.supabase_env` onder `GOOGLE_MAPS_KEY` — werkt voor Places API (Find Place, Place Details)
3. **Anthropic API key** beschikbaar voor Claude Haiku normalisatie
4. **Gemini API key** beschikbaar in env voor visuele checks
5. **Geen rate limit issues** bij ≤2 req/sec naar Google, ≤10 req/sec naar websites
6. **Bestaande `db.js`** en `config.js` modules herbruikbaar als infra
7. **Dirty flag** op `site_publish_state` gaat niet af door directe PATCH op `locations` (alleen via trigger bij significante veldwijzigingen) — dit is gewenst, we willen rebuilds triggeren
8. **Machine** heeft voldoende resources voor overnight run (Node.js, geen GPU nodig)
9. **Bestaande data door editors/handmatig** wordt NIET overschreven tenzij aantoonbaar onjuist
10. **Geen destructieve operaties** — we vullen aan, overschrijven alleen met hogere confidence

---

## 3. Repo-context samenvatting

| Aspect | Detail |
|--------|--------|
| Database | Supabase PostgreSQL, 2138 locaties, 22 regio's |
| Schrijfpad | REST API via `db.js` → `patchLocation(id, patch)` |
| Bestaande pipeline | `.scripts/pipeline/` — 40+ scripts, CJS modules |
| Audit trail | `location_observations` tabel + `location_edit_log` |
| Candidate staging | `location_candidates` + `location_ai_reviews` tabellen |
| Photo pipeline | Apart systeem, niet geraakt door dit plan |
| CI/CD | GitHub Actions elke 10 min, gate op `site_publish_state.dirty` |

---

## 4. Inkomende afhankelijkheden

| Afhankelijkheid | Status | Locatie |
|----------------|--------|---------|
| Supabase service key | ✅ Aanwezig | `.supabase_env` → `SUPABASE_SERVICE_KEY` |
| Google Maps API key | ✅ Aanwezig | `.supabase_env` → `GOOGLE_MAPS_KEY` |
| Anthropic API key | ✅ Aanwezig | `.supabase_env` → `ANTHROPIC_API_KEY` |
| Gemini API key | ✅ Aanwezig | `$GEMINI_API_KEY` env var |
| Node.js 25+ | ✅ v25.2.1 | Systeem |
| `db.js` module | ✅ Herbruikbaar | `.scripts/pipeline/db.js` |
| `config.js` module | ✅ Herbruikbaar | `.scripts/pipeline/config.js` |
| `enrich_sources.js` | ✅ Website scraper + Google enricher | `.scripts/pipeline/enrich_sources.js` |
| Playwright/Puppeteer | ✅ In devDeps | Alleen als fallback voor JS-heavy sites |
| Region→municipality mapping | ✅ In `config.js` REGIONS | 170+ gemeenten |
| Bestaand audit rapport | ✅ 108 issues | `dataset-audit-report.md` + `dataset-fixes.sql` |

---

## 5. Uitgaande afhankelijkheden

| Output | Bestemming | Formaat |
|--------|-----------|---------|
| Verrijkte location records | `locations` tabel via PATCH | JSON per veld |
| Provenance log | `.scripts/pipeline/output/truth-upgrade-log.jsonl` | JSONL per locatie |
| Progress state | `.scripts/pipeline/output/truth-upgrade-progress.json` | JSON (resume key) |
| Samenvatting rapport | `.scripts/pipeline/output/truth-upgrade-report.md` | Markdown |
| Nieuwe kandidaten | `location_candidates` tabel | Via bestaande `upsertCandidates()` |
| Site rebuild trigger | `site_publish_state.dirty = true` | Automatisch via DB trigger |

---

## 6. Risicoregister

| # | Risico | Impact | Kans | Mitigatie |
|---|--------|--------|------|-----------|
| R1 | Google API kosten hoger dan verwacht | €50-100 | Laag | Budget cap: max 2000 Place Details calls (~$34). Eerst place_id resolven (goedkoper), dan alleen details voor locaties met gaps |
| R2 | Rate limiting door Google/websites | Pipeline vertraagt | Midden | Exponential backoff + jitter, concurrency=2, hervatbaar |
| R3 | Onjuiste data van Google overwrite correcte handmatige data | Data regressie | Midden | Confidence scoring: handmatige data > Google > scrape. Alleen overschrijven bij hogere confidence |
| R4 | Pipeline crash halverwege | Verloren voortgang | Midden | Progress file per locatie, atomaire PATCH per veld, idempotent |
| R5 | Supabase dirty flag triggert rebuilds tijdens run | Overmatige CI runs | Laag | Acceptabel: CI skips als dirty=false, en we willen de rebuild |
| R6 | Website scraper triggert WAF/captcha | Missende data | Midden | Respectvolle User-Agent, 2s delay, fallback naar Google data |
| R7 | Claude Haiku hallucinates data | Onjuiste velden | Laag | Haiku alleen voor normalisatie/samenvatting, niet voor feitelijke data. Alle feiten van bronnen, niet van LLM |
| R8 | Locatie permanent gesloten maar niet gedetecteerd | Verouderde data | Midden | Google `business_status` check, website 404 detectie |

---

## 7. Bronhiërarchie (hoog → laag vertrouwen)

1. **Google Places API** — business_status, opening_hours (structured), formatted_address, place_id, rating, user_ratings_total
2. **Officiële website van de locatie** — beschrijving, faciliteiten, openingstijden (tekst), prijzen
3. **Google Maps reviews (via Places API)** — bevestiging van faciliteiten, sfeer
4. **OSM data** — naam, adres, tags (complementair)
5. **Berekende waarden** — distance_from_city_center (haversine)
6. **LLM normalisatie** — alleen voor formatting, nooit voor feitelijke claims

### Overschrijf-regels

| Bestaande waarde | Nieuwe bron | Actie |
|-----------------|-------------|-------|
| NULL / leeg | Elke betrouwbare bron | → Invullen |
| Editor/handmatig ingevuld | Google/scrape | → NIET overschrijven, tenzij duidelijk onjuist |
| AI-gegenereerd (kort/generic) | Google/scrape (beter) | → Overschrijven met confidence flag |
| Correct en volledig | Alles | → Valideren, niet wijzigen |

---

## 8. Veldbeleid per belangrijk veld

### Tier 1 — Hoge impact, veel missend

| Veld | Huidig | Bron | Strategie |
|------|--------|------|-----------|
| `opening_hours` | 52.3% | Google Places `opening_hours.weekday_text[]` → join met `; ` | Direct invullen als NULL |
| `place_id` | 21.6% | Google Find Place from Text → `place_id` | Zoek op naam + regio + "Nederland" |
| `distance_from_city_center_km` | 5.1% | Haversine(loc.lat/lng, city_center.lat/lng) | Puur berekend, geen API nodig |
| `play_corner_quality` | 4.0% | Website scrape + Google reviews keyword scan | Alleen voor horeca/pancake types |

### Tier 2 — ~200 locaties missen alles

| Veld | Huidig | Bron | Strategie |
|------|--------|------|-----------|
| `coffee` | 90.7% | Website + Google Places types | Invullen als NULL |
| `diaper` | 90.7% | Website keyword scan | Invullen als NULL |
| `alcohol` | 90.7% | Website + menu scan | Invullen als NULL |
| `price_band` | 90.6% | Website + Google price_level | Map: 0=free, 1=low, 2=mid, 3-4=high |
| `time_of_day_fit` | 90.6% | Opening hours analyse | Derive from hours |
| `rain_backup_quality` | 90.6% | Weather field + website | Derive from weather + keywords |
| `parking_ease` | 90.6% | Website + Google | Keyword scan |
| `buggy_friendliness` | 90.6% | Website + reviews | Keyword scan |
| `toilet_confidence` | 90.6% | Website + reviews | Keyword scan |
| `noise_level` | 90.6% | Type-based default + reviews | Heuristic |
| `food_fit` | 90.6% | Website + menu presence | Keyword scan |
| `crowd_pattern` | 90.6% | Google popular_times | If available |

### Tier 3 — Validatie & verbetering

| Veld | Huidig | Strategie |
|------|--------|-----------|
| `website` | 90.6% | Validate existing (HEAD request), find missing via Google |
| `description` | 100% (maar veel kort) | Improve descriptions <80 chars via Claude Haiku + web context |
| `toddler_highlight` | 99.6% | Fill 8 missing via Claude Haiku |
| `last_verified` | 90.0% | Set to today for all enriched locations |
| `verification_mode` | 93.6% | Set to `web_verified` for enriched |

### Tier 4 — Correcties uit audit

| Type | Aantal | Strategie |
|------|--------|-----------|
| permanently_closed | 8 | Soft-delete (seo_tier='support', description prefix) |
| dead_website | 16 | Set website=NULL |
| wrong_type | 28 | Correct type field |
| wrong_region | 25 | Correct region field |
| wrong_name | 13 | Correct name field |
| wrong_location | 10 | Correct lat/lng if data available |

---

## 9. Queue-architectuur

```
┌─────────────────────────────────────────┐
│          truth-upgrade.js               │
│                                         │
│  1. Load all locations from Supabase    │
│  2. Load progress file (resume)         │
│  3. Apply audit fixes (Tier 4)          │
│  4. Compute deterministic fields (Tier 1)│
│  5. For each unprocessed location:      │
│     a. Resolve place_id (if missing)    │
│     b. Fetch Google Places Details      │
│     c. Scrape website (if available)    │
│     d. Merge signals                    │
│     e. Derive context fields            │
│     f. Normalize via Haiku (if needed)  │
│     g. PATCH Supabase (changed fields)  │
│     h. Write provenance log             │
│     i. Update progress file             │
│  6. Generate summary report             │
└─────────────────────────────────────────┘
```

### Concurrency
- Google API: 2 concurrent (to stay under rate limits)
- Website scraping: 2 concurrent
- Claude Haiku: 5 concurrent (cheap, fast)
- Supabase PATCH: sequential (one per location)

### Resume
- Progress file: `{ "processed": { "123": { "ts": "...", "result": "ok" }, ... }, "cursor": 456 }`
- On restart: skip all IDs in `processed`, continue from `cursor`
- Idempotent: re-processing a location produces same result

### Batching
- Locations sorted by ID ascending
- Env vars: `LIMIT=N`, `OFFSET=N`, `DRY_RUN=1`
- Default: process all, 2 concurrent enrichments

---

## 10. Runbook voor overnight run

```bash
# 1. Pre-flight check
cd /Users/basmetten/peuterplannen
node .scripts/pipeline/truth-upgrade.js --dry-run --limit=5

# 2. Start full run (nohup for overnight)
nohup node .scripts/pipeline/truth-upgrade.js \
  > .scripts/pipeline/output/truth-upgrade-stdout.log 2>&1 &
echo $! > .scripts/pipeline/output/truth-upgrade.pid

# 3. Monitor progress
tail -f .scripts/pipeline/output/truth-upgrade-stdout.log
# Or check progress:
cat .scripts/pipeline/output/truth-upgrade-progress.json | python3 -c "import json,sys;d=json.load(sys.stdin);print(f'Processed: {len(d[\"processed\"])}/{d[\"total\"]}')"

# 4. Resume after crash
node .scripts/pipeline/truth-upgrade.js
# (automatically picks up from progress file)

# 5. View results
cat .scripts/pipeline/output/truth-upgrade-report.md
wc -l .scripts/pipeline/output/truth-upgrade-log.jsonl
```

### Verwachte runtime
- ~2138 locaties × ~3s per locatie (Google + scrape + Haiku) = ~107 minuten
- Met retries en jitter: ~2-3 uur
- Google API kosten: ~$25-35 (1676 Find Place + up to 2138 Details)

---

## 11. Rollbackstrategie

### Tijdens de run
- Pipeline schrijft alleen PATCH (geen DELETE, geen INSERT)
- Elke PATCH wordt gelogd in provenance log met oude + nieuwe waarden
- Pipeline kan gestopt worden (Ctrl+C / kill), herstart hervat waar gestopt

### Na de run
- Provenance log bevat alle wijzigingen met old/new waarden
- Rollback script kan gegenereerd worden uit provenance log:
  ```bash
  node .scripts/pipeline/truth-upgrade.js --rollback
  ```
- Dit leest het log en PATCH-t alle velden terug naar hun oude waarden

### Noodstop
```bash
kill $(cat .scripts/pipeline/output/truth-upgrade.pid)
```

---

## 12. Bewijs/acceptatiecriteria

| Criterium | Meting |
|-----------|--------|
| opening_hours coverage | >75% (was 52.3%) |
| place_id coverage | >60% (was 21.6%) |
| distance_from_city_center_km coverage | 100% (was 5.1%) |
| ~200 under-enriched locaties aangevuld | coffee/diaper/price_band etc. >95% |
| Audit fixes toegepast | 108 issues geadresseerd |
| Provenance log compleet | 1 entry per verwerkte locatie |
| Progress file correct | Herstart na kill hervat correct |
| Geen data regressie | Geen handmatige waarden overschreven |
| Pipeline report gegenereerd | Markdown met statistieken |
| Overnight run stabiel | <5% error rate |

---

## 13. Discovery-strategie voor nieuwe locaties

### Na voltooiing van enrichment:

1. **OSM Discovery** — hergebruik bestaand `discover_osm.js` voor alle 22 regio's
   - Filter op amenity types: playground, farm, zoo, museum, restaurant, cafe, swimming_pool
   - Dedup tegen bestaande locaties op naam + coördinaten (haversine <200m)

2. **Web Discovery** — zoek naar locaties die niet in OSM staan
   - Google Places Nearby Search per regio per type
   - Keyword: "kindvriendelijk restaurant [stad]", "speeltuin [stad]", etc.

3. **Staging** — alle kandidaten gaan in `location_candidates` met status `new`
   - Doorlopen bestaande pipeline: enrich → score → review
   - Alleen `approved` kandidaten worden na handmatige review gepromoveerd

4. **Deduplicatie** — check tegen bestaande `locations` op:
   - Exact `place_id` match
   - Naam similarity (normalized) + <200m haversine
   - Website domain match

---

## 14. Edge cases

| Case | Handling |
|------|----------|
| Locatie heeft geen website en geen place_id | Skip enrichment, log as `no_sources` |
| Google retourneert meerdere place_id matches | Neem dichtstbijzijnde (haversine) |
| Website redirect naar compleet ander domein | Log als `website_redirect`, don't update |
| Opening hours in vrije tekst (geen Google) | Laat bestaande waarde, of extract met Haiku als betrouwbaar |
| Locatie is seizoensgebonden (alleen zomer) | Google opening_hours bevat dit, neem over |
| Google zegt gesloten maar website zegt open | Vertrouw website, log conflict |
| Meerdere locaties op zelfde adres | Process apart, dedup check op naam |
| UTF-8 issues in scraped text | Sanitize via bestaande `sanitizeString()` |
| Locatie verhuisd (andere coördinaten) | Log als `potential_move`, niet automatisch wijzigen |

---

## 15. City center coördinaten

Voor `distance_from_city_center_km` berekening:

```javascript
const CITY_CENTERS = {
  'Amsterdam':           { lat: 52.3676, lng: 4.9041 },
  'Rotterdam':           { lat: 51.9225, lng: 4.4792 },
  'Den Haag':            { lat: 52.0705, lng: 4.3007 },
  'Utrecht':             { lat: 52.0907, lng: 5.1214 },
  'Haarlem':             { lat: 52.3874, lng: 4.6462 },
  'Amersfoort':          { lat: 52.1561, lng: 5.3878 },
  'Leiden':              { lat: 52.1601, lng: 4.4970 },
  'Utrechtse Heuvelrug': { lat: 52.0394, lng: 5.3875 },
  'Gooi en Vechtstreek': { lat: 52.2292, lng: 5.1750 },
  'Almere':              { lat: 52.3508, lng: 5.2647 },
  'Eindhoven':           { lat: 51.4416, lng: 5.4697 },
  'Groningen':           { lat: 53.2194, lng: 6.5665 },
  'Tilburg':             { lat: 51.5555, lng: 5.0913 },
  'Breda':               { lat: 51.5719, lng: 4.7683 },
  "'s-Hertogenbosch":    { lat: 51.6978, lng: 5.3037 },
  'Arnhem':              { lat: 51.9851, lng: 5.8987 },
  'Nijmegen':            { lat: 51.8426, lng: 5.8527 },
  'Apeldoorn':           { lat: 52.2112, lng: 5.9699 },
  'Enschede':            { lat: 52.2215, lng: 6.8937 },
  'Zwolle':              { lat: 52.5168, lng: 6.0830 },
  'Dordrecht':           { lat: 51.8133, lng: 4.6901 },
  'Maastricht':          { lat: 50.8514, lng: 5.6910 },
};
```
