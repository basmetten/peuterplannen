/**
 * PeuterPlannen — Place_id Audit & Fix
 *
 * Usage:
 *   node audit_and_fix.js                    # Fix all locations missing place_id
 *   node audit_and_fix.js --region=Almere    # Only a specific region
 *   node audit_and_fix.js --verify-all       # Verify existing place_ids still resolve
 *   node audit_and_fix.js --dry-run          # Don't update Supabase, just report
 *   node audit_and_fix.js --report           # Generate CSV report of all locations
 */

const { readFileSync, writeFileSync } = require('fs');

// Load env
const env = readFileSync('.supabase_env', 'utf8');
const SB_KEY = env.match(/SUPABASE_SERVICE_KEY=(.+)/)?.[1]?.trim();
const GOOGLE_KEY = env.match(/GOOGLE_MAPS_KEY=(.+)/)?.[1]?.trim();
const SB_URL = "https://piujsvgbfflrrvauzsxe.supabase.co/rest/v1/locations";

// Parse CLI args
const args = process.argv.slice(2);
const regionFilter = args.find(a => a.startsWith('--region='))?.split('=')[1];
const verifyAll = args.includes('--verify-all');
const dryRun = args.includes('--dry-run');
const reportOnly = args.includes('--report');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllLocations() {
    // Supabase paginates at 1000 by default, we have ~477
    const params = new URLSearchParams({
        select: 'id,name,region,type,place_id,lat,lng,website',
        order: 'region,name',
        limit: '1000'
    });
    if (regionFilter) {
        params.set('region', `eq.${regionFilter}`);
    }
    const res = await fetch(`${SB_URL}?${params}`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function findPlaceId(name, region) {
    const query = encodeURIComponent(`${name} ${region} Nederland`);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.candidates?.length > 0) {
        return data.candidates[0];
    }
    return null;
}

async function verifyPlaceId(placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,business_status&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.status === 'OK' ? data.result : null;
}

function nameMatch(dbName, googleName) {
    // Strict: first significant word of DB name must appear in Google name
    const normalize = s => s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const dbNorm = normalize(dbName);
    const googleNorm = normalize(googleName);

    // Exact match
    if (dbNorm === googleNorm) return { match: true, confidence: 'exact' };

    // One contains the other
    if (googleNorm.includes(dbNorm) || dbNorm.includes(googleNorm)) {
        return { match: true, confidence: 'contains' };
    }

    // First significant word match (skip articles, prepositions)
    const skipWords = new Set(['de', 'het', 'een', 'van', 'in', 'op', 'bij', 'en', 'the', 'a']);
    const dbWords = dbNorm.split(/\s+/).filter(w => !skipWords.has(w) && w.length > 1);
    const googleWords = googleNorm.split(/\s+/).filter(w => !skipWords.has(w) && w.length > 1);

    if (dbWords.length > 0 && googleWords.length > 0) {
        // First significant word must match
        if (dbWords[0] === googleWords[0]) {
            return { match: true, confidence: 'first-word' };
        }
        // Check if at least 2 significant words overlap
        const overlap = dbWords.filter(w => googleWords.includes(w));
        if (overlap.length >= 2) {
            return { match: true, confidence: 'multi-word' };
        }
    }

    return { match: false, confidence: 'none' };
}

async function updatePlaceId(id, placeId) {
    if (dryRun) return true;
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

async function runFixMissing(locations) {
    const missing = locations.filter(l => !l.place_id);
    console.log(`\n🔍 ${missing.length} locaties zonder place_id gevonden${regionFilter ? ` (regio: ${regionFilter})` : ''}\n`);

    if (missing.length === 0) {
        console.log('   Alles heeft al een place_id! ✅\n');
        return [];
    }

    const results = [];
    let found = 0, notFound = 0, noMatch = 0;

    for (const loc of missing) {
        process.stdout.write(`  🔎 ${loc.name} (${loc.region})... `);

        const place = await findPlaceId(loc.name, loc.region);
        await delay(50);

        if (!place) {
            console.log('❌ niet gevonden op Google');
            results.push({ ...loc, status: 'not_found', google_name: '', confidence: '' });
            notFound++;
            continue;
        }

        const match = nameMatch(loc.name, place.name);

        if (!match.match) {
            console.log(`⚠️  naam-mismatch: "${place.name}" (${match.confidence})`);
            results.push({ ...loc, status: 'name_mismatch', google_name: place.name, google_place_id: place.place_id, confidence: match.confidence });
            noMatch++;
            continue;
        }

        const ok = await updatePlaceId(loc.id, place.place_id);
        if (ok) {
            console.log(`✅ ${match.confidence} → ${place.place_id.substring(0, 20)}...`);
            results.push({ ...loc, status: 'fixed', google_name: place.name, google_place_id: place.place_id, confidence: match.confidence });
            found++;
        } else {
            console.log('❌ update mislukt');
            results.push({ ...loc, status: 'update_failed', google_name: place.name, google_place_id: place.place_id, confidence: match.confidence });
        }
    }

    console.log(`\n📊 Resultaat:`);
    console.log(`   ✅ Gevonden & ${dryRun ? 'zou updaten' : 'geüpdatet'}: ${found}`);
    console.log(`   ⚠️  Naam-mismatch (handmatig checken): ${noMatch}`);
    console.log(`   ❌ Niet gevonden: ${notFound}`);
    console.log(`   📋 Totaal verwerkt: ${missing.length}\n`);

    return results;
}

async function runVerifyAll(locations) {
    const withPlaceId = locations.filter(l => l.place_id);
    console.log(`\n🔍 ${withPlaceId.length} locaties met place_id verifiëren...\n`);

    const results = [];
    let valid = 0, invalid = 0, closed = 0;

    for (const loc of withPlaceId) {
        process.stdout.write(`  🔎 ${loc.name}... `);

        const detail = await verifyPlaceId(loc.place_id);
        await delay(50);

        if (!detail) {
            console.log('❌ place_id ongeldig!');
            results.push({ ...loc, status: 'invalid_place_id' });
            invalid++;
        } else if (detail.business_status === 'CLOSED_PERMANENTLY') {
            console.log(`⚠️  PERMANENT GESLOTEN`);
            results.push({ ...loc, status: 'permanently_closed', google_name: detail.name });
            closed++;
        } else {
            console.log(`✅ ${detail.business_status || 'OK'}`);
            results.push({ ...loc, status: 'valid', google_name: detail.name });
            valid++;
        }
    }

    console.log(`\n📊 Verificatie resultaat:`);
    console.log(`   ✅ Geldig: ${valid}`);
    console.log(`   ⚠️  Permanent gesloten: ${closed}`);
    console.log(`   ❌ Ongeldige place_id: ${invalid}\n`);

    return results;
}

function generateReport(locations) {
    // Summary per region
    const regions = {};
    for (const loc of locations) {
        if (!regions[loc.region]) regions[loc.region] = { total: 0, withPlaceId: 0, types: {} };
        regions[loc.region].total++;
        if (loc.place_id) regions[loc.region].withPlaceId++;
        const t = loc.type || 'unknown';
        regions[loc.region].types[t] = (regions[loc.region].types[t] || 0) + 1;
    }

    console.log('\n📊 Dataset overzicht per regio:\n');
    console.log('Regio                  | Totaal | place_id | %    | Types');
    console.log('-----------------------|--------|----------|------|------');

    const sortedRegions = Object.entries(regions).sort((a, b) => (a[1].withPlaceId / a[1].total) - (b[1].withPlaceId / b[1].total));

    for (const [name, data] of sortedRegions) {
        const pct = ((data.withPlaceId / data.total) * 100).toFixed(0);
        const types = Object.entries(data.types).map(([t, c]) => `${t}:${c}`).join(', ');
        console.log(`${name.padEnd(23)}| ${String(data.total).padStart(6)} | ${String(data.withPlaceId).padStart(8)} | ${pct.padStart(3)}% | ${types}`);
    }

    const totalAll = locations.length;
    const totalWithId = locations.filter(l => l.place_id).length;
    console.log('-----------------------|--------|----------|------|------');
    console.log(`${'TOTAAL'.padEnd(23)}| ${String(totalAll).padStart(6)} | ${String(totalWithId).padStart(8)} | ${((totalWithId/totalAll)*100).toFixed(0).padStart(3)}% |`);
    console.log('');
}

function writeCsvReport(results, filename) {
    if (results.length === 0) return;
    const headers = ['id', 'name', 'region', 'type', 'status', 'google_name', 'google_place_id', 'confidence'];
    const rows = results.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    writeFileSync(filename, csv);
    console.log(`📄 Rapport opgeslagen: ${filename}\n`);
}

async function main() {
    console.log('\n🔎 PeuterPlannen Place_id Audit');
    if (dryRun) console.log('   ⚠️  DRY RUN — geen wijzigingen in database');
    console.log('');

    const locations = await fetchAllLocations();
    console.log(`📍 ${locations.length} locaties opgehaald uit Supabase`);

    // Always show the report
    generateReport(locations);

    if (reportOnly) return;

    let results;
    if (verifyAll) {
        results = await runVerifyAll(locations);
        writeCsvReport(results, 'audit_verify_report.csv');
    } else {
        results = await runFixMissing(locations);
        writeCsvReport(results, 'audit_fix_report.csv');
    }
}

main().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
