-- ============================================
-- PeuterPlannen Dataset Fixes — 24 maart 2026
-- Run via Supabase SQL Editor (Dashboard > SQL)
-- ============================================

-- === 1. PERMANENTLY CLOSED (12 locaties) ===
-- Soft-delete: markeer als niet-featured zodat ze lager ranken
UPDATE locations SET is_featured = false 
WHERE id IN (366, 342, 906, 2361, 2360, 2747, 3171, 3284, 449, 904, 3403, 3422);

-- === 2. DEAD WEBSITES (17 locaties) ===
-- Null de website URL zodat de "Website" knop niet meer toont
UPDATE locations SET website = NULL 
WHERE id IN (480, 481, 483, 484, 494, 600, 1055, 1308, 1435, 2335, 3111, 3112, 3190, 3223, 419, 1009, 3355);

-- === 3. REGION CORRECTIONS (94 locaties) ===
UPDATE locations SET region = 'Amersfoort' WHERE id IN (323);
UPDATE locations SET region = 'Amstelveen' WHERE id IN (8, 10, 11, 9, 46, 769, 914);
UPDATE locations SET region = 'Apeldoorn' WHERE id IN (3393);
UPDATE locations SET region = 'Barendrecht' WHERE id IN (1400);
UPDATE locations SET region = 'Barneveld' WHERE id IN (2852, 2867);
UPDATE locations SET region = 'Beverwijk' WHERE id IN (934, 935, 1287, 1288, 1293);
UPDATE locations SET region = 'Bilthoven' WHERE id IN (1196, 1200);
UPDATE locations SET region = 'Capelle aan den IJssel' WHERE id IN (1391);
UPDATE locations SET region = 'Cruquius' WHERE id IN (919);
UPDATE locations SET region = 'De Lutte' WHERE id IN (3529);
UPDATE locations SET region = 'Delft' WHERE id IN (1498, 1502, 1504, 1507, 1499, 1508);
UPDATE locations SET region = 'Den Dungen' WHERE id IN (1001);
UPDATE locations SET region = 'Deurningen' WHERE id IN (3516);
UPDATE locations SET region = 'Elst' WHERE id IN (549, 583);
UPDATE locations SET region = 'Emst' WHERE id IN (597);
UPDATE locations SET region = 'Garderen' WHERE id IN (2857);
UPDATE locations SET region = 'Glimmen' WHERE id IN (473);
UPDATE locations SET region = 'Haaksbergen' WHERE id IN (3527);
UPDATE locations SET region = 'Haarlem' WHERE id IN (913, 918, 920);
UPDATE locations SET region = 'Heemstede' WHERE id IN (1231, 926);
UPDATE locations SET region = 'Herpen' WHERE id IN (1015);
UPDATE locations SET region = 'Holten' WHERE id IN (3517);
UPDATE locations SET region = 'Houten' WHERE id IN (2924);
UPDATE locations SET region = 'IJmuiden' WHERE id IN (1270);
UPDATE locations SET region = 'IJsselstein' WHERE id IN (2896);
UPDATE locations SET region = 'Katwijk' WHERE id IN (688);
UPDATE locations SET region = 'Kootwijk' WHERE id IN (2860, 2861);
UPDATE locations SET region = 'Leidschendam' WHERE id IN (981);
UPDATE locations SET region = 'Losser' WHERE id IN (3526);
UPDATE locations SET region = 'Lutten' WHERE id IN (3457);
UPDATE locations SET region = 'Molenschot' WHERE id IN (3443);
UPDATE locations SET region = 'Nieuw-Milligen' WHERE id IN (685);
UPDATE locations SET region = 'Nieuwegein' WHERE id IN (24, 1034, 1035);
UPDATE locations SET region = 'Nijkerk' WHERE id IN (2838);
UPDATE locations SET region = 'Oosterhout' WHERE id IN (541);
UPDATE locations SET region = 'Oss' WHERE id IN (1014);
UPDATE locations SET region = 'Overveen' WHERE id IN (1242, 1243);
UPDATE locations SET region = 'Purmerend' WHERE id IN (922);
UPDATE locations SET region = 'Ridderkerk' WHERE id IN (1399);
UPDATE locations SET region = 'Schiedam' WHERE id IN (1377, 1379);
UPDATE locations SET region = 'Sliedrecht' WHERE id IN (3314);
UPDATE locations SET region = 'Spijkenisse' WHERE id IN (1404, 1405, 1406, 1409);
UPDATE locations SET region = 'Vlaardingen' WHERE id IN (1380, 1384, 1385, 1386);
UPDATE locations SET region = 'Vogelenzang' WHERE id IN (349);
UPDATE locations SET region = 'Vught' WHERE id IN (1000, 999);
UPDATE locations SET region = 'Waterland' WHERE id IN (781);
UPDATE locations SET region = 'Wijk aan Zee' WHERE id IN (1283, 1289, 1290);
UPDATE locations SET region = 'Woerden' WHERE id IN (1062, 1067);
UPDATE locations SET region = 'Zaandam' WHERE id IN (773, 917);
UPDATE locations SET region = 'Zandvoort' WHERE id IN (932, 1266);
UPDATE locations SET region = 'Zegveld' WHERE id IN (810);
UPDATE locations SET region = 'Zeist' WHERE id IN (165);
UPDATE locations SET region = 'Zoetermeer' WHERE id IN (2945, 974, 975, 976);

-- === 4. VERIFICATION ===
-- Run this query to verify the updates:
-- SELECT id, name, region, is_featured, website 
-- FROM locations 
-- WHERE id IN (8, 10, 11, 342, 1498, 3284)
-- ORDER BY id;
