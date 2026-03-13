# PeuterPlannen — OSM + AI Discovery Pipeline

## Wat doet de pipeline?

De pipeline ontdekt automatisch kindvriendelijke locaties via OpenStreetMap en beoordeelt ze met AI (Claude). Het resultaat: kandidaat-locaties die na handmatige review gepromoveerd worden naar de live `locations` tabel.

```
OpenStreetMap (Overpass API)
       │
       ▼
  ┌────────────┐
  │ 1. Discover │  OSM tags filteren op kindvriendelijke POIs
  └──────┬─────┘  → location_candidates (status: new)
         │
  ┌──────▼─────┐
  │ 2. Enrich   │  Google Places, website scraping, evidence
  └──────┬─────┘  → location_source_evidence + status: enriched
         │
  ┌──────▼─────┐
  │ 3. Score    │  Claude Haiku beoordeelt kindvriendelijkheid
  └──────┬─────┘  → location_ai_reviews + status: scored
         │
    ┌────┼────┐
    ▼    ▼    ▼
 approved  needs   rejected
    │    review
    ▼      │
 promoted ◄┘  (na handmatige review in admin portal)
 (→ locations tabel + site_publish_state dirty)
```

## Hoe draai je de pipeline?

### Standaard run (Utrecht + omliggende gemeenten)

```bash
npm run pipeline:utrecht:codex
```

### Dry run (test met 20 items, geen database wijzigingen)

```bash
npm run pipeline:utrecht:codex:dry
```

### Custom regio

```bash
node .scripts/pipeline/run_osm_ai_codex.js \
  --region=Amsterdam \
  --with-surroundings=true
```

### Alle opties

| Optie | Default | Beschrijving |
|-------|---------|--------------|
| `--region=X` | `Utrecht` | Hoofdregio om te scannen |
| `--with-surroundings=true` | `true` | Inclusief omliggende gemeenten |
| `--dry-run=true` | `false` | Geen database schrijfacties |
| `--limit=20` | onbeperkt | Max aantal kandidaten verwerken |
| `--model=X` | `claude-haiku-4-5-20251001` | AI model voor scoring |
| `--score-threshold=8` | `8` | Minimale score voor auto-approve |
| `--confidence-threshold=0.7` | `0.7` | Minimale confidence voor auto-approve |

### Environment variabelen

