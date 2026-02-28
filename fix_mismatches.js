/**
 * Manual fixes for the 26 name-mismatch place_ids from audit_and_fix.js
 * Each has been manually verified as correct.
 */

const { readFileSync } = require('fs');
const env = readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";

// Manually verified correct matches from the mismatch report
const fixes = [
    // 's-Hertogenbosch
    { id: 625, name: "Nationaal Carnavalsmuseum", place_id: "ChIJwcou9vfuxkcRWPNvY49TWRI", note: "Google: Carnavalsmuseum 'Oeteldonks Gemintemuzejum' — same place, local dialect name" },

    // Amersfoort
    { id: 421, name: "Speelboerderij De Vosheuvel", place_id: "ChIJFVMLDi5ExkcRJb9KcIRAn4E", note: "Google: Stadsboerderij De Vosheuvel — renamed but same place" },
    { id: 427, name: "Landgoed Schothorst", place_id: "ChIJU8OUAMRGxkcRT85dezMd0ZY", note: "Google: Park Schothorst — same area/park" },

    // Arnhem
    { id: 582, name: "Park Lingezegen – Speelbos", place_id: "ChIJg48NoqSpx0cRUExyNY2N624", note: "Google: Speelbos De Schuytgraaf — it's the speelbos within Park Lingezegen" },

    // Breda
    { id: 540, name: "Pannecoeckenhuys De Hannebroeck", place_id: "ChIJ64ZES8GYxkcRy5XEZMQfckk", note: "Google: Pannekoeckenhuys Restaurant De Hannebroeck — spelling variant" },

    // Den Haag
    { id: 354, name: "Zuiderparadijs Binnenspeeltuin", place_id: "ChIJEUVZ5DSxxUcRBpz6JCIYAjA", note: "Google: Indoor Speelparadijs Het Zuiderparadijs — same place" },

    // Groningen
    { id: 456, name: "Speeltuin Oosterpark", place_id: "ChIJO72H3qbSyUcRVzdfYYmcwCA", note: "Google: Buurt- en Speeltuinvereniging Ons Belang — runs the Oosterpark playground" },

    // Haarlem
    { id: 346, name: "Speeltuin Brouwersplein", place_id: "ChIJ5XpbLRfvxUcRdojTiGSxxJM", note: "Google: Speeltuinvereniging Brouwersplein — same playground" },

    // Leiden
    { id: 341, name: "De Tapuit Waterspeeltuin Meijendel", place_id: "ChIJuaZwacG5xUcRnNZ3SNiBv2Y", note: "Google: Bezoekerscentrum Dunea, De Tapuit — correct location" },
    { id: 340, name: "Speeltuin Merendroom", place_id: "ChIJS2WMlLzGxUcRk_SF5PoL7ag", note: "Google: Speeltuinvereniging Merendroom — same playground" },
    { id: 332, name: "Speeltuin Westerkwartier", place_id: "ChIJ5-_SZfrGxUcR3ebQeAIMtJk", note: "Google: Speeltuinvereniging Westerkwartier — same playground" },
    { id: 333, name: "Speeltuin Zuidwest Leiden", place_id: "ChIJt4VKhFvGxUcRizdZa9Ilpt0", note: "Google: Speeltuinvereniging Zuid-West — same playground" },

    // Nijmegen
    { id: 561, name: "Pannenkoekenrestaurant De Heksendans", place_id: "ChIJHdZzQmMJx0cRSWXSVwM5JRg", note: "Google: Pannenkoekhuis De Heksendans — same place, slightly different prefix" },

    // Tilburg
    { id: 503, name: "Dierenweide Quirijnstokpark", place_id: "ChIJCZnHXQ6VxkcRqVZB6fBqqP8", note: "Google: Onze 013 Boerderij Hertenweide Quirijnstokpark — same, rebranded" },
    { id: 506, name: "Kinderboerderij Stokhasselt", place_id: "ChIJISY0OJOVxkcRcImlWx92PCY", note: "Google: Onze 013 boerderij Stokhasselt — same, rebranded" },
    { id: 502, name: "Kinderboerderij Wandelbos", place_id: "ChIJx56jPv69xkcRydUTEBOTHRU", note: "Google: Onze 013 boerderij Het Wandelbos — same, rebranded" },
];

// Skipped (not fixable / wrong matches):
// id 494: Familie- en Pannenkoekenrestaurant De Kemphaan → Grandcafé de Waterburght (WRONG)
// id 487: Kunstmuseum M. → Jij bent M. (UNCERTAIN — may have been renamed)
// id 426: Ballorig Amersfoort → Monkey Town Amersfoort (WRONG — Ballorig doesn't exist there)
// id 419: Kinderboerderij Java → Stadsboerderij De Vosheuvel (WRONG — different place)
// id 423: Pannenkoekenboerderij Mallejan → HEY!Pannenkoek (WRONG — renamed/different)
// id 579: SmaakLokaal Kindercafé → Spelen Bij ons (WRONG)
// id 438: Landgoed Eckartdal → Wandelpark Eckart (UNCERTAIN)
// id 432: Speeltuin Wasvenboerderij → Wasven Gasterij (UNCERTAIN)
// id 449: The Pnck Company → Primark (WRONG)
// id 337: BubbelJungle Binnenspeeltuin → De BUB (UNCERTAIN — may have renamed)

async function updatePlaceId(id, placeId) {
    const res = await fetch(`${SB_URL}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ place_id: placeId })
    });
    return res.ok;
}

async function main() {
    console.log(`\n🔧 Fixing ${fixes.length} verified mismatches...\n`);
    let ok = 0, fail = 0;

    for (const fix of fixes) {
        process.stdout.write(`  ${fix.name} (id:${fix.id})... `);
        const success = await updatePlaceId(fix.id, fix.place_id);
        if (success) {
            console.log(`✅ ${fix.note}`);
            ok++;
        } else {
            console.log(`❌ update failed`);
            fail++;
        }
    }

    console.log(`\n📊 Fixed: ${ok}, Failed: ${fail}`);
    console.log(`   Remaining unfixable: 10 (need manual investigation or removal)\n`);
}

main().catch(console.error);
