/**
 * PeuterPlannen — Nieuwe locaties toevoegen
 * Zoekt via Google Places API + voegt toe aan Supabase
 */

const { readFileSync } = require('fs');
const env = readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const MGMT_TOKEN = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)?.[1]?.trim();
const GOOGLE_KEY = "AIzaSyAw0UlkShhJ_FQUG1ibkMidUhvEFC23jb4";
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
const MGMT_URL = "https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query";

// Kandidaten voor toevoeging — gefocust op zwakke regio's
const candidates = [
    // Rotterdam nature (0 entries nu)
    { name: "Arboretum Trompenburg", region: "Rotterdam", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Kinderboerderij Vroesenpark", region: "Rotterdam", type: "nature", coffee: false, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Heemtuin Rotterdam", region: "Rotterdam", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Vroesenpark Rotterdam", region: "Rotterdam", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Kinderboerderij Pendrecht", region: "Rotterdam", type: "nature", coffee: false, diaper: true, alcohol: false, weather: "outdoor" },

    // Rotterdam horeca (slechts 3)
    { name: "Fenix Food Factory", region: "Rotterdam", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "De Ballentent Rotterdam", region: "Rotterdam", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "Brasserie Fenix", region: "Rotterdam", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },

    // Rotterdam pancake (slechts 1)
    { name: "De Pannenkoekenboot Rotterdam", region: "Rotterdam", type: "pancake", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    { name: "Pannenkoekenhuis De Ruygtenberg", region: "Rotterdam", type: "pancake", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },

    // Den Haag nature (slechts 1)
    { name: "Westduinpark Den Haag", region: "Den Haag", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Madestein Den Haag", region: "Den Haag", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },
    { name: "Kinderboerderij Leyweg", region: "Den Haag", type: "nature", coffee: false, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Ockenburgh Den Haag", region: "Den Haag", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },

    // Den Haag horeca (slechts 3)
    { name: "Kindercafé Kikker en de Kraanvogel", region: "Den Haag", type: "horeca", coffee: true, diaper: true, alcohol: false, weather: "indoor" },
    { name: "Restaurant Zeezout Den Haag", region: "Den Haag", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "indoor" },

    // Den Haag pancake (slechts 1)
    { name: "Pannenkoekenhuis Malieveld", region: "Den Haag", type: "pancake", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
];

async function findPlace(name, region) {
    const query = encodeURIComponent(`${name} ${region} Nederland`);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,opening_hours&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.candidates?.length > 0) return data.candidates[0];
    return null;
}

async function getPlaceDetails(place_id) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=website,name,formatted_address&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') return data.result;
    return null;
}

async function isDuplicate(name) {
    const res = await fetch(`${SB_URL}?name=eq.${encodeURIComponent(name)}&select=id`, {
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    const rows = await res.json();
    return rows.length > 0;
}

async function insertLocation(loc) {
    const res = await fetch(SB_URL, {
        method: 'POST',
        headers: {
            'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify([loc])
    });
    return res.ok;
}

async function main() {
    console.log('\n➕ Nieuwe locaties toevoegen\n');
    const now = new Date().toISOString();
    const stats = { added: 0, notFound: 0, skipped: 0 };

    for (const candidate of candidates) {
        const dup = await isDuplicate(candidate.name);
        if (dup) {
            console.log(`  ⏭  [SKIP] ${candidate.name} — al in database`);
            stats.skipped++;
            continue;
        }

        process.stdout.write(`  🔎 ${candidate.name} (${candidate.region})... `);
        const place = await findPlace(candidate.name, candidate.region);

        if (!place) {
            console.log('❌ niet gevonden');
            stats.notFound++;
            continue;
        }

        // Haal website op via details
        const details = await getPlaceDetails(place.place_id);
        const website = details?.website || null;

        const loc = {
            name: candidate.name,
            region: candidate.region,
            type: candidate.type,
            description: null, // wordt later ingevuld
            website,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            coffee: candidate.coffee,
            diaper: candidate.diaper,
            alcohol: candidate.alcohol,
            weather: candidate.weather,
            place_id: place.place_id,
            last_verified_at: now
        };

        const ok = await insertLocation(loc);
        if (ok) {
            console.log(`✅ ${loc.lat.toFixed(4)},${loc.lng.toFixed(4)} | ${website || 'geen website'}`);
            stats.added++;
        } else {
            console.log('❌ insert mislukt');
            stats.notFound++;
        }
        await new Promise(r => setTimeout(r, 80));
    }

    console.log(`\n📊 Resultaat:`);
    console.log(`   ✅ Toegevoegd: ${stats.added}`);
    console.log(`   ⏭  Overgeslagen: ${stats.skipped}`);
    console.log(`   ❌ Niet gevonden: ${stats.notFound}\n`);
}

main().catch(console.error);
