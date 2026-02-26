# SCRATCH.md — PeuterPlannen
Laatste update: 2026-02-26T09:15:00Z

## ACTIEVE TAKEN

### IN PROGRESS
- [ ] **V1-9:** Place ID verificatie alle 177 locaties
  - Batch 1-60: running (session tidy-shell)
  - Batch 61-120: running (session crisp-otter)
  - Batch 121-177: running (session calm-shore)
  - Gestart: 09:15
  - Methode: Google Places API → findplacefromtext + nearbysearch fallback
  - Rate limit: 50ms tussen calls
  - Resultaat: wordt live geschreven naar Supabase

### TODO (na Place ID verificatie)
- [ ] **APP1:** app.html Route knop updaten om place_id te gebruiken
  - Huidige URL: `https://www.google.com/maps/dir/?api=1&...&destination=LAT,LNG`
  - Nieuwe URL: `https://www.google.com/maps/search/?api=1&query=NAME&query_place_id=PLACE_ID`
- [ ] **APP2:** Fallback in code als place_id leeg is
- [ ] **DB1:** Controleer locaties waar Place ID niet gevonden werd
- [ ] **DB2:** Handmatig corrigeren van mismatches (bijv. "De Kleine Parade — kinderkapper")

## DONE
- [x] `place_id` + `last_verified_at` kolom toegevoegd via Management API ✅
- [x] verify_place_ids.js script geschreven en getest
- [x] Test batch 1-5: alle 5 locaties succesvol geverifieerd
- [x] Migration file opgeslagen: supabase_project/supabase/migrations/20260226000000_add_place_id.sql

## CREDENTIALS (alle werkend)
- SUPABASE_ACCESS_TOKEN: [zie .supabase_env]
- SUPABASE_MGMT_API: https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query ✅
- PROJECT_ID: piujsvgbfflrrvauzsxe
- SUPABASE_SERVICE_KEY: [zie .supabase_env]
- GOOGLE_MAPS_API_KEY: AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4
- GitHub: basmetten/peuterplannen

## DATABASE STATUS
- Tabel: public.locations
- Rijen: 177
- Kolommen: id, created_at, name, region, type, description, website, lat, lng, coffee, diaper, alcohol, weather, place_id ✅, last_verified_at ✅

## LIVE URLS
- Home: https://basmetten.github.io/peuterplannen/
- App: https://basmetten.github.io/peuterplannen/app.html
