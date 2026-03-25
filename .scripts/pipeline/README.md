# PeuterPlannen — Discovery & Scoring Pipeline

## Overzicht

De pipeline ontdekt kindvriendelijke locaties en beoordeelt ze op geschiktheid. Er zijn drie manieren om dit te doen, afhankelijk van budget, snelheid en gewenste diepgang:

| Methode | Kosten | Snelheid | Kwaliteit | Web research |
|---------|--------|----------|-----------|--------------|
| **Grok batch** (zonder web search) | ~€0.0002/kandidaat | 100+/min | Goed | Nee (pre-enriched signals) |
| **Grok + web search** | ~€0.001/kandidaat | 20-30/min | Zeer goed | Ja, Grok zoekt zelf reviews |
| **Claude Code agents** | Gratis (subscription) | 5-10/sessie | Uitstekend | Ja, diep interactief onderzoek |
| **Lokale heuristiek** | Gratis | Instant | Basis | Nee |

---

## Methode 1: API Batch Scoring

Automatische scoring via AI API. Snel, goedkoop, geschikt voor bulk.

### Anthropic (Claude Haiku) — standaard

```bash
# Volledige run voor een regio
node .scripts/pipeline/run_osm_ai_codex.js --region=Utrecht --with-surroundings=true

# Dry run (20 items, geen DB writes)
node .scripts/pipeline/run_osm_ai_codex.js --region=Amsterdam --dry-run=true --limit=20
```

Vereist: `ANTHROPIC_API_KEY` in `.supabase_env` of environment.

### xAI (Grok 4.1 Fast) — goedkoopste optie, aanbevolen voor bulk

```bash
node .scripts/pipeline/run_osm_ai_codex.js \
  --region=Utrecht \
  --with-surroundings=true \
  --model=grok-4.1-fast
```

Vereist: `XAI_API_KEY` in environment.

**Grok 4.1 Fast** kost $0.20/M input tokens — dat is ~15x goedkoper dan Claude Haiku en scoort nagenoeg gelijk op structured JSON-taken. Heeft 2M context window en native structured output. Beste keuze voor bulk discovery.

### xAI + Web Search — Grok leest zelf reviews

```bash
node .scripts/pipeline/run_osm_ai_codex.js \
  --region=Utrecht \
  --with-surroundings=true \
  --model=grok-4.1-fast \
  --web-search=true
```

Met `--web-search=true` schakelt Grok zijn ingebouwde web search in. Per kandidaat zoekt Grok dan zelf op het web naar reviews, blogs en websites — en baseert zijn beoordeling op echte bronnen in plaats van alleen pre-enriched signals.

Dit is langzamer (concurrency gaat automatisch naar 5, timeout naar 3 min) maar levert veel betere beoordelingen. Ideaal voor twijfelgevallen of nieuwe regio's waar je kwalitatief wilt starten. De kosten zijn minimaal hoger dan zonder web search.

### Opties

| Optie | Default | Beschrijving |
|-------|---------|--------------|
| `--region=X` | `Utrecht` | Hoofdregio om te scannen |
| `--with-surroundings=true` | `true` | Inclusief omliggende gemeenten |
| `--dry-run=true` | `false` | Geen database schrijfacties |
| `--limit=20` | onbeperkt | Max aantal kandidaten |
| `--model=X` | `claude-haiku-4-5-20251001` | AI model (`claude-*`, `grok-*`). Tip: `grok-4.1-fast` is 15x goedkoper |
| `--web-search=true` | `false` | Grok zoekt zelf reviews/blogs op het web (alleen `grok-*` modellen) |
| `--score-threshold=8` | `8` | Min score voor auto-approve |
| `--confidence-threshold=0.7` | `0.7` | Min confidence voor auto-approve |

### Environment variabelen

| Variabele | Backend | Beschrijving |
|-----------|---------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic | Claude API key |
| `XAI_API_KEY` | xAI | Grok API key |
| `PIPELINE_SCORE_CONCURRENCY` | Alle | Concurrent workers (default: 20) |
| `PIPELINE_SCORE_TIMEOUT_MS` | Alle | Timeout per kandidaat (default: 120000) |

---

## Methode 2: Grok Web Search — Nieuwe locaties ontdekken

Grok zoekt zelf op het web naar kindvriendelijke locaties die nog niet in je database staan.

```bash
# Ontdek nieuwe locaties in Haarlem
node .scripts/pipeline/discover_web.js --region=Haarlem

# Alleen horeca met speelhoek
node .scripts/pipeline/discover_web.js --region=Utrecht --type=horeca

# Alle types, max 20 resultaten
node .scripts/pipeline/discover_web.js --region=Zwolle --all-types --limit=20
```

Grok zoekt op blogs, Google reviews, ouderforums en websites. Bestaande locaties worden automatisch uitgefilterd. Output is JSON die je kunt reviewen.

---

## Methode 3: Grok Web Search — Bestaande locaties verbeteren

