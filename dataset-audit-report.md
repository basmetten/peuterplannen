# Dataset Audit Report — PeuterPlannen

**Datum:** 24 maart 2026  
**Methode:** 15 parallelle Haiku agents met web search  
**Bereik:** 2000 locaties  
**Bevindingen:** 108 issues gevonden

## Samenvatting per type

| Issue Type | Aantal | High Conf |
|-----------|--------|-----------|
| wrong_type | 28 | 13 |
| wrong_region | 25 | 23 |
| dead_website | 16 | 14 |
| wrong_name | 13 | 10 |
| wrong_location | 10 | 8 |
| permanently_closed | 8 | 8 |
| no_website | 3 | 2 |
| other | 3 | 0 |
| wrong_website | 1 | 1 |
| operational_status_uncertain | 1 | 0 |

**Totaal:** 108 issues, 79 high-confidence

## Permanent Gesloten Locaties (8)

- **ID 342** — Theehuis De Haarlemmerhout
  - Closed permanently in November 2025. Owners Biedie and Jan-Willem took leave after nearly seven years of operation, moving to a new tea house in Leiden.
  - Bron: https://www.rodi.nl/haarlem/nieuws/472810/afscheid-van-theehuis-de-haarlemmerhout-het-is-tijd-het-is-mo
  - Confidence: high

- **ID 366** — Buurtboerderij 't Dierendok
  - The petting farm component has been permanently closed. All animals have been relocated to other facilities (goats to Het Diereneiland and Amstelpark, rabbit to De Pijp, moose to other locations) as of 2024. The site now serves only as a day care center for residents with intellectual disabilities, not as a public petting farm.
  - Bron: https://www.rodi.nl/amsterdam-noord/nieuws/389358/alle-dieren-vertrekken-uit-dierendok
  - Confidence: high

- **ID 906** — Hop 020
  - Website unreachable (connection refused). Listed as '(Closed)' on Eet.nu. Appears to be permanently closed
  - Bron: https://en.eet.nu/amsterdam/de-hop-020
  - Confidence: high

- **ID 2360** — Pirate Ship
  - No operational 'Pirate Ship' play attraction found in Amsterdam. Search results show 'The Pirate Ship' was an escape room at Escape World Amsterdam (now closed). Other pirate-themed attractions exist (Pirates Experience, boat tours) but not a dedicated children's play 'Pirate Ship' facility.
  - Bron: https://escapetalk.nl/en/escaperoom/escape-world-amsterdam/
  - Confidence: high

- **ID 2361** — Palènpa Park
  - Palènpa Park has permanently closed after 5 successful seasons. The park location in Nieuw-Vennep no longer operates as a public play facility. Current focus is selling hut-building kits. Palènpa activities can now be done at nearby Klimpark21.
  - Bron: https://www.palenpa-park.nl/
  - Confidence: high

- **ID 2747** — Gunay Sweets Café
  - This establishment was forcibly closed by the mayor's office on labour law violations. According to De Orkaan news, both Gunay Lunchroom and Gunay Sweets Café were closed for 4 weeks after a labour inspection found 13 people working without proper work authorization in the Netherlands.
  - Bron: https://www.deorkaan.nl/gunay-lunchroom-en-sweets-cafe-op-last-van-burgemeester-hamming-gesloten/
  - Confidence: high

- **ID 3171** — Go Play Indoor Meppel
  - Go Play Indoor Meppel is permanently closed according to their Facebook page information. The facility is no longer operating.
  - Bron: https://www.facebook.com/goplayindoormeppel/
  - Confidence: high

- **ID 3284** — Sprookjesbos Valkenburg
  - Sprookjesbos Valkenburg filed for insolvency on December 20, 2023, and has not reopened. Planned reopenings (July 2024, October 2024) did not materialize. The facility is not currently operational.
  - Bron: https://www.sprookjesbos.nl/
  - Confidence: high


## Dode Websites (16)

