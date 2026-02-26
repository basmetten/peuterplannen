# SCRATCH.md — PeuterPlannen
Laatste update: 2026-02-26T09:22:00Z

## PROBLEMEN / MISLUKT
- ID 50: CROOS Rotterdam → Google gaf "Bakkerij Rif" — naam mismatch, place_id niet opgeslagen
- ~12 locaties zonder place_id door naam mismatch of niet gevonden
- .supabase_env NIET committen (staat in .gitignore)

## IN PROGRESS
- [ ] T1: Controleer welke locaties nog GEEN place_id hebben → fix handmatig
  Status: nog niet gestart | Volgende: SQL query uitvoeren

## TODO
- [ ] T2: Locaties zonder place_id handmatig opzoeken en updaten
- [ ] T3: suggestions tabel aanmaken in Supabase (via Management API)
- [ ] T4: iOS Safari test (app.html) — echte test door gebruiker
- [ ] T5: index.html stats counter updaten: "50+" → "177 locaties"
- [ ] T6: Verificatie dat Route knop werkt met place_id (browser test)

## DONE
- [x] place_id + last_verified_at kolommen toegevoegd via Management API
- [x] verify_place_ids.js script gebouwd en uitgevoerd
- [x] 165 van 177 locaties geverifieerd met Google Place ID
- [x] app.html: buildMapsUrl() functie — gebruikt place_id indien beschikbaar
- [x] app.html: Supabase query fetcht nu ook place_id
- [x] .gitignore aangemaakt, .supabase_env uitgesloten
- [x] Secrets geredieerd uit SCRATCH.md, memory files en verify_place_ids.js
- [x] Commit c6622c1 gepusht naar main

## CREDENTIALS (NOOIT COMMITTEN)
Staan in: /root/.openclaw/workspace/.supabase_env
- SUPABASE_ACCESS_TOKEN → sbp_...669a96
- SUPABASE_SERVICE_KEY → sb_secret_...AOb
- PROJECT_ID: piujsvgbfflrrvauzsxe
- GOOGLE_MAPS_KEY: AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4

## MANAGEMENT API WERKT
curl -X POST "https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query" \
  -H "Authorization: Bearer [token uit .supabase_env]" \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'

## DATABASE STATUS
- Tabel: public.locations | 177 rijen
- Kolommen: id, name, region, type, description, website, lat, lng, coffee, diaper, alcohol, weather, place_id ✅, last_verified_at ✅
- ~165 rijen hebben place_id | ~12 nog leeg

## LIVE
- App: https://basmetten.github.io/peuterplannen/app.html
- Laatste commit: c6622c1
