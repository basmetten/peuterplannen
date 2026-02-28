/**
 * PeuterPlannen — Nieuwe locaties toevoegen (Batch 2 - Dataset Uitbreiding)
 * Zoekt via Google Places API + voegt toe aan Supabase
 * 67 kandidaten uit research agents, alle 17 regio's
 */

const { readFileSync } = require('fs');
const env = readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const GOOGLE_KEY = env.match(/GOOGLE_MAPS_KEY=(.+)/)?.[1]?.trim();
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";

const candidates = [
    // === AMERSFOORT (13 nieuwe — van 10 → 23) ===
    // Horeca (was 0!)
    { name: "Coffee Corazon", region: "Amersfoort", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    { name: "Parkhuis Amersfoort", region: "Amersfoort", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "Dikke Dirck", region: "Amersfoort", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "indoor" },
    { name: "Centraal Ketelhuis", region: "Amersfoort", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "KROAST Amersfoort", region: "Amersfoort", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    // Museum (was 1)
    { name: "Mondriaanhuis", region: "Amersfoort", type: "museum", coffee: false, diaper: false, alcohol: false, weather: "indoor" },
    { name: "Kunsthal KAdE", region: "Amersfoort", type: "museum", coffee: false, diaper: false, alcohol: false, weather: "indoor" },
    // Pancake (was 1)
    { name: "Pannenkoekenhuis De Kabouterhut", region: "Amersfoort", type: "pancake", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "HEY!Pannenkoek", region: "Amersfoort", type: "pancake", coffee: true, diaper: false, alcohol: false, weather: "hybrid" },
    { name: "Pannekoekenhuys Den Potsenmaeker", region: "Amersfoort", type: "pancake", coffee: true, diaper: false, alcohol: true, weather: "indoor" },
    // Nature
    { name: "Natuurboerderij De Brinkhorst", region: "Amersfoort", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    // Play
    { name: "Speeltuin Rivierenwijk", region: "Amersfoort", type: "play", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Speeltuin Soesterkwartier", region: "Amersfoort", type: "play", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === HAARLEM (8 nieuwe — van 16 → 24) ===
    // Horeca (was 2)
    { name: "Meneer Paprika", region: "Haarlem", type: "horeca", coffee: true, diaper: false, alcohol: false, weather: "indoor" },
    { name: "Brownies & downieS Haarlem", region: "Haarlem", type: "horeca", coffee: true, diaper: false, alcohol: false, weather: "indoor" },
    { name: "Kweekcafé", region: "Haarlem", type: "horeca", coffee: true, diaper: false, alcohol: false, weather: "hybrid" },
    { name: "Het Veerkwartier", region: "Haarlem", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    // Museum (was 1)
    { name: "Archeologisch Museum Haarlem", region: "Haarlem", type: "museum", coffee: false, diaper: false, alcohol: false, weather: "indoor" },
    { name: "Frans Hals Museum", region: "Haarlem", type: "museum", coffee: true, diaper: false, alcohol: false, weather: "indoor" },
    // Nature
    { name: "Haarlemmer Kweektuin", region: "Haarlem", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "De Hertenkamp Bloemendaal", region: "Haarlem", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === ALMERE (3 nieuwe) ===
    { name: "Almere Jungle", region: "Almere", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },
    { name: "Lunchroom Tante Truus", region: "Almere", type: "horeca", coffee: true, diaper: false, alcohol: false, weather: "indoor" },
    { name: "Natuurlijk Spelen Cascadepark", region: "Almere", type: "play", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === GRONINGEN (4 nieuwe) ===
    { name: "OERRR Speelnatuur Kardinge", region: "Groningen", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Cantina Mexicana", region: "Groningen", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "indoor" },
    { name: "Stadsrestaurant Het Oude Politiebureau", region: "Groningen", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    { name: "Dierenweide Eelderbaan", region: "Groningen", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === EINDHOVEN (3 nieuwe) ===
    { name: "Speeltuinvereniging Philipsdorp", region: "Eindhoven", type: "play", coffee: true, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Grand Café De Lichttoren", region: "Eindhoven", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "Speeltuin Sint Joseph", region: "Eindhoven", type: "play", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === TILBURG (3 nieuwe) ===
    { name: "Kinderspeelboerderij De Gerrithoeve", region: "Tilburg", type: "play", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },
    { name: "Stadscafé De Spaarbank", region: "Tilburg", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "BAM! Brood Brunch Borrel", region: "Tilburg", type: "horeca", coffee: true, diaper: false, alcohol: false, weather: "indoor" },

    // === BREDA (4 nieuwe) ===
    { name: "IKEK (In Kannen en Kruiken)", region: "Breda", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "Eetcafé de 7 Heuveltjes", region: "Breda", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "T-Huis", region: "Breda", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "Dierenweide De Bunderij", region: "Breda", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === 'S-HERTOGENBOSCH (4 nieuwe) ===
    { name: "Foodmarkt DE FAM", region: "'s-Hertogenbosch", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "indoor" },
    { name: "Anne&Max Den Bosch", region: "'s-Hertogenbosch", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "indoor" },
    { name: "Boefjes en Barista's", region: "'s-Hertogenbosch", type: "play", coffee: true, diaper: true, alcohol: false, weather: "indoor" },
    { name: "Dierenweide 't Wikkie", region: "'s-Hertogenbosch", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === ARNHEM (3 nieuwe) ===
    { name: "Museum Arnhem", region: "Arnhem", type: "museum", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "You Jump Arnhem", region: "Arnhem", type: "play", coffee: true, diaper: true, alcohol: false, weather: "indoor" },
    { name: "Zwembad De Grote Koppel", region: "Arnhem", type: "play", coffee: true, diaper: true, alcohol: false, weather: "indoor" },

    // === NIJMEGEN (4 nieuwe) ===
    { name: "LUX", region: "Nijmegen", type: "museum", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    { name: "Kinderboerderij Lindenholt", region: "Nijmegen", type: "nature", coffee: false, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Speeltuin De Blije Dries", region: "Nijmegen", type: "play", coffee: true, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Sprokkelbos Lent", region: "Nijmegen", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === APELDOORN (3 nieuwe) ===
    { name: "Speeltuin Kindervreugd", region: "Apeldoorn", type: "play", coffee: true, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Waterspeelplaats Matenpark", region: "Apeldoorn", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Buds Tolhuis No.11", region: "Apeldoorn", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },

    // === LEIDEN (3 nieuwe) ===
    { name: "Wereldmuseum Leiden", region: "Leiden", type: "museum", coffee: true, diaper: true, alcohol: false, weather: "indoor" },
    { name: "Theehuis De Leidsehout", region: "Leiden", type: "horeca", coffee: true, diaper: false, alcohol: true, weather: "hybrid" },
    { name: "Pannenkoekenrestaurant De Beslagkom", region: "Leiden", type: "pancake", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },

    // === ROTTERDAM (5 nieuwe) ===
    { name: "CROOS", region: "Rotterdam", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "hybrid" },
    { name: "Speelparadijs Bungelland", region: "Rotterdam", type: "play", coffee: true, diaper: true, alcohol: false, weather: "indoor" },
    { name: "Kinderboerderij De Blijde Wei", region: "Rotterdam", type: "nature", coffee: true, diaper: true, alcohol: false, weather: "outdoor" },
    { name: "Kinderboerderij De Kraal", region: "Rotterdam", type: "nature", coffee: true, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Supermercado", region: "Rotterdam", type: "horeca", coffee: false, diaper: true, alcohol: true, weather: "indoor" },

    // === UTRECHT (1 nieuwe) ===
    { name: "Nijntje Speeltuin Julianapark", region: "Utrecht", type: "play", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },

    // === AMSTERDAM (1 nieuwe) ===
    { name: "Lunchroom Lastig", region: "Amsterdam", type: "horeca", coffee: true, diaper: true, alcohol: false, weather: "indoor" },

    // === DEN HAAG (5 nieuwe) ===
    { name: "Binkies Den Haag", region: "Den Haag", type: "horeca", coffee: true, diaper: true, alcohol: true, weather: "indoor" },
    { name: "Koffie & Kind", region: "Den Haag", type: "horeca", coffee: true, diaper: true, alcohol: false, weather: "hybrid" },
    { name: "Familiepark Drievliet", region: "Den Haag", type: "play", coffee: true, diaper: true, alcohol: true, weather: "outdoor" },
    { name: "Stadsboerderij de Woelige Stal", region: "Den Haag", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
    { name: "Stadsboerderij de Gagelhoeve", region: "Den Haag", type: "nature", coffee: false, diaper: false, alcohol: false, weather: "outdoor" },
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
    console.log('\n➕ Nieuwe locaties toevoegen (Batch 2 — Dataset Uitbreiding)\n');
    console.log(`   ${candidates.length} kandidaten\n`);
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
            description: null,
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