Grok zoekt reviews en info om beschrijvingen te verbeteren en ontbrekende data aan te vullen.

```bash
# Verbeter de 10 zwakste locaties in Utrecht
node .scripts/pipeline/improve_locations.js --region=Utrecht --weak-only --limit=10

# Alleen horeca in Amsterdam
node .scripts/pipeline/improve_locations.js --region=Amsterdam --type=horeca --limit=10

# Alle locaties in een regio
node .scripts/pipeline/improve_locations.js --region=Haarlem
```

Per locatie zoekt Grok naar Google reviews van ouders, checkt de website, en leest blogs. Output bevat verbetervoorstellen met bronnen.

---

## Methode 4: Claude Code Agents (interactief)

Voor complexe taken waar je interactief wilt sturen. Claude Code spawnt haiku agents die via WebSearch en WebFetch het web onderzoeken. Gratis bij je subscription.

Zeg in Claude Code iets als:

> **"Haal de needs_review kandidaten op voor Haarlem en research ze met web search"**

Of gebruik de CLI tools:

```bash
# Kandidaten ophalen
node .scripts/pipeline/fetch_unscored.js --region=Haarlem --status=needs_review --limit=5

# Na research: resultaat terugschrijven
node .scripts/pipeline/write_review.js --candidate-id=456 --score=9 --decision=approved \
  --reason="Speelhoek bevestigd via Google reviews en website" --has-play-area
```

---

## Methode 3: Lokale Heuristiek

Scoring op basis van pre-enriched signals, zonder AI call. Snel maar beperkt — alles wordt `needs_review`.

```bash
node .scripts/pipeline/run_osm_ai_codex.js --region=Utrecht --dry-run=true
```

Gebruikt keyword-counts, Google rating, review-aantallen en facility-signalen om een indicatieve score te berekenen. Handig als pre-filter voordat je API of agents inzet.

---

## Aanbevolen workflow

### Nieuwe regio toevoegen (bijv. Zwolle)

In Claude Code zeg je:

> "We gaan Zwolle toevoegen. Draai discover_web voor Zwolle, laat me de resultaten
> zien, en voeg de goede toe aan de database."

Of handmatig:

```bash
# 1. Grok zoekt op het web naar kindvriendelijke plekken in Zwolle
node .scripts/pipeline/discover_web.js --region=Zwolle --all-types

# 2. OSM discovery + Grok scoring voor wat OSM weet
node .scripts/pipeline/run_osm_ai_codex.js \
  --region=Zwolle --with-surroundings=true \
  --model=grok-4.1-fast --web-search=true

# 3. Review in admin portal, promote de goede
```

### Bestaande locaties verbeteren

In Claude Code:

> "Verbeter de beschrijvingen van onze horeca-locaties in Amsterdam.
> Zoek naar Google reviews en blogs."

Of handmatig:

```bash
node .scripts/pipeline/improve_locations.js --region=Amsterdam --type=horeca --weak-only
```

### Wekelijks onderhoud

```bash
# 1. Nieuwe locaties vinden via web search
node .scripts/pipeline/discover_web.js --region=Utrecht --limit=15

# 2. OSM pipeline met web search scoring
node .scripts/pipeline/run_osm_ai_codex.js --region=Utrecht --model=grok-4.1-fast --web-search=true

# 3. Zwakke beschrijvingen verbeteren
node .scripts/pipeline/improve_locations.js --region=Utrecht --weak-only --limit=20
```

---

## Pipeline Stages (technisch)

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
  ┌──────▼─────────────────────────────────────────────┐
  │ 3. Score — kies je methode:                         │
  │                                                     │
  │  API batch:     Claude Haiku / Grok (snel, bulk)    │
  │  Claude Code:   Haiku agents + web research (diep)  │
  │  Heuristiek:    Lokale scoring (gratis, indicatief)  │
  └──────┬─────────────────────────────────────────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 approved  needs   rejected
    │    review
    ▼      │
 promoted ◄┘  (na handmatige review of Claude Code research)
 (→ locations tabel + site_publish_state dirty)