- **ID 480** — Kinderboerderij Den Uylpark: Website URL contains malformed domain structure: https://www.stadennatuur.nl/den-uylpark.nl/ has .nl/ embedded incorrectly. Should be a normal subdirectory path without duplicate domain extension.
- **ID 481** — Kinderboerderij De Beestenbende: Website URL contains malformed domain structure: https://www.stadennatuur.nl/de-beestenbende.nl/ has .nl/ embedded incorrectly. Should be a normal subdirectory path without duplicate domain extension.
- **ID 483** — Natuurbelevingcentrum De Oostvaarders: Website URL contains malformed domain structure: https://www.stadennatuur.nl/de-oostvaarders.nl/ has .nl/ embedded incorrectly. Should be a normal subdirectory path without duplicate domain extension.
- **ID 484** — Het Vroege Vogelbos: Website URL contains malformed domain structure: https://www.stadennatuur.nl/vroege-vogelbos.nl/ has .nl/ embedded incorrectly. Should be a normal subdirectory path without duplicate domain extension. Also has HTML/accessibility issues.
- **ID 494** — Familie- en Pannenkoekenrestaurant De Kemphaan: Website URL returns HTTP 404 error: https://www.kemphaan.nl/deelnemers/pannenkoekenrestaurant-dubbel-op/ - This page does not exist.
- **ID 600** — Paviljoen Amalia: Website URL http://www.pannenkoekenrestaurantbrinkpark.nl returns HTTP 500 server error. However, the restaurant operates successfully at Brinklaan 145, 7311 JM Apeldoorn.
- **ID 1055** — PAND Pannenkoek: Website URL (https://www.routesinutrecht.com/) points to a tourism/routes platform about the Utrecht Region, not the pancake restaurant. The actual PAND Pannenkoek restaurant operates from a barn in Schalkwijk with various attractions for families.
- **ID 1308** — Avonturenspeeltuin Pietje Bell: Provided website http://www.uktuktuk.nl/city/rotterdam/speeltuin/avonturenspeeltuin-pietje-bell/ returns connection refused (ECONNREFUSED). Website appears to be down or inaccessible.
- **ID 1435** — De Pier Pannenkoeken: Website URL is an outdated .aspx format (http://www.pier.nl/food/De-Pier-Pannenkoeken.aspx). The page returns 404. The actual restaurant exists at The Pier in Scheveningen and should use the new domain structure (https://www.pier.nl/company/pier-pannenkoeken/ or opdepier.nl).
- **ID 2335** — Darwinpark: Website http://www.darwinpark.nl is non-functional/abandoned. Contains only broken code, outdated analytics, and no actual content about the attraction. Website appears to be from early 2000s and unmaintained.
- **ID 2365** — Speeltuin Badhoevedorp: Website http://www.speeltuin-badhoevedorp.nl redirects to dibeka.nl (a service provider) and the target site appears outdated (last update 2023). Site notes 'Huttenkamp stopped due to lack of volunteers' and shops operate only April-November. Current operational status unclear.
- **ID 3111** — Groot Speijk: Website URL is incorrect: grotspeijk.nl (with 'ijk') does not exist or has TLS certificate issues. Correct website is grootspeijck.com (with 'ijck'). Location is actually in Oisterwijk, not Tilburg.
- **ID 3112** — Speeltuin de Splinter: Website URL https://www.speelbos.nl/ appears to have TLS certificate issues. Correct website for this location is https://www.speelparkdesplinter.nl/. Note: official name is 'Speelpark De Splinter', not 'Speeltuin de Splinter'.
- **ID 3187** — Camping Wedderbergen: Website https://www.campingwedderbergen.nl/ has an expired SSL certificate, making it inaccessible. However, the campground itself appears operational via other sources (alternative websites show current bookings).
- **ID 3190** — Boerderijum: Website https://www.boerderijum.nl/ returns connection refused error (ECONNREFUSED). Cannot verify operational status.
- **ID 3223** — Stichting AAP: Website https://www.primaatparadijs.nl/ returns connection refused error (ECONNREFUSED). However, official website www.aap.nl is operational and confirms the facility exists and operates guided tours.

## Verkeerd Type (28)

- **ID 311** — Paleis Soestdijk: Listed as 'nature' but is actually a palace/museum with exhibitions. The palace, gardens, and orangery are only open during exhibitions. Not a typical nature location but a heritage attraction.
- **ID 571** — Beekdalpark Paasberg: Listed as 'nature' type but no website is provided (null). This is a public green space/nature park developed by the municipality, not a typical nature attraction venue with facilities or programs like other 'nature' entries.
- **ID 679** — LUX: Listed as 'museum' in database, but LUX is Europe's largest arthouse cinema with 7 film halls, theater hall, and multipurpose studio. It's a cultural entertainment venue, not a museum.
- **ID 899** — Pannenkoekerij Gansi: Listed as pancake restaurant but website shows it's operated from Kinderboerderij (children's farm). Currently operates Wednesday only for Surinamese sandwiches and Saturday for Surinamese meals, not pancakes on regular basis
- **ID 1225** — Doolhof Poelbroek: Listed as 'play' (playground) but is actually a community vegetable garden complex (moestuincomplex). Not a children's play area. Established 1994 as Poelbroektuin - Doetuin vegetable gardens.
- **ID 1241** — Monte Pelmo: Listed as 'horeca' but is actually an ice cream shop (gelato). Facebook page indicates 'Closing Soon'. Not a family restaurant suitable for PeuterPlannen. Appears to be specialty ice cream vendor, not traditional horeca.
- **ID 1392** — Dierenweide Capelle aan den IJssel: Website URL points to De Bokkesprong (https://www.natuurstad.nl/de-bokkesprong) which is a different location. The actual Dierenweide Capelle aan den IJssel is in the Vijvergebied (pond area) opened June 26, but database has incorrect website link.
- **ID 1613** — Telekids bioscoop: Listed as cinema/bioscoop type. Search results show 'Telekids' is a children's television program brand with activities (StoryZoo games, musical school workshops), not an actual cinema/movie theater. No actual 'Telekids bioscoop' found in Gooi en Vechtstreek. May be incorrectly categorized or non-existent.
- **ID 1985** — ?: Brasserie De Jagerstee is listed as 'horeca' with website pointing to RCN vacation park. RCN De Jagerstee is in Epe on the Veluwe, not a primary family destination type. Website is hospitality/restaurant facility page, not main business.
- **ID 2049** — Tiliander: Listed as 'museum' in Tilburg region but is actually a performing arts theater/library venue located in Oisterwijk (Spoorlaan 82/c), not a museum. Not in Tilburg proper.
- **ID 2070** — Bricks of Wonder: Listed as 'museum' but is a temporary LEGO art exhibition running only until May 3, 2026 at Heuvel shopping center Eindhoven. Not a permanent museum. Will be closed after May 3, 2026.
- **ID 2191** — De Toverknol: Listed as 'museum' but search results indicate it may be a theater/performance venue. Need verification of actual nature of facility.
- **ID 2197** — De Toneelmakerij: Listed as 'museum' but is actually a theater company that produces and performs youth theater for young audiences. Not a museum.
- **ID 2211** — Art Zoo Museum: Listed as 'museum' type (ID 2211). However, Art Zoo Museum is a taxidermy/art museum specializing in preserved animals - a niche art space, not a general-purpose children's museum. Website shows it opened June 2026 at Herengracht 368. This is not a child-friendly museum like traditional children's museums.
- **ID 2253** — Junglepark: Listed as 'play' type but the Junglepark in Eendrachtspark is actually a forest playground (bosspeelplaats), not a commercial play center. It's a free natural play area in the forest, operated by parks department, not a dedicated play attraction business.
- **ID 2423** — Dierenpark Zuiderpark: Listed as 'farm' type but Dierenpark Zuiderpark is not a children's farm (kinderboerderij). It's an animal park within the urban park, housing sheep, chickens, goats and rabbits but managed for landscape/ecology purposes, not as a family activity center.
- **ID 2452** — Kampina: Listed as 'nature' type which is correct, but Kampina is a large nature reserve (1535 hectares) for hiking/biking, not a children's attraction or play facility. Better suited for adults/families with hiking experience, not typical peuterplannen audience.
- **ID 2566** — Polles Keuken: Listed as region 'Tilburg' but actually located inside Efteling theme park in Kaatsheuvel. This is a theme park restaurant, not a standalone pancake house in Tilburg city.
- **ID 2898** — Haarlem Centrum - Speeltuinen: Listed as 'play' type but is a generic reference to playgrounds in Haarlem city center, not a specific named playground. Most playgrounds in city center are paid like 'Het Paradijsje' (Witte Herenstraat 36) which charges €1 per child.
- **ID 2943** — Stichting Waterlijn Rondvaarten: Listed as 'play' type but is actually a boat tour/rondvaart service (waterway cruises), not a playground. While family-friendly and marketed for children's activities, it's not a 'play' venue in the traditional sense.
- **ID 2987** — Intratuin: Listed as 'horeca' (food/beverage) but Intratuin is primarily a garden center (tuincentrum) with a secondary café/horeca function. Database may misclassify location type.
- **ID 3015** — Intratuin: Listed as 'nature' but Intratuin is primarily a garden center/retail store, not a natural area or nature preserve. While they sell plants and have a garden, it's a commercial retail space, not a nature destination.
- **ID 3019** — Intratuin: Listed as 'nature' but Intratuin Arnhem is a garden center (tuincentrum) with retail and café services, not a natural area. While child-friendly with plants, it's a commercial retail venue, not a nature destination.
- **ID 3046** — Knus Delft: Location listed as 'Den Haag' (The Hague) but is actually located in Delft at Zavelpad 3, Delftse Hout. Website and all sources confirm Delft location.
- **ID 3073** — Kip Tika's Speeltuin: This is not a standalone location. 'Kip Tika' is a scavenger hunt activity for children, not a play area. The actual website points to the Bezoekerscentrum Gooi en Vechtstreek, where Kip Tika is just one activity among many. Misleading entry in database.
- **ID 3141** — Speelbos De Lemelerberg: Listed region is 'Enschede' but the actual location is in Lemele, Overijssel. This is a different municipality approximately 20km away. The official starting point is at Kerkweg 32, Lemele.
- **ID 3162** — You Jump Hengelo: Listed region is 'Enschede' but the actual location is in Hengelo, a different municipality. Address: Nico Maasstraat 8, 7555 LT Hengelo. Hengelo is near Enschede but is a separate city.
- **ID 3164** — Taman Indonesia: Listed region is 'Zwolle' but the actual location is in Kallenkote (near Steenwijk), which is a different municipality in Overijssel. While in the Zwolle region, this is not accurate.

## Verkeerde Regio/Locatie (35)

- **ID 8** — Wonderpark Café: Listed as Amsterdam but actually located in Amstelveen (Buitenplein 83, Amstelveen). It opened in February 2024 in the Stadshart Amstelveen shopping center.
- **ID 10** — Boerderij Meerzicht: Listed as Amsterdam but actually located in Amstelveen. The restaurant is in the Amsterdamse Bos at Parkeerplaats Meerzicht in Amstelveen.
- **ID 11** — Geitenboerderij Ridammerhoeve: Listed as Amsterdam but actually located in Amstelveen at Nieuwe Meerlaan 4, 1182 DB Amstelveen. It's in the Amsterdam Forest but administratively belongs to Amstelveen.
- **ID 24** — Jack's Grillhouse: Listed as Utrecht but actually located in Nieuwegein at Parkhout 1, Nieuwegein. Multiple sources confirm the Nieuwegein address, not Utrecht.
- **ID 165** — Achter het Behang: Listed as Utrecht but actually located in Zeist (Emmaplein 5, 3701DK Zeist). Zeist is in the Utrecht province but separate from Utrecht city proper.
- **ID 179** — Knus: Website (knus.nl) appears to be for a location in Delft, not Den Haag. WebFetch showed address details for Delft-based operations.
- **ID 473** — Paviljoen Appelbergen Haren: Listed as Haren but actually located in Glimmen (Hoge Hereweg 33, 9756 TG Glimmen). Glimmen is east of Haren in the same municipality but a different location.
- **ID 773** — Family Village: Listed as Amsterdam region but actually located in Zaandam (Darwin Park, Zaandam)
- **ID 781** — Het Broeker Huis: Listed as Amsterdam but actually located in Broek in Waterland (not Amsterdam proper, though near Amsterdam)
- **ID 913** — Du Monde Bar&Kitchen: Listed as Amsterdam but actually located in Amstelveen (Dorpsstraat 104, 1182 JH Amstelveen)
- **ID 918** — Bliss Kidscafé: Listed as Amsterdam but actually located in Hoofddorp (not Amsterdam proper, though in greater Amsterdam area)
- **ID 920** — Venneper Lodge: Listed as Amsterdam region but actually located in Nieuw-Vennep, which is Haarlemmermeer, not Amsterdam
- **ID 921** — Otra más: Listed as Amsterdam but actually located in Diemen (metro.rest website indicates Diemen location)
- **ID 971** — Brownies&downieS: Listed as Den Haag but actually located in 's-Gravenzande (separate location). Den Haag location is marked as closed
- **ID 1015** — Foodbar 14TIEN: Listed as being in 's-Hertogenbosch region, but actually located in Herpen, North Brabant. The restaurant is at Berghemseweg 13, 5373 KG Herpen.
- **ID 1231** — Brasserie Boudewijn: Listed in region 'Haarlem' but actually located in Heemstede at Jan van Goyenstraat 31, 2102 CA Heemstede. While nearby Haarlem, it is in the adjacent town of Heemstede.
- **ID 1242** — Parnassia aan zee: Listed in region 'Haarlem' but located in Overveen/Bloemendaal aan Zee (Parnassiaweg 1, 2051 EA Overveen). Located in National Park de Kennemerduinen between Overveen and Bloemendaal, not in Haarlem proper.
- **ID 1243** — Loetje Overveen: Listed in region 'Haarlem' but located in Overveen at Bloemendaalseweg 260, 2051 GN Overveen. Not in Haarlem proper.
- **ID 1248** — de Hertenbaan: Listed in region 'Haarlem' but actual location is Beverwijk (Westerhoutweg 18, 1942 HK Beverwijk). It is Kinderboerderij De Baak.
- **ID 1498** — Science Centre Delft: Listed as Den Haag region but is actually located in Delft. Science Centre is on the TU Delft Bouwcampus in Delft, which is a separate city (~15km from Den Haag). While it serves the broader Hague area, it should be categorized as Delft region.
- **ID 1502** — Kindertuin De Goudsbloem: Listed as Den Haag region but is actually located in Delft (Hof van Delftpark). Should be categorized under Delft region, not Den Haag.
- **ID 1504** — Hofje van Olofje: Listed as Gooi en Vechtstreek region but Hofje van Olofje is actually located in Delft on Bagijnestraat. Multiple searches confirm location in Delft, not in Gooi en Vechtstreek. The website link provided (visitgooivecht.nl) is generic tourism page, not specific to this location.
- **ID 1507** — Hortus Botanicus: Listed as Den Haag region but is actually TU Delft Hortus Botanicus located in Delft. Should be categorized under Delft region.
- **ID 1612** — (W)onderwaterwereld: Listed as Gooi en Vechtstreek but search results indicate this activity/organization is associated with Stichting Het Zeeuwse Landschap (The Zeeland Landscape Foundation) in the Zeeland region, not in Gooi en Vechtstreek. May be misclassified.
- **ID 1807** — Huttenbouwbos: Listed under Almere, but search results indicate Huttenbouwbos is located in Heeze-Leende (Noord-Brabant), not Almere. Almere has a Zuiderzee Speelbos instead.
- **ID 1809** — Eemhoeve: Listed under Almere, but Eemhoeve appears to be in Spakenburg (Bunschoten) or Zwolle, not Almere. The Almere farm would be 'Stadsboerderij' (City Farm).
- **ID 2838** — Strandhuys: Listed as 'Amersfoort' but actually located in Nijkerk at Zeedijk 1a. Strandhuys Nijkerk is a waterfront restaurant in Nijkerk aan Zee, not Amersfoort.
- **ID 2852** — IJssalon La Gallina: Listed as 'Amersfoort' but actually located in Barneveld at Jan van Schaffelaarstraat 68, 3771 BW. Kidsproof mentions it in Barneveld context.
- **ID 2857** — Boerderij het Molentje: Listed as 'Amersfoort' but actually located in Garderen at Apeldoornsestraat 193, 3886 MN Garderen. It's on the Veluwe near Amersfoort, but not in Amersfoort.
- **ID 2860** — 't Hilletje: Listed as 'Amersfoort' but actually located in Kootwijk at De Brink 5, 3775 KP Kootwijk. Gasterij 't Hilletje is on the Veluwe, not in Amersfoort.
- **ID 2861** — Pannenkoeken Restaurant Kootwijkerduin: Listed as 'Amersfoort' but actually located in Kootwijk at Nieuw Milligenseweg 53, 3775 KR Kootwijk. It's on the Veluwe, not in Amersfoort.
- **ID 2867** — Pannenkoekenhuis Schaffelaar: Listed as 'Amersfoort' but actually located in Barneveld on the Schaffelaar Estate. Website and sources consistently show it's in Barneveld, not Amersfoort.
- **ID 2896** — Speeltuin Kloosterplantsoen: Listed as 'Utrecht' but actually located in IJsselstein at Anna van Burenpad 1, 3401 XE IJsselstein. IJsselstein is a separate municipality from Utrecht.
- **ID 2924** — GlowGolf: Listed as 'Utrecht' but actually located in Houten at Meidoornkade 25, 3992 AG Houten. Houten is near Utrecht but is a separate municipality.
- **ID 2945** — Rondvaart Zoetermeer: Listed as 'Leiden' but actually based in/operates from Zoetermeer. While boats sail between Zoetermeer and Leiden, the company is 'Rondvaart Zoetermeer' and operates from the Green Heart polder area near Zoetermeer, not Leiden.

## Verkeerde Naam (13)

- **ID 336** — Pannenkoekenhuisje Hans en Grietje: Listed with just website URL as 'www.pannenkoekenhuisje.nl' but actual location name is 'Hans & Grietje' and it's in Noordwijk aan Zee (Parallelboulevard 14), not directly in Leiden. The dataset may have location/name confusion.
- **ID 511** — Het Ketelhuis Oud-Zuid: Listed as 'Het Ketelhuis Oud-Zuid' but the actual pancake restaurant is 'Het Ketelhuis Pannenkoekfabrique' at AaBe-straat 45. There is no specific reference to 'Oud-Zuid' (Old South) in the location name or area designation from official sources.
- **ID 1982** — De Veldkamp: Website URL (develdkampepe.nl) contains 'epe' suggesting location might be Epe rather than Apeldoorn, or name includes abbreviation 'EPE' which is ambiguous
- **ID 1994** — Partycentrum Teuge: Listed as 'Partycentrum Teuge' but actual location is in Terwolde (Bandijk 60, 7396 NC Terwolde), not Teuge. Also appears to be at Recreatiepark De Scherpenhof which is the actual venue name.
- **ID 2042** — Pannekoekenhuis Belveren Goirle: Location is actually in Haaren (Oisterwijksedreef 4, 5076 NA, Haaren), not Goirle. Website confirms correct location as Haaren.
- **ID 2542** — De Menmoerhoeve: Listed as region 'Breda' but actually located in Etten-Leur, North Brabant. The correct full name should reflect this is in Etten-Leur.
- **ID 2575** — Rustpunt Kinderboerderij De Ridder: Listed as region 'Amsterdam' but actually located in Purmerend, Noord-Holland. Kinderboerderij De Ridder is at Leeghwaterpark 4, 1445 RA Purmerend.
- **ID 2659** — Old Dutch Pancake House: Cannot find evidence of a pancake house with this exact name 'Old Dutch Pancake House' in Amsterdam. Search results show other historic pancake houses like 'The Pancake Bakery' (since 1973) and 'Upstairs Pancakes', but no 'Old Dutch Pancake House'. This may be a confused name or misidentified location.
- **ID 2694** — Mook pancakes: The name is outdated. The restaurant rebranded from 'Mook' to 'MOAK' (adding 'A for Amsterdam'). Current correct name is MOAK Pancakes, not Mook pancakes. The website URL (moakpancakes.nl) uses the new name.
- **ID 2740** — Gia Gelato: Listed as region 'Amsterdam' but actually located in Amstelveen (Dorpsstraat 68, 1182 JG Amstelveen). Amstelveen is a separate municipality, not part of Amsterdam city.
- **ID 2750** — Rustpunt Westzaanse Zuivelboerderij: Listed as region 'Amsterdam' but actually located in Westzaan (Zuideinde 260, 1551 EP Westzaan). Westzaan is a separate municipality in Noord-Holland, not Amsterdam.
- **ID 3205** — Gevangenismuseum: Listed in Groningen region but the museum is actually located in Veenhuizen (Drenthe province), not Groningen. Correct name is 'Nationaal Gevangenismuseum' in Veenhuizen, Oude Gracht 1, 9341 AA Veenhuizen.
- **ID 3281** — Dierenpark ten Kate: Listed in 'Zwolle' region but actually located in Nieuwleusen at Westerveen 42, 7711 DE Nieuwleusen (not Zwolle). The facility is known as 'ten Kate's Dierenpark' or 'Dierenpark ten Kate'.

## Overige (8)

- **ID 105** — Ballorig Leiden (wrong_website): The website listed (https://www.debub.nl/) points to 'Avonturenstad De Bub' in Leiderdorp, not Ballorig Leiden. There is no Ballorig location in Leiden - Ballorig operates in multiple other cities but not Leiden.
- **ID 199** — Kindercafé Kikker en de Kraanvogel (no_website): No website provided in dataset and no web presence found. Search for this location in Den Haag returned zero results. May be permanently closed or operating under different name.
- **ID 229** — Kinderboerderij De Witte Vlinder Leiden (no_website): No website provided in dataset. Web search for this specific kinderboerderij returned no results. May not exist, be closed, or operate under different name.
- **ID 236** — Speelbos Zuilen (no_website): No website provided in dataset. However, web search confirms this location exists in Utrecht at Fortlaan in the Niftarlakepark. It's a free public nature playground operated by the municipality.
- **ID 1843** — Hertenkamp Arnhem (operational_status_uncertain): Located in Sonsbeek Park. Faced potential closure due to Dutch Ministry regulations (no breeding allowed from mid-2024), but municipality decided to retain it with existing herd under new rules.
- **ID 2441** — Mini-Efteling (other): Mini-Efteling operates only on Saturdays (limited schedule), not a full-time attraction. Website shows it's volunteer-run with sustainability concerns. Listed location suggests 'Den Bosch' region but it's actually in Nieuwkuijk. Operating status may be precarious.
- **ID 2451** — Natuurspeelplaats Oosterpark (other): Correct type 'play' but actual name is 'Natuurspeeltuin Oosterplas' or 'Recreatiegebied Oosterplas' - not 'Oosterpark'. Location is at the Oosterplas lake recreation area in Den Bosch.
- **ID 3309** — De Merwelanden (other): Website https://www.merwelanden.nl/ appears to have been repurposed from its original function as a restaurant/playground. Current content focuses on casino games rather than dining/leisure. Restaurant itself has severely limited operations (take-away only) due to staff shortages and water quality issues.
