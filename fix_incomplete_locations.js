/**
 * PeuterPlannen — Fix Incomplete Locations
 * Zoekt regio + coördinaten + place_id voor locaties met lege velden
 * Verwijdert duplicaten
 */

const { readFileSync } = require('fs');
const env = readFileSync('.supabase_env', 'utf8');
const SB_SERVICE_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const MGMT_TOKEN = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)?.[1]?.trim();

const GOOGLE_KEY = "AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4";
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
const MGMT_URL = "https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query";

// Bekende duplicaten → verwijderen
const DUPLICATE_IDS = [175, 183]; // Parqiet (dup v 51), Plaswijckpark (dup v 48)

// Regio mapping op basis van plaatsnaam/locatie
function guessRegion(name, address) {
    const a = (address || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (a.includes('amsterdam') || a.includes('amstelveen')) return 'Amsterdam';
    if (a.includes('rotterdam') || a.includes('schiedam')) return 'Rotterdam';
    if (a.includes('den haag') || a.includes("'s-gravenhage") || a.includes('delft') || a.includes('zoetermeer')) return 'Den Haag';
    if (a.includes('utrecht') || a.includes('vleuten') || a.includes('ijsselstein') || a.includes('nieuwegein')) return 'Utrecht';
    if (a.includes('leiden') || a.includes('alphen')) return 'Leiden';
    if (a.includes('dordrecht') || a.includes('gorinchem')) return 'Dordrecht';
    if (a.includes('haarlem')) return 'Haarlem';
    return 'Nederland';
}

async function sql(query) {
    const res = await fetch(MGMT_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + MGMT_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });
    return res.json();
}

async function findPlace(name) {
    const query = encodeURIComponent(name + ' Nederland');
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.candidates?.length > 0) {
        return data.candidates[0];
    }
    return null;
}

async function updateLocation(id, fields) {
    const res = await fetch(`${SB_URL}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SB_SERVICE_KEY,
            'Authorization': 'Bearer ' + SB_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(fields)
    });
    return res.ok;
}

async function deleteLocation(id) {
    const res = await fetch(`${SB_URL}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
            'apikey': SB_SERVICE_KEY,
            'Authorization': 'Bearer ' + SB_SERVICE_KEY
        }
    });
    return res.ok;
}

async function main() {
    console.log('\n🔧 Fix Incomplete Locations\n');

    // Stap 1: Verwijder duplicaten
    console.log(`Stap 1: Duplicaten verwijderen (IDs: ${DUPLICATE_IDS.join(', ')})`);
    for (const id of DUPLICATE_IDS) {
        const ok = await deleteLocation(id);
        console.log(`  ${ok ? '✅' : '❌'} ID ${id} verwijderd`);
    }

    // Stap 2: Haal alle incomplete locaties op
    const rows = await sql("SELECT id, name, region, lat, lng FROM public.locations WHERE region IS NULL OR lat IS NULL ORDER BY id;");
    console.log(`\nStap 2: ${rows.length} incomplete locaties ophalen\n`);

    const now = new Date().toISOString();
    const stats = { fixed: 0, failed: 0 };

    for (const loc of rows) {
        process.stdout.write(`  🔎 [${loc.id}] ${loc.name}... `);
        const place = await findPlace(loc.name);

        if (!place) {
            console.log('❌ niet gevonden');
            stats.failed++;
            continue;
        }

        const lat = place.geometry.location.lat;
        const lng = place.geometry.location.lng;
        const region = guessRegion(loc.name, place.formatted_address);

        const ok = await updateLocation(loc.id, {
            lat, lng, region,
            place_id: place.place_id,
            last_verified_at: now
        });

        if (ok) {
            console.log(`✅ ${region} | ${lat.toFixed(4)},${lng.toFixed(4)} | ${place.place_id.substring(0,20)}...`);
            stats.fixed++;
        } else {
            console.log('❌ DB update mislukt');
            stats.failed++;
        }

        await new Promise(r => setTimeout(r, 60));
    }

    console.log(`\n📊 Resultaat:`);
    console.log(`   ✅ Gefixed: ${stats.fixed}`);
    console.log(`   ❌ Mislukt: ${stats.failed}\n`);

    // Stap 3: Eindtelling
    const count = await sql("SELECT COUNT(*) as total, COUNT(region) as with_region, COUNT(lat) as with_coords, COUNT(place_id) as with_place_id FROM public.locations;");
    console.log('Database status:');
    console.log(`  Totaal: ${count[0].total}`);
    console.log(`  Met regio: ${count[0].with_region}`);
    console.log(`  Met coördinaten: ${count[0].with_coords}`);
    console.log(`  Met place_id: ${count[0].with_place_id}\n`);
}

main().catch(console.error);