```

---

## Configuratie

### Regio's (`config.js`)

Het `REGIONS` object definieert 100+ gemeenten, gegroepeerd per PeuterPlannen-regio:

```javascript
const REGIONS = {
  'Utrecht':     { osmName: 'Utrecht', adminLevel: 8 },                    // hoofdregio
  'De Bilt':     { osmName: 'De Bilt', adminLevel: 8, supabaseRegion: 'Utrecht' },  // omliggende gemeente
};
```

- Gemeenten zonder `supabaseRegion` zijn hoofdregio's
- Gemeenten met `supabaseRegion` worden onder de hoofdregio gegroepeerd
- `--with-surroundings=true` neemt alle gerelateerde gemeenten mee

### Filter-keywords

| Lijst | Doel |
|-------|------|
| `BAR_KEYWORDS` | Bars, clubs, coffeeshops → worden gefilterd |
| `HARD_REJECT_PATTERNS` | Casino, stripclub → direct afgewezen |
| `KID_KEYWORDS` | Speelhoek, kinderstoel → positieve signalen |

---

## Scoring Criteria

| Score | Betekenis |
|-------|-----------|
| 1-4 | Niet kindvriendelijk / irrelevant |
| 5-6 | Mogelijk geschikt maar onzeker |
| 7 | Waarschijnlijk geschikt, extra info nodig |
| 8-9 | Kindvriendelijk, goede match |
| 10 | Uitstekende match (dedicated kinderlocatie) |

### Auto-approve vereisten (API batch)
- Score >= 8 EN confidence >= 0.7
- Minimaal 4 evidence points (speelhoek, kindermenu, reviews, etc.)
- Minstens 1 sterk signaal (significant play area, 4+ keywords, of sterke reviews)

### Web research scoring (Claude Code)
Bij web research heeft de agent meer context en kan dus met hogere confidence scoren. De `web_sources` worden meegestuurd zodat de bron traceerbaar is.

---

## Database Tabellen

### `location_candidates`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `id` | SERIAL | Primary key |
| `name` | TEXT | Locatienaam |
| `status` | TEXT | `new` → `enriched` → `scored` → `approved`/`rejected`/`needs_review` → `promoted` |
| `enriched_signals` | JSONB | Pre-enriched data (Google, website) |
| `region_root` | TEXT | PeuterPlannen regio |

### `location_ai_reviews`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `candidate_id` | INT | FK naar location_candidates |
| `model` | TEXT | Gebruikt model (`claude-haiku-*`, `grok-3-mini`, `claude-code-haiku-webresearch`) |
| `score_10` | INT | Score 1-10 |
| `confidence` | DECIMAL | 0.0 - 1.0 |
| `decision` | TEXT | `approved`, `rejected`, `needs_review` |
| `derived_fields` | JSONB | Afgeleide info (kindermenu, speelhoek, etc.) |
| `raw_json` | JSONB | Volledige response inclusief web_sources bij research |

### `location_source_evidence`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `candidate_id` | INT | FK naar location_candidates |
| `source` | TEXT | `osm`, `website`, `google`, `tripadvisor` |
| `signals_json` | JSONB | Geëxtraheerde signalen |

---

## Scripts Referentie

### Orchestratie

| Script | Beschrijving |
|--------|--------------|
| `run_osm_ai_codex.js` | OSM pipeline: discover → enrich → score → promote |
| `discover_web.js` | Ontdek nieuwe locaties via Grok + web search (geen OSM nodig) |
| `improve_locations.js` | Verbeter bestaande locaties via Grok + web search |
| `fetch_unscored.js` | Haal onbeoordeelde kandidaten op als JSON |
| `write_review.js` | Schrijf een review terug naar de DB |

### Pipeline modules

| Script | Beschrijving |
|--------|--------------|
| `config.js` | Regio's, keywords, utility functions |
| `db.js` | Supabase client voor pipeline tabellen |
| `discover_osm.js` | OSM Overpass queries |
| `enrich_sources.js` | Google Places + website enrichment |
| `score_workers_codex_cli.js` | Scoring via Anthropic API of xAI API |
| `score_workers_openai.js` | Scoring via OpenAI API |
| `promote_locations.js` | Promote approved → locations tabel |
| `dispatch_data_changed.js` | Trigger rebuild na promotie |

### Standalone

| Script | Beschrijving |
|--------|--------------|
| `reaudit_existing.js` | Herbeoordeelt bestaande locaties |
| `audit_alcohol_*.js` | Alcohol-vlag verificatie |
| `delete_locations.js` | Verwijder locaties op criteria |
| `watch_progress.sh` | Monitor voortgang in terminal |

---

## Troubleshooting

### "Unknown region: X"
Check spelling in het `REGIONS` object in `config.js`. Hoofdlettergevoelig.

### xAI scoring faalt
- Check `XAI_API_KEY` in environment
- xAI rate limits: verlaag `PIPELINE_SCORE_CONCURRENCY` naar 5-10
- Test: `curl -H "Authorization: Bearer $XAI_API_KEY" https://api.x.ai/v1/models`

### Claude Code agents zijn traag
- Gebruik `--limit=5` bij fetch_unscored om batch klein te houden
- Spawn agents parallel (`subagent_type=Explore` of `model=haiku`)
- Overweeg API batch voor de bulk, Claude Code alleen voor twijfelgevallen

### Kandidaat wordt niet gepromoveerd
- Check status in `location_candidates`: moet `approved` zijn
- Check `location_ai_reviews` voor score en decision
- Promote handmatig via admin portal of `promote_locations.js`

### OSM levert niets op
- Check of regio `skipOsm: true` heeft → gebruik `--with-surroundings=true`
- Test de query op https://overpass-turbo.eu/
- OSM kan rate-limiten; wacht en probeer opnieuw