| Variabele | Beschrijving |
|-----------|--------------|
| `ANTHROPIC_API_KEY` | Claude API key (of uit `.supabase_env`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `PIPELINE_SCORE_CONCURRENCY` | Concurrent scoring workers (default: 5) |

---

## Configuratie

### Regio's (`config.js`)

Het `REGIONS` object definieert 100+ gemeenten, gegroepeerd per PeuterPlannen-regio:

```javascript
const REGIONS = {
  'Utrecht':     { osmName: 'Utrecht', adminLevel: 8 },
  'De Bilt':     { osmName: 'De Bilt', adminLevel: 8, supabaseRegion: 'Utrecht' },
  // ...omliggende gemeenten mappen naar de hoofdregio
};
```

- Gemeenten zonder `supabaseRegion` zijn hoofdregio's
- Gemeenten met `supabaseRegion` worden onder de hoofdregio gegroepeerd
- `--with-surroundings=true` neemt alle gerelateerde gemeenten mee

### Filter-keywords

**BAR_KEYWORDS**: Locaties met deze termen worden gefilterd (cocktail, casino, coffeeshop, etc.)

**HARD_REJECT_PATTERNS**: Regex patterns die direct afgewezen worden (casino, stripclub, etc.)

**KID_KEYWORDS**: Positieve signalen voor kindvriendelijkheid (speelhoek, kinderstoel, etc.)

---

## Scoring criteria

Claude beoordeelt elke kandidaat op een schaal van 1-10:

| Score | Betekenis |
|-------|-----------|
| 1-4 | Niet kindvriendelijk / irrelevant |
| 5-6 | Mogelijk geschikt maar onzeker |
| 7 | Waarschijnlijk geschikt, extra info nodig |
| 8-9 | Kindvriendelijk, goede match |
| 10 | Uitstekende match (dedicated kinderlocatie) |

### Auto-approve drempel
- Score >= 8 **EN** confidence >= 0.7 → `approved` (wordt automatisch gepromoveerd)
- Score 5-7 of lage confidence → `needs_review` (handmatige review in admin)
- Score < 5 → `rejected`

### Wat het model beoordeelt
- Is dit een locatie waar je met peuters (0-7 jaar) naartoe kunt?
- Is er voldoende informatie om dit te beoordelen?
- Zijn er veiligheidsrisico's of leeftijdsbeperkingen?
- Past de locatie bij een van de PeuterPlannen categorieën?

---

## Database tabellen

### `location_candidates`
Bevat alle ontdekte kandidaten met hun huidige status.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `id` | SERIAL | Primary key |
| `ingestion_run_id` | INT | Referentie naar de batch run |
| `source_id` | TEXT | Unieke source identifier |
| `source_fingerprint` | TEXT | SHA1 hash voor deduplicatie |
| `name` | TEXT | Locatienaam |
| `status` | TEXT | `new` → `enriched` → `scored` → `approved`/`rejected`/`needs_review` → `promoted` |
| `raw_payload` | JSONB | Originele OSM data |
| `enriched_signals` | JSONB | Verrijkte data (Google, website) |

### `location_source_evidence`
Multi-source bewijsmateriaal per kandidaat.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `candidate_id` | INT | FK naar location_candidates |
| `source` | TEXT | `osm`, `website`, `google`, `tripadvisor` |
| `payload_json` | JSONB | Ruwe data van de bron |
| `signals_json` | JSONB | Geëxtraheerde signalen |

### `location_ai_reviews`
AI beoordelingen per kandidaat.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `candidate_id` | INT | FK naar location_candidates |
| `model` | TEXT | Gebruikt AI model |
| `score_10` | INT | Score 1-10 |
| `confidence` | DECIMAL | 0.0 - 1.0 |
| `decision` | TEXT | `approved`, `rejected`, `needs_review` |
| `reasons_json` | JSONB | Uitleg van het model |
| `risk_flags` | JSONB | Eventuele risicosignalen |

### `ingestion_runs`
Batch run administratie.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `run_type` | TEXT | `ingest` of `reaudit` |
| `region_root` | TEXT | Hoofdregio |
| `status` | TEXT | `running`, `done`, `failed` |
| `stats_json` | JSONB | Statistieken (discovered, scored, etc.) |

---

## Pipeline scripts

| Script | Beschrijving |
|--------|--------------|
| `run_osm_ai_codex.js` | Hoofdscript: orchestreert discover → enrich → score → promote |
| `config.js` | Regio-configuratie, keywords, utility functions |
| `db.js` | Supabase client voor pipeline tabellen |
| `discover_osm.js` | OSM Overpass API queries voor kindvriendelijke POIs |
| `enrich_sources.js` | Verrijk kandidaten met Google Places + website data |
| `score_workers_codex_cli.js` | Claude scoring via Anthropic SDK |
| `promote_locations.js` | Promoveer approved kandidaten naar locations tabel |
| `dispatch_data_changed.js` | Trigger GitHub Actions rebuild na promotie |

### Standalone scripts

| Script | Beschrijving |
|--------|--------------|
| `reaudit_existing.js` | Herbeoordeelt bestaande locaties |
| `review_horeca_agents.js` | Horeca-specifieke review batch |
| `resolve_needs_review.js` | Verwerk needs_review items |
| `audit_alcohol_*.js` | Alcohol-vlag verificatie pipeline |
| `delete_locations.js` | Verwijder locaties op basis van criteria |
| `watch_progress.sh` | Monitor pipeline voortgang in terminal |

---

## Troubleshooting

### "Unknown region: X"
De regio moet exact overeenkomen met een key in het `REGIONS` object in `config.js`. Check spelling en hoofdlettergebruik.

### OSM query levert niets op
- Check of de regio `skipOsm: true` heeft (dan moet `--with-surroundings=true`)
- Test de Overpass query handmatig op https://overpass-turbo.eu/
- OSM kan rate-limiten; wacht even en probeer opnieuw

### Claude scoring faalt
- Check of `ANTHROPIC_API_KEY` is ingesteld (env var of `.supabase_env`)
- Check API rate limits (verlaag `PIPELINE_SCORE_CONCURRENCY`)
- Check of het model beschikbaar is

### Kandidaat wordt niet gepromoveerd
- Check `status` in `location_candidates`: moet `approved` zijn
- Check of er geen duplicate `source_fingerprint` is
- Check `location_ai_reviews` voor de score en decision

### Pipeline loopt vast
- Check `ingestion_runs` tabel voor status `running` die niet voordert
- Stale runs worden automatisch op `failed` gezet bij een nieuwe run
- Bij twijfel: stop het proces en start opnieuw
