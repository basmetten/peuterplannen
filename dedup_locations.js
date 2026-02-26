/**
 * PeuterPlannen — Deduplicatie script
 * Verwijdert dubbele locaties, behoudt de meest complete entry
 */

const { readFileSync } = require('fs');
const env = readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const MGMT_TOKEN = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)?.[1]?.trim();
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";
const MGMT_URL = "https://api.supabase.com/v1/projects/piujsvgbfflrrvauzsxe/database/query";

async function sql(query) {
    const res = await fetch(MGMT_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + MGMT_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    return res.json();
}

async function deleteIds(ids) {
    if (!ids.length) return;
    const idList = ids.join(',');
    const res = await fetch(`${SB_URL}?id=in.(${idList})`, {
        method: 'DELETE',
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    return res.ok;
}

async function main() {
    console.log('\n🔧 Deduplicatie PeuterPlannen\n');

    // Haal alle duplicaten op met volledige data
    const dupes = await sql(`
        SELECT id, name, region, lat, lng, place_id, website, description
        FROM public.locations
        WHERE name IN (
            SELECT name FROM public.locations GROUP BY name HAVING COUNT(*) > 1
        )
        ORDER BY name, id
    `);

    console.log(`${dupes.length} rijen in duplicaat-groepen gevonden\n`);

    // Groepeer op naam
    const groups = {};
    for (const row of dupes) {
        if (!groups[row.name]) groups[row.name] = [];
        groups[row.name].push(row);
    }

    const toDelete = [];

    for (const [name, rows] of Object.entries(groups)) {
        // Score elke rij: meer compleet = hogere score
        const scored = rows.map(r => ({
            ...r,
            score: (r.place_id ? 10 : 0) + (r.lat ? 5 : 0) + (r.region ? 3 : 0) +
                   (r.website ? 2 : 0) + (r.description ? 1 : 0)
        }));
        scored.sort((a, b) => b.score - a.score);

        const keep = scored[0];
        const remove = scored.slice(1).map(r => r.id);
        toDelete.push(...remove);

        console.log(`  📍 "${name}" — ${rows.length}x`);
        console.log(`     Bewaar: ID ${keep.id} (score ${keep.score})`);
        console.log(`     Verwijder: IDs [${remove.join(', ')}]`);
    }

    console.log(`\n${toDelete.length} duplicaten verwijderen...`);

    // Verwijder in batches van 20
    for (let i = 0; i < toDelete.length; i += 20) {
        const batch = toDelete.slice(i, i + 20);
        const ok = await deleteIds(batch);
        console.log(`  Batch ${i/20 + 1}: ${ok ? '✅' : '❌'} (${batch.length} rijen)`);
    }

    // Eindstand
    const count = await sql("SELECT COUNT(*) as total, COUNT(place_id) as with_place_id FROM public.locations;");
    console.log(`\n📊 Database na dedup:`);
    console.log(`   Totaal: ${count[0].total}`);
    console.log(`   Met place_id: ${count[0].with_place_id}\n`);
}

main().catch(console.error);
